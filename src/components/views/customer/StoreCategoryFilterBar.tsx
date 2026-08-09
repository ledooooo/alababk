import React from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  Tag,
  Coffee,
  Utensils,
  Cake,
  Flame,
  Pizza,
  Sparkles,
  ArrowUpDown,
  Filter
} from 'lucide-react';

interface StoreCategoryFilterBarProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: 'default' | 'price-asc' | 'price-desc' | 'offers';
  onSortChange: (sort: 'default' | 'price-asc' | 'price-desc' | 'offers') => void;
  totalProductsCount: number;
  filteredProductsCount: number;
  showOnlyOffers: boolean;
  onToggleOnlyOffers: () => void;
}

// ✅ التغيير الرئيسي: export default بدلاً من export const
export default function StoreCategoryFilterBar({
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortChange,
  totalProductsCount,
  filteredProductsCount,
  showOnlyOffers,
  onToggleOnlyOffers,
}: StoreCategoryFilterBarProps) {
  // Helper to pick dynamic icons/emojis for categories
  const getCategoryBadge = (catName: string) => {
    const lower = catName.toLowerCase();
    if (lower.includes('مشروب') || lower.includes('عصير') || lower.includes('قهوة') || lower.includes('شاي')) {
      return { icon: <Coffee className="w-3.5 h-3.5" />, emoji: '🥤' };
    }
    if (lower.includes('حلو') || lower.includes('كيك') || lower.includes('آيس') || lower.includes('شوكولاتة')) {
      return { icon: <Cake className="w-3.5 h-3.5" />, emoji: '🍰' };
    }
    if (lower.includes('بيتزا') || lower.includes('فطير')) {
      return { icon: <Pizza className="w-3.5 h-3.5" />, emoji: '🍕' };
    }
    if (lower.includes('مشوي') || lower.includes('لحم') || lower.includes('كباب')) {
      return { icon: <Flame className="w-3.5 h-3.5" />, emoji: '🥩' };
    }
    if (lower.includes('وجب') || lower.includes('طبق') || lower.includes('أرز')) {
      return { icon: <Utensils className="w-3.5 h-3.5" />, emoji: '🍱' };
    }
    return { icon: <Utensils className="w-3.5 h-3.5" />, emoji: '🏷️' };
  };

  const hasActiveFilters =
    selectedCategory !== 'all' || searchQuery.trim() !== '' || sortBy !== 'default' || showOnlyOffers;

  const handleClearFilters = () => {
    onSelectCategory('all');
    onSearchChange('');
    onSortChange('default');
    if (showOnlyOffers) onToggleOnlyOffers();
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/90 shadow-xs space-y-4 dir-rtl">
      {/* Search Input & Sort & Quick Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          <input
            type="text"
            placeholder="ابحث باسم المنتج أو المكونات..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pr-10 pl-9 py-2.5 bg-slate-50 text-xs font-medium rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute left-3 top-3 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Sort & Quick Filter Controls */}
        <div className="flex items-center gap-2 overflow-x-auto shrink-0">
          {/* Offers Toggle Pill */}
          <button
            onClick={onToggleOnlyOffers}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition-all border flex items-center gap-1.5 shrink-0 ${
              showOnlyOffers
                ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xs'
                : 'bg-amber-50 text-amber-800 border-amber-200/80 hover:bg-amber-100'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>العروض والخصومات 🔥</span>
          </button>

          {/* Sort Dropdown */}
          <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 text-xs text-slate-700 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 me-1.5 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as any)}
              className="bg-transparent font-bold focus:outline-none cursor-pointer text-xs"
            >
              <option value="default">الترتيب: الافتراضي</option>
              <option value="price-asc">السعر: من الأقل للأعلى</option>
              <option value="price-desc">السعر: من الأعلى للأقل</option>
              <option value="offers">الأعلى خصماً أولاً</option>
            </select>
          </div>
        </div>
      </div>

      {/* Categories Horizontal Scroll Bar */}
      <div className="space-y-2 pt-1 border-t border-slate-100">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-slate-500 flex items-center gap-1">
            <Filter className="w-3 h-3 text-emerald-600" />
            <span>فئات أصناف المتجر:</span>
          </span>

          <span className="text-[11px] text-slate-400 font-mono">
            عرض {filteredProductsCount} من أصل {totalProductsCount} منتج
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {/* All Category Pill */}
          <button
            onClick={() => onSelectCategory('all')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black shrink-0 transition-all border flex items-center gap-2 ${
              selectedCategory === 'all' && !showOnlyOffers
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-102'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <span>🍽️</span>
            <span>جميع الأصناف</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                selectedCategory === 'all' && !showOnlyOffers
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {totalProductsCount}
            </span>
          </button>

          {/* Dynamic Categories */}
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat && !showOnlyOffers;
            const badge = getCategoryBadge(cat);

            return (
              <button
                key={cat}
                onClick={() => {
                  if (showOnlyOffers) onToggleOnlyOffers();
                  onSelectCategory(cat);
                }}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black shrink-0 transition-all border flex items-center gap-2 ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-102'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <span>{badge.emoji}</span>
                <span>{cat}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Clear Active Filters Bar */}
      {hasActiveFilters && (
        <div className="pt-2 flex items-center justify-between text-xs bg-amber-50/70 border border-amber-200/60 p-2.5 rounded-2xl text-amber-900">
          <div className="flex items-center gap-2 font-bold">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>
              تم تطبيق الفلترة ({filteredProductsCount} نتيجة مطابقة)
            </span>
          </div>

          <button
            onClick={handleClearFilters}
            className="text-xs font-extrabold text-rose-700 hover:underline flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>إعادة ضبط الفلاتر</span>
          </button>
        </div>
      )}
    </div>
  );
}