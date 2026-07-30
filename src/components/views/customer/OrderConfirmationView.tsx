import React from 'react';
import { StorageRepo } from '../../../lib/storage';
import { formatCurrency } from '../../../lib/formatters';
import { CheckCircle2, Clock, MapPin, Store, ArrowLeft, Home, ShoppingBag, QrCode, Phone } from 'lucide-react';

interface OrderConfirmationViewProps {
  orderId: string;
  onNavigate: (tab: string, param?: string) => void;
}

export const OrderConfirmationView: React.FC<OrderConfirmationViewProps> = ({ orderId, onNavigate }) => {
  const order = StorageRepo.getOrderById(orderId);

  if (!order) {
    return (
      <div className="max-w-md mx-auto my-12 dir-rtl bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4">
        <p className="text-xs text-slate-500">جاري تحميل تفاصيل تأكيد الطلب...</p>
        <button
          onClick={() => onNavigate('landing')}
          className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold"
        >
          العودة للرئيسية
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 dir-rtl pb-16">
      {/* Success Hero Header */}
      <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 text-white rounded-3xl p-8 text-center space-y-4 shadow-xl relative overflow-hidden">
        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md text-emerald-200 flex items-center justify-center mx-auto border border-white/30">
          <CheckCircle2 className="w-10 h-10 text-emerald-300" />
        </div>

        <div className="space-y-1">
          <span className="px-3 py-1 bg-emerald-900/60 text-emerald-200 rounded-full text-xs font-mono font-bold">
            رقم الطلب: #{order.order_number}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black pt-2">تم إنشاء الطلب وإرساله للمتجر!</h1>
          <p className="text-xs text-emerald-100/90 leading-relaxed max-w-lg mx-auto">
            يقوم متجر <span className="font-bold underline">{order.store_name}</span> الآن بتجهيز طلبك وتعيين كابتن التوصيل.
          </p>
        </div>

        {/* Estimated Time Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white text-emerald-900 rounded-2xl font-extrabold text-xs shadow-md">
          <Clock className="w-4 h-4 text-emerald-600 animate-spin" />
          <span>الوقت المتوقع للوصول: 20 - 30 دقيقة</span>
        </div>
      </div>

      {/* QR Code & Pickup Pass */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center sm:text-right">
          <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700">
            كود التحقق عند الاستلام
          </span>
          <h3 className="text-lg font-black text-slate-900">رمز الاستلام الخاص بالطلب</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            أظهر هذا الكود للكابتن عند وصوله لباب منزلك لتأكيد استلام المنتجات بنجاح.
          </p>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-1 shrink-0">
          <QrCode className="w-24 h-24 text-slate-800 mx-auto" />
          <p className="font-mono text-xs font-black text-slate-900">{order.order_number}</p>
        </div>
      </div>

      {/* Itemized Receipt Summary */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="font-black text-slate-900 text-sm border-b border-slate-100 pb-3 flex items-center justify-between">
          <span>ملخص الفاتورة</span>
          <span className="text-xs text-slate-500 font-normal">{order.created_at.slice(0, 10)}</span>
        </h3>

        <div className="space-y-2 divide-y divide-slate-100">
          {order.items.map((item, idx) => (
            <div key={idx} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-black text-emerald-700">{item.quantity}x</span>
                <span className="font-bold text-slate-800">{item.product_name}</span>
              </div>
              <span className="font-extrabold text-slate-900">{formatCurrency(item.total_price)}</span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-200 space-y-1.5 text-xs text-slate-600">
          <div className="flex justify-between">
            <span>المجموع الفرعي:</span>
            <span className="font-bold text-slate-800">{formatCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>رسوم التوصيل:</span>
            <span className="font-bold text-slate-800">{formatCurrency(order.delivery_fee)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>الخصم المطبق:</span>
              <span>- {formatCurrency(order.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-black text-slate-900">
            <span>الإجمالي الكلي:</span>
            <span className="text-emerald-700 text-base">{formatCurrency(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Navigation Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <button
          onClick={() => onNavigate('customer-order-detail', order.id)}
          className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
        >
          <Clock className="w-4 h-4" />
          <span>متابعة حالة الطلب لحظة بلحظة</span>
        </button>

        <button
          onClick={() => onNavigate('landing')}
          className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          <span>العودة للرئيسية</span>
        </button>
      </div>
    </div>
  );
};
