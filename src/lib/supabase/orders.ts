// src/lib/supabase/orders.ts
import { supabase } from './client';
import { ensureUUID, isValidUUID, translateSupabaseError } from './helpers';
import { upsertAddress, rowToAddress } from './addresses';
import { Order, CustomerAddress, OrderQuoteResponse, SecureOrderResponse } from '../../types/domain';

type OrderUpdateResult = { success: true; order: any } | { success: false; error: string };

async function updateOrderWithCheck(
  orderId: string,
  payload: Record<string, any>,
  allowedKeys: string[]
): Promise<OrderUpdateResult> {
  const invalidKeys = Object.keys(payload).filter(k => !allowedKeys.includes(k));
  if (invalidKeys.length > 0) {
    return { success: false, error: `لا يمكن تحديث الحقول: ${invalidKeys.join(', ')}` };
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', ensureUUID(orderId))
    .select('id, status, updated_at');

  if (error) {
    return { success: false, error: translateSupabaseError(error).message };
  }
  if (!data || data.length === 0) {
    return { success: false, error: 'لم يتم تحديث الطلب – قد لا تملك صلاحية أو تغيّرت حالته' };
  }
  return { success: true, order: data[0] };
}

// دوال محدثة حسب الدور
export async function updateOrderStatusByStore(
  orderId: string,
  newStatus: 'accepted' | 'preparing' | 'ready' | 'rejected',
  rejectionReason?: string
): Promise<void> {
  const payload: Record<string, any> = { status: newStatus };
  if (newStatus === 'rejected' && rejectionReason) {
    payload.rejection_reason = rejectionReason;
  }
  const result = await updateOrderWithCheck(orderId, payload, ['status', 'rejection_reason']);
  if (!result.success) throw new Error(result.error);
}

export async function assignOrderToAgent(
  orderId: string,
  agentId: string,
  agentName: string,
  agentPhone?: string,
  agentVehicle?: string
): Promise<void> {
  const payload = {
    status: 'assigned',
    delivery_agent_id: ensureUUID(agentId),
    delivery_agent_name: agentName,
    delivery_agent_phone: agentPhone || null,
    delivery_agent_vehicle: agentVehicle || null,
  };
  const result = await updateOrderWithCheck(orderId, payload, [
    'status', 'delivery_agent_id', 'delivery_agent_name', 'delivery_agent_phone', 'delivery_agent_vehicle'
  ]);
  if (!result.success) throw new Error(result.error);
}

export async function updateOrderStatusByAgent(
  orderId: string,
  newStatus: 'picked_up' | 'on_the_way' | 'delivered'
): Promise<void> {
  const result = await updateOrderWithCheck(orderId, { status: newStatus }, ['status']);
  if (!result.success) throw new Error(result.error);
}

export async function cancelOrderByCustomer(orderId: string, reason?: string): Promise<void> {
  const payload = {
    status: 'cancelled',
    cancellation_reason: reason || 'ألغى العميل الطلب',
    cancelled_at: new Date().toISOString(),
  };
  const result = await updateOrderWithCheck(orderId, payload, ['status', 'cancellation_reason', 'cancelled_at']);
  if (!result.success) throw new Error(result.error);
}

export async function markOrderPaymentStatus(orderId: string, paymentStatus: 'paid' | 'failed' | 'refunded'): Promise<void> {
  const result = await updateOrderWithCheck(orderId, { payment_status: paymentStatus }, ['payment_status']);
  if (!result.success) throw new Error(result.error);
}

export async function adminUpdateOrder(orderId: string, fields: Record<string, any>): Promise<void> {
  const allowedAdminKeys = [
    'status', 'payment_status', 'delivery_agent_id', 'rejection_reason',
    'cancellation_reason', 'customer_notes', 'coupon_id'
  ];
  const result = await updateOrderWithCheck(orderId, fields, allowedAdminKeys);
  if (!result.success) throw new Error(result.error);
}

export async function updateSupabaseOrderLocation(orderId: string, lat: number, lng: number): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ delivery_agent_lat: lat, delivery_agent_lng: lng, updated_at: new Date().toISOString() })
    .eq('id', ensureUUID(orderId));
  if (error) {
    const translated = translateSupabaseError(error);
    throw new Error(translated.message);
  }
}

// ===== Secure Order RPC =====
export interface SecureOrderPayload {
  store_id: string;
  address: CustomerAddress;
  payment_method: 'cash' | 'online';
  items: Array<{ product_id: string; quantity: number; options?: any; notes?: string }>;
  coupon_code?: string;
  customer_notes?: string;
  tip_amount?: number;
}

export async function createSecureOrder(params: SecureOrderPayload): Promise<SecureOrderResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('يجب تسجيل الدخول');

  // 1. حفظ العنوان عبر upsert_address_secure (يرمي خطأ عند الفشل)
  let addressId = params.address.id;
  if (!addressId || !isValidUUID(addressId)) addressId = ensureUUID();

  const addressToSave: CustomerAddress = {
    id: addressId,
    user_id: session.user.id,
    title: params.address.title || 'عنوان التوصيل',
    address_line: params.address.address_line || params.address.street || '',
    building: params.address.building || null,
    floor: params.address.floor || null,
    apartment: params.address.apartment || null,
    notes: params.address.notes || null,
    lat: params.address.lat ?? 30.0444,
    lng: params.address.lng ?? 31.2357,
    is_default: params.address.is_default ?? false,
  };

  const savedAddress = await upsertAddress(addressToSave);

  // 2. إعداد العناصر (بدون Math.max)
  const formattedItems = params.items.map((item) => ({
    product_id: ensureUUID(item.product_id),
    quantity: Number(item.quantity) || 1,
    options: item.options || {},
    notes: item.notes ? String(item.notes).trim() : null,
  }));

  // 3. استدعاء create_order_secure
  const { data, error } = await supabase.rpc('create_order_secure', {
    p_store_id: ensureUUID(params.store_id),
    p_address_id: savedAddress.id,
    p_payment_method: params.payment_method,
    p_items: formattedItems,
    p_coupon_code: params.coupon_code ? params.coupon_code.trim() : null,
    p_customer_notes: params.customer_notes ? params.customer_notes.trim() : null,
    p_tip_amount: params.tip_amount ? Number(params.tip_amount) : 0,
  });

  if (error) throw new Error(translateSupabaseError(error).message);
  return data as SecureOrderResponse;
}

export async function quoteOrderSecure(params: {
  store_id: string;
  address_id: string;
  items: Array<{ product_id: string; quantity: number; options?: any; notes?: string }>;
  coupon_code?: string;
  tip_amount?: number;
}): Promise<OrderQuoteResponse> {
  const formattedItems = params.items.map((item) => ({
    product_id: ensureUUID(item.product_id),
    quantity: Number(item.quantity) || 1,
    options: item.options || {},
    notes: item.notes ? String(item.notes).trim() : null,
  }));

  const { data, error } = await supabase.rpc('quote_order_secure', {
    p_store_id: ensureUUID(params.store_id),
    p_address_id: ensureUUID(params.address_id),
    p_items: formattedItems,
    p_coupon_code: params.coupon_code ? params.coupon_code.trim() : null,
    p_tip_amount: params.tip_amount ? Number(params.tip_amount) : 0,
  });

  if (error) throw new Error(translateSupabaseError(error).message);
  return data as OrderQuoteResponse;
}