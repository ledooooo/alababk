import { create } from 'zustand';
import { Product, Order } from '../types/domain';

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

  setUserId: (userId: string | null) => void;
  loadCartForUser: (userId: string) => void;
  mergeOnLogin: (serverCart?: CartData) => void;

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

  /**
   * إعادة طلب قديم — بنضيف كل المنتجات الموجودة في الـ order للعربة.
   *
   * المنطق:
   *   1. لو العربة فاضية → بنضيف على طول.
   *   2. لو العربة فيها منتجات من متجر تاني → بنرجّع `requiresConfirm: true`
   *      (الـ UI لازم يعمل clearCart قبل ما ينادي forceReorder).
   *   3. لو العربة من نفس المتجر → بنضيف على المنتجات الموجودة.
   *   4. المنتجات اللي مش متاحة/محذوفة من المتجر → بنرجعها في `skipped`
   *      عشان نعرضها للعميل.
   *
   * الـ `getProductById` لازم يكون متاح (StorageRepo.getProductById) عشان
   * نجيب الـ Product object الكامل. لو مش متاح، بنرجع requiresConfirm: true
   * والـ UI يعرض رسالة "جاري تحميل المنتجات".
   */
  reorderFromHistory: (
    order: Order,
    getProductById: (id: string) => Product | null
  ) => {
    added: number;
    skipped: Array<{ product_id: string; product_name: string; reason: string }>;
    requiresConfirm: boolean;
  };
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
      set({
        userId: null,
        storeId: null,
        storeName: null,
        items: [],
      });
      return;
    }

    const guestCart = loadCartData(null);
    const userCart = loadCartData(newUserId);
    const merged = mergeCarts(guestCart, userCart);

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

    if (storeId && storeId !== product.store_id && items.length > 0) {
      return { success: false, requiresConfirm: true };
    }

    // لو المنتج له حد أدنى للكمية، نضمن إن أول إضافة للعربة توافقه —
    // بدل ما نسمح بإضافة كمية أقل من المسموح بيها للمنتج ده.
    const minQty = product.min_order_quantity && product.min_order_quantity > 1 ? product.min_order_quantity : 1;
    const effectiveQuantity = Math.max(quantity, minQty);

    const existingIndex = items.findIndex((i: CartLineItem) => i.product.id === product.id);
    const updatedItems = [...items];
    const existingItem = updatedItems[existingIndex];

    if (existingIndex >= 0 && existingItem) {
      updatedItems[existingIndex] = {
        ...existingItem,
        quantity: existingItem.quantity + effectiveQuantity,
        notes: notes || existingItem.notes,
      };
    } else {
      updatedItems.push({ product, quantity: effectiveQuantity, notes });
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

  reorderFromHistory: (order, getProductById) => {
    const { storeId, items, userId } = get();
    const skipped: Array<{ product_id: string; product_name: string; reason: string }> = [];
    let added = 0;

    // لو العربة فيها منتجات من متجر مختلف، نطلب confirm قبل ما نمسحها
    if (storeId && storeId !== order.store_id && items.length > 0) {
      return { added: 0, skipped, requiresConfirm: true };
    }

    // لو العربة فاضية، نبدأ من الصفر بالـ storeId الجديد
    const newStoreId = order.store_id;
    const newStoreName = order.store_name || null;
    const updatedItems: CartLineItem[] = storeId === order.store_id ? [...items] : [];

    for (const orderItem of order.items) {
      // جرّب تجيب الـ Product الكامل من الكاش
      const product = getProductById(orderItem.product_id);

      if (!product) {
        // المنتج اتحذف من المتجر أو مش في الكاش
        skipped.push({
          product_id: orderItem.product_id,
          product_name: orderItem.product_name,
          reason: 'غير متاح حالياً',
        });
        continue;
      }

      if (!product.is_active) {
        skipped.push({
          product_id: orderItem.product_id,
          product_name: orderItem.product_name,
          reason: 'أوقفه المتجر',
        });
        continue;
      }

      // المنتج متاح — ضيفه للعربة (لو موجود بالفعل، زوّد الكمية)
      const existingIndex = updatedItems.findIndex((i) => i.product.id === product.id);
      const minQty =
        product.min_order_quantity && product.min_order_quantity > 1
          ? product.min_order_quantity
          : 1;
      const effectiveQuantity = Math.max(orderItem.quantity, minQty);

      if (existingIndex >= 0) {
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          quantity: updatedItems[existingIndex].quantity + effectiveQuantity,
          notes: orderItem.notes || updatedItems[existingIndex].notes,
        };
      } else {
        updatedItems.push({
          product,
          quantity: effectiveQuantity,
          notes: orderItem.notes,
        });
      }
      added++;
    }

    set({
      storeId: newStoreId,
      storeName: newStoreName,
      items: updatedItems,
    });
    persistCart(userId, newStoreId, newStoreName, updatedItems);

    return { added, skipped, requiresConfirm: false };
  },
}));