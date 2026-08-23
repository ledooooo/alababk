import React, { useState } from 'react';
import { StorageRepo } from '../../../lib/storage';
import { User, Phone, ShieldCheck, Truck, FileText, CheckCircle2, Camera, MapPin, Power } from 'lucide-react';
import { useToast } from '../../shared/Toast';
import PushNotificationSettingsCard from '../../shared/PushNotificationSettingsCard';
export default function DeliveryProfileView() {
  const currentAgent = StorageRepo.getCurrentAgent();
  const [fullName, setFullName] = useState(currentAgent?.name || 'كابتن محمود علي');
  const [phone, setPhone] = useState(currentAgent?.phone || '01098765432');
  const [vehicleType, setVehicleType] = useState<string>(currentAgent?.vehicle_type || 'motorcycle');
  const [vehiclePlate, setVehiclePlate] = useState(currentAgent?.license_plate || 'أ ب ج 1234');
  const [isOnline, setIsOnline] = useState(currentAgent?.is_online ?? true);
  const [isSaved, setIsSaved] = useState(false);

  const { showToast } = useToast();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentAgent) {
      const updated = { ...currentAgent, name: fullName, phone, vehicle_type: vehicleType as any, license_plate: vehiclePlate, is_online: isOnline };
      StorageRepo.saveAgent(updated);
      showToast({ type: 'success', title: 'تم', message: 'تم حفظ التغييرات بنجاح' });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 dir-rtl pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-md">
        <div className="w-20 h-20 rounded-2xl bg-emerald-500/30 text-emerald-200 border-2 border-white/30 flex items-center justify-center font-black text-2xl shadow-md">
          <Truck className="w-10 h-10" />
        </div>

        <div className="text-center sm:text-right space-y-1 flex-1">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h1 className="text-xl font-black">{fullName}</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
              كابتن معتمد
            </span>
          </div>
          <p className="text-xs text-emerald-200 font-mono">{phone} | لوحة المركبة: {vehiclePlate}</p>

          <div className="flex items-center justify-center sm:justify-start gap-3 mt-3">
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                isOnline
                  ? 'bg-emerald-400 text-slate-950 shadow-md'
                  : 'bg-rose-500/30 text-rose-100 border border-rose-400/30'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{isOnline ? 'نشط ومستعد للتوصيل' : 'غير متصل (خارج الخدمة)'}</span>
            </button>
          </div>
        </div>
      </div>

      <PushNotificationSettingsCard userId={currentAgent?.user_id} />

      {/* Verification Status */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-xs">حالة الأوراق والوثائق الرسمية</h3>
            <p className="text-[11px] text-slate-500">رخصة القيادة + بطاقة الرقم القومي موثقة ومعتمدة من الإدارة</p>
          </div>
        </div>

        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold shrink-0">
          موثق 100%
        </span>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">تحديث بيانات الكابتن والمركبة</h2>

        {isSaved && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>تم حفظ التغييرات بنجاح!</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الثلاثي</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف للاتصال</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">نوع وسائل التوصيل</label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="motorcycle">دراجة نارية / دراجة بخارية (دراجة موتوسيكل)</option>
              <option value="bicycle">دراجة هوائية (عجلة)</option>
              <option value="car">سيارة نقل صغيرة / ملاكي</option>
              <option value="foot">توصيل مشياً على الأقدام (للمسافات القريبة)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">رقم لوحة المركبة</label>
            <input
              type="text"
              value={vehiclePlate}
              onChange={(e) => setVehiclePlate(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition-all"
        >
          حفظ التغييرات
        </button>
      </form>
    </div>
  );
};
