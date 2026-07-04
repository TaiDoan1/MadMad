import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Boxes,
  Calendar,
  ClipboardList,
  Package,
  Plus,
  RefreshCw,
  Search,
  X,
  Eye,
} from "lucide-react";

import { ImageWithFallback } from "@/components/common/image-with-fallback";
import { useProducts } from "@/features/products/context/product-context";
import { useToast } from "@/components/common/toast";
import { API_URL, getAdminKey } from "@/config/api";
import type { StockMovement, StockMovementReason, StockMovementStats } from "@/types/stock-movement";
import {
  STOCK_MOVEMENT_REASON_LABELS,
  STOCK_MOVEMENT_REASON_OPTIONS,
  formatStockMovementReference,
  isEditStockReason,
} from "@/types/stock-movement";
import { buildMarketingMonthOptions, getCurrentMonthValue } from "@/utils/marketing-export";
import { getVariantAvailableStock } from "@/utils/product-stock";

export function AdminInventoryPage() {
  const { showToast } = useToast();
  const { products, refreshProducts } = useProducts();

  const monthOptions = useMemo(() => buildMarketingMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthValue);
  const [selectedReason, setSelectedReason] = useState<StockMovementReason | "all">("all");
  const [selectedProductId, setSelectedProductId] = useState("all");
  const [direction, setDirection] = useState<"all" | "in" | "out">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [stats, setStats] = useState<StockMovementStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingOutbound, setIsSyncingOutbound] = useState(false);
  const stockSyncStarted = useRef(false);

  const [returnProductId, setReturnProductId] = useState("");
  const [returnColor, setReturnColor] = useState("");
  const [returnSize, setReturnSize] = useState("");
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnReason, setReturnReason] = useState<"RETURN" | "REFUND">("RETURN");
  const [returnOrderRef, setReturnOrderRef] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(null);
  const [relatedMovements, setRelatedMovements] = useState<StockMovement[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const selectedMonthLabel =
    monthOptions.find((option) => option.value === selectedMonth)?.label ?? selectedMonth;

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(q) ||
        String(product.id).toLowerCase().includes(q) ||
        (product.sku ?? "").toLowerCase().includes(q),
    );
  }, [products, productSearch]);

  const returnProduct = useMemo(
    () => products.find((product) => String(product.id) === returnProductId) ?? null,
    [products, returnProductId],
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("month", selectedMonth);
      if (selectedReason !== "all") params.set("reason", selectedReason);
      if (selectedProductId !== "all") params.set("productId", selectedProductId);
      if (direction !== "all") params.set("direction", direction);
      if (searchTerm.trim()) params.set("search", searchTerm.trim());

      const statsParams = new URLSearchParams();
      statsParams.set("month", selectedMonth);
      if (selectedProductId !== "all") statsParams.set("productId", selectedProductId);

      const [movementsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/inventory/movements?${params.toString()}`, { headers: { "x-admin-key": getAdminKey() } }),
        fetch(`${API_URL}/inventory/stats?${statsParams.toString()}`, { headers: { "x-admin-key": getAdminKey() } }),
      ]);

      if (movementsRes.ok) {
        setMovements(await movementsRes.json());
      } else {
        setMovements([]);
      }

      if (statsRes.ok) {
        setStats(await statsRes.json());
      } else {
        setStats(null);
      }
    } catch {
      showToast("Không tải được lịch sử tồn kho", "error");
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedReason, selectedProductId, direction, searchTerm, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const syncOutboundStock = useCallback(async () => {
    setIsSyncingOutbound(true);
    try {
      const response = await fetch(`${API_URL}/inventory/sync-outbound`, { method: "POST", headers: { "x-admin-key": getAdminKey() } });
      if (!response.ok) {
        throw new Error("Không thể đồng bộ trừ kho");
      }

      const result = (await response.json()) as {
        orders: { deductedItems: number; giftItemsDeducted: number; errors: string[] };
        marketing: { deductedItems: number; errors: string[] };
        totalDeducted: number;
        totalErrors: string[];
      };

      if (result.totalDeducted > 0) {
        await refreshProducts();
        await loadData();
        const orderCount = result.orders.deductedItems;
        const marketingCount = result.marketing.deductedItems;
        const giftNote =
          result.orders.giftItemsDeducted > 0
            ? ` (${result.orders.giftItemsDeducted} dòng hàng tặng đơn)`
            : "";
        showToast(
          `Đã trừ kho: ${orderCount} dòng đơn hàng${giftNote}, ${marketingCount} dòng marketing.`,
          "success",
        );
      } else {
        showToast("Đã kiểm tra đơn hàng và marketing — không còn dòng nào cần trừ kho.", "success");
      }

      if (result.totalErrors.length > 0) {
        showToast(`Một số dòng không trừ được kho: ${result.totalErrors.slice(0, 2).join("; ")}`, "warning");
      }

      return result;
    } catch (error: any) {
      showToast(error?.message || "Lỗi khi đồng bộ trừ kho", "error");
      throw error;
    } finally {
      setIsSyncingOutbound(false);
    }
  }, [loadData, refreshProducts, showToast]);

  useEffect(() => {
    if (products.length === 0 || stockSyncStarted.current) return;
    stockSyncStarted.current = true;

    void syncOutboundStock().catch(() => {
      stockSyncStarted.current = false;
    });
  }, [products.length, syncOutboundStock]);

  const resetReturnForm = () => {
    setReturnProductId("");
    setReturnColor("");
    setReturnSize("");
    setReturnQuantity(1);
    setReturnReason("RETURN");
    setReturnOrderRef("");
    setReturnNotes("");
    setProductSearch("");
  };

  const handleReturnSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!returnProduct) {
      showToast("Vui lòng chọn sản phẩm", "warning");
      return;
    }
    if (!returnColor || !returnSize) {
      showToast("Vui lòng chọn màu và size", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/inventory/returns`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": getAdminKey() },
        body: JSON.stringify({
          productId: returnProduct.id,
          color: returnColor,
          size: returnSize,
          quantity: returnQuantity,
          reason: returnReason,
          referenceLabel: returnOrderRef.trim() || undefined,
          notes: returnNotes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Không thể ghi nhận hoàn/trả");
      }

      showToast("Đã ghi nhận hoàn kho thành công!", "success");
      setShowReturnModal(false);
      resetReturnForm();
      await refreshProducts();
      await loadData();
    } catch (error: any) {
      showToast(error?.message || "Lỗi khi ghi nhận hoàn/trả", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (value: string) =>
    new Date(value).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const openMovementDetail = async (row: StockMovement) => {
    setSelectedMovement(row);
    setRelatedMovements([]);
    setDetailLoading(true);
    try {
      const response = await fetch(`${API_URL}/inventory/movements/${row.id}`, { headers: { "x-admin-key": getAdminKey() } });
      if (response.ok) {
        const data = (await response.json()) as {
          movement: StockMovement;
          related: StockMovement[];
        };
        setSelectedMovement(data.movement);
        setRelatedMovements(data.related ?? []);
      }
    } catch {
      showToast("Không tải được chi tiết biến động", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const renderMovementDelta = (row: StockMovement) => {
    const isIn = row.quantityDelta > 0;
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-black ${
          isIn
            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
            : "bg-red-100 text-red-800 border border-red-200"
        }`}
      >
        {isIn ? <ArrowUpCircle className="h-3.5 w-3.5" /> : <ArrowDownCircle className="h-3.5 w-3.5" />}
        {isIn ? "+" : ""}
        {row.quantityDelta}
      </span>
    );
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-black">
            <ClipboardList className="h-6 w-6" />
            <h1 className="text-xl font-black uppercase tracking-tight">Lịch Sử Tồn Kho</h1>
          </div>
          <p className="mt-1 text-xs text-black/50">
            Khi sửa size/màu đơn hàng: + hoàn kho biến thể cũ, − trừ kho biến thể mới (2 dòng riêng).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void syncOutboundStock()}
            disabled={isSyncingOutbound}
            className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider hover:bg-stone-50 disabled:opacity-50"
          >
            <Boxes className={`h-3.5 w-3.5 ${isSyncingOutbound ? "animate-pulse" : ""}`} />
            {isSyncingOutbound ? "Đang đồng bộ..." : "Trừ kho đơn + marketing"}
          </button>
          <button
            type="button"
            onClick={() => loadData()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider hover:bg-stone-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Làm mới
          </button>
          <button
            type="button"
            onClick={() => setShowReturnModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-black px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-red-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Ghi hoàn / trả hàng
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-black/10 bg-white p-4">
            <p className="text-[9px] font-bold uppercase tracking-wider text-black/45">Tổng biến động</p>
            <p className="mt-1 text-2xl font-black">{stats.totalMovements}</p>
            <p className="text-[10px] text-black/40">{selectedMonthLabel}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
            <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700">Cộng kho (+)</p>
            <p className="mt-1 text-2xl font-black text-emerald-800">+{stats.totalIn}</p>
          </div>
          <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4">
            <p className="text-[9px] font-bold uppercase tracking-wider text-red-700">Trừ kho (−)</p>
            <p className="mt-1 text-2xl font-black text-red-800">−{stats.totalOut}</p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-stone-50 p-4">
            <p className="text-[9px] font-bold uppercase tracking-wider text-black/45">Biến động ròng</p>
            <p className={`mt-1 text-2xl font-black ${stats.netChange >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {stats.netChange >= 0 ? "+" : ""}
              {stats.netChange}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-black/10 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1">
            <label className="text-[9px] font-bold uppercase tracking-wider text-black/45">Tháng</label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/35" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full rounded-xl border border-black/10 py-2.5 pl-9 pr-3 text-xs font-semibold"
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold uppercase tracking-wider text-black/45">Nguyên nhân</label>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value as StockMovementReason | "all")}
              className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-xs font-semibold"
            >
              {STOCK_MOVEMENT_REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold uppercase tracking-wider text-black/45">Sản phẩm</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-xs font-semibold"
            >
              <option value="all">Tất cả sản phẩm</option>
              {products.map((product) => (
                <option key={product.id} value={String(product.id)}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold uppercase tracking-wider text-black/45">Hướng</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as "all" | "in" | "out")}
              className="w-full rounded-xl border border-black/10 px-3 py-2.5 text-xs font-semibold"
            >
              <option value="all">Tất cả</option>
              <option value="in">Chỉ cộng kho (+)</option>
              <option value="out">Chỉ trừ kho (−)</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold uppercase tracking-wider text-black/45">Tìm kiếm</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/35" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="SP, mã đơn, ghi chú..."
                className="w-full rounded-xl border border-black/10 py-2.5 pl-9 pr-3 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-black/10 bg-stone-50 text-[10px] font-bold uppercase tracking-wider text-black/55">
              <tr>
                <th className="px-4 py-3">Thời gian</th>
                <th className="px-4 py-3">Sản phẩm</th>
                <th className="px-4 py-3">Biến thể</th>
                <th className="px-4 py-3 text-center">Thay đổi</th>
                <th className="px-4 py-3">Nguyên nhân</th>
                <th className="px-4 py-3">Tham chiếu</th>
                <th className="px-4 py-3">Ghi chú</th>
                <th className="px-4 py-3 text-center">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-black/40">
                    Đang tải lịch sử...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-black/40">
                    Chưa có biến động tồn kho trong bộ lọc này.
                  </td>
                </tr>
              ) : (
                movements.map((row) => {
                  const isIn = row.quantityDelta > 0;
                  const reasonLabel =
                    STOCK_MOVEMENT_REASON_LABELS[row.reason as StockMovementReason] ?? row.reason;
                  const product = products.find((p) => String(p.id) === row.productId);

                  return (
                    <tr
                      key={row.id}
                      className="cursor-pointer hover:bg-stone-50/60"
                      onClick={() => void openMovementDetail(row)}
                    >
                      <td className="px-4 py-3 font-mono text-[11px] text-black/65 whitespace-nowrap">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-[180px]">
                          {product?.image && (
                            <div className="h-10 w-8 shrink-0 overflow-hidden rounded bg-stone-100">
                              <ImageWithFallback src={product.image} alt={row.productName} className="h-full w-full object-cover" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-black">{row.productName}</p>
                            <p className="text-[10px] text-black/40 font-mono">#{String(row.productId).slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[11px] uppercase">
                        {row.color} / {row.size}
                        {row.stockBefore != null && row.stockAfter != null && (
                          <p className="mt-0.5 text-[10px] text-black/40 normal-case">
                            {row.stockBefore} → {row.stockAfter}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-black ${
                            isIn
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-red-100 text-red-800 border border-red-200"
                          }`}
                        >
                          {isIn ? <ArrowUpCircle className="h-3.5 w-3.5" /> : <ArrowDownCircle className="h-3.5 w-3.5" />}
                          {isIn ? "+" : ""}
                          {row.quantityDelta}
                        </span>
                        {isEditStockReason(row.reason) && (
                          <p className="mt-1 text-[9px] font-semibold text-violet-700">
                            {row.reason.includes("_IN") ? "Hoàn dòng cũ" : "Trừ dòng mới"}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-lg bg-stone-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-black/70">
                          {reasonLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-black/70">
                        {formatStockMovementReference(row)}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-black/55 max-w-[200px]">
                        {row.notes || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void openMovementDetail(row);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-2 py-1.5 text-[9px] font-bold uppercase text-black/60 hover:bg-stone-100"
                        >
                          <Eye className="h-3 w-3" />
                          Xem
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedMovement &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-black/10 bg-white shadow-2xl">
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-black/10 bg-white px-5 py-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-black/45">Chi tiết biến động</p>
                  <h3 className="text-sm font-black">{selectedMovement.productName}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMovement(null);
                    setRelatedMovements([]);
                  }}
                  className="rounded-lg border border-black/10 p-2"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  {renderMovementDelta(selectedMovement)}
                  <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-[10px] font-bold uppercase text-black/70">
                    {STOCK_MOVEMENT_REASON_LABELS[selectedMovement.reason as StockMovementReason] ??
                      selectedMovement.reason}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl bg-stone-50 p-3">
                    <p className="text-[9px] font-bold uppercase text-black/45">Thời gian</p>
                    <p className="mt-1 font-mono font-semibold">{formatDate(selectedMovement.createdAt)}</p>
                  </div>
                  <div className="rounded-xl bg-stone-50 p-3">
                    <p className="text-[9px] font-bold uppercase text-black/45">Biến thể</p>
                    <p className="mt-1 font-semibold uppercase">
                      {selectedMovement.color} / {selectedMovement.size}
                    </p>
                  </div>
                  <div className="rounded-xl bg-stone-50 p-3">
                    <p className="text-[9px] font-bold uppercase text-black/45">Tồn trước → sau</p>
                    <p className="mt-1 font-mono font-semibold">
                      {selectedMovement.stockBefore ?? "—"} → {selectedMovement.stockAfter ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-stone-50 p-3">
                    <p className="text-[9px] font-bold uppercase text-black/45">Tham chiếu</p>
                    <p className="mt-1 font-mono text-[11px] font-semibold">
                      {formatStockMovementReference(selectedMovement)}
                    </p>
                  </div>
                  <div className="col-span-2 rounded-xl bg-stone-50 p-3">
                    <p className="text-[9px] font-bold uppercase text-black/45">Ghi chú</p>
                    <p className="mt-1 text-sm">{selectedMovement.notes || "—"}</p>
                  </div>
                  <div className="col-span-2 rounded-xl bg-stone-50 p-3">
                    <p className="text-[9px] font-bold uppercase text-black/45">Mã sản phẩm</p>
                    <p className="mt-1 font-mono text-[11px]">{selectedMovement.productId}</p>
                  </div>
                </div>

                {detailLoading ? (
                  <p className="text-center text-sm text-black/45">Đang tải biến động liên quan...</p>
                ) : relatedMovements.length > 0 ? (
                  <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-violet-800">
                      Biến động cùng tham chiếu (± trong cùng thao tác)
                    </p>
                    <div className="mt-3 space-y-2">
                      {relatedMovements.map((related) => (
                        <div
                          key={related.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-100 bg-white px-3 py-2 text-xs"
                        >
                          <div>
                            <p className="font-bold uppercase">
                              {related.color} / {related.size}
                            </p>
                            <p className="text-[10px] text-black/50">
                              {STOCK_MOVEMENT_REASON_LABELS[related.reason as StockMovementReason] ?? related.reason}
                            </p>
                            <p className="text-[10px] text-black/45">{related.notes || "—"}</p>
                          </div>
                          <div className="text-right">
                            {renderMovementDelta(related)}
                            <p className="mt-1 font-mono text-[10px] text-black/45">
                              {related.stockBefore ?? "—"} → {related.stockAfter ?? "—"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {isEditStockReason(selectedMovement.reason) && relatedMovements.length === 1 && (
                      <p className="mt-3 text-[11px] text-violet-900">
                        Đây là cặp ± khi sửa đơn/marketing: một dòng hoàn biến thể cũ (+), một dòng trừ biến thể mới (−).
                      </p>
                    )}
                  </div>
                ) : isEditStockReason(selectedMovement.reason) ? (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                    Chưa thấy dòng ± đối ứng trong cùng tham chiếu. Các lần sửa trước đây có thể chỉ ghi nhận trừ kho.
                  </p>
                ) : null}
              </div>
            </div>
          </div>,
          document.body,
        )}

      {showReturnModal &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl border border-black/10 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-black/45">Ghi nhận thủ công</p>
                  <h3 className="text-sm font-black">Hoàn / Trả hàng về kho</h3>
                </div>
                <button type="button" onClick={() => setShowReturnModal(false)} className="rounded-lg border border-black/10 p-2">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <form onSubmit={handleReturnSubmit} className="space-y-4 p-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-black/50">Loại</label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value as "RETURN" | "REFUND")}
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-xs"
                  >
                    <option value="RETURN">Hoàn hàng / trả hàng</option>
                    <option value="REFUND">Hoàn tiền / trả đơn</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-black/50">Tìm sản phẩm</label>
                  <input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Tên, SKU, ID..."
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-black/50">Sản phẩm</label>
                  <select
                    value={returnProductId}
                    onChange={(e) => {
                      setReturnProductId(e.target.value);
                      const product = products.find((p) => String(p.id) === e.target.value);
                      setReturnColor(product?.colors?.[0] ?? "");
                      setReturnSize(product?.sizes?.[0] ?? "");
                    }}
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-xs"
                  >
                    <option value="">— Chọn sản phẩm —</option>
                    {filteredProducts.map((product) => (
                      <option key={product.id} value={String(product.id)}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-black/50">Màu</label>
                    <select
                      value={returnColor}
                      onChange={(e) => setReturnColor(e.target.value)}
                      disabled={!returnProduct}
                      className="w-full rounded-xl border border-black/10 px-3 py-2 text-xs"
                    >
                      {(returnProduct?.colors ?? []).map((color) => (
                        <option key={color} value={color}>
                          {color}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-black/50">Size</label>
                    <select
                      value={returnSize}
                      onChange={(e) => setReturnSize(e.target.value)}
                      disabled={!returnProduct}
                      className="w-full rounded-xl border border-black/10 px-3 py-2 text-xs"
                    >
                      {(returnProduct?.sizes ?? []).map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {returnProduct && returnColor && returnSize && (
                  <p className="text-[10px] text-black/45">
                    Tồn hiện tại: {getVariantAvailableStock(returnProduct, returnColor, returnSize)}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-black/50">Số lượng hoàn</label>
                    <input
                      type="number"
                      min={1}
                      value={returnQuantity}
                      onChange={(e) => setReturnQuantity(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full rounded-xl border border-black/10 px-3 py-2 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-black/50">Mã đơn (tuỳ chọn)</label>
                    <input
                      value={returnOrderRef}
                      onChange={(e) => setReturnOrderRef(e.target.value)}
                      placeholder="DH..."
                      className="w-full rounded-xl border border-black/10 px-3 py-2 text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-black/50">Ghi chú</label>
                  <textarea
                    rows={2}
                    value={returnNotes}
                    onChange={(e) => setReturnNotes(e.target.value)}
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-xs resize-none"
                    placeholder="Lý do hoàn/trả..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-black py-3 text-xs font-bold uppercase tracking-wider text-white disabled:opacity-50"
                >
                  <Package className="h-4 w-4" />
                  {isSubmitting ? "Đang lưu..." : "Xác nhận cộng kho"}
                </button>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
