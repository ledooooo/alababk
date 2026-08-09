// src/lib/supabase/client.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/database.types';

// قراءة المتغيرات البيئية
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// متغير لتخزين العميل بعد التهيئة الناجحة
let _supabase: SupabaseClient<Database> | null = null;

/**
 * دالة للحصول على عميل Supabase، مع تحقق من وجود المتغيرات
 * في حال عدم وجودها، يتم إرجاع خطأ يمكن معالجته في الواجهة
 */
function getSupabaseClient(): SupabaseClient<Database> {
  if (!_supabase) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('SETUP_REQUIRED');
    }
    _supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

/**
 * وكيل (Proxy) للوصول إلى عميل Supabase بشكل ديناميكي
 * عند محاولة استخدام أي خاصية، يتم التحقق من التهيئة
 * وإذا فشلت، يتم إرجاع دالة ترمي خطأ قابل للعرض في الواجهة
 */
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_, prop) {
    try {
      const client = getSupabaseClient();
      const value = Reflect.get(client, prop);
      // إذا كانت الخاصية دالة، نعيدها مع ربط السياق
      if (typeof value === 'function') {
        return value.bind(client);
      }
      return value;
    } catch (error) {
      // في حالة عدم وجود متغيرات البيئة، نعيد دالة وهمية ترمي خطأ
      if (error instanceof Error && error.message === 'SETUP_REQUIRED') {
        console.error(
          '⚠️ متغيرات Supabase غير موجودة. يرجى تعيين VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY في ملف .env'
        );
        // نعيد دالة ترمي خطأ بدلاً من undefined لتجنب أخطاء غير متوقعة
        return (...args: any[]) => {
          throw new Error(
            'Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
          );
        };
      }
      throw error;
    }
  },
});

/**
 * دالة مساعدة للتحقق من جاهزية الاتصال، يمكن استخدامها في شاشة الإعداد
 */
export async function checkSupabaseConnection(): Promise<{ connected: boolean; message: string }> {
  try {
    // محاولة إجراء استعلام بسيط (مثلاً قراءة عدد الصفوف في جدول categories)
    const { error } = await supabase.from('categories').select('count', { count: 'exact', head: true });
    if (error) {
      return { connected: false, message: `خطأ في الاتصال بقاعدة البيانات: ${error.message}` };
    }
    return { connected: true, message: 'الاتصال بالخادم وقاعدة بيانات Supabase يعمل بنجاح' };
  } catch (err) {
    // إذا كان الخطأ بسبب عدم التهيئة، نعطي رسالة مخصصة
    if (err instanceof Error && err.message.includes('Supabase is not configured')) {
      return {
        connected: false,
        message: 'لم يتم تهيئة الاتصال بـ Supabase. يرجى إضافة متغيرات البيئة VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY.',
      };
    }
    return { connected: false, message: `فشل الاتصال الشبكي: ${String(err)}` };
  }
}

/**
 * دالة للتحقق مما إذا كانت متغيرات البيئة موجودة أم لا
 */
export function isSupabaseConfigured(): boolean {
  return !!supabaseUrl && !!supabaseAnonKey;
}

/**
 * دالة للحصول على عنوان URL الخاص بـ Supabase (للاستخدام في عمليات إعادة التوجيه)
 */
export function getSupabaseUrl(): string {
  if (!supabaseUrl) {
    throw new Error('Supabase URL is not configured');
  }
  return supabaseUrl;
}

/**
 * دالة للحصول على المفتاح العام (للحالات النادرة التي تحتاج إليه في الواجهة)
 */
export function getSupabaseAnonKey(): string {
  if (!supabaseAnonKey) {
    throw new Error('Supabase Anon Key is not configured');
  }
  return supabaseAnonKey;
}