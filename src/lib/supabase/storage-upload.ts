// src/lib/supabase/storage-upload.ts
import { supabase } from './client';
import { translateSupabaseError } from './errors';

const BUCKET = 'store-images';
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — نفس الحد المضبوط على الـbucket في fix_04
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export class ImageUploadError extends Error {}

/**
 * يرفع صورة إلى bucket "store-images" على المسار stores/{storeId}/...
 * ويرجع الرابط العام (public URL) الجاهز للاستخدام مباشرة في logo_url /
 * image_url / cover_url.
 *
 * المسار لازم يبدأ بـ stores/{storeId}/ بالظبط لأن سياسات RLS على
 * storage.objects (انظر fix_04_storage_bucket.sql) بتتحقق من ownership
 * المتجر من الجزء التاني في المسار.
 */
export async function uploadStoreImage(
  file: File,
  storeId: string,
  folder: 'logo' | 'banner' | 'products' = 'products'
): Promise<string> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new ImageUploadError('نوع الملف غير مدعوم. الأنواع المسموحة: PNG, JPEG, WEBP, GIF');
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new ImageUploadError('حجم الصورة أكبر من الحد المسموح (5 ميجابايت)');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const randomId = crypto.randomUUID();
  const path = `stores/${storeId}/${folder}/${randomId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });

  if (uploadError) {
    throw new ImageUploadError(translateSupabaseError(uploadError).message);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * يحذف صورة سابقة من الـbucket بالرابط العام الكامل بتاعها (اختياري —
 * لمنع تراكم ملفات يتيمة عند استبدال صورة قديمة بجديدة).
 */
export async function deleteStoreImageByUrl(publicUrl: string): Promise<void> {
  try {
    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return; // مش رابط من الـbucket ده (مثلاً رابط خارجي يدوي قديم)
    const path = decodeURIComponent(publicUrl.slice(idx + marker.length));
    await supabase.storage.from(BUCKET).remove([path]);
  } catch (err) {
    // حذف الصورة القديمة ليس حرجًا — لو فشل، الصورة الجديدة اترفعت بالفعل بنجاح
    console.warn('deleteStoreImageByUrl notice:', err);
  }
}
