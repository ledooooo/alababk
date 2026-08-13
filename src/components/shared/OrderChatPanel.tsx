import React, { useEffect, useRef, useState } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import { StorageRepo } from '../../lib/storage';
import { subscribeToChatMessages } from '../../lib/supabase';
import { fetchChatMessages, sendChatMessage, markChatMessagesRead, ChatMessage } from '../../lib/supabase';
import { useToast } from './Toast';

interface OrderChatPanelProps {
  orderId: string;
  recipientId: string;
  recipientName: string;
  /** مثلاً "المتجر" أو "الكابتن" — بيظهر في العنوان بس */
  recipientRole?: string;
  onClose: () => void;
}

export default function OrderChatPanel({ orderId, recipientId, recipientName, recipientRole, onClose }: OrderChatPanelProps) {
  const currentUserId = StorageRepo.getCurrentUser()?.id || '';
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchChatMessages(orderId, recipientId);
        if (!cancelled) setMessages(data);
        await markChatMessagesRead(orderId, recipientId);
      } catch (err: any) {
        showToast({ type: 'error', title: 'تعذر تحميل المحادثة', message: err.message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    const unsubscribe = subscribeToChatMessages(orderId, (payload) => {
      if (payload.eventType !== 'INSERT') return;
      const msg = payload.new as ChatMessage;
      // نعرض بس رسائل المحادثة دي تحديدًا (بين المستخدم الحالي والطرف ده)
      const belongsHere =
        (msg.sender_id === recipientId && msg.recipient_id === currentUserId) ||
        (msg.sender_id === currentUserId && msg.recipient_id === recipientId);
      if (!belongsHere) return;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      if (msg.sender_id === recipientId) {
        markChatMessagesRead(orderId, recipientId).catch(() => {});
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [orderId, recipientId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText('');
    try {
      const msg = await sendChatMessage(orderId, recipientId, content);
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل الإرسال', message: err.message });
      setText(content);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col h-[80vh] sm:h-[600px] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <MessageCircle className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">{recipientName}</h3>
              {recipientRole && <p className="text-[10px] text-slate-400">{recipientRole}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-4.5 h-4.5 text-slate-500" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50">
          {loading && <p className="text-center text-xs text-slate-400 py-8">جارٍ التحميل...</p>}
          {!loading && messages.length === 0 && (
            <p className="text-center text-xs text-slate-400 py-8">ابدأ المحادثة بإرسال أول رسالة</p>
          )}
          {messages.map((m) => {
            const isMine = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
                <div
                  className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    isMine
                      ? 'bg-emerald-600 text-white rounded-bl-sm'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-br-sm'
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-slate-100 flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="اكتب رسالتك..."
            className="flex-1 p-3 bg-slate-100 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="p-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
