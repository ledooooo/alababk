export type UserRole =
  | 'customer'
  | 'store_owner'
  | 'delivery_agent'
  | 'admin'
  | 'delivery_supervisor'
  | 'finance_admin'
  | 'orders_manager';

export const USER_ROLES = [
  'customer',
  'store_owner',
  'delivery_agent',
  'admin',
  'delivery_supervisor',
  'finance_admin',
  'orders_manager',
] as const;

export const DEFAULT_TAB_BY_ROLE: Record<UserRole, string> = {
  customer: 'customer-stores',
  store_owner: 'store-dashboard',
  delivery_agent: 'delivery-dashboard',
  admin: 'admin-dashboard',
  delivery_supervisor: 'delivery-supervisor-dashboard',
  finance_admin: 'finance-admin-dashboard',
  orders_manager: 'orders-manager-dashboard',
};

export const ALLOWED_TABS_BY_ROLE: Record<UserRole, string[]> = {
  customer: [
    'customer-stores',
    'search',
    'categories-browse',
    'profile',
    'customer-store-detail',
    'customer-checkout',
    'order-confirmation',
    'customer-orders',
    'customer-order-detail',
    'customer-addresses',
    'notifications',
  ],
  store_owner: [
    'store-dashboard',
    'store-orders',
    'store-products',
    'store-reviews',
    'store-payouts',
    'store-analytics',
    'store-notifications',
    'store-settings',
  ],
  delivery_agent: [
    'delivery-dashboard',
    'delivery-available',
    'delivery-active',
    'delivery-history',
    'delivery-earnings',
    'delivery-profile',
    'delivery-notifications',
  ],
  delivery_supervisor: [
    'delivery-supervisor-dashboard',
  ],
  finance_admin: [
    'finance-admin-dashboard',
  ],
  orders_manager: [
    'orders-manager-dashboard',
  ],
  admin: [
    'admin-dashboard',
    'admin-analytics',
    'admin-stores-applications',
    'admin-stores',
    'admin-agents',
    'admin-customers',
    'admin-orders',
    'admin-zones',
    'admin-coupons',
    'admin-categories',
    'admin-payouts',
    'admin-activity-log',
    'admin-settings',
    'admin-reviews',
    'admin-notifications',
    'admin-supabase',
  ],
};

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  full_name?: string;
  phone: string;
  role: UserRole;
  avatar_url?: string;
  is_active?: boolean;
  created_at: string;
  associated_store_id?: string; // For store_owner
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  sort_order: number;
}

export interface Store {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  owner_name?: string | null;
  owner_phone?: string | null;
  category_id?: string | null;
  category_name?: string | null;
  description?: string | null;
  logo_url: string;
  banner_url?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  is_approved: boolean;
  is_open: boolean;
  rating?: number | null;
  reviews_count?: number | null;
  commission_rate: number; // e.g. 10 (%)
  min_order_amount: number;
  delivery_fee: number;
  opening_hours?: { [key: string]: { open: string; close: string; closed?: boolean } };
  created_at: string;
}

export interface Product {
  id: string;
  store_id: string;
  name: string;
  description: string;
  price: number;
  original_price?: number;
  category_id?: string;
  category_name: string;
  image_url: string;
  stock: number;
  is_active: boolean;
  unit: string; // e.g. "كجم", "قطعة", "علبة", "لتر"
  created_at: string;
}

export interface CustomerAddress {
  id: string;
  user_id?: string;
  title?: string; // e.g. "المنزل", "العمل"
  address_line?: string;
  street?: string | null;
  building?: string | null;
  floor?: string | null;
  apartment?: string | null;
  lat?: number | null;
  lng?: number | null;
  notes?: string | null;
  is_default?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
}

export interface Cart {
  storeId: string | null;
  storeName: string | null;
  items: CartItem[];
}

