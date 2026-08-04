import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { Order } from '../../../types/domain';
import { formatCurrency, formatDateArabic } from '../../../lib/formatters';
import { ORDER_STATUS_LABELS, getOrderStatusConfig } from '../../../lib/constants';
import { Pagination } from '../../shared/Pagination';
import {
  ListOrdered,
  Store,
  ChevronLeft,
  Clock,
  CheckCircle2,
  Package,
  ArrowRight,
  ShoppingBag
} from 'lucide-react';

interface CustomerOrdersViewProps {
  onSelectOrder: (orderId: string) => void;
  onBrowseStores: () => void;
}

export const CustomerOrdersView: React.FC<CustomerOrdersViewProps> = ({
  onSelectOrder,
  onBrowseStores,
}) => {
  const currentUser = StorageRepo.getCurrentUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  useEffect(() => {
    const fetchOrders = () => {
      const user = StorageRepo.getCurrentUser();
      if (user) {
        const userOrders = StorageRepo.getOrders().filter((o) => o.customer_id === user.id);
        setOrders(userOrders);
      }
    };

    fetchOrders();
    const unsubscribe = subscribeToStorageChange(() => {
      fetchOrders();
    });
    return unsubscribe;
  }, []);

  const filteredOrders = orders.filter((order) => {
    if (activeTab === 'active') {
      return !['delivered', 'cancelled', 'rejected'].includes(order.status);
    }
    if (activeTab === 'completed') {
      return ['delivered', 'cancelled', 'rejected'].includes(order.status);
    }
    return true;
  });

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6 dir-rtl pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <ListOrdered className="w-6 h-6 text-emerald-600" />
            <span>سجل طلباتي</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            تابع حالة طلباتك الحالية واطلع على تفاصيل وسجل الطلبات السابقة
          </p>
        </div>

        <button
          onClick={onBrowseStores}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>طلب جديد</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          جميع الطلبات ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'active'
              ? 'bg-emerald-600 text-white'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          الطلبات النشطة (
          {orders.filter((o) => !['delivered', 'cancelled', 'rejected'].includes(o.status)).length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'completed'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          الطلبات السابقة (
          {orders.filter((o) => ['delivered', 'cancelled', 'rejected'].includes(o.status)).length})
        </button>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-3">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">لا توجد طلبات في هذا القسم</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            قم بتصفح المتاجر القريبة منك واطلب منتجاتك المفضلة وسنقوم بتوصيلها لك!
          </p>
          <button
            onClick={onBrowseStores}
            className="mt-4 px-4 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors"
          >
            تصفح المتاجر الآن
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedOrders.map((order) => {
            const statusConfig = getOrderStatusConfig(order.status);
            const isActive = !['delivered', 'cancelled', 'rejected'].includes(order.status);

            return (
              <div
                key={order.id}
                onClick={() => onSelectOrder(order.id)}
                className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer hover:shadow-md ${
                  isActive ? 'border-emerald-300 shadow-xs' : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
                      <Store className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{order.store_name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        رقم الطلب: <span className="font-mono font-bold text-slate-800">#{order.order_number}</span> • {formatDateArabic(order.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.text}`}>
                      {statusConfig.label}
                    </span>
                    <ChevronLeft className="w-5 h-5 text-slate-400" />
                  </div>
                </div>

                {/* Items preview snippet */}
                <div className="mt-3 flex items-center justify-between text-xs">
                  <div className="text-slate-600 line-clamp-1 max-w-md">
                    {order.items.map((i) => `${i.product_name} (${i.quantity})`).join(' ، ')}
                  </div>

                  <div className="font-extrabold text-slate-900 text-sm shrink-0">
                    {formatCurrency(order.total)}
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
    </div>
  );
};
