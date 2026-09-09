import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  createSupportTicket,
  fetchMyTickets,
  fetchTicketMessages,
  sendTicketMessage,
  SupportTicket,
  SupportTicketMessage,
  TicketCategory,
  TicketStatus,
} from '../../../lib/supabase';
import { formatDateArabic } from '../../../lib/formatters';
import {
  MessageSquare,
  Plus,
  Send,
  Loader2,
  AlertCircle,
  X,
  ChevronLeft,
  Lightbulb,
  Frown,
  Package,
  HelpCircle,
} from 'lucide-react';
import { useToast } from '../../shared/Toast';

const CATEGORY_CONFIG: Record<TicketCategory, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  complaint: { label: 'شكوى', icon: Frown, color: 'bg-rose-100 text-rose-700' },
  suggestion: { label: 'اقتراح', icon: Lightbulb, color: 'bg-amber-100 text-amber-700' },
  order_issue: { label: 'مشكلة بطلب', icon: Package, color: 'bg-blue-100 text-blue-700' },
  general: { label: 'استفسار عام', icon: HelpCircle, color: 'bg-slate-100 text-slate-700' },
};

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string }> = {
  open: { label: 'بانتظار الرد', color: 'bg-amber-100 text-amber-800' },
  in_progress: { label: 'جاري المتابعة', color: 'bg-blue-100 text-blue-800' },
  resolved: { label: 'تم الحل', color: 'bg-emerald-100 text-emerald-800' },
};

