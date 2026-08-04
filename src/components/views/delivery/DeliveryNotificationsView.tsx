import React, { useState } from 'react';
import { StorageRepo } from '../../../lib/storage';
import { Bell, Truck, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';

export const DeliveryNotificationsView: React.FC = () => {
  const allNotifications = StorageRepo.getNotifications();
  const [notifications, setNotifications] = useState(allNotifications);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleClear = () => {
    setNotifications([]);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 dir-rtl pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-3xl p-6 sm:p-8 space-y-2 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black">تنبيهات وإشعارات الكابتن</h1>
            <p className="text-xs text-emerald-200">تنبيهات إسناد الطلبات الجديدة، الملاحة، وإشعارات الأرباح المعتمدة</p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between text-xs">
        <span className="font-bold text-slate-700">
          عدد التنبيهات: {notifications.length}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllRead}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl transition-colors flex items-center gap-1"
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
            لا توجد إشعارات حالية.
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all flex items-start gap-3 ${
                  item.is_read ? 'bg-slate-50 border-slate-200' : 'bg-emerald-50/50 border-emerald-200'
                }`}
              >
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                  <Truck className="w-5 h-5" />
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
