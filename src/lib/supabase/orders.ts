// src/lib/supabase/orders.ts
import { supabase } from './client';
import { ensureUUID, isValidUUID, extractCoordinates, translateSupabaseError } from './helpers';
import { upsertAddress } from './addresses';
import { Order, CustomerAddress, OrderQuoteResponse, SecureOrderResponse, OrderStatus, OrderStatusHistoryItem } from '../../types/domain';

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
  if (error) throw new Error(translateSupabaseError(error).message);
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

  const formattedItems = params.items.map((item) => ({
    product_id: ensureUUID(item.product_id),
    quantity: Number(item.quantity) || 1,
    options: item.options || {},
    notes: item.notes ? String(item.notes).trim() : null,
  }));

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

// ===== دالة جلب الطلبات (الأكثر أماناً) =====
export async function fetchSupabaseOrders(filters?: {
  customer_id?: string;
  store_id?: string;
  delivery_agent_id?: string;
  status?: string;
  is_unassigned?: boolean;
}): Promise<Order[]> {
  try {
    // 1. جلب الطلبات فقط (بدون علاقات)
    let query = supabase.from('orders').select('*');
    if (filters?.customer_id) query = query.eq('customer_id', filters.customer_id);
    if (filters?.store_id) query = query.eq('store_id', filters.store_id);
    if (filters?.delivery_agent_id) query = query.eq('delivery_agent_id', filters.delivery_agent_id);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.is_unassigned) query = query.is('delivery_agent_id', null);

    const { data: ordersData, error: ordersError } = await query.order('placed_at', { ascending: false, nullsFirst: false });
    if (ordersError) throw ordersError;

    if (!ordersData || ordersData.length === 0) return [];

    // 2. جمع المعرفات المطلوبة
    const orderIds = ordersData.map(o => o.id);
    const storeIds = [...new Set(ordersData.map(o => o.store_id).filter(id => id))];
    const customerIds = [...new Set(ordersData.map(o => o.customer_id).filter(id => id))];
    const addressIds = [...new Set(ordersData.map(o => o.address_id).filter(id => id))];
    const agentIds = [...new Set(ordersData.map(o => o.delivery_agent_id).filter(id => id))];

    // 3. جلب البيانات المرتبطة بالتوازي
    const [
      orderItemsRes,
      storesRes,
      customersRes,
      addressesRes,
      agentsRes,
    ] = await Promise.all([
      // order_items
      orderIds.length > 0
        ? supabase.from('order_items').select('*').in('order_id', orderIds)
        : { data: [], error: null },
      // stores
      storeIds.length > 0
        ? supabase.from('stores').select('*').in('id', storeIds)
        : { data: [], error: null },
      // profiles (customers)
      customerIds.length > 0
        ? supabase.from('profiles').select('id, full_name, phone, avatar_url, email').in('id', customerIds)
        : { data: [], error: null },
      // addresses
      addressIds.length > 0
        ? supabase.from('addresses').select('*').in('id', addressIds)
        : { data: [], error: null },
      // delivery_agents
      agentIds.length > 0
        ? supabase.from('delivery_agents').select('id, user_id, vehicle_type, plate_number, is_online, is_approved, is_active, current_location, rating_avg, rating_count, total_deliveries, total_earnings').in('id', agentIds)
        : { data: [], error: null },
    ]);

    // 4. بناء الخرائط للبحث السريع
    const itemsMap: Record<string, any[]> = {};
    if (orderItemsRes.data) {
      orderItemsRes.data.forEach((item: any) => {
        if (!itemsMap[item.order_id]) itemsMap[item.order_id] = [];
        itemsMap[item.order_id].push(item);
      });
    }

    const storesMap: Record<string, any> = {};
    if (storesRes.data) {
      storesRes.data.forEach((s: any) => { storesMap[s.id] = s; });
    }

    const customersMap: Record<string, any> = {};
    if (customersRes.data) {
      customersRes.data.forEach((c: any) => { customersMap[c.id] = c; });
    }

    const addressesMap: Record<string, any> = {};
    if (addressesRes.data) {
      addressesRes.data.forEach((a: any) => { addressesMap[a.id] = a; });
    }

    const agentsMap: Record<string, any> = {};
    if (agentsRes.data) {
      agentsRes.data.forEach((a: any) => { agentsMap[a.id] = a; });
    }

    // 5. تحويل البيانات إلى كائنات Order
    return ordersData.map((o: any) => {
      const custProfile = customersMap[o.customer_id] || {};
      const storeObj = storesMap[o.store_id] || {};
      const addrObj = addressesMap[o.address_id] || null;
      const agentObj = agentsMap[o.delivery_agent_id] || null;

      const storeCoords = extractCoordinates(storeObj.location || storeObj);
      const addrCoords = extractCoordinates(addrObj?.location || addrObj);
      const agentCoords = extractCoordinates(agentObj?.current_location || agentObj);

      const items = (itemsMap[o.id] || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id || '',
        product_name: item.name || 'منتج',
        product_image: null,
        unit_price: Number(item.price || 0),
        quantity: Number(item.quantity || 1),
        total_price: Number(item.subtotal || item.price * item.quantity || 0),
        notes: item.notes || null,
      }));

      return {
        id: o.id,
        order_number: o.code || `ORD-${o.id.slice(0, 8)}`,
        customer_id: o.customer_id,
        customer_name: custProfile.full_name || null,
        customer_phone: custProfile.phone || null,
        store_id: o.store_id,
        store_name: storeObj.name || null,
        store_phone: storeObj.phone || null,
        store_address: storeObj.address || null,
        store_lat: storeCoords?.lat ?? null,
        store_lng: storeCoords?.lng ?? null,
        delivery_address: {
          id: addrObj?.id || o.address_id || undefined,
          user_id: o.customer_id,
          title: addrObj?.label || addrObj?.title || 'عنوان التوصيل',
          address_line: addrObj?.street || addrObj?.address_line || '',
          street: addrObj?.street ?? null,
          building: addrObj?.building ?? null,
          floor: addrObj?.floor ?? null,
          apartment: addrObj?.apartment ?? null,
          lat: addrCoords?.lat ?? null,
          lng: addrCoords?.lng ?? null,
          notes: addrObj?.notes ?? null,
          is_default: addrObj?.is_default ?? false,
        },
        delivery_agent_id: o.delivery_agent_id,
        delivery_agent_name: agentObj ? `${agentObj.user_id}` : null, // لا يوجد name في delivery_agents
        delivery_agent_phone: null,
        delivery_agent_vehicle: agentObj?.vehicle_type || null,
        delivery_agent_lat: agentCoords?.lat ?? null,
        delivery_agent_lng: agentCoords?.lng ?? null,
        items,
        subtotal: Number(o.subtotal || 0),
        delivery_fee: Number(o.delivery_fee || 0),
        tip_amount: o.tip_amount !== undefined && o.tip_amount !== null ? Number(o.tip_amount) : 0,
        discount_amount: Number(o.discount || 0),
        coupon_code: o.coupon_code ?? null,
        total: Number(o.total || 0),
        payment_method: (o.payment_method === 'online' ? 'online' : 'cash') as 'cash' | 'online',
        payment_status: o.payment_status === 'paid' ? 'paid' : 'pending',
        status: o.status || 'pending',
        status_history: [
          {
            status: o.status || 'pending',
            timestamp: o.placed_at || o.created_at || new Date().toISOString(),
            note: 'تم إنشاء الطلب',
          },
        ],
        rejection_reason: o.rejection_reason ?? null,
        customer_notes: o.customer_notes ?? null,
        zone_id: o.zone_id ?? null,
        commission_pct: o.commission_pct !== undefined && o.commission_pct !== null ? Number(o.commission_pct) : null,
        commission_amount: o.commission_amount !== undefined && o.commission_amount !== null ? Number(o.commission_amount) : null,
        eta_minutes: o.eta_minutes !== undefined && o.eta_minutes !== null ? Number(o.eta_minutes) : null,
        created_at: o.placed_at || o.created_at || new Date().toISOString(),
        updated_at: o.updated_at || new Date().toISOString(),
      };
    });
  } catch (err) {
    throw new Error(translateSupabaseError(err).message);
  }
}

