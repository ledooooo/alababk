import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, PlusSquare, CheckCircle2, Sparkles } from 'lucide-react';

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  useEffect(() => {
    // 1. Check if running in standalone mode (already installed)
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) {
      // Mark as installed in localStorage and don't show
      localStorage.setItem('alababak_pwa_installed', 'true');
      return;
    }

    // 2. Check if user already dismissed or installed
    const dismissed = localStorage.getItem('alababak_pwa_dismissed');
    const installed = localStorage.getItem('alababak_pwa_installed');

    if (dismissed || installed) {
      return;
    }

    // 3. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    if (isIosDevice) {
      // Show iOS instruction prompt after short delay
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    // 4. Capture standard beforeinstallprompt event for Android/Chrome/Edge/Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Delay prompt slightly so user sees initial page first
      setTimeout(() => {
        setShowPrompt(true);
      }, 2500);
    };

    const handleAppInstalled = () => {
      localStorage.setItem('alababak_pwa_installed', 'true');
      setShowPrompt(false);
      setDeferredPrompt(null);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 4000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      localStorage.setItem('alababak_pwa_installed', 'true');
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 4000);
    } else {
      localStorage.setItem('alababak_pwa_dismissed', 'true');
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('alababak_pwa_dismissed', 'true');
    setShowPrompt(false);
  };

  // Do not render anything if running as standalone app
  if (isStandalone) {
    return null;
  }

  return (
    <>
      {/* Toast notification upon successful installation */}
      {showSuccessToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] bg-emerald-700 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 dir-rtl animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-300 shrink-0" />
          <div className="text-xs">
            <h4 className="font-extrabold text-sm">تم تثبيت تطبيق على بابك بنجاح! 🎉</h4>
            <p className="text-emerald-100 font-medium mt-0.5">يمكنك الآن فتح التطبيق مباشرة من الشاشة الرئيسية بجهازك.</p>
          </div>
        </div>
      )}

      {/* Main PWA Installation Floating Banner */}
      {showPrompt && (
        <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-[90] dir-rtl animate-in fade-in slide-in-from-bottom-6 duration-300">
          <div className="bg-slate-950 text-white rounded-3xl p-4 sm:p-5 shadow-2xl border border-slate-800 backdrop-blur-lg space-y-3 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-start justify-between gap-3 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-0.5 shadow-md shrink-0 flex items-center justify-center">
                  <img src="/icon.png" alt="على بابك" className="w-full h-full object-cover rounded-2xl" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-black text-sm text-white">تطبيق على بابك</h3>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      تطبيق مجاني
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">
                    ثبّت التطبيق الآن لتصفح أسرع وإشعارات مباشرة بدون إنترنت!
                  </p>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors shrink-0"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Actions for Android/Desktop */}
            {!isIos && deferredPrompt && (
              <div className="flex items-center gap-2 pt-1 relative z-10">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>تثبيت التطبيق على الجهاز</span>
                </button>
                <button
                  onClick={handleDismiss}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
                >
                  ليس الآن
                </button>
              </div>
            )}

            {/* Instructions for iOS Safari */}
            {isIos && (
              <div className="bg-slate-900/90 rounded-2xl p-3 border border-slate-800 text-xs text-slate-300 space-y-2 relative z-10">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  <span>طريقة التثبيت على أجهزة iPhone / iPad:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300 font-medium">
                  <li className="flex items-center gap-1.5">
                    <span>1. اضغط على زر المشاركة</span>
                    <Share className="w-3.5 h-3.5 text-blue-400 inline" />
                    <span>في أسفل متصفح Safari</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span>2. اختر</span>
                    <span className="font-bold text-white bg-slate-800 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <PlusSquare className="w-3 h-3 text-slate-300" />
                      إضافة إلى الشاشة الرئيسية (Add to Home Screen)
                    </span>
                  </li>
                </ol>
                <button
                  onClick={handleDismiss}
                  className="w-full mt-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] rounded-xl transition-all"
                >
                  تم، فهمت
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
