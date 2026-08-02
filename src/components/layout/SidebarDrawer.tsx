import React from 'react';
import { StorageRepo } from '../../lib/storage';
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
  ChevronLeft
} from 'lucide-react';

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: string;
  onNavigate: (tab: string, param?: string) => void;
  currentUser: UserProfile | null;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  isOpen,
  onClose,
  currentTab,
  onNavigate,
  currentUser,
}) => {
  if (!isOpen) return null;

  const role: UserRole = currentUser?.role || 'customer';

  const handleItemClick = (tab: string, param?: string) => {
    onNavigate(tab, param);
    onClose();
  };

  const handleLogout = () => {
    StorageRepo.logout();
    onNavigate('landing');
    onClose();
  };

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
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Slide-out Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex h-full h-screen z-50">
        <div className="w-screen max-w-xs sm:max-w-sm h-full h-screen bg-white shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-250 ease-out border-l border-slate-200">
          
          {/* Top Drawer Header */}
          <div className="shrink-0 p-4 sm:p-5 border-b border-slate-100 bg-slate-900 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/icon.png"
                  alt="على بابك"
                  className="w-10 h-10 rounded-xl object-cover shadow-md border border-amber-400/40"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h2 className="font-extrabold text-base text-white tracking-tight leading-tight">
                    على بابك
                  </h2>
                  <p className="text-[11px] text-emerald-400 font-medium mt-0.5">
                    القائمة الملاحة الشاملة
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="إغلاق القائمة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile Card Header */}
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
                  onClick={handleLogout}
                  className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="mt-4 pt-3 border-t border-slate-800">
                <button
                  onClick={() => handleItemClick('auth')}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20"
                >
                  <LogIn className="w-4 h-4" />
                  <span>تسجيل الدخول / حساب جديد</span>
                </button>
              </div>
            )}
          </div>

          {/* Navigation Links List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* Customer Navigation */}
            {role === 'customer' && (
              <div className="space-y-1">
                <p className="text-[11px] font-black text-slate-400 px-3 uppercase tracking-wider mb-2">
                  تصفح التسوق والطلبات
                </p>

                <button
                  onClick={() => handleItemClick('landing')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'landing' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <StoreIcon className="w-4 h-4" />
                    <span>الرئيسية</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('customer-stores')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'customer-stores' || currentTab === 'customer-store-detail' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <StoreIcon className="w-4 h-4" />
                    <span>تصفح المتاجر</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('search')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'search' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Search className="w-4 h-4" />
                    <span>البحث الشامل</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('categories-browse')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'categories-browse' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutGrid className="w-4 h-4" />
                    <span>الأقسام</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('customer-orders')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab.startsWith('customer-order') || currentTab === 'order-confirmation' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ListOrdered className="w-4 h-4" />
                    <span>طلباتي</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('customer-addresses')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'customer-addresses' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4" />
                    <span>عناويني</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('profile')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'profile' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <UserIcon className="w-4 h-4" />
                    <span>حسابي الشخصي</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('notifications')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'notifications' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
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
                  onClick={() => handleItemClick('store-dashboard')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'store-dashboard' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <StoreIcon className="w-4 h-4" />
                    <span>لوحة المحل</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('store-orders')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'store-orders' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag className="w-4 h-4" />
                    <span>الطلبات الواردة</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('store-products')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'store-products' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Package className="w-4 h-4" />
                    <span>المنتجات والمخزون</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('store-reviews')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'store-reviews' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Star className="w-4 h-4" />
                    <span>تقييمات العملاء</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('store-payouts')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'store-payouts' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <DollarSign className="w-4 h-4" />
                    <span>المستحقات والسحب</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('store-analytics')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'store-analytics' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <TrendingUp className="w-4 h-4" />
                    <span>التقارير المالية</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('store-notifications')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'store-notifications' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bell className="w-4 h-4" />
                    <span>الإشعارات</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('store-settings')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'store-settings' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
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
                  onClick={() => handleItemClick('delivery-dashboard')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'delivery-dashboard' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bike className="w-4 h-4" />
                    <span>لوحة الكابتن</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('delivery-available')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'delivery-available' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag className="w-4 h-4" />
                    <span>الطلبات المتاحة</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('delivery-active')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'delivery-active' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4" />
                    <span>الرحلة الجارية</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('delivery-history')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'delivery-history' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <DollarSign className="w-4 h-4" />
                    <span>سجل التوصيل</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('delivery-earnings')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'delivery-earnings' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <DollarSign className="w-4 h-4" />
                    <span>محفظة الأرباح</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('delivery-profile')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'delivery-profile' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <UserIcon className="w-4 h-4" />
                    <span>ملف الكابتن</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('delivery-notifications')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'delivery-notifications' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
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
                  onClick={() => handleItemClick('delivery-supervisor-dashboard')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'delivery-supervisor-dashboard' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
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
                  onClick={() => handleItemClick('finance-admin-dashboard')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'finance-admin-dashboard' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
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
                  onClick={() => handleItemClick('orders-manager-dashboard')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'orders-manager-dashboard' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
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
                  onClick={() => handleItemClick('admin-dashboard')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'admin-dashboard' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>لوحة القيادة (نظرة عامة)</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('admin-stores-applications')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'admin-stores-applications' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <StoreIcon className="w-4 h-4" />
                    <span>طلبات انضمام المتاجر</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('admin-stores')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'admin-stores' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <StoreIcon className="w-4 h-4" />
                    <span>المتاجر والشركاء</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('admin-agents')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'admin-agents' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Bike className="w-4 h-4" />
                    <span>الكباتن والمندوبين</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('admin-orders')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'admin-orders' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <ShoppingBag className="w-4 h-4" />
                    <span>غرفة متابعة الطلبات</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('admin-zones')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'admin-zones' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className="w-4 h-4" />
                    <span>مناطق التوصيل</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('admin-coupons')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'admin-coupons' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Ticket className="w-4 h-4" />
                    <span>خصومات الكوبونات</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('admin-customers')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'admin-customers' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4" />
                    <span>المستخدمون والعملاء</span>
                  </div>
                  <ChevronLeft className="w-4 h-4 opacity-60" />
                </button>

                <button
                  onClick={() => handleItemClick('admin-payouts')}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'admin-payouts' ? theme.bgActive : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <DollarSign className="w-4 h-4" />
                    <span>طلبات سحب الأرباح</span>
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
                onClick={() => handleItemClick('about')}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  currentTab === 'about' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Info className="w-4 h-4 text-emerald-600" />
                  <span>عن منصة على بابك</span>
                </div>
              </button>

              <button
                onClick={() => handleItemClick('contact')}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  currentTab === 'contact' ? 'bg-slate-100 text-slate-900' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <PhoneCall className="w-4 h-4 text-emerald-600" />
                  <span>تواصل والدعم الفني</span>
                </div>
              </button>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="shrink-0 p-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
            <p className="font-bold text-slate-700">على بابك © 2026</p>
            <p className="text-[10px] mt-0.5">التوصيل الفائق من المتاجر المحلية</p>
          </div>

        </div>
      </div>
    </div>
  );
};
