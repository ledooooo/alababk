import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../lib/storage';
import { UserProfile, UserRole } from '../../types/domain';
import { User, Store, Bike, ShieldCheck, ChevronDown, Check, LogOut, Sparkles } from 'lucide-react';

interface RoleSwitcherProps {
  onRoleChange?: (role: UserRole) => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({ onRoleChange }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(StorageRepo.getCurrentUser());
  const [allUsers, setAllUsers] = useState<UserProfile[]>(StorageRepo.getUsers());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToStorageChange(() => {
      setCurrentUser(StorageRepo.getCurrentUser());
      setAllUsers(StorageRepo.getUsers());
    });
    return unsubscribe;
  }, []);

  const handleSwitchUser = (user: UserProfile) => {
    StorageRepo.setCurrentUser(user);
    setCurrentUser(user);
    setIsOpen(false);
    if (onRoleChange) {
      onRoleChange(user.role);
    }
  };

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
    }
  };

  return (
    <div className="relative inline-block text-right z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm transition-all"
        title="تبديل وضع العرض والمستخدم للتجربة"
      >
        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        <span className="hidden sm:inline text-slate-300">وضع المعاينة:</span>
        <div className="flex items-center gap-1.5">
          {currentUser && getRoleIcon(currentUser.role)}
          <span className="font-semibold">{currentUser?.name || 'زائر'}</span>
        </div>
        {currentUser && getRoleBadge(currentUser.role)}
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 ms-1" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/80">
            <p className="text-xs font-bold text-slate-700">تبديل حساب التجربة الفوري</p>
            <p className="text-[11px] text-slate-500">اختر دوراً لمعاينة الواجهة الخاصة به:</p>
          </div>

          <div className="py-1 max-h-64 overflow-y-auto">
            {allUsers.map((user) => {
              const isSelected = currentUser?.id === user.id;
              return (
                <button
                  key={user.id}
                  onClick={() => handleSwitchUser(user)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-right text-xs hover:bg-slate-50 transition-colors ${
                    isSelected ? 'bg-emerald-50/60 font-semibold text-emerald-950' : 'text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 bg-slate-100 rounded-md shrink-0">
                      {getRoleIcon(user.role)}
                    </div>
                    <div className="truncate">
                      <p className="font-semibold truncate">{user.name}</p>
                      <p className="text-[10px] text-slate-500 dir-ltr text-right">{user.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {getRoleBadge(user.role)}
                    {isSelected && <Check className="w-4 h-4 text-emerald-600" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="px-2 pt-2 border-t border-slate-100 text-center">
            <button
              onClick={() => {
                StorageRepo.setCurrentUser(null);
                setCurrentUser(null);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
