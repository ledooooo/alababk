import React, { useState, useEffect } from 'react';
import { StorageRepo, subscribeToStorageChange } from '../../../lib/storage';
import { Store, Product } from '../../../types/domain';
import { StoreCard } from '../../store/StoreCard';
import { ProductCard } from '../../product/ProductCard';
import { User, Phone, Mail, Camera, ShieldCheck, MapPin, ShoppingBag, LogOut, CheckCircle2, Heart, Store as StoreIcon, Package, Trash2, Bell, BellOff, BellRing } from 'lucide-react';
import { useToast } from '../../shared/Toast';
import { isPushSupported, getPushSubscriptionStatus, subscribeToPush, unsubscribeFromPush } from '../../../lib/push';
import { createSupabaseNotification } from '../../../lib/supabase';

interface ProfileViewProps {
  onNavigate: (tab: string, param?: string) => void;
  onLogout?: () => void;
}

export default function ProfileView({ onNavigate, onLogout }) {
  const currentUser = StorageRepo.getCurrentUser();
  const [fullName, setFullName] = useState(currentUser?.full_name || 'عميل على بابك');
  const [phone, setPhone] = useState(currentUser?.phone || '01012345678');
  const [email, setEmail] = useState(currentUser?.email || 'customer@example.com');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200');
  const [isSaved, setIsSaved] = useState(false);
  const { showToast } = useToast();

  // Push notifications state
  const [pushStatus, setPushStatus] = useState<'unsupported' | 'denied' | 'subscribed' | 'unsubscribed' | 'loading'>('loading');

  useEffect(() => {
    if (!isPushSupported()) {
      setPushStatus('unsupported');
      return;
    }
    getPushSubscriptionStatus().then(setPushStatus);
  }, []);

  const handleTogglePush = async () => {
    if (pushStatus === 'subscribed') {
      setPushStatus('loading');
      const result = await unsubscribeFromPush();
      if (result.success) {
        setPushStatus('unsubscribed');
        showToast({ type: 'success', title: 'تم', message: 'تم إيقاف الإشعارات الفورية' });
      } else {
        setPushStatus('subscribed');
        showToast({ type: 'error', title: 'خطأ', message: result.error || 'تعذر إيقاف الإشعارات' });
      }
    } else {
      setPushStatus('loading');
      const result = await subscribeToPush();
      if (result.success) {
        setPushStatus('subscribed');
        showToast({ type: 'success', title: 'تم التفعيل', message: 'هتوصلك الإشعارات فورًا حتى لو التطبيق مقفول' });
      } else {
        setPushStatus(await getPushSubscriptionStatus());
        showToast({ type: 'error', title: 'تعذر التفعيل', message: result.error || 'حدث خطأ غير متوقع' });
      }
    }
  };

  const [sendingTest, setSendingTest] = useState(false);
  const handleSendTestNotification = async () => {
    if (!currentUser?.id) return;
    setSendingTest(true);
    try {
      // إشعار حقيقي بمحتوى صادق يمشي في نفس المسار الفعلي (يُحفظ في
      // notifications ثم الـtrigger يستدعي send-push فعليًا) — مش بيانات
      // وهمية محلية زي الزرار القديم.
      await createSupabaseNotification({
        user_id: currentUser.id,
        title: 'إشعار تجريبي 🔔',
        body: 'لو وصلك الإشعار ده على جهازك، يبقى الإشعارات الفورية شغالة تمام عندك.',
        type: 'system',
      });
      showToast({ type: 'success', title: 'تم الإرسال', message: 'راقب جهازك خلال ثوانٍ' });
    } catch (err: any) {
      showToast({ type: 'error', title: 'فشل الإرسال', message: err.message || 'تعذر إرسال الإشعار التجريبي' });
    } finally {
      setSendingTest(false);
    }
  };

  // Wishlist state
  const [activeWishlistTab, setActiveWishlistTab] = useState<'stores' | 'products'>('stores');
  const [wishlistStores, setWishlistStores] = useState<Store[]>(StorageRepo.getWishlistedStores());
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>(StorageRepo.getWishlistedProducts());

  const orders = StorageRepo.getOrders().filter((o) => o.customer_id === currentUser?.id || o.customer_phone === phone);
  const addresses = StorageRepo.getAddresses(currentUser?.id);

  useEffect(() => {
    const updateWishlists = () => {
      setWishlistStores(StorageRepo.getWishlistedStores());
      setWishlistProducts(StorageRepo.getWishlistedProducts());
    };

    updateWishlists();
    const unsubscribe = subscribeToStorageChange((detail) => {
      if (detail.entityType === 'wishlist') updateWishlists();
    });
    return unsubscribe;
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser) {
      const updated = { ...currentUser, full_name: fullName, phone, email, avatar_url: avatarUrl };
      StorageRepo.saveUser(updated);
      StorageRepo.setCurrentUser(updated);
      showToast({ type: 'success', title: 'تم', message: 'تم حفظ التغييرات بنجاح' });
    }
  };


  const handleSelectStore = (store: Store) => {
    onNavigate('store-detail', store.id);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 dir-rtl pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-md">
        <div className="relative">
          <img
            loading="lazy"
            src={avatarUrl}
            alt={fullName}
            className="w-20 h-20 rounded-2xl object-cover border-2 border-white/30 shadow-md"
          />
          <button
            onClick={() => {
              const url = prompt('أدخل رابط الصورة الجديدة (Image URL):', avatarUrl);
              if (url) setAvatarUrl(url);
            }}
            className="absolute -bottom-2 -right-2 p-2 bg-amber-400 text-slate-900 rounded-xl shadow-xs hover:scale-105 transition-transform"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="text-center sm:text-right space-y-1 flex-1">
          <h1 className="text-xl font-black">{fullName}</h1>
          <p className="text-xs text-purple-200 font-mono">{phone} | {email}</p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-[11px] font-bold text-amber-300 mt-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>حساب عميل موثق</span>
          </div>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-100 rounded-xl text-xs font-bold border border-rose-400/30 transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        )}
      </div>

      {/* Overview Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('customer-orders')}
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs cursor-pointer hover:border-purple-300 transition-all text-center space-y-1"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <p className="text-lg font-black text-slate-900">{orders.length}</p>
          <p className="text-[11px] text-slate-500 font-bold">إجمالي الطلبات</p>
        </div>

        <div
          onClick={() => onNavigate('customer-addresses')}
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs cursor-pointer hover:border-emerald-300 transition-all text-center space-y-1"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <MapPin className="w-5 h-5" />
          </div>
          <p className="text-lg font-black text-slate-900">{addresses.length}</p>
          <p className="text-[11px] text-slate-500 font-bold">العناوين المحفوظة</p>
        </div>

        <div
          onClick={() => {
            const el = document.getElementById('wishlist-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs cursor-pointer hover:border-rose-300 transition-all text-center space-y-1 col-span-2 sm:col-span-1"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <Heart className="w-5 h-5 fill-rose-600" />
          </div>
          <p className="text-lg font-black text-slate-900">{wishlistStores.length + wishlistProducts.length}</p>
          <p className="text-[11px] text-slate-500 font-bold">العناصر المفضلة</p>
        </div>
      </div>

      {/* Wishlist Section */}
      <div id="wishlist-section" className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
              <Heart className="w-6 h-6 fill-rose-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">قائمة المفضلة الخاصة بك</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                المتاجر والمنتجات التي قمت بحفظها للوصول السريع
              </p>
            </div>
          </div>

          {/* Wishlist Sub-tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl self-start sm:self-auto">
            <button
              onClick={() => setActiveWishlistTab('stores')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeWishlistTab === 'stores'
                  ? 'bg-white text-rose-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <StoreIcon className="w-4 h-4" />
              <span>المتاجر ({wishlistStores.length})</span>
            </button>
            <button
              onClick={() => setActiveWishlistTab('products')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeWishlistTab === 'products'
                  ? 'bg-white text-rose-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>المنتجات ({wishlistProducts.length})</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeWishlistTab === 'stores' ? (
          wishlistStores.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <StoreIcon className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">لا توجد متاجر في المفضلة بعد</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                يمكنك الضغط على أيقونة القلب في أي كارت متجر لإضافته إلى قائمتك المفضلة هنا.
              </p>
              <button
                onClick={() => onNavigate('customer-stores')}
                className="mt-2 inline-flex items-center gap-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                تصفح المتاجر الآن
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {wishlistStores.map((store) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  onSelect={handleSelectStore}
                />
              ))}
            </div>
          )
        ) : (
          wishlistProducts.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">لا توجد منتجات في المفضلة بعد</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                اضغط على أيقونة القلب الموجودة على أي كارت منتج لإضافته إلى قائمتك المفضلة.
              </p>
              <button
                onClick={() => onNavigate('customer-stores')}
                className="mt-2 inline-flex items-center gap-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
              >
                تصفح المنتجات الآن
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {wishlistProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  storeName={product.category_name || 'المتجر'}
                />
              ))}
            </div>
          )
        )}
      </div>

      {/* Edit Profile Form */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
        <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">تعديل البيانات الشخصية</h2>

        {isSaved && (
          <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>تم حفظ التعديلات بنجاح!</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">الاسم بالكامل</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">رقم الهاتف والتواصل</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">البريد الإلكتروني</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-xs transition-all"
          >
            حفظ التغييرات
          </button>
        </div>
      </form>

      {/* Push Notifications Settings */}
      {pushStatus !== 'unsupported' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                pushStatus === 'subscribed' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {pushStatus === 'subscribed' ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm">الإشعارات الفورية</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {pushStatus === 'denied'
                    ? 'تم حظر الإشعارات من إعدادات المتصفح — فعّلها من هناك أولًا'
                    : pushStatus === 'subscribed'
                    ? 'مفعّلة — هتوصلك الإشعارات حتى لو التطبيق مقفول'
                    : 'فعّلها عشان توصلك إشعارات الطلبات فورًا حتى لو التطبيق مقفول'}
                </p>
              </div>
            </div>

            <button
              onClick={handleTogglePush}
              disabled={pushStatus === 'loading' || pushStatus === 'denied'}
              className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5 ${
                pushStatus === 'subscribed'
                  ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {pushStatus === 'loading' ? (
                <span>جاري التحميل...</span>
              ) : pushStatus === 'subscribed' ? (
                <>
                  <BellOff className="w-4 h-4" />
                  <span>إيقاف</span>
                </>
              ) : (
                <>
                  <Bell className="w-4 h-4" />
                  <span>تفعيل</span>
                </>
              )}
            </button>
          </div>

          {pushStatus === 'subscribed' && (
            <button
              onClick={handleSendTestNotification}
              disabled={sendingTest}
              className="mt-4 w-full py-2 border border-slate-200 hover:bg-slate-50 disabled:opacity-50 text-slate-600 font-bold text-[11px] rounded-xl transition-colors"
            >
              {sendingTest ? 'جاري الإرسال...' : 'إرسال إشعار تجريبي للتأكد إنه شغال 🔔'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
