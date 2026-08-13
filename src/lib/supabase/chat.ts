// src/lib/supabase/chat.ts
//
// طبقة الشات المرتبطة بطلب معيّن. الجدول (chat_messages) وسياسات RLS
// بتاعته كانت جاهزة بالكامل من قبل، الملف ده هو أول استخدام فعلي لهم.
//
// ملاحظة مهمة (مؤكَّدة من فحص RLS مباشرة): كل رسالة لازم يكون معاها
// sender_id + recipient_id محدَّدين بدقة (مش بس order_id)، وis_order_participant()
// بتتحقق إن الاتنين فعلاً طرفين شرعيين في نفس الطلب (العميل، صاحب المتجر
// عبر stores.owner_id، أو المندوب عبر delivery_agents.user_id — مش
// delivery_agents.id نفسه). عشان كده fetchChatRecipients بترجع الـ
// user_id الحقيقي لكل طرف (مش الـ id بتاع صف store/delivery_agent).

import { supabase } from './client';
import { translateSupabaseError } from './errors';

export interface ChatRecipients {
  customerId: string;
  storeOwnerId: string | null;
  storeName: string | null;
  agentUserId: string | null;
  agentName: string | null;
}

export interface ChatMessage {
  id: string;
  order_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

/** جلب هويات أطراف الشات الشرعيين لطلب معيّن (مرة واحدة عند فتح الشات) */
export async function fetchChatRecipients(orderId: string): Promise<ChatRecipients> {
  const { data, error } = await supabase
    .from('orders')
    .select('customer_id, stores(owner_id, name), delivery_agents(user_id, name)')
    .eq('id', orderId)
    .single();

  if (error) throw new Error(translateSupabaseError(error).message);

  const store = Array.isArray(data.stores) ? data.stores[0] : data.stores;
  const agent = Array.isArray(data.delivery_agents) ? data.delivery_agents[0] : data.delivery_agents;

  return {
    customerId: data.customer_id,
    storeOwnerId: store?.owner_id ?? null,
    storeName: store?.name ?? null,
    agentUserId: agent?.user_id ?? null,
    agentName: agent?.name ?? null,
  };
}

/** جلب سجل الرسائل بين المستخدم الحالي وطرف آخر معيّن، ضمن طلب معيّن */
export async function fetchChatMessages(orderId: string, otherUserId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('order_id', orderId)
    .or(`sender_id.eq.${otherUserId},recipient_id.eq.${otherUserId}`)
    .order('created_at', { ascending: true });

  if (error) throw new Error(translateSupabaseError(error).message);
  return (data || []) as ChatMessage[];
}

/** إرسال رسالة. sender_id يُستنتج تلقائيًا من الجلسة الحالية (auth.uid()) */
export async function sendChatMessage(orderId: string, recipientId: string, content: string): Promise<ChatMessage> {
  const trimmed = content.trim();
  if (!trimmed) throw new Error('لا يمكن إرسال رسالة فارغة');

  const { data: authData } = await supabase.auth.getUser();
  const senderId = authData?.user?.id;
  if (!senderId) throw new Error('يجب تسجيل الدخول لإرسال رسالة');

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ order_id: orderId, sender_id: senderId, recipient_id: recipientId, content: trimmed })
    .select('*')
    .single();

  if (error) throw new Error(translateSupabaseError(error).message);
  return data as ChatMessage;
}

/** تعليم رسائل الطرف الآخر (المستلَمة لي) كمقروءة عند فتح الشات */
export async function markChatMessagesRead(orderId: string, otherUserId: string): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  const currentUserId = authData?.user?.id;
  if (!currentUserId) return;

  await supabase
    .from('chat_messages')
    .update({ is_read: true })
    .eq('order_id', orderId)
    .eq('sender_id', otherUserId)
    .eq('recipient_id', currentUserId)
    .eq('is_read', false);
}
