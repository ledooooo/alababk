import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import {
  subscribeSupabase,
  fetchAllSupabaseProductsWithStore,
  saveSupabaseProduct,
  deleteSupabaseProduct,
} from '../../../lib/supabase';
import { Product, Category } from '../../../types/domain';
import { formatCurrency } from '../../../lib/formatters';
import { PRODUCT_BADGE_OPTIONS, PRODUCT_BADGES } from '../../../lib/product-badges';
import { Pagination } from '../../shared/Pagination';
import {
  Package,
  Search,
  Trash2,
  Power,
  RotateCcw,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw,
  ImageOff,
  X,
  Check,
} from 'lucide-react';
import { useToast } from '../../shared/Toast';
import { useConfirm } from '../../shared/ConfirmDialog';

const ITEMS_PER_PAGE = 12;

export default function AdminProductsView() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'out_of_stock'>('all');
  const [returnableFilter, setReturnableFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  const loadProducts = async (showSpinner = true) => {
    if (showSpinner) setRefreshing(true);
    setError(null);
    try {
      const data = await fetchAllSupabaseProductsWithStore();
      setProducts(data);
    } catch (err: any) {
      setError(err.message || 'تعذر تحميل المنتجات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProducts();
    setCategories(StorageRepo.getCategories());

    const unsubscribeStorage = subscribeToStorageChange((detail) => {
      if (detail.entityType === 'category') setCategories(StorageRepo.getCategories());
    });

    // ديباونس بسيط عشان دفعة تغييرات قريبة من بعض (مثلًا صاحب متجر بيعدّل
    // كذا منتج ورا بعض) تعمل تحديث واحد بس، مش fetch منفصل لكل حدث —
    // نفس النمط المُستخدم في AdminOrdersView.
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribeRealtime = subscribeSupabase<Product>('products', () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => loadProducts(false), 1200);
    });

    return () => {
      unsubscribeStorage();
      unsubscribeRealtime();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);

  const stores = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => {
      if (p.store_id && p.store_name) map.set(p.store_id, p.store_name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchesSearch =
        !term ||
        p.name.toLowerCase().includes(term) ||
        (p.store_name || '').toLowerCase().includes(term);
      const matchesStore = storeFilter === 'all' || p.store_id === storeFilter;
      const matchesCategory = categoryFilter === 'all' || p.category_id === categoryFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && p.is_active) ||
        (statusFilter === 'inactive' && !p.is_active) ||
        (statusFilter === 'out_of_stock' && p.stock <= 0);
      const matchesReturnable =
        returnableFilter === 'all' ||
        (returnableFilter === 'yes' && p.is_returnable) ||
        (returnableFilter === 'no' && !p.is_returnable);
      return matchesSearch && matchesStore && matchesCategory && matchesStatus && matchesReturnable;
    });
  }, [products, searchQuery, storeFilter, categoryFilter, statusFilter, returnableFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, storeFilter, categoryFilter, statusFilter, returnableFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const stats = useMemo(() => {
    const active = products.filter((p) => p.is_active).length;
    const outOfStock = products.filter((p) => p.stock <= 0).length;
    const returnable = products.filter((p) => p.is_returnable).length;
    return { total: products.length, active, outOfStock, returnable };
  }, [products]);

  const updateProductLocally = (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
  };

  const handleToggleActive = async (product: Product) => {
    setBusyId(product.id);
    try {
      const saved = await saveSupabaseProduct({ ...product, is_active: !product.is_active });
      updateProductLocally({ ...product, ...saved, store_name: product.store_name });
      showToast({
        type: 'success',
        title: 'تم',
        message: product.is_active ? 'تم إيقاف المنتج' : 'تم تفعيل المنتج',
      });
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل التحديث', message: err.message || 'تعذر تحديث حالة المنتج' });
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleReturnable = async (product: Product) => {
    setBusyId(product.id);
    try {
      const saved = await saveSupabaseProduct({ ...product, is_returnable: !product.is_returnable });
      updateProductLocally({ ...product, ...saved, store_name: product.store_name });
      showToast({
        type: 'success',
        title: 'تم',
        message: !product.is_returnable
          ? 'المنتج بقى قابل للاسترجاع — العميل يقدر يطلب استرجاعه بعد التسليم'
          : 'المنتج بقى غير قابل للاسترجاع',
      });
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل التحديث', message: err.message || 'تعذر تحديث خاصية الاسترجاع' });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = (product: Product) => {
    showConfirm({
      title: 'تأكيد الحذف',
      message: `هل تريد حذف منتج "${product.name}" نهائيًا من متجر "${product.store_name}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      variant: 'danger',
      confirmLabel: 'حذف نهائي',
      onConfirm: async () => {
        setBusyId(product.id);
        try {
          await deleteSupabaseProduct(product.id);
          setProducts((prev) => prev.filter((p) => p.id !== product.id));
          showToast({ type: 'success', title: 'تم الحذف', message: 'تم حذف المنتج بنجاح' });
        } catch (err: any) {
          showToast({ type: 'error', title: 'فشل الحذف', message: err.message || 'تعذر حذف المنتج' });
        } finally {
          setBusyId(null);
        }
      },
    });
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    if (editingProduct.price <= 0) {
      showToast({ type: 'error', title: 'خطأ', message: 'السعر يجب أن يكون أكبر من صفر' });
      return;
    }
    setSavingEdit(true);
    try {
      const saved = await saveSupabaseProduct(editingProduct);
      updateProductLocally({ ...editingProduct, ...saved, store_name: editingProduct.store_name });
      showToast({ type: 'success', title: 'تم', message: 'تم حفظ تعديلات المنتج' });
      setEditingProduct(null);
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل الحفظ', message: err.message || 'تعذر حفظ التعديلات' });
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-600">جاري تحميل منتجات المنصة...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 dir-rtl pb-16">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm mb-1">
            <Package className="w-5 h-5" />
            <span>إدارة المنتجات على مستوى المنصة</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">كل المنتجات عبر كل المتاجر</h1>
          <p className="text-xs text-slate-500 mt-1">
            تحكم كامل: التفعيل/الإيقاف، قابلية الاسترجاع، تعديل السعر والمخزون، أو الحذف — بلا حاجة للدخول على كل متجر لوحده
          </p>
        </div>
        <button
          onClick={() => loadProducts(true)}
          disabled={refreshing}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span>تحديث</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <p className="text-[11px] text-slate-500 font-bold">إجمالي المنتجات</p>
          <p className="text-2xl font-black text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <p className="text-[11px] text-slate-500 font-bold">منتجات نشطة</p>
          <p className="text-2xl font-black text-emerald-600">{stats.active}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <p className="text-[11px] text-slate-500 font-bold">نفد المخزون</p>
          <p className="text-2xl font-black text-rose-600">{stats.outOfStock}</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
          <p className="text-[11px] text-slate-500 font-bold">قابلة للاسترجاع</p>
          <p className="text-2xl font-black text-indigo-600">{stats.returnable}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            placeholder="ابحث باسم المنتج أو المتجر..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <select
            value={storeFilter}
            onChange={(e) => setStoreFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-600"
          >
            <option value="all">كل المتاجر</option>
            {stores.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-600"
          >
            <option value="all">كل التصنيفات</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-600"
          >
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">موقوف</option>
            <option value="out_of_stock">نفد المخزون</option>
          </select>

          <select
            value={returnableFilter}
            onChange={(e) => setReturnableFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-600"
          >
            <option value="all">قابلية الاسترجاع: الكل</option>
            <option value="yes">قابل للاسترجاع</option>
            <option value="no">غير قابل للاسترجاع</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <p className="text-xs text-rose-700 font-medium">{error}</p>
        </div>
      )}

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {filteredProducts.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-12">لا توجد منتجات مطابقة لهذا الفلتر.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                  <th className="p-3 text-right">المنتج</th>
                  <th className="p-3 text-right">المتجر</th>
                  <th className="p-3 text-right">السعر</th>
                  <th className="p-3 text-right">المخزون</th>
                  <th className="p-3 text-center">نشط</th>
                  <th className="p-3 text-center">قابل للاسترجاع</th>
                  <th className="p-3 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProducts.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} loading="lazy" className="w-full h-full object-cover" />
                          ) : (
                            <ImageOff className="w-4 h-4 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate max-w-[160px] flex items-center gap-1.5">
                            {p.name}
                            {p.badge_type && p.badge_type !== 'none' && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${PRODUCT_BADGES[p.badge_type as keyof typeof PRODUCT_BADGES].className}`}>
                                {PRODUCT_BADGES[p.badge_type as keyof typeof PRODUCT_BADGES].label}
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-slate-400">{p.category_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => navigate(`/admin/stores/${p.store_id}/products`)}
                        className="text-indigo-600 hover:underline font-bold flex items-center gap-1"
                        title="إدارة كاملة لهذا المتجر (رفع صور، إضافة منتجات جديدة)"
                      >
                        {p.store_name}
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="p-3 font-bold text-slate-900">{formatCurrency(p.price)}</td>
                    <td className={`p-3 font-bold ${p.stock <= 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                      {p.stock}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleToggleActive(p)}
                        disabled={busyId === p.id}
                        className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                          p.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                        }`}
                        title={p.is_active ? 'إيقاف المنتج' : 'تفعيل المنتج'}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleToggleReturnable(p)}
                        disabled={busyId === p.id}
                        className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                          p.is_returnable ? 'text-indigo-600 hover:bg-indigo-50' : 'text-slate-400 hover:bg-slate-100'
                        }`}
                        title={p.is_returnable ? 'إلغاء قابلية الاسترجاع' : 'السماح بالاسترجاع'}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingProduct(p)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="تعديل سريع (سعر/مخزون/تصنيف)"
                        >
                          <Package className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={busyId === p.id}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                          title="حذف المنتج"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-4 border-t border-slate-100">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredProducts.length}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        </div>
      </div>

      {/* Quick Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditingProduct(null)}>
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-base">تعديل سريع — {editingProduct.name}</h3>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 -mt-2">
              متجر: {editingProduct.store_name} — لتعديل الصورة أو إضافة منتجات جديدة، استخدم "إدارة كاملة لهذا المتجر"
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">اسم المنتج</label>
              <input
                type="text"
                value={editingProduct.name}
                onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">السعر (ج.م)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={editingProduct.price}
                  onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">المخزون</label>
                <input
                  type="number"
                  min="0"
                  value={editingProduct.stock}
                  onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">أقل كمية للطلب</label>
                <input
                  type="number"
                  min="1"
                  value={editingProduct.min_order_quantity ?? 1}
                  onChange={(e) => setEditingProduct({ ...editingProduct, min_order_quantity: Math.max(1, Number(e.target.value)) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">التصنيف</label>
              <select
                value={editingProduct.category_id || ''}
                onChange={(e) => setEditingProduct({ ...editingProduct, category_id: e.target.value || undefined })}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">بلا تصنيف</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاج على صورة المنتج</label>
                <select
                  value={editingProduct.badge_type || 'none'}
                  onChange={(e) => setEditingProduct({ ...editingProduct, badge_type: e.target.value as any })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {PRODUCT_BADGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {editingProduct.badge_type && editingProduct.badge_type !== 'none' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ينتهي تلقائيًا في (اختياري)</label>
                  <input
                    type="datetime-local"
                    value={editingProduct.badge_expires_at ? editingProduct.badge_expires_at.slice(0, 16) : ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, badge_expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingProduct.is_active}
                  onChange={(e) => setEditingProduct({ ...editingProduct, is_active: e.target.checked })}
                  className="w-4 h-4 rounded accent-emerald-600"
                />
                نشط ومتاح للطلب
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingProduct.is_returnable}
                  onChange={(e) => setEditingProduct({ ...editingProduct, is_returnable: e.target.checked })}
                  className="w-4 h-4 rounded accent-indigo-600"
                />
                قابل للاسترجاع
              </label>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditingProduct(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                {savingEdit ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{savingEdit ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}