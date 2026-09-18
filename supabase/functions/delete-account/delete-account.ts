// supabase/functions/delete-account/index.ts
//
// بتتنادى من العميل نفسه (زرار "حذف الحساب" في صفحة الإعدادات) لحذف
// حسابه. بتعمل حاجتين لازم تحصلوا مع بعض:
//   1) تنادي delete_my_account() (RPC) بهوية العميل نفسه — بتخفي
//      هويته على profiles وتمسح بياناته الشخصية البحتة.
//   2) تحظره من تسجيل الدخول تاني عبر Auth Admin API (محتاج
//      service_role — مش متاح من نداء RPC عادي).
//
// النشر:
//   supabase functions deploy delete-account
//   (JWT verification شغالة عادي — المستدعي هو العميل نفسه)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'يجب تسجيل الدخول' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // عميل بهوية المستخدم نفسه — لازم لتنفيذ delete_my_account() صح
    // (الدالة بتقرأ auth.uid() من سياق الاستدعاء)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return json({ error: 'جلسة الدخول غير صالحة' }, 401);
    }
    const userId = userData.user.id;

    // الخطوة 1: تنظيف البيانات (RPC بهوية المستخدم نفسه)
    const { error: rpcError } = await userClient.rpc('delete_my_account');
    if (rpcError) {
      console.error('delete_my_account RPC error:', rpcError);
      return json({ error: 'تعذر حذف بيانات الحساب' }, 500);
    }

    // الخطوة 2: حظر تسجيل الدخول تاني — محتاج service_role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { error: banError } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: '876000h', // ~100 سنة — حظر دائم فعليًا
    });

    if (banError) {
      console.error('ban user error:', banError);
      // بيانات الحساب اتنضّفت بالفعل، بس الحظر فشل — نبلّغ بوضوح بدل
      // ما نرجّع "تم" وهو مش متأكد بالكامل
      return json({ error: 'تم حذف بياناتك، لكن حصلت مشكلة أثناء إلغاء تفعيل تسجيل الدخول. تواصل مع الدعم للتأكيد.' }, 500);
    }

    return json({ success: true });
  } catch (err) {
    console.error('delete-account unexpected error:', err);
    return json({ error: 'حدث خطأ غير متوقع' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
