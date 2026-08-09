import React, { useState } from 'react';
import { Shield, Clock, FileText, CheckCircle2, User, Store, Truck, Filter, Search } from 'lucide-react';

export default function AdminActivityLogView() {
  const [filterType, setFilterType] = useState<string>('all');
  const [query, setQuery] = useState('');

  const sampleLogs = [
    {
      id: 'log-1',
      action: 'اعتماد انضمام متجر جديد',
      details: 'تمت الموافقة على متجر "حلواني العبد" وتفعيل لوحة التحكم الخاصة به',
      user: 'مدير النظام (أحمد)',
      category: 'stores',
      time: 'قبل 15 دقيقة',
    },
    {
      id: 'log-2',
      action: 'إضافة كابتن توصيل',
      details: 'تم توثيق رخصة الكابتن "محمود علي" وإتاحته في نطاق الدقي',
      user: 'إدارة العمليات',
      category: 'agents',
      time: 'قبل 45 دقيقة',
    },
    {
      id: 'log-3',
      action: 'تغيير حالة طلب #1024',
      details: 'تم تسليم الطلب للعميل بنجاح وبدون ملاحظات',
      user: 'الكابتن محمود',
      category: 'orders',
      time: 'قبل ساعة',
    },
    {
      id: 'log-4',
      action: 'إصدار كوبون خصم جديد',
      details: 'إنشاء كود الخصم (WELCOME20) بنسبة خصم 20% للعملاء الجدد',
      user: 'مدير التسويق',
      category: 'promos',
      time: 'قبل ساعتين',
    },
    {
      id: 'log-5',
      action: 'معالجة طلب سحب أرباح',
      details: 'تحويل مبلغ 1,250 ج.م لحساب فودافون كاش لمتجر خير زمان',
      user: 'الحسابات والمالية',
      category: 'payouts',
      time: 'قبل 3 ساعات',
    },
  ];

  const filtered = sampleLogs.filter((l) => {
    const matchCategory = filterType === 'all' || l.category === filterType;
    const matchQuery =
      !query.trim() ||
      l.action.toLowerCase().includes(query.toLowerCase()) ||
      l.details.toLowerCase().includes(query.toLowerCase()) ||
      l.user.toLowerCase().includes(query.toLowerCase());

    return matchCategory && matchQuery;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 dir-rtl pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 space-y-2 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-black">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black">سجل النشاطات والأحداث (Audit Log)</h1>
            <p className="text-xs text-indigo-200">متابعة كافة التغييرات التشغيلية، الإجراءات الإدارية، وسجل الأنشطة البرمجية للمنصة</p>
          </div>
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
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filterType === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilterType('stores')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filterType === 'stores'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              المتاجر
            </button>
            <button
              onClick={() => setFilterType('agents')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filterType === 'agents'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              الكباتن
            </button>
            <button
              onClick={() => setFilterType('payouts')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filterType === 'payouts'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              المالية
            </button>
          </div>
        </div>
      </div>

      {/* Audit Log Timeline */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="font-black text-slate-900 text-base border-b border-slate-100 pb-3">الأحداث المسجلة حديثاً</h2>

        <div className="space-y-3">
          {filtered.map((log) => (
            <div
              key={log.id}
              className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-700 shrink-0 mt-0.5">
                  <FileText className="w-5 h-5" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-slate-900 text-xs">{log.action}</h3>
                    <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold">
                      {log.user}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-medium">{log.details}</p>
                </div>
              </div>

              <span className="text-[10px] font-mono text-slate-400 shrink-0">{log.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
