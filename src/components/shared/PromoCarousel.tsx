import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft, ShoppingBag, Tag, ArrowLeft } from 'lucide-react';
import { fetchActivePromotions, Promotion } from '../../lib/supabase';
import { PROMO_THEMES, PROMO_ICONS } from '../../lib/promo-presets';

interface PromoCarouselProps {
  onNavigate: (tab: string, param?: string) => void;
}

export const PromoCarousel: React.FC<PromoCarouselProps> = ({ onNavigate }) => {
  const [slides, setSlides] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    fetchActivePromotions()
      .then(setSlides)
      .catch((err) => console.warn('fetchActivePromotions error:', err))
      .finally(() => setLoading(false));
  }, []);

  // Auto slide interval
  useEffect(() => {
    if (isPaused || slides.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isPaused, slides.length]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  // Touch Swipe Handlers for Mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      touchStartX.current = e.touches[0].clientX;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      touchEndX.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 40;

    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }

    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleAction = (slide: Promotion) => {
    if (slide.action_type === 'external_url' && slide.action_target) {
      window.open(slide.action_target, '_blank', 'noopener,noreferrer');
      return;
    }
    if (slide.action_type === 'store_detail') {
      onNavigate('customer-store-detail', slide.action_target || undefined);
      return;
    }
    if (slide.action_type === 'category') {
      onNavigate('customer-stores', slide.action_target || undefined);
      return;
    }
    onNavigate('customer-stores');
  };

  // لسه بيحمّل، أو مفيش عروض نشطة حاليًا (الأدمن ألغى تفعيلها كلها
  // أو مفيش عروض ضمن نطاق تاريخها) → منعرضش أي حاجة، بدل مساحة فاضية
  if (loading || slides.length === 0) return null;

  const currentSlide = slides[currentIndex];
  if (!currentSlide) return null;

  const themeConfig = PROMO_THEMES[currentSlide.theme] || PROMO_THEMES.blue;
  const iconConfig = PROMO_ICONS[currentSlide.icon] || PROMO_ICONS.sparkles;
  const SlideIcon = iconConfig.Icon;

  return (
    <div
      className="relative rounded-3xl overflow-hidden shadow-xl dir-rtl select-none group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Banner with Gradient */}
      <div className={`relative min-h-[220px] sm:min-h-[240px] bg-gradient-to-r ${themeConfig.bgGradient} p-6 sm:p-8 text-white transition-all duration-500 ease-in-out flex flex-col justify-between border border-white/10`}>

        {/* Decorative Blurred Circles */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 right-10 w-48 h-48 bg-amber-400/10 rounded-full blur-xl pointer-events-none" />

        {/* Content Header & Badges */}
        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black shadow-xs ${themeConfig.badgeBg}`}>
              <SlideIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{currentSlide.badge_label}</span>
            </span>

            {/* Slide Position Counter */}
            <span className="text-[11px] font-bold text-white/70 bg-black/30 px-2.5 py-0.5 rounded-full border border-white/10">
              {currentIndex + 1} من {slides.length}
            </span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <h3 className="text-xl sm:text-3xl font-black leading-snug text-white tracking-tight">
                {currentSlide.title}
              </h3>
              <p className="text-sm sm:text-base font-extrabold text-amber-300">
                {currentSlide.highlight_text}
              </p>
              <p className="text-xs sm:text-sm text-white/80 font-medium line-clamp-2 leading-relaxed">
                {currentSlide.description}
              </p>
            </div>

            <div className="hidden sm:flex p-3 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-md shrink-0 shadow-lg">
              <SlideIcon className={`w-8 h-8 ${themeConfig.iconColor}`} />
            </div>
          </div>
        </div>

        {/* Carousel Footer & Action Controls */}
        <div className="relative z-10 pt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10">

          {/* Action CTA Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleAction(currentSlide)}
              className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-md hover:scale-105 transition-all flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{currentSlide.action_label}</span>
              <ArrowLeft className="w-4 h-4" />
            </button>

            {currentSlide.coupon_code && (
              <div className="hidden xs:flex items-center gap-1.5 px-3 py-2 bg-black/40 border border-dashed border-amber-300/60 rounded-xl text-xs font-mono text-amber-300">
                <Tag className="w-3.5 h-3.5 text-amber-400" />
                <span>رمز الخصم: {currentSlide.coupon_code}</span>
              </div>
            )}
          </div>

          {/* Indicators / Navigation Dots */}
          {slides.length > 1 && (
            <div className="flex items-center gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`transition-all ${
                    currentIndex === idx
                      ? 'w-7 h-2.5 bg-amber-400 rounded-full'
                      : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/70 rounded-full'
                  }`}
                  title={`شريحة العرض ${idx + 1}`}
                />
              ))}
            </div>
          )}

        </div>

      </div>

      {/* Manual Prev / Next Arrow Controls */}
      {slides.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute top-1/2 -translate-y-1/2 right-3 w-9 h-9 bg-black/30 hover:bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-white/20 backdrop-blur-xs"
            title="العرض السابق"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <button
            onClick={handleNext}
            className="absolute top-1/2 -translate-y-1/2 left-3 w-9 h-9 bg-black/30 hover:bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-white/20 backdrop-blur-xs"
            title="العرض التالي"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </>
      )}

    </div>
  );
};
