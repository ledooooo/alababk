// src/lib/storage.ts
import { Session } from '@supabase/supabase-js';
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
  OrderStatus,
  Payout,
} from '../types/domain';
import { DEFAULT_CATEGORIES, EGYPT_DEFAULT_ZONES } from './constants';
import {
  supabase,
  ensureUUID,
  isValidUUID,
  saveSupabaseUser,
  fetchSupabaseUsers,
  saveSupabaseStore,
  saveSupabaseProduct,
  saveSupabaseAgent,
  createSecureOrder,
  updateOrderStatusByStore,
  assignOrderToAgent,
  updateOrderStatusByAgent,
  cancelOrderByCustomer,
  adminUpdateOrder,
  updateSupabaseOrderLocation,
  markOrderPaymentStatus,
  saveSupabaseZone,
  saveSupabaseCoupon,
  fetchSupabaseStores,
  fetchSupabaseProducts,
  fetchSupabaseOrders,
  fetchSupabaseCategories,
  fetchSupabaseZones,
  fetchSupabaseCoupons,
  fetchSupabaseAgents,
  fetchSupabaseReviews,
  saveSupabaseReview,
  replySupabaseReview,
  fetchSupabaseNotifications,
  createSupabaseNotification,
  listAllSupabaseNotifications,
  markSupabaseNotificationRead,
  markAllSupabaseNotificationsRead,
  deleteSupabaseNotification,
  clearSupabaseNotifications,
  fetchSupabasePayouts,
  createSupabasePayout,
  updateSupabasePayoutStatus,
  deleteSupabase,
  deleteSupabaseProduct,
  deleteSupabaseStore,
  deleteSupabaseAgent,
  fetchMyStore,
  upsertAddress,
  fetchAddresses,
  deleteAddress,
  translateSupabaseError,
} from './supabase';

// تعريف المتغيرات المستقلة للـ My Store Cache
let _myStoreCache: { store: Store | null; timestamp: number } | null = null;
const MY_STORE_CACHE_TTL: number = 30000;

// منع الحلقات اللانهائية: دوال getX() تطلق refreshX() في الخلفية، وrefreshX() تبعث
// notifyStorageChange التي يسمعها subscribeToStorageChange في مكونات مثل Navbar/ProfileView،
// فتستدعي getX() مرة أخرى وتكرر الدورة (orders/profiles/notifications في الـ network log).
// الـthrottle ده كان قبل كده Map في الذاكرة، يعني كل تاب مفتوح عنده نسخته الخاصة ومعاه
// عداده الخاص — ففتح نفس التطبيق في تابين كان بيضاعف عدد الطلبات الفعلية بدل ما يقللها،
// خصوصًا إن فيه BroadcastChannel بينشر نفس الحدث على كل التابات. دلوقتي بقى الـthrottle
// state مشترك عبر localStorage عشان كل التابات تتفق على آخر وقت تم فيه fetch فعلي.
const REFRESH_THROTTLE_MS = 8000;
const THROTTLE_STORAGE_KEY = 'alababak_refresh_throttle_v1';
// fallback في حالة عدم توفر localStorage (SSR، خصوصية المتصفح، إلخ)
const _refreshThrottleMemFallback = new Map<string, number>();

function readThrottleMap(): Record<string, number> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(THROTTLE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeThrottleMap(map: Record<string, number>) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(THROTTLE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // تجاهل أخطاء الحصة/الخصوصية، مفيش ضرر لو ما اتسجّلش
  }
}

function shouldTriggerBackgroundRefresh(key: string): boolean {
  const now = Date.now();
  if (typeof window === 'undefined' || !window.localStorage) {
    const last = _refreshThrottleMemFallback.get(key) || 0;
    if (now - last < REFRESH_THROTTLE_MS) return false;
    _refreshThrottleMemFallback.set(key, now);
    return true;
  }
  const map = readThrottleMap();
  const last = map[key] || 0;
  if (now - last < REFRESH_THROTTLE_MS) return false;
  map[key] = now;
  writeThrottleMap(map);
  return true;
}

const lastLocationUpdateMap = new Map<string, number>();

const STORAGE_KEYS = {
  USERS: 'alababak_users',
  CURRENT_USER: 'alababak_current_user',
  STORES: 'alababak_stores',
  PRODUCTS: 'alababak_products',
  ADDRESSES: 'alababak_addresses',
  ORDERS: 'alababak_orders',
  AGENTS: 'alababak_delivery_agents',
  ZONES: 'alababak_delivery_zones',
  COUPONS: 'alababak_coupons',
  REVIEWS: 'alababak_reviews',
  NOTIFICATIONS: 'alababak_notifications',
  PAYOUTS: 'alababak_payouts',
  CART: 'alababak_cart',
  WISHLIST_STORES: 'alababak_wishlist_stores',
  WISHLIST_PRODUCTS: 'alababak_wishlist_products',
};

const SESSION_STORAGE_KEYS = Object.values(STORAGE_KEYS);

// Broadcast Channel
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('alababak_realtime_events');
  } catch {
    broadcastChannel = null;
  }
}

export function notifyStorageChange(entityType: string, action = 'update', data?: unknown) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('alababak_data_change', {
      detail: { entityType, action, data, timestamp: Date.now() },
    });
    window.dispatchEvent(event);
    if (broadcastChannel) {
      broadcastChannel.postMessage({ entityType, action, data, timestamp: Date.now() });
    }
  }
}

