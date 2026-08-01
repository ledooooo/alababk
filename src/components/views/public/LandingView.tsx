import React from 'react';
import { StorageRepo } from '../../../lib/storage';
import {
  ShoppingBag,
  Store,
  Bike,
  ShieldCheck,
  Clock,
  MapPin,
  Star,
  ChevronLeft,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Users,
  Building2,
  CheckCircle2,
  Smartphone
} from 'lucide-react';

interface LandingViewProps {
  onNavigate: (tab: string, param?: string) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onNavigate }) => {
  const stores = StorageRepo.getStores().slice(0, 4);
  const categories = StorageRepo.getCategories();

  return (
    <div className="space-y-12 dir-rtl pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-3xl p-8 sm:p-12 shadow-xl">
        <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-10 top-0 w-64 h-64 bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="flex items-center gap-3">
            <img
              src="/icon.png"
              alt="شعار على بابك"
              className="w-12 h-12 rounded-2xl object-cover shadow-lg border border-amber-300/30"
              referrerPolicy="no-referrer"
            />
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-700/60 border border-emerald-500/40 text-emerald-200 text-xs font-extrabold backdrop-blur-md">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>منصة التوصيل الفائق الأولى في مصر 🇪🇬</span>
            </div>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black leading-tight tracking-tight text-white">
            كل طلباتك من أجدع المحلات المجاورة.. <span className="text-amber-300 underline decoration-emerald-400">على بابك!</span>
          </h1>

          <p className="text-sm sm:text-base text-emerald-100/90 font-medium leading-relaxed max-w-2xl">
            نربطك فوراً بأفضل المتاجر والسوبرماركت والصيدليات والمخابز في منطقتك، مع توصيل فائق السرعة بواسطة عُمّال وكباتن محترفين في أقل من 20 دقيقة.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('customer-stores')}
              className="px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm rounded-2xl shadow-lg shadow-amber-400/20 hover:scale-105 transition-all flex items-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>ابدأ التسوق واطلب الآن</span>
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('auth')}
              className="px-5 py-3.5 bg-white text-emerald-950 hover:bg-emerald-50 font-black text-sm rounded-2xl shadow-md transition-all flex items-center gap-2"
            >
              <Users className="w-4 h-4 text-emerald-600" />
              <span>تسجيل الدخول / حساب جديد</span>
            </button>

            <button
              onClick={() => onNavigate('apply-store')}
              className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-2xl border border-white/20 backdrop-blur-md transition-all flex items-center gap-2"
            >
              <Store className="w-4 h-4 text-amber-300" />
              <span>سجل متجرك معنا</span>
            </button>

            <button
              onClick={() => onNavigate('apply-agent')}
              className="px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-2xl border border-white/20 backdrop-blur-md transition-all flex items-center gap-2"
            >
              <Bike className="w-4 h-4 text-amber-300" />
              <span>انضم ككابتن توصيل</span>
            </button>
          </div>

          {/* Key Value Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-emerald-700/50 text-xs font-bold text-emerald-100">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-300 shrink-0" />
              <span>توصيل قياسي 20 دقيقة</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-300 shrink-0" />
              <span>منتجات طازجة 100%</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-300 shrink-0" />
              <span>تغطية حية بالموقع</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-300 shrink-0" />
              <span>تقييمات حقيقية</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Categories Bar */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">أقسام التسوق المباشر</h2>
            <p className="text-xs text-slate-500 mt-0.5">اختر القسم لتصفح المحلات المتاحة قريب منك</p>
          </div>
          <button
            onClick={() => onNavigate('customer-stores')}
            className="text-xs font-extrabold text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            <span>عرض جميع الأقسام والمتاجر</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onNavigate('customer-stores', cat.id)}
              className="p-4 bg-white hover:bg-purple-50/50 border border-slate-200/80 hover:border-purple-300 rounded-2xl text-center transition-all group shadow-xs hover:-translate-y-1"
            >
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{cat.icon || '📦'}</div>
              <h3 className="font-extrabold text-slate-800 text-xs group-hover:text-purple-700 truncate">{cat.name}</h3>
            </button>
          ))}
        </div>
      </section>

      {/* Featured Stores Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">أشهر المحلات والشركاء</h2>
            <p className="text-xs text-slate-500 mt-0.5">متاجر معتمدة تقدم أفضل جودة وأسرع تحضير</p>
          </div>
          <button
            onClick={() => onNavigate('customer-stores')}
            className="text-xs font-extrabold text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            <span>عرض كل المحلات</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stores.map((store) => (
            <div
              key={store.id}
              onClick={() => onNavigate('customer-store-detail', store.id)}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all overflow-hidden cursor-pointer group"
            >
              <div className="relative h-32 bg-slate-100 overflow-hidden">
                <img
                  src={store.banner_url || store.logo_url}
                  alt={store.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-bold text-slate-800 flex items-center gap-1 shadow-xs">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  <span>{store.rating.toFixed(1)}</span>
                </div>
              </div>

              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-black text-slate-900 text-sm group-hover:text-purple-600 transition-colors leading-snug">
                    {store.name}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 shrink-0">
                    {store.category_name}
                  </span>
                </div>

                <p className="text-[11px] text-slate-500 line-clamp-1">{store.address}</p>

                <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-700 pt-2 border-t border-slate-100">
                  <span className="text-emerald-600">التوصيل: {store.delivery_fee} ج.م</span>
                  <span className="text-slate-400">20-30 دقيقة</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works section */}
      <section className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-800 font-extrabold text-xs">خطوات بسيطة</span>
          <h2 className="text-2xl font-black text-slate-900">كيف تعتمد على منصة "على بابك"؟</h2>
          <p className="text-xs text-slate-500">4 خطوات فقط يفصلونك عن استلام طلبك طازجاً وسريعاً</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/60 text-center space-y-3 relative">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white font-black text-lg flex items-center justify-center mx-auto shadow-md">
              1
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">حدد موقعك والمحل</h3>
            <p className="text-xs text-slate-500 leading-relaxed">اختر منطقتك وتصفح المحلات المجاورة لك من الأقسام المتاحة.</p>
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/60 text-center space-y-3 relative">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white font-black text-lg flex items-center justify-center mx-auto shadow-md">
              2
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">أضف المنتجات لسلتك</h3>
            <p className="text-xs text-slate-500 leading-relaxed">تصفح الأسعار المباشرة والمخزون الحقيقي وأضف طلباتك للعلامة.</p>
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/60 text-center space-y-3 relative">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white font-black text-lg flex items-center justify-center mx-auto shadow-md">
              3
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">تجهيز فوري وتعيين كابتن</h3>
            <p className="text-xs text-slate-500 leading-relaxed">يقبل المحل الطلب فوراً وينطلق الكابتن القريب لاستلامه.</p>
          </div>

          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/60 text-center space-y-3 relative">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-black text-lg flex items-center justify-center mx-auto shadow-md">
              4
            </div>
            <h3 className="font-extrabold text-slate-900 text-sm">استلم الطلب على بابك!</h3>
            <p className="text-xs text-slate-500 leading-relaxed">تابع حركة الكابتن على الخريطة لحظة بلحظة واستلم طلبك بكل أمان.</p>
          </div>
        </div>
      </section>

      {/* Platform Statistics */}
      <section className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-3xl p-8 sm:p-10 shadow-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-black text-amber-300">500+</p>
            <p className="text-xs text-purple-200 font-bold">متجر ومحل محلي معتمد</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-black text-amber-300">1,200+</p>
            <p className="text-xs text-purple-200 font-bold">كابتن توصيل جاهز</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-black text-amber-300">18 دقيقة</p>
            <p className="text-xs text-purple-200 font-bold">متوسط زمن التوصيل</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-black text-amber-300">99.4%</p>
            <p className="text-xs text-purple-200 font-bold">نسبة رضا العملاء</p>
          </div>
        </div>
      </section>

      {/* Join Dual Banners */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Merchant Partner Banner */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-black text-slate-900">هل تملك محلاً أو بقالة؟</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              انضم لمنصة "على بابك" وضاعف مبيعاتك اليومية عبر الوصول لآلاف العملاء في منطقتك مجاناً وبدون تعقيدات.
            </p>
          </div>
          <button
            onClick={() => onNavigate('apply-store')}
            className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
          >
            <span>قدم طلب انضمام كمتجر الآن</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Delivery Captain Banner */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Bike className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-black text-slate-900">عايز تزود دخلك اليومي؟</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              انضم لفريق كباتن التوصيل في منطقتك بمرونة كاملة وساعات عمل حرة مع تسويات مالية فورية وعمولات مجزية.
            </p>
          </div>
          <button
            onClick={() => onNavigate('apply-agent')}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-2"
          >
            <span>انضم ككابتن توصيل الآن</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </section>
    </div>
  );
};
