import { createClient } from '@supabase/supabase-js';
import {
  UserProfile,
  UserRole,
  Store,
  Product,
  CustomerAddress,
  Order,
  DeliveryAgent,
  DeliveryZone,
  Coupon,
  Review,
  Category,
  NotificationItem,
  Payout,
  PaginatedResult,
  DatabaseRow,
  ActivityLog,
  ChatMessage,
} from '../types/domain';

// Retrieve Supabase URL and Anon Key from environment or fallback to user credentials
const env = (import.meta as unknown as { env: Record<string, string> }).env || {};

const supabaseUrl =
  env.VITE_SUPABASE_URL ||
  'https://agfqhrbtfkvfinmljvcb.supabase.co';

const supabaseAnonKey =
  env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZnFocmJ0Zmt2ZmlubWxqdmNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MDkyNzksImV4cCI6MjEwMDk4NTI3OX0.-MZFhZuT5rhhtEbSMsGAExxePF9jd4IrpzxzX-A79kc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Check connectivity to Supabase instance
 */
export async function checkSupabaseConnection(): Promise<{ connected: boolean; message: string }> {
  try {
    const { data, error } = await supabase.from('categories').select('count', { count: 'exact', head: true });
    if (error) {
      return { connected: false, message: `خطأ في الاتصال بقاعدة البيانات: ${error.message}` };
    }
    return { connected: true, message: 'الاتصال بالخادم وقاعدة بيانات Supabase يعمل بنجاح' };
  } catch (err) {
    return { connected: false, message: `فشل الاتصال الشبكي: ${String(err)}` };
  }
}

/**
 * Utility to generate or validate a UUID
 */
export function ensureUUID(id?: string): string {
  if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Save / Upsert User profile in Supabase database
 */
export async function saveSupabaseUser(user: Partial<UserProfile>) {
  try {
    // If authenticated user exists in Supabase auth, prefer their auth ID
    let validId = user.id ? ensureUUID(user.id) : '';
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user?.id) {
        validId = authData.user.id;
      }
    } catch {
      // Ignore auth check errors
    }

    if (!validId) {
      validId = ensureUUID(user.id);
    }
    user.id = validId; // Ensure user object retains the valid UUID

    const userName = user.name || (user as any).full_name || 'مستخدم';
    let userRole = user.role || 'customer';
    if (!['customer', 'store_owner', 'delivery_agent', 'admin'].includes(userRole)) {
      userRole = 'customer';
    }

    // Exact payload strictly matching public.profiles columns in SQL schema:
    // id (UUID, FK auth.users), role, full_name, phone (UNIQUE), avatar_url, is_active, updated_at
    const payload: Record<string, any> = {
      id: validId,
      role: userRole,
      full_name: userName,
      phone: user.phone?.trim() ? user.phone.trim() : null, // null if empty to satisfy UNIQUE constraint
      avatar_url: user.avatar_url || null,
      is_active: (user as any).is_active ?? true,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase profile sync notice:', error.message);
    }
  } catch (err) {
    console.warn('Sync profile info:', err);
  }
}

/**
 * Fetch Users / Profiles from Supabase database
 */
export async function fetchSupabaseUsers(): Promise<UserProfile[]> {
  try {
    const { data, error } = await supabase.from('profiles').select('*');
    if (!error && data && data.length > 0) {
      return data.map((u) => ({
        id: u.id,
        email: u.email || '',
        name: u.full_name || u.name || 'مستخدم',
        phone: u.phone || '',
        role: (u.role as UserRole) || 'customer',
        avatar_url: u.avatar_url,
        associated_store_id: u.associated_store_id,
        is_active: u.is_active ?? true,
        created_at: u.created_at || new Date().toISOString(),
      }));
    }
  } catch {
    // fallback
  }
  return [];
}

/**
 * Sync / Fetch Categories from Supabase
 */
