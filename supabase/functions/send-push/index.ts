// supabase/functions/send-push/index.ts
//
// يستدعيها الـtrigger notifications_push_trigger (انظر
// fix_05_push_notifications.sql) بعد كل INSERT في notifications، وترسل
// إشعار Web Push حقيقي لكل أجهزة المستخدم المسجَّلة في push_subscriptions.
//
// النشر:
//   supabase functions deploy send-push --no-verify-jwt
//   (لازم --no-verify-jwt لأن المستدعي هو trigger داخل قاعدة البيانات
//   عبر pg_net، مش مستخدم مسجّل دخوله بتوكن JWT)
//
// الحماية: بدل التحقق من JWT، بنتحقق من رأس x-push-secret يطابق
// PUSH_TRIGGER_SECRET (نفس القيمة المخزّنة في app_secrets في القاعدة).
//
// متغيرات البيئة المطلوبة (تُضبط عبر supabase secrets set):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (تلقائية من Supabase)
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (يدوية — نفس مفاتيح VAPID)
//   PUSH_TRIGGER_SECRET (يدوية — سرّ مشترك مع app_secrets.push_trigger_secret)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    const sharedSecret = Deno.env.get('PUSH_TRIGGER_SECRET');
    const incomingSecret = req.headers.get('x-push-secret');
    if (!sharedSecret || incomingSecret !== sharedSecret) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { user_id, title, body } = await req.json().catch(() => ({}));
    if (!user_id || !title) {
      return json({ error: 'user_id و title مطلوبان' }, 400);
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:support@wayyak.app';
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return json({ error: 'Push غير مُهيّأ على الخادم' }, 500);
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: subscriptions, error } = await adminClient
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth_key')
      .eq('user_id', user_id);

    if (error) {
      console.error('fetch subscriptions error:', error);
      return json({ error: 'تعذر جلب اشتراكات الإشعارات' }, 500);
    }
    if (!subscriptions || subscriptions.length === 0) {
      return json({ sent: 0, message: 'لا توجد أجهزة مشتركة لهذا المستخدم' });
    }

    const payload = JSON.stringify({ title, body: body || '', url: '/notifications' });

    let sent = 0;
    const staleIds: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth_key },
            },
            payload
          );
          sent++;
        } catch (err: any) {
          // 404/410 تعني إن الاشتراك ده منتهي أو المستخدم شال إذن الإشعارات
          const statusCode = err?.statusCode || err?.status;
          if (statusCode === 404 || statusCode === 410) {
            staleIds.push(sub.id);
          } else {
            console.error('push send error for subscription', sub.id, err);
          }
        }
      })
    );

    if (staleIds.length > 0) {
      await adminClient.from('push_subscriptions').delete().in('id', staleIds);
    }

    return json({ sent, removed_stale: staleIds.length });
  } catch (err) {
    console.error('send-push unexpected error:', err);
    return json({ error: 'حدث خطأ غير متوقع' }, 500);
  }
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
