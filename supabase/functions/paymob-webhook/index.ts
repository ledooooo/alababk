// supabase/functions/paymob-webhook/index.ts
//
// بتتنادى من سيرفرات Paymob مباشرة (مش من الفرونت) بعد ما العميل يخلّص
// (أو يفشل) الدفع، للتأكيد النهائي من حالة المعاملة. بنتحقق من توقيع
// HMAC عشان نتأكد إن النداء فعلاً جاي من Paymob مش من أي طرف تالت.
//
// الإعداد على لوحة Paymob:
//   Developers → Webhooks → Transaction callback:
//   https://<project-ref>.supabase.co/functions/v1/paymob-webhook
//
// النشر:
//   supabase functions deploy paymob-webhook --no-verify-jwt
//   (لازم --no-verify-jwt لأن المستدعي سيرفر Paymob، مش مستخدم عنده JWT)
//
// متغيرات البيئة المطلوبة (تُضبط عبر supabase secrets set):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (تلقائية من Supabase)
//   PAYMOB_HMAC_SECRET — من: Paymob Dashboard → Developers → Webhooks → HMAC

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ترتيب الحقول ده ثابت ومحدد من توثيق Paymob الرسمي لحساب الـHMAC —
// أي تغيير في الترتيب هيخلي التحقق يفشل دايمًا.
const HMAC_FIELD_ORDER = [
  'amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction',
  'id', 'integration_id', 'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded',
  'is_standalone_payment', 'is_voided', 'order.id', 'owner', 'pending',
  'source_data.pan', 'source_data.sub_type', 'source_data.type', 'success',
];

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    const hmacSecret = Deno.env.get('PAYMOB_HMAC_SECRET');
    if (!hmacSecret) {
      console.error('PAYMOB_HMAC_SECRET غير مضبوط');
      return json({ error: 'الخادم غير مهيّأ' }, 500);
    }

    const url = new URL(req.url);
    const receivedHmac = url.searchParams.get('hmac');
    if (!receivedHmac) {
      return json({ error: 'مفقود hmac' }, 400);
    }

    const body = await req.json();
    const txn = body?.obj;
    if (!txn) {
      return json({ error: 'صيغة غير متوقعة' }, 400);
    }

    const computedHmac = await computeHmac(txn, hmacSecret);
    if (computedHmac.toLowerCase() !== receivedHmac.toLowerCase()) {
      console.error('Paymob webhook: توقيع HMAC غير مطابق — تم رفض الطلب');
      return json({ error: 'توقيع غير صالح' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const gatewayOrderId = String(txn.order?.id ?? '');
    const { data: paymentTxn } = await adminClient
      .from('payment_transactions')
      .select('order_id')
      .eq('gateway_order_id', gatewayOrderId)
      .eq('status', 'pending')
      .maybeSingle();

    if (!paymentTxn) {
      console.warn('paymob-webhook: مفيش معاملة pending مطابقة لـ gateway_order_id', gatewayOrderId);
      return json({ received: true }); // نرجّع 200 برضه عشان Paymob ما تعيدش المحاولة
    }

    const success = txn.success === true;

    const { error } = await adminClient.rpc('confirm_order_payment', {
      p_order_id: paymentTxn.order_id,
      p_gateway_transaction_id: String(txn.id ?? ''),
      p_success: success,
      p_raw_response: txn,
    });

    if (error) {
      console.error('confirm_order_payment error:', error);
      return json({ error: 'تعذر تحديث حالة الدفع' }, 500);
    }

    return json({ received: true, success });
  } catch (err) {
    console.error('paymob-webhook unexpected error:', err);
    return json({ error: 'حدث خطأ غير متوقع' }, 500);
  }
});

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

async function computeHmac(txn: Record<string, any>, secret: string): Promise<string> {
  const concatenated = HMAC_FIELD_ORDER.map((field) => {
    const value = getNestedValue(txn, field);
    return value === null || value === undefined ? '' : String(value);
  }).join('');

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(concatenated);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
