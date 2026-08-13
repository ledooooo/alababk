import React, { useEffect, useState } from 'react';
import { Shield, FileText, RefreshCw, Search, Store, User, Wallet } from 'lucide-react';
import { fetchActivityLog, ActivityLogEntry } from '../../../lib/supabase';
import { formatTimeAgo } from '../../../lib/formatters';

// كل الأحداث اللي فعليًا بتتسجل تلقائيًا حاليًا (triggers على stores/profiles
// + process_payout_secure). راجع fix_07_activity_log_triggers.sql.
const ACTION_LABELS: Record<string, { label: string; category: 'stores' | 'users' | 'payouts'; icon: React.ElementType }> = {
  store_approved: { label: 'تمت الموافقة على متجر', category: 'stores', icon: Store },
  store_rejected: { label: 'تم رفض/إلغاء اعتماد متجر', category: 'stores', icon: Store },
  store_commission_changed: { label: 'تم تعديل نسبة عمولة متجر', category: 'stores', icon: Store },
  store_activated: { label: 'تم تفعيل متجر', category: 'stores', icon: Store },
  store_deactivated: { label: 'تم تعطيل متجر', category: 'stores', icon: Store },
  store_deleted: { label: 'تم حذف متجر', category: 'stores', icon: Store },
  user_activated: { label: 'تم تفعيل حساب مستخدم', category: 'users', icon: User },
  user_deactivated: { label: 'تم تعطيل حساب مستخدم', category: 'users', icon: User },
  user_role_changed: { label: 'تم تغيير صلاحية مستخدم', category: 'users', icon: User },
  payout_processed: { label: 'معالجة طلب سحب أرباح', category: 'payouts', icon: Wallet },
};

function describeEntry(entry: ActivityLogEntry): string {
  const name = entry.metadata?.name || entry.metadata?.full_name;
  switch (entry.action) {
    case 'store_commission_changed':
      return `${name || 'متجر'}: العمولة اتغيّرت من ${entry.metadata?.old_commission_pct}% إلى ${entry.metadata?.new_commission_pct}%`;
    case 'user_role_changed':
      return `${name || 'مستخدم'}: الدور اتغيّر من "${entry.metadata?.old_role}" إلى "${entry.metadata?.new_role}"`;
    default:
      return name ? `بخصوص: ${name}` : '';
  }
}

export default function AdminActivityLogView() {
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchActivityLog(100);
      setLogs(data);
    } catch (err: any) {
      setError(err.message || 'تعذر تحميل سجل النشاطات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = logs.filter((l) => {
    const meta = ACTION_LABELS[l.action];
    const category = meta?.category || 'other';
    const matchCategory = filterType === 'all' || category === filterType;
    const label = meta?.label || l.action;
    const q = query.trim().toLowerCase();
    const matchQuery =
      !q ||
      label.toLowerCase().includes(q) ||
      describeEntry(l).toLowerCase().includes(q) ||
      (l.actor_name || '').toLowerCase().includes(q);

    return matchCategory && matchQuery;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 dir-rtl pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 space-y-2 shadow-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-black">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black">سجل النشاطات والأحداث (Audit Log)</h1>
              <p className="text-xs text-indigo-200">موافقات/تعطيل المتاجر، تغيير العمولات، تفعيل/تعطيل حسابات المستخدمين، وعمليات السحب المالي</p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50 shrink-0"
            title="تحديث"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              placeholder="البحث في سجل النشاطات..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { key: 'all', label: 'الكل' },
              { key: 'stores', label: 'المتاجر' },
              { key: 'users', label: 'المستخدمين' },
              { key: 'payouts', label: 'المالية' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterType(f.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  filterType === f.key ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Log Timeline */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="font-black text-slate-900 text-base border-b border-slate-100 pb-3">الأحداث المسجلة حديثاً</h2>

        {loading && <p className="text-xs text-slate-400 text-center py-8">جارٍ التحميل...</p>}

        {!loading && error && (
          <p className="text-xs text-rose-600 text-center py-8 font-bold">{error}</p>
        )}

        {!loading && !error && filtered.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-8">لا توجد أحداث مسجّلة بعد</p>
        )}

        {!loading && !error && (
          <div className="space-y-3">
            {filtered.map((log) => {
              const meta = ACTION_LABELS[log.action];
              const Icon = meta?.icon || FileText;
              return (
                <div
                  key={log.id}
                  className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700 shrink-0 mt-0.5">
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-extrabold text-slate-900 text-xs">{meta?.label || log.action}</h3>
                        {log.actor_name && (
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold">
                            {log.actor_name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-medium">{describeEntry(log)}</p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-slate-400 shrink-0">{formatTimeAgo(log.created_at)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