export type OrderStatus =
  | 'pending'           // Created by customer, waiting store accept
  | 'accepted'          // Accepted by store
  | 'preparing'         // Store is preparing order
  | 'ready'             // Ready for delivery pickup
  | 'assigned'          // Delivery agent claimed
  | 'picked_up'         // Agent picked up from store
  | 'on_the_way'        // Agent delivering to customer
  | 'delivered'         // Delivered to customer
  | 'rejected'          // Rejected by store
  | 'cancelled';        // Cancelled by customer

export interface OrderItem {
  id: string;
  product_id: string;
  product_name: string;
  product_image?: string | null;
  unit_price: number;
  quantity: number;
  total_price: number;
  notes?: string | null;
}

export interface OrderStatusHistoryItem {
  status: OrderStatus;
  timestamp: string;
  note?: string;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name?: string | null;
  customer_phone?: string | null;
  store_id: string;
  store_name?: string | null;
  store_phone?: string | null;
  store_address?: string | null;
  store_lat?: number | null;
  store_lng?: number | null;
  delivery_address: CustomerAddress;
  delivery_agent_id?: string | null;
  delivery_agent_name?: string | null;
  delivery_agent_phone?: string | null;
  delivery_agent_vehicle?: string | null;
  delivery_agent_lat?: number | null;
  delivery_agent_lng?: number | null;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  tip_amount?: number | null;
  discount_amount: number;
  coupon_code?: string | null;
  total: number;
  payment_method: 'cash' | 'online';
  payment_status: 'pending' | 'paid';
  status: OrderStatus;
  status_history: OrderStatusHistoryItem[];
  rejection_reason?: string | null;
  customer_notes?: string | null;
  zone_id?: string | null;
  commission_pct?: number | null;
  commission_amount?: number | null;
  eta_minutes?: number | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryAgent {
  id: string;
  user_id: string;
  name: string;
  phone?: string | null;
  avatar_url?: string | null;
  vehicle_type: 'scooter' | 'motorcycle' | 'bicycle' | 'car';
  license_plate?: string | null;
  national_id?: string | null;
  is_approved: boolean;
  is_online: boolean;
  active_zone?: string | null;
  rating?: number | null;
  total_trips?: number | null;
  current_lat?: number | null;
  current_lng?: number | null;
  created_at: string;
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee?: number;
  eta_minutes?: number;
  is_active: boolean;
  polygon?: [number, number][]; // lat, lng points
  center_lat?: number;
  center_lng?: number;
  radius_km?: number;
  base_delivery_fee?: number;
  estimated_delivery_mins?: number;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount?: number;
  usage_limit?: number;
  used_count?: number;
  is_active: boolean;
  expires_at?: string;
  valid_until?: string;
}

export interface Review {
  id: string;
  order_id: string;
  store_id: string;
  store_name?: string | null;
  customer_id: string;
  customer_name: string;
  delivery_agent_id?: string | null;
  delivery_agent_name?: string | null;
  rating?: number | null;
  store_rating: number; // 1 to 5
  agent_rating?: number | null;
  delivery_rating?: number | null; // 1 to 5
  comment?: string | null;
  store_comment?: string | null;
  agent_comment?: string | null;
  store_response?: string | null;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  body?: string;
  message?: string;
  type: string;
  data?: Record<string, any>;
  read_at?: string | null;
  is_read?: boolean;
  created_at: string;
  link_url?: string;
}

export interface Payout {
  id: string;
  recipient_id: string;
  recipient_name?: string;
  recipient_type: 'store' | 'agent';
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  method?: string;
  store_name?: string;
  user_name?: string;
  payment_method?: string;
  account_details?: string;
  reference?: string;
  period_start?: string;
  period_end?: string;
  notes?: string;
  created_at: string;
  processed_at?: string;
  processed_by?: string;
}

export type PayoutRequest = Payout;

export interface ActivityLog {
  id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  order_id: string;
  sender_id: string;
  recipient_id?: string;
  content: string;
  is_read?: boolean;
  created_at: string;
}

export type PaginatedResult<T> = {
  data: T[];
  count: number;
};

export type DatabaseRow<T> = T & {
  id: string;
  created_at: string;
};
