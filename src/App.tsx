import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from './lib/storage';
import { UserRole } from './types/domain';
import { Navbar } from './components/layout/Navbar';
import { CartDrawer } from './components/cart/CartDrawer';
import { useCartStore } from './stores/cart-store';

// Customer Views
import { CustomerStoresView } from './components/views/customer/CustomerStoresView';
import { CustomerStoreDetailView } from './components/views/customer/CustomerStoreDetailView';
import { CustomerCheckoutView } from './components/views/customer/CustomerCheckoutView';
import { CustomerOrdersView } from './components/views/customer/CustomerOrdersView';
import { CustomerOrderDetailView } from './components/views/customer/CustomerOrderDetailView';
import { CustomerAddressesView } from './components/views/customer/CustomerAddressesView';

// Store Owner Views
import { StoreDashboardView } from './components/views/store/StoreDashboardView';
import { StoreOrdersView } from './components/views/store/StoreOrdersView';
import { StoreProductsView } from './components/views/store/StoreProductsView';
import { StoreSettingsView } from './components/views/store/StoreSettingsView';
import { StoreAnalyticsView } from './components/views/store/StoreAnalyticsView';

// Delivery Agent Views
import { DeliveryDashboardView } from './components/views/delivery/DeliveryDashboardView';
import { DeliveryAvailableView } from './components/views/delivery/DeliveryAvailableView';
import { DeliveryActiveView } from './components/views/delivery/DeliveryActiveView';
import { DeliveryHistoryView } from './components/views/delivery/DeliveryHistoryView';

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
import { AdminSupabaseSync } from './components/views/admin/AdminSupabaseSync';

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
  Database
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(StorageRepo.getCurrentUser());
  const [activeTab, setActiveTab] = useState<string>('customer-stores');

  // Customer navigation state
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
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
    setActiveTab('customer-order-detail');
  };

  const currentRole = currentUser?.role || 'customer';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased dir-rtl selection:bg-emerald-500 selection:text-white flex flex-col">
      {/* Primary Navigation Bar */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
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
                    activeTab.startsWith('customer-store')
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <StoreIcon className="w-4 h-4" />
                  <span>تصفح المتاجر</span>
                </button>

                <button
                  onClick={() => {
                    setSelectedOrderId(null);
                    setActiveTab('customer-orders');
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab.startsWith('customer-order')
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ListOrdered className="w-4 h-4" />
                  <span>سجل طلباتي</span>
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
                  <span>دفتر العناوين</span>
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
                  onClick={() => setActiveTab('store-analytics')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 ${
                    activeTab === 'store-analytics'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>التقارير المالي</span>
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
                  <span>السجل والأرباح</span>
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
        {/* Customer Route Render */}
        {currentRole === 'customer' && (
          <>
            {activeTab === 'customer-stores' && (
              <CustomerStoresView onSelectStore={handleSelectStore} />
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
          </>
        )}

        {/* Store Owner Route Render */}
        {currentRole === 'store_owner' && (
          <>
            {activeTab === 'store-dashboard' && (
              <StoreDashboardView onNavigate={(tab) => setActiveTab(tab)} />
            )}
            {activeTab === 'store-orders' && <StoreOrdersView />}
            {activeTab === 'store-products' && <StoreProductsView />}
            {activeTab === 'store-settings' && <StoreSettingsView />}
            {activeTab === 'store-analytics' && <StoreAnalyticsView />}
          </>
        )}

        {/* Delivery Agent Route Render */}
        {currentRole === 'delivery_agent' && (
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
          </>
        )}

        {/* Admin Route Render */}
        {currentRole === 'admin' && (
          <>
            {activeTab === 'admin-dashboard' && (
              <AdminDashboardView onNavigate={(tab) => setActiveTab(tab)} />
            )}
            {activeTab === 'admin-stores-applications' && <AdminStoresApplicationsView />}
            {activeTab === 'admin-stores' && <AdminStoresView />}
            {activeTab === 'admin-agents' && <AdminAgentsView />}
            {activeTab === 'admin-orders' && <AdminOrdersView />}
            {activeTab === 'admin-zones' && <AdminZonesView />}
            {activeTab === 'admin-coupons' && <AdminCouponsView />}
            {activeTab === 'admin-categories' && <AdminCategoriesView />}
            {activeTab === 'admin-payouts' && <AdminPayoutsView />}
            {activeTab === 'admin-reviews' && <AdminReviewsView />}
            {activeTab === 'admin-notifications' && <AdminNotificationsView />}
            {activeTab === 'admin-supabase' && <AdminSupabaseSync />}
          </>
        )}
      </main>

      {/* Cart Drawer Component */}
      <CartDrawer onCheckout={handleProceedToCheckout} />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
          <p className="font-bold text-slate-800">
            منصة على بابك - منصة التوصيل الفائق والتسوق المحلي المباشر 🇪🇬
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            جميع الحقوق محفوظة © {new Date().getFullYear()} - ربط أصحاب المحلات، كباتن التوصيل، والعملاء
          </p>
        </div>
      </footer>
    </div>
  );
}
