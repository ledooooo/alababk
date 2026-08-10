import React, { Component, ErrorInfo, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { ToastProvider } from './components/shared/Toast';
import { ConfirmDialogProvider } from './components/shared/ConfirmDialog';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled app error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6 dir-rtl text-right font-sans">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
            <h2 className="text-xl font-bold text-slate-800">حدث خطأ غير متوقع</h2>
            <p className="text-sm text-slate-600">نعتذر عن هذا الخطأ المؤقت. يمكنك إعادة تحميل الصفحة للمتابعة.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition-colors"
            >
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Prefetch auth session (best-effort only — App itself re-checks the session
// on mount, so any failure here must never crash module evaluation).
try {
  supabase.auth.getSession().catch((err: unknown) => {
    console.warn('Initial auth getSession notice:', err);
  });
} catch (err) {
  console.warn('Initial auth getSession notice:', err);
}

// Register Service Worker only if supported
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const isHttps = window.location.protocol === 'https:';
  const isLocalhost = window.location.hostname === 'localhost';
  const isRunApp = window.location.hostname.endsWith('run.app');

  if (isHttps || isLocalhost || isRunApp) {
    window.addEventListener('load', () => {
      // نُلحق نسخة وقت البناء كـ query param حتى يعيد المتصفح تقييم سجل
      // الـService Worker مع كل نشر جديد (Vite يحقن window.__SW_VERSION__
      // عبر vite.config.ts). محتوى sw.js نفسه ثابت الآن (انظر CACHE_VERSION
      // فيه) لتفادي مشكلة تجدد اسم الكاش عند كل إعادة تشغيل للـworker.
      const swVersion = (window as any).__SW_VERSION__ || '1';
      navigator.serviceWorker.register(`/sw.js?v=${swVersion}`).then(
        (reg) => console.log('PWA Service Worker registered:', reg.scope),
        (err) => console.log('Service Worker registration failed:', err)
      );
    });
  }
}

function ConfigErrorScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6 dir-rtl text-right font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">إعداد الاتصال بقاعدة البيانات غير مكتمل</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          لم يتم العثور على متغيرات البيئة{' '}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">VITE_SUPABASE_URL</code> و{' '}
          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">VITE_SUPABASE_ANON_KEY</code>.
          يرجى إنشاء ملف <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">.env</code> في جذر
          المشروع (يمكنك نسخه من <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">.env.example</code>)
          ثم إعادة تشغيل خادم التطوير.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {isSupabaseConfigured() ? (
        <ToastProvider>
          <ConfirmDialogProvider>
            <App />
          </ConfirmDialogProvider>
        </ToastProvider>
      ) : (
        <ConfigErrorScreen />
      )}
    </ErrorBoundary>
  </StrictMode>
);
