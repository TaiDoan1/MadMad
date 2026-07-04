import { useEffect, useMemo, useState } from "react";
import { Save, Search } from "lucide-react";

import { API_URL } from "@/config/api";
import { useProducts } from "@/features/products/context/product-context";
import type { SizeGuideConfig, SizeGuideRow } from "@/types/size-guide";
import type { Product } from "@/types/product";
import {
  applyAssignmentToProduct,
  describeProductSizeGuideAssignment,
  getProductSizeGuideAssignment,
  type ProductSizeGuideAssignment,
} from "@/utils/product-size-guide-assignment";
import { getSizeGuideRowsForCategory, listSizeGuideProfileKeys } from "@/utils/size-recommendation";
import { useToast } from "@/components/common/toast";

type AssignTarget = { kind: "category" } | { kind: "profile"; key: string };

interface DraftEntry {
  assignment: ProductSizeGuideAssignment;
  customRows?: SizeGuideRow[];
}

function buildDraftFromProducts(products: Product[]): Record<string, DraftEntry> {
  const draft: Record<string, DraftEntry> = {};
  for (const product of products) {
    const assignment = getProductSizeGuideAssignment(product);
    draft[String(product.id)] = {
      assignment,
      customRows: product.sizeGuideOverride?.map((r) => ({ ...r })),
    };
  }
  return draft;
}

