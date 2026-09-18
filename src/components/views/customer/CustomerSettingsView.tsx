import React, { useState } from 'react';
import { deleteMyAccount } from '../../../lib/supabase';
import { APP_NAME } from '../../../lib/constants';
import { Share2, LogOut, Trash2, Settings as SettingsIcon, Loader2, Copy, Check } from 'lucide-react';
import { useToast } from '../../shared/Toast';
import { useConfirm } from '../../shared/ConfirmDialog';

interface CustomerSettingsViewProps {
  onLogout: () => void | Promise<void>;
}

export default function CustomerSettingsView({ onLogout }: CustomerSettingsViewProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  const handleShare = async () => {
    const shareData = {
      title: APP_NAME,
      text: `جرّب ${APP_NAME} — توصيل سريع من أقرب المحلات ليك!`,
      url: window.location.origin,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // المستخدم لغى المشاركة — تجاهل، مش خطأ فعلي
      }
      return;
    }

    // فallback لأي متصفح مش بيدعم Web Share API (غالبًا متصفحات الديسكتوب)
    try {
      await navigator.clipboard.writeText(shareData.url);
      setCopied(true);
      showToast({ type: 'success', title: 'تم النسخ', message: 'تم نسخ رابط التطبيق للحافظة' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast({ type: 'error', title: 'تعذر النسخ', message: 'انسخ الرابط يدويًا من شريط العنوان' });
    }
  };

  const handleLogout = () => {
    showConfirm({
      title: 'تسجيل الخروج',
      message: 'هل تريد تسجيل الخروج من حسابك؟',
      confirmLabel: 'تسجيل الخروج',
      variant: 'warning',
      onConfirm: () => onLogout(),
    });
  };

  const handleDeleteAccount = () => {
    showConfirm({
      title: 'حذف الحساب نهائيًا',
      message:
        'هيتم حذف بياناتك الشخصية (الاسم، رقم الهاتف، الصورة) نهائيًا ومش هتقدر تسجل دخول بنفس الحساب تاني. طلباتك السابقة هتفضل مسجّلة (بدون اسمك) عشان سجلات المتاجر. الإجراء ده لا يمكن التراجع عنه — متأكد إنك عايز تكمل؟',
      confirmLabel: 'حذف حسابي نهائيًا',
      variant: 'danger',
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          await deleteMyAccount();
          showToast({ type: 'success', title: 'تم الحذف', message: 'تم حذف حسابك بنجاح' });
          await onLogout();
        } catch (err: any) {
          showToast({ type: 'error', title: 'فشل الحذف', message: err.message || 'تعذر حذف الحساب، حاول مرة أخرى' });
          setIsDeleting(false);
        }
      },
    });
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 dir-rtl pb-16">
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-slate-700" />
          <span>إعدادات التطبيق</span>
        </h1>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden divide-y divide-slate-100">
        <button
          onClick={handleShare}
          className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-right"
        >
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            {copied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-900 text-sm">مشاركة التطبيق</p>
            <p className="text-xs text-slate-400">شارك {APP_NAME} مع أصحابك</p>
          </div>
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-right"
        >
          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-xl shrink-0">
            <LogOut className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-slate-900 text-sm">تسجيل الخروج</p>
            <p className="text-xs text-slate-400">هتحتاج تسجل دخول تاني عشان تستخدم حسابك</p>
          </div>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-rose-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-rose-100 bg-rose-50/50">
          <p className="font-black text-rose-700 text-xs">منطقة الخطر</p>
        </div>
        <button
          onClick={handleDeleteAccount}
          disabled={isDeleting}
          className="w-full flex items-center gap-3 p-4 hover:bg-rose-50 transition-colors text-right disabled:opacity-50"
        >
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl shrink-0">
            {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
          </div>
          <div className="flex-1">
            <p className="font-bold text-rose-700 text-sm">حذف الحساب نهائيًا</p>
            <p className="text-xs text-slate-400">إجراء لا يمكن التراجع عنه</p>
          </div>
        </button>
      </div>
    </div>
  );
}
