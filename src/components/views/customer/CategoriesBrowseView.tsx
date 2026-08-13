import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { subscribeSupabase } from '../../../lib/supabase';
import { Product } from '../../../types/domain';
import { Store, ChevronLeft, Sparkles, LayoutGrid, ShoppingBag } from 'lucide-react';

interface CategoriesBrowseViewProps {
  onNavigate: (tab: string, param?: string) => void;
}

export default function CategoriesBrowseView({ onNavigate }) {
  const categories = StorageRepo.getCategories();
  const stores = StorageRepo.getStores();
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const syncProds = () => {
      setProducts(StorageRepo.getProducts());
    };

    syncProds();
    StorageRepo.refreshProducts();

    const RELEVANT_TYPES = new Set(['product', 'store', 'category']);
    const unsubStorage = subscribeToStorageChange((detail) => {
      if (RELEVANT_TYPES.has(detail.entityType)) syncProds();
    });

    const unsubRealtime = subscribeSupabase<Product>('products', () => {
      StorageRepo.refreshProducts();
    });

    return () => {
      unsubStorage();
      unsubRealtime();
    };
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-8 dir-rtl pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-3xl p-8 text-center space-y-2 shadow-md">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold border border-white/20">
          <LayoutGrid className="w-4 h-4" />
          <span>دليل الأقسام والتخصصات</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">تصفح حسب قسم التسوق</h1>
        <p className="text-xs text-purple-200">اختر القسم المناسب لتصفح المحلات المعتمدة والمنتجات المتاحة فوراً في منطقتك</p>
      </div>

      {/* Grid of Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => {
          const categoryStores = stores.filter(
            (s) => s.category_id === cat.id || s.category_name === cat.name
          );
          const categoryProducts = products.filter(
            (p) => p.category_id === cat.id || p.category_name === cat.name
          );

          return (
            <div
              key={cat.id}
              onClick={() => onNavigate('customer-stores', cat.id)}
              className="bg-white rounded-3xl p-6 border border-slate-200/80 hover:border-purple-300 shadow-xs hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-4xl group-hover:scale-110 transition-transform">{cat.icon || '📦'}</div>
                  <span className="px-2.5 py-1 bg-purple-50 text-purple-700 font-extrabold text-[11px] rounded-xl">
                    {categoryStores.length} متاجر
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-black text-slate-900 group-hover:text-purple-600 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    تصفح أحدث منتجات والعروض الخاصة بقسم {cat.name} من أفضل الشركاء المعتمدين.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="text-slate-500">{categoryProducts.length} منتج متاح</span>
                <span className="text-purple-600 group-hover:translate-x-[-4px] transition-transform flex items-center gap-1">
                  تصفح المحلات
                  <ChevronLeft className="w-4 h-4" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
