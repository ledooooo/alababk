import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useParams, useNavigate, Navigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { StorageRepo, subscribeToStorageChange } from './lib/storage';
import { UserRole, UserProfile, DEFAULT_TAB_BY_ROLE } from './types/domain';
import { Navbar } from './components/layout/Navbar';
import { SplashScreen } from './components/layout/SplashScreen';
import { CartDrawer } from './components/cart/CartDrawer';
import { PushNotificationToast } from './components/shared/PushNotificationToast';
import { PwaInstallPrompt } from './components/pwa/PwaInstallPrompt';
import { useCartStore } from './stores/cart-store';
import { useToast } from './components/shared/Toast';

// ===== Lazy Imports for All Views =====
// Customer Views
const CustomerStoresView = lazy(() => import('./components/views/customer/CustomerStoresView'));
const CustomerStoreDetailView = lazy(() => import('./components/views/customer/CustomerStoreDetailView'));
const CustomerCheckoutView = lazy(() => import('./components/views/customer/CustomerCheckoutView'));
const CustomerOrdersView = lazy(() => import('./components/views/customer/CustomerOrdersView'));
const CustomerOrderDetailView = lazy(() => import('./components/views/customer/CustomerOrderDetailView'));
const CustomerAddressesView = lazy(() => import('./components/views/customer/CustomerAddressesView'));
const SearchView = lazy(() => import('./components/views/customer/SearchView'));
const CategoriesBrowseView = lazy(() => import('./components/views/customer/CategoriesBrowseView'));
const ProfileView = lazy(() => import('./components/views/customer/ProfileView'));
const OrderConfirmationView = lazy(() => import('./components/views/customer/OrderConfirmationView'));
const NotificationsView = lazy(() => import('./components/views/customer/NotificationsView'));

// Auth & Public
const AuthView = lazy(() => import('./components/views/public/AuthView'));
const LandingView = lazy(() => import('./components/views/public/LandingView'));
const AboutView = lazy(() => import('./components/views/public/AboutView'));
const ApplyStoreView = lazy(() => import('./components/views/public/ApplyStoreView'));
const ApplyAgentView = lazy(() => import('./components/views/public/ApplyAgentView'));
const ContactView = lazy(() => import('./components/views/public/ContactView'));
const TermsPrivacyView = lazy(() => import('./components/views/public/TermsPrivacyView'));
const NotFoundView = lazy(() => import('./components/views/public/NotFoundView'));

// Store Owner Views
const StoreDashboardView = lazy(() => import('./components/views/store/StoreDashboardView'));
const StoreOrdersView = lazy(() => import('./components/views/store/StoreOrdersView'));
const StoreProductsView = lazy(() => import('./components/views/store/StoreProductsView'));
const StoreSettingsView = lazy(() => import('./components/views/store/StoreSettingsView'));
const StoreAnalyticsView = lazy(() => import('./components/views/store/StoreAnalyticsView'));
const StoreReviewsView = lazy(() => import('./components/views/store/StoreReviewsView'));
const StorePayoutsView = lazy(() => import('./components/views/store/StorePayoutsView'));
const StoreNotificationsView = lazy(() => import('./components/views/store/StoreNotificationsView'));

// Delivery Agent Views
const DeliveryDashboardView = lazy(() => import('./components/views/delivery/DeliveryDashboardView'));
const DeliveryAvailableView = lazy(() => import('./components/views/delivery/DeliveryAvailableView'));
const DeliveryActiveView = lazy(() => import('./components/views/delivery/DeliveryActiveView'));
const DeliveryHistoryView = lazy(() => import('./components/views/delivery/DeliveryHistoryView'));
const DeliveryEarningsView = lazy(() => import('./components/views/delivery/DeliveryEarningsView'));
const DeliveryProfileView = lazy(() => import('./components/views/delivery/DeliveryProfileView'));
const DeliveryNotificationsView = lazy(() => import('./components/views/delivery/DeliveryNotificationsView'));