export async function fetchSupabaseCategories(): Promise<Category[]> {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error || !data) return [];
    return data.map((item) => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      icon: item.icon || '📦',
      sort_order: item.sort_order || 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch Stores from Supabase
 */
export async function fetchSupabaseStores(): Promise<Store[]> {
  try {
    const { data, error } = await supabase
      .from('stores')
      .select('*, categories(name)')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug || s.name,
      owner_id: s.owner_id,
      category_id: s.category_id || '',
      category_name: s.categories?.name || 'عام',
      description: s.description || '',
      logo_url: s.logo_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300',
      banner_url: s.cover_url,
      address: s.address || 'القاهرة، مصر',
      lat: 30.0444,
      lng: 31.2357,
      phone: s.phone || '',
      is_approved: s.is_approved ?? true,
      is_open: s.is_active ?? true,
      rating: Number(s.rating_avg) || 4.8,
      reviews_count: s.rating_count || 12,
      commission_rate: Number(s.commission_pct) || 15,
      min_order_amount: Number(s.min_order_amount) || 0,
      delivery_fee: 15,
      opening_hours: s.working_hours || { everyday: { open: '08:00', close: '23:00' } },
      created_at: s.created_at || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch Products from Supabase
 */
export async function fetchSupabaseProducts(storeId?: string): Promise<Product[]> {
  try {
    let query = supabase.from('products').select('*');
    if (storeId) {
      query = query.eq('store_id', storeId);
    }
    const { data, error } = await query;
    if (error || !data) return [];

    return data.map((p) => ({
      id: p.id,
      store_id: p.store_id,
      name: p.name,
      description: p.description || '',
      price: Number(p.price),
      original_price: p.old_price ? Number(p.old_price) : undefined,
      category_name: 'عام',
      image_url: p.images?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300',
      stock: p.stock || 50,
      is_active: p.is_active ?? true,
      unit: p.attributes?.unit || 'قطعة',
      created_at: p.created_at || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch Orders from Supabase
 */
export async function fetchSupabaseOrders(): Promise<Order[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*), stores(name, address, phone)')
      .order('placed_at', { ascending: false });

    if (error || !data) return [];

    return data.map((o) => ({
      id: o.id,
      order_number: o.code || `ORD-${o.id.slice(0, 8)}`,
      customer_id: o.customer_id,
      customer_name: 'عميل علي بابك',
      customer_phone: '01000000000',
      store_id: o.store_id,
      store_name: o.stores?.name || 'المتجر المحلي',
      store_phone: o.stores?.phone || '',
      store_address: o.stores?.address || '',
      store_lat: 30.0444,
      store_lng: 31.2357,
      delivery_address: {
        id: o.address_id || 'addr-1',
        user_id: o.customer_id,
        title: 'المنزل',
        address_line: 'وسط البلد، القاهرة',
        building: '12',
        floor: '3',
        apartment: '5',
        lat: 30.0444,
        lng: 31.2357,
        is_default: true,
      },
      delivery_agent_id: o.delivery_agent_id,
      items: (o.order_items || []).map((item: { id: string; product_id: string; name: string; price: number; quantity: number; subtotal: number; notes?: string }) => ({
        id: item.id,
        product_id: item.product_id || '',
        product_name: item.name,
        product_image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300',
        unit_price: Number(item.price),
        quantity: item.quantity,
        total_price: Number(item.subtotal),
        notes: item.notes,
      })),
      subtotal: Number(o.subtotal),
      delivery_fee: Number(o.delivery_fee),
      discount_amount: Number(o.discount || 0),
      total: Number(o.total),
      payment_method: (o.payment_method === 'online' ? 'online' : 'cash') as 'cash' | 'online',
      payment_status: o.payment_status === 'paid' ? 'paid' : 'pending',
      status: o.status || 'pending',
      status_history: [
        {
          status: o.status || 'pending',
          timestamp: o.placed_at || new Date().toISOString(),
          note: 'تم إنشاء الطلب',
        },
      ],
      rejection_reason: o.rejection_reason,
      customer_notes: o.customer_notes,
      created_at: o.placed_at || o.created_at || new Date().toISOString(),
      updated_at: o.updated_at || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch Delivery Agents from Supabase
 */
export async function fetchSupabaseAgents(): Promise<DeliveryAgent[]> {
  try {
    const { data, error } = await supabase
      .from('delivery_agents')
      .select('*, profiles(full_name, phone, avatar_url)');

    if (error || !data) return [];

    return data.map((a) => ({
      id: a.id,
      user_id: a.user_id,
      name: a.profiles?.full_name || 'كابتن توصيل',
      phone: a.profiles?.phone || '01200000000',
      avatar_url: a.profiles?.avatar_url,
      vehicle_type: a.vehicle_type === 'motorcycle' ? 'motorcycle' : 'bicycle',
      national_id: a.id_number || '29900000000000',
      is_approved: a.is_approved ?? true,
      is_online: a.is_online ?? true,
      active_zone: 'وسط البلد',
      rating: Number(a.rating_avg) || 4.9,
      total_trips: a.total_deliveries || 45,
      created_at: a.created_at || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch Delivery Zones from Supabase
 */
export async function fetchSupabaseZones(): Promise<DeliveryZone[]> {
  try {
    const { data, error } = await supabase.from('delivery_zones').select('*');
    if (error || !data) return [];

    return data.map((z) => ({
      id: z.id,
      name: z.name,
      fee: Number(z.fee),
      eta_minutes: z.eta_minutes || 30,
      is_active: z.is_active ?? true,
      base_delivery_fee: Number(z.fee),
      estimated_delivery_mins: z.eta_minutes || 30,
      center_lat: 30.0444,
      center_lng: 31.2357,
      radius_km: 5,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch Coupons from Supabase
 */
export async function fetchSupabaseCoupons(): Promise<Coupon[]> {
  try {
    const { data, error } = await supabase.from('coupons').select('*');
    if (error || !data) return [];

    return data.map((c) => ({
      id: c.id,
      code: c.code,
      discount_type: (c.type === 'percent' ? 'percent' : 'fixed') as 'percent' | 'fixed',
      discount_value: Number(c.value),
      min_order_amount: Number(c.min_order_amount || 0),
      max_discount_amount: c.max_discount ? Number(c.max_discount) : undefined,
      usage_limit: c.max_uses || undefined,
      used_count: c.used_count || 0,
      is_active: c.is_active ?? true,
      valid_until: c.valid_until,
    }));
  } catch {
    return [];
  }
}

/**
 * Fetch Reviews from Supabase
 */
export async function fetchSupabaseReviews(storeId?: string): Promise<Review[]> {
  try {
    let query = supabase.from('reviews').select('*, profiles(full_name)');
    if (storeId) {
      query = query.eq('store_id', storeId);
    }
    const { data, error } = await query;

    if (error || !data) return [];

    return data.map((r) => ({
      id: r.id,
      order_id: r.order_id,
      store_id: r.store_id || '',
      customer_id: r.customer_id,
      customer_name: r.profiles?.full_name || 'عميل',
      store_rating: r.store_rating || r.rating || 5,
      delivery_rating: r.agent_rating || 5,
      rating: r.store_rating || r.rating || 5,
      comment: r.store_comment || r.agent_comment || r.comment || '',
      store_response: r.store_reply || r.store_response,
      created_at: r.created_at || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

/**
 * Save new review to Supabase
 */
export async function saveSupabaseReview(review: Partial<Review>): Promise<Review> {
  const validId = ensureUUID(review.id);

  const payload: Record<string, any> = {
    id: validId,
    order_id: review.order_id ? ensureUUID(review.order_id) : null,
    store_id: review.store_id ? ensureUUID(review.store_id) : null,
    customer_id: review.customer_id ? ensureUUID(review.customer_id) : null,
    store_rating: review.store_rating || review.rating || 5,
    agent_rating: review.delivery_rating || 5,
    store_comment: review.comment || '',
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('reviews').insert([payload]).select('*, profiles(full_name)').single();
  if (error) {
    let msg = error.message || 'فشل إضافة التقييم في قاعدة البيانات';
    msg = msg.replace(/^ERROR:\s*/i, '').replace(/^[A-Z0-9]{5}:\s*/, '');
    throw new Error(msg);
  }

  return {
    id: data.id,
    order_id: data.order_id,
    store_id: data.store_id || '',
    customer_id: data.customer_id,
    customer_name: data.profiles?.full_name || review.customer_name || 'عميل',
    store_rating: data.store_rating || 5,
    delivery_rating: data.agent_rating || 5,
    rating: data.store_rating || 5,
    comment: data.store_comment || data.agent_comment || '',
    store_response: data.store_reply,
    created_at: data.created_at || new Date().toISOString(),
  };
}

/**
 * Reply to review in Supabase (updates ONLY store_reply to avoid protect_review_columns trigger rejection)
 */
export async function replySupabaseReview(reviewId: string, replyText: string): Promise<Review> {
  const validId = ensureUUID(reviewId);

  const payload = {
    store_reply: replyText,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('reviews')
    .update(payload)
    .eq('id', validId)
    .select('*, profiles(full_name)')
    .single();

  if (error) {
    let msg = error.message || 'فشل إرسال الرد على التقييم';
    msg = msg.replace(/^ERROR:\s*/i, '').replace(/^[A-Z0-9]{5}:\s*/, '');
    throw new Error(msg);
  }

  return {
    id: data.id,
    order_id: data.order_id,
    store_id: data.store_id || '',
    customer_id: data.customer_id,
    customer_name: data.profiles?.full_name || 'عميل',
    store_rating: data.store_rating || 5,
    delivery_rating: data.agent_rating || 5,
    rating: data.store_rating || 5,
    comment: data.store_comment || data.agent_comment || '',
    store_response: data.store_reply,
    created_at: data.created_at || new Date().toISOString(),
  };
}

/**
 * Fetch Notifications from Supabase
 */
export async function fetchSupabaseNotifications(userId: string): Promise<NotificationItem[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((n) => ({
      id: n.id,
      user_id: n.user_id,
      title: n.title,
      message: n.body || '',
      type: n.type === 'order' ? 'order_status' : n.type === 'promo' ? 'promotion' : 'system',
      is_read: !!n.read_at,
      created_at: n.created_at || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

/**
 * Mark a single notification read in Supabase
 */
export async function markSupabaseNotificationRead(id: string): Promise<void> {
  const validId = ensureUUID(id);
  const payload = {
    read_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('notifications').update(payload).eq('id', validId);
  if (error) {
    let msg = error.message || 'فشل تحديث الإشعار';
    msg = msg.replace(/^ERROR:\s*/i, '').replace(/^[A-Z0-9]{5}:\s*/, '');
    throw new Error(msg);
  }
}

/**
 * Mark all notifications read in Supabase
 */
export async function markAllSupabaseNotificationsRead(userId?: string): Promise<void> {
  let query = supabase.from('notifications').update({
    read_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (userId && userId !== 'all') {
    query = query.eq('user_id', ensureUUID(userId));
  } else {
    query = query.is('read_at', null);
  }
  const { error } = await query;
  if (error) {
    let msg = error.message || 'فشل تحديث جميع الإشعارات';
    msg = msg.replace(/^ERROR:\s*/i, '').replace(/^[A-Z0-9]{5}:\s*/, '');
    throw new Error(msg);
  }
}

/**
 * Delete a notification in Supabase
 */
export async function deleteSupabaseNotification(id: string): Promise<void> {
  const validId = ensureUUID(id);
  const { error } = await supabase.from('notifications').delete().eq('id', validId);
  if (error) {
    let msg = error.message || 'فشل حذف الإشعار';
    msg = msg.replace(/^ERROR:\s*/i, '').replace(/^[A-Z0-9]{5}:\s*/, '');
    throw new Error(msg);
  }
}

/**
 * Clear notifications in Supabase
 */
export async function clearSupabaseNotifications(userId?: string): Promise<void> {
  let query = supabase.from('notifications').delete();
  if (userId && userId !== 'all') {
    query = query.eq('user_id', ensureUUID(userId));
  } else {
    query = query.neq('id', '00000000-0000-0000-0000-000000000000');
  }
  const { error } = await query;
  if (error) {
    let msg = error.message || 'فشل مسح الإشعارات';
    msg = msg.replace(/^ERROR:\s*/i, '').replace(/^[A-Z0-9]{5}:\s*/, '');
    throw new Error(msg);
  }
}

/**
 * Fetch Payouts from Supabase
 */
export async function fetchSupabasePayouts(): Promise<Payout[]> {
  try {
    const { data, error } = await supabase
      .from('payouts')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((p) => ({
      id: p.id,
      recipient_id: p.recipient_id,
      recipient_name: p.profiles?.full_name || 'مستفيد',
      recipient_type: p.recipient_type,
      amount: Number(p.amount),
      status: p.status,
      method: p.method,
      reference: p.reference,
      period_start: p.period_start,
      period_end: p.period_end,
      notes: p.notes,
      created_at: p.created_at || new Date().toISOString(),
      processed_at: p.processed_at,
      processed_by: p.processed_by,
    }));
  } catch {
    return [];
  }
}

/**
 * Update payout status via process_payout_secure RPC (enforces admin check, status='pending' atomic lock, and audit log)
 */
export async function updateSupabasePayoutStatus(
  payoutId: string,
  newStatus: 'completed' | 'failed',
  notes?: string
): Promise<Payout> {
  const { data, error } = await supabase.rpc('process_payout_secure', {
    p_payout_id: ensureUUID(payoutId),
    p_new_status: newStatus,
    p_notes: notes || null,
  });

  if (error) {
    let msg = error.message || 'فشل تحديث حالة التسوية';
    msg = msg.replace(/^ERROR:\s*/i, '').replace(/^[A-Z0-9]{5}:\s*/, '');
    throw new Error(msg);
  }

  return data as Payout;
}

/**
 * Seed initial data directly into Supabase tables if empty
 */
export async function seedSupabaseDatabase() {
  try {
    // 1. Seed categories if empty
    const { count: catCount } = await supabase.from('categories').select('*', { count: 'exact', head: true });
    if (!catCount || catCount === 0) {
      await supabase.from('categories').insert([
        { name: 'سوبر ماركت وبقالة', slug: 'grocery', icon: '🛒', sort_order: 1 },
        { name: 'خضروات وفواكه طازجة', slug: 'vegetables', icon: '🥬', sort_order: 2 },
        { name: 'لحوم ودواجن', slug: 'meat', icon: '🥩', sort_order: 3 },
        { name: 'صيدلية ومستلزمات طبية', slug: 'pharmacy', icon: '💊', sort_order: 4 },
        { name: 'مخبوزات وحلويات', slug: 'bakery', icon: '🥐', sort_order: 5 },
        { name: 'مشروبات وعصائر', slug: 'beverages', icon: '🧃', sort_order: 6 },
      ]);
    }

    // 2. Seed delivery zones if empty
    const { count: zoneCount } = await supabase.from('delivery_zones').select('*', { count: 'exact', head: true });
    if (!zoneCount || zoneCount === 0) {
      await supabase.from('delivery_zones').insert([
        { name: 'وسط البلد - القاهرة', fee: 15.0, eta_minutes: 25, is_active: true },
        { name: 'مدينة نصر ومصر الجديدة', fee: 20.0, eta_minutes: 35, is_active: true },
        { name: 'المعادي والمقطم', fee: 22.0, eta_minutes: 40, is_active: true },
        { name: 'الدقي والمهندسين', fee: 18.0, eta_minutes: 30, is_active: true },
      ]);
    }

    // 3. Seed coupons if empty
    const { count: couponCount } = await supabase.from('coupons').select('*', { count: 'exact', head: true });
    if (!couponCount || couponCount === 0) {
      await supabase.from('coupons').insert([
        { code: 'ALABABAK10', type: 'percent', value: 10, min_order_amount: 100, max_discount: 30, is_active: true },
        { code: 'FREE2026', type: 'fixed', value: 15, min_order_amount: 150, is_active: true },
      ]);
    }

    return { success: true, message: 'تم تهيئة وتغذية البيانات الحقيقية بنجاح في Supabase!' };
  } catch (err) {
    return { success: false, message: `تعذر التغذية التلقائية: ${String(err)}` };
  }
}

/**
 * Save/Upsert Store in Supabase
 */
export async function saveSupabaseStore(store: Partial<Store>): Promise<Store> {
  const validId = ensureUUID(store.id);
  store.id = validId;
  let ownerId = store.owner_id ? ensureUUID(store.owner_id) : '';

  try {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user?.id) {
      ownerId = authData.user.id;
    }
  } catch {
    // Ignore
  }

  if (!ownerId) {
    ownerId = ensureUUID();
  }

  const payload: Record<string, any> = {
    id: validId,
    owner_id: ownerId,
    name: store.name || 'متجر جديد',
    slug: store.slug || (store.name || 'store').toLowerCase().replace(/\s+/g, '-') + '-' + validId.slice(0, 4),
    description: store.description || '',
    phone: store.phone || '01000000000',
    address: store.address || 'القاهرة، مصر',
    logo_url: store.logo_url || null,
    cover_url: store.banner_url || null,
    is_active: store.is_open ?? true,
    min_order_amount: store.min_order_amount ?? 0,
    updated_at: new Date().toISOString(),
  };

  if (store.is_approved !== undefined) {
    payload.is_approved = store.is_approved;
  }
  if (store.commission_rate !== undefined) {
    payload.commission_pct = store.commission_rate;
  }

  if (store.category_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(store.category_id)) {
    payload.category_id = store.category_id;
  }

  const { data, error } = await supabase.from('stores').upsert(payload, { onConflict: 'id' }).select('*, categories(name)').single();
  if (error) {
    let msg = error.message || 'فشل حفظ بيانات المتجر في قاعدة البيانات';
    msg = msg.replace(/^ERROR:\s*/i, '').replace(/^[A-Z0-9]{5}:\s*/, '');
    throw new Error(msg);
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug || data.name,
    owner_id: data.owner_id,
    category_id: data.category_id || '',
    category_name: data.categories?.name || store.category_name || 'عام',
    description: data.description || '',
    logo_url: data.logo_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300',
    banner_url: data.cover_url,
    address: data.address || 'القاهرة، مصر',
    lat: 30.0444,
    lng: 31.2357,
    phone: data.phone || '',
    is_approved: data.is_approved ?? true,
    is_open: data.is_active ?? true,
    rating: Number(data.rating_avg) || 4.8,
    reviews_count: data.rating_count || 12,
    commission_rate: Number(data.commission_pct) || 15,
    min_order_amount: Number(data.min_order_amount) || 0,
    delivery_fee: 15,
    opening_hours: data.working_hours || { everyday: { open: '08:00', close: '23:00' } },
    created_at: data.created_at || new Date().toISOString(),
  };
}

/**
 * Save/Upsert Product in Supabase
 */
export async function saveSupabaseProduct(product: Partial<Product>): Promise<Product> {
  const validId = ensureUUID(product.id);
  product.id = validId;
  const validStoreId = product.store_id ? ensureUUID(product.store_id) : '';
  if (!validStoreId) {
    throw new Error('المتجر غير محدد للمنتج');
  }

  const payload: Record<string, any> = {
    id: validId,
    store_id: validStoreId,
    name: product.name || 'منتج جديد',
    slug: (product.name || 'prod').toLowerCase().replace(/\s+/g, '-') + '-' + validId.slice(0, 4),
    description: product.description || '',
    price: product.price || 0,
    old_price: product.original_price || null,
    stock: product.stock ?? 50,
    images: product.image_url ? [product.image_url] : [],
    is_active: product.is_active ?? true,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('products').upsert(payload, { onConflict: 'id' }).select('*').single();
  if (error) {
    let msg = error.message || 'فشل حفظ المنتج في قاعدة البيانات';
    msg = msg.replace(/^ERROR:\s*/i, '').replace(/^[A-Z0-9]{5}:\s*/, '');
    throw new Error(msg);
  }

  return {
    id: data.id,
    store_id: data.store_id,
    name: data.name,
    description: data.description || '',
    price: Number(data.price),
    original_price: data.old_price ? Number(data.old_price) : undefined,
    category_name: product.category_name || 'عام',
    image_url: data.images?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300',
    stock: data.stock ?? 50,
    is_active: data.is_active ?? true,
    unit: product.unit || 'قطعة',
    created_at: data.created_at || new Date().toISOString(),
  };
}

/**
 * Save/Upsert Delivery Agent in Supabase
 */
export async function saveSupabaseAgent(agent: Partial<DeliveryAgent>): Promise<DeliveryAgent> {
  const validId = ensureUUID(agent.id);
  agent.id = validId;
  let userId = agent.user_id ? ensureUUID(agent.user_id) : '';

  try {
    const { data: authData } = await supabase.auth.getUser();
    if (authData?.user?.id) {
      userId = authData.user.id;
    }
  } catch {
    // Ignore
  }

  if (!userId) {
    userId = ensureUUID();
  }

  const vehicleMap: Record<string, string> = {
    motorcycle: 'motorcycle',
    scooter: 'motorcycle',
    bicycle: 'bicycle',
    car: 'car',
    walking: 'walking',
  };

  const payload: Record<string, any> = {
    id: validId,
    user_id: userId,
    vehicle_type: vehicleMap[agent.vehicle_type || ''] || 'motorcycle',
    plate_number: agent.license_plate || null,
    id_number: agent.national_id || null,
    is_online: agent.is_online ?? true,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  if (agent.is_approved !== undefined) {
    payload.is_approved = agent.is_approved;
  }

  const { data, error } = await supabase.from('delivery_agents').upsert(payload, { onConflict: 'id' }).select('*, profiles(full_name, phone, avatar_url)').single();
  if (error) {
    let msg = error.message || 'فشل حفظ بيانات كابتن التوصيل في قاعدة البيانات';
    msg = msg.replace(/^ERROR:\s*/i, '').replace(/^[A-Z0-9]{5}:\s*/, '');
    throw new Error(msg);
  }

  return {
    id: data.id,
    user_id: data.user_id,
    name: data.profiles?.full_name || agent.name || 'كابتن توصيل',
    phone: data.profiles?.phone || agent.phone || '01200000000',
    avatar_url: data.profiles?.avatar_url || agent.avatar_url,
    vehicle_type: data.vehicle_type === 'motorcycle' ? 'motorcycle' : 'bicycle',
    national_id: data.id_number || agent.national_id || '29900000000000',
    license_plate: data.plate_number || agent.license_plate,
    is_approved: data.is_approved ?? true,
    is_online: data.is_online ?? true,
    active_zone: agent.active_zone || 'وسط البلد',
    rating: Number(data.rating_avg) || 4.9,
    total_trips: data.total_deliveries || agent.total_trips || 45,
    created_at: data.created_at || new Date().toISOString(),
  };
}

/**
 * Secure Order creation payload interface
 */
export interface SecureOrderPayload {
  store_id: string;
  address: CustomerAddress;
  payment_method: 'cash' | 'online';
  items: Array<{
    product_id: string;
    quantity: number;
    options?: any;
    notes?: string;
  }>;
  coupon_code?: string;
  customer_notes?: string;
  tip_amount?: number;
}

export interface SecureOrderResponse {
  order_id: string;
  code: string;
  subtotal: number;
  delivery_fee: number;
  tip_amount: number;
  discount: number;
  total: number;
  status: string;
}

/**
 * Call secure order creation RPC function in Supabase
 */
export async function createSecureOrder(params: SecureOrderPayload): Promise<SecureOrderResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('يجب تسجيل الدخول لإنشاء طلب');
  }
  const userId = session.user.id;

  // 1. Ensure address exists in Supabase addresses table for auth.uid()
  const validAddressId = ensureUUID(params.address.id);
  const addressPayload = {
    id: validAddressId,
    user_id: userId,
    label: params.address.title || 'عنوان التوصيل',
    street: params.address.address_line || 'القاهرة',
    building: params.address.building || null,
    floor: params.address.floor || null,
    apartment: params.address.apartment || null,
    notes: params.address.notes || null,
    updated_at: new Date().toISOString(),
  };

  const { error: addrErr } = await supabase.from('addresses').upsert(addressPayload, { onConflict: 'id' });
  if (addrErr) {
    console.warn('Address upsert prior to secure order creation warning:', addrErr.message);
  }

  // 2. Prepare items for RPC
  const formattedItems = params.items.map((item) => ({
    product_id: ensureUUID(item.product_id),
    quantity: Math.max(1, Number(item.quantity) || 1),
    options: item.options || {},
    notes: item.notes ? String(item.notes).trim() : null,
  }));

  // 3. Invoke create_order_secure RPC
  const { data, error } = await supabase.rpc('create_order_secure', {
    p_store_id: ensureUUID(params.store_id),
    p_address_id: validAddressId,
    p_payment_method: params.payment_method === 'online' ? 'online' : 'cash',
    p_items: formattedItems,
    p_coupon_code: params.coupon_code ? params.coupon_code.trim() : null,
    p_customer_notes: params.customer_notes ? params.customer_notes.trim() : null,
    p_tip_amount: params.tip_amount ? Number(params.tip_amount) : 0,
  });

  if (error) {
    let msg = error.message || 'تعذر إنشاء الطلب على السيرفر';
    msg = msg.replace(/^ERROR:\s*/i, '').replace(/^[A-Z0-9]{5}:\s*/, '');
    throw new Error(msg);
  }

  if (!data || !data.order_id) {
    throw new Error('حدث خطأ غير متوقع أثناء معالجة الطلب على السيرفر.');
  }

  return {
    order_id: data.order_id,
    code: data.code,
    subtotal: Number(data.subtotal || 0),
    delivery_fee: Number(data.delivery_fee || 0),
    tip_amount: Number(data.tip_amount || 0),
    discount: Number(data.discount || 0),
    total: Number(data.total || 0),
    status: data.status || 'pending',
  };
}

/**
 * Save/Create Order in Supabase via create_order_secure RPC
 */
export async function saveSupabaseOrder(order: Partial<Order>): Promise<SecureOrderResponse> {
  if (!order.store_id) {
    throw new Error('المتجر غير محدد في الطلب');
  }

  if (!order.items || order.items.length === 0) {
    throw new Error('السلة فارغة');
  }

  const result = await createSecureOrder({
    store_id: order.store_id,
    address: order.delivery_address || {
      id: ensureUUID(),
      user_id: order.customer_id || '',
      title: 'عنوان التوصيل',
      address_line: 'القاهرة',
      building: '',
      floor: '',
      apartment: '',
      lat: 30.0444,
      lng: 31.2357,
      is_default: false,
    },
    payment_method: order.payment_method === 'online' ? 'online' : 'cash',
    items: order.items.map((i) => ({
      product_id: i.product_id,
      quantity: i.quantity,
      notes: i.notes,
    })),
    coupon_code: order.coupon_code,
    customer_notes: order.customer_notes,
    tip_amount: order.tip_amount || 0,
  });

  return result;
}

/**
 * Update Order Status in Supabase
 */
export async function updateSupabaseOrderStatus(orderId: string, status: string, note?: string) {
  try {
    await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId);
    if (note) {
      await supabase.from('order_status_history').insert([{ order_id: orderId, status, note }]);
    }
  } catch (err) {
    console.error('Failed to update order status in Supabase:', err);
  }
}

/**
 * Save/Upsert Delivery Zone in Supabase
 */
export async function saveSupabaseZone(zone: Partial<DeliveryZone>) {
  try {
    const payload = {
      id: zone.id,
      name: zone.name,
      fee: zone.fee || zone.base_delivery_fee,
      eta_minutes: zone.eta_minutes || zone.estimated_delivery_mins || 30,
      is_active: zone.is_active ?? true,
    };
    await supabase.from('delivery_zones').upsert(payload);
  } catch (err) {
    console.error('Failed to save zone to Supabase:', err);
  }
}

/**
 * Save/Upsert Coupon in Supabase
 */
export async function saveSupabaseCoupon(coupon: Partial<Coupon>) {
  try {
    const payload = {
      id: coupon.id,
      code: coupon.code,
      type: coupon.discount_type === 'percent' ? 'percent' : 'fixed',
      value: coupon.discount_value,
      min_order_amount: coupon.min_order_amount || 0,
      max_discount: coupon.max_discount_amount,
      max_uses: coupon.usage_limit,
      is_active: coupon.is_active ?? true,
      valid_until: coupon.valid_until,
    };
    await supabase.from('coupons').upsert(payload);
  } catch (err) {
    console.error('Failed to save coupon to Supabase:', err);
  }
}

/* ========================================================================
 * Generic CRUD Helpers
 * ======================================================================== */

/**
 * List records from any table with optional filters, pagination, and sorting
 */
export async function listSupabase<T>(
  table: string,
  options?: {
    filters?: Record<string, unknown>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
  }
): Promise<PaginatedResult<T>> {
  try {
    let query = supabase.from(table).select('*', { count: 'exact' });

    if (options?.filters) {
      Object.entries(options.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    if (options?.orderBy) {
      query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
    }

    if (options?.limit !== undefined) {
      const offset = options.offset || 0;
      query = query.range(offset, offset + options.limit - 1);
    }

    const { data, count, error } = await query;
    if (error) {
      console.error(`Error listing records from '${table}':`, error.message);
      throw new Error(`Failed to list ${table}: ${error.message}`);
    }

    return {
      data: (data as T[]) || [],
      count: count || 0,
    };
  } catch (err) {
    console.error(`listSupabase error for table '${table}':`, err);
    return { data: [], count: 0 };
  }
}

/**
 * Get a single record by ID from a table
 */
export async function getSupabaseById<T>(table: string, id: string): Promise<T | null> {
  try {
    const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
    if (error) {
      if (error.code === 'PGRST116') return null; // record not found
      console.error(`Error in getSupabaseById('${table}', '${id}'):`, error.message);
      throw new Error(`Failed to get ${table} by ID: ${error.message}`);
    }
    return data as T;
  } catch (err) {
    console.error(`getSupabaseById error for '${table}':`, err);
    return null;
  }
}

/**
 * Create a record in a table
 */
export async function createSupabase<T>(table: string, data: Partial<T>): Promise<T> {
  try {
    const payload = { ...data };
    if (!(payload as Record<string, unknown>).id) {
      (payload as Record<string, unknown>).id = ensureUUID();
    }
    const { data: created, error } = await supabase.from(table).insert([payload as any]).select('*').single();
    if (error) {
      console.error(`Error in createSupabase('${table}'):`, error.message);
      throw new Error(`Failed to create row in ${table}: ${error.message}`);
    }
    return created as T;
  } catch (err) {
    console.error(`createSupabase error for '${table}':`, err);
    throw err;
  }
}

/**
 * Update a record by ID in a table
 */
export async function updateSupabase<T>(table: string, id: string, data: Partial<T>): Promise<T> {
  try {
    const payload = { ...data, updated_at: new Date().toISOString() };
    const { data: updated, error } = await supabase.from(table).update(payload).eq('id', id).select('*').single();
    if (error) {
      console.error(`Error in updateSupabase('${table}', '${id}'):`, error.message);
      throw new Error(`Failed to update ${table}: ${error.message}`);
    }
    return updated as T;
  } catch (err) {
    console.error(`updateSupabase error for '${table}':`, err);
    throw err;
  }
}

/**
 * Delete a record by ID from a table
 */
export async function deleteSupabase(table: string, id: string): Promise<void> {
  try {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) {
      console.error(`Error in deleteSupabase('${table}', '${id}'):`, error.message);
      throw new Error(`Failed to delete row from ${table}: ${error.message}`);
    }
  } catch (err) {
    console.error(`deleteSupabase error for '${table}':`, err);
    throw err;
  }
}

/* ========================================================================
 * Entity-Specific Typed Helper Methods
 * ======================================================================== */

export const listSupabaseStores = (options?: Parameters<typeof listSupabase>[1]) => listSupabase<Store>('stores', options);
export const getSupabaseStoreById = (id: string) => getSupabaseById<Store>('stores', id);
export const createSupabaseStore = (data: Partial<Store>) => createSupabase<Store>('stores', data);
export const updateSupabaseStore = (id: string, data: Partial<Store>) => updateSupabase<Store>('stores', id, data);
export const deleteSupabaseStore = (id: string) => deleteSupabase('stores', id);

export const listSupabaseProducts = (options?: Parameters<typeof listSupabase>[1]) => listSupabase<Product>('products', options);
export const getSupabaseProductById = (id: string) => getSupabaseById<Product>('products', id);
export const createSupabaseProduct = (data: Partial<Product>) => createSupabase<Product>('products', data);
export const updateSupabaseProduct = (id: string, data: Partial<Product>) => updateSupabase<Product>('products', id, data);
export const deleteSupabaseProduct = (id: string) => deleteSupabase('products', id);

export const listSupabaseOrders = (options?: Parameters<typeof listSupabase>[1]) => listSupabase<Order>('orders', options);
export const getSupabaseOrderById = (id: string) => getSupabaseById<Order>('orders', id);
export const createSupabaseOrder = (data: Partial<Order>) => createSupabase<Order>('orders', data);
export const updateSupabaseOrder = (id: string, data: Partial<Order>) => updateSupabase<Order>('orders', id, data);
export const deleteSupabaseOrder = (id: string) => deleteSupabase('orders', id);

export const listSupabaseUsers = (options?: Parameters<typeof listSupabase>[1]) => listSupabase<UserProfile>('profiles', options);
export const getSupabaseUserById = (id: string) => getSupabaseById<UserProfile>('profiles', id);

export const listSupabaseAgents = (options?: Parameters<typeof listSupabase>[1]) => listSupabase<DeliveryAgent>('delivery_agents', options);
export const deleteSupabaseAgent = (id: string) => deleteSupabase('delivery_agents', id);
export const listSupabaseZones = (options?: Parameters<typeof listSupabase>[1]) => listSupabase<DeliveryZone>('delivery_zones', options);
export const listSupabaseCoupons = (options?: Parameters<typeof listSupabase>[1]) => listSupabase<Coupon>('coupons', options);
export const listSupabaseReviews = (options?: Parameters<typeof listSupabase>[1]) => listSupabase<Review>('reviews', options);
export const listSupabaseNotifications = (options?: Parameters<typeof listSupabase>[1]) => listSupabase<NotificationItem>('notifications', options);
export const listSupabasePayouts = (options?: Parameters<typeof listSupabase>[1]) => listSupabase<Payout>('payouts', options);
export const listSupabaseActivityLogs = (options?: Parameters<typeof listSupabase>[1]) => listSupabase<ActivityLog>('activity_log', options);
export const listSupabaseChatMessages = (options?: Parameters<typeof listSupabase>[1]) => listSupabase<ChatMessage>('chat_messages', options);

/* ========================================================================
 * Real-Time Subscriptions
 * ======================================================================== */

/**
 * Subscribe to realtime changes on any table
 */
export function subscribeSupabase<T>(
  table: string,
  callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: T; old: T }) => void,
  filter?: string
): () => void {
  const channelName = `realtime:${table}:${Math.random().toString(36).slice(2, 9)}`;
  const channel = supabase.channel(channelName);

  const eventConfig: Record<string, unknown> = {
    event: '*',
    schema: 'public',
    table,
  };

  if (filter) {
    eventConfig.filter = filter;
  }

  channel
    .on(
      'postgres_changes' as unknown as 'system',
      eventConfig as unknown as any,
      (payload: any) => {
        callback({
          eventType: payload.eventType,
          new: payload.new as T,
          old: payload.old as T,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Specialized real-time listener for orders
 */
export function subscribeToOrders(callback: (payload: any) => void): () => void {
  return subscribeSupabase('orders', callback);
}

/**
 * Specialized real-time listener for user notifications
 */
export function subscribeToNotifications(userId: string, callback: (payload: any) => void): () => void {
  return subscribeSupabase('notifications', callback, `user_id=eq.${userId}`);
}

/**
 * Specialized real-time listener for chat messages in an order
 */
export function subscribeToChatMessages(orderId: string, callback: (payload: any) => void): () => void {
  return subscribeSupabase('chat_messages', callback, `order_id=eq.${orderId}`);
}

/* ========================================================================
 * Specialized Query Helpers
 * ======================================================================== */

/**
 * Fetch a full order with items and details
 */
export async function fetchOrderWithDetails(orderId: string): Promise<Order | null> {
  try {
    const orders = await fetchSupabaseOrders();
    const match = orders.find((o) => o.id === orderId);
    return match || null;
  } catch (err) {
    console.error('Error in fetchOrderWithDetails:', err);
    return null;
  }
}

/**
 * Fetch store with its products
 */
export async function fetchStoreWithProducts(storeId: string): Promise<{ store: Store; products: Product[] } | null> {
  try {
    const stores = await fetchSupabaseStores();
    const store = stores.find((s) => s.id === storeId);
    if (!store) return null;

    const products = await fetchSupabaseProducts(storeId);
    return { store, products };
  } catch (err) {
    console.error('Error in fetchStoreWithProducts:', err);
    return null;
  }
}

/**
 * Fetch orders belonging to a specific customer
 */
export async function fetchCustomerOrders(
  customerId: string,
  options?: { limit?: number; offset?: number }
): Promise<Order[]> {
  try {
    const allOrders = await fetchSupabaseOrders();
    let customerOrders = allOrders.filter((o) => o.customer_id === customerId);
    if (options?.offset) {
      customerOrders = customerOrders.slice(options.offset);
    }
    if (options?.limit) {
      customerOrders = customerOrders.slice(0, options.limit);
    }
    return customerOrders;
  } catch (err) {
    console.error('Error in fetchCustomerOrders:', err);
    return [];
  }
}

/**
 * Fetch orders available for delivery agents (ready & unassigned)
 */
export async function fetchAgentAvailableOrders(): Promise<Order[]> {
  try {
    const allOrders = await fetchSupabaseOrders();
    return allOrders.filter((o) => o.status === 'ready' && !o.delivery_agent_id);
  } catch (err) {
    console.error('Error in fetchAgentAvailableOrders:', err);
    return [];
  }
}

/**
 * Fetch statistics for a store
 */
export async function fetchStoreStats(
  storeId: string
): Promise<{ total_orders: number; total_revenue: number; avg_rating: number } | null> {
  try {
    const { data, error } = await supabase
      .from('store_stats')
      .select('*')
      .eq('store_id', storeId)
      .single();

    if (error || !data) {
      const orders = await fetchSupabaseOrders();
      const storeOrders = orders.filter((o) => o.store_id === storeId);
      const total_orders = storeOrders.length;
      const total_revenue = storeOrders.reduce((sum, o) => sum + o.total, 0);
      return { total_orders, total_revenue, avg_rating: 4.8 };
    }

    return {
      total_orders: Number(data.total_orders || 0),
      total_revenue: Number(data.total_revenue || 0),
      avg_rating: Number(data.avg_rating || 4.8),
    };
  } catch (err) {
    console.error('Error in fetchStoreStats:', err);
    return null;
  }
}

/**
 * Fetch statistics for a delivery agent
 */
export async function fetchAgentStats(
  agentId: string
): Promise<{ total_trips: number; total_earnings: number; rating: number } | null> {
  try {
    const { data, error } = await supabase
      .from('agent_stats')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (error || !data) {
      const orders = await fetchSupabaseOrders();
      const agentOrders = orders.filter((o) => o.delivery_agent_id === agentId && o.status === 'delivered');
      return {
        total_trips: agentOrders.length,
        total_earnings: agentOrders.reduce((sum, o) => sum + o.delivery_fee, 0),
        rating: 4.9,
      };
    }

    return {
      total_trips: Number(data.total_trips || 0),
      total_earnings: Number(data.total_earnings || 0),
      rating: Number(data.rating || 4.9),
    };
  } catch (err) {
    console.error('Error in fetchAgentStats:', err);
    return null;
  }
}


