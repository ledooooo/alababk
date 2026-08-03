import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { subscribeSupabase } from '../../../lib/supabase';
import { Review, Store } from '../../../types/domain';
import { Star, MessageSquare, ThumbsUp, UserCheck, Send, CheckCircle2, MessageCircle, AlertCircle } from 'lucide-react';

interface StoreReviewsSectionProps {
  store: Store;
}

export const StoreReviewsSection: React.FC<StoreReviewsSectionProps> = ({ store }) => {
  const currentUser = StorageRepo.getCurrentUser();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filterRating, setFilterRating] = useState<number | 'all'>('all');
  
  // New review form state
  const [showForm, setShowForm] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const loadReviews = () => {
    const list = StorageRepo.getReviews(store.id);
    setReviews(list);
  };

  useEffect(() => {
    loadReviews();
    if (store.id) {
      StorageRepo.refreshReviews(store.id);
    }

    const unsubscribeStorage = subscribeToStorageChange(() => {
      loadReviews();
    });

    const unsubscribeRealtime = subscribeSupabase<Review>(
      'reviews',
      () => {
        if (store.id) {
          StorageRepo.refreshReviews(store.id);
        }
      },
      store.id ? `store_id=eq.${store.id}` : undefined
    );

    return () => {
      unsubscribeStorage();
      unsubscribeRealtime();
    };
  }, [store.id]);

  // Calculate statistics
  const totalReviews = reviews.length;
  const avgRating = totalReviews > 0
    ? (reviews.reduce((acc, r) => acc + (r.store_rating || r.rating || 5), 0) / totalReviews).toFixed(1)
    : store.rating ? store.rating.toFixed(1) : '5.0';

  const countsByStar = {
    5: reviews.filter((r) => (r.store_rating || r.rating) === 5).length,
    4: reviews.filter((r) => (r.store_rating || r.rating) === 4).length,
    3: reviews.filter((r) => (r.store_rating || r.rating) === 3).length,
    2: reviews.filter((r) => (r.store_rating || r.rating) === 2).length,
    1: reviews.filter((r) => (r.store_rating || r.rating) === 1).length,
  };

  const filteredReviews = reviews.filter((r) => {
    if (filterRating === 'all') return true;
    return (r.store_rating || r.rating) === filterRating;
  });

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitError('');
    setIsSubmitting(true);

    const newReview: Review = {
      id: `rev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      order_id: `direct-${Date.now()}`,
      store_id: store.id,
      store_name: store.name,
      customer_id: currentUser?.id || `anon-${Date.now()}`,
      customer_name: currentUser?.full_name || 'عميل على بابك',
      store_rating: newRating,
      rating: newRating,
      comment: newComment.trim(),
      created_at: new Date().toISOString(),
    };

    try {
      await StorageRepo.saveReview(newReview);

      // Update store rating and reviews count in storage
      const updatedReviews = StorageRepo.getReviews(store.id);
      const newAvg = updatedReviews.length > 0
        ? updatedReviews.reduce((acc, r) => acc + (r.store_rating || r.rating || 5), 0) / updatedReviews.length
        : 5;
      
      await StorageRepo.saveStore({
        ...store,
        rating: Number(newAvg.toFixed(1)),
        reviews_count: updatedReviews.length,
      });

      setSubmitSuccess(true);
      setNewComment('');
      setTimeout(() => {
        setSubmitSuccess(false);
        setShowForm(false);
      }, 2000);
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      setSubmitError(err.message || 'تعذر حفظ التقييم، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 dir-rtl">
      {/* Overview & Add Review Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Average Rating Block */}
          <div className="flex items-center gap-5">
            <div className="bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 p-5 rounded-2xl text-center min-w-[110px] shadow-md">
              <span className="text-3xl sm:text-4xl font-black block">{avgRating}</span>
              <div className="flex justify-center text-slate-950 my-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-3.5 h-3.5 ${
                      s <= Math.round(Number(avgRating)) ? 'fill-slate-950' : 'opacity-30'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[10px] font-extrabold block text-slate-900">
                من أصل 5 نجوم
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-slate-900">تقييمات وآراء العملاء</h3>
              <p className="text-xs text-slate-500">
                إجمالي {totalReviews} تقييم حقيقي من مستخدمي تطبيق على بابك
              </p>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>أضف تقييمك وتجربتك</span>
                </button>
              )}
            </div>
          </div>

          {/* Rating Breakdown Progress Bars */}
          <div className="w-full md:w-64 space-y-1.5 text-xs">
            {([5, 4, 3, 2, 1] as const).map((star) => {
              const count = countsByStar[star];
              const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
              return (
                <div
                  key={star}
                  onClick={() => setFilterRating(filterRating === star ? 'all' : star)}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <span className="w-8 font-bold text-slate-600 group-hover:text-emerald-700 flex items-center gap-0.5">
                    {star} <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline" />
                  </span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-[11px] text-slate-400 font-mono text-left">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Write Review Form Collapsible */}
        {showForm && (
          <div className="mt-6 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span>شاركونا رأيك وتجربتك مع {store.name}</span>
                </h4>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-xs text-slate-400 hover:text-slate-700 font-bold"
                >
                  إلغاء
                </button>
              </div>

              {submitSuccess ? (
                <div className="p-4 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>شكرًا لك! تم حفظ تقييمك بنجاح ونشره للعملاء.</span>
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-4">
                  {/* Rating Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      اختر التقييم (من 1 إلى 5 نجوم):
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setNewRating(star)}
                          className={`p-2 rounded-xl transition-all ${
                            star <= newRating
                              ? 'bg-amber-100 text-amber-600 scale-105'
                              : 'bg-white text-slate-300 border border-slate-200'
                          }`}
                        >
                          <Star
                            className={`w-6 h-6 ${
                              star <= newRating ? 'fill-amber-400 text-amber-400' : ''
                            }`}
                          />
                        </button>
                      ))}
                      <span className="me-2 text-xs font-black text-amber-700">
                        {newRating === 5 && 'ممتاز جداً 🔥'}
                        {newRating === 4 && 'جيد جداً 👍'}
                        {newRating === 3 && 'مقبول 😐'}
                        {newRating === 2 && 'سيء 👎'}
                        {newRating === 1 && 'سيء جداً 😡'}
                      </span>
                    </div>
                  </div>

                  {/* Comment Textarea */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 block">
                      تعليقك وملاحظاتك عن جودة الطعام والتوصيل:
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="اكتب تعليقك هنا بكل حرية عن جودة الأصناف والخدمة..."
                      className="w-full p-3 bg-white text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="submit"
                      disabled={isSubmitting || !newComment.trim()}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>إرسال التقييم</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterRating('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterRating === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            جميع التقييمات ({reviews.length})
          </button>
          {([5, 4, 3, 2, 1] as const).map((star) => (
            <button
              key={star}
              onClick={() => setFilterRating(filterRating === star ? 'all' : star)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                filterRating === star
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{star}</span>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400 inline" />
              <span>({countsByStar[star]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 space-y-2">
          <MessageCircle className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-800 text-sm">لا توجد آراء متاحة بهذا التقييم</h4>
          <p className="text-xs text-slate-500">كن أول من يشارك برأيه حول هذا المتجر!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((rev) => {
            const ratingVal = rev.store_rating || rev.rating || 5;
            return (
              <div
                key={rev.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3 hover:border-slate-300 transition-all"
              >
                {/* Reviewer Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-extrabold flex items-center justify-center text-xs">
                      {rev.customer_name ? rev.customer_name.charAt(0) : 'ع'}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <span>{rev.customer_name || 'عميل على بابك'}</span>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-1.5 py-0.5 rounded-md border border-emerald-100 flex items-center gap-0.5">
                          <UserCheck className="w-3 h-3 text-emerald-600" />
                          مشتري موثق
                        </span>
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(rev.created_at).toLocaleDateString('ar-EG', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Rating Stars Badge */}
                  <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-xl">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-black text-amber-800">{ratingVal}</span>
                  </div>
                </div>

                {/* Review Comment */}
                <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                  {rev.comment || rev.store_comment || 'لا يوجد تعليق مكتوب.'}
                </p>

                {/* Store Response if present */}
                {rev.store_response && (
                  <div className="bg-purple-50/80 border border-purple-200/70 rounded-xl p-3 text-xs space-y-1 me-4">
                    <div className="font-bold text-purple-900 flex items-center gap-1 text-[11px]">
                      <MessageSquare className="w-3.5 h-3.5 text-purple-700" />
                      <span>رد المتجر ({store.name}):</span>
                    </div>
                    <p className="text-slate-700 text-xs leading-relaxed font-medium">
                      {rev.store_response}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
