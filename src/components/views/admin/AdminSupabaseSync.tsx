import React, { useState, useEffect } from 'react';
import { checkSupabaseConnection, seedSupabaseDatabase, supabase } from '../../../lib/supabase';
import { Database, CheckCircle2, AlertTriangle, RefreshCw, Server, ShieldCheck, Cpu } from 'lucide-react';

export const AdminSupabaseSync: React.FC = () => {
  const [status, setStatus] = useState<{ connected: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [seeding, setSeeding] = useState<boolean>(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [tableCounts, setTableCounts] = useState<{ [table: string]: number }>({});

  const checkConnection = async () => {
    setLoading(true);
    const res = await checkSupabaseConnection();
    setStatus(res);

    if (res.connected) {
      const tables = [
        'profiles',
        'categories',
        'stores',
        'products',
        'addresses',
        'delivery_zones',
        'delivery_agents',
        'orders',
        'order_items',
        'reviews',
        'coupons',
        'notifications',
        'payouts',
      ];

      const counts: { [table: string]: number } = {};
      for (const t of tables) {
        try {
          const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
          counts[t] = count || 0;
        } catch {
          counts[t] = 0;
        }
      }
      setTableCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const handleSeed = async () => {
    if (!import.meta.env.DEV) {
      setSeedResult('عذراً، بذر البيانات التلقائي متاح فقط في بيئة التطوير (DEV) لحماية بيانات الإنتاج.');
      return;
    }
    setSeeding(true);
    const res = await seedSupabaseDatabase();
    setSeedResult(res.message);
    setSeeding(false);
    checkConnection();
  };

  return (
    <div className="space-y-6 dir-rtl">
      {/* Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-6 shadow-md flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-100 font-bold text-xs mb-1">
            <Database className="w-5 h-5" />
            <span>حالة اتصال الربط البرمجي السحابي (Supabase Real Backend)</span>
          </div>
          <h1 className="text-2xl font-black">ربط وقاعدة بيانات منصة "على بابك"</h1>
          <p className="text-xs text-emerald-100 mt-1 max-w-xl">
            مشروعك متصل حالياً بخادم Supabase الحقيقي بمعلومات الاعتماد الرسمية.
          </p>
        </div>
        <button
          onClick={checkConnection}
          disabled={loading}
          className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>فحص حالة الاتصال</span>
        </button>
      </div>

      {/* Connection Result */}
      {status && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-3 ${
            status.connected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          {status.connected ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
          )}
          <span>{status.message}</span>
        </div>
      )}

      {/* Credentials Summary */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-600" />
          <span>بيانات خادم Supabase المتصل به</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="text-[11px] font-bold text-slate-500">رابط قاعدة البيانات (Supabase URL):</span>
            <p className="font-mono text-emerald-700 font-bold dir-ltr text-right truncate">
              https://agfqhrbtfkvfinmljvcb.supabase.co
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="text-[11px] font-bold text-slate-500">المفتاح العام (Anon Key):</span>
            <p className="font-mono text-slate-600 text-[10px] dir-ltr text-right truncate">
              eyJhbGciOiJIUzI1NiIsInR5cCI6... (نشط وجاهز للعملاء)
            </p>
          </div>
        </div>
      </div>

      {/* Tables Status Grid */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-extrabold text-slate-900 text-base">جداول قاعدة البيانات الحقيقية ({Object.keys(tableCounts).length} جدول)</h2>
            <p className="text-xs text-slate-500 mt-0.5">عدد السجلات الحقيقية الموجودة في كل جدول بداخل Supabase DB</p>
          </div>

          {import.meta.env.DEV ? (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2"
            >
              <Cpu className={`w-4 h-4 ${seeding ? 'animate-spin' : ''}`} />
              <span>تغذية البيانات الأساسية (بيئة التطوير)</span>
            </button>
          ) : (
            <span className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold border border-slate-200">
              بذر البيانات معطّل في الإنتاج
            </span>
          )}
        </div>

        {seedResult && (
          <div className="p-3 bg-purple-50 border border-purple-200 text-purple-900 rounded-xl text-xs font-bold">
            {seedResult}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.entries(tableCounts).map(([tableName, count]) => (
            <div key={tableName} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
              <span className="text-[11px] font-mono font-bold text-slate-600 block">{tableName}</span>
              <div className="flex items-center justify-between">
                <span className="text-base font-black text-slate-900">{count}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  نشط
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
