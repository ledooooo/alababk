import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import {
  subscribeSupabase,
  fetchFinanceSummary,
  FinanceSummaryItem,
  fetchSupabaseOrders,
  fetchSupabaseStores,
  fetchSupabasePayouts,
} from '../../../lib/supabase';
import { Store, Order, PayoutRequest, Payout } from '../../../types/domain';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Building2,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  PieChart,
  FileText,
  Sparkles,
  Download,
  Percent,
  Wallet,
  Coins,
  RefreshCw,
  AlertCircle,
  Loader2
} from 'lucide-react';

export const FinanceAdminDashboardView: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(StorageRepo.getCachedOrders());
  const [stores, setStores] = useState<Store[]>(StorageRepo.getCachedStores());
  const [payouts, setPayouts] = useState<PayoutRequest[]>(StorageRepo.getCachedPayouts());
  const [financeSummary, setFinanceSummary] = useState<FinanceSummaryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(StorageRepo.getCachedOrders().length === 0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadFinanceDataDirectly = async (showBadge = true) => {
    if (showBadge) setIsRefreshing(true);
    try {
      const [freshOrders, freshStores, freshPayouts, summary] = await Promise.all([
        fetchSupabaseOrders(),
        fetchSupabaseStores(),
        fetchSupabasePayouts(),
        fetchFinanceSummary().catch(() => []),
      ]);
      setOrders(freshOrders);
      setStores(freshStores);
      setPayouts(freshPayouts);
      if (summary && summary.length > 0) {
        setFinanceSummary(summary);
      }
      setError(null);
    } catch (err: any) {
      console.error('Error fetching finance data directly:', err);
      setError('تعذر تحميل أحدث البيانات المالية من خادم Supabase.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadFinanceDataDirectly();

    const unsubStorage = subscribeToStorageChange(() => {
      setOrders(StorageRepo.getCachedOrders());
      setStores(StorageRepo.getCachedStores());
      setPayouts(StorageRepo.getCachedPayouts());
    });

    const unsubRealtimePayouts = subscribeSupabase<Payout>('payouts', () => {
      loadFinanceDataDirectly(false);
    });

    const unsubRealtimeOrders = subscribeSupabase<Order>('orders', () => {
      loadFinanceDataDirectly(false);
    });

    return () => {
      unsubStorage();
      unsubRealtimePayouts();
      unsubRealtimeOrders();
    };
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Financial Summary from Database (View finance_summary or stored order values)
  const deliveredOrders = orders.filter((o) => o.status === 'delivered');

  const totalGMV = financeSummary.length > 0
    ? financeSummary.reduce((sum, item) => sum + item.gmv, 0)
    : deliveredOrders.reduce((sum, o) => sum + o.total, 0);

  // Strictly use stored order.commission_amount or database finance_summary view - no local calculation
  const totalCommissions = financeSummary.length > 0
    ? financeSummary.reduce((sum, item) => sum + item.commissions, 0)
    : deliveredOrders.reduce((sum, o) => sum + (o.commission_amount || 0), 0);

  const totalDeliveryFees = financeSummary.length > 0
    ? financeSummary.reduce((sum, item) => sum + item.delivery_fees, 0)
    : deliveredOrders.reduce((sum, o) => sum + o.delivery_fee, 0);

  const pendingPayoutsList = payouts.filter((p) => p.status === 'pending');
  const completedPayoutsList = payouts.filter((p) => p.status === 'completed');

  const pendingPayoutsAmount = pendingPayoutsList.reduce((sum, p) => sum + p.amount, 0);

  const handleApprovePayout = async (payoutId: string) => {
    try {
      await StorageRepo.updatePayoutStatus(payoutId, 'completed');
      showToast('تمت موافقة المحاسب المالي وتمرير السحب بنجاح');
    } catch (err: any) {
      alert(`تعذر الموافقة على السحب: ${err.message || 'خطأ غير معروف'}`);
    }
  };

  const handleRejectPayout = async (payoutId: string) => {
    try {
      await StorageRepo.updatePayoutStatus(payoutId, 'failed');
      showToast('تم رفض السحب وإعادة المبلغ لرصيد الحساب');
    } catch (err: any) {
      alert(`تعذر رفض السحب: ${err.message || 'خطأ غير معروف'}`);
    }
  };

  const handleUpdateStoreCommission = (storeId: string, newRate: number) => {
    const store = stores.find((s) => s.id === storeId);
    if (!store) return;
    const updated: Store = { ...store, commission_rate: newRate };
    StorageRepo.saveStore(updated);
    showToast(`تم تعديل نسبة عمولة منصة جِهَات لمتجر "${store.name}" إلى ${newRate}%`);
  };

  const filteredPayouts = payouts.filter((p) => {
    const matchesSearch =
      (p.store_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.user_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 space-y-3 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-emerald-400 backdrop-blur-md">
              <Coins className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black">المسؤول المالي والإداري - منصة على بابك</h1>
                <span className="bg-emerald-500/30 text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-400/20">
                  الإدارة المالية والضرائب
                </span>
              </div>
              <p className="text-xs text-emerald-100/80 mt-1">
                متابعة الميزانية العامة، تسويات الأرباح، نسبة عمولة المتاجر، وسحوبات أسطول التوصيل
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isRefreshing && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800/80 text-emerald-200 border border-emerald-600/40 rounded-xl text-xs font-bold animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-300" />
                <span>يتم تحديث المالية...</span>
              </div>
            )}
            <button
              onClick={() => showToast('تم تصدير التقرير المالي المعتمد بصيغة Excel/PDF')}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-md flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>تصدير كشف الحسابات</span>
            </button>
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
            onClick={() => loadFinanceDataDirectly()}
            className="px-3 py-1 bg-rose-600 text-white rounded-xl text-xs hover:bg-rose-700 transition-all shadow-xs"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">جاري قراءة أحدث الحسابات والماليات مباشرة من Supabase...</p>
        </div>
      ) : (
        <>

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-extrabold">حجم مبيعات الشبكة (GMV)</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900">{totalGMV.toLocaleString()} ج.م</p>
          <p className="text-[10px] text-slate-400 font-bold">إجمالي طلبات مكتملة</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-extrabold">أرباح عمولات المنصة</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-700">{totalCommissions.toLocaleString()} ج.م</p>
          <p className="text-[10px] text-emerald-600 font-bold">صافي دخل جِهَات</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-amber-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-extrabold">سحوبات معلقة للمراجعة</span>
            <Wallet className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-700">{pendingPayoutsAmount.toLocaleString()} ج.م</p>
          <p className="text-[10px] text-amber-600 font-bold">{pendingPayoutsList.length} طلبات سحب تنتظر القبول</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-blue-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-xs font-extrabold">رسوم التوصيل المحصلة</span>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-blue-700">{totalDeliveryFees.toLocaleString()} ج.م</p>
          <p className="text-[10px] text-blue-600 font-bold">محفظة الكباتن والأسطول</p>
        </div>
      </div>

      {/* Payout Requests Queue Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            <h2 className="font-black text-slate-900 text-base">قائمة طلبات سحب المستحقات المالية</h2>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none cursor-pointer"
            >
              <option value="all">جميع حالات السحب</option>
              <option value="pending">قيد الانتظار (Pending)</option>
              <option value="processing">جاري المعالجة (Processing)</option>
              <option value="completed">مكتملة (Completed)</option>
              <option value="failed">متعثرة / مرفوضة (Failed)</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="البحث باسم المتجر أو اسم المستفيد..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
        </div>

        {/* Payouts Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-extrabold">
                <th className="p-3">المستفيد</th>
                <th className="p-3">المبلغ المطلوب</th>
                <th className="p-3">وسيلة السحب والحساب</th>
                <th className="p-3">تاريخ الطلب</th>
                <th className="p-3">الحالة</th>
                <th className="p-3 text-center">الإجراء المالي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredPayouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                    لا توجد طلبات سحب أرباح حالياً.
                  </td>
                </tr>
              ) : (
                filteredPayouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3">
                      <p className="font-extrabold text-slate-900">{payout.store_name || payout.user_name || 'حساب مستفيد'}</p>
                      <p className="text-[10px] text-slate-400 font-mono">ID: #{payout.id.slice(0, 8)}</p>
                    </td>

                    <td className="p-3 font-black text-slate-900 text-sm">
                      {payout.amount.toLocaleString()} ج.م
                    </td>

                    <td className="p-3 font-mono text-slate-700">
                      <p className="font-bold">{payout.payment_method || 'محفظة إلكترونية'}</p>
                      <p className="text-[10px] text-slate-400">{payout.account_details || '010XXXXXXXX'}</p>
                    </td>

                    <td className="p-3 text-slate-500 font-mono text-[11px]">
                      {payout.created_at ? payout.created_at.slice(0, 10) : '2026-08-01'}
                    </td>

                    <td className="p-3">
                      {payout.status === 'pending' && (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold">
                          قيد الانتظار ⏳
                        </span>
                      )}
                      {payout.status === 'completed' && (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                          مكتمل ومحول 🟢
                        </span>
                      )}
                      {payout.status === 'failed' && (
                        <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full text-[10px] font-bold">
                          تعذرت التسوية 🔴
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      {payout.status === 'pending' ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleApprovePayout(payout.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] rounded-xl shadow-xs transition-all"
                          >
                            موافقة وصرف
                          </button>
                          <button
                            onClick={() => handleRejectPayout(payout.id)}
                            className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[11px] rounded-xl transition-all"
                          >
                            رفض
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400">معالج</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stores Commission Rate Control */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="w-5 h-5 text-emerald-600" />
            <h2 className="font-black text-slate-900 text-base">إدارة نسب عمولات المتاجر المتعاقدة</h2>
          </div>
          <span className="text-xs font-bold text-slate-400">نسب الخصم الإدارية من إجمالي الأوردر</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store) => (
            <div key={store.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={store.logo_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=200'}
                  alt={store.name}
                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="font-black text-slate-900 text-xs truncate">{store.name}</h3>
                  <p className="text-[10px] text-slate-500 truncate">{store.category_name || 'متجر معتمد'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                <span className="font-bold text-slate-600">نسبة العقد الحالية:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    defaultValue={store.commission_rate || 10}
                    onBlur={(e) => handleUpdateStoreCommission(store.id, parseFloat(e.target.value) || 10)}
                    className="w-16 p-1 text-center bg-white border border-slate-300 rounded-lg font-black text-xs text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="font-extrabold text-slate-700">%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
        </>
      )}
    </div>
  );
};
