import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { Store, Order, DeliveryAgent } from '../../../types/domain';
import { formatCurrency, formatDateArabic } from '../../../lib/formatters';
import {
  ShieldCheck,
  Store as StoreIcon,
  Bike,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  CheckCircle2,
  Users
} from 'lucide-react';

interface AdminDashboardViewProps {
  onNavigate: (tab: string) => void;
}

export default function AdminDashboardView({ onNavigate }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);

  useEffect(() => {
    const refresh = () => {
      setStores(StorageRepo.getStores());
      setOrders(StorageRepo.getOrders());
      setAgents(StorageRepo.getAgents());
    };

    refresh();
    const unsubscribe = subscribeToStorageChange(() => {
      refresh();
    });
    return unsubscribe;
  }, []);

  const pendingStores = stores.filter((s) => !s.is_approved);
  const activeStores = stores.filter((s) => s.is_approved);

  const deliveredOrders = orders.filter((o) => o.status === 'delivered');
  const totalVolume = deliveredOrders.reduce((sum, o) => sum + o.subtotal, 0);

  // Platform commission calculation (~10% default)
  const platformCommission = deliveredOrders.reduce((sum, o) => {
    const s = stores.find((st) => st.id === o.store_id);
    const rate = s?.commission_rate || 10;
    return sum + (o.subtotal * rate) / 100;
  }, 0);

  return (
    <div className="space-y-6 dir-rtl pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
            لوحة قيادة وتحكم المنصة المركزية
          </span>
          <h1 className="text-xl sm:text-2xl font-black">منصة جِهَات - الإدارة العامة</h1>
          <p className="text-xs text-slate-300 mt-1">
            متابعة المتاجر، المندوبين، أداء المبيعات، والعمولات المركزية
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('admin-stores-applications')}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
          >
            <span>طلبات انضمام المتاجر ({pendingStores.length})</span>
          </button>
        </div>
      </div>

      {/* Pending Store Applications Banner */}
      {pendingStores.length > 0 && (
        <div
          onClick={() => onNavigate('admin-stores-applications')}
          className="bg-purple-600 hover:bg-purple-700 text-white rounded-2xl p-4 shadow-md flex items-center justify-between cursor-pointer transition-all animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <StoreIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">
                تنبيه: يوجد {pendingStores.length} طلبات انضمام متاجر جديدة بانتظار موافقة الإدارة!
              </h3>
              <p className="text-xs text-purple-100">انقر هنا لمراجعتها واعتماد المتاجر.</p>
            </div>
          </div>
          <ArrowUpRight className="w-6 h-6 text-white shrink-0" />
        </div>
      )}

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-bold">إجمالي حركة المبيعات</span>
          <div className="text-xl font-black text-slate-900">{formatCurrency(totalVolume)}</div>
          <p className="text-[11px] text-slate-400">إجمالي قيمة الطلبات المكتملة</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-bold">عمولة المنصة الصافية</span>
          <div className="text-xl font-black text-emerald-700">{formatCurrency(platformCommission)}</div>
          <p className="text-[11px] text-slate-400">من أرباح عمولات المتاجر</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-bold">المتاجر المعتمدة</span>
          <div className="text-xl font-black text-blue-600">{activeStores.length} متجر</div>
          <p className="text-[11px] text-slate-400">{pendingStores.length} بانتظار الموافقة</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-bold">المندوبين المعتمدين</span>
          <div className="text-xl font-black text-orange-600">{agents.length} مندوب</div>
          <p className="text-[11px] text-slate-400">
            {agents.filter((a) => a.is_online).length} متصلين حالياً
          </p>
        </div>
      </div>

      {/* Recent Global Orders Room Feed */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-purple-600" />
            <span>غرفة مراقبة الطلبات المباشرة بالمنصة</span>
          </h3>

          <button
            onClick={() => onNavigate('admin-orders')}
            className="text-xs font-bold text-purple-600 hover:text-purple-700"
          >
            عرض غرفة الطلبات بالكامل ←
          </button>
        </div>

        <div className="space-y-3">
          {orders.slice(0, 6).map((order) => (
            <div
              key={order.id}
              onClick={() => onNavigate('admin-orders')}
              className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 cursor-pointer hover:border-purple-300 transition-colors text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-slate-900">#{order.order_number}</span>
                  <span className="font-bold text-slate-800">{order.store_name}</span>
                  <span className="text-slate-400">← {order.customer_name}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  المجموع: {formatCurrency(order.total)} • {formatDateArabic(order.created_at)}
                </p>
              </div>

              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
                {order.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
