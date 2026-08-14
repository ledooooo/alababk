import React, { useState, useEffect, useMemo } from 'react';
import {
  listAllSupabaseNotifications,
  sendBroadcastNotification,
  sendRoleNotification,
  createSupabaseNotification,
  fetchNotificationBroadcasts,
  fetchSupabaseUsers,
  deleteSupabaseNotification,
  NotificationBroadcast,
} from '../../../lib/supabase';
import { NotificationItem, UserProfile, UserRole } from '../../../types/domain';
import { formatDate } from '../../../lib/formatters';
import { Bell, Send, RefreshCw, Smartphone, Tag, Search, User as UserIcon, X, Trash2 } from 'lucide-react';
import { Pagination } from '../../shared/Pagination';
import { useToast } from '../../shared/Toast';
import { useConfirm } from '../../shared/ConfirmDialog';

const ROLE_LABELS: Record<UserRole, string> = {
  customer: 'كل العملاء',
  store_owner: 'كل أصحاب المتاجر',
  delivery_agent: 'كل المناديب',
  admin: 'كل الأدمن',
  delivery_supervisor: 'كل مشرفي التوصيل',
  finance_admin: 'كل موظفي المالية',
  orders_manager: 'كل مديري الطلبات',
};

type TargetMode = 'all' | UserRole | 'user';

