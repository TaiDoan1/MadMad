import { useEffect, useMemo, useState } from "react";
import { Ruler, Sparkles } from "lucide-react";

import type { SizeGuideRow } from "@/types/size-guide";
import {
  recommendSizeFromBodyMetrics,
  SIZE_PROFILE_STORAGE_KEY,
  type SizeFitGender,
  type SizeRecommendationResult,
} from "@/utils/size-recommendation";
import { safeLocalStorage } from "@/utils/safe-storage";

type TranslateFn = (vi: string, en: string) => string;

interface SizeRecommendationPanelProps {
  availableSizes: string[];
  selectedSize: string;
  onSelectSize: (size: string) => void;
  guideRows?: SizeGuideRow[];
  categoryLabel?: string;
  t: TranslateFn;
}

function readSavedProfile() {
  if (typeof window === "undefined") return { height: "", weight: "", gender: "unisex" as SizeFitGender };
  try {
    const raw = safeLocalStorage.getItem(SIZE_PROFILE_STORAGE_KEY);
    if (!raw) return { height: "", weight: "", gender: "unisex" as SizeFitGender };
    const parsed = JSON.parse(raw) as { height?: string; weight?: string; gender?: SizeFitGender };
    return {
      height: parsed.height ?? "",
      weight: parsed.weight ?? "",
      gender: parsed.gender ?? "unisex",
    };
  } catch {
    return { height: "", weight: "", gender: "unisex" as SizeFitGender };
  }
}

export function SizeRecommendationPanel({
  availableSizes,
  selectedSize,
  onSelectSize,
  guideRows,
  categoryLabel,
  t,
}: SizeRecommendationPanelProps) {
  const saved = useMemo(() => readSavedProfile(), []);
  const [heightCm, setHeightCm] = useState(saved.height);
  const [weightKg, setWeightKg] = useState(saved.weight);
  const [gender, setGender] = useState<SizeFitGender>(saved.gender);
  const [result, setResult] = useState<SizeRecommendationResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    safeLocalStorage.setItem(
      SIZE_PROFILE_STORAGE_KEY,
      JSON.stringify({ height: heightCm, weight: weightKg, gender }),
    );
  }, [heightCm, weightKg, gender]);

  const handleRecommend = () => {
    setError("");
    const h = Number(heightCm);
    const w = Number(weightKg);
    if (!h || h < 130 || h > 220) {
      setError(t("Vui lòng nhập chiều cao từ 130–220 cm.", "Please enter height between 130–220 cm."));
      setResult(null);
      return;
    }
    if (!w || w < 30 || w > 150) {
      setError(t("Vui lòng nhập cân nặng từ 30–150 kg.", "Please enter weight between 30–150 kg."));
      setResult(null);
      return;
    }

    const next = recommendSizeFromBodyMetrics({
      heightCm: h,
      weightKg: w,
      availableSizes,
      gender,
      guide: guideRows,
    });
    setResult(next);

    if (next.recommendedSize) {
      onSelectSize(next.recommendedSize);
    }
  };

  const confidenceLabel =
    result?.confidence === "high"
      ? t("Độ tin cậy cao", "High confidence")
      : result?.confidence === "medium"
        ? t("Độ tin cậy trung bình", "Medium confidence")
        : t("Tham khảo thêm size chart", "Check size chart too");

  return (
    <div className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-neutral-50/80 dark:bg-neutral-900/40 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Ruler className="h-4 w-4 text-primary" />
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
          {t("Gợi ý size theo số đo", "Size suggestion by body metrics")}
          {categoryLabel ? (
            <span className="block normal-case font-semibold text-neutral-400 mt-0.5">
              {t(`Danh mục: ${categoryLabel}`, `Category: ${categoryLabel}`)}
            </span>
          ) : null}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
            {t("Chiều cao (cm)", "Height (cm)")}
          </label>
          <input
            type="number"
            min={130}
            max={220}
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            placeholder="170"
            className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-950 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="block text-[9px] font-bold uppercase tracking-wider text-neutral-400 mb-1">
            {t("Cân nặng (kg)", "Weight (kg)")}
          </label>
          <input
            type="number"
            min={30}
            max={150}
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            placeholder="65"
            className="w-full rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-950 px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "unisex", labelVi: "Unisex", labelEn: "Unisex" },
            { id: "male", labelVi: "Nam", labelEn: "Male" },
            { id: "female", labelVi: "Nữ", labelEn: "Female" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setGender(opt.id)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors ${
              gender === opt.id
                ? "border-black dark:border-white bg-black text-white dark:bg-white dark:text-black"
                : "border-black/10 dark:border-white/10 text-neutral-500 hover:border-black/30"
            }`}
          >
            {t(opt.labelVi, opt.labelEn)}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleRecommend}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-black dark:bg-white text-white dark:text-black py-2.5 text-[10px] font-bold uppercase tracking-[0.15em] hover:opacity-90 transition-opacity"
      >
        <Sparkles className="h-3.5 w-3.5" />
        {t("Gợi ý size cho tôi", "Suggest my size")}
      </button>

      {error && <p className="text-[10px] font-semibold text-red-600">{error}</p>}

      {result?.recommendedSize && (
        <div className="rounded-lg border border-green-200 dark:border-green-900/50 bg-green-50/80 dark:bg-green-950/20 p-3 space-y-2">
          <p className="text-xs font-black uppercase tracking-wide text-green-800 dark:text-green-300">
            {t("Size gợi ý:", "Suggested size:")}{" "}
            <span className="text-base">{result.recommendedSize}</span>
            {selectedSize === result.recommendedSize && (
              <span className="ml-2 text-[9px] font-bold normal-case text-green-700 dark:text-green-400">
                ({t("đã chọn", "selected")})
              </span>
            )}
          </p>
          {result.alternativeSize && (
            <p className="text-[10px] font-semibold text-green-700 dark:text-green-400">
              {t("Có thể thử thêm:", "You may also try:")} {result.alternativeSize}
            </p>
          )}
          <p className="text-[9px] text-green-800/80 dark:text-green-300/80">
            BMI: {result.bmi} · {confidenceLabel}
          </p>
          <p className="text-[9px] leading-relaxed text-green-900/70 dark:text-green-200/70">
            {t(result.noteVi, result.noteEn)}
          </p>
        </div>
      )}
    </div>
  );
}
