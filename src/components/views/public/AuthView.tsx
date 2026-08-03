import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { StorageRepo } from '../../../lib/storage';
import { UserRole, UserProfile } from '../../../types/domain';
import {
  User,
  Lock,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  UserPlus,
  LogIn,
  Loader2
} from 'lucide-react';

interface AuthViewProps {
  initialMode?: 'login' | 'register';
  initialRole?: UserRole;
  onSuccess: (user: UserProfile) => void;
  onNavigate: (tab: string) => void;
}

// ملاحظة هامة: حسابات المسؤولين (admin) لا يمكن إنشاؤها أو ترقيتها من التطبيق تلقائياً.
// يتم منح صلاحية الأدمن يدويًا من قاعدة البيانات (UPDATE profiles SET role = 'admin' WHERE id = '...') أو من قبل أدمن موجود بالفعل.

export const AuthView: React.FC<AuthViewProps> = ({
  initialMode = 'login',
  onSuccess,
  onNavigate
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

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

  // Realtime Auth State Listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setError('');
        setSuccessMsg('');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Utility helpers for validation
  const normalizeDigits = (str: string) => {
    return str.replace(/[٠-٩]/g, (d) => (d.charCodeAt(0) - 1632).toString());
  };

  const isValidEmailFormat = (emailStr: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(emailStr.trim());
  };

  // Helper to translate Supabase Auth error messages into clear Arabic
  const translateAuthError = (message: string): string => {
    const lower = message.toLowerCase();
    if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
      return 'بيانات الدخول غير صحيحة، يرجى التأكد من البريد الإلكتروني/رقم الهاتف وكلمة المرور.';
    }
    if (lower.includes('email not confirmed')) {
      return 'البريد الإلكتروني لم يتم تأكيده بعد. يرجى مراجعة بريدك الإلكتروني.';
    }
    if (lower.includes('user already registered') || lower.includes('email_exists') || lower.includes('already exists')) {
      return 'البريد الإلكتروني أو رقم الهاتف مسجل بالفعل. يمكنك تسجيل الدخول بدلاً من ذلك.';
    }
    if (lower.includes('password should be at least') || lower.includes('weak password')) {
      return 'كلمة المرور ضعيفة جداً. يجب أن تتكون من 6 أحرف أو أرقام على الأقل.';
    }
    if (lower.includes('too many requests') || lower.includes('rate limit')) {
      return 'تم تجاوز عدد المحاولات المسموح بها، يرجى الانتظار قليلاً ثم إعادة المحاولة.';
    }
    return `حدث خطأ أثناء العملية: ${message}`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const rawInput = phone.trim();
    if (!rawInput) {
      setError('يرجى إدخال رقم الهاتف الجوال أو البريد الإلكتروني.');
      return;
    }
    if (!password) {
      setError('يرجى إدخال كلمة المرور.');
      return;
    }

    const isEmailInput = rawInput.includes('@');
    let validatedEmail = '';

    setLoading(true);

    try {
      if (isEmailInput) {
        if (!isValidEmailFormat(rawInput)) {
          setError('صيغة البريد الإلكتروني غير صحيحة (مثال: name@example.com)');
          setLoading(false);
          return;
        }
        validatedEmail = rawInput.toLowerCase();
      } else {
        const cleanDigits = normalizeDigits(rawInput).replace(/\D/g, '');
        if (cleanDigits.length !== 11) {
          setError('رقم الهاتف يجب أن يتكون من 11 رقماً (مثال: 01012345678)');
          setLoading(false);
          return;
        }

        const { data: email, error: phoneSearchErr } = await supabase
          .rpc('get_email_by_phone', { p_phone: cleanDigits });

        if (phoneSearchErr || !email) {
          setError('رقم الهاتف غير مسجل لدينا. يمكنك إنشاء حساب جديد أولاً.');
          setLoading(false);
          return;
        }
        validatedEmail = email.toLowerCase();
      }

      // Perform real Supabase authentication with password
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: validatedEmail,
        password,
      });

      if (authError || !data.user) {
        setError(translateAuthError(authError?.message || 'فشل تسجيل الدخول'));
        setLoading(false);
        return;
      }

      // Fetch user's profile from database
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      const userProfile: UserProfile = {
        id: data.user.id,
        email: data.user.email || profile?.email || validatedEmail,
        name: profile?.full_name || data.user.user_metadata?.full_name || 'مستخدم',
        phone: profile?.phone || data.user.user_metadata?.phone || '',
        role: (profile?.role as UserRole) || 'customer',
        avatar_url: profile?.avatar_url,
        associated_store_id: profile?.associated_store_id,
        is_active: profile?.is_active ?? true,
        created_at: profile?.created_at || data.user.created_at,
      };

      StorageRepo.setCurrentUser(userProfile);
      setSuccessMsg(`أهلاً بك مجدداً يا ${userProfile.name}! جاري تحويلك...`);

      setTimeout(() => {
        onSuccess(userProfile);
      }, 600);
    } catch (err: any) {
      setError(`حدث خطأ غير متوقع: ${err?.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanPhone = normalizeDigits(phone).replace(/\D/g, '');

    if (!name.trim()) {
      setError('يرجى كتابة الاسم بالكامل');
      return;
    }

    if (!cleanPhone || cleanPhone.length !== 11) {
      setError('رقم الهاتف يجب أن يتكون من 11 رقماً بالضبط (مثال: 01012345678)');
      return;
    }

    if (!email.trim() || !isValidEmailFormat(email)) {
      setError('يرجى كتابة البريد الإلكتروني بالشكل الصحيح (مثال: name@example.com)');
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

    try {
      // Create user using Supabase Auth
      // Note: role is not passed in metadata to avoid privilege escalation.
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: name.trim(),
            phone: cleanPhone,
          },
        },
      });

      if (signUpError) {
        setError(translateAuthError(signUpError.message));
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError('تعذر إنشاء الحساب، يرجى المحاولة مرة أخرى.');
        setLoading(false);
        return;
      }

      const newUser: UserProfile = {
        id: data.user.id,
        email: email.trim().toLowerCase(),
        name: name.trim(),
        phone: cleanPhone,
        role: 'customer',
        created_at: data.user.created_at || new Date().toISOString(),
      };

      StorageRepo.setCurrentUser(newUser);
      setSuccessMsg('تم إنشاء حسابك بنجاح! جاري تحويلك إلى واجهة التطبيق...');

      setTimeout(() => {
        onSuccess(newUser);
      }, 800);
    } catch (err: any) {
      setError(`حدث خطأ أثناء إنشاء الحساب: ${err?.message || String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-6 p-4 sm:p-6 dir-rtl">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white font-black text-2xl flex items-center justify-center mx-auto shadow-md shadow-emerald-600/20">
            على بابك
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
            disabled={loading}
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
            disabled={loading}
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
            {/* Notice for Store Owner & Delivery Agent Application */}
            <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl text-[11px] text-emerald-950 leading-relaxed font-medium">
              💡 <span className="font-bold text-emerald-900">تنويه هام:</span> يتم تسجيل جميع الحسابات الجديدة كحسابات عملاء تلقائياً. إذا كنت ترغب بالانضمام كصاحب متجر أو كابتن توصيل، يمكنك تقديم طلب بعد التسجيل عبر خيار "انضم كمتجر" أو "انضم ككابتن".
            </div>

            {/* Name Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">الاسم بالكامل *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  disabled={loading}
                  placeholder="مثال: أحمد محمود"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
                />
                <User className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              </div>
            </div>

            {/* Phone Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">رقم الهاتف الجوال *</label>
                <span className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                  11 رقماً إجبارياً
                </span>
              </div>
              <div className="relative dir-ltr">
                <input
                  type="tel"
                  required
                  disabled={loading}
                  maxLength={11}
                  placeholder="01012345678"
                  value={phone}
                  onChange={(e) => setPhone(normalizeDigits(e.target.value).replace(/\D/g, '').slice(0, 11))}
                  className="w-full p-3 pl-10 text-right bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">يجب أن يتكون من 11 رقماً (مثال: 01012345678)</p>
            </div>

            {/* Email Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">البريد الإلكتروني *</label>
                <span className="text-[10px] text-slate-500 font-medium">صيغة بريد صحيحة</span>
              </div>
              <div className="relative dir-ltr">
                <input
                  type="email"
                  required
                  disabled={loading}
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 pl-10 text-right bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
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
                  disabled={loading}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
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
                  disabled={loading}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري إنشاء الحساب...</span>
                </>
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">رقم الهاتف أو البريد الإلكتروني</label>
                <span className="text-[10px] text-slate-500 font-medium">(11 رقماً للهاتف أو إيميل صحيح)</span>
              </div>
              <div className="relative dir-ltr">
                <input
                  type="text"
                  required
                  disabled={loading}
                  placeholder="01012345678 أو name@example.com"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-3 pl-10 text-right bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
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
                  disabled={loading}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none disabled:opacity-50"
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
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري تسجيل الدخول...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>تسجيل الدخول الآن</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
