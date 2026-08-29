import React, { useState, useEffect, useCallback } from 'react';
import { StorageRepo } from '../../../lib/storage';
import { subscribeSupabase, fetchAdminOrdersPage, AdminOrderListItem, AdminOrdersCursor } from '../../../lib/supabase';
import { Order, OrderStatus } from '../../../types/domain';
import { formatCurrency, formatDateArabic, formatPhoneNumber } from '../../../lib/formatters';
import { getOrderStatusConfig } from '../../../lib/constants';
import { ShoppingBag, Search, ChevronRight, ChevronLeft, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '../../shared/Toast';

const PAGE_SIZE = 20;

export default function AdminOrdersView() {
  const [items, setItems] = useState<AdminOrderListItem[]>([]);
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

  const { showToast } = useToast();

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
        const page = await fetchAdminOrdersPage({
          search: debouncedSearch,
          status: statusFilter,
          cursor,
          limit: PAGE_SIZE,
        });
        setItems(page.items);
        setNextCursor(page.nextCursor);
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch admin orders page:', err);
        setError('تعذر تحميل سجل الطلبات من الخادم.');
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

  // ديباونس لأحداث realtime: نعيد تحميل نفس الصفحة الحالية بس (من غير
  // ما نفقد مكان الأدمن في البحث/الفلتر/رقم الصفحة اللي هو واقف عندها)
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribeRealtime = subscribeSupabase<Order>('orders', () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => loadPage(history[pageIndex] ?? null, true), 1500);
    });
    return () => {
      unsubscribeRealtime();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [history, pageIndex, loadPage]);

  const goNext = () => {
    if (!nextCursor) return;
    setHistory((h) => [...h.slice(0, pageIndex + 1), nextCursor]);
    setPageIndex((p) => p + 1);
  };

  const goPrevious = () => {
    if (pageIndex === 0) return;
    setPageIndex((p) => p - 1);
  };

  const handleStatusOverride = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await StorageRepo.updateOrderStatus(orderId, newStatus, `تعديل حالة الطلب يدوياً بواسطة الإدارة العامة`);
      showToast({
        type: 'success',
        title: 'تم التحديث',
        message: 'تم تغيير حالة الطلب بنجاح',
      });
      await loadPage(history[pageIndex] ?? null, false);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'فشل التحديث',
        message: err.message || 'تعذر تغيير حالة الطلب',
      });
    }
  };

  return (
    <div className="space-y-6 dir-rtl pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-purple-600" />
            <span>غرفة التحكم ومراقبة جميع الطلبات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            عرض وتعديل حالات الطلبات عبر جميع المتاجر والكباتن
          </p>
        </div>

        {isRefreshing && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
            <span>يتم التحديث...</span>
          </div>
        )}
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

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="ابحث برقم الطلب، اسم المتجر، أو اسم العميل..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
        >
          <option value="all">جميع الحالات</option>
          <option value="pending">معلقة جديدة</option>
          <option value="preparing">قيد التحضير بالمحل</option>
          <option value="ready">جاهزة للتوصيل</option>
          <option value="on_the_way">في الطريق للعميل</option>
          <option value="delivered">مكتملة ومسلمة</option>
          <option value="cancelled">ملغاة</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="p-3.5">الطلب والتاريخ</th>
                <th className="p-3.5">المتجر</th>
                <th className="p-3.5">العميل والموقع</th>
                <th className="p-3.5">الكابتن المندوب</th>
                <th className="p-3.5">المبلغ</th>
                <th className="p-3.5">حالة الطلب الإدارية</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <Loader2 className="w-6 h-6 text-purple-600 animate-spin mx-auto mb-2" />
                    <span className="text-xs font-bold text-slate-500">جاري تحميل الطلبات...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    لا توجد طلبات متطابقة مع البحث.
                  </td>
                </tr>
              ) : (
                items.map((o) => {
                  const statusConfig = getOrderStatusConfig(o.status);

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <span className="font-mono font-black text-slate-900 block">#{o.order_number}</span>
                        <span className="text-[10px] text-slate-400">{formatDateArabic(o.created_at)}</span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-slate-900 block">{o.store_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{formatPhoneNumber(o.store_phone || '')}</span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-slate-900 block">{o.customer_name}</span>
                        <span className="text-[10px] text-slate-500 line-clamp-1">{o.address_line}</span>
                      </td>

                      <td className="p-3.5">
                        {o.delivery_agent_name ? (
                          <span className="font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md">
                            🛵 {o.delivery_agent_name}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">غير معين بعد</span>
                        )}
                      </td>

                      <td className="p-3.5 font-black text-slate-900">
                        {formatCurrency(o.total)}
                      </td>

                      <td className="p-3.5">
                        <select
                          value={o.status}
                          onChange={(e) => handleStatusOverride(o.id, e.target.value as OrderStatus)}
                          className={`p-1.5 rounded-xl text-[11px] font-bold border ${statusConfig.bg} ${statusConfig.text} focus:outline-none`}
                        >
                          <option value="pending">جديد بانتظار القبول</option>
                          <option value="accepted">تم قبول الطلب</option>
                          <option value="preparing">جاري التحضير بالمحل</option>
                          <option value="ready">جاهز واستلام الكابتن</option>
                          <option value="on_the_way">في الطريق للعميل</option>
                          <option value="delivered">تم التسليم بنجاح</option>
                          <option value="cancelled">ملغي</option>
                          <option value="rejected">مرفوض من المتجر</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-slate-100">
          <span className="text-[11px] text-slate-400 font-bold">الصفحة {pageIndex + 1}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={goPrevious}
              disabled={pageIndex === 0 || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              السابق
            </button>
            <button
              onClick={goNext}
              disabled={!nextCursor || loading}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              التالي
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}