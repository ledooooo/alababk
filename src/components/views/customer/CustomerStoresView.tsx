import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { subscribeSupabase } from '../../../lib/supabase';
import { Store } from '../../../types/domain';
import { StoreCard } from '../../store/StoreCard';
import { Pagination } from '../../shared/Pagination';
import { Search, Filter, Loader2, AlertCircle, RefreshCw, X } from 'lucide-react';

interface CustomerStoresViewProps {
  onSelectStore: (store: Store) => void;
}

const ITEMS_PER_PAGE = 12;

export default function CustomerStoresView({ onSelectStore }: CustomerStoresViewProps) {
  // ===== HOOKS ===== (جميعها في الأعلى)
  const [searchParams, setSearchParams] = useSearchParams();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  // فلتر التصنيف يُقرأ من ?category= في الرابط (مثلًا لما ييجي من صفحة
  // التصنيفات أو الصفحة الرئيسية) بدل ما يبدأ 'all' دايمًا ويتجاهل اختيار المستخدم
  const [categoryFilter, setCategoryFilter] = useState<string>(searchParams.get('category') || 'all');

  useEffect(() => {
    const fromUrl = searchParams.get('category') || 'all';
    setCategoryFilter(fromUrl);
  }, [searchParams]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter]);

  const clearCategoryFilter = () => {
    setCategoryFilter('all');
    searchParams.delete('category');
    setSearchParams(searchParams, { replace: true });
  };

  const loadStores = async () => {
    try {
      setLoading(true);
      setError(null);
      const allStores = await StorageRepo.refreshStores();
      setStores(allStores);
    } catch (err: any) {
      setError(err.message || 'فشل تحميل المتاجر');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();

    const unsubStorage = subscribeToStorageChange((detail) => {
      if (detail.entityType === 'store') {
        loadStores();
      }
    });

    const unsubRealtime = subscribeSupabase<Store>(
      'stores',
      () => { loadStores(); },
      'is_active=eq.true'
    );

    return () => {
      unsubStorage();
      unsubRealtime();
    };
  }, []);

  // ===== دوال التصفية =====
  const filteredStores = stores.filter((store) => {
    const matchesSearch = store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          store.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || store.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const activeCategoryName =
    categoryFilter !== 'all'
      ? StorageRepo.getCategories().find((c) => c.id === categoryFilter)?.name
      : null;

  const totalPages = Math.ceil(filteredStores.length / ITEMS_PER_PAGE);
  const paginatedStores = filteredStores.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // ===== حالات العرض =====
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-600">جاري تحميل المتاجر القريبة...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-bold text-slate-800">حدث خطأ</h3>
        <p className="text-sm text-slate-600">{error}</p>
        <button
          onClick={loadStores}
          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" />
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 dir-rtl pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl font-black text-slate-900">المتاجر القريبة منك</h1>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
            <input
              type="text"
              placeholder="ابحث عن متجر أو منتج..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <button className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
            <Filter className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {activeCategoryName && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold">
            التصنيف: {activeCategoryName}
            <button onClick={clearCategoryFilter} className="hover:text-emerald-900" title="مسح الفلتر">
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        </div>
      )}

      {filteredStores.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <p className="text-slate-500">لا توجد متاجر تطابق بحثك.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
          />
        </>
      )}
    </div>
  );
}