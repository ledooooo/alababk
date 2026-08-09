import React, { useState, useEffect } from 'react';
import { StorageRepo } from '../../../lib/storage';
import { Product, Store } from '../../../types/domain';
import { formatCurrency } from '../../../lib/formatters';
import { Search, Loader2, AlertCircle, Store as StoreIcon, Package } from 'lucide-react';

interface SearchViewProps {
  onSelectStore: (store: Store) => void;
  onSelectProduct: (product: Product) => void;
}

export default function SearchView({ onSelectStore, onSelectProduct }) {
  // ===== HOOKS =====
  const [query, setQuery] = useState('');
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'stores' | 'products'>('stores');

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setStores([]);
      setProducts([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const allStores = await StorageRepo.refreshStores();
      const allProducts = await StorageRepo.refreshProducts();

      const filteredStores = allStores.filter((s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const filteredProducts = allProducts.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );

      setStores(filteredStores);
      setProducts(filteredProducts);
    } catch (err: any) {
      setError(err.message || 'فشل البحث');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(() => performSearch(query), 300);
    return () => clearTimeout(delay);
  }, [query]);

  // ===== حالات العرض =====
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-600">جاري البحث...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <p className="text-sm text-slate-600">{error}</p>
        <button onClick={() => performSearch(query)} className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold">
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
          className="w-full pr-12 pl-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-base focus:ring-2 focus:ring-emerald-500 outline-none shadow-xs"
          autoFocus
        />
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