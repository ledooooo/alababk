import React, { useState } from 'react';
import { Mail, KeyRound, CheckCircle2, X, Lock, ArrowRight } from 'lucide-react';

interface ForgotPasswordModalProps {
  onClose: () => void;
  onOpenReset: (email: string) => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({ onClose, onOpenReset }) => {
  const [email, setEmail] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState('');

  const isValidEmailFormat = (emailStr: string) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(emailStr.trim());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !isValidEmailFormat(email)) {
      setError('صيغة البريد الإلكتروني غير صحيحة، يرجى كتابته بالشكل الصحيح (مثال: name@example.com)');
      return;
    }

    setIsSent(true);
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
          <p className="text-xs text-slate-500">أدخل بريدك الإلكتروني ليصلك رابط وإيعاز استعادة كلمة السر</p>
        </div>

        {isSent ? (
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-3 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="text-xs font-extrabold text-emerald-950">
              تم إرسال تعليمات إعادة التعيين إلى {email}
            </p>
            <p className="text-[11px] text-emerald-800">
              يرجى فحص صندوق الوارد بريدك الإلكتروني والضغط على الرابط أو تعيين كلمة مرور جديدة.
            </p>
            <button
              onClick={() => onOpenReset(email)}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-xs"
            >
              إدخال كلمة المرور الجديدة الآن
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                {error}
              </p>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني المسجل</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md transition-all"
            >
              إرسال رابط إعادة التعيين
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    onSuccess();
    onClose();
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-xs text-rose-600 font-bold bg-rose-50 p-2.5 rounded-xl">{error}</p>}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">كلمة المرور الجديدة</label>

            <input
              type="password"
              required
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">تأكيد كلمة المرور الجديدة</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all"
          >
            حفظ كلمة المرور الجديدة
          </button>
        </form>
      </div>
    </div>
  );
};
