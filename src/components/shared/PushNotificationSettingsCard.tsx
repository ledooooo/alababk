import React, { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing } from 'lucide-react';
import { isPushSupported, getPushSubscriptionStatus, subscribeToPush, unsubscribeFromPush } from '../../lib/push';
import { createSupabaseNotification } from '../../lib/supabase';
import { useToast } from './Toast';

interface PushNotificationSettingsCardProps {
  userId?: string;
}

/**
 * بلوك "الإشعارات الفورية" — مستخرج بنفس المنطق والتصميم من ProfileView.tsx
 * الأصلية (كان مقصور على العميل بس رغم إن البنية التحتية عامة تمامًا)،
 * عشان صاحب المتجر والمندوب ياخدوا نفس التجربة المضمونة بالظبط.
 */
export default function PushNotificationSettingsCard({ userId }: PushNotificationSettingsCardProps) {
  const { showToast } = useToast();
  const [pushStatus, setPushStatus] = useState<'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' | 'loading'>('loading');
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) {
      setPushStatus('unsupported');
      return;
    }
    getPushSubscriptionStatus().then(setPushStatus);
  }, []);

  const handleTogglePush = async () => {
    if (pushStatus === 'subscribed') {
      setPushStatus('loading');
      const result = await unsubscribeFromPush();
      if (result.success) {
        setPushStatus('unsubscribed');
        showToast({ type: 'success', title: 'تم', message: 'تم إيقاف الإشعارات الفورية' });
      } else {
        setPushStatus('subscribed');
        showToast({ type: 'error', title: 'خطأ', message: result.error || 'تعذر إيقاف الإشعارات' });
      }
    } else {
      setPushStatus('loading');
      const result = await subscribeToPush();
      if (result.success) {
        setPushStatus('subscribed');
        showToast({ type: 'success', title: 'تم التفعيل', message: 'هتوصلك الإشعارات فورًا حتى لو التطبيق مقفول' });
      } else {
        setPushStatus(await getPushSubscriptionStatus());
        showToast({ type: 'error', title: 'تعذر التفعيل', message: result.error || 'حدث خطأ غير متوقع' });
      }
    }
  };

  const handleSendTestNotification = async () => {
    if (!userId) return;
    setSendingTest(true);
    try {
      await createSupabaseNotification({
        user_id: userId,
        title: 'إشعار تجريبي 🔔',
        body: 'لو وصلك الإشعار ده على جهازك، يبقى الإشعارات الفورية شغالة تمام عندك.',
        type: 'system',
      });
      showToast({ type: 'success', title: 'تم الإرسال', message: 'راقب جهازك خلال ثوانٍ' });
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل الإرسال', message: err.message || 'تعذر إرسال الإشعار التجريبي' });
    } finally {
      setSendingTest(false);
    }
  };

  if (pushStatus === 'unsupported') return null;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
              pushStatus === 'subscribed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}
          >
            {pushStatus === 'subscribed' ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-sm">الإشعارات الفورية</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {pushStatus === 'denied'
                ? 'تم حظر الإشعارات من إعدادات المتصفح — فعّلها من هناك أولًا'
                : pushStatus === 'subscribed'
                ? 'مفعّلة — هتوصلك إشعارات الطلبات فورًا حتى لو التطبيق مقفول'
                : 'فعّلها عشان توصلك إشعارات الطلبات فورًا حتى لو التطبيق مقفول — مهم جدًا عشان متفوتش أي طلب جديد'}
            </p>
          </div>
        </div>

        <button
          onClick={handleTogglePush}
          disabled={pushStatus === 'loading' || pushStatus === 'denied'}
          className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5 ${
            pushStatus === 'subscribed'
              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {pushStatus === 'loading' ? (
            <span>جاري التحميل...</span>
          ) : pushStatus === 'subscribed' ? (
            <>
              <BellOff className="w-4 h-4" />
              <span>إيقاف</span>
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              <span>تفعيل</span>
            </>
          )}
        </button>
      </div>

      {pushStatus === 'subscribed' && (
        <button
          onClick={handleSendTestNotification}
          disabled={sendingTest}
          className="mt-4 w-full py-2 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600 font-bold text-[11px] rounded-xl transition-colors"
        >
          {sendingTest ? 'جاري الإرسال...' : 'إرسال إشعار تجريبي للتأكد إنه شغال 🔔'}
        </button>
      )}
    </div>
  );
}
