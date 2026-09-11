// supabase/functions/paymob-checkout/index.ts
//
// بتتنادى من الفرونت (بعد ما create_order_secure يرجّع order_id) لإنشاء
// جلسة دفع حقيقية على Paymob (بوابة الدفع الأشهر في مصر) وترجع رابط
// الـiframe الموحّد اللي العميل يكمل الدفع فيه.
//
// النشر:
//   supabase functions deploy paymob-checkout
//   (JWT verification شغالة عادي — المستدعي هو العميل نفسه من الفرونت)
//
// متغيرات البيئة المطلوبة (تُضبط عبر supabase secrets set):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (تلقائية من Supabase)
//   PAYMOB_SECRET_KEY   — من: Paymob Dashboard → Developers → API Keys
//   PAYMOB_PUBLIC_KEY   — نفس الصفحة، للـiframe فقط (مش سرّي)
//   PAYMOB_INTEGRATION_ID — معرّف طريقة الدفع (بطاقة/محفظة) من نفس الصفحة
//
// ⚠️ لازم تسجّل حساب Paymob حقيقي وتجيب المفاتيح دي قبل ما الدفع
// الإلكتروني يشتغل فعليًا — من غيرها الدالة هترجع خطأ واضح بدل ما
// تفشل بصمت.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PAYMOB_BASE_URL = 'https://accept.paymob.com';

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    const secretKey = Deno.env.get('PAYMOB_SECRET_KEY');
    const publicKey = Deno.env.get('PAYMOB_PUBLIC_KEY');
    const integrationId = Deno.env.get('PAYMOB_INTEGRATION_ID');

    if (!secretKey || !publicKey || !integrationId) {
      return json({
        error: 'الدفع الإلكتروني غير مُهيّأ بعد على الخادم — لازم تضاف مفاتيح Paymob (PAYMOB_SECRET_KEY, PAYMOB_PUBLIC_KEY, PAYMOB_INTEGRATION_ID) كـ secrets أولًا.',
      }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'يجب تسجيل الدخول' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // عميل يتحقق من هوية المستخدم من التوكن نفسه (RLS طبيعية)
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return json({ error: 'جلسة الدخول غير صالحة' }, 401);
    }

    const { order_id } = await req.json();
    if (!order_id) {
      return json({ error: 'order_id مطلوب' }, 400);
    }

    // عميل بصلاحية service_role للقراءة/الكتابة بأمان بعد التحقق يدويًا
    // من ملكية الطلب (بدل الاعتماد على RLS هنا)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: order, error: orderError } = await adminClient
      .from('orders')
      .select('id, code, total, customer_id, payment_method, payment_status')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return json({ error: 'الطلب غير موجود' }, 404);
    }
    if (order.customer_id !== userData.user.id) {
      return json({ error: 'هذا الطلب لا يخصك' }, 403);
    }
    if (order.payment_method !== 'online') {
      return json({ error: 'هذا الطلب مسجَّل بطريقة دفع مختلفة' }, 400);
    }
    if (order.payment_status === 'paid') {
      return json({ error: 'تم دفع هذا الطلب بالفعل' }, 400);
    }

    const { data: profile } = await adminClient
      .from('profiles')
      .select('full_name, phone, email')
      .eq('id', userData.user.id)
      .single();

    const amountCents = Math.round(Number(order.total) * 100);

    // Paymob Intention API — نداء واحد بيرجع client_secret نستخدمه في
    // رابط الـiframe الموحّد مباشرة
    const intentionRes = await fetch(`${PAYMOB_BASE_URL}/v1/intention/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${secretKey}`,
      },
      body: JSON.stringify({
        amount: amountCents,
        currency: 'EGP',
        payment_methods: [Number(integrationId)],
        items: [],
        special_reference: order.code,
        billing_data: {
          first_name: (profile?.full_name || 'عميل').split(' ')[0] || 'عميل',
          last_name: (profile?.full_name || 'عميل').split(' ').slice(1).join(' ') || 'وياك',
          phone_number: profile?.phone || '+201000000000',
          email: profile?.email || 'customer@wayak.app',
          country: 'EG',
        },
        extras: { order_id: order.id },
      }),
    });

    const intentionData = await intentionRes.json();

    if (!intentionRes.ok || !intentionData?.client_secret) {
      console.error('Paymob intention error:', intentionData);
      return json({ error: 'تعذر إنشاء جلسة الدفع، حاول مرة أخرى' }, 502);
    }

    // نسجّل محاولة الدفع (pending) قبل ما نرجّع الرابط للعميل، عشان
    // الـwebhook يلاقي صف جاهز يحدّثه بدل ما يعمل insert بنفسه
    await adminClient.from('payment_transactions').insert({
      order_id: order.id,
      gateway: 'paymob',
      gateway_order_id: intentionData.id?.toString() || null,
      amount: order.total,
      status: 'pending',
      raw_response: intentionData,
    });

    const checkoutUrl = `${PAYMOB_BASE_URL}/unifiedcheckout/?publicKey=${publicKey}&clientSecret=${intentionData.client_secret}`;

    return json({ checkout_url: checkoutUrl });
  } catch (err) {
    console.error('paymob-checkout unexpected error:', err);
    return json({ error: 'حدث خطأ غير متوقع أثناء إنشاء جلسة الدفع' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
