import React, { Component, ErrorInfo, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { supabase } from './lib/supabase';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  state = { hasError: false };

  static getDerivedStateFromError(error: Error) {
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

supabase.auth.getSession().catch((err) => {
  console.warn('Initial auth getSession notice:', err);
});

// Register Service Worker only if supported
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const isHttps = window.location.protocol === 'https:';
  const isLocalhost = window.location.hostname === 'localhost';
  const isRunApp = window.location.hostname.endsWith('run.app');

  if (isHttps || isLocalhost || isRunApp) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(
        (reg) => console.log('PWA Service Worker registered:', reg.scope),
        (err) => console.log('Service Worker registration failed:', err)
      );
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);