import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { Order } from '../../../types/domain';
import { formatCurrency, formatDateArabic } from '../../../lib/formatters';
import { ORDER_STATUS_LABELS, getOrderStatusConfig } from '../../../lib/constants';
import { useCartStore } from '../../../stores/cart-store';
import { Pagination } from '../../shared/Pagination';
import { useToast } from '../../shared/Toast';
import { useConfirm } from '../../shared/ConfirmDialog';
import {
  ListOrdered,
  Store,
  ChevronLeft,
  Clock,
  CheckCircle2,
  Package,
  ArrowRight,
  ShoppingBag,
  RotateCcw,
  AlertCircle
} from 'lucide-react';

interface CustomerOrdersViewProps {
  onSelectOrder: (orderId: string) => void;
  onBrowseStores: () => void;
  /**
   * Callback اختياري بعد نجاح الـ reorder. الـ parent ممكن يستخدمه عشان
   * يـ navigate للـ cart أو يفتح الـ drawer.
   */
  onReorderComplete?: (cartCount: number) => void;
}

export default function CustomerOrdersView({
  onSelectOrder,
  onBrowseStores,
  onReorderComplete,
}) {
  const currentUser = StorageRepo.getCurrentUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [reorderingOrderId, setReorderingOrderId] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 5;
  const reorderFromHistory = useCartStore((s) => s.reorderFromHistory);
  const clearCart = useCartStore((s) => s.clearCart);
  const openCart = useCartStore((s) => s.openCart);
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

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
    const unsubscribe = subscribeToStorageChange((detail) => {
      if (detail.entityType === 'order') fetchOrders();
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

  // ============================================================
  // إعادة طلب قديم — بنضيف منتجاته للعربة
  // ============================================================
  const doReorder = (order: Order) => {
    const result = reorderFromHistory(order, (id) => StorageRepo.getProductById(id));

    if (result.requiresConfirm) {
      // العربة فيها منتجات من متجر تاني — لازم نعمل clearCart الأول
      showConfirm({
        title: 'استبدال محتويات العربة',
        message: `عربة التسوق فيها منتجات من متجر آخر. لو أكملت، المنتجات القديمة هتتشال من العربة وهتتحط منتجات "${order.store_name}" بدالها.`,
        confirmLabel: 'استبدال',
        onConfirm: () => {
          clearCart();
          // استدعاء تاني بعد الـ clear
          const second = reorderFromHistory(order, (id) => StorageRepo.getProductById(id));
          finalizeReorder(order, second);
        },
      });
      return;
    }

    finalizeReorder(order, result);
  };

  const finalizeReorder = (
    order: Order,
    result: { added: number; skipped: Array<{ product_name: string; reason: string }>; requiresConfirm: boolean }
  ) => {
    if (result.added === 0 && result.skipped.length === 0) {
      showToast({ type: 'error', title: 'تعذّر الإعادة', message: 'الطلب ده مفيهوش منتجات صالحة' });
      return;
    }

    if (result.added > 0) {
      const skippedMsg =
        result.skipped.length > 0
          ? ` (تم تجاهل ${result.skipped.length} منتج غير متاح)`
          : '';
      showToast({
        type: 'success',
        title: 'تمت الإضافة للعربة',
        message: `تم إضافة ${result.added} منتج من "${order.store_name}"${skippedMsg}`,
      });
      openCart();
      if (onReorderComplete) onReorderComplete(result.added);
    } else {
      // مفيش حاجة اتزادت (كل المنتجات محذوفة أو معطلة)
      const reasonText = result.skipped
        .map((s) => `• ${s.product_name}: ${s.reason}`)
        .join('\n');
      showConfirm({
        title: 'كل المنتجات غير متاحة',
        message: `للأسف مفيش أي منتج من الطلب ده متاح دلوقتي:\n\n${reasonText}\n\nحابب تتصفح منتجات المتجر بدالها؟`,
        confirmLabel: 'تصفح المتجر',
        onConfirm: () => onBrowseStores(),
      });
    }

    // عرض المنتجات اللي اتـ skip في toast تاني لو فيه
    if (result.skipped.length > 0 && result.added > 0) {
      const skippedList = result.skipped.map((s) => `• ${s.product_name} (${s.reason})`).join('\n');
      setTimeout(() => {
        showToast({
          type: 'error',
          title: `منتجات لم تُضف (${result.skipped.length})`,
          message: skippedList,
        });
      }, 200);
    }
  };

  const handleReorderClick = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation(); // ما نفتحش الـ order detail
    if (reorderingOrderId === order.id) return;
    setReorderingOrderId(order.id);
    try {
      doReorder(order);
    } finally {
      setTimeout(() => setReorderingOrderId(null), 500);
    }
  };

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
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <span>رقم الطلب: <span className="font-mono font-bold text-slate-800">#{order.order_number}</span></span>
                        <span>• {formatDateArabic(order.created_at)}</span>
                        {order.eta_minutes && (
                          <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md text-[11px] font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>المتوقع: {order.eta_minutes} دقيقة</span>
                          </span>
                        )}
                      </div>
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

                {/* Reorder Button — للطلبات اللي اتسلّمت/اترفضت/اتلغت أو حتى النشطة */}
                {order.items && order.items.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-end">
                    <button
                      onClick={(e) => handleReorderClick(e, order)}
                      disabled={reorderingOrderId === order.id}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-200 transition-colors disabled:opacity-50"
                      title="إعادة هذا الطلب — إضافة كل المنتجات للعربة"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${reorderingOrderId === order.id ? 'animate-spin' : ''}`} />
                      <span>إعادة الطلب</span>
                    </button>
                  </div>
                )}
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
