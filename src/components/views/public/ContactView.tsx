import React, { useState } from 'react';
import { PhoneCall, Mail, MapPin, Send, MessageSquare, CheckCircle2, Sparkles } from 'lucide-react';

interface ContactViewProps {
  onNavigate: (tab: string, param?: string) => void;
}

export const ContactView: React.FC<ContactViewProps> = () => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('استفسار عام');
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    setIsSent(true);
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
              href="https://wa.me/201000000000?text=مرحباً%20منصة%20على%20بابك%20لدي%20استفسار"
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
            <p className="text-xs text-slate-600 font-mono">support@jihat-alababak.com</p>
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
                onClick={() => setIsSent(false)}
                className="mt-2 text-xs font-bold text-emerald-700 underline"
              >
                إرسال رسالة أخرى
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكريم *</label>
                  <input
                    type="text"
                    required
                    placeholder="اسمك"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف *</label>
                  <input
                    type="text"
                    required
                    placeholder="010XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">موضوع الرسالة</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-500 outline-none"
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
                  placeholder="اكتب تفاصيل استفسارك أو مشكلتك بالتفصيل هنا..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>إرسال الرسالة للدعم</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
