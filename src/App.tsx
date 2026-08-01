import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from './lib/storage';
import { UserRole } from './types/domain';
import { Navbar } from './components/layout/Navbar';
import { SplashScreen } from './components/layout/SplashScreen';
import { CartDrawer } from './components/cart/CartDrawer';
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
  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState(StorageRepo.getCurrentUser());
  const [activeTab, setActiveTab] = useState<string>('customer-stores');

  // Customer navigation state
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const { isOpen, setIsOpen } = useCartStore();

  useEffect(() => {
    const unsubscribe = subscribeToStorageChange(() => {
      setCurrentUser(StorageRepo.getCurrentUser());
    });
    return unsubscribe;
  }, []);

  const handleRoleChange = (role: UserRole) => {
    StorageRepo.switchRole(role);
    const updatedUser = StorageRepo.getCurrentUser();
    setCurrentUser(updatedUser);

    // Set default tab for new role
    if (role === 'customer') setActiveTab('customer-stores');
    else if (role === 'store_owner') setActiveTab('store-dashboard');
    else if (role === 'delivery_agent') setActiveTab('delivery-dashboard');
    else if (role === 'admin') setActiveTab('admin-dashboard');

    setSelectedStoreId(null);
    setSelectedOrderId(null);
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

  const currentRole = currentUser?.role || 'customer';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased dir-rtl selection:bg-emerald-500 selection:text-white flex flex-col">
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

      {/* Role-Specific Secondary Sub-Header Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-20 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none">
            {currentRole === 'customer' && (
              <>
                <button
                  onClick={() => {
                    setSelectedStoreId(null);
                    setActiveTab('customer-stores');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'customer-stores' || activeTab === 'customer-store-detail'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <StoreIcon className="w-4 h-4" />
                  <span>تصفح المتاجر</span>
                </button>

                <button
                  onClick={() => setActiveTab('search')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'search'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <SearchIcon className="w-4 h-4" />
                  <span>البحث الشامل</span>
                </button>

                <button
                  onClick={() => setActiveTab('categories-browse')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'categories-browse'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>الأقسام</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedOrderId(null);
                    setActiveTab('customer-orders');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab.startsWith('customer-order') || activeTab === 'order-confirmation'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ListOrdered className="w-4 h-4" />
                  <span>طلباتي</span>
                </button>

                <button
                  onClick={() => setActiveTab('customer-addresses')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'customer-addresses'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  <span>العناوين</span>
                </button>

                <button
                  onClick={() => setActiveTab('profile')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'profile'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                  <span>حسابي الشخصي</span>
                </button>

                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'notifications'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  <span>الإشعارات</span>
                </button>
              </>
            )}

            {currentRole === 'store_owner' && (
              <>
                <button
                  onClick={() => setActiveTab('store-dashboard')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'store-dashboard'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <StoreIcon className="w-4 h-4" />
                  <span>الرئيسية</span>
                </button>

                <button
                  onClick={() => setActiveTab('store-orders')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'store-orders'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>الطلبات الواردة</span>
                </button>

                <button
                  onClick={() => setActiveTab('store-products')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'store-products'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  <span>المنتجات والمخزون</span>
                </button>

                <button
                  onClick={() => setActiveTab('store-reviews')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'store-reviews'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Star className="w-4 h-4" />
                  <span>تقييمات العملاء</span>
                </button>

                <button
                  onClick={() => setActiveTab('store-payouts')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'store-payouts'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>المستحقات والسحب</span>
                </button>

                <button
                  onClick={() => setActiveTab('store-analytics')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'store-analytics'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>التقارير المالية</span>
                </button>

                <button
                  onClick={() => setActiveTab('store-notifications')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'store-notifications'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  <span>الإشعارات</span>
                </button>

                <button
                  onClick={() => setActiveTab('store-settings')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'store-settings'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>إعدادات المحل</span>
                </button>
              </>
            )}

            {currentRole === 'delivery_agent' && (
              <>
                <button
                  onClick={() => setActiveTab('delivery-dashboard')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'delivery-dashboard'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Bike className="w-4 h-4" />
                  <span>لوحة الكابتن</span>
                </button>

                <button
                  onClick={() => setActiveTab('delivery-available')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'delivery-available'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>الطلبات المتاحة</span>
                </button>

                <button
                  onClick={() => setActiveTab('delivery-active')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'delivery-active'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  <span>الرحلة الجارية</span>
                </button>

                <button
                  onClick={() => setActiveTab('delivery-history')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'delivery-history'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>سجل التوصيل</span>
                </button>

                <button
                  onClick={() => setActiveTab('delivery-earnings')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'delivery-earnings'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>محفظة الأرباح</span>
                </button>

                <button
                  onClick={() => setActiveTab('delivery-profile')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'delivery-profile'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                  <span>ملف الكابتن</span>
                </button>

                <button
                  onClick={() => setActiveTab('delivery-notifications')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'delivery-notifications'
                      ? 'bg-orange-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  <span>التنبيهات</span>
                </button>
              </>
            )}

            {currentRole === 'admin' && (
              <>
                <button
                  onClick={() => setActiveTab('admin-dashboard')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'admin-dashboard'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>لوحة القيادة</span>
                </button>

                <button
                  onClick={() => setActiveTab('admin-analytics')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'admin-analytics'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>التحليلات الشاملة</span>
                </button>

                <button
                  onClick={() => setActiveTab('admin-stores-applications')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'admin-stores-applications'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <StoreIcon className="w-4 h-4" />
                  <span>طلبات المتاجر</span>
                </button>

                <button
                  onClick={() => setActiveTab('admin-stores')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'admin-stores'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <StoreIcon className="w-4 h-4" />
                  <span>المتاجر</span>
                </button>

                <button
                  onClick={() => setActiveTab('admin-agents')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'admin-agents'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Bike className="w-4 h-4" />
                  <span>المندوبين</span>
                </button>

                <button
                  onClick={() => setActiveTab('admin-customers')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'admin-customers'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>العملاء</span>
                </button>

                <button
                  onClick={() => setActiveTab('admin-orders')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'admin-orders'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>غرفة الطلبات</span>
                </button>

                <button
                  onClick={() => setActiveTab('admin-zones')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'admin-zones'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  <span>مناطق التغطية</span>
                </button>

                <button
                  onClick={() => setActiveTab('admin-coupons')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'admin-coupons'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Tag className="w-4 h-4" />
                  <span>الكوبونات</span>
                </button>

                <button
                  onClick={() => setActiveTab('admin-categories')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'admin-categories'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FolderTree className="w-4 h-4" />
                  <span>الأقسام</span>
                </button>

                <button
                  onClick={() => setActiveTab('admin-payouts')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'admin-payouts'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>التسويات المالية</span>
                </button>

                <button
                  onClick={() => setActiveTab('admin-activity-log')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'admin-activity-log'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>سجل النشاطات</span>
                </button>

                <button
                  onClick={() => setActiveTab('admin-settings')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'admin-settings'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>إعدادات النظام</span>
                </button>

                <button
                  onClick={() => setActiveTab('admin-reviews')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'admin-reviews'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Star className="w-4 h-4" />
                  <span>التقييمات</span>
                </button>

                <button
                  onClick={() => setActiveTab('admin-notifications')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'admin-notifications'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  <span>الإشعارات</span>
                </button>

                <button
                  onClick={() => setActiveTab('admin-supabase')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'admin-supabase'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <Database className="w-4 h-4" />
                  <span>ربط Supabase</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
                onLogout={() => {
                  StorageRepo.switchRole('customer');
                  setActiveTab('landing');
                }}
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
