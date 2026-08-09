// src/stores/cart-store.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Cart, CartItem, Product } from '../types/domain';

interface CartState extends Cart {
  // الإجراءات
  addItem: (product: Product, quantity: number, notes?: string) => { success: boolean; error?: string };
  updateQuantity: (productId: string, quantity: number) => { success: boolean; error?: string };
  removeItem: (productId: string) => void;
  clearCart: () => void;
  setStore: (storeId: string, storeName: string) => void;
  getSubtotal: () => number;
  getTotalItems: () => number;
  // التحقق من المخزون
  validateStock: (productId: string, quantity: number) => { valid: boolean; available: number; error?: string };
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      // الحالة الابتدائية
      storeId: null,
      storeName: null,
      items: [],

      // التحقق من المخزون
      validateStock: (productId: string, quantity: number) => {
        const { items } = get();
        const existingItem = items.find((item) => item.product.id === productId);
        // نحتاج إلى جلب المنتج من التخزين، ولكن في Zustand لا نملك الـ StorageRepo مباشرة
        // نستخدم دالة مساعدة من خارج الـ store
        // لحل هذه المشكلة، سنمرر product مع الكمية
        // سيتم التعامل مع هذا في addItem و updateQuantity
        return { valid: true, available: 999 };
      },

      addItem: (product: Product, quantity: number, notes?: string) => {
        // التحقق من الكمية
        if (!Number.isInteger(quantity) || quantity <= 0) {
          return { success: false, error: 'الكمية يجب أن تكون عدداً صحيحاً موجباً' };
        }
        if (quantity > product.stock) {
          return { success: false, error: `الكمية المطلوبة (${quantity}) تتجاوز المخزون المتاح (${product.stock})` };
        }

        const { items, storeId, storeName } = get();

        // إذا كانت السلة فارغة، نضبط المتجر
        if (items.length === 0) {
          set({ storeId: product.store_id, storeName: product.store_name || 'متجر' });
        } else if (storeId !== product.store_id) {
          return { success: false, error: 'لا يمكن إضافة منتج من متجر آخر مع وجود منتجات في السلة' };
        }

        const existingIndex = items.findIndex((item) => item.product.id === product.id);
        let newItems: CartItem[];

        if (existingIndex >= 0) {
          const existing = items[existingIndex];
          const newQty = existing.quantity + quantity;
          if (newQty > product.stock) {
            return { success: false, error: `الكمية الإجمالية (${newQty}) تتجاوز المخزون المتاح (${product.stock})` };
          }
          newItems = [...items];
          newItems[existingIndex] = { ...existing, quantity: newQty, notes: notes || existing.notes };
        } else {
          newItems = [...items, { product, quantity, notes }];
        }

        set({ items: newItems });
        return { success: true };
      },

      updateQuantity: (productId: string, quantity: number) => {
        const { items } = get();
        // التحقق من الكمية
        if (!Number.isInteger(quantity) || quantity < 0) {
          return { success: false, error: 'الكمية يجب أن تكون عدداً صحيحاً غير سالب' };
        }

        const itemIndex = items.findIndex((item) => item.product.id === productId);
        if (itemIndex === -1) {
          return { success: false, error: 'المنتج غير موجود في السلة' };
        }

        const item = items[itemIndex];
        const product = item.product;

        if (quantity === 0) {
          // حذف المنتج
          const newItems = items.filter((_, i) => i !== itemIndex);
          if (newItems.length === 0) {
            set({ items: [], storeId: null, storeName: null });
          } else {
            set({ items: newItems });
          }
          return { success: true };
        }

        if (quantity > product.stock) {
          return { success: false, error: `الكمية المطلوبة (${quantity}) تتجاوز المخزون المتاح (${product.stock})` };
        }

        const newItems = [...items];
        newItems[itemIndex] = { ...item, quantity };
        set({ items: newItems });
        return { success: true };
      },

      removeItem: (productId: string) => {
        const { items } = get();
        const newItems = items.filter((item) => item.product.id !== productId);
        if (newItems.length === 0) {
          set({ items: [], storeId: null, storeName: null });
        } else {
          set({ items: newItems });
        }
      },

      clearCart: () => {
        set({ items: [], storeId: null, storeName: null });
      },

      setStore: (storeId: string, storeName: string) => {
        const { items } = get();
        if (items.length > 0 && storeId !== get().storeId) {
          // لا نسمح بتغيير المتجر والسلة ليست فارغة
          return;
        }
        set({ storeId, storeName });
      },

      getSubtotal: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      },

      getTotalItems: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'alababak_cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);