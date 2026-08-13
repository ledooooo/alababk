import React, { useState } from 'react';
import { StorageRepo } from '../../../lib/storage';
import { Coupon } from '../../../types/domain';
import { formatCurrency } from '../../../lib/formatters';
import { ShieldCheck, Plus, Trash2, Tag, Power, Loader2 } from 'lucide-react';
import { useToast } from '../../shared/Toast';

const todayPlus90 = () => {
  const d = new Date();
  d.setDate(d.getDate() + 90);
  return d.toISOString().slice(0, 10);
};

export default function AdminCouponsView() {
  const [coupons, setCoupons] = useState<Coupon[]>(StorageRepo.getCoupons());
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState(10);
  const [minOrder, setMinOrder] = useState(50);
  const [maxDiscount, setMaxDiscount] = useState<number | ''>('');
  const [usageLimit, setUsageLimit] = useState<number | ''>('');
  // القيمة الافتراضية 1 لأن الاتفاقية المعتادة لكوبونات زي "أول طلب" إن
  // كل عميل يستخدمها مرة واحدة بس — والأدمن يقدر يمسحها لو عايز الكوبون
  // بلا حد شخصي (حملات عامة قابلة للتكرار).
  const [maxUsesPerUser, setMaxUsesPerUser] = useState<number | ''>(1);
  const [validUntil, setValidUntil] = useState(todayPlus90());
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleCreateCoupon = async () => {
    if (!code.trim()) {
      showToast({ type: 'error', title: 'خطأ', message: 'ادخل رمز الكوبون أولاً (مثال: JIHAT15)' });
      return;
    }
    if (discountValue <= 0) {
      showToast({ type: 'error', title: 'خطأ', message: 'قيمة الخصم يجب أن تكون أكبر من صفر' });
      return;
    }
    if (discountType === 'percent' && discountValue > 100) {
      showToast({ type: 'error', title: 'خطأ', message: 'نسبة الخصم لا يمكن أن تتجاوز 100%' });
      return;
    }

    const newC: Coupon = {
      id: '',
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: Number(discountValue),
      min_order_amount: Number(minOrder),
      max_discount_amount: maxDiscount === '' ? undefined : Number(maxDiscount),
      usage_limit: usageLimit === '' ? undefined : Number(usageLimit),
      max_uses_per_user: maxUsesPerUser === '' ? undefined : Number(maxUsesPerUser),
      is_active: true,
      valid_until: validUntil,
    };

    setSaving(true);
    try {
      await StorageRepo.saveCoupon(newC);
      setCoupons(StorageRepo.getCoupons());
      setCode('');
      setMaxDiscount('');
      setUsageLimit('');
      setMaxUsesPerUser(1);
      showToast({ type: 'success', title: 'تم', message: 'تم إنشاء الكوبون بنجاح' });
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل الحفظ', message: err.message || 'تعذر إنشاء الكوبون — تأكد إن الرمز غير مستخدم من قبل' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    try {
      await StorageRepo.deleteCoupon(id);
      setCoupons(StorageRepo.getCoupons());
      showToast({ type: 'success', title: 'تم', message: 'تم حذف الكوبون' });
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل الحذف', message: err.message || 'تعذر حذف الكوبون' });
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    setTogglingId(coupon.id);
    try {
      await StorageRepo.saveCoupon({ ...coupon, is_active: !coupon.is_active });
      setCoupons(StorageRepo.getCoupons());
      showToast({
        type: 'success',
        title: 'تم',
        message: coupon.is_active ? 'تم إيقاف الكوبون' : 'تم تفعيل الكوبون',
      });
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل التحديث', message: err.message || 'تعذر تحديث حالة الكوبون' });
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 dir-rtl pb-16">
      <div>
        <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <Tag className="w-6 h-6 text-purple-600" />
          <span>كوبونات وأكواد الخصم الترويجية</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          إنشاء وإدارة كوبونات الخصم والخصومات الخاصة بالعملاء
        </p>
      </div>

      {/* New Coupon Form */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
          إنشاء كوبون خصم جديد
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">رمز الكوبون (الرمز البرومودي)</label>
            <input
              type="text"
              placeholder="مثال: JIHAT20"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">نوع الخصم</label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as 'percent' | 'fixed')}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="percent">نسبة مئوية (%)</option>
              <option value="fixed">مبلغ ثابت (ج.م)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">قيمة الخصم</label>
            <input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-700 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">الحد الأدنى لقيمة الطلب (ج.م)</label>
            <input
              type="number"
              value={minOrder}
              onChange={(e) => setMinOrder(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          {discountType === 'percent' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">أقصى قيمة خصم (ج.م) — اختياري</label>
              <input
                type="number"
                placeholder="بلا حد أقصى"
                value={maxDiscount}
                onChange={(e) => setMaxDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">أقصى عدد استخدام — اختياري</label>
            <input
              type="number"
              placeholder="بلا حد أقصى"
              value={usageLimit}
              onChange={(e) => setUsageLimit(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">أقصى عدد استخدام لكل عميل — اختياري</label>
            <input
              type="number"
              min={1}
              placeholder="بلا حد لكل عميل"
              value={maxUsesPerUser}
              onChange={(e) => setMaxUsesPerUser(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">اسيبه فاضي لو الكوبون ممكن يتكرر مرات لا نهائية لنفس العميل (مش الحالة الشائعة)</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">صالح حتى تاريخ</label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none dir-ltr"
            />
          </div>
        </div>

        <button
          onClick={handleCreateCoupon}
          disabled={saving}
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          <span>{saving ? 'جاري الحفظ...' : 'حفظ وتفعيل الكوبون'}</span>
        </button>
      </div>

      {/* Existing Coupons List */}
      <div className="space-y-3">
        {coupons.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between gap-3 text-xs"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-slate-900 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 text-sm">
                  {c.code}
                </span>
                <span className="font-bold text-emerald-700">
                  {c.discount_type === 'percent' ? `%${c.discount_value} خصم` : formatCurrency(c.discount_value)}
                </span>
                {!c.is_active && (
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">موقوف</span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                الحد الأدنى للطلب: {formatCurrency(c.min_order_amount)}
                {c.max_discount_amount ? ` • أقصى خصم: ${formatCurrency(c.max_discount_amount)}` : ''}
                {' '}• صالحة حتى {c.valid_until}
              </p>
              <p className="text-[11px] text-slate-500">
                الاستخدام: {c.used_count || 0}{c.usage_limit ? ` / ${c.usage_limit}` : ' (بلا حد أقصى)'}
                {c.max_uses_per_user ? ` • بحد أقصى ${c.max_uses_per_user} لكل عميل` : ''}
              </p>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleToggleActive(c)}
                disabled={togglingId === c.id}
                className={`p-2 rounded-xl transition-colors disabled:opacity-50 ${
                  c.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                }`}
                title={c.is_active ? 'إيقاف الكوبون' : 'تفعيل الكوبون'}
              >
                <Power className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteCoupon(c.id)}
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                title="حذف الكوبون"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}