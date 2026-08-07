import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { StorageRepo, subscribeToStorageChange } from './lib/storage';
import { UserRole, UserProfile, Store, DEFAULT_TAB_BY_ROLE, ALLOWED_TABS_BY_ROLE } from './types/domain';
import { Navbar } from './components/layout/Navbar';
import { SplashScreen } from './components/layout/SplashScreen';
import { CartDrawer } from './components/cart/CartDrawer';
import { PushNotificationToast } from './components/shared/PushNotificationToast';
import { PwaInstallPrompt } from './components/pwa/PwaInstallPrompt';
import { useCartStore } from './stores/cart-store';

// Customer Views
import { CustomerStoresView } from './components/views/customer/CustomerStoresView';
import { CustomerStoreDetailView } from './components/views/customer/CustomerStoreDetailView';
import { CustomerCheckoutView } from './components/views/customer/CustomerCheckoutView';
import { CustomerOrdersView } from './components/views/customer/CustomerOrdersView';
import { CustomerOrderDetailView } from './components/views/customer/CustomerOrderDetailView';
import { CustomerAddressesView } from './components/views/customer/CustomerAddressesView';
import { SearchView } from './components/views/customer/SearchView';
import { CategoriesBrowseView } from './components/views/customer/CategoriesBrowseView';
import { ProfileView } from './components/views/customer/ProfileView';
import { OrderConfirmationView } from './components/views/customer/OrderConfirmationView';

// Auth Modals & Views
import { ForgotPasswordModal, ResetPasswordModal } from './components/modals/AuthModals';
import { AuthView } from './components/views/public/AuthView';

// Public Views
import { LandingView } from './components/views/public/LandingView';
import { AboutView } from './components/views/public/AboutView';
import { ApplyStoreView } from './components/views/public/ApplyStoreView';
import { ApplyAgentView } from './components/views/public/ApplyAgentView';
import { ContactView } from './components/views/public/ContactView';
import { TermsPrivacyView } from './components/views/public/TermsPrivacyView';
import { NotificationsView } from './components/views/customer/NotificationsView';
import { NotFoundView } from './components/views/public/NotFoundView';

// Lazy Loaded Store Owner Views
const StoreDashboardView = lazy(() => import('./components/views/store/StoreDashboardView').then(m => ({ default: m.StoreDashboardView })));
const StoreOrdersView = lazy(() => import('./components/views/store/StoreOrdersView').then(m => ({ default: m.StoreOrdersView })));
const StoreProductsView = lazy(() => import('./components/views/store/StoreProductsView').then(m => ({ default: m.StoreProductsView })));
const StoreSettingsView = lazy(() => import('./components/views/store/StoreSettingsView').then(m => ({ default: m.StoreSettingsView })));
const StoreAnalyticsView = lazy(() => import('./components/views/store/StoreAnalyticsView').then(m => ({ default: m.StoreAnalyticsView })));
const StoreReviewsView = lazy(() => import('./components/views/store/StoreReviewsView').then(m => ({ default: m.StoreReviewsView })));
const StorePayoutsView = lazy(() => import('./components/views/store/StorePayoutsView').then(m => ({ default: m.StorePayoutsView })));
const StoreNotificationsView = lazy(() => import('./components/views/store/StoreNotificationsView').then(m => ({ default: m.StoreNotificationsView })));

// Lazy Loaded Delivery Agent Views
const DeliveryDashboardView = lazy(() => import('./components/views/delivery/DeliveryDashboardView').then(m => ({ default: m.DeliveryDashboardView })));
const DeliveryAvailableView = lazy(() => import('./components/views/delivery/DeliveryAvailableView').then(m => ({ default: m.DeliveryAvailableView })));
const DeliveryActiveView = lazy(() => import('./components/views/delivery/DeliveryActiveView').then(m => ({ default: m.DeliveryActiveView })));
const DeliveryHistoryView = lazy(() => import('./components/views/delivery/DeliveryHistoryView').then(m => ({ default: m.DeliveryHistoryView })));
const DeliveryEarningsView = lazy(() => import('./components/views/delivery/DeliveryEarningsView').then(m => ({ default: m.DeliveryEarningsView })));
const DeliveryProfileView = lazy(() => import('./components/views/delivery/DeliveryProfileView').then(m => ({ default: m.DeliveryProfileView })));
const DeliveryNotificationsView = lazy(() => import('./components/views/delivery/DeliveryNotificationsView').then(m => ({ default: m.DeliveryNotificationsView })));

