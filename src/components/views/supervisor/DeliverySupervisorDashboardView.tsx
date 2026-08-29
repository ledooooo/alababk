import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { subscribeSupabase, createSupabaseNotification, fetchSupabaseAgents, fetchSupabaseOrders } from '../../../lib/supabase';
import { DeliveryAgent, Order } from '../../../types/domain';
import {
  Bike,
  Users,
  MapPin,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Phone,
  ShieldCheck,
  Send,
  Sparkles,
  TrendingUp,
  Activity,
  UserX,
  UserCheck,
  Radio,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { useToast } from '../../shared/Toast';

export default function DeliverySupervisorDashboardView() {
  const [agents, setAgents] = useState<DeliveryAgent[]>(StorageRepo.getCachedAgents());
  // الطلبات النشطة بس (assigned/picked_up/on_the_way) — مفلترة من الخادم
  // مباشرة، مش محمّلة من كاش الطلبات العام (اللي بيحمل آخر 500 طلب
  // بلا فلتر حالة، فمش ضامن يغطي كل الطلبات النشطة مع نمو المنصة).
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(StorageRepo.getCachedAgents().length === 0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { showToast } = useToast();

  const ACTIVE_ORDER_STATUSES = ['assigned', 'picked_up', 'on_the_way'];

  const loadDataDirectly = async (showBadge = true) => {
    if (showBadge) setIsRefreshing(true);
    try {
      const [freshAgents, freshOrders] = await Promise.all([
        fetchSupabaseAgents(),
        fetchSupabaseOrders({ status_in: ACTIVE_ORDER_STATUSES }),
      ]);
      setAgents(freshAgents);
      setOrders(freshOrders);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load supervisor data directly:', err);
      showToast({
        type: 'error',
        title: 'فشل التحميل',
        message: 'تعذر تحديث بيانات الكباتن والطلبات من خادم Supabase.',
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDataDirectly();

    const unsubscribeStorage = subscribeToStorageChange((detail) => {
      if (detail.entityType !== 'agent') return;
      setAgents(StorageRepo.getCachedAgents());
    });

    // ديباونس لأي حدث Realtime (طلب/كابتن) — بيجيب بس الطلبات النشطة
    // (status_in) بدل تحميل كل الطلبات على مستوى المنصة كل مرة.
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedReload = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        Promise.all([
          StorageRepo.refreshAgents(),
          fetchSupabaseOrders({ status_in: ACTIVE_ORDER_STATUSES }),
        ])
          .then(([freshAgents, freshOrders]) => {
            setAgents(freshAgents);
            setOrders(freshOrders);
          })
          .catch((err) => console.warn('supervisor debounced reload error:', err));
      }, 1500);
    };

    const unsubscribeRealtimeAgents = subscribeSupabase<DeliveryAgent>('delivery_agents', () => {
      debouncedReload();
    });

    const unsubscribeRealtimeOrders = subscribeSupabase<Order>('orders', () => {
      debouncedReload();
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribeStorage();
      unsubscribeRealtimeAgents();
      unsubscribeRealtimeOrders();
    };
  }, []);

  // orders هنا أصلًا مفلترة من الخادم على نفس الحالات (ACTIVE_ORDER_STATUSES)
  const activeOrders = orders;
  const onlineAgents = agents.filter((a) => a.is_online);
  const busyAgents = agents.filter((a) => {
    return activeOrders.some((o) => o.delivery_agent_id === a.id);
  });
  const availableAgents = onlineAgents.filter((a) => !busyAgents.some((b) => b.id === a.id));

  const toggleApproval = async (agent: DeliveryAgent) => {
    try {
      const updated: DeliveryAgent = { ...agent, is_approved: !agent.is_approved };
      await StorageRepo.saveAgent(updated);
      showToast({
        type: 'success',
        title: 'تم التحديث',
        message: updated.is_approved ? `تم الاعتماد والترخيص لـ ${agent.name}` : `تم إيقاف اعتماد ${agent.name}`,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'فشل التحديث',
        message: err.message || 'تعذر تغيير حالة اعتماد الكابتن',
      });
    }
  };

  const toggleOnline = async (agent: DeliveryAgent) => {
    try {
      const updated: DeliveryAgent = { ...agent, is_online: !agent.is_online };
      await StorageRepo.saveAgent(updated);
      showToast({
        type: 'success',
        title: 'تم التحديث',
        message: updated.is_online ? `تم تحويل ${agent.name} لمتصل الأن` : `تم تحويل ${agent.name} لغير متصل`,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'فشل التحديث',
        message: err.message || 'تعذر تغيير حالة الاتصال',
      });
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMsg.trim()) return;

    const targetAgents = onlineAgents.length > 0 ? onlineAgents : agents;
    try {
      await Promise.all(
        targetAgents.map((agent) =>
          createSupabaseNotification({
            user_id: agent.user_id,
            title: 'تنبيه عاجل من مسؤول الكباتن 📢',
            body: broadcastMsg,
            type: 'system',
          })
        )
      );
      showToast({
        type: 'success',
        title: 'تم الإرسال',
        message: `تم إرسال التنبيه العاجل لـ (${targetAgents.length}) كابتن بنجاح`,
      });
      setBroadcastMsg('');
    } catch (err: any) {
      console.error('Failed to send broadcast notifications:', err);
      showToast({
        type: 'error',
        title: 'فشل الإرسال',
        message: err?.message || 'تعذر إرسال التنبيهات',
      });
    }
  };

  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (agent.phone || '').includes(searchQuery) ||
      (agent.license_plate && agent.license_plate.includes(searchQuery));

    const matchesZone = selectedZone === 'all' || agent.active_zone === selectedZone;

    let matchesStatus = true;
    if (selectedStatus === 'online') matchesStatus = agent.is_online;
    if (selectedStatus === 'available') matchesStatus = agent.is_online && !busyAgents.some((b) => b.id === agent.id);
    if (selectedStatus === 'busy') matchesStatus = busyAgents.some((b) => b.id === agent.id);
    if (selectedStatus === 'offline') matchesStatus = !agent.is_online;

    return matchesSearch && matchesZone && matchesStatus;
  });

  const zonesList = Array.from(new Set(agents.map((a) => a.active_zone).filter((z): z is string => Boolean(z))));

  return (
    <div className="max-w-7xl mx-auto space-y-6 dir-rtl pb-16 relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-950 via-slate-900 to-amber-950 text-white rounded-3xl p-6 sm:p-8 space-y-3 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-500/20 border border-orange-500/30 rounded-2xl text-orange-400 backdrop-blur-md">
              <Bike className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black">إدارة وشؤون أسطول الكباتن والمناديب</h1>
                <span className="bg-orange-500/30 text-orange-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-orange-400/20">
                  لوحة مسؤول التوصيل
                </span>
              </div>
              <p className="text-xs text-orange-100/80 mt-1">
                متابعة حركة الأسطول في الشارع، توزيع التغطيات على المناطق، واختبار كفاءة الكباتن فورياً
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-2xl border border-slate-700">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-black text-slate-200">الأسطول متصل ومراقب لحظياً</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-extrabold">إجمالي المناديب</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900">{agents.length}</p>
          <p className="text-[10px] text-slate-400 font-bold">كابتن مسجل بالنظام</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-extrabold">المتواجدون الآن (Online)</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-700">{onlineAgents.length}</p>
          <p className="text-[10px] text-emerald-600 font-bold">جاهزون لتلقي الطلبات</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-amber-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-extrabold">في رحلات توصيل (Busy)</span>
            <Bike className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-700">{busyAgents.length}</p>
          <p className="text-[10px] text-amber-600 font-bold">يجري تسليم طلبات فائقة</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-xs font-extrabold">المناطق المكتظة بالتغطية</span>
            <MapPin className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-700">{zonesList.length}</p>
          <p className="text-[10px] text-blue-600 font-bold">مناطق توصيل نشطة</p>
        </div>
      </div>

      {/* Broadcast Command & Quick Actions */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-orange-600" />
            <h2 className="font-black text-slate-900 text-sm">إرسال توجيه/تنبيه عاجل لكباتن الأسطول</h2>
          </div>
          <span className="text-[11px] font-bold text-slate-400">سيصل كإشعار فوري على أجهزة المناديب</span>
        </div>

        <form onSubmit={handleSendBroadcast} className="flex gap-2">
          <input
            type="text"
            placeholder="مثال: نرجو من كباتن منطقة المعادي التوجه نحو شارع 9 لتغطية زيادة الطلبات..."
            value={broadcastMsg}
            onChange={(e) => setBroadcastMsg(e.target.value)}
            className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500"
          />
          <button
            type="submit"
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs rounded-2xl transition-all shadow-md shadow-orange-600/20 shrink-0"
          >
            إرسال التنبيه
          </button>
        </form>
      </div>

      {/* Agents Search & Control Panel */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-black text-slate-900 text-base">سجل وقائمة أسطول المناديب</h2>

          <div className="flex flex-wrap items-center gap-2">
            {/* Zone Filter */}
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="all">كل مناطق التغطية</option>
              {zonesList.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="all">جميع الحالات</option>
              <option value="online">متصل (Online)</option>
              <option value="available">متاح للطلب (Available)</option>
              <option value="busy">في رحلة توصيل (Busy)</option>
              <option value="offline">غير متصل (Offline)</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="البحث باسم الكابتن، رقم الهاتف، أو رقم اللوحة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
        </div>

        {/* Fleet Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-extrabold">
                <th className="p-3">بيانات الكابتن</th>
                <th className="p-3">المركبة واللوحة</th>
                <th className="p-3">منطقة التغطية الحالية</th>
                <th className="p-3">إجمالي الرحلات والتقييم</th>
                <th className="p-3">حالة الاتصال والترخيص</th>
                <th className="p-3 text-center">التحكم والتحويل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                    لا يوجد مناديب مطابقون لشروط التصفية الحالية.
                  </td>
                </tr>
              ) : (
                filteredAgents.map((agent) => {
                  const isBusy = busyAgents.some((b) => b.id === agent.id);

                  return (
                    <tr key={agent.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-200 text-orange-600 flex items-center justify-center font-black shrink-0">
                            <Bike className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900">{agent.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{agent.phone}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 font-mono">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md font-bold text-[11px]">
                          {agent.vehicle_type === 'motorcycle' ? 'موتوسيكل' : agent.vehicle_type === 'bicycle' ? 'دراجة' : agent.vehicle_type === 'walking' ? 'سيرًا على الأقدام' : 'سيارة'}
                        </span>
                        {agent.license_plate && (
                          <p className="text-[10px] text-slate-500 mt-0.5">{agent.license_plate}</p>
                        )}
                      </td>

                      <td className="p-3 font-bold text-slate-700">
                        <div className="flex items-center gap-1 text-slate-800">
                          <MapPin className="w-3.5 h-3.5 text-orange-500" />
                          <span>{agent.active_zone || 'غير محددة'}</span>
                        </div>
                      </td>

                      <td className="p-3">
                        <p className="font-extrabold text-slate-900">{agent.total_trips || 0} رحلة</p>
                        <p className="text-[10px] font-bold text-amber-600">★ {agent.rating || 5.0}</p>
                      </td>

                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          {agent.is_online ? (
                            isBusy ? (
                              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-full text-[10px] w-fit">
                                في رحلة توصيل 🛵
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px] w-fit">
                                متصل ومتاح 🟢
                              </span>
                            )
                          ) : (
                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 font-bold rounded-full text-[10px] w-fit">
                              غير متصل ⚪
                            </span>
                          )}

                          {agent.is_approved ? (
                            <span className="text-[10px] text-emerald-600 font-bold">مرخص ومكتمل</span>
                          ) : (
                            <span className="text-[10px] text-rose-600 font-bold">معلق الاعتماد</span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => toggleOnline(agent)}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                              agent.is_online
                                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {agent.is_online ? 'إفصال' : 'اتصال'}
                          </button>

                          <button
                            onClick={() => toggleApproval(agent)}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                              agent.is_approved
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                            }`}
                          >
                            {agent.is_approved ? 'إيقاف الترخيص' : 'اعتماد الكابتن'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};