export default function CustomerSupportView() {
  const [searchParams] = useSearchParams();
  const preselectedOrderId = searchParams.get('order') || undefined;

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(!!preselectedOrderId);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  const { showToast } = useToast();

  const loadTickets = () => {
    setLoading(true);
    fetchMyTickets()
      .then(setTickets)
      .catch((err) => showToast({ type: 'error', title: 'فشل التحميل', message: err.message || 'تعذر تحميل تذاكرك' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTickets();
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6 dir-rtl pb-16">
      <div className="flex items-center justify-between bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-purple-600" />
            <span>الدعم والشكاوى</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">راسل فريق الدعم بشكوى، اقتراح، أو استفسار — وتابع الردود هنا</p>
        </div>
        {!showNewForm && (
          <button
            onClick={() => setShowNewForm(true)}
            className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>تذكرة جديدة</span>
          </button>
        )}
      </div>

      {showNewForm && (
        <NewTicketForm
          preselectedOrderId={preselectedOrderId}
          onCancel={() => setShowNewForm(false)}
          onCreated={(ticket) => {
            setShowNewForm(false);
            setTickets((prev) => [ticket, ...prev]);
            setSelectedTicket(ticket);
          }}
        />
      )}

      {selectedTicket ? (
        <TicketThread
          ticket={selectedTicket}
          onBack={() => {
            setSelectedTicket(null);
            loadTickets();
          }}
        />
      ) : (
        <div className="space-y-3">
          {loading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <Loader2 className="w-6 h-6 text-purple-600 animate-spin mx-auto mb-2" />
              <span className="text-xs font-bold text-slate-500">جاري تحميل تذاكرك...</span>
            </div>
          ) : tickets.length === 0 && !showNewForm ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-500">مفيش تذاكر لسه</p>
              <p className="text-xs text-slate-400">لو عندك شكوى أو اقتراح، دوس "تذكرة جديدة"</p>
            </div>
          ) : (
            tickets.map((t) => {
              const cat = CATEGORY_CONFIG[t.category];
              const CatIcon = cat.icon;
              const statusCfg = STATUS_CONFIG[t.status];
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className="w-full text-right bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-purple-300 transition-colors flex items-center gap-3"
                >
                  <div className={`p-2.5 rounded-xl shrink-0 ${cat.color}`}>
                    <CatIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 text-sm truncate">{t.subject}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{formatDateArabic(t.updated_at)}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                  <ChevronLeft className="w-4 h-4 text-slate-300 shrink-0" />
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function NewTicketForm({
  preselectedOrderId,
  onCancel,
  onCreated,
}: {
  preselectedOrderId?: string;
  onCancel: () => void;
  onCreated: (ticket: SupportTicket) => void;
}) {
  const [category, setCategory] = useState<TicketCategory>(preselectedOrderId ? 'order_issue' : 'general');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) {
      showToast({ type: 'error', title: 'بيانات ناقصة', message: 'يرجى كتابة عنوان ونص الرسالة' });
      return;
    }
    setSubmitting(true);
    try {
      const ticket = await createSupportTicket({
        category,
        subject: subject.trim(),
        message: message.trim(),
        order_id: preselectedOrderId,
      });
      showToast({ type: 'success', title: 'تم الإرسال', message: 'تم إرسال تذكرتك، هيرد عليك فريق الدعم قريبًا' });
      onCreated(ticket);
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل الإرسال', message: err.message || 'تعذر إرسال التذكرة' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-slate-900 text-sm">تذكرة جديدة</h3>
        <button onClick={onCancel} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full">
          <X className="w-4 h-4" />
        </button>
      </div>

      {preselectedOrderId && (
        <p className="text-[11px] bg-blue-50 text-blue-700 border border-blue-100 rounded-lg px-2.5 py-1.5 font-bold">
          مرتبطة بالطلب الحالي تلقائيًا
        </p>
      )}

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1.5">نوع التذكرة</label>
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(CATEGORY_CONFIG) as TicketCategory[]).map((key) => {
            const cfg = CATEGORY_CONFIG[key];
            const Icon = cfg.icon;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={`p-2.5 rounded-xl border text-[11px] font-bold flex flex-col items-center gap-1 transition-colors ${
                  category === key ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cfg.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">العنوان</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="مثال: تأخر في وصول الطلب"
          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-slate-700 mb-1">التفاصيل</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="اشرح المشكلة أو الاقتراح بالتفصيل..."
          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        <span>إرسال التذكرة</span>
      </button>
    </div>
  );
}

function TicketThread({ ticket, onBack }: { ticket: SupportTicket; onBack: () => void }) {
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const { showToast } = useToast();
  const cat = CATEGORY_CONFIG[ticket.category];
  const statusCfg = STATUS_CONFIG[ticket.status];

  const load = () => {
    fetchTicketMessages(ticket.id)
      .then(setMessages)
      .catch((err) => console.warn('fetchTicketMessages error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  const handleSend = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await sendTicketMessage(ticket.id, reply.trim());
      setReply('');
      load();
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل الإرسال', message: err.message || 'تعذر إرسال الرد' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full">
          <ChevronLeft className="w-4 h-4 rotate-180" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 text-sm truncate">{ticket.subject}</p>
          <p className="text-[10px] text-slate-400">{cat.label}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${statusCfg.color}`}>{statusCfg.label}</span>
      </div>

      <div className="p-4 space-y-3 max-h-96 overflow-y-auto bg-slate-50/50">
        {loading ? (
          <div className="text-center py-6">
            <Loader2 className="w-5 h-5 text-purple-600 animate-spin mx-auto" />
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.is_staff ? 'justify-start' : 'justify-end'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs ${
                  m.is_staff ? 'bg-white border border-slate-200 text-slate-800' : 'bg-purple-600 text-white'
                }`}
              >
                {m.is_staff && <p className="text-[10px] font-bold text-purple-600 mb-0.5">فريق الدعم</p>}
                <p className="leading-relaxed">{m.message}</p>
                <p className={`text-[9px] mt-1 ${m.is_staff ? 'text-slate-400' : 'text-purple-200'}`}>
                  {formatDateArabic(m.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {ticket.status !== 'resolved' ? (
        <div className="p-3 border-t border-slate-100 flex items-center gap-2">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="اكتب ردك..."
            className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={sending || !reply.trim()}
            className="p-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-xl transition-colors"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      ) : (
        <div className="p-3 border-t border-slate-100 bg-emerald-50 text-center">
          <p className="text-[11px] font-bold text-emerald-700 flex items-center justify-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            تم إغلاق هذه التذكرة كـ"تم الحل"
          </p>
        </div>
      )}
    </div>
  );
}