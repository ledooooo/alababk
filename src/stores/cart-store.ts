import { create } from 'zustand';
import { Product } from '../types/domain';

export interface CartLineItem {
  product: Product;
  quantity: number;
  notes?: string;
}

export interface CartData {
  storeId: string | null;
  storeName: string | null;
  items: CartLineItem[];
}

interface CartState {
  userId: string | null;
  storeId: string | null;
  storeName: string | null;
  items: CartLineItem[];
  isOpen: boolean;

  // New Actions for User-bound Cart
  setUserId: (userId: string | null) => void;
  loadCartForUser: (userId: string) => void;
  mergeOnLogin: (serverCart?: CartData) => void;

  // Existing Actions
  addItem: (product: Product, storeName: string, quantity?: number, notes?: string) => { success: boolean; requiresConfirm?: boolean };
  forceAddItem: (product: Product, storeName: string, quantity?: number, notes?: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateItemNotes: (productId: string, notes: string) => void;
  clearCart: () => void;
  setIsOpen: (isOpen: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
  getSubtotal: () => number;
  getItemCount: () => number;
}

function getStorageKey(userId: string | null): string {
  const newKey = userId ? `alababak_cart_${userId}` : 'alababak_cart_guest';
  const oldKey = userId ? `jihat_cart_${userId}` : 'jihat_cart_guest';
  if (typeof window !== 'undefined') {
    try {
      if (!localStorage.getItem(newKey) && localStorage.getItem(oldKey)) {
        const val = localStorage.getItem(oldKey);
        if (val) localStorage.setItem(newKey, val);
      }
    } catch {
      // ignore
    }
  }
  return newKey;
}

function persistCart(userId: string | null, storeId: string | null, storeName: string | null, items: CartLineItem[]): void {
  if (typeof window === 'undefined') return;
  const key = getStorageKey(userId);
  try {
    localStorage.setItem(key, JSON.stringify({ storeId, storeName, items }));
  } catch (e) {
    console.warn('Failed to persist cart:', e);
  }
}

function loadCartData(userId: string | null): CartData {
  if (typeof window === 'undefined') return { storeId: null, storeName: null, items: [] };
  const key = getStorageKey(userId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { storeId: null, storeName: null, items: [] };
    const parsed = JSON.parse(raw);
    return {
      storeId: parsed.storeId || null,
      storeName: parsed.storeName || null,
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch {
    return { storeId: null, storeName: null, items: [] };
  }
}

function mergeCarts(localCart: CartData, serverCart: CartData): CartData {
  if (!localCart.items || localCart.items.length === 0) {
    return serverCart;
  }
  if (!serverCart.items || serverCart.items.length === 0) {
    return localCart;
  }
  if (localCart.storeId === serverCart.storeId) {
    const mergedItems = [...serverCart.items];
    localCart.items.forEach((localItem) => {
      const existing = mergedItems.find((i) => i.product.id === localItem.product.id);
      if (existing) {
        existing.quantity += localItem.quantity;
      } else {
        mergedItems.push(localItem);
      }
    });
    return { storeId: serverCart.storeId, storeName: serverCart.storeName, items: mergedItems };
  }

  // Handle conflicting store IDs with user confirmation
  if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
    const useLocal = window.confirm(
      `تنبيه: لديك منتجات في السلة من متجر "${localCart.storeName || 'مختلف'}" بينما يحتوي حسابك على سلة سابقة من متجر "${serverCart.storeName || 'مختلف'}".\n\nاضغط "موافق" (OK) للابقاء على السلة المحلية، أو "إلغاء" (Cancel) لاستخدام سلة الحساب.`
    );
    if (useLocal) {
      return localCart;
    }
  }

  return serverCart;
}

// Read initial user ID from storage if available
const getInitialUserId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const userRaw = localStorage.getItem('alababak_current_user') || localStorage.getItem('jihat_current_user');
    if (userRaw) {
      const user = JSON.parse(userRaw);
      return user?.id || null;
    }
  } catch {
    // ignore
  }
  return null;
};

const initialUserId = getInitialUserId();
const initialCart = loadCartData(initialUserId);

export const useCartStore = create<CartState>()((set, get) => ({
  userId: initialUserId,
  storeId: initialCart.storeId,
  storeName: initialCart.storeName,
  items: initialCart.items,
  isOpen: false,

  setUserId: (newUserId: string | null) => {
    const currentUserId = get().userId;
    if (currentUserId === newUserId) return;

    if (!newUserId) {
      // Logout: Clear state and return to guest state
      set({
        userId: null,
        storeId: null,
        storeName: null,
        items: [],
      });
      return;
    }

    // Login scenario
    const guestCart = loadCartData(null);
    const userCart = loadCartData(newUserId);
    const merged = mergeCarts(guestCart, userCart);

    // Clear guest cart after merging
    if (typeof window !== 'undefined') {
      localStorage.removeItem('alababak_cart_guest');
      localStorage.removeItem('jihat_cart_guest');
    }

    set({
      userId: newUserId,
      storeId: merged.storeId,
      storeName: merged.storeName,
      items: merged.items,
    });

    persistCart(newUserId, merged.storeId, merged.storeName, merged.items);
  },

  loadCartForUser: (userId: string) => {
    const data = loadCartData(userId);
    set({
      userId,
      storeId: data.storeId,
      storeName: data.storeName,
      items: data.items,
    });
  },

  mergeOnLogin: (serverCart?: CartData) => {
    const state = get();
    const localCart: CartData = {
      storeId: state.storeId,
      storeName: state.storeName,
      items: state.items,
    };

    if (!serverCart) {
      return;
    }

    const merged = mergeCarts(localCart, serverCart);
    set({
      storeId: merged.storeId,
      storeName: merged.storeName,
      items: merged.items,
    });

    persistCart(state.userId, merged.storeId, merged.storeName, merged.items);
  },

  addItem: (product: Product, storeName: string, quantity: number = 1, notes: string = '') => {
    const { storeId, items, userId } = get();

    // 1. Check if adding from a different store
    if (storeId && storeId !== product.store_id && items.length > 0) {
      return { success: false, requiresConfirm: true };
    }

    // 2. Same store or empty cart
    const existingIndex = items.findIndex((i: CartLineItem) => i.product.id === product.id);
    const updatedItems = [...items];
    const existingItem = updatedItems[existingIndex];

    if (existingIndex >= 0 && existingItem) {
      updatedItems[existingIndex] = {
        ...existingItem,
        quantity: existingItem.quantity + quantity,
        notes: notes || existingItem.notes,
      };
    } else {
      updatedItems.push({ product, quantity, notes });
    }

    const newStoreId = product.store_id;

    set({
      storeId: newStoreId,
      storeName,
      items: updatedItems,
    });

    persistCart(userId, newStoreId, storeName, updatedItems);
    return { success: true };
  },

  forceAddItem: (product: Product, storeName: string, quantity: number = 1, notes: string = '') => {
    const { userId } = get();
    const updatedItems = [{ product, quantity, notes }];
    const newStoreId = product.store_id;

    set({
      storeId: newStoreId,
      storeName,
      items: updatedItems,
    });

    persistCart(userId, newStoreId, storeName, updatedItems);
  },

  updateQuantity: (productId: string, quantity: number) => {
    const { userId, items } = get();

    if (quantity <= 0) {
      get().removeItem(productId);
      return;
    }

    const updatedItems = items.map((item: CartLineItem) =>
      item.product.id === productId ? { ...item, quantity } : item
    );

    set({ items: updatedItems });
    persistCart(userId, get().storeId, get().storeName, updatedItems);
  },

  removeItem: (productId: string) => {
    const { userId, items } = get();
    const updatedItems = items.filter((item: CartLineItem) => item.product.id !== productId);

    if (updatedItems.length === 0) {
      set({ storeId: null, storeName: null, items: [] });
      persistCart(userId, null, null, []);
    } else {
      set({ items: updatedItems });
      persistCart(userId, get().storeId, get().storeName, updatedItems);
    }
  },

  updateItemNotes: (productId: string, notes: string) => {
    const { userId, items } = get();
    const updatedItems = items.map((item: CartLineItem) =>
      item.product.id === productId ? { ...item, notes } : item
    );
    set({ items: updatedItems });
    persistCart(userId, get().storeId, get().storeName, updatedItems);
  },

  clearCart: () => {
    const { userId } = get();
    set({ storeId: null, storeName: null, items: [] });
    if (typeof window !== 'undefined') {
      const key = getStorageKey(userId);
      localStorage.removeItem(key);
    }
  },

  setIsOpen: (isOpen: boolean) => {
    set({ isOpen });
  },

  openCart: () => {
    set({ isOpen: true });
  },

  closeCart: () => {
    set({ isOpen: false });
  },

  getSubtotal: () => {
    return get().items.reduce(
      (sum: number, item: CartLineItem) => sum + item.product.price * item.quantity,
      0
    );
  },

  getItemCount: () => {
    return get().items.reduce((sum: number, item: CartLineItem) => sum + item.quantity, 0);
  },
}));