// Admin & Specialized Views
const AdminDashboardView = lazy(() => import('./components/views/admin/AdminDashboardView'));
const AdminStoresApplicationsView = lazy(() => import('./components/views/admin/AdminStoresApplicationsView'));
const AdminStoresView = lazy(() => import('./components/views/admin/AdminStoresView'));
const AdminProductsView = lazy(() => import('./components/views/admin/AdminProductsView'));
const AdminAgentsView = lazy(() => import('./components/views/admin/AdminAgentsView'));
const AdminOrdersView = lazy(() => import('./components/views/admin/AdminOrdersView'));
const AdminZonesView = lazy(() => import('./components/views/admin/AdminZonesView'));
const AdminCouponsView = lazy(() => import('./components/views/admin/AdminCouponsView'));
const AdminCategoriesView = lazy(() => import('./components/views/admin/AdminCategoriesView'));
const AdminPayoutsView = lazy(() => import('./components/views/admin/AdminPayoutsView'));
const AdminReviewsView = lazy(() => import('./components/views/admin/AdminReviewsView'));
const AdminNotificationsView = lazy(() => import('./components/views/admin/AdminNotificationsView'));
const AdminCustomersView = lazy(() => import('./components/views/admin/AdminCustomersView'));
const AdminAnalyticsView = lazy(() => import('./components/views/admin/AdminAnalyticsView'));
const AdminPlatformSettingsView = lazy(() => import('./components/views/admin/AdminPlatformSettingsView'));
const AdminActivityLogView = lazy(() => import('./components/views/admin/AdminActivityLogView'));
const AdminSupabaseSync = lazy(() => import('./components/views/admin/AdminSupabaseSync'));

const DeliverySupervisorDashboardView = lazy(() => import('./components/views/supervisor/DeliverySupervisorDashboardView'));
const FinanceAdminDashboardView = lazy(() => import('./components/views/finance/FinanceAdminDashboardView'));
const OrdersManagerDashboardView = lazy(() => import('./components/views/orders/OrdersManagerDashboardView'));

// Auth Modals
const ForgotPasswordModal = lazy(() => import('./components/modals/AuthModals').then(m => ({ default: m.ForgotPasswordModal })));
const ResetPasswordModal = lazy(() => import('./components/modals/AuthModals').then(m => ({ default: m.ResetPasswordModal })));

function ViewFallback() {
  return (
    <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-sm font-semibold text-slate-600">جاري تحميل الشاشة...</p>
    </div>
  );
}

// ===== Legacy tab-name -> router path adapter =====
// معظم شاشات هذا التطبيق مكتوبة بنمط قديم يستدعي onNavigate('tab-name', param)
// بدل استخدام useNavigate مباشرة. الخريطة التالية تترجم كل اسم "تبويب" معروف
// إلى مسار الراوتر الفعلي المطابق له في <Routes> بالأسفل.
const TAB_TO_PATH: Record<string, string> = {
  // Public
  landing: '/',
  auth: '/auth',
  about: '/about',
  'apply-store': '/apply-store',
  'apply-agent': '/apply-agent',
  contact: '/contact',
  terms: '/terms',

  // Customer
  'customer-stores': '/stores',
  search: '/search',
  'categories-browse': '/categories',
  'customer-checkout': '/checkout',
  'customer-orders': '/orders',
  profile: '/profile',
  'customer-addresses': '/addresses',
  notifications: '/notifications',

  // Store owner
  'store-dashboard': '/store/dashboard',
  'store-orders': '/store/orders',
  'store-products': '/store/products',
  'store-reviews': '/store/reviews',
  'store-payouts': '/store/payouts',
  'store-analytics': '/store/analytics',
  'store-notifications': '/store/notifications',
  'store-settings': '/store/settings',

  // Delivery agent
  'delivery-dashboard': '/delivery/dashboard',
  'delivery-available': '/delivery/available',
  'delivery-active': '/delivery/active',
  'delivery-history': '/delivery/history',
  'delivery-earnings': '/delivery/earnings',
  'delivery-profile': '/delivery/profile',
  'delivery-notifications': '/delivery/notifications',

  // Specialized roles
  'delivery-supervisor-dashboard': '/supervisor',
  'finance-admin-dashboard': '/finance',
  'orders-manager-dashboard': '/orders-manager',

  // Admin
  'admin-dashboard': '/admin',
  'admin-analytics': '/admin/analytics',
  'admin-stores-applications': '/admin/stores-applications',
  'admin-stores': '/admin/stores',
  'admin-products': '/admin/products',
  'admin-agents': '/admin/agents',
  'admin-customers': '/admin/customers',
  'admin-orders': '/admin/orders',
  'admin-zones': '/admin/zones',
  'admin-coupons': '/admin/coupons',
  'admin-categories': '/admin/categories',
  'admin-payouts': '/admin/payouts',
  'admin-activity-log': '/admin/activity',
  'admin-settings': '/admin/settings',
  'admin-reviews': '/admin/reviews',
  'admin-notifications': '/admin/notifications',
  'admin-supabase': '/admin/supabase',
};

