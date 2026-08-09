import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { UserRole } from '../types/domain';
import ProtectedRoute from './ProtectedRoute';
import { ALLOWED_TABS_BY_ROLE } from '../types/domain';
import { ViewFallback } from '../components/shared/ViewFallback';

// Public views (lazy loaded)
const LandingView = lazy(() => import('../components/views/public/LandingView'));
const AuthView = lazy(() => import('../components/views/public/AuthView'));
const AboutView = lazy(() => import('../components/views/public/AboutView'));
const ApplyStoreView = lazy(() => import('../components/views/public/ApplyStoreView'));
const ApplyAgentView = lazy(() => import('../components/views/public/ApplyAgentView'));
const ContactView = lazy(() => import('../components/views/public/ContactView'));
const TermsPrivacyView = lazy(() => import('../components/views/public/TermsPrivacyView'));
const NotFoundView = lazy(() => import('../components/views/public/NotFoundView'));

// Customer views (lazy loaded)
const CustomerStoresView = lazy(() => import('../components/views/customer/CustomerStoresView'));
const CustomerStoreDetailView = lazy(() => import('../components/views/customer/CustomerStoreDetailView'));
const CustomerCheckoutView = lazy(() => import('../components/views/customer/CustomerCheckoutView'));
const CustomerOrdersView = lazy(() => import('../components/views/customer/CustomerOrdersView'));
const CustomerOrderDetailView = lazy(() => import('../components/views/customer/CustomerOrderDetailView'));
const CustomerAddressesView = lazy(() => import('../components/views/customer/CustomerAddressesView'));
const SearchView = lazy(() => import('../components/views/customer/SearchView'));
const CategoriesBrowseView = lazy(() => import('../components/views/customer/CategoriesBrowseView'));
const ProfileView = lazy(() => import('../components/views/customer/ProfileView'));
const OrderConfirmationView = lazy(() => import('../components/views/customer/OrderConfirmationView'));
const NotificationsView = lazy(() => import('../components/views/customer/NotificationsView'));

// Store owner views (lazy loaded)
const StoreDashboardView = lazy(() => import('../components/views/store/StoreDashboardView'));
const StoreOrdersView = lazy(() => import('../components/views/store/StoreOrdersView'));
const StoreProductsView = lazy(() => import('../components/views/store/StoreProductsView'));
const StoreSettingsView = lazy(() => import('../components/views/store/StoreSettingsView'));
const StoreAnalyticsView = lazy(() => import('../components/views/store/StoreAnalyticsView'));
const StoreReviewsView = lazy(() => import('../components/views/store/StoreReviewsView'));
const StorePayoutsView = lazy(() => import('../components/views/store/StorePayoutsView'));
const StoreNotificationsView = lazy(() => import('../components/views/store/StoreNotificationsView'));

// Delivery agent views (lazy loaded)
const DeliveryDashboardView = lazy(() => import('../components/views/delivery/DeliveryDashboardView'));
const DeliveryAvailableView = lazy(() => import('../components/views/delivery/DeliveryAvailableView'));
const DeliveryActiveView = lazy(() => import('../components/views/delivery/DeliveryActiveView'));
const DeliveryHistoryView = lazy(() => import('../components/views/delivery/DeliveryHistoryView'));
const DeliveryEarningsView = lazy(() => import('../components/views/delivery/DeliveryEarningsView'));
const DeliveryProfileView = lazy(() => import('../components/views/delivery/DeliveryProfileView'));
const DeliveryNotificationsView = lazy(() => import('../components/views/delivery/DeliveryNotificationsView'));

// Supervisor / Finance / Orders Manager (lazy loaded)
const DeliverySupervisorDashboardView = lazy(() => import('../components/views/supervisor/DeliverySupervisorDashboardView'));
const FinanceAdminDashboardView = lazy(() => import('../components/views/finance/FinanceAdminDashboardView'));
const OrdersManagerDashboardView = lazy(() => import('../components/views/orders/OrdersManagerDashboardView'));

// Admin views (lazy loaded)
const AdminDashboardView = lazy(() => import('../components/views/admin/AdminDashboardView'));
const AdminStoresApplicationsView = lazy(() => import('../components/views/admin/AdminStoresApplicationsView'));
const AdminStoresView = lazy(() => import('../components/views/admin/AdminStoresView'));
const AdminAgentsView = lazy(() => import('../components/views/admin/AdminAgentsView'));
const AdminCustomersView = lazy(() => import('../components/views/admin/AdminCustomersView'));
const AdminOrdersView = lazy(() => import('../components/views/admin/AdminOrdersView'));
const AdminZonesView = lazy(() => import('../components/views/admin/AdminZonesView'));
const AdminCouponsView = lazy(() => import('../components/views/admin/AdminCouponsView'));
const AdminCategoriesView = lazy(() => import('../components/views/admin/AdminCategoriesView'));
const AdminPayoutsView = lazy(() => import('../components/views/admin/AdminPayoutsView'));
const AdminActivityLogView = lazy(() => import('../components/views/admin/AdminActivityLogView'));
const AdminPlatformSettingsView = lazy(() => import('../components/views/admin/AdminPlatformSettingsView'));
const AdminReviewsView = lazy(() => import('../components/views/admin/AdminReviewsView'));
const AdminNotificationsView = lazy(() => import('../components/views/admin/AdminNotificationsView'));
const AdminSupabaseSync = lazy(() => import('../components/views/admin/AdminSupabaseSync'));

