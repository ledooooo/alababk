import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { subscribeSupabase, fetchSupabaseOrders, fetchSupabaseAgents } from '../../../lib/supabase';
import { DeliveryAgent, Order } from '../../../types/domain';
import { formatCurrency, formatPhoneNumber } from '../../../lib/formatters';
import { Bike, Power, DollarSign, Package, MapPin, Star, CheckCircle2, ArrowUpRight, PhoneCall, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '../../shared/Toast';

interface DeliveryDashboardViewProps {
  onNavigate: (tab: string) => void;
}

export default function DeliveryDashboardView({ onNavigate }) {
  const currentUser = StorageRepo.getCurrentUser();
  const [agent, setAgent] = useState<DeliveryAgent | null>(
    StorageRepo.getAgentByUserId(currentUser?.id || 'usr-agent-1')
  );
  const [orders, setOrders] = useState<Order[]>(StorageRepo.getCachedOrders());
  const [loading, setLoading] = useState<boolean>(StorageRepo.getCachedOrders().length === 0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadCaptainDataDirectly = async (showBadge = true) => {
    if (showBadge) setIsRefreshing(true);
    try {
      const user = StorageRepo.getCurrentUser();
      const [allAgents, allOrders] = await Promise.all([
        fetchSupabaseAgents(),
        fetchSupabaseOrders(),
      ]);
      const ag = user ? allAgents.find((a) => a.user_id === user.id) || allAgents[0] : allAgents[0];
      setAgent(ag || null);
      setOrders(allOrders);
      setError(null);
    } catch (err: any) {
      console.error('Error in DeliveryDashboardView direct fetch:', err);
      setError('تعذر قراءة بيانات الكابتن والطلبات من الخادم مباشرة.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadCaptainDataDirectly();

    const unsubscribeStorage = subscribeToStorageChange((detail) => {
      if (detail.entityType !== 'agent' && detail.entityType !== 'order') return;
      const user = StorageRepo.getCurrentUser();
      const ag = user ? StorageRepo.getAgentByUserId(user.id) || StorageRepo.getAgents()[0] : null;
      setAgent(ag || null);
      setOrders(StorageRepo.getCachedOrders());
    });

    // ديباونس + مرور عبر StorageRepo: الشاشة دي بتفضل مفتوحة طول شِفت
    // الكابتن، وكانت بتعمل fetch كامل لكل طلبات وكباتن المنصة مع أي حدث
    // Realtime — حتى لو الحدث ما لوش أي علاقة بالكابتن ده تحديدًا.
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedReload = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const user = StorageRepo.getCurrentUser();
        Promise.all([StorageRepo.refreshAgents(), StorageRepo.refreshOrders()])
          .then(([allAgents, allOrders]) => {
            const ag = user ? allAgents.find((a) => a.user_id === user.id) || allAgents[0] : allAgents[0];
            setAgent(ag || null);
            setOrders(allOrders);
          })
          .catch((err) => console.warn('captain dashboard debounced reload error:', err));
      }, 1500);
    };

    const unsubscribeRealtimeOrders = subscribeSupabase<Order>('orders', () => {
      debouncedReload();
    });

    const unsubscribeRealtimeAgents = subscribeSupabase<DeliveryAgent>('delivery_agents', () => {
      debouncedReload();
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribeStorage();
      unsubscribeRealtimeOrders();
      unsubscribeRealtimeAgents();
    };
  }, []);

  if (!agent) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <h3 className="font-bold text-slate-800">جاري تحميل بيانات المندوب...</h3>
      </div>
    );
  }

  const { showToast } = useToast();

  const toggleDutyOnline = async () => {
    try {
      const updated = { ...agent, is_online: !agent.is_online };
      await StorageRepo.saveAgent(updated);
      showToast({ type: 'success', title: 'تم التحديث', message: `تم تغيير حالة الاتصال إلى ${updated.is_online ? 'متصل' : 'غير متصل'}` });
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل التحديث', message: err.message || 'تعذر تغيير حالة الاتصال' });
    }
  };

  const activeTrip = orders.find(
    (o) => o.delivery_agent_id === agent.id && !['delivered', 'cancelled', 'rejected'].includes(o.status)
  );

  const availableOrders = orders.filter(
    (o) => o.status === 'ready' && !o.delivery_agent_id
  );

  const myDeliveredOrders = orders.filter(
    (o) => o.delivery_agent_id === agent.id && o.status === 'delivered'
  );

  const todayEarnings = myDeliveredOrders.reduce((sum, o) => sum + o.delivery_fee, 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6 dir-rtl pb-20">
      {/* Driver Identity & Duty Toggle Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-orange-950 to-slate-900 text-white rounded-3xl p-6 shadow-xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-orange-500 text-white rounded-2xl flex items-center justify-center font-bold text-2xl shadow-lg shadow-orange-500/20">
              🛵
            </div>
            <div>
              <h1 className="text-lg font-black">{agent.name}</h1>
              <p className="text-xs text-slate-300 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-orange-400" />
                <span>المنطقة: {agent.active_zone}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isRefreshing && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>تحديث...</span>
              </div>
            )}
            <div className="flex items-center gap-1 bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-xs px-2.5 py-1 rounded-xl">
              <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
              <span>{agent.rating ? agent.rating.toFixed(1) : 'جديد'}</span>
            </div>
          </div>
        </div>

        {/* Online/Offline Button */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${agent.is_online ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
            <span className="font-bold text-xs">
              {agent.is_online ? 'متصل وجاهز لتلقي واستلام الطلبات' : 'غير متصل (خارج الخدمة)'}
            </span>
          </div>

          <button
            onClick={toggleDutyOnline}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ${
              agent.is_online
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-slate-700 hover:bg-slate-800 text-white'
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{agent.is_online ? 'تبديل لغير متصل' : 'تفعيل الاتصال'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadCaptainDataDirectly()}
            className="px-3 py-1 bg-rose-600 text-white rounded-xl text-xs hover:bg-rose-700 transition-all shadow-xs"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center space-y-2 bg-slate-800/80 rounded-2xl border border-slate-700">
          <Loader2 className="w-6 h-6 text-orange-400 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-300">جاري قراءة أحدث بيانات الكابتن والرحلات...</p>
        </div>
      ) : (
        <>

      {/* Active Delivery Trip Alert Banner */}
      {activeTrip && (
        <div
          onClick={() => onNavigate('delivery-active')}
          className="bg-orange-500 hover:bg-orange-600 text-white rounded-2xl p-4 shadow-lg flex items-center justify-between cursor-pointer transition-all animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Bike className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">
                رحلة توصيل جارية حالياً (#{activeTrip.order_number})
              </h3>
              <p className="text-xs text-orange-100">انقر هنا لفتح الخريطة وأزرار خطوات التوصيل</p>
            </div>
          </div>
          <ArrowUpRight className="w-6 h-6 text-white shrink-0" />
        </div>
      )}

      {/* KPIs Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] text-slate-500 font-bold">أرباح التوصيل اليوم</span>
          <div className="text-xl font-black text-emerald-700">{formatCurrency(todayEarnings)}</div>
          <p className="text-[10px] text-slate-400">صافي عمولات الرحلات المكتملة</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-1">
          <span className="text-[11px] text-slate-500 font-bold">رحلات ناجحة مكتملة</span>
          <div className="text-xl font-black text-slate-900">{myDeliveredOrders.length}</div>
          <p className="text-[10px] text-slate-400">إجمالي الرحلات المسجلة</p>
        </div>
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onNavigate('delivery-available')}
          className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-orange-300 shadow-xs text-right space-y-1 group transition-all"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 text-xs">الطلبات المتاحة بالمنطقة</span>
            <span className="bg-orange-100 text-orange-800 font-bold text-xs px-2 py-0.5 rounded-full">
              {availableOrders.length}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">طلبات جاهزة للاستلام فوراً</p>
        </button>

        <button
          onClick={() => onNavigate('delivery-history')}
          className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-orange-300 shadow-xs text-right space-y-1 group transition-all"
        >
          <span className="font-bold text-slate-900 text-xs block">السجل والأرباح</span>
          <p className="text-[11px] text-slate-500">تفاصيل المحفظة والرحلات</p>
        </button>
      </div>
        </>
      )}
    </div>
  );
};
