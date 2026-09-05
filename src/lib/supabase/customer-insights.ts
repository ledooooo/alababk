// src/lib/supabase/customer-insights.ts
// =====================================================================
// Wrappers للـ SQL helper functions اللي اتعملت في fix_12.
// الهدف: واجهة مريحة للفِرونت بدل ما كل component يكرر
// supabase.rpc('is_address_in_any_zone', { ... }) يدوي.
// =====================================================================
import { supabase } from './client';
import { translateSupabaseError } from './errors';

export interface ZoneMatch {
  zone_id: string;
  zone_name: string;
  fee: number;
  eta_minutes: number;
}

/**
 * هل العنوان داخل zone نشطة؟
 * @returns ZoneMatch لو جوه zone، أو null لو بره كل المناطق / مفيش location.
 *
 * @example
 *   const zone = await checkAddressZone(addressId);
 *   if (zone) {
 *     console.log(`جوه ${zone.zone_name} — رسوم ${zone.fee} ج / ${zone.eta_minutes} دقيقة`);
 *   } else {
 *     console.log('بره كل مناطق التوصيل');
 *   }
 */
export async function checkAddressZone(addressId: string, storeId?: string | null): Promise<ZoneMatch | null> {
  if (!addressId) return null;
  try {
    const { data, error } = await supabase.rpc('is_address_in_any_zone', {
      p_address_id: addressId,
      p_store_id: storeId || null,
    });
    if (error) throw error;
    if (!data || data.length === 0) return null;
    const row = data[0];
    return {
      zone_id: row.zone_id,
      zone_name: row.zone_name,
      fee: Number(row.fee),
      eta_minutes: Number(row.eta_minutes),
    };
  } catch (err) {
    console.error('checkAddressZone error:', translateSupabaseError(err).message);
    return null;
  }
}

/**
 * هل النقطة (lat/lng) داخل zone نشطة؟
 * نسخة من checkAddressZone بس بتاخد إحداثيات مباشرة — مفيدة للـ UX
 * اللحظي على الخريطة لما اليوزر بيسحب البين (قبل ما يحفظ العنوان).
 *
 * @example
 *   // في Leaflet onClick:
 *   const zone = await checkPointInZone(lat, lng);
 *   if (zone) {
 *     setZoneBadge({ name: zone.zone_name, fee: zone.fee, eta: zone.eta_minutes });
 *   } else {
 *     setZoneBadge(null);  // "بره كل مناطق التوصيل"
 *   }
 */
export async function checkPointInZone(lat: number, lng: number, storeId?: string | null): Promise<ZoneMatch | null> {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return null;
  try {
    const { data, error } = await supabase.rpc('is_point_in_any_zone', {
      p_lat: lat,
      p_lng: lng,
      p_store_id: storeId || null,
    });
    if (error) throw error;
    if (!data || data.length === 0) return null;
    const row = data[0];
    return {
      zone_id: row.zone_id,
      zone_name: row.zone_name,
      fee: Number(row.fee),
      eta_minutes: Number(row.eta_minutes),
    };
  } catch (err) {
    console.error('checkPointInZone error:', translateSupabaseError(err).message);
    return null;
  }
}

export interface NearestZoneMatch extends ZoneMatch {
  distance_km: number;
}

/**
 * لما نقطة تبقى برّه كل مناطق التغطية، ترجع أقرب zone نشطة (بالكم
 * التقريبي) عشان نوجّه العميل بدل ما نسيبه واقف على رفض جاف.
 * ترجع null لو مفيش أي zone نشطة أصلاً أو حصل خطأ.
 *
 * @example
 *   const zone = await checkPointInZone(lat, lng);
 *   if (!zone) {
 *     const nearest = await getNearestZone(lat, lng);
 *     // "أقرب منطقة تغطية: مدينة نصر — تبعد حوالي 4.2 كم"
 *   }
 */
export async function getNearestZone(lat: number, lng: number, storeId?: string | null): Promise<NearestZoneMatch | null> {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return null;
  try {
    const { data, error } = await supabase.rpc('nearest_delivery_zone', {
      p_lat: lat,
      p_lng: lng,
      p_store_id: storeId || null,
    });
    if (error) throw error;
    if (!data || data.length === 0) return null;
    const row = data[0];
    return {
      zone_id: row.zone_id,
      zone_name: row.zone_name,
      fee: Number(row.fee),
      eta_minutes: Number(row.eta_minutes),
      distance_km: Number(row.distance_km),
    };
  } catch (err) {
    console.error('getNearestZone error:', translateSupabaseError(err).message);
    return null;
  }
}

/**
 * تسجيل صامت (fire-and-forget) لمحاولة عميل حفظ عنوان برّه كل مناطق
 * التغطية — لفريق التشغيل يشوف تكرار المناطق المطلوبة برّه التغطية.
 * ما بترميش أي error للفرونت عشان ما توقفش أو تعطّل تجربة العميل
 * بأي شكل — التسجيل نفسه ثانوي، مش جزء من مسار العميل الأساسي.
 */
export async function logZoneCoverageMiss(lat: number, lng: number): Promise<void> {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return;
  try {
    await supabase.rpc('log_zone_coverage_miss', { p_lat: lat, p_lng: lng });
  } catch (err) {
    console.error('logZoneCoverageMiss error:', translateSupabaseError(err).message);
  }
}

/**
 * هل الطلب ده أول طلب ناجح للعميل؟
 * "ناجح" = status ليس cancelled أو rejected.
 *
 * @param customerId - user_id بتاع العميل
 * @param orderId - (اختياري) الطلب الحالي — بيتستثنى من العدّان عشان
 *                  لو الـ function اتنادت بعد إنشاء الطلب، الطلب نفسه
 *                  ما يـ exclude نفسه.
 */
export async function isFirstOrder(customerId: string, orderId?: string): Promise<boolean> {
  if (!customerId) return false;
  try {
    const { data, error } = await supabase.rpc('is_first_order', {
      p_customer_id: customerId,
      p_order_id: orderId ?? null,
    });
    if (error) throw error;
    return Boolean(data);
  } catch (err) {
    console.error('isFirstOrder error:', translateSupabaseError(err).message);
    return false;
  }
}

/**
 * عدد الطلبات الناجحة للعميل (مش cancelled/rejected).
 * مفيد لعرض "عميل جديد" / "عميل قديم (X طلبات)".
 */
export async function getCustomerOrderCount(customerId: string): Promise<number> {
  if (!customerId) return 0;
  try {
    const { data, error } = await supabase.rpc('customer_order_count', {
      p_customer_id: customerId,
    });
    if (error) throw error;
    return Number(data ?? 0);
  } catch (err) {
    console.error('getCustomerOrderCount error:', translateSupabaseError(err).message);
    return 0;
  }
}