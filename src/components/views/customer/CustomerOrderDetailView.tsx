import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { Order, OrderStatus } from '../../../types/domain';
import { formatCurrency, formatDateArabic, formatPhoneNumber } from '../../../lib/formatters';
import { LeafletMap } from '../../shared/LeafletMap';
import { ORDER_STATUS_LABELS } from '../../../lib/constants';
import {
  ArrowRight,
  Clock,
  CheckCircle2,
  Phone,
  Store,
  Bike,
  MapPin,
  XCircle,
  PackageCheck,
  Star,
  ChefHat,
  Truck,
  AlertCircle
} from 'lucide-react';

interface CustomerOrderDetailViewProps {
  orderId: string;
  onBack: () => void;
}

export const CustomerOrderDetailView: React.FC<CustomerOrderDetailViewProps> = ({
  orderId,
  onBack,
}) => {
  const [order, setOrder] = useState<Order | null>(StorageRepo.getOrderById(orderId));
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingStore, setRatingStore] = useState(5);
  const [ratingDelivery, setRatingDelivery] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToStorageChange(() => {
      setOrder(StorageRepo.getOrderById(orderId));
    });
    return unsubscribe;
  }, [orderId]);

  if (!order) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
        <h3 className="font-bold text-slate-800">الطلب غير موجود</h3>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
        >
          العودة للطلبات
        </button>
      </div>
    );
  }

  const statusConfig = ORDER_STATUS_LABELS[order.status] || ORDER_STATUS_LABELS.pending;

  // Timeline Order Steps Sequence
  const timelineSteps: { status: OrderStatus; title: string; desc: string }[] = [
    { status: 'pending', title: 'تم تقديم الطلب', desc: 'في انتظار مراجعة وقبول المتجر' },
    { status: 'accepted', title: 'قبول الطلب', desc: 'تم قبول الطلب من إدارة المتجر' },
    { status: 'preparing', title: 'جاري التحضير', desc: 'المتجر يقوم بتجهيز وتعبئة المنتجات' },
    { status: 'ready', title: 'جاهز للاستلام', desc: 'الطلب بانتظام المندوب لاستلامه' },
    { status: 'assigned', title: 'تعيين المندوب', desc: 'تم تخصيص الكابتن لاستلام طلبك' },
    { status: 'on_the_way', title: 'في الطريق إليك', desc: 'المندوب في طريقه لعنوانك مع الطلب' },
    { status: 'delivered', title: 'تم التسليم بنجاح', desc: 'تم استلام الطلب وتأكيد المبلغ' },
  ];

  const getStepIndex = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 0;
      case 'accepted': return 1;
      case 'preparing': return 2;
      case 'ready': return 3;
      case 'assigned':
      case 'picked_up': return 4;
      case 'on_the_way': return 5;
      case 'delivered': return 6;
      default: return 0;
    }
  };

  const currentStepIdx = getStepIndex(order.status);

  // Prepare map markers
  const mapMarkers = [];
  if (order.store_lat && order.store_lng) {
    mapMarkers.push({
      lat: order.store_lat,
      lng: order.store_lng,
      title: order.store_name,
      popupText: `عنوان المتجر: ${order.store_address}`,
      type: 'store' as const,
    });
  }
  if (order.delivery_address?.lat && order.delivery_address?.lng) {
    mapMarkers.push({
      lat: order.delivery_address.lat,
      lng: order.delivery_address.lng,
      title: 'عنوان التوصيل',
      popupText: order.delivery_address.address_line,
      type: 'customer' as const,
    });
  }
  if (order.delivery_agent_lat && order.delivery_agent_lng) {
    mapMarkers.push({
      lat: order.delivery_agent_lat,
      lng: order.delivery_agent_lng,
      title: order.delivery_agent_name || 'الكابتن',
      popupText: 'موقع مندوب التوصيل الحالى 🛵',
      type: 'agent' as const,
    });
  }

  const handleCancelOrder = () => {
    if (window.confirm('هل أنت تأكد من إلغاء هذا الطلب؟')) {
      StorageRepo.updateOrderStatus(order.id, 'cancelled', 'تم الإلغاء بواسطة العميل.');
    }
  };

  const handleSubmitRating = () => {
    setRatingSubmitted(true);
    setTimeout(() => {
      setShowRatingModal(false);
    }, 1200);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 dir-rtl pb-16">
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-700 hover:text-emerald-700 text-xs font-bold bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لقائمة طلباتي</span>
        </button>

        <div className="text-left">
          <span className="text-[10px] text-slate-400 block">رقم الطلب</span>
          <span className="font-mono font-black text-slate-900 text-base">{order.order_number}</span>
        </div>
      </div>

      {/* Main Status Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl ${statusConfig.bg} ${statusConfig.text}`}>
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.text}`}>
                  {statusConfig.label}
                </span>
                {order.status === 'on_the_way' && (
                  <span className="bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-md animate-pulse">
                    مباشر 🔴
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                تاريخ الطلب: {formatDateArabic(order.created_at)}
              </p>
            </div>
          </div>

          {/* Cancel Button if still pending */}
          {order.status === 'pending' && (
            <button
              onClick={handleCancelOrder}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-colors self-start sm:self-auto"
            >
              إلغاء الطلب
            </button>
          )}

          {/* Rate Button if delivered */}
          {order.status === 'delivered' && !ratingSubmitted && (
            <button
              onClick={() => setShowRatingModal(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Star className="w-4 h-4 fill-white" />
              <span>تقييم التجربة والمندوب</span>
            </button>
          )}
        </div>

        {/* Rejection Alert if rejected */}
        {order.status === 'rejected' && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-800 text-xs space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-rose-600" />
              اعتذر المتجر عن قبول هذا الطلب
            </p>
            {order.rejection_reason && (
              <p className="text-rose-700">السبب: {order.rejection_reason}</p>
            )}
          </div>
        )}

        {/* Step-by-Step Order Progress Timeline */}
        {!['rejected', 'cancelled'].includes(order.status) && (
          <div className="pt-2">
            <h4 className="font-bold text-slate-900 text-xs mb-4">مراحل تنفيذ الطلب:</h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 relative">
              {timelineSteps.map((step, idx) => {
                const isPassed = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;

                return (
                  <div
                    key={step.status}
                    className={`flex flex-col items-center text-center p-2 rounded-xl transition-all ${
                      isCurrent
                        ? 'bg-emerald-50 border border-emerald-300 shadow-xs'
                        : isPassed
                        ? 'bg-slate-50 border border-slate-100 opacity-90'
                        : 'bg-slate-50/50 opacity-40'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 ${
                        isCurrent
                          ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                          : isPassed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                    </div>
                    <span className="font-bold text-[11px] text-slate-900">{step.title}</span>
                    <span className="text-[9px] text-slate-500 mt-0.5 line-clamp-1">{step.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Live Route Map (Store -> Agent -> Customer) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-600" />
            <span>خريطة ومسار التوصيل المباشر</span>
          </h3>
          <span className="text-xs text-slate-500 font-medium">المعادي والقاهرة</span>
        </div>

        <LeafletMap
          markers={mapMarkers}
          showRoute={true}
          height="320px"
        />
      </div>

      {/* Grid Details: Contact Cards & Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Store & Delivery Agent Details */}
        <div className="space-y-4">
          {/* Store Info */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Store className="w-4 h-4 text-blue-600" />
                بيانات المتجر
              </span>
              <a
                href={`tel:${order.store_phone}`}
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>اتصال بالمحل</span>
              </a>
            </div>

            <div>
              <h4 className="font-extrabold text-slate-900 text-sm">{order.store_name}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{order.store_address}</p>
              <p className="text-xs font-mono text-slate-600 mt-1 dir-ltr text-right">
                {formatPhoneNumber(order.store_phone)}
              </p>
            </div>
          </div>

          {/* Delivery Agent Info */}
          {order.delivery_agent_name && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Bike className="w-4 h-4 text-orange-600" />
                  مندوب التوصيل الكابتن
                </span>
                {order.delivery_agent_phone && (
                  <a
                    href={`tel:${order.delivery_agent_phone}`}
                    className="bg-orange-50 text-orange-700 hover:bg-orange-100 text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>اتصال بالمندوب</span>
                  </a>
                )}
              </div>

              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">{order.delivery_agent_name}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  المركبة: {order.delivery_agent_vehicle || 'موتوسيكل'}
                </p>
                <p className="text-xs font-mono text-slate-600 mt-1 dir-ltr text-right">
                  {formatPhoneNumber(order.delivery_agent_phone || '')}
                </p>
              </div>
            </div>
          )}

          {/* Delivery Address Details */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
            <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              عنوان الوصول والتسليم
            </span>
            <p className="font-bold text-xs text-slate-900">{order.delivery_address.title}</p>
            <p className="text-xs text-slate-600">{order.delivery_address.address_line}</p>
            <p className="text-[11px] text-slate-400">
              مبنى: {order.delivery_address.building} | دور: {order.delivery_address.floor} | شقة: {order.delivery_address.apartment}
            </p>
          </div>
        </div>

        {/* Order Items & Total Summary */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 h-fit">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2.5">
            تفاصيل المنتجات المطلوبة
          </h3>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {order.items.map((item) => (
              <div key={item.id} className="flex gap-3 items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <img
                    src={item.product_image}
                    alt={item.product_name}
                    className="w-12 h-12 object-cover rounded-lg border border-slate-200 shrink-0"
                  />
                  <div>
                    <h5 className="font-bold text-slate-800">{item.product_name}</h5>
                    <span className="text-slate-500 text-[11px]">
                      {item.quantity} × {formatCurrency(item.unit_price)}
                    </span>
                  </div>
                </div>

                <span className="font-bold text-slate-900">
                  {formatCurrency(item.total_price)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>مجموع المنتجات:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>رسوم التوصيل:</span>
              <span className="font-semibold text-slate-800">{formatCurrency(order.delivery_fee)}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>خصم الكوبون ({order.coupon_code}):</span>
                <span>- {formatCurrency(order.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-black text-slate-900">
              <span>المبلغ الإجمالي المطلق:</span>
              <span className="text-emerald-700 text-base">{formatCurrency(order.total)}</span>
            </div>
            <div className="text-[11px] text-slate-500 pt-1">
              طريقة الدفع: <span className="font-bold text-slate-800">{order.payment_method === 'cod' ? 'نقداً عند الاستلام (COD)' : 'بطاقة ائتمان'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Rating & Review Modal */}
      {showRatingModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <h3 className="font-black text-slate-900 text-lg text-center">تقييم تجربة الطلب والتوصيل</h3>

            {ratingSubmitted ? (
              <div className="text-center py-6 space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
                <h4 className="font-bold text-slate-900 text-base">شكراً لتقييمك!</h4>
                <p className="text-xs text-slate-500">ملاحظاتك تساعدنا في تحسين جودة المتاجر والمندوبين.</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <label className="block text-xs font-bold text-slate-800">
                    تقييم المتجر ({order.store_name})
                  </label>
                  <div className="flex gap-2 justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRatingStore(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            star <= ratingStore
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <label className="block text-xs font-bold text-slate-800">
                    تقييم الكابتن مندوب التوصيل
                  </label>
                  <div className="flex gap-2 justify-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRatingDelivery(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`w-7 h-7 ${
                            star <= ratingDelivery
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">تعليقك ورأيك</label>
                  <textarea
                    rows={3}
                    placeholder="اكتب انطباعك عن السرعة والجودة..."
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSubmitRating}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                  >
                    إرسال التقييم
                  </button>
                  <button
                    onClick={() => setShowRatingModal(false)}
                    className="px-4 py-3 bg-slate-100 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
