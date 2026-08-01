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
  Payout
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
    const validId = ensureUUID(user.id);
    user.id = validId; // Ensure user object retains the valid UUID

    const payload: Record<string, any> = {
      id: validId,
      email: user.email || '',
      full_name: user.name || '',
      phone: user.phone || '',
      role: user.role || 'customer',
      avatar_url: user.avatar_url || null,
      associated_store_id: user.associated_store_id || null,
      updated_at: new Date().toISOString(),
    };
    
    // Attempt 1: upsert with full payload into 'profiles' table
    const { error } = await supabase.from('profiles').upsert(payload);
    if (error) {
      console.warn('Supabase profiles save attempt 1 info:', error.message);
      // Attempt 2: fallback payload without optional extra fields
      const fallbackPayload = {
        id: validId,
        email: user.email || '',
        full_name: user.name || '',
        phone: user.phone || '',
        role: user.role || 'customer',
      };
      const { error: err2 } = await supabase.from('profiles').upsert(fallbackPayload);
      if (err2) {
        console.warn('Supabase profiles save attempt 2 info:', err2.message);
      }
    }
  } catch (err) {
    console.error('Failed to save user profile to Supabase:', err);
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
      payment_method: o.payment_method === 'online' ? 'card' : 'cod',
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
      discount_type: c.type === 'percent' ? 'percent' : 'flat',
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
export async function fetchSupabaseReviews(): Promise<Review[]> {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*, profiles(full_name)');

    if (error || !data) return [];

    return data.map((r) => ({
      id: r.id,
      order_id: r.order_id,
      store_id: r.store_id || '',
      customer_id: r.customer_id,
      customer_name: r.profiles?.full_name || 'عميل',
      store_rating: r.store_rating || 5,
      delivery_rating: r.agent_rating || 5,
      comment: r.store_comment || r.agent_comment || '',
      store_response: r.store_reply,
      created_at: r.created_at || new Date().toISOString(),
    }));
  } catch {
    return [];
  }
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
    }));
  } catch {
    return [];
  }
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
export async function saveSupabaseStore(store: Partial<Store>) {
  try {
    const payload = {
      id: store.id,
      name: store.name,
      slug: store.slug || store.name?.toLowerCase().replace(/\s+/g, '-'),
      description: store.description,
      phone: store.phone || '01000000000',
      address: store.address || 'القاهرة، مصر',
      logo_url: store.logo_url,
      cover_url: store.banner_url,
      is_active: store.is_open ?? true,
      is_approved: store.is_approved ?? true,
      commission_pct: store.commission_rate ?? 15,
      min_order_amount: store.min_order_amount ?? 0,
    };
    await supabase.from('stores').upsert(payload);
  } catch (err) {
    console.error('Failed to save store to Supabase:', err);
  }
}

/**
 * Save/Upsert Product in Supabase
 */
export async function saveSupabaseProduct(product: Partial<Product>) {
  try {
    const payload = {
      id: product.id,
      store_id: product.store_id,
      name: product.name,
      slug: product.name?.toLowerCase().replace(/\s+/g, '-') || `prod-${Date.now()}`,
      description: product.description,
      price: product.price,
      old_price: product.original_price,
      stock: product.stock ?? 50,
      images: product.image_url ? [product.image_url] : [],
      is_active: product.is_active ?? true,
    };
    await supabase.from('products').upsert(payload);
  } catch (err) {
    console.error('Failed to save product to Supabase:', err);
  }
}

/**
 * Save/Upsert Order in Supabase
 */
export async function saveSupabaseOrder(order: Partial<Order>) {
  try {
    const payload = {
      id: order.id,
      code: order.order_number,
      customer_id: order.customer_id || 'usr-customer-1',
      store_id: order.store_id,
      delivery_agent_id: order.delivery_agent_id,
      address_id: order.delivery_address?.id || 'addr-1',
      subtotal: order.subtotal,
      delivery_fee: order.delivery_fee,
      discount: order.discount_amount || 0,
      total: order.total,
      payment_method: order.payment_method === 'card' ? 'online' : 'cash',
      payment_status: order.payment_status === 'paid' ? 'paid' : 'pending',
      status: order.status || 'pending',
      customer_notes: order.customer_notes,
    };
    await supabase.from('orders').upsert(payload);

    // Save order items if available
    if (order.items && order.items.length > 0) {
      const itemsPayload = order.items.map((item) => ({
        id: item.id,
        order_id: order.id,
        product_id: item.product_id,
        name: item.product_name,
        price: item.unit_price,
        quantity: item.quantity,
        subtotal: item.total_price,
        notes: item.notes,
      }));
      await supabase.from('order_items').upsert(itemsPayload);
    }
  } catch (err) {
    console.error('Failed to save order to Supabase:', err);
  }
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

