import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { readStoredCoupons } from "@/features/promotions/services/coupon-service";
import type { Coupon } from "@/types/coupon";
import type { CartItem } from "@/types/cart";

const CART_STORAGE_KEY = "fashion-ecommerce.cart";
const CART_COUPON_STORAGE_KEY = "fashion-ecommerce.cart-coupon";

interface AddCartItemPayload {
  productId: string | number;
  size: string;
  color: string;
  quantity: number;
  priceAtAdd: number;
}

interface CartContextValue {
  cartItems: CartItem[];
  itemCount: number;
  subtotal: number;
  availableCoupons: Coupon[];
  appliedCoupon: Coupon | null;
  discountAmount: number;
  addToCart: (payload: AddCartItemPayload) => void;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  applyCoupon: (code: string) => { success: boolean; message: string };
  clearCoupon: () => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

function readStoredCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(CART_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>(readStoredCart);
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(CART_COUPON_STORAGE_KEY);
  });

  const persist = (nextItems: CartItem[]) => {
    setCartItems(nextItems);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextItems));
    }
  };

  const persistCouponCode = (code: string | null) => {
    setAppliedCouponCode(code);
    if (typeof window !== "undefined") {
      if (!code) window.localStorage.removeItem(CART_COUPON_STORAGE_KEY);
      else window.localStorage.setItem(CART_COUPON_STORAGE_KEY, code);
    }
  };

  const value = useMemo<CartContextValue>(
    () => {
      const availableCoupons: Coupon[] = readStoredCoupons();
      return {
      cartItems,
      itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: cartItems.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0),
      availableCoupons,
      appliedCoupon: availableCoupons.find((coupon) => coupon.code === appliedCouponCode) ?? null,
      discountAmount: (() => {
        const subtotal = cartItems.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);
        const coupon = availableCoupons.find((item) => item.code === appliedCouponCode);
        if (!coupon) return 0;
        return Math.min(coupon.discountAmount, subtotal);
      })(),
      addToCart: ({ productId, size, color, quantity, priceAtAdd }) => {
        const normalizedQty = Math.max(1, quantity);
        const existing = cartItems.find(
          (item) => String(item.productId) === String(productId) && item.size === size && item.color === color,
        );
        if (existing) {
          persist(
            cartItems.map((item) =>
              item.id === existing.id ? { ...item, quantity: item.quantity + normalizedQty } : item,
            ),
          );
          return;
        }

        persist([
          ...cartItems,
          {
            id: `${productId}-${size}-${color}-${Date.now()}`,
            productId,
            size,
            color,
            quantity: normalizedQty,
            priceAtAdd,
          },
        ]);
      },
      updateItemQuantity: (itemId, quantity) => {
        persist(
          cartItems.map((item) =>
            item.id === itemId ? { ...item, quantity: Math.max(1, quantity) } : item,
          ),
        );
      },
      removeFromCart: (itemId) => {
        persist(cartItems.filter((item) => item.id !== itemId));
      },
      applyCoupon: (code) => {
        const normalized = code.trim().toUpperCase();
        if (!normalized) return { success: false, message: "Vui lòng nhập mã giảm giá." };
        const coupon = availableCoupons.find((item) => item.code === normalized);
        if (!coupon) return { success: false, message: "Mã giảm giá không hợp lệ." };
        
        if (coupon.usageLimit !== undefined && (coupon.usageCount ?? 0) >= coupon.usageLimit) {
          return { success: false, message: "Rất tiếc, mã giảm giá này đã hết lượt sử dụng." };
        }
        
        persistCouponCode(coupon.code);
        return {
          success: true,
          message: `Áp dụng mã ${coupon.code}: giảm ${coupon.discountAmount.toLocaleString("vi-VN")}₫.`,
        };
      },
      clearCoupon: () => {
        persistCouponCode(null);
      },
      clearCart: () => {
        persist([]);
        persistCouponCode(null);
      },
      };
    },
    [appliedCouponCode, cartItems],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