// تبويبات تحتاج مُعامِلًا (param) يُلحَق بالمسار كجزء منه، وليس كـ query string
const TAB_TO_PARAM_PATH: Record<string, (param: string) => string> = {
  'customer-store-detail': (id) => `/stores/${id}`,
  'store-detail': (id) => `/stores/${id}`, // اسمان مختلفان يُستخدمان لنفس الوجهة في شاشات مختلفة
  'customer-order-detail': (id) => `/orders/${id}`,
  'order-confirmation': (id) => `/order-confirmation/${id}`,
  // فلتر التصنيف يُمرَّر كـ query string لأنه فلتر على صفحة قائمة وليس
  // معرّف مورد داخل المسار نفسه — CustomerStoresView تقرأه بـ useSearchParams
  'customer-stores': (categoryId) => `/stores?category=${categoryId}`,
};

/**
 * يترجم اسم تبويب قديم (ونادرًا مسارًا فعليًا جاهزًا، أو صيغة notification
 * القديمة "tab:param") إلى مسار راوتر صالح لاستخدامه مع navigate().
 */
function mapTabToPath(tab: string, param?: string): string {
  if (!tab) return '/';

  // بعض الإشعارات القديمة تخزّن الرابط كسلسلة واحدة "tab:param"
  if (!param && tab.includes(':')) {
    const [rawTab, rawParam] = tab.split(':');
    tab = rawTab;
    param = rawParam;
  }

  if (param) {
    const paramMapper = TAB_TO_PARAM_PATH[tab];
    if (paramMapper) return paramMapper(param);
  }

  const path = TAB_TO_PATH[tab];
  if (path) return path;

  // قد يكون tab بالفعل مسارًا فعليًا صالحًا (مثل روابط SidebarDrawer الحديثة)
  if (tab.startsWith('/')) return tab;

  console.warn('[mapTabToPath] تبويب غير معروف:', tab);
  return '/';
}

// ===== ProtectedRoute Component =====
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

function ProtectedRoute({ children, allowedRoles, redirectTo = '/auth' }: ProtectedRouteProps) {
  const [user, setUser] = useState<UserProfile | null>(StorageRepo.getCurrentUser());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = StorageRepo.getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    };
    checkAuth();

    const unsubscribe = subscribeToStorageChange((detail) => {
      if (detail.entityType !== 'user') return;
      const u = StorageRepo.getCurrentUser();
      setUser(u);
    });
    return unsubscribe;
  }, []);

  if (loading) return <ViewFallback />;
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }
  if (!allowedRoles.includes(user.role)) {
    const defaultTab = DEFAULT_TAB_BY_ROLE[user.role] || 'landing';
    return <Navigate to={mapTabToPath(defaultTab)} replace />;
  }
  return <>{children}</>;
}

// ===== Route Components with URL Parameters =====
function StoreDetailRoute() {
  const { storeId } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const { setIsOpen } = useCartStore();
  return (
    <CustomerStoreDetailView
      storeId={storeId!}
      onBack={() => navigate('/stores')}
      onOpenCart={() => setIsOpen(true)}
    />
  );
}

function OrderDetailRoute() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  return (
    <CustomerOrderDetailView
      orderId={orderId!}
      onBack={() => navigate('/orders')}
    />
  );
}

function OrderConfirmationRoute() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  return (
    <OrderConfirmationView
      orderId={orderId!}
      onNavigate={(tab, param) => navigate(mapTabToPath(tab, param))}
    />
  );
}

