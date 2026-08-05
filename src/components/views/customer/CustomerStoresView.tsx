import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { subscribeSupabase } from '../../../lib/supabase';
import { Store, Category } from '../../../types/domain';
import { StoreCard } from '../../store/StoreCard';
import { Pagination } from '../../shared/Pagination';
import { Search, MapPin, Sparkles, ShoppingBag, Truck, Clock } from 'lucide-react';

interface CustomerStoresViewProps {
  onSelectStore: (store: Store) => void;
}

export const CustomerStoresView: React.FC<CustomerStoresViewProps> = ({ onSelectStore }) => {
  const [stores, setStores] = useState<Store[]>(StorageRepo.getStores());
  const [categories, setCategories] = useState<Category[]>(StorageRepo.getCategories());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  useEffect(() => {
    const sync = () => {
      setStores(StorageRepo.getStores());
    };

    sync();
    StorageRepo.refreshStores();

    const unsubscribeStorage = subscribeToStorageChange(() => {
      sync();
    });

    const unsubscribeRealtime = subscribeSupabase<Store>('stores', () => {
      StorageRepo.refreshStores();
    });

    return () => {
      unsubscribeStorage();
      unsubscribeRealtime();
    };
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  const approvedStores = stores.filter((s) => s.is_approved);

  const filteredStores = approvedStores.filter((store) => {
    const matchesCategory =
      selectedCategory === 'all' || store.category_id === selectedCategory;
    const matchesSearch =
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (store.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (store.address || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalPages = Math.ceil(filteredStores.length / ITEMS_PER_PAGE);
  const paginatedStores = filteredStores.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-8 dir-rtl pb-12">
      {/* Hero Banner Section */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-6 sm:p-10 overflow-hidden shadow-xl border border-slate-800">
        <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            التوصيل السريع من المتاجر المجاورة لك مباشرةً
          </span>

          <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight tracking-tight">
            كل طلباتك واحتياجاتك من محلات منطقتك بين إيديك!
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm mt-2.5 leading-relaxed">
            تصفح بقالة الحي، الجزارة، المخبز، الصيدلية، ومحلات الخضار الطازجة. اطلب أونلاين واستلم طلبك في خلال دقائق كاش عند الاستلام!
          </p>

          {/* Quick Search Bar */}
          <div className="mt-6 flex flex-col sm:flex-row gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5" />
              <input
                type="text"
                placeholder="ابحث عن متجر، منتج، أو منطقة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-11 pl-4 py-3 bg-white/10 backdrop-blur-md text-white placeholder-slate-400 text-xs sm:text-sm rounded-xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-3 bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl transition-colors"
              >
                إلغاء البحث
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Pills Slider */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
            <span>الأقسام والخدمات المحلية</span>
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            اختر قسماً للتصفية السريعة
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 ${
              selectedCategory === 'all'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>✨ جميع المتاجر</span>
            <span className="bg-emerald-500/30 text-white px-1.5 py-0.2 rounded-md text-[10px]">
              {approvedStores.length}
            </span>
          </button>

          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const count = approvedStores.filter((s) => s.category_id === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="text-sm">{cat.icon}</span>
                <span>{cat.name}</span>
                <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                  isSelected ? 'bg-emerald-500/30 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stores Directory Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-bold text-slate-600">
            عرض المتاجر المتاحة ({filteredStores.length}):
          </p>
        </div>

        {filteredStores.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-3">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">لم نجد متاجر تطابق بحثك</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              جرب تغيير كلمات البحث أو اختر قسماً آخر للتصفح.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors"
            >
              عرض كل المتاجر
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {paginatedStores.map((store) => (
                <StoreCard key={store.id} store={store} onSelect={onSelectStore} />
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredStores.length}
              itemsPerPage={ITEMS_PER_PAGE}
              className="mt-6"
            />
          </>
        )}
      </div>
    </div>
  );
};
