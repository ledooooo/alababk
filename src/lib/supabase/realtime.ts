// src/lib/supabase/realtime.ts
import { supabase } from './client';

// قبل كده: كل نداء لـ subscribeSupabase(table, cb, filter) كان بيفتح channel جديد
// بالكامل باسم عشوائي (Math.random())، حتى لو 5 كومبوننت مختلفين مشتركين في نفس
// الجدول بنفس الـfilter بالظبط (زي 5 شاشات متجر كلهم بيسمعوا لـ 'stores' مع
// owner_id=eq.<نفس اليوزر>). كل channel منفصل = subscription منفصل فعليًا على
// WAL بتاع Postgres، وده اللي كان بيضخّم عدد استدعاءات الـRealtime.
//
// دلوقتي: الـchannels اتجمعت حسب مفتاح (table + filter). أول كومبوننت يشترك
// بمفتاح معيّن بيفتح channel واحد فعلي، وأي كومبوننت تاني بنفس المفتاح بينضم
// كمستمع محلي على نفس الـchannel من غير ما يفتح subscription جديد على
// الخادم. لما آخر مستمع يقفل (unmount)، الـchannel الحقيقي بيتقفل معاه.
// الشكل الخارجي للدالة زي ما هو بالظبط، فمفيش أي تعديل مطلوب في أي كومبوننت
// بيستخدمها.

type NormalizedPayload<T = unknown> = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
};

type Listener = (payload: NormalizedPayload<any>) => void;

interface ChannelEntry {
  channel: ReturnType<typeof supabase.channel>;
  listeners: Set<Listener>;
}

const channelRegistry = new Map<string, ChannelEntry>();

export function subscribeSupabase<T>(
  table: string,
  callback: (payload: NormalizedPayload<T>) => void,
  filter?: string
): () => void {
  const key = `${table}::${filter || ''}`;
  let entry = channelRegistry.get(key);

  if (!entry) {
    const channelName = `realtime:${key}`;
    const channel = supabase.channel(channelName);
    const listeners = new Set<Listener>();
    const eventConfig: Record<string, unknown> = {
      event: '*',
      schema: 'public',
      table,
    };
    if (filter) eventConfig.filter = filter;

    channel
      .on('postgres_changes' as unknown as 'system', eventConfig as unknown as any, (payload: any) => {
        const normalized: NormalizedPayload = {
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
        };
        // ننشر النسخة الموحدة لكل المستمعين المشتركين في نفس الـchannel
        listeners.forEach((listener) => {
          try {
            listener(normalized);
          } catch (err) {
            console.error(`subscribeSupabase listener error (${key}):`, err);
          }
        });
      })
      .subscribe();

    entry = { channel, listeners };
    channelRegistry.set(key, entry);
  }

  entry.listeners.add(callback as Listener);

  return () => {
    const current = channelRegistry.get(key);
    if (!current) return;
    current.listeners.delete(callback as Listener);
    // مفيش حد باقي مشترك في الـkey ده؟ اقفل الـchannel الفعلي عشان ما يفضلش
    // مفتوح من غير داعي.
    if (current.listeners.size === 0) {
      supabase.removeChannel(current.channel);
      channelRegistry.delete(key);
    }
  };
}

export function subscribeToOrders(callback: (payload: any) => void): () => void {
  return subscribeSupabase('orders', callback);
}
export function subscribeToNotifications(userId: string, callback: (payload: any) => void): () => void {
  return subscribeSupabase('notifications', callback, `user_id=eq.${userId}`);
}
export function subscribeToChatMessages(orderId: string, callback: (payload: any) => void): () => void {
  return subscribeSupabase('chat_messages', callback, `order_id=eq.${orderId}`);
}