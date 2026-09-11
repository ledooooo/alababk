import React, { useState, useEffect } from 'react';
import {
  fetchPlatformSettings,
  updatePlatformOnlinePayment,
  updateStoreOnlinePayment,
  fetchSupabaseStores,
} from '../../../lib/supabase';
import { Store } from '../../../types/domain';
import { CreditCard, Search, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useToast } from '../../shared/Toast';

export default function AdminPaymentSettingsView() {
  const [platformEnabled, setPlatformEnabled] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [savingStoreId, setSavingStoreId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const { showToast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [settings, allStores] = await Promise.all([fetchPlatformSettings(), fetchSupabaseStores()]);
      setPlatformEnabled(settings.online_payment_enabled);
      setStores(allStores);
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل التحميل', message: err.message || 'تعذر تحميل إعدادات الدفع' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleToggleGlobal = async () => {
    const next = !platformEnabled;
    setSavingGlobal(true);
    try {
      await updatePlatformOnlinePayment(next);
      setPlatformEnabled(next);
      showToast({
        type: 'success',
        title: 'تم التحديث',
        message: `تم ${next ? 'تفعيل' : 'إيقاف'} الدفع الإلكتروني على مستوى المنصة كلها`,
      });
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل التحديث', message: err.message || 'تعذر تغيير الإعداد' });
    } finally {
      setSavingGlobal(false);
    }
  };

  const handleToggleStore = async (store: Store) => {
    const next = !store.online_payment_enabled;
    setSavingStoreId(store.id);
    try {
      await updateStoreOnlinePayment(store.id, next);
      setStores((prev) => prev.map((s) => (s.id === store.id ? { ...s, online_payment_enabled: next } : s)));
      showToast({
        type: 'success',
        title: 'تم التحديث',
        message: `تم ${next ? 'تفعيل' : 'إيقاف'} الدفع الإلكتروني لمتجر "${store.name}"`,
      });
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل التحديث', message: err.message || 'تعذر تغيير الإعداد' });
    } finally {
      setSavingStoreId(null);
    }
  };

  const filteredStores = stores.filter((s) => s.name.toLowerCase().includes(search.trim().toLowerCase()));

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
        <span className="text-xs font-bold text-slate-500">جاري تحميل إعدادات الدفع...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 dir-rtl pb-16">
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-emerald-600" />
          <span>إعدادات الدفع الإلكتروني</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          تحكّم كامل في تفعيل الدفع الإلكتروني — على مستوى المنصة كلها، أو لمتجر معيّن بالذات
        </p>
      </div>

      {/* المفتاح العام */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${platformEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-black text-slate-900 text-sm">الدفع الإلكتروني على مستوى المنصة</p>
              <p className="text-xs text-slate-500 mt-0.5 max-w-md">
                المفتاح الرئيسي. لو متوقف، العملاء ميقدروش يدفعوا إلكترونيًا في أي متجر — حتى لو المتجر نفسه مفعّل الخيار عنده.
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleGlobal}
            disabled={savingGlobal}
            className={`shrink-0 w-14 h-8 rounded-full transition-colors relative disabled:opacity-50 ${
              platformEnabled ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                platformEnabled ? 'translate-x-1' : 'translate-x-7'
              }`}
            />
          </button>
        </div>
      </div>

      {!platformEnabled && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>الدفع الإلكتروني متوقف حاليًا على مستوى المنصة — مفاتيح المتاجر بالأسفل مش هيكون لها تأثير فعلي لحد ما تفعّل المفتاح ده.</span>
        </div>
      )}

      {/* مفاتيح المتاجر */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <p className="font-black text-slate-900 text-sm mb-2">الدفع الإلكتروني لكل متجر</p>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم المتجر..."
              className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
          {filteredStores.length === 0 ? (
            <p className="p-6 text-center text-xs text-slate-400 font-bold">مفيش متاجر مطابقة</p>
          ) : (
            filteredStores.map((store) => (
              <div key={store.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 text-sm truncate">{store.name}</p>
                  <p className="text-[10px] text-slate-400">{store.is_open ? 'نشط' : 'غير نشط'}</p>
                </div>
                <button
                  onClick={() => handleToggleStore(store)}
                  disabled={savingStoreId === store.id}
                  className={`shrink-0 w-12 h-7 rounded-full transition-colors relative disabled:opacity-50 ${
                    store.online_payment_enabled ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                      store.online_payment_enabled ? 'translate-x-1' : 'translate-x-6'
                    }`}
                  />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
