import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { StorageRepo, subscribeToStorageChange } from '../../lib/storage';
import { subscribeToNotifications, supabase } from '../../lib/supabase';
import { useCartStore } from '../../stores/cart-store';
import { SidebarDrawer } from './SidebarDrawer';
import { UserProfile, Order } from '../../types/domain';
import {
  ShoppingBag,
  MapPin,
  LogIn,
  Bell,
  Menu,
} from 'lucide-react';

interface NavbarProps {
  currentUser: UserProfile | null;
}

export const Navbar: React.FC<NavbarProps> = ({ currentUser }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<UserProfile | null>(currentUser);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [selectedZone, setSelectedZone] = useState('المعادي وشارع 9');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  
  // استخدم useCartStore بشكل صحيح
  const cartItemCount = useCartStore((state) => state.getItemCount());
  const openCart = useCartStore((state) => state.openCart);
  const currentPath = location.pathname;

  useEffect(() => {
    setUser(currentUser);
  }, [currentUser]);

  useEffect(() => {
    const checkOrdersAndNotifications = async () => {
      const loggedUser = StorageRepo.getCurrentUser();
      setUser(loggedUser);

      const notifications = StorageRepo.getNotifications(loggedUser?.id);
      const unread = notifications.filter((n) => !n.is_read).length;
      setUnreadNotifCount(unread);

      if (loggedUser) {
        const allOrders = StorageRepo.getOrders();
        let userActive: Order[] = [];
        if (loggedUser.role === 'customer') {
          userActive = allOrders.filter(
            (o) => o.customer_id === loggedUser.id && !['delivered', 'cancelled', 'rejected'].includes(o.status)
          );
        } else if (loggedUser.role === 'store_owner') {
          const store = await StorageRepo.getCurrentStore();
          if (store) {
            userActive = allOrders.filter(
              (o) => o.store_id === store.id && !['delivered', 'cancelled', 'rejected'].includes(o.status)
            );
          }
        } else if (loggedUser.role === 'delivery_agent') {
          const agent = StorageRepo.getAgentByUserId(loggedUser.id);
          const agentId = agent?.id || loggedUser.id;
          userActive = allOrders.filter(
            (o) => (o.delivery_agent_id === agentId || o.delivery_agent_id === loggedUser.id) && !['delivered', 'cancelled', 'rejected'].includes(o.status)
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

  useEffect(() => {
    if (!user?.id) {
      setUnreadNotifCount(0);
      return;
    }

    const syncUnread = () => {
      const notifications = StorageRepo.getNotifications(user.id);
      const unread = notifications.filter((n) => !n.is_read).length;
      setUnreadNotifCount(unread);
    };

    StorageRepo.refreshNotifications(user.id).then(syncUnread).catch(syncUnread);

    const unsubscribeNotifs = subscribeToNotifications(user.id, () => {
      StorageRepo.refreshNotifications(user.id).then(syncUnread).catch(syncUnread);
    });

    return () => unsubscribeNotifs();
  }, [user?.id]);

  const role = user?.role || 'customer';

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut().catch(() => {});
    StorageRepo.logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs dir-rtl">
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
                if (role === 'customer' && firstId) navigate(`/orders/${firstId}`);
                else if (role === 'store_owner') navigate('/store/orders');
                else if (role === 'delivery_agent') navigate('/delivery/active');
              }}
              className="underline font-bold hover:text-amber-200 text-xs shrink-0"
            >
              متابعة الآن ←
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
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

          <div className="flex items-center gap-2">
            {!user && (
              <button
                onClick={() => navigate('/auth')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
              >
                <LogIn className="w-3.5 h-3.5 text-white" />
                <span className="hidden sm:inline">تسجيل الدخول / حساب جديد</span>
                <span className="sm:hidden">دخول</span>
              </button>
            )}

            <button
              onClick={() => navigate('/notifications')}
              className={`relative p-2 rounded-xl transition-all border flex items-center justify-center ${
                currentPath === '/notifications'
                  ? 'bg-purple-100 text-purple-800 border-purple-300'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
              }`}
            >
              <Bell className="w-5 h-5 text-purple-700" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-600 text-white font-black text-[10px] w-4.5 h-4.5 px-1 rounded-full flex items-center justify-center animate-bounce shadow-xs">
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </span>
              )}
            </button>

            {role === 'customer' && (
              <button
                onClick={openCart}
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

            {user && (
              <button
                onClick={() => {
                  if (role === 'customer') navigate('/profile');
                  else if (role === 'store_owner') navigate('/store/settings');
                  else if (role === 'delivery_agent') navigate('/delivery/profile');
                  else navigate('/admin');
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-800 transition-colors"
              >
                <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-[10px]">
                  {user.name ? user.name.charAt(0) : 'م'}
                </div>
                <span className="hidden sm:inline text-xs font-bold max-w-[100px] truncate">
                  {user.name}
                </span>
              </button>
            )}

            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors flex items-center gap-1.5 font-extrabold text-xs border border-slate-200"
            >
              <Menu className="w-5 h-5 text-emerald-600" />
              <span className="hidden md:inline">القائمة</span>
            </button>
          </div>
        </div>
      </div>

      <SidebarDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentPath={currentPath}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        currentUser={user}
      />
    </header>
  );
};