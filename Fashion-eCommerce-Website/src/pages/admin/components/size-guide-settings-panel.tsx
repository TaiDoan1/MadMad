import { useEffect, useMemo, useState } from "react";
import { Plus, RotateCcw, Save, Trash2 } from "lucide-react";

import { useStorefrontSettings } from "@/features/settings/context/storefront-settings-context";
import type { SizeGuideConfig, SizeGuideRow } from "@/types/size-guide";
import { DEFAULT_SIZE_GUIDE, normalizeSizeGuideConfig } from "@/utils/size-recommendation";
import { useToast } from "@/components/common/toast";

const EMPTY_ROW: SizeGuideRow = {
  size: "",
  heightMin: 0,
  heightMax: 0,
  weightMin: 0,
  weightMax: 0,
};

const PROFILE_PREFIX = "profile:";

function cloneConfig(config: SizeGuideConfig): SizeGuideConfig {
  return {
    defaultRows: config.defaultRows.map((r) => ({ ...r })),
    byCategory: Object.fromEntries(
      Object.entries(config.byCategory).map(([k, rows]) => [k, rows.map((r) => ({ ...r }))]),
    ),
    byProfile: Object.fromEntries(
      Object.entries(config.byProfile).map(([k, rows]) => [k, rows.map((r) => ({ ...r }))]),
    ),
  };
}

function isProfileTarget(target: string) {
  return target.startsWith(PROFILE_PREFIX);
}

function profileNameFromTarget(target: string) {
  return target.slice(PROFILE_PREFIX.length);
}

