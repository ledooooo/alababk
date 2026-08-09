import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { subscribeToNotifications } from '../../../lib/supabase';
import { NotificationItem } from '../../../types/domain';
import {
  Bell,
  CheckCircle2,
  ShoppingBag,
  Trash2,
  ArrowRight,
  Send,
  Sparkles,
  Info,
  Check,
  ChevronLeft,
  ExternalLink,
  Tag
} from 'lucide-react';
import { useToast } from '../../shared/Toast';
import { useConfirm } from '../../shared/ConfirmDialog';

interface NotificationsViewProps {
  onNavigate?: (tab: string, param?: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onNavigate }) => {
  const currentUser = StorageRepo.getCurrentUser();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'order_status' | 'promotion'>('all');
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  const loadNotifications = () => {
    const list = StorageRepo.getNotifications(currentUser?.id);
    setNotifications(list);
  };

  useEffect(() => {
    loadNotifications();
    if (currentUser?.id) {
      StorageRepo.refreshNotifications(currentUser.id).catch(() => {});
    }
    const unsubscribeStorage = subscribeToStorageChange(() => {
      loadNotifications();
    });

    let unsubscribeRealtime: (() => void) | undefined;
    if (currentUser?.id) {
      unsubscribeRealtime = subscribeToNotifications(currentUser.id, () => {
        StorageRepo.refreshNotifications(currentUser.id)
          .then(() => {
            loadNotifications();
          })
          .catch(() => {
            loadNotifications();
          });
      });
    }

    return () => {
      unsubscribeStorage();
      if (unsubscribeRealtime) {
        unsubscribeRealtime();
      }
    };
  }, [currentUser?.id]);

  const handleMarkAllRead = async () => {
    try {
      await StorageRepo.markAllNotificationsRead(currentUser?.id);
      loadNotifications();
      showToast({
        type: 'success',
        title: 'تم',
        message: 'تم تحديد جميع الإشعارات كمقروءة',
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'فشل التحديث',
        message: err.message || 'تعذر تحديث الإشعارات',
      });
    }
  };

  const handleClear = () => {
    showConfirm({
      title: 'تأكيد المسح',
      message: 'هل أنت متأكد من مسح جميع الإشعارات؟',
      variant: 'warning',
      confirmLabel: 'مسح الكل',
      onConfirm: async () => {
        try {
          await StorageRepo.clearNotifications(currentUser?.id);
          loadNotifications();
          showToast({
            type: 'success',
            title: 'تم',
            message: 'تم مسح جميع الإشعارات',
          });
        } catch (err: any) {
          showToast({
            type: 'error',
            title: 'فشل المسح',
            message: err.message || 'تعذر مسح الإشعارات',
          });
        }
      },
    });
  };

  const handleMarkSingleRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await StorageRepo.markNotificationRead(id);
      loadNotifications();
      showToast({
        type: 'success',
        title: 'تم',
        message: 'تم تحديث الإشعار',
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'فشل التحديث',
        message: err.message || 'تعذر تحديث الإشعار',
      });
    }
  };

  const handleDeleteSingle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    showConfirm({
      title: 'تأكيد الحذف',
      message: 'هل أنت متأكد من حذف هذا الإشعار؟',
      variant: 'danger',
      confirmLabel: 'حذف',
      onConfirm: async () => {
        try {
          await StorageRepo.deleteNotification(id);
          loadNotifications();
          showToast({
            type: 'success',
            title: 'تم الحذف',
            message: 'تم حذف الإشعار',
          });
        } catch (err: any) {
          showToast({
            type: 'error',
            title: 'فشل الحذف',
            message: err.message || 'تعذر حذف الإشعار',
          });
        }
      },
    });
  };

  const handleSendTestPush = () => {
    const testTitles = [
      'تخفيضات حصريّة! 🏷️',
      'الكابتن يستعد للانطلاق 🛵',
      'تم تحديث حالة طلبك 📦',
      'خصم 20% على طلبك القادم 🎉'
    ];
    const testMsgs = [
      'احصل على توصيل مجاني عند استخدام كود FREE50 اليوم فقط!',
      'الكابتن أحمد قريب من موقعك بنحو 3 دقائق.',
      'قام مطبخ متجر أطياب بتجهيز طلبك وهو جاهز للتسليم.',
      'استمتع بخصم مميز على جميع حلويات المعادي!'
    ];
    const randomIndex = Math.floor(Math.random() * testTitles.length);

    const testNotif: NotificationItem = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user_id: currentUser?.id || 'all',
      title: testTitles[randomIndex] || 'تنبيه جديد',
      message: testMsgs[randomIndex] || 'لديك إشعار جديد في التطبيق.',
      type: randomIndex % 2 === 0 ? 'promotion' : 'order_status',
      is_read: false,
      created_at: new Date().toISOString(),
    };

    StorageRepo.saveNotification(testNotif);
    loadNotifications();
    showToast({
      type: 'success',
      title: 'تم الإرسال',
      message: 'تم إرسال إشعار اختباري بنجاح',
    });
  };

  const handleNotificationClick = (item: NotificationItem) => {
    // Mark as read first
    if (!item.is_read) {
      StorageRepo.markNotificationRead(item.id);
      loadNotifications();
    }

    if (item.link_url && onNavigate) {
      if (item.link_url.includes(':')) {
        const parts = item.link_url.split(':');
        const tab = parts[0];
        const param = parts[1];
        if (tab) {
          onNavigate(tab, param);
        }
      } else {
        onNavigate(item.link_url);
      }
    }
  };

  const filteredNotifications = notifications.filter((item) => {
    if (filter === 'unread') return !item.is_read;
    if (filter === 'order_status') return item.type === 'order_status';
    if (filter === 'promotion') return item.type === 'promotion' || item.type === 'system';
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 dir-rtl pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-400/30 text-purple-300 flex items-center justify-center font-black shrink-0 shadow-inner">
            <Bell className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black">مركز التنبيهات والإشعارات</h1>
              {unreadCount > 0 && (
                <span className="bg-rose-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full animate-pulse">
                  {unreadCount} غير مقروء
                </span>
              )}
            </div>
            <p className="text-xs text-purple-200">
              متابعة حية ودقيقة لحالة جميع طلباتك والعروض الترويجية الحصرية المتاحة لك.
            </p>
          </div>
        </div>

        {/* Test Push Notification Trigger */}
        <button
          onClick={handleSendTestPush}
          className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-black rounded-2xl transition-all shadow-md flex items-center gap-2 shrink-0 border border-amber-300/50"
        >
          <Sparkles className="w-4 h-4 text-slate-950" />
          <span>اختبار إرسال إشعار فوري 🔔</span>
        </button>
      </div>

      {/* Control & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filter === 'all'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            الكل ({notifications.length})
          </button>

          <button
            onClick={() => setFilter('unread')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filter === 'unread'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            غير المقروءة ({unreadCount})
          </button>

          <button
            onClick={() => setFilter('order_status')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filter === 'order_status'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            حالة الطلبات
          </button>

          <button
            onClick={() => setFilter('promotion')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filter === 'promotion'
                ? 'bg-amber-500 text-slate-950 shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            العروض والتنبيهات
          </button>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 border border-purple-200/60"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>قراءة الكل</span>
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={handleClear}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 border border-rose-200/60"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>مسح السجل</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications Feed */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Bell className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">لا توجد إشعارات مطابقة في صندوق الوارد</p>
            <p className="text-slate-500 max-w-sm mx-auto">
              ستظهر هنا جميع تنبيهات حركة طلباتك والعروض الترويجية مباشرة بمجرد إنشائها.
            </p>
            {onNavigate && (
              <button
                onClick={() => onNavigate('customer-stores')}
                className="mt-2 inline-flex items-center gap-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                تصفح المحلات الآن
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 cursor-pointer hover:shadow-md ${
                  item.is_read
                    ? 'bg-slate-50/80 border-slate-200/80 hover:bg-white'
                    : 'bg-purple-50/60 border-purple-200/90 hover:bg-purple-50/90 shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1">
                  {/* Icon Badge */}
                  <div
                    className={`p-3 rounded-2xl shrink-0 mt-0.5 ${
                      item.type === 'order_status'
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200/60'
                        : item.type === 'promotion'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200/60'
                        : 'bg-purple-100 text-purple-700 border border-purple-200/60'
                    }`}
                  >
                    {item.type === 'order_status' ? (
                      <ShoppingBag className="w-5 h-5" />
                    ) : item.type === 'promotion' ? (
                      <Tag className="w-5 h-5" />
                    ) : (
                      <Bell className="w-5 h-5" />
                    )}
                  </div>

                  {/* Message Content */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-slate-900 text-xs sm:text-sm">
                        {item.title}
                      </h3>

                      {!item.is_read && (
                        <span className="w-2 h-2 rounded-full bg-rose-600 inline-block animate-ping" />
                      )}

                      <span className="text-[10px] font-medium text-slate-400 ms-auto">
                        {new Date(item.created_at).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: 'numeric',
                          month: 'short'
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {item.message}
                    </p>

                    {item.link_url && (
                      <div className="pt-1 flex items-center gap-1 text-[11px] text-purple-700 font-bold hover:underline">
                        <span>انقر لمتابعة التفاصيل</span>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Individual Action Buttons */}
                <div className="flex items-center gap-1 shrink-0 self-center">
                  {!item.is_read && (
                    <button
                      onClick={(e) => handleMarkSingleRead(item.id, e)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                      title="تمت القراءة"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={(e) => handleDeleteSingle(item.id, e)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="حذف الإشعار"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};