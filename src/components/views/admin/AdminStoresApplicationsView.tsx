import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { Store } from '../../../types/domain';
import { formatCurrency, formatPhoneNumber } from '../../../lib/formatters';
import { Store as StoreIcon, CheckCircle2, XCircle, MapPin, Phone, ShieldCheck } from 'lucide-react';

export const AdminStoresApplicationsView: React.FC = () => {
  const [pendingStores, setPendingStores] = useState<Store[]>([]);

  useEffect(() => {
    const fetchPending = () => {
      const allStores = StorageRepo.getStores();
      setPendingStores(allStores.filter((s) => !s.is_approved));
    };

    fetchPending();
    const unsubscribe = subscribeToStorageChange(() => {
      fetchPending();
    });
    return unsubscribe;
  }, []);

  const handleApprove = (store: Store) => {
    const updated = { ...store, is_approved: true };
    StorageRepo.saveStore(updated);
  };

  const handleReject = (storeId: string) => {
    if (window.confirm('هل أنت تأكد من رفض هذا الطلب؟')) {
      StorageRepo.deleteStore(storeId);
    }
  };

  return (
    <div className="space-y-6 dir-rtl pb-16">
      <div>
        <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-purple-600" />
          <span>طلبات انضمام المتاجر الجديدة</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          مراجعة واعتماد طلبات المتاجر الراغبة بالانضمام للخدمة
        </p>
      </div>

      {pendingStores.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
          <h3 className="font-bold text-slate-800 text-base">لا توجد طلبات معلقة بانتظار الاعتماد</h3>
          <p className="text-xs text-slate-500 mt-1">تمت مراجعة والبت في جميع طلبات انضمام المتاجر.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingStores.map((store) => (
            <div
              key={store.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={store.logo_url}
                    alt={store.name}
                    className="w-14 h-14 object-cover rounded-2xl border border-slate-200 shrink-0"
                  />
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">{store.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{store.category_name} • {store.address}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(store)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>اعتماد وتفعيل المتجر</span>
                  </button>

                  <button
                    onClick={() => handleReject(store.id)}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-colors flex items-center gap-1"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>رفض الطلب</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                <div>
                  <span className="font-bold block text-slate-800">رقم الهاتف:</span>
                  <span className="font-mono">{formatPhoneNumber(store.phone)}</span>
                </div>
                <div>
                  <span className="font-bold block text-slate-800">الحد الأدنى للطلب:</span>
                  <span>{formatCurrency(store.min_order_amount)}</span>
                </div>
                <div>
                  <span className="font-bold block text-slate-800">نسبة العمولة المقترحة:</span>
                  <span>{store.commission_rate}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
