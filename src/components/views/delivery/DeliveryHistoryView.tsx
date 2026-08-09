import React, { useState, useEffect } from 'react';
import { StorageRepo } from '../../../lib/storage';
import { Order } from '../../../types/domain';
import { formatCurrency, formatDateArabic } from '../../../lib/formatters';
import { Bike, DollarSign, CheckCircle2, Store, Calendar } from 'lucide-react';

export default function DeliveryHistoryView() {
  const currentUser = StorageRepo.getCurrentUser();
  const agent = StorageRepo.getAgentByUserId(currentUser?.id || 'usr-agent-1') || StorageRepo.getAgents()[0];
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (agent) {
      const allOrders = StorageRepo.getOrders();
      const myHistory = allOrders.filter(
        (o) => o.delivery_agent_id === agent.id && o.status === 'delivered'
      );
      setHistoryOrders(myHistory);
    }
  }, [agent]);

  const totalEarnings = historyOrders.reduce((sum, o) => sum + o.delivery_fee, 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6 dir-rtl pb-20">
      <div>
        <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-emerald-600" />
          <span>سجل الرحلات ومحفظة الأرباح</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          متابعة جميع رحلات التوصيل المكتملة وعمولات الحساب
        </p>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-500 font-bold block">إجمالي أرباح التوصيل</span>
          <span className="text-2xl font-black text-emerald-700">{formatCurrency(totalEarnings)}</span>
        </div>

        <div className="text-left">
          <span className="text-xs text-slate-500 font-bold block">عدد الرحلات المكتملة</span>
          <span className="text-xl font-black text-slate-900">{historyOrders.length} رحلة</span>
        </div>
      </div>

      {/* History Items */}
      <div className="space-y-3">
        {historyOrders.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center text-slate-400 text-xs border border-slate-200">
            لا توجد رحلات سابقة مسجلة.
          </div>
        ) : (
          historyOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-3 text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900">#{order.order_number}</span>
                  <span className="font-bold text-slate-800">{order.store_name}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  إلى: {order.customer_name} • {formatDateArabic(order.updated_at)}
                </p>
              </div>

              <div className="text-left shrink-0">
                <span className="font-bold text-emerald-700 text-sm block">+{formatCurrency(order.delivery_fee)}</span>
                <span className="text-[10px] text-slate-400">مبلغ الطلب: {formatCurrency(order.total)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
