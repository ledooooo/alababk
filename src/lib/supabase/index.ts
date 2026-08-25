// src/lib/supabase/index.ts
export * from './client';
export * from './errors';
export * from './helpers';
export * from './crud';
export * from './auth';
export * from './users';
export * from './categories';
export * from './stores';
export * from './products';
export * from './orders';
export * from './addresses';
export * from './delivery-agents';
export * from './zones';
export * from './coupons';
export * from './reviews';
export * from './notifications';
export * from './payouts';
export * from './storage-upload';
export * from './chat';
export * from './realtime';
export * from './admin';     // يحتوي على checkSupabaseConnection
export * from './stats';     // يحتوي على fetchAgentStats, fetchStoreStats, fetchFinanceSummary
export * from './customer-insights';  // wrappers لـ fix_12 (is_address_in_any_zone, is_first_order, customer_order_count)