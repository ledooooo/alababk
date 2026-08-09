import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
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
import { ToastProvider, useToast } from './components/shared/Toast';
import { ConfirmDialogProvider } from './components/shared/ConfirmDialog';

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

// ===== ProtectedRoute Component =====
interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  redirectTo?: string;
}

function ProtectedRoute({ children, allowedRoles, redirectTo = '/auth' }: ProtectedRouteProps) {
  const [user, setUser] = useState<UserProfile | null>(StorageRepo.getCurrentUser());
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = StorageRepo.getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    };
    checkAuth();

    const unsubscribe = subscribeToStorageChange(() => {
      const u = StorageRepo.getCurrentUser();
      setUser(u);
    });
    return unsubscribe;
  }, []);

  if (loading) return <ViewFallback />;
  if (!user) {
    navigate(redirectTo);
    return null;
  }
  if (!allowedRoles.includes(user.role)) {
    // Redirect to default tab for their role
    const defaultTab = DEFAULT_TAB_BY_ROLE[user.role] || 'landing';
    navigate(`/${defaultTab}`);
    return null;
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
      onNavigate={(tab) => navigate(`/${tab}`)}
    />
  );
}

// ===== Main App =====
export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(() => {
    // Show splash only once per session
    return !sessionStorage.getItem('splashShown');
  });
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => StorageRepo.getCurrentUser());
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const { isOpen, setIsOpen } = useCartStore();

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
      <ToastProvider>
        <ConfirmDialogProvider>
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
                  <Route path="/" element={<LandingView />} />
                  <Route path="/auth" element={<AuthView />} />
                  <Route path="/about" element={<AboutView />} />
                  <Route path="/apply-store" element={<ApplyStoreView />} />
                  <Route path="/apply-agent" element={<ApplyAgentView />} />
                  <Route path="/contact" element={<ContactView />} />
                  <Route path="/terms" element={<TermsPrivacyView />} />

                  {/* Customer Routes */}
                  <Route path="/stores" element={<CustomerStoresView />} />
                  <Route path="/stores/:storeId" element={<StoreDetailRoute />} />
                  <Route path="/search" element={<SearchView />} />
                  <Route path="/categories" element={<CategoriesBrowseView />} />
                  <Route path="/checkout" element={<CustomerCheckoutView />} />
                  <Route path="/orders" element={<CustomerOrdersView />} />
                  <Route path="/orders/:orderId" element={<OrderDetailRoute />} />
                  <Route path="/order-confirmation/:orderId" element={<OrderConfirmationRoute />} />
                  <Route path="/profile" element={<ProfileView />} />
                  <Route path="/addresses" element={<CustomerAddressesView />} />
                  <Route path="/notifications" element={<NotificationsView />} />

                  {/* Store Owner Routes */}
                  <Route path="/store/dashboard" element={<ProtectedRoute allowedRoles={['store_owner']}><StoreDashboardView /></ProtectedRoute>} />
                  <Route path="/store/orders" element={<ProtectedRoute allowedRoles={['store_owner']}><StoreOrdersView /></ProtectedRoute>} />
                  <Route path="/store/products" element={<ProtectedRoute allowedRoles={['store_owner']}><StoreProductsView /></ProtectedRoute>} />
                  <Route path="/store/reviews" element={<ProtectedRoute allowedRoles={['store_owner']}><StoreReviewsView /></ProtectedRoute>} />
                  <Route path="/store/payouts" element={<ProtectedRoute allowedRoles={['store_owner']}><StorePayoutsView /></ProtectedRoute>} />
                  <Route path="/store/analytics" element={<ProtectedRoute allowedRoles={['store_owner']}><StoreAnalyticsView /></ProtectedRoute>} />
                  <Route path="/store/notifications" element={<ProtectedRoute allowedRoles={['store_owner']}><StoreNotificationsView /></ProtectedRoute>} />
                  <Route path="/store/settings" element={<ProtectedRoute allowedRoles={['store_owner']}><StoreSettingsView /></ProtectedRoute>} />

                  {/* Delivery Agent Routes */}
                  <Route path="/delivery/dashboard" element={<ProtectedRoute allowedRoles={['delivery_agent']}><DeliveryDashboardView /></ProtectedRoute>} />
                  <Route path="/delivery/available" element={<ProtectedRoute allowedRoles={['delivery_agent']}><DeliveryAvailableView /></ProtectedRoute>} />
                  <Route path="/delivery/active" element={<ProtectedRoute allowedRoles={['delivery_agent']}><DeliveryActiveView /></ProtectedRoute>} />
                  <Route path="/delivery/history" element={<ProtectedRoute allowedRoles={['delivery_agent']}><DeliveryHistoryView /></ProtectedRoute>} />
                  <Route path="/delivery/earnings" element={<ProtectedRoute allowedRoles={['delivery_agent']}><DeliveryEarningsView /></ProtectedRoute>} />
                  <Route path="/delivery/profile" element={<ProtectedRoute allowedRoles={['delivery_agent']}><DeliveryProfileView /></ProtectedRoute>} />
                  <Route path="/delivery/notifications" element={<ProtectedRoute allowedRoles={['delivery_agent']}><DeliveryNotificationsView /></ProtectedRoute>} />

                  {/* Specialized Roles */}
                  <Route path="/supervisor" element={<ProtectedRoute allowedRoles={['delivery_supervisor']}><DeliverySupervisorDashboardView /></ProtectedRoute>} />
                  <Route path="/finance" element={<ProtectedRoute allowedRoles={['finance_admin']}><FinanceAdminDashboardView /></ProtectedRoute>} />
                  <Route path="/orders-manager" element={<ProtectedRoute allowedRoles={['orders_manager']}><OrdersManagerDashboardView /></ProtectedRoute>} />

                  {/* Admin Routes */}
                  <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboardView /></ProtectedRoute>} />
                  <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin']}><AdminAnalyticsView /></ProtectedRoute>} />
                  <Route path="/admin/stores-applications" element={<ProtectedRoute allowedRoles={['admin']}><AdminStoresApplicationsView /></ProtectedRoute>} />
                  <Route path="/admin/stores" element={<ProtectedRoute allowedRoles={['admin']}><AdminStoresView /></ProtectedRoute>} />
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
                  <Route path="*" element={<NotFoundView />} />
                </Routes>
              </Suspense>
            </main>

            <CartDrawer
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              onProceedToCheckout={() => {
                setIsOpen(false);
                // Use navigate from inside component
              }}
            />

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
                    alert('تم تحديث كلمة المرور بنجاح!');
                    setShowResetModal(false);
                  }}
                />
              )}
            </Suspense>

            {/* Footer */}
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
        </ConfirmDialogProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}