import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../lib/storage';
import { subscribeToNotifications } from '../../lib/supabase';
import { useCartStore } from '../../stores/cart-store';
import { SidebarDrawer } from './SidebarDrawer';
import { UserProfile, Order, DEFAULT_TAB_BY_ROLE } from '../../types/domain';
import {
  ShoppingBag,
  MapPin,
  Truck,
  Store,
  Bike,
  ShieldCheck,
  User,
  ListOrdered,
  ChevronDown,
  Sparkles,
  PhoneCall,
  Menu,
  X,
  LogIn,
  UserPlus,
  Bell
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string, param?: string) => void;
  onOpenCart: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onNavigate,
  onOpenCart,
}) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(StorageRepo.getCurrentUser());
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [selectedZone, setSelectedZone] = useState('المعادي وشارع 9');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const cartItemCount = useCartStore((state) => state.getItemCount());

  useEffect(() => {
    const checkOrdersAndNotifications = () => {
      const user = StorageRepo.getCurrentUser();
      setCurrentUser(user);

      // Check unread notifications count
      const notifications = StorageRepo.getNotifications(user?.id);
      const unread = notifications.filter((n) => !n.is_read).length;
      setUnreadNotifCount(unread);

      if (user) {
        const allOrders = StorageRepo.getOrders();
        let userActive: Order[] = [];
        if (user.role === 'customer') {
          userActive = allOrders.filter(
            (o) => o.customer_id === user.id && !['delivered', 'cancelled', 'rejected'].includes(o.status)
          );
        } else if (user.role === 'store_owner' && user.associated_store_id) {
          userActive = allOrders.filter(
            (o) => o.store_id === user.associated_store_id && !['delivered', 'cancelled', 'rejected'].includes(o.status)
          );
        } else if (user.role === 'delivery_agent') {
          const agent = StorageRepo.getAgentByUserId(user.id);
          const agentId = agent?.id || user.id;
          userActive = allOrders.filter(
            (o) => (o.delivery_agent_id === agentId || o.delivery_agent_id === user.id) && !['delivered', 'cancelled', 'rejected'].includes(o.status)
          );
        }
        setActiveOrders(userActive);
      }
    };

    checkOrdersAndNotifications();
    const unsubscribe = subscribeToStorageChange(() => {
      checkOrdersAndNotifications();
    });
    return unsubscribe;
  }, []);

  // Real-time notification updates when user is logged in
  useEffect(() => {
    if (!currentUser?.id) {
      setUnreadNotifCount(0);
      return;
    }

    const syncUnread = () => {
      const notifications = StorageRepo.getNotifications(currentUser.id);
      const unread = notifications.filter((n) => !n.is_read).length;
      setUnreadNotifCount(unread);
    };

    // Refresh immediately from Supabase on login/mount
    StorageRepo.refreshNotifications(currentUser.id)
      .then(() => {
        syncUnread();
      })
      .catch(() => {
        syncUnread();
      });

    // Real-time listener for new/updated notifications
    const unsubscribeNotifs = subscribeToNotifications(currentUser.id, () => {
      StorageRepo.refreshNotifications(currentUser.id)
        .then(() => {
          syncUnread();
        })
        .catch(() => {
          syncUnread();
        });
    });

    // Clean up channel on logout or unmount
    return () => {
      unsubscribeNotifs();
    };
  }, [currentUser?.id]);

  const role = currentUser?.role || 'customer';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs dir-rtl">
      {/* Top Banner for Active Tracking Alert */}
      {activeOrders.length > 0 && (
        <div className="bg-emerald-600 text-white text-xs py-1.5 px-4 flex items-center justify-between font-medium">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping" />
              <span>
                {role === 'customer' && `لديك طلب نشط جاري متابعته (#${activeOrders[0]?.order_number || ''})`}
                {role === 'store_owner' && `لديك ${activeOrders.length} طلبات جديدة نرجو مراجعتها وتجهيزها!`}
                {role === 'delivery_agent' && `لديك طلب جاري توصيله للعميل (${activeOrders[0]?.order_number || ''})`}
              </span>
            </div>
            <button
              onClick={() => {
                const firstId = activeOrders[0]?.id;
                if (role === 'customer' && firstId) onNavigate('customer-order-detail', firstId);
                if (role === 'store_owner') onNavigate('store-orders');
                if (role === 'delivery_agent') onNavigate('delivery-active');
              }}
              className="underline font-bold hover:text-amber-200 text-xs shrink-0"
            >
              متابعة الآن ←
            </button>
          </div>
        </div>
      )}

      {/* Main Header Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo & Slogan */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('landing')}
              className="flex items-center gap-2 text-right group"
            >
              <img
                src="/icon.png"
                alt="على بابك"
                className="w-10 h-10 rounded-xl object-cover shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
              />
              <div>
                <span className="font-extrabold text-xl text-slate-900 tracking-tight block leading-none">
                  على بابك
                </span>
                <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                  منصة التوصيل المحلي الفائق
                </span>
              </div>
            </button>

            {/* Zone Selector for Customer */}
            {role === 'customer' && (
              <div className="hidden md:flex items-center gap-1.5 bg-slate-100/80 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium cursor-pointer transition-colors mr-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>المنطقة:</span>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="المعادي وشارع 9">المعادي وشارع 9</option>
                  <option value="مدينة نصر ومكرم عبيد">مدينة نصر ومكرم عبيد</option>
                  <option value="الزمالك والمهندسين">الزمالك والمهندسين</option>
                  <option value="مصر الجديدة والتجمع">مصر الجديدة والتجمع</option>
                </select>
              </div>
            )}
          </div>

          {/* Role Navigation Items (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1">
            {role === 'customer' && (
              <>
                <button
                  onClick={() => onNavigate('landing')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'landing' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>الرئيسية</span>
                </button>
                <button
                  onClick={() => onNavigate('customer-stores')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    currentTab === 'customer-stores' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Store className="w-4 h-4" />
                  <span>تصفح المتاجر</span>
                </button>
                <button
                  onClick={() => onNavigate('customer-orders')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    currentTab === 'customer-orders' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ListOrdered className="w-4 h-4" />
                  <span>طلباتي</span>
                </button>
                <button
                  onClick={() => onNavigate('about')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'about' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>عن المنصة</span>
                </button>
                <button
                  onClick={() => onNavigate('contact')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'contact' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>اتصل بنا</span>
                </button>
              </>
            )}

            {role === 'store_owner' && (
              <>
                <button
                  onClick={() => onNavigate('store-dashboard')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'store-dashboard' ? 'bg-blue-50 text-blue-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  لوحة التحكم
                </button>
                <button
                  onClick={() => onNavigate('store-orders')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all relative ${
                    currentTab === 'store-orders' ? 'bg-blue-50 text-blue-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  الطلبات الواردة
                  {activeOrders.length > 0 && (
                    <span className="ms-1.5 bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                      {activeOrders.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => onNavigate('store-products')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'store-products' ? 'bg-blue-50 text-blue-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  إدارة المنتجات
                </button>
                <button
                  onClick={() => onNavigate('store-analytics')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'store-analytics' ? 'bg-blue-50 text-blue-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  الإحصائيات والتقارير
                </button>
                <button
                  onClick={() => onNavigate('store-settings')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'store-settings' ? 'bg-blue-50 text-blue-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  إعدادات المتجر
                </button>
              </>
            )}

            {role === 'delivery_agent' && (
              <>
                <button
                  onClick={() => onNavigate('delivery-dashboard')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'delivery-dashboard' ? 'bg-orange-50 text-orange-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  لوحة المندوب
                </button>
                <button
                  onClick={() => onNavigate('delivery-available')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'delivery-available' ? 'bg-orange-50 text-orange-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  الطلبات المتاحة
                </button>
                <button
                  onClick={() => onNavigate('delivery-active')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'delivery-active' ? 'bg-orange-50 text-orange-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  رحلة التوصيل الحالية
                </button>
                <button
                  onClick={() => onNavigate('delivery-history')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'delivery-history' ? 'bg-orange-50 text-orange-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  الأرباح والسجل
                </button>
              </>
            )}

            {role === 'delivery_supervisor' && (
              <>
                <button
                  onClick={() => onNavigate('delivery-supervisor-dashboard')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'delivery-supervisor-dashboard' ? 'bg-orange-50 text-orange-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  لوحة مسؤول الكباتن
                </button>
              </>
            )}

            {role === 'finance_admin' && (
              <>
                <button
                  onClick={() => onNavigate('finance-admin-dashboard')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'finance-admin-dashboard' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  الإدارة المالية والنسب
                </button>
              </>
            )}

            {role === 'orders_manager' && (
              <>
                <button
                  onClick={() => onNavigate('orders-manager-dashboard')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'orders-manager-dashboard' ? 'bg-indigo-50 text-indigo-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  غرفة التحكم بالطلبات
                </button>
              </>
            )}

            {role === 'admin' && (
              <>
                <button
                  onClick={() => onNavigate('admin-dashboard')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'admin-dashboard' ? 'bg-purple-50 text-purple-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  نظرة عامة
                </button>
                <button
                  onClick={() => onNavigate('admin-stores-applications')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'admin-stores-applications' ? 'bg-purple-50 text-purple-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  طلبات انضمام المتاجر
                </button>
                <button
                  onClick={() => onNavigate('admin-stores')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'admin-stores' ? 'bg-purple-50 text-purple-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  المتاجر
                </button>
                <button
                  onClick={() => onNavigate('admin-agents')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'admin-agents' ? 'bg-purple-50 text-purple-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  المندوبين
                </button>
                <button
                  onClick={() => onNavigate('admin-orders')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'admin-orders' ? 'bg-purple-50 text-purple-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  غرفة الطلبات
                </button>
                <button
                  onClick={() => onNavigate('admin-zones')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'admin-zones' ? 'bg-purple-50 text-purple-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  مناطق التوصيل
                </button>
                <button
                  onClick={() => onNavigate('admin-coupons')}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    currentTab === 'admin-coupons' ? 'bg-purple-50 text-purple-800' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  الكوبونات
                </button>
              </>
            )}
          </nav>

          {/* Right Action Bar (Cart + Auth + Role Switcher + Side Menu Toggle) */}
          <div className="flex items-center gap-2">
            {/* Login / Register Button - ONLY shown if guest/logged out */}
            {!currentUser && (
              <button
                onClick={() => onNavigate('auth')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                title="تسجيل الدخول أو حساب جديد"
              >
                <LogIn className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">تسجيل الدخول / حساب جديد</span>
                <span className="sm:hidden">دخول</span>
              </button>
            )}

            {/* Notification Bell Button with Badge Counter */}
            <button
              onClick={() => onNavigate('notifications')}
              className={`relative p-2 rounded-xl transition-all border flex items-center justify-center ${
                currentTab === 'notifications'
                  ? 'bg-purple-100 text-purple-800 border-purple-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
              title="الإشعارات والتنبيهات"
            >
              <Bell className="w-5 h-5 text-purple-700" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-black text-[10px] w-4.5 h-4.5 px-1 rounded-full flex items-center justify-center animate-bounce shadow-xs">
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </span>
              )}
            </button>

            {/* Cart Trigger Button for Customer */}
            {role === 'customer' && (
              <button
                onClick={onOpenCart}
                className="relative bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-3.5 py-2 rounded-xl shadow-md transition-all flex items-center gap-1.5"
              >
                <ShoppingBag className="w-4 h-4 text-slate-950" />
                <span className="hidden sm:inline">السلة</span>
                {cartItemCount > 0 && (
                  <span className="bg-slate-950 text-white font-black text-[11px] w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                    {cartItemCount}
                  </span>
                )}
              </button>
            )}

            {/* Account Profile Badge */}
            {currentUser && (
              <button
                onClick={() => {
                  if (role === 'customer') onNavigate('profile');
                  else if (role === 'store_owner') onNavigate('store-settings');
                  else if (role === 'delivery_agent') onNavigate('delivery-profile');
                  else onNavigate(DEFAULT_TAB_BY_ROLE[role] || 'admin-dashboard');
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-800 transition-colors"
                title="الحساب الشخصي"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-[10px]">
                  {currentUser.name ? currentUser.name.charAt(0) : 'م'}
                </div>
                <span className="hidden sm:inline text-xs font-bold max-w-[100px] truncate">
                  {currentUser.name}
                </span>
              </button>
            )}

            {/* Side Menu Bar Toggle Button (Drawer Trigger) */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center gap-1.5 font-extrabold text-xs border border-slate-200"
              title="فتح القائمة الجانبية"
            >
              <Menu className="w-5 h-5 text-emerald-600" />
              <span className="hidden md:inline">القائمة</span>
            </button>
          </div>
        </div>
      </div>

      {/* Side Menu Drawer Component */}
      <SidebarDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentTab={currentTab}
        onNavigate={onNavigate}
        currentUser={currentUser}
      />
    </header>
  );
};
