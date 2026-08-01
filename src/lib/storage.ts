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

// Initial Sample Seed Data Generator
function seedDefaultData() {
  if (typeof window === 'undefined') return;

  // 1. Seed Categories
  if (!localStorage.getItem(STORAGE_KEYS.ZONES)) {
    localStorage.setItem(STORAGE_KEYS.ZONES, JSON.stringify(EGYPT_DEFAULT_ZONES));
  }

  // 2. Seed Users & Demo Profiles for each role
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    const demoUsers: UserProfile[] = [
      {
        id: 'usr-customer-1',
        email: 'customer@jihat.app',
        name: 'أحمد محمود العبد',
        phone: '01012345678',
        role: 'customer',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
        created_at: new Date().toISOString(),
      },
      {
        id: 'usr-store-1',
        email: 'abuali@jihat.app',
        name: 'أبو علي',
        phone: '01123456789',
        role: 'store_owner',
        associated_store_id: 'store-1',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
        created_at: new Date().toISOString(),
      },
      {
        id: 'usr-store-2',
        email: 'albaraka@jihat.app',
        name: 'المهندس مصطفى',
        phone: '01234567890',
        role: 'store_owner',
        associated_store_id: 'store-2',
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=250',
        created_at: new Date().toISOString(),
      },
      {
        id: 'usr-agent-1',
        email: 'agent@jihat.app',
        name: 'الكابتن محمود طارق',
        phone: '01098765432',
        role: 'delivery_agent',
        avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=250',
        created_at: new Date().toISOString(),
      },
      {
        id: 'usr-admin-1',
        email: 'admin@alababak.app',
        name: 'مدير منصة على بابك',
        phone: '01000000000',
        role: 'admin',
        avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=250',
        created_at: new Date().toISOString(),
      },
    ];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(demoUsers));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(demoUsers[0])); // Default login as Customer
  }

  // 3. Seed Delivery Agents
  if (!localStorage.getItem(STORAGE_KEYS.AGENTS)) {
    const demoAgents: DeliveryAgent[] = [
      {
        id: 'agent-1',
        user_id: 'usr-agent-1',
        name: 'الكابتن محمود طارق',
        phone: '01098765432',
        vehicle_type: 'motorcycle',
        national_id: '29801011234567',
        is_approved: true,
        is_online: true,
        active_zone: 'المعادي وشارع 9',
        rating: 4.9,
        total_trips: 184,
        current_lat: 30.0450,
        current_lng: 31.2370,
        created_at: new Date().toISOString(),
      },
      {
        id: 'agent-2',
        user_id: 'usr-agent-2',
        name: 'الكابتن حسن حسني',
        phone: '01188776655',
        vehicle_type: 'scooter',
        national_id: '29505051234568',
        is_approved: true,
        is_online: true,
        active_zone: 'مدينة نصر ومكرم عبيد',
        rating: 4.8,
        total_trips: 92,
        current_lat: 30.0600,
        current_lng: 31.3400,
        created_at: new Date().toISOString(),
      }
    ];
    localStorage.setItem(STORAGE_KEYS.AGENTS, JSON.stringify(demoAgents));
  }

  // 4. Seed Stores (Clean state: no fake mock stores)
  if (!localStorage.getItem(STORAGE_KEYS.STORES)) {
    localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify([]));
  }

  // 5. Seed Products (Clean state: no fake mock products)
  if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([]));
  }


  // 6. Seed Addresses for Default Customer
  if (!localStorage.getItem(STORAGE_KEYS.ADDRESSES)) {
    const demoAddresses: CustomerAddress[] = [
      {
        id: 'addr-1',
        user_id: 'usr-customer-1',
        title: 'شقة المنزل (المعادي)',
        address_line: '23 شارع 9 - المعادي - بالقرب من محطة المترو',
        building: 'عمارة 15',
        floor: 'الدور 4',
        apartment: 'شقة 12',
        lat: 30.0444,
        lng: 31.2357,
        notes: 'يرجى الاتصال عند الوصول وترك الطلب مع الحارس إذا لم أرد.',
        is_default: true,
      },
      {
        id: 'addr-2',
        user_id: 'usr-customer-1',
        title: 'المكتب والعمل (مدينة نصر)',
        address_line: 'شارع مكرم عبيد - مدينة نصر',
        building: 'برج الأطباء',
        floor: 'الدور 2',
        apartment: 'مكتب 201',
        lat: 30.0620,
        lng: 31.3450,
        notes: 'يرجى التسليم للاستقبال.',
        is_default: false,
      }
    ];
    localStorage.setItem(STORAGE_KEYS.ADDRESSES, JSON.stringify(demoAddresses));
  }

  // 7. Seed Sample Coupons
  if (!localStorage.getItem(STORAGE_KEYS.COUPONS)) {
    const demoCoupons: Coupon[] = [
      {
        id: 'coup-1',
        code: 'JIHAT10',
        discount_type: 'percent',
        discount_value: 10,
        min_order_amount: 50,
        max_discount_amount: 30,
        usage_limit: 100,
        used_count: 14,
        is_active: true,
        expires_at: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'coup-2',
        code: 'WELCOME20',
        discount_type: 'flat',
        discount_value: 20,
        min_order_amount: 100,
        usage_limit: 500,
        used_count: 88,
        is_active: true,
        expires_at: new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString(),
      },
    ];
    localStorage.setItem(STORAGE_KEYS.COUPONS, JSON.stringify(demoCoupons));
  }

  // 8. Seed Sample Orders
  if (!localStorage.getItem(STORAGE_KEYS.ORDERS)) {
    const defaultAddress: CustomerAddress = {
      id: 'addr-1',
      user_id: 'usr-customer-1',
      title: 'شقة المنزل (المعادي)',
      address_line: '23 شارع 9 - المعادي',
      building: 'عمارة 15',
      floor: '4',
      apartment: '12',
      lat: 30.0444,
      lng: 31.2357,
      is_default: true,
    };

    const demoOrders: Order[] = [
      {
        id: 'ord-1001',
        order_number: 'JHT-1001',
        customer_id: 'usr-customer-1',
        customer_name: 'أحمد محمود العبد',
        customer_phone: '01012345678',
        store_id: 'store-1',
        store_name: 'سوبرماركت بقالة أبو علي المعادي',
        store_phone: '01123456789',
        store_address: '23 شارع 9 - المعادي',
        store_lat: 30.0460,
        store_lng: 31.2380,
        delivery_address: defaultAddress,
        delivery_agent_id: 'agent-1',
        delivery_agent_name: 'الكابتن محمود طارق',
        delivery_agent_phone: '01098765432',
        delivery_agent_vehicle: 'موتوسيكل',
        delivery_agent_lat: 30.0450,
        delivery_agent_lng: 31.2370,
        items: [
          {
            id: 'item-1',
            product_id: 'prod-101',
            product_name: 'لبن جهينة كامل الدسم 1 لتر',
            product_image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&q=80&w=400',
            unit_price: 45,
            quantity: 2,
            total_price: 90,
          },
          {
            id: 'item-2',
            product_id: 'prod-103',
            product_name: 'طماطم بلدي طازجة',
            product_image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400',
            unit_price: 15,
            quantity: 1,
            total_price: 15,
          }
        ],
        subtotal: 105,
        delivery_fee: 15,
        discount_amount: 10,
        coupon_code: 'JIHAT10',
        total: 110,
        payment_method: 'cod',
        payment_status: 'pending',
        status: 'on_the_way',
        status_history: [
          { status: 'pending', timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString() },
          { status: 'accepted', timestamp: new Date(Date.now() - 22 * 60 * 1000).toISOString() },
          { status: 'preparing', timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString() },
          { status: 'ready', timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
          { status: 'assigned', timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString() },
          { status: 'picked_up', timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
          { status: 'on_the_way', timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString() },
        ],
        customer_notes: 'يرجى التأكد من تاريخ صلاحية اللبن.',
        created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
      },
      {
        id: 'ord-1002',
        order_number: 'JHT-1002',
        customer_id: 'usr-customer-1',
        customer_name: 'أحمد محمود العبد',
        customer_phone: '01012345678',
        store_id: 'store-2',
        store_name: 'جزارة واللحوم الطازجة البركة',
        store_phone: '01234567890',
        store_address: '15 شارع دجلة - المعادي',
        store_lat: 30.0410,
        store_lng: 31.2320,
        delivery_address: defaultAddress,
        delivery_agent_id: 'agent-1',
        delivery_agent_name: 'الكابتن محمود طارق',
        delivery_agent_phone: '01098765432',
        items: [
          {
            id: 'item-3',
            product_id: 'prod-202',
            product_name: 'كفتة حاتي بلدي متبلة جاهزة 1 كجم',
            product_image: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&q=80&w=400',
            unit_price: 360,
            quantity: 1,
            total_price: 360,
          }
        ],
        subtotal: 360,
        delivery_fee: 15,
        discount_amount: 0,
        total: 375,
        payment_method: 'cod',
        payment_status: 'paid',
        status: 'delivered',
        status_history: [
          { status: 'pending', timestamp: new Date(Date.now() - 120 * 60 * 1000).toISOString() },
          { status: 'accepted', timestamp: new Date(Date.now() - 115 * 60 * 1000).toISOString() },
          { status: 'preparing', timestamp: new Date(Date.now() - 100 * 60 * 1000).toISOString() },
          { status: 'ready', timestamp: new Date(Date.now() - 70 * 60 * 1000).toISOString() },
          { status: 'assigned', timestamp: new Date(Date.now() - 65 * 60 * 1000).toISOString() },
          { status: 'picked_up', timestamp: new Date(Date.now() - 50 * 60 * 1000).toISOString() },
          { status: 'on_the_way', timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString() },
          { status: 'delivered', timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString() },
        ],
        created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
        updated_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      },
    ];
    localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(demoOrders));
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
    updateSupabaseOrderStatus(orderId, status, note);
    return order;
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

  /**
   * Sync real Supabase DB data into LocalStorage & emit real-time updates
   */
  async syncWithSupabase() {
    if (typeof window === 'undefined') return;

    try {
      const [dbCats, dbStores, dbProds, dbOrders, dbZones, dbCoupons, dbUsers] = await Promise.all([
        fetchSupabaseCategories(),
        fetchSupabaseStores(),
        fetchSupabaseProducts(),
        fetchSupabaseOrders(),
        fetchSupabaseZones(),
        fetchSupabaseCoupons(),
        fetchSupabaseUsers(),
      ]);

      if (dbCats && dbCats.length > 0) {
        localStorage.setItem('jihat_categories', JSON.stringify(dbCats));
      }
      if (dbStores && dbStores.length > 0) {
        localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(dbStores));
      }
      if (dbProds && dbProds.length > 0) {
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(dbProds));
      }
      if (dbOrders && dbOrders.length > 0) {
        localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(dbOrders));
      }
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

