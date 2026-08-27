import React, { useState, useEffect } from 'react';
import { StorageRepo } from '../../../lib/storage';
import { quoteOrderSecure, createSecureOrder, upsertAddress, fetchAddresses } from '../../../lib/supabase';
import { checkPointInZone, checkAddressZone, getNearestZone, logZoneCoverageMiss, NearestZoneMatch } from '../../../lib/supabase/customer-insights';
import { CustomerAddress } from '../../../types/domain';
import { formatCurrency } from '../../../lib/formatters';
import { useCartStore } from '../../../stores/cart-store';
import { LeafletMap } from '../../shared/LeafletMap';
import { ZoneStatusBadge, ZoneStatus } from '../../shared/ZoneStatusBadge';
import {
  ArrowRight,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Truck,
  CreditCard,
  Wallet,
  Store as StoreIcon,
  Plus,
  RefreshCw
} from 'lucide-react';
import { useToast } from '../../shared/Toast';

interface CustomerCheckoutViewProps {
  onOrderPlaced: (orderId: string) => void;
  onBack: () => void;
}

export default function CustomerCheckoutView({
  onOrderPlaced,
  onBack,
}) {
  // ===== HOOKS =====
  const { items, storeId, storeName, getSubtotal, clearCart } = useCartStore();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // zone status للعنوان المختار (من العناوين المحفوظة)
  const [selectedZoneStatus, setSelectedZoneStatus] = useState<ZoneStatus>(null);
  // zone status للنقطة اللي اليوزر بيختارها على الخريطة (في وضع الإضافة)
  const [pickedZoneStatus, setPickedZoneStatus] = useState<ZoneStatus>(null);
  // أقرب منطقة تغطية لما الحالة تبقى 'outside' (للعنوان المختار أو النقطة المختارة)
  const [nearestZone, setNearestZone] = useState<NearestZoneMatch | null>(null);

  // حالة التسعير
  const [quote, setQuote] = useState<{
    subtotal: number;
    delivery_fee: number;
    total: number;
    discount: number;
    tip_amount: number;
    eta_minutes?: number;
    zone_id?: string;
  } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  // حالة الدفع
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash');
  const [tipAmount, setTipAmount] = useState(0);
  const [customerNotes, setCustomerNotes] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // حالة العنوان الجديد على الخريطة
  const [isSelectingLocation, setIsSelectingLocation] = useState(false);
  const [newAddress, setNewAddress] = useState<Partial<CustomerAddress>>({
    title: 'منزلي',
    address_line: '',
    building: '',
    floor: '',
    apartment: '',
    notes: '',
    lat: 30.0444,
    lng: 31.2357,
    is_default: false,
  });

  // تحميل العناوين
  const loadAddresses = async () => {
    const user = StorageRepo.getCurrentUser();
    if (!user) {
      setIsLoading(false);
      return;
    }
    try {
      const addrs = await fetchAddresses(user.id);
      setAddresses(addrs);
      if (addrs.length > 0) {
        const defaultAddr = addrs.find((a) => a.is_default) || addrs[0];
        setSelectedAddressId(defaultAddr.id);
      } else {
        setIsSelectingLocation(true);
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'فشل تحميل العناوين',
        message: err.message || 'تعذر تحميل العناوين المحفوظة',
      });
      setError(err.message || 'فشل تحميل العناوين');
    } finally {
      setIsLoading(false);
    }
  };

  // تحديث التسعير
  const updateQuote = async (addressId: string) => {
    if (!addressId || !storeId || items.length === 0) {
      setQuote(null);
      return;
    }
    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const result = await quoteOrderSecure({
        store_id: storeId,
        address_id: addressId,
        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          notes: item.notes,
        })),
        coupon_code: couponCode || undefined,
        tip_amount: tipAmount,
      });
      setQuote({
        subtotal: result.subtotal,
        delivery_fee: result.delivery_fee,
        total: result.total,
        discount: result.discount,
        tip_amount: result.tip_amount,
        eta_minutes: result.eta_minutes,
        zone_id: result.zone_id,
      });
    } catch (err: any) {
      setQuoteError(err.message || 'فشل حساب التسعير');
      setQuote(null);
      showToast({
        type: 'error',
        title: 'خطأ في التسعير',
        message: err.message || 'تعذر حساب تكلفة الطلب',
      });
    } finally {
      setQuoteLoading(false);
    }
  };

  // التأثيرات
  useEffect(() => {
    loadAddresses();
  }, []);

  useEffect(() => {
    if (selectedAddressId) {
      updateQuote(selectedAddressId);
    }
  }, [selectedAddressId, couponCode, tipAmount, items]);

  // فحص zone للعنوان المختار (المحفوظ في addresses)
  useEffect(() => {
    if (!selectedAddressId) {
      setSelectedZoneStatus(null);
      setNearestZone(null);
      return;
    }
    let cancelled = false;
    setSelectedZoneStatus('loading');
    setNearestZone(null);
    checkAddressZone(selectedAddressId)
      .then(async (zone) => {
        if (cancelled) return;
        setSelectedZoneStatus(zone || 'outside');
        if (!zone) {
          const addr = addresses.find((a) => a.id === selectedAddressId);
          if (addr?.lat != null && addr?.lng != null) {
            const nearest = await getNearestZone(addr.lat, addr.lng);
            if (!cancelled) setNearestZone(nearest);
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
        setSelectedZoneStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedAddressId]);

  // فحص zone للنقطة المختارة على الخريطة (في وضع إضافة عنوان جديد)
  const handleCheckoutMapClick = async (pickedLat: number, pickedLng: number) => {
    setNewAddress({ ...newAddress, lat: pickedLat, lng: pickedLng });
    setPickedZoneStatus('loading');
    setNearestZone(null);
    const zone = await checkPointInZone(pickedLat, pickedLng);
    setPickedZoneStatus(zone || 'outside');
    if (!zone) {
      const nearest = await getNearestZone(pickedLat, pickedLng);
      setNearestZone(nearest);
    }
  };

  // ===== دوال معالجة العنوان =====
  const handleSaveNewAddress = async () => {
    const user = StorageRepo.getCurrentUser();
    if (!user) {
      showToast({
        type: 'error',
        title: 'غير مسموح',
        message: 'يجب تسجيل الدخول أولاً',
      });
      return;
    }
    if (!newAddress.address_line) {
      showToast({
        type: 'error',
        title: 'بيانات ناقصة',
        message: 'يرجى إدخال اسم الشارع',
      });
      return;
    }
    if (!newAddress.lat || !newAddress.lng) {
      showToast({
        type: 'error',
        title: 'بيانات ناقصة',
        message: 'يرجى تحديد الموقع على الخريطة',
      });
      return;
    }
    if (pickedZoneStatus === 'outside') {
      if (newAddress.lat != null && newAddress.lng != null) {
        logZoneCoverageMiss(newAddress.lat, newAddress.lng);
      }
      showToast({
        type: 'error',
        title: 'خارج نطاق التغطية',
        message: nearestZone
          ? `هذا الموقع برّه نطاق مناطق التوصيل المسجلة حاليًا. أقرب منطقة تغطية: ${nearestZone.zone_name} (تبعد حوالي ${nearestZone.distance_km} كم).`
          : 'هذا الموقع برّه نطاق مناطق التوصيل المسجلة حاليًا. يرجى اختيار موقع آخر على الخريطة.',
      });
      return;
    }
    if (pickedZoneStatus === 'loading') {
      showToast({
        type: 'error',
        title: 'برجاء الانتظار',
        message: 'جاري التحقق من نطاق التوصيل لهذا الموقع...',
      });
      return;
    }

    try {
      const saved = await upsertAddress({
        id: undefined,
        user_id: user.id,
        title: newAddress.title || 'عنوان جديد',
        address_line: newAddress.address_line,
        building: newAddress.building || null,
        floor: newAddress.floor || null,
        apartment: newAddress.apartment || null,
        notes: newAddress.notes || null,
        lat: newAddress.lat,
        lng: newAddress.lng,
        is_default: newAddress.is_default || false,
      });
      setAddresses((prev) => [saved, ...prev]);
      setSelectedAddressId(saved.id);
      setIsSelectingLocation(false);
      showToast({
        type: 'success',
        title: 'تم الحفظ',
        message: 'تم حفظ العنوان بنجاح',
      });
      await updateQuote(saved.id);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'فشل الحفظ',
        message: err.message || 'تعذر حفظ العنوان',
      });
    }
  };

  // ===== تقديم الطلب =====
  const handleSubmitOrder = async () => {
    if (!storeId || items.length === 0) {
      setSubmitError('السلة فارغة');
      showToast({
        type: 'error',
        title: 'خطأ',
        message: 'السلة فارغة',
      });
      return;
    }
    if (!selectedAddressId) {
      setSubmitError('يرجى تحديد عنوان التوصيل');
      showToast({
        type: 'error',
        title: 'بيانات ناقصة',
        message: 'يرجى تحديد عنوان التوصيل',
      });
      return;
    }
    if (!quote) {
      setSubmitError('يرجى انتظار حساب التسعير');
      showToast({
        type: 'error',
        title: 'خطأ',
        message: 'يرجى انتظار حساب التسعير',
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
      if (!selectedAddress) {
        throw new Error('العنوان المحدد غير موجود');
      }

      const result = await createSecureOrder({
        store_id: storeId,
        address: selectedAddress,
        payment_method: paymentMethod,
        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          notes: item.notes,
        })),
        coupon_code: couponCode || undefined,
        customer_notes: customerNotes || undefined,
        tip_amount: tipAmount,
      });

      clearCart();
      showToast({
        type: 'success',
        title: 'تم الطلب',
        message: `تم إنشاء الطلب #${result.code} بنجاح`,
      });
      onOrderPlaced(result.order_id);
    } catch (err: any) {
      const msg = err.message || 'فشل إنشاء الطلب';
      setSubmitError(msg);
      showToast({
        type: 'error',
        title: 'فشل الطلب',
        message: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== حالة التحميل =====
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-600">جاري تحميل بيانات الدفع...</p>
      </div>
    );
  }

  // ===== حالة الخطأ العام =====
  if (error) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-800">حدث خطأ</h3>
        <p className="text-sm text-slate-600">{error}</p>
        <button
          onClick={() => { setError(null); loadAddresses(); }}
          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          إعادة المحاولة
        </button>
      </div>
    );
  }

  // ===== حالة عدم وجود منتجات =====
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <StoreIcon className="w-16 h-16 text-slate-300 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 text-lg">سلة التسوق فارغة</h3>
        <p className="text-sm text-slate-500">أضف منتجات إلى السلة قبل البدء بعملية الدفع.</p>
        <button onClick={onBack} className="mt-4 px-6 py-2 bg-slate-200 rounded-xl text-sm font-bold">
          العودة للتسوق
        </button>
      </div>
    );
  }

  // ===== عرض الخيارات =====
  const subtotal = getSubtotal();

  return (
    <div className="max-w-4xl mx-auto space-y-6 dir-rtl pb-16">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-600 hover:text-slate-900">
          <ArrowRight className="w-4 h-4" />
          <span className="text-sm font-bold">العودة إلى السلة</span>
        </button>
        <h1 className="text-xl font-black text-slate-900">إتمام الطلب</h1>
      </div>

      {/* معلومات المتجر */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center gap-3">
        <StoreIcon className="w-6 h-6 text-emerald-600" />
        <div>
          <p className="font-bold text-slate-900">{storeName || 'متجر'}</p>
          <p className="text-xs text-slate-500">{items.length} منتجات • {formatCurrency(subtotal)}</p>
        </div>
      </div>

      {/* اختيار العنوان أو إضافة جديد */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <MapPin className="w-5 h-5 text-emerald-600" />
            <span>عنوان التوصيل</span>
          </h3>
          <button
            onClick={() => setIsSelectingLocation(true)}
            className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            إضافة عنوان جديد
          </button>
        </div>

        {isSelectingLocation ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="اسم العنوان (مثال: منزلي، العمل)"
                value={newAddress.title || ''}
                onChange={(e) => setNewAddress({ ...newAddress, title: e.target.value })}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <input
                type="text"
                placeholder="الشارع والمبنى"
                value={newAddress.address_line || ''}
                onChange={(e) => setNewAddress({ ...newAddress, address_line: e.target.value })}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <input
                type="text"
                placeholder="المبنى (اختياري)"
                value={newAddress.building || ''}
                onChange={(e) => setNewAddress({ ...newAddress, building: e.target.value })}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <input
                type="text"
                placeholder="الدور (اختياري)"
                value={newAddress.floor || ''}
                onChange={(e) => setNewAddress({ ...newAddress, floor: e.target.value })}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <input
                type="text"
                placeholder="الشقة (اختياري)"
                value={newAddress.apartment || ''}
                onChange={(e) => setNewAddress({ ...newAddress, apartment: e.target.value })}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <input
                type="text"
                placeholder="ملاحظات إضافية (اختياري)"
                value={newAddress.notes || ''}
                onChange={(e) => setNewAddress({ ...newAddress, notes: e.target.value })}
                className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <LeafletMap
              centerLat={newAddress.lat || 30.0444}
              centerLng={newAddress.lng || 31.2357}
              zoom={14}
              interactiveSelect={true}
              onLocationSelect={handleCheckoutMapClick}
              height="260px"
              className="mt-2"
            />

            {/* badge zone تحت الخريطة (feedback فوري) */}
            <ZoneStatusBadge status={pickedZoneStatus} />
            {pickedZoneStatus === 'outside' && nearestZone && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                أقرب منطقة تغطية: <span className="font-bold text-slate-700">{nearestZone.zone_name}</span> — تبعد حوالي {nearestZone.distance_km} كم
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleSaveNewAddress}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-colors"
              >
                حفظ العنوان واستخدامه
              </button>
              <button
                onClick={() => setIsSelectingLocation(false)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {addresses.length === 0 ? (
              <p className="text-sm text-slate-500">لا توجد عناوين محفوظة. أضف عنواناً جديداً.</p>
            ) : (
              addresses.map((addr) => (
                <label
                  key={addr.id}
                  className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                    selectedAddressId === addr.id ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    value={addr.id}
                    checked={selectedAddressId === addr.id}
                    onChange={() => setSelectedAddressId(addr.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 text-sm">
                    <p className="font-bold">{addr.title}</p>
                    <p className="text-slate-600">{addr.address_line}</p>
                    {addr.building && <p className="text-xs text-slate-500">مبنى: {addr.building}</p>}
                    {addr.floor && <p className="text-xs text-slate-500">دور: {addr.floor}</p>}
                    {addr.apartment && <p className="text-xs text-slate-500">شقة: {addr.apartment}</p>}
                    {addr.notes && <p className="text-xs text-amber-700">ملاحظة: {addr.notes}</p>}
                  </div>
                  {addr.is_default && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold shrink-0">
                      افتراضي
                    </span>
                  )}
                </label>
              ))
            )}

            {/* badge zone للعنوان المختار — بيظهر تحت قائمة العناوين */}
            {selectedAddressId && (
              <div className="pt-2">
                <ZoneStatusBadge status={selectedZoneStatus} />
                {selectedZoneStatus === 'outside' && nearestZone && (
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    أقرب منطقة تغطية: <span className="font-bold text-slate-700">{nearestZone.zone_name}</span> — تبعد حوالي {nearestZone.distance_km} كم
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* التسعير والخصم */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Truck className="w-5 h-5 text-blue-600" />
          <span>تفاصيل التكلفة والتوصيل</span>
        </h3>

        {/* كود الخصم */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="أدخل كود الخصم (اختياري)"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <button
            onClick={() => updateQuote(selectedAddressId)}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-md transition-colors"
          >
            تطبيق
          </button>
        </div>

        {/* حالة التسعير */}
        {quoteLoading ? (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">جاري حساب التكلفة...</span>
          </div>
        ) : quoteError ? (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{quoteError}</span>
          </div>
        ) : quote ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">المجموع الفرعي</span>
              <span className="font-bold">{formatCurrency(quote.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">رسوم التوصيل</span>
              <span className="font-bold">{formatCurrency(quote.delivery_fee)}</span>
            </div>
            {quote.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>خصم</span>
                <span className="font-bold">-{formatCurrency(quote.discount)}</span>
              </div>
            )}
            {tipAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">إكرامية</span>
                <span className="font-bold">{formatCurrency(tipAmount)}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-base">
              <span>الإجمالي</span>
              <span className="text-emerald-700">{formatCurrency(quote.total)}</span>
            </div>
            {quote.eta_minutes && (
              <p className="text-xs text-blue-600 font-bold">
                ⏱️ الوقت المتوقع للتوصيل: {quote.eta_minutes} دقيقة
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">يرجى تحديد عنوان التوصيل لحساب التكلفة.</p>
        )}

        {/* طريقة الدفع - إخفاء الأونلاين مؤقتاً */}
        <div className="border-t border-slate-200 pt-4">
          <p className="font-bold text-slate-900 text-sm mb-2">طريقة الدفع</p>
          <div className="flex gap-3">
            <button
              onClick={() => setPaymentMethod('cash')}
              className={`flex-1 p-3 border rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                paymentMethod === 'cash'
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Wallet className="w-4 h-4" />
              كاش عند الاستلام
            </button>
            <button
              disabled
              className="flex-1 p-3 border rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-slate-100 text-slate-400 cursor-not-allowed"
              title="قريباً"
            >
              <CreditCard className="w-4 h-4" />
              دفع إلكتروني <span className="text-[10px] bg-slate-200 px-1.5 rounded-full">قريباً</span>
            </button>
          </div>
        </div>

        {/* إكرامية */}
        <div className="border-t border-slate-200 pt-4">
          <label className="font-bold text-slate-900 text-sm block mb-2">إكرامية (اختياري)</label>
          <div className="flex gap-2">
            {[0, 5, 10, 15, 20].map((val) => (
              <button
                key={val}
                onClick={() => setTipAmount(val)}
                className={`px-3 py-1.5 rounded-xl text-sm font-bold border transition-colors ${
                  tipAmount === val
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {val === 0 ? 'بدون' : `${val} ج.م`}
              </button>
            ))}
          </div>
        </div>

        {/* ملاحظات العميل */}
        <div className="border-t border-slate-200 pt-4">
          <label className="font-bold text-slate-900 text-sm block mb-1">ملاحظات للكابتن أو المحل</label>
          <textarea
            rows={2}
            placeholder="أي تعليمات إضافية للتوصيل أو الطلب..."
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      {/* زر التأكيد */}
      <button
        onClick={handleSubmitOrder}
        disabled={isSubmitting || !quote || !!quoteError || !selectedAddressId || selectedZoneStatus === 'outside'}
        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-base rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>جاري إنشاء الطلب...</span>
          </>
        ) : (
          <>
            <span>تأكيد الطلب</span>
            <CheckCircle2 className="w-5 h-5" />
          </>
        )}
      </button>

      {selectedZoneStatus === 'outside' && !submitError && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm font-bold flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <span>
            التوصيل غير متاح لهذا العنوان حاليًا — برّه نطاق مناطق التغطية المسجلة. يرجى اختيار عنوان آخر.
            {nearestZone && (
              <> أقرب منطقة تغطية متاحة: <b>{nearestZone.zone_name}</b> (تبعد حوالي {nearestZone.distance_km} كم).</>
            )}
          </span>
        </div>
      )}

      {submitError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}
    </div>
  );
};