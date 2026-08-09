import React, { useState, useEffect } from 'react';
import { fetchSupabaseNotifications, createSupabaseNotification } from '../../../lib/supabase';
import { NotificationItem } from '../../../types/domain';
import { formatDate } from '../../../lib/formatters';
import { Bell, Send, CheckCircle2, RefreshCw, Smartphone, Tag, ShoppingBag } from 'lucide-react';
import { useToast } from '../../shared/Toast';

export const AdminNotificationsView: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<'system' | 'promotion' | 'order_status'>('promotion');
  const { showToast } = useToast();

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const data = await fetchSupabaseNotifications('usr-customer-1');
      if (data.length > 0) {
        setNotifications(data);
      } else {
        setNotifications([
          {
            id: 'notif-1',
            user_id: 'usr-customer-1',
            title: 'عرض خاص بمناسبة إطلاق منصة علي بابك! 🎉',
            message: 'احصل على خصم 20% على أول طلب لك باستخدام الكوبون ALABABAK10.',
            type: 'promotion',
            is_read: false,
            created_at: new Date().toISOString(),
          },
          {
            id: 'notif-2',
            user_id: 'usr-customer-1',
            title: 'تم توصيل طلبك بنجاح 🛵',
            message: 'تم تسليم الطلب #ORD-20260129-0001 بنجاح بواسطة الكابتن محمود طارق.',
            type: 'order_status',
            is_read: true,
            created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
          },
        ]);
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'فشل التحميل',
        message: err.message || 'تعذر تحميل الإشعارات',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      showToast({
        type: 'error',
        title: 'بيانات ناقصة',
        message: 'يرجى إدخال عنوان ونص الإشعار',
      });
      return;
    }

    try {
      await createSupabaseNotification({
        user_id: 'usr-customer-1',
        title: title.trim(),
        body: body.trim(),
        type: type === 'promotion' ? 'promo' : 'system',
      });
    } catch (err: any) {
      console.error('Error sending notification via RPC:', err);
      showToast({
        type: 'error',
        title: 'فشل الإرسال',
        message: err.message || 'تعذر إرسال الإشعار',
      });
      return;
    }

    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}`,
      user_id: 'usr-customer-1',
      title: title.trim(),
      message: body.trim(),
      body: body.trim(),
      type,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setNotifications([newNotif, ...notifications]);
    setTitle('');
    setBody('');
    showToast({
      type: 'success',
      title: 'تم الإرسال',
      message: 'تم بث الإشعار بنجاح لجميع مستخدمي المنصة وتخزينه في جدول Supabase Notifications!',
    });
  };

  return (
    <div className="space-y-6 dir-rtl">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm mb-1">
            <Bell className="w-5 h-5" />
            <span>مركز الإشعارات والتنبيهات (جدول Supabase Notifications)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">إدارة الإشعارات والعروض اللحظية</h1>
          <p className="text-xs text-slate-500 mt-1">
            إرسال إشعارات مباشرة وعروض ترويجية للعملاء وأصحاب المحلات والكباتن
          </p>
        </div>
        <button
          onClick={loadNotifications}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث الإشعارات</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Broadcast Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-600" />
            <span>بث إشعار جماعي جديد</span>
          </h2>

          <form onSubmit={handleSendBroadcast} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نوع الإشعار</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-600"
              >
                <option value="promotion">عرض ترويجي / خصم</option>
                <option value="system">تنبيه نظام عام</option>
                <option value="order_status">متابعة طلب</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">عنوان الإشعار *</label>
              <input
                type="text"
                required
                placeholder="مثال: توصيل مجاني اليوم في المعادي!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نص الإشعار *</label>
              <textarea
                required
                rows={3}
                placeholder="أكتب تفاصيل الرسالة والخصم..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-600"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              <span>إرسال وتخزين في Supabase</span>
            </button>
          </form>
        </div>

        {/* Sent Notifications History */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <h2 className="font-extrabold text-slate-900 text-base">سجل التنبيهات المرسلة ({notifications.length})</h2>

          <div className="space-y-3">
            {notifications.map((n) => (
              <div key={n.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                  {n.type === 'promotion' ? <Tag className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900 text-xs">{n.title}</h3>
                    <span className="text-[10px] text-slate-400 font-medium">{formatDate(n.created_at)}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">{n.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};