export function SizeGuideSettingsPanel() {
  const { showToast } = useToast();
  const { settings, updateSettings } = useStorefrontSettings();
  const categories = settings.productOptions?.categories ?? [];

  const [draft, setDraft] = useState<SizeGuideConfig>(() =>
    cloneConfig(normalizeSizeGuideConfig(settings.sizeGuide)),
  );
  const [editTarget, setEditTarget] = useState<string>("default");
  const [newCategory, setNewCategory] = useState("");
  const [newProfile, setNewProfile] = useState("");

  useEffect(() => {
    setDraft(cloneConfig(normalizeSizeGuideConfig(settings.sizeGuide)));
  }, [settings.sizeGuide]);

  const activeRows = useMemo(() => {
    if (editTarget === "default") return draft.defaultRows;
    if (isProfileTarget(editTarget)) {
      return draft.byProfile[profileNameFromTarget(editTarget)] ?? [];
    }
    return draft.byCategory[editTarget] ?? [];
  }, [draft, editTarget]);

  const editLabel = useMemo(() => {
    if (editTarget === "default") return "Bảng mặc định";
    if (isProfileTarget(editTarget)) return `Kiểu/Form: ${profileNameFromTarget(editTarget)}`;
    return `Danh mục: ${editTarget}`;
  }, [editTarget]);

  const setActiveRows = (rows: SizeGuideRow[]) => {
    if (editTarget === "default") {
      setDraft((c) => ({ ...c, defaultRows: rows }));
      return;
    }
    if (isProfileTarget(editTarget)) {
      const name = profileNameFromTarget(editTarget);
      setDraft((c) => ({
        ...c,
        byProfile: { ...c.byProfile, [name]: rows },
      }));
      return;
    }
    setDraft((c) => ({
      ...c,
      byCategory: { ...c.byCategory, [editTarget]: rows },
    }));
  };

  const updateRow = (index: number, patch: Partial<SizeGuideRow>) => {
    const next = activeRows.map((row, i) => (i === index ? { ...row, ...patch } : row));
    setActiveRows(next);
  };

  const addRow = () => setActiveRows([...activeRows, { ...EMPTY_ROW, size: "M" }]);

  const removeRow = (index: number) => setActiveRows(activeRows.filter((_, i) => i !== index));

  const handleSave = () => {
    const normalized = normalizeSizeGuideConfig(draft);
    updateSettings({ sizeGuide: normalized });
    showToast("Đã lưu bảng gợi ý size lên hệ thống!", "success");
  };

  const handleResetDefault = () => {
    if (!window.confirm("Khôi phục bảng mặc định? Các chỉnh sửa bảng default sẽ bị ghi đè.")) return;
    setDraft((c) => ({ ...c, defaultRows: DEFAULT_SIZE_GUIDE.map((r) => ({ ...r })) }));
    setEditTarget("default");
  };

  const handleAddCategoryOverride = () => {
    const cat = newCategory.trim();
    if (!cat) return;
    if (draft.byCategory[cat]) {
      showToast("Danh mục này đã có bảng riêng.", "warning");
      setEditTarget(cat);
      return;
    }
    setDraft((c) => ({
      ...c,
      byCategory: {
        ...c.byCategory,
        [cat]: draft.defaultRows.map((r) => ({ ...r })),
      },
    }));
    setEditTarget(cat);
    setNewCategory("");
  };

  const handleAddProfile = () => {
    const name = newProfile.trim();
    if (!name) return;
    if (draft.byProfile[name]) {
      showToast("Kiểu/form này đã có bảng riêng.", "warning");
      setEditTarget(`${PROFILE_PREFIX}${name}`);
      return;
    }
    setDraft((c) => ({
      ...c,
      byProfile: {
        ...c.byProfile,
        [name]: draft.defaultRows.map((r) => ({ ...r })),
      },
    }));
    setEditTarget(`${PROFILE_PREFIX}${name}`);
    setNewProfile("");
    showToast(`Đã tạo bảng "${name}". Gán kiểu này trong form sản phẩm.`, "success");
  };

  const handleCopyFromDefault = () => {
    if (editTarget === "default") return;
    const rows = draft.defaultRows.map((r) => ({ ...r }));
    if (isProfileTarget(editTarget)) {
      const name = profileNameFromTarget(editTarget);
      setDraft((c) => ({
        ...c,
        byProfile: { ...c.byProfile, [name]: rows },
      }));
    } else {
      setDraft((c) => ({
        ...c,
        byCategory: { ...c.byCategory, [editTarget]: rows },
      }));
    }
    showToast(`Đã sao chép bảng mặc định sang "${editLabel}".`, "success");
  };

  const handleDeleteOverride = () => {
    if (editTarget === "default") return;
    if (!window.confirm(`Xóa bảng riêng "${editLabel}"?`)) return;

    if (isProfileTarget(editTarget)) {
      const name = profileNameFromTarget(editTarget);
      const next = { ...draft.byProfile };
      delete next[name];
      setDraft((c) => ({ ...c, byProfile: next }));
    } else {
      const next = { ...draft.byCategory };
      delete next[editTarget];
      setDraft((c) => ({ ...c, byCategory: next }));
    }
    setEditTarget("default");
  };

  return (
    <div className="space-y-6 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-xs font-extrabold tracking-widest text-black/75 uppercase">Bảng gợi ý size (chiều cao & cân nặng)</h3>
        <p className="text-[10px] text-black/45 mt-1 leading-relaxed">
          <strong>Danh mục:</strong> áp dụng cho mọi SP cùng danh mục (Áo Thun, Áo Khoác…).{" "}
          <strong>Kiểu/Form:</strong> mỗi kiểu áo size khác nhau — tạo bảng riêng rồi chọn trong form sản phẩm.
          Thứ tự ưu tiên trên shop: <em>Kiểu/Form SP → Danh mục → Mặc định</em>.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-[9px] font-extrabold uppercase tracking-wider text-black/50 mb-1">Đang chỉnh</label>
          <select
            value={editTarget}
            onChange={(e) => setEditTarget(e.target.value)}
            className="rounded-xl border border-black/10 bg-stone-50 px-3 py-2 text-xs font-bold min-w-[240px]"
          >
            <option value="default">Bảng mặc định (fallback)</option>
            {Object.keys(draft.byCategory).length > 0 && (
              <optgroup label="Theo danh mục">
                {Object.keys(draft.byCategory).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </optgroup>
            )}
            {Object.keys(draft.byProfile).length > 0 && (
              <optgroup label="Theo kiểu / form (gán từng SP)">
                {Object.keys(draft.byProfile).map((name) => (
                  <option key={name} value={`${PROFILE_PREFIX}${name}`}>
                    {name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
        {editTarget !== "default" && (
          <>
            <button
              type="button"
              onClick={handleCopyFromDefault}
              className="rounded-xl border border-black/15 px-3 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-stone-50"
            >
              Sao chép từ mặc định
            </button>
            <button
              type="button"
              onClick={handleDeleteOverride}
              className="rounded-xl border border-red-200 text-red-700 px-3 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-red-50"
            >
              Xóa bảng riêng
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-black/5 pt-4">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-[9px] font-extrabold uppercase tracking-wider text-black/50 mb-1">
              Thêm bảng theo danh mục
            </label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full rounded-xl border border-black/10 bg-stone-50 px-3 py-2 text-xs font-bold"
            >
              <option value="">-- Chọn danh mục --</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAddCategoryOverride}
            className="flex items-center gap-1.5 rounded-xl bg-black text-white px-4 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-red-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm DM
          </button>
        </div>

        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-[9px] font-extrabold uppercase tracking-wider text-black/50 mb-1">
              Thêm kiểu / form riêng
            </label>
            <input
              type="text"
              value={newProfile}
              onChange={(e) => setNewProfile(e.target.value)}
              placeholder="VD: Áo thun oversize, Áo khoác boxy"
              className="w-full rounded-xl border border-black/10 bg-stone-50 px-3 py-2 text-xs font-bold"
            />
          </div>
          <button
            type="button"
            onClick={handleAddProfile}
            className="flex items-center gap-1.5 rounded-xl bg-black text-white px-4 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-red-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm kiểu
          </button>
        </div>
      </div>

      <p className="text-[10px] font-semibold text-black/50">
        Đang sửa: <span className="text-black">{editLabel}</span>
      </p>

      <div className="overflow-x-auto rounded-xl border border-black/10">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-stone-50 text-[9px] font-extrabold uppercase tracking-wider text-black/60">
              <th className="px-3 py-2 text-left">Size</th>
              <th className="px-3 py-2 text-left">Cao min (cm)</th>
              <th className="px-3 py-2 text-left">Cao max (cm)</th>
              <th className="px-3 py-2 text-left">Nặng min (kg)</th>
              <th className="px-3 py-2 text-left">Nặng max (kg)</th>
              <th className="px-3 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {activeRows.map((row, index) => (
              <tr key={index} className="border-t border-black/5">
                <td className="px-2 py-1.5">
                  <input
                    value={row.size}
                    onChange={(e) => updateRow(index, { size: e.target.value.toUpperCase() })}
                    className="w-16 rounded-lg border border-black/10 px-2 py-1 font-mono font-bold"
                  />
                </td>
                {(["heightMin", "heightMax", "weightMin", "weightMax"] as const).map((field) => (
                  <td key={field} className="px-2 py-1.5">
                    <input
                      type="number"
                      value={row[field]}
                      onChange={(e) => updateRow(index, { [field]: Number(e.target.value) })}
                      className="w-20 rounded-lg border border-black/10 px-2 py-1 font-semibold"
                    />
                  </td>
                ))}
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="p-1.5 text-stone-400 hover:text-red-600"
                    title="Xóa dòng"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={addRow}
          className="flex items-center gap-1.5 rounded-xl border border-black/15 px-4 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-stone-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm dòng
        </button>
        {editTarget === "default" && (
          <button
            type="button"
            onClick={handleResetDefault}
            className="flex items-center gap-1.5 rounded-xl border border-black/15 px-4 py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-stone-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Khôi phục mặc định
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 rounded-xl bg-black text-white hover:bg-red-700 px-6 py-2 text-xs font-bold tracking-widest uppercase ml-auto"
        >
          <Save className="h-4 w-4" />
          Lưu bảng size
        </button>
      </div>
    </div>
  );
}
