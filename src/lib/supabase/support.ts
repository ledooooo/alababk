// src/lib/supabase/support.ts
import { supabase } from './client';
import { translateSupabaseError } from './helpers';

export type TicketCategory = 'complaint' | 'suggestion' | 'order_issue' | 'general';
export type TicketStatus = 'open' | 'in_progress' | 'resolved';

export interface SupportTicket {
  id: string;
  customer_id: string;
  order_id: string | null;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
}

export interface AdminSupportTicket extends SupportTicket {
  customer_name: string;
  customer_phone: string | null;
  order_code: string | null;
  message_count: number;
  last_message: string | null;
  last_sender_is_staff: boolean;
}

export interface SupportTicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  created_at: string;
  is_staff: boolean;
}

function mapTicket(t: any): SupportTicket {
  return {
    id: t.id,
    customer_id: t.customer_id,
    order_id: t.order_id ?? null,
    category: t.category,
    subject: t.subject,
    status: t.status,
    created_at: t.created_at,
    updated_at: t.updated_at,
  };
}

/** إنشاء تذكرة جديدة + أول رسالة فيها (نص الشكوى/الاقتراح نفسه). */
export async function createSupportTicket(params: {
  category: TicketCategory;
  subject: string;
  message: string;
  order_id?: string | null;
}): Promise<SupportTicket> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error('يجب تسجيل الدخول أولاً');

  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .insert({
      customer_id: userId,
      order_id: params.order_id || null,
      category: params.category,
      subject: params.subject.trim(),
    })
    .select('*')
    .single();
  if (ticketError) throw new Error(translateSupabaseError(ticketError).message);

  const { error: msgError } = await supabase.from('support_ticket_messages').insert({
    ticket_id: ticket.id,
    sender_id: userId,
    message: params.message.trim(),
  });
  if (msgError) throw new Error(translateSupabaseError(msgError).message);

  return mapTicket(ticket);
}

/** تذاكر العميل الحالي، الأحدث نشاطًا أولًا. */
export async function fetchMyTickets(): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from('support_tickets')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(translateSupabaseError(error).message);
  return (data || []).map(mapTicket);
}

/** محادثة تذكرة معيّنة (شغالة للعميل صاحبها أو أي staff — الـRLS بتفرق). */
export async function fetchTicketMessages(ticketId: string): Promise<SupportTicketMessage[]> {
  const { data, error } = await supabase
    .from('support_ticket_messages')
    .select('*, profiles(role)')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(translateSupabaseError(error).message);
  const staffRoles = new Set(['admin', 'finance_admin', 'orders_manager', 'delivery_supervisor']);
  return (data || []).map((m: any) => ({
    id: m.id,
    ticket_id: m.ticket_id,
    sender_id: m.sender_id,
    message: m.message,
    created_at: m.created_at,
    is_staff: staffRoles.has(m.profiles?.role),
  }));
}

/** إضافة رسالة لتذكرة — شغالة لصاحب التذكرة أو أي staff. */
export async function sendTicketMessage(ticketId: string, message: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) throw new Error('يجب تسجيل الدخول أولاً');

  const { error } = await supabase.from('support_ticket_messages').insert({
    ticket_id: ticketId,
    sender_id: userId,
    message: message.trim(),
  });
  if (error) throw new Error(translateSupabaseError(error).message);
}

/** كل تذاكر الدعم (لوحة الأدمن) — بحث بالحالة/الفئة، مُثراة ببيانات العميل والطلب. */
export async function fetchAllTicketsAdmin(status?: string, category?: string): Promise<AdminSupportTicket[]> {
  const { data, error } = await supabase.rpc('admin_list_support_tickets', {
    p_status: status && status !== 'all' ? status : null,
    p_category: category && category !== 'all' ? category : null,
  });
  if (error) throw new Error(translateSupabaseError(error).message);
  return (data || []).map((t: any) => ({
    id: t.id,
    customer_id: t.customer_id,
    customer_name: t.customer_name || 'عميل',
    customer_phone: t.customer_phone,
    order_id: t.order_id,
    order_code: t.order_code,
    category: t.category,
    subject: t.subject,
    status: t.status,
    message_count: Number(t.message_count || 0),
    last_message: t.last_message,
    last_sender_is_staff: !!t.last_sender_is_staff,
    created_at: t.created_at,
    updated_at: t.updated_at,
  }));
}

/** تحديث حالة تذكرة (staff بس — الـRLS بترفض غير كده). */
export async function updateTicketStatus(ticketId: string, status: TicketStatus): Promise<void> {
  const { error } = await supabase.from('support_tickets').update({ status }).eq('id', ticketId);
  if (error) throw new Error(translateSupabaseError(error).message);
}
