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
export async function checkAddressZone(addressId: string): Promise<ZoneMatch | null> {
  if (!addressId) return null;
  try {
    const { data, error } = await supabase.rpc('is_address_in_any_zone', {
      p_address_id: addressId,
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
