import React from 'react';
import { Home, Store, ArrowRight, AlertCircle } from 'lucide-react';

interface NotFoundViewProps {
  onNavigate: (tab: string) => void;
}

export default function NotFoundView({ onNavigate }) {
  return (
    <div className="max-w-md mx-auto my-12 dir-rtl bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xl text-center space-y-6">
      <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-3xl flex items-center justify-center mx-auto">
        <AlertCircle className="w-10 h-10" />
      </div>

      <div className="space-y-2">
        <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-mono font-bold">
          خطأ 404 - الصفحة غير موجودة
        </span>
        <h1 className="text-2xl font-black text-slate-900">عذراً! الصفحة غير متوفرة</h1>
        <p className="text-xs text-slate-500 leading-relaxed">
          ويبدو أن الرابط المطلوبة غير صحيح أو تم نقل الصفحة إلى مكان آخر.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={() => onNavigate('landing')}
          className="py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5"
        >
          <Home className="w-4 h-4" />
          <span>الرئيسية</span>
        </button>

        <button
          onClick={() => onNavigate('customer-stores')}
          className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
        >
          <Store className="w-4 h-4" />
          <span>المحلات</span>
        </button>
      </div>
    </div>
  );
};
