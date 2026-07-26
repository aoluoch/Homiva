import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Product } from "@/types/models";

const CART_KEY = "homiva_marketplace_cart";

export interface CartItem {
  productId: string;
  title: string;
  price: number;
  stock: number;
  sellerId: string;
  storeName?: string;
  coverImageId?: string;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  addProduct: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

function readCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CART_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item?.productId && item?.quantity > 0);
  } catch {
    return [];
  }
}

function toCartItem(product: Product, quantity: number): CartItem {
  return {
    productId: product.$id,
    title: product.title,
    price: Number(product.price || 0),
    stock: Number(product.stock || 0),
    sellerId: product.sellerId,
    storeName: product.storeName,
    coverImageId: product.coverImageId,
    quantity,
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readCart);

  useEffect(() => {
    window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addProduct = useCallback((product: Product, quantity = 1) => {
    if (product.stock <= 0) return;
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.$id);
      const nextQty = Math.max(1, Math.floor(quantity));
      if (!existing) {
        return [...current, toCartItem(product, Math.min(product.stock, nextQty))];
      }
      return current.map((item) =>
        item.productId === product.$id
          ? {
              ...toCartItem(product, Math.min(product.stock, item.quantity + nextQty)),
            }
          : item,
      );
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setItems((current) =>
      current
        .map((item) =>
          item.productId === productId
            ? {
                ...item,
                quantity: Math.min(item.stock, Math.max(1, Math.floor(quantity))),
              }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.productId !== productId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      addProduct,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [addProduct, clearCart, items, removeItem, updateQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider.");
  return ctx;
}
