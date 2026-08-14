import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { subscribeSupabase } from '../../../lib/supabase';
import { Store } from '../../../types/domain';
import { formatCurrency, formatPhoneNumber } from '../../../lib/formatters';
import { Pagination } from '../../shared/Pagination';
import { Store as StoreIcon, Plus, Edit2, Trash2, Power, Star, Search, Package } from 'lucide-react';
import { useToast } from '../../shared/Toast';
import { useConfirm } from '../../shared/ConfirmDialog';

export default function AdminStoresView() {
  const navigate = useNavigate();
  const [stores, setStores] = useState<Store[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;
  const [editingCommissionStoreId, setEditingCommissionStoreId] = useState<string | null>(null);
  const [commissionInput, setCommissionInput] = useState(10);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newStorePhone, setNewStorePhone] = useState('');
  const [newStoreAddress, setNewStoreAddress] = useState('');
  const [newStoreCategory, setNewStoreCategory] = useState('بقالة وسوبرماركت');
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  useEffect(() => {
    const refresh = () => {
      setStores(StorageRepo.getStores());
    };

    refresh();
    StorageRepo.refreshStores();

    const unsubscribeStorage = subscribeToStorageChange((detail) => {
      if (detail.entityType === 'store') refresh();
    });

    const unsubscribeRealtime = subscribeSupabase<Store>('stores', () => {
      StorageRepo.refreshStores();
    });

    return () => {
      unsubscribeStorage();
      unsubscribeRealtime();
    };
  }, []);

  const filteredStores = stores.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.category_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.address || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredStores.length / ITEMS_PER_PAGE);
  const paginatedStores = filteredStores.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const toggleStoreStatus = async (s: Store) => {
    try {
      await StorageRepo.saveStore({ ...s, is_open: !s.is_open });
      showToast({
        type: 'success',
        title: 'تم التحديث',
        message: `تم تغيير حالة المتجر إلى ${!s.is_open ? 'مفتوح' : 'مغلق'}`,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'فشل التحديث',
        message: err.message || 'تعذر تغيير حالة المتجر',
      });
    }
  };

  const handleSaveCommission = async (s: Store) => {
    try {
      await StorageRepo.saveStore({ ...s, commission_rate: Number(commissionInput) });
      setEditingCommissionStoreId(null);
      showToast({
        type: 'success',
        title: 'تم التحديث',
        message: `تم تحديث نسبة العمولة إلى ${commissionInput}%`,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'فشل التحديث',
        message: err.message || 'تعذر تحديث نسبة العمولة',
      });
    }
  };

  const handleDeleteStore = (id: string, name: string) => {
    showConfirm({
      title: 'تأكيد الحذف',
      message: `هل أنت متأكد من حذف متجر "${name}" نهائياً؟`,
      variant: 'danger',
      confirmLabel: 'حذف',
      onConfirm: async () => {
        try {
          await StorageRepo.deleteStore(id);
          showToast({
            type: 'success',
            title: 'تم الحذف',
            message: 'تم حذف المتجر بنجاح',
          });
        } catch (err: any) {
          showToast({
            type: 'error',
            title: 'فشل الحذف',
            message: err.message || 'تعذر حذف المتجر',
          });
        }
      },
    });
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName.trim()) {
      showToast({
        type: 'error',
        title: 'بيانات ناقصة',
        message: 'يرجى إدخال اسم المتجر',
      });
      return;
    }

    const newStore: Store = {
      id: `store-${Date.now()}`,
      name: newStoreName,
      slug: newStoreName.toLowerCase().replace(/\s+/g, '-'),
      owner_id: `owner-${Date.now()}`,
      category_id: 'cat-1',
      category_name: newStoreCategory,
      description: 'متجر مسجل في منصة على بابك',
      logo_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=300',
      address: newStoreAddress || 'القاهرة، مصر',
      lat: 30.0444,
      lng: 31.2357,
      phone: newStorePhone || '01000000000',
      is_approved: true,
      is_open: true,
      rating: 5.0,
      reviews_count: 0,
      commission_rate: 15,
      min_order_amount: 0,
      delivery_fee: 15,
      opening_hours: { everyday: { open: '08:00', close: '23:00' } },
      created_at: new Date().toISOString(),
    };

    try {
      await StorageRepo.saveStore(newStore);
      setIsAddModalOpen(false);
      setNewStoreName('');
      setNewStorePhone('');
      setNewStoreAddress('');
      showToast({
        type: 'success',
        title: 'تم الإنشاء',
        message: 'تم إنشاء المتجر بنجاح في قاعدة البيانات',
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'فشل الإنشاء',
        message: err.message || 'تعذر إنشاء المتجر',
      });
    }
  };

  return (
    <div className="space-y-6 dir-rtl pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <StoreIcon className="w-6 h-6 text-purple-600" />
            <span>دليل المتاجر والعمولات في على بابك</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            إدارة المتاجر المسجلة في Supabase وتحديد نسب العمولة وحالات التشغيل
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة متجر جديد لـ Supabase</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs p-4 space-y-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
          <input
            type="text"
            placeholder="البحث باسم المتجر أو القسم أو العنوان..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
              <tr>
                <th className="p-3.5">المتجر</th>
                <th className="p-3.5">القسم والمنطقة</th>
                <th className="p-3.5">عمولة المنصة</th>
                <th className="p-3.5">التقييم</th>
                <th className="p-3.5">حالة العمل</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredStores.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    لا توجد متاجر تطابق بحثك حالياً.
                  </td>
                </tr>
              ) : (
                paginatedStores.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          loading="lazy"
                          src={s.logo_url}
                          alt={s.name}
                          className="w-10 h-10 object-cover rounded-xl border border-slate-200 shrink-0"
                        />
                        <div>
                          <h4 className="font-bold text-slate-900">{s.name}</h4>
                          <p className="text-[10px] text-slate-400 font-mono">{formatPhoneNumber(s.phone)}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span className="font-semibold text-slate-800">{s.category_name}</span>
                      <span className="text-[10px] text-slate-400 block">{s.address}</span>
                    </td>

                    <td className="p-3.5">
                      {editingCommissionStoreId === s.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={commissionInput}
                            onChange={(e) => setCommissionInput(Number(e.target.value))}
                            className="w-16 p-1 bg-slate-50 border border-slate-200 rounded text-xs text-center font-bold"
                          />
                          <button
                            onClick={() => handleSaveCommission(s)}
                            className="px-2 py-1 bg-emerald-600 text-white rounded font-bold text-[10px]"
                          >
                            حفظ
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                            {s.commission_rate || 10}%
                          </span>
                          <button
                            onClick={() => {
                              setEditingCommissionStoreId(s.id);
                              setCommissionInput(s.commission_rate || 10);
                            }}
                            className="text-[10px] text-blue-600 font-bold hover:underline"
                          >
                            تعديل
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="p-3.5 font-bold text-amber-600 flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{s.rating ? s.rating.toFixed(1) : 'جديد'}</span>
                    </td>

                    <td className="p-3.5">
                      <button
                        onClick={() => toggleStoreStatus(s)}
                        className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                          s.is_open ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {s.is_open ? 'مفتوح' : 'مغلق'}
                      </button>
                      {s.is_vacation_mode && (
                        <span
                          title="صاحب المتجر فعّل وضع الإجازة بنفسه (إغلاق مؤقت)"
                          className="block mt-1 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-bold text-center"
                        >
                          🏖️ إجازة
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => navigate(`/admin/stores/${s.id}/products`)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="إدارة المنتجات والصور"
                        >
                          <Package className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStore(s.id, s.name)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="حذف المتجر"
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
          totalItems={filteredStores.length}
          itemsPerPage={ITEMS_PER_PAGE}
          className="mt-4"
        />
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 dir-rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-xl">
            <h3 className="text-base font-black text-slate-900">إضافة متجر جديد لقاعدة بيانات Supabase</h3>
            <form onSubmit={handleCreateStore} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">اسم المتجر</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: سوبرماركت الخير"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">القسم الرئيسي</label>
                <select
                  value={newStoreCategory}
                  onChange={(e) => setNewStoreCategory(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  <option value="بقالة وسوبرماركت">بقالة وسوبرماركت</option>
                  <option value="لحوم ودواجن">لحوم ودواجن</option>
                  <option value="مخبوزات وحلويات">مخبوزات وحلويات</option>
                  <option value="صيدلية">صيدلية</option>
                  <option value="خضروات وفواكه">خضروات وفواكه</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  placeholder="01012345678"
                  value={newStorePhone}
                  onChange={(e) => setNewStorePhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">العنوان والمنطقة</label>
                <input
                  type="text"
                  placeholder="شارع التسعين - التجمع الخامس - القاهرة"
                  value={newStoreAddress}
                  onChange={(e) => setNewStoreAddress(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold"
                >
                  حفظ في Supabase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};