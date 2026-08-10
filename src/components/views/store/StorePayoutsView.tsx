import React, { useState, useEffect } from 'react';
import { StorageRepo } from '../../../lib/storage';
import { ensureUUID } from '../../../lib/supabase';
import { Payout, Store } from '../../../types/domain';
import { formatCurrency, formatDateArabic } from '../../../lib/formatters';
import { Wallet, ArrowDownRight, Building2, CheckCircle2, Clock, Landmark, Smartphone, AlertCircle, Loader2 } from 'lucide-react';

export default function StorePayoutsView() {
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [storeLoading, setStoreLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    StorageRepo.getCurrentStore().then((store) => {
      if (isMounted) {
        setCurrentStore(store);
        setStoreLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const orders = StorageRepo.getOrders().filter(
    (o) => !currentStore || o.store_id === currentStore.id
  );

  const completedOrders = orders.filter((o) => o.status === 'delivered');
  const grossSales = completedOrders.reduce((acc, o) => acc + o.subtotal, 0);
  const platformFee = grossSales * 0.10; // 10% platform commission
  const netEarnings = grossSales - platformFee;

  const [payoutMethod, setPayoutMethod] = useState<'vodafone' | 'bank'>('vodafone');
  const [accountNumber, setAccountNumber] = useState('01012345678');
  const [requestedAmount, setRequestedAmount] = useState(netEarnings > 0 ? Math.floor(netEarnings) : 500);
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [storePayouts, setStorePayouts] = useState<Payout[]>([]);

  useEffect(() => {
    const user = StorageRepo.getCurrentUser();
    if (user?.id) {
      StorageRepo.refreshPayouts().then(() => {
        const all = StorageRepo.getPayouts();
        setStorePayouts(all.filter((p) => p.recipient_id === user.id || p.recipient_id === currentStore?.id));
      });
    }
  }, [currentStore?.id]);

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    const user = StorageRepo.getCurrentUser();
    if (!user?.id) {
      setErrorMessage('يرجى تسجيل الدخول أولاً لإرسال طلب السحب');
      return;
    }

    try {
      setSubmitting(true);
      const newPayout: Payout = {
        id: ensureUUID(),
        recipient_id: user.id, // auth.uid()
        recipient_name: currentStore?.name || user.name || 'متجر',
        recipient_type: 'store',
        amount: Number(requestedAmount),
        status: 'pending',
        method: payoutMethod === 'vodafone' ? 'محفظة كاش' : 'حساب بنكي',
        account_details: accountNumber,
        created_at: new Date().toISOString(),
      };

      await StorageRepo.savePayout(newPayout);
      setStorePayouts((prev) => [newPayout, ...prev]);
      setPayoutSuccess(true);
      setTimeout(() => setPayoutSuccess(false), 5000);
    } catch (err: any) {
      console.error('Failed to submit payout request:', err);
      setErrorMessage(err?.message || 'تعذر إرسال طلب السحب. يرجى المحاولة لاحقاً');
    } finally {
      setSubmitting(false);
    }
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
            <h1 className="text-xl sm:text-2xl font-black">المستحقات وسحب الأرباح للمتجر</h1>
            <p className="text-xs text-emerald-200">إدارة الأرباح الصافية، وتتبع عمليات التحويل الدوري لحسابك البنكي أو المحفظة الإلكترونية</p>
          </div>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-extrabold text-slate-500">إجمالي مبيعات الطلبات</span>
          <p className="text-2xl font-black text-slate-900">{formatCurrency(grossSales)}</p>
          <p className="text-[10px] text-slate-400">من واقع {completedOrders.length} طلب مكتمل</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-1">
          <span className="text-[11px] font-extrabold text-rose-600">عمولة المنصة (10%)</span>
          <p className="text-2xl font-black text-rose-600">- {formatCurrency(platformFee)}</p>
          <p className="text-[10px] text-slate-400">رسوم التشغيل والدعم الفني</p>
        </div>

        <div className="bg-emerald-600 text-white rounded-2xl p-5 shadow-md space-y-1">
          <span className="text-[11px] font-extrabold text-emerald-100">الرصيد المتاح للسحب الآن</span>
          <p className="text-2xl font-black text-white">{formatCurrency(netEarnings)}</p>
          <p className="text-[10px] text-emerald-200">صافي المستحقات الجاهزة للتحويل</p>
        </div>
      </div>

      {/* Payout Request Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5">
        <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
          <span>طلب سحب رصيد جديد</span>
          <span className="text-xs text-emerald-600 font-bold">الحد الأدنى للسحب: 100 ج.م</span>
        </h2>

        {errorMessage && (
          <div className="p-4 bg-rose-50 text-rose-900 rounded-2xl border border-rose-200 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {payoutSuccess && (
          <div className="p-4 bg-emerald-50 text-emerald-900 rounded-2xl border border-emerald-200 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>تم تسجيل طلب السحب بنجاح في قاعدة البيانات! حالة الطلب: (قيد الانتظار - Pending).</span>
          </div>
        )}

        <form onSubmit={handlePayoutSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">وسيلة التحويل المفضلة</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPayoutMethod('vodafone')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    payoutMethod === 'vodafone'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>محفظة كاش</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayoutMethod('bank')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    payoutMethod === 'bank'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Landmark className="w-4 h-4" />
                  <span>حساب بنكي</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {payoutMethod === 'vodafone' ? 'رقم المحفظة الإلكترونية' : 'رقم الحساب البنكي / IBAN'}
              </label>
              <input
                type="text"
                required
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">المبلغ المطلوب سحبه (ج.م)</label>
            <input
              type="number"
              required
              min={100}
              max={netEarnings > 0 ? netEarnings : 100000}
              value={requestedAmount}
              onChange={(e) => setRequestedAmount(Number(e.target.value))}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || netEarnings <= 0}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{submitting ? 'جاري إرسال الطلب...' : 'تأكيد وإرسال طلب التحويل'}</span>
          </button>
        </form>
      </div>

      {/* Payout History Log */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="font-black text-slate-900 text-base border-b border-slate-100 pb-3">سجل عمليات التحويل السابقة</h2>

        <div className="space-y-3">
          {storePayouts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-bold">
              لا توجد طلبات سحب سابقة مسجلة.
            </div>
          ) : (
            storePayouts.map((p) => (
              <div
                key={p.id}
                className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl ${
                      p.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : p.status === 'failed'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {p.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : p.status === 'failed' ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <Clock className="w-5 h-5 animate-pulse" />
                    )}
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900">
                      تحويل {p.method || 'وسيلة إلكترونية'} ({p.account_details || '—'})
                    </p>
                    <p className="text-[10px] text-slate-500">{formatDateArabic(p.created_at)}</p>
                  </div>
                </div>

                <div className="text-left">
                  <span className="font-black text-slate-900 text-sm">{formatCurrency(p.amount)}</span>
                  <p
                    className={`text-[10px] font-bold ${
                      p.status === 'completed'
                        ? 'text-emerald-700'
                        : p.status === 'failed'
                        ? 'text-rose-700'
                        : 'text-amber-700'
                    }`}
                  >
                    {p.status === 'completed'
                      ? 'مكتمل بنجاح'
                      : p.status === 'failed'
                      ? 'تعثر / مرفوض'
                      : 'قيد المراجعة (Pending)'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
