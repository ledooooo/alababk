import React, { useState } from 'react';
import { StorageRepo } from '../../lib/storage';
import { Star, X, CheckCircle2, MessageSquare } from 'lucide-react';
import { Order } from '../../types/domain';

interface SubmitReviewModalProps {
  order: Order;
  onClose: () => void;
  onSubmitted: () => void;
}

export const SubmitReviewModal: React.FC<SubmitReviewModalProps> = ({
  order,
  onClose,
  onSubmitted,
}) => {
  const [storeRating, setStoreRating] = useState(5);
  const [agentRating, setAgentRating] = useState(5);
  const [storeComment, setStoreComment] = useState('');
  const [agentComment, setAgentComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const currentUser = StorageRepo.getCurrentUser();

    const newReview = {
      id: `rev-${Date.now()}`,
      order_id: order.id,
      customer_id: currentUser?.id || 'usr-customer-1',
      customer_name: currentUser?.full_name || 'عميل على بابك',
      store_id: order.store_id,
      store_name: order.store_name,
      delivery_agent_id: order.delivery_agent_id,
      delivery_agent_name: order.delivery_agent_name,
      store_rating: storeRating,
      agent_rating: agentRating,
      rating: storeRating,
      comment: storeComment || agentComment || '',
      store_comment: storeComment,
      agent_comment: agentComment,
      created_at: new Date().toISOString(),
    };

    try {
      await StorageRepo.saveReview(newReview);
      onSubmitted();
      onClose();
    } catch (err: any) {
      alert(`تعذر إرسال التقييم: ${err.message || 'خطأ غير معروف'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 dir-rtl">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-slate-200 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1 text-center sm:text-right">
          <h3 className="text-xl font-black text-slate-900">تقييم الطلب #{order.order_number}</h3>
          <p className="text-xs text-slate-500">شاركنا تجربتك لتطوير جودة التوصيل والمتاجر المعتمدة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Store Rating */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <label className="block text-xs font-black text-slate-800">
              تقييم المتجر ({order.store_name}):
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setStoreRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star
                    className={`w-7 h-7 ${
                      star <= storeRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
              <span className="text-xs font-black text-amber-600 mr-2">{storeRating} من 5</span>
            </div>
            <input
              type="text"
              placeholder="تعليقك عن المنتجات وجودة التحضير (اختياري)"
              value={storeComment}
              onChange={(e) => setStoreComment(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs"
            />
          </div>

          {/* Delivery Agent Rating */}
          {order.delivery_agent_name && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
              <label className="block text-xs font-black text-slate-800">
                تقييم كابتن التوصيل ({order.delivery_agent_name}):
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setAgentRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        star <= agentRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-black text-amber-600 mr-2">{agentRating} من 5</span>
              </div>
              <input
                type="text"
                placeholder="تعليقك عن السرعة وأسلوب الكابتن (اختياري)"
                value={agentComment}
                onChange={(e) => setAgentComment(e.target.value)}
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-xs"
            >
              حفظ التقييم
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
