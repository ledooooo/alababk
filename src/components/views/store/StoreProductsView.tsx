import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { Product } from '../../../types/domain';
import { formatCurrency } from '../../../lib/formatters';
import { Package, Plus, Edit2, Trash2, Search, Check, X, Image as ImageIcon } from 'lucide-react';

export const StoreProductsView: React.FC = () => {
  const currentUser = StorageRepo.getCurrentUser();
  const storeId = currentUser?.associated_store_id || 'store-1';
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchProducts = () => {
      if (storeId) {
        setProducts(StorageRepo.getProducts(storeId));
      }
    };

    fetchProducts();
    const unsubscribe = subscribeToStorageChange(() => {
      fetchProducts();
    });
    return unsubscribe;
  }, [storeId]);

  const handleOpenNew = () => {
    setEditingProduct({
      id: `prod-${Date.now()}`,
      store_id: storeId,
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
    setEditingProduct({ ...p });
    setIsModalOpen(true);
  };

  const handleSaveProduct = () => {
    if (!editingProduct?.name || !editingProduct?.price) {
      alert('يرجى ملء اسم المنتج والسعر على الأقل');
      return;
    }

    const fullProd: Product = {
      id: editingProduct.id || `prod-${Date.now()}`,
      store_id: storeId,
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

    StorageRepo.saveProduct(fullProd);
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleDeleteProduct = (id: string) => {
    if (window.confirm('هل أنت تأكد من حذف هذا المنتج من المحل؟')) {
      StorageRepo.deleteProduct(id);
    }
  };

  const toggleProductActive = (p: Product) => {
    StorageRepo.saveProduct({ ...p, is_active: !p.is_active });
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 dir-rtl pb-16">
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
                filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <img
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
                          onClick={() => handleDeleteProduct(p.id)}
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
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 animate-in fade-in space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-slate-900 text-base">
              {editingProduct.created_at ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد للمحل'}
            </h3>

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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رابط صورة المنتج (URL)</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={editingProduct.image_url || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, image_url: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none dir-ltr text-left"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveProduct}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                حفظ التغييرات
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
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
