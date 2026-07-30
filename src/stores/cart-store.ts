import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '../types/domain';

export interface CartLineItem {
  product: Product;
  quantity: number;
  notes?: string;
}

interface CartState {
  storeId: string | null;
  storeName: string | null;
  items: CartLineItem[];
  isOpen: boolean;

  // Actions
  addItem: (product: Product, storeName: string, quantity?: number, notes?: string) => { success: boolean; requiresConfirm?: boolean };
  forceAddItem: (product: Product, storeName: string, quantity?: number, notes?: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateItemNotes: (productId: string, notes: string) => void;
  clearCart: () => void;
  setIsOpen: (isOpen: boolean) => void;
  getSubtotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      storeId: null,
      storeName: null,
      items: [],
      isOpen: false,

      addItem: (product, storeName, quantity = 1, notes = '') => {
        const { storeId, items } = get();

        // 1. Check if adding from a different store
        if (storeId && storeId !== product.store_id && items.length > 0) {
          return { success: false, requiresConfirm: true };
        }

        // 2. Same store or empty cart
        const existingIndex = items.findIndex((i) => i.product.id === product.id);
        let updatedItems = [...items];

        if (existingIndex >= 0) {
          updatedItems[existingIndex].quantity += quantity;
          if (notes) updatedItems[existingIndex].notes = notes;
        } else {
          updatedItems.push({ product, quantity, notes });
        }

        set({
          storeId: product.store_id,
          storeName: storeName,
          items: updatedItems,
        });

        return { success: true };
      },

      forceAddItem: (product, storeName, quantity = 1, notes = '') => {
        set({
          storeId: product.store_id,
          storeName: storeName,
          items: [{ product, quantity, notes }],
        });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        const items = get().items.map((item) =>
          item.product.id === productId ? { ...item, quantity } : item
        );
        set({ items });
      },

      removeItem: (productId) => {
        const items = get().items.filter((item) => item.product.id !== productId);
        if (items.length === 0) {
          set({ storeId: null, storeName: null, items: [] });
        } else {
          set({ items });
        }
      },

      updateItemNotes: (productId, notes) => {
        const items = get().items.map((item) =>
          item.product.id === productId ? { ...item, notes } : item
        );
        set({ items });
      },

      clearCart: () => {
        set({ storeId: null, storeName: null, items: [] });
      },

      setIsOpen: (isOpen: boolean) => {
        set({ isOpen });
      },

      getSubtotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.product.price * item.quantity,
          0
        );
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'jihat_cart_storage',
    }
  )
);
