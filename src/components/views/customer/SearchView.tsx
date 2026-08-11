import React, { useState, useEffect, useRef } from 'react';
import { StorageRepo } from '../../../lib/storage';
import { searchSupabaseStores, searchSupabaseProducts } from '../../../lib/supabase';
import { Product, Store } from '../../../types/domain';
import { formatCurrency } from '../../../lib/formatters';
import { Search, Loader2, AlertCircle, Store as StoreIcon, Package } from 'lucide-react';

interface SearchViewProps {
  onSelectStore: (store: Store) => void;
  onSelectProduct: (product: Product) => void;
}

function mergeById<T extends { id: string }>(cached: T[], serverResults: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of cached) map.set(item.id, item);
  for (const item of serverResults) map.set(item.id, item); // نسخة السيرفر أدق فتستبدل نسخة الكاش لو موجودة
  return Array.from(map.values());
}

export default function SearchView({ onSelectStore, onSelectProduct }: SearchViewProps) {
  // ===== HOOKS =====
  const [query, setQuery] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [serverLoading, setServerLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'stores' | 'products'>('stores');
  const requestIdRef = useRef(0);

  // نتيجة فورية من البيانات المحمّلة بالفعل في الكاش (بلا انتظار شبكة) —
  // بتظهر فور الكتابة، وبعدين تتستبدل/تتكمل بنتيجة السيرفر الأدق.
  useEffect(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      setStores([]);
      setProducts([]);
      return;
    }

    const cachedStores = StorageRepo.getStores().filter(
      (s) => s.name.toLowerCase().includes(term) || s.description?.toLowerCase().includes(term)
    );
    const cachedProducts = StorageRepo.getProducts().filter(
      (p) => p.name.toLowerCase().includes(term) || p.description?.toLowerCase().includes(term)
    );
    setStores(cachedStores);
    setProducts(cachedProducts);
  }, [query]);

  // بحث حقيقي من السيرفر (ilike) بعد توقف قصير عن الكتابة، عشان يلاقي
  // نتائج مش محمّلة أصلًا في الكاش المحلي (مش كل المتاجر/المنتجات محمّلة دايمًا)
  const performServerSearch = async (searchTerm: string, reqId: number) => {
    setServerLoading(true);
    setError(null);
    try {
      const [serverStores, serverProducts] = await Promise.all([
        searchSupabaseStores(searchTerm),
        searchSupabaseProducts(searchTerm),
      ]);
      if (reqId !== requestIdRef.current) return; // نتيجة بحث قديمة اتلغت
      setStores((prev) => mergeById(prev, serverStores));
      setProducts((prev) => mergeById(prev, serverProducts));
    } catch (err: any) {
      if (reqId === requestIdRef.current) setError(err.message || 'فشل البحث');
    } finally {
      if (reqId === requestIdRef.current) setServerLoading(false);
    }
  };

  useEffect(() => {
    const term = query.trim();
    if (!term) return;
    const reqId = ++requestIdRef.current;
    const delay = setTimeout(() => performServerSearch(term, reqId), 350);
    return () => clearTimeout(delay);
  }, [query]);

  // ===== حالات العرض =====
  if (error) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <p className="text-sm text-slate-600">{error}</p>
        <button onClick={() => performServerSearch(query, ++requestIdRef.current)} className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold">
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 dir-rtl pb-16">
      <div className="relative">
        <Search className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="ابحث عن متجر، منتج، أو فئة..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pr-12 pl-12 py-3.5 bg-white border border-slate-200 rounded-2xl text-base focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs"
          autoFocus
        />
        {serverLoading && (
          <Loader2 className="w-4 h-4 text-emerald-500 animate-spin absolute left-4 top-1/2 -translate-y-1/2" />
        )}
      </div>

      {query.trim() && (
        <>
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setActiveTab('stores')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                activeTab === 'stores' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <StoreIcon className="w-4 h-4 inline mr-1" />
              المتاجر ({stores.length})
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                activeTab === 'products' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Package className="w-4 h-4 inline mr-1" />
              المنتجات ({products.length})
            </button>
          </div>

          {activeTab === 'stores' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {stores.map((store) => (
                <div
                  key={store.id}
                  onClick={() => onSelectStore(store)}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center gap-3"
                >
                  <img src={store.logo_url} alt={store.name} className="w-12 h-12 object-cover rounded-xl" />
                  <div>
                    <h4 className="font-bold text-slate-900">{store.name}</h4>
                    <p className="text-xs text-slate-500">{store.address}</p>
                  </div>
                </div>
              ))}
              {stores.length === 0 && <p className="text-slate-500 text-sm">لا توجد متاجر تطابق بحثك.</p>}
            </div>
          )}

          {activeTab === 'products' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => onSelectProduct(product)}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  <img src={product.image_url} alt={product.name} className="w-full h-32 object-cover rounded-xl mb-2" />
                  <h4 className="font-bold text-slate-900 text-sm truncate">{product.name}</h4>
                  <p className="text-emerald-700 font-bold">{formatCurrency(product.price)}</p>
                </div>
              ))}
              {products.length === 0 && <p className="text-slate-500 text-sm col-span-full">لا توجد منتجات تطابق بحثك.</p>}
            </div>
          )}
        </>
      )}
    </div>
  );
};