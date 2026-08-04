import React, { useState } from 'react';
import { StorageRepo } from '../../../lib/storage';
import { Bell, CheckCircle2, ShoppingBag, Info, AlertTriangle, Trash2 } from 'lucide-react';

export const StoreNotificationsView: React.FC = () => {
  const currentStore = StorageRepo.getCurrentStore();
  const allNotifications = StorageRepo.getNotifications();
  const [notifications, setNotifications] = useState(allNotifications);

  const handleMarkAllRead = () => {
    const updated = notifications.map((n) => ({ ...n, is_read: true }));
    setNotifications(updated);
  };

  const handleClear = () => {
    setNotifications([]);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 dir-rtl pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 space-y-2 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-black">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black">تنبيهات وإشعارات المتجر</h1>
            <p className="text-xs text-purple-200">سجل التنبيهات الفورية للطلبات الجديدة، وتحديثات الدفع والتسليم</p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between text-xs">
        <span className="font-bold text-slate-700">
          عدد التنبيهات: {notifications.length} ({notifications.filter((n) => !n.is_read).length} غير مقروء)
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllRead}
            className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-xl transition-colors flex items-center gap-1"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>تحديد الكل كمقروء</span>
          </button>

          <button
            onClick={handleClear}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            <span>مسح السجل</span>
          </button>
        </div>
      </div>

      {/* Notifications Feed */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            لا توجد إشعارات أو تنبيهات حالياً.
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all flex items-start gap-3 ${
                  item.is_read ? 'bg-slate-50 border-slate-200' : 'bg-purple-50/50 border-purple-200'
                }`}
              >
                <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700 shrink-0 mt-0.5">
                  <ShoppingBag className="w-5 h-5" />
                </div>

                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900 text-xs">{item.title}</h3>
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(item.created_at).toLocaleTimeString('ar-EG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{item.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