// ===== Simple onNavigate-only wrappers (public pages) =====
function LandingRoute() {
  const navigate = useNavigate();
  return <LandingView onNavigate={(tab, param) => navigate(mapTabToPath(tab, param))} />;
}

function AuthRoute({ onOpenForgotPassword }: { onOpenForgotPassword: () => void }) {
  const navigate = useNavigate();
  return (
    <AuthView
      onSuccess={(user) => navigate(mapTabToPath(DEFAULT_TAB_BY_ROLE[user.role] || 'landing'))}
      onNavigate={(tab) => {
        if (tab === 'forgot-password') {
          onOpenForgotPassword();
          return;
        }
        navigate(mapTabToPath(tab));
      }}
    />
  );
}

function AboutRoute() {
  const navigate = useNavigate();
  return <AboutView onNavigate={(tab, param) => navigate(mapTabToPath(tab, param))} />;
}

function ApplyStoreRoute() {
  const navigate = useNavigate();
  return <ApplyStoreView onNavigate={(tab, param) => navigate(mapTabToPath(tab, param))} />;
}

function ApplyAgentRoute() {
  const navigate = useNavigate();
  return <ApplyAgentView onNavigate={(tab, param) => navigate(mapTabToPath(tab, param))} />;
}

function ContactRoute() {
  const navigate = useNavigate();
  return <ContactView onNavigate={(tab, param) => navigate(mapTabToPath(tab, param))} />;
}

function NotFoundRoute() {
  const navigate = useNavigate();
  return <NotFoundView onNavigate={(tab) => navigate(mapTabToPath(tab))} />;
}

// ===== Customer wrappers =====
function CustomerStoresRoute() {
  const navigate = useNavigate();
  return <CustomerStoresView onSelectStore={(store) => navigate(`/stores/${store.id}`)} />;
}

function SearchRoute() {
  const navigate = useNavigate();
  return (
    <SearchView
      onSelectStore={(store) => navigate(`/stores/${store.id}`)}
      onSelectProduct={(product) => navigate(`/stores/${product.store_id}`)}
    />
  );
}

function CategoriesBrowseRoute() {
  const navigate = useNavigate();
  return <CategoriesBrowseView onNavigate={(tab, param) => navigate(mapTabToPath(tab, param))} />;
}

function CustomerCheckoutRoute() {
  const navigate = useNavigate();
  return (
    <CustomerCheckoutView
      onOrderPlaced={(orderId) => navigate(`/order-confirmation/${orderId}`)}
      onBack={() => navigate('/stores')}
    />
  );
}

function CustomerOrdersRoute() {
  const navigate = useNavigate();
  return (
    <CustomerOrdersView
      onSelectOrder={(orderId) => navigate(`/orders/${orderId}`)}
      onBrowseStores={() => navigate('/stores')}
      onReorderComplete={() => navigate('/cart')}
    />
  );
}

function ProfileRoute() {
  const navigate = useNavigate();
  return (
    <ProfileView
      onNavigate={(tab, param) => navigate(mapTabToPath(tab, param))}
      onLogout={async () => {
        try {
          await supabase.auth.signOut();
        } catch (err) {
          console.warn('Sign out notice:', err);
        }
        StorageRepo.logout();
        navigate('/');
      }}
    />
  );
}

function NotificationsRoute() {
  const navigate = useNavigate();
  return <NotificationsView onNavigate={(tab, param) => navigate(mapTabToPath(tab, param))} />;
}

// ===== Store owner wrappers (single-arg onNavigate) =====
function StoreDashboardRoute() {
  const navigate = useNavigate();
  return <StoreDashboardView onNavigate={(tab) => navigate(mapTabToPath(tab))} />;
}

function StoreOrdersRoute() {
  const navigate = useNavigate();
  return <StoreOrdersView onNavigate={(tab) => navigate(mapTabToPath(tab))} />;
}

function StoreProductsRoute() {
  const navigate = useNavigate();
  return <StoreProductsView onNavigate={(tab) => navigate(mapTabToPath(tab))} />;
}

