import React from 'react';
import { ShieldCheck, FileText, Lock, ArrowUp } from 'lucide-react';

export const TermsPrivacyView: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 dir-rtl pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-3xl p-8 text-center space-y-2 shadow-md">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold border border-white/20">
          <ShieldCheck className="w-4 h-4" />
          <span>السياسات والأحكام القانونية</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">شروط الاستخدام وسياسة الخصوصية</h1>
        <p className="text-xs text-slate-300">آخر تحديث: يوليو 2026 - منصة على بابك للتوصيل السريع</p>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-8 text-slate-800">
        {/* Section 1: Terms of Use */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <FileText className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-black text-slate-900">1. شروط استخدام المنصة (Terms of Service)</h2>
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            أهلاً بك في منصة "على بابك". باستخدامك لموقعنا أو تطبيقنا فإنك توافق التزامياً على الشروط والأحكام الآتية. تُعنى المنصة بتقديم خدمات الوساطة الرقمية والتوصيل الفائق من المحلات التجارية المحلية المعتمدة إلى العميل مباشرة.
          </p>
          <ul className="list-disc list-inside text-xs leading-relaxed text-slate-600 space-y-1.5 pr-2">
            <li>التزام العميل بتقديم بيانات دقيقة تشمل الاسم، رقم الهاتف، وعنوان التوصيل الفعلي.</li>
            <li>تحتفظ المنصة بالحق في إلغاء الطلبات في حالة تعذر التواصل مع العميل أو عدم صحة العنوان.</li>
            <li>الأسعار المعروضة في التطبيق هي ذاتها المعروضة في المحلات التجارية المعتمدة، مع إضافة رسوم التوصيل المقررة بناءً على المنطقة.</li>
          </ul>
        </div>

        {/* Section 2: Privacy Policy */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Lock className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-black text-slate-900">2. سياسة الخصوصية وحماية البيانات (Privacy Policy)</h2>
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            نحن في منصة "على بابك" نولي أهمية قصوى لحماية خصوصيتك وأمان بياناتك الشخصية:
          </p>
          <ul className="list-disc list-inside text-xs leading-relaxed text-slate-600 space-y-1.5 pr-2">
            <li>جمع البيانات يقتصر على المعلومات الضرورية لتنفيذ وتوصيل الطلبات (الاسم، الهاتف، الموقع الجغرافي).</li>
            <li>لا نتم مشاركة بياناتك الشخصية مع أي أطراف ثالثة لأغراض إعلانية دون موافقتك الصريحة.</li>
            <li>يتم تشفير كافة البيانات والمعاملات المالية عبر بروتوكولات حماية عالية الأمان (SSL/TLS).</li>
            <li>تشارك المنصة موقعك وعنوانك فقط مع الكابتن المسؤول عن توصيل طلبك النشط حتى اكتمال التوصيل.</li>
          </ul>
        </div>

        {/* Section 3: Cancellation and Refund Policy */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <h2 className="text-lg font-black text-slate-900">3. سياسة الإلغاء والاسترجاع (Refund & Cancellation)</h2>
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            يمكن للعميل إلغاء الطلب مجاناً في حالة ما إذا كان الطلب في حالة "قيد الانتظار" (Pending) وقبل قبول المتجر للطلب وتجهيزه.
          </p>
          <ul className="list-disc list-inside text-xs leading-relaxed text-slate-600 space-y-1.5 pr-2">
            <li>في حالة وصول منتجات تالفة أو غير مطابقة للمواصفات، يحق للعميل طلب الاسترجاع الفوري أو الاستبدال مجاناً عبر الدعم الفني.</li>
            <li>المنتجات الطازجة أو المأكولات والمخبوزات لا تمكن استرجاعها بعد الاستلام إلا في حالة تلف المنتجات.</li>
          </ul>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">© 2026 منصة على بابك (JIHAT Platform). جميع الحقوق محفوظة.</span>
          <button
            onClick={scrollToTop}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1"
          >
            <ArrowUp className="w-4 h-4" />
            <span>للأعلى</span>
          </button>
        </div>
      </div>
    </div>
  );
};
