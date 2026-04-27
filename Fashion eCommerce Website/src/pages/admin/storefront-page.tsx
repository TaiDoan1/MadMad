import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, Save } from "lucide-react";
import { Link } from "react-router";

import { ImageUploadInput } from "../../components/common/image-upload-input";
import { ImageWithFallback } from "../../components/common/image-with-fallback";
import { ProductCard } from "../../components/shared/product-card";
import { useProducts } from "../../features/products/context/product-context";
import {
  DEFAULT_STOREFRONT_SETTINGS,
  useStorefrontSettings,
} from "../../features/settings/context/storefront-settings-context";

export function AdminStorefrontPage() {
  const { products } = useProducts();
  const { settings, updateSettings } = useStorefrontSettings();
  const [bestSellerSearch, setBestSellerSearch] = useState("");
  const [bestSellerCategory, setBestSellerCategory] = useState("all");
  const [showOnlyUnselected, setShowOnlyUnselected] = useState(false);
  const overlayLeft = Math.min(100, Math.max(0, settings.heroOverlayOpacityLeft ?? 60)) / 100;
  const overlayMid = Math.min(100, Math.max(0, settings.heroOverlayOpacityMiddle ?? 40)) / 100;
  const overlayRight = Math.min(100, Math.max(0, settings.heroOverlayOpacityRight ?? 60)) / 100;
  const heroFontClass = settings.heroFontStyle === "serif" ? "font-serif" : settings.heroFontStyle === "mono" ? "font-mono" : "";
  const heroJustifyClass = settings.heroContentAlign === "left" ? "justify-start" : settings.heroContentAlign === "right" ? "justify-end" : "justify-center";
  const heroTextAlignClass = settings.heroContentAlign === "left" ? "text-left" : settings.heroContentAlign === "right" ? "text-right" : "text-center";
  const heroImageDrafts = settings.heroImages ?? [];
  const popularCategoryImageDrafts = settings.popularCategoryImages ?? [];
  const heroImages = heroImageDrafts.map((value) => value.trim()).filter(Boolean);
  const previewHeroImages = [settings.heroImage.trim(), ...heroImages].filter(Boolean);
  const [previewHeroIndex, setPreviewHeroIndex] = useState(0);
  const activeHeroImage = previewHeroImages[Math.min(previewHeroIndex, previewHeroImages.length - 1)] || settings.heroImage;
  const goToPrevPreviewHero = () => {
    if (previewHeroImages.length <= 1) return;
    setPreviewHeroIndex((current) => (current - 1 + previewHeroImages.length) % previewHeroImages.length);
  };
  const goToNextPreviewHero = () => {
    if (previewHeroImages.length <= 1) return;
    setPreviewHeroIndex((current) => (current + 1) % previewHeroImages.length);
  };

  useEffect(() => {
    setPreviewHeroIndex(0);
  }, [previewHeroImages.length]);

  useEffect(() => {
    const intervalMs = Math.max(2000, Math.min(60000, Number(settings.heroSlideIntervalMs ?? 6000)));
    if (previewHeroImages.length <= 1) return;
    const timer = window.setInterval(() => {
      setPreviewHeroIndex((current) => (current + 1) % previewHeroImages.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [previewHeroImages.length, settings.heroSlideIntervalMs]);

  const bestSellers = settings.bestSellerProductIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is NonNullable<typeof product> => Boolean(product))
    .map((product) => ({
      ...product,
      image: settings.bestSellerImageOverrides[product.id] ?? product.image,
    }));

  const toggleBestSeller = (productId: number) => {
    const currentIds = settings.bestSellerProductIds ?? [];
    if (currentIds.includes(productId)) {
      const { [productId]: _, ...rest } = settings.bestSellerImageOverrides;
      updateSettings({
        bestSellerProductIds: currentIds.filter((id) => id !== productId),
        bestSellerImageOverrides: rest,
      });
      return;
    }
    updateSettings({ bestSellerProductIds: [...currentIds, productId] });
  };

  const buildImageOptions = (productId: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return [];

    const unique = new Set<string>();
    const options: Array<{ label: string; url: string }> = [];

    const addOption = (label: string, url?: string) => {
      const trimmed = (url ?? "").trim();
      if (!trimmed || unique.has(trimmed)) return;
      unique.add(trimmed);
      options.push({ label, url: trimmed });
    };

    addOption("Ảnh chính", product.image);
    (product.images ?? []).forEach((url, index) => addOption(`Ảnh gallery #${index + 1}`, url));
    Object.entries(product.colorImages ?? {}).forEach(([color, url]) =>
      addOption(`Ảnh màu: ${color}`, typeof url === "string" ? url : undefined),
    );

    return options;
  };

  const bestSellerCategories = useMemo(
    () => Array.from(new Set(products.map((product) => product.category))).filter(Boolean),
    [products],
  );
  const selectedBestSellerProducts = useMemo(
    () =>
      (settings.bestSellerProductIds ?? [])
        .map((id) => products.find((product) => product.id === id))
        .filter((product): product is NonNullable<(typeof products)[number]> => Boolean(product)),
    [products, settings.bestSellerProductIds],
  );
  const filteredBestSellerProducts = useMemo(() => {
    const q = bestSellerSearch.trim().toLowerCase();
    const hasFilter = q.length > 0 || bestSellerCategory !== "all";
    if (!hasFilter) return [];
    return products.filter((product) => {
      const matchesSearch =
        !q ||
        product.name.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q);
      const matchesCategory =
        bestSellerCategory === "all" || product.category === bestSellerCategory;
      const matchesSelected =
        !showOnlyUnselected || !settings.bestSellerProductIds.includes(product.id);
      return matchesSearch && matchesCategory && matchesSelected;
    });
  }, [bestSellerCategory, bestSellerSearch, products, settings.bestSellerProductIds, showOnlyUnselected]);

  const moveBestSeller = (productId: number, direction: "up" | "down") => {
    const current = settings.bestSellerProductIds ?? [];
    const index = current.indexOf(productId);
    if (index < 0) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= current.length) return;
    const next = [...current];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    updateSettings({ bestSellerProductIds: next });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="mb-2 text-3xl">Storefront</h1>
          <p className="text-muted-foreground">Cấu hình banner + best seller và xem preview realtime.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/" className="rounded border border-border px-4 py-2 transition-colors hover:bg-muted">
            Xem trang chủ
          </Link>
          <button
            onClick={() => window.alert("Đã lưu (tự động).")}
            className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-white transition-colors hover:bg-primary/90"
          >
            <Save className="h-4 w-4" />
            Lưu
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6 rounded-lg border border-border bg-white p-6">
          <div className="space-y-3">
            <h3 className="text-xl">Banner Trang Chủ</h3>
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/20 p-3">
              <button
                type="button"
                onClick={() =>
                  updateSettings({
                    heroOverlayOpacityLeft: DEFAULT_STOREFRONT_SETTINGS.heroOverlayOpacityLeft,
                    heroOverlayOpacityMiddle: DEFAULT_STOREFRONT_SETTINGS.heroOverlayOpacityMiddle,
                    heroOverlayOpacityRight: DEFAULT_STOREFRONT_SETTINGS.heroOverlayOpacityRight,
                    heroContentAlign: DEFAULT_STOREFRONT_SETTINGS.heroContentAlign,
                    heroFontStyle: DEFAULT_STOREFRONT_SETTINGS.heroFontStyle,
                    heroSlideIntervalMs: DEFAULT_STOREFRONT_SETTINGS.heroSlideIntervalMs,
                  })
                }
                className="flex items-center gap-2 rounded border border-border bg-white px-3 py-2 text-sm transition-colors hover:bg-muted"
              >
                <RotateCcw className="h-4 w-4" />
                Reset overlay/vị trí/font
              </button>
              <p className="text-xs text-muted-foreground">
                Chỉ reset các tuỳ chỉnh overlay/vị trí/font (không reset ảnh + text banner).
              </p>
            </div>
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Ảnh banner (URL)</p>
              <input
                value={settings.heroImage}
                onChange={(event) => updateSettings({ heroImage: event.target.value })}
                className="w-full rounded border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="mt-1 text-xs text-muted-foreground">Khuyến nghị: 1920x1080 (tỉ lệ 16:9), dung lượng dưới 500KB.</p>
            </div>

            <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Thêm ảnh banner từ ảnh số 2 trở đi</p>
                  <p className="text-xs text-muted-foreground">Ảnh banner (URL) ở trên luôn là ảnh số 1.</p>
                </div>
                <button
                  type="button"
                  onClick={() => updateSettings({ heroImages: [...heroImageDrafts, ""] })}
                  className="rounded border border-border bg-white px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  + Thêm ảnh
                </button>
              </div>

              <div className="space-y-2">
                {heroImageDrafts.map((url, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      value={url}
                      onChange={(event) => {
                        const next = [...heroImageDrafts];
                        next[index] = event.target.value;
                        updateSettings({ heroImages: next });
                      }}
                      className="w-full rounded border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder={`Ảnh #${index + 2} (URL)`}
                    />
                    <button
                      type="button"
                      onClick={() => updateSettings({ heroImages: heroImageDrafts.filter((_, i) => i !== index) })}
                      className="rounded border border-border bg-white px-3 py-2 text-sm transition-colors hover:bg-muted"
                      title="Xóa"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Thời gian đổi ảnh (ms)</p>
                  <input
                    type="number"
                    min={2000}
                    step={500}
                    value={settings.heroSlideIntervalMs}
                    onChange={(event) => updateSettings({ heroSlideIntervalMs: Number(event.target.value) })}
                    className="w-full rounded border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Gợi ý</p>
                  <p className="rounded border border-border bg-white px-3 py-2 text-xs text-muted-foreground">6000ms (6 giây) là hợp lý.</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Badge</p>
                <input value={settings.heroBadgeText} onChange={(event) => updateSettings({ heroBadgeText: event.target.value })} className="w-full rounded border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Text nút</p>
                <input value={settings.heroButtonText} onChange={(event) => updateSettings({ heroButtonText: event.target.value })} className="w-full rounded border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Title line 1</p>
                <input value={settings.heroTitleLine1} onChange={(event) => updateSettings({ heroTitleLine1: event.target.value })} className="w-full rounded border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <p className="mb-1 text-sm text-muted-foreground">Title line 2</p>
                <input value={settings.heroTitleLine2} onChange={(event) => updateSettings({ heroTitleLine2: event.target.value })} className="w-full rounded border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div>
              <p className="mb-1 text-sm text-muted-foreground">Mô tả</p>
              <textarea value={settings.heroDescription} onChange={(event) => updateSettings({ heroDescription: event.target.value })} rows={3} className="w-full resize-none rounded border border-border px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <p className="mb-3 text-sm text-muted-foreground">Hiệu ứng mờ (overlay) + vị trí + font</p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Overlay trái ({settings.heroOverlayOpacityLeft}%)</p>
                  <input
                    type="range"
                    min={0}
                    max={90}
                    value={settings.heroOverlayOpacityLeft}
                    onChange={(event) => updateSettings({ heroOverlayOpacityLeft: Number(event.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Overlay giữa ({settings.heroOverlayOpacityMiddle}%)</p>
                  <input
                    type="range"
                    min={0}
                    max={90}
                    value={settings.heroOverlayOpacityMiddle}
                    onChange={(event) => updateSettings({ heroOverlayOpacityMiddle: Number(event.target.value) })}
                    className="w-full"
                  />
                </div>
                <div className="md:col-span-2">
                  <p className="mb-1 text-xs text-muted-foreground">Overlay phải ({settings.heroOverlayOpacityRight}%)</p>
                  <input
                    type="range"
                    min={0}
                    max={90}
                    value={settings.heroOverlayOpacityRight}
                    onChange={(event) => updateSettings({ heroOverlayOpacityRight: Number(event.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Vị trí nội dung</p>
                  <select
                    value={settings.heroContentAlign}
                    onChange={(event) => updateSettings({ heroContentAlign: event.target.value as "left" | "center" | "right" })}
                    className="w-full rounded border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="left">Trái</option>
                    <option value="center">Giữa</option>
                    <option value="right">Phải</option>
                  </select>
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Font chữ (preset)</p>
                  <select
                    value={settings.heroFontStyle}
                    onChange={(event) => updateSettings({ heroFontStyle: event.target.value as "default" | "serif" | "mono" })}
                    className="w-full rounded border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="default">Default</option>
                    <option value="serif">Serif</option>
                    <option value="mono">Mono</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-6">
            <h3 className="text-xl">Sản Phẩm Bán Chạy</h3>
            <p className="text-sm text-muted-foreground">Chọn sản phẩm và chọn ảnh hiển thị riêng cho Best Seller.</p>
            <div className="space-y-2 rounded-lg border border-border bg-primary/5 p-3">
              <p className="text-sm">Đang chọn ({selectedBestSellerProducts.length})</p>
              {selectedBestSellerProducts.length === 0 ? (
                <p className="text-xs text-muted-foreground">Chưa có sản phẩm nào được chọn.</p>
              ) : (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {selectedBestSellerProducts.map((product) => (
                    <div key={product.id} className="flex items-center gap-3 rounded border border-primary/30 bg-white p-2">
                      <ImageWithFallback src={settings.bestSellerImageOverrides[product.id] ?? product.image} alt={product.name} className="h-12 w-12 rounded object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.category}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveBestSeller(product.id, "up")}
                          className="rounded border border-border px-2 py-1 text-xs transition-colors hover:bg-muted"
                          title="Đưa lên trên"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveBestSeller(product.id, "down")}
                          className="rounded border border-border px-2 py-1 text-xs transition-colors hover:bg-muted"
                          title="Đưa xuống dưới"
                        >
                          ↓
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleBestSeller(product.id)}
                        className="rounded border border-border px-2 py-1 text-xs transition-colors hover:bg-muted"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/20 p-3 md:grid-cols-2">
              <input
                value={bestSellerSearch}
                onChange={(event) => setBestSellerSearch(event.target.value)}
                placeholder="Tìm theo tên sản phẩm hoặc danh mục..."
                className="w-full rounded border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <div className="flex items-center gap-2">
                <select
                  value={bestSellerCategory}
                  onChange={(event) => setBestSellerCategory(event.target.value)}
                  className="w-full rounded border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">Tất cả danh mục</option>
                  {bestSellerCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <label className="flex items-center gap-2 whitespace-nowrap text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={showOnlyUnselected}
                    onChange={(event) => setShowOnlyUnselected(event.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  Chưa chọn
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {filteredBestSellerProducts.map((product) => {
                const isSelected = settings.bestSellerProductIds.includes(product.id);
                const imageOptions = buildImageOptions(product.id);
                const selectedOverride = settings.bestSellerImageOverrides[product.id] ?? product.image;

                return (
                  <div
                    key={product.id}
                    className={`flex h-full flex-col rounded border p-3 ${
                      isSelected ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <label className="flex cursor-pointer items-center gap-3">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleBestSeller(product.id)} className="h-4 w-4 accent-primary" />
                      <ImageWithFallback src={selectedOverride} alt={product.name} className="h-14 w-14 rounded object-cover" />
                      <div className="min-w-0">
                        <p className="truncate">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.price.toLocaleString("vi-VN")}₫</p>
                      </div>
                    </label>

                    <div className="mt-3 min-h-[84px]">
                      {isSelected && imageOptions.length > 0 ? (
                        <>
                          <p className="mb-1 text-xs text-muted-foreground">Ảnh hiển thị (Best Seller)</p>
                          <select
                            value={selectedOverride}
                            onChange={(event) => updateSettings({ bestSellerImageOverrides: { ...settings.bestSellerImageOverrides, [product.id]: event.target.value } })}
                            className="w-full rounded border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            {imageOptions.map((option) => (
                              <option key={option.url} value={option.url}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <p className="mt-1 text-xs text-muted-foreground">Khuyến nghị ảnh best seller: 1200x1500 (tỉ lệ 4:5).</p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">Chọn sản phẩm để cấu hình ảnh hiển thị.</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredBestSellerProducts.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {bestSellerSearch.trim() || bestSellerCategory !== "all"
                    ? "Không có sản phẩm phù hợp bộ lọc."
                    : "Nhập từ khóa hoặc chọn danh mục để hiển thị sản phẩm."}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-6">
            <h3 className="text-xl">Ảnh Chữ Nhật Thay Danh Mục</h3>
            <p className="text-sm text-muted-foreground">
              Phần này sẽ hiển thị trên trang chủ thay cho "Danh mục phổ biến".
            </p>
            <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Danh sách ảnh (hình chữ nhật)</p>
                <button
                  type="button"
                  onClick={() => updateSettings({ popularCategoryImages: [...popularCategoryImageDrafts, ""] })}
                  className="rounded border border-border bg-white px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  + Thêm ảnh
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Khuyến nghị: 1600x900 (tỉ lệ 16:9) hoặc 1200x800 (tỉ lệ 3:2).
              </p>
              <div className="space-y-3">
                {popularCategoryImageDrafts.map((url, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <ImageUploadInput
                      value={url}
                      onChange={(value) => {
                        const next = [...popularCategoryImageDrafts];
                        next[index] = value;
                        updateSettings({ popularCategoryImages: next });
                      }}
                      className="flex-1"
                      placeholder={`Ảnh chữ nhật #${index + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateSettings({
                          popularCategoryImages: popularCategoryImageDrafts.filter((_, i) => i !== index),
                        })
                      }
                      className="rounded border border-border bg-white px-3 py-2 text-sm transition-colors hover:bg-muted"
                      title="Xóa"
                    >
                      X
                    </button>
                  </div>
                ))}
                {popularCategoryImageDrafts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Chưa có ảnh nào. Nhấn "+ Thêm ảnh" để bắt đầu.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="overflow-hidden rounded-lg border border-border bg-white">
            <div className="border-b border-border p-4">
              <h3 className="text-xl">Preview Banner</h3>
            </div>
            <div className="relative h-[420px]">
              {previewHeroImages.map((imageUrl, index) => {
                const isActive = index === Math.min(previewHeroIndex, previewHeroImages.length - 1);
                return (
                  <ImageWithFallback
                    key={`${imageUrl}-${index}`}
                    src={imageUrl}
                    alt={`Hero preview ${index + 1}`}
                    className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-in-out ${
                      isActive ? "scale-100 opacity-100" : "scale-105 opacity-0"
                    }`}
                  />
                );
              })}
              <div
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(to right, rgba(0,0,0,${overlayLeft}), rgba(0,0,0,${overlayMid}), rgba(0,0,0,${overlayRight}))`,
                }}
              />
              {previewHeroImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goToPrevPreviewHero}
                    className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={goToNextPreviewHero}
                    className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition-colors hover:bg-black/60"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
              <div className="absolute inset-0 flex items-center p-6 text-white">
                <div className={`flex w-full ${heroJustifyClass}`}>
                  <div className={`w-full max-w-xl space-y-5 ${heroTextAlignClass} ${heroFontClass}`}>
                  <p className="text-sm uppercase tracking-widest opacity-90">{settings.heroBadgeText}</p>
                  <h2 className="text-4xl leading-tight md:text-5xl">
                    {settings.heroTitleLine1}
                    <br />
                    {settings.heroTitleLine2}
                  </h2>
                  <p className="opacity-90">{settings.heroDescription}</p>
                  <div>
                    <span className="inline-flex rounded bg-primary px-6 py-3">{settings.heroButtonText}</span>
                  </div>
                  </div>
                </div>
              </div>
              {previewHeroImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2">
                  {previewHeroImages.map((_, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setPreviewHeroIndex(index)}
                      className={`h-2 w-6 rounded-full transition-colors ${
                        index === previewHeroIndex ? "bg-white" : "bg-white/40 hover:bg-white/70"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-white p-4">
            <h3 className="mb-4 text-xl">Preview Best Sellers</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {bestSellers.map((product) => (
                <ProductCard key={product.id} product={product} variant="home" />
              ))}
              {bestSellers.length === 0 && <p className="text-sm text-muted-foreground">Chưa chọn sản phẩm bán chạy.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