function AdminStoreProductsRoute() {
  const navigate = useNavigate();
  const { storeId } = useParams<{ storeId: string }>();
  return <StoreProductsView adminStoreId={storeId!} onNavigate={(tab) => navigate(mapTabToPath(tab))} />;
}

function StoreAnalyticsRoute() {
  const navigate = useNavigate();
  return <StoreAnalyticsView onNavigate={(tab) => navigate(mapTabToPath(tab))} />;
}

function StoreSettingsRoute() {
  const navigate = useNavigate();
  return <StoreSettingsView onNavigate={(tab) => navigate(mapTabToPath(tab))} />;
}

function AdminStoreSettingsRoute() {
  const navigate = useNavigate();
  const { storeId } = useParams<{ storeId: string }>();
  return <StoreSettingsView adminStoreId={storeId!} onNavigate={(tab) => navigate(mapTabToPath(tab))} />;
}

// ===== Delivery agent wrappers =====
function DeliveryDashboardRoute() {
  const navigate = useNavigate();
  return <DeliveryDashboardView onNavigate={(tab) => navigate(mapTabToPath(tab))} />;
}

function DeliveryAvailableRoute() {
  const navigate = useNavigate();
  return <DeliveryAvailableView onOrderClaimed={() => navigate('/delivery/active')} />;
}

function DeliveryActiveRoute() {
  const navigate = useNavigate();
  return <DeliveryActiveView onTripCompleted={() => navigate('/delivery/history')} />;
}

// ===== Admin wrappers =====
function AdminDashboardRoute() {
  const navigate = useNavigate();
  return <AdminDashboardView onNavigate={(tab) => navigate(mapTabToPath(tab))} />;
}

// ===== CartDrawerWrapper =====
function CartDrawerWrapper() {
  const { isOpen, setIsOpen } = useCartStore();
  const navigate = useNavigate();

  const handleProceedToCheckout = () => {
    setIsOpen(false);
    navigate('/checkout');
  };

  return (
    <CartDrawer
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onProceedToCheckout={handleProceedToCheckout}
    />
  );
}

