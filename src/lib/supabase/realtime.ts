// src/lib/supabase/realtime.ts
import { supabase } from './client';

export function subscribeSupabase<T>(
  table: string,
  callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new: T; old: T }) => void,
  filter?: string
): () => void {
  const channelName = `realtime:${table}:${Math.random().toString(36).slice(2, 9)}`;
  const channel = supabase.channel(channelName);
  const eventConfig: Record<string, unknown> = {
    event: '*',
    schema: 'public',
    table,
  };
  if (filter) eventConfig.filter = filter;

  channel
    .on('postgres_changes' as unknown as 'system', eventConfig as unknown as any, (payload: any) => {
      callback({ eventType: payload.eventType, new: payload.new as T, old: payload.old as T });
    })
    .subscribe();

  return () => supabase.removeChannel(channel);
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