// src/lib/supabase/stats.ts
import { supabase } from './client';
import { translateSupabaseError } from './helpers';

export interface AgentStats {
  completed_deliveries: number;
  total_trips: number;
  total_earnings: number;
  total_tips: number;
  avg_rating: number;
}

export async function fetchAgentStats(agentId: string): Promise<AgentStats | null> {
  try {
    const { data, error } = await supabase
      .from('agent_stats')
      .select('*')
      .eq('agent_id', agentId)
      .maybeSingle();

    if (error) throw new Error(translateSupabaseError(error).message);
    if (!data) return null;

    const a = data as any;
    return {
      completed_deliveries: Number(a.completed_deliveries || 0),
      total_trips: Number(a.total_trips || 0),
      total_earnings: Number(a.total_earnings || 0),
      total_tips: Number(a.total_tips || 0),
      avg_rating: Number(a.avg_rating || a.rating || 0),
    };
  } catch (err) {
    console.error('Error fetching agent stats:', err);
    return null;
  }
}

export interface StoreStats {
  delivered_orders: number;
  total_orders: number;
  total_revenue: number;
  total_commission: number;
  avg_rating: number;
}

export async function fetchStoreStats(storeId: string): Promise<StoreStats | null> {
  try {
    const { data, error } = await supabase
      .from('store_stats')
      .select('*')
      .eq('store_id', storeId)
      .maybeSingle();

    if (error) throw new Error(translateSupabaseError(error).message);
    if (!data) return null;

    const s = data as any;
    return {
      delivered_orders: Number(s.delivered_orders || 0),
      total_orders: Number(s.total_orders || 0),
      total_revenue: Number(s.total_revenue || 0),
      total_commission: Number(s.total_commission || 0),
      avg_rating: Number(s.avg_rating || s.rating || 0),
    };
  } catch (err) {
    console.error('Error fetching store stats:', err);
    return null;
  }
}

export interface FinanceSummaryItem {
  day: string;
  store_id?: string;
  delivered_orders: number;
  gmv: number;
  net_sales: number;
  commissions: number;
  delivery_fees: number;
  tips: number;
}

export async function fetchFinanceSummary(): Promise<FinanceSummaryItem[]> {
  try {
    const { data, error } = await supabase
      .from('finance_summary')
      .select('*')
      .order('day', { ascending: false });

    if (error) throw new Error(translateSupabaseError(error).message);
    return (data || []).map((row: any) => ({
      day: row.day,
      store_id: row.store_id,
      delivered_orders: Number(row.delivered_orders || 0),
      gmv: Number(row.gmv || 0),
      net_sales: Number(row.net_sales || 0),
      commissions: Number(row.commissions || 0),
      delivery_fees: Number(row.delivery_fees || 0),
      tips: Number(row.tips || 0),
    }));
  } catch (err) {
    console.error('Error fetching finance summary:', err);
    return [];
  }
}