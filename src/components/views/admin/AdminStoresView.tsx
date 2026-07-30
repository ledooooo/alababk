import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { Store } from '../../../types/domain';
import { formatCurrency, formatPhoneNumber } from '../../../lib/formatters';
import { Store as StoreIcon, Plus, Edit2, Trash2, Power, Star } from 'lucide-react';

export const AdminStoresView: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [editingCommissionStoreId, setEditingCommissionStoreId] = useState<string | null>(null);
  const [commissionInput, setCommissionInput] = useState(10);

  useEffect(() => {
    const refresh = () => {
      setStores(StorageRepo.getStores());
    };

    refresh();
    const unsubscribe = subscribeToStorageChange(() => {
      refresh();
    });
    return unsubscribe;
  }, []);

  const toggleStoreStatus = (s: Store) => {
    StorageRepo.saveStore({ ...s, is_open: !s.is_open });
  };

  const handleSaveCommission = (s: Store) => {
    StorageRepo.saveStore({ ...s, commission_rate: Number(commissionInput) });
    setEditingCommissionStoreId(null);
  };

  const handleDeleteStore = (id: string) => {
    if (window.confirm('هل أنت تأكد من حذف هذا المتجر نهائياً؟')) {
      StorageRepo.deleteStore(id);
    }
  };

  return (
    <div className="space-y-6 dir-rtl pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <StoreIcon className="w-6 h-6 text-purple-600" />
            <span>دليل المتاجر والعمولات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            إدارة المتاجر النشطة بالمنصة وتحديد نسب العمولة لكل محلي
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
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
              {stores.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5">
                    <div className="flex items-center gap-3">
                      <img
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
                    <span>{s.rating.toFixed(1)}</span>
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
                  </td>

                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => handleDeleteStore(s.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="حذف المتجر"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
