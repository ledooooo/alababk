// src/lib/qr-print.ts
import QRCode from 'qrcode';
import { Store } from '../types/domain';

function getStoreUrl(storeId: string): string {
  return `${window.location.origin}/stores/${storeId}`;
}

function openPrintWindow(title: string, bodyHtml: string): void {
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) {
    alert('تعذر فتح نافذة الطباعة — تأكد إن المتصفح مش مانع النوافذ المنبثقة (popups) لهذا الموقع.');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8" />
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
            margin: 0;
            padding: 24px;
            background: #fff;
            color: #0f172a;
          }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${bodyHtml}
        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * يفتح نافذة طباعة لبطاقة QR واحدة لمتجر محدد — تصميم بسيط قابل للطباعة
 * وتعليقه في المتجر فعليًا (اسم المتجر + QR كبير + الرابط كنص احتياطي).
 */
export async function printStoreQRCode(store: Store): Promise<void> {
  const url = getStoreUrl(store.id);
  const qrDataUrl = await QRCode.toDataURL(url, {
    width: 480,
    margin: 2,
    color: { dark: '#0f172a', light: '#ffffff' },
  });

  const bodyHtml = `
    <div style="max-width:420px;margin:0 auto;text-align:center;border:2px solid #0f172a;border-radius:16px;padding:32px 24px;">
      <p style="font-size:12px;color:#64748b;margin:0 0 4px;">امسح الكود للطلب من</p>
      <h1 style="font-size:22px;margin:0 0 20px;color:#0f172a;">${escapeHtml(store.name)}</h1>
      <img src="${qrDataUrl}" width="320" height="320" style="display:block;margin:0 auto;" />
      <p style="font-size:11px;color:#94a3b8;margin-top:20px;word-break:break-all;">${escapeHtml(url)}</p>
      <p style="font-size:14px;font-weight:bold;margin-top:16px;color:#059669;">وياك</p>
    </div>
  `;

  openPrintWindow(`QR - ${store.name}`, bodyHtml);
}

/**
 * يفتح نافذة طباعة تعرض شبكة QR لكل المتاجر الممرَّرة دفعة واحدة —
 * مفيد لطباعة كل ملصقات المتاجر مرة واحدة بدل واحد واحد.
 */
export async function printAllStoreQRCodes(stores: Store[]): Promise<void> {
  const cards = await Promise.all(
    stores.map(async (store) => {
      const url = getStoreUrl(store.id);
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 240,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      });
      return `
        <div style="width:220px;text-align:center;border:1.5px solid #cbd5e1;border-radius:12px;padding:16px;page-break-inside:avoid;">
          <h3 style="font-size:13px;margin:0 0 10px;color:#0f172a;">${escapeHtml(store.name)}</h3>
          <img src="${qrDataUrl}" width="160" height="160" style="display:block;margin:0 auto;" />
        </div>
      `;
    })
  );

  const bodyHtml = `
    <div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;">
      ${cards.join('')}
    </div>
  `;

  openPrintWindow('QR - كل المتاجر', bodyHtml);
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
