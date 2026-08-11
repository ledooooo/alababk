// src/lib/push.ts
import { supabase } from './supabase/client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * حالة الاشتراك الحالية للمتصفح ده (مش بالضرورة كل أجهزة المستخدم).
 */
export async function getPushSubscriptionStatus(): Promise<'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'> {
  if (!isPushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription ? 'subscribed' : 'unsubscribed';
  } catch {
    return 'unsubscribed';
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * يطلب إذن الإشعارات (لو مش مأخوذ بالفعل) ويشترك في Push، ثم يخزّن
 * بيانات الاشتراك في push_subscriptions عشان الـEdge Function تقدر
 * ترسل له لاحقًا. يرجع رسالة خطأ عربية واضحة لو حصل أي مشكلة بدل رمي
 * استثناء تقني.
 */
export async function subscribeToPush(): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: 'المتصفح ده مش بيدعم الإشعارات الفورية' };
  }
  if (!VAPID_PUBLIC_KEY) {
    return { success: false, error: 'الإشعارات الفورية غير مُهيّأة على هذا التطبيق حاليًا' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'يجب تسجيل الدخول لتفعيل الإشعارات' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'تم رفض إذن الإشعارات من إعدادات المتصفح' };
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    const rawKey = subscription.getKey('p256dh');
    const rawAuth = subscription.getKey('auth');
    if (!rawKey || !rawAuth) {
      return { success: false, error: 'تعذر إنشاء اشتراك الإشعارات' };
    }

    const p256dh = btoa(String.fromCharCode(...new Uint8Array(rawKey)));
    const authKey = btoa(String.fromCharCode(...new Uint8Array(rawAuth)));

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh,
        auth_key: authKey,
      },
      { onConflict: 'endpoint' }
    );

    if (error) {
      return { success: false, error: 'تعذر حفظ اشتراك الإشعارات، حاول مرة أخرى' };
    }

    return { success: true };
  } catch (err) {
    console.error('subscribeToPush error:', err);
    return { success: false, error: 'حدث خطأ أثناء تفعيل الإشعارات الفورية' };
  }
}

export async function unsubscribeFromPush(): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) return { success: true };

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return { success: true };

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);

    return { success: true };
  } catch (err) {
    console.error('unsubscribeFromPush error:', err);
    return { success: false, error: 'تعذر إلغاء تفعيل الإشعارات الفورية' };
  }
}
