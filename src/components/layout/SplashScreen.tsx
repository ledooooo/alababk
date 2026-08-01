import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Sparkles, Zap, ShoppingBag, ShieldCheck } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
  durationSeconds?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationSeconds = 5,
}) => {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const intervalMs = 50;
    const totalSteps = (durationSeconds * 1000) / intervalMs;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const currentProgress = (currentStep / totalSteps) * 100;
      setProgress(Math.min(currentProgress, 100));

      const remainingSecs = Math.ceil(durationSeconds - (currentStep * intervalMs) / 1000);
      setTimeLeft(Math.max(0, remainingSecs));

      if (currentStep >= totalSteps) {
        clearInterval(timer);
        onFinish();
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [durationSeconds, onFinish]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.5 } }}
        className="fixed inset-0 z-9999 bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 select-none overflow-hidden dir-rtl"
      >
        {/* Background Ambient Glows */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Bar with Skip Button */}
        <div className="relative z-10 flex items-center justify-between w-full max-w-2xl mx-auto">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-amber-400 text-xs font-bold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>على بابك v2.5</span>
          </div>

          <button
            onClick={onFinish}
            className="group px-4 py-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-white font-black text-xs rounded-2xl backdrop-blur-md transition-all flex items-center gap-2 shadow-lg hover:border-amber-400/50"
          >
            <span>تخطي</span>
            <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 flex items-center justify-center text-[10px] font-mono group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors">
              {timeLeft}
            </span>
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Hero Central Branding */}
        <div className="relative z-10 flex flex-col items-center text-center space-y-6 max-w-lg mx-auto my-auto">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15, stiffness: 100 }}
            className="relative"
          >
            {/* Glowing Ring */}
            <div className="absolute -inset-2 bg-gradient-to-r from-amber-500 to-emerald-500 rounded-3xl blur-md opacity-50 animate-pulse" />
            
            <img
              src="/icon.png"
              alt="على بابك"
              className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-3xl object-cover shadow-2xl border-2 border-amber-300/40"
              referrerPolicy="no-referrer"
            />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              على <span className="text-transparent bg-clip-text bg-gradient-to-l from-amber-300 via-amber-400 to-amber-200">بابك</span>
            </h1>
            <p className="text-sm sm:text-base font-semibold text-slate-300 max-w-xs sm:max-w-md mx-auto leading-relaxed">
              منصة التوصيل الفائق والتسوق المحلي المباشر في مصر 🇪🇬
            </p>
          </motion.div>

          {/* Quick Badges */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-2 pt-2"
          >
            <span className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              توصيل سريع
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
              آلاف المتاجر
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              دفع آمن
            </span>
          </motion.div>
        </div>

        {/* Bottom Progress Bar & Footer */}
        <div className="relative z-10 w-full max-w-md mx-auto space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400">
            <span>جاري التحضير...</span>
            <span className="font-mono text-amber-400">{Math.round(progress)}%</span>
          </div>

          <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-0.5">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-emerald-400 to-amber-300 rounded-full transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
          </div>

          <button
            onClick={onFinish}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black text-xs rounded-2xl shadow-xl shadow-emerald-900/40 transition-all flex items-center justify-center gap-2 mt-2"
          >
            <span>الدخول إلى التطبيق فوراً</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
