import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { Order, OrderStatus } from '../../../types/domain';
import { formatCurrency, formatPhoneNumber } from '../../../lib/formatters';
import { LeafletMap } from '../../shared/LeafletMap';
import { Bike, Store, MapPin, Phone, CheckCircle2, Package, Navigation, DollarSign, AlertCircle } from 'lucide-react';
import { useToast } from '../../shared/Toast';

interface DeliveryActiveViewProps {
  onTripCompleted: () => void;
}

export const DeliveryActiveView: React.FC<DeliveryActiveViewProps> = ({ onTripCompleted }) => {
  const currentUser = StorageRepo.getCurrentUser();
  const agent = StorageRepo.getAgentByUserId(currentUser?.id || 'usr-agent-1') || StorageRepo.getAgents()[0];
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  useEffect(() => {
    const fetchActive = () => {
      if (agent) {
        const allOrders = StorageRepo.getOrders();
        const active = allOrders.find(
          (o) => o.delivery_agent_id === agent.id && !['delivered', 'cancelled', 'rejected'].includes(o.status)
        );
        setActiveOrder(active || null);
      }
    };

    fetchActive();
    const unsubscribe = subscribeToStorageChange(() => {
      fetchActive();
    });
    return unsubscribe;
  }, [agent]);

  if (!activeOrder) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl p-12 text-center border border-slate-200 dir-rtl my-8 space-y-3">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto">
          <Bike className="w-8 h-8" />
        </div>
        <h3 className="font-extrabold text-slate-800 text-base">لا توجد رحلة توصيل نشطة حالياً</h3>
        <p className="text-xs text-slate-500">
          يمكنك الانتقال لقائمة "الطلبات المتاحة" وقبول طلبات جديدة.
        </p>
      </div>
    );
  }

  const { showToast } = useToast();

  const handleUpdateTripStatus = async (nextStatus: OrderStatus, note: string) => {
    try {
      const updated = await StorageRepo.updateOrderStatus(activeOrder.id, nextStatus, note);
      if (nextStatus === 'delivered') {
        showToast({ type: 'success', title: 'تم', message: 'تم تسليم الطلب بنجاح' });
        setTimeout(() => onTripCompleted(), 800);
      } else if (updated) {
        setActiveOrder(updated);
        showToast({ type: 'success', title: 'تم التحديث', message: `تم تحديث الحالة إلى ${nextStatus}` });
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل التحديث', message: err.message || 'تعذر تحديث حالة الرحلة' });
    }
  };

  const mapMarkers: {
    lat: number;
    lng: number;
    title: string;
    popupText?: string;
    type?: 'store' | 'customer' | 'agent';
  }[] = [];

  if (activeOrder.store_lat && activeOrder.store_lng) {
    mapMarkers.push({
      lat: activeOrder.store_lat,
      lng: activeOrder.store_lng,
      title: activeOrder.store_name || 'المتجر',
      popupText: `موقع الاستلام: ${activeOrder.store_address || 'غير متاح'}`,
      type: 'store' as const,
    });
  }

  if (activeOrder.delivery_address?.lat && activeOrder.delivery_address?.lng) {
    mapMarkers.push({
      lat: activeOrder.delivery_address.lat,
      lng: activeOrder.delivery_address.lng,
      title: 'عنوان العميل والتسليم',
      popupText: activeOrder.delivery_address.address_line || 'غير متاح',
      type: 'customer' as const,
    });
  }

  if (activeOrder.delivery_agent_lat && activeOrder.delivery_agent_lng) {
    mapMarkers.push({
      lat: activeOrder.delivery_agent_lat,
      lng: activeOrder.delivery_agent_lng,
      title: 'موقعك الحالي',
      popupText: 'أنت هنا 🛵',
      type: 'agent' as const,
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 dir-rtl pb-24">
      {/* Header Info */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <span className="text-[10px] text-slate-400 block">رحلة التوصيل الحالية</span>
          <h1 className="font-black text-slate-900 text-base flex items-center gap-2">
            <span>الطلب #{activeOrder.order_number}</span>
            <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
              عمولة الرحلة: {formatCurrency(activeOrder.delivery_fee)}
            </span>
          </h1>
        </div>

        <span className="bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-xl">
          تحصيل كاش: {formatCurrency(activeOrder.total)}
        </span>
      </div>

      {/* Interactive Map */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-xs space-y-2">
        {mapMarkers.length > 0 ? (
          <LeafletMap markers={mapMarkers} showRoute={true} height="280px" />
        ) : (
          <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl">
            لم يحدد العميل أو المتجر موقعاً على الخريطة
          </div>
        )}
      </div>

      {/* Pickup Store & Dropoff Customer Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Store Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
              <Store className="w-4 h-4 text-blue-600" />
              1. استلام من المحل
            </span>
            {activeOrder.store_phone ? (
              <a
                href={`tel:${activeOrder.store_phone}`}
                className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>اتصال</span>
              </a>
            ) : (
              <span className="text-[10px] text-slate-400">الهاتف غير متاح</span>
            )}
          </div>

          <div>
            <h4 className="font-extrabold text-slate-900 text-xs">{activeOrder.store_name || 'غير متاح'}</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">{activeOrder.store_address || 'غير متاح'}</p>
          </div>
        </div>

        {/* Customer Card */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              2. التسليم للعميل
            </span>
            {activeOrder.customer_phone ? (
              <a
                href={`tel:${activeOrder.customer_phone}`}
                className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center gap-1"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>اتصال</span>
              </a>
            ) : (
              <span className="text-[10px] text-slate-400">الهاتف غير متاح</span>
            )}
          </div>

          <div>
            <h4 className="font-extrabold text-slate-900 text-xs">{activeOrder.customer_name || 'عميل'}</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">{activeOrder.delivery_address?.address_line || 'غير متاح'}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {activeOrder.delivery_address?.building ? `عمارة: ${activeOrder.delivery_address.building}` : 'العمارة: غير متاح'}
              {' | '}
              {activeOrder.delivery_address?.floor ? `دور: ${activeOrder.delivery_address.floor}` : 'الدور: غير متاح'}
              {' | '}
              {activeOrder.delivery_address?.apartment ? `شقة: ${activeOrder.delivery_address.apartment}` : 'الشقة: غير متاح'}
            </p>
          </div>
        </div>
      </div>

      {/* Step Action Buttons Sequence */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl space-y-4 border border-slate-800">
        <h3 className="font-extrabold text-sm text-center text-slate-200">
          خطوات إكمال الرحلة للتحديث المباشر:
        </h3>

        <div className="space-y-3">
          {['assigned', 'ready'].includes(activeOrder.status) && (
            <button
              onClick={() => handleUpdateTripStatus('picked_up', 'وصل المندوب للمتجر واستلم الشحنة')}
              className="w-full py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-black text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Package className="w-5 h-5" />
              <span>وصلت للمتجر واستلمت الطلب 📦</span>
            </button>
          )}

          {activeOrder.status === 'picked_up' && (
            <button
              onClick={() => handleUpdateTripStatus('on_the_way', 'المندوب في الطريق لعنوان العميل')}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Navigation className="w-5 h-5" />
              <span>في الطريق لعنوان العميل 🛵</span>
            </button>
          )}

          {activeOrder.status === 'on_the_way' && (
            <button
              onClick={() => handleUpdateTripStatus('delivered', 'تم التسليم للعميل وتأكيد استلام المبلغ نقداً')}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>تم التسليم بنجاح وتأكيد الكاش ({formatCurrency(activeOrder.total)}) ✓</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