// Lazy Loaded Admin Views
const AdminDashboardView = lazy(() => import('./components/views/admin/AdminDashboardView').then(m => ({ default: m.AdminDashboardView })));
const AdminStoresApplicationsView = lazy(() => import('./components/views/admin/AdminStoresApplicationsView').then(m => ({ default: m.AdminStoresApplicationsView })));
const AdminStoresView = lazy(() => import('./components/views/admin/AdminStoresView').then(m => ({ default: m.AdminStoresView })));
const AdminAgentsView = lazy(() => import('./components/views/admin/AdminAgentsView').then(m => ({ default: m.AdminAgentsView })));
const AdminOrdersView = lazy(() => import('./components/views/admin/AdminOrdersView').then(m => ({ default: m.AdminOrdersView })));
const AdminZonesView = lazy(() => import('./components/views/admin/AdminZonesView').then(m => ({ default: m.AdminZonesView })));
const AdminCouponsView = lazy(() => import('./components/views/admin/AdminCouponsView').then(m => ({ default: m.AdminCouponsView })));
const AdminCategoriesView = lazy(() => import('./components/views/admin/AdminCategoriesView').then(m => ({ default: m.AdminCategoriesView })));
const AdminPayoutsView = lazy(() => import('./components/views/admin/AdminPayoutsView').then(m => ({ default: m.AdminPayoutsView })));
const AdminReviewsView = lazy(() => import('./components/views/admin/AdminReviewsView').then(m => ({ default: m.AdminReviewsView })));
const AdminNotificationsView = lazy(() => import('./components/views/admin/AdminNotificationsView').then(m => ({ default: m.AdminNotificationsView })));
const AdminCustomersView = lazy(() => import('./components/views/admin/AdminCustomersView').then(m => ({ default: m.AdminCustomersView })));
const AdminAnalyticsView = lazy(() => import('./components/views/admin/AdminAnalyticsView').then(m => ({ default: m.AdminAnalyticsView })));
const AdminPlatformSettingsView = lazy(() => import('./components/views/admin/AdminPlatformSettingsView').then(m => ({ default: m.AdminPlatformSettingsView })));
const AdminActivityLogView = lazy(() => import('./components/views/admin/AdminActivityLogView').then(m => ({ default: m.AdminActivityLogView })));
const AdminSupabaseSync = lazy(() => import('./components/views/admin/AdminSupabaseSync').then(m => ({ default: m.AdminSupabaseSync })));

// Lazy Loaded Specialized Operational Views
const DeliverySupervisorDashboardView = lazy(() => import('./components/views/supervisor/DeliverySupervisorDashboardView').then(m => ({ default: m.DeliverySupervisorDashboardView })));
const FinanceAdminDashboardView = lazy(() => import('./components/views/finance/FinanceAdminDashboardView').then(m => ({ default: m.FinanceAdminDashboardView })));
const OrdersManagerDashboardView = lazy(() => import('./components/views/orders/OrdersManagerDashboardView').then(m => ({ default: m.OrdersManagerDashboardView })));

function ViewFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-sm font-semibold text-slate-600">جاري تحميل الشاشة...</p>
    </div>
  );
}

