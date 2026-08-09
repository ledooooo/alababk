import React, { useState, useEffect } from 'react';
import { StorageRepo } from '../../../lib/storage';
import { fetchSupabaseCategories } from '../../../lib/supabase';
import { Store, Category } from '../../../types/domain';
import { StoreIcon, Building2, CheckCircle2, Phone, MapPin, Sparkles, Loader2, AlertCircle } from 'lucide-react';

interface ApplyStoreViewProps {
  onNavigate: (tab: string, param?: string) => void;
}

export const ApplyStoreView: React.FC<ApplyStoreViewProps> = ({ onNavigate }) => {
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [city, setCity] = useState('القاهرة - التجمع الخامس');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [applicationId, setApplicationId] = useState('');

  const currentUser = StorageRepo.getCurrentUser();

  useEffect(() => {
    fetchSupabaseCategories()
      .then((cats) => {
        setCategories(cats);
        if (cats.length > 0) setCategoryId(cats[0].id);
      })
      .catch(() => {})
      .finally(() => setLoadingCategories(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    // 1. التحقق من المصادقة
    if (!currentUser) {
      sessionStorage.setItem('applyStoreReturn', 'true');
      onNavigate('auth');
      return;
    }

    // 2. التحقق من الحقول
    if (!storeName.trim() || !phone.trim() || !categoryId || !address.trim()) {
      setSubmitError('يرجى ملء جميع الحقول المطلوبة (اسم المتجر، الهاتف، التصنيف، العنوان)');
      return;
    }

    // 3. التحقق من وجود متجر مسبق لنفس المالك
    const existingStore = await StorageRepo.getMyStore();
    if (existingStore) {
      setSubmitError('لديك بالفعل متجر مسجل (حتى لو قيد المراجعة). يمكنك تعديله من لوحة التحكم.');
      return;
    }

    // 4. بناء كائن المتجر (بدون حقول وهمية)
    const newStore: Partial<Store> = {
      name: storeName.trim(),
      slug: storeName.trim().toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36),
      owner_id: currentUser.id,
      category_id: categoryId,
      description: description.trim() || 'طلب انضمام متجر جديد',
      phone: phone.trim(),
      address: `${city.trim()} - ${address.trim()}`,
      // location نتركه فارغاً (سيُطلب لاحقاً)
      is_active: false,
      is_approved: false,
      // حقول أخرى تترك للافتراضيات
    };

    setIsSubmitting(true);
    try {
      const saved = await StorageRepo.saveStore(newStore, { isSelf: true });
      setApplicationId(saved.id.slice(0, 8).toUpperCase());
      setIsSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message || 'فشل تقديم الطلب، يرجى المحاولة لاحقاً');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (currentUser && sessionStorage.getItem('applyStoreReturn')) {
      sessionStorage.removeItem('applyStoreReturn');
    }
  }, [currentUser]);

  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto my-12 dir-rtl bg-white rounded-3xl p-8 border border-slate-200 shadow-lg text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">تم استلام طلبك بنجاح!</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            شكراً لانضمامك لمنصة "على بابك". طلبك حالياً قيد المراجعة والتدقيق من قِبل إدارة المنصة.
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-right space-y-2 font-bold text-slate-700">
          <p className="text-purple-700">رقم المرجعية: <span className="font-mono text-slate-900">{applicationId}</span></p>
          <p>اسم المتجر: <span className="text-slate-900">{storeName}</span></p>
          <p>رقم التواصل: <span className="text-slate-900 font-mono">{phone}</span></p>
          <p className="text-[10px] text-amber-600 font-normal">سيتم التواصل معك هاتفياً أو عبر الواتساب فور الموافقة لتفعيل لوحة تحكم متجرك.</p>
        </div>

        <button
          onClick={() => onNavigate('landing')}
          className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs shadow-xs"
        >
          العودة للصفحة الرئيسية
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 dir-rtl pb-16">
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-3xl p-8 text-center space-y-2 shadow-md">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold border border-white/20">
          <Sparkles className="w-4 h-4" />
          <span>انضمام المتاجر والشركاء</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">طلب انضمام صاحب متجر / محل</h1>
        <p className="text-xs text-purple-200">سجل بيانات متجرك الآن وابدأ في استقبال الطلبات المباشرة في منطقتك</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-4">
        {!currentUser && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-800 text-xs font-bold">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>يرجى <button type="button" onClick={() => onNavigate('auth')} className="underline font-extrabold">تسجيل الدخول</button> أولاً لتقديم طلب انضمام المتجر.</span>
          </div>
        )}

        {submitError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-bold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اسم المتجر / المحل *</label>
            <input
              type="text"
              required
              placeholder="مثال: ماركت الأمانة"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">اسم صاحب المتجر / المدير *</label>
            <input
              type="text"
              required
              placeholder="اسمك الثلاثي"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف والتواصل *</label>
            <input
              type="tel"
              required
              placeholder="010XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">القسم الرئيسي للمحل *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={loadingCategories}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-500 outline-none"
            >
              {loadingCategories ? (
                <option value="">جاري تحميل التصنيفات...</option>
              ) : (
                categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">المدينة / المنطقة *</label>
            <input
              type="text"
              required
              placeholder="مثال: القاهرة - المعادي"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">العنوان التفصيلي *</label>
            <input
              type="text"
              required
              placeholder="اسم الشارع - رقم المبنى - علامة مميزة"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">وصف مختصر للمنتجات وطبيعة المتجر</label>
          <textarea
            rows={3}
            placeholder="مثال: سوبرماركت يوفر ألبان، خضار، مجمدات، ومستلزمات منزلية مع خدمة سريعة..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none resize-none"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !currentUser}
            className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isSubmitting ? 'جاري إرسال الطلب...' : 'إرسال طلب الانضمام للمراجعة'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};