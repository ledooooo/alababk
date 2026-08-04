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
  saveSupabaseUser,
  fetchSupabaseUsers,
  saveSupabaseStore,
  saveSupabaseProduct,
  saveSupabaseAgent,
  saveSupabaseOrder,
  updateSupabaseOrderStatus,
  updateSupabaseOrder,
  updateSupabaseOrderLocation,
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
  markSupabaseNotificationRead,
  markAllSupabaseNotificationsRead,
  deleteSupabaseNotification,
  clearSupabaseNotifications,
  fetchSupabasePayouts,
  updateSupabasePayoutStatus,
  listSupabasePayouts,
  listSupabaseReviews,
  listSupabaseNotifications,
  createSupabase,
  updateSupabase,
  deleteSupabase,
  deleteSupabaseProduct,
  deleteSupabaseStore,
  deleteSupabaseAgent,
} from './supabase';

const lastLocationUpdateMap = new Map<string, number>();

const STORAGE_KEYS = {
  USERS: 'jihat_users',
  CURRENT_USER: 'jihat_current_user',
  STORES: 'jihat_stores',
  PRODUCTS: 'jihat_products',
  ADDRESSES: 'jihat_addresses',
  ORDERS: 'jihat_orders',
  AGENTS: 'jihat_delivery_agents',
  ZONES: 'jihat_delivery_zones',
  COUPONS: 'jihat_coupons',
  REVIEWS: 'jihat_reviews',
  NOTIFICATIONS: 'jihat_notifications',
  PAYOUTS: 'jihat_payouts',
  CART: 'jihat_cart',
  WISHLIST_STORES: 'jihat_wishlist_stores',
  WISHLIST_PRODUCTS: 'jihat_wishlist_products',
};

// Broadcast Channel for live multi-tab & cross-role reactive updates
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('jihat_realtime_events');
  } catch {
    broadcastChannel = null;
  }
}

export function notifyStorageChange(entityType: string, action = 'update', data?: unknown) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('jihat_data_change', {
      detail: { entityType, action, data, timestamp: Date.now() },
    });
    window.dispatchEvent(event);
    if (broadcastChannel) {
      broadcastChannel.postMessage({ entityType, action, data, timestamp: Date.now() });
    }
  }
}

export function subscribeToStorageChange(callback: (detail: { entityType: string; action: string; data?: unknown }) => void) {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (e: Event) => {
    const customEvent = e as CustomEvent;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };

  const handleBroadcast = (e: MessageEvent) => {
    if (e.data) {
      callback(e.data);
    }
  };

  window.addEventListener('jihat_data_change', handleCustomEvent);
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }

  return () => {
    window.removeEventListener('jihat_data_change', handleCustomEvent);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
  };
}

const SESSION_STORAGE_KEYS = [STORAGE_KEYS.ORDERS, STORAGE_KEYS.PAYOUTS];

function getStorageForKey(key: string): Storage | null {
  if (typeof window === 'undefined') return null;
  return SESSION_STORAGE_KEYS.includes(key) ? sessionStorage : localStorage;
}

