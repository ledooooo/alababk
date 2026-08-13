import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { subscribeSupabase, fetchStoreById } from '../../../lib/supabase';
import { Product, Store } from '../../../types/domain';
import { formatCurrency } from '../../../lib/formatters';
import { Pagination } from '../../shared/Pagination';
import { ImageUploadField } from '../../shared/ImageUploadField';
import { Package, Plus, Edit2, Trash2, Search, Check, X, Image as ImageIcon, AlertCircle, Loader2, Store as StoreIcon } from 'lucide-react';
import { useToast } from '../../shared/Toast';
import { useConfirm } from '../../shared/ConfirmDialog';

interface StoreProductsViewProps {
  onNavigate: (tab: string) => void;
  /**
   * لما تُستخدم الشاشة من لوحة الأدمن لإدارة منتجات متجر معيّن (بدل متجر
   * المستخدم الحالي)، نمرّر معرّف المتجر هنا. سياسات RLS بالفعل تسمح
   * للأدمن بإدارة كل المتاجر/المنتجات (is_admin())، فلا حاجة لأي تغيير
   * في صلاحيات قاعدة البيانات — فقط تغيير أي متجر تعمل عليه الشاشة.
   */
  adminStoreId?: string;
}

export default function StoreProductsView({ onNavigate, adminStoreId }: StoreProductsViewProps) {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const loadData = async () => {
    setLoading(true);
    let targetStore: Store | null = null;
    if (adminStoreId) {
      // كانت هنا بتجيب كل المتاجر (fetchSupabaseStores()) عشان تلاقي واحد
      // بس بالفلترة في المتصفح — دلوقتي استعلام مباشر بمعرّف المتجر.
      targetStore = await fetchStoreById(adminStoreId);
    } else {
      targetStore = await StorageRepo.getMyStore();
    }
    setStore(targetStore);
    if (targetStore) {
      const storeProds = StorageRepo.getProducts(targetStore.id);
      setProducts(storeProds);
    } else {
      setProducts([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    const unsubscribeStorage = subscribeToStorageChange((detail) => {
      if (detail.entityType === 'product' || detail.entityType === 'store') loadData();
    });

    const currentUser = StorageRepo.getCurrentUser();
    const filter = adminStoreId
      ? `id=eq.${adminStoreId}`
      : currentUser ? `owner_id=eq.${currentUser.id}` : undefined;
    const unsubscribeRealtimeStore = subscribeSupabase<Store>(
      'stores',
      () => { loadData(); },
      filter
    );

    const unsubscribeRealtimeProducts = subscribeSupabase<Product>(
      'products',
      () => { loadData(); },
      store ? `store_id=eq.${store.id}` : undefined
    );

    return () => {
      unsubscribeStorage();
      unsubscribeRealtimeStore();
      unsubscribeRealtimeProducts();
    };
  }, [adminStoreId]);

  const handleOpenNew = () => {
    if (!store) return;
    setSaveError('');
    setEditingProduct({
      id: `prod-${Date.now()}`,
      store_id: store.id,
      name: '',
      description: '',
      price: 10,
      original_price: undefined,
      category_name: 'عام',
      image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400',
      stock: 20,
      is_active: true,
      unit: 'قطعة',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setSaveError('');
    setEditingProduct({ ...p });
    setIsModalOpen(true);
  };

  const handleSaveProduct = async () => {
    setSaveError('');
    if (!editingProduct?.name || !editingProduct?.price) {
      setSaveError('يرجى ملء اسم المنتج والسعر على الأقل');
      return;
    }

    const fullProd: Product = {
      id: editingProduct.id || `prod-${Date.now()}`,
      store_id: store!.id,
      name: editingProduct.name,
      description: editingProduct.description || '',
      price: Number(editingProduct.price),
      original_price: editingProduct.original_price ? Number(editingProduct.original_price) : undefined,
      category_name: editingProduct.category_name || 'عام',
      image_url: editingProduct.image_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400',
      stock: Number(editingProduct.stock || 10),
      is_active: editingProduct.is_active ?? true,
      unit: editingProduct.unit || 'قطعة',
      created_at: editingProduct.created_at || new Date().toISOString(),
    };

    try {
      setIsSaving(true);
      await StorageRepo.saveProduct(fullProd);
      setIsModalOpen(false);
      setEditingProduct(null);
      showToast({
        type: 'success',
        title: 'تم',
        message: 'تم حفظ المنتج بنجاح',
      });
    } catch (err: any) {
      console.error('Failed to save product:', err);
      setSaveError(err.message || 'حدث خطأ أثناء حفظ المنتج في قاعدة البيانات.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = (id: string, name: string) => {
    showConfirm({
      title: 'تأكيد حذف المنتج',
      message: `هل أنت متأكد من حذف المنتج "${name}"؟`,
      variant: 'danger',
      confirmLabel: 'حذف',
      onConfirm: async () => {
        try {
          await StorageRepo.deleteProduct(id);
          showToast({
            type: 'success',
            title: 'تم الحذف',
            message: 'تم حذف المنتج بنجاح',
          });
        } catch (err: any) {
          showToast({
            type: 'error',
            title: 'فشل الحذف',
            message: err.message || 'تعذر حذف المنتج',
          });
        }
      },
    });
  };

  const toggleProductActive = async (p: Product) => {
    try {
      await StorageRepo.saveProduct({ ...p, is_active: !p.is_active });
      showToast({
        type: 'success',
        title: 'تم التحديث',
        message: `تم تغيير حالة المنتج إلى ${!p.is_active ? 'نشط' : 'مخفي'}`,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'فشل التحديث',
        message: err.message || 'تعذر تغيير حالة المنتج',
      });
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-600">جاري تحميل منتجات المتجر...</p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <StoreIcon className="w-16 h-16 text-slate-300 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 text-lg">لا يوجد متجر مرتبط بحسابك</h3>
        <p className="text-sm text-slate-500 mt-1">لا يمكنك إدارة المنتجات بدون متجر. قم بتقديم طلب انضمام متجر.</p>
        <button
          onClick={() => onNavigate('apply-store')}
          className="mt-4 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all"
        >
          تقديم طلب انضمام متجر
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 dir-rtl pb-16">
      {adminStoreId && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-xl px-4 py-2.5 text-xs font-bold flex items-center gap-2">
          <StoreIcon className="w-4 h-4" />
          <span>وضع إدارة الأدمن — بتدير منتجات متجر: {store.name}</span>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-600" />
            <span>إدارة منتجات ومخزون المحل</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            أضف منتجاتك الجديدة، وحدد الأسعار والكميات المتوفرة بالمخزون
          </p>
        </div>

        <button
          onClick={handleOpenNew}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة منتج جديد</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
        <input
          type="text"
          placeholder="ابحث برقم أو اسم المنتج..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pr-10 pl-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
        />
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="p-3.5">المنتج</th>
                <th className="p-3.5">القسم</th>
                <th className="p-3.5">السعر والخصم</th>
                <th className="p-3.5">المخزون والكمية</th>
                <th className="p-3.5">الحالة العرض</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    لا توجد منتجات مسجلة. أضف منتجك الأول الآن!
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          loading="lazy"
                          src={p.image_url}
                          alt={p.name}
                          className="w-12 h-12 object-cover rounded-xl border border-slate-200 shrink-0"
                        />
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">{p.name}</h4>
                          <p className="text-[10px] text-slate-400 line-clamp-1">{p.description}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 font-semibold text-slate-700">{p.category_name}</td>

                    <td className="p-3.5">
                      <span className="font-black text-emerald-700 text-sm">{formatCurrency(p.price)}</span>
                      <span className="text-[10px] text-slate-400 block">/ {p.unit}</span>
                    </td>

                    <td className="p-3.5">
                      <span className={`font-bold px-2 py-0.5 rounded-md ${
                        p.stock <= 5 ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {p.stock} {p.unit}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <button
                        onClick={() => toggleProductActive(p)}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${
                          p.is_active
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                        }`}
                      >
                        {p.is_active ? 'معروض للطلب' : 'مخفي مؤقتاً'}
                      </button>
                    </td>

                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="تعديل المنتج"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="حذف المنتج"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredProducts.length}
          itemsPerPage={ITEMS_PER_PAGE}
          className="p-4"
        />
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-slate-900 text-base">
              {editingProduct.created_at ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد للمحل'}
            </h3>

            {saveError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المنتج *</label>
                <input
                  type="text"
                  placeholder="مثال: لبن جهينة كامل الدسم 1 لتر..."
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">وصف المنتج</label>
                <textarea
                  rows={2}
                  placeholder="وصف تفصيلي اختياري..."
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">السعر الحالي (ج.م) *</label>
                  <input
                    type="number"
                    value={editingProduct.price || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">السعر الأصلي (قبل الخصم)</label>
                  <input
                    type="number"
                    placeholder="اختياري..."
                    value={editingProduct.original_price || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, original_price: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">وحدة القياس</label>
                  <input
                    type="text"
                    placeholder="كجم / علبة / قطعة..."
                    value={editingProduct.unit || 'قطعة'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">كمية المخزون</label>
                  <input
                    type="number"
                    value={editingProduct.stock ?? 20}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">اسم القسم</label>
                  <input
                    type="text"
                    placeholder="ألبان / خضار..."
                    value={editingProduct.category_name || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, category_name: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <ImageUploadField
                label="صورة المنتج"
                value={editingProduct.image_url || ''}
                storeId={store?.id || ''}
                folder="products"
                onChange={(url) => setEditingProduct({ ...editingProduct, image_url: url })}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveProduct}
                disabled={isSaving}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <span>حفظ التغييرات</span>
                )}
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold text-xs rounded-xl transition-colors"
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