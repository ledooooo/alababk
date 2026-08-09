import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { UserProfile, UserRole } from '../../../types/domain';
import { Pagination } from '../../shared/Pagination';
import { Users, Search, ShieldCheck, User, Store, Bike, Ban, CheckCircle2, Eye, X, Edit3, Sparkles } from 'lucide-react';
import { useToast } from '../../shared/Toast';

export default function AdminCustomersView() {
  const [users, setUsers] = useState<UserProfile[]>(StorageRepo.getUsers());
  const orders = StorageRepo.getOrders();
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;
  const { showToast } = useToast();

  useEffect(() => {
    setCurrentPage(1);
  }, [query, roleFilter]);

  useEffect(() => {
    const unsubscribe = subscribeToStorageChange(() => {
      setUsers(StorageRepo.getUsers());
    });
    return unsubscribe;
  }, []);

  const showToastMsg = (msg: string, type: 'success' | 'error' = 'success') => {
    showToast({ type, title: type === 'success' ? 'تم' : 'خطأ', message: msg });
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRoleChange = async (user: UserProfile, newRole: UserRole) => {
    if (user.role === newRole) return;
    const updatedUser: UserProfile = { ...user, role: newRole };

    const roleNames: Record<UserRole, string> = {
      customer: 'عميل',
      store_owner: 'صاحب متجر',
      delivery_agent: 'مندوب توصيل',
      admin: 'مدير النظام',
      delivery_supervisor: 'مسؤول مندوبين التوصيل',
      finance_admin: 'مسؤول مالي وإداري',
      orders_manager: 'مسؤول الطلبات',
    };

    try {
      await StorageRepo.saveUser(updatedUser);
      setUsers(StorageRepo.getUsers());
      showToastMsg(`تم تغيير صلاحية "${user.name || user.full_name || 'المستخدم'}" بنجاح إلى (${roleNames[newRole]})`);
      if (selectedProfile && selectedProfile.id === user.id) {
        setSelectedProfile(updatedUser);
      }
    } catch (err: any) {
      console.error('Failed to change user role:', err);
      showToastMsg(`حدث خطأ أثناء تغيير الصلاحية: ${err?.message || 'تعذر الاتصال بقاعدة البيانات'}`, 'error');
      setUsers(StorageRepo.getUsers());
    }
  };

  const toggleBlock = async (user: UserProfile) => {
    const currentActive = user.is_active ?? true;
    const newActive = !currentActive;
    const updatedUser: UserProfile = { ...user, is_active: newActive };

    try {
      await StorageRepo.saveUser(updatedUser);
      setUsers(StorageRepo.getUsers());
      showToastMsg(newActive ? 'تم إلغاء حظر الحساب بنجاح' : 'تم حظر الحساب بنجاح');
      if (selectedProfile && selectedProfile.id === user.id) {
        setSelectedProfile(updatedUser);
      }
    } catch (err: any) {
      console.error('Failed to toggle user block status:', err);
      showToastMsg(`تعذر تغيير حالة الحظر: ${err?.message || 'فشلت العملية'}`, 'error');
      setUsers(StorageRepo.getUsers());
    }
  };

  const filtered = users.filter((u) => {
    const matchesSearch =
      (u.name || u.full_name || '').toLowerCase().includes(query.toLowerCase()) ||
      (u.phone || '').includes(query) ||
      (u.email || '').toLowerCase().includes(query.toLowerCase()) ||
      (u.id || '').toLowerCase().includes(query.toLowerCase());

    if (roleFilter === 'all') return matchesSearch;
    return matchesSearch && u.role === roleFilter;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedUsers = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'customer':
        return <User className="w-3.5 h-3.5 text-emerald-600" />;
      case 'store_owner':
        return <Store className="w-3.5 h-3.5 text-blue-600" />;
      case 'delivery_agent':
        return <Bike className="w-3.5 h-3.5 text-orange-600" />;
      case 'admin':
        return <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />;
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'customer':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-fit">عميل</span>;
      case 'store_owner':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-fit">صاحب متجر</span>;
      case 'delivery_agent':
        return <span className="bg-orange-50 text-orange-700 border border-orange-200 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-fit">مندوب توصيل</span>;
      case 'admin':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-fit">مدير النظام</span>;
      case 'delivery_supervisor':
        return <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-fit">مسؤول الكباتن</span>;
      case 'finance_admin':
        return <span className="bg-teal-50 text-teal-800 border border-teal-200 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-fit">مسؤول مالي</span>;
      case 'orders_manager':
        return <span className="bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 w-fit">مسؤول الطلبات</span>;
    }
  };

  const countByRole = (role: string) => {
    if (role === 'all') return users.length;
    return users.filter((u) => u.role === role).length;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 dir-rtl pb-16 relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 space-y-2 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-black">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black">إدارة واستعراض البروفايلات والصلاحيات</h1>
            <p className="text-xs text-indigo-200">عرض جميع الحسابات المسجلة بالنظام، استعراض بياناتهم وتحديث أدوارهم وصلاحياتهم فورياً</p>
          </div>
        </div>
      </div>

      {/* Role Filter Tabs & Search */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-4">
        {/* Role Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'جميع الحسابات' },
            { id: 'customer', label: 'العملاء' },
            { id: 'store_owner', label: 'أصحاب المتاجر' },
            { id: 'delivery_agent', label: 'مندوبي التوصيل' },
            { id: 'delivery_supervisor', label: 'مسؤولي الكباتن' },
            { id: 'finance_admin', label: 'المسؤول المالي' },
            { id: 'orders_manager', label: 'مسؤولي الطلبات' },
            { id: 'admin', label: 'مدراء النظام' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 ${
                roleFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[11px] px-2 py-0.5 rounded-full font-black ${
                  roleFilter === tab.id ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {countByRole(tab.id)}
              </span>
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="البحث باسم المستخدم، رقم الهاتف، أو البريد الإلكتروني..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
          </div>
          <div className="text-xs font-bold text-slate-600 shrink-0">
            الحسابات المعروضة: <span className="font-black text-indigo-600">{filtered.length}</span>
          </div>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-extrabold uppercase">
              <tr>
                <th className="p-4">البروفايل والحساب</th>
                <th className="p-4">معلومات الاتصال</th>
                <th className="p-4">تغيير الصلاحية (Role)</th>
                <th className="p-4">إجمالي النشاط</th>
                <th className="p-4">الحالة</th>
                <th className="p-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                    لا توجد حسابات مطابقة للبحث الحالي.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const isBlocked = user.is_active === false;
                  const userOrders = orders.filter((o) => o.customer_id === user.id || o.customer_phone === user.phone);

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                            alt={user.name || user.full_name || 'مستخدم'}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900 truncate">{user.name || user.full_name || 'مستخدم'}</p>
                            <p className="text-[10px] text-slate-400 font-mono">ID: #{user.id.slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 font-mono">
                        <p className="text-slate-800 font-bold">{user.phone || 'غير محدد'}</p>
                        <p className="text-slate-500 text-[11px] truncate max-w-[180px]">{user.email || 'بدون بريد'}</p>
                      </td>

                      {/* Change Role Selector */}
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user, e.target.value as UserRole)}
                            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                          >
                            <option value="customer">عميل (Customer)</option>
                            <option value="store_owner">صاحب متجر (Store Owner)</option>
                            <option value="delivery_agent">مندوب توصيل (Delivery Agent)</option>
                            <option value="delivery_supervisor">مسؤول المندوبين (Fleet Manager)</option>
                            <option value="finance_admin">مسؤول مالي وإداري (Finance)</option>
                            <option value="orders_manager">مسؤول الطلبات (Dispatcher)</option>
                            <option value="admin">مدير النظام (Admin)</option>
                          </select>
                        </div>
                      </td>

                      <td className="p-4 font-bold text-slate-800">
                        <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs">
                          {userOrders.length} طلبات
                        </span>
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

                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedProfile(user)}
                            className="p-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
                            title="معاينة البروفايل"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => toggleBlock(user)}
                            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                              isBlocked
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                            }`}
                          >
                            {isBlocked ? 'إلغاء الحظر' : 'حظر الحساب'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filtered.length}
          itemsPerPage={ITEMS_PER_PAGE}
          className="p-4"
        />
      </div>

      {/* Profile Details Modal */}
      {selectedProfile && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 border border-slate-200 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 font-black text-base text-slate-900">
                <Users className="w-5 h-5 text-indigo-600" />
                <span>تفاصيل بروفايل المستخدم</span>
              </div>
              <button
                onClick={() => setSelectedProfile(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <img
                src={selectedProfile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                alt={selectedProfile.name}
                className="w-16 h-16 rounded-2xl object-cover border border-slate-200"
              />
              <div className="space-y-1">
                <h3 className="font-extrabold text-slate-900 text-base">{selectedProfile.name || selectedProfile.full_name || 'مستخدم'}</h3>
                {getRoleBadge(selectedProfile.role)}
                <p className="text-[11px] text-slate-400 font-mono">ID: {selectedProfile.id}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
                <span className="font-bold text-slate-500">رقم الهاتف:</span>
                <span className="font-mono font-bold text-slate-900 dir-ltr">{selectedProfile.phone || 'غير مسجل'}</span>
              </div>

              <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
                <span className="font-bold text-slate-500">البريد الإلكتروني:</span>
                <span className="font-mono font-bold text-slate-900 dir-ltr">{selectedProfile.email || 'غير مسجل'}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                <label className="block font-bold text-slate-700">تعديل نوع/صلاحية الحساب:</label>
                <select
                  value={selectedProfile.role}
                  onChange={(e) => handleRoleChange(selectedProfile, e.target.value as UserRole)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-black text-xs text-indigo-950 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="customer">عميل (Customer)</option>
                  <option value="store_owner">صاحب متجر (Store Owner)</option>
                  <option value="delivery_agent">مندوب توصيل (Delivery Agent)</option>
                  <option value="delivery_supervisor">مسؤول المندوبين (Fleet Manager)</option>
                  <option value="finance_admin">مسؤول مالي وإداري (Finance)</option>
                  <option value="orders_manager">مسؤول الطلبات (Dispatcher)</option>
                  <option value="admin">مدير النظام (Admin)</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedProfile(null)}
                className="px-6 py-2.5 bg-slate-900 text-white font-black text-xs rounded-xl hover:bg-slate-800 transition-all"
              >
                إغلاق البروفايل
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};