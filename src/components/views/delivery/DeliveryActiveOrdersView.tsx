import React, { useState, useEffect } from 'react';
import { StorageRepo } from '../../../lib/storage';
import { updateSupabaseOrderLocation } from '../../../lib/supabase';
import { Order } from '../../../types/domain';
import { formatCurrency, formatDateArabic } from '../../../lib/formatters';
import { Loader2, MapPin, Truck, Clock, CheckCircle2, Navigation, AlertCircle, MessageCircle } from 'lucide-react';
import OrderChatPanel from '../../shared/OrderChatPanel';

interface DeliveryActiveOrdersViewProps {
  onNavigate: (tab: string) => void;
}

export default function DeliveryActiveOrdersView({ onNavigate }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationWatchId, setLocationWatchId] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [lastLocation, setLastLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const user = StorageRepo.getCurrentUser();
      if (!user) {
        setError('يجب تسجيل الدخول');
        return;
      }
      const allOrders = await StorageRepo.refreshOrders();
      const agentOrders = allOrders.filter(
        (o) => o.delivery_agent_id === user.id && !['delivered', 'cancelled', 'rejected'].includes(o.status)
      );
      setOrders(agentOrders);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل الطلبات');
    } finally {
      setLoading(false);
    }
  };

  // ===== تحديث موقع المندوب =====
  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocationError('المتصفح لا يدعم تحديد الموقع');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLastLocation({ lat: latitude, lng: longitude });
        setLocationError(null);

        // إرسال الموقع للطلبات النشطة (بـ throttle)
        const activeOrders = orders.filter(
          (o) => ['assigned', 'picked_up', 'on_the_way'].includes(o.status)
        );
        activeOrders.forEach((order) => {
          updateSupabaseOrderLocation(order.id, latitude, longitude).catch((err) =>
            console.warn('Failed to update location for order', order.id, err)
          );
        });
      },
      (err) => {
        setLocationError(err.message || 'فشل الحصول على الموقع');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    setLocationWatchId(watchId);

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [orders]);

  useEffect(() => {
    loadOrders();
  }, []);

  // ===== تحديث حالة الطلب =====
  const updateOrderStatus = async (orderId: string, status: 'picked_up' | 'on_the_way' | 'delivered') => {
    try {
      await StorageRepo.updateOrderStatus(orderId, status);
      await loadOrders();
    } catch (err: any) {
      alert(`فشل تحديث الحالة: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-600">جاري تحميل الطلبات النشطة...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <p className="text-sm text-slate-600">{error}</p>
        <button onClick={loadOrders} className="px-5 py-2 bg-orange-600 text-white rounded-xl text-sm font-bold">
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 dir-rtl pb-16">
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-2xl p-6 shadow-xl">
        <h1 className="text-xl font-black flex items-center gap-2">
          <Truck className="w-6 h-6" />
          الطلبات النشطة
        </h1>
        <p className="text-xs text-orange-100 mt-1">
          {orders.length} طلب قيد التوصيل
        </p>
        {locationError && (
          <div className="mt-2 text-xs bg-rose-500/30 p-2 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>خطأ في الموقع: {locationError}</span>
          </div>
        )}
        {lastLocation && (
          <div className="mt-2 text-xs bg-white/20 p-2 rounded-xl flex items-center gap-2">
            <Navigation className="w-4 h-4" />
            <span>موقعك الحالي: {lastLocation.lat.toFixed(6)}, {lastLocation.lng.toFixed(6)}</span>
          </div>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <Truck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-slate-800 text-lg">لا توجد طلبات نشطة</h3>
          <p className="text-sm text-slate-500">جميع الطلبات مكتملة أو لم يتم إسنادها إليك بعد.</p>
        </div>
      ) : (
        orders.map((order) => (
          <div key={order.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono font-black text-slate-900">#{order.order_number}</span>
                <span className={`mr-2 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  order.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                  order.status === 'picked_up' ? 'bg-amber-100 text-amber-800' :
                  'bg-emerald-100 text-emerald-800'
                }`}>
                  {order.status === 'assigned' ? 'مُسنَد' :
                   order.status === 'picked_up' ? 'تم الاستلام' :
                   'في الطريق'}
                </span>
              </div>
              <div className="text-xs text-slate-500">{formatDateArabic(order.created_at)}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500">العميل:</span>
                <span className="font-bold mr-1">{order.customer_name}</span>
              </div>
              <div>
                <span className="text-slate-500">المتجر:</span>
                <span className="font-bold mr-1">{order.store_name}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500">العنوان:</span>
                <span className="mr-1">{order.delivery_address.address_line}</span>
              </div>
            </div>

            <button
              onClick={() => setChatOrderId(order.id)}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>تواصل مع العميل</span>
            </button>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              {order.status === 'assigned' && (
                <button
                  onClick={() => updateOrderStatus(order.id, 'picked_up')}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 inline mr-1" />
                  تأكيد استلام الطلب من المتجر
                </button>
              )}
              {order.status === 'picked_up' && (
                <button
                  onClick={() => updateOrderStatus(order.id, 'on_the_way')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
                >
                  <Navigation className="w-4 h-4 inline mr-1" />
                  بدء التوصيل للعميل
                </button>
              )}
              {order.status === 'on_the_way' && (
                <button
                  onClick={() => updateOrderStatus(order.id, 'delivered')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4 inline mr-1" />
                  تأكيد التسليم للعميل
                </button>
              )}
            </div>
          </div>
        ))
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