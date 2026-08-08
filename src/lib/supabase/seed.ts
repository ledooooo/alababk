// src/lib/supabase/seed.ts
import { supabase } from './client';
import { translateSupabaseError } from './helpers';

/**
 * Seed initial data directly into Supabase tables if empty
 */
export async function seedSupabaseDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Seed categories if empty
    const { count: catCount, error: catError } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true });

    if (catError) throw new Error(translateSupabaseError(catError).message);

    if (!catCount || catCount === 0) {
      const { error: insertError } = await supabase.from('categories').insert([
        { name: 'سوبر ماركت وبقالة', slug: 'grocery', icon: '🛒', sort_order: 1 },
        { name: 'خضروات وفواكه طازجة', slug: 'vegetables', icon: '🥬', sort_order: 2 },
        { name: 'لحوم ودواجن', slug: 'meat', icon: '🥩', sort_order: 3 },
        { name: 'صيدلية ومستلزمات طبية', slug: 'pharmacy', icon: '💊', sort_order: 4 },
        { name: 'مخبوزات وحلويات', slug: 'bakery', icon: '🥐', sort_order: 5 },
        { name: 'مشروبات وعصائر', slug: 'beverages', icon: '🧃', sort_order: 6 },
      ]);
      if (insertError) throw new Error(translateSupabaseError(insertError).message);
    }

    // 2. Seed delivery zones if empty
    const { count: zoneCount, error: zoneError } = await supabase
      .from('delivery_zones')
      .select('*', { count: 'exact', head: true });

    if (zoneError) throw new Error(translateSupabaseError(zoneError).message);

    if (!zoneCount || zoneCount === 0) {
      const { error: insertError } = await supabase.from('delivery_zones').insert([
        { name: 'وسط البلد - القاهرة', fee: 15.0, eta_minutes: 25, is_active: true },
        { name: 'مدينة نصر ومصر الجديدة', fee: 20.0, eta_minutes: 35, is_active: true },
        { name: 'المعادي والمقطم', fee: 22.0, eta_minutes: 40, is_active: true },
        { name: 'الدقي والمهندسين', fee: 18.0, eta_minutes: 30, is_active: true },
      ]);
      if (insertError) throw new Error(translateSupabaseError(insertError).message);
    }

    // 3. Seed coupons if empty
    const { count: couponCount, error: couponError } = await supabase
      .from('coupons')
      .select('*', { count: 'exact', head: true });

    if (couponError) throw new Error(translateSupabaseError(couponError).message);

    if (!couponCount || couponCount === 0) {
      const { error: insertError } = await supabase.from('coupons').insert([
        { code: 'ALABABAK10', type: 'percent', value: 10, min_order_amount: 100, max_discount: 30, is_active: true },
        { code: 'FREE2026', type: 'fixed', value: 15, min_order_amount: 150, is_active: true },
      ]);
      if (insertError) throw new Error(translateSupabaseError(insertError).message);
    }

    return { success: true, message: 'تم تهيئة وتغذية البيانات الحقيقية بنجاح في Supabase!' };
  } catch (err) {
    return { success: false, message: `تعذر التغذية التلقائية: ${String(err)}` };
  }
}