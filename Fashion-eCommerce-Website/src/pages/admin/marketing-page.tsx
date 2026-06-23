import { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Gift,
  Megaphone,
  Plus,
  Search,
  Trash2,
  X,
  DollarSign,
  Package,
  Users,
  Ban,
  Download,
  Calendar,
} from "lucide-react";

import { ImageWithFallback } from "@/components/common/image-with-fallback";
import { useMarketing } from "@/features/marketing/context/marketing-context";
import { useProducts } from "@/features/products/context/product-context";
import { useToast } from "@/components/common/toast";
import type { Product } from "@/types/product";
import { getVariantAvailableStock } from "@/utils/product-stock";
import {
  buildMarketingMonthOptions,
  downloadMarketingCsv,
} from "@/utils/marketing-export";
import {
  getProductImageForColor,
  resolveColorCodedItemImage,
} from "@/utils/product-image";

const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Facebook", "Khác"];

type DraftGiftItem = {
  productId: string;
  productName: string;
  productImage: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
};

export function AdminMarketingPage() {
  const { showToast } = useToast();
  const { products, refreshProducts } = useProducts();
  const {
    gifts,
    stats,
    isLoading,
    selectedMonth,
    setSelectedMonth,
    createGift,
    cancelGift,
    deleteExportedGifts,
    syncMarketingItemImages,
    syncMarketingStockDeductions,
    refreshMarketing,
  } = useMarketing();
  const imageSyncStarted = useRef(false);
  const stockSyncStarted = useRef(false);

  const monthOptions = useMemo(() => buildMarketingMonthOptions(), []);
  const selectedMonthLabel =
    monthOptions.find((option) => option.value === selectedMonth)?.label ?? selectedMonth;

  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [kolName, setKolName] = useState("");
  const [kolHandle, setKolHandle] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [contactInfo, setContactInfo] = useState("");
  const [cashAmount, setCashAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [draftItems, setDraftItems] = useState<DraftGiftItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((product) => String(product.id) === String(selectedProductId)) ?? null,
    [products, selectedProductId],
  );

  const filteredGifts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return gifts;
    return gifts.filter((gift) => {
      return (
        gift.kolName.toLowerCase().includes(q) ||
        gift.giftNumber.toLowerCase().includes(q) ||
        (gift.platform ?? "").toLowerCase().includes(q) ||
        (gift.kolHandle ?? "").toLowerCase().includes(q)
      );
    });
  }, [gifts, searchTerm]);

  const draftProductValue = useMemo(
    () => draftItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [draftItems],
  );

  const draftTotalCost = draftProductValue + Math.max(0, cashAmount);

  const formatMoney = (value: number) => `${value.toLocaleString("vi-VN")}đ`;

  useEffect(() => {
    if (products.length === 0 || imageSyncStarted.current) return;
    imageSyncStarted.current = true;

    void syncMarketingItemImages().then((result) => {
      if (result.updated > 0) {
        showToast(`Đã đồng bộ ảnh màu cho ${result.updated} dòng quà tặng marketing.`, "success");
      }
    }).catch(() => {
      imageSyncStarted.current = false;
    });
  }, [products.length, syncMarketingItemImages, showToast]);

  useEffect(() => {
    if (products.length === 0 || stockSyncStarted.current) return;
    stockSyncStarted.current = true;

    void syncMarketingStockDeductions()
      .then(async (result) => {
        if (result.deductedItems > 0) {
          await refreshProducts();
          await refreshMarketing(selectedMonth);
          showToast(`Đã trừ kho cho ${result.deductedItems} dòng quà tặng KOL/KOC chưa ghi nhận.`, "success");
        }
        if (result.errors.length > 0) {
          showToast(`Một số phiếu marketing không trừ được kho: ${result.errors.slice(0, 2).join("; ")}`, "warning");
        }
      })
      .catch(() => {
        stockSyncStarted.current = false;
      });
  }, [products.length, syncMarketingStockDeductions, refreshProducts, refreshMarketing, selectedMonth, showToast]);

  const resetCreateForm = () => {
    setKolName("");
    setKolHandle("");
    setPlatform("Instagram");
    setContactInfo("");
    setCashAmount(0);
    setNotes("");
    setDraftItems([]);
    setSelectedProductId("");
    setSelectedColor("");
    setSelectedSize("");
    setItemQuantity(1);
  };

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);
    const product = products.find((p) => String(p.id) === productId);
    setSelectedColor(product?.colors?.[0] ?? "");
    setSelectedSize(product?.sizes?.[0] ?? "");
    setItemQuantity(1);
  };

  const getAvailableForSelection = (product: Product, color: string, size: string) => {
    return getVariantAvailableStock(product, color, size);
  };

  const handleAddDraftItem = () => {
    if (!selectedProduct) {
      showToast("Vui lòng chọn sản phẩm", "warning");
      return;
    }
    if (!selectedColor || !selectedSize) {
      showToast("Vui lòng chọn màu và size", "warning");
      return;
    }
    const available = getAvailableForSelection(selectedProduct, selectedColor, selectedSize);
    if (available <= 0) {
      showToast("Size này đã hết hàng", "error");
      return;
    }
    if (itemQuantity > available) {
      showToast(`Chỉ còn ${available} chiếc cho ${selectedColor}/${selectedSize}`, "error");
      return;
    }

    const existingIndex = draftItems.findIndex(
      (item) =>
        item.productId === String(selectedProduct.id) &&
        item.color === selectedColor &&
        item.size === selectedSize,
    );

    if (existingIndex >= 0) {
      const nextQty = draftItems[existingIndex].quantity + itemQuantity;
      if (nextQty > available) {
        showToast(`Tổng số lượng vượt tồn kho (còn ${available})`, "error");
        return;
      }
      setDraftItems((current) =>
        current.map((item, index) =>
          index === existingIndex ? { ...item, quantity: nextQty } : item,
        ),
      );
    } else {
      setDraftItems((current) => [
        ...current,
        {
          productId: String(selectedProduct.id),
          productName: selectedProduct.name,
          productImage: getProductImageForColor(selectedProduct, selectedColor),
          color: selectedColor,
          size: selectedSize,
          quantity: itemQuantity,
          unitPrice: selectedProduct.price,
        },
      ]);
    }

    setItemQuantity(1);
  };

  const handleCreateGift = async () => {
    if (!kolName.trim()) {
      showToast("Vui lòng nhập tên KOL/KOC", "error");
      return;
    }
    if (draftItems.length === 0) {
      showToast("Vui lòng thêm ít nhất một sản phẩm tặng", "error");
      return;
    }

    setIsSubmitting(true);
    const created = await createGift({
      kolName: kolName.trim(),
      kolHandle: kolHandle.trim() || undefined,
      platform,
      contactInfo: contactInfo.trim() || undefined,
      cashAmount: Math.max(0, cashAmount),
      notes: notes.trim() || undefined,
      items: draftItems.map((item) => ({
        productId: item.productId,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
      })),
    });
    setIsSubmitting(false);

    if (created) {
      await refreshProducts();
      setShowCreateModal(false);
      resetCreateForm();
    }
  };

  const handleCancelGift = async (id: string) => {
    const ok = await cancelGift(id);
    if (ok) {
      await refreshProducts();
    }
  };

  const handleExportMonth = () => {
    if (filteredGifts.length === 0) {
      showToast("Không có dữ liệu để export trong tháng đã chọn", "warning");
      return;
    }
    downloadMarketingCsv(filteredGifts, selectedMonth);
    showToast(`Đã export ${filteredGifts.length} phiếu (${selectedMonthLabel})`, "success");
  };

  const handleDeleteExported = async () => {
    if (selectedMonth === "all") {
      showToast("Vui lòng chọn một tháng cụ thể để xóa dữ liệu đã export", "warning");
      return;
    }
    setIsDeleting(true);
    const deletedCount = await deleteExportedGifts(selectedMonth);
    setIsDeleting(false);
    setShowDeleteConfirm(false);
    if (deletedCount > 0) {
      showToast(`Đã xóa ${deletedCount} phiếu tháng ${selectedMonthLabel}`, "success");
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-primary">
            <Megaphone className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em]">Marketing</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-black">Quản Lý Quà Tặng KOL/KOC</h1>
          <p className="mt-1 text-sm text-black/50">
            Theo dõi sản phẩm tặng và chi phí cash của brand. Export theo tháng và xóa phiếu đã lưu trữ.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportMonth}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-black transition-colors hover:bg-stone-50"
          >
            <Download className="h-4 w-4" />
            Export tháng
          </button>
          <button
            type="button"
            disabled={selectedMonth === "all" || filteredGifts.length === 0}
            onClick={() => setShowDeleteConfirm(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[10px] font-extrabold uppercase tracking-widest text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
            Xóa đã export
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-black px-5 py-3 text-[10px] font-extrabold uppercase tracking-widest text-white transition-colors hover:bg-red-700"
          >
            <Plus className="h-4 w-4" />
            Tạo phiếu tặng
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-black">
          <Calendar className="h-4 w-4 text-black/45" />
          <span>Đang xem: {selectedMonthLabel}</span>
          <span className="text-black/40">· {filteredGifts.length} phiếu</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            className="rounded-xl border border-black/10 bg-stone-50 px-4 py-2.5 text-sm font-bold"
          >
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Tổng phiếu tặng", value: stats.totalGifts, icon: Gift },
          { label: "Giá trị sản phẩm", value: formatMoney(stats.totalProductValue), icon: Package },
          { label: "Tổng cash brand", value: formatMoney(stats.totalCash), icon: DollarSign },
          { label: "Tổng chi phí", value: formatMoney(stats.totalCost), icon: Megaphone },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-black/45">{card.label}</p>
                <Icon className="h-4 w-4 text-black/35" />
              </div>
              <p className="text-2xl font-black text-black">{card.value}</p>
            </div>
          );
        })}
      </div>

      {stats.topKols.length > 0 && (
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-black/50" />
            <h2 className="text-sm font-black uppercase tracking-widest text-black">Top KOL/KOC theo chi phí</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {stats.topKols.map((kol) => (
              <div key={kol.name} className="flex items-center justify-between rounded-xl border border-black/5 bg-stone-50 px-4 py-3">
                <span className="text-sm font-bold text-black">{kol.name}</span>
                <span className="text-sm font-black text-primary">{formatMoney(kol.cost)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-black/10 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-black/5 p-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-black">Lịch sử tặng quà</h2>
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm KOL, mã phiếu, nền tảng..."
              className="w-full rounded-xl border border-black/10 bg-stone-50 py-2.5 pl-10 pr-4 text-sm focus:border-black/40 focus:outline-none"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-sm text-black/45">Đang tải dữ liệu marketing...</div>
        ) : filteredGifts.length === 0 ? (
          <div className="p-10 text-center text-sm text-black/45">Chưa có phiếu tặng nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-stone-50 text-[10px] font-extrabold uppercase tracking-widest text-black/45">
                <tr>
                  <th className="px-4 py-3">Mã / Ngày</th>
                  <th className="px-4 py-3">KOL/KOC</th>
                  <th className="px-4 py-3">Sản phẩm tặng</th>
                  <th className="px-4 py-3">Giá trị SP</th>
                  <th className="px-4 py-3">Cash</th>
                  <th className="px-4 py-3">Tổng</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredGifts.map((gift) => (
                  <tr key={gift.id} className="border-t border-black/5 align-top">
                    <td className="px-4 py-4">
                      <p className="font-bold text-black">{gift.giftNumber}</p>
                      <p className="mt-1 text-xs text-black/45">
                        {new Date(gift.createdAt).toLocaleString("vi-VN")}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-black">{gift.kolName}</p>
                      <p className="text-xs text-black/45">
                        {[gift.platform, gift.kolHandle].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-2">
                        {gift.items.map((item) => (
                          <div key={`${gift.id}-${item.id}`} className="flex items-center gap-2">
                            <ImageWithFallback
                              src={resolveColorCodedItemImage(item, products)}
                              alt={item.productName}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                            <div>
                              <p className="text-xs font-bold text-black">{item.productName}</p>
                              <p className="text-[11px] text-black/45">
                                {item.color} / {item.size} × {item.quantity}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 font-bold">{formatMoney(gift.productValue)}</td>
                    <td className="px-4 py-4 font-bold">{formatMoney(gift.cashAmount)}</td>
                    <td className="px-4 py-4 font-black text-primary">{formatMoney(gift.totalCost)}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider ${
                          gift.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : "bg-stone-200 text-stone-600"
                        }`}
                      >
                        {gift.status === "completed" ? "Đã tặng" : "Đã hủy"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {gift.status === "completed" ? (
                        <button
                          type="button"
                          onClick={() => handleCancelGift(gift.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-red-700 hover:bg-red-50"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Hủy & hoàn kho
                        </button>
                      ) : (
                        <span className="text-xs text-black/35">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDeleteConfirm
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                <h3 className="text-lg font-black text-black">Xóa phiếu đã export?</h3>
                <p className="mt-3 text-sm text-black/55 leading-relaxed">
                  Bạn sắp xóa <strong>{filteredGifts.length} phiếu</strong> của{" "}
                  <strong>{selectedMonthLabel}</strong> khỏi hệ thống. Hành động này không hoàn tồn kho
                  (quà đã tặng thật). Chỉ xóa sau khi đã export file CSV.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-xl border border-black/10 px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-widest"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDeleteExported}
                    className="rounded-xl bg-red-600 px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-widest text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {isDeleting ? "Đang xóa..." : "Xóa phiếu tháng này"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {showCreateModal
        ? createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-black/5 px-6 py-5">
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-tight text-black">Tạo phiếu tặng KOL/KOC</h2>
                    <p className="text-[11px] text-black/45">Sản phẩm sẽ trừ thẳng vào tồn kho size tương ứng</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetCreateForm();
                    }}
                    className="rounded-lg p-2 text-black/40 hover:bg-stone-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-6 p-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-extrabold uppercase tracking-widest text-black/50">Tên KOL/KOC *</label>
                      <input
                        value={kolName}
                        onChange={(e) => setKolName(e.target.value)}
                        className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-sm font-bold"
                        placeholder="Nguyễn Văn A"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-extrabold uppercase tracking-widest text-black/50">@ Handle</label>
                      <input
                        value={kolHandle}
                        onChange={(e) => setKolHandle(e.target.value)}
                        className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-sm"
                        placeholder="@username"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-extrabold uppercase tracking-widest text-black/50">Nền tảng</label>
                      <select
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                        className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-sm font-bold"
                      >
                        {PLATFORMS.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-extrabold uppercase tracking-widest text-black/50">Liên hệ</label>
                      <input
                        value={contactInfo}
                        onChange={(e) => setContactInfo(e.target.value)}
                        className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-sm"
                        placeholder="SĐT / Email / Link"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-extrabold uppercase tracking-widest text-black/50">Cash brand tặng (đ)</label>
                      <input
                        type="number"
                        min={0}
                        value={cashAmount}
                        onChange={(e) => setCashAmount(Math.max(0, Number(e.target.value) || 0))}
                        className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-sm font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[9px] font-extrabold uppercase tracking-widest text-black/50">Ghi chú</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="w-full rounded-xl border border-black/10 bg-stone-50 px-4 py-3 text-sm"
                        placeholder="Chiến dịch, brief, lý do tặng..."
                      />
                    </div>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-stone-50/50 p-4 space-y-4">
                    <h3 className="text-[10px] font-extrabold uppercase tracking-widest text-black/60">Thêm sản phẩm tặng</h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                      <select
                        value={selectedProductId}
                        onChange={(e) => handleProductChange(e.target.value)}
                        className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-xs font-bold md:col-span-2"
                      >
                        <option value="">Chọn sản phẩm</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                        disabled={!selectedProduct}
                        className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-xs font-bold"
                      >
                        {(selectedProduct?.colors ?? []).map((color) => (
                          <option key={color} value={color}>
                            {color}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedSize}
                        onChange={(e) => setSelectedSize(e.target.value)}
                        disabled={!selectedProduct}
                        className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-xs font-bold"
                      >
                        {(selectedProduct?.sizes ?? []).map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={itemQuantity}
                        onChange={(e) => setItemQuantity(Math.max(1, Number(e.target.value) || 1))}
                        disabled={!selectedProduct}
                        className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-xs font-bold"
                      />
                    </div>

                    {selectedProduct && selectedColor && selectedSize ? (
                      <p className="text-[11px] font-bold text-black/55">
                        Tồn kho hiện có: {getAvailableForSelection(selectedProduct, selectedColor, selectedSize)} chiếc ({selectedColor}/{selectedSize})
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={handleAddDraftItem}
                      className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-widest text-black hover:bg-stone-100"
                    >
                      <Plus className="h-4 w-4" />
                      Thêm vào danh sách
                    </button>

                    {draftItems.length > 0 ? (
                      <div className="space-y-2">
                        {draftItems.map((item, index) => (
                          <div
                            key={`${item.productId}-${item.color}-${item.size}-${index}`}
                            className="flex items-center justify-between rounded-xl border border-black/5 bg-white px-4 py-3"
                          >
                            <div className="flex items-center gap-3">
                              <ImageWithFallback
                                src={resolveColorCodedItemImage(item, products)}
                                alt={item.productName}
                                className="h-12 w-12 rounded-lg object-cover"
                              />
                              <div>
                                <p className="text-sm font-bold text-black">{item.productName}</p>
                                <p className="text-xs text-black/45">
                                  {item.color} / {item.size} × {item.quantity} · {formatMoney(item.unitPrice * item.quantity)}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setDraftItems((current) => current.filter((_, i) => i !== index))}
                              className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-1 gap-3 rounded-2xl border border-black/10 bg-black px-5 py-4 text-white md:grid-cols-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white/60">Giá trị sản phẩm</p>
                      <p className="text-xl font-black">{formatMoney(draftProductValue)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white/60">Cash brand</p>
                      <p className="text-xl font-black">{formatMoney(Math.max(0, cashAmount))}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white/60">Tổng chi phí</p>
                      <p className="text-xl font-black text-primary">{formatMoney(draftTotalCost)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 border-t border-black/5 px-6 py-5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetCreateForm();
                    }}
                    className="rounded-xl border border-black/10 px-5 py-3 text-[10px] font-extrabold uppercase tracking-widest"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleCreateGift}
                    className="rounded-xl bg-black px-5 py-3 text-[10px] font-extrabold uppercase tracking-widest text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {isSubmitting ? "Đang lưu..." : "Xác nhận tặng & trừ kho"}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
