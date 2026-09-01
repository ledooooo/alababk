import React from 'react';
import { UserProfile, UserRole } from '../../types/domain';
import {
  ShoppingBag,
  Store as StoreIcon,
  Bike,
  ShieldCheck,
  User as UserIcon,
  ListOrdered,
  MapPin,
  Search,
  LayoutGrid,
  Bell,
  Package,
  QrCode,
  Star,
  DollarSign,
  TrendingUp,
  Settings,
  X,
  LogIn,
  LogOut,
  Info,
  PhoneCall,
  Radio,
  Coins,
  Ticket,
  Users,
  Database,
  ChevronLeft
} from 'lucide-react';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  currentUser: UserProfile | null;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  currentPath,
  onNavigate,
  onLogout,
  currentUser,
}) => {
  if (!isOpen) return null;

  const role: UserRole = currentUser?.role || 'customer';

  const isActive = (path: string) => currentPath === path || currentPath.startsWith(path + '/');

  const getRoleTheme = () => {
    switch (role) {
      case 'store_owner':
        return {
          bgActive: 'bg-blue-600 text-white shadow-md shadow-blue-600/20',
          badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
          roleLabel: 'صاحب متجر',
        };
      case 'delivery_agent':
        return {
          bgActive: 'bg-orange-600 text-white shadow-md shadow-orange-600/20',
          badgeBg: 'bg-orange-100 text-orange-800 border-orange-200',
          roleLabel: 'كابتن توصيل',
        };
      case 'delivery_supervisor':
        return {
          bgActive: 'bg-amber-600 text-white shadow-md shadow-amber-600/20',
          badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
          roleLabel: 'مسؤول الكباتن',
        };
      case 'finance_admin':
        return {
          bgActive: 'bg-teal-600 text-white shadow-md shadow-teal-600/20',
          badgeBg: 'bg-teal-100 text-teal-800 border-teal-200',
          roleLabel: 'مسؤول مالي',
        };
      case 'orders_manager':
        return {
          bgActive: 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20',
          badgeBg: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          roleLabel: 'مسؤول الطلبات',
        };
      case 'admin':
        return {
          bgActive: 'bg-purple-600 text-white shadow-md shadow-purple-600/20',
          badgeBg: 'bg-purple-100 text-purple-800 border-purple-200',
          roleLabel: 'مدير النظام',
        };
      default:
        return {
          bgActive: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20',
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          roleLabel: 'عميل',
        };
    }
  };

  const theme = getRoleTheme();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden dir-rtl">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex h-full h-screen z-50">
        <div className="w-screen max-w-xs sm:max-w-sm h-full h-screen bg-white shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-250 ease-out border-l border-slate-200">
          
          <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 bg-slate-900 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/icon.png"
                  alt="وياك"
                  className="w-10 h-10 rounded-xl object-cover shadow-md border border-amber-400/40"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h2 className="font-extrabold text-base text-white tracking-tight leading-tight">
                    وياك
                  </h2>
                  <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
                    القائمة الملاحة الشاملة
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {currentUser ? (
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-extrabold flex items-center justify-center text-sm shadow-inner shrink-0">
                    {currentUser.name ? currentUser.name.slice(0, 1) : 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate max-w-[150px]">
                      {currentUser.name}
                    </p>
                    <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full border mt-0.5 ${theme.badgeBg}`}>
                      {theme.roleLabel}
                    </span>
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="mt-4 pt-3 border-t border-slate-800">
                <button
                  onClick={() => onNavigate('/auth')}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20"
                >
                  <LogIn className="w-4 h-4" />
                  <span>تسجيل الدخول / حساب جديد</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Customer Navigation */}
            {role === 'customer' && (
              <div className="space-y-1">
                <p className="text-[11px] font-black text-slate-400 px-3 uppercase tracking-wider mb-2">
                  تصفح التسوق والطلبات
                </p>

                <button
                  onClick={() => onNavigate('/')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/') && !isActive('/stores') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <StoreIcon className="w-4 h-4" />
                    <span>الرئيسية</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/stores')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/stores') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <StoreIcon className="w-4 h-4" />
                    <span>تصفح المتاجر</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/search')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/search') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Search className="w-4 h-4" />
                    <span>البحث الشامل</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/categories')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/categories') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutGrid className="w-4 h-4" />
                    <span>الأقسام</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/orders')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/orders') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ListOrdered className="w-4 h-4" />
                    <span>طلباتي</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/addresses')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/addresses') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4" />
                    <span>عناويني</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/profile')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/profile') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <UserIcon className="w-4 h-4" />
                    <span>حسابي الشخصي</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/notifications')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/notifications') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4" />
                    <span>الإشعارات</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>
              </div>
            )}

            {/* Store Owner Navigation */}
            {role === 'store_owner' && (
              <div className="space-y-1">
                <p className="text-[11px] font-black text-slate-400 px-3 uppercase tracking-wider mb-2">
                  إدارة المحل والمبيعات
                </p>

                <button
                  onClick={() => onNavigate('/store/dashboard')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/store/dashboard') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <StoreIcon className="w-4 h-4" />
                    <span>لوحة المحل</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/store/orders')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/store/orders') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag className="w-4 h-4" />
                    <span>الطلبات الواردة</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/store/products')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/store/products') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Package className="w-4 h-4" />
                    <span>المنتجات والمخزون</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/store/reviews')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/store/reviews') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Star className="w-4 h-4" />
                    <span>تقييمات العملاء</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/store/payouts')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/store/payouts') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <DollarSign className="w-4 h-4" />
                    <span>المستحقات والسحب</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/store/analytics')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/store/analytics') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <TrendingUp className="w-4 h-4" />
                    <span>التقارير المالية</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/store/notifications')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/store/notifications') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4" />
                    <span>الإشعارات</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/store/settings')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/store/settings') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className="w-4 h-4" />
                    <span>إعدادات المحل</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>
              </div>
            )}

            {/* Delivery Agent Navigation */}
            {role === 'delivery_agent' && (
              <div className="space-y-1">
                <p className="text-[11px] font-black text-slate-400 px-3 uppercase tracking-wider mb-2">
                  مهام وتأدية الرحلات
                </p>

                <button
                  onClick={() => onNavigate('/delivery/dashboard')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/delivery/dashboard') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bike className="w-4 h-4" />
                    <span>لوحة الكابتن</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/delivery/available')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/delivery/available') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag className="w-4 h-4" />
                    <span>الطلبات المتاحة</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/delivery/active')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/delivery/active') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4" />
                    <span>الرحلة الجارية</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/delivery/history')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/delivery/history') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <DollarSign className="w-4 h-4" />
                    <span>سجل التوصيل</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/delivery/earnings')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/delivery/earnings') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <DollarSign className="w-4 h-4" />
                    <span>محفظة الأرباح</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/delivery/profile')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/delivery/profile') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <UserIcon className="w-4 h-4" />
                    <span>ملف الكابتن</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/delivery/notifications')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/delivery/notifications') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4" />
                    <span>التنبيهات</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>
              </div>
            )}

            {/* Delivery Supervisor */}
            {role === 'delivery_supervisor' && (
              <div className="space-y-1">
                <p className="text-[11px] font-black text-slate-400 px-3 uppercase tracking-wider mb-2">
                  الإشراف والمتابعة
                </p>
                <button
                  onClick={() => onNavigate('/supervisor')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/supervisor') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Radio className="w-4 h-4" />
                    <span>إدارة وإشراف الكباتن</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>
              </div>
            )}

            {/* Finance Admin */}
            {role === 'finance_admin' && (
              <div className="space-y-1">
                <p className="text-[11px] font-black text-slate-400 px-3 uppercase tracking-wider mb-2">
                  الإدارة المالية
                </p>
                <button
                  onClick={() => onNavigate('/finance')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/finance') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Coins className="w-4 h-4" />
                    <span>المحاسبة والتسويات المالية</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>
              </div>
            )}

            {/* Orders Manager */}
            {role === 'orders_manager' && (
              <div className="space-y-1">
                <p className="text-[11px] font-black text-slate-400 px-3 uppercase tracking-wider mb-2">
                  غرفة التحكم
                </p>
                <button
                  onClick={() => onNavigate('/orders-manager')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/orders-manager') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag className="w-4 h-4" />
                    <span>غرفة التحكم وإسناد الطلبات</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>
              </div>
            )}

            {/* System Admin Navigation */}
            {role === 'admin' && (
              <div className="space-y-1">
                <p className="text-[11px] font-black text-slate-400 px-3 uppercase tracking-wider mb-2">
                  لوحة تحكم مدير النظام
                </p>

                <button
                  onClick={() => onNavigate('/admin')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/admin') && !isActive('/admin/stores') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>لوحة القيادة (نظرة عامة)</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/admin/stores-applications')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/admin/stores-applications') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <StoreIcon className="w-4 h-4" />
                    <span>طلبات انضمام المتاجر</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/admin/stores')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/admin/stores') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <StoreIcon className="w-4 h-4" />
                    <span>المتاجر والشركاء</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/admin/products')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/admin/products') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Package className="w-4 h-4" />
                    <span>المنتجات (كل المتاجر)</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/admin/store-qr-codes')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/admin/store-qr-codes') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <QrCode className="w-4 h-4" />
                    <span>أكواد QR للمتاجر</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/admin/agents')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/admin/agents') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bike className="w-4 h-4" />
                    <span>الكباتن والمندوبين</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/admin/orders')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/admin/orders') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag className="w-4 h-4" />
                    <span>غرفة متابعة الطلبات</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/admin/zones')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/admin/zones') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4" />
                    <span>مناطق التوصيل</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/admin/coupons')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/admin/coupons') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Ticket className="w-4 h-4" />
                    <span>خصومات الكوبونات</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/admin/customers')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/admin/customers') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4" />
                    <span>المستخدمون والعملاء</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/admin/payouts')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/admin/payouts') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <DollarSign className="w-4 h-4" />
                    <span>طلبات سحب الأرباح</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/admin/supabase')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/admin/supabase') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Database className="w-4 h-4" />
                    <span>حالة Supabase</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <p className="text-[10px] font-black text-slate-300 px-3 pt-2 uppercase tracking-wider">إدارة المحتوى</p>

                <button
                  onClick={() => onNavigate('/admin/categories')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/admin/categories') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutGrid className="w-4 h-4" />
                    <span>التصنيفات</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/admin/reviews')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/admin/reviews') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Star className="w-4 h-4" />
                    <span>التقييمات</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/admin/notifications')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/admin/notifications') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4" />
                    <span>الإشعارات الجماعية</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <p className="text-[10px] font-black text-slate-300 px-3 pt-2 uppercase tracking-wider">النظام</p>

                <button
                  onClick={() => onNavigate('/admin/activity')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/admin/activity') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>سجل النشاطات</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => onNavigate('/admin/settings')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive('/admin/settings') ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Settings className="w-4 h-4" />
                    <span>إعدادات المنصة</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>
              </div>
            )}

            {/* General App Pages */}
            <div className="space-y-1 pt-3 border-t border-slate-100">
              <p className="text-[11px] font-black text-slate-400 px-3 uppercase tracking-wider mb-2">
                روابط سريعة
              </p>

              <button
                onClick={() => onNavigate('/about')}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive('/about') ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Info className="w-4 h-4 text-emerald-600" />
                  <span>عن منصة وياك</span>
                                  </div>
              </button>

              <button
                onClick={() => onNavigate('/contact')}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive('/contact') ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <PhoneCall className="w-4 h-4 text-emerald-600" />
                  <span>تواصل والدعم الفني</span>
                </div>
              </button>
            </div>
          </div>

          <div className="shrink-0 p-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
            <p className="font-bold text-slate-700">وياك © 2026</p>            <p className="text-[10px] mt-0.5">التوصيل الفائق من المتاجر المحلية</p>
          </div>
        </div>
      </div>
    </div>
  );
};