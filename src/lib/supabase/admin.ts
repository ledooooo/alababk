// src/lib/supabase/admin.ts
import { supabase } from './client';
import { translateSupabaseError } from './errors';

/**
 * Check connectivity to Supabase instance
 */
export async function checkSupabaseConnection(): Promise<{ connected: boolean; message: string }> {
  try {
    const { data, error } = await supabase.from('categories').select('count', { count: 'exact', head: true });
    if (error) {
      return { connected: false, message: `خطأ في الاتصال بقاعدة البيانات: ${error.message}` };
    }
    return { connected: true, message: 'الاتصال بالخادم وقاعدة بيانات Supabase يعمل بنجاح' };
  } catch (err) {
    return { connected: false, message: `فشل الاتصال الشبكي: ${String(err)}` };
  }
}

/**
 * Seed initial data directly into Supabase tables if empty.
 * ⚠️ This function is NOT available in the client bundle.
 * Use the separate Node script: scripts/seed-supabase.js
 */
export async function seedSupabaseDatabase() {
  throw new Error('❌ seedSupabaseDatabase is not available in the client bundle. Use the server script instead.');
}

export interface ActivityLogEntry {
  id: string;
  actor_id: string | null;
  actor_name?: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

/**
 * سجل النشاط الحقيقي — تُسجَّل الأحداث تلقائيًا عبر triggers على stores
 * وprofiles (راجع fix_07_activity_log_triggers.sql) + process_payout_secure.
 */
export async function fetchActivityLog(limit: number = 50): Promise<ActivityLogEntry[]> {
  const { data, error } = await supabase
    .from('activity_log')
    .select('id, actor_id, action, entity_type, entity_id, metadata, created_at, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(translateSupabaseError(error).message);
  return (data || []).map((row: any) => ({
    id: row.id,
    actor_id: row.actor_id,
    actor_name: row.profiles?.full_name || undefined,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    metadata: row.metadata || {},
    created_at: row.created_at,
  }));
}