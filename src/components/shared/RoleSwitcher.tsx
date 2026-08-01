import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../lib/storage';
import { UserProfile, UserRole } from '../../types/domain';
import { User, Store, Bike, ShieldCheck, ChevronDown, LogOut, Phone, Mail, Coins, ShoppingBag, Radio } from 'lucide-react';

interface RoleSwitcherProps {
  onRoleChange?: (role: UserRole) => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ onRoleChange }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(StorageRepo.getCurrentUser());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToStorageChange(() => {
      setCurrentUser(StorageRepo.getCurrentUser());
    });
    return unsubscribe;
  }, []);

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'customer':
        return <User className="w-4 h-4 text-emerald-600" />;
      case 'store_owner':
        return <Store className="w-4 h-4 text-blue-600" />;
      case 'delivery_agent':
        return <Bike className="w-4 h-4 text-orange-600" />;
      case 'admin':
        return <ShieldCheck className="w-4 h-4 text-purple-600" />;
      case 'delivery_supervisor':
        return <Radio className="w-4 h-4 text-orange-500" />;
      case 'finance_admin':
        return <Coins className="w-4 h-4 text-emerald-500" />;
      case 'orders_manager':
        return <ShoppingBag className="w-4 h-4 text-indigo-500" />;
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'customer':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2 py-0.5 rounded-full font-medium">عميل</span>;
      case 'store_owner':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2 py-0.5 rounded-full font-medium">صاحب متجر</span>;
      case 'delivery_agent':
        return <span className="bg-orange-50 text-orange-700 border border-orange-200 text-xs px-2 py-0.5 rounded-full font-medium">مندوب توصيل</span>;
      case 'admin':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-xs px-2 py-0.5 rounded-full font-medium">مدير النظام</span>;
      case 'delivery_supervisor':
        return <span className="bg-orange-100 text-orange-800 border border-orange-300 text-xs px-2 py-0.5 rounded-full font-medium">مسؤول الكباتن</span>;
      case 'finance_admin':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs px-2 py-0.5 rounded-full font-medium">مسؤول مالي</span>;
      case 'orders_manager':
        return <span className="bg-indigo-100 text-indigo-800 border border-indigo-300 text-xs px-2 py-0.5 rounded-full font-medium">مسؤول الطلبات</span>;
    }
  };

  return (
    <div className="relative inline-block text-right z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm transition-all"
        title="حسابي الخالي"
      >
        <div className="flex items-center gap-1.5">
          {currentUser && getRoleIcon(currentUser.role)}
          <span className="font-semibold">{currentUser?.name || currentUser?.full_name || 'زائر'}</span>
        </div>
        {currentUser && getRoleBadge(currentUser.role)}
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 ms-1" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-3 px-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-3">
          <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-sm overflow-hidden border border-slate-200 shrink-0">
              {currentUser?.avatar_url ? (
                <img src={currentUser.avatar_url} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                currentUser?.name?.slice(0, 1) || 'U'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-slate-900 truncate">{currentUser?.name || currentUser?.full_name || 'مستخدم مسجل'}</p>
              <div className="mt-0.5 flex items-center gap-1">
                {currentUser && getRoleBadge(currentUser.role)}
              </div>
            </div>
          </div>

          <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            {currentUser?.phone && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-bold">الهاتف:</span>
                <span className="font-mono font-bold text-slate-800 dir-ltr">{currentUser.phone}</span>
              </div>
            )}
            {currentUser?.email && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 font-bold">البريد:</span>
                <span className="font-mono text-slate-700 dir-ltr truncate max-w-[170px]">{currentUser.email}</span>
              </div>
            )}
          </div>

          <div className="pt-1 border-t border-slate-100">
            <button
              onClick={() => {
                StorageRepo.logout();
                setCurrentUser(null);
                setIsOpen(false);
                if (onRoleChange) {
                  onRoleChange('customer');
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-rose-600 font-bold hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              تسجيل الخروج
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
