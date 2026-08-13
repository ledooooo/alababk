import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { subscribeSupabase } from '../../../lib/supabase';
import { Review, Store } from '../../../types/domain';
import { Star, MessageSquare, CornerDownLeft, CheckCircle2, ThumbsUp, Loader2 } from 'lucide-react';
import { useToast } from '../../shared/Toast';

export default function StoreReviewsView() {
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    let isMounted = true;
    StorageRepo.getCurrentStore().then((store) => {
      if (isMounted) setCurrentStore(store);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const sync = () => {
      const list = StorageRepo.getReviews(currentStore?.id);
      setReviews(list);
    };

    sync();
    if (currentStore?.id) {
      StorageRepo.refreshReviews(currentStore.id);
    }

    const unsubStorage = subscribeToStorageChange((detail) => {
      if (detail.entityType === 'review') sync();
    });

    const unsubRealtime = subscribeSupabase<Review>(
      'reviews',
      () => {
        if (currentStore?.id) {
          StorageRepo.refreshReviews(currentStore.id);
        }
      },
      currentStore?.id ? `store_id=eq.${currentStore.id}` : undefined
    );

    return () => {
      unsubStorage();
      unsubRealtime();
    };
  }, [currentStore?.id]);

  const handleReplySubmit = async (reviewId: string) => {
    const text = replyText[reviewId]?.trim();
    if (!text) {
      showToast({
        type: 'error',
        title: 'خطأ',
        message: 'يرجى كتابة الرد أولاً',
      });
      return;
    }

    try {
      setSubmittingId(reviewId);
      await StorageRepo.replyToReview(reviewId, text);
      setReplyText((prev) => ({ ...prev, [reviewId]: '' }));
      showToast({
        type: 'success',
        title: 'تم',
        message: 'تم إرسال الرد بنجاح',
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'فشل الإرسال',
        message: err.message || 'تعذر إرسال الرد',
      });
    } finally {
      setSubmittingId(null);
    }
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + (r.store_rating || r.rating || 5), 0) / reviews.length).toFixed(1)
    : '5.0';

  return (
    <div className="max-w-4xl mx-auto space-y-6 dir-rtl pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-900 to-amber-950 text-white rounded-3xl p-6 sm:p-8 space-y-2 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 flex items-center justify-center font-black">
            <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black">تقييمات وآراء العملاء</h1>
            <p className="text-xs text-amber-200">تابع انطباعات وتجارب العملاء مع متجرك وقم بالرد المباشر لتعزيز الثقة</p>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-xl">
            ⭐
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{averageRating}</p>
            <p className="text-xs font-bold text-slate-500">متوسط التقييم العام</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{reviews.length}</p>
            <p className="text-xs font-bold text-slate-500">إجمالي المراجعات والردود</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <ThumbsUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">
              {reviews.filter((r) => (r.store_rating || r.rating || 5) >= 4).length}
            </p>
            <p className="text-xs font-bold text-slate-500">تقييمات إيجابية (4-5 نجوم)</p>
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="font-black text-slate-900 text-base border-b border-slate-100 pb-3">أحدث المراجعات</h2>

        {reviews.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            لا توجد تقييمات مسجلة لمتجرك حتى الآن.
          </div>
        ) : (
          <div className="space-y-4 divide-y divide-slate-100">
            {reviews.map((rev) => {
              const hasResponse = Boolean(rev.store_response);
              const isReplying = submittingId === rev.id;

              return (
                <div key={rev.id} className="pt-4 first:pt-0 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-extrabold flex items-center justify-center text-xs">
                        {(rev.customer_name || 'ع').slice(0, 1)}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-xs">{rev.customer_name || 'عميل'}</h3>
                        <p className="text-[10px] text-slate-500">{(rev.created_at || '').slice(0, 10)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg text-amber-700 font-bold text-xs">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{rev.store_rating || rev.rating || 5} / 5</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-medium bg-slate-50/70 p-3 rounded-2xl">
                    "{rev.comment}"
                  </p>

                  {/* Store Response section */}
                  {hasResponse ? (
                    <div className="mr-6 p-3 bg-purple-50 rounded-2xl border border-purple-100 space-y-1">
                      <div className="flex items-center gap-1.5 text-purple-900 text-[11px] font-bold">
                        <CornerDownLeft className="w-3.5 h-3.5 text-purple-600" />
                        <span>رد المتجر:</span>
                      </div>
                      <p className="text-xs text-slate-800 pr-5">{rev.store_response}</p>
                    </div>
                  ) : (
                    <div className="mr-6 space-y-2 pt-1">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="اكتب رداً رسمياً على تقييم العملاء..."
                          value={replyText[rev.id] || ''}
                          onChange={(e) =>
                            setReplyText((prev) => ({ ...prev, [rev.id]: e.target.value }))
                          }
                          className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                        <button
                          onClick={() => handleReplySubmit(rev.id)}
                          disabled={isReplying}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5"
                        >
                          {isReplying ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>جاري إرسال الرد...</span>
                            </>
                          ) : (
                            <span>إرسال الرد</span>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}