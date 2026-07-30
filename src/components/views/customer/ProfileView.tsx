import React, { useState } from 'react';
import { StorageRepo } from '../../../lib/storage';
import { User, Phone, Mail, Camera, ShieldCheck, MapPin, ShoppingBag, LogOut, CheckCircle2 } from 'lucide-react';

interface ProfileViewProps {
  onNavigate: (tab: string, param?: string) => void;
  onLogout?: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onNavigate, onLogout }) => {
  const currentUser = StorageRepo.getCurrentUser();
  const [fullName, setFullName] = useState(currentUser?.full_name || 'عميل على بابك');
  const [phone, setPhone] = useState(currentUser?.phone || '01012345678');
  const [email, setEmail] = useState(currentUser?.email || 'customer@example.com');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200');
  const [isSaved, setIsSaved] = useState(false);

  const orders = StorageRepo.getOrders().filter((o) => o.customer_id === currentUser?.id || o.customer_phone === phone);
  const addresses = StorageRepo.getAddresses(currentUser?.id);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser) {
      const updated = {
        ...currentUser,
        full_name: fullName,
        phone,
        email,
        avatar_url: avatarUrl,
      };
      StorageRepo.saveUser(updated);
      StorageRepo.setCurrentUser(updated);
    }
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 dir-rtl pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-md">
        <div className="relative">
          <img
            src={avatarUrl}
            alt={fullName}
            className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 shadow-md"
          />
          <button
            onClick={() => {
              const url = prompt('أدخل رابط الصورة الجديدة (Image URL):', avatarUrl);
              if (url) setAvatarUrl(url);
            }}
            className="absolute -bottom-2 -right-2 p-2 bg-amber-400 text-slate-900 rounded-xl shadow-xs hover:scale-105 transition-transform"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-center sm:text-right space-y-1 flex-1">
          <h1 className="text-xl font-black">{fullName}</h1>
          <p className="text-xs text-purple-200 font-mono">{phone} | {email}</p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-[11px] font-bold text-amber-300 mt-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>حساب عميل موثق</span>
          </div>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 rounded-xl text-xs font-bold border border-rose-400/30 transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        )}
      </div>

      {/* Overview Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('customer-orders')}
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs cursor-pointer hover:border-purple-300 transition-all text-center space-y-1"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <p className="text-lg font-black text-slate-900">{orders.length}</p>
          <p className="text-[11px] text-slate-500 font-bold">إجمالي الطلبات</p>
        </div>

        <div
          onClick={() => onNavigate('customer-addresses')}
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs cursor-pointer hover:border-emerald-300 transition-all text-center space-y-1"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <MapPin className="w-5 h-5" />
          </div>
          <p className="text-lg font-black text-slate-900">{addresses.length}</p>
          <p className="text-[11px] text-slate-500 font-bold">العناوين المحفوظة</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs text-center space-y-1 col-span-2 sm:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <p className="text-lg font-black text-slate-900">نشط</p>
          <p className="text-[11px] text-slate-500 font-bold">حالة الحساب</p>
        </div>
      </div>

      {/* Edit Profile Form */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">تعديل البيانات الشخصية</h2>

        {isSaved && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>تم حفظ التعديلات بنجاح!</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">الاسم بالكامل</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف والتواصل</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-xs transition-all"
          >
            حفظ التغييرات
          </button>
        </div>
      </form>
    </div>
  );
};
