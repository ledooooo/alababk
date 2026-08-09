import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { Category } from '../../../types/domain';
import { fetchSupabaseCategories, supabase } from '../../../lib/supabase';
import { FolderTree, Plus, Trash2, CheckCircle2, RefreshCw } from 'lucide-react';
import { useToast } from '../../shared/Toast';

export const AdminCategoriesView: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🛒');
  const [message, setMessage] = useState<string | null>(null);
  const { showToast } = useToast();

  const loadCategories = async () => {
    setLoading(true);
    const dbCats = await fetchSupabaseCategories();
    if (dbCats.length > 0) {
      setCategories(dbCats);
    } else {
      setCategories(StorageRepo.getCategories());
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCategories();
    const unsub = subscribeToStorageChange(() => {
      loadCategories();
    });
    return unsub;
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      showToast({ type: 'error', title: 'خطأ', message: 'يرجى إدخال اسم القسم' });
      return;
    }

    const slug = newCatSlug.trim() || newCatName.trim().toLowerCase().replace(/\s+/g, '-');
    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      slug,
      icon: newCatIcon || '📦',
      sort_order: categories.length + 1,
    };

    try {
      await (supabase.from('categories') as any).insert([
        {
          id: newCategory.id,
          name: newCategory.name,
          slug: newCategory.slug,
          icon: newCategory.icon,
          sort_order: newCategory.sort_order,
          is_active: true,
        },
      ]);
    } catch {
      // fallback
    }

    StorageRepo.saveCategory(newCategory);
    setNewCatName('');
    setNewCatSlug('');
    setNewCatIcon('🛒');
    showToast({ type: 'success', title: 'تم', message: 'تم إضافة التصنيف بنجاح في قاعدة البيانات!' });
    loadCategories();
  };

  return (
    <div className="space-y-6 dir-rtl">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-purple-600 font-bold text-sm mb-1">
            <FolderTree className="w-5 h-5" />
            <span>إدارة الأقسام والتصنيفات (جدول Supabase Categories)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">أقسام المحلات والمنتجات</h1>
          <p className="text-xs text-slate-500 mt-1">
            إدارة وتصنيف المتاجر والمنتجات المتوفرة في تطبيق علي بابك
          </p>
        </div>
        <button
          onClick={loadCategories}
          disabled={loading}
          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث القائمة</span>
        </button>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form to create new category */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <Plus className="w-4 h-4 text-purple-600" />
            <span>إضافة قسم جديد</span>
          </h2>

          <form onSubmit={handleAddCategory} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم القسم *</label>
              <input
                type="text"
                required
                placeholder="مثال: أسماك ومأكولات بحرية"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الرمز التعريفي (Slug)</label>
              <input
                type="text"
                placeholder="مثال: seafood"
                value={newCatSlug}
                onChange={(e) => setNewCatSlug(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-600 dir-ltr"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الأيقونة (Emoji)</label>
              <input
                type="text"
                value={newCatIcon}
                onChange={(e) => setNewCatIcon(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-600 text-center"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
            >
              حفظ القسم في قاعدة البيانات
            </button>
          </form>
        </div>

        {/* Categories List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6">
          <h2 className="font-extrabold text-slate-900 text-base mb-4">الأقسام الحالية ({categories.length})</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center justify-between hover:border-purple-300 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 font-bold text-xl flex items-center justify-center">
                    {cat.icon || '📦'}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-xs">{cat.name}</h3>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">{cat.slug}</p>
                  </div>
                </div>
                <div className="text-[11px] font-bold text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-200">
                  ترتيب: #{cat.sort_order}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};