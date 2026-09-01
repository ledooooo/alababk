import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { StorageRepo, subscribeToStorageChange } from '../../lib/storage';
import { subscribeToNotifications, supabase } from '../../lib/supabase';
import { useCartStore } from '../../stores/cart-store';
import { SidebarDrawer } from './SidebarDrawer';
import { UserProfile, Order, DeliveryZone } from '../../types/domain';
import { playNotificationSound, unlockNotificationAudio } from '../../lib/notificationSound';
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
  const [selectedZone, setSelectedZone] = useState('');
  const [zones, setZones] = useState<DeliveryZone[]>(StorageRepo.getZones());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const originalTitleRef = useRef<string>(typeof document !== 'undefined' ? document.title : '');
  const flashIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // فك قفل تشغيل الصوت بمجرد أول تفاعل من المستخدم مع الصفحة (متطلب أمان
  // من المتصفحات — راجع notificationSound.ts). Navbar موجود في كل صفحة،
  // فده أضمن مكان نعمله فيه مرة واحدة بس.
  useEffect(() => {
    unlockNotificationAudio();
  }, []);

  // وميض عنوان التاب لما التاب يبقى مش هو المفتوح قدام المستخدم، عشان
  // الإشعار يبقى "مرئي بشكل واضح" حتى لو مركّز في تاب/برنامج تاني
  const flashTabTitle = () => {
    if (typeof document === 'undefined' || !document.hidden) return;
    if (flashIntervalRef.current) return; // وميض شغال بالفعل، متكررش
    let showAlert = true;
    flashIntervalRef.current = setInterval(() => {
      document.title = showAlert ? '🔔 إشعار جديد!' : originalTitleRef.current;
      showAlert = !showAlert;
    }, 1200);

    const stopFlashing = () => {
      if (flashIntervalRef.current) {
        clearInterval(flashIntervalRef.current);
        flashIntervalRef.current = null;
      }
      document.title = originalTitleRef.current;
      document.removeEventListener('visibilitychange', stopFlashing);
    };
    document.addEventListener('visibilitychange', stopFlashing);
  };
  
  // استخدم useCartStore بشكل صحيح
  const cartItemCount = useCartStore((state) => state.getItemCount());
  const openCart = useCartStore((state) => state.openCart);
  const currentPath = location.pathname;

  useEffect(() => {
    setUser(currentUser);
  }, [currentUser]);

  // زر اختيار المنطقة يعرض المناطق الحقيقية اللي بيديرها الأدمن من
  // AdminZonesView (StorageRepo.getZones())، مش قائمة هاردكودد ثابتة.
  useEffect(() => {
    const syncZones = () => {
      const list = StorageRepo.getZones();
      setZones(list);
      setSelectedZone((prev) => {
        if (prev && list.some((z) => z.name === prev)) return prev;
        const firstActive = list.find((z) => z.is_active) || list[0];
        return firstActive?.name || '';
      });
    };

    syncZones();
    const unsubscribe = subscribeToStorageChange((detail) => {
      if (detail.entityType === 'zone') syncZones();
    });
    return unsubscribe;
  }, []);

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
    // مهم: كان الكولباك ده قبل كده بيتنفذ عند أي تغيير في أي جدول (category, product,
    // review, coupon, zone, payout...) حتى لو مالوش أي علاقة بالطلبات أو الإشعارات.
    // ده كان أكبر سبب في تضخيم الحلقة: أي fetch في أي مكان في التطبيق كان بيخلي الـNavbar
    // (اللي موجود في كل صفحة) يعمل fetch تاني لـnotifications/orders/currentStore.
    // دلوقتي بيستجيب بس للأنواع اللي فعلاً بتأثر على شكل الـNavbar.
    const RELEVANT_TYPES = new Set(['notification', 'order', 'store', 'user']);
    const unsubscribe = subscribeToStorageChange((detail) => {
      if (RELEVANT_TYPES.has(detail.entityType)) {
        checkOrdersAndNotifications();
      }
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

    const unsubscribeNotifs = subscribeToNotifications(user.id, (payload) => {
      StorageRepo.refreshNotifications(user.id).then(syncUnread).catch(syncUnread);

      // الصوت والوميض بس عند وصول إشعار حقيقي جديد (INSERT فعلي من
      // الـtrigger)، مش عند أي إعادة تحميل عادية — ومقصورين على صاحب
      // المتجر والمندوب زي ما اتطلب بالظبط (أدوار محتاجة تنبيه فوري لطلبات
      // شغالة، بعكس العميل اللي بيتابع طلبه هو بنفسه وهو فاتح التطبيق).
      if (payload.eventType === 'INSERT' && (user.role === 'store_owner' || user.role === 'delivery_agent')) {
        playNotificationSound();
        flashTabTitle();
      }
    });

    return () => {
      unsubscribeNotifs();
      if (flashIntervalRef.current) {
        clearInterval(flashIntervalRef.current);
        flashIntervalRef.current = null;
        document.title = originalTitleRef.current;
      }
    };
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
                alt="وياك"
                className="w-10 h-10 rounded-xl object-cover shadow-md shadow-emerald-600/20 group-hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
              />
              <div>
                <span className="font-extrabold text-xl text-slate-900 tracking-tight block leading-none">
                  وياك
                </span>
              </div>
            </button>

            {role === 'customer' && zones.length > 0 && (
              <div className="hidden md:flex items-center gap-1.5 bg-slate-100/80 border border-slate-200 hover:border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium cursor-pointer transition-colors mr-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>المنطقة:</span>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="bg-transparent font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.name}>{zone.name}</option>
                  ))}
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