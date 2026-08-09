import React, { useState } from 'react';
import { StorageRepo } from '../../../lib/storage';
import { Coupon } from '../../../types/domain';
import { formatCurrency } from '../../../lib/formatters';
import { ShieldCheck, Plus, Trash2, Tag } from 'lucide-react';
import { useToast } from '../../shared/Toast';

export const AdminCouponsView: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>(StorageRepo.getCoupons());
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState(10);
  const [minOrder, setMinOrder] = useState(50);
  const { showToast } = useToast();

  const handleCreateCoupon = () => {
    if (!code.trim()) {
      showToast({ type: 'error', title: 'خطأ', message: 'ادخل رمز الكوبون أولاً (مثال: JIHAT15)' });
      return;
    }

    const newC: Coupon = {
      id: `coup-${Date.now()}`,
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: Number(discountValue),
      min_order_amount: Number(minOrder),
      is_active: true,
      valid_until: '2026-12-31',
    };

    StorageRepo.saveCoupon(newC);
    setCoupons(StorageRepo.getCoupons());
    setCode('');
    showToast({ type: 'success', title: 'تم', message: 'تم إنشاء الكوبون بنجاح' });
  };

  const handleDeleteCoupon = (id: string) => {
    StorageRepo.deleteCoupon(id);
    setCoupons(StorageRepo.getCoupons());
    showToast({ type: 'success', title: 'تم', message: 'تم حذف الكوبون' });
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
        </div>

        <button
          onClick={handleCreateCoupon}
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>حفظ وتفعيل الكوبون</span>
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
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                الحد الأدنى للطلب: {formatCurrency(c.min_order_amount)} • صالحة حتى {c.valid_until}
              </p>
            </div>

            <button
              onClick={() => handleDeleteCoupon(c.id)}
              className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title="حذف الكوبون"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};