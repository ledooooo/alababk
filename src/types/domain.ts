export type UserRole =
  | 'customer'
  | 'store_owner'
  | 'delivery_agent'
  | 'admin'
  | 'delivery_supervisor'
  | 'finance_admin'
  | 'orders_manager';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  full_name?: string;
  phone: string;
  role: UserRole;
  avatar_url?: string;
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
  owner_name?: string;
  owner_phone?: string;
  category_id: string;
  category_name?: string;
  description: string;
  logo_url: string;
  banner_url?: string;
  address: string;
  lat: number;
  lng: number;
  phone: string;
  is_approved: boolean;
  is_open: boolean;
  rating: number;
  reviews_count: number;
  commission_rate: number; // e.g. 10 (%)
  min_order_amount: number;
  delivery_fee: number;
  opening_hours: { [key: string]: { open: string; close: string; closed?: boolean } };
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
  user_id: string;
  title: string; // e.g. "المنزل", "العمل"
  address_line: string;
  street?: string;
  building: string;
  floor: string;
  apartment: string;
  lat: number;
  lng: number;
  notes?: string;
  is_default: boolean;
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
  product_image: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  notes?: string;
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
  customer_name: string;
  customer_phone: string;
  store_id: string;
  store_name: string;
  store_phone: string;
  store_address: string;
  store_lat: number;
  store_lng: number;
  delivery_address: CustomerAddress;
  delivery_agent_id?: string;
  delivery_agent_name?: string;
  delivery_agent_phone?: string;
  delivery_agent_vehicle?: string;
  delivery_agent_lat?: number;
  delivery_agent_lng?: number;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  tip_amount?: number;
  discount_amount: number;
  coupon_code?: string;
  total: number;
  payment_method: 'cod' | 'card';
  payment_status: 'pending' | 'paid';
  status: OrderStatus;
  status_history: OrderStatusHistoryItem[];
  rejection_reason?: string;
  customer_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DeliveryAgent {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  avatar_url?: string;
  vehicle_type: 'scooter' | 'motorcycle' | 'bicycle' | 'car';
  license_plate?: string;
  national_id: string;
  is_approved: boolean;
  is_online: boolean;
  active_zone: string;
  rating: number;
  total_trips: number;
  current_lat?: number;
  current_lng?: number;
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
  discount_type: 'percent' | 'flat' | 'fixed';
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
  store_name?: string;
  customer_id: string;
  customer_name: string;
  delivery_agent_id?: string;
  delivery_agent_name?: string;
  rating?: number;
  store_rating: number; // 1 to 5
  agent_rating?: number;
  delivery_rating?: number; // 1 to 5
  comment?: string;
  store_comment?: string;
  agent_comment?: string;
  store_response?: string;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'order_status' | 'system' | 'promotion';
  is_read: boolean;
  created_at: string;
  link_url?: string;
}

export interface Payout {
  id: string;
  recipient_id: string;
  recipient_name?: string;
  recipient_type: 'store' | 'agent';
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'approved' | 'rejected';
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
}

export type PayoutRequest = Payout;
