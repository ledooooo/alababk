// src/lib/supabase/notifications.ts
import { supabase } from './client';
import { ensureUUID, translateSupabaseError } from './helpers';
import { NotificationItem } from '../../types/domain';

export function mapNotificationRow(n: any): NotificationItem {
  const dataObj = typeof n.data === 'object' && n.data !== null ? n.data : {};
  const linkUrl = dataObj.link || dataObj.link_url || dataObj.url || undefined;
  const bodyText = n.body || n.message || '';
  return {
    id: n.id,
    user_id: n.user_id,
    title: n.title || 'تنبيه جديد',
    body: bodyText,
    message: bodyText,
    type: n.type || 'system',
    data: dataObj,
    read_at: n.read_at || null,
    is_read: n.read_at !== null && n.read_at !== undefined,
    created_at: n.created_at || new Date().toISOString(),
    link_url: linkUrl,
  };
}

export async function fetchSupabaseNotifications(userId: string): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(translateSupabaseError(error).message);
  return (data || []).map(mapNotificationRow);
}

export async function listAllSupabaseNotifications(): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(translateSupabaseError(error).message);
  return (data || []).map(mapNotificationRow);
}

export async function createSupabaseNotification(params: {
  user_id: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, any>;
}): Promise<void> {
  const { error } = await supabase.rpc('create_notification', {
    p_user_id: ensureUUID(params.user_id),
    p_title: params.title,
    p_body: params.body,
    p_type: params.type,
    p_data: params.data || {},
  });
  if (error) throw new Error(translateSupabaseError(error).message);
}

export interface NotificationBroadcast {
  id: string;
  title: string;
  body: string | null;
  type: string;
  recipients_count: number;
  sent_by: string | null;
  created_at: string;
}

/**
 * يبث إشعارًا حقيقيًا لكل المستخدمين المسجَّلين في profiles دفعة واحدة
 * عبر broadcast_notification_to_all (مُعرَّفة في fix_03_broadcast_notifications.sql).
 * يرجع عدد المستلمين الفعليين.
 */
export async function sendBroadcastNotification(params: {
  title: string;
  body: string;
  type: string;
}): Promise<number> {
  const { data, error } = await supabase.rpc('broadcast_notification_to_all', {
    p_title: params.title,
    p_body: params.body,
    p_type: params.type,
  });
  if (error) throw new Error(translateSupabaseError(error).message);
  return (data as number) ?? 0;
}

export async function fetchNotificationBroadcasts(): Promise<NotificationBroadcast[]> {
  const { data, error } = await supabase
    .from('notification_broadcasts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(translateSupabaseError(error).message);
  return (data || []) as NotificationBroadcast[];
}

export async function markSupabaseNotificationRead(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', ensureUUID(id))
    .select();
  if (error) throw new Error(translateSupabaseError(error).message);
  if (!data || data.length === 0) throw new Error('لم يتم تحديث الإشعار (غير موجود)');
}

export async function markAllSupabaseNotificationsRead(userId?: string): Promise<void> {
  let query = supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
  if (userId && userId !== 'all') query = query.eq('user_id', ensureUUID(userId));
  const { data, error } = await query.select();
  if (error) throw new Error(translateSupabaseError(error).message);
  if (!data || data.length === 0) throw new Error('لا توجد إشعارات غير مقروءة');
}

export async function deleteSupabaseNotification(id: string): Promise<void> {
  const { data, error } = await supabase.from('notifications').delete().eq('id', ensureUUID(id)).select();
  if (error) throw new Error(translateSupabaseError(error).message);
  if (!data || data.length === 0) throw new Error('لم يتم حذف الإشعار');
}

export async function clearSupabaseNotifications(userId?: string): Promise<void> {
  let query = supabase.from('notifications').delete();
  if (userId && userId !== 'all') query = query.eq('user_id', ensureUUID(userId));
  else query = query.neq('id', '00000000-0000-0000-0000-000000000000');
  const { data, error } = await query.select();
  if (error) throw new Error(translateSupabaseError(error).message);
  if (!data || data.length === 0) throw new Error('لا توجد إشعارات لمسحها');
}