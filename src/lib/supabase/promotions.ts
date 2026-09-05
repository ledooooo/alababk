// src/lib/supabase/promotions.ts
import { supabase } from './client';
import { translateSupabaseError } from './helpers';
import { PromoTheme, PromoIconKey } from '../promo-presets';

export interface Promotion {
  id: string;
  title: string;
  highlight_text: string;
  description: string;
  badge_label: string;
  theme: PromoTheme;
  icon: PromoIconKey;
  coupon_code: string | null;
  action_type: 'stores' | 'store_detail' | 'category' | 'external_url';
  action_target: string | null;
  action_label: string;
  display_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapPromotion(p: any): Promotion {
  return {
    id: p.id,
    title: p.title,
    highlight_text: p.highlight_text,
    description: p.description,
    badge_label: p.badge_label,
    theme: p.theme,
    icon: p.icon,
    coupon_code: p.coupon_code ?? null,
    action_type: p.action_type,
    action_target: p.action_target ?? null,
    action_label: p.action_label,
    display_order: p.display_order ?? 0,
    is_active: p.is_active ?? true,
    starts_at: p.starts_at ?? null,
    ends_at: p.ends_at ?? null,
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
}

/** العروض النشطة فقط وفي نطاق تاريخها — للعرض في كاروسيل العميل (RLS بتفلترهم أصلاً، بس بنرتبهم هنا). */
export async function fetchActivePromotions(): Promise<Promotion[]> {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) throw new Error(translateSupabaseError(error).message);
  return (data || []).map(mapPromotion);
}

/** كل العروض (نشطة وغير نشطة) — للوحة تحكم الأدمن فقط (RLS بتمنع أي حد تاني). */
export async function fetchAllPromotionsAdmin(): Promise<Promotion[]> {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .order('display_order', { ascending: true });
  if (error) throw new Error(translateSupabaseError(error).message);
  return (data || []).map(mapPromotion);
}

export async function savePromotion(promo: Partial<Promotion> & { id?: string }): Promise<Promotion> {
  const payload: Record<string, any> = {
    title: promo.title,
    highlight_text: promo.highlight_text,
    description: promo.description,
    badge_label: promo.badge_label,
    theme: promo.theme,
    icon: promo.icon,
    coupon_code: promo.coupon_code || null,
    action_type: promo.action_type,
    action_target: promo.action_target || null,
    action_label: promo.action_label,
    display_order: promo.display_order ?? 0,
    is_active: promo.is_active ?? true,
    starts_at: promo.starts_at || null,
    ends_at: promo.ends_at || null,
  };
  if (promo.id) payload.id = promo.id;

  const { data, error } = await supabase.from('promotions').upsert(payload, { onConflict: 'id' }).select('*').single();
  if (error) throw new Error(translateSupabaseError(error).message);
  return mapPromotion(data);
}

export async function deletePromotion(id: string): Promise<void> {
  const { error } = await supabase.from('promotions').delete().eq('id', id);
  if (error) throw new Error(translateSupabaseError(error).message);
}
