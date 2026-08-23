import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { subscribeSupabase, mapStoreRow, fetchStoreById } from '../../../lib/supabase';
import { Store, getDefaultWorkingHours } from '../../../types/domain';
import { formatCurrency } from '../../../lib/formatters';
import { Store as StoreIcon, Clock, MapPin, Phone, Save, Check, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '../../shared/Toast';
import { ImageUploadField } from '../../shared/ImageUploadField';
import { WorkingHoursEditor } from '../../shared/WorkingHoursEditor';
import PushNotificationSettingsCard from '../../shared/PushNotificationSettingsCard';

interface StoreSettingsViewProps {
  onNavigate: (tab: string) => void;
  /** لما الأدمن بيدير إعدادات متجر معيّن بدل "متجري أنا" (نفس نمط adminStoreId في StoreProductsView) */
  adminStoreId?: string;
}

export default function StoreSettingsView({ onNavigate, adminStoreId }: StoreSettingsViewProps) {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const loadData = async () => {
    setLoading(true);
    const targetStore = adminStoreId ? await fetchStoreById(adminStoreId) : await StorageRepo.getMyStore();
    setStore(targetStore);
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    const unsubscribeStorage = subscribeToStorageChange((detail) => {
      if (detail.entityType === 'store') loadData();
    });

    // في وضع إدارة الأدمن لمتجر معيّن، لازم نفلتر بمعرّف المتجر نفسه
    // (id) مش owner_id بتاع المستخدم الحالي (اللي هو الأدمن مش صاحب
    // المتجر أصلًا).
    const currentUser = StorageRepo.getCurrentUser();
    const filter = adminStoreId
      ? `id=eq.${adminStoreId}`
      : currentUser
      ? `owner_id=eq.${currentUser.id}`
      : undefined;
    // نطبّق صف التحديث الجاي من Realtime مباشرة (payload.new) بدل ما نعمل
    // fetch كامل تاني — الصف بالفعل معانا في الحدث نفسه، فمفيش داعي لجولة
    // شبكة إضافية على كل تحديث. هي شاشة "متجر واحد" بسيطة فمفيش تعقيد
    // فلترة/دمج زي شاشات القوائم.
    const unsubscribeRealtimeStore = subscribeSupabase<Store>(
      'stores',
      (payload) => {
        if (payload.eventType === 'DELETE' || !payload.new) return;
        setStore((prev) => {
          const updated = mapStoreRow(payload.new);
          // نحافظ على category_name القديم لو موجود (Realtime payload خام
          // بلا join على categories، فمفيش داعي نفقد الاسم المعروض فجأة)
          if (prev?.category_name && !updated.category_name) {
            updated.category_name = prev.category_name;
          }
          return updated;
        });
      },
      filter
    );

    return () => {
      unsubscribeStorage();
      unsubscribeRealtimeStore();
    };
  }, [adminStoreId]);

  const { showToast } = useToast();
  const [isTogglingVacation, setIsTogglingVacation] = useState(false);

  const handleToggleVacation = async () => {
    if (!store) return;
    const nextValue = !store.is_vacation_mode;
    setIsTogglingVacation(true);
    try {
      // تحديث فوري ومستقل عن باقي نموذج الإعدادات (زي أي تطبيق توصيل كبير:
      // "إغلاق مؤقت" لازم يكون سويتش لحظي، مش حقل مدفون جوه فورم كبير
      // محتاج ضغط "حفظ" الرئيسي).
      await StorageRepo.saveStore({ ...store, is_vacation_mode: nextValue });
      setStore((prev) => (prev ? { ...prev, is_vacation_mode: nextValue } : prev));
      showToast({
        type: 'success',
        title: nextValue ? 'تم تفعيل وضع الإجازة' : 'تم إلغاء وضع الإجازة',
        message: nextValue
          ? 'محلك هيظهر مغلقًا مؤقتًا للعملاء لحد ما تلغي وضع الإجازة'
          : 'محلك رجع يستقبل طلبات جديدة',
      });
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل التحديث', message: err.message || 'تعذر تغيير وضع الإجازة' });
    } finally {
      setIsTogglingVacation(false);
    }
  };

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

      {/* وضع الإجازة — إغلاق مؤقت فوري، بدون الحاجة لتواصل مع الأدمن */}
      <div
        className={`rounded-2xl p-5 border shadow-xs flex items-center justify-between gap-4 transition-colors ${
          store?.is_vacation_mode ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'
        }`}
      >
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <span>وضع الإجازة (إغلاق مؤقت)</span>
            {store?.is_vacation_mode && (
              <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full text-[10px] font-bold">مُفعّل حاليًا</span>
            )}
          </h3>
          <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
            فعّل الوضع ده لو هتقفل المحل لفترة قصيرة (إجازة، صيانة...). المحل هيظهر
            مغلقًا مؤقتًا للعملاء فورًا، وترجّعه أي وقت من غير ما تحتاج تتواصل مع الإدارة.
          </p>
        </div>
        <button
          onClick={handleToggleVacation}
          disabled={isTogglingVacation || !store}
          role="switch"
          aria-checked={!!store?.is_vacation_mode}
          className={`relative shrink-0 w-14 h-8 rounded-full transition-colors disabled:opacity-50 ${
            store?.is_vacation_mode ? 'bg-amber-500' : 'bg-slate-300'
          }`}
        >
          <span
            className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
              store?.is_vacation_mode ? 'translate-x-1' : 'translate-x-7'
            }`}
          />
        </button>
      </div>

      {/* الإشعارات الفورية — بس لما صاحب المتجر بيدير إعدادات متجره هو (مش
          وضع الأدمن، لأن تفعيل Push مرتبط بمتصفح/جهاز المستخدم نفسه ومش
          حاجة الأدمن يقدر يفعّلها نيابة عن حد تاني). */}
      {!adminStoreId && <PushNotificationSettingsCard userId={store?.owner_id} />}

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
          صور المتجر
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ImageUploadField
            label="شعار المتجر (Logo)"
            value={store.logo_url || ''}
            storeId={store.id}
            folder="logo"
            onChange={(url) => setStore({ ...store, logo_url: url })}
            previewClassName="w-20 h-20 rounded-full"
          />
          <ImageUploadField
            label="صورة الغلاف (Banner)"
            value={store.banner_url || ''}
            storeId={store.id}
            folder="banner"
            onChange={(url) => setStore({ ...store, banner_url: url })}
            previewClassName="w-32 h-20"
          />
        </div>
      </div>

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

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          مواعيد العمل
        </h3>
        <WorkingHoursEditor
          value={store.opening_hours || getDefaultWorkingHours()}
          onChange={(hours) => setStore({ ...store, opening_hours: hours })}
        />
      </div>
    </div>
  );
}