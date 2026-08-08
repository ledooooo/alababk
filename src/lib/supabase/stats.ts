// src/lib/supabase/stats.ts
import { supabase } from './client';
import { translateSupabaseError } from './helpers';

export interface AgentStats {
  agent_id: string;
  user_id: string;
  full_name: string;
  completed_deliveries: number;
  total_trips: number;
  total_earnings: number;
  total_tips: number;
  avg_rating: number;
  rating: number;
}

export interface StoreStats {
  store_id: string;
  name: string;
  owner_id: string;
  delivered_orders: number;
  total_orders: number;
  total_revenue: number;
  total_commission: number;
  avg_rating: number;
  rating: number;
}

export interface FinanceSummary {
  day: string;
  store_id?: string | null;
  delivered_orders: number;
  gmv: number;
  net_sales: number;
  commissions: number;
  delivery_fees: number;
  tips: number;
}

export async function fetchAgentStats(agentId: string): Promise<AgentStats | null> {
  const { data, error } = await supabase
    .from('agent_stats')
    .select('*')
    .eq('agent_id', agentId)
    .maybeSingle();

  if (error) {
    // قد لا يكون العرض موجوداً، نعيد null
    console.warn('fetchAgentStats error:', error);
    return null;
  }
  return data as AgentStats || null;
}

export async function fetchStoreStats(storeId: string): Promise<StoreStats | null> {
  const { data, error } = await supabase
    .from('store_stats')
    .select('*')
    .eq('store_id', storeId)
    .maybeSingle();

  if (error) {
    console.warn('fetchStoreStats error:', error);
    return null;
  }
  return data as StoreStats || null;
}

export async function fetchFinanceSummary(): Promise<FinanceSummary[]> {
  const { data, error } = await supabase
    .from('finance_summary')
    .select('*')
    .order('day', { ascending: false });

  if (error) {
    console.warn('fetchFinanceSummary error:', error);
    return [];
  }
  return (data || []) as FinanceSummary[];
}