// src/lib/supabase/wishlist.ts
//
// الجداول wishlist_stores و wishlist_products موجودة أصلاً في قاعدة
// البيانات (RLS + constraints كاملين)، لكن مفيش أي كود بيستخدمها —
// المفضلة كانت شغالة محليًا بس (localStorage)، يعني بتضيع لو المستخدم
// غيّر جهاز أو مسح بيانات المتصفح. الملف ده بيوصّل الفرونت بالجداول
// الحقيقية دي أخيرًا.
import { supabase } from './client';
import { translateSupabaseError } from './helpers';

export async function fetchWishlistStoreIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from('wishlist_stores').select('store_id').eq('user_id', userId);
  if (error) throw new Error(translateSupabaseError(error).message);
  return (data || []).map((r: any) => r.store_id);
}

export async function fetchWishlistProductIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from('wishlist_products').select('product_id').eq('user_id', userId);
  if (error) throw new Error(translateSupabaseError(error).message);
  return (data || []).map((r: any) => r.product_id);
}

export async function addStoreToWishlist(userId: string, storeId: string): Promise<void> {
  const { error } = await supabase.from('wishlist_stores').insert({ user_id: userId, store_id: storeId });
  // كود 23505 = تكرار مفتاح فريد (المتجر مضاف أصلاً) — نتجاهله بدل ما
  // نرمي خطأ، لأن النتيجة النهائية المطلوبة (المتجر في المفضلة) متحققة
  if (error && (error as any).code !== '23505') throw new Error(translateSupabaseError(error).message);
}

export async function removeStoreFromWishlist(userId: string, storeId: string): Promise<void> {
  const { error } = await supabase.from('wishlist_stores').delete().eq('user_id', userId).eq('store_id', storeId);
  if (error) throw new Error(translateSupabaseError(error).message);
}

export async function addProductToWishlist(userId: string, productId: string): Promise<void> {
  const { error } = await supabase.from('wishlist_products').insert({ user_id: userId, product_id: productId });
  if (error && (error as any).code !== '23505') throw new Error(translateSupabaseError(error).message);
}

export async function removeProductFromWishlist(userId: string, productId: string): Promise<void> {
  const { error } = await supabase.from('wishlist_products').delete().eq('user_id', userId).eq('product_id', productId);
  if (error) throw new Error(translateSupabaseError(error).message);
}
