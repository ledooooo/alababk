import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { StorageRepo, subscribeToStorageChange } from './lib/storage';
import { UserRole, UserProfile } from './types/domain';
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

// Store Owner Views
import { StoreDashboardView } from './components/views/store/StoreDashboardView';
import { StoreOrdersView } from './components/views/store/StoreOrdersView';
import { StoreProductsView } from './components/views/store/StoreProductsView';
import { StoreSettingsView } from './components/views/store/StoreSettingsView';
import { StoreAnalyticsView } from './components/views/store/StoreAnalyticsView';
import { StoreReviewsView } from './components/views/store/StoreReviewsView';
import { StorePayoutsView } from './components/views/store/StorePayoutsView';
import { StoreNotificationsView } from './components/views/store/StoreNotificationsView';

// Delivery Agent Views
import { DeliveryDashboardView } from './components/views/delivery/DeliveryDashboardView';
import { DeliveryAvailableView } from './components/views/delivery/DeliveryAvailableView';
import { DeliveryActiveView } from './components/views/delivery/DeliveryActiveView';
import { DeliveryHistoryView } from './components/views/delivery/DeliveryHistoryView';
import { DeliveryEarningsView } from './components/views/delivery/DeliveryEarningsView';
import { DeliveryProfileView } from './components/views/delivery/DeliveryProfileView';
import { DeliveryNotificationsView } from './components/views/delivery/DeliveryNotificationsView';

// Admin Views
import { AdminDashboardView } from './components/views/admin/AdminDashboardView';
import { AdminStoresApplicationsView } from './components/views/admin/AdminStoresApplicationsView';
import { AdminStoresView } from './components/views/admin/AdminStoresView';
import { AdminAgentsView } from './components/views/admin/AdminAgentsView';
import { AdminOrdersView } from './components/views/admin/AdminOrdersView';
import { AdminZonesView } from './components/views/admin/AdminZonesView';
import { AdminCouponsView } from './components/views/admin/AdminCouponsView';
import { AdminCategoriesView } from './components/views/admin/AdminCategoriesView';
import { AdminPayoutsView } from './components/views/admin/AdminPayoutsView';
import { AdminReviewsView } from './components/views/admin/AdminReviewsView';
import { AdminNotificationsView } from './components/views/admin/AdminNotificationsView';
import { AdminCustomersView } from './components/views/admin/AdminCustomersView';
import { AdminAnalyticsView } from './components/views/admin/AdminAnalyticsView';
import { AdminPlatformSettingsView } from './components/views/admin/AdminPlatformSettingsView';
import { AdminActivityLogView } from './components/views/admin/AdminActivityLogView';
import { AdminSupabaseSync } from './components/views/admin/AdminSupabaseSync';
import { NotificationsView } from './components/views/customer/NotificationsView';
import { NotFoundView } from './components/views/public/NotFoundView';

