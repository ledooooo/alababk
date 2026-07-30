import React, { useState } from 'react';
import { StorageRepo } from '../../../lib/storage';
import { formatCurrency } from '../../../lib/formatters';
import { Wallet, Truck, CheckCircle2, DollarSign, Calendar, Landmark, Smartphone, ArrowDownRight } from 'lucide-react';

export const DeliveryEarningsView: React.FC = () => {
  const currentAgent = StorageRepo.getCurrentAgent();
  const orders = StorageRepo.getOrders().filter(
    (o) => !currentAgent || o.delivery_agent_id === currentAgent.id
  );

  const completedDeliveries = orders.filter((o) => o.status === 'delivered');
  const deliveryCommissions = completedDeliveries.reduce((acc, o) => acc + o.delivery_fee, 0);
  const totalTips = completedDeliveries.reduce((acc, o) => acc + (o.tip_amount || 0), 0);
  const totalEarnings = deliveryCommissions + totalTips;

  const [payoutMethod, setPayoutMethod] = useState<'vodafone' | 'bank'>('vodafone');
  const [walletPhone, setWalletPhone] = useState(currentAgent?.phone || '01012345678');
  const [payoutAmount, setPayoutAmount] = useState(totalEarnings > 0 ? Math.floor(totalEarnings) : 350);
  const [successMsg, setSuccessMsg] = useState(false);

  const handlePayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 4000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 dir-rtl pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-950 text-white rounded-3xl p-6 sm:p-8 space-y-2 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-black">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black">محفظة الأرباح والعمولات</h1>
            <p className="text-xs text-emerald-200">متابعة العمولات المكتسبة عن كل رحلة توصيل، الإكراميات، وسحب الأرباح الفوري</p>
          </div>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-extrabold text-slate-500">عمولات التوصيل المكتسبة</span>
          <p className="text-2xl font-black text-slate-900">{formatCurrency(deliveryCommissions)}</p>
          <p className="text-[10px] text-slate-400">عن {completedDeliveries.length} طلبات توصيل مكتملة</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-extrabold text-amber-600">إجمالي إكراميات العملاء (Tips)</span>
          <p className="text-2xl font-black text-amber-600">+ {formatCurrency(totalTips)}</p>
          <p className="text-[10px] text-slate-400">100% مضافة لحسابك بدون اقتطاع</p>
        </div>

        <div className="bg-emerald-600 text-white rounded-2xl p-5 shadow-md space-y-1">
          <span className="text-[11px] font-extrabold text-emerald-100">الرصيد الكلي الجاهز للسحب</span>
          <p className="text-2xl font-black text-white">{formatCurrency(totalEarnings)}</p>
          <p className="text-[10px] text-emerald-200">جاهز للتحويل الفوري لمحافظ كاش</p>
        </div>
      </div>

      {/* Payout Request Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
          <span>طلب تحويل الأرباح</span>
          <span className="text-xs text-emerald-600 font-bold">بدون أي رسوم تحويل</span>
        </h2>

        {successMsg && (
          <div className="p-4 bg-emerald-50 text-emerald-900 rounded-2xl border border-emerald-200 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>تم تسجيل طلب السحب بنجاح! سيتم إرسال المبلغ لرقم المحفظة خلال ساعتين.</span>
          </div>
        )}

        <form onSubmit={handlePayoutSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">طريقة الاستلام</label>
              <select
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value as any)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="vodafone">فودافون كاش / أورنج كاش / اتصالات كاش</option>
                <option value="bank">تحويل إلى حساب بنكي / InstaPay</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم المحفظة / رقم InstaPay</label>
              <input
                type="text"
                required
                value={walletPhone}
                onChange={(e) => setWalletPhone(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ المراد سحبه (ج.م)</label>
            <input
              type="number"
              required
              min={50}
              max={totalEarnings > 0 ? totalEarnings : 5000}
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(Number(e.target.value))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={totalEarnings <= 0}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs rounded-2xl shadow-md transition-all"
          >
            تأكيد سحب الرصيد الآن
          </button>
        </form>
      </div>

      {/* Completed Runs History Log */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="font-black text-slate-900 text-base border-b border-slate-100 pb-3">سجل أرباح الرحلات والتوصيل</h2>

        <div className="space-y-3">
          {completedDeliveries.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              لا توجد رحلات توصيل مكتملة مسجلة بعد.
            </div>
          ) : (
            completedDeliveries.map((ord) => (
              <div
                key={ord.id}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900">طلب #{ord.order_number} ({ord.store_name})</p>
                    <p className="text-[10px] text-slate-500">{ord.delivery_address?.street || 'العنوان'}</p>
                  </div>
                </div>

                <div className="text-left font-bold">
                  <span className="text-emerald-700 text-sm font-black">{formatCurrency(ord.delivery_fee + (ord.tip_amount || 0))}</span>
                  <p className="text-[10px] text-slate-500">
                    رسوم {formatCurrency(ord.delivery_fee)} {ord.tip_amount ? `+ إكرامية ${formatCurrency(ord.tip_amount)}` : ''}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
