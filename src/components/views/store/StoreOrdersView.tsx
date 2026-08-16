import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { fetchSupabaseOrders, subscribeSupabase } from '../../../lib/supabase';
import { Order, OrderStatus, Store } from '../../../types/domain';
import { formatCurrency, formatDateArabic, formatPhoneNumber } from '../../../lib/formatters';
import { ORDER_STATUS_LABELS, getOrderStatusConfig } from '../../../lib/constants';
import { Pagination } from '../../shared/Pagination';
import OrderChatPanel from '../../shared/OrderChatPanel';
import {
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  Phone,
  MapPin,
  ChefHat,
  PackageCheck,
  Volume2,
  VolumeX,
  AlertCircle,
  RefreshCw,
  Loader2,
  Store as StoreIcon,
  MessageCircle
} from 'lucide-react';
import { useToast } from '../../shared/Toast';
import { useConfirm } from '../../shared/ConfirmDialog';

interface StoreOrdersViewProps {
  onNavigate: (tab: string) => void;
}

export default function StoreOrdersView({ onNavigate }) {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'preparing' | 'ready' | 'completed'>('pending');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('بعض المنتجات غير متوفرة بالمخزون حالياً');
  const [currentPage, setCurrentPage] = useState(1);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 5;
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    const myStore = await StorageRepo.getMyStore();
    setStore(myStore);
    if (myStore) {
      try {
        // كانت هنا بتجيب طلبات كل المنصة (fetchSupabaseOrders() بلا فلتر)
        // وتفلتر في المتصفح — دلوقتي بنستخدم فلتر store_id الجاهز والمُختبر
        // أصلًا في الدالة نفسها، فالسيرفر يرجّع بس طلبات المتجر ده.
        const storeOrders = await fetchSupabaseOrders({ store_id: myStore.id });
        setOrders(storeOrders);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching direct orders in StoreOrdersView:', err);
        setError('تعذر تحديث طلبات المتجر مباشرة من الخادم.');
      }
    } else {
      setOrders([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    let storeId: string | null = null;
    let unsubscribeRealtimeOrders: (() => void) | null = null;

    const init = async () => {
      const myStore = await StorageRepo.getMyStore();
      storeId = myStore?.id || null;
      await loadData();

      // الاشتراك في تغييرات طلبات هذا المتجر تحديدًا بس، بعد ما بقى الـ
      // storeId معروف فعليًا — الكود القديم كان بيحاول يستخدم قيمة store
      // من الـstate جوه effect بـdependency array فاضية، فكانت دايمًا null
      // (stale closure) والفلتر ما كانش بيتطبّق فعليًا خالص.
      unsubscribeRealtimeOrders = subscribeSupabase<Order>(
        'orders',
        () => { loadData(); },
        storeId ? `store_id=eq.${storeId}` : undefined
      );
    };

    init();

    const unsubscribeStorage = subscribeToStorageChange((detail) => {
      if (detail.entityType === 'order' || detail.entityType === 'store') loadData();
    });

    const currentUser = StorageRepo.getCurrentUser();
    const filter = currentUser ? `owner_id=eq.${currentUser.id}` : undefined;
    const unsubscribeRealtimeStore = subscribeSupabase<Store>(
      'stores',
      () => { loadData(); },
      filter
    );

    return () => {
      unsubscribeStorage();
      unsubscribeRealtimeStore();
      unsubscribeRealtimeOrders?.();
    };
  }, []);

  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  const handleAcceptOrder = async (orderId: string, prepTimeMinutes = 20) => {
    setProcessingOrderId(orderId);
    try {
      await StorageRepo.updateOrderStatus(
        orderId,
        'preparing',
        `تم قبول الطلب وجاري التحضير بالمحل (الوقت المتوقع: ${prepTimeMinutes} دقيقة)`
      );
      showToast({ type: 'success', title: 'تم القبول', message: 'تم قبول الطلب وبدء التحضير' });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'تعذّر قبول الطلب',
        message: err.message || 'حدث خطأ أثناء محاولة قبول الطلب، حاول مرة أخرى',
      });
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleRejectOrder = (orderId: string) => {
    showConfirm({
      title: 'تأكيد رفض الطلب',
      message: `هل أنت متأكد من رفض هذا الطلب؟ السبب: ${rejectReason}`,
      variant: 'danger',
      confirmLabel: 'رفض الطلب',
      onConfirm: async () => {
        setProcessingOrderId(orderId);
        try {
          await StorageRepo.updateOrderStatus(orderId, 'rejected', `اعتذر المتجر عن الطلب: ${rejectReason}`);
          setRejectingOrderId(null);
          showToast({ type: 'success', title: 'تم الرفض', message: 'تم رفض الطلب بنجاح' });
        } catch (err: any) {
          showToast({
            type: 'error',
            title: 'تعذّر رفض الطلب',
            message: err.message || 'حدث خطأ أثناء محاولة رفض الطلب، حاول مرة أخرى',
          });
        } finally {
          setProcessingOrderId(null);
        }
      },
    });
  };

  const handleMarkReady = async (orderId: string) => {
    setProcessingOrderId(orderId);
    try {
      await StorageRepo.updateOrderStatus(
        orderId,
        'ready',
        'تم تجهيز الطلب بالكامل وهو جاهز لاستلام مندوب التوصيل الكابتن'
      );
      showToast({ type: 'success', title: 'تم التجهيز', message: 'تم تجهيز الطلب وجاهز للاستلام' });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'تعذّر التحديث',
        message: err.message || 'حدث خطأ أثناء تحديث حالة الطلب، حاول مرة أخرى',
      });
    } finally {
      setProcessingOrderId(null);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'pending') return o.status === 'pending';
    if (activeTab === 'preparing') return ['accepted', 'preparing'].includes(o.status);
    if (activeTab === 'ready') return ['ready', 'assigned', 'picked_up', 'on_the_way'].includes(o.status);
    if (activeTab === 'completed') return ['delivered', 'rejected', 'cancelled'].includes(o.status);
    return true;
  });

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const preparingCount = orders.filter((o) => ['accepted', 'preparing'].includes(o.status)).length;
  const readyCount = orders.filter((o) => ['ready', 'assigned', 'picked_up', 'on_the_way'].includes(o.status)).length;

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-600">جاري تحميل طلبات المتجر...</p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <StoreIcon className="w-16 h-16 text-slate-300 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 text-lg">لا يوجد متجر مرتبط بحسابك</h3>
        <p className="text-sm text-slate-500 mt-1">لا يمكنك إدارة الطلبات بدون متجر. قم بتقديم طلب انضمام متجر.</p>
        <button
          onClick={() => onNavigate('apply-store')}
          className="mt-4 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all"
        >
          تقديم طلب انضمام متجر
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 dir-rtl pb-16">
      {/* Header & Sound Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-blue-600" />
            <span>إدارة الطلبات الواردة للمحل</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            تابع الطلبات الواردة مباشرة، واقبلها للبدء بالتحضير الفوري
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isRefreshing && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
              <span>يتم التحديث...</span>
            </div>
          )}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              soundEnabled
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-blue-600" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? 'التنبيه الصوتي مفعّل' : 'التنبيه الصوتي مكتوم'}</span>
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
            onClick={() => loadData()}
            className="px-3 py-1 bg-rose-600 text-white rounded-xl text-xs hover:bg-rose-700 transition-all shadow-xs"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Tabs Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 ${
            activeTab === 'pending'
              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span>طلبات جديدة</span>
          {pendingCount > 0 && (
            <span className="bg-white text-amber-900 font-extrabold px-2 py-0.2 rounded-full text-[11px] animate-pulse">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('preparing')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 ${
            activeTab === 'preparing'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span>قيد التحضير ({preparingCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('ready')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 ${
            activeTab === 'ready'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span>جاهزة وللتوصيل ({readyCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all ${
            activeTab === 'completed'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          سجل الطلبات
        </button>
      </div>

      {/* Orders Cards List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-slate-800 text-sm">لا توجد طلبات في هذا القسم حالياً</h3>
          <p className="text-xs text-slate-500 mt-1">الطلبات الجديدة ستظهر فور إرسال العملاء لها.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedOrders.map((order) => {
            const statusConfig = getOrderStatusConfig(order.status);

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4"
              >
                {/* Top Info Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-slate-900 text-base">#{order.order_number}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.text}`}>
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      العميل: <strong className="text-slate-800">{order.customer_name}</strong> • {formatDateArabic(order.created_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${order.customer_phone}`}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>{formatPhoneNumber(order.customer_phone)}</span>
                    </a>
                    <button
                      onClick={() => setChatOrderId(order.id)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>تواصل</span>
                    </button>
                  </div>
                </div>

                {/* Items Checklist Table */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2 text-xs">
                  <span className="font-bold text-slate-700 block mb-1">المنتجات المطلوب تجهيزها بالمحل:</span>
                  <div className="divide-y divide-slate-200/60">
                    {order.items.map((item) => (
                      <div key={item.id} className="py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img
                            loading="lazy"
                            src={item.product_image || undefined}
                            alt={item.product_name}
                            className="w-10 h-10 object-cover rounded-md border border-slate-200"
                          />
                          <div>
                            <span className="font-bold text-slate-900">{item.product_name}</span>
                            <span className="text-slate-500 block text-[10px]">
                              {item.quantity} × {formatCurrency(item.unit_price)}
                            </span>
                          </div>
                        </div>

                        <span className="font-black text-slate-900">
                          {formatCurrency(item.total_price)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.customer_notes && (
                    <div className="pt-2 border-t border-slate-200 text-amber-800 font-medium text-[11px] flex items-start gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <span>ملاحظة العميل: {order.customer_notes}</span>
                    </div>
                  )}
                </div>

                {/* Total & Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-slate-600">
                    <span>إجمالي المجموع (كاش عند الاستلام): </span>
                    <span className="font-black text-slate-900 text-sm text-emerald-700">
                      {formatCurrency(order.total)}
                    </span>
                  </div>

                  {/* Actions according to status */}
                  <div className="flex items-center gap-2">
                    {order.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAcceptOrder(order.id, 20)}
                          disabled={processingOrderId === order.id}
                          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{processingOrderId === order.id ? 'جاري القبول...' : 'قبول وبدء التحضير (20 دقيقة)'}</span>
                        </button>

                        <button
                          onClick={() => setRejectingOrderId(order.id)}
                          disabled={processingOrderId === order.id}
                          className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 disabled:opacity-60 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors flex items-center gap-1"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>اعتذار / رفض</span>
                        </button>
                      </>
                    )}

                    {['accepted', 'preparing'].includes(order.status) && (
                      <button
                        onClick={() => handleMarkReady(order.id)}
                        disabled={processingOrderId === order.id}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5"
                      >
                        <ChefHat className="w-4 h-4" />
                        <span>{processingOrderId === order.id ? 'جاري التحديث...' : 'تم تجهيز الطلب - جاهز لاستلام المندوب'}</span>
                      </button>
                    )}

                    {['ready', 'assigned', 'picked_up', 'on_the_way'].includes(order.status) && (
                      <span className="text-xs text-purple-700 font-bold bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200">
                        الطلب بانتظار/في معية مندوب التوصيل
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredOrders.length}
            itemsPerPage={ITEMS_PER_PAGE}
            className="mt-6"
          />
        </div>
      )}

      {/* Reject Reason Dialog */}
      {rejectingOrderId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in space-y-4">
            <h3 className="font-bold text-slate-900 text-base">سبب الاعتذار عن عدم قبول الطلب</h3>

            <select
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
            >
              <option value="بعض المنتجات غير متوفرة بالمخزون حالياً">بعض المنتجات غير متوفرة بالمخزون حالياً</option>
              <option value="المحل متوقف مؤقتاً عن استقبال الطلبات">المحل متوقف مؤقتاً عن استقبال الطلبات</option>
              <option value="خارج نطاق التغطية التوصيل المحلية">خارج نطاق التغطية التوصيل المحلية</option>
            </select>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => handleRejectOrder(rejectingOrderId)}
                disabled={processingOrderId === rejectingOrderId}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                {processingOrderId === rejectingOrderId ? 'جاري الرفض...' : 'تأكيد بضغط رفض الطلب'}
              </button>
              <button
                onClick={() => setRejectingOrderId(null)}
                disabled={processingOrderId === rejectingOrderId}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {chatOrderId && (() => {
        const chatOrder = orders.find((o) => o.id === chatOrderId);
        if (!chatOrder) return null;
        return (
          <OrderChatPanel
            orderId={chatOrder.id}
            recipientId={chatOrder.customer_id}
            recipientName={chatOrder.customer_name || 'العميل'}
            recipientRole="العميل"
            onClose={() => setChatOrderId(null)}
          />
        );
      })()}
    </div>
  );
};