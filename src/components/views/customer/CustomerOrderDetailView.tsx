import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { fetchOrderStatusHistory, subscribeSupabase, fetchChatRecipients, ChatRecipients } from '../../../lib/supabase';
import { Order, OrderStatus, OrderStatusHistoryItem } from '../../../types/domain';
import { formatCurrency, formatDateArabic, formatPhoneNumber } from '../../../lib/formatters';
import { ORDER_STATUS_LABELS, getOrderStatusConfig } from '../../../lib/constants';
import { ArrowLeft, MapPin, Phone, Clock, Truck, CheckCircle2, XCircle, AlertCircle, Loader2, Store, Package, CreditCard, Calendar, User, RefreshCw, MessageCircle, Star } from 'lucide-react';
import { useToast } from '../../shared/Toast';
import { useConfirm } from '../../shared/ConfirmDialog';
import OrderChatPanel from '../../shared/OrderChatPanel';
import { SubmitReviewModal } from '../../modals/SubmitReviewModal';


interface CustomerOrderDetailViewProps {
  orderId: string;
  onBack: () => void;
}

export default function CustomerOrderDetailView({ orderId, onBack }) {
  // ===== HOOKS ===== (جميع الـ hooks في الأعلى، قبل أي return شرطي)
  const [order, setOrder] = useState<Order | null>(null);
  const [statusHistory, setStatusHistory] = useState<OrderStatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chatRecipients, setChatRecipients] = useState<ChatRecipients | null>(null);
  const [openChatWith, setOpenChatWith] = useState<'store' | 'agent' | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [hasExistingReview, setHasExistingReview] = useState(false);

  // ===== دوال التحميل =====
  const loadOrder = async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError(null);
      const allOrders = await StorageRepo.refreshOrders();
      const found = allOrders.find((o) => o.id === orderId);
      if (found) {
        setOrder(found);
        // جلب تاريخ الحالة
        const history = await fetchOrderStatusHistory(orderId);
        setStatusHistory(history.length > 0 ? history : found.status_history || []);
        // هل الطلب ده اتقيّم قبل كده؟
        StorageRepo.refreshReviews()
          .then((reviews) => setHasExistingReview(reviews.some((r) => r.order_id === orderId)))
          .catch(() => {});
      } else {
        setError('الطلب غير موجود أو لا تملك صلاحية عرضه');
      }
    } catch (err: any) {
      setError(err.message || 'فشل تحميل تفاصيل الطلب');
    } finally {
      setLoading(false);
    }
  };

  const refreshOrder = async () => {
    setIsRefreshing(true);
    await loadOrder();
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadOrder();

    // اشتراك Realtime لتحديث الطلب فوراً
    const unsubRealtime = subscribeSupabase<Order>(
      'orders',
      (payload) => {
        if (payload.new && payload.new.id === orderId) {
          setOrder((prev) => {
            if (!prev) return payload.new as Order;
            // دمج التحديثات مع الحفاظ على السجل
            return { ...prev, ...payload.new };
          });
          // تحديث تاريخ الحالة أيضاً
          fetchOrderStatusHistory(orderId).then((history) => {
            if (history.length > 0) setStatusHistory(history);
          });
        }
      },
      `id=eq.${orderId}`
    );

    // اشتراك التخزين المحلي
    const unsubStorage = subscribeToStorageChange((detail) => {
      if (detail.entityType === 'order' && detail.data?.id === orderId) {
        refreshOrder();
      }
    });

    return () => {
      unsubRealtime();
      unsubStorage();
    };
  }, [orderId]);

  // جلب هويات أطراف الشات (صاحب المتجر/المندوب) مرة واحدة عند توفّر الطلب
  useEffect(() => {
    if (!orderId) return;
    fetchChatRecipients(orderId)
      .then(setChatRecipients)
      .catch(() => setChatRecipients(null));
  }, [orderId]);

  // ===== دوال الإلغاء =====
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  const handleCancelOrder = async () => {
    if (!order) return;
    showConfirm({
      title: 'تأكيد إلغاء الطلب',
      message: 'هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.',
      variant: 'danger',
      confirmLabel: 'إلغاء الطلب',
      onConfirm: async () => {
        try {
          setIsCancelling(true);
          await StorageRepo.updateOrderStatus(order.id, 'cancelled', cancelReason || 'ألغى العميل الطلب');
          setShowCancelModal(false);
          await refreshOrder();
          showToast({ type: 'success', title: 'تم الإلغاء', message: 'تم إلغاء الطلب بنجاح' });
        } catch (err: any) {
          showToast({ type: 'error', title: 'فشل الإلغاء', message: err.message || 'تعذر إلغاء الطلب' });
        } finally {
          setIsCancelling(false);
        }
      },
    });
  };


  // ===== حالة التحميل =====
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-600">جاري تحميل تفاصيل الطلب...</p>
      </div>
    );
  }

  // ===== حالة الخطأ =====
  if (error) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-800">حدث خطأ</h3>
        <p className="text-sm text-slate-600">{error}</p>
        <button
          onClick={refreshOrder}
          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          إعادة المحاولة
        </button>
      </div>
    );
  }

  // ===== حالة عدم وجود الطلب =====
  if (!order) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <Package className="w-16 h-16 text-slate-300 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 text-lg">الطلب غير موجود</h3>
        <p className="text-sm text-slate-500">قد يكون الطلب قد حُذف أو لا تملك صلاحية عرضه.</p>
        <button onClick={onBack} className="mt-4 px-6 py-2 bg-slate-200 rounded-xl text-sm font-bold">
          العودة إلى قائمة الطلبات
        </button>
      </div>
    );
  }

  // ===== عرض التفاصيل =====
  const statusConfig = getOrderStatusConfig(order.status);
  const canCancel = ['pending', 'accepted'].includes(order.status);
  const isDelivered = order.status === 'delivered';

  return (
    <div className="max-w-3xl mx-auto space-y-6 dir-rtl pb-16">
      {/* زر الرجوع */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 text-sm font-bold"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>العودة إلى قائمة الطلبات</span>
      </button>

      {/* رأس الطلب */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">طلب #{order.order_number}</h1>
            <p className="text-sm text-slate-300 mt-1">
              {formatDateArabic(order.created_at)} • {order.customer_name}
            </p>
          </div>
          <div className={`px-4 py-2 rounded-xl font-bold text-sm ${statusConfig.bg} ${statusConfig.text}`}>
            {statusConfig.label}
          </div>
        </div>

        {/* ملخص سريع */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-700/50">
          <div>
            <p className="text-xs text-slate-400">إجمالي الطلب</p>
            <p className="font-bold text-lg">{formatCurrency(order.total)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">طريقة الدفع</p>
            <p className="font-bold">{order.payment_method === 'online' ? 'أونلاين' : 'كاش عند الاستلام'}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">حالة الدفع</p>
            <p className={`font-bold ${order.payment_status === 'paid' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {order.payment_status === 'paid' ? 'مدفوع' : 'معلق'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">الوقت المتوقع</p>
            <p className="font-bold">{order.eta_minutes ? `${order.eta_minutes} دقيقة` : '—'}</p>
          </div>
        </div>
      </div>

      {/* التواصل مع المتجر */}
      {chatRecipients?.storeOwnerId && (
        <button
          onClick={() => setOpenChatWith('store')}
          className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 rounded-2xl text-sm font-bold text-slate-700 transition-colors shadow-xs"
        >
          <MessageCircle className="w-4.5 h-4.5 text-emerald-600" />
          <span>تواصل مع {chatRecipients.storeName || 'المتجر'}</span>
        </button>
      )}

      {/* المندوب والتتبع (فقط قراءة، لا كتابة) */}
      {order.delivery_agent_id && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Truck className="w-5 h-5 text-orange-600" />
              <span>تفاصيل مندوب التوصيل</span>
            </h3>
            {chatRecipients?.agentUserId && (
              <button
                onClick={() => setOpenChatWith('agent')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[11px] font-bold transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>تواصل</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-500">الاسم:</span>
              <span className="font-bold text-slate-800 mr-1">{order.delivery_agent_name || 'غير معروف'}</span>
            </div>
            <div>
              <span className="text-slate-500">الهاتف:</span>
              <a href={`tel:${order.delivery_agent_phone}`} className="font-bold text-blue-600 mr-1">
                {formatPhoneNumber(order.delivery_agent_phone) || 'غير متاح'}
              </a>
            </div>
            <div>
              <span className="text-slate-500">المركبة:</span>
              <span className="font-bold text-slate-800 mr-1">{order.delivery_agent_vehicle || '—'}</span>
            </div>
          </div>

          {/* موقع المندوب الحقيقي (قراءة فقط) */}
          {order.delivery_agent_lat && order.delivery_agent_lng ? (
            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-xs flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span className="text-blue-800 font-bold">موقع المندوب الحالي: </span>
              <span className="text-blue-700">
                {order.delivery_agent_lat.toFixed(6)}, {order.delivery_agent_lng.toFixed(6)}
              </span>
              <span className="text-blue-500 text-[10px] mr-2">(تحديث لحظي)</span>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>لم يبدأ التتبع بعد</span>
            </div>
          )}
        </div>
      )}

      {/* عنوان التوصيل */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
          <MapPin className="w-5 h-5 text-emerald-600" />
          <span>عنوان التوصيل</span>
        </h3>
        <div className="mt-3 text-sm space-y-1">
          <p className="font-bold">{order.delivery_address.title || 'عنوان التوصيل'}</p>
          <p className="text-slate-600">{order.delivery_address.address_line}</p>
          {order.delivery_address.building && <p className="text-slate-600">مبنى: {order.delivery_address.building}</p>}
          {order.delivery_address.floor && <p className="text-slate-600">الدور: {order.delivery_address.floor}</p>}
          {order.delivery_address.apartment && <p className="text-slate-600">شقة: {order.delivery_address.apartment}</p>}
          {order.delivery_address.notes && (
            <p className="text-amber-700 text-xs mt-1">ملاحظة: {order.delivery_address.notes}</p>
          )}
        </div>
      </div>

      {/* المنتجات */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
          <Package className="w-5 h-5 text-purple-600" />
          <span>المنتجات المطلوبة ({order.items.length})</span>
        </h3>
        <div className="divide-y divide-slate-100 mt-3">
          {order.items.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <img
                  loading="lazy"
                  src={item.product_image || undefined}
                  alt={item.product_name}
                  className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                />
                <div>
                  <p className="font-bold text-slate-900">{item.product_name}</p>
                  <p className="text-xs text-slate-500">
                    {item.quantity} × {formatCurrency(item.unit_price)}
                  </p>
                </div>
              </div>
              <span className="font-bold text-slate-900">{formatCurrency(item.total_price)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* تفاصيل التكلفة */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">تفاصيل التكلفة</h3>
        <div className="space-y-2 mt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">المجموع الفرعي</span>
            <span className="font-bold">{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">رسوم التوصيل</span>
            <span className="font-bold">{formatCurrency(order.delivery_fee)}</span>
          </div>
          {order.tip_amount && order.tip_amount > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-600">إكرامية</span>
              <span className="font-bold">{formatCurrency(order.tip_amount)}</span>
            </div>
          )}
          {order.discount_amount && order.discount_amount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>خصم</span>
              <span className="font-bold">-{formatCurrency(order.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-base">
            <span>الإجمالي</span>
            <span className="text-emerald-700">{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      {/* تاريخ الحالة */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-500" />
          <span>تسلسل تحديثات حالة الطلب</span>
        </h3>
        <div className="relative mt-4 space-y-4 pr-4 before:absolute before:right-1 before:top-0 before:bottom-0 before:w-0.5 before:bg-slate-200">
          {statusHistory.map((item, idx) => {
            const config = getOrderStatusConfig(item.status);
            return (
              <div key={idx} className="relative pr-6">
                <div className={`absolute right-0 top-1 w-3 h-3 rounded-full border-2 ${config.bg.replace('bg-', 'border-')}`} />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">{config.label}</span>
                  <span className="text-slate-500">{formatDateArabic(item.timestamp)}</span>
                </div>
                {item.note && <p className="text-slate-600 text-[11px] mt-0.5">{item.note}</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* أزرار الإجراءات */}
      <div className="flex flex-wrap gap-3">
        {canCancel && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-md transition-colors flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            إلغاء الطلب
          </button>
        )}
        {isDelivered && (
          hasExistingReview ? (
            <button
              disabled
              className="px-6 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-sm font-bold flex items-center gap-2 cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              تم تقييم الطلب
            </button>
          ) : (
            <button
              onClick={() => setShowReviewModal(true)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md transition-colors flex items-center gap-2"
            >
              <Star className="w-4 h-4" />
              تقييم الطلب
            </button>
          )
        )}
      </div>

      {showReviewModal && order && (
        <SubmitReviewModal
          order={order}
          onClose={() => setShowReviewModal(false)}
          onSubmitted={() => {
            setHasExistingReview(true);
            showToast({ type: 'success', title: 'شكراً لك', message: 'تم إرسال تقييمك بنجاح' });
          }}
        />
      )}

      {/* مودال إلغاء الطلب */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-lg">تأكيد إلغاء الطلب</h3>
            <p className="text-sm text-slate-600">هل أنت متأكد من رغبتك في إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.</p>
            <textarea
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none"
              placeholder="سبب الإلغاء (اختياري)"
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md transition-colors flex items-center justify-center gap-2"
              >
                {isCancelling && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isCancelling ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}</span>
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* شات الطلب */}
      {openChatWith === 'store' && chatRecipients?.storeOwnerId && (
        <OrderChatPanel
          orderId={orderId}
          recipientId={chatRecipients.storeOwnerId}
          recipientName={chatRecipients.storeName || 'المتجر'}
          recipientRole="المتجر"
          onClose={() => setOpenChatWith(null)}
        />
      )}
      {openChatWith === 'agent' && chatRecipients?.agentUserId && (
        <OrderChatPanel
          orderId={orderId}
          recipientId={chatRecipients.agentUserId}
          recipientName={chatRecipients.agentName || order.delivery_agent_name || 'مندوب التوصيل'}
          recipientRole="مندوب التوصيل"
          onClose={() => setOpenChatWith(null)}
        />
      )}
    </div>
  );
}