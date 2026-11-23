import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useProducts } from "@/features/products/context/product-context";
import {
  formatCouponDiscountLabel,
  validateCoupon,
} from "@/features/promotions/services/coupon-service";
import type { Coupon } from "@/types/coupon";
import type { CartItem } from "@/types/cart";
import { getGiftEligibilityMessage, isGiftEligible, isGiftProduct } from "@/utils/gift-eligibility";
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

interface AddToCartResult {
  success: boolean;
  message?: string;
}

interface CartContextValue {
  cartItems: CartItem[];
  itemCount: number;
  subtotal: number;
  availableCoupons: Coupon[];
  appliedCoupon: Coupon | null;
  discountAmount: number;
  addToCart: (payload: AddCartItemPayload) => AddToCartResult;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
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

function readStoredCoupon(): Coupon | null {
  if (typeof window === "undefined") return null;
  const raw = safeLocalStorage.getItem(CART_COUPON_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    // Định dạng mới: object coupon đầy đủ. Định dạng cũ chỉ lưu mã (chuỗi trần)
    // nên không khôi phục được mức giảm -> bỏ, khách nhập lại mã (server xác thực lại lúc đặt hàng).
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const candidate = parsed as Partial<Coupon>;
    if (typeof candidate.code !== "string" || !candidate.code.trim()) return null;
    const discountType: Coupon["discountType"] =
      candidate.discountType === "percent" ? "percent" : "amount";
    const discountPercentRaw = Number(candidate.discountPercent ?? NaN);
    return {
      code: candidate.code.trim().toUpperCase(),
      discountType,
      discountAmount: Math.max(0, Number(candidate.discountAmount ?? 0) || 0),
      discountPercent: Number.isFinite(discountPercentRaw)
        ? Math.min(100, Math.max(0, discountPercentRaw))
        : undefined,
      applyToSaleItems: candidate.applyToSaleItems ?? true,
    };
  } catch {
    return null;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { products } = useProducts();
  const [cartItems, setCartItems] = useState<CartItem[]>(readStoredCart);
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(readStoredCoupon);

  const persist = (nextItems: CartItem[]) => {
    setCartItems(nextItems);
    if (typeof window !== "undefined") {
      safeLocalStorage.setItem(CART_STORAGE_KEY, JSON.stringify(nextItems));
    }
  };

  // Lưu cả object coupon đã xác thực (không chỉ mã) để load lại trang vẫn tính
  // được discountAmount theo subtotal hiện tại; server xác thực lại lúc đặt hàng.
  const persistCoupon = (coupon: Coupon | null) => {
    setAppliedCoupon(coupon);
    if (typeof window !== "undefined") {
      if (!coupon) safeLocalStorage.removeItem(CART_COUPON_STORAGE_KEY);
      else safeLocalStorage.setItem(CART_COUPON_STORAGE_KEY, JSON.stringify(coupon));
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
    if (!appliedCoupon || products.length === 0) return;
    if (appliedCoupon.applyToSaleItems === false) {
      const hasSaleItems = activeCartItems.some((item) => {
        const prod = products.find((p) => String(p.id) === String(item.productId));
        return prod && (prod.discountPercent ?? 0) > 0;
      });
      if (hasSaleItems) {
        persistCoupon(null);
      }
    }
  }, [appliedCoupon, activeCartItems, products]);

  // Tự động gỡ hàng tặng khi giỏ không còn đủ điều kiện
  useEffect(() => {
    if (!products.length || cartItems.length === 0) return;

    const invalidGiftIds = cartItems
      .filter((item) => {
        const product = products.find((p) => String(p.id) === String(item.productId));
        if (!product || (!isGiftProduct(product) && !item.isGift)) return false;
        return !isGiftEligible(cartItems, products, product);
      })
      .map((item) => item.id);

    if (invalidGiftIds.length > 0) {
      persist(cartItems.filter((item) => !invalidGiftIds.includes(item.id)));
    }
  }, [cartItems, products]);

  const value = useMemo<CartContextValue>(
    () => {
      return {
      cartItems: activeCartItems,
      itemCount: activeCartItems.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: activeCartItems.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0),
      // Không fetch danh sách mã nữa: chỉ còn mã đang áp (nếu có) để shape
      // context không đổi cho các component đang dùng availableCoupons.
      availableCoupons: appliedCoupon ? [appliedCoupon] : [],
      appliedCoupon,
      discountAmount: (() => {
        const subtotal = activeCartItems.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);
        const coupon = appliedCoupon;
        if (!coupon) return 0;

        // Kiểm tra sale items trong giỏ hàng
        const hasSaleItemsInCart = activeCartItems.some((item) => {
          const prod = products.find((p) => String(p.id) === String(item.productId));
          return prod && (prod.discountPercent ?? 0) > 0;
        });

        if (coupon.applyToSaleItems === false && hasSaleItemsInCart) {
          return 0; // Hủy chiết khấu
        }

        const resolvedAmount = coupon.discountType === "percent"
          ? Math.round((subtotal * (coupon.discountPercent ?? 0)) / 100)
          : (coupon.discountAmount ?? 0);

        return Math.min(resolvedAmount, subtotal);
      })(),
      addToCart: ({ productId, size, color, quantity, priceAtAdd }) => {
        const product = products.find((p) => String(p.id) === String(productId));
        const normalizedQty = Math.max(1, quantity);

        if (product && isGiftProduct(product)) {
          if (!isGiftEligible(cartItems, products, product)) {
            return { success: false, message: getGiftEligibilityMessage(product) };
          }

          const existingGift = cartItems.find(
            (item) => String(item.productId) === String(productId) && (item.isGift || isGiftProduct(product)),
          );
          if (existingGift) {
            return { success: false, message: "Quà tặng này đã có trong giỏ hàng." };
          }

          persist([
            ...cartItems,
            {
              id: `${productId}-${size}-${color}-${Date.now()}`,
              productId,
              size,
              color,
              quantity: 1,
              priceAtAdd: 0,
              isGift: true,
            },
          ]);
          return { success: true, message: "Đã thêm quà tặng vào giỏ hàng!" };
        }

        const existing = cartItems.find(
          (item) => String(item.productId) === String(productId) && item.size === size && item.color === color,
        );
        if (existing) {
          persist(
            cartItems.map((item) =>
              item.id === existing.id ? { ...item, quantity: item.quantity + normalizedQty } : item,
            ),
          );
          return { success: true };
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
        return { success: true };
      },
      updateItemQuantity: (itemId, quantity) => {
        const target = cartItems.find((item) => item.id === itemId);
        const product = target
          ? products.find((p) => String(p.id) === String(target.productId))
          : undefined;
        const nextQty =
          target && (target.isGift || isGiftProduct(product))
            ? 1
            : Math.max(1, quantity);

        persist(
          cartItems.map((item) =>
            item.id === itemId ? { ...item, quantity: nextQty } : item,
          ),
        );
      },
      removeFromCart: (itemId) => {
        persist(cartItems.filter((item) => item.id !== itemId));
      },
      applyCoupon: async (code) => {
        const normalized = code.trim().toUpperCase();
        if (!normalized) return { success: false, message: "Vui lòng nhập mã giảm giá." };

        const subtotal = activeCartItems.reduce((sum, item) => sum + item.priceAtAdd * item.quantity, 0);
        const hasSaleItems = activeCartItems.some((item) => {
          const prod = products.find((p) => String(p.id) === String(item.productId));
          return prod && (prod.discountPercent ?? 0) > 0;
        });

        // Xác thực mã qua server (hết hạn / hết lượt / không áp cho sale items
        // đều do server quyết, client không tự tra danh sách mã nữa).
        let result: Awaited<ReturnType<typeof validateCoupon>>;
        try {
          result = await validateCoupon(normalized, subtotal, hasSaleItems);
        } catch {
          return { success: false, message: "Không kiểm tra được mã giảm giá, vui lòng thử lại." };
        }

        if (!result?.valid) {
          return { success: false, message: result?.message || "Mã giảm giá không hợp lệ." };
        }

        const discountPercentRaw = Number(result.discountPercent ?? NaN);
        // discountType luôn được chốt ở đây để khớp chữ ký mới của
        // formatCouponDiscountLabel (yêu cầu discountType bắt buộc).
        const coupon: Coupon & { discountType: "percent" | "amount" } = {
          code: (result.code ?? normalized).toUpperCase(),
          discountType: result.discountType === "percent" ? "percent" : "amount",
          discountAmount: Math.max(0, Number(result.discountAmount ?? 0) || 0),
          discountPercent: Number.isFinite(discountPercentRaw)
            ? Math.min(100, Math.max(0, discountPercentRaw))
            : undefined,
          applyToSaleItems: result.applyToSaleItems ?? true,
        };

        persistCoupon(coupon);
        return {
          success: true,
          message: `Áp dụng mã ${coupon.code}: giảm ${formatCouponDiscountLabel(coupon)}.`,
        };
      },
      clearCoupon: () => {
        persistCoupon(null);
      },
      clearCart: () => {
        persist([]);
        persistCoupon(null);
      },
      };
    },
    [appliedCoupon, activeCartItems, cartItems, products],
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