export function subscribeToStorageChange(
  callback: (detail: { entityType: string; action: string; data?: unknown }) => void
): () => void {
  if (typeof window === 'undefined') return () => {};
  const handleCustomEvent = (e: Event) => {
    const ce = e as CustomEvent;
    if (ce.detail) callback(ce.detail);
  };
  const handleBroadcast = (e: MessageEvent) => {
    if (e.data) callback(e.data);
  };
  window.addEventListener('alababak_data_change', handleCustomEvent);
  if (broadcastChannel) broadcastChannel.addEventListener('message', handleBroadcast);
  return () => {
    window.removeEventListener('alababak_data_change', handleCustomEvent);
    if (broadcastChannel) broadcastChannel.removeEventListener('message', handleBroadcast);
  };
}

function getStorageForKey(_key: string): Storage | null {
  return typeof window !== 'undefined' ? localStorage : null;
}

function getCached<T>(key: string): T[] {
  const storage = getStorageForKey(key);
  if (!storage) return [];
  try {
    const data = storage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setCached<T>(key: string, data: T[]): void {
  const storage = getStorageForKey(key);
  if (!storage) return;
  try {
    storage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`Failed to update cache for key '${key}':`, err);
  }
}

function mergeById<T extends { id: string }>(items: T[], item: T): T[] {
  const copy = [...items];
  const idx = copy.findIndex((i) => i.id === item.id);
  if (idx >= 0) copy[idx] = item;
  else copy.unshift(item);
  return copy;
}

function mergeManyById<T extends { id: string }>(existing: T[], incoming: T[]): T[] {
  const map = new Map<string, T>();
  existing.forEach((item) => map.set(item.id, item));
  incoming.forEach((item) => map.set(item.id, item));
  return Array.from(map.values());
}

export const StorageRepo = {
  // --- CACHE HELPERS ---
  getCachedStores(): Store[] {
    return getCached<Store>(STORAGE_KEYS.STORES);
  },
  getCachedProducts(): Product[] {
    return getCached<Product>(STORAGE_KEYS.PRODUCTS);
  },
  getCachedOrders(): Order[] {
    return getCached<Order>(STORAGE_KEYS.ORDERS);
  },
  getCachedUsers(): UserProfile[] {
    return getCached<UserProfile>(STORAGE_KEYS.USERS);
  },
  getCachedAgents(): DeliveryAgent[] {
    return getCached<DeliveryAgent>(STORAGE_KEYS.AGENTS);
  },
  getCachedZones(): DeliveryZone[] {
    return getCached<DeliveryZone>(STORAGE_KEYS.ZONES);
  },
  getCachedCoupons(): Coupon[] {
    return getCached<Coupon>(STORAGE_KEYS.COUPONS);
  },
  getCachedReviews(): Review[] {
    return getCached<Review>(STORAGE_KEYS.REVIEWS);
  },
  getCachedNotifications(): NotificationItem[] {
    return getCached<NotificationItem>(STORAGE_KEYS.NOTIFICATIONS);
  },
  getCachedPayouts(): Payout[] {
    return getCached<Payout>(STORAGE_KEYS.PAYOUTS);
  },

  invalidateCache(key: string) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    }
  },

  clearAllCaches() {
    if (typeof window !== 'undefined') {
      Object.values(STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
    }
  },

  // --- REFRESH FROM SUPABASE ---
  async refreshStores(): Promise<Store[]> {
    if (!shouldTriggerBackgroundRefresh('stores')) return this.getCachedStores();
    const stores = await fetchSupabaseStores();
    setCached(STORAGE_KEYS.STORES, stores);
    this.clearMyStoreCache();
    notifyStorageChange('store', 'refresh', stores);
    return stores;
  },

  async refreshProducts(storeId?: string): Promise<Product[]> {
    if (!shouldTriggerBackgroundRefresh(`products:${storeId || 'all'}`)) return this.getCachedProducts();
    const products = await fetchSupabaseProducts(storeId);
    if (storeId) {
      const allProds = this.getCachedProducts().filter((p) => p.store_id !== storeId);
      const merged = [...products, ...allProds];
      setCached(STORAGE_KEYS.PRODUCTS, merged);
    } else {
      setCached(STORAGE_KEYS.PRODUCTS, products);
    }
    notifyStorageChange('product', 'refresh', products);
    return products;
  },

  async refreshOrders(): Promise<Order[]> {
    if (!shouldTriggerBackgroundRefresh('orders')) return this.getCachedOrders();
    const orders = await fetchSupabaseOrders();
    setCached(STORAGE_KEYS.ORDERS, orders);
    notifyStorageChange('order', 'refresh', orders);
    return orders;
  },

  async refreshUsers(): Promise<UserProfile[]> {
    if (!shouldTriggerBackgroundRefresh('users')) return this.getCachedUsers();
    const users = await fetchSupabaseUsers();
    setCached(STORAGE_KEYS.USERS, users);
    notifyStorageChange('user', 'refresh', users);
    return users;
  },

  async refreshAgents(): Promise<DeliveryAgent[]> {
    if (!shouldTriggerBackgroundRefresh('agents')) return this.getCachedAgents();
    const agents = await fetchSupabaseAgents();
    setCached(STORAGE_KEYS.AGENTS, agents);
    notifyStorageChange('agent', 'refresh', agents);
    return agents;
  },

  async refreshZones(): Promise<DeliveryZone[]> {
    if (!shouldTriggerBackgroundRefresh('zones')) return this.getCachedZones();
    const zones = await fetchSupabaseZones();
    setCached(STORAGE_KEYS.ZONES, zones.length > 0 ? zones : EGYPT_DEFAULT_ZONES);
    notifyStorageChange('zone', 'refresh', zones);
    return zones;
  },

  async refreshCoupons(): Promise<Coupon[]> {
    if (!shouldTriggerBackgroundRefresh('coupons')) return this.getCachedCoupons();
    const coupons = await fetchSupabaseCoupons();
    setCached(STORAGE_KEYS.COUPONS, coupons);
    notifyStorageChange('coupon', 'refresh', coupons);
    return coupons;
  },

  async refreshCategories(): Promise<Category[]> {
    if (!shouldTriggerBackgroundRefresh('categories')) {
      const cached = getCached<Category>('alababak_categories');
      return cached.length > 0 ? cached : DEFAULT_CATEGORIES;
    }
    const cats = await fetchSupabaseCategories();
    const list = cats.length > 0 ? cats : DEFAULT_CATEGORIES;
    setCached('alababak_categories', list);
    notifyStorageChange('category', 'refresh', list);
    return list;
  },

  async refreshReviews(storeId?: string): Promise<Review[]> {
    if (!shouldTriggerBackgroundRefresh(`reviews:${storeId || 'all'}`)) {
      const cached = this.getCachedReviews();
      return storeId ? cached.filter((r) => r.store_id === storeId) : cached;
    }
    const list = await fetchSupabaseReviews(storeId);
    const current = this.getCachedReviews();
    const updated = storeId ? mergeManyById(current, list) : list;
    setCached(STORAGE_KEYS.REVIEWS, updated);
    const result = storeId ? updated.filter((r) => r.store_id === storeId) : updated;
    notifyStorageChange('review', 'refresh', result);
    return result;
  },

  async refreshNotifications(userId?: string): Promise<NotificationItem[]> {
    if (!shouldTriggerBackgroundRefresh(`notifications:${userId || 'all'}`)) return this.getCachedNotifications();
    const targetUser = userId || this.getCurrentUser()?.id;
    // بدون مستخدم معروف، منعملش استدعاء شبكة خالص (listAllSupabaseNotifications
    // كانت بتجيب جدول notifications بالكامل بدون فلترة أو حد أقصى — دي كانت
    // سبب ~800 ألف استدعاء في إحصائيات Supabase. الجلب الكامل المقصود للأدمن
    // لسه شغّال من خلال نداء listAllSupabaseNotifications() المباشر في
    // AdminNotificationsView).
    if (!targetUser) {
      return this.getCachedNotifications();
    }
    const list = await fetchSupabaseNotifications(targetUser);
    if (list && list.length > 0) {
      setCached(STORAGE_KEYS.NOTIFICATIONS, list);
      notifyStorageChange('notification', 'refresh', list);
      return list;
    }
    return this.getCachedNotifications();
  },

  async refreshAddresses(userId?: string): Promise<CustomerAddress[]> {
    const targetUserId = userId || this.getCurrentUser()?.id;
    if (!targetUserId) return [];
    if (!shouldTriggerBackgroundRefresh(`addresses:${targetUserId}`)) {
      return getCached<CustomerAddress>(STORAGE_KEYS.ADDRESSES).filter((a) => a.user_id === targetUserId);
    }
    const addresses = await fetchAddresses(targetUserId);
    setCached(STORAGE_KEYS.ADDRESSES, addresses);
    notifyStorageChange('address', 'refresh', addresses);
    return addresses;
  },

  async refreshPayouts(): Promise<Payout[]> {
    if (!shouldTriggerBackgroundRefresh('payouts')) return this.getCachedPayouts();
    const list = await fetchSupabasePayouts();
    const current = this.getCachedPayouts();
    const updated = mergeManyById(current, list);
    setCached(STORAGE_KEYS.PAYOUTS, updated);
    notifyStorageChange('payout', 'refresh', updated);
    return updated;
  },

  // --- USERS & AUTH ---
  getCurrentUser(): UserProfile | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  setCurrentUser(user: UserProfile | null) {
    if (typeof window === 'undefined') return;
    const prev = this.getCurrentUser();
    if (prev?.id !== user?.id) {
      SESSION_STORAGE_KEYS.forEach((key) => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      });
    }
    if (user) localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    notifyStorageChange('user', 'switch', user);
  },

  async getCurrentSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  onAuthChange(callback: (event: string, session: Session | null) => void): () => void {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    return () => subscription.unsubscribe();
  },

  logout() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    SESSION_STORAGE_KEYS.forEach((key) => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });
    supabase.auth.signOut().catch((err) => console.error('SignOut error:', err));
    notifyStorageChange('user', 'switch', null);
  },

  getUsers(): UserProfile[] {
    const cached = this.getCachedUsers();
    this.refreshUsers().catch((err) => console.warn('refreshUsers background error:', err));
    return cached;
  },

  async saveUser(
    user: UserProfile,
    options?: { isSelf?: boolean; isAdministrative?: boolean }
  ): Promise<UserProfile> {
    const currentUser = this.getCurrentUser();
    const isSelf = options?.isSelf ?? (currentUser?.id === user.id);
    const isAdministrative = options?.isAdministrative ?? (currentUser?.role === 'admin');
    const callerRole = currentUser?.role;

    const prevUsers = this.getCachedUsers();
    const updatedUsers = mergeById(prevUsers, user);
    setCached(STORAGE_KEYS.USERS, updatedUsers);
    if (isSelf || currentUser?.id === user.id) this.setCurrentUser(user);
    notifyStorageChange('user', 'save', user);

    try {
      await saveSupabaseUser(user, { isSelf, isAdministrative, callerRole });
      return user;
    } catch (err) {
      setCached(STORAGE_KEYS.USERS, prevUsers);
      if (currentUser) this.setCurrentUser(currentUser);
      else this.setCurrentUser(null);
      throw err;
    }
  },

  // --- STORES ---
  getStores(): Store[] {
    const cached = this.getCachedStores();
    this.refreshStores().catch((err) => console.warn('refreshStores background error:', err));
    return cached;
  },

  getStoreById(id: string): Store | null {
    return this.getCachedStores().find((s) => s.id === id) || null;
  },

  getStoreBySlug(slug: string): Store | null {
    return this.getCachedStores().find((s) => s.slug === slug) || null;
  },

  async saveStore(store: Store, options?: { isSelf?: boolean }): Promise<Store> {
    const currentUser = this.getCurrentUser();
    const isSelf = options?.isSelf ?? (currentUser?.id === store.owner_id);
    const prev = this.getCachedStores();
    const optimistic = mergeById(prev, store);
    setCached(STORAGE_KEYS.STORES, optimistic);
    this.clearMyStoreCache();
    notifyStorageChange('store', 'save', store);

    try {
      const saved = await saveSupabaseStore(store, { isSelf });
      const finalStores = mergeById(this.getCachedStores(), saved);
      setCached(STORAGE_KEYS.STORES, finalStores);
      this.clearMyStoreCache();
      notifyStorageChange('store', 'save', saved);
      return saved;
    } catch (err) {
      setCached(STORAGE_KEYS.STORES, prev);
      this.clearMyStoreCache();
      throw err;
    }
  },

  async deleteStore(id: string): Promise<void> {
    const prev = this.getCachedStores();
    setCached(STORAGE_KEYS.STORES, prev.filter((s) => s.id !== id));
    this.clearMyStoreCache();
    notifyStorageChange('store', 'delete', { id });
    try {
      await deleteSupabaseStore(id);
    } catch (err) {
      setCached(STORAGE_KEYS.STORES, prev);
      this.clearMyStoreCache();
      throw err;
    }
  },

  // --- PRODUCTS ---
  getProducts(storeId?: string): Product[] {
    const cached = this.getCachedProducts();
    this.refreshProducts(storeId).catch((err) => console.warn('refreshProducts background error:', err));
    if (storeId) return cached.filter((p) => p.store_id === storeId);
    return cached;
  },

  getProductById(id: string): Product | null {
    return this.getCachedProducts().find((p) => p.id === id) || null;
  },

  async saveProduct(product: Product): Promise<Product> {
    const prev = this.getCachedProducts();
    const optimistic = mergeById(prev, product);
    setCached(STORAGE_KEYS.PRODUCTS, optimistic);
    notifyStorageChange('product', 'save', product);

    try {
      const saved = await saveSupabaseProduct(product);
      const final = mergeById(this.getCachedProducts(), saved);
      setCached(STORAGE_KEYS.PRODUCTS, final);
      notifyStorageChange('product', 'save', saved);
      return saved;
    } catch (err) {
      setCached(STORAGE_KEYS.PRODUCTS, prev);
      throw err;
    }
  },

  async deleteProduct(id: string): Promise<void> {
    const prev = this.getCachedProducts();
    setCached(STORAGE_KEYS.PRODUCTS, prev.filter((p) => p.id !== id));
    notifyStorageChange('product', 'delete', { id });
    try {
      await deleteSupabaseProduct(id);
    } catch (err) {
      setCached(STORAGE_KEYS.PRODUCTS, prev);
      throw err;
    }
  },

  // --- ADDRESSES ---
  getAddresses(userId?: string): CustomerAddress[] {
    const targetUserId = userId || this.getCurrentUser()?.id;
    if (!targetUserId) return [];
    const cached = getCached<CustomerAddress>(STORAGE_KEYS.ADDRESSES);
    this.refreshAddresses(targetUserId).catch((err) => console.warn('refreshAddresses background error:', err));
    return cached.filter((a) => a.user_id === targetUserId);
  },

  async saveAddress(address: CustomerAddress): Promise<CustomerAddress> {
    const prev = getCached<CustomerAddress>(STORAGE_KEYS.ADDRESSES);
    const optimistic = mergeById(prev, address);
    setCached(STORAGE_KEYS.ADDRESSES, optimistic);
    notifyStorageChange('address', 'save', address);

    try {
      const saved = await upsertAddress(address);
      const final = mergeById(this.getAddresses(), saved);
      setCached(STORAGE_KEYS.ADDRESSES, final);
      notifyStorageChange('address', 'save', saved);
      return saved;
    } catch (err) {
      setCached(STORAGE_KEYS.ADDRESSES, prev);
      throw err;
    }
  },

  async deleteAddress(id: string): Promise<void> {
    const prev = getCached<CustomerAddress>(STORAGE_KEYS.ADDRESSES);
    setCached(STORAGE_KEYS.ADDRESSES, prev.filter((a) => a.id !== id));
    notifyStorageChange('address', 'delete', { id });
    try {
      await deleteAddress(id);
    } catch (err) {
      setCached(STORAGE_KEYS.ADDRESSES, prev);
      throw err;
    }
  },

  // --- ORDERS ---
  getOrders(): Order[] {
    const cached = this.getCachedOrders();
    this.refreshOrders().catch((err) => console.warn('refreshOrders background error:', err));
    return cached;
  },

  getOrderById(id: string): Order | null {
    return this.getCachedOrders().find((o) => o.id === id) || null;
  },

  async saveOrder(order: Order): Promise<Order> {
    const prev = this.getCachedOrders();
    const optimistic = mergeById(prev, order);
    setCached(STORAGE_KEYS.ORDERS, optimistic);
    notifyStorageChange('order', 'save', order);

    try {
      const secureResult = await createSecureOrder({
        store_id: order.store_id,
        address: order.delivery_address,
        payment_method: order.payment_method,
        items: order.items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          options: {},
          notes: i.notes,
        })),
        coupon_code: order.coupon_code || undefined,
        customer_notes: order.customer_notes || undefined,
        tip_amount: order.tip_amount || 0,
      });

      const serverConfirmedOrder: Order = {
        ...order,
        id: secureResult.order_id,
        order_number: secureResult.code,
        subtotal: secureResult.subtotal,
        delivery_fee: secureResult.delivery_fee,
        tip_amount: secureResult.tip_amount ?? order.tip_amount,
        discount_amount: secureResult.discount,
        total: secureResult.total,
        status: secureResult.status as any,
        eta_minutes: secureResult.eta_minutes ?? order.eta_minutes,
        zone_id: secureResult.zone_id ?? order.zone_id,
        commission_pct: secureResult.commission_pct ?? order.commission_pct,
        commission_amount: secureResult.commission_amount ?? order.commission_amount,
        updated_at: new Date().toISOString(),
      };

      const final = mergeById(this.getCachedOrders(), serverConfirmedOrder);
      setCached(STORAGE_KEYS.ORDERS, final);
      notifyStorageChange('order', 'save', serverConfirmedOrder);
      return serverConfirmedOrder;
    } catch (err) {
      setCached(STORAGE_KEYS.ORDERS, prev);
      throw err;
    }
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    note?: string,
    agentInfo?: Partial<Order>
  ): Promise<Order | null> {
    const currentUser = this.getCurrentUser();
    const userRole = currentUser?.role;
    let saved = false;

    try {
      if (status === 'cancelled' && userRole === 'customer') {
        await cancelOrderByCustomer(orderId, note);
        saved = true;
      } else if (['accepted', 'preparing', 'ready', 'rejected'].includes(status) && userRole === 'store_owner') {
        await updateOrderStatusByStore(orderId, status as any, note);
        saved = true;
      } else if (['picked_up', 'on_the_way', 'delivered'].includes(status) && userRole === 'delivery_agent') {
        await updateOrderStatusByAgent(orderId, status as any);
        saved = true;
      } else if (userRole === 'admin' || userRole === 'orders_manager' || userRole === 'delivery_supervisor') {
        await adminUpdateOrder(orderId, { status });
        saved = true;
      } else {
        throw new Error('غير مصرّح لك بتغيير حالة هذا الطلب');
      }

      if (saved) {
        const order = this.getOrderById(orderId);
        if (order) {
          order.status = status;
          order.updated_at = new Date().toISOString();
          order.status_history.push({ status, timestamp: order.updated_at, note });
          const cachedOrders = this.getCachedOrders();
          const idx = cachedOrders.findIndex((o) => o.id === orderId);
          if (idx >= 0) cachedOrders[idx] = order;
          else cachedOrders.unshift(order);
          setCached(STORAGE_KEYS.ORDERS, cachedOrders);
          notifyStorageChange('order', 'save', order);
        }
        return order;
      }
      return null;
    } catch (err) {
      console.error('updateOrderStatus error:', err);
      throw err;
    }
  },

  async assignOrderToAgent(orderId: string, agentId: string, agentName: string, agentPhone?: string) {
    try {
      await assignOrderToAgent(orderId, agentId, agentName, agentPhone);
      const order = this.getOrderById(orderId);
      if (order) {
        order.status = 'assigned';
        order.delivery_agent_id = agentId;
        order.delivery_agent_name = agentName;
        order.delivery_agent_phone = agentPhone || null;
        order.updated_at = new Date().toISOString();
        order.status_history.push({
          status: 'assigned',
          timestamp: order.updated_at,
          note: `تم الإسناد للكابتن ${agentName}`,
        });
        const cachedOrders = this.getCachedOrders();
        const idx = cachedOrders.findIndex((o) => o.id === orderId);
        if (idx >= 0) cachedOrders[idx] = order;
        else cachedOrders.unshift(order);
        setCached(STORAGE_KEYS.ORDERS, cachedOrders);
        notifyStorageChange('order', 'save', order);
      }
      return order;
    } catch (err) {
      throw err;
    }
  },

  async updateDeliveryAgentLocation(orderId: string, lat: number, lng: number) {
    const order = this.getOrderById(orderId);
    if (!order) return null;
    order.delivery_agent_lat = lat;
    order.delivery_agent_lng = lng;
    order.updated_at = new Date().toISOString();
    const cachedOrders = this.getCachedOrders();
    const idx = cachedOrders.findIndex((o) => o.id === orderId);
    if (idx >= 0) {
      cachedOrders[idx] = order;
      setCached(STORAGE_KEYS.ORDERS, cachedOrders);
      notifyStorageChange('order', 'save', order);
    }

    const now = Date.now();
    const lastTime = lastLocationUpdateMap.get(orderId) || 0;
    if (now - lastTime >= 5000) {
      lastLocationUpdateMap.set(orderId, now);
      updateSupabaseOrderLocation(orderId, lat, lng).catch((err) =>
        console.warn('Failed to update agent location in Supabase:', err)
      );
    }
    return order;
  },

  // --- PAYOUTS ---
  getPayouts(): Payout[] {
    const cached = this.getCachedPayouts();
    this.refreshPayouts().catch((err) => console.warn('refreshPayouts background error:', err));
    return cached;
  },

  async savePayout(payout: Payout): Promise<Payout> {
    const prev = this.getCachedPayouts();
    const optimistic = mergeById(prev, payout);
    setCached(STORAGE_KEYS.PAYOUTS, optimistic);
    notifyStorageChange('payout', 'save', payout);

    try {
      const created = await createSupabasePayout(payout);
      const final = mergeById(this.getCachedPayouts(), created);
      setCached(STORAGE_KEYS.PAYOUTS, final);
      notifyStorageChange('payout', 'save', created);
      return created;
    } catch (err) {
      setCached(STORAGE_KEYS.PAYOUTS, prev);
      throw err;
    }
  },

  async updatePayoutStatus(payoutId: string, status: 'completed' | 'failed', notes?: string): Promise<Payout> {
    const updated = await updateSupabasePayoutStatus(payoutId, status, notes);
    const payouts = this.getCachedPayouts();
    const idx = payouts.findIndex((p) => p.id === payoutId);
    if (idx >= 0) payouts[idx] = { ...payouts[idx], ...updated };
    else payouts.unshift(updated);
    setCached(STORAGE_KEYS.PAYOUTS, payouts);
    notifyStorageChange('payout', 'save', updated);
    return updated;
  },

  // --- DELIVERY AGENTS ---
  getAgents(): DeliveryAgent[] {
    const cached = this.getCachedAgents();
    this.refreshAgents().catch((err) => console.warn('refreshAgents background error:', err));
    return cached;
  },

  getAgentByUserId(userId: string): DeliveryAgent | null {
    return this.getCachedAgents().find((a) => a.user_id === userId) || null;
  },

  async saveAgent(
    agent: DeliveryAgent,
    options?: { isSelf?: boolean; isAdministrative?: boolean; callerRole?: string }
  ): Promise<DeliveryAgent> {
    const currentUser = this.getCurrentUser();
    const isSelf = options?.isSelf ?? (currentUser?.id === agent.user_id);
    const isAdministrative = options?.isAdministrative ?? (currentUser?.role === 'admin' || currentUser?.role === 'delivery_supervisor');
    const callerRole = options?.callerRole ?? currentUser?.role;
    const prev = this.getCachedAgents();
    const optimistic = mergeById(prev, agent);
    setCached(STORAGE_KEYS.AGENTS, optimistic);
    notifyStorageChange('agent', 'save', agent);

    try {
      const saved = await saveSupabaseAgent(agent, { isSelf, isAdministrative, callerRole });
      const final = mergeById(this.getCachedAgents(), saved);
      setCached(STORAGE_KEYS.AGENTS, final);
      notifyStorageChange('agent', 'save', saved);
      return saved;
    } catch (err) {
      setCached(STORAGE_KEYS.AGENTS, prev);
      throw err;
    }
  },

  async deleteAgent(id: string): Promise<void> {
    const prev = this.getCachedAgents();
    setCached(STORAGE_KEYS.AGENTS, prev.filter((a) => a.id !== id));
    notifyStorageChange('agent', 'delete', { id });
    try {
      await deleteSupabaseAgent(id);
    } catch (err) {
      setCached(STORAGE_KEYS.AGENTS, prev);
      throw err;
    }
  },

  // --- CATEGORIES & ZONES & COUPONS ---
  getCategories(): Category[] {
    const data = getCached<Category>('alababak_categories');
    this.refreshCategories().catch((err) => console.warn('refreshCategories background error:', err));
    return data.length > 0 ? data : DEFAULT_CATEGORIES;
  },

  async saveCategory(category: Category): Promise<Category> {
    const validCat: Category = { ...category, id: ensureUUID(category.id) };
    const prev = this.getCategories();
    const optimistic = mergeById(prev, validCat);
    setCached('alababak_categories', optimistic);
    notifyStorageChange('category', 'save', validCat);

    try {
      await supabase.from('categories').upsert(validCat, { onConflict: 'id' });
      await this.refreshCategories();
      return validCat;
    } catch (err) {
      setCached('alababak_categories', prev);
      throw err;
    }
  },

  getZones(): DeliveryZone[] {
    const cached = this.getCachedZones();
    this.refreshZones().catch((err) => console.warn('refreshZones background error:', err));
    return cached.length > 0 ? cached : EGYPT_DEFAULT_ZONES;
  },

  async saveZone(zone: DeliveryZone): Promise<DeliveryZone> {
    const validZone: DeliveryZone = {
      ...zone,
      id: ensureUUID(zone.id),
      fee: zone.fee ?? zone.base_delivery_fee ?? 15,
      base_delivery_fee: zone.base_delivery_fee ?? zone.fee ?? 15,
      eta_minutes: zone.eta_minutes ?? zone.estimated_delivery_mins ?? 30,
      estimated_delivery_mins: zone.estimated_delivery_mins ?? zone.eta_minutes ?? 30,
    };
    const prev = this.getCachedZones();
    const optimistic = mergeById(prev, validZone);
    setCached(STORAGE_KEYS.ZONES, optimistic);
    notifyStorageChange('zone', 'save', validZone);

    try {
      const saved = await saveSupabaseZone(validZone);
      const final = mergeById(this.getCachedZones(), saved);
      setCached(STORAGE_KEYS.ZONES, final);
      notifyStorageChange('zone', 'save', saved);
      return saved || validZone;
    } catch (err) {
      setCached(STORAGE_KEYS.ZONES, prev);
      throw err;
    }
  },

  getCoupons(): Coupon[] {
    const cached = this.getCachedCoupons();
    this.refreshCoupons().catch((err) => console.warn('refreshCoupons background error:', err));
    return cached;
  },

  async saveCoupon(coupon: Coupon): Promise<Coupon> {
    const prev = this.getCachedCoupons();
    const optimistic = mergeById(prev, coupon);
    setCached(STORAGE_KEYS.COUPONS, optimistic);
    notifyStorageChange('coupon', 'save', coupon);

    try {
      await saveSupabaseCoupon(coupon);
      await this.refreshCoupons();
      return coupon;
    } catch (err) {
      setCached(STORAGE_KEYS.COUPONS, prev);
      throw err;
    }
  },

  async deleteCoupon(id: string): Promise<void> {
    const prev = this.getCachedCoupons();
    setCached(STORAGE_KEYS.COUPONS, prev.filter((c) => c.id !== id));
    notifyStorageChange('coupon', 'delete', { id });
    try {
      await deleteSupabase('coupons', id);
    } catch (err) {
      setCached(STORAGE_KEYS.COUPONS, prev);
      throw err;
    }
  },

  // --- MY STORE CACHE (معدل للاستخدام المتغيرات المستقلة) ---
  clearMyStoreCache() {
    _myStoreCache = null;
  },

  async getMyStore(): Promise<Store | null> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return null;
    if (_myStoreCache && Date.now() - _myStoreCache.timestamp < MY_STORE_CACHE_TTL) {
      return _myStoreCache.store;
    }
    try {
      const store = await fetchMyStore();
      _myStoreCache = { store, timestamp: Date.now() };
      return store;
    } catch (err) {
      console.error('Error fetching my store:', err);
      return null;
    }
  },

  async getCurrentStore(): Promise<Store | null> {
    return this.getMyStore();
  },

  getCurrentAgent(): DeliveryAgent | null {
    // كانت هذه الدالة بترجع agents[0] (أول مندوب في القائمة كلها) لو
    // المستخدم الحالي مش موجود كمندوب، سواء لسه مفيش مستخدم مسجَّل دخوله
    // أصلًا أو لسه سجل المندوب بتاعه ما اتحمّلش في الكاش. ده كان بيخلي
    // أي شاشة تعتمد على الدالة دي (استلام الطلبات، الأرباح، البروفايل)
    // ممكن تعرض/تتصرف باسم مندوب تاني تمامًا غير المستخدم الفعلي —
    // مشكلة هوية خطيرة، مش مجرد بيانات وهمية للعرض.
    const user = this.getCurrentUser();
    if (!user) return null;
    return this.getAgentByUserId(user.id);
  },

  // --- REVIEWS ---
  getReviews(storeId?: string): Review[] {
    const cached = this.getCachedReviews();
    this.refreshReviews(storeId).catch((err) => console.warn('refreshReviews background error:', err));
    if (storeId) return cached.filter((r) => r.store_id === storeId);
    return cached;
  },

  async saveReview(review: Review): Promise<Review> {
    const prev = this.getCachedReviews();
    const optimistic = mergeById(prev, review);
    setCached(STORAGE_KEYS.REVIEWS, optimistic);
    notifyStorageChange('review', 'save', review);

    try {
      const saved = await saveSupabaseReview(review);
      const final = mergeById(this.getCachedReviews(), saved);
      setCached(STORAGE_KEYS.REVIEWS, final);
      notifyStorageChange('review', 'save', saved);
      return saved;
    } catch (err) {
      setCached(STORAGE_KEYS.REVIEWS, prev);
      throw err;
    }
  },

  async replyToReview(reviewId: string, replyText: string): Promise<Review> {
    const updated = await replySupabaseReview(reviewId, replyText);
    const reviews = mergeById(this.getCachedReviews(), updated);
    setCached(STORAGE_KEYS.REVIEWS, reviews);
    notifyStorageChange('review', 'save', updated);
    return updated;
  },

  // --- NOTIFICATIONS ---
  getNotifications(userId?: string): NotificationItem[] {
    const cached = this.getCachedNotifications();
    this.refreshNotifications(userId).catch((err) => console.warn('refreshNotifications background error:', err));
    if (userId) return cached.filter((n) => n.user_id === userId || n.user_id === 'all');
    return cached;
  },

  async saveNotification(notification: Partial<NotificationItem> & { user_id: string; title: string }): Promise<void> {
    const bodyText = notification.body || notification.message || '';
    const dataObj = { ...(notification.data || {}), ...(notification.link_url ? { link: notification.link_url } : {}) };
    await createSupabaseNotification({
      user_id: notification.user_id,
      title: notification.title,
      body: bodyText,
      type: notification.type || 'system',
      data: dataObj,
    });
    if (notification.user_id) await this.refreshNotifications(notification.user_id).catch(() => {});
  },

  async markNotificationRead(id: string): Promise<void> {
    await markSupabaseNotificationRead(id);
    const list = this.getCachedNotifications();
    const target = list.find((n) => n.id === id);
    if (target) {
      target.is_read = true;
      target.read_at = new Date().toISOString();
      setCached(STORAGE_KEYS.NOTIFICATIONS, list);
      notifyStorageChange('notification', 'update', target);
    }
  },

  async markAllNotificationsRead(userId?: string): Promise<void> {
    await markAllSupabaseNotificationsRead(userId);
    const list = this.getCachedNotifications();
    list.forEach((n) => {
      if (!userId || n.user_id === userId || n.user_id === 'all') {
        n.is_read = true;
        n.read_at = new Date().toISOString();
      }
    });
    setCached(STORAGE_KEYS.NOTIFICATIONS, list);
    notifyStorageChange('notification', 'mark_all_read', { userId });
  },

  async deleteNotification(id: string): Promise<void> {
    await deleteSupabaseNotification(id);
    const list = this.getCachedNotifications().filter((n) => n.id !== id);
    setCached(STORAGE_KEYS.NOTIFICATIONS, list);
    notifyStorageChange('notification', 'delete', { id });
  },

  async clearNotifications(userId?: string): Promise<void> {
    await clearSupabaseNotifications(userId);
    if (userId) {
      const remaining = this.getCachedNotifications().filter((n) => n.user_id !== userId && n.user_id !== 'all');
      setCached(STORAGE_KEYS.NOTIFICATIONS, remaining);
    } else {
      setCached(STORAGE_KEYS.NOTIFICATIONS, []);
    }
    notifyStorageChange('notification', 'clear', { userId });
  },

  // --- WISHLIST ---
  getWishlistStoreIds(userId?: string): string[] {
    if (typeof window === 'undefined') return [];
    const targetUserId = userId || this.getCurrentUser()?.id || 'guest';
    const data = localStorage.getItem(`${STORAGE_KEYS.WISHLIST_STORES}_${targetUserId}`);
    return data ? JSON.parse(data) : [];
  },

  getWishlistProductIds(userId?: string): string[] {
    if (typeof window === 'undefined') return [];
    const targetUserId = userId || this.getCurrentUser()?.id || 'guest';
    const data = localStorage.getItem(`${STORAGE_KEYS.WISHLIST_PRODUCTS}_${targetUserId}`);
    return data ? JSON.parse(data) : [];
  },

  isStoreWishlisted(storeId: string, userId?: string): boolean {
    return this.getWishlistStoreIds(userId).includes(storeId);
  },

  isProductWishlisted(productId: string, userId?: string): boolean {
    return this.getWishlistProductIds(userId).includes(productId);
  },

  toggleWishlistStore(storeId: string, userId?: string): boolean {
    if (typeof window === 'undefined') return false;
    const targetUserId = userId || this.getCurrentUser()?.id || 'guest';
    const key = `${STORAGE_KEYS.WISHLIST_STORES}_${targetUserId}`;
    const list = this.getWishlistStoreIds(targetUserId);
    const index = list.indexOf(storeId);
    let isAdded = false;
    if (index > -1) {
      list.splice(index, 1);
      isAdded = false;
    } else {
      list.push(storeId);
      isAdded = true;
    }
    localStorage.setItem(key, JSON.stringify(list));
    notifyStorageChange('wishlist', 'toggle_store', { storeId, isAdded });
    return isAdded;
  },

  toggleWishlistProduct(productId: string, userId?: string): boolean {
    if (typeof window === 'undefined') return false;
    const targetUserId = userId || this.getCurrentUser()?.id || 'guest';
    const key = `${STORAGE_KEYS.WISHLIST_PRODUCTS}_${targetUserId}`;
    const list = this.getWishlistProductIds(targetUserId);
    const index = list.indexOf(productId);
    let isAdded = false;
    if (index > -1) {
      list.splice(index, 1);
      isAdded = false;
    } else {
      list.push(productId);
      isAdded = true;
    }
    localStorage.setItem(key, JSON.stringify(list));
    notifyStorageChange('wishlist', 'toggle_product', { productId, isAdded });
    return isAdded;
  },

  getWishlistedStores(userId?: string): Store[] {
    const storeIds = this.getWishlistStoreIds(userId);
    const stores = this.getStores();
    return stores.filter((s) => storeIds.includes(s.id));
  },

  getWishlistedProducts(userId?: string): Product[] {
    const productIds = this.getWishlistProductIds(userId);
    const products = this.getProducts();
    return products.filter((p) => productIds.includes(p.id));
  },

  // --- SYNC ---
  async syncWithSupabase() {
    if (typeof window === 'undefined') return;
    try {
      const [dbCats, dbStores, dbProds, dbOrders, dbZones, dbCoupons, dbUsers, dbAgents] = await Promise.all([
        fetchSupabaseCategories(),
        fetchSupabaseStores(),
        fetchSupabaseProducts(),
        fetchSupabaseOrders(),
        fetchSupabaseZones(),
        fetchSupabaseCoupons(),
        fetchSupabaseUsers(),
        fetchSupabaseAgents(),
      ]);

      if (dbCats && dbCats.length > 0) setCached('alababak_categories', dbCats);
      setCached(STORAGE_KEYS.STORES, dbStores || []);
      setCached(STORAGE_KEYS.PRODUCTS, dbProds || []);
      setCached(STORAGE_KEYS.ORDERS, dbOrders || []);
      setCached(STORAGE_KEYS.AGENTS, dbAgents || []);
      if (dbZones && dbZones.length > 0) setCached(STORAGE_KEYS.ZONES, dbZones);
      if (dbCoupons && dbCoupons.length > 0) setCached(STORAGE_KEYS.COUPONS, dbCoupons);
      if (dbUsers && dbUsers.length > 0) {
        const localUsers = this.getCachedUsers();
        const mergedUsers = [...localUsers];
        dbUsers.forEach((u) => {
          if (!mergedUsers.some((lu) => lu.id === u.id)) mergedUsers.push(u);
        });
        setCached(STORAGE_KEYS.USERS, mergedUsers);
      }
      notifyStorageChange('supabase', 'sync');
    } catch (e) {
      console.warn('Supabase background sync notice:', e);
    }
  },
};
