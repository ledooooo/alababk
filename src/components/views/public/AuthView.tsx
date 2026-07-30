import React, { useState } from 'react';
import { StorageRepo } from '../../../lib/storage';
import { UserRole, UserProfile } from '../../../types/domain';
import {
  User,
  Store,
  Bike,
  Lock,
  Mail,
  Phone,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  UserPlus,
  LogIn
} from 'lucide-react';

interface AuthViewProps {
  initialMode?: 'login' | 'register';
  initialRole?: UserRole;
  onSuccess: (user: UserProfile) => void;
  onNavigate: (tab: string) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialMode = 'login',
  initialRole = 'customer',
  onSuccess,
  onNavigate
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [role, setRole] = useState<UserRole>(initialRole);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status State
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Existing accounts for quick login
  const existingUsers = StorageRepo.getUsers();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      const trimmedIdentifier = phone.trim() || email.trim();
      if (!trimmedIdentifier || !password) {
        setError('يرجى إدخال رقم الهاتف / البريد الإلكتروني وكلمة المرور');
        setLoading(false);
        return;
      }

      // Match against stored users
      const users = StorageRepo.getUsers();
      const user = users.find(
        (u) =>
          u.phone === trimmedIdentifier ||
          u.email.toLowerCase() === trimmedIdentifier.toLowerCase()
      );

      if (user) {
        StorageRepo.setCurrentUser(user);
        setSuccessMsg(`أهلاً بك مجدداً يا ${user.name}! جاري تحويلك...`);
        setTimeout(() => {
          onSuccess(user);
        }, 800);
      } else {
        // Create user dynamically if logging in for first time with phone/email
        const newUser: UserProfile = {
          id: `usr-${Date.now()}`,
          name: name.trim() || (trimmedIdentifier.includes('@') ? trimmedIdentifier.split('@')[0] : 'مستخدم جديد'),
          email: email.trim() || (trimmedIdentifier.includes('@') ? trimmedIdentifier : `${trimmedIdentifier}@alababak.app`),
          phone: phone.trim() || trimmedIdentifier,
          role: role,
          created_at: new Date().toISOString()
        };
        StorageRepo.saveUser(newUser);
        StorageRepo.setCurrentUser(newUser);
        setSuccessMsg(`تم تسجيل دخولك بنجاح! جاري التوجيه...`);
        setTimeout(() => {
          onSuccess(newUser);
        }, 800);
      }
      setLoading(false);
    }, 400);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('يرجى كتابة الاسم بالكامل');
      return;
    }
    if (!phone.trim()) {
      setError('يرجى إدخال رقم الهاتف الجوال');
      return;
    }
    if (password.length < 6) {
      setError('كلمة المرور يجب أن لا تقل عن 6 أحرف أو أرقام');
      return;
    }
    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      // Check if user already exists
      const users = StorageRepo.getUsers();
      const existing = users.find(
        (u) => u.phone === phone.trim() || (email.trim() && u.email.toLowerCase() === email.trim().toLowerCase())
      );

      if (existing) {
        setError('رقم الهاتف أو البريد الإلكتروني مستخدم بالفعل. يمكنك تسجيل الدخول.');
        setLoading(false);
        return;
      }

      const newUser: UserProfile = {
        id: `usr-${Date.now()}`,
        name: name.trim(),
        email: email.trim() || `${phone.trim()}@alababak.app`,
        phone: phone.trim(),
        role: role,
        created_at: new Date().toISOString()
      };

      StorageRepo.saveUser(newUser);
      StorageRepo.setCurrentUser(newUser);

      setSuccessMsg('تم إنشاء حسابك بنجاح! جاري تحويلك إلى حسابك الجديد...');
      setLoading(false);

      setTimeout(() => {
        onSuccess(newUser);
      }, 1000);
    }, 400);
  };

  const handleQuickSwitch = (u: UserProfile) => {
    StorageRepo.setCurrentUser(u);
    setSuccessMsg(`تم تسجيل الدخول بصفتك: ${u.name}`);
    setTimeout(() => {
      onSuccess(u);
    }, 500);
  };

  return (
    <div className="max-w-md mx-auto my-6 p-4 sm:p-6 dir-rtl">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl mx-auto shadow-md shadow-emerald-600/20">
            ع
          </div>
          <h1 className="text-2xl font-black text-slate-900">
            {mode === 'login' ? 'تسجيل الدخول إلى حسابك' : 'إنشاء حساب جديد'}
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {mode === 'login'
              ? 'مرحباً بك مجدداً في منصة على بابك للتوصيل السريع'
              : 'سجل حسابك مجاناً للاستفادة من كل خدمات التوصيل والمتاجر'}
          </p>
        </div>

        {/* Tab Selector: Login vs Register */}
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              mode === 'login'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>تسجيل الدخول</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError('');
              setSuccessMsg('');
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              mode === 'register'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>حساب جديد</span>
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2 text-rose-700 text-xs font-bold animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        {mode === 'register' ? (
          <form onSubmit={handleRegister} className="space-y-4">
            {/* Account Role Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">نوع الحساب المطلوب</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('customer')}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                    role === 'customer'
                      ? 'border-emerald-600 bg-emerald-50/80 text-emerald-900 font-extrabold ring-1 ring-emerald-600'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <User className="w-5 h-5 text-emerald-600" />
                  <span className="text-[11px]">عميل (مشتري)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('store_owner')}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                    role === 'store_owner'
                      ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-extrabold ring-1 ring-blue-600'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Store className="w-5 h-5 text-blue-600" />
                  <span className="text-[11px]">صاحب متجر</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('delivery_agent')}
                  className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                    role === 'delivery_agent'
                      ? 'border-orange-600 bg-orange-50/80 text-orange-900 font-extrabold ring-1 ring-orange-600'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Bike className="w-5 h-5 text-orange-600" />
                  <span className="text-[11px]">كابتن توصيل</span>
                </button>
              </div>
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الاسم بالكامل *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد محمود"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              </div>
            </div>

            {/* Phone Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف الجوال *</label>
              <div className="relative dir-ltr">
                <input
                  type="tel"
                  required
                  placeholder="01012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-3 pl-10 text-right bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني (اختياري)</label>
              <div className="relative dir-ltr">
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 pl-10 text-right bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">تأكيد كلمة المرور *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>جاري إنشاء الحساب...</span>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>تأكيد إنشاء الحساب الجديد</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Phone or Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف أو البريد الإلكتروني</label>
              <div className="relative dir-ltr">
                <input
                  type="text"
                  required
                  placeholder="01012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-3 pl-10 text-right bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">كلمة المرور</label>
                <button
                  type="button"
                  onClick={() => onNavigate('forgot-password')}
                  className="text-[11px] font-bold text-emerald-700 hover:underline"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3.5 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>جاري تسجيل الدخول...</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>تسجيل الدخول الآن</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Existing Accounts Switcher for Convenience */}
        <div className="pt-4 border-t border-slate-100 text-center space-y-3">
          <p className="text-[11px] font-bold text-slate-400">أو يمكنك الدخول فوراً بالحسابات المسجلة بالمظام:</p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {existingUsers.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleQuickSwitch(u)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
              >
                <span>{u.name}</span>
                <span className="text-[10px] text-slate-400">({u.role === 'customer' ? 'عميل' : u.role === 'store_owner' ? 'متجر' : u.role === 'delivery_agent' ? 'كابتن' : 'مدير'})</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
