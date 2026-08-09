// src/lib/supabase/admin.ts
import { supabase } from './client';

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