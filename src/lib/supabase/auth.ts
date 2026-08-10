// src/lib/supabase/auth.ts
import { supabase } from './client';
import { translateSupabaseError } from './errors';

/**
 * يتحقق من رقم الهاتف وكلمة المرور عبر Edge Function موثوقة (تعمل بمفتاح
 * service_role) ويُعيد البريد الإلكتروني المرتبط بالحساب عند النجاح.
 *
 * السبب: دالة verify_phone_password_internal مقفولة عمدًا في قاعدة
 * البيانات (بلا صلاحية تنفيذ لـ anon/authenticated) لأنها تقرأ من
 * auth.users مباشرة، ولا يمكن قراءة profiles.email قبل إنشاء الجلسة
 * بسبب RLS. لذلك يمر هذا التحقق عبر supabase/functions/phone-login.
 *
 * لا تُنشئ هذه الدالة جلسة بنفسها — على المستدعي استخدام البريد المُعاد
 * مع supabase.auth.signInWithPassword() لإكمال تسجيل الدخول الفعلي.
 */
export async function resolveEmailByPhonePassword(
  phone: string,
  password: string
): Promise<{ email: string | null; error?: string }> {
  const { data, error } = await supabase.functions.invoke('phone-login', {
    body: { phone, password },
  });

  if (error) {
    return { email: null, error: translateSupabaseError(error).message };
  }
  if (data?.error) {
    return { email: null, error: data.error as string };
  }
  if (!data?.email) {
    return { email: null, error: 'بيانات الدخول غير صحيحة، يرجى التأكد من رقم الهاتف وكلمة المرور.' };
  }

  return { email: data.email as string };
}