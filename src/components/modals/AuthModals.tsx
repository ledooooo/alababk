import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Mail, KeyRound, CheckCircle2, X, Lock, Loader2, AlertCircle } from 'lucide-react';

interface ForgotPasswordModalProps {
  onClose: () => void;
  onOpenReset: (email: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ onClose, onOpenReset }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isValidEmailFormat = (emailStr: string) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(emailStr.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !isValidEmailFormat(trimmedEmail)) {
      setError('صيغة البريد الإلكتروني غير صحيحة (مثال: name@example.com)');
      return;
    }

    setIsLoading(true);
    try {
      // إرسال رابط إعادة التعيين مع redirectTo يشير إلى التطبيق
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: window.location.origin + '/?reset=true',
      });

      // نعرض نجاح حتى لو كان البريد غير مسجل (أمان)
      setSuccess(true);
      // لا نكشف ما إذا كان البريد موجودًا أم لا
      // لكن نمرر البريد لفتح مودال إعادة التعيين يدويًا (اختياري)
      // يمكن فتح المودال تلقائيًا لكننا سنعتمد على حدث recovery من Supabase
      // لذلك نكتفي بعرض رسالة نجاح
    } catch (err: any) {
      setError(err.message || 'حدث خطأ، يرجى المحاولة لاحقاً');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 dir-rtl">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1 text-center sm:text-right">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-2">
            <KeyRound className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-black text-slate-900">نسيت كلمة المرور؟</h3>
          <p className="text-xs text-slate-500">أدخل بريدك الإلكتروني ليصلك رابط إعادة التعيين</p>
        </div>

        {success ? (
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="text-xs font-extrabold text-emerald-950">
              تم إرسال تعليمات إعادة التعيين إلى بريدك الإلكتروني
            </p>
            <p className="text-[11px] text-emerald-800">
              يرجى فحص صندوق الوارد والنقر على الرابط لتعيين كلمة مرور جديدة.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-xs"
            >
              حسناً، سأتحقق من بريدي
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-bold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني المسجل</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  disabled={isLoading}
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isLoading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

interface ResetPasswordModalProps {
  email: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ email, onClose, onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setIsLoading(true);
    try {
      // تحديث كلمة المرور باستخدام token المستلم من recovery flow
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'فشل تحديث كلمة المرور، يرجى المحاولة لاحقاً');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 dir-rtl">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-slate-200 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1 text-center sm:text-right">
          <h3 className="text-xl font-black text-slate-900">إعادة تعيين كلمة المرور</h3>
          <p className="text-xs text-slate-500">حساب: {email || 'المستخدم'}</p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-bold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور الجديدة</label>
            <input
              type="password"
              required
              disabled={isLoading}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">تأكيد كلمة المرور الجديدة</label>
            <input
              type="password"
              required
              disabled={isLoading}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isLoading ? 'جاري الحفظ...' : 'حفظ كلمة المرور الجديدة'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};