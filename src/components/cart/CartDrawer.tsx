import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../stores/cart-store';
import { formatCurrency } from '../../lib/formatters';
import { ShoppingBag, X, Plus, Minus, Trash2, ArrowLeft, Store, AlertCircle } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onProceedToCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  onProceedToCheckout,
}) => {
  // استخدام الـ store بشكل صحيح مع اختيار الدوال المطلوبة
  const items = useCartStore((state) => state.items);
  const storeName = useCartStore((state) => state.storeName);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const getSubtotal = useCartStore((state) => state.getSubtotal);

  const subtotal = getSubtotal();
  const estimatedDeliveryFee = subtotal > 0 ? 15 : 0;
  const total = subtotal + estimatedDeliveryFee;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden dir-rtl">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 left-0 max-w-full flex h-full h-screen z-50">
        <div className="w-screen max-w-md h-full h-screen bg-white shadow-2xl flex flex-col justify-between border-r border-slate-200">
          <div className="shrink-0 p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base">سلة التسوق</h3>
                {storeName && (
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Store className="w-3 h-3 text-emerald-400" />
                    <span>من: {storeName}</span>
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                  <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
                </div>
                <h4 className="font-bold text-slate-800 text-lg">سلة التسوق فارغة</h4>
                <p className="text-sm text-slate-500 mt-1 max-w-xs">
                  قم بتصفح المتاجر والمنتجات القريبة منك وإضافتها للسلة هنا!
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 text-xs text-slate-500">
                  <span>المنتجات المختارة ({items.length})</span>
                  <button
                    onClick={clearCart}
                    className="text-rose-600 hover:text-rose-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    إفراغ السلة
                  </button>
                </div>

                {items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
                  >
                    <img
                      src={item.product.image_url}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded-lg shrink-0 border border-slate-200"
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h5 className="font-bold text-slate-800 text-sm truncate">
                          {item.product.name}
                        </h5>
                        <p className="text-xs text-emerald-700 font-semibold mt-0.5">
                          {formatCurrency(item.product.price)} / {item.product.unit}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-slate-300 rounded-lg bg-white">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="p-1 hover:bg-slate-100 text-slate-600 rounded-r-lg transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2.5 text-xs font-bold text-slate-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="p-1 hover:bg-slate-100 text-slate-600 rounded-l-lg transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <p className="font-bold text-sm text-slate-900">
                          {formatCurrency(item.product.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {items.length > 0 && (
            <div className="shrink-0 p-4 bg-slate-50 border-t border-slate-200 space-y-3">
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>مجموع المنتجات:</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>رسوم التوصيل المقدرة:</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(estimatedDeliveryFee)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200 text-sm font-extrabold text-slate-900">
                  <span>المبلغ الإجمالي:</span>
                  <span className="text-emerald-700">{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-amber-800 text-[11px] flex items-start gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <span>
                  الدفع نقدياً عند الاستلام (COD) مع المندوب. رسوم التوصيل تعتمد على منطقة التوصيل المحددة.
                </span>
              </div>

              <button
                onClick={onProceedToCheckout}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md hover:shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <span>المتابعة لتحديد العنوان والتأكيد</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};