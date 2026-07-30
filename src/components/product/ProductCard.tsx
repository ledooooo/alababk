import React, { useState } from 'react';
import { Product } from '../../types/domain';
import { useCartStore } from '../../stores/cart-store';
import { formatCurrency } from '../../lib/formatters';
import { Plus, Minus, Check, ShoppingCart, AlertCircle } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  storeName: string;
  onCartConfirmRequest?: (product: Product, storeName: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  storeName,
  onCartConfirmRequest,
}) => {
  const { items, addItem, updateQuantity } = useCartStore();
  const cartItem = items.find((i) => i.product.id === product.id);
  const currentQuantity = cartItem ? cartItem.quantity : 0;
  const [isAddedAnim, setIsAddedAnim] = useState(false);

  const handleAdd = () => {
    const res = addItem(product, storeName, 1);
    if (!res.success && res.requiresConfirm && onCartConfirmRequest) {
      onCartConfirmRequest(product, storeName);
    } else if (res.success) {
      setIsAddedAnim(true);
      setTimeout(() => setIsAddedAnim(false), 800);
    }
  };

  const handleIncrement = () => {
    updateQuantity(product.id, currentQuantity + 1);
  };

  const handleDecrement = () => {
    updateQuantity(product.id, currentQuantity - 1);
  };

  const hasDiscount = product.original_price && product.original_price > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.original_price! - product.price) / product.original_price!) * 100)
    : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-3 shadow-xs hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between relative group">
      {/* Discount Badge */}
      {hasDiscount && (
        <span className="absolute top-2.5 right-2.5 bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs z-10">
          خصم {discountPercent}%
        </span>
      )}

      {/* Image & Main Info */}
      <div>
        <div className="w-full h-32 rounded-lg bg-slate-100 overflow-hidden mb-2.5 flex items-center justify-center relative">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {product.stock <= 0 && (
            <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center">
              <span className="text-white text-xs font-bold px-2.5 py-1 bg-rose-600 rounded-lg">
                نفذت الكمية
              </span>
            </div>
          )}
        </div>

        <h4 className="font-bold text-slate-800 text-xs sm:text-sm line-clamp-2 min-h-[2.25rem] leading-snug">
          {product.name}
        </h4>

        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
          {product.description || `وحدة القياس: ${product.unit}`}
        </p>
      </div>

      {/* Price & Cart Actions */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="font-extrabold text-slate-900 text-sm sm:text-base text-emerald-700">
              {formatCurrency(product.price)}
            </span>
            <span className="text-[10px] text-slate-400">/ {product.unit}</span>
          </div>
          {hasDiscount && (
            <span className="text-[10px] text-slate-400 line-through">
              {formatCurrency(product.original_price!)}
            </span>
          )}
        </div>

        {/* Action Controls */}
        {product.stock > 0 ? (
          currentQuantity > 0 ? (
            <div className="flex items-center border border-emerald-600 rounded-lg bg-emerald-50 text-emerald-800 font-bold text-xs shadow-xs">
              <button
                onClick={handleDecrement}
                className="p-1.5 hover:bg-emerald-100 rounded-r-md transition-colors"
                title="تقليل الكمية"
              >
                <Minus className="w-3.5 h-3.5 text-emerald-800" />
              </button>
              <span className="px-2">{currentQuantity}</span>
              <button
                onClick={handleIncrement}
                className="p-1.5 hover:bg-emerald-100 rounded-l-md transition-colors"
                title="زيادة الكمية"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-800" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              className={`p-2 rounded-lg font-semibold text-xs transition-all flex items-center gap-1 shadow-xs ${
                isAddedAnim
                  ? 'bg-emerald-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
              title="إضافة إلى سلة التسوق"
            >
              {isAddedAnim ? (
                <>
                  <Check className="w-4 h-4 animate-bounce" />
                  <span className="hidden sm:inline">تمت الإضافة</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">أضف للسلة</span>
                </>
              )}
            </button>
          )
        ) : (
          <span className="text-[11px] text-slate-400 font-medium">غير متوفر</span>
        )}
      </div>
    </div>
  );
};
