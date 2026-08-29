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

  // العنوان المختار من العميل محفوظ بالفعل في addresses (له id صالح) —
  // لا داعي لإعادة كتابته هنا. إعادة الكتابة كانت تستبدل الإحداثيات الحقيقية
  // بإحداثيات القاهرة الافتراضية كلما غاب lat/lng من الكائن الممرَّر، فتُفسد
  // عنوانًا محفوظًا سابقًا. لا نحفظ عنوانًا جديدًا هنا إلا إذا لم يكن محفوظًا أصلًا،
  // وحتى في هذه الحالة نرفض المتابعة بدون إحداثيات حقيقية بدل استخدام قيم افتراضية.
  let addressId = params.address.id;
  const hasExistingAddress = !!addressId && isValidUUID(addressId);

  if (!hasExistingAddress) {
    if (params.address.lat == null || params.address.lng == null) {
      throw new Error('يرجى تحديد موقع العنوان على الخريطة قبل تأكيد الطلب');
    }

    const addressToSave: CustomerAddress = {
      id: ensureUUID(),
      user_id: session.user.id,
      title: params.address.title || 'عنوان التوصيل',
      address_line: params.address.address_line || params.address.street || '',
      building: params.address.building || null,
      floor: params.address.floor || null,
      apartment: params.address.apartment || null,
      notes: params.address.notes || null,
      lat: params.address.lat,
      lng: params.address.lng,
      is_default: params.address.is_default ?? false,
    };

    const savedAddress = await upsertAddress(addressToSave);
    addressId = savedAddress.id;
  }

  const formattedItems = params.items.map((item) => ({
    product_id: ensureUUID(item.product_id),
    quantity: Number(item.quantity) || 1,
    options: item.options || {},
    notes: item.notes ? String(item.notes).trim() : null,
  }));

  const { data, error } = await supabase.rpc('create_order_secure', {
    p_store_id: ensureUUID(params.store_id),
    p_address_id: addressId,
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

// ===== دالة جلب الطلبات المُبسَّطة =====
export async function fetchSupabaseOrders(filters?: {
  customer_id?: string;
  store_id?: string;
  delivery_agent_id?: string;
  status?: string;
  status_in?: string[];
  is_unassigned?: boolean;
  limit?: number;
}): Promise<Order[]> {
  // سقف افتراضي آمن يمنع نمو الاستعلام بلا حدود مع نمو المنصة، مع إبقاء
  // إمكانية تمرير حد أعلى/أقل صراحة عند الحاجة (limit صراحة بيتجاوز الافتراضي).
  const effectiveLimit = filters?.limit ?? 500;
  try {
    // 1. جلب الطلبات مع order_items فقط (لا علاقات أخرى)
    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `);

    if (filters?.customer_id) query = query.eq('customer_id', filters.customer_id);
    if (filters?.store_id) query = query.eq('store_id', filters.store_id);
    if (filters?.delivery_agent_id) query = query.eq('delivery_agent_id', filters.delivery_agent_id);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.status_in && filters.status_in.length > 0) query = query.in('status', filters.status_in);
    if (filters?.is_unassigned) query = query.is('delivery_agent_id', null);

    const { data: ordersData, error: ordersError } = await query
      .order('placed_at', { ascending: false, nullsFirst: false })
      .limit(effectiveLimit);

    if (ordersError) {
      // محاولة ثانية بدون order_items (في حال فشل العلاقة)
      const fallbackQuery = supabase.from('orders').select('*');
      if (filters?.customer_id) fallbackQuery.eq('customer_id', filters.customer_id);
      if (filters?.store_id) fallbackQuery.eq('store_id', filters.store_id);
      if (filters?.delivery_agent_id) fallbackQuery.eq('delivery_agent_id', filters.delivery_agent_id);
      if (filters?.status) fallbackQuery.eq('status', filters.status);
      if (filters?.status_in && filters.status_in.length > 0) fallbackQuery.in('status', filters.status_in);
      if (filters?.is_unassigned) fallbackQuery.is('delivery_agent_id', null);

      const fallbackRes = await fallbackQuery
        .order('placed_at', { ascending: false, nullsFirst: false })
        .limit(effectiveLimit);
      if (fallbackRes.error) throw fallbackRes.error;

      // جلب order_items بشكل منفصل
      const orderIds = fallbackRes.data?.map(o => o.id) || [];
      let orderItemsMap: Record<string, any[]> = {};
      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from('order_items')
          .select('*')
          .in('order_id', orderIds);
        if (items) {
          items.forEach(item => {
            if (!orderItemsMap[item.order_id]) orderItemsMap[item.order_id] = [];
            orderItemsMap[item.order_id].push(item);
          });
        }
      }

      // دمج العناصر
      const ordersWithItems = fallbackRes.data?.map(o => ({
        ...o,
        order_items: orderItemsMap[o.id] || [],
      })) || [];

      // جلب باقي البيانات المرتبطة
      const storeIds = ordersWithItems.map(o => o.store_id).filter(id => id) || [];
      const customerIds = ordersWithItems.map(o => o.customer_id).filter(id => id) || [];
      const addressIds = ordersWithItems.map(o => o.address_id).filter(id => id) || [];

      let storesMap: Record<string, any> = {};
      if (storeIds.length > 0) {
        const { data: stores } = await supabase.from('stores').select('*').in('id', storeIds);
        if (stores) storesMap = stores.reduce((acc, s) => { acc[s.id] = s; return acc; }, {});
      }

      let profilesMap: Record<string, any> = {};
      if (customerIds.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, phone, avatar_url, email').in('id', customerIds);
        if (profiles) profilesMap = profiles.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
      }

      let addressesMap: Record<string, any> = {};
      if (addressIds.length > 0) {
        const { data: addresses } = await supabase.from('addresses').select('*').in('id', addressIds);
        if (addresses) addressesMap = addresses.reduce((acc, a) => { acc[a.id] = a; return acc; }, {});
      }

      // دمج كل شيء
      const finalOrders = ordersWithItems.map(o => ({
        ...o,
        stores: storesMap[o.store_id] || null,
        profiles: profilesMap[o.customer_id] || null,
        addresses: addressesMap[o.address_id] || null,
      }));

      return mapOrders(finalOrders);
    }

    // إذا نجح الاستعلام الأول، نجلب البيانات المرتبطة بنفس الطريقة لتجنب تعقيد العلاقات
    const orderIds = ordersData?.map(o => o.id) || [];
    const storeIds = ordersData?.map(o => o.store_id).filter(id => id) || [];
    const customerIds = ordersData?.map(o => o.customer_id).filter(id => id) || [];
    const addressIds = ordersData?.map(o => o.address_id).filter(id => id) || [];

    let storesMap: Record<string, any> = {};
    if (storeIds.length > 0) {
      const { data: stores } = await supabase.from('stores').select('*').in('id', storeIds);
      if (stores) storesMap = stores.reduce((acc, s) => { acc[s.id] = s; return acc; }, {});
    }

    let profilesMap: Record<string, any> = {};
    if (customerIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, phone, avatar_url, email').in('id', customerIds);
      if (profiles) profilesMap = profiles.reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
    }

    let addressesMap: Record<string, any> = {};
    if (addressIds.length > 0) {
      const { data: addresses } = await supabase.from('addresses').select('*').in('id', addressIds);
      if (addresses) addressesMap = addresses.reduce((acc, a) => { acc[a.id] = a; return acc; }, {});
    }

    const ordersWithData = ordersData?.map(o => ({
      ...o,
      stores: storesMap[o.store_id] || null,
      profiles: profilesMap[o.customer_id] || null,
      addresses: addressesMap[o.address_id] || null,
    })) || [];

    return mapOrders(ordersWithData);
  } catch (err) {
    throw new Error(translateSupabaseError(err).message);
  }
}

function mapOrders(ordersData: any[]): Order[] {
  return ordersData.map((o) => {
    const custProfile = o.profiles || {};
    const custName = custProfile.full_name || o.customer_name || null;
    const custPhone = custProfile.phone || o.customer_phone || null;

    const storeObj = o.stores || {};
    const storeName = storeObj.name || o.store_name || null;
    const storePhone = storeObj.phone || null;
    const storeAddress = storeObj.address || null;
    const storeCoords = extractCoordinates(storeObj.location || storeObj);

    const addrObj = o.addresses || o.address || null;
    const addrCoords = extractCoordinates(addrObj?.location || addrObj);

    const items = (o.order_items || []).map((item: any) => ({
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
      customer_name: custName,
      customer_phone: custPhone,
      store_id: o.store_id,
      store_name: storeName,
      store_phone: storePhone,
      store_address: storeAddress,
      store_lat: storeCoords?.lat ?? null,
      store_lng: storeCoords?.lng ?? null,
      delivery_address: {
        id: addrObj?.id || o.address_id || undefined,
        user_id: o.customer_id,
        title: addrObj?.label || addrObj?.title || 'عنوان التوصيل',
        address_line: addrObj?.street || '',
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
    return data.map((row: any) => ({
      status: (row.status || 'pending') as OrderStatus,
      timestamp: row.created_at || new Date().toISOString(),
      note: row.note || undefined,
    }));
  } catch {
    return [];
  }
}

// NOTE: تم نقل fetchAgentStats و fetchStoreStats إلى ./stats.ts
// (النسخ هنا كانت dead code ومكررة، بتسبب تعارض في Vite/Rollup
// لأن stats.ts بيـ export نفس الأسماء من جداول views مختلفة).
// أي استيراد لهذه الدوال لازم يكون من supabase index.ts (مش من هنا مباشرةً).

// ===== سجل الطلبات للأدمن: pagination حقيقي بـ cursor (keyset) =====

export interface AdminOrderListItem {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  store_id: string;
  store_name: string;
  store_phone: string | null;
  customer_id: string;
  customer_name: string;
  customer_phone: string | null;
  address_line: string;
  delivery_agent_id: string | null;
  delivery_agent_name: string | null;
}

export interface AdminOrdersCursor {
  placed_at: string;
  id: string;
}

export interface AdminOrdersPage {
  items: AdminOrderListItem[];
  nextCursor: AdminOrdersCursor | null;
}

/**
 * صفحة واحدة من سجل الطلبات (للأدمن) عبر admin_search_orders — فلترة
 * حالة وبحث نصي وترقيم صفحات كلهم على مستوى الداتابيز، بدل تحميل كل
 * الطلبات دفعة واحدة وفلترتها في الفرونت. مرّر cursor من nextCursor
 * الخاص بالصفحة السابقة لجلب اللي بعدها؛ اتركه فارغًا لأول صفحة.
 */
export async function fetchAdminOrdersPage(params: {
  search?: string;
  status?: string;
  cursor?: AdminOrdersCursor | null;
  limit?: number;
}): Promise<AdminOrdersPage> {
  const limit = params.limit ?? 20;
  try {
    const { data, error } = await supabase.rpc('admin_search_orders', {
      p_search: params.search?.trim() || null,
      p_status: params.status && params.status !== 'all' ? params.status : null,
      p_cursor_placed_at: params.cursor?.placed_at ?? null,
      p_cursor_id: params.cursor?.id ?? null,
      p_limit: limit,
    });
    if (error) throw error;

    const rows: any[] = data || [];
    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const items: AdminOrderListItem[] = pageRows.map((o) => ({
      id: o.id,
      order_number: o.code || `ORD-${String(o.id).slice(0, 8)}`,
      status: (o.status || 'pending') as OrderStatus,
      total: Number(o.total || 0),
      created_at: o.placed_at || new Date().toISOString(),
      store_id: o.store_id,
      store_name: o.store_name || 'متجر محذوف',
      store_phone: o.store_phone,
      customer_id: o.customer_id,
      customer_name: o.customer_name || 'عميل',
      customer_phone: o.customer_phone || null,
      address_line: o.address_line || '',
      delivery_agent_id: o.delivery_agent_id,
      delivery_agent_name: o.delivery_agent_name,
    }));

    const last = pageRows[pageRows.length - 1];
    const nextCursor: AdminOrdersCursor | null =
      hasMore && last ? { placed_at: last.placed_at, id: last.id } : null;

    return { items, nextCursor };
  } catch (err) {
    throw new Error(translateSupabaseError(err).message);
  }
}

// ===== Aggregates خفيفة تحسب في الداتابيز بدل تحميل صفوف orders =====

export interface FinancialTotals {
  total_gmv: number;
  total_commissions: number;
  total_delivery_fees: number;
}

/** إجمالي GMV/عمولات/رسوم توصيل للطلبات المسلَّمة، محسوب في الداتابيز. */
export async function fetchDeliveredOrdersFinancialTotals(): Promise<FinancialTotals> {
  const { data, error } = await supabase.rpc('get_delivered_orders_financial_totals');
  if (error) throw new Error(translateSupabaseError(error).message);
  const row = data?.[0] || {};
  return {
    total_gmv: Number(row.total_gmv || 0),
    total_commissions: Number(row.total_commissions || 0),
    total_delivery_fees: Number(row.total_delivery_fees || 0),
  };
}

/** عدد الطلبات لكل حالة على مستوى المنصة كلها (بدون سقف)، كـ Record جاهز للاستخدام. */
export async function fetchOrderStatusCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('get_order_status_counts');
  if (error) throw new Error(translateSupabaseError(error).message);
  const counts: Record<string, number> = {};
  (data || []).forEach((row: any) => {
    counts[row.status] = Number(row.order_count || 0);
  });
  return counts;
}

export interface MyAgentStats {
  today_earnings: number;
  total_delivered_count: number;
}

/** إحصائيات المندوب الحالي: أرباح اليوم (توقيت القاهرة) + إجمالي الرحلات المسلَّمة تاريخيًا. */
export async function fetchMyAgentStats(): Promise<MyAgentStats> {
  const { data, error } = await supabase.rpc('get_my_agent_stats');
  if (error) throw new Error(translateSupabaseError(error).message);
  const row = data?.[0] || {};
  return {
    today_earnings: Number(row.today_earnings || 0),
    total_delivered_count: Number(row.total_delivered_count || 0),
  };
}

/**
 * طلب واحد بكامل تفاصيله (بما فيها الأصناف) عبر الـid مباشرة — لعرض
 * تفاصيل طلب في شاشة إدارية من غير الاعتماد على وجوده في قائمة
 * محمّلة مسبقًا (زي admin_search_orders اللي بترجع حقول مختصرة بس).
 */
export async function fetchOrderFullDetails(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase.rpc('get_order_full_details', { p_order_id: orderId });
  if (error) throw new Error(translateSupabaseError(error).message);
  if (!data) return null;
  return mapOrders([data])[0] || null;
}