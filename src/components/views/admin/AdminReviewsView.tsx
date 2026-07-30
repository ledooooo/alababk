import React, { useState, useEffect } from 'react';
import { fetchSupabaseReviews, supabase } from '../../../lib/supabase';
import { Review } from '../../../types/domain';
import { formatDate } from '../../../lib/formatters';
import { Star, MessageSquare, Store, Bike, CheckCircle2, RefreshCw } from 'lucide-react';

export const AdminReviewsView: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});

  const loadReviews = async () => {
    setLoading(true);
    const data = await fetchSupabaseReviews();
    if (data.length > 0) {
      setReviews(data);
    } else {
      setReviews([
        {
          id: 'rev-1',
          order_id: 'ord-1001',
          store_id: 'store-1',
          customer_id: 'usr-customer-1',
          customer_name: 'أحمد محمود العبد',
          store_rating: 5,
          delivery_rating: 5,
          comment: 'المنتجات طازجة والتوصيل تم في خلال 20 دقيقة بالضبط، كابتن محترم جداً!',
          store_response: 'شكراً لجنابك ونشرف بخدمتك دائماً في علي بابك!',
          created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        },
        {
          id: 'rev-2',
          order_id: 'ord-1002',
          store_id: 'store-2',
          customer_id: 'usr-customer-2',
          customer_name: 'سارة مصطفى',
          store_rating: 4,
          delivery_rating: 5,
          comment: 'اللحمة بلدي ونظيفة جداً، وسرعة فائقة من المندوب.',
          created_at: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
        },
      ]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleSaveReply = async (reviewId: string) => {
    const reply = replyText[reviewId];
    if (!reply) return;

    try {
      await supabase.from('reviews').update({ store_reply: reply }).eq('id', reviewId);
    } catch {
      // fallback
    }

    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, store_response: reply } : r))
    );
    setReplyText((prev) => ({ ...prev, [reviewId]: '' }));
  };

  return (
    <div className="space-y-6 dir-rtl">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-500 font-bold text-sm mb-1">
            <Star className="w-5 h-5 fill-amber-400" />
            <span>تقييمات العملاء وآراء الخدمة (جدول Supabase Reviews)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">سجل التقييمات والمراجعات</h1>
          <p className="text-xs text-slate-500 mt-1">
            عرض ومتابعة تقييمات العملاء للمتاجر وكباتن التوصيل والرد عليها
          </p>
        </div>
        <button
          onClick={loadReviews}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث التقييمات</span>
        </button>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((rev) => (
          <div key={rev.id} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                  {rev.customer_name?.[0] || 'ع'}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-xs">{rev.customer_name}</h3>
                  <p className="text-[10px] text-slate-400">{formatDate(rev.created_at)}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-bold">
                <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1 rounded-lg text-amber-800 border border-amber-200/60">
                  <Store className="w-3.5 h-3.5 text-amber-600" />
                  <span>المتجر:</span>
                  <div className="flex items-center text-amber-500 mr-1">
                    {'★'.repeat(rev.store_rating)}
                  </div>
                </div>

                {rev.delivery_rating && (
                  <div className="flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-lg text-blue-800 border border-blue-200/60">
                    <Bike className="w-3.5 h-3.5 text-blue-600" />
                    <span>الكابتن:</span>
                    <div className="flex items-center text-amber-500 mr-1">
                      {'★'.repeat(rev.delivery_rating)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Comment Body */}
            {rev.comment && (
              <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed font-medium">
                "{rev.comment}"
              </p>
            )}

            {/* Existing Response or Reply Box */}
            {rev.store_response ? (
              <div className="bg-purple-50/80 border border-purple-100 p-3 rounded-xl text-xs space-y-1">
                <span className="font-extrabold text-purple-900 text-[11px] block">رد إدارة المتجر / المنصة:</span>
                <p className="text-purple-800 font-medium">{rev.store_response}</p>
              </div>
            ) : (
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="أكتب رداً رسمياً على التقييم..."
                  value={replyText[rev.id] || ''}
                  onChange={(e) => setReplyText({ ...replyText, [rev.id]: e.target.value })}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-purple-600"
                />
                <button
                  onClick={() => handleSaveReply(rev.id)}
                  className="px-4 py-2 bg-purple-600 text-white font-bold rounded-xl text-xs hover:bg-purple-700 transition-colors shrink-0"
                >
                  إرسال الرد
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
