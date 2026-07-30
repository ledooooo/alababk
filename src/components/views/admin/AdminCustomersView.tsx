import React, { useState } from 'react';
import { StorageRepo } from '../../../lib/storage';
import { Users, Search, ShieldCheck, ShieldAlert, ShoppingBag, Phone, Mail, MoreVertical, Ban, CheckCircle2 } from 'lucide-react';

export const AdminCustomersView: React.FC = () => {
  const users = StorageRepo.getUsers().filter((u) => u.role === 'customer');
  const orders = StorageRepo.getOrders();
  const [query, setQuery] = useState('');
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);

  const filtered = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(query.toLowerCase()) ||
      u.phone.includes(query) ||
      u.email.toLowerCase().includes(query.toLowerCase())
  );

  const toggleBlock = (userId: string) => {
    if (blockedUsers.includes(userId)) {
      setBlockedUsers((prev) => prev.filter((id) => id !== userId));
    } else {
      setBlockedUsers((prev) => [...prev, userId]);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 dir-rtl pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 space-y-2 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-black">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black">إدارة قاعدة بيانات العملاء المسجلين</h1>
            <p className="text-xs text-indigo-200">عرض قائمة المشترين والعملاء، متابعة إحصائيات الطلبات، وإدارة صلاحيات وصول الحسابات</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="البحث باسم العميل، رقم الهاتف، أو البريد الإلكتروني..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
        </div>
        <div className="text-xs font-bold text-slate-600 shrink-0">
          إجمالي العملاء: <span className="font-black text-indigo-600">{users.length}</span>
        </div>
      </div>

      {/* Customers Table/Grid */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-extrabold uppercase">
              <tr>
                <th className="p-4">العميل</th>
                <th className="p-4">الهاتف والبريد</th>
                <th className="p-4">إجمالي الطلبات</th>
                <th className="p-4">تاريخ التسجيل</th>
                <th className="p-4">الحالة</th>
                <th className="p-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map((user) => {
                const isBlocked = blockedUsers.includes(user.id);
                const customerOrders = orders.filter((o) => o.customer_id === user.id || o.customer_phone === user.phone);

                return (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                          alt={user.full_name}
                          className="w-10 h-10 rounded-xl object-cover border border-slate-200"
                        />
                        <div>
                          <p className="font-extrabold text-slate-900">{user.full_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">ID: #{user.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 font-mono">
                      <p className="text-slate-800 font-bold">{user.phone}</p>
                      <p className="text-slate-500 text-[11px]">{user.email}</p>
                    </td>

                    <td className="p-4 font-bold text-slate-800">
                      <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs">
                        {customerOrders.length} طلبات
                      </span>
                    </td>

                    <td className="p-4 text-slate-500 font-mono">
                      {user.created_at ? user.created_at.slice(0, 10) : '2026-07-01'}
                    </td>

                    <td className="p-4">
                      {isBlocked ? (
                        <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-lg text-[11px] font-bold inline-flex items-center gap-1">
                          <Ban className="w-3 h-3" /> محظور
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> نشط
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-center">
                      <button
                        onClick={() => toggleBlock(user.id)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                          isBlocked
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        }`}
                      >
                        {isBlocked ? 'إلغاء الحظر' : 'حظر الحساب'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
