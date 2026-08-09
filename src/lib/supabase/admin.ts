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