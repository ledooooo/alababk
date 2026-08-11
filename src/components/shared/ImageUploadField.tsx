import React, { useRef, useState } from 'react';
import { Upload, Loader2, ImageOff } from 'lucide-react';
import { uploadStoreImage, ImageUploadError } from '../../lib/supabase/storage-upload';
import { useToast } from './Toast';

interface ImageUploadFieldProps {
  label: string;
  value: string;
  storeId: string;
  folder?: 'logo' | 'banner' | 'products';
  onChange: (url: string) => void;
  /** أبعاد المعاينة (Tailwind classes) — افتراضيًا مربع صغير */
  previewClassName?: string;
}

/**
 * حقل رفع صورة حقيقي إلى Supabase Storage (bucket: store-images)، مع
 * إبقاء إمكانية كتابة رابط يدوي كخيار احتياطي (للصور المستضافة خارجيًا).
 */
export function ImageUploadField({
  label,
  value,
  storeId,
  folder = 'products',
  onChange,
  previewClassName = 'w-20 h-20',
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [imgError, setImgError] = useState(false);
  const { showToast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // يسمح باختيار نفس الملف تاني لو حبّ يرفعه تاني

    if (!storeId) {
      showToast({ type: 'error', title: 'خطأ', message: 'يجب حفظ المتجر أولًا قبل رفع الصور' });
      return;
    }

    setUploading(true);
    try {
      const url = await uploadStoreImage(file, storeId, folder);
      onChange(url);
      setImgError(false);
      showToast({ type: 'success', title: 'تم الرفع', message: 'تم رفع الصورة بنجاح' });
    } catch (err) {
      const message = err instanceof ImageUploadError ? err.message : 'تعذر رفع الصورة، حاول مرة أخرى';
      showToast({ type: 'error', title: 'فشل الرفع', message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>
      <div className="flex items-center gap-3">
        <div className={`${previewClassName} shrink-0 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden`}>
          {value && !imgError ? (
            <img src={value} alt={label} className="w-full h-full object-cover" onError={() => setImgError(true)} />
          ) : (
            <ImageOff className="w-5 h-5 text-slate-300" />
          )}
        </div>
        <div className="flex-1 space-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span>{uploading ? 'جاري الرفع...' : 'رفع صورة من جهازك'}</span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFileChange}
            className="hidden"
          />
          <input
            type="text"
            placeholder="أو الصق رابط صورة مباشرة (اختياري)"
            value={value || ''}
            onChange={(e) => {
              setImgError(false);
              onChange(e.target.value);
            }}
            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] focus:ring-2 focus:ring-emerald-500 focus:outline-none dir-ltr text-left"
          />
        </div>
      </div>
    </div>
  );
}
