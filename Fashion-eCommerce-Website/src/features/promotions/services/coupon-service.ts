import CryptoJS from "crypto-js";
import type { Coupon } from "@/types/coupon";
import { API_URL } from "@/config/api";

// In-memory cache (not localStorage) - refreshes on every page load, always fresh from API
let cachedCoupons: Coupon[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

export async function fetchCouponsFromServer(forceRefresh = false): Promise<Coupon[]> {
  if (typeof window === "undefined") return [];

  // Return cached if still valid (5 min TTL) - bỏ qua cache nếu forceRefresh=true
  // (vd: khi khách nhập mã không tìm thấy, luôn thử fetch mới trước khi báo "không hợp lệ")
  if (!forceRefresh && cachedCoupons && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedCoupons;
  }

  try {
    // Cache buster: Add timestamp to force fresh fetch from server
    const timestamp = Date.now();
    const res = await fetch(`${API_URL}/settings?t=${timestamp}`);
    if (!res.ok) return [];
    const response = (await res.json()) as { encryptedPayload?: string };

    if (response.encryptedPayload) {
      try {
        const key = "MADMAD_SECURE_PAYLOAD_KEY_2026";
        const decrypted = CryptoJS.AES.decrypt(response.encryptedPayload, key).toString(CryptoJS.enc.Utf8);
        const data = JSON.parse(decrypted);
        const coupons = normalizeCoupons(data?.coupons);
        cachedCoupons = coupons;
        cacheTimestamp = Date.now();
        return coupons;
      } catch {
        return [];
      }
    }
    return [];
  } catch {
    return [];
  }
}

export function getAllCouponsSnapshot(): Coupon[] {
  return cachedCoupons || [];
}

