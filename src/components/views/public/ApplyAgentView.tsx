import React, { useState } from 'react';
import { Bike, ShieldCheck, CheckCircle2, Sparkles, User, FileText, Phone } from 'lucide-react';

interface ApplyAgentViewProps {
  onNavigate: (tab: string, param?: string) => void;
}

export const ApplyAgentView: React.FC<ApplyAgentViewProps> = ({ onNavigate }) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState('motorcycle');
  const [nationalId, setNationalId] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [city, setCity] = useState('القاهرة');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !nationalId.trim()) return;

    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <div className="max-w-md mx-auto my-12 dir-rtl bg-white rounded-3xl p-8 border border-slate-200 shadow-lg text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">أهلاً بك في فريق كباتن على بابك!</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            تم استلام طلبك ومستنداتك بنجاح. يتم الآن مراجعة صحة البيانات من قِبل إدارة عمليات التوصيل.
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-xs text-right space-y-2 font-bold text-slate-700">
          <p>اسم الكابتن: <span className="text-slate-900">{fullName}</span></p>
          <p>نوع المركبة: <span className="text-emerald-700">{vehicleType === 'motorcycle' ? 'موتوسيكل' : vehicleType === 'bicycle' ? 'دراجة هوائية' : 'سيارة'}</span></p>
          <p>رقم التواصل: <span className="text-slate-900 font-mono">{phone}</span></p>
          <p className="text-[10px] text-amber-600 font-normal">سيتم التواصل معك لإجراء المقابلة وتفعيل تطبيق الكابتن فور اكتمال الفحص.</p>
        </div>

        <button
          onClick={() => onNavigate('landing')}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs"
        >
          العودة للصفحة الرئيسية
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 dir-rtl pb-16">
      <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-3xl p-8 text-center space-y-2 shadow-md">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold border border-white/20">
          <Bike className="w-4 h-4" />
          <span>انضمام كباتن التوصيل</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">طلب انضمام كابتن توصيل 🛵</h1>
        <p className="text-xs text-emerald-200">فرص عمل مرنة، ساعات حرّة، ودخل يومي ممتاز في منطقتك السكنية</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">الاسم بالكامل (كما بالهوية) *</label>
            <input
              type="text"
              required
              placeholder="اسمك الرباعي"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف (واتساب نشط) *</label>
            <input
              type="text"
              required
              placeholder="010XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">نوع المركبة *</label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="motorcycle">موتوسيكل / دراجة نارية 🛵</option>
              <option value="bicycle">دراجة هوائية 🚲</option>
              <option value="car">سيارة صغيرة 🚗</option>
              <option value="walking">مشياً على الأقدام 🚶‍♂️</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">المنطقة والمحافظة الرئيسية *</label>
            <input
              type="text"
              required
              placeholder="مثال: القاهرة - مصر الجديدة"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">رقم الرقم القومي (14 رقم) *</label>
            <input
              type="text"
              required
              maxLength={14}
              placeholder="XXXXXXXXXXXXXX"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">رقم رخصة القيادة / اللوحة</label>
            <input
              type="text"
              placeholder="مثال: أ ب ج - 1 2 3"
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 font-medium">
          ⚠️ بالتسجيل فإنك تؤكد صحة البيانات والالتزام بمعايير جودة التوصيل والسلامة واحترام العملاء على منصة على بابك.
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all"
          >
            إرسال طلب الكابتن للفحص
          </button>
        </div>
      </form>
    </div>
  );
};
