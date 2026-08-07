// src/types/database.types.ts
// Auto-generated from schema.sql – matches the actual PostgreSQL schema 1:1

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      activity_log: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string | null;
          entity_id: string | null;
          metadata: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string; // default: gen_random_uuid()
          actor_id?: string | null;
          action: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json | null;
          created_at?: string | null; // default: now()
        };
        Update: {
          id?: string;
          actor_id?: string | null;
          action?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
        };
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          label: string;
          street: string;
          building: string | null;
          floor: string | null;
          apartment: string | null;
          notes: string | null;
          location: Json | null; // geography(Point,4326)
          is_default: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string; // default: uuid_generate_v4()
          user_id: string;
          label: string;
          street: string;
          building?: string | null;
          floor?: string | null;
          apartment?: string | null;
          notes?: string | null;
          location?: Json | null;
          is_default?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          label?: string;
          street?: string;
          building?: string | null;
          floor?: string | null;
          apartment?: string | null;
          notes?: string | null;
          location?: Json | null;
          is_default?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          icon: string | null;
          image_url: string | null;
          sort_order: number | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          icon?: string | null;
          image_url?: string | null;
          sort_order?: number | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          icon?: string | null;
          image_url?: string | null;
          sort_order?: number | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          order_id: string | null;
          sender_id: string;
          recipient_id: string | null;
          content: string;
          is_read: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          order_id?: string | null;
          sender_id: string;
          recipient_id?: string | null;
          content: string;
          is_read?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string | null;
          sender_id?: string;
          recipient_id?: string | null;
          content?: string;
          is_read?: boolean | null;
          created_at?: string | null;
        };
      };
      coupons: {
        Row: {
          id: string;
          code: string;
          type: string; // 'percent' | 'fixed'
          value: number;
          min_order_amount: number | null;
          max_discount: number | null;
          max_uses: number | null;
          used_count: number | null;
          valid_from: string | null;
          valid_until: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          code: string;
          type: string;
          value: number;
          min_order_amount?: number | null;
          max_discount?: number | null;
          max_uses?: number | null;
          used_count?: number | null;
          valid_from?: string | null;
          valid_until?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          code?: string;
          type?: string;
          value?: number;
          min_order_amount?: number | null;
          max_discount?: number | null;
          max_uses?: number | null;
          used_count?: number | null;
          valid_from?: string | null;
          valid_until?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      delivery_agents: {
        Row: {
          id: string;
          user_id: string;
          vehicle_type: string; // motorcycle, bicycle, car, walking
          plate_number: string | null;
          id_number: string | null;
          is_online: boolean | null;
          is_approved: boolean | null;
          is_active: boolean | null;
          current_location: Json | null; // geography(Point,4326)
          rating_avg: number | null;
          rating_count: number | null;
          total_deliveries: number | null;
          total_earnings: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          vehicle_type: string;
          plate_number?: string | null;
          id_number?: string | null;
          is_online?: boolean | null;
          is_approved?: boolean | null;
          is_active?: boolean | null;
          current_location?: Json | null;
          rating_avg?: number | null;
          rating_count?: number | null;
          total_deliveries?: number | null;
          total_earnings?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          vehicle_type?: string;
          plate_number?: string | null;
          id_number?: string | null;
          is_online?: boolean | null;
          is_approved?: boolean | null;
          is_active?: boolean | null;
          current_location?: Json | null;
          rating_avg?: number | null;
          rating_count?: number | null;
          total_deliveries?: number | null;
          total_earnings?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      delivery_zones: {
        Row: {
          id: string;
          name: string;
          fee: number;
          eta_minutes: number;
          polygon: Json | null; // geography(Polygon,4326)
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          fee?: number;
          eta_minutes?: number;
          polygon?: Json | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          fee?: number;
          eta_minutes?: number;
          polygon?: Json | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string | null;
          type: string;
          data: Json | null;
          read_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          body?: string | null;
          type: string;
          data?: Json | null;
          read_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          body?: string | null;
          type?: string;
          data?: Json | null;
          read_at?: string | null;
          created_at?: string | null;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          name: string;
          price: number;
          quantity: number;
          options: Json | null;
          notes: string | null;
          subtotal: number;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id?: string | null;
          name: string;
          price: number;
          quantity: number;
          options?: Json | null;
          notes?: string | null;
          subtotal: number;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          name?: string;
          price?: number;
          quantity?: number;
          options?: Json | null;
          notes?: string | null;
          subtotal?: number;
          created_at?: string | null;
        };
      };
      order_status_history: {
        Row: {
          id: string;
          order_id: string;
          status: string;
          changed_by: string | null;
          note: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          status: string;
          changed_by?: string | null;
          note?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          status?: string;
          changed_by?: string | null;
          note?: string | null;
          created_at?: string | null;
        };
      };
      orders: {
        Row: {
          id: string;
          code: string;
          customer_id: string;
          store_id: string;
          delivery_agent_id: string | null;
          address_id: string;
          subtotal: number;
          delivery_fee: number;
          discount: number | null;
          total: number;
          payment_method: string; // 'cash' | 'online'
          payment_status: string; // 'pending' | 'paid' | 'failed' | 'refunded'
          status: string; // order status enum
          customer_notes: string | null;
          rejection_reason: string | null;
          cancellation_reason: string | null;
          coupon_id: string | null;
          placed_at: string | null;
          accepted_at: string | null;
          ready_at: string | null;
          picked_up_at: string | null;
          delivered_at: string | null;
          cancelled_at: string | null;
          created_at: string | null;
          updated_at: string | null;
          delivery_agent_lat: number | null;
          delivery_agent_lng: number | null;
          delivery_agent_name: string | null;
          delivery_agent_phone: string | null;
          delivery_agent_vehicle: string | null;
          tip_amount: number | null;
          zone_id: string | null;
          commission_pct: number | null;
          commission_amount: number | null;
          eta_minutes: number | null;
        };
        Insert: {
          id?: string;
          code: string;
          customer_id: string;
          store_id: string;
          delivery_agent_id?: string | null;
          address_id: string;
          subtotal: number;
          delivery_fee?: number;
          discount?: number | null;
          total: number;
          payment_method: string;
          payment_status?: string;
          status?: string;
          customer_notes?: string | null;
          rejection_reason?: string | null;
          cancellation_reason?: string | null;
          coupon_id?: string | null;
          placed_at?: string | null;
          accepted_at?: string | null;
          ready_at?: string | null;
          picked_up_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          delivery_agent_lat?: number | null;
          delivery_agent_lng?: number | null;
          delivery_agent_name?: string | null;
          delivery_agent_phone?: string | null;
          delivery_agent_vehicle?: string | null;
          tip_amount?: number | null;
          zone_id?: string | null;
          commission_pct?: number | null;
          commission_amount?: number | null;
          eta_minutes?: number | null;
        };
        Update: {
          id?: string;
          code?: string;
          customer_id?: string;
          store_id?: string;
          delivery_agent_id?: string | null;
          address_id?: string;
          subtotal?: number;
          delivery_fee?: number;
          discount?: number | null;
          total?: number;
          payment_method?: string;
          payment_status?: string;
          status?: string;
          customer_notes?: string | null;
          rejection_reason?: string | null;
          cancellation_reason?: string | null;
          coupon_id?: string | null;
          placed_at?: string | null;
          accepted_at?: string | null;
          ready_at?: string | null;
          picked_up_at?: string | null;
          delivered_at?: string | null;
          cancelled_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          delivery_agent_lat?: number | null;
          delivery_agent_lng?: number | null;
          delivery_agent_name?: string | null;
          delivery_agent_phone?: string | null;
          delivery_agent_vehicle?: string | null;
          tip_amount?: number | null;
          zone_id?: string | null;
          commission_pct?: number | null;
          commission_amount?: number | null;
          eta_minutes?: number | null;
        };
      };
      payouts: {
        Row: {
          id: string;
          recipient_id: string;
          recipient_type: string; // 'store' | 'agent'
          amount: number;
          status: string; // 'pending' | 'processing' | 'completed' | 'failed'
          method: string | null;
          reference: string | null;
          period_start: string | null;
          period_end: string | null;
          notes: string | null;
          created_at: string | null;
          updated_at: string | null;
          processed_at: string | null;
          processed_by: string | null;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          recipient_type: string;
          amount: number;
          status?: string;
          method?: string | null;
          reference?: string | null;
          period_start?: string | null;
          period_end?: string | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          processed_at?: string | null;
          processed_by?: string | null;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          recipient_type?: string;
          amount?: number;
          status?: string;
          method?: string | null;
          reference?: string | null;
          period_start?: string | null;
          period_end?: string | null;
          notes?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          processed_at?: string | null;
          processed_by?: string | null;
        };
      };
      products: {
        Row: {
          id: string;
          store_id: string;
          category_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          price: number;
          old_price: number | null;
          stock: number;
          images: string[] | null;
          attributes: Json | null;
          is_active: boolean | null;
          is_featured: boolean | null;
          total_sold: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          store_id: string;
          category_id?: string | null;
          name: string;
          slug: string;
          description?: string | null;
          price: number;
          old_price?: number | null;
          stock?: number;
          images?: string[] | null;
          attributes?: Json | null;
          is_active?: boolean | null;
          is_featured?: boolean | null;
          total_sold?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          store_id?: string;
          category_id?: string | null;
          name?: string;
          slug?: string;
          description?: string | null;
          price?: number;
          old_price?: number | null;
          stock?: number;
          images?: string[] | null;
          attributes?: Json | null;
          is_active?: boolean | null;
          is_featured?: boolean | null;
          total_sold?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          role: string;
          full_name: string;
          phone: string | null;
          avatar_url: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          role?: string;
          full_name: string;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          role?: string;
          full_name?: string;
          phone?: string | null;
          avatar_url?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      reviews: {
        Row: {
          id: string;
          order_id: string;
          customer_id: string;
          store_id: string | null;
          delivery_agent_id: string | null;
          store_rating: number | null;
          agent_rating: number | null;
          delivery_rating: number | null;
          store_comment: string | null;
          agent_comment: string | null;
          store_reply: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          customer_id: string;
          store_id?: string | null;
          delivery_agent_id?: string | null;
          store_rating?: number | null;
          agent_rating?: number | null;
          delivery_rating?: number | null;
          store_comment?: string | null;
          agent_comment?: string | null;
          store_reply?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          customer_id?: string;
          store_id?: string | null;
          delivery_agent_id?: string | null;
          store_rating?: number | null;
          agent_rating?: number | null;
          delivery_rating?: number | null;
          store_comment?: string | null;
          agent_comment?: string | null;
          store_reply?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      stores: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          slug: string;
          description: string | null;
          category_id: string | null;
          logo_url: string | null;
          cover_url: string | null;
          phone: string;
          address: string;
          location: Json | null; // geography(Point,4326)
          working_hours: Json | null;
          is_active: boolean | null;
          is_approved: boolean | null;
          is_vacation_mode: boolean | null;
          commission_pct: number | null;
          min_order_amount: number | null;
          rating_avg: number | null;
          rating_count: number | null;
          total_orders: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          slug: string;
          description?: string | null;
          category_id?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          phone: string;
          address: string;
          location?: Json | null;
          working_hours?: Json | null;
          is_active?: boolean | null;
          is_approved?: boolean | null;
          is_vacation_mode?: boolean | null;
          commission_pct?: number | null;
          min_order_amount?: number | null;
          rating_avg?: number | null;
          rating_count?: number | null;
          total_orders?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          category_id?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          phone?: string;
          address?: string;
          location?: Json | null;
          working_hours?: Json | null;
          is_active?: boolean | null;
          is_approved?: boolean | null;
          is_vacation_mode?: boolean | null;
          commission_pct?: number | null;
          min_order_amount?: number | null;
          rating_avg?: number | null;
          rating_count?: number | null;
          total_orders?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      wishlist_products: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string;
          created_at?: string;
        };
      };
      wishlist_stores: {
        Row: {
          id: string;
          user_id: string;
          store_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          store_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          store_id?: string;
          created_at?: string;
        };
      };
    };
    Views: {
      agent_stats: {
        Row: {
          agent_id: string;
          user_id: string;
          full_name: string;
          completed_deliveries: number | null;
          total_trips: number | null;
          total_earnings: number | null;
          total_tips: number | null;
          avg_rating: number | null;
          rating: number | null;
        };
      };
      finance_summary: {
        Row: {
          day: string;
          store_id: string | null;
          delivered_orders: number | null;
          gmv: number | null;
          net_sales: number | null;
          commissions: number | null;
          delivery_fees: number | null;
          tips: number | null;
        };
      };
      public_agents: {
        Row: {
          id: string;
          vehicle_type: string;
          is_online: boolean | null;
          rating_avg: number | null;
          rating_count: number | null;
          total_deliveries: number | null;
        };
      };
      store_stats: {
        Row: {
          store_id: string;
          name: string;
          owner_id: string;
          delivered_orders: number | null;
          total_orders: number | null;
          total_revenue: number | null;
          total_commission: number | null;
          avg_rating: number | null;
          rating: number | null;
        };
      };
    };
    Functions: {
      calculate_delivery_fee: {
        Args: { p_address_id: string };
        Returns: {
          zone_id: string;
          fee: number;
          eta_minutes: number;
        };
      };
      create_notification: {
        Args: {
          p_user_id: string;
          p_title: string;
          p_body: string;
          p_type?: string;
          p_data?: Json;
        };
        Returns: string; // uuid
      };
      create_order_secure: {
        Args: {
          p_store_id: string;
          p_address_id: string;
          p_payment_method: string;
          p_items: Json;
          p_coupon_code?: string | null;
          p_customer_notes?: string | null;
          p_tip_amount?: number;
        };
        Returns: Json; // result object
      };
      get_email_by_phone: {
        Args: { p_phone: string };
        Returns: string;
      };
      get_user_role: {
        Args: { user_id: string };
        Returns: string;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_delivery_supervisor: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_finance_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_orders_manager: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      is_staff: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      owns_store: {
        Args: { store_id: string };
        Returns: boolean;
      };
      process_payout_secure: {
        Args: {
          p_payout_id: string;
          p_new_status: string;
          p_notes?: string | null;
        };
        Returns: Json; // payout object
      };
      quote_order_secure: {
        Args: {
          p_store_id: string;
          p_address_id: string;
          p_items: Json;
          p_coupon_code?: string | null;
          p_tip_amount?: number;
        };
        Returns: Json; // quote object
      };
    };
    Enums: {
      // No explicit enums defined in schema
    };
  };
}