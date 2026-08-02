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
  OrderStatus
} from '../types/domain';
import { DEFAULT_CATEGORIES, EGYPT_DEFAULT_ZONES, DEFAULT_LAT, DEFAULT_LNG } from './constants';
import {
  saveSupabaseUser,
  fetchSupabaseUsers,
  saveSupabaseStore,
  saveSupabaseProduct,
  saveSupabaseAgent,
  saveSupabaseOrder,
  updateSupabaseOrderStatus,
  saveSupabaseZone,
  saveSupabaseCoupon,
  fetchSupabaseStores,
  fetchSupabaseProducts,
  fetchSupabaseOrders,
  fetchSupabaseCategories,
  fetchSupabaseZones,
  fetchSupabaseCoupons,
  fetchSupabaseAgents,
} from './supabase';

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

// Initial Sample Seed Data Generator (Clean state - synced directly from Supabase DB)
function seedDefaultData() {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem(STORAGE_KEYS.ZONES)) {
    localStorage.setItem(STORAGE_KEYS.ZONES, JSON.stringify(EGYPT_DEFAULT_ZONES));
  }
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.AGENTS)) {
    localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.STORES)) {
    localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ADDRESSES)) {
    localStorage.setItem(STORAGE_KEYS.ADDRESSES, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.COUPONS)) {
    localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify([]));
  }
  if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify([]));
  }
}

// Initialize Seed Data on module load in browser
if (typeof window !== 'undefined') {
  seedDefaultData();
}

