import { AVAILABLE_COUPONS } from "@/features/promotions/data/coupons";
import type { Coupon } from "@/types/coupon";
import { safeLocalStorage } from "@/utils/safe-storage";
import { API_URL } from "@/config/api";

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

function normalizeCoupons(input: unknown): Coupon[] {
  if (!Array.isArray(input)) return [];
  return (input as Coupon[])
    .map((coupon) => ({
      ...coupon,
      code: (coupon?.code || "").toUpperCase(),
      discountAmount: Math.max(0, Number((coupon as any)?.discountAmount ?? (coupon as any)?.value ?? 0)),
      usageLimit: (coupon as any)?.usageLimit !== undefined ? Number((coupon as any).usageLimit) : undefined,
      usageCount: (coupon as any)?.usageCount !== undefined ? Number((coupon as any).usageCount) : undefined,
      isExclusive: Boolean((coupon as any)?.isExclusive),
      applyToSaleItems: (coupon as any)?.applyToSaleItems ?? true,
    }))
    .filter((c) => c.code && c.discountAmount > 0);
}

export async function fetchCouponsFromServer(): Promise<Coupon[]> {
  if (typeof window === "undefined") return [];
  try {
    const res = await fetch(`${API_URL}/settings`);
    if (!res.ok) return [];
    const data = (await res.json()) as { coupons?: unknown };
    return normalizeCoupons(data?.coupons);
  } catch {
    return [];
  }
}

export function getAllCouponsSnapshot(): Coupon[] {
  const stored = readStoredCoupons();
  const merged = [...AVAILABLE_COUPONS, ...stored];
  const byCode = new Map<string, Coupon>();
  for (const c of merged) {
    if (!c?.code) continue;
    byCode.set(c.code.toUpperCase(), { ...c, code: c.code.toUpperCase() });
  }
  return Array.from(byCode.values());
}

