import React, { useState, useEffect } from 'react';
import { subscribeToStorageChange } from '../../lib/storage';
import { NotificationItem } from '../../types/domain';
import { Bell, ShoppingBag, X, ChevronLeft, Sparkles, Tag } from 'lucide-react';

interface PushNotificationToastProps {
  onNavigate: (tab: string, param?: string) => void;
}

export const PushNotificationToast: React.FC<PushNotificationToastProps> = ({ onNavigate }) => {
  const [activeToast, setActiveToast] = useState<NotificationItem | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    const unsubscribe = subscribeToStorageChange(({ entityType, action, data }) => {
      if (entityType === 'notification' && action === 'save' && data) {
        const notif = data as NotificationItem;
        setActiveToast(notif);

        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          setActiveToast(null);
        }, 6000);
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  if (!activeToast) return null;

  const handleClick = () => {
    if (activeToast.link_url) {
      if (activeToast.link_url.includes(':')) {
        const [tab, param] = activeToast.link_url.split(':');
        onNavigate(tab, param);
      } else {
        onNavigate(activeToast.link_url);
      }
    } else {
      onNavigate('notifications');
    }
    setActiveToast(null);
  };

  return (
    <div className="fixed top-20 left-4 z-50 max-w-sm w-full animate-bounce-in dir-rtl">
      <div
        onClick={handleClick}
        className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-purple-500/40 flex items-start justify-between gap-3 cursor-pointer hover:bg-slate-850 transition-all backdrop-blur-lg"
      >
        <div className="flex items-start gap-3 flex-1">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              activeToast.type === 'order_status'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : activeToast.type === 'promotion'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
            }`}
          >
            {activeToast.type === 'order_status' ? (
              <ShoppingBag className="w-5 h-5 animate-pulse" />
            ) : activeToast.type === 'promotion' ? (
              <Tag className="w-5 h-5" />
            ) : (
              <Bell className="w-5 h-5" />
            )}
          </div>

          <div className="space-y-0.5 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                تنبيه جديد
              </span>
              <span className="text-[10px] text-slate-400 font-mono">الآن</span>
            </div>

            <h4 className="font-extrabold text-xs text-white leading-tight">
              {activeToast.title}
            </h4>

            <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">
              {activeToast.message}
            </p>

            <div className="pt-1 flex items-center gap-1 text-[10px] font-bold text-emerald-400">
              <span>انقر للمتابعة</span>
              <ChevronLeft className="w-3 h-3" />
            </div>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setActiveToast(null);
          }}
          className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          title="إغلاق التنبيه"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
