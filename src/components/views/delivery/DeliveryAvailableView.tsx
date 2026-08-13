import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { subscribeSupabase } from '../../../lib/supabase';
import { Order, DeliveryAgent } from '../../../types/domain';
import { formatCurrency, formatDateArabic, calculateDistanceKm } from '../../../lib/formatters';
import { Bike, Store, MapPin, CheckCircle2, ChevronRight, Phone } from 'lucide-react';
import { useToast } from '../../shared/Toast';

interface DeliveryAvailableViewProps {
  onOrderClaimed: (orderId: string) => void;
}

export default function DeliveryAvailableView({ onOrderClaimed }) {
  const currentUser = StorageRepo.getCurrentUser();
  const agent = StorageRepo.getAgentByUserId(currentUser?.id || 'usr-agent-1') || StorageRepo.getAgents()[0];
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);

  useEffect(() => {
    const fetchAvailable = () => {
      const allOrders = StorageRepo.getOrders();
      const readyList = allOrders.filter(
        (o) => o.status === 'ready' && (!o.delivery_agent_id || o.delivery_agent_id === '')
      );
      setAvailableOrders(readyList);
    };

    fetchAvailable();
    StorageRepo.refreshOrders();

    const unsubscribeStorage = subscribeToStorageChange((detail) => {
      if (detail.entityType === 'order') fetchAvailable();
    });

    const unsubscribeRealtime = subscribeSupabase<Order>('orders', () => {
      StorageRepo.refreshOrders();
    });

    return () => {
      unsubscribeStorage();
      unsubscribeRealtime();
    };
  }, []);

  const { showToast } = useToast();

  const handleClaimOrder = async (order: Order) => {
    if (!agent) {
      showToast({ type: 'error', title: 'خطأ', message: 'يرجى تسجيل الدخول كمندوب توصيل معتمد أولاً' });
      return;
    }

    try {
      await StorageRepo.updateOrderStatus(order.id, 'assigned', `تم تعيين الكابتن ${agent.name} للتوصيل`, {
        delivery_agent_id: agent.id,
        delivery_agent_name: agent.name,
        delivery_agent_phone: agent.phone,
        delivery_agent_vehicle: agent.vehicle_type,
        delivery_agent_lat: agent.current_lat || 30.0450,
        delivery_agent_lng: agent.current_lng || 31.2370,
      });
      showToast({ type: 'success', title: 'تم', message: 'تم استلام الطلب بنجاح' });
      onOrderClaimed(order.id);
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل الاستلام', message: err.message || 'تعذر استلام الطلب' });
    }
  };


  return (
    <div className="max-w-2xl mx-auto space-y-6 dir-rtl pb-20">
      <div>
        <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <Bike className="w-6 h-6 text-orange-600" />
          <span>الطلبات المتاحة للتوصيل الآن</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          اختر الطلب الأقرب لموقعك واضغط قبول لبدء رحلة التوصيل فوراً
        </p>
      </div>

      {availableOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-400 mx-auto mb-3">
            <Bike className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">لا توجد طلبات جاهزة حالياً</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            ستظهر الطلبات الجديدة فور قيام المتاجر المجاورة بتجهيز المنتجات ووضعها بوضع "جاهز للتوصيل".
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {availableOrders.map((order) => {
            const distance = calculateDistanceKm(
              agent?.current_lat || 30.0450,
              agent?.current_lng || 31.2370,
              order.store_lat || 30.0444,
              order.store_lng || 31.2357
            );

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 hover:border-orange-300 transition-all"
              >
                {/* Store & Distance Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">{order.store_name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{order.store_address}</p>
                    </div>
                  </div>

                  <span className="bg-orange-50 text-orange-800 border border-orange-200 text-xs font-bold px-2.5 py-1 rounded-xl">
                    مسافة المحل: ~{distance} كم
                  </span>
                </div>

                {/* Dropoff Location Details */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs space-y-1">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    موقع التسليم للعميل:
                  </span>
                  <p className="text-slate-800 font-semibold">{order.delivery_address.title} - {order.delivery_address.address_line}</p>
                </div>

                {/* Earnings & Claim CTA */}
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <span className="text-[11px] text-slate-500 block">عمولة التوصيل المكتسبة:</span>
                    <span className="font-black text-emerald-700 text-base">
                      {formatCurrency(order.delivery_fee)}
                    </span>
                  </div>

                  <button
                    onClick={() => handleClaimOrder(order)}
                    className="px-5 py-3 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs rounded-xl shadow-lg shadow-orange-600/20 transition-all flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>قبول الطلب وبدء التوصيل 🛵</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
