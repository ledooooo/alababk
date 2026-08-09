import { describe, it, expect, beforeEach } from 'vitest';
import { useCartStore } from './cart-store';
import { Product } from '../types/domain';

const mockProduct: Product = {
  id: 'prod-1',
  store_id: 'store-1',
  name: 'منتج تجريبي',
  description: 'وصف تجريبي',
  price: 100,
  category_name: 'عام',
  image_url: 'https://example.com/image.jpg',
  stock: 10,
  is_active: true,
  unit: 'قطعة',
  created_at: new Date().toISOString(),
};

describe('cart-store', () => {
  beforeEach(() => {
    useCartStore.setState({
      userId: null,
      storeId: null,
      storeName: null,
      items: [],
      isOpen: false,
    });
  });

  it('should add item to empty cart', () => {
    const result = useCartStore.getState().addItem(mockProduct, 'متجر تجريبي', 2);
    expect(result.success).toBe(true);
    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
    expect(items[0].product.id).toBe('prod-1');
  });

  it('should add same product and increase quantity', () => {
    const store = useCartStore.getState();
    store.addItem(mockProduct, 'متجر تجريبي', 2);
    store.addItem(mockProduct, 'متجر تجريبي', 3);

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(5);
  });

  it('should update quantity correctly', () => {
    const store = useCartStore.getState();
    store.addItem(mockProduct, 'متجر تجريبي', 2);
    store.updateQuantity('prod-1', 7);

    const items = useCartStore.getState().items;
    expect(items[0].quantity).toBe(7);
  });

  it('should remove item when quantity set to 0', () => {
    const store = useCartStore.getState();
    store.addItem(mockProduct, 'متجر تجريبي', 2);
    store.updateQuantity('prod-1', 0);

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(0);
  });

  it('should calculate subtotal correctly', () => {
    const store = useCartStore.getState();
    store.addItem(mockProduct, 'متجر تجريبي', 2);
    store.addItem({ ...mockProduct, id: 'prod-2', price: 50 }, 'متجر تجريبي', 3);

    const subtotal = store.getSubtotal();
    expect(subtotal).toBe(100 * 2 + 50 * 3);
  });

  it('should reject items from different stores without confirmation', () => {
    const store = useCartStore.getState();
    store.addItem(mockProduct, 'متجر أول', 1);

    const otherProduct = { ...mockProduct, id: 'prod-2', store_id: 'store-2' };
    const result = store.addItem(otherProduct, 'متجر ثاني', 1);

    expect(result.success).toBe(false);
    expect(result.requiresConfirm).toBe(true);
  });

  it('should force add item from different store', () => {
    const store = useCartStore.getState();
    store.addItem(mockProduct, 'متجر أول', 1);

    const otherProduct = { ...mockProduct, id: 'prod-2', store_id: 'store-2' };
    store.forceAddItem(otherProduct, 'متجر ثاني', 1);

    const items = store.items;
    expect(items).toHaveLength(1);
    expect(items[0].product.store_id).toBe('store-2');
    expect(store.storeName).toBe('متجر ثاني');
  });

  it('should clear cart', () => {
    const store = useCartStore.getState();
    store.addItem(mockProduct, 'متجر تجريبي', 2);
    store.clearCart();

    expect(store.items).toHaveLength(0);
    expect(store.storeId).toBeNull();
    expect(store.storeName).toBeNull();
  });
});