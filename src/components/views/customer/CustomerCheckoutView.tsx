import React, { useState } from 'react';
import { useCartStore } from '../../../stores/cart-store';
import { StorageRepo } from '../../../lib/storage';
import { CustomerAddress, Order, OrderStatusHistoryItem } from '../../../types/domain';
import { formatCurrency } from '../../../lib/formatters';
import { LeafletMap } from '../../shared/LeafletMap';
import { DEFAULT_LAT, DEFAULT_LNG } from '../../../lib/constants';
import {
  MapPin,
  CreditCard,
  Banknote,
  Tag,
  Check,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  ShoppingBag,
  Plus
} from 'lucide-react';

interface CustomerCheckoutViewProps {
  onBackToCart: () => void;
  onOrderPlaced: (orderId: string) => void;
}

export const CustomerCheckoutView: React.FC<CustomerCheckoutViewProps> = ({
  onBackToCart,
  onOrderPlaced,
}) => {
  const { items, storeId, storeName, getSubtotal, clearCart } = useCartStore();
  const currentUser = StorageRepo.getCurrentUser();
  const savedAddresses = StorageRepo.getAddresses(currentUser?.id);

  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    savedAddresses.find((a) => a.is_default)?.id || savedAddresses[0]?.id || 'new'
  );

  // New address custom state
  const [newTitle, setNewTitle] = useState('عنوان جديد');
  const [newAddressLine, setNewAddressLine] = useState('');
  const [newBuilding, setNewBuilding] = useState('');
  const [newFloor, setNewFloor] = useState('');
  const [newApartment, setNewApartment] = useState('');
  const [mapLat, setMapLat] = useState(DEFAULT_LAT);
  const [mapLng, setMapLng] = useState(DEFAULT_LNG);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState('');

  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card'>('cod');
  const [customerNotes, setCustomerNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotal = getSubtotal();
  const deliveryFee = subtotal > 0 ? 15 : 0;
  const discountAmount = appliedCoupon ? appliedCoupon.discount : 0;
  const total = Math.max(0, subtotal + deliveryFee - discountAmount);

  const store = storeId ? StorageRepo.getStoreById(storeId) : null;

  const handleApplyCoupon = () => {
    setCouponError('');
    if (!couponCode.trim()) return;

    const coupons = StorageRepo.getCoupons();
    const found = coupons.find(
      (c) => c.code.toUpperCase() === couponCode.trim().toUpperCase() && c.is_active
    );

    if (!found) {
      setCouponError('كود الخصم غير صحيح أو منتهي الصلاحية');
      return;
    }

    if (subtotal < found.min_order_amount) {
      setCouponError(`الحد الأدنى لاستخدام الكود هو ${formatCurrency(found.min_order_amount)}`);
      return;
    }

    let calculatedDiscount = 0;
    if (found.discount_type === 'percent') {
      calculatedDiscount = (subtotal * found.discount_value) / 100;
      if (found.max_discount_amount) {
        calculatedDiscount = Math.min(calculatedDiscount, found.max_discount_amount);
      }
    } else {
      calculatedDiscount = found.discount_value;
    }

    setAppliedCoupon({
      code: found.code,
      discount: calculatedDiscount,
    });
  };

  const handlePlaceOrder = () => {
    if (!storeId || !store) {
      alert('خطأ: المتجر غير محدد');
      return;
    }

    let finalAddress: CustomerAddress;

    if (selectedAddressId === 'new') {
      if (!newAddressLine.trim()) {
        alert('يرجى كتابة تفاصيل العنوان');
        return;
      }
      finalAddress = {
        id: `addr-${Date.now()}`,
        user_id: currentUser?.id || 'usr-guest',
        title: newTitle,
        address_line: newAddressLine,
        building: newBuilding,
        floor: newFloor,
        apartment: newApartment,
        lat: mapLat,
        lng: mapLng,
        is_default: false,
      };
      StorageRepo.saveAddress(finalAddress);
    } else {
      const found = savedAddresses.find((a) => a.id === selectedAddressId);
      if (!found) {
        alert('يرجى تحديد عنوان توصيل صالح');
        return;
      }
      finalAddress = found;
    }

    setIsSubmitting(true);

    const nowIso = new Date().toISOString();
    const orderNumber = `JHT-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      order_number: orderNumber,
      customer_id: currentUser?.id || 'usr-guest',
      customer_name: currentUser?.name || 'عميل جِهَات',
      customer_phone: currentUser?.phone || '01012345678',
      store_id: store.id,
      store_name: store.name,
      store_phone: store.phone,
      store_address: store.address,
      store_lat: store.lat,
      store_lng: store.lng,
      delivery_address: finalAddress,
      items: items.map((item, idx) => ({
        id: `item-${idx}-${Date.now()}`,
        product_id: item.product.id,
        product_name: item.product.name,
        product_image: item.product.image_url,
        unit_price: item.product.price,
        quantity: item.quantity,
        total_price: item.product.price * item.quantity,
        notes: item.notes,
      })),
      subtotal,
      delivery_fee: deliveryFee,
      discount_amount: discountAmount,
      coupon_code: appliedCoupon?.code,
      total,
      payment_method: paymentMethod,
      payment_status: paymentMethod === 'card' ? 'paid' : 'pending',
      status: 'pending',
      status_history: [
        {
          status: 'pending',
          timestamp: nowIso,
          note: 'تم إنشاء الطلب وفي انتظار مراجعة وقبول المتجر.',
        },
      ],
      customer_notes: customerNotes,
      created_at: nowIso,
      updated_at: nowIso,
    };

    StorageRepo.saveOrder(newOrder);
    clearCart();

    setTimeout(() => {
      setIsSubmitting(false);
      onOrderPlaced(newOrder.id);
    }, 600);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 dir-rtl pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToCart}
          className="flex items-center gap-2 text-slate-700 hover:text-emerald-700 text-xs font-bold bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة للسلة</span>
        </button>

        <h1 className="text-lg font-black text-slate-900">إتمام وتأكيد الطلب</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Address & Options */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Address Selection Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <span>عنوان التوصيل</span>
            </div>

            <div className="space-y-2.5">
              {savedAddresses.map((addr) => (
                <label
                  key={addr.id}
                  onClick={() => setSelectedAddressId(addr.id)}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedAddressId === addr.id
                      ? 'bg-emerald-50/70 border-emerald-500 text-slate-900 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="address_choice"
                    checked={selectedAddressId === addr.id}
                    onChange={() => setSelectedAddressId(addr.id)}
                    className="mt-1 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{addr.title}</span>
                      {addr.is_default && (
                        <span className="bg-slate-200 text-slate-700 text-[10px] px-1.5 py-0.2 rounded font-medium">
                          العنوان الافتراضي
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-1">{addr.address_line}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      مبنى: {addr.building} | دور: {addr.floor} | شقة: {addr.apartment}
                    </p>
                  </div>
                </label>
              ))}

              {/* Add / Custom Pin Option */}
              <label
                onClick={() => setSelectedAddressId('new')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedAddressId === 'new'
                    ? 'bg-emerald-50/70 border-emerald-500 text-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="address_choice"
                  checked={selectedAddressId === 'new'}
                  onChange={() => setSelectedAddressId('new')}
                  className="mt-1 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-xs text-slate-900 flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    تحديد موقع جديد على الخريطة
                  </span>
                </div>
              </label>
            </div>

            {/* Custom Map Address Inputs */}
            {selectedAddressId === 'new' && (
              <div className="pt-3 border-t border-slate-100 space-y-3 animate-in fade-in duration-200">
                <LeafletMap
                  interactiveSelect={true}
                  onLocationSelect={(lat, lng) => {
                    setMapLat(lat);
                    setMapLng(lng);
                  }}
                  height="220px"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      تفاصيل العنوان والشارع *
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: 12 شارع دجلة المعادي..."
                      value={newAddressLine}
                      onChange={(e) => setNewAddressLine(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      اسم/رقم العمارة والمبنى
                    </label>
                    <input
                      type="text"
                      placeholder="عمارة 14..."
                      value={newBuilding}
                      onChange={(e) => setNewBuilding(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      رقم الدور
                    </label>
                    <input
                      type="text"
                      placeholder="الدور 3..."
                      value={newFloor}
                      onChange={(e) => setNewFloor(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      رقم الشقة
                    </label>
                    <input
                      type="text"
                      placeholder="شقة 8..."
                      value={newApartment}
                      onChange={(e) => setNewApartment(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Payment Method Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
              <Banknote className="w-5 h-5 text-emerald-600" />
              <span>طريقة الدفع</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setPaymentMethod('cod')}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                  paymentMethod === 'cod'
                    ? 'bg-emerald-50 border-emerald-500 text-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="payment_choice"
                  checked={paymentMethod === 'cod'}
                  onChange={() => setPaymentMethod('cod')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900">الدفع نقداً عند الاستلام (COD)</h5>
                  <p className="text-[10px] text-slate-500 mt-0.5">ادفع للمندوب كاش بعد استلام طلبك</p>
                </div>
              </label>

              <label
                onClick={() => setPaymentMethod('card')}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                  paymentMethod === 'card'
                    ? 'bg-emerald-50 border-emerald-500 text-slate-900 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="payment_choice"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <div className="p-2 bg-blue-100 text-blue-800 rounded-lg">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900">بطاقة ائتمان / ميزة</h5>
                  <p className="text-[10px] text-slate-500 mt-0.5">دفع إلكتروني آمن</p>
                </div>
              </label>
            </div>
          </div>

          {/* 3. Notes & Instructions Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              ملاحظات للمتجر ومندوب التوصيل (اختياري)
            </label>
            <textarea
              rows={3}
              placeholder="مثال: يرجى الاتصال عند الوصول، الخبز ساخن، أو أي شروط خاصة..."
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Right Col: Order Items & Summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 sticky top-24">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">ملخص الطلب</h3>
              <span className="text-xs text-slate-500 font-medium">من: {storeName}</span>
            </div>

            {/* Items snippet */}
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.product.id} className="flex items-center justify-between text-xs text-slate-700">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-bold text-emerald-700">{item.quantity}x</span>
                    <span className="truncate">{item.product.name}</span>
                  </div>
                  <span className="font-semibold text-slate-900 shrink-0">
                    {formatCurrency(item.product.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Coupon Code Entry */}
            <div className="pt-3 border-t border-slate-100 space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-700">
                كود الخصم (جرب JIHAT10 أو WELCOME20)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="أدخل الكود..."
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1 p-2 border border-slate-200 bg-slate-50 rounded-xl text-xs uppercase focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
                <button
                  onClick={handleApplyCoupon}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
                >
                  تطبيق
                </button>
              </div>
              {appliedCoupon && (
                <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  تم تطبيق كود {appliedCoupon.code} بنجاح!
                </p>
              )}
              {couponError && (
                <p className="text-[11px] text-rose-600 font-medium">{couponError}</p>
              )}
            </div>

            {/* Price Calculations */}
            <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>رسوم التوصيل:</span>
                <span className="font-semibold text-slate-800">{formatCurrency(deliveryFee)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>الخصم المطبق:</span>
                  <span>- {formatCurrency(discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-black text-slate-900">
                <span>إجمالي الطلب:</span>
                <span className="text-emerald-700 text-base">{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Order Confirmation CTA */}
            <button
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>جاري إرسال الطلب للمتجر...</span>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>تأكيد وإرسال الطلب للمتجر</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
