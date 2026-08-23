// src/lib/notificationSound.ts
//
// تنبيه صوتي خفيف عند وصول إشعار جديد — بدون أي ملف صوت خارجي (لتفادي أي
// مشكلة تحميل/ترخيص/حجم)، باستخدام Web Audio API لتوليد نغمة "دينج" بسيطة
// في المتصفح مباشرة.
//
// ملاحظة مهمة (سياسة المتصفحات): AudioContext ما ينفعش يشتغل قبل أول
// تفاعل حقيقي من المستخدم مع الصفحة (ضغطة/لمسة). unlockNotificationAudio()
// بتتسجّل مرة واحدة على أول ضغطة في أي مكان بالتطبيق عشان تجهّز الصوت
// بدري، فلما إشعار حقيقي يوصل بعد كده الصوت يشتغل فورًا من غير تأخير.

let sharedContext: AudioContext | null = null;
let unlocked = false;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedContext) {
    sharedContext = new AudioCtx();
  }
  return sharedContext;
}

/** استدعِها مرة واحدة عند تحميل التطبيق (تسجّل مستمع لأول تفاعل مستخدم) */
export function unlockNotificationAudio(): void {
  if (unlocked || typeof window === 'undefined') return;
  const unlock = () => {
    const ctx = getContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    unlocked = true;
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

/** يشغّل نغمة تنبيه قصيرة (دينج-دونج من نغمتين) — بيفشل بصمت لو المتصفح رفض */
export function playNotificationSound(): void {
  try {
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const playTone = (freq: number, startTime: number, duration: number) => {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = freq;
      // Envelope بسيط (fade in/out) عشان الصوت يبقى ناعم مش "طقة" مفاجئة
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(880, now, 0.18); // النغمة الأولى (دينج)
    playTone(1318.5, now + 0.14, 0.22); // النغمة الثانية (دونج) — أعلى شوية وأطول
  } catch {
    // أي فشل في تشغيل الصوت (متصفح رافض، سياسة أمان...) ميعطلش أي حاجة تانية
  }
}
