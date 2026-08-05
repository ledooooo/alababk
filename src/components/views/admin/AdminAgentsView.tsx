import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { subscribeSupabase } from '../../../lib/supabase';
import { DeliveryAgent } from '../../../types/domain';
import { formatCurrency, formatPhoneNumber } from '../../../lib/formatters';
import { Bike, Power, Star, Phone, MapPin, ShieldCheck } from 'lucide-react';

export const AdminAgentsView: React.FC = () => {
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);

  useEffect(() => {
    const refresh = () => {
      setAgents(StorageRepo.getAgents());
    };

    refresh();
    StorageRepo.refreshAgents();

    const unsubscribeStorage = subscribeToStorageChange(() => {
      refresh();
    });

    const unsubscribeRealtime = subscribeSupabase<DeliveryAgent>('delivery_agents', () => {
      StorageRepo.refreshAgents();
    });

    return () => {
      unsubscribeStorage();
      unsubscribeRealtime();
    };
  }, []);

  const toggleAgentDuty = async (ag: DeliveryAgent) => {
    try {
      await StorageRepo.saveAgent({ ...ag, is_online: !ag.is_online });
    } catch (err: any) {
      alert(`تعذر تغيير حالة الاتصال للكابتن: ${err.message || 'خطأ غير معروف'}`);
    }
  };

  return (
    <div className="space-y-6 dir-rtl pb-16">
      <div>
        <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <Bike className="w-6 h-6 text-purple-600" />
          <span>إدارة كباتن ومندوبي التوصيل</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          متابعة حالة الكباتن المتصلين بالمناطق المختلفة وإدارة سجلاتهم
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((ag) => (
          <div
            key={ag.id}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-orange-100 text-orange-700 rounded-xl flex items-center justify-center font-bold text-xl">
                  🛵
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">{ag.name}</h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{formatPhoneNumber(ag.phone)}</p>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                ag.is_online ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {ag.is_online ? 'متصل بالخدمة' : 'غير متصل'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div>
                <span className="font-bold block text-slate-800">المنطقة المغطاة:</span>
                <span>{ag.active_zone || 'غير متاح'}</span>
              </div>
              <div>
                <span className="font-bold block text-slate-800">المركبة:</span>
                <span>{ag.vehicle_type} ({ag.license_plate || 'بدون لوحة'})</span>
              </div>
              <div>
                <span className="font-bold block text-slate-800">التقييم:</span>
                <span className="font-bold text-amber-600">⭐ {ag.rating ? ag.rating.toFixed(1) : 'جديد'}</span>
              </div>
              <div>
                <span className="font-bold block text-slate-800">إجمالي الرحلات:</span>
                <span className="font-bold text-slate-900">{ag.total_trips} رحلة</span>
              </div>
            </div>

            <button
              onClick={() => toggleAgentDuty(ag)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 mt-2"
            >
              <Power className="w-3.5 h-3.5" />
              <span>{ag.is_online ? 'إيقاف الاتصال مؤقتاً' : 'تفعيل الاتصال'}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
