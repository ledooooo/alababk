// src/lib/supabase/client.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types/database.types';

let _supabase: SupabaseClient<Database> | null = null;
let _configError: string | null = null;

function getSupabaseClient(): SupabaseClient<Database> {
  if (_supabase) return _supabase;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    const msg =
      '⚠️ متغيرات البيئة VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY غير محددة. '
      + 'يرجى إنشاء ملف .env في جذر المشروع ونسخ قيم Supabase الصحيحة من لوحة التحكم.';
    _configError = msg;
    console.error(msg);
    throw new Error('SUPABASE_CONFIG_MISSING');
  }

  _supabase = createClient<Database>(url, key);
  return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop: string | symbol) {
    if (_configError) {
      return (..._args: any[]) => {
        throw new Error(
          '⚠️ لم يتم تهيئة الاتصال بقاعدة البيانات. يرجى التأكد من إعداد ملف .env بالمتغيرات الصحيحة.'
        );
      };
    }
    try {
      const client = getSupabaseClient();
      const value = Reflect.get(client, prop);
      if (typeof value === 'function') {
        return value.bind(client);
      }
      return value;
    } catch (err) {
      if (err instanceof Error && err.message === 'SUPABASE_CONFIG_MISSING') {
        return (..._args: any[]) => {
          throw new Error(
            '⚠️ لم يتم تهيئة الاتصال بقاعدة البيانات. يرجى التأكد من إعداد ملف .env بالمتغيرات الصحيحة.'
          );
        };
      }
      throw err;
    }
  },
});

// دوال مساعدة للبيئة (تستخدم في AdminSupabaseSync)
export function isSupabaseConfigured(): boolean {
  try {
    getSupabaseClient();
    return true;
  } catch {
    return false;
  }
}

export function getSupabaseUrl(): string {
  return import.meta.env.VITE_SUPABASE_URL || '';
}