const routesConfig = [
  // Public routes
  { path: '/', element: <LandingView />, public: true },
  { path: '/auth', element: <AuthView />, public: true },
  { path: '/about', element: <AboutView />, public: true },
  { path: '/apply-store', element: <ApplyStoreView />, public: true },
  { path: '/apply-agent', element: <ApplyAgentView />, public: true },
  { path: '/contact', element: <ContactView />, public: true },
  { path: '/terms', element: <TermsPrivacyView />, public: true },

  // Customer routes
  { path: '/stores', element: <CustomerStoresView />, roles: ['customer'] },
  { path: '/stores/:storeId', element: <CustomerStoreDetailView />, roles: ['customer'] },
  { path: '/checkout', element: <CustomerCheckoutView />, roles: ['customer'] },
  { path: '/orders', element: <CustomerOrdersView />, roles: ['customer'] },
  { path: '/orders/:orderId', element: <CustomerOrderDetailView />, roles: ['customer'] },
  { path: '/order-confirmation/:orderId', element: <OrderConfirmationView />, roles: ['customer'] },
  { path: '/profile', element: <ProfileView />, roles: ['customer'] },
  { path: '/addresses', element: <CustomerAddressesView />, roles: ['customer'] },
  { path: '/notifications', element: <NotificationsView />, roles: ['customer'] },
  { path: '/search', element: <SearchView />, roles: ['customer'] },
  { path: '/categories', element: <CategoriesBrowseView />, roles: ['customer'] },

  // Store owner routes
  { path: '/store/dashboard', element: <StoreDashboardView />, roles: ['store_owner'] },
  { path: '/store/orders', element: <StoreOrdersView />, roles: ['store_owner'] },
  { path: '/store/products', element: <StoreProductsView />, roles: ['store_owner'] },
  { path: '/store/settings', element: <StoreSettingsView />, roles: ['store_owner'] },
  { path: '/store/analytics', element: <StoreAnalyticsView />, roles: ['store_owner'] },
  { path: '/store/reviews', element: <StoreReviewsView />, roles: ['store_owner'] },
  { path: '/store/payouts', element: <StorePayoutsView />, roles: ['store_owner'] },
  { path: '/store/notifications', element: <StoreNotificationsView />, roles: ['store_owner'] },

  // Delivery agent routes
  { path: '/delivery/dashboard', element: <DeliveryDashboardView />, roles: ['delivery_agent'] },
  { path: '/delivery/available', element: <DeliveryAvailableView />, roles: ['delivery_agent'] },
  { path: '/delivery/active', element: <DeliveryActiveView />, roles: ['delivery_agent'] },
  { path: '/delivery/history', element: <DeliveryHistoryView />, roles: ['delivery_agent'] },
  { path: '/delivery/earnings', element: <DeliveryEarningsView />, roles: ['delivery_agent'] },
  { path: '/delivery/profile', element: <DeliveryProfileView />, roles: ['delivery_agent'] },
  { path: '/delivery/notifications', element: <DeliveryNotificationsView />, roles: ['delivery_agent'] },

  // Supervisor / Finance / Orders Manager
  { path: '/supervisor/dashboard', element: <DeliverySupervisorDashboardView />, roles: ['delivery_supervisor'] },
  { path: '/finance/dashboard', element: <FinanceAdminDashboardView />, roles: ['finance_admin'] },
  { path: '/orders-manager/dashboard', element: <OrdersManagerDashboardView />, roles: ['orders_manager'] },

  // Admin routes
  { path: '/admin', element: <AdminDashboardView />, roles: ['admin'] },
  { path: '/admin/analytics', element: <AdminAnalyticsView />, roles: ['admin'] },
  { path: '/admin/stores/applications', element: <AdminStoresApplicationsView />, roles: ['admin'] },
  { path: '/admin/stores', element: <AdminStoresView />, roles: ['admin'] },
  { path: '/admin/agents', element: <AdminAgentsView />, roles: ['admin'] },
  { path: '/admin/customers', element: <AdminCustomersView />, roles: ['admin'] },
  { path: '/admin/orders', element: <AdminOrdersView />, roles: ['admin'] },
  { path: '/admin/zones', element: <AdminZonesView />, roles: ['admin'] },
  { path: '/admin/coupons', element: <AdminCouponsView />, roles: ['admin'] },
  { path: '/admin/categories', element: <AdminCategoriesView />, roles: ['admin'] },
  { path: '/admin/payouts', element: <AdminPayoutsView />, roles: ['admin'] },
  { path: '/admin/activity-log', element: <AdminActivityLogView />, roles: ['admin'] },
  { path: '/admin/settings', element: <AdminPlatformSettingsView />, roles: ['admin'] },
  { path: '/admin/reviews', element: <AdminReviewsView />, roles: ['admin'] },
  { path: '/admin/notifications', element: <AdminNotificationsView />, roles: ['admin'] },
  { path: '/admin/supabase', element: <AdminSupabaseSync />, roles: ['admin'] },

  // Catch all
  { path: '*', element: <NotFoundView />, public: true },
];

const router = createBrowserRouter(
  routesConfig.map((route) => {
    const Element = route.element;
    const isPublic = route.public === true;
    const allowedRoles = route.roles || [];

    return {
      path: route.path,
      element: (
        <Suspense fallback={<ViewFallback />}>
          {isPublic ? (
            Element
          ) : (
            <ProtectedRoute allowedRoles={allowedRoles}>
              {Element}
            </ProtectedRoute>
          )}
        </Suspense>
      ),
    };
  })
);

export default router;