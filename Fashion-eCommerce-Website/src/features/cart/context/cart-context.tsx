import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useProducts } from "@/features/products/context/product-context";
import { readStoredCoupons } from "@/features/promotions/services/coupon-service";
import type { Coupon } from "@/types/coupon";
import type { CartItem } from "@/types/cart";
import { safeLocalStorage } from "@/utils/safe-storage";

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
  const raw = safeLocalStorage.getItem(CART_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];

    // Tự động lọc bỏ các sản phẩm mẫu (mock products) có ID là số hoặc chuỗi số nhỏ (1, 2, 3, 4)
    // để làm sạch bộ nhớ đệm (localStorage) một lần và mãi mãi.
    const cleaned = parsed.filter((item) => {
      const idStr = String(item.productId);
      const isMockId = !isNaN(Number(idStr)) && Number(idStr) < 100;
      return !isMockId;
    });

    if (cleaned.length !== parsed.length) {
      safeLocalStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { products } = useProducts();
  const [cartItems, setCartItems] = useState<CartItem[]>(readStoredCart);
  const [appliedCouponCode, setAppliedCouponCode] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return safeLocalStorage.getItem(CART_COUPON_STORAGE_KEY);
  });

  const persist = (nextItems: CartItem[]) => {
    setCartItems(nextItems);
    if (typeof window !== "undefined") {
      safeLocalStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextItems));
    }
  };

  const persistCouponCode = (code: string | null) => {
    setAppliedCouponCode(code);
    if (typeof window !== "undefined") {
      if (!code) safeLocalStorage.removeItem(CART_COUPON_STORAGE_KEY);
      else safeLocalStorage.setItem(CART_COUPON_STORAGE_KEY, code);
    }
  };

  // Lọc bỏ các sản phẩm không còn tồn tại trong cơ sở dữ liệu.
  const activeCartItems = useMemo(() => {
    if (!products || products.length === 0) return cartItems;
    return cartItems.filter((item) => products.some((p) => String(p.id) === String(item.productId)));
  }, [cartItems, products]);

  // Tự động dọn dẹp các sản phẩm không tồn tại trong Database khỏi LocalStorage khi products đã tải xong.
  // Điều này giải quyết triệt để vấn đề cache sản phẩm cũ, giỏ hàng bị lệch số lượng (ví dụ hiển thị 2 trong khi chỉ có 1).
  useEffect(() => {
    if (!products || products.length === 0) return;
    
    const validItems = cartItems.filter((item) => 
      products.some((p) => String(p.id) === String(item.productId))
    );

    if (validItems.length !== cartItems.length) {
      persist(validItems);
    }
  }, [products, cartItems]);

  // Tự động hủy coupon nếu giỏ hàng phát sinh sản phẩm giảm giá và coupon đó cấu hình KHÔNG áp dụng cho sale items
  useEffect(() => {
    if (!appliedCouponCode || products.length === 0) return;
    const coupons = readStoredCoupons();
    const activeCoupon = coupons.find((c) => c.code === appliedCouponCode);
    if (!activeCoupon) return;

    if (activeCoupon.applyToSaleItems === false) {
      const hasSaleItems = activeCartItems.some((item) => {
        const prod = products.find((p) => String(p.id) === String(item.productId));
        return prod && (prod.discountPercent ?? 0) > 0;
      });
      if (hasSaleItems) {
        persistCouponCode(null);
      }
    }
  }, [appliedCouponCode, activeCartItems, products]);



  const value = useMemo<CartContextValue>(
    () => {
      const availableCoupons: Coupon[] = readStoredCoupons();
      return {
      cartItems: activeCartItems,
      itemCount: activeCartItems.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: activeCartItems.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0),
      availableCoupons,
      appliedCoupon: availableCoupons.find((coupon) => coupon.code === appliedCouponCode) ?? null,
      discountAmount: (() => {
        const subtotal = activeCartItems.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);
        const coupon = availableCoupons.find((item) => item.code === appliedCouponCode);
        if (!coupon) return 0;
        
        // Kiểm tra sale items trong giỏ hàng
        const hasSaleItemsInCart = activeCartItems.some((item) => {
          const prod = products.find((p) => String(p.id) === String(item.productId));
          return prod && (prod.discountPercent ?? 0) > 0;
        });

        if (coupon.applyToSaleItems === false && hasSaleItemsInCart) {
          return 0; // Hủy chiết khấu
        }

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

        // Kiểm tra xem giỏ hàng có chứa sản phẩm giảm giá không
        const hasSaleItemsInCart = activeCartItems.some((item) => {
          const prod = products.find((p) => String(p.id) === String(item.productId));
          return prod && (prod.discountPercent ?? 0) > 0;
        });

        if (coupon.applyToSaleItems === false && hasSaleItemsInCart) {
          return {
            success: false,
            message: `Mã ${coupon.code} không thể áp dụng cho đơn hàng có chứa sản phẩm đang giảm giá.`,
          };
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
    [appliedCouponCode, activeCartItems, cartItems],
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

