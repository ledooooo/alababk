import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { subscribeSupabase } from '../../../lib/supabase';
import { Payout } from '../../../types/domain';
import { formatCurrency, formatDate } from '../../../lib/formatters';
import { DollarSign, CheckCircle, Clock, AlertCircle, RefreshCw, Building2, Bike, Loader2 } from 'lucide-react';
import { useToast } from '../../shared/Toast';
import { useConfirm } from '../../shared/ConfirmDialog';

export const AdminPayoutsView: React.FC = () => {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<'all' | 'store' | 'agent'>('all');
  const [message, setMessage] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  const loadPayouts = async () => {
    setLoading(true);
    await StorageRepo.refreshPayouts();
    setPayouts(StorageRepo.getPayouts());
    setLoading(false);
  };

  useEffect(() => {
    const sync = () => {
      setPayouts(StorageRepo.getPayouts());
    };

    sync();
    StorageRepo.refreshPayouts().then(() => setLoading(false));

    const unsubStorage = subscribeToStorageChange(() => {
      sync();
    });

    const unsubRealtime = subscribeSupabase<Payout>('payouts', () => {
      StorageRepo.refreshPayouts();
    });

    return () => {
      unsubStorage();
      unsubRealtime();
    };
  }, []);

  const handleUpdateStatus = (payoutId: string, newStatus: 'completed' | 'failed', amount: number, recipientName: string) => {
    const statusLabel = newStatus === 'completed' ? 'تأكيد التسوية' : 'رفض التسوية';
    const confirmMessage = newStatus === 'completed'
      ? `هل أنت متأكد من تأكيد تحويل مبلغ ${formatCurrency(amount)} للمستفيد "${recipientName}"؟`
      : `هل أنت متأكد من رفض تحويل مبلغ ${formatCurrency(amount)} للمستفيد "${recipientName}"؟`;

    showConfirm({
      title: statusLabel,
      message: confirmMessage,
      variant: newStatus === 'completed' ? 'info' : 'danger',
      confirmLabel: statusLabel,
      onConfirm: async () => {
        try {
          setSubmittingId(payoutId);
          await StorageRepo.updatePayoutStatus(payoutId, newStatus);
          showToast({
            type: 'success',
            title: 'تم التحديث',
            message: `تم تحديث حالة التسوية إلى (${newStatus === 'completed' ? 'تمت التسوية بنجاح' : 'تعذرت التسوية'})`,
          });
        } catch (err: any) {
          showToast({
            type: 'error',
            title: 'فشل التحديث',
            message: err.message || 'تعذر تحديث التسوية',
          });
        } finally {
          setSubmittingId(null);
        }
      },
    });
  };

  const filtered = payouts.filter((p) => {
    if (filterType === 'all') return true;
    return p.recipient_type === filterType;
  });

  const totalCompleted = payouts
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = payouts
    .filter((p) => p.status === 'pending' || p.status === 'processing')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6 dir-rtl">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm mb-1">
            <DollarSign className="w-5 h-5" />
            <span>تسويات الأرباح والمستحقات (جدول Supabase Payouts)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">سجل المدفوعات والتحويلات المالية</h1>
          <p className="text-xs text-slate-500 mt-1">
            إدارة تسوية أرباح المتاجر وعمولات كباتن التوصيل في منصة علي بابك
          </p>
        </div>
        <button
          onClick={loadPayouts}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث التسويات</span>
        </button>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-bold text-slate-500">إجمالي المحول للمتاجر والكباتن</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(totalCompleted)}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-bold text-slate-500">مستحقات قيد الانتظار والتحويل</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{formatCurrency(totalPending)}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-bold text-slate-500">إجمالي عدد طلبات التسوية</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{payouts.length} طلب</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200/80">
        <button
          onClick={() => setFilterType('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            filterType === 'all' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          الكل ({payouts.length})
        </button>
        <button
          onClick={() => setFilterType('store')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            filterType === 'store' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>تسويات المتاجر</span>
        </button>
        <button
          onClick={() => setFilterType('agent')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            filterType === 'agent' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Bike className="w-4 h-4" />
          <span>مستحقات الكباتن</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-extrabold">
              <tr>
                <th className="p-3.5">المستفيد</th>
                <th className="p-3.5">النوع</th>
                <th className="p-3.5">المبلغ</th>
                <th className="p-3.5">طريقة التحويل</th>
                <th className="p-3.5">الرقم المرجعي</th>
                <th className="p-3.5">التاريخ</th>
                <th className="p-3.5">الحالة</th>
                <th className="p-3.5 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5 font-extrabold text-slate-900">{p.recipient_name || p.recipient_id}</td>
                  <td className="p-3.5">
                    {p.recipient_type === 'store' ? (
                      <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px] inline-flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> متجر
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg bg-orange-50 text-orange-700 font-bold text-[11px] inline-flex items-center gap-1">
                        <Bike className="w-3 h-3" /> كابتن
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 font-black text-slate-900">{formatCurrency(p.amount)}</td>
                  <td className="p-3.5 text-slate-600">{p.method || 'تحويل بنكي / محفظة'}</td>
                  <td className="p-3.5 font-mono text-[11px] text-slate-500">{p.reference || '—'}</td>
                  <td className="p-3.5 text-slate-500">{formatDate(p.created_at)}</td>
                  <td className="p-3.5">
                    {p.status === 'completed' && (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] font-bold inline-flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> تم التحويل
                      </span>
                    )}
                    {p.status === 'pending' && (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-lg text-[10px] font-bold inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 animate-pulse" /> قيد المراجعة
                      </span>
                    )}
                    {p.status === 'failed' && (
                      <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg text-[10px] font-bold inline-flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> متعثر
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 text-center">
                    {p.status === 'pending' && (
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleUpdateStatus(p.id, 'completed', p.amount, p.recipient_name || '')}
                          disabled={submittingId === p.id}
                          className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-[11px] font-bold transition-colors disabled:opacity-50"
                        >
                          تأكيد التحويل
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(p.id, 'failed', p.amount, p.recipient_name || '')}
                          disabled={submittingId === p.id}
                          className="px-2.5 py-1 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg text-[11px] font-bold transition-colors disabled:opacity-50"
                        >
                          إلغاء
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};