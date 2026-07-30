import React, { useState, useMemo } from 'react';
import { StorageRepo } from '../../../lib/storage';
import { useCartStore } from '../../../stores/cart-store';
import { formatCurrency } from '../../../lib/formatters';
import { Search as SearchIcon, Store, ShoppingBag, Star, SlidersHorizontal, ArrowRight, Filter, CheckCircle2 } from 'lucide-react';

interface SearchViewProps {
  onSelectStore: (storeId: string) => void;
  onNavigate: (tab: string, param?: string) => void;
}

export const SearchView: React.FC<SearchViewProps> = ({ onSelectStore, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(1000);
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'name'>('rating');

  const { addItem } = useCartStore();
  const stores = StorageRepo.getStores();
  const categories = StorageRepo.getCategories();
  const products = StorageRepo.getProducts();

  // Filtered Stores
  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      const matchQuery =
        !query.trim() ||
        store.name.toLowerCase().includes(query.toLowerCase()) ||
        store.description.toLowerCase().includes(query.toLowerCase()) ||
        store.address.toLowerCase().includes(query.toLowerCase());

      const matchCategory =
        selectedCategory === 'all' ||
        store.category_id === selectedCategory ||
        store.category_name === selectedCategory;

      const matchRating = store.rating >= minRating;

      return matchQuery && matchCategory && matchRating;
    });
  }, [stores, query, selectedCategory, minRating]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const matchQuery =
        !query.trim() ||
        prod.name.toLowerCase().includes(query.toLowerCase()) ||
        prod.description.toLowerCase().includes(query.toLowerCase()) ||
        prod.category_name.toLowerCase().includes(query.toLowerCase());

      const matchCategory =
        selectedCategory === 'all' ||
        prod.category_id === selectedCategory ||
        prod.category_name === selectedCategory;

      const matchPrice = prod.price <= maxPrice;

      return matchQuery && matchCategory && matchPrice && prod.is_active;
    }).sort((a, b) => {
      if (sortBy === 'price') return a.price - b.price;
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'ar');
      return 0;
    });
  }, [products, query, selectedCategory, maxPrice, sortBy]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 dir-rtl pb-16">
      {/* Search Header Bar */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 space-y-4 shadow-md">
        <h1 className="text-2xl font-black text-center sm:text-right">البحث الشامل في المحلات والمنتجات 🔍</h1>
        <p className="text-xs text-purple-200 text-center sm:text-right">ابحث عن أي متجر، سوبرماركت، منتج أو صنف في منطقتك مباشرة</p>

        <div className="relative">
          <input
            type="text"
            placeholder="ابحث باسم المحل أو المنتج (مثال: جبنة رومي، صيدلية، مخبز...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full p-4 pr-12 bg-white text-slate-900 rounded-2xl font-bold text-xs sm:text-sm focus:ring-4 focus:ring-purple-400 outline-none shadow-lg"
          />
          <SearchIcon className="w-5 h-5 text-slate-400 absolute right-4 top-4" />
        </div>
      </div>

      {/* Filter Options */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2 font-black text-xs text-slate-800 border-b border-slate-100 pb-2">
          <SlidersHorizontal className="w-4 h-4 text-purple-600" />
          <span>تصفية الفلاتر والنتائج</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              كل الأقسام
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedCategory === c.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {c.icon} {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Secondary filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">الحد الأقصى للسعر (ج.م): {maxPrice}</label>
            <input
              type="range"
              min={10}
              max={1000}
              step={10}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-purple-600"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">الحد الأدنى للتقييم:</label>
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
            >
              <option value={0}>جميع التقييمات</option>
              <option value={4.5}>4.5 نجوم وأعلى ⭐</option>
              <option value={4.0}>4.0 نجوم وأعلى ⭐</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">ترتيب المنتجات:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
            >
              <option value="rating">حسب الأعلى تقييماً</option>
              <option value="price">حسب الأقل سعراً</option>
              <option value="name">أبجدياً</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stores Search Results */}
      <div className="space-y-3">
        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
          <Store className="w-5 h-5 text-purple-600" />
          <span>المتاجر المطابقة ({filteredStores.length})</span>
        </h2>

        {filteredStores.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
            لا توجد متاجر مطابقة لبحثك الحالي.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStores.map((store) => (
              <div
                key={store.id}
                onClick={() => onSelectStore(store.id)}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-purple-300 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={store.logo_url}
                    alt={store.name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-100"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-slate-900 text-xs truncate">{store.name}</h3>
                    <p className="text-[11px] text-slate-500 truncate">{store.category_name}</p>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500 mt-0.5">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{store.rating.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Products Search Results */}
      <div className="space-y-3">
        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-emerald-600" />
          <span>المنتجات المطابقة ({filteredProducts.length})</span>
        </h2>

        {filteredProducts.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
            لا توجد منتجات مطابقة لشرط البحث.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <img
                    src={prod.image_url}
                    alt={prod.name}
                    className="w-full h-28 object-cover rounded-xl"
                  />
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {prod.category_name}
                    </span>
                    <h3 className="font-extrabold text-slate-900 text-xs mt-1 leading-snug line-clamp-1">
                      {prod.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">{prod.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="font-black text-slate-900 text-sm">{formatCurrency(prod.price)}</span>
                  <button
                    onClick={() => {
                      addItem(prod, 'متجر معتمد', 1);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
                  >
                    + إضافة للسلة
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
