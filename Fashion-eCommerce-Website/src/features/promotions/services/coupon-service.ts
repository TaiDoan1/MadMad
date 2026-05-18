import { AVAILABLE_COUPONS } from "@/features/promotions/data/coupons";
import type { Coupon } from "@/types/coupon";

export const COUPONS_STORAGE_KEY = "fashion-ecommerce.coupons";

export function readStoredCoupons(): Coupon[] {
  if (typeof window === "undefined") return AVAILABLE_COUPONS;
  const raw = window.localStorage.getItem(COUPONS_STORAGE_KEY);
  if (!raw) return AVAILABLE_COUPONS;
  try {
    const parsed = JSON.parse(raw) as Coupon[];
    if (!Array.isArray(parsed) || parsed.length === 0) return AVAILABLE_COUPONS;
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
      }))
      .filter((coupon) => coupon.code && coupon.discountAmount > 0);
    return normalized.length > 0 ? normalized : AVAILABLE_COUPONS;
  } catch {
    return AVAILABLE_COUPONS;
  }
}

export function saveCoupons(coupons: Coupon[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COUPONS_STORAGE_KEY, JSON.stringify(coupons));
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

