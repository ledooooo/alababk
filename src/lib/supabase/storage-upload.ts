// src/lib/supabase/storage-upload.ts
import { supabase } from './client';
import { translateSupabaseError } from './errors';

const BUCKET = 'store-images';
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB — نفس الحد المضبوط على الـbucket في fix_04
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

// أبعاد وجودة الضغط قبل الرفع. الصورة مش هتتعرض أبدًا أكبر من كذا بكسل
// في أي مكان بالتطبيق (كروت منتجات/متاجر)، فرفعها بحجم كاميرا موبايل
// خام (ممكن يكون 4000×3000 وبضعة ميجابايت) إهدار إيجرس متكرر —
// كل مشاهدة لاحقة للصورة (من أي عميل، في أي قائمة) بتنزّل نفس الحجم
// الضخم، مش بس عملية الرفع نفسها مرة واحدة.
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.82;

export class ImageUploadError extends Error {}

/**
 * يضغط الصورة (تصغير الأبعاد + ضغط الجودة) قبل الرفع باستخدام Canvas API
 * المتاحة أصلًا في كل متصفح، بدون أي مكتبة خارجية. لو الضغط فشل لأي سبب
 * (نوع ملف غير مدعوم من المتصفح، مثلًا)، بيرجع الملف الأصلي كما هو بدل
 * ما يوقف عملية الرفع بالكامل.
 */
async function compressImage(file: File): Promise<File> {
  // GIF مالهاش داعي نضغطها (ممكن تكون متحركة، والـCanvas هيسطّح أول فريم بس)
  if (file.type === 'image/gif') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));

    // الصورة أصلًا أصغر من الحد الأقصى ومفيش داعي لإعادة الترميز
    if (scale >= 1 && file.size < 500 * 1024) return file;

    const targetWidth = Math.round(bitmap.width * scale);
    const targetHeight = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY)
    );
    if (!blob) return file;

    // لو الضغط لأي سبب زوّد الحجم بدل ما يقلله (نادر بس ممكن)، نستخدم الأصلي
    if (blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], newName, { type: 'image/jpeg' });
  } catch (err) {
    console.warn('compressImage notice (falling back to original file):', err);
    return file;
  }
}

/**
 * يرفع صورة إلى bucket "store-images" على المسار stores/{storeId}/...
 * ويرجع الرابط العام (public URL) الجاهز للاستخدام مباشرة في logo_url /
 * image_url / cover_url. يضغط الصورة أولًا (انظر compressImage) لتقليل
 * حجم الملف الفعلي المخزَّن وبالتالي حجم كل تحميل لاحق له.
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

  const compressedFile = await compressImage(file);

  const ext = compressedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
  const randomId = crypto.randomUUID();
  const path = `stores/${storeId}/${folder}/${randomId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, compressedFile, { cacheControl: '3600', upsert: false, contentType: compressedFile.type });

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