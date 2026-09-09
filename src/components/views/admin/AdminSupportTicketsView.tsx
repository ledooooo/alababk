import React, { useState, useEffect } from 'react';
import {
  fetchAllTicketsAdmin,
  fetchTicketMessages,
  sendTicketMessage,
  updateTicketStatus,
  AdminSupportTicket,
  SupportTicketMessage,
  TicketCategory,
} from '../../../lib/supabase';
import { formatDateArabic, formatPhoneNumber } from '../../../lib/formatters';
import {
  MessageSquare,
  Loader2,
  Send,
  ChevronLeft,
  Lightbulb,
  Frown,
  Package,
  HelpCircle,
  User,
  RefreshCw,
} from 'lucide-react';
import { useToast } from '../../shared/Toast';

const CATEGORY_CONFIG: Record<TicketCategory, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  complaint: { label: 'شكوى', icon: Frown, color: 'bg-rose-100 text-rose-700' },
  suggestion: { label: 'اقتراح', icon: Lightbulb, color: 'bg-amber-100 text-amber-700' },
  order_issue: { label: 'مشكلة بطلب', icon: Package, color: 'bg-blue-100 text-blue-700' },
  general: { label: 'استفسار عام', icon: HelpCircle, color: 'bg-slate-100 text-slate-700' },
};

const STATUS_OPTIONS = [
  { value: 'open', label: 'بانتظار الرد', color: 'bg-amber-100 text-amber-800' },
  { value: 'in_progress', label: 'جاري المتابعة', color: 'bg-blue-100 text-blue-800' },
  { value: 'resolved', label: 'تم الحل', color: 'bg-emerald-100 text-emerald-800' },
];

export default function AdminSupportTicketsView() {
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<AdminSupportTicket | null>(null);
  const { showToast } = useToast();

  const load = () => {
    setLoading(true);
    fetchAllTicketsAdmin(statusFilter, categoryFilter)
      .then(setTickets)
      .catch((err) => showToast({ type: 'error', title: 'فشل التحميل', message: err.message || 'تعذر تحميل التذاكر' }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, categoryFilter]);

  const openCount = tickets.filter((t) => t.status === 'open').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 dir-rtl pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-purple-600" />
            <span>تذاكر الدعم والشكاوى</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {openCount > 0 ? `${openCount} تذكرة بانتظار الرد` : 'كل التذاكر تم الرد عليها'}
          </p>
        </div>
        <button
          onClick={load}
          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {!selectedTicket && (
        <div className="flex flex-wrap gap-2">
          {['all', 'open', 'in_progress', 'resolved'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                statusFilter === s ? 'bg-purple-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s === 'all' ? 'كل الحالات' : STATUS_OPTIONS.find((o) => o.value === s)?.label}
            </button>
          ))}
          <span className="w-px bg-slate-200 mx-1" />
          {['all', 'complaint', 'suggestion', 'order_issue', 'general'].map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                categoryFilter === c ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {c === 'all' ? 'كل الأنواع' : CATEGORY_CONFIG[c as TicketCategory]?.label}
            </button>
          ))}
        </div>
      )}

      {selectedTicket ? (
        <AdminTicketThread
          ticket={selectedTicket}
          onBack={() => {
            setSelectedTicket(null);
            load();
          }}
          onStatusChanged={(status) => setSelectedTicket({ ...selectedTicket, status: status as any })}
        />
      ) : loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-6 h-6 text-purple-600 animate-spin mx-auto mb-2" />
          <span className="text-xs font-bold text-slate-500">جاري تحميل التذاكر...</span>
        </div>
      ) : tickets.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
          <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-500">مفيش تذاكر مطابقة للفلترة الحالية</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => {
            const cat = CATEGORY_CONFIG[t.category] || CATEGORY_CONFIG.general;
            const CatIcon = cat.icon;
            const statusCfg = STATUS_OPTIONS.find((o) => o.value === t.status)!;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTicket(t)}
                className="w-full text-right bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-purple-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 ${cat.color}`}>
                    <CatIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-900 text-sm truncate">{t.subject}</p>
                      {t.order_code && (
                        <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded shrink-0">
                          #{t.order_code}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <User className="w-3 h-3" /> {t.customer_name} · {formatPhoneNumber(t.customer_phone || '')}
                    </p>
                    {t.last_message && (
                      <p className="text-[11px] text-slate-400 truncate mt-1">
                        {t.last_sender_is_staff ? '↩ أنت: ' : ''}{t.last_message}
                      </p>
                    )}
                  </div>
                  <div className="text-left shrink-0 space-y-1">
                    <span className={`block text-[10px] font-bold px-2 py-1 rounded-full ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                    <span className="block text-[9px] text-slate-400">{formatDateArabic(t.updated_at)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AdminTicketThread({
  ticket,
  onBack,
  onStatusChanged,
}: {
  ticket: AdminSupportTicket;
  onBack: () => void;
  onStatusChanged: (status: string) => void;
}) {
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const { showToast } = useToast();
  const cat = CATEGORY_CONFIG[ticket.category] || CATEGORY_CONFIG.general;

  const load = () => {
    fetchTicketMessages(ticket.id)
      .then(setMessages)
      .catch((err) => console.warn('fetchTicketMessages error:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  const handleSend = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await sendTicketMessage(ticket.id, reply.trim());
      setReply('');
      load();
      if (ticket.status === 'open') {
        await updateTicketStatus(ticket.id, 'in_progress');
        onStatusChanged('in_progress');
      }
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل الإرسال', message: err.message || 'تعذر إرسال الرد' });
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    setChangingStatus(true);
    try {
      await updateTicketStatus(ticket.id, status as any);
      onStatusChanged(status);
      showToast({ type: 'success', title: 'تم التحديث', message: 'تم تحديث حالة التذكرة' });
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل التحديث', message: err.message || 'تعذر تغيير الحالة' });
    } finally {
      setChangingStatus(false);
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
          <p className="text-[10px] text-slate-500 flex items-center gap-1">
            <cat.icon className="w-3 h-3" /> {cat.label} · {ticket.customer_name} · {formatPhoneNumber(ticket.customer_phone || '')}
            {ticket.order_code && <span className="font-mono">· #{ticket.order_code}</span>}
          </p>
        </div>
        <select
          value={ticket.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={changingStatus}
          className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-bold shrink-0"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="p-4 space-y-3 max-h-96 overflow-y-auto bg-slate-50/50">
        {loading ? (
          <div className="text-center py-6">
            <Loader2 className="w-5 h-5 text-purple-600 animate-spin mx-auto" />
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.is_staff ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs ${
                  m.is_staff ? 'bg-purple-600 text-white' : 'bg-white border border-slate-200 text-slate-800'
                }`}
              >
                {!m.is_staff && <p className="text-[10px] font-bold text-slate-500 mb-0.5">{ticket.customer_name}</p>}
                <p className="leading-relaxed">{m.message}</p>
                <p className={`text-[9px] mt-1 ${m.is_staff ? 'text-purple-200' : 'text-slate-400'}`}>
                  {formatDateArabic(m.created_at)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 border-t border-slate-100 flex items-center gap-2">
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="اكتب ردك للعميل..."
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
    </div>
  );
}
