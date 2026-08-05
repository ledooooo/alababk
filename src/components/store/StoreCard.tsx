import React, { useState, useEffect } from 'react';
import { Store } from '../../types/domain';
import { formatCurrency } from '../../lib/formatters';
import { StorageRepo, subscribeToStorageChange } from '../../lib/storage';
import { Star, MapPin, Clock, Truck, ShoppingBag, Heart } from 'lucide-react';

interface StoreCardProps {
  store: Store;
  onSelect: (store: Store) => void;
}

export const StoreCard: React.FC<StoreCardProps> = ({ store, onSelect }) => {
  const [isWishlisted, setIsWishlisted] = useState<boolean>(
    StorageRepo.isStoreWishlisted(store.id)
  );

  useEffect(() => {
    const unsubscribe = subscribeToStorageChange(() => {
      setIsWishlisted(StorageRepo.isStoreWishlisted(store.id));
    });
    return unsubscribe;
  }, [store.id]);

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = StorageRepo.toggleWishlistStore(store.id);
    setIsWishlisted(updated);
  };

  return (
    <div
      onClick={() => onSelect(store)}
      className="group bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-xl hover:border-emerald-300 transition-all duration-200 overflow-hidden cursor-pointer flex flex-col h-full relative"
    >
      {/* Banner & Cover */}
      <div className="relative h-32 bg-slate-100 overflow-hidden">
        {store.banner_url ? (
          <img
            src={store.banner_url}
            alt={store.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-slate-800 to-slate-900 flex items-center justify-center text-slate-500">
            <ShoppingBag className="w-12 h-12 opacity-30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Status Badge */}
        <div className="absolute top-3 right-3 z-10">
          {store.is_open ? (
            <span className="bg-emerald-500/90 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
              مفتوح للطلبات
            </span>
          ) : (
            <span className="bg-rose-500/90 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
              مغلق مؤقتاً
            </span>
          )}
        </div>

        {/* Wishlist Heart Button & Category Badge */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
          <button
            onClick={handleWishlistToggle}
            className={`p-1.5 rounded-full backdrop-blur-md transition-all border shadow-sm ${
              isWishlisted
                ? 'bg-rose-500 text-white border-rose-400 scale-110'
                : 'bg-black/40 hover:bg-black/60 text-white border-white/20'
            }`}
            title={isWishlisted ? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'}
          >
            <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
          </button>
          {store.category_name && (
            <span className="bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg">
              {store.category_name}
            </span>
          )}
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-4 flex-1 flex flex-col justify-between relative pt-8">
        {/* Logo Avatar Overlay */}
        <div className="absolute -top-7 right-4 w-14 h-14 bg-white rounded-xl shadow-md border-2 border-white overflow-hidden p-0.5">
          <img
            src={store.logo_url}
            alt={store.name}
            className="w-full h-full object-cover rounded-lg"
          />
        </div>

        <div>
          {/* Title & Rating */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-700 transition-colors line-clamp-1">
              {store.name}
            </h3>
            <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-lg shrink-0">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{store.rating ? store.rating.toFixed(1) : 'جديد'}</span>
              <span className="text-[10px] text-slate-400">({store.reviews_count || 0})</span>
            </div>
          </div>

          {/* Address & Description */}
          <p className="text-slate-500 text-xs mt-1.5 line-clamp-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{store.address || 'غير متاح'}</span>
          </p>

          <p className="text-slate-600 text-xs mt-2 line-clamp-2 leading-relaxed">
            {store.description}
          </p>
        </div>

        {/* Footer Info */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-medium">
          <div className="flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-emerald-600" />
            <span>التوصيل: {formatCurrency(store.delivery_fee)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>الحد الأدنى: {formatCurrency(store.min_order_amount)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
