import React, { useState, useEffect } from 'react';
import { StorageRepo } from '../../../lib/storage';
import { Store, Product } from '../../../types/domain';
import { useCartStore } from '../../../stores/cart-store';
import { ProductCard } from '../../product/ProductCard';
import { formatCurrency } from '../../../lib/formatters';
import {
  ArrowRight,
  Star,
  MapPin,
  Phone,
  Clock,
  Truck,
  Search,
  ShoppingBag,
  AlertTriangle,
  Info
} from 'lucide-react';

interface CustomerStoreDetailViewProps {
  storeId: string;
  onBack: () => void;
  onOpenCart: () => void;
}

export const CustomerStoreDetailView: React.FC<CustomerStoreDetailViewProps> = ({
  storeId,
  onBack,
  onOpenCart,
}) => {
  const store = StorageRepo.getStoreById(storeId);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [confirmDialogProduct, setConfirmDialogProduct] = useState<{
    product: Product;
    storeName: string;
  } | null>(null);

  const { storeName: cartStoreName, forceAddItem, clearCart } = useCartStore();

  useEffect(() => {
    if (storeId) {
      setProducts(StorageRepo.getProducts(storeId));
    }
  }, [storeId]);

  if (!store) {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8">
        <h3 className="font-bold text-slate-800">المتجر غير موجود</h3>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold"
        >
          العودة للمتاجر
        </button>
      </div>
    );
  }

  // Get unique product categories inside this store
  const productCategories = Array.from(new Set(products.map((p) => p.category_name))).filter(Boolean);

  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCat === 'all' || p.category_name === selectedCat;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleConfirmReplaceCart = () => {
    if (confirmDialogProduct) {
      clearCart();
      forceAddItem(confirmDialogProduct.product, confirmDialogProduct.storeName, 1);
      setConfirmDialogProduct(null);
    }
  };

  return (
    <div className="space-y-6 dir-rtl pb-16">
      {/* Back Button & Top Action */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-700 hover:text-emerald-700 text-xs font-bold bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لقائمة المتاجر</span>
        </button>

        <button
          onClick={onOpenCart}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-all"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>عرض السلة</span>
        </button>
      </div>

      {/* Store Hero Banner & Identity Header */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        {/* Cover */}
        <div className="relative h-44 sm:h-56 bg-slate-900 overflow-hidden">
          {store.banner_url ? (
            <img
              src={store.banner_url}
              alt={store.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-slate-800" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
        </div>

        {/* Content Details */}
        <div className="p-6 relative pt-12 sm:pt-14 bg-white">
          {/* Logo Avatar */}
          <div className="absolute -top-12 right-6 w-20 h-20 bg-white rounded-2xl shadow-xl border-4 border-white overflow-hidden p-1">
            <img
              src={store.logo_url}
              alt={store.name}
              className="w-full h-full object-cover rounded-xl"
            />
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                  {store.name}
                </h1>
                {store.is_open ? (
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-ping" />
                    مفتوح للطلبات
                  </span>
                ) : (
                  <span className="bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    مغلق مؤقتاً
                  </span>
                )}
              </div>

              <p className="text-slate-600 text-xs mt-1 max-w-2xl leading-relaxed">
                {store.description}
              </p>

              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
                <span className="flex items-center gap-1 text-slate-700 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  {store.address}
                </span>
                <span className="flex items-center gap-1 text-slate-700 font-medium dir-ltr">
                  <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  {store.phone}
                </span>
              </div>
            </div>

            {/* Metrics Chips */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center min-w-[80px]">
                <div className="flex items-center justify-center gap-1 text-amber-600 font-bold text-sm">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{store.rating.toFixed(1)}</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  ({store.reviews_count} تقييم)
                </span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center min-w-[90px]">
                <div className="text-slate-900 font-extrabold text-xs">
                  {formatCurrency(store.delivery_fee)}
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">رسوم التوصيل</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center min-w-[90px]">
                <div className="text-slate-900 font-extrabold text-xs">
                  {formatCurrency(store.min_order_amount)}
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">الحد الأدنى</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Search & Category Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <h2 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
            <span>منتجات وقائمة المتجر ({filteredProducts.length})</span>
          </h2>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              placeholder="ابحث في منتجات المتجر..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-9 pl-3 py-2 bg-white text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>
        </div>

        {/* Sub-categories Selector */}
        {productCategories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCat('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                selectedCat === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              الكل ({products.length})
            </button>
            {productCategories.map((cat) => {
              const count = products.filter((p) => p.category_name === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCat(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    selectedCat === cat
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-slate-200">
          <Info className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <h4 className="font-bold text-slate-800 text-sm">لا توجد منتجات في هذا القسم</h4>
          <p className="text-xs text-slate-500 mt-1">جرب البحث بكلمة أخرى أو اختر قسماً آخر.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              storeName={store.name}
              onCartConfirmRequest={(p, sName) => setConfirmDialogProduct({ product: p, storeName: sName })}
            />
          ))}
        </div>
      )}

      {/* Single Store Conflict Confirmation Dialog */}
      {confirmDialogProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-600 mb-3">
              <div className="p-2 bg-amber-50 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">استبدال سلة التسوق؟</h3>
            </div>

            <p className="text-slate-600 text-xs leading-relaxed">
              تحتوي السلة حالياً على منتجات من متجر <strong className="text-slate-900">{cartStoreName}</strong>. لا يمكن طلب منتجات من متجرين مختلفين في نفس الطلب.
            </p>

            <p className="text-xs font-semibold text-slate-800 mt-2">
              هل ترغب في إفراغ السلة السابقة وإضافة هذا المنتج من متجر <strong className="text-emerald-700">{confirmDialogProduct.storeName}</strong>؟
            </p>

            <div className="flex items-center gap-2 mt-6">
              <button
                onClick={handleConfirmReplaceCart}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
              >
                نعم، إفراغ السلة والإضافة
              </button>
              <button
                onClick={() => setConfirmDialogProduct(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
