import type { SizeGuideConfig, SizeGuideRow } from "@/types/size-guide";

export type { SizeGuideRow } from "@/types/size-guide";
export type SizeFitGender = "unisex" | "male" | "female";

/** Bảng tham chiếu chuẩn streetwear (cm / kg) — có thể mở rộng từ admin sau */
export const DEFAULT_SIZE_GUIDE: SizeGuideRow[] = [
  { size: "XS", heightMin: 150, heightMax: 162, weightMin: 38, weightMax: 50 },
  { size: "S", heightMin: 158, heightMax: 170, weightMin: 45, weightMax: 58 },
  { size: "M", heightMin: 165, heightMax: 178, weightMin: 52, weightMax: 68 },
  { size: "L", heightMin: 172, heightMax: 185, weightMin: 60, weightMax: 78 },
  { size: "XL", heightMin: 178, heightMax: 192, weightMin: 68, weightMax: 88 },
  { size: "XXL", heightMin: 185, heightMax: 210, weightMin: 75, weightMax: 105 },
  { size: "2XL", heightMin: 185, heightMax: 210, weightMin: 75, weightMax: 105 },
];

export const DEFAULT_SIZE_GUIDE_CONFIG: SizeGuideConfig = {
  defaultRows: DEFAULT_SIZE_GUIDE,
  byCategory: {},
  byProfile: {},
};

function normalizeRow(row: unknown): SizeGuideRow | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const size = String(r.size ?? "").trim();
  if (!size) return null;
  return {
    size,
    heightMin: Math.max(0, Number(r.heightMin ?? 0)),
    heightMax: Math.max(0, Number(r.heightMax ?? 0)),
    weightMin: Math.max(0, Number(r.weightMin ?? 0)),
    weightMax: Math.max(0, Number(r.weightMax ?? 0)),
  };
}

function normalizeRowMap(input: unknown): Record<string, SizeGuideRow[]> {
  const map: Record<string, SizeGuideRow[]> = {};
  if (!input || typeof input !== "object") return map;
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    const rows = value.map(normalizeRow).filter((r): r is SizeGuideRow => Boolean(r));
    if (rows.length > 0) map[key.trim()] = rows;
  }
  return map;
}

export function normalizeSizeGuideConfig(input: unknown): SizeGuideConfig {
  if (!input || typeof input !== "object") {
    return {
      defaultRows: [...DEFAULT_SIZE_GUIDE],
      byCategory: {},
      byProfile: {},
    };
  }
  const raw = input as {
    defaultRows?: unknown;
    byCategory?: unknown;
    byProfile?: unknown;
    profiles?: unknown;
  };
  const defaultRows = Array.isArray(raw.defaultRows)
    ? raw.defaultRows.map(normalizeRow).filter((r): r is SizeGuideRow => Boolean(r))
    : [];
  const byCategory = normalizeRowMap(raw.byCategory);
  const byProfile = normalizeRowMap(raw.byProfile ?? raw.profiles);

  return {
    defaultRows: defaultRows.length > 0 ? defaultRows : [...DEFAULT_SIZE_GUIDE],
    byCategory,
    byProfile,
  };
}

function findKeyMatch<T>(key: string, map: Record<string, T>): T | undefined {
  const trimmed = key.trim();
  if (!trimmed) return undefined;
  if (map[trimmed]) return map[trimmed];
  const lower = trimmed.toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (k.toLowerCase() === lower) return v;
  }
  return undefined;
}

export function listSizeGuideProfileKeys(config?: SizeGuideConfig | null): string[] {
  const normalized = config ? normalizeSizeGuideConfig(config) : DEFAULT_SIZE_GUIDE_CONFIG;
  return Object.keys(normalized.byProfile).sort((a, b) => a.localeCompare(b, "vi"));
}

export function getSizeGuideRowsForCategory(category: string, config?: SizeGuideConfig | null): SizeGuideRow[] {
  const normalized = config ? normalizeSizeGuideConfig(config) : DEFAULT_SIZE_GUIDE_CONFIG;
  const cat = (category || "").trim();
  const categoryRows = cat ? findKeyMatch(cat, normalized.byCategory) : undefined;
  if (categoryRows?.length) {
    return categoryRows;
  }
  return normalized.defaultRows;
}

/** Ưu tiên: bảng kiểu/form sản phẩm → danh mục → mặc định */
export function getSizeGuideRowsForProduct(
  product: { category: string; sizeGuideProfile?: string | null },
  config?: SizeGuideConfig | null,
): SizeGuideRow[] {
  const normalized = config ? normalizeSizeGuideConfig(config) : DEFAULT_SIZE_GUIDE_CONFIG;
  const profileKey = (product.sizeGuideProfile || "").trim();
  if (profileKey) {
    const profileRows = findKeyMatch(profileKey, normalized.byProfile);
    if (profileRows?.length) {
      return profileRows;
    }
  }
  return getSizeGuideRowsForCategory(product.category, normalized);
}