// Storage Repository API Functions
export const StorageRepo = {
  // --- USERS & AUTH ---
  getCurrentUser(): UserProfile | null {
    if (typeof window === 'undefined') return null;
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return data ? JSON.parse(data) : null;
  },

  setCurrentUser(user: UserProfile | null) {
    if (typeof window === 'undefined') return;
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
    notifyStorageChange('user', 'switch', user);
  },

  logout() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    notifyStorageChange('user', 'switch', null);
  },

  getUsers(): UserProfile[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  },

  saveUser(user: UserProfile) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    if (this.getCurrentUser()?.id === user.id) {
      this.setCurrentUser(user);
    }
    notifyStorageChange('user', 'save', user);
    saveSupabaseUser(user);
  },

  // --- STORES ---
  getStores(): Store[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.STORES);
    return data ? JSON.parse(data) : [];
  },

  getStoreById(id: string): Store | null {
    return this.getStores().find(s => s.id === id) || null;
  },

  getStoreBySlug(slug: string): Store | null {
    return this.getStores().find(s => s.slug === slug) || null;
  },

  saveStore(store: Store) {
    const stores = this.getStores();
    const idx = stores.findIndex(s => s.id === store.id);
    if (idx >= 0) {
      stores[idx] = store;
    } else {
      stores.unshift(store);
    }
    localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(stores));
    notifyStorageChange('store', 'save', store);
    saveSupabaseStore(store);
  },

  // --- PRODUCTS ---
  getProducts(storeId?: string): Product[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const list: Product[] = data ? JSON.parse(data) : [];
    if (storeId) {
      return list.filter(p => p.store_id === storeId);
    }
    return list;
  },

  getProductById(id: string): Product | null {
    return this.getProducts().find(p => p.id === id) || null;
  },

  saveProduct(product: Product) {
    const products = this.getProducts();
    const idx = products.findIndex(p => p.id === product.id);
    if (idx >= 0) {
      products[idx] = product;
    } else {
      products.unshift(product);
    }
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    notifyStorageChange('product', 'save', product);
    saveSupabaseProduct(product);
  },

  deleteProduct(id: string) {
    const products = this.getProducts().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    notifyStorageChange('product', 'delete', { id });
  },

  // --- ADDRESSES ---
  getAddresses(userId?: string): CustomerAddress[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.ADDRESSES);
    const list: CustomerAddress[] = data ? JSON.parse(data) : [];
    if (userId) {
      return list.filter(a => a.user_id === userId);
    }
    return list;
  },

  saveAddress(address: CustomerAddress) {
    const addresses = this.getAddresses();
    if (address.is_default) {
      addresses.forEach(a => {
        if (a.user_id === address.user_id) a.is_default = false;
      });
    }
    const idx = addresses.findIndex(a => a.id === address.id);
    if (idx >= 0) {
      addresses[idx] = address;
    } else {
      addresses.unshift(address);
    }
    localStorage.setItem(STORAGE_KEYS.ADDRESSES, JSON.stringify(addresses));
    notifyStorageChange('address', 'save', address);
  },

  deleteAddress(id: string) {
    const addresses = this.getAddresses().filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEYS.ADDRESSES, JSON.stringify(addresses));
    notifyStorageChange('address', 'delete', { id });
  },

  // --- ORDERS ---
  getOrders(): Order[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.ORDERS);
    return data ? JSON.parse(data) : [];
  },

  getOrderById(id: string): Order | null {
    return this.getOrders().find(o => o.id === id) || null;
  },

  saveOrder(order: Order) {
    const orders = this.getOrders();
    const idx = orders.findIndex(o => o.id === order.id);
    if (idx >= 0) {
      orders[idx] = order;
    } else {
      orders.unshift(order);
    }
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
    notifyStorageChange('order', 'save', order);
    saveSupabaseOrder(order);
  },

  updateOrderStatus(orderId: string, status: OrderStatus, note?: string, agentInfo?: Partial<Order>) {
    const order = this.getOrderById(orderId);
    if (!order) return null;

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

    this.saveOrder(order);

    // Auto-generate mock push notification for customer
    const agentName = agentInfo?.delivery_agent_name || order.delivery_agent_name || 'الكابتن';
    const statusNotifTitles: Record<string, string> = {
      pending: `تم استلام طلبك (#${order.order_number})`,
      confirmed: `تم تأكيد طلبك من المتجر (#${order.order_number}) ✅`,
      preparing: `جاري تحضير وتجهيز وجبتك 🍳 (#${order.order_number})`,
      assigned: `تم إسناد الطلب للكابتن ${agentName} 🛵`,
      picked_up: `الكابتن استلم شحنتك وفي الطريق إليك! 🚀`,
      delivered: `تم توصيل طلبك بنجاح! نتمنى لك أكلة شهية 🎉`,
      cancelled: `تم إلغاء الطلب (#${order.order_number}) ❌`,
      rejected: `اعتذر المتجر عن قبول الطلب (#${order.order_number}) ⚠️`,
    };

    const statusNotifMsgs: Record<string, string> = {
      pending: `تم إرسال طلبك إلى ${order.store_name} وهو قيد المراجعة.`,
      confirmed: `قام متجر ${order.store_name} بتأكيد الطلب وبدء التحضير.`,
      preparing: `المطبخ يعمل على إعداد طلبك لتغليفه بدقة.`,
      assigned: note || `سيتولى الكابتن ${agentName} توصيل طلبك.`,
      picked_up: `الكابتن استلم الطلب من ${order.store_name} وينطلق إلى عنوانك.`,
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
      link_url: `customer-order-detail:${order.id}`
    };

    this.saveNotification(newNotif);

    updateSupabaseOrderStatus(orderId, status, note);
    return order;
  },

  assignOrderToAgent(orderId: string, agentId: string, agentName: string, agentPhone: string) {
    return this.updateOrderStatus(orderId, 'assigned', `تم إسناد الطلب للكابتن ${agentName}`, {
      delivery_agent_id: agentId,
      delivery_agent_name: agentName,
      delivery_agent_phone: agentPhone,
    });
  },

  updateDeliveryAgentLocation(orderId: string, lat: number, lng: number) {
    const order = this.getOrderById(orderId);
    if (!order) return null;

    order.delivery_agent_lat = lat;
    order.delivery_agent_lng = lng;
    order.updated_at = new Date().toISOString();

    this.saveOrder(order);
    return order;
  },

  // --- PAYOUTS ---
  getPayouts() {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem('jihat_payouts');
    if (data) return JSON.parse(data);

    // Initial demo payouts if empty
    const demoPayouts = [
      {
        id: 'payout-101',
        recipient_id: 'usr-store-owner-1',
        recipient_name: 'سوبرماركت أبو علي',
        recipient_type: 'store',
        store_name: 'سوبرماركت أبو علي المعادي',
        user_name: 'خالد عبد السلام',
        amount: 3850,
        status: 'pending',
        payment_method: 'فودافون كاش (Vodafone Cash)',
        account_details: '01012345678',
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        id: 'payout-102',
        recipient_id: 'usr-agent-1',
        recipient_name: 'الكابتن مصطفى علي',
        recipient_type: 'agent',
        store_name: 'كابتن أسطول التوصيل',
        user_name: 'الكابتن مصطفى علي',
        amount: 1250,
        status: 'pending',
        payment_method: 'أنستا باي (InstaPay)',
        account_details: 'mustafa@instapay',
        created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
      {
        id: 'payout-103',
        recipient_id: 'usr-store-owner-2',
        recipient_name: 'صيدلية النيل الحديثة',
        recipient_type: 'store',
        store_name: 'صيدلية النيل الحديثة',
        user_name: 'د. طارق السعيد',
        amount: 5400,
        status: 'approved',
        payment_method: 'تحويل بنكي (CIB)',
        account_details: 'EG120000010023450001',
        created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      }
    ];

    localStorage.setItem('jihat_payouts', JSON.stringify(demoPayouts));
    return demoPayouts;
  },

  updatePayoutStatus(payoutId: string, status: 'approved' | 'rejected' | 'pending') {
    const payouts = this.getPayouts();
    const idx = payouts.findIndex((p: { id: string }) => p.id === payoutId);
    if (idx >= 0) {
      payouts[idx].status = status;
      localStorage.setItem('jihat_payouts', JSON.stringify(payouts));
      notifyStorageChange('payout', 'save', payouts[idx]);
    }
  },

  // --- DELIVERY AGENTS ---
  getAgents(): DeliveryAgent[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.AGENTS);
    return data ? JSON.parse(data) : [];
  },

  getAgentByUserId(userId: string): DeliveryAgent | null {
    return this.getAgents().find(a => a.user_id === userId) || null;
  },

  saveAgent(agent: DeliveryAgent) {
    const agents = this.getAgents();
    const idx = agents.findIndex(a => a.id === agent.id);
    if (idx >= 0) {
      agents[idx] = agent;
    } else {
      agents.unshift(agent);
    }
    localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(agents));
    notifyStorageChange('agent', 'save', agent);
    saveSupabaseAgent(agent);
  },

  // --- CATEGORIES & ZONES & COUPONS ---
  getCategories(): Category[] {
    if (typeof window === 'undefined') return DEFAULT_CATEGORIES;
    const data = localStorage.getItem('jihat_categories');
    return data ? JSON.parse(data) : DEFAULT_CATEGORIES;
  },

  saveCategory(category: Category) {
    const cats = this.getCategories();
    const idx = cats.findIndex((c) => c.id === category.id);
    if (idx >= 0) {
      cats[idx] = category;
    } else {
      cats.push(category);
    }
    localStorage.setItem('jihat_categories', JSON.stringify(cats));
    notifyStorageChange('category', 'save', category);
  },

  getZones(): DeliveryZone[] {
    if (typeof window === 'undefined') return EGYPT_DEFAULT_ZONES;
    const data = localStorage.getItem(STORAGE_KEYS.ZONES);
    return data ? JSON.parse(data) : EGYPT_DEFAULT_ZONES;
  },

  saveZone(zone: DeliveryZone) {
    const zones = this.getZones();
    const idx = zones.findIndex(z => z.id === zone.id);
    if (idx >= 0) {
      zones[idx] = zone;
    } else {
      zones.push(zone);
    }
    localStorage.setItem(STORAGE_KEYS.ZONES, JSON.stringify(zones));
    notifyStorageChange('zone', 'save', zone);
    saveSupabaseZone(zone);
  },

  getCoupons(): Coupon[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.COUPONS);
    return data ? JSON.parse(data) : [];
  },

  saveCoupon(coupon: Coupon) {
    const coupons = this.getCoupons();
    const idx = coupons.findIndex(c => c.id === coupon.id);
    if (idx >= 0) {
      coupons[idx] = coupon;
    } else {
      coupons.push(coupon);
    }
    localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(coupons));
    notifyStorageChange('coupon', 'save', coupon);
    saveSupabaseCoupon(coupon);
  },

  switchRole(role: UserRole) {
    const users = this.getUsers();
    let target = users.find((u) => u.role === role);

    if (!target) {
      // Fallback default users per role
      if (role === 'customer') {
        target = {
          id: 'usr-customer-1',
          email: 'customer@jihat.app',
          name: 'أحمد محمود العبد',
          phone: '01012345678',
          role: 'customer',
          created_at: new Date().toISOString(),
        };
      } else if (role === 'store_owner') {
        target = {
          id: 'usr-store-owner-1',
          email: 'khaled@supermarket.app',
          name: 'خالد عبد السلام',
          phone: '01123456789',
          role: 'store_owner',
          associated_store_id: 'store-1',
          created_at: new Date().toISOString(),
        };
      } else if (role === 'delivery_agent') {
        target = {
          id: 'usr-agent-1',
          email: 'captain.mustafa@jihat.app',
          name: 'الكابتن مصطفى علي',
          phone: '01234567890',
          role: 'delivery_agent',
          created_at: new Date().toISOString(),
        };
      } else if (role === 'delivery_supervisor') {
        target = {
          id: 'usr-supervisor-1',
          email: 'supervisor@jihat.app',
          name: 'الكابتن حسام حسن (مسؤول المندوبين)',
          phone: '01099887766',
          role: 'delivery_supervisor',
          created_at: new Date().toISOString(),
        };
      } else if (role === 'finance_admin') {
        target = {
          id: 'usr-finance-1',
          email: 'finance@jihat.app',
          name: 'الأستاذ سامح فؤاد (المسؤول المالي)',
          phone: '01155443322',
          role: 'finance_admin',
          created_at: new Date().toISOString(),
        };
      } else if (role === 'orders_manager') {
        target = {
          id: 'usr-orders-1',
          email: 'dispatcher@jihat.app',
          name: 'م. عمر الشريف (مسؤول التحكم والطلبات)',
          phone: '01222334455',
          role: 'orders_manager',
          created_at: new Date().toISOString(),
        };
      } else {
        target = {
          id: 'usr-admin-1',
          email: 'admin@jihat.app',
          name: 'المهندس طارق السعيد (الإدارة العامة)',
          phone: '01000000000',
          role: 'admin',
          created_at: new Date().toISOString(),
        };
      }
    }

    this.setCurrentUser(target);
  },

  deleteStore(id: string) {
    const stores = this.getStores().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(stores));
    notifyStorageChange('store', 'delete', { id });
  },

  deleteCoupon(id: string) {
    const coupons = this.getCoupons().filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(coupons));
    notifyStorageChange('coupon', 'delete', { id });
  },

  getCurrentStore(): Store | null {
    const user = this.getCurrentUser();
    if (!user) return this.getStores()[0] || null;
    if (user.associated_store_id) {
      return this.getStoreById(user.associated_store_id) || this.getStores()[0] || null;
    }
    return this.getStores().find((s) => s.owner_id === user.id) || this.getStores()[0] || null;
  },

  getCurrentAgent(): DeliveryAgent | null {
    const user = this.getCurrentUser();
    if (!user) return this.getAgents()[0] || null;
    return this.getAgentByUserId(user.id) || this.getAgents()[0] || null;
  },

  getReviews(storeId?: string): Review[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.REVIEWS);
    const list: Review[] = data ? JSON.parse(data) : [];
    if (storeId) {
      return list.filter((r) => r.store_id === storeId);
    }
    return list;
  },

  saveReview(review: Review) {
    const reviews = this.getReviews();
    const idx = reviews.findIndex((r) => r.id === review.id);
    if (idx >= 0) {
      reviews[idx] = review;
    } else {
      reviews.unshift(review);
    }
    localStorage.setItem(STORAGE_KEYS.REVIEWS, JSON.stringify(reviews));
    notifyStorageChange('review', 'save', review);
  },

  getNotifications(userId?: string): NotificationItem[] {
    if (typeof window === 'undefined') return [];
    const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    const list: NotificationItem[] = data ? JSON.parse(data) : [];
    if (userId) {
      return list.filter((n) => n.user_id === userId || n.user_id === 'all');
    }
    return list;
  },

  saveNotification(notification: NotificationItem) {
    const list = this.getNotifications();
    list.unshift(notification);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
    notifyStorageChange('notification', 'save', notification);
  },

  markNotificationRead(id: string) {
    const list = this.getNotifications();
    const target = list.find((n) => n.id === id);
    if (target) {
      target.is_read = true;
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
      notifyStorageChange('notification', 'update', target);
    }
  },

  markAllNotificationsRead(userId?: string) {
    const list = this.getNotifications();
    list.forEach((n) => {
      if (!userId || n.user_id === userId || n.user_id === 'all') {
        n.is_read = true;
      }
    });
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
    notifyStorageChange('notification', 'mark_all_read', { userId });
  },

  deleteNotification(id: string) {
    const list = this.getNotifications().filter((n) => n.id !== id);
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
    notifyStorageChange('notification', 'delete', { id });
  },

  clearNotifications(userId?: string) {
    if (userId) {
      const remaining = this.getNotifications().filter(
        (n) => n.user_id !== userId && n.user_id !== 'all'
      );
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(remaining));
    } else {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
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
        localStorage.setItem('jihat_categories', JSON.stringify(dbCats));
      }
      localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(dbStores || []));
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(dbProds || []));
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(dbOrders || []));
      localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(dbAgents || []));

      if (dbZones && dbZones.length > 0) {
        localStorage.setItem(STORAGE_KEYS.ZONES, JSON.stringify(dbZones));
      }
      if (dbCoupons && dbCoupons.length > 0) {
        localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(dbCoupons));
      }

      if (dbUsers && dbUsers.length > 0) {
        const localUsers = this.getUsers();
        const mergedUsers = [...localUsers];
        dbUsers.forEach((u) => {
          if (!mergedUsers.some((lu) => lu.id === u.id)) {
            mergedUsers.push(u);
          }
        });
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(mergedUsers));
      }

      notifyStorageChange('supabase', 'sync');
    } catch (e) {
      console.warn('Supabase background sync notice:', e);
    }
  },
};

// Initialize Seed Data and Sync with Supabase on startup
if (typeof window !== 'undefined') {
  StorageRepo.syncWithSupabase();
}

