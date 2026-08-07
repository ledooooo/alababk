import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { subscribeSupabase } from '../../../lib/supabase';
import { Store, Order, Product } from '../../../types/domain';
import { formatCurrency, formatDateArabic } from '../../../lib/formatters';
import {
  Store as StoreIcon,
  ShoppingBag,
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Package,
  ArrowUpRight,
  Bell,
  Loader2
} from 'lucide-react';

interface StoreDashboardViewProps {
  onNavigate: (tab: string) => void;
}

export const StoreDashboardView: React.FC<StoreDashboardViewProps> = ({ onNavigate }) => {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const loadData = async () => {
    setLoading(true);
    const myStore = await StorageRepo.getMyStore();
    setStore(myStore);
    if (myStore) {
      const storeOrders = StorageRepo.getOrders().filter((o) => o.store_id === myStore.id);
      setOrders(storeOrders);
      const storeProds = StorageRepo.getProducts(myStore.id);
      setProducts(storeProds);
    } else {
      setOrders([]);
      setProducts([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    const unsubscribeStorage = subscribeToStorageChange(() => {
      loadData();
    });

    const currentUser = StorageRepo.getCurrentUser();
    const filter = currentUser ? `owner_id=eq.${currentUser.id}` : undefined;
    const unsubscribeRealtimeStore = subscribeSupabase<Store>(
      'stores',
      () => { loadData(); },
      filter
    );

    const unsubscribeRealtimeOrders = subscribeSupabase<Order>(
      'orders',
      () => { loadData(); },
      store ? `store_id=eq.${store.id}` : undefined
    );

    const unsubscribeRealtimeProducts = subscribeSupabase<Product>(
      'products',
      () => { loadData(); },
      store ? `store_id=eq.${store.id}` : undefined
    );

    return () => {
      unsubscribeStorage();
      unsubscribeRealtimeStore();
      unsubscribeRealtimeOrders();
      unsubscribeRealtimeProducts();
    };
  }, []);

  const toggleStoreOpen = async () => {
    if (!store) return;
    try {
      const updated = { ...store, is_open: !store.is_open };
      await StorageRepo.saveStore(updated);
    } catch (err: any) {
      alert(`تعذر تغيير حالة المتجر: ${err.message || 'خطأ غير معروف'}`);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-600">جاري تحميل بيانات المتجر...</p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <StoreIcon className="w-16 h-16 text-slate-300 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 text-lg">لا يوجد متجر مرتبط بحسابك</h3>
        <p className="text-sm text-slate-500 mt-1">يمكنك تقديم طلب لإنشاء متجر جديد والانضمام إلى منصة التوصيل.</p>
        <button
          onClick={() => onNavigate('apply-store')}
          className="mt-4 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all"
        >
          تقديم طلب انضمام متجر
        </button>
      </div>
    );
  }

  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const preparingOrders = orders.filter((o) => ['accepted', 'preparing'].includes(o.status));
  const readyOrders = orders.filter((o) => o.status === 'ready');
  const completedOrders = orders.filter((o) => o.status === 'delivered');

  const todayRevenue = completedOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const lowStockProducts = products.filter((p) => p.stock <= 5);

  return (
    <div className="space-y-6 dir-rtl pb-16">
      {/* Store Owner Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={store.logo_url}
            alt={store.name}
            className="w-16 h-16 object-cover rounded-2xl border-2 border-white/20 shadow-lg"
          />
          <div>
            <h1 className="text-xl sm:text-2xl font-black">{store.name}</h1>
            <p className="text-xs text-slate-300 mt-1">{store.address}</p>
          </div>
        </div>

        {/* Store Open/Closed Toggle */}
        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/15">
          <div className="text-right">
            <span className="block text-[11px] text-slate-300 font-medium">حالة الاستقبال اليوم:</span>
            <span className="font-bold text-xs">
              {store.is_open ? 'مفتوح ويستقبل الطلبات' : 'مغلق مؤقتاً'}
            </span>
          </div>

          <button
            onClick={toggleStoreOpen}
            className={`px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-md ${
              store.is_open
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
          >
            {store.is_open ? 'إغلاق المتجر' : 'فتح المتجر'}
          </button>
        </div>
      </div>

      {/* New Orders Pending Alert Banner */}
      {pendingOrders.length > 0 && (
        <div
          onClick={() => onNavigate('store-orders')}
          className="bg-amber-500 hover:bg-amber-600 text-white rounded-2xl p-4 shadow-md flex items-center justify-between cursor-pointer transition-all animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl">
              <Bell className="w-6 h-6 text-white animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                تنبيه: لديك {pendingOrders.length} طلبات جديدة بانتظار قبولك!
              </h3>
              <p className="text-xs text-amber-100">انقر هنا لمراجعتها وقبولها للبدء بالتحضير فوراً.</p>
            </div>
          </div>
          <ArrowUpRight className="w-6 h-6 text-white shrink-0" />
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold">مبيعات اليوم المحققة</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900">{formatCurrency(todayRevenue)}</div>
          <p className="text-[11px] text-slate-400">من الطلبات المكتملة والمجباة</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold">طلبات جديدة معلقة</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl font-black text-amber-600">{pendingOrders.length}</div>
          <p className="text-[11px] text-slate-400">تتطلب الموافقة والقبول</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold">طلبات قيد التحضير والتجهيز</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl font-black text-blue-600">{preparingOrders.length}</div>
          <p className="text-[11px] text-slate-400">جاري تعبئتها بالمحل</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold">إجمالي منتجاتك</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900">{products.length}</div>
          <p className="text-[11px] text-slate-400">
            {products.filter((p) => p.is_active).length} منتج نشط بالمحل
          </p>
        </div>
      </div>

      {/* Grid: Live Incoming Orders + Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Active Orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-600" />
              <span>أحدث الطلبات الواردة للمحل</span>
            </h3>

            <button
              onClick={() => onNavigate('store-orders')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              عرض كل الطلبات ←
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              لا توجد طلبات مسجلة حتى الآن.
            </div>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  onClick={() => onNavigate('store-orders')}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3 cursor-pointer hover:border-blue-300 transition-colors text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-slate-900">#{order.order_number}</span>
                      <span className="font-bold text-slate-800">{order.customer_name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {order.items.length} منتجات • {formatCurrency(order.total)} • {formatDateArabic(order.created_at)}
                    </p>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    order.status === 'pending'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {order.status === 'pending' ? 'جديد بانتظار القبول' : order.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Low Stock Alerts */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span>تنبيهات المخزون المنخفض</span>
            </h3>

            <button
              onClick={() => onNavigate('store-products')}
              className="text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              تعديل الكميات
            </button>
          </div>

          {lowStockProducts.length === 0 ? (
            <div className="py-6 text-center text-emerald-700 text-xs bg-emerald-50 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
              <span>جميع الكميات متوفرة بوضع ممتاز!</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {lowStockProducts.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-xs">
                  <div className="truncate max-w-[160px]">
                    <h5 className="font-bold text-slate-900 truncate">{p.name}</h5>
                    <p className="text-[10px] text-slate-500">{formatCurrency(p.price)} / {p.unit}</p>
                  </div>
                  <span className="font-black text-rose-700 bg-white px-2 py-1 rounded-lg border border-rose-200">
                    متبقي {p.stock}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};