// New Specialized Operational Views
import { DeliverySupervisorDashboardView } from './components/views/supervisor/DeliverySupervisorDashboardView';
import { FinanceAdminDashboardView } from './components/views/finance/FinanceAdminDashboardView';
import { OrdersManagerDashboardView } from './components/views/orders/OrdersManagerDashboardView';

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

    try {
      const { data: profile } = await supabase
        .from('profiles')
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
          associated_store_id: profile.associated_store_id,
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

  // AuthGuard for protected routes
  useEffect(() => {
    if (!isLoading && !isLoggedIn && !isPublicTab) {
      setActiveTab('auth');
    }
  }, [isLoading, isLoggedIn, isPublicTab, activeTab]);

  const activeUserProfile = currentUser;

  const handleLogout = async () => {
    await supabase.auth.signOut().catch(() => {});
    StorageRepo.logout();
    useCartStore.getState().setUserId(null);
    setCurrentUser(null);
    setActiveTab('landing');
  };

  const handleSelectStore = (storeId: string) => {
    setSelectedStoreId(storeId);
    setActiveTab('customer-store-detail');
  };

  const handleProceedToCheckout = () => {
    setIsOpen(false);
    setActiveTab('customer-checkout');
  };

  const handleOrderPlaced = (orderId: string) => {
    setSelectedOrderId(orderId);
    setActiveTab('order-confirmation');
  };

  const currentRole = activeUserProfile?.role || 'customer';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased dir-rtl selection:bg-emerald-500 selection:text-white flex flex-col">
      {/* Smart PWA Progressive Web App Install Banner */}
      <PwaInstallPrompt />

      {/* Real-time Push Notification Toast Overlay */}
      <PushNotificationToast
        onNavigate={(tab, param) => {
          if (param) {
            if (tab === 'customer-store-detail') setSelectedStoreId(param);
            if (tab === 'customer-order-detail' || tab === 'order-confirmation') setSelectedOrderId(param);
          }
          setActiveTab(tab);
        }}
      />

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
        onNavigate={(tab, param) => {
          if (param) setSelectedStoreId(param);
          setActiveTab(tab);
        }}
        onOpenCart={() => setIsOpen(true)}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-hidden">
        {/* Public Global Views */}
        {activeTab === 'landing' && <LandingView onNavigate={(tab, param) => {
          if (param) setSelectedStoreId(param);
          setActiveTab(tab);
        }} />}
        {activeTab === 'auth' && (
          <AuthView
            onSuccess={(user) => {
              setCurrentUser(user);
              if (user.role === 'customer') setActiveTab('customer-stores');
              else if (user.role === 'store_owner') setActiveTab('store-dashboard');
              else if (user.role === 'delivery_agent') setActiveTab('delivery-dashboard');
              else if (user.role === 'admin') setActiveTab('admin-dashboard');
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
        {activeTab === 'about' && <AboutView onNavigate={(tab) => setActiveTab(tab)} />}
        {activeTab === 'apply-store' && <ApplyStoreView onNavigate={(tab) => setActiveTab(tab)} />}
        {activeTab === 'apply-agent' && <ApplyAgentView onNavigate={(tab) => setActiveTab(tab)} />}
        {activeTab === 'contact' && <ContactView onNavigate={(tab) => setActiveTab(tab)} />}
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
                onNavigate={(tab, param) => {
                  if (param) setSelectedStoreId(param);
                  setActiveTab(tab);
                }}
              />
            )}

            {activeTab === 'categories-browse' && (
              <CategoriesBrowseView
                onNavigate={(tab, param) => {
                  if (param) setSelectedStoreId(param);
                  setActiveTab(tab);
                }}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileView
                onNavigate={(tab, param) => {
                  if (param) setSelectedStoreId(param);
                  setActiveTab(tab);
                }}
                onLogout={handleLogout}
              />
            )}

            {activeTab === 'customer-store-detail' && selectedStoreId && (
              <CustomerStoreDetailView
                storeId={selectedStoreId}
                onBack={() => setActiveTab('customer-stores')}
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
                onNavigate={(tab, param) => {
                  if (param) setSelectedOrderId(param);
                  setActiveTab(tab);
                }}
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
            {activeTab === 'notifications' && (
              <NotificationsView
                onNavigate={(tab, param) => {
                  if (param) setSelectedStoreId(param);
                  setActiveTab(tab);
                }}
              />
            )}
          </>
        )}

        {/* Store Owner Route Render */}
        {currentRole === 'store_owner' && !['landing', 'auth', 'about', 'apply-store', 'apply-agent', 'contact', 'terms'].includes(activeTab) && (
          <>
            {activeTab === 'store-dashboard' && (
              <StoreDashboardView onNavigate={(tab) => setActiveTab(tab)} />
            )}
            {activeTab === 'store-orders' && <StoreOrdersView />}
            {activeTab === 'store-products' && <StoreProductsView />}
            {activeTab === 'store-reviews' && <StoreReviewsView />}
            {activeTab === 'store-payouts' && <StorePayoutsView />}
            {activeTab === 'store-analytics' && <StoreAnalyticsView />}
            {activeTab === 'store-notifications' && <StoreNotificationsView />}
            {activeTab === 'store-settings' && <StoreSettingsView />}
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
                onOrderClaimed={(id) => {
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
        {currentRole === 'delivery_supervisor' && !['landing', 'auth', 'about', 'apply-store', 'apply-agent', 'contact', 'terms'].includes(activeTab) && (
          <DeliverySupervisorDashboardView />
        )}

        {/* Finance Admin Route Render */}
        {currentRole === 'finance_admin' && !['landing', 'auth', 'about', 'apply-store', 'apply-agent', 'contact', 'terms'].includes(activeTab) && (
          <FinanceAdminDashboardView />
        )}

        {/* Orders Manager Route Render */}
        {currentRole === 'orders_manager' && !['landing', 'auth', 'about', 'apply-store', 'apply-agent', 'contact', 'terms'].includes(activeTab) && (
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
      </main>

      {/* Cart Drawer Component */}
      <CartDrawer onCheckout={handleProceedToCheckout} />

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
