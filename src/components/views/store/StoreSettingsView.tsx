import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { subscribeSupabase } from '../../../lib/supabase';
import { Store } from '../../../types/domain';
import { formatCurrency } from '../../../lib/formatters';
import { Store as StoreIcon, Clock, MapPin, Phone, Save, Check, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '../../shared/Toast';

interface StoreSettingsViewProps {
  onNavigate: (tab: string) => void;
}

export const StoreSettingsView: React.FC<StoreSettingsViewProps> = ({ onNavigate }) => {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const loadData = async () => {
    setLoading(true);
    const myStore = await StorageRepo.getMyStore();
    setStore(myStore);
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    const unsubscribeStorage = subscribeToStorageChange(() => {
      loadData();
    });

    const currentUser = StorageRepo.getCurrentUser();
    const filter = currentUser ? `owner_id=eq.${currentUser.id}` : undefined;
    const unsubscribeRealtimeStore = subscribeSupabase<Store>(
      'stores',
      () => { loadData(); },
      filter
    );

    return () => {
      unsubscribeStorage();
      unsubscribeRealtimeStore();
    };
  }, []);

  const { showToast } = useToast();

  const handleSave = async () => {
    if (!store) return;
    try {
      setIsSaving(true);
      await StorageRepo.saveStore(store);
      showToast({ type: 'success', title: 'تم', message: 'تم حفظ إعدادات المتجر بنجاح' });
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل الحفظ', message: err.message || 'حدث خطأ أثناء حفظ إعدادات المتجر' });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
        <p className="text-xs font-bold text-slate-600">جاري تحميل إعدادات المتجر...</p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
        <StoreIcon className="w-16 h-16 text-slate-300 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 text-lg">لا يوجد متجر مرتبط بحسابك</h3>
        <p className="text-sm text-slate-500 mt-1">لا يمكنك تعديل إعدادات المتجر بدون متجر. قم بتقديم طلب انضمام متجر.</p>
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
              value={store.phone || ''}
              onChange={(e) => setStore({ ...store, phone: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono dir-ltr text-right"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">وصف المحل والخدمات</label>
            <textarea
              rows={2}
              value={store.description || ''}
              onChange={(e) => setStore({ ...store, description: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">العنوان التفصيلي والمنطقة</label>
            <input
              type="text"
              value={store.address || ''}
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