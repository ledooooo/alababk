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

  // 4. Seed Stores
  if (!localStorage.getItem(STORAGE_KEYS.STORES)) {
    const demoStores: Store[] = [
      {
        id: 'store-1',
        name: 'سوبرماركت بقالة أبو علي المعادي',
        slug: 'abu-ali-grocery',
        owner_id: 'usr-store-1',
        owner_name: 'أبو علي',
        owner_phone: '01123456789',
        category_id: 'cat-grocery',
        category_name: 'بقالة وسوبرماركت',
        description: 'أجود أنواع البقالة والمنتجات الغذائية الطازجة وتوصيل سريع للبيت في شارع 9 والمعادي.',
        logo_url: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&q=80&w=300',
        banner_url: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&q=80&w=800',
        address: '23 شارع 9 - المعادي - القاهرة',
        lat: 30.0460,
        lng: 31.2380,
        phone: '01123456789',
        is_approved: true,
        is_open: true,
        rating: 4.8,
        reviews_count: 86,
        commission_rate: 10,
        min_order_amount: 30,
        delivery_fee: 15,
        opening_hours: {
          sat: { open: '08:00', close: '23:30' },
          sun: { open: '08:00', close: '23:30' },
          mon: { open: '08:00', close: '23:30' },
          tue: { open: '08:00', close: '23:30' },
          wed: { open: '08:00', close: '23:30' },
          thu: { open: '08:00', close: '01:00' },
          fri: { open: '09:00', close: '01:00' },
        },
        created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'store-2',
        name: 'جزارة واللحوم الطازجة البركة',
        slug: 'albaraka-meat',
        owner_id: 'usr-store-2',
        owner_name: 'المهندس مصطفى',
        owner_phone: '01234567890',
        category_id: 'cat-meat',
        category_name: 'لحوم ودواجن',
        description: 'لحوم بلدي طازجة يومياً، كفتة، وسجق بلدي خالي من المواد حافظة.',
        logo_url: 'https://images.unsplash.com/photo-1551028150-64b9f398f678?auto=format&fit=crop&q=80&w=300',
        banner_url: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=800',
        address: '15 شارع دجلة - المعادي',
        lat: 30.0410,
        lng: 31.2320,
        phone: '01234567890',
        is_approved: true,
        is_open: true,
        rating: 4.9,
        reviews_count: 54,
        commission_rate: 10,
        min_order_amount: 100,
        delivery_fee: 15,
        opening_hours: {
          sat: { open: '09:00', close: '22:00' },
          sun: { open: '09:00', close: '22:00' },
          mon: { open: '09:00', close: '22:00' },
          tue: { open: '09:00', close: '22:00' },
          wed: { open: '09:00', close: '22:00' },
          thu: { open: '09:00', close: '23:00' },
          fri: { open: '09:00', close: '23:00' },
        },
        created_at: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'store-3',
        name: 'مخبز وأفران الشمس البلدي',
        slug: 'el-shams-bakery',
        owner_id: 'usr-store-3',
        owner_name: 'الحاج إبراهيم',
        owner_phone: '01555443322',
        category_id: 'cat-bakery',
        category_name: 'مخبوزات وحلويات',
        description: 'خبز بلدي، فينوا، باتيه طازج، وفطير مشلتت بالسمن البلدي الاصلي.',
        logo_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=300',
        banner_url: 'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?auto=format&fit=crop&q=80&w=800',
        address: '44 شارع النصر - المعادي',
        lat: 30.0480,
        lng: 31.2420,
        phone: '01555443322',
        is_approved: true,
        is_open: true,
        rating: 4.7,
        reviews_count: 112,
        commission_rate: 8,
        min_order_amount: 20,
        delivery_fee: 12,
        opening_hours: {
          sat: { open: '06:00', close: '23:00' },
          sun: { open: '06:00', close: '23:00' },
          mon: { open: '06:00', close: '23:00' },
          tue: { open: '06:00', close: '23:00' },
          wed: { open: '06:00', close: '23:00' },
          thu: { open: '06:00', close: '23:30' },
          fri: { open: '06:00', close: '23:30' },
        },
        created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'store-4',
        name: 'صيدلية الشفاء والعناية',
        slug: 'al-shifa-pharmacy',
        owner_id: 'usr-store-4',
        owner_name: 'د. خالد صبري',
        owner_phone: '01033221100',
        category_id: 'cat-pharmacy',
        category_name: 'صيدلية وعناية',
        description: 'جميع الأدوية، المستلزمات الطبية، ومنتجات العناية بالبشرة والشعر.',
        logo_url: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&q=80&w=300',
        banner_url: 'https://images.unsplash.com/photo-1631549916768-4119b2e5f926?auto=format&fit=crop&q=80&w=800',
        address: '10 شارع اللاسلكي - المعادي',
        lat: 30.0430,
        lng: 31.2350,
        phone: '01033221100',
        is_approved: true,
        is_open: true,
        rating: 4.9,
        reviews_count: 42,
        commission_rate: 10,
        min_order_amount: 40,
        delivery_fee: 15,
        opening_hours: {
          sat: { open: '00:00', close: '23:59' },
          sun: { open: '00:00', close: '23:59' },
          mon: { open: '00:00', close: '23:59' },
          tue: { open: '00:00', close: '23:59' },
          wed: { open: '00:00', close: '23:59' },
          thu: { open: '00:00', close: '23:59' },
          fri: { open: '00:00', close: '23:59' },
        },
        created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString(),
      },
    ];
    localStorage.setItem(STORAGE_KEYS.STORES, JSON.stringify(demoStores));
  }

  // 5. Seed Products
  if (!localStorage.getItem(STORAGE_KEYS.PRODUCTS)) {
    const demoProducts: Product[] = [
      // Abu Ali Products
      {
        id: 'prod-101',
        store_id: 'store-1',
        name: 'لبن جهينة كامل الدسم 1 لتر',
        description: 'حليب بقر طبيعي 100% معقم ومبستر',
        price: 45,
        original_price: 48,
        category_name: 'ألبان وأجبان',
        image_url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&q=80&w=400',
        stock: 50,
        is_active: true,
        unit: 'علبة',
        created_at: new Date().toISOString(),
      },
      {
        id: 'prod-102',
        store_id: 'store-1',
        name: 'جبنة بيضاء دومتي بلس 500 جم',
        description: 'جبنة طازجة طعم ثلاجة عالية الجودة',
        price: 38,
        category_name: 'ألبان وأجبان',
        image_url: 'https://images.unsplash.com/photo-1552767059-ce182ead8c1b?auto=format&fit=crop&q=80&w=400',
        stock: 35,
        is_active: true,
        unit: 'علبة',
        created_at: new Date().toISOString(),
      },
      {
        id: 'prod-103',
        store_id: 'store-1',
        name: 'طماطم بلدي طازجة',
        description: 'طماطم حمراء طازجة درجة أولى للتطبيخ والسلاطة',
        price: 15,
        original_price: 18,
        category_name: 'خضار وفاكهة طازجة',
        image_url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400',
        stock: 100,
        is_active: true,
        unit: 'كجم',
        created_at: new Date().toISOString(),
      },
      {
        id: 'prod-104',
        store_id: 'store-1',
        name: 'خيار بلدي طازج',
        description: 'خيار مقرمش طازج يومياً',
        price: 18,
        category_name: 'خضار وفاكهة طازجة',
        image_url: 'https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?auto=format&fit=crop&q=80&w=400',
        stock: 60,
        is_active: true,
        unit: 'كجم',
        created_at: new Date().toISOString(),
      },
      {
        id: 'prod-105',
        store_id: 'store-1',
        name: 'مياه معدنية أفرست 1.5 لتر',
        description: 'كرتونة مياه شرب نقية 12 زجاجة',
        price: 75,
        category_name: 'مشروبات ومياه',
        image_url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&q=80&w=400',
        stock: 20,
        is_active: true,
        unit: 'كرتونة',
        created_at: new Date().toISOString(),
      },
      {
        id: 'prod-106',
        store_id: 'store-1',
        name: 'زيت عباد الشمس كريستال 800 مل',
        description: 'زيت نقي خفيف للطبخ والقلي',
        price: 68,
        category_name: 'بقالة وسوبرماركت',
        image_url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=400',
        stock: 40,
        is_active: true,
        unit: 'زجاجة',
        created_at: new Date().toISOString(),
      },

      // Al Baraka Meat Products
      {
        id: 'prod-201',
        store_id: 'store-2',
        name: 'لحم ك any كندوز بلدي 1 كجم',
        description: 'لحم كندوز طازج كاندوز ممتاز للخضار والمشويات',
        price: 390,
        original_price: 410,
        category_name: 'لحوم ودواجن',
        image_url: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?auto=format&fit=crop&q=80&w=400',
        stock: 15,
        is_active: true,
        unit: 'كجم',
        created_at: new Date().toISOString(),
      },
      {
        id: 'prod-202',
        store_id: 'store-2',
        name: 'كفتة حاتي بلدي متبلة جاهزة 1 كجم',
        description: 'كفتة كندوز مع بهارات الحاتي الخاصة جاهزة للشوي',
        price: 360,
        category_name: 'لحوم ودواجن',
        image_url: 'https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?auto=format&fit=crop&q=80&w=400',
        stock: 25,
        is_active: true,
        unit: 'كجم',
        created_at: new Date().toISOString(),
      },
      {
        id: 'prod-203',
        store_id: 'store-2',
        name: 'سجق بلدي خالي من الفول صويا 1 كجم',
        description: 'سجق بلدي شرقي بالبهارات البلدي طازج يومياً',
        price: 340,
        category_name: 'لحوم ودواجن',
        image_url: 'https://images.unsplash.com/photo-1585325701165-351af916e581?auto=format&fit=crop&q=80&w=400',
        stock: 20,
        is_active: true,
        unit: 'كجم',
        created_at: new Date().toISOString(),
      },

      // El Shams Bakery Products
      {
        id: 'prod-301',
        store_id: 'store-3',
        name: 'ربطة خبز بلدي ساخن (5 رغيف)',
        description: 'خبز بلدي ردة ساخن طازج من الفرن مباشرة',
        price: 10,
        category_name: 'مخبوزات وحلويات',
        image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400',
        stock: 200,
        is_active: true,
        unit: 'ربطة',
        created_at: new Date().toISOString(),
      },
      {
        id: 'prod-302',
        store_id: 'store-3',
        name: 'فطير مشلتت فلاحي بالسمن البلدي (كبير)',
        description: 'فطير فلاحي مورق هش بالسمن البلدي الأصلي',
        price: 120,
        original_price: 140,
        category_name: 'مخبوزات وحلويات',
        image_url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&q=80&w=400',
        stock: 12,
        is_active: true,
        unit: 'قطعة',
        created_at: new Date().toISOString(),
      },
      {
        id: 'prod-303',
        store_id: 'store-3',
        name: 'طبق باتيه بالجبنة الومي (6 قطع)',
        description: 'باتيه هش ومحشو جبنة رومي طازجة',
        price: 45,
        category_name: 'مخبوزات وحلويات',
        image_url: 'https://images.unsplash.com/photo-1530610476181-d83430b64dcd?auto=format&fit=crop&q=80&w=400',
        stock: 30,
        is_active: true,
        unit: 'طبق',
        created_at: new Date().toISOString(),
      },
    ];
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(demoProducts));
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

  /**
   * Sync real Supabase DB data into LocalStorage & emit real-time updates
   */
  async syncWithSupabase() {
    if (typeof window === 'undefined') return;

    try {
      const [dbCats, dbStores, dbProds, dbOrders, dbZones, dbCoupons] = await Promise.all([
        fetchSupabaseCategories(),
        fetchSupabaseStores(),
        fetchSupabaseProducts(),
        fetchSupabaseOrders(),
        fetchSupabaseZones(),
        fetchSupabaseCoupons(),
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