// ===== Main App =====
export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('splashShown'));
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => StorageRepo.getCurrentUser());
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const { isOpen, setIsOpen } = useCartStore();
  const { showToast } = useToast();

  // Session sync
  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);
      if (session?.user) {
        syncUserProfile(session);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        setSession(session);
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (session) await syncUserProfile(session);
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          StorageRepo.setCurrentUser(null);
        }
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const syncUserProfile = async (session: Session) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile) {
        const user: UserProfile = {
          id: profile.id,
          email: profile.email || session.user.email || '',
          name: profile.full_name || session.user.user_metadata?.full_name || 'مستخدم',
          phone: profile.phone || session.user.user_metadata?.phone || '',
          role: (profile.role as UserRole) || 'customer',
          avatar_url: profile.avatar_url,
          is_active: profile.is_active ?? true,
          created_at: profile.created_at || session.user.created_at,
        };
        setCurrentUser(user);
        StorageRepo.setCurrentUser(user);
        useCartStore.getState().setUserId(user.id);
      }
    } catch (err) {
      console.error('Error syncing user profile:', err);
    }
  };

  const handleSplashFinish = () => {
    setShowSplash(false);
    sessionStorage.setItem('splashShown', 'true');
  };

  if (isLoading) {
    return <ViewFallback />;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased dir-rtl selection:bg-emerald-500 selection:text-white flex flex-col">
        <PwaInstallPrompt />
        <PushNotificationToast />
        {showSplash && (
          <SplashScreen
            durationSeconds={3}
            onFinish={handleSplashFinish}
          />
        )}
        <Navbar currentUser={currentUser} />
        <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-x-hidden">
          <Suspense fallback={<ViewFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingRoute />} />
              <Route path="/auth" element={<AuthRoute onOpenForgotPassword={() => setShowForgotModal(true)} />} />
              <Route path="/about" element={<AboutRoute />} />
              <Route path="/apply-store" element={<ApplyStoreRoute />} />
              <Route path="/apply-agent" element={<ApplyAgentRoute />} />
              <Route path="/contact" element={<ContactRoute />} />
              <Route path="/terms" element={<TermsPrivacyView />} />

              {/* Customer Routes */}
              <Route path="/stores" element={<CustomerStoresRoute />} />
              <Route path="/stores/:storeId" element={<StoreDetailRoute />} />
              <Route path="/search" element={<SearchRoute />} />
              <Route path="/categories" element={<CategoriesBrowseRoute />} />
              <Route path="/checkout" element={<CustomerCheckoutRoute />} />
              <Route path="/orders" element={<CustomerOrdersRoute />} />
              <Route path="/orders/:orderId" element={<OrderDetailRoute />} />
              <Route path="/order-confirmation/:orderId" element={<OrderConfirmationRoute />} />
              <Route path="/profile" element={<ProfileRoute />} />
              <Route path="/addresses" element={<CustomerAddressesView />} />
              <Route path="/notifications" element={<NotificationsRoute />} />

              {/* Store Owner Routes */}
              <Route path="/store/dashboard" element={<ProtectedRoute allowedRoles={['store_owner']}><StoreDashboardRoute /></ProtectedRoute>} />
              <Route path="/store/orders" element={<ProtectedRoute allowedRoles={['store_owner']}><StoreOrdersRoute /></ProtectedRoute>} />
              <Route path="/store/products" element={<ProtectedRoute allowedRoles={['store_owner']}><StoreProductsRoute /></ProtectedRoute>} />
              <Route path="/store/reviews" element={<ProtectedRoute allowedRoles={['store_owner']}><StoreReviewsView /></ProtectedRoute>} />
              <Route path="/store/payouts" element={<ProtectedRoute allowedRoles={['store_owner']}><StorePayoutsView /></ProtectedRoute>} />
              <Route path="/store/analytics" element={<ProtectedRoute allowedRoles={['store_owner']}><StoreAnalyticsRoute /></ProtectedRoute>} />
              <Route path="/store/notifications" element={<ProtectedRoute allowedRoles={['store_owner']}><StoreNotificationsView /></ProtectedRoute>} />
              <Route path="/store/settings" element={<ProtectedRoute allowedRoles={['store_owner']}><StoreSettingsRoute /></ProtectedRoute>} />

              {/* Delivery Agent Routes */}
              <Route path="/delivery/dashboard" element={<ProtectedRoute allowedRoles={['delivery_agent']}><DeliveryDashboardRoute /></ProtectedRoute>} />
              <Route path="/delivery/available" element={<ProtectedRoute allowedRoles={['delivery_agent']}><DeliveryAvailableRoute /></ProtectedRoute>} />
              <Route path="/delivery/active" element={<ProtectedRoute allowedRoles={['delivery_agent']}><DeliveryActiveRoute /></ProtectedRoute>} />
              <Route path="/delivery/history" element={<ProtectedRoute allowedRoles={['delivery_agent']}><DeliveryHistoryView /></ProtectedRoute>} />
              <Route path="/delivery/earnings" element={<ProtectedRoute allowedRoles={['delivery_agent']}><DeliveryEarningsView /></ProtectedRoute>} />
              <Route path="/delivery/profile" element={<ProtectedRoute allowedRoles={['delivery_agent']}><DeliveryProfileView /></ProtectedRoute>} />
              <Route path="/delivery/notifications" element={<ProtectedRoute allowedRoles={['delivery_agent']}><DeliveryNotificationsView /></ProtectedRoute>} />

              {/* Specialized Roles */}
              <Route path="/supervisor" element={<ProtectedRoute allowedRoles={['delivery_supervisor']}><DeliverySupervisorDashboardView /></ProtectedRoute>} />
              <Route path="/finance" element={<ProtectedRoute allowedRoles={['finance_admin']}><FinanceAdminDashboardView /></ProtectedRoute>} />
              <Route path="/orders-manager" element={<ProtectedRoute allowedRoles={['orders_manager']}><OrdersManagerDashboardView /></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboardRoute /></ProtectedRoute>} />
              <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin']}><AdminAnalyticsView /></ProtectedRoute>} />
              <Route path="/admin/stores-applications" element={<ProtectedRoute allowedRoles={['admin']}><AdminStoresApplicationsView /></ProtectedRoute>} />
              <Route path="/admin/stores" element={<ProtectedRoute allowedRoles={['admin']}><AdminStoresView /></ProtectedRoute>} />
              <Route path="/admin/stores/:storeId/products" element={<ProtectedRoute allowedRoles={['admin']}><AdminStoreProductsRoute /></ProtectedRoute>} />
              <Route path="/admin/stores/:storeId/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminStoreSettingsRoute /></ProtectedRoute>} />
              <Route path="/admin/products" element={<ProtectedRoute allowedRoles={['admin']}><AdminProductsView /></ProtectedRoute>} />
              <Route path="/admin/agents" element={<ProtectedRoute allowedRoles={['admin']}><AdminAgentsView /></ProtectedRoute>} />
              <Route path="/admin/customers" element={<ProtectedRoute allowedRoles={['admin']}><AdminCustomersView /></ProtectedRoute>} />
              <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={['admin']}><AdminOrdersView /></ProtectedRoute>} />
              <Route path="/admin/zones" element={<ProtectedRoute allowedRoles={['admin']}><AdminZonesView /></ProtectedRoute>} />
              <Route path="/admin/coupons" element={<ProtectedRoute allowedRoles={['admin']}><AdminCouponsView /></ProtectedRoute>} />
              <Route path="/admin/categories" element={<ProtectedRoute allowedRoles={['admin']}><AdminCategoriesView /></ProtectedRoute>} />
              <Route path="/admin/payouts" element={<ProtectedRoute allowedRoles={['admin']}><AdminPayoutsView /></ProtectedRoute>} />
              <Route path="/admin/activity" element={<ProtectedRoute allowedRoles={['admin']}><AdminActivityLogView /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminPlatformSettingsView /></ProtectedRoute>} />
              <Route path="/admin/reviews" element={<ProtectedRoute allowedRoles={['admin']}><AdminReviewsView /></ProtectedRoute>} />
              <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={['admin']}><AdminNotificationsView /></ProtectedRoute>} />
              <Route path="/admin/supabase" element={<ProtectedRoute allowedRoles={['admin']}><AdminSupabaseSync /></ProtectedRoute>} />

              {/* Fallback */}
              <Route path="*" element={<NotFoundRoute />} />
            </Routes>
          </Suspense>
        </main>

        <CartDrawerWrapper />

        {/* Modals */}
        <Suspense fallback={null}>
          {showForgotModal && (
            <ForgotPasswordModal
              onClose={() => setShowForgotModal(false)}
              onOpenReset={(email) => {
                setResetEmail(email);
                setShowForgotModal(false);
                setShowResetModal(true);
              }}
            />
          )}
          {showResetModal && (
            <ResetPasswordModal
              email={resetEmail}
              onClose={() => setShowResetModal(false)}
              onSuccess={() => {
                showToast({
                  type: 'success',
                  title: 'تم التحديث',
                  message: 'تم تحديث كلمة المرور بنجاح!',
                });
                setShowResetModal(false);
              }}
            />
          )}
        </Suspense>

        <footer className="bg-white border-t border-slate-200 mt-auto py-8 dir-rtl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-700 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <a href="/" className="hover:text-purple-600 transition-colors">الرئيسية</a>
                <a href="/about" className="hover:text-purple-600 transition-colors">عن المنصة</a>
                <a href="/apply-store" className="hover:text-purple-600 transition-colors">انضم كمتجر</a>
                <a href="/apply-agent" className="hover:text-purple-600 transition-colors">انضم ككابتن</a>
                <a href="/contact" className="hover:text-purple-600 transition-colors">اتصل بنا</a>
                <a href="/terms" className="hover:text-purple-600 transition-colors">الشروط والخصوصية</a>
              </div>
              <span className="text-[11px] text-slate-400 font-normal">
                منصة عل (JIHAT Platform) - توصيل فائق السرعة
              </span>
            </div>
            <div className="text-center text-xs text-slate-500">
              <p className="font-bold text-slate-800">
                منصة (وياك) - التوصيل الفائق والتسوق المحلي المباشر في جمهورية مصر العربية 🇪🇬
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                جميع الحقوق محفوظة © {new Date().getFullYear()} - ربط أصحاب المحلات، كباتن التوصيل، والعملاء
              </p>
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}
