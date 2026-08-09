// src/lib/supabase/summary.ts
import { supabase } from './client';
import { translateSupabaseError } from './errors';

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

/**
 * Fetch finance summary records from finance_summary view
 */
export async function fetchFinanceSummary(): Promise<FinanceSummaryItem[]> {
  try {
    const { data, error } = await supabase
      .from('finance_summary')
      .select('*')
      .order('day', { ascending: false });

    if (error || !data) return [];

    return (data as any[]).map((row) => ({
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