export default function AdminNotificationsView() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [broadcasts, setBroadcasts] = useState<NotificationBroadcast[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [sending, setSending] = useState<boolean>(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState<'system' | 'promotion' | 'order_status'>('promotion');
  const [targetMode, setTargetMode] = useState<TargetMode>('all');

  // اختيار مستخدم واحد بالتحديد
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // فلترة/بحث وحذف سجل الإشعارات المرسلة لكل المستخدمين
  const [historySearch, setHistorySearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_PER_PAGE = 8;

  const { showToast } = useToast();
  const { showConfirm } = useConfirm();

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // نحمّل الإشعارات الحقيقية لكل المستخدمين + سجل عمليات البث الفعلي —
      // لا يوجد أي مستخدم وهمي ولا بيانات تجريبية هنا.
      const [notifData, broadcastData] = await Promise.all([
        listAllSupabaseNotifications(),
        fetchNotificationBroadcasts(),
      ]);
      setNotifications(notifData);
      setBroadcasts(broadcastData);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'فشل التحميل',
        message: err.message || 'تعذر تحميل الإشعارات',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  useEffect(() => {
    if (targetMode === 'user' && allUsers.length === 0) {
      fetchSupabaseUsers().then(setAllUsers).catch(() => {});
    }
  }, [targetMode]);

  const filteredHistory = useMemo(() => {
    const term = historySearch.trim().toLowerCase();
    if (!term) return notifications;
    return notifications.filter(
      (n) =>
        n.title.toLowerCase().includes(term) ||
        (n.message || '').toLowerCase().includes(term) ||
        n.type.toLowerCase().includes(term) ||
        (n.user_id || '').toLowerCase().includes(term)
    );
  }, [notifications, historySearch]);

  const historyTotalPages = Math.max(1, Math.ceil(filteredHistory.length / HISTORY_PER_PAGE));
  const paginatedHistory = filteredHistory.slice(
    (historyPage - 1) * HISTORY_PER_PAGE,
    historyPage * HISTORY_PER_PAGE
  );

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch]);

  const handleDeleteNotification = (n: NotificationItem) => {
    showConfirm({
      title: 'تأكيد الحذف',
      message: `هل تريد حذف الإشعار "${n.title}" نهائياً من سجل هذا المستخدم؟`,
      variant: 'danger',
      confirmLabel: 'حذف',
      onConfirm: async () => {
        setDeletingId(n.id);
        try {
          await deleteSupabaseNotification(n.id);
          setNotifications((prev) => prev.filter((x) => x.id !== n.id));
          showToast({ type: 'success', title: 'تم الحذف', message: 'تم حذف الإشعار بنجاح' });
        } catch (err: any) {
          showToast({ type: 'error', title: 'فشل الحذف', message: err.message || 'تعذر حذف الإشعار' });
        } finally {
          setDeletingId(null);
        }
      },
    });
  };

  const filteredUsers = allUsers.filter((u) => {
    const term = userSearch.trim().toLowerCase();
    if (!term) return false;
    return u.name.toLowerCase().includes(term) || u.phone.includes(term) || u.email.toLowerCase().includes(term);
  }).slice(0, 8);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      showToast({ type: 'error', title: 'بيانات ناقصة', message: 'يرجى إدخال عنوان ونص الإشعار' });
      return;
    }
    if (targetMode === 'user' && !selectedUser) {
      showToast({ type: 'error', title: 'اختر مستخدمًا', message: 'يرجى البحث واختيار المستخدم المستهدف' });
      return;
    }

    setSending(true);
    try {
      const finalType = type === 'promotion' ? 'promo' : type;
      let resultMessage = '';

      if (targetMode === 'all') {
        const count = await sendBroadcastNotification({ title: title.trim(), body: body.trim(), type: finalType });
        resultMessage = `تم بث الإشعار فعليًا إلى ${count} مستخدم`;
      } else if (targetMode === 'user') {
        await createSupabaseNotification({
          user_id: selectedUser!.id,
          title: title.trim(),
          body: body.trim(),
          type: finalType,
        });
        resultMessage = `تم إرسال الإشعار إلى ${selectedUser!.name}`;
      } else {
        const count = await sendRoleNotification({
          role: targetMode,
          title: title.trim(),
          body: body.trim(),
          type: finalType,
        });
        resultMessage = `تم إرسال الإشعار إلى ${count} من (${ROLE_LABELS[targetMode]})`;
      }

      setTitle('');
      setBody('');
      setSelectedUser(null);
      setUserSearch('');
      showToast({ type: 'success', title: 'تم الإرسال', message: resultMessage });
      await loadNotifications();
    } catch (err: any) {
      console.error('Error sending notification:', err);
      showToast({ type: 'error', title: 'فشل الإرسال', message: err.message || 'تعذر إرسال الإشعار' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 dir-rtl">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm mb-1">
            <Bell className="w-5 h-5" />
            <span>مركز الإشعارات والتنبيهات (جدول Supabase Notifications)</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">إدارة الإشعارات والعروض اللحظية</h1>
          <p className="text-xs text-slate-500 mt-1">
            إرسال إشعارات مباشرة وعروض ترويجية للعملاء وأصحاب المحلات والكباتن
          </p>
        </div>
        <button
          onClick={loadNotifications}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث الإشعارات</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Broadcast Form */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <Send className="w-4 h-4 text-indigo-600" />
            <span>بث إشعار جماعي جديد</span>
          </h2>

          <form onSubmit={handleSendBroadcast} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">إرسال إلى</label>
              <select
                value={targetMode}
                onChange={(e) => {
                  setTargetMode(e.target.value as TargetMode);
                  setSelectedUser(null);
                  setUserSearch('');
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-600"
              >
                <option value="all">كل المستخدمين</option>
                {Object.entries(ROLE_LABELS).map(([role, label]) => (
                  <option key={role} value={role}>{label}</option>
                ))}
                <option value="user">مستخدم واحد بالتحديد...</option>
              </select>
            </div>

            {targetMode === 'user' && (
              <div className="space-y-2">
                {selectedUser ? (
                  <div className="flex items-center justify-between p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-indigo-900">{selectedUser.name} — {selectedUser.phone}</span>
                    </div>
                    <button type="button" onClick={() => setSelectedUser(null)} className="text-indigo-600 hover:text-indigo-900">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="ابحث بالاسم أو الهاتف أو الإيميل..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-600"
                    />
                    {userSearch && filteredUsers.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {filteredUsers.map((u) => (
                          <button
                            type="button"
                            key={u.id}
                            onClick={() => { setSelectedUser(u); setUserSearch(''); }}
                            className="w-full text-right px-3 py-2 hover:bg-slate-50 text-xs border-b border-slate-100 last:border-0"
                          >
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <div className="text-slate-500">{u.phone} · {u.role}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نوع الإشعار</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-600"
              >
                <option value="promotion">عرض ترويجي / خصم</option>
                <option value="system">تنبيه نظام عام</option>
                <option value="order_status">متابعة طلب</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">عنوان الإشعار *</label>
              <input
                type="text"
                required
                placeholder="مثال: توصيل مجاني اليوم في المعادي!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">نص الإشعار *</label>
              <textarea
                required
                rows={3}
                placeholder="أكتب تفاصيل الرسالة والخصم..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-600"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <Smartphone className="w-4 h-4" />
              <span>{sending ? 'جاري الإرسال...' : 'إرسال وتخزين في Supabase'}</span>
            </button>
          </form>
        </div>

        {/* Sent Notifications History */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
          <h2 className="font-extrabold text-slate-900 text-base">سجل الحملات المُرسَلة ({broadcasts.length})</h2>

          <div className="space-y-3">
            {broadcasts.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-6">لا توجد حملات بث جماعي بعد.</p>
            )}
            {broadcasts.map((b) => (
              <div key={b.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                  {b.type === 'promo' ? <Tag className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900 text-xs">{b.title}</h3>
                    <span className="text-[10px] text-slate-400 font-medium">{formatDate(b.created_at)}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">{b.body}</p>
                  <p className="text-[10px] text-emerald-600 font-bold">
                    تم الإرسال إلى {b.recipients_count} مستخدم
                    {b.target && b.target !== 'all' && ` (${ROLE_LABELS[b.target as UserRole] || b.target})`}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <h2 className="font-extrabold text-slate-900 text-base">
              آخر الإشعارات لكل المستخدمين ({filteredHistory.length})
            </h2>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              placeholder="ابحث بالعنوان أو النص أو النوع أو معرف المستخدم..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div className="space-y-3">
            {paginatedHistory.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-6">لا توجد إشعارات مطابقة.</p>
            )}
            {paginatedHistory.map((n) => (
              <div key={n.id} className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                  {n.type === 'promotion' || n.type === 'promo' ? <Tag className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-extrabold text-slate-900 text-xs truncate">{n.title}</h3>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0">{formatDate(n.created_at)}</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">{n.message}</p>
                  <p className="text-[10px] text-slate-400 font-mono">مستخدم: {n.user_id?.slice(0, 8)}</p>
                </div>
                <button
                  onClick={() => handleDeleteNotification(n)}
                  disabled={deletingId === n.id}
                  className="p-2 text-rose-600 hover:bg-rose-100 rounded-xl transition-colors disabled:opacity-50 shrink-0"
                  title="حذف الإشعار"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <Pagination
            currentPage={historyPage}
            totalPages={historyTotalPages}
            onPageChange={setHistoryPage}
            totalItems={filteredHistory.length}
            itemsPerPage={HISTORY_PER_PAGE}
          />
        </div>
      </div>
    </div>
  );
}