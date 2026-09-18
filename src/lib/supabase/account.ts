// src/lib/supabase/account.ts
import { supabase } from './client';
import { translateSupabaseError } from './helpers';

/**
 * حذف حساب المستخدم الحالي نهائيًا من ناحيته هو — بيخفي هويته الشخصية
 * ويمنعه من تسجيل الدخول تاني، مع الحفاظ على طلباته وتقييماته السابقة
 * (منسوبة لحساب مجهول الهوية) عشان سجلات المتاجر المالية تفضل سليمة.
 */
export async function deleteMyAccount(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-account', { body: {} });
  if (error) throw new Error(translateSupabaseError(error).message);
  if (data?.error) throw new Error(data.error);
}
