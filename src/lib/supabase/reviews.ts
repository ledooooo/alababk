// src/lib/supabase/reviews.ts
import { supabase } from './client';
import { ensureUUID, translateSupabaseError } from './helpers';
import { Review } from '../../types/domain';

export async function fetchSupabaseReviews(storeId?: string, limit = 500): Promise<Review[]> {
  let query = supabase.from('reviews').select('*, profiles(full_name)');
  if (storeId) query = query.eq('store_id', storeId);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);

  if (error) throw new Error(translateSupabaseError(error).message);
  return (data || []).map((r: any) => ({
    id: r.id,
    order_id: r.order_id,
    store_id: r.store_id || '',
    customer_id: r.customer_id,
    customer_name: r.profiles?.full_name || 'عميل',
    store_rating: r.store_rating ?? 5,
    delivery_rating: r.delivery_rating ?? 5,
    rating: r.store_rating ?? 5,
    comment: r.store_comment || r.agent_comment || '',
    store_response: r.store_reply,
    created_at: r.created_at || new Date().toISOString(),
  }));
}

export async function saveSupabaseReview(review: Partial<Review>): Promise<Review> {
  const validId = ensureUUID(review.id);

  const storeRating = review.store_rating ?? review.rating;
  if (storeRating == null || storeRating < 1 || storeRating > 5) {
    throw new Error('يجب إدخال تقييم صحيح بين 1 و 5 للمتجر');
  }
  const deliveryRating = review.delivery_rating ?? review.agent_rating ?? null;
  if (deliveryRating != null && (deliveryRating < 1 || deliveryRating > 5)) {
    throw new Error('تقييم المندوب يجب أن يكون بين 1 و 5');
  }

  // order_id و customer_id إلزاميان (NOT NULL) في جدول reviews — نتحقق منهما
  // هنا صراحة برسالة عربية واضحة بدل ترك الإدراج يفشل بخطأ قاعدة بيانات مبهم.
  if (!review.order_id) {
    throw new Error('لا يمكن إرسال تقييم بدون طلب مرتبط به');
  }
  let customerId = review.customer_id;
  if (!customerId) {
    const { data: authData } = await supabase.auth.getUser();
    customerId = authData?.user?.id;
  }
  if (!customerId) {
    throw new Error('يجب تسجيل الدخول لإرسال تقييم');
  }

  const payload: Record<string, any> = {
    id: validId,
    order_id: ensureUUID(review.order_id),
    store_id: review.store_id ? ensureUUID(review.store_id) : null,
    customer_id: ensureUUID(customerId),
    store_rating: storeRating,
    delivery_rating: deliveryRating,
    agent_rating: deliveryRating,
    store_comment: review.comment || review.store_comment || '',
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('reviews').insert([payload]).select('*, profiles(full_name)').single();
  if (error) throw new Error(translateSupabaseError(error).message);

  const r = data as any;
  return {
    id: r.id,
    order_id: r.order_id,
    store_id: r.store_id || '',
    customer_id: r.customer_id,
    customer_name: r.profiles?.full_name || review.customer_name || 'عميل',
    store_rating: r.store_rating ?? 5,
    delivery_rating: r.delivery_rating ?? 5,
    rating: r.store_rating ?? 5,
    comment: r.store_comment || r.agent_comment || '',
    store_response: r.store_reply,
    created_at: r.created_at || new Date().toISOString(),
  };
}

export async function replySupabaseReview(reviewId: string, replyText: string): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .update({ store_reply: replyText, updated_at: new Date().toISOString() })
    .eq('id', ensureUUID(reviewId))
    .select('*, profiles(full_name)')
    .single();

  if (error) throw new Error(translateSupabaseError(error).message);
  const r = data as any;
  return {
    id: r.id,
    order_id: r.order_id,
    store_id: r.store_id || '',
    customer_id: r.customer_id,
    customer_name: r.profiles?.full_name || 'عميل',
    store_rating: r.store_rating ?? 5,
    delivery_rating: r.delivery_rating ?? 5,
    rating: r.store_rating ?? 5,
    comment: r.store_comment || r.agent_comment || '',
    store_response: r.store_reply,
    created_at: r.created_at || new Date().toISOString(),
  };
}