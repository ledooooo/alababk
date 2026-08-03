import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { subscribeSupabase } from '../../../lib/supabase';
import { Store } from '../../../types/domain';
import { formatCurrency } from '../../../lib/formatters';
import { Store as StoreIcon, Clock, MapPin, Phone, Save, Check, Loader2, AlertCircle } from 'lucide-react';

export const StoreSettingsView: React.FC = () => {
  const currentUser = StorageRepo.getCurrentUser();
  const storeId = currentUser?.associated_store_id || 'store-1';
  const [store, setStore] = useState<Store | null>(StorageRepo.getStoreById(storeId));
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    const sync = () => {
      const s = StorageRepo.getStoreById(storeId);
      if (s) setStore(s);
    };

    sync();
    if (storeId) {
      StorageRepo.refreshStores();
    }

    const unsubStorage = subscribeToStorageChange(() => {
      sync();
    });

    const unsubRealtime = subscribeSupabase<Store>(
      'stores',
      () => {
        StorageRepo.refreshStores();
      },
      storeId ? `id=eq.${storeId}` : undefined
    );

    return () => {
      unsubStorage();
      unsubRealtime();
    };
  }, [storeId]);

  if (!store) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <h3 className="font-bold text-slate-800">جاري تحميل إعدادات المتجر...</h3>
      </div>
    );
  }

  const handleSave = async () => {
    setSaveError('');
    try {
      setIsSaving(true);
      await StorageRepo.saveStore(store);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err: any) {
      console.error('Failed to save store settings:', err);
      setSaveError(err.message || 'حدث خطأ أثناء حفظ إعدادات المتجر.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 dir-rtl pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <StoreIcon className="w-6 h-6 text-blue-600" />
            <span>إعدادات وخيارات المتجر</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            تحديث معلومات المحل، العنوان، ساعات العمل، والحد الأدنى للطلبات
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري الحفظ...</span>
            </>
          ) : savedSuccess ? (
            <>
              <Check className="w-4 h-4 text-emerald-300" />
              <span>تم الحفظ!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>حفظ الإعدادات</span>
            </>
          )}
        </button>
      </div>

      {saveError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-xs font-bold">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
          المعلومات الأساسية
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اسم المتجر والمحل *</label>
            <input
              type="text"
              value={store.name}
              onChange={(e) => setStore({ ...store, name: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">رقم هاتف المحل *</label>
            <input
              type="text"
              value={store.phone}
              onChange={(e) => setStore({ ...store, phone: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono dir-ltr text-right"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">وصف المحل والخدمات</label>
            <textarea
              rows={2}
              value={store.description}
              onChange={(e) => setStore({ ...store, description: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">العنوان التفصيلي والمنطقة</label>
            <input
              type="text"
              value={store.address}
              onChange={(e) => setStore({ ...store, address: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 pt-4">
          خيارات ورسوم التوصيل
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">الحد الأدنى للطلب (ج.م)</label>
            <input
              type="number"
              value={store.min_order_amount}
              onChange={(e) => setStore({ ...store, min_order_amount: Number(e.target.value) })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">رسوم التوصيل المحددة (ج.م)</label>
            <input
              type="number"
              value={store.delivery_fee}
              onChange={(e) => setStore({ ...store, delivery_fee: Number(e.target.value) })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
