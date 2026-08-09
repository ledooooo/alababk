import React, { useState } from 'react';
import { Settings, ShieldCheck, DollarSign, Bell, Power, CheckCircle2, MessageSquare, PhoneCall } from 'lucide-react';

export default function AdminPlatformSettingsView() {
  const [baseDeliveryFee, setBaseDeliveryFee] = useState(15);
  const [perKmFee, setPerKmFee] = useState(3);
  const [commissionRate, setCommissionRate] = useState(10);
  const [autoAssignAgents, setAutoAssignAgents] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [whatsappSupport, setWhatsappSupport] = useState('01012345678');
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 dir-rtl pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 space-y-2 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-black">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black">إعدادات النظام والتشغيل العام</h1>
            <p className="text-xs text-indigo-200">التحكم في تسعير التوصيل، نسبة عمولة المنصة، الإسناد التلقائي للرحلات، ووضع الصيانة</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        {isSaved && (
          <div className="p-4 bg-emerald-50 text-emerald-900 rounded-2xl border border-emerald-200 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>تم حفظ ونشر الإعدادات التشغيلية الجديدة فوراً على جميع الأجهزة الحالية!</span>
          </div>
        )}

        {/* Pricing Settings */}
        <div className="space-y-4">
          <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <span>سياسات التسعير والعمولات</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رسوم التوصيل الأساسية (ج.م)</label>
              <input
                type="number"
                value={baseDeliveryFee}
                onChange={(e) => setBaseDeliveryFee(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تعرفة الكيلومتر الإضافي (ج.م/كم)</label>
              <input
                type="number"
                value={perKmFee}
                onChange={(e) => setPerKmFee(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نسبة عمولة المنصة (%)</label>
              <input
                type="number"
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Dispatch & Operations Settings */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Power className="w-5 h-5 text-purple-600" />
            <span>نظام التوزيع ووضع الصيانة</span>
          </h2>

          <div className="space-y-3">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-xs">التوزيع التلقائي الذكي للطلبات</h3>
                <p className="text-[11px] text-slate-500">إسناد الطلبات تلقائياً لأقرب كابتن توصيل متصل بناءً على الموقع الجغرافي</p>
              </div>
              <button
                type="button"
                onClick={() => setAutoAssignAgents(!autoAssignAgents)}
                className={`w-12 h-7 rounded-full transition-colors relative p-1 ${
                  autoAssignAgents ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    autoAssignAgents ? 'translate-x-[-20px]' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-xs">تفعيل وضع الصيانة المؤقت</h3>
                <p className="text-[11px] text-slate-500">إيقاف استقبال طلبات جديدة مؤقتاً في حالات الازدحام شديد أو الصيانة</p>
              </div>
              <button
                type="button"
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`w-12 h-7 rounded-full transition-colors relative p-1 ${
                  maintenanceMode ? 'bg-rose-600' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    maintenanceMode ? 'translate-x-[-20px]' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Support & Contact Details */}
        <div className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-blue-600" />
            <span>بيانات الدعم الفني وتواصل الواتساب</span>
          </h2>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">رقم الواتساب الرسمي للدعم الفني</label>
            <input
              type="text"
              value={whatsappSupport}
              onChange={(e) => setWhatsappSupport(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-2xl shadow-md transition-all"
        >
          حفظ ونشر التعديلات التشغيلية
        </button>
      </form>
    </div>
  );
};
