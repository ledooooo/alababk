import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { fetchSupabaseOrders, subscribeSupabase } from '../../../lib/supabase';
import { Order, OrderStatus } from '../../../types/domain';
import { formatCurrency, formatDateArabic, formatPhoneNumber } from '../../../lib/formatters';
import { ORDER_STATUS_LABELS, getOrderStatusConfig } from '../../../lib/constants';
import { Pagination } from '../../shared/Pagination';
import { ShoppingBag, Search, Filter, ShieldCheck, Phone, MapPin, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

export const AdminOrdersView: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(StorageRepo.getCachedOrders());
  const [loading, setLoading] = useState<boolean>(StorageRepo.getCachedOrders().length === 0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const loadOrdersDirectly = async (showBadge = true) => {
    if (showBadge) setIsRefreshing(true);
    try {
      const freshOrders = await fetchSupabaseOrders();
      setOrders(freshOrders);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch direct orders in AdminOrdersView:', err);
      setError('تعذر تحميل الطلبات مباشرة من خادم Supabase.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadOrdersDirectly();

    const unsubscribeStorage = subscribeToStorageChange(() => {
      setOrders(StorageRepo.getCachedOrders());
    });

    const unsubscribeRealtime = subscribeSupabase<Order>('orders', () => {
      loadOrdersDirectly(false);
    });

    return () => {
      unsubscribeStorage();
      unsubscribeRealtime();
    };
  }, []);

  const handleStatusOverride = (orderId: string, newStatus: OrderStatus) => {
    StorageRepo.updateOrderStatus(orderId, newStatus, `تعديل حالة الطلب يدوياً بواسطة الإدارة العامة`);
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.store_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

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
            onClick={() => loadOrdersDirectly()}
            className="px-3 py-1 bg-rose-600 text-white rounded-xl text-xs hover:bg-rose-700 transition-all shadow-xs"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center space-y-3 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-600">جاري تحميل الطلبات مباشرة من خادم Supabase...</p>
        </div>
      ) : (

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="ابحث برقم الطلب، اسم المتجر، أو اسم العميل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
        >
          <option value="all">جميع الحالات ({orders.length})</option>
          <option value="pending">معلقة جديدة</option>
          <option value="preparing">قيد التحضير بالمحل</option>
          <option value="ready">جاهزة للتوصيل</option>
          <option value="on_the_way">في الطريق للعميل</option>
          <option value="delivered">مكتملة ومسلمة</option>
          <option value="cancelled">ملغاة</option>
        </select>
      </div>

      {/* Orders Table */}
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
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    لا توجد طلبات متطابقة مع البحث.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((o) => {
                  const statusConfig = getOrderStatusConfig(o.status);

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <span className="font-mono font-black text-slate-900 block">#{o.order_number}</span>
                        <span className="text-[10px] text-slate-400">{formatDateArabic(o.created_at)}</span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-slate-900 block">{o.store_name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{formatPhoneNumber(o.store_phone)}</span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold text-slate-900 block">{o.customer_name}</span>
                        <span className="text-[10px] text-slate-500 line-clamp-1">{o.delivery_address.address_line}</span>
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

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredOrders.length}
          itemsPerPage={ITEMS_PER_PAGE}
          className="p-4"
        />
      </div>
      )}
    </div>
  );
};
