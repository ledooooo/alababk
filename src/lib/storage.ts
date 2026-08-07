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
  createSupabaseNotification,
  listAllSupabaseNotifications,
  markSupabaseNotificationRead,
  markAllSupabaseNotificationsRead,
  deleteSupabaseNotification,
  clearSupabaseNotifications,
  fetchSupabasePayouts,
  createSupabasePayout,
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
  fetchMyStore,
} from './supabase';

// تعريف النوع الجديد لحل مشكلة التحليل
type MyStoreCache = {
  store: Store | null;
  timestamp: number;
} | null;

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

function migrateStorageKeys() {
  if (typeof window === 'undefined') return;
  const legacyMap: Record<string, string> = {
    'jihat_users': 'alababak_users',
    'jihat_current_user': 'alababak_current_user',
    'jihat_stores': 'alababak_stores',
    'jihat_products': 'alababak_products',
    'jihat_addresses': 'alababak_addresses',
    'jihat_orders': 'alababak_orders',
    'jihat_delivery_agents': 'alababak_delivery_agents',
    'jihat_delivery_zones': 'alababak_delivery_zones',
    'jihat_coupons': 'alababak_coupons',
    'jihat_reviews': 'alababak_reviews',
    'jihat_notifications': 'alababak_notifications',
    'jihat_payouts': 'alababak_payouts',
    'jihat_cart': 'alababak_cart',
    'jihat_wishlist_stores': 'alababak_wishlist_stores',
    'jihat_wishlist_products': 'alababak_wishlist_products',
    'jihat_categories': 'alababak_categories',
  };

  for (const [oldKey, newKey] of Object.entries(legacyMap)) {
    try {
      const oldVal = localStorage.getItem(oldKey) || sessionStorage.getItem(oldKey);
      if (oldVal && !localStorage.getItem(newKey)) {
        localStorage.setItem(newKey, oldVal);
      }
    } catch {
      // ignore
    }
  }
}
migrateStorageKeys();

// Broadcast Channel for live multi-tab & cross-role reactive updates
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

  window.addEventListener('alababak_data_change', handleCustomEvent);
  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }

  return () => {
    window.removeEventListener('alababak_data_change', handleCustomEvent);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
  };
}

