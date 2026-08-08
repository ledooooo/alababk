// src/lib/supabase/coupons.ts
import { supabase } from './client';
import { ensureUUID, translateSupabaseError } from './helpers';
import { Coupon } from '../../types/domain';

export async function fetchSupabaseCoupons(): Promise<Coupon[]> {
  const { data, error } = await supabase.from('coupons').select('*');
  if (error) throw new Error(translateSupabaseError(error).message);
  return (data || []).map((c: any) => ({
    id: c.id,
    code: c.code,
    discount_type: (c.type === 'percent' ? 'percent' : 'fixed') as 'percent' | 'fixed',
    discount_value: Number(c.value),
    min_order_amount: Number(c.min_order_amount || 0),
    max_discount_amount: c.max_discount ? Number(c.max_discount) : undefined,
    usage_limit: c.max_uses || undefined,
    used_count: c.used_count || 0,
    is_active: c.is_active ?? true,
    valid_until: c.valid_until,
  }));
}

export async function saveSupabaseCoupon(coupon: Partial<Coupon>): Promise<void> {
  const payload = {
    id: ensureUUID(coupon.id),
    code: coupon.code,
    type: coupon.discount_type === 'percent' ? 'percent' : 'fixed',
    value: coupon.discount_value,
    min_order_amount: coupon.min_order_amount || 0,
    max_discount: coupon.max_discount_amount,
    max_uses: coupon.usage_limit,
    is_active: coupon.is_active ?? true,
    valid_until: coupon.valid_until,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from('coupons').upsert(payload, { onConflict: 'id' });
  if (error) throw new Error(translateSupabaseError(error).message);
}