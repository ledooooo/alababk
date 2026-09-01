import React, { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { PhoneCall, Mail, MapPin, Send, MessageSquare, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '../../shared/Toast';

interface ContactViewProps {
  onNavigate: (tab: string, param?: string) => void;
}

export default function ContactView({ onNavigate }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('استفسار عام');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSent, setIsSent] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!name.trim() || !message.trim()) {
      const msg = 'يرجى ملء الاسم والرسالة';
      setSubmitError(msg);
      showToast({ type: 'error', title: 'بيانات ناقصة', message: msg });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('contact_messages').insert({
        name: name.trim(),
        phone: phone.trim() || null,
        subject: subject || null,
        message: message.trim(),
      });

      if (error) throw error;
      setIsSent(true);
      showToast({ type: 'success', title: 'تم الإرسال', message: 'تم إرسال رسالتك بنجاح' });
    } catch (err: any) {
      const msg = err.message || 'فشل إرسال الرسالة، يرجى المحاولة لاحقاً';
      setSubmitError(msg);
      showToast({ type: 'error', title: 'فشل الإرسال', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 dir-rtl pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-3xl p-8 text-center space-y-2 shadow-md">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-amber-300 text-xs font-bold border border-white/20">
          <PhoneCall className="w-4 h-4" />
          <span>خدمة العملاء والدعم الفني</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">التواصل والدعم الفني</h1>
        <p className="text-xs text-purple-200">نحن هنا لمساعدتك والإجابة عن كافة استفساراتك على مدار الساعة</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Info Cards */}
        <div className="space-y-4">
          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <PhoneCall className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-xs">الهاتف المباشر</h3>
            <p className="text-xs text-slate-600 font-mono">01000000000 / 0223456789</p>
          </div>

          <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-emerald-950 text-xs">الدعم الفوري عبر واتساب</h3>
            <p className="text-[11px] text-emerald-800">تواصل مباشر وسريع مع ممثل خدمة العملاء</p>
            <a
              href="https://wa.me/201012136524?text=مرحباً%20منصة%20وياك%20لدي%20استفسار"
              target="_blank"
              rel="noreferrer"
              className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs mt-1"
            >
              مراسلة عبر WhatsApp ←
            </a>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Mail className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-xs">البريد الإلكتروني</h3>
            <p className="text-xs text-slate-600 font-mono">support@wayak.app</p>
                      </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-xs">المقر الرئيسي</h3>
            <p className="text-xs text-slate-600">شارع التسعين الجنوبي - التجمع الخامس - القاهرة، مصر</p>
          </div>
        </div>

        {/* Message Form */}
        <div className="md:col-span-2 bg-white rounded-3xl p-8 border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-xl font-black text-slate-900">أرسل لنا رسالة مباشرة</h2>

          {isSent ? (
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="font-black text-emerald-950 text-base">تم إرسال رسالتك بنجاح!</h3>
              <p className="text-xs text-emerald-800">
                شكراً لتواصلك معنا. سيعاود فريق الدعم الفني الاتصال بك في أقرب وقت.
              </p>
              <button
                onClick={() => { setIsSent(false); setMessage(''); setName(''); }}
                className="mt-2 text-xs font-bold text-emerald-700 underline"
              >
                إرسال رسالة أخرى
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {submitError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكريم *</label>
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    placeholder="اسمك"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف</label>
                  <input
                    type="tel"
                    disabled={isSubmitting}
                    placeholder="010XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">موضوع الرسالة</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-500 outline-none disabled:opacity-50"
                >
                  <option value="استفسار عام">استفسار عام</option>
                  <option value="شكوى طلب">شكوى بشأن طلب معين</option>
                  <option value="انضمام متجر">استفسار عن انضمام متجر</option>
                  <option value="انضمام كابتن">استفسار عن عمل الكباتن</option>
                  <option value="اقتراح">اقتراح لتطوير المنصة</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تفاصيل الرسالة *</label>
                <textarea
                  rows={4}
                  required
                  disabled={isSubmitting}
                  placeholder="اكتب تفاصيل استفسارك أو مشكلتك بالتفصيل هنا..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none resize-none disabled:opacity-50"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isSubmitting ? 'جاري الإرسال...' : 'إرسال الرسالة للدعم'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};