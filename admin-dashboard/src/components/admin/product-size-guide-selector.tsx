import { Plus, Trash2 } from "lucide-react";

import type { SizeGuideRow } from "@/types/size-guide";
import type { SizeGuideConfig } from "@/types/size-guide";
import { getSizeGuideRowsForCategory } from "@/utils/size-recommendation";

export type ProductSizeGuideMode = "category" | "profile" | "custom";

const EMPTY_ROW: SizeGuideRow = {
  size: "",
  heightMin: 0,
  heightMax: 0,
  weightMin: 0,
  weightMax: 0,
};

export interface ProductSizeGuideSelectorProps {
  mode: ProductSizeGuideMode;
  profileKey: string;
  customRows: SizeGuideRow[];
  category: string;
  profileKeys: string[];
  sizeGuideConfig?: SizeGuideConfig | null;
  settingsHint?: string;
  onChange: (next: {
    mode: ProductSizeGuideMode;
    profileKey: string;
    customRows: SizeGuideRow[];
  }) => void;
}

export function resolveProductSizeGuideMode(product: {
  sizeGuideOverride?: SizeGuideRow[];
  sizeGuideProfile?: string;
}): ProductSizeGuideMode {
  if (product.sizeGuideOverride && product.sizeGuideOverride.length > 0) return "custom";
  if (product.sizeGuideProfile?.trim()) return "profile";
  return "category";
}

export function ProductSizeGuideSelector({
  mode,
  profileKey,
  customRows,
  category,
  profileKeys,
  sizeGuideConfig,
  settingsHint,
  onChange,
}: ProductSizeGuideSelectorProps) {
  const setMode = (nextMode: ProductSizeGuideMode) => {
    if (nextMode === "custom" && customRows.length === 0) {
      const seed = getSizeGuideRowsForCategory(category, sizeGuideConfig).map((r) => ({ ...r }));
      onChange({ mode: nextMode, profileKey: "", customRows: seed });
      return;
    }
    onChange({
      mode: nextMode,
      profileKey: nextMode === "profile" ? profileKey : "",
      customRows: nextMode === "custom" ? customRows : [],
    });
  };

  const updateRow = (index: number, patch: Partial<SizeGuideRow>) => {
    onChange({
      mode: "custom",
      profileKey: "",
      customRows: customRows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    });
  };

  const copyFromCategory = () => {
    const seed = getSizeGuideRowsForCategory(category, sizeGuideConfig).map((r) => ({ ...r }));
    onChange({ mode: "custom", profileKey: "", customRows: seed });
  };

  return (
    <div className="space-y-3 w-full rounded-xl border border-black/10 bg-stone-50/50 p-4">
      <label className="block text-[9px] font-extrabold tracking-widest uppercase text-black/50">
        Gợi ý size cho sản phẩm này
      </label>
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value as ProductSizeGuideMode)}
        className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-xs font-bold"
      >
        <option value="category">Giống danh mục ({category || "mặc định"})</option>
        <option value="profile">Dùng kiểu/form đã tạo (nhiều SP cùng kiểu)</option>
        <option value="custom">Riêng cho từng sản phẩm — áo này khác áo kia</option>
      </select>

      {mode === "profile" && (
        <>
          <select
            value={profileKey}
            onChange={(e) =>
              onChange({ mode: "profile", profileKey: e.target.value, customRows: [] })
            }
            className="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-xs font-bold"
          >
            <option value="">-- Chọn bảng size dùng chung --</option>
            {profileKeys.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
          {profileKeys.length === 0 && (
            <p className="text-[9px] text-amber-700 font-semibold leading-relaxed">
              Chưa có bảng chung. {settingsHint ?? "Tạo trong Cài đặt → Gợi Ý Size → Thêm kiểu / form riêng."}
            </p>
          )}
        </>
      )}

      {mode === "custom" && (
        <div className="rounded-xl border border-black/10 overflow-hidden">
          <div className="flex flex-wrap gap-2 items-center justify-between bg-stone-50 px-3 py-2 border-b border-black/5">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-black/50">
              Bảng size chỉ cho SP này
            </span>
            <button
              type="button"
              onClick={copyFromCategory}
              className="text-[9px] font-bold uppercase tracking-wider text-black/60 hover:text-black underline"
            >
              Sao chép từ danh mục
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-[8px] font-extrabold uppercase text-black/45">
                  <th className="px-2 py-1.5 text-left">Size</th>
                  <th className="px-2 py-1.5 text-left">Cao min</th>
                  <th className="px-2 py-1.5 text-left">Cao max</th>
                  <th className="px-2 py-1.5 text-left">Nặng min</th>
                  <th className="px-2 py-1.5 text-left">Nặng max</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {customRows.map((row, index) => (
                  <tr key={index} className="border-t border-black/5">
                    <td className="px-1.5 py-1">
                      <input
                        value={row.size}
                        onChange={(e) => updateRow(index, { size: e.target.value.toUpperCase() })}
                        className="w-12 rounded border border-black/10 px-1 py-0.5 font-mono font-bold"
                      />
                    </td>
                    {(["heightMin", "heightMax", "weightMin", "weightMax"] as const).map((field) => (
                      <td key={field} className="px-1.5 py-1">
                        <input
                          type="number"
                          value={row[field]}
                          onChange={(e) => updateRow(index, { [field]: Number(e.target.value) })}
                          className="w-14 rounded border border-black/10 px-1 py-0.5 font-semibold"
                        />
                      </td>
                    ))}
                    <td className="px-1 py-1">
                      <button
                        type="button"
                        onClick={() =>
                          onChange({
                            mode: "custom",
                            profileKey: "",
                            customRows: customRows.filter((_, i) => i !== index),
                          })
                        }
                        className="p-1 text-stone-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={() =>
              onChange({
                mode: "custom",
                profileKey: "",
                customRows: [...customRows, { ...EMPTY_ROW, size: "M" }],
              })
            }
            className="w-full flex items-center justify-center gap-1 py-2 text-[9px] font-bold uppercase tracking-wider text-black/50 hover:bg-stone-50 border-t border-black/5"
          >
            <Plus className="h-3 w-3" />
            Thêm dòng size
          </button>
        </div>
      )}

      <p className="text-[9px] text-black/40 leading-relaxed">
        {mode === "category" &&
          "Mọi SP cùng danh mục dùng chung bảng (chỉnh tại Cài đặt → Gợi Ý Size)."}
        {mode === "profile" &&
          "Nhiều áo cùng form — chọn bảng chung đã tạo (hoặc gán hàng loạt trong Cài đặt → Gợi Ý Size)."}
        {mode === "custom" &&
          "Áo này size khác áo kia: chỉnh bảng ngay tại đây, không ảnh hưởng SP khác."}
      </p>
    </div>
  );
}
