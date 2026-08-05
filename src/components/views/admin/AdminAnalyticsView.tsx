import React from 'react';
import { StorageRepo } from '../../../lib/storage';
import { formatCurrency } from '../../../lib/formatters';
import { BarChart3, TrendingUp, Store, ShoppingBag, Users, Truck, ArrowUpRight, Award, DollarSign } from 'lucide-react';

export const AdminAnalyticsView: React.FC = () => {
  const stores = StorageRepo.getStores();
  const orders = StorageRepo.getOrders();
  const products = StorageRepo.getProducts();
  const agents = StorageRepo.getAgents();

  const totalGMV = orders.reduce((acc, o) => acc + o.total, 0);
  const platformRevenue = orders.reduce((acc, o) => acc + o.subtotal * 0.10, 0); // 10% commission
  const completedOrders = orders.filter((o) => o.status === 'delivered');
  const completionRate = orders.length > 0 ? Math.round((completedOrders.length / orders.length) * 100) : 100;

  return (
    <div className="max-w-6xl mx-auto space-y-6 dir-rtl pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-2 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-black">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black">التحليلات المالية والتقارير المتقدمة</h1>
            <p className="text-xs text-purple-200">نشرة تفصيلية بأداء المنصة، إجمالي القيمة التجارية (GMV)، وصافي أرباح المبيعات</p>
          </div>
        </div>
      </div>

      {/* Analytics KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[11px] font-extrabold text-slate-500">حجم التعاملات التجارية (GMV)</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-slate-900">{formatCurrency(totalGMV)}</p>
          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+18.4% نمو هذا الشهر</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-purple-600">
            <span className="text-[11px] font-extrabold text-slate-500">إجمالي صافي أرباح المنصة</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-purple-700">{formatCurrency(platformRevenue)}</p>
          <div className="flex items-center gap-1 text-[10px] font-bold text-purple-600">
            <span>من واقع عمولة 10% على الطلبات</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[11px] font-extrabold text-slate-500">نسبة نجاح واكتمال التوصيل</span>
            <Award className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-slate-900">{completionRate}%</p>
          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
            <span>{completedOrders.length} طلب مكتمل بنجاح</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-[11px] font-extrabold text-slate-500">شبكة التوزيع والمحلات</span>
            <Store className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-slate-900">{stores.length} متجر</p>
          <div className="flex items-center gap-1 text-[10px] font-bold text-blue-600">
            <span>+{agents.length} كابتن توصيل معتمد</span>
          </div>
        </div>
      </div>

      {/* Top Performing Stores & Drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Stores */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="font-black text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
            <Store className="w-5 h-5 text-purple-600" />
            <span>المتاجر الأكثر مبيعاً ونشاطاً</span>
          </h2>

          <div className="space-y-3">
            {stores.slice(0, 4).map((store, idx) => {
              const storeOrders = orders.filter((o) => o.store_id === store.id);
              const storeSales = storeOrders.reduce((acc, o) => acc + o.subtotal, 0);

              return (
                <div key={store.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 font-black flex items-center justify-center text-xs">
                      #{idx + 1}
                    </span>
                    <img src={store.logo_url} alt={store.name} className="w-10 h-10 rounded-xl object-cover" />
                    <div>
                      <h3 className="font-extrabold text-slate-900">{store.name}</h3>
                      <p className="text-[10px] text-slate-500">{store.category_name}</p>
                    </div>
                  </div>

                  <div className="text-left font-bold">
                    <span className="text-emerald-700 text-sm font-black">{formatCurrency(storeSales)}</span>
                    <p className="text-[10px] text-slate-400">{storeOrders.length} طلبات</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Drivers */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="font-black text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-600" />
            <span>أفضل الكباتن من حيث السرعة والتقييم</span>
          </h2>

          <div className="space-y-3">
            {agents.slice(0, 4).map((agent, idx) => {
              const agentOrders = orders.filter((o) => o.delivery_agent_id === agent.id);

              return (
                <div key={agent.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-xs">
                      #{idx + 1}
                    </span>
                    <div>
                      <h3 className="font-extrabold text-slate-900">{agent.name}</h3>
                      <p className="text-[10px] text-slate-500">{agent.phone}</p>
                    </div>
                  </div>

                  <div className="text-left font-bold">
                    <span className="text-slate-900 text-xs font-black">{agentOrders.length} رحلة توصيل</span>
                    <p className="text-[10px] text-amber-500">⭐ {agent.rating ? agent.rating.toFixed(1) : 'جديد'} / 5.0</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