export function SizeGuideProductAssignments({ sizeGuide }: { sizeGuide?: SizeGuideConfig | null }) {
  const { showToast } = useToast();
  const { products, refreshProducts, isLoading } = useProducts();
  const profileKeys = useMemo(() => listSizeGuideProfileKeys(sizeGuide), [sizeGuide]);

  const [assignTarget, setAssignTarget] = useState<AssignTarget>({ kind: "category" });
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Record<string, DraftEntry>>({});
  const [expandedCustomId, setExpandedCustomId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (products.length === 0) return;
    setDraft(buildDraftFromProducts(products));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        String(p.sku ?? "").toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    );
  }, [products, search]);

  const isCheckedForTarget = (productId: string) => {
    const entry = draft[productId];
    if (!entry) return false;
    if (assignTarget.kind === "category") {
      return entry.assignment.type === "category";
    }
    return (
      entry.assignment.type === "profile" && entry.assignment.profileKey === assignTarget.key
    );
  };

  const toggleProduct = (product: Product) => {
    const id = String(product.id);
    const checked = isCheckedForTarget(id);
    setDraft((current) => {
      const next = { ...current };
      if (checked) {
        next[id] = { assignment: { type: "category" } };
        return next;
      }
      if (assignTarget.kind === "profile") {
        next[id] = { assignment: { type: "profile", profileKey: assignTarget.key } };
        return next;
      }
      next[id] = { assignment: { type: "category" } };
      return next;
    });
  };

  const setProductCustom = (product: Product, rows: SizeGuideRow[]) => {
    const id = String(product.id);
    setDraft((current) => ({
      ...current,
      [id]: { assignment: { type: "custom" }, customRows: rows },
    }));
  };

  const startCustomForProduct = (product: Product) => {
    const id = String(product.id);
    const existing = draft[id]?.customRows;
    const seed =
      existing && existing.length > 0
        ? existing.map((r) => ({ ...r }))
        : getSizeGuideRowsForCategory(product.category, sizeGuide).map((r) => ({ ...r }));
    setProductCustom(product, seed);
    setExpandedCustomId(id);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    let ok = 0;
    let fail = 0;
    let skipped = 0;

    for (const product of products) {
      const id = String(product.id);
      const entry = draft[id];
      if (!entry) continue;

      const updated = applyAssignmentToProduct(product, entry.assignment, entry.customRows);
      const changed =
        (product.sizeGuideProfile ?? "") !== (updated.sizeGuideProfile ?? "") ||
        JSON.stringify(product.sizeGuideOverride ?? null) !==
          JSON.stringify(updated.sizeGuideOverride ?? null);

      if (!changed) {
        skipped += 1;
        continue;
      }

      try {
        const res = await fetch(`${API_URL}/products/${product.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        });
        if (res.ok) ok += 1;
        else fail += 1;
      } catch {
        fail += 1;
      }
    }

    await refreshProducts();
    setSaving(false);

    if (fail === 0) {
      showToast(
        ok > 0
          ? `Đã đồng bộ gán bảng size cho ${ok} sản phẩm${skipped > 0 ? ` (${skipped} SP không đổi).` : "."}`
          : "Không có thay đổi cần lưu.",
        ok > 0 ? "success" : "warning",
      );
    } else {
      showToast(`Đã lưu ${ok} SP, ${fail} SP lỗi.`, "warning");
    }
  };

  const summaryByType = useMemo(() => {
    const counts = { category: 0, profile: 0, custom: 0 };
    for (const product of products) {
      const entry = draft[String(product.id)];
      const type = entry?.assignment.type ?? getProductSizeGuideAssignment(product).type;
      counts[type] += 1;
    }
    return counts;
  }, [products, draft]);

  return (
    <div className="space-y-4 rounded-2xl border border-black/10 bg-stone-50/80 p-5">
      <div>
        <h4 className="text-[10px] font-extrabold tracking-widest text-black/70 uppercase">
          Gán sản phẩm vào bảng size
        </h4>
        <p className="text-[10px] text-black/45 mt-1 leading-relaxed">
          Chọn <strong>bảng chung</strong> rồi tick sản phẩm dùng bảng đó. SP không tick profile và không có bảng riêng →
          tự dùng bảng theo <strong>danh mục</strong>. SP cần size khác hẳn → bật <strong>bảng riêng</strong> bên dưới.
        </p>
        <p className="text-[9px] text-black/40 mt-2">
          Theo danh mục: {summaryByType.category} SP · Bảng chung: {summaryByType.profile} SP · Riêng từng SP:{" "}
          {summaryByType.custom} SP
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[9px] font-extrabold uppercase tracking-wider text-black/50 mb-1">
            Gán tick vào bảng
          </label>
          <select
            value={assignTarget.kind === "profile" ? `profile:${assignTarget.key}` : "category"}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "category") setAssignTarget({ kind: "category" });
              else setAssignTarget({ kind: "profile", key: v.replace("profile:", "") });
            }}
            className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold"
          >
            <option value="category">Theo danh mục (bỏ bảng chung / riêng)</option>
            {profileKeys.map((key) => (
              <option key={key} value={`profile:${key}`}>
                Bảng chung: {key}
              </option>
            ))}
          </select>
          {profileKeys.length === 0 && (
            <p className="text-[9px] text-amber-700 mt-1">
              Chưa có bảng chung — dùng「Thêm kiểu / form riêng」phía trên để tạo (vd. Áo oversize).
            </p>
          )}
        </div>
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-black/30" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm tên, SKU, danh mục..."
            className="w-full rounded-xl border border-black/10 bg-white pl-9 pr-3 py-2 text-xs font-semibold"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-black/50">Đang tải danh sách sản phẩm...</p>
      ) : products.length === 0 ? (
        <p className="text-xs text-black/50">Chưa có sản phẩm trong hệ thống.</p>
      ) : (
        <div className="max-h-72 overflow-y-auto rounded-xl border border-black/10 bg-white divide-y divide-black/5">
          {filteredProducts.map((product) => {
            const id = String(product.id);
            const entry = draft[id];
            const label = describeProductSizeGuideAssignment(
              applyAssignmentToProduct(product, entry?.assignment ?? { type: "category" }, entry?.customRows),
            );
            const isCustom = entry?.assignment.type === "custom";
            const expanded = expandedCustomId === id;

            return (
              <div key={id} className="p-3 space-y-2">
                <div className="flex flex-wrap items-start gap-3">
                  <label className="flex items-start gap-2 cursor-pointer flex-1 min-w-[200px]">
                    <input
                      type="checkbox"
                      checked={isCheckedForTarget(id)}
                      disabled={assignTarget.kind === "profile" && isCustom}
                      onChange={() => toggleProduct(product)}
                      className="mt-0.5"
                    />
                    <span className="text-xs font-bold text-black leading-snug">
                      {product.name}
                      <span className="block text-[9px] font-semibold text-black/45 normal-case mt-0.5">
                        {product.category}
                        {product.sku ? ` · ${product.sku}` : ""} · {label}
                      </span>
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {!isCustom ? (
                      <button
                        type="button"
                        onClick={() => startCustomForProduct(product)}
                        className="rounded-lg border border-black/15 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider hover:bg-stone-50"
                      >
                        Bảng riêng SP
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setExpandedCustomId(expanded ? null : id)}
                          className="rounded-lg border border-black/15 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider hover:bg-stone-50"
                        >
                          {expanded ? "Đóng bảng" : "Sửa bảng riêng"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDraft((c) => ({
                              ...c,
                              [id]: { assignment: { type: "category" } },
                            }));
                            setExpandedCustomId(null);
                          }}
                          className="rounded-lg border border-red-200 text-red-700 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider hover:bg-red-50"
                        >
                          Về danh mục
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isCustom && expanded && entry.customRows && (
                  <CustomRowsEditor
                    rows={entry.customRows}
                    onChange={(rows) => setProductCustom(product, rows)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      <button
        type="button"
        disabled={saving || products.length === 0}
        onClick={() => void handleSaveAll()}
        className="flex items-center gap-2 rounded-xl bg-black text-white hover:bg-red-700 disabled:opacity-40 px-6 py-2.5 text-xs font-bold tracking-widest uppercase"
      >
        <Save className="h-4 w-4" />
        {saving ? "Đang lưu..." : "Lưu gán sản phẩm"}
      </button>
    </div>
  );
}

function CustomRowsEditor({
  rows,
  onChange,
}: {
  rows: SizeGuideRow[];
  onChange: (rows: SizeGuideRow[]) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-black/10 ml-6">
      <table className="w-full text-[10px]">
        <thead>
          <tr className="bg-stone-50 text-[8px] font-extrabold uppercase text-black/45">
            <th className="px-2 py-1 text-left">Size</th>
            <th className="px-2 py-1 text-left">Cao min</th>
            <th className="px-2 py-1 text-left">Cao max</th>
            <th className="px-2 py-1 text-left">Nặng min</th>
            <th className="px-2 py-1 text-left">Nặng max</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-black/5">
              <td className="px-1.5 py-1">
                <input
                  value={row.size}
                  onChange={(e) =>
                    onChange(rows.map((r, i) => (i === index ? { ...r, size: e.target.value.toUpperCase() } : r)))
                  }
                  className="w-12 rounded border border-black/10 px-1 py-0.5 font-mono font-bold"
                />
              </td>
              {(["heightMin", "heightMax", "weightMin", "weightMax"] as const).map((field) => (
                <td key={field} className="px-1.5 py-1">
                  <input
                    type="number"
                    value={row[field]}
                    onChange={(e) =>
                      onChange(
                        rows.map((r, i) =>
                          i === index ? { ...r, [field]: Number(e.target.value) } : r,
                        ),
                      )
                    }
                    className="w-14 rounded border border-black/10 px-1 py-0.5"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