function normalizeSizeLabel(size: string) {
  return size.trim().toUpperCase().replace(/\s+/g, "");
}

function scoreRow(heightCm: number, weightKg: number, row: SizeGuideRow, gender: SizeFitGender) {
  const heightMid = (row.heightMin + row.heightMax) / 2;
  const weightMid = (row.weightMin + row.weightMax) / 2;

  const heightInRange = heightCm >= row.heightMin && heightCm <= row.heightMax;
  const weightInRange = weightKg >= row.weightMin && weightKg <= row.weightMax;

  const heightDist =
    heightCm < row.heightMin
      ? row.heightMin - heightCm
      : heightCm > row.heightMax
        ? heightCm - row.heightMax
        : 0;
  const weightDist =
    weightKg < row.weightMin
      ? row.weightMin - weightKg
      : weightKg > row.weightMax
        ? weightKg - row.weightMax
        : 0;

  let score = 100 - (heightDist * 1.2 + weightDist * 1.5);

  if (heightInRange && weightInRange) score += 25;
  if (heightInRange) score += 10;
  if (weightInRange) score += 10;

  if (gender === "male" && (heightCm >= row.heightMax - 2 || weightKg >= row.weightMax - 2)) {
    score -= 3;
  }
  if (gender === "female" && heightCm <= row.heightMin + 2) {
    score -= 2;
  }

  score -= Math.abs(heightCm - heightMid) * 0.15;
  score -= Math.abs(weightKg - weightMid) * 0.2;

  return score;
}

export interface SizeRecommendationResult {
  recommendedSize: string | null;
  alternativeSize: string | null;
  confidence: "high" | "medium" | "low";
  bmi: number;
  noteVi: string;
  noteEn: string;
}

export function recommendSizeFromBodyMetrics(params: {
  heightCm: number;
  weightKg: number;
  availableSizes: string[];
  gender?: SizeFitGender;
  guide?: SizeGuideRow[];
}): SizeRecommendationResult {
  const { heightCm, weightKg, availableSizes, gender = "unisex" } = params;
  const guide = params.guide ?? DEFAULT_SIZE_GUIDE;

  const heightM = heightCm / 100;
  const bmi = heightM > 0 ? Math.round((weightKg / (heightM * heightM)) * 10) / 10 : 0;

  const availableSet = new Set(availableSizes.map(normalizeSizeLabel));
  const candidates = guide
    .filter((row) => availableSet.has(normalizeSizeLabel(row.size)))
    .map((row) => ({
      row,
      score: scoreRow(heightCm, weightKg, row, gender),
    }))
    .sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    return {
      recommendedSize: null,
      alternativeSize: null,
      confidence: "low",
      bmi,
      noteVi: "Không tìm được size phù hợp trong danh sách sản phẩm.",
      noteEn: "No matching size found for this product.",
    };
  }

  const best = candidates[0];
  const second = candidates[1];
  const recommendedSize =
    availableSizes.find((s) => normalizeSizeLabel(s) === normalizeSizeLabel(best.row.size)) ?? best.row.size;

  let alternativeSize: string | null = null;
  if (second && second.score >= best.score - 8) {
    alternativeSize =
      availableSizes.find((s) => normalizeSizeLabel(s) === normalizeSizeLabel(second.row.size)) ?? second.row.size;
    if (alternativeSize === recommendedSize) alternativeSize = null;
  }

  const confidence: SizeRecommendationResult["confidence"] =
    best.score >= 95 ? "high" : best.score >= 75 ? "medium" : "low";

  let noteVi =
    "Gợi ý dựa trên chiều cao và cân nặng. Form áo streetwear có thể rộng hơn size thông thường.";
  let noteEn =
    "Suggestion based on height and weight. Streetwear fit may run slightly oversized.";

  if (bmi >= 27) {
    noteVi += " BMI cao — bạn có thể cân nhắc chọn size lớn hơn 1 bậc nếu thích thoải mái.";
    noteEn += " Higher BMI — consider sizing up for a relaxed fit.";
  } else if (bmi < 18.5) {
    noteVi += " BMI thấp — size gợi ý có thể ôm hơn bình thường.";
    noteEn += " Lower BMI — recommended size may fit slimmer.";
  }

  return {
    recommendedSize,
    alternativeSize,
    confidence,
    bmi,
    noteVi,
    noteEn,
  };
}

export const SIZE_PROFILE_STORAGE_KEY = "madmad.size-profile";
