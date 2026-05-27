import { AVAILABLE_COUPONS } from "@/features/promotions/data/coupons";
import type { Coupon } from "@/types/coupon";
import { safeLocalStorage } from "@/utils/safe-storage";

export const COUPONS_STORAGE_KEY = "fashion-ecommerce.coupons";

export function readStoredCoupons(): Coupon[] {
  if (typeof window === "undefined") return [];
  const raw = safeLocalStorage.getItem(COUPONS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Coupon[];
    if (!Array.isArray(parsed) || parsed.length === 0) return [];
    const normalized = parsed
      .map((coupon) => ({
        ...coupon,
        code: (coupon.code || "").toUpperCase(),
        discountAmount: Math.max(
          0,
          Number(
            "discountAmount" in coupon
              ? coupon.discountAmount
              : (coupon as unknown as { value?: number }).value,
          ),
        ),
        applyToSaleItems: coupon.applyToSaleItems ?? true, // Default to true
      }))
      .filter((coupon) => coupon.code && coupon.discountAmount > 0);
    return normalized;
  } catch {
    return [];
  }
}

export function saveCoupons(coupons: Coupon[]) {
  if (typeof window === "undefined") return;
  safeLocalStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(coupons));
}

export function incrementCouponUsage(code: string) {
  if (typeof window === "undefined") return;
  const coupons = readStoredCoupons();
  const updated = coupons.map(c => 
    c.code === code 
      ? { ...c, usageCount: (c.usageCount || 0) + 1 } 
      : c
  );
  saveCoupons(updated);
}