// Helpers for cache manipulation
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
  if (idx >= 0) {
    copy[idx] = item;
  } else {
    copy.unshift(item);
  }
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
  getCachedStores(): Store[] { return getCached<Store>(STORAGE_KEYS.STORES); },
  getCachedProducts(): Product[] { return getCached<Product>(STORAGE_KEYS.PRODUCTS); },
  getCachedOrders(): Order[] { return getCached<Order>(STORAGE_KEYS.ORDERS); },
  getCachedUsers(): UserProfile[] { return getCached<UserProfile>(STORAGE_KEYS.USERS); },
  getCachedAgents(): DeliveryAgent[] { return getCached<DeliveryAgent>(STORAGE_KEYS.AGENTS); },
  getCachedZones(): DeliveryZone[] { return getCached<DeliveryZone>(STORAGE_KEYS.ZONES); },
  getCachedCoupons(): Coupon[] { return getCached<Coupon>(STORAGE_KEYS.COUPONS); },
  getCachedReviews(): Review[] { return getCached<Review>(STORAGE_KEYS.REVIEWS); },
  getCachedNotifications(): NotificationItem[] { return getCached<NotificationItem>(STORAGE_KEYS.NOTIFICATIONS); },
  getCachedPayouts(): Payout[] { return getCached<Payout>(STORAGE_KEYS.PAYOUTS); },

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
    try {
      const stores = await fetchSupabaseStores();
      setCached(STORAGE_KEYS.STORES, stores);
      notifyStorageChange('store', 'refresh', stores);
      return stores;
    } catch (err) {
      console.error('refreshStores error:', err);
      return this.getCachedStores();
    }
  },

  async refreshProducts(storeId?: string): Promise<Product[]> {
    try {
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
    } catch (err) {
      console.error('refreshProducts error:', err);
      return this.getProducts(storeId);
    }
  },

  async refreshOrders(): Promise<Order[]> {
    try {
      const orders = await fetchSupabaseOrders();
      setCached(STORAGE_KEYS.ORDERS, orders);
      notifyStorageChange('order', 'refresh', orders);
      return orders;
    } catch (err) {
      console.error('refreshOrders error:', err);
      return this.getCachedOrders();
    }
  },

  async refreshUsers(): Promise<UserProfile[]> {
    try {
      const users = await fetchSupabaseUsers();
      setCached(STORAGE_KEYS.USERS, users);
      notifyStorageChange('user', 'refresh', users);
      return users;
    } catch (err) {
      console.error('refreshUsers error:', err);
      return this.getCachedUsers();
    }
  },

  async refreshAgents(): Promise<DeliveryAgent[]> {
    try {
      const agents = await fetchSupabaseAgents();
      setCached(STORAGE_KEYS.AGENTS, agents);
      notifyStorageChange('agent', 'refresh', agents);
      return agents;
    } catch (err) {
      console.error('refreshAgents error:', err);
      return this.getCachedAgents();
    }
  },

  async refreshZones(): Promise<DeliveryZone[]> {
    try {
      const zones = await fetchSupabaseZones();
      setCached(STORAGE_KEYS.ZONES, zones.length > 0 ? zones : EGYPT_DEFAULT_ZONES);
      notifyStorageChange('zone', 'refresh', zones);
      return zones;
    } catch (err) {
      console.error('refreshZones error:', err);
      return this.getZones();
    }
  },

  async refreshCoupons(): Promise<Coupon[]> {
    try {
      const coupons = await fetchSupabaseCoupons();
      setCached(STORAGE_KEYS.COUPONS, coupons);
      notifyStorageChange('coupon', 'refresh', coupons);
      return coupons;
    } catch (err) {
      console.error('refreshCoupons error:', err);
      return this.getCachedCoupons();
    }
  },

  async refreshCategories(): Promise<Category[]> {
    try {
      const cats = await fetchSupabaseCategories();
      const list = cats.length > 0 ? cats : DEFAULT_CATEGORIES;
      setCached('jihat_categories', list);
      notifyStorageChange('category', 'refresh', list);
      return list;
    } catch (err) {
      console.error('refreshCategories error:', err);
      return this.getCategories();
    }
  },

  async refreshReviews(storeId?: string): Promise<Review[]> {
    try {
      const list = await fetchSupabaseReviews(storeId);
      const current = this.getCachedReviews();
      const updated = storeId ? mergeManyById(current, list) : list;
      setCached(STORAGE_KEYS.REVIEWS, updated);
      const result = storeId ? updated.filter((r) => r.store_id === storeId) : updated;
      notifyStorageChange('review', 'refresh', result);
      return result;
    } catch (err) {
      console.error('refreshReviews error:', err);
      return this.getReviews(storeId);
    }
  },

  async refreshNotifications(userId?: string): Promise<NotificationItem[]> {
    try {
      const targetUser = userId || this.getCurrentUser()?.id;
      if (targetUser) {
        const list = await fetchSupabaseNotifications(targetUser);
        const current = this.getCachedNotifications();
        const updated = mergeManyById(current, list);
        setCached(STORAGE_KEYS.NOTIFICATIONS, updated);
        const userNotifs = updated.filter((n) => n.user_id === targetUser || n.user_id === 'all');
        notifyStorageChange('notification', 'refresh', userNotifs);
        return userNotifs;
      } else {
        const res = await listSupabaseNotifications();
        const list = res.data;
        setCached(STORAGE_KEYS.NOTIFICATIONS, list);
        notifyStorageChange('notification', 'refresh', list);
        return list;
      }
    } catch (err) {
      console.error('refreshNotifications error:', err);
      return this.getNotifications(userId);
    }
  },

  async refreshPayouts(): Promise<Payout[]> {
    try {
      const list = await fetchSupabasePayouts();
      const current = this.getCachedPayouts();
      const updated = mergeManyById(current, list);
      setCached(STORAGE_KEYS.PAYOUTS, updated);
      notifyStorageChange('payout', 'refresh', updated);
      return updated;
    } catch (err) {
      console.error('refreshPayouts error:', err);
      return this.getCachedPayouts();
    }
  },

  // --- USERS & AUTH ---
  getCurrentUser(): UserProfile | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (data) return JSON.parse(data);
    return null;
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
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
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
    this.refreshUsers();
    return cached;
  },

  async saveUser(user: UserProfile): Promise<UserProfile> {
    const users = mergeById(this.getCachedUsers(), user);
    setCached(STORAGE_KEYS.USERS, users);
    if (this.getCurrentUser()?.id === user.id) {
      this.setCurrentUser(user);
    }
    notifyStorageChange('user', 'save', user);

    try {
      await saveSupabaseUser(user);
      return user;
    } catch (err) {
      console.error('Failed to save user to Supabase:', err);
      this.refreshUsers();
      throw err;
    }
  },

  // --- STORES ---
  getStores(): Store[] {
    const cached = this.getCachedStores();
    this.refreshStores();
    return cached;
  },

  getStoreById(id: string): Store | null {
    return this.getCachedStores().find((s) => s.id === id) || null;
  },

  getStoreBySlug(slug: string): Store | null {
    return this.getCachedStores().find((s) => s.slug === slug) || null;
  },

  async saveStore(store: Store): Promise<Store> {
    try {
      // 1. Save to Supabase first and await result
      const saved = await saveSupabaseStore(store);

      // 2. Update local cache and notify subscribers on success
      const stores = mergeById(this.getCachedStores(), saved);
      setCached(STORAGE_KEYS.STORES, stores);
      notifyStorageChange('store', 'save', saved);

      this.refreshStores().catch(() => {});
      return saved;
    } catch (err) {
      console.error('Failed to save store to Supabase:', err);
      throw err;
    }
  },

  async deleteStore(id: string): Promise<void> {
    try {
      // 1. Delete from Supabase first
      await deleteSupabaseStore(id);

      // 2. Remove from local cache and notify subscribers on success
      const stores = this.getCachedStores().filter((s) => s.id !== id);
      setCached(STORAGE_KEYS.STORES, stores);
      notifyStorageChange('store', 'delete', { id });

      this.refreshStores().catch(() => {});
    } catch (err) {
      console.error('Failed to delete store from Supabase:', err);
      throw err;
    }
  },

  // --- PRODUCTS ---
  getProducts(storeId?: string): Product[] {
    const cached = this.getCachedProducts();
    this.refreshProducts(storeId);
    if (storeId) {
      return cached.filter((p) => p.store_id === storeId);
    }
    return cached;
  },

  getProductById(id: string): Product | null {
    return this.getCachedProducts().find((p) => p.id === id) || null;
  },

  async saveProduct(product: Product): Promise<Product> {
    try {
      // 1. Write to Supabase first and await result
      const saved = await saveSupabaseProduct(product);

      // 2. Update local cache and notify subscribers on success
      const products = mergeById(this.getCachedProducts(), saved);
      setCached(STORAGE_KEYS.PRODUCTS, products);
      notifyStorageChange('product', 'save', saved);

      this.refreshProducts(saved.store_id).catch(() => {});
      return saved;
    } catch (err) {
      console.error('Failed to save product to Supabase:', err);
      throw err;
    }
  },

  async deleteProduct(id: string): Promise<void> {
    try {
      // 1. Delete from Supabase first and await result
      await deleteSupabaseProduct(id);

      // 2. Remove from local cache and notify subscribers on success
      const products = this.getCachedProducts().filter((p) => p.id !== id);
      setCached(STORAGE_KEYS.PRODUCTS, products);
      notifyStorageChange('product', 'delete', { id });

      this.refreshProducts().catch(() => {});
    } catch (err) {
      console.error('Failed to delete product from Supabase:', err);
      throw err;
    }
  },

  // --- ADDRESSES ---
  getAddresses(userId?: string): CustomerAddress[] {
    const list = getCached<CustomerAddress>(STORAGE_KEYS.ADDRESSES);
    if (userId) {
      return list.filter((a) => a.user_id === userId);
    }
    return list;
  },

  async saveAddress(address: CustomerAddress): Promise<CustomerAddress> {
    const addresses = getCached<CustomerAddress>(STORAGE_KEYS.ADDRESSES);
    if (address.is_default) {
      addresses.forEach((a) => {
        if (a.user_id === address.user_id) a.is_default = false;
      });
    }
    const updated = mergeById(addresses, address);
    setCached(STORAGE_KEYS.ADDRESSES, updated);
    notifyStorageChange('address', 'save', address);

    try {
      const saved = await createSupabase<CustomerAddress>('addresses', address);
      return saved;
    } catch (err) {
      console.error('Failed to save address to Supabase:', err);
      return address;
    }
  },

  async deleteAddress(id: string): Promise<void> {
    const addresses = getCached<CustomerAddress>(STORAGE_KEYS.ADDRESSES).filter((a) => a.id !== id);
    setCached(STORAGE_KEYS.ADDRESSES, addresses);
    notifyStorageChange('address', 'delete', { id });

    try {
      await deleteSupabase('addresses', id);
    } catch (err) {
      console.error('Failed to delete address:', err);
    }
  },

  // --- ORDERS ---
  getOrders(): Order[] {
    const cached = this.getCachedOrders();
    this.refreshOrders();
    return cached;
  },

  getOrderById(id: string): Order | null {
    return this.getCachedOrders().find((o) => o.id === id) || null;
  },

  async saveOrder(order: Order): Promise<Order> {
    try {
      // 1. Invoke secure order creation RPC via saveSupabaseOrder
      const secureResult = await saveSupabaseOrder(order);

      // 2. Build updated order with server-calculated fields from RPC
      const serverConfirmedOrder: Order = {
        ...order,
        id: secureResult.order_id,
        order_number: secureResult.code,
        subtotal: secureResult.subtotal,
        delivery_fee: secureResult.delivery_fee,
        discount_amount: secureResult.discount,
        total: secureResult.total,
        status: (secureResult.status as any) || 'pending',
        updated_at: new Date().toISOString(),
      };

      // 3. Cache only upon server confirmation
      const orders = mergeById(this.getCachedOrders(), serverConfirmedOrder);
      setCached(STORAGE_KEYS.ORDERS, orders);
      notifyStorageChange('order', 'save', serverConfirmedOrder);

      // Refresh orders list in background
      this.refreshOrders().catch(() => {});

      return serverConfirmedOrder;
    } catch (err) {
      console.error('Failed to create order via secure RPC:', err);
      throw err;
    }
  },

  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    note?: string,
    agentInfo?: Partial<Order>
  ): Promise<Order | null> {
    const order = this.getOrderById(orderId);
    if (!order) return null;

    // Prepare fields to update on the existing order in Supabase
    const fieldsToUpdate: Record<string, any> = {
      status,
    };

    if (status === 'delivered') {
      fieldsToUpdate.payment_status = 'paid';
    }

    if (agentInfo) {
      if (agentInfo.delivery_agent_id !== undefined) fieldsToUpdate.delivery_agent_id = agentInfo.delivery_agent_id;
      if (agentInfo.delivery_agent_name !== undefined) fieldsToUpdate.delivery_agent_name = agentInfo.delivery_agent_name;
      if (agentInfo.delivery_agent_phone !== undefined) fieldsToUpdate.delivery_agent_phone = agentInfo.delivery_agent_phone;
      if (agentInfo.delivery_agent_lat !== undefined) fieldsToUpdate.delivery_agent_lat = agentInfo.delivery_agent_lat;
      if (agentInfo.delivery_agent_lng !== undefined) fieldsToUpdate.delivery_agent_lng = agentInfo.delivery_agent_lng;
    }

    // 1. Await actual DB UPDATE query first (throws if error occurs)
    await updateSupabaseOrder(orderId, fieldsToUpdate, note);

    // 2. Update local state & cache after DB update confirmation
    order.status = status;
    order.updated_at = new Date().toISOString();
    order.status_history.push({
      status,
      timestamp: order.updated_at,
      note,
    });

    if (agentInfo) {
      Object.assign(order, agentInfo);
    }

    if (status === 'delivered') {
      order.payment_status = 'paid';
    }

    const cachedOrders = this.getCachedOrders();
    const idx = cachedOrders.findIndex((o) => o.id === orderId);
    if (idx >= 0) {
      cachedOrders[idx] = { ...cachedOrders[idx], ...order };
    } else {
      cachedOrders.unshift(order);
    }
    setCached(STORAGE_KEYS.ORDERS, cachedOrders);
    notifyStorageChange('order', 'save', order);

    // 3. Generate push notification for customer
    const agentName = agentInfo?.delivery_agent_name || order.delivery_agent_name || 'الكابتن';
    const statusNotifTitles: Record<string, string> = {
      pending: `تم استلام طلبك (#${order.order_number})`,
      accepted: `تم قبول طلبك من المتجر (#${order.order_number}) ✅`,
      preparing: `جاري تحضير وتجهيز وجبتك 🍳 (#${order.order_number})`,
      ready: `الطلب جاهز للتسليم لكابتن التوصيل 📦 (#${order.order_number})`,
      assigned: `تم إسناد الطلب للكابتن ${agentName} 🛵`,
      picked_up: `الكابتن استلم شحنتك وفي الطريق إليك! 🚀`,
      on_the_way: `الكابتن في الطريق إليك الآن 🛵`,
      delivered: `تم توصيل طلبك بنجاح! نتمنى لك أكلة شهية 🎉`,
      cancelled: `تم إلغاء الطلب (#${order.order_number}) ❌`,
      rejected: `اعتذر المتجر عن قبول الطلب (#${order.order_number}) ⚠️`,
    };

    const statusNotifMsgs: Record<string, string> = {
      pending: `تم إرسال طلبك إلى ${order.store_name} وهو قيد المراجعة.`,
      accepted: `قام متجر ${order.store_name} بقبول الطلب وبدء التحضير.`,
      preparing: `المطبخ يعمل على إعداد طلبك لتغليفه بدقة.`,
      ready: `الطلب جاهز وفي انتظار الكابتن لاستلامه.`,
      assigned: note || `سيتولى الكابتن ${agentName} توصيل طلبك.`,
      picked_up: `الكابتن استلم الطلب من ${order.store_name} وينطلق إلى عنوانك.`,
      on_the_way: `الكابتن في طريقه للعنوان المقترن بالطلب.`,
      delivered: `تم تسليم الطلب إلى ${order.delivery_address?.street || 'عنوانك'}. شكراً لاختيارك على بابك!`,
      cancelled: note || `تم إلغاء الطلب.`,
      rejected: note || `تواصل مع المتجر للمزيد من التفاصيل.`,
    };

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user_id: order.customer_id || 'all',
      title: statusNotifTitles[status] || `تحديث على الطلب (#${order.order_number})`,
      message: note || statusNotifMsgs[status] || `تغيرت حالة الطلب إلى ${status}`,
      type: 'order_status',
      is_read: false,
      created_at: new Date().toISOString(),
      link_url: `customer-order-detail:${order.id}`,
    };

    await this.saveNotification(newNotif).catch(() => {});
    return order;
  },

  async assignOrderToAgent(orderId: string, agentId: string, agentName: string, agentPhone: string) {
    return this.updateOrderStatus(orderId, 'assigned', `تم إسناد الطلب للكابتن ${agentName}`, {
      delivery_agent_id: agentId,
      delivery_agent_name: agentName,
      delivery_agent_phone: agentPhone,
    });
  },

  async updateDeliveryAgentLocation(orderId: string, lat: number, lng: number) {
    const order = this.getOrderById(orderId);
    if (!order) return null;

    order.delivery_agent_lat = lat;
    order.delivery_agent_lng = lng;
    order.updated_at = new Date().toISOString();

    const cachedOrders = this.getCachedOrders();
    const idx = cachedOrders.findIndex((o) => o.id === orderId);
    const existingOrder = cachedOrders[idx];
    if (existingOrder) {
      const updatedOrder: Order = {
        ...existingOrder,
        delivery_agent_lat: lat,
        delivery_agent_lng: lng,
        updated_at: order.updated_at,
      };
      cachedOrders[idx] = updatedOrder;
      setCached(STORAGE_KEYS.ORDERS, cachedOrders);
      notifyStorageChange('order', 'save', updatedOrder);
    }

    // Throttle location updates to Supabase to at most once every 5 seconds per orderId
    const now = Date.now();
    const lastTime = lastLocationUpdateMap.get(orderId) || 0;
    if (now - lastTime >= 5000) {
      lastLocationUpdateMap.set(orderId, now);
      updateSupabaseOrderLocation(orderId, lat, lng).catch((err) => {
        console.warn('Failed to update agent location in Supabase:', err);
      });
    }

    return order;
  },

  // --- PAYOUTS ---
  getPayouts(): Payout[] {
    const cached = this.getCachedPayouts();
    this.refreshPayouts();
    return cached;
  },

  async updatePayoutStatus(
    payoutId: string,
    status: 'completed' | 'failed',
    notes?: string
  ): Promise<Payout> {
    try {
      // 1. Await atomic RPC update first
      const updated = await updateSupabasePayoutStatus(
        payoutId,
        status,
        notes
      );

      // 2. Update local state on success
      const payouts = this.getCachedPayouts();
      const idx = payouts.findIndex((p) => p.id === payoutId);
      if (idx >= 0) {
        payouts[idx] = { ...payouts[idx], ...updated };
      } else {
        payouts.unshift(updated);
      }
      setCached(STORAGE_KEYS.PAYOUTS, payouts);
      notifyStorageChange('payout', 'save', updated);
      return updated;
    } catch (err) {
      console.error('Failed to update payout status in Supabase:', err);
      throw err;
    }
  },

  // --- DELIVERY AGENTS ---
  getAgents(): DeliveryAgent[] {
    const cached = this.getCachedAgents();
    this.refreshAgents();
    return cached;
  },

  getAgentByUserId(userId: string): DeliveryAgent | null {
    return this.getCachedAgents().find((a) => a.user_id === userId) || null;
  },

  async saveAgent(agent: DeliveryAgent): Promise<DeliveryAgent> {
    try {
      // 1. Save to Supabase first and await result
      const saved = await saveSupabaseAgent(agent);

      // 2. Update local cache and notify subscribers on success
      const agents = mergeById(this.getCachedAgents(), saved);
      setCached(STORAGE_KEYS.AGENTS, agents);
      notifyStorageChange('agent', 'save', saved);

      this.refreshAgents().catch(() => {});
      return saved;
    } catch (err) {
      console.error('Failed to save agent to Supabase:', err);
      throw err;
    }
  },

  async deleteAgent(id: string): Promise<void> {
    try {
      // 1. Delete from Supabase first
      await deleteSupabaseAgent(id);

      // 2. Remove from local cache and notify subscribers on success
      const agents = this.getCachedAgents().filter((a) => a.id !== id);
      setCached(STORAGE_KEYS.AGENTS, agents);
      notifyStorageChange('agent', 'delete', { id });

      this.refreshAgents().catch(() => {});
    } catch (err) {
      console.error('Failed to delete agent from Supabase:', err);
      throw err;
    }
  },

  // --- CATEGORIES & ZONES & COUPONS ---
  getCategories(): Category[] {
    const data = getCached<Category>('jihat_categories');
    this.refreshCategories();
    return data.length > 0 ? data : DEFAULT_CATEGORIES;
  },

  async saveCategory(category: Category): Promise<Category> {
    const cats = mergeById(this.getCategories(), category);
    setCached('jihat_categories', cats);
    notifyStorageChange('category', 'save', category);

    try {
      await createSupabase<Category>('categories', category);
      return category;
    } catch (err) {
      console.error('Failed to save category:', err);
      return category;
    }
  },

  getZones(): DeliveryZone[] {
    const cached = this.getCachedZones();
    this.refreshZones();
    return cached.length > 0 ? cached : EGYPT_DEFAULT_ZONES;
  },

  async saveZone(zone: DeliveryZone): Promise<DeliveryZone> {
    const zones = mergeById(this.getCachedZones(), zone);
    setCached(STORAGE_KEYS.ZONES, zones);
    notifyStorageChange('zone', 'save', zone);

    try {
      await saveSupabaseZone(zone);
      await this.refreshZones();
      return zone;
    } catch (err) {
      console.error('Failed to save zone:', err);
      this.refreshZones();
      throw err;
    }
  },

  getCoupons(): Coupon[] {
    const cached = this.getCachedCoupons();
    this.refreshCoupons();
    return cached;
  },

  async saveCoupon(coupon: Coupon): Promise<Coupon> {
    const coupons = mergeById(this.getCachedCoupons(), coupon);
    setCached(STORAGE_KEYS.COUPONS, coupons);
    notifyStorageChange('coupon', 'save', coupon);

    try {
      await saveSupabaseCoupon(coupon);
      await this.refreshCoupons();
      return coupon;
    } catch (err) {
      console.error('Failed to save coupon:', err);
      this.refreshCoupons();
      throw err;
    }
  },

  async deleteCoupon(id: string): Promise<void> {
    const coupons = this.getCachedCoupons().filter((c) => c.id !== id);
    setCached(STORAGE_KEYS.COUPONS, coupons);
    notifyStorageChange('coupon', 'delete', { id });

    try {
      await deleteSupabase('coupons', id);
    } catch (err) {
      console.error('Failed to delete coupon:', err);
    }
  },

  getCurrentStore(): Store | null {
    const user = this.getCurrentUser();
    const stores = this.getStores();
    if (!user) return stores[0] || null;
    if (user.associated_store_id) {
      return this.getStoreById(user.associated_store_id) || stores[0] || null;
    }
    return stores.find((s) => s.owner_id === user.id) || stores[0] || null;
  },

  getCurrentAgent(): DeliveryAgent | null {
    const user = this.getCurrentUser();
    const agents = this.getAgents();
    if (!user) return agents[0] || null;
    return this.getAgentByUserId(user.id) || agents[0] || null;
  },

  getReviews(storeId?: string): Review[] {
    const cached = this.getCachedReviews();
    this.refreshReviews(storeId);
    if (storeId) {
      return cached.filter((r) => r.store_id === storeId);
    }
    return cached;
  },

  async saveReview(review: Review): Promise<Review> {
    try {
      const saved = await saveSupabaseReview(review);
      const reviews = mergeById(this.getCachedReviews(), saved);
      setCached(STORAGE_KEYS.REVIEWS, reviews);
      notifyStorageChange('review', 'save', saved);

      this.refreshReviews(saved.store_id).catch(() => {});
      return saved;
    } catch (err) {
      console.error('Failed to save review to Supabase:', err);
      throw err;
    }
  },

  async replyToReview(reviewId: string, replyText: string): Promise<Review> {
    try {
      const updated = await replySupabaseReview(reviewId, replyText);
      const reviews = mergeById(this.getCachedReviews(), updated);
      setCached(STORAGE_KEYS.REVIEWS, reviews);
      notifyStorageChange('review', 'save', updated);

      this.refreshReviews(updated.store_id).catch(() => {});
      return updated;
    } catch (err) {
      console.error('Failed to reply to review in Supabase:', err);
      throw err;
    }
  },

  getNotifications(userId?: string): NotificationItem[] {
    const cached = this.getCachedNotifications();
    this.refreshNotifications(userId);
    if (userId) {
      return cached.filter((n) => n.user_id === userId || n.user_id === 'all');
    }
    return cached;
  },

  async saveNotification(notification: NotificationItem): Promise<NotificationItem> {
    try {
      await createSupabase<NotificationItem>('notifications', notification);
      const list = this.getCachedNotifications();
      const updatedList = mergeById(list, notification);
      setCached(STORAGE_KEYS.NOTIFICATIONS, updatedList);
      notifyStorageChange('notification', 'save', notification);
      return notification;
    } catch (err) {
      console.error('Failed to save notification to Supabase:', err);
      throw err;
    }
  },

  async markNotificationRead(id: string): Promise<void> {
    try {
      // 1. Await Supabase update first
      await markSupabaseNotificationRead(id);

      // 2. Update local state on success
      const list = this.getCachedNotifications();
      const target = list.find((n) => n.id === id);
      if (target) {
        target.is_read = true;
        setCached(STORAGE_KEYS.NOTIFICATIONS, list);
        notifyStorageChange('notification', 'update', target);
      }
    } catch (err) {
      console.error('Failed to mark notification read in Supabase:', err);
      throw err;
    }
  },

  async markAllNotificationsRead(userId?: string): Promise<void> {
    try {
      // 1. Await Supabase update first
      await markAllSupabaseNotificationsRead(userId);

      // 2. Update local state on success
      const list = this.getCachedNotifications();
      list.forEach((n) => {
        if (!userId || n.user_id === userId || n.user_id === 'all') {
          n.is_read = true;
        }
      });
      setCached(STORAGE_KEYS.NOTIFICATIONS, list);
      notifyStorageChange('notification', 'mark_all_read', { userId });
    } catch (err) {
      console.error('Failed to mark all notifications read in Supabase:', err);
      throw err;
    }
  },

  async deleteNotification(id: string): Promise<void> {
    try {
      // 1. Await Supabase delete first
      await deleteSupabaseNotification(id);

      // 2. Update local state on success
      const list = this.getCachedNotifications().filter((n) => n.id !== id);
      setCached(STORAGE_KEYS.NOTIFICATIONS, list);
      notifyStorageChange('notification', 'delete', { id });
    } catch (err) {
      console.error('Failed to delete notification from Supabase:', err);
      throw err;
    }
  },

  async clearNotifications(userId?: string): Promise<void> {
    try {
      // 1. Await Supabase clear first
      await clearSupabaseNotifications(userId);

      // 2. Update local state on success
      if (userId) {
        const remaining = this.getCachedNotifications().filter(
          (n) => n.user_id !== userId && n.user_id !== 'all'
        );
        setCached(STORAGE_KEYS.NOTIFICATIONS, remaining);
      } else {
        setCached(STORAGE_KEYS.NOTIFICATIONS, []);
      }
      notifyStorageChange('notification', 'clear', { userId });
    } catch (err) {
      console.error('Failed to clear notifications in Supabase:', err);
      throw err;
    }
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
    const list = this.getWishlistStoreIds(userId);
    return list.includes(storeId);
  },

  isProductWishlisted(productId: string, userId?: string): boolean {
    const list = this.getWishlistProductIds(userId);
    return list.includes(productId);
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

  /**
   * Sync real Supabase DB data into LocalStorage & emit real-time updates
   */
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

      if (dbCats && dbCats.length > 0) {
        setCached('jihat_categories', dbCats);
      }
      setCached(STORAGE_KEYS.STORES, dbStores || []);
      setCached(STORAGE_KEYS.PRODUCTS, dbProds || []);
      setCached(STORAGE_KEYS.ORDERS, dbOrders || []);
      setCached(STORAGE_KEYS.AGENTS, dbAgents || []);

      if (dbZones && dbZones.length > 0) {
        setCached(STORAGE_KEYS.ZONES, dbZones);
      }
      if (dbCoupons && dbCoupons.length > 0) {
        setCached(STORAGE_KEYS.COUPONS, dbCoupons);
      }

      if (dbUsers && dbUsers.length > 0) {
        const localUsers = this.getCachedUsers();
        const mergedUsers = [...localUsers];
        dbUsers.forEach((u) => {
          if (!mergedUsers.some((lu) => lu.id === u.id)) {
            mergedUsers.push(u);
          }
        });
        setCached(STORAGE_KEYS.USERS, mergedUsers);
      }

      notifyStorageChange('supabase', 'sync');
    } catch (e) {
      console.warn('Supabase background sync notice:', e);
    }
  },
};
