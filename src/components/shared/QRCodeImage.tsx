import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Loader2 } from 'lucide-react';

interface QRCodeImageProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * يولّد صورة QR Code فعلية (data URL) محليًا في المتصفح — بدون أي خدمة
 * خارجية، فمناسبة للطباعة حتى لو النت بطيء أو مقطوع وقت الطباعة الفعلية.
 */
export function QRCodeImage({ value, size = 200, className = '' }: QRCodeImageProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDataUrl(null);
    setError(false);

    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (error) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center bg-rose-50 border border-rose-200 rounded-lg text-[10px] text-rose-600 text-center p-2 ${className}`}
      >
        تعذر إنشاء QR
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg ${className}`}
      >
        <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
      </div>
    );
  }

  return <img src={dataUrl} alt="QR Code" width={size} height={size} className={className} />;
}