import {
  ShoppingBag,
  ListOrdered,
  MapPin,
  Store as StoreIcon,
  Package,
  TrendingUp,
  Settings,
  Bike,
  ShieldCheck,
  Tag,
  DollarSign,
  FolderTree,
  Bell,
  Star,
  Database,
  Search as SearchIcon,
  User as UserIcon,
  LayoutGrid,
  Users,
  Shield
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => StorageRepo.getCurrentUser());
  const [activeTab, setActiveTab] = useState<string>('customer-stores');

  // Customer navigation state
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const { isOpen, setIsOpen } = useCartStore();

  const syncUserProfileFromSession = async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      setCurrentUser(null);
      StorageRepo.setCurrentUser(null);
      useCartStore.getState().setUserId(null);
      return null;
    }

    const userId = currentSession.user.id;
    useCartStore.getState().setUserId(userId);

    // Explicitly sync data with Supabase after real session is confirmed
    StorageRepo.syncWithSupabase().catch(() => {});

    try {
      const { data: profile } = await (supabase
        .from('profiles') as any)
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profile) {
        const userProfile: UserProfile = {
          id: profile.id,
          email: profile.email || currentSession.user.email || '',
          name: profile.full_name || currentSession.user.user_metadata?.full_name || 'مستخدم',
          full_name: profile.full_name,
          phone: profile.phone || currentSession.user.user_metadata?.phone || '',
          role: (profile.role as UserRole) || 'customer',
          avatar_url: profile.avatar_url,
          is_active: profile.is_active ?? true,
          created_at: profile.created_at || currentSession.user.created_at,
        };
        setCurrentUser(userProfile);
        StorageRepo.setCurrentUser(userProfile);
        return userProfile;
      } else {
        const fallbackUser: UserProfile = {
          id: userId,
          email: currentSession.user.email || '',
          name: currentSession.user.user_metadata?.full_name || 'مستخدم',
          phone: currentSession.user.user_metadata?.phone || '',
          role: 'customer',
          created_at: currentSession.user.created_at,
        };
        setCurrentUser(fallbackUser);
        StorageRepo.setCurrentUser(fallbackUser);
        return fallbackUser;
      }
    } catch (err) {
      console.error('Error fetching user profile from database:', err);
      const cached = StorageRepo.getCurrentUser();
      if (cached && cached.id === userId) {
        setCurrentUser(cached);
        return cached;
      }
    }
    return null;
  };

  useEffect(() => {
    let isMounted = true;

    // 1. Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      syncUserProfileFromSession(session).finally(() => {
        if (isMounted) setIsLoading(false);
      });
    });

    // 2. Real-time Auth State Change Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        setSession(session);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          await syncUserProfileFromSession(session);
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          StorageRepo.setCurrentUser(null);
          useCartStore.getState().setUserId(null);
          setActiveTab('landing');
        }
        setIsLoading(false);
      }
    );

    const unsubscribeStorage = subscribeToStorageChange(() => {
      const user = StorageRepo.getCurrentUser();
      setCurrentUser(user);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      unsubscribeStorage();
    };
  }, []);

  const PUBLIC_TABS = [
    'landing', 'auth', 'about', 'apply-store',
    'apply-agent', 'contact', 'terms'
  ];

  const isPublicTab = PUBLIC_TABS.includes(activeTab);
  const isLoggedIn = !!session && !!currentUser;

  // AuthGuard and RoleGuard for protected routes
  useEffect(() => {
    if (isLoading) return;

    if (!isLoggedIn) {
      if (!isPublicTab) {
        setActiveTab('auth');
      }
    } else if (currentUser) {
      const role = currentUser.role || 'customer';
      const allowedTabs = ALLOWED_TABS_BY_ROLE[role] || [];
      const isAuthTab = activeTab === 'auth';
      const isAllowed = (isPublicTab && !isAuthTab) || allowedTabs.includes(activeTab);

      if (!isAllowed) {
        const defaultTab = DEFAULT_TAB_BY_ROLE[role] || 'customer-stores';
        setActiveTab(defaultTab);
      }
    }
  }, [isLoading, isLoggedIn, currentUser, isPublicTab, activeTab]);

  const activeUserProfile = currentUser;

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut().catch(() => {});
    StorageRepo.logout();
    useCartStore.getState().setUserId(null);
    setCurrentUser(null);
    setActiveTab('landing');
  }, []);

  const handleSelectStore = useCallback((storeOrId: Store | string) => {
    const storeId = typeof storeOrId === 'string' ? storeOrId : storeOrId.id;
    setSelectedStoreId(storeId);
    setActiveTab('customer-store-detail');
  }, []);

  const handleProceedToCheckout = useCallback(() => {
    setIsOpen(false);
    setActiveTab('customer-checkout');
  }, [setIsOpen]);

  const handleOrderPlaced = useCallback((orderId: string) => {
    setSelectedOrderId(orderId);
    setActiveTab('order-confirmation');
  }, []);

  const handleNavigate = useCallback((tab: string, param?: string) => {
    if (param) {
      if (tab === 'customer-store-detail') setSelectedStoreId(param);
      if (tab === 'customer-order-detail' || tab === 'order-confirmation') setSelectedOrderId(param);
    }
    setActiveTab(tab);
  }, []);

  const currentRole = activeUserProfile?.role || 'customer';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased dir-rtl selection:bg-emerald-500 selection:text-white flex flex-col">
      {/* Smart PWA Progressive Web App Install Banner */}
      <PwaInstallPrompt />

      {/* Real-time Push Notification Toast Overlay */}
      <PushNotificationToast onNavigate={handleNavigate} />

      {/* 5-Second Splash Screen */}
      {showSplash && (
        <SplashScreen
          durationSeconds={5}
          onFinish={() => setShowSplash(false)}
        />
      )}

      {/* Primary Navigation Bar */}
      <Navbar
        currentTab={activeTab}
        onNavigate={handleNavigate}
        onOpenCart={() => setIsOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-hidden">
        <Suspense fallback={<ViewFallback />}>
          {/* Public Global Views */}
          {activeTab === 'landing' && <LandingView onNavigate={handleNavigate} />}
          {activeTab === 'auth' && (
            <AuthView
              onSuccess={(user) => {
                setCurrentUser(user);
                const defaultTab = DEFAULT_TAB_BY_ROLE[user.role] || 'customer-stores';
                setActiveTab(defaultTab);
              }}
              onNavigate={(tab) => {
                if (tab === 'forgot-password') {
                  setShowForgotModal(true);
                } else {
                  setActiveTab(tab);
                }
              }}
            />
          )}
          {activeTab === 'about' && <AboutView onNavigate={handleNavigate} />}
          {activeTab === 'apply-store' && <ApplyStoreView onNavigate={handleNavigate} />}
          {activeTab === 'apply-agent' && <ApplyAgentView onNavigate={handleNavigate} />}
          {activeTab === 'contact' && <ContactView onNavigate={handleNavigate} />}
          {activeTab === 'terms' && <TermsPrivacyView />}

          {/* Customer Route Render */}
          {currentRole === 'customer' && !['landing', 'auth', 'about', 'apply-store', 'apply-agent', 'contact', 'terms'].includes(activeTab) && (
            <>
              {activeTab === 'customer-stores' && (
                <CustomerStoresView onSelectStore={handleSelectStore} />
              )}

              {activeTab === 'search' && (
                <SearchView
                  onSelectStore={handleSelectStore}
                  onNavigate={handleNavigate}
                />
              )}

              {activeTab === 'categories-browse' && (
                <CategoriesBrowseView onNavigate={handleNavigate} />
              )}

              {activeTab === 'profile' && (
                <ProfileView
                  onNavigate={handleNavigate}
                  onLogout={handleLogout}
                />
              )}

              {activeTab === 'customer-store-detail' && selectedStoreId && (
                <CustomerStoreDetailView
                  storeId={selectedStoreId}
                  onBack={() => setActiveTab('customer-stores')}
                  onOpenCart={() => setIsOpen(true)}
                />
              )}

              {activeTab === 'customer-checkout' && (
                <CustomerCheckoutView
                  onOrderPlaced={handleOrderPlaced}
                  onBack={() => setActiveTab('customer-stores')}
                />
              )}

              {activeTab === 'order-confirmation' && selectedOrderId && (
                <OrderConfirmationView
                  orderId={selectedOrderId}
                  onNavigate={handleNavigate}
                />
              )}

              {activeTab === 'customer-orders' && (
                <CustomerOrdersView
                  onSelectOrder={(id) => {
                    setSelectedOrderId(id);
                    setActiveTab('customer-order-detail');
                  }}
                  onBrowseStores={() => setActiveTab('customer-stores')}
                />
              )}

              {activeTab === 'customer-order-detail' && selectedOrderId && (
                <CustomerOrderDetailView
                  orderId={selectedOrderId}
                  onBack={() => setActiveTab('customer-orders')}
                />
              )}

              {activeTab === 'customer-addresses' && <CustomerAddressesView />}
              {activeTab === 'notifications' && <NotificationsView onNavigate={handleNavigate} />}
            </>
          )}

          {/* Store Owner Route Render */}
          {currentRole === 'store_owner' && !['landing', 'auth', 'about', 'apply-store', 'apply-agent', 'contact', 'terms'].includes(activeTab) && (
            <>
              {activeTab === 'store-dashboard' && (
                <StoreDashboardView onNavigate={(tab) => setActiveTab(tab)} />
              )}
              {activeTab === 'store-orders' && (
                <StoreOrdersView onNavigate={(tab) => setActiveTab(tab)} />
              )}
              {activeTab === 'store-products' && (
                <StoreProductsView onNavigate={(tab) => setActiveTab(tab)} />
              )}
              {activeTab === 'store-reviews' && (
                <StoreReviewsView onNavigate={(tab) => setActiveTab(tab)} />
              )}
              {activeTab === 'store-payouts' && (
                <StorePayoutsView onNavigate={(tab) => setActiveTab(tab)} />
              )}
              {activeTab === 'store-analytics' && (
                <StoreAnalyticsView onNavigate={(tab) => setActiveTab(tab)} />
              )}
              {activeTab === 'store-notifications' && (
                <StoreNotificationsView onNavigate={(tab) => setActiveTab(tab)} />
              )}
              {activeTab === 'store-settings' && (
                <StoreSettingsView onNavigate={(tab) => setActiveTab(tab)} />
              )}
            </>
          )}

          {/* Delivery Agent Route Render */}
          {currentRole === 'delivery_agent' && !['landing', 'auth', 'about', 'apply-store', 'apply-agent', 'contact', 'terms'].includes(activeTab) && (
            <>
              {activeTab === 'delivery-dashboard' && (
                <DeliveryDashboardView onNavigate={(tab) => setActiveTab(tab)} />
              )}
              {activeTab === 'delivery-available' && (
                <DeliveryAvailableView
                  onOrderClaimed={() => {
                    setActiveTab('delivery-active');
                  }}
                />
              )}
              {activeTab === 'delivery-active' && (
                <DeliveryActiveView
                  onTripCompleted={() => {
                    setActiveTab('delivery-history');
                  }}
                />
              )}
              {activeTab === 'delivery-history' && <DeliveryHistoryView />}
              {activeTab === 'delivery-earnings' && <DeliveryEarningsView />}
              {activeTab === 'delivery-profile' && <DeliveryProfileView />}
              {activeTab === 'delivery-notifications' && <DeliveryNotificationsView />}
            </>
          )}

          {/* Delivery Supervisor Route Render */}
          {currentRole === 'delivery_supervisor' && activeTab === 'delivery-supervisor-dashboard' && (
            <DeliverySupervisorDashboardView />
          )}

          {/* Finance Admin Route Render */}
          {currentRole === 'finance_admin' && activeTab === 'finance-admin-dashboard' && (
            <FinanceAdminDashboardView />
          )}

          {/* Orders Manager Route Render */}
          {currentRole === 'orders_manager' && activeTab === 'orders-manager-dashboard' && (
            <OrdersManagerDashboardView />
          )}

          {/* Admin Route Render */}
          {currentRole === 'admin' && !['landing', 'auth', 'about', 'apply-store', 'apply-agent', 'contact', 'terms'].includes(activeTab) && (
            <>
              {activeTab === 'admin-dashboard' && (
                <AdminDashboardView onNavigate={(tab) => setActiveTab(tab)} />
              )}
              {activeTab === 'admin-analytics' && <AdminAnalyticsView />}
              {activeTab === 'admin-stores-applications' && <AdminStoresApplicationsView />}
              {activeTab === 'admin-stores' && <AdminStoresView />}
              {activeTab === 'admin-agents' && <AdminAgentsView />}
              {activeTab === 'admin-customers' && <AdminCustomersView />}
              {activeTab === 'admin-orders' && <AdminOrdersView />}
              {activeTab === 'admin-zones' && <AdminZonesView />}
              {activeTab === 'admin-coupons' && <AdminCouponsView />}
              {activeTab === 'admin-categories' && <AdminCategoriesView />}
              {activeTab === 'admin-payouts' && <AdminPayoutsView />}
              {activeTab === 'admin-activity-log' && <AdminActivityLogView />}
              {activeTab === 'admin-settings' && <AdminPlatformSettingsView />}
              {activeTab === 'admin-reviews' && <AdminReviewsView />}
              {activeTab === 'admin-notifications' && <AdminNotificationsView />}
              {activeTab === 'admin-supabase' && <AdminSupabaseSync />}
            </>
          )}
        </Suspense>
      </main>

      {/* Cart Drawer Component */}
      <CartDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onProceedToCheckout={handleProceedToCheckout}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-8 dir-rtl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-700 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <button onClick={() => setActiveTab('landing')} className="hover:text-purple-600 transition-colors">
                الرئيسية
              </button>
              <button onClick={() => setActiveTab('about')} className="hover:text-purple-600 transition-colors">
                عن المنصة
              </button>
              <button onClick={() => setActiveTab('apply-store')} className="hover:text-purple-600 transition-colors">
                انضم كمتجر
              </button>
              <button onClick={() => setActiveTab('apply-agent')} className="hover:text-purple-600 transition-colors">
                انضم ككابتن
              </button>
              <button onClick={() => setActiveTab('contact')} className="hover:text-purple-600 transition-colors">
                اتصل بنا
              </button>
              <button onClick={() => setActiveTab('terms')} className="hover:text-purple-600 transition-colors">
                الشروط والخصوصية
              </button>
            </div>

            <span className="text-[11px] text-slate-400 font-normal">
              منصة على بابك (JIHAT Platform) - توصيل فائق السرعة
            </span>
          </div>

          <div className="text-center text-xs text-slate-500">
            <p className="font-bold text-slate-800">
              منصة على بابك - التوصيل الفائق والتسوق المحلي المباشر في جمهورية مصر العربية 🇪🇬
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              جميع الحقوق محفوظة © {new Date().getFullYear()} - ربط أصحاب المحلات، كباتن التوصيل، والعملاء
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}