import React, { useState, useEffect, useCallback } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import {
  subscribeSupabase,
  fetchSupabaseAgents,
  fetchAdminOrdersPage,
  fetchOrderStatusCounts,
  fetchOrderFullDetails,
  AdminOrderListItem,
  AdminOrdersCursor,
} from '../../../lib/supabase';
import { Order, OrderStatus, DeliveryAgent } from '../../../types/domain';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  User,
  Store,
  Bike,
  Sparkles,
  X,
  RefreshCw,
  Flame,
  Loader2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

const PAGE_SIZE = 20;

export default function OrdersManagerDashboardView() {
  const [items, setItems] = useState<AdminOrderListItem[]>([]);
  const [agents, setAgents] = useState<DeliveryAgent[]>(StorageRepo.getCachedAgents());
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // history[i] هو الـcursor اللي استُخدم لجلب الصفحة رقم i (history[0] = null دايمًا لأول صفحة)
  const [history, setHistory] = useState<(AdminOrdersCursor | null)[]>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<AdminOrdersCursor | null>(null);

  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
  const [selectedOrderLoading, setSelectedOrderLoading] = useState(false);
  const [assignAgentModalOrder, setAssignAgentModalOrder] = useState<AdminOrderListItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ديباونس البحث (400ms) بدل ما نستعلم على كل ضغطة زرار
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // أي تغيير في البحث أو الفلتر بيرجّع لأول صفحة من جديد
  useEffect(() => {
    setHistory([null]);
    setPageIndex(0);
  }, [debouncedSearch, statusFilter]);

  const loadPage = useCallback(
    async (cursor: AdminOrdersCursor | null, showBadge: boolean) => {
      if (showBadge) setIsRefreshing(true);
      try {
        const [page, counts] = await Promise.all([
          fetchAdminOrdersPage({ search: debouncedSearch, status: statusFilter, cursor, limit: PAGE_SIZE }),
          fetchOrderStatusCounts(),
        ]);
        setItems(page.items);
        setNextCursor(page.nextCursor);
        setStatusCounts(counts);
        setError(null);
      } catch (err: any) {
        console.error('Direct Supabase fetch error in OrdersManagerDashboardView:', err);
        setError('تعذر تحميل أحدث الطلبات مباشرة من خادم Supabase.');
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [debouncedSearch, statusFilter]
  );

  useEffect(() => {
    setLoading(true);
    loadPage(history[pageIndex] ?? null, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, pageIndex, loadPage]);

  useEffect(() => {
    fetchSupabaseAgents().then(setAgents).catch((err) => console.warn('fetch agents error:', err));

    const unsubscribeStorage = subscribeToStorageChange((detail) => {
      if (detail.entityType !== 'agent') return;
      setAgents(StorageRepo.getCachedAgents());
    });

    // ديباونس لأحداث realtime: نعيد تحميل نفس الصفحة الحالية + العدادات
    // بس (مش كل الطلبات)، فمن غير ما نفقد مكان المستخدم في البحث/الفلتر.
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedReload = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => loadPage(history[pageIndex] ?? null, true), 1500);
    };

    const unsubscribeRealtimeOrders = subscribeSupabase<Order>('orders', () => {
      debouncedReload();
    });

    const unsubscribeRealtimeAgents = subscribeSupabase<DeliveryAgent>('delivery_agents', () => {
      fetchSupabaseAgents().then(setAgents).catch(() => {});
    });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribeStorage();
      unsubscribeRealtimeOrders();
      unsubscribeRealtimeAgents();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, pageIndex, loadPage]);

  const availableAgents = agents.filter((a) => a.is_online && a.is_approved);

  const goNext = () => {
    if (!nextCursor) return;
    setHistory((h) => [...h.slice(0, pageIndex + 1), nextCursor]);
    setPageIndex((p) => p + 1);
  };

  const goPrevious = () => {
    if (pageIndex === 0) return;
    setPageIndex((p) => p - 1);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await StorageRepo.updateOrderStatus(orderId, newStatus);
      showToast(`تم تغيير حالة الطلب بنجاح إلى (${getStatusLabel(newStatus)})`);
      if (selectedOrderDetails && selectedOrderDetails.id === orderId) {
        setSelectedOrderDetails({ ...selectedOrderDetails, status: newStatus });
      }
      await loadPage(history[pageIndex] ?? null, false);
    } catch (err: any) {
      alert(`تعذر تحديث حالة الطلب: ${err.message || 'خطأ غير معروف'}`);
    }
  };

  const handleAssignAgent = async (orderId: string, agentId: string) => {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return;

    try {
      await StorageRepo.assignOrderToAgent(orderId, agentId, agent.name, agent.phone || undefined);
      showToast(`تم إسناد الطلب للكابتن "${agent.name}" بنجاح`);
      setAssignAgentModalOrder(null);
      await loadPage(history[pageIndex] ?? null, false);
    } catch (err: any) {
      alert(`تعذر إسناد الطلب: ${err.message || 'خطأ غير معروف'}`);
    }
  };

  const openOrderDetails = async (orderId: string) => {
    setSelectedOrderLoading(true);
    try {
      const full = await fetchOrderFullDetails(orderId);
      setSelectedOrderDetails(full);
    } catch (err: any) {
      alert(`تعذر تحميل تفاصيل الطلب: ${err.message || 'خطأ غير معروف'}`);
    } finally {
      setSelectedOrderLoading(false);
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'بانتظار الموافقة';
      case 'accepted':
        return 'تم القبول بالمحل';
      case 'preparing':
        return 'جاري التحضير بالمطبخ';
      case 'ready':
        return 'جاهز للاستلام';
      case 'assigned':
        return 'تم إسناد كابتن';
      case 'picked_up':
        return 'تم الاستلام للرحلة';
      case 'on_the_way':
        return 'الكابتن في الطريق';
      case 'delivered':
        return 'تم التوصيل بنجاح';
      case 'cancelled':
        return 'ملغى';
      case 'rejected':
        return 'مرفوض';
      default:
        return status;
    }
  };

  const getStatusBadgeClass = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'accepted':
      case 'preparing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready':
      case 'assigned':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'on_the_way':
      case 'picked_up':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled':
      case 'rejected':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  // عدادات SLA من aggregate الداتابيز (get_order_status_counts) — مش من عدّ
  // قائمة الصفحة الحالية المحدودة، عشان ترجع صح بغض النظر عن حجم الجدول.
  const pendingCount = statusCounts['pending'] || 0;
  const preparingCount = (statusCounts['accepted'] || 0) + (statusCounts['preparing'] || 0);
  const onTheWayCount = (statusCounts['assigned'] || 0) + (statusCounts['picked_up'] || 0) + (statusCounts['on_the_way'] || 0);
  const deliveredCount = statusCounts['delivered'] || 0;

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
      <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 space-y-3 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-2xl text-blue-400 backdrop-blur-md">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black">غرفة التحكم المباشر ومسؤول الطلبات</h1>
                <span className="bg-blue-500/30 text-blue-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-blue-400/20">
                  Dispatcher Operations
                </span>
              </div>
              <p className="text-xs text-blue-100/80 mt-1">
                مراقبة الحركة اللحظية للطلبات، حل مشاكل الاستلام والتحضير، وإسناد الكباتن مباشرة
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isRefreshing && (
              <div className="flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 px-3 py-1.5 rounded-2xl text-xs font-bold animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
                <span>يتم التحديث من Supabase...</span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-slate-800/80 p-2.5 rounded-2xl border border-slate-700 text-xs font-bold text-slate-200">
              <Flame className="w-4 h-4 text-amber-400 animate-bounce" />
              <span>{pendingCount + preparingCount + onTheWayCount} طلبات نشطة في الشارع الآن</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadPage(history[pageIndex] ?? null, false)}
            className="px-3 py-1 bg-rose-600 text-white rounded-xl text-xs hover:bg-rose-700 transition-all shadow-xs"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">جاري قراءة أحدث بيانات الطلبات من الخادم...</p>
        </div>
      ) : (
        <>
          {/* SLA Metric Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-amber-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-amber-700">
                <span className="text-xs font-extrabold">بانتظار الموافقة والإسناد</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-2xl font-black text-amber-800">{pendingCount}</p>
              <p className="text-[10px] text-amber-600 font-bold">تتطلب توجيه سريع</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-blue-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-blue-700">
                <span className="text-xs font-extrabold">قيد التحضير والتجهيز</span>
                <Store className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-blue-800">{preparingCount}</p>
              <p className="text-[10px] text-blue-600 font-bold">داخل المتاجر والمطابخ</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-purple-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-purple-700">
                <span className="text-xs font-extrabold">جاري التوصيل الآن</span>
                <Bike className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-black text-purple-800">{onTheWayCount}</p>
              <p className="text-[10px] text-purple-600 font-bold">مع الكباتن في الطريق</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-emerald-200 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-emerald-700">
                <span className="text-xs font-extrabold">طلبات مكتملة (إجمالي)</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-800">{deliveredCount}</p>
              <p className="text-[10px] text-emerald-600 font-bold">تسليمات ناجحة</p>
            </div>
          </div>

          {/* Dispatch Control Table Section */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <h2 className="font-black text-slate-900 text-base">جدول متابعة والتحكم في حركة الطلبات</h2>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'pending', label: 'معلق' },
                  { id: 'preparing', label: 'تحضير' },
                  { id: 'ready', label: 'جاهز للاستلام' },
                  { id: 'on_the_way', label: 'بالطريق' },
                  { id: 'delivered', label: 'مكتمل' },
                  { id: 'cancelled', label: 'ملغى' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
                      statusFilter === tab.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="البحث برقم الطلب، اسم العميل، رقم الموبايل، أو اسم المتجر..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-extrabold">
                    <th className="p-3">رقم الطلب والوقت</th>
                    <th className="p-3">العميل ومعلومات التوصيل</th>
                    <th className="p-3">المتجر والمبلغ</th>
                    <th className="p-3">الكابتن المكلّف</th>
                    <th className="p-3">الحالة الحالية</th>
                    <th className="p-3 text-center">التحكم والإسناد</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                        لا توجد طلبات مطابقة لخيارات التصفية.
                      </td>
                    </tr>
                  ) : (
                    items.map((order) => (
                      <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3">
                          <p className="font-extrabold text-slate-900">#{order.order_number}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {order.created_at ? order.created_at.slice(11, 16) : '--:--'}
                          </p>
                        </td>

                        <td className="p-3">
                          <p className="font-bold text-slate-800">{order.customer_name}</p>
                          <p className="text-[10px] text-slate-500 font-mono dir-ltr text-right">{order.customer_phone}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[150px]">
                            {order.address_line || 'العنوان الرئيسي'}
                          </p>
                        </td>

                        <td className="p-3">
                          <p className="font-extrabold text-slate-900">{order.store_name}</p>
                          <p className="font-mono text-xs font-black text-blue-700">{order.total} ج.م</p>
                        </td>

                        <td className="p-3">
                          {order.delivery_agent_name ? (
                            <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                              <Bike className="w-3.5 h-3.5 text-orange-600" />
                              <span>{order.delivery_agent_name}</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => setAssignAgentModalOrder(order)}
                              className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-black hover:bg-amber-100 transition-all flex items-center gap-1"
                            >
                              <span>+ إسناد كابتن فوراً</span>
                            </button>
                          )}
                        </td>

                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${getStatusBadgeClass(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <select
                              value={order.status}
                              onChange={(e) => handleUpdateStatus(order.id, e.target.value as OrderStatus)}
                              className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold text-slate-800 outline-none cursor-pointer"
                            >
                              <option value="pending">معلق</option>
                              <option value="accepted">تم القبول بالمحل</option>
                              <option value="preparing">جاري التحضير</option>
                              <option value="ready">جاهز للاستلام</option>
                              <option value="assigned">مسند لكابتن</option>
                              <option value="picked_up">تم الاستلام</option>
                              <option value="on_the_way">بالطريق للعميل</option>
                              <option value="delivered">مكتمل وتسليم</option>
                              <option value="cancelled">إلغاء الطلب</option>
                            </select>

                            <button
                              onClick={() => openOrderDetails(order.id)}
                              className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-[11px] font-bold transition-all"
                            >
                              تفاصيل
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-[11px] text-slate-400 font-bold">الصفحة {pageIndex + 1}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={goPrevious}
                  disabled={pageIndex === 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  السابق
                </button>
                <button
                  onClick={goNext}
                  disabled={!nextCursor}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                >
                  التالي
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Assign Agent Modal */}
          {assignAgentModalOrder && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 font-black text-sm text-slate-900">
                    <Bike className="w-5 h-5 text-orange-600" />
                    <span>إسناد كابتن للطلب (#{assignAgentModalOrder.order_number})</span>
                  </div>
                  <button
                    onClick={() => setAssignAgentModalOrder(null)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-xs text-slate-600 font-bold">
                  اختر كابتن متواجد ومتفرغ لإعادة توجيه الطلب إليه فورياً:
                </p>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {availableAgents.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 py-6 font-bold">
                      لا يوجد كباتن متصلين بالأنشطة حالياً.
                    </p>
                  ) : (
                    availableAgents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => handleAssignAgent(assignAgentModalOrder.id, agent.id)}
                        className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-200 rounded-2xl text-right transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-black">
                            <Bike className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-xs group-hover:text-orange-950">{agent.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{agent.phone}</p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-orange-600 bg-orange-100/60 px-3 py-1 rounded-xl">
                          إسناد الآن ←
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Order Details Modal */}
      {(selectedOrderDetails || selectedOrderLoading) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150">
            {selectedOrderLoading || !selectedOrderDetails ? (
              <div className="py-10 text-center space-y-3">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                <p className="text-xs font-bold text-slate-500">جاري تحميل تفاصيل الطلب...</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <p className="text-xs text-slate-400 font-bold">تفاصيل أوردر الشحن والتوصيل</p>
                    <h3 className="font-black text-slate-900 text-base">طلب رقم #{selectedOrderDetails.order_number}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedOrderDetails(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 text-xs text-slate-800">
                  {/* Customer Card */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                    <p className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                      <User className="w-4 h-4 text-blue-600" />
                      <span>اسم العميل: {selectedOrderDetails.customer_name}</span>
                    </p>
                    <p className="font-mono text-slate-600 font-bold">هاتف العميل: {selectedOrderDetails.customer_phone}</p>
                    <p className="text-slate-500">عنوان التسليم: {selectedOrderDetails.delivery_address?.street || 'المعادي'}</p>
                  </div>

                  {/* Items list */}
                  <div className="space-y-2">
                    <p className="font-black text-slate-900 text-xs">محتويات الطلب ({selectedOrderDetails.items?.length || 0}):</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {selectedOrderDetails.items?.map((item) => (
                        <div key={item.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl font-bold">
                          <span>{item.quantity}x {item.product_name}</span>
                          <span className="font-mono text-blue-700">{item.total_price} ج.م</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Summary financials */}
                  <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-center justify-between font-black">
                    <span className="text-blue-900">المبلغ الإجمالي المطلق:</span>
                    <span className="text-base text-blue-800 font-mono">{selectedOrderDetails.total} ج.م</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setSelectedOrderDetails(null)}
                    className="px-6 py-2.5 bg-slate-900 text-white font-black text-xs rounded-xl hover:bg-slate-800 transition-all"
                  >
                    إغلاق النافذة
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}