// ===== جلب تاريخ حالة الطلب =====
export async function fetchOrderStatusHistory(orderId: string): Promise<OrderStatusHistoryItem[]> {
  try {
    const validId = ensureUUID(orderId);
    const { data, error } = await supabase
      .from('order_status_history')
      .select('*')
      .eq('order_id', validId)
      .order('created_at', { ascending: true });

    if (error || !data) return [];

    return (data as any[]).map((row) => ({
      status: (row.status || 'pending') as OrderStatus,
      timestamp: row.created_at || new Date().toISOString(),
      note: row.note || undefined,
    }));
  } catch {
    return [];
  }
}

// ===== إحصائيات الكابتن =====
export async function fetchAgentStats(agentId: string): Promise<{
  completed_deliveries: number;
  total_trips: number;
  total_earnings: number;
  total_tips: number;
  avg_rating: number;
} | null> {
  try {
    const { data, error } = await supabase
      .from('agent_stats')
      .select('*')
      .eq('agent_id', agentId)
      .maybeSingle();

    if (error || !data) return null;

    const a = data as any;
    return {
      completed_deliveries: Number(a.completed_deliveries || 0),
      total_trips: Number(a.total_trips || 0),
      total_earnings: Number(a.total_earnings || 0),
      total_tips: Number(a.total_tips || 0),
      avg_rating: Number(a.avg_rating || a.rating || 0),
    };
  } catch {
    return null;
  }
}

// ===== إحصائيات المتجر =====
export async function fetchStoreStats(storeId: string): Promise<{
  delivered_orders: number;
  total_orders: number;
  total_revenue: number;
  total_commission: number;
  avg_rating: number;
} | null> {
  try {
    const { data, error } = await supabase
      .from('store_stats')
      .select('*')
      .eq('store_id', storeId)
      .maybeSingle();

    if (error || !data) return null;

    const s = data as any;
    return {
      delivered_orders: Number(s.delivered_orders || 0),
      total_orders: Number(s.total_orders || 0),
      total_revenue: Number(s.total_revenue || 0),
      total_commission: Number(s.total_commission || 0),
      avg_rating: Number(s.avg_rating || s.rating || 0),
    };
  } catch {
    return null;
  }
}