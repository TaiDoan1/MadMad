/**
 * address-service.ts
 * Dùng API provinces.open-api.vn v2 — chuẩn hành chính 2 cấp mới của Việt Nam (từ 01/07/2025)
 * Cấu trúc: Tỉnh / Thành phố → Phường / Xã (đã bỏ cấp Quận / Huyện)
 */

export type AddressOption = { code: string; name: string };

const API_BASE = "https://provinces.open-api.vn/api/v2";

// ── Cache ──────────────────────────────────────────────────────────────────────
let provincesCache: AddressOption[] | null = null;
// Lưu danh sách phường theo code tỉnh: { "79": [...], "1": [...] }
const wardsCache: Record<string, AddressOption[]> = {};

// ── Helper: loại bỏ prefix "Tỉnh ", "Thành phố ", "Phường ", "Xã " ... để giao diện gọn hơn ──
// Không rút gọn vì muốn giữ nguyên tên chính thức để giao hàng chính xác.

// ── Provinces ─────────────────────────────────────────────────────────────────
export async function getProvinces(): Promise<AddressOption[]> {
  if (provincesCache) return provincesCache;
  try {
    const res = await fetch(`${API_BASE}/p`, { cache: "force-cache" });
    if (!res.ok) throw new Error("provinces fetch failed");
    const data: { code: number; name: string }[] = await res.json();
    provincesCache = data.map((p) => ({ code: String(p.code), name: p.name }));
    return provincesCache;
  } catch {
    return [];
  }
}

// ── Wards by Province ─────────────────────────────────────────────────────────
export async function getWardsByProvinceCode(provinceCode: string): Promise<AddressOption[]> {
  if (!provinceCode) return [];
  if (wardsCache[provinceCode]) return wardsCache[provinceCode];
  try {
    const res = await fetch(`${API_BASE}/p/${provinceCode}?depth=2`, { cache: "force-cache" });
    if (!res.ok) throw new Error("wards fetch failed");
    const data: { wards: { code: number; name: string }[] } = await res.json();
    const wards = (data.wards ?? []).map((w) => ({ code: String(w.code), name: w.name }));
    wardsCache[provinceCode] = wards;
    return wards;
  } catch {
    return [];
  }
}

// ── Name resolvers ─────────────────────────────────────────────────────────────
export async function getProvinceNameByCode(code: string): Promise<string> {
  const list = await getProvinces();
  return list.find((p) => p.code === code)?.name ?? "";
}

export async function getWardNameByCode(code: string, provinceCode?: string): Promise<string> {
  // Nếu biết provinceCode thì tìm nhanh từ cache
  if (provinceCode) {
    const list = await getWardsByProvinceCode(provinceCode);
    const found = list.find((w) => w.code === code);
    if (found) return found.name;
  }
  // Tìm trong toàn bộ cache đang có
  for (const wards of Object.values(wardsCache)) {
    const found = wards.find((w) => w.code === code);
    if (found) return found.name;
  }
  return "";
}

// ── Backward-compat: hàm cũ (dùng district) — giờ trả về rỗng để tránh lỗi build ──
/** @deprecated Không còn cấp huyện từ 01/07/2025 */
export async function getDistrictsByProvinceCode(_provinceCode: string): Promise<AddressOption[]> {
  return [];
}

/** @deprecated Không còn cấp huyện từ 01/07/2025 */
export async function getWardsByDistrictCode(_districtCode: string): Promise<AddressOption[]> {
  return [];
}

/** @deprecated Không còn cấp huyện từ 01/07/2025 */
export async function getDistrictNameByCode(_code: string): Promise<string> {
  return "";
}
