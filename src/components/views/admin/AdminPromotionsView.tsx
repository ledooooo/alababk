import React, { useState, useEffect } from 'react';
import {
  fetchAllPromotionsAdmin,
  savePromotion,
  deletePromotion,
  Promotion,
  fetchSupabaseStores,
  fetchSupabaseCategories,
} from '../../../lib/supabase';
import { Store, Category } from '../../../types/domain';
import { PROMO_THEMES, PROMO_ICONS, PROMO_ACTION_TYPES, PromoTheme, PromoIconKey } from '../../../lib/promo-presets';
import { Sparkles, Plus, Pencil, Trash2, X, Loader2, Eye, EyeOff, GripVertical, AlertCircle } from 'lucide-react';
import { useToast } from '../../shared/Toast';
import { useConfirm } from '../../shared/ConfirmDialog';

type PromoFormState = Partial<Promotion>;

const emptyForm: PromoFormState = {
  title: '',
  highlight_text: '',
  description: '',
  badge_label: '',
  theme: 'blue',
  icon: 'sparkles',
  coupon_code: '',
  action_type: 'stores',
  action_target: '',
  action_label: 'تصفح الآن',
  display_order: 0,
  is_active: true,
  starts_at: '',
  ends_at: '',
};

export default function AdminPromotionsView() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoFormState | null>(null);
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  const load = async () => {
    setLoading(true);
    try {
      const [promos, allStores, allCategories] = await Promise.all([
        fetchAllPromotionsAdmin(),
        fetchSupabaseStores(),
        fetchSupabaseCategories(),
      ]);
      setPromotions(promos);
      setStores(allStores);
      setCategories(allCategories);
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل التحميل', message: err.message || 'تعذر تحميل العروض' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreateModal = () => {
    setEditingPromo({ ...emptyForm, display_order: promotions.length });
  };

  const openEditModal = (p: Promotion) => {
    setEditingPromo({ ...p });
  };

  const handleSave = async () => {
    if (!editingPromo) return;
    if (!editingPromo.title?.trim() || !editingPromo.highlight_text?.trim() || !editingPromo.description?.trim() || !editingPromo.badge_label?.trim() || !editingPromo.action_label?.trim()) {
      showToast({ type: 'error', title: 'بيانات ناقصة', message: 'يرجى ملء كل الحقول الأساسية (العنوان، النص المميز، الوصف، الشارة، نص الزرار)' });
      return;
    }
    if (editingPromo.action_type !== 'stores' && !editingPromo.action_target?.trim()) {
      showToast({ type: 'error', title: 'بيانات ناقصة', message: 'يرجى تحديد الهدف (متجر/تصنيف/رابط) المناسب لنوع الإجراء المختار' });
      return;
    }

    setIsSaving(true);
    try {
      await savePromotion(editingPromo);
      showToast({ type: 'success', title: 'تم الحفظ', message: 'تم حفظ العرض بنجاح' });
      setEditingPromo(null);
      await load();
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل الحفظ', message: err.message || 'تعذر حفظ العرض' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (p: Promotion) => {
    showConfirm({
      title: 'حذف العرض',
      message: `متأكد إنك عايز تحذف عرض "${p.title}"؟ الإجراء ده نهائي.`,
      confirmLabel: 'حذف',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deletePromotion(p.id);
          showToast({ type: 'success', title: 'تم الحذف', message: 'تم حذف العرض' });
          await load();
        } catch (err: any) {
          showToast({ type: 'error', title: 'فشل الحذف', message: err.message || 'تعذر حذف العرض' });
        }
      },
    });
  };

  const toggleActive = async (p: Promotion) => {
    try {
      await savePromotion({ ...p, is_active: !p.is_active });
      showToast({ type: 'success', title: 'تم التحديث', message: `تم ${!p.is_active ? 'تفعيل' : 'تعطيل'} العرض` });
      await load();
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل التحديث', message: err.message || 'تعذر تغيير حالة العرض' });
    }
  };

  return (
    <div className="space-y-6 dir-rtl pb-16">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            <span>إدارة العروض الترويجية</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            الشرائح اللي بتظهر في كاروسيل العروض بالصفحة الرئيسية للعميل
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>عرض جديد</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
          <span className="text-xs font-bold text-slate-500">جاري تحميل العروض...</span>
        </div>
      ) : promotions.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
          <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-500">مفيش أي عروض حاليًا</p>
          <p className="text-xs text-slate-400">دوس "عرض جديد" عشان تضيف أول شريحة تظهر للعملاء</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promotions.map((p) => {
            const theme = PROMO_THEMES[p.theme] || PROMO_THEMES.blue;
            const iconConf = PROMO_ICONS[p.icon] || PROMO_ICONS.sparkles;
            const Icon = iconConf.Icon;
            const isExpired = p.ends_at && new Date(p.ends_at) < new Date();
            const isScheduled = p.starts_at && new Date(p.starts_at) > new Date();

            return (
              <div key={p.id} className={`bg-white rounded-2xl border overflow-hidden shadow-xs ${p.is_active ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
                <div className={`bg-gradient-to-r ${theme.bgGradient} p-4 flex items-center gap-3`}>
                  <div className="p-2 bg-white/10 rounded-xl border border-white/20 shrink-0">
                    <Icon className={`w-5 h-5 ${theme.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0 text-white">
                    <p className="font-black text-sm truncate">{p.title}</p>
                    <p className="text-xs text-white/70 truncate">{p.highlight_text}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${theme.badgeBg}`}>
                    {p.badge_label}
                  </span>
                </div>

                <div className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      ترتيب: {p.display_order}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {PROMO_ACTION_TYPES.find((a) => a.value === p.action_type)?.label}
                    </span>
                    {isExpired && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> منتهي
                      </span>
                    )}
                    {isScheduled && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> مجدول لاحقًا
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(p)}
                      className={`p-2 rounded-xl transition-colors ${p.is_active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      title={p.is_active ? 'إخفاء العرض' : 'إظهار العرض'}
                    >
                      {p.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => openEditModal(p)}
                      className="p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                      title="تعديل"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(p)}
                      className="p-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editingPromo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full my-8 p-6 space-y-5 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-sm">{editingPromo.id ? 'تعديل العرض' : 'عرض جديد'}</h3>
              <button onClick={() => setEditingPromo(null)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">العنوان الرئيسي</label>
                <input
                  value={editingPromo.title || ''}
                  onChange={(e) => setEditingPromo({ ...editingPromo, title: e.target.value })}
                  placeholder="مثال: خصم 50 جنيه على طلبك الأول"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">النص المميز (تحت العنوان)</label>
                <input
                  value={editingPromo.highlight_text || ''}
                  onChange={(e) => setEditingPromo({ ...editingPromo, highlight_text: e.target.value })}
                  placeholder="مثال: كوبون WELCOME50"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">الوصف</label>
                <textarea
                  value={editingPromo.description || ''}
                  onChange={(e) => setEditingPromo({ ...editingPromo, description: e.target.value })}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">شارة أعلى الشريحة</label>
                  <input
                    value={editingPromo.badge_label || ''}
                    onChange={(e) => setEditingPromo({ ...editingPromo, badge_label: e.target.value })}
                    placeholder="خصم الترحيب 🎁"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">كود الكوبون (اختياري)</label>
                  <input
                    value={editingPromo.coupon_code || ''}
                    onChange={(e) => setEditingPromo({ ...editingPromo, coupon_code: e.target.value })}
                    placeholder="WELCOME50"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">لون الشريحة</label>
                  <select
                    value={editingPromo.theme || 'blue'}
                    onChange={(e) => setEditingPromo({ ...editingPromo, theme: e.target.value as PromoTheme })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {Object.entries(PROMO_THEMES).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الأيقونة</label>
                  <select
                    value={editingPromo.icon || 'sparkles'}
                    onChange={(e) => setEditingPromo({ ...editingPromo, icon: e.target.value as PromoIconKey })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {Object.entries(PROMO_ICONS).map(([key, val]) => (
                      <option key={key} value={key}>{val.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">عند الضغط على الزرار، اذهب إلى</label>
                <select
                  value={editingPromo.action_type || 'stores'}
                  onChange={(e) => setEditingPromo({ ...editingPromo, action_type: e.target.value as any, action_target: '' })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {PROMO_ACTION_TYPES.map((a) => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>

              {editingPromo.action_type === 'store_detail' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اختر المتجر</label>
                  <select
                    value={editingPromo.action_target || ''}
                    onChange={(e) => setEditingPromo({ ...editingPromo, action_target: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- اختر متجر --</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {editingPromo.action_type === 'category' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">اختر التصنيف</label>
                  <select
                    value={editingPromo.action_target || ''}
                    onChange={(e) => setEditingPromo({ ...editingPromo, action_target: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- اختر تصنيف --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {editingPromo.action_type === 'external_url' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">الرابط الخارجي</label>
                  <input
                    value={editingPromo.action_target || ''}
                    onChange={(e) => setEditingPromo({ ...editingPromo, action_target: e.target.value })}
                    placeholder="https://..."
                    dir="ltr"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-left"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">نص زرار الإجراء</label>
                <input
                  value={editingPromo.action_label || ''}
                  onChange={(e) => setEditingPromo({ ...editingPromo, action_label: e.target.value })}
                  placeholder="تسوق الآن"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">يبدأ العرض في (اختياري)</label>
                  <input
                    type="datetime-local"
                    value={editingPromo.starts_at ? editingPromo.starts_at.slice(0, 16) : ''}
                    onChange={(e) => setEditingPromo({ ...editingPromo, starts_at: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ينتهي العرض في (اختياري)</label>
                  <input
                    type="datetime-local"
                    value={editingPromo.ends_at ? editingPromo.ends_at.slice(0, 16) : ''}
                    onChange={(e) => setEditingPromo({ ...editingPromo, ends_at: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">ترتيب الظهور</label>
                  <input
                    type="number"
                    min={0}
                    value={editingPromo.display_order ?? 0}
                    onChange={(e) => setEditingPromo({ ...editingPromo, display_order: Number(e.target.value) })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <label className="flex items-center gap-2 pb-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={editingPromo.is_active ?? true}
                    onChange={(e) => setEditingPromo({ ...editingPromo, is_active: e.target.checked })}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <span className="font-bold text-slate-700">فعّال (ظاهر للعملاء)</span>
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setEditingPromo(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>حفظ العرض</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
