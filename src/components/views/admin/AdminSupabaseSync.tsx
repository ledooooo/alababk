import React, { useState, useEffect } from 'react';
import { supabase, checkSupabaseConnection, isSupabaseConfigured, getSupabaseUrl } from '../../../lib/supabase';
import { Database, CheckCircle2, AlertTriangle, RefreshCw, Server, ShieldCheck, ExternalLink } from 'lucide-react';

export default function AdminSupabaseSync() {
  const [status, setStatus] = useState<{ connected: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [tableCounts, setTableCounts] = useState<{ [table: string]: number }>({});
  const configured = isSupabaseConfigured();
  const supabaseUrl = getSupabaseUrl();

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
      await Promise.all(
        tables.map(async (t) => {
          try {
            const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
            counts[t] = count || 0;
          } catch {
            counts[t] = 0;
          }
        })
      );
      setTableCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkConnection();
  }, []);

  if (!configured) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-amber-600 mx-auto" />
        <h3 className="font-bold text-slate-900 text-lg">⚠️ لم يتم تهيئة الاتصال بقاعدة البيانات</h3>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          يرجى إنشاء ملف <code className="bg-slate-100 px-2 py-0.5 rounded font-mono text-xs">.env</code> في جذر المشروع
          وإضافة المتغيرات التالية:
        </p>
        <div className="bg-slate-800 text-white rounded-xl p-4 text-left font-mono text-xs max-w-lg mx-auto">
          <div>VITE_SUPABASE_URL="https://your-project.supabase.co"</div>
          <div>VITE_SUPABASE_ANON_KEY="your-anon-key"</div>
        </div>
        <p className="text-xs text-slate-500">
          يمكنك الحصول على هذه القيم من لوحة تحكم Supabase في قسم Project Settings &gt; API.
        </p>
        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
        >
          <ExternalLink className="w-4 h-4" />
          الذهاب إلى Supabase Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6 dir-rtl">
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

      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <h2 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-600" />
          <span>بيانات خادم Supabase المتصل به</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="text-[11px] font-bold text-slate-500">رابط قاعدة البيانات (Supabase URL):</span>
            <p className="font-mono text-emerald-700 font-bold dir-ltr text-right truncate">
              {supabaseUrl || 'غير محدّد'}
            </p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="text-[11px] font-bold text-slate-500">المفتاح العام (Anon Key):</span>
            <p className="font-mono text-slate-600 text-[10px] dir-ltr text-right truncate">
              {import.meta.env.VITE_SUPABASE_ANON_KEY ? '•••••••• (نشط وجاهز للعملاء)' : 'غير محدّد'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-extrabold text-slate-900 text-base">جداول قاعدة البيانات الحقيقية ({Object.keys(tableCounts).length} جدول)</h2>
            <p className="text-xs text-slate-500 mt-0.5">عدد السجلات الحقيقية الموجودة في كل جدول بداخل Supabase DB</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-xl text-xs font-bold border border-slate-200">
              البذر متاح فقط عبر السكربت الخادمي
            </span>
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
        </div>
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