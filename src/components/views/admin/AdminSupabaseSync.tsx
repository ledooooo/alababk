import React, { useState, useEffect } from 'react';
import { supabase, checkSupabaseConnection, isSupabaseConfigured, getSupabaseUrl } from '../../../lib/supabase';
import { Database, CheckCircle2, AlertTriangle, RefreshCw, Server, ShieldCheck, Cpu, ExternalLink } from 'lucide-react';

export const AdminSupabaseSync: React.FC = () => {
  const [status, setStatus] = useState<{ connected: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [tableCounts, setTableCounts] = useState<{ [table: string]: number }>({});
  const [isConfigured, setIsConfigured] = useState<boolean>(false);

  const checkConnectionAndCounts = async () => {
    setLoading(true);

    // 1. التحقق من التهيئة
    const configured = isSupabaseConfigured();
    setIsConfigured(configured);
    if (!configured) {
      setStatus({
        connected: false,
        message: '⚠️ لم يتم تعيين متغيرات البيئة. يرجى إضافة VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY.',
      });
      setLoading(false);
      return;
    }

    // 2. فحص الاتصال
    const res = await checkSupabaseConnection();
    setStatus(res);

    // 3. إذا كان الاتصال ناجحاً، نجلب عدد السجلات لكل جدول بالتوازي
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
        'contact_messages',
      ];

      const counts: { [table: string]: number } = {};
      // استخدام Promise.all لتشغيل الاستعلامات بالتوازي
      await Promise.all(
        tables.map(async (t) => {
          try {
            const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
            counts[t] = count || 0;
          } catch {
            counts[t] = 0; // في حالة فشل الجلب، نضع 0
          }
        })
      );
      setTableCounts(counts);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkConnectionAndCounts();
  }, []);

  const isDevEnv = !!((import.meta as unknown as { env: Record<string, string> }).env?.DEV);

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
          onClick={checkConnectionAndCounts}
          disabled={loading}
          className="px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm disabled:opacity-50"
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
              {isConfigured ? getSupabaseUrl() : 'غير محدّد'}
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <span className="text-[11px] font-bold text-slate-500">المفتاح العام (Anon Key):</span>
            <p className="font-mono text-slate-600 text-[10px] dir-ltr text-right truncate">
              {isConfigured ? '•••••••• (نشط وجاهز للعملاء)' : 'غير محدّد'}
            </p>
          </div>
        </div>
        {!isConfigured && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>لم يتم تهيئة الاتصال. يرجى إضافة متغيرات البيئة VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في ملف .env.</span>
          </div>
        )}
      </div>

      {/* Tables Status Grid */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-extrabold text-slate-900 text-base">جداول قاعدة البيانات ({Object.keys(tableCounts).length} جدول)</h2>
            <p className="text-xs text-slate-500 mt-0.5">عدد السجلات الحقيقية الموجودة في كل جدول بداخل Supabase DB</p>
          </div>

          {/* زر البذر - معطل ويعرض رسالة بأنه يتم عبر سكربت خارجي */}
          <div className="relative group">
            <button
              disabled
              className="px-4 py-2 bg-slate-300 cursor-not-allowed text-slate-600 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2"
            >
              <Cpu className="w-4 h-4" />
              <span>تغذية البيانات (خارجي)</span>
            </button>
            <div className="absolute bottom-full right-0 mb-2 w-64 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              يتم تشغيل بذر البيانات عبر سكربت Node.js مستقل باستخدام service_role key لحماية بيانات الإنتاج.
              <br />
              <span className="text-emerald-300">راجع ملف scripts/seed-db.ts</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Object.entries(tableCounts).length === 0 && !loading ? (
            <div className="col-span-full text-center text-slate-400 text-xs py-8">
              لا توجد بيانات للعرض (قد يكون الاتصال غير متاح أو الجداول فارغة)
            </div>
          ) : (
            Object.entries(tableCounts).map(([tableName, count]) => (
              <div key={tableName} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                <span className="text-[11px] font-mono font-bold text-slate-600 block">{tableName}</span>
                <div className="flex items-center justify-between">
                  <span className="text-base font-black text-slate-900">{count}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    نشط
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* تعليمات إضافية */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-800 space-y-2">
        <div className="flex items-center gap-2 font-bold">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>ملاحظات أمنية وإدارية</span>
        </div>
        <ul className="list-disc list-inside pr-4 space-y-1 text-blue-700">
          <li>دالة <code className="bg-blue-100 px-1 py-0.5 rounded">get_email_by_phone</code> تم إسقاطها من قاعدة البيانات لأسباب أمنية (تسريب الإيميلات).</li>
          <li>عملية بذر البيانات الأولية (seed) تتم عبر سكربت Node.js خارجي باستخدام <code className="bg-blue-100 px-1 py-0.5 rounded">service_role</code> key، ولا يتم تضمينها في حزمة العميل.</li>
          <li>تأكد من إعداد عناوين إعادة التوجيه (Redirect URLs) في لوحة تحكم Supabase لتشمل:
            <ul className="list-disc list-inside pr-6 mt-1">
              <li><code className="bg-blue-100 px-1 py-0.5 rounded">https://your-domain.com</code></li>
              <li><code className="bg-blue-100 px-1 py-0.5 rounded">https://your-domain.com/?reset=true</code></li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
  );
};