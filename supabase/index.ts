// supabase/functions/phone-login/index.ts
//
// حل مشكلة P1 #8: تسجيل الدخول برقم الهاتف مستحيل من الواجهة الأمامية لأن
// دالة verify_phone_password_internal مقفولة عمدًا (SECURITY DEFINER بدون
// GRANT لـ anon/authenticated) ولا يجوز استدعاؤها إلا من كود خادم موثوق
// بمفتاح service_role. هذه الـEdge Function هي ذلك الخادم الموثوق.
//
// النشر:
//   supabase functions deploy phone-login --no-verify-jwt
//   (لازم --no-verify-jwt لأن الطلب يأتي من مستخدم غير مسجَّل دخوله بعد)
//
// ملاحظة أمنية: هذه الدالة لا تُعيد كلمة المرور ولا تُنشئ الجلسة بنفسها —
// تُعيد فقط البريد الإلكتروني المرتبط بالحساب بعد التحقق من صحة رقم
// الهاتف/كلمة المرور خادميًا، ثم يكمل العميل تسجيل الدخول الفعلي عبر
// supabase.auth.signInWithPassword({ email, password }) بنفس كلمة المرور
// التي أدخلها المستخدم للتو (لا تُخزَّن ولا تُعاد من هنا إطلاقًا).
//
// متغيرات البيئة المطلوبة (تُضبط تلقائيًا من Supabase، لا حاجة لإضافتها يدويًا):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    const { phone, password } = await req.json().catch(() => ({}));
    if (!phone || !password) {
      return json({ error: 'رقم الهاتف وكلمة المرور مطلوبان' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1) تحقق من الهاتف/كلمة المرور عبر الدالة الداخلية المقفولة
    const { data: userId, error: verifyError } = await adminClient.rpc(
      'verify_phone_password_internal',
      { p_phone: phone, p_password: password }
    );

    if (verifyError) {
      console.error('verify_phone_password_internal error:', verifyError);
      return json({ error: 'تعذر التحقق من بيانات الدخول' }, 500);
    }
    if (!userId) {
      // لا نميّز بين "رقم غير مسجَّل" و"كلمة مرور خاطئة" لأسباب أمنية
      return json({ error: 'رقم الهاتف أو كلمة المرور غير صحيحة' }, 401);
    }

    // 2) اجلب بريد المستخدم خادميًا فقط (service role) — عمود profiles.email
    // محمي بـRLS (auth.uid() = id) ولا يمكن قراءته من طرف العميل قبل إنشاء
    // الجلسة، لذلك نقرأه هنا بصلاحية الخادم فقط ونُعيده للعميل، الذي
    // يكمل تسجيل الدخول الفعلي عبر supabase.auth.signInWithPassword()
    // بنفس كلمة المرور التي أدخلها (وهي نفسها المُتحقَّق منها للتو).
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(
      userId as string
    );
    if (userError || !userData?.user?.email) {
      console.error('getUserById error:', userError);
      return json({ error: 'تعذر العثور على البريد الإلكتروني المرتبط بالحساب' }, 500);
    }

    return json({ email: userData.user.email });
  } catch (err) {
    console.error('phone-login unexpected error:', err);
    return json({ error: 'حدث خطأ غير متوقع' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