function getStorageForKey(_key: string): Storage | null {
  if (typeof window === 'undefined') return null;
  return localStorage;
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
      this.clearMyStoreCache();
      notifyStorageChange('store', 'refresh', stores);
      return stores;
    } catch (err) {
      console.warn('refreshStores error:', err);
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
      console.warn('refreshProducts error:', err);
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
      console.warn('refreshOrders error:', err);
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
      console.warn('refreshUsers error:', err);
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
      console.warn('refreshAgents error:', err);
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
      console.warn('refreshZones error:', err);
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
      console.warn('refreshCoupons error:', err);
      return this.getCachedCoupons();
    }
  },

  async refreshCategories(): Promise<Category[]> {
    try {
      const cats = await fetchSupabaseCategories();
      const list = cats.length > 0 ? cats : DEFAULT_CATEGORIES;
      setCached('alababak_categories', list);
      notifyStorageChange('category', 'refresh', list);
      return list;
    } catch (err) {
      console.warn('refreshCategories error:', err);
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
      console.warn('refreshReviews error:', err);
      return this.getReviews(storeId);
    }
  },

  async refreshNotifications(userId?: string): Promise<NotificationItem[]> {
    try {
      const targetUser = userId || this.getCurrentUser()?.id;
      if (targetUser) {
        const list = await fetchSupabaseNotifications(targetUser);
        if (list && list.length > 0) {
          setCached(STORAGE_KEYS.NOTIFICATIONS, list);
          notifyStorageChange('notification', 'refresh', list);
          return list;
        }
      } else {
        const list = await listAllSupabaseNotifications();
        if (list && list.length > 0) {
          setCached(STORAGE_KEYS.NOTIFICATIONS, list);
          notifyStorageChange('notification', 'refresh', list);
          return list;
        }
      }
      return this.getCachedNotifications();
    } catch {
      return this.getCachedNotifications();
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
      console.warn('refreshPayouts error:', err);
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

  async saveUser(user: UserProfile, options?: { isSelf?: boolean }): Promise<UserProfile> {
    const users = mergeById(this.getCachedUsers(), user);
    setCached(STORAGE_KEYS.USERS, users);
    const currentUser = this.getCurrentUser();
    if (currentUser?.id === user.id) {
      this.setCurrentUser(user);
    }
    notifyStorageChange('user', 'save', user);

    try {
      const isSelf = options?.isSelf ?? (currentUser?.id === user.id);
      await saveSupabaseUser(user, { isSelf });
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

  async saveStore(store: Store, options?: { isSelf?: boolean }): Promise<Store> {
    try {
      const currentUser = this.getCurrentUser();
      const isSelf = options?.isSelf ?? (currentUser?.id === store.owner_id);
      const saved = await saveSupabaseStore(store, { isSelf });

      const stores = mergeById(this.getCachedStores(), saved);
      setCached(STORAGE_KEYS.STORES, stores);
      this.clearMyStoreCache();
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
      await deleteSupabaseStore(id);

      const stores = this.getCachedStores().filter((s) => s.id !== id);
      setCached(STORAGE_KEYS.STORES, stores);
      this.clearMyStoreCache();
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
      const saved = await saveSupabaseProduct(product);

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
      await deleteSupabaseProduct(id);

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
      const secureResult = await saveSupabaseOrder(order);

      const serverConfirmedOrder: Order = {
        ...order,
        id: secureResult.order_id,
        order_number: secureResult.code,
        subtotal: secureResult.subtotal,
        delivery_fee: secureResult.delivery_fee,
        tip_amount: secureResult.tip_amount ?? order.tip_amount,
        discount_amount: secureResult.discount,
        total: secureResult.total,
        status: (secureResult.status as any) || 'pending',
        eta_minutes: secureResult.eta_minutes ?? order.eta_minutes,
        zone_id: secureResult.zone_id ?? order.zone_id,
        commission_pct: secureResult.commission_pct ?? order.commission_pct,
        commission_amount: secureResult.commission_amount ?? order.commission_amount,
        updated_at: new Date().toISOString(),
      };

      const orders = mergeById(this.getCachedOrders(), serverConfirmedOrder);
      setCached(STORAGE_KEYS.ORDERS, orders);
      notifyStorageChange('order', 'save', serverConfirmedOrder);

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

    await updateSupabaseOrder(orderId, fieldsToUpdate, note);

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

    return order;
  },

  async assignOrderToAgent(orderId: string, agentId: string, agentName: string, agentPhone?: string) {
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

  async savePayout(payout: Payout): Promise<Payout> {
    try {
      const created = await createSupabasePayout(payout);
      const payouts = this.getCachedPayouts();
      const existingIdx = payouts.findIndex((p) => p.id === created.id);
      if (existingIdx >= 0) {
        payouts[existingIdx] = created;
      } else {
        payouts.unshift(created);
      }
      setCached(STORAGE_KEYS.PAYOUTS, payouts);
      notifyStorageChange('payout', 'save', created);
      return created;
    } catch (err) {
      console.error('Failed to save payout in Supabase:', err);
      const payouts = this.getCachedPayouts();
      payouts.unshift(payout);
      setCached(STORAGE_KEYS.PAYOUTS, payouts);
      notifyStorageChange('payout', 'save', payout);
      throw err;
    }
  },

  async updatePayoutStatus(
    payoutId: string,
    status: 'completed' | 'failed',
    notes?: string
  ): Promise<Payout> {
    try {
      const updated = await updateSupabasePayoutStatus(
        payoutId,
        status,
        notes
      );

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

  async saveAgent(agent: DeliveryAgent, options?: { isSelf?: boolean; isAdministrative?: boolean; callerRole?: string }): Promise<DeliveryAgent> {
    try {
      const currentUser = this.getCurrentUser();
      const isSelf = options?.isSelf ?? (currentUser?.id === agent.user_id);
      const isAdministrative = options?.isAdministrative ?? (currentUser?.role === 'admin' || currentUser?.role === 'delivery_supervisor');
      const callerRole = options?.callerRole ?? currentUser?.role;

      const saved = await saveSupabaseAgent(agent, { isSelf, isAdministrative, callerRole });

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
      await deleteSupabaseAgent(id);

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
    const data = getCached<Category>('alababak_categories');
    this.refreshCategories();
    return data.length > 0 ? data : DEFAULT_CATEGORIES;
  },

  async saveCategory(category: Category): Promise<Category> {
    const validCat: Category = {
      ...category,
      id: ensureUUID(category.id),
    };
    const cats = mergeById(this.getCategories(), validCat);
    setCached('alababak_categories', cats);
    notifyStorageChange('category', 'save', validCat);

    try {
      const saved = await createSupabase<Category>('categories', validCat);
      await this.refreshCategories();
      return saved || validCat;
    } catch (err) {
      console.error('Failed to save category:', err);
      this.refreshCategories();
      throw err;
    }
  },

  getZones(): DeliveryZone[] {
    const cached = this.getCachedZones();
    this.refreshZones();
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

    const zones = mergeById(this.getCachedZones(), validZone);
    setCached(STORAGE_KEYS.ZONES, zones);
    notifyStorageChange('zone', 'save', validZone);

    try {
      const saved = await saveSupabaseZone(validZone);
      await this.refreshZones();
      return saved || validZone;
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

  // ======== الجزء المُعدَّل: كاش المتجر الحالي ========
  // ** دوال الكاش الخاصة بالمتجر الحالي **
  _myStoreCache: MyStoreCache = null,
  MY_STORE_CACHE_TTL: number = 30000, // 30 ثانية

  clearMyStoreCache() {
    this._myStoreCache = null;
  },

  async getMyStore(): Promise<Store | null> {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return null;

    if (this._myStoreCache && (Date.now() - this._myStoreCache.timestamp) < this.MY_STORE_CACHE_TTL) {
      return this._myStoreCache.store;
    }

    try {
      const store = await fetchMyStore();
      this._myStoreCache = { store, timestamp: Date.now() };
      return store;
    } catch (err) {
      console.error('Error fetching my store:', err);
      return null;
    }
  },

  // getCurrentStore أصبح غير متزامن ويستخدم getMyStore
  async getCurrentStore(): Promise<Store | null> {
    return this.getMyStore();
  },
  // ======== نهاية الجزء المُعدَّل ========

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
    this.refreshNotifications(userId).catch(() => {});
    if (userId) {
      return cached.filter((n) => n.user_id === userId || n.user_id === 'all');
    }
    return cached;
  },

  async saveNotification(notification: Partial<NotificationItem> & { user_id: string; title: string }): Promise<void> {
    const bodyText = notification.body || notification.message || '';
    const dataObj = {
      ...(notification.data || {}),
      ...(notification.link_url ? { link: notification.link_url } : {}),
    };

    await createSupabaseNotification({
      user_id: notification.user_id,
      title: notification.title,
      body: bodyText,
      type: notification.type || 'system',
      data: dataObj,
    });

    if (notification.user_id) {
      await this.refreshNotifications(notification.user_id).catch(() => {});
    }
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
      const remaining = this.getCachedNotifications().filter(
        (n) => n.user_id !== userId && n.user_id !== 'all'
      );
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
        setCached('alababak_categories', dbCats);
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