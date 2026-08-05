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
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          phone: string | null;
          role: string | null;
          avatar_url: string | null;
          associated_store_id: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          role?: string | null;
          avatar_url?: string | null;
          associated_store_id?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          phone?: string | null;
          role?: string | null;
          avatar_url?: string | null;
          associated_store_id?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string | null;
          icon: string | null;
          sort_order: number | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          name: string;
          slug?: string | null;
          icon?: string | null;
          sort_order?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string | null;
          icon?: string | null;
          sort_order?: number | null;
          created_at?: string | null;
        };
      };
      stores: {
        Row: {
          id: string;
          name: string;
          owner_id: string | null;
          category_id: string | null;
          category_name: string | null;
          logo_url: string | null;
          cover_url: string | null;
          address: string | null;
          lat: number | null;
          lng: number | null;
          phone: string | null;
          rating: number | null;
          review_count: number | null;
          commission_rate: number | null;
          is_approved: boolean | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          name: string;
          owner_id?: string | null;
          category_id?: string | null;
          category_name?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          address?: string | null;
          lat?: number | null;
          lng?: number | null;
          phone?: string | null;
          rating?: number | null;
          review_count?: number | null;
          commission_rate?: number | null;
          is_approved?: boolean | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          owner_id?: string | null;
          category_id?: string | null;
          category_name?: string | null;
          logo_url?: string | null;
          cover_url?: string | null;
          address?: string | null;
          lat?: number | null;
          lng?: number | null;
          phone?: string | null;
          rating?: number | null;
          review_count?: number | null;
          commission_rate?: number | null;
          is_approved?: boolean | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      products: {
        Row: {
          id: string;
          store_id: string;
          name: string;
          description: string | null;
          price: number;
          original_price: number | null;
          image_url: string | null;
          category: string | null;
          unit: string | null;
          in_stock: boolean | null;
          is_featured: boolean | null;
          rating: number | null;
          review_count: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          store_id: string;
          name: string;
          description?: string | null;
          price: number;
          original_price?: number | null;
          image_url?: string | null;
          category?: string | null;
          unit?: string | null;
          in_stock?: boolean | null;
          is_featured?: boolean | null;
          rating?: number | null;
          review_count?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          store_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          original_price?: number | null;
          image_url?: string | null;
          category?: string | null;
          unit?: string | null;
          in_stock?: boolean | null;
          is_featured?: boolean | null;
          rating?: number | null;
          review_count?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      addresses: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          address: string | null;
          city: string | null;
          building: string | null;
          floor: string | null;
          apartment: string | null;
          details: string | null;
          lat: number | null;
          lng: number | null;
          is_default: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          user_id: string;
          title?: string | null;
          address?: string | null;
          city?: string | null;
          building?: string | null;
          floor?: string | null;
          apartment?: string | null;
          details?: string | null;
          lat?: number | null;
          lng?: number | null;
          is_default?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          address?: string | null;
          city?: string | null;
          building?: string | null;
          floor?: string | null;
          apartment?: string | null;
          details?: string | null;
          lat?: number | null;
          lng?: number | null;
          is_default?: boolean | null;
          created_at?: string | null;
        };
      };
      delivery_zones: {
        Row: {
          id: string;
          name: string;
          fee: number | null;
          base_delivery_fee: number | null;
          eta_minutes: number | null;
          estimated_delivery_mins: number | null;
          center_lat: number | null;
          center_lng: number | null;
          radius_km: number | null;
          polygon: Json | null;
          is_active: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          name: string;
          fee?: number | null;
          base_delivery_fee?: number | null;
          eta_minutes?: number | null;
          estimated_delivery_mins?: number | null;
          center_lat?: number | null;
          center_lng?: number | null;
          radius_km?: number | null;
          polygon?: Json | null;
          is_active?: boolean | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          fee?: number | null;
          base_delivery_fee?: number | null;
          eta_minutes?: number | null;
          estimated_delivery_mins?: number | null;
          center_lat?: number | null;
          center_lng?: number | null;
          radius_km?: number | null;
          polygon?: Json | null;
          is_active?: boolean | null;
          created_at?: string | null;
        };
      };
      delivery_agents: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string;
          vehicle_type: string | null;
          national_id: string | null;
          current_lat: number | null;
          current_lng: number | null;
          rating: number | null;
          total_orders: number | null;
          total_earnings: number | null;
          is_online: boolean | null;
          is_approved: boolean | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          user_id: string;
          name: string;
          phone: string;
          vehicle_type?: string | null;
          national_id?: string | null;
          current_lat?: number | null;
          current_lng?: number | null;
          rating?: number | null;
          total_orders?: number | null;
          total_earnings?: number | null;
          is_online?: boolean | null;
          is_approved?: boolean | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          phone?: string;
          vehicle_type?: string | null;
          national_id?: string | null;
          current_lat?: number | null;
          current_lng?: number | null;
          rating?: number | null;
          total_orders?: number | null;
          total_earnings?: number | null;
          is_online?: boolean | null;
          is_approved?: boolean | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      orders: {
        Row: {
          id: string;
          order_number: string | null;
          customer_id: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          store_id: string | null;
          store_name: string | null;
          store_address: string | null;
          store_phone: string | null;
          store_lat: number | null;
          store_lng: number | null;
          delivery_agent_id: string | null;
          delivery_agent_name: string | null;
          delivery_agent_phone: string | null;
          delivery_address: string | null;
          delivery_lat: number | null;
          delivery_lng: number | null;
          delivery_building: string | null;
          delivery_floor: string | null;
          delivery_apartment: string | null;
          status: string;
          subtotal: number | null;
          delivery_fee: number | null;
          discount: number | null;
          platform_fee: number | null;
          total: number | null;
          payment_method: string | null;
          payment_status: string | null;
          notes: string | null;
          rating: number | null;
          review_notes: string | null;
          cancel_reason: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          order_number?: string | null;
          customer_id?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          store_id?: string | null;
          store_name?: string | null;
          store_address?: string | null;
          store_phone?: string | null;
          store_lat?: number | null;
          store_lng?: number | null;
          delivery_agent_id?: string | null;
          delivery_agent_name?: string | null;
          delivery_agent_phone?: string | null;
          delivery_address?: string | null;
          delivery_lat?: number | null;
          delivery_lng?: number | null;
          delivery_building?: string | null;
          delivery_floor?: string | null;
          delivery_apartment?: string | null;
          status: string;
          subtotal?: number | null;
          delivery_fee?: number | null;
          discount?: number | null;
          platform_fee?: number | null;
          total?: number | null;
          payment_method?: string | null;
          payment_status?: string | null;
          notes?: string | null;
          rating?: number | null;
          review_notes?: string | null;
          cancel_reason?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          order_number?: string | null;
          customer_id?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          store_id?: string | null;
          store_name?: string | null;
          store_address?: string | null;
          store_phone?: string | null;
          store_lat?: number | null;
          store_lng?: number | null;
          delivery_agent_id?: string | null;
          delivery_agent_name?: string | null;
          delivery_agent_phone?: string | null;
          delivery_address?: string | null;
          delivery_lat?: number | null;
          delivery_lng?: number | null;
          delivery_building?: string | null;
          delivery_floor?: string | null;
          delivery_apartment?: string | null;
          status?: string;
          subtotal?: number | null;
          delivery_fee?: number | null;
          discount?: number | null;
          platform_fee?: number | null;
          total?: number | null;
          payment_method?: string | null;
          payment_status?: string | null;
          notes?: string | null;
          rating?: number | null;
          review_notes?: string | null;
          cancel_reason?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          price: number;
          quantity: number;
          total_price: number | null;
          unit: string | null;
          notes: string | null;
          options: Json | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          price: number;
          quantity: number;
          total_price?: number | null;
          unit?: string | null;
          notes?: string | null;
          options?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          price?: number;
          quantity?: number;
          total_price?: number | null;
          unit?: string | null;
          notes?: string | null;
          options?: Json | null;
          created_at?: string | null;
        };
      };
      reviews: {
        Row: {
          id: string;
          user_id: string | null;
          store_id: string | null;
          order_id: string | null;
          rating: number;
          comment: string | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          user_id?: string | null;
          store_id?: string | null;
          order_id?: string | null;
          rating: number;
          comment?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          store_id?: string | null;
          order_id?: string | null;
          rating?: number;
          comment?: string | null;
          created_at?: string | null;
        };
      };
      coupons: {
        Row: {
          id: string;
          code: string;
          discount_percent: number | null;
          discount_amount: number | null;
          min_order_amount: number | null;
          max_discount_amount: number | null;
          expiry_date: string | null;
          is_active: boolean | null;
          usage_limit: number | null;
          times_used: number | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          code: string;
          discount_percent?: number | null;
          discount_amount?: number | null;
          min_order_amount?: number | null;
          max_discount_amount?: number | null;
          expiry_date?: string | null;
          is_active?: boolean | null;
          usage_limit?: number | null;
          times_used?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          code?: string;
          discount_percent?: number | null;
          discount_amount?: number | null;
          min_order_amount?: number | null;
          max_discount_amount?: number | null;
          expiry_date?: string | null;
          is_active?: boolean | null;
          usage_limit?: number | null;
          times_used?: number | null;
          created_at?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          type: string | null;
          is_read: boolean | null;
          data: Json | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          user_id: string;
          title: string;
          body: string;
          type?: string | null;
          is_read?: boolean | null;
          data?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          body?: string;
          type?: string | null;
          is_read?: boolean | null;
          data?: Json | null;
          created_at?: string | null;
        };
      };
      payouts: {
        Row: {
          id: string;
          recipient_id: string;
          recipient_type: string;
          amount: number;
          status: string;
          method: string | null;
          notes: string | null;
          created_at: string | null;
        };
        Insert: {
          id: string;
          recipient_id: string;
          recipient_type: string;
          amount: number;
          status?: string;
          method?: string | null;
          notes?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          recipient_type?: string;
          amount?: number;
          status?: string;
          method?: string | null;
          notes?: string | null;
          created_at?: string | null;
        };
      };
      order_status_history: {
        Row: {
          id: string;
          order_id: string;
          status: string;
          note: string | null;
          changed_by: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          order_id: string;
          status: string;
          note?: string | null;
          changed_by?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          order_id?: string;
          status?: string;
          note?: string | null;
          changed_by?: string | null;
          created_at?: string | null;
        };
      };
    };
    Views: {
      [key: string]: {
        Row: Record<string, any>;
      };
    };
    Functions: {
      [key: string]: {
        Args: Record<string, any>;
        Returns: any;
      };
    };
    Enums: {
      [key: string]: any;
    };
  };
}
