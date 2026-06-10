import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CartItem {
  product_id: string;
  name:       string;
  brand:      string;
  price:      number;
  image_url:  string | null;
  quantity:   number;
  stock:      number;
}

interface CartContextType {
  items:       CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => void;
  removeItem:  (product_id: string) => void;
  updateQty:   (product_id: string, quantity: number) => void;
  clearCart:   () => void;
  totalAmount: number;
  totalCount:  number;
}

const CartContext = createContext<CartContextType | null>(null);

const CART_KEY = 'nier_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Сохраняем в localStorage при каждом изменении
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (item: Omit<CartItem, 'quantity'>, qty = 1) => {
  setItems(prev => {
    const existing = prev.find(i => i.product_id === item.product_id);
    if (existing) {
      return prev.map(i =>
        i.product_id === item.product_id
          ? { ...i, quantity: Math.min(i.quantity + qty, item.stock) }
          : i
      );
    }
    return [...prev, { ...item, quantity: Math.min(qty, item.stock) }];
  });
};

  const removeItem = (product_id: string) => {
    setItems(prev => prev.filter(i => i.product_id !== product_id));
  };

  const updateQty = (product_id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(product_id);
      return;
    }
    setItems(prev =>
      prev.map(i =>
        i.product_id === product_id
          ? { ...i, quantity: Math.min(quantity, i.stock) }
          : i
      )
    );
  };

  const clearCart = () => setItems([]);

  const totalAmount = items.reduce(
    (sum, i) => sum + i.price * i.quantity, 0
  );

  const totalCount = items.reduce(
    (sum, i) => sum + i.quantity, 0
  );

  return (
    <CartContext.Provider value={{
      items,
      addItem,
      removeItem,
      updateQty,
      clearCart,
      totalAmount,
      totalCount,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}