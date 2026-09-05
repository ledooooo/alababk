// src/lib/supabase/zones.ts
import { supabase } from './client';
import { ensureUUID, translateSupabaseError } from './helpers';
import { DeliveryZone } from '../../types/domain';

export async function fetchSupabaseZones(): Promise<DeliveryZone[]> {
  const { data, error } = await supabase.rpc('list_delivery_zones_admin');
  if (error) throw new Error(translateSupabaseError(error).message);
  return (data || []).map((z: any) => ({
    id: z.id,
    name: z.name,
    fee: Number(z.fee),
    eta_minutes: z.eta_minutes || 30,
    is_active: z.is_active ?? true,
    polygon: z.polygon_points || null,
    base_delivery_fee: Number(z.fee),
    estimated_delivery_mins: z.eta_minutes || 30,
    center_lat: 30.0444,
    center_lng: 31.2357,
    radius_km: 5,
    store_id: z.store_id ?? null,
    store_name: z.store_name || undefined,
  }));
}

export async function saveSupabaseZone(zone: Partial<DeliveryZone>): Promise<DeliveryZone> {
  const validId = ensureUUID(zone.id);
  const { data, error } = await supabase.rpc('upsert_delivery_zone', {
    p_id: validId,
    p_name: zone.name,
    p_fee: zone.fee ?? zone.base_delivery_fee ?? 15,
    p_eta_minutes: zone.eta_minutes ?? zone.estimated_delivery_mins ?? 30,
    p_is_active: zone.is_active ?? true,
    p_store_id: zone.store_id || null,
    // لو مفيش نقاط جديدة (الأدمن مش بيعدّل شكل المضلع دلوقتي)، ابعت
    // null عشان الـRPC تحافظ على الـpolygon الحالي زي ما هو من غير تصفير
    p_points: zone.polygon && zone.polygon.length >= 3 ? zone.polygon : null,
  });
  if (error) throw new Error(translateSupabaseError(error).message);
  const row = data && data[0];
  if (!row) throw new Error('تعذر حفظ المنطقة');
  return {
    id: row.id,
    name: row.name,
    fee: Number(row.fee),
    eta_minutes: Number(row.eta_minutes || 30),
    is_active: row.is_active ?? true,
    polygon: row.polygon_points || null,
    base_delivery_fee: Number(row.fee),
    estimated_delivery_mins: Number(row.eta_minutes || 30),
    store_id: row.store_id ?? null,
    store_name: row.store_name || undefined,
  };
}

/**
 * حذف منطقة من Supabase.
 * ملاحظة: الـ RLS policies بتتحقق من صلاحيات الأدمن، فلازم المستدعي
 * يكون admin/finance_admin/orders_manager — وإلا الـ supabase هيرجع
 * 42501/403 وهيتـ throw.
 */
export async function deleteSupabaseZone(zoneId: string): Promise<void> {
  const validId = ensureUUID(zoneId);
  const { error } = await supabase.from('delivery_zones').delete().eq('id', validId);
  if (error) throw new Error(translateSupabaseError(error).message);
}