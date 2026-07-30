import React, { useState } from 'react';
import {
  HelpCircle,
  ShoppingBag,
  Store,
  Bike,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  PhoneCall,
  Clock
} from 'lucide-react';

interface AboutViewProps {
  onNavigate: (tab: string, param?: string) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onNavigate }) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'ما هي منصة "على بابك" وكيف تعمل؟',
      a: 'على بابك هي منصة توصيل فائقة السرعة للمحلات المجاورة لك (Hyperlocal Delivery). توفر لك كل احتياجاتك اليومية من المتاجر والبقالة والصيدليات المجاورة وتوصلها لباب بيتك في دقائق معدودة.',
    },
    {
      q: 'كم يستغرق توصيل الطلب في المتوسط؟',
      a: 'متوسط زمن التوصيل لدينا يتراوح بين 15 إلى 25 دقيقة فقط، لأننا نربط الطلب بأقرب كابتن توصيل موجود بجوار المحل مباشرة.',
    },
    {
      q: 'كيف يمكنني دفع قيمة الطلب؟',
      a: 'يمكنك الدفع نقداً عند الاستلام (Cash on Delivery) أو عن طريق البطاقات البنكية والدفع الإلكتروني السريع بأمان كامل.',
    },
    {
      q: 'أنا صاحب محل.. كيف يمكنني التسجيل معكم؟',
      a: 'يمكنك الضغط على زر "انضم كمتجر" وتعبئة البيانات الأساسية لمحلّك، وسيقوم فريق المراجعة بالتواصل معك وتفعيل حسابك خلال أقل من 24 ساعة.',
    },
    {
      q: 'ما هي الشروط المعتمدة لانضمام الكباتن؟',
      a: 'يلزم أن يتوفر لديك وسيلة مواصلات (موتوسيكل/عجلة/سيارة)، وبطاقة رقم قومي سارية، ورخصة قيادة سارية (في حالة المركبات)، وحسن السير والسلوك.',
    },
  ];

  return (
    <div className="space-y-10 dir-rtl pb-16 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-800 text-white rounded-3xl p-8 sm:p-10 text-center space-y-4 shadow-md">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-purple-200 text-xs font-bold backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>تعرف على منصة على بابك</span>
        </div>
        <h1 className="text-3xl font-black">عن منصتنا وكيفية العمل</h1>
        <p className="text-xs sm:text-sm text-purple-100 max-w-2xl mx-auto leading-relaxed">
          نسعى لتسهيل حياة المواطنين والمقيمين في مصر عبر الربط المباشر بين المتاجر المحلية والعملاء بأعلى درجات السرعة والجودة.
        </p>
      </div>

      {/* 4 Steps Section */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-6">
        <h2 className="text-xl font-black text-slate-900 text-center">رحلة الطلب في 4 خطوات</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2 text-center">
            <span className="w-8 h-8 rounded-full bg-purple-600 text-white font-extrabold text-xs inline-flex items-center justify-center">1</span>
            <h3 className="font-extrabold text-slate-900 text-sm">تصفح واختر</h3>
            <p className="text-xs text-slate-500 leading-relaxed">اختر منطقتك وتصفح أقسام السوبرماركت، المخبوزات، الخضروات، والمزيد.</p>
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2 text-center">
            <span className="w-8 h-8 rounded-full bg-purple-600 text-white font-extrabold text-xs inline-flex items-center justify-center">2</span>
            <h3 className="font-extrabold text-slate-900 text-sm">أضف للسلة واطلب</h3>
            <p className="text-xs text-slate-500 leading-relaxed">حدد الكميات، ادخل عنوانك وملاحظاتك واطلب فوراً بكل سهولة.</p>
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2 text-center">
            <span className="w-8 h-8 rounded-full bg-purple-600 text-white font-extrabold text-xs inline-flex items-center justify-center">3</span>
            <h3 className="font-extrabold text-slate-900 text-sm">التجهيز المباشر</h3>
            <p className="text-xs text-slate-500 leading-relaxed">يقوم المحل بتأكيد طلبك وتغليفه وطباعة الفاتورة في ثوانٍ.</p>
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/60 space-y-2 text-center">
            <span className="w-8 h-8 rounded-full bg-emerald-600 text-white font-extrabold text-xs inline-flex items-center justify-center">4</span>
            <h3 className="font-extrabold text-slate-900 text-sm">استلم على بابك</h3>
            <p className="text-xs text-slate-500 leading-relaxed">ينطلق الكابتن إليك مباشرة وتتابع مساره حياً حتى وصوله.</p>
          </div>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-black text-slate-900">الأسئلة الشائعة والإرشادات</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="border border-slate-200 rounded-2xl overflow-hidden transition-all bg-slate-50/50"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-4 text-right font-extrabold text-slate-900 text-xs sm:text-sm flex items-center justify-between gap-4"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${activeFaq === idx ? 'rotate-180' : ''}`} />
              </button>

              {activeFaq === idx && (
                <div className="px-4 pb-4 text-xs text-slate-600 leading-relaxed border-t border-slate-200/60 pt-3 bg-white">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Contact CTA */}
      <div className="bg-amber-50 rounded-3xl p-6 border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
        <div>
          <h3 className="font-black text-amber-950 text-sm">هل لديك استفسار آخر لم نجبه هنا؟</h3>
          <p className="text-xs text-amber-800 mt-1">فريق الدعم الفني متواجد على مدار الساعة لمساعدتك فوراً</p>
        </div>
        <button
          onClick={() => onNavigate('contact')}
          className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black shadow-xs shrink-0"
        >
          تواصل مع الدعم الفني
        </button>
      </div>
    </div>
  );
};
