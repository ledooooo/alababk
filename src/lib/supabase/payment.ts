// src/lib/supabase/payment.ts
import { supabase } from './client';
import { translateSupabaseError } from './helpers';

export interface PlatformSettings {
  online_payment_enabled: boolean;
  updated_at: string;
}

/** الحالة العامة لتفعيل الدفع الإلكتروني على مستوى المنصة كلها — أي حد يقدر يقرأها. */
export async function fetchPlatformSettings(): Promise<PlatformSettings> {
  const { data, error } = await supabase.from('platform_settings').select('*').eq('id', true).single();
  if (error) throw new Error(translateSupabaseError(error).message);
  return { online_payment_enabled: data.online_payment_enabled, updated_at: data.updated_at };
}

/** تفعيل/إيقاف الدفع الإلكتروني على مستوى المنصة كلها — أدمن بس (الـRLS بترفض غير كده). */
export async function updatePlatformOnlinePayment(enabled: boolean): Promise<void> {
  const { error } = await supabase.from('platform_settings').update({ online_payment_enabled: enabled }).eq('id', true);
  if (error) throw new Error(translateSupabaseError(error).message);
}

/** تفعيل/إيقاف الدفع الإلكتروني لمتجر معيّن — أدمن بس (trigger الحماية بيرفض غير كده). */
export async function updateStoreOnlinePayment(storeId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase.from('stores').update({ online_payment_enabled: enabled }).eq('id', storeId);
  if (error) throw new Error(translateSupabaseError(error).message);
}

/**
 * إنشاء جلسة دفع Paymob لطلب موجود بالفعل (بعد create_order_secure)،
 * وترجع رابط الـiframe الموحّد لتوجيه العميل إليه.
 */
export async function createPaymobCheckoutSession(orderId: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('paymob-checkout', {
    body: { order_id: orderId },
  });
  if (error) throw new Error(translateSupabaseError(error).message);
  if (!data?.checkout_url) throw new Error(data?.error || 'تعذر إنشاء جلسة الدفع');
  return data.checkout_url as string;
}
