import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { StorageRepo } from '../../../lib/storage';
import { resolveEmailByPhonePassword } from '../../../lib/supabase';
import { UserRole, UserProfile, USER_ROLES } from '../../../types/domain';
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
import { useToast } from '../../shared/Toast';

interface AuthViewProps {
  initialMode?: 'login' | 'register';
  initialRole?: UserRole;
  onSuccess: (user: UserProfile) => void;
  onNavigate: (tab: string) => void;
}

export default function AuthView({
  initialMode = 'login',
  onSuccess,
  onNavigate
}) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setError('');
        setSuccessMsg('');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const normalizeDigits = (str: string) => str.replace(/[٠-٩]/g, (d) => (d.charCodeAt(0) - 1632).toString());
  const isValidEmailFormat = (emailStr: string) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(emailStr.trim());

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

  // ===== تسجيل الدخول =====
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const rawInput = phone.trim();
    if (!rawInput) {
      const msg = 'يرجى إدخال رقم الهاتف الجوال أو البريد الإلكتروني.';
      setError(msg);
      showToast({ type: 'error', title: 'بيانات ناقصة', message: msg });
      return;
    }
    if (!password) {
      const msg = 'يرجى إدخال كلمة المرور.';
      setError(msg);
      showToast({ type: 'error', title: 'بيانات ناقصة', message: msg });
      return;
    }

    setLoading(true);

    try {
      const isEmailInput = rawInput.includes('@');
      let emailForLogin = '';

      if (isEmailInput) {
        if (!isValidEmailFormat(rawInput)) {
          const msg = 'صيغة البريد الإلكتروني غير صحيحة (مثال: name@example.com)';
          setError(msg);
          showToast({ type: 'error', title: 'بريد غير صحيح', message: msg });
          setLoading(false);
          return;
        }
        emailForLogin = rawInput.toLowerCase();
      } else {
        const cleanPhone = normalizeDigits(rawInput).replace(/\D/g, '');
        if (cleanPhone.length !== 11) {
          const msg = 'رقم الهاتف يجب أن يتكون من 11 رقماً (مثال: 01012345678)';
          setError(msg);
          showToast({ type: 'error', title: 'رقم غير صحيح', message: msg });
          setLoading(false);
          return;
        }

        const { email: resolvedEmail, error: verifyError } = await resolveEmailByPhonePassword(cleanPhone, password);
        if (verifyError || !resolvedEmail) {
          const msg = verifyError || 'بيانات الدخول غير صحيحة، يرجى التأكد من رقم الهاتف وكلمة المرور.';
          setError(msg);
          showToast({ type: 'error', title: 'فشل تسجيل الدخول', message: msg });
          setLoading(false);
          return;
        }

        emailForLogin = resolvedEmail;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: emailForLogin,
        password,
      });

      if (authError || !data.user) {
        const msg = translateAuthError(authError?.message || 'فشل تسجيل الدخول');
        setError(msg);
        showToast({ type: 'error', title: 'فشل تسجيل الدخول', message: msg });
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .maybeSingle();

      const rawRole = profile?.role;
      if (rawRole && !(USER_ROLES as readonly string[]).includes(rawRole)) {
        const msg = 'صلاحية غير معروفة، تواصل مع الدعم';
        setError(msg);
        showToast({ type: 'error', title: 'خطأ', message: msg });
        setLoading(false);
        return;
      }

      const assignedRole: UserRole = (rawRole as UserRole) || 'customer';

      const userProfile: UserProfile = {
        id: data.user.id,
        email: data.user.email || profile?.email || emailForLogin,
        name: profile?.full_name || data.user.user_metadata?.full_name || 'مستخدم',
        phone: profile?.phone || data.user.user_metadata?.phone || '',
        role: assignedRole,
        avatar_url: profile?.avatar_url,
        is_active: profile?.is_active ?? true,
        created_at: profile?.created_at || data.user.created_at,
      };

      StorageRepo.setCurrentUser(userProfile);
      const msg = `أهلاً بك مجدداً يا ${userProfile.name}! جاري تحويلك...`;
      setSuccessMsg(msg);
      showToast({ type: 'success', title: 'مرحباً', message: msg });

      setTimeout(() => {
        onSuccess(userProfile);
      }, 600);
    } catch (err: any) {
      const msg = `حدث خطأ غير متوقع: ${err?.message || String(err)}`;
      setError(msg);
      showToast({ type: 'error', title: 'خطأ', message: msg });
    } finally {
      setLoading(false);
    }
  };

  // ===== التسجيل (بدون تغيير) =====
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanPhone = normalizeDigits(phone).replace(/\D/g, '');

    if (!name.trim()) {
      const msg = 'يرجى كتابة الاسم بالكامل';
      setError(msg);
      showToast({ type: 'error', title: 'بيانات ناقصة', message: msg });
      return;
    }
    if (!cleanPhone || cleanPhone.length !== 11) {
      const msg = 'رقم الهاتف يجب أن يتكون من 11 رقماً بالضبط (مثال: 01012345678)';
      setError(msg);
      showToast({ type: 'error', title: 'رقم غير صحيح', message: msg });
      return;
    }
    if (!email.trim() || !isValidEmailFormat(email)) {
      const msg = 'يرجى كتابة البريد الإلكتروني بالشكل الصحيح (مثال: name@example.com)';
      setError(msg);
      showToast({ type: 'error', title: 'بريد غير صحيح', message: msg });
      return;
    }
    if (password.length < 6) {
      const msg = 'كلمة المرور يجب أن لا تقل عن 6 أحرف أو أرقام';
      setError(msg);
      showToast({ type: 'error', title: 'كلمة مرور ضعيفة', message: msg });
      return;
    }
    if (password !== confirmPassword) {
      const msg = 'كلمتا المرور غير متطابقتين';
      setError(msg);
      showToast({ type: 'error', title: 'خطأ', message: msg });
      return;
    }

    setLoading(true);

    try {
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
        const msg = translateAuthError(signUpError.message);
        setError(msg);
        showToast({ type: 'error', title: 'فشل إنشاء الحساب', message: msg });
        setLoading(false);
        return;
      }

      if (!data.user) {
        const msg = 'تعذر إنشاء الحساب، يرجى المحاولة مرة أخرى.';
        setError(msg);
        showToast({ type: 'error', title: 'خطأ', message: msg });
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
      const msg = 'تم إنشاء حسابك بنجاح! جاري تحويلك إلى واجهة التطبيق...';
      setSuccessMsg(msg);
      showToast({ type: 'success', title: 'مرحباً', message: msg });

      setTimeout(() => {
        onSuccess(newUser);
      }, 800);
    } catch (err: any) {
      const msg = `حدث خطأ أثناء إنشاء الحساب: ${err?.message || String(err)}`;
      setError(msg);
      showToast({ type: 'error', title: 'خطأ', message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-6 p-4 sm:p-6 dir-rtl">
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
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

        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            disabled={loading}
            onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              mode === 'login' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>تسجيل الدخول</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              mode === 'register' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>حساب جديد</span>
          </button>
        </div>

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

        {mode === 'register' ? (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="p-3.5 bg-emerald-50/60 border border-emerald-100 rounded-2xl text-[11px] text-emerald-950 leading-relaxed font-medium">
              💡 <span className="font-bold text-emerald-900">تنويه هام:</span> يتم تسجيل جميع الحسابات الجديدة كحسابات عملاء تلقائياً. إذا كنت ترغب بالانضمام كصاحب متجر أو كابتن توصيل، يمكنك تقديم طلب بعد التسجيل عبر خيار "انضم كمتجر" أو "انضم ككابتن".
            </div>

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