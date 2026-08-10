// src/lib/supabase/payouts.ts
import { supabase } from './client';
import { ensureUUID, translateSupabaseError } from './helpers';
import { Payout } from '../../types/domain';

export async function fetchSupabasePayouts(): Promise<Payout[]> {
  const { data, error } = await supabase
    .from('payouts')
    .select('*, profiles!payouts_recipient_id_fkey(full_name)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(translateSupabaseError(error).message);
  return (data || []).map((p: any) => ({
    id: p.id,
    recipient_id: p.recipient_id,
    recipient_name: p.profiles?.full_name || 'مستفيد',
    recipient_type: p.recipient_type,
    amount: Number(p.amount),
    status: p.status,
    method: p.method,
    reference: p.reference,
    period_start: p.period_start,
    period_end: p.period_end,
    notes: p.notes,
    created_at: p.created_at || new Date().toISOString(),
    processed_at: p.processed_at,
    processed_by: p.processed_by,
  }));
}

export async function createSupabasePayout(payout: Payout): Promise<Payout> {
  const payoutId = ensureUUID(payout.id);
  const payload = {
    id: payoutId,
    recipient_id: ensureUUID(payout.recipient_id),
    recipient_type: payout.recipient_type,
    amount: payout.amount,
    status: payout.status || 'pending',
    method: payout.method,
    notes: payout.account_details || payout.notes || null,
    created_at: payout.created_at || new Date().toISOString(),
  };

  const { data, error } = await supabase.from('payouts').insert([payload]).select().single();
  if (error) throw new Error(translateSupabaseError(error).message);
  return { ...payout, id: data.id, created_at: data.created_at };
}

export async function updateSupabasePayoutStatus(
  payoutId: string,
  newStatus: 'completed' | 'failed',
  notes?: string
): Promise<Payout> {
  const { data, error } = await supabase.rpc('process_payout_secure', {
    p_payout_id: ensureUUID(payoutId),
    p_new_status: newStatus,
    p_notes: notes || null,
  });
  if (error) throw new Error(translateSupabaseError(error).message);
  return data as Payout;
}