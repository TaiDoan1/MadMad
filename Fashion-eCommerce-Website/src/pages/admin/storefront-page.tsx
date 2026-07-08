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
import { useToast } from "../../components/common/toast";

export function AdminStorefrontPage() {
  const { showToast } = useToast();
  const { products } = useProducts();
  const { settings, updateSettings } = useStorefrontSettings();
  const [bestSellerSearch, setBestSellerSearch] = useState("");
  const [bestSellerCategory, setBestSellerCategory] = useState("all");
  const [showOnlyUnselected, setShowOnlyUnselected] = useState(false);
  
  const overlayLeft = Math.min(100, Math.max(0, settings.heroOverlayOpacityLeft ?? 60)) / 100;
  const overlayMid = Math.min(100, Math.max(0, settings.heroOverlayOpacityMiddle ?? 40)) / 100;
  const overlayRight = Math.min(100, Math.max(0, settings.heroOverlayOpacityRight ?? 60)) / 100;
  const heroScalePercent = Math.min(200, Math.max(60, settings.heroImageScalePercent ?? 100));
  const heroScale = heroScalePercent / 100;
  
  const heroFontClass = settings.heroFontStyle === "serif" ? "font-serif" : settings.heroFontStyle === "mono" ? "font-mono" : "";
  const heroJustifyClass = settings.heroContentAlign === "left" ? "justify-start" : settings.heroContentAlign === "right" ? "justify-end" : "justify-center";
  const heroTextAlignClass = settings.heroContentAlign === "left" ? "text-left" : settings.heroContentAlign === "right" ? "text-right" : "text-center";
  
  const heroImageDrafts = settings.heroImages ?? [];
  const popularCategoryImageDrafts = settings.popularCategoryImages ?? [];
  const topBannerImageDrafts = settings.topBannerImages ?? [];
  const instagramImageDrafts = settings.instagramImages ?? [];
  
  const heroImages = heroImageDrafts.map((value) => value.trim()).filter(Boolean);
  const previewHeroImages = [settings.heroImage.trim(), ...heroImages].filter(Boolean);
  const [previewHeroIndex, setPreviewHeroIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"hero" | "bestsellers" | "gallery" | "instagram">("hero");
  
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
    .map((id) => products.find((product) => String(product.id) === String(id)))
    .filter((product): product is NonNullable<typeof product> => Boolean(product))
    .map((product) => ({
      ...product,
      image: settings.bestSellerImageOverrides[String(product.id) as any] ?? product.image,
    }));

  const toggleBestSeller = (productId: string | number) => {
    const currentIds = settings.bestSellerProductIds ?? [];
    const isIncluded = currentIds.some((id) => String(id) === String(productId));
    if (isIncluded) {
      const { [productId]: _, ...rest } = settings.bestSellerImageOverrides;
      updateSettings({
        bestSellerProductIds: currentIds.filter((id) => String(id) !== String(productId)),
        bestSellerImageOverrides: rest,
      });
      return;
    }
    updateSettings({ bestSellerProductIds: [...currentIds, productId] });
  };

  const buildImageOptions = (productId: string | number) => {
    const product = products.find((p) => String(p.id) === String(productId));
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
        .map((id) => products.find((product) => String(product.id) === String(id)))
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
        !showOnlyUnselected || !settings.bestSellerProductIds.some((id) => String(id) === String(product.id));
      return matchesSearch && matchesCategory && matchesSelected;
    });
  }, [bestSellerCategory, bestSellerSearch, products, settings.bestSellerProductIds, showOnlyUnselected]);

  const moveBestSeller = (productId: string | number, direction: "up" | "down") => {
    const current = settings.bestSellerProductIds ?? [];
    const index = current.findIndex((id) => String(id) === String(productId));
    if (index < 0) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= current.length) return;
    const next = [...current];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    updateSettings({ bestSellerProductIds: next });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Storefront Settings</h1>
          <p className="text-sm text-muted-foreground">Cấu hình giao diện trang chủ gọn gàng và trực quan</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/" className="rounded border border-border px-3 py-2 text-sm hover:bg-muted transition-colors sm:px-4">
            Xem trang chủ →
          </Link>
          <button 
            onClick={() => showToast("Cài đặt Storefront đã được lưu thành công!", "success")} 
            className="flex items-center gap-2 rounded bg-black px-3 py-2 text-sm text-white font-medium hover:bg-black/85 transition-colors sm:px-4"
          >
            <Save className="h-4 w-4" /> Lưu cấu hình
          </button>
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-1 border-b border-border">
        {(["hero", "bestsellers", "gallery", "instagram"] as const).map((tab) => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`shrink-0 px-3 py-2.5 text-sm capitalize transition-all duration-200 border-b-2 sm:px-4 ${
              activeTab === tab 
                ? "border-black font-bold text-black" 
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "hero" ? "🖼 Banner" : tab === "bestsellers" ? "⭐ Nổi bật" : tab === "gallery" ? "🗂 Gallery" : "📷 Instagram"}
          </button>
        ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 md:gap-6">
        {/* LEFT CONFIGURATION PANELS */}
        <div className="lg:col-span-3 rounded-xl border border-border bg-white p-4 md:p-5 space-y-4 shadow-sm">
          
          {/* HERO BANNER SETTINGS */}
          {activeTab === "hero" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-foreground">Banner Hero</h3>
                <button 
                  type="button" 
                  onClick={() => updateSettings({ 
                    heroOverlayOpacityLeft: DEFAULT_STOREFRONT_SETTINGS.heroOverlayOpacityLeft, 
                    heroOverlayOpacityMiddle: DEFAULT_STOREFRONT_SETTINGS.heroOverlayOpacityMiddle, 
                    heroOverlayOpacityRight: DEFAULT_STOREFRONT_SETTINGS.heroOverlayOpacityRight, 
                    heroImageScalePercent: DEFAULT_STOREFRONT_SETTINGS.heroImageScalePercent, 
                    heroContentAlign: DEFAULT_STOREFRONT_SETTINGS.heroContentAlign, 
                    heroFontStyle: DEFAULT_STOREFRONT_SETTINGS.heroFontStyle, 
                    heroSlideIntervalMs: DEFAULT_STOREFRONT_SETTINGS.heroSlideIntervalMs 
                  })} 
                  className="flex items-center gap-1 rounded border border-border px-2 py-1 text-xs hover:bg-muted transition-colors"
                >
                  <RotateCcw className="h-3 w-3" /> Reset mặc định
                </button>
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ảnh/Video Banner Chính</p>
                <ImageUploadInput
                  value={settings.heroImage}
                  onChange={(v) => updateSettings({ heroImage: v })}
                  placeholder="URL ảnh hoặc video banner chính..."
                  acceptVideo
                  maxDimension={2400}
                />
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Slideshow (Từ ảnh thứ 2)</p>
                  <button 
                    type="button" 
                    onClick={() => updateSettings({ heroImages: [...heroImageDrafts, ""] })} 
                    className="text-xs border border-border rounded px-2 py-1 bg-white hover:bg-muted transition-colors"
                  >
                    + Thêm ảnh slide
                  </button>
                </div>
                {heroImageDrafts.map((url, i) => (
                  <div key={i} className="flex gap-2">
                    <input 
                      value={url} 
                      onChange={(e) => { 
                        const n = [...heroImageDrafts]; 
                        n[i] = e.target.value; 
                        updateSettings({ heroImages: n }); 
                      }} 
                      placeholder={`Ảnh slide #${i + 2}`} 
                      className="flex-1 rounded border border-border bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black" 
                    />
                    <button 
                      type="button" 
                      onClick={() => updateSettings({ heroImages: heroImageDrafts.filter((_, j) => j !== i) })} 
                      className="px-2 text-sm text-red-500 hover:text-red-700 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Tốc độ slide (ms)</p>
                    <input 
                      type="number" 
                      min={2000} 
                      step={500} 
                      value={settings.heroSlideIntervalMs} 
                      onChange={(e) => updateSettings({ heroSlideIntervalMs: Number(e.target.value) })} 
                      className="w-full rounded border border-border bg-white px-3 py-1.5 text-sm focus:ring-1 focus:ring-black outline-none" 
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Phóng to ảnh ({heroScalePercent}%)</p>
                    <input 
                      type="range" 
                      min={60} 
                      max={200} 
                      step={5} 
                      value={heroScalePercent} 
                      onChange={(e) => updateSettings({ heroImageScalePercent: Number(e.target.value) })} 
                      className="w-full mt-2 accent-black" 
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Badge Text</p>
                  <input value={settings.heroBadgeText} onChange={(e) => updateSettings({ heroBadgeText: e.target.value })} className="w-full rounded border border-border px-3 py-1.5 text-sm focus:ring-1 focus:ring-black outline-none" />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Text Nút CTA</p>
                  <input value={settings.heroButtonText} onChange={(e) => updateSettings({ heroButtonText: e.target.value })} className="w-full rounded border border-border px-3 py-1.5 text-sm focus:ring-1 focus:ring-black outline-none" />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tiêu đề dòng 1</p>
                  <input value={settings.heroTitleLine1} onChange={(e) => updateSettings({ heroTitleLine1: e.target.value })} className="w-full rounded border border-border px-3 py-1.5 text-sm focus:ring-1 focus:ring-black outline-none" />
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tiêu đề dòng 2</p>
                  <input value={settings.heroTitleLine2} onChange={(e) => updateSettings({ heroTitleLine2: e.target.value })} className="w-full rounded border border-border px-3 py-1.5 text-sm focus:ring-1 focus:ring-black outline-none" />
                </div>
              </div>
              
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mô tả</p>
                <textarea value={settings.heroDescription} onChange={(e) => updateSettings({ heroDescription: e.target.value })} rows={2} className="w-full resize-none rounded border border-border px-3 py-1.5 text-sm focus:ring-1 focus:ring-black outline-none" />
              </div>

              <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overlay bóng tối & Căn chỉnh</p>
                <div>
                  <p className="text-xs text-muted-foreground">Độ tối bên Trái ({settings.heroOverlayOpacityLeft}%)</p>
                  <input type="range" min={0} max={90} value={settings.heroOverlayOpacityLeft} onChange={(e) => updateSettings({ heroOverlayOpacityLeft: Number(e.target.value) })} className="w-full accent-black" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Độ tối ở Giữa ({settings.heroOverlayOpacityMiddle}%)</p>
                  <input type="range" min={0} max={90} value={settings.heroOverlayOpacityMiddle} onChange={(e) => updateSettings({ heroOverlayOpacityMiddle: Number(e.target.value) })} className="w-full accent-black" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Độ tối bên Phải ({settings.heroOverlayOpacityRight}%)</p>
                  <input type="range" min={0} max={90} value={settings.heroOverlayOpacityRight} onChange={(e) => updateSettings({ heroOverlayOpacityRight: Number(e.target.value) })} className="w-full accent-black" />
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Vị trí nội dung</p>
                    <select value={settings.heroContentAlign} onChange={(e) => updateSettings({ heroContentAlign: e.target.value as "left" | "center" | "right" })} className="w-full rounded border border-border bg-white px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-black">
                      <option value="left">Căn trái</option>
                      <option value="center">Căn giữa</option>
                      <option value="right">Căn phải</option>
                    </select>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Font chữ tiêu đề</p>
                    <select value={settings.heroFontStyle} onChange={(e) => updateSettings({ heroFontStyle: e.target.value as "default" | "serif" | "mono" })} className="w-full rounded border border-border bg-white px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-black">
                      <option value="default">Default Sans</option>
                      <option value="serif">Elegant Serif</option>
                      <option value="mono">Modern Mono</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BEST SELLERS SETTINGS */}
          {activeTab === "bestsellers" && (
            <div className="space-y-4">
              <h3 className="font-bold text-lg text-foreground">Sản phẩm Nổi bật (Best Sellers)</h3>
              
              <div className="rounded-lg border border-black/10 bg-stone-50 p-3 space-y-2">
                <p className="text-sm font-semibold text-black">Đã chọn ({selectedBestSellerProducts.length} sản phẩm)</p>
                {selectedBestSellerProducts.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Chưa có sản phẩm nào được hiển thị. Vui lòng chọn bên dưới.</p>
                ) : (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {selectedBestSellerProducts.map((p) => {
                      const currentOvr = settings.bestSellerImageOverrides[p.id] ?? p.image;
                      return (
                        <div key={p.id} className="flex items-center gap-2 rounded border border-border bg-white p-2 shadow-sm transition-all hover:border-black/30">
                          <ImageWithFallback src={currentOvr} alt={p.name} className="h-9 w-7 rounded object-cover flex-shrink-0" />
                          <p className="truncate text-xs font-semibold flex-1">{p.name}</p>
                          <div className="flex gap-1">
                            <button type="button" title="Di chuyển lên" onClick={() => moveBestSeller(p.id, "up")} className="rounded border border-border px-1.5 py-0.5 text-xs hover:bg-muted transition-colors">↑</button>
                            <button type="button" title="Di chuyển xuống" onClick={() => moveBestSeller(p.id, "down")} className="rounded border border-border px-1.5 py-0.5 text-xs hover:bg-muted transition-colors">↓</button>
                            <button type="button" title="Gỡ bỏ" onClick={() => toggleBestSeller(p.id)} className="text-xs text-red-500 hover:bg-red-50 px-1.5 py-0.5 rounded border border-red-200 transition-all">✕</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input 
                  value={bestSellerSearch} 
                  onChange={(e) => setBestSellerSearch(e.target.value)} 
                  placeholder="Tìm sản phẩm..." 
                  className="rounded border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-black bg-white" 
                />
                <select 
                  value={bestSellerCategory} 
                  onChange={(e) => setBestSellerCategory(e.target.value)} 
                  className="rounded border border-border px-3 py-1.5 text-sm bg-white"
                >
                  <option value="all">Tất cả danh mục</option>
                  {bestSellerCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                <input type="checkbox" checked={showOnlyUnselected} onChange={(e) => setShowOnlyUnselected(e.target.checked)} className="accent-black" />
                Chỉ hiện các sản phẩm chưa được chọn hiển thị
              </label>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {filteredBestSellerProducts.map((p) => {
                  const isSel = settings.bestSellerProductIds.includes(p.id);
                  const imgOpts = buildImageOptions(p.id);
                  const ovrUrl = settings.bestSellerImageOverrides[p.id] ?? p.image;
                  return (
                    <div key={p.id} className={`rounded-lg border p-3.5 space-y-2 transition-all ${isSel ? "border-black bg-stone-50" : "border-border hover:border-black/30"}`}>
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input type="checkbox" checked={isSel} onChange={() => toggleBestSeller(p.id)} className="accent-black" />
                        <ImageWithFallback src={ovrUrl} alt={p.name} className="h-10 w-8 rounded object-cover flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.price.toLocaleString("vi-VN")}₫</p>
                        </div>
                      </label>
                      {isSel && imgOpts.length > 0 && (
                        <div className="pt-1">
                          <p className="text-[10px] text-muted-foreground mb-1">Ảnh hiển thị thay thế:</p>
                          <select 
                            value={ovrUrl} 
                            onChange={(e) => updateSettings({
                              bestSellerImageOverrides: {
                                ...settings.bestSellerImageOverrides,
                                [p.id]: e.target.value
                              }
                            })} 
                            className="w-full rounded border border-border bg-white px-2 py-1 text-xs focus:ring-1 focus:ring-black outline-none"
                          >
                            {imgOpts.map((o) => <option key={o.url} value={o.url}>{o.label}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredBestSellerProducts.length === 0 && (
                  <p className="text-sm text-muted-foreground italic text-center py-4">
                    {bestSellerSearch.trim() || bestSellerCategory !== "all" 
                      ? "Không tìm thấy sản phẩm phù hợp." 
                      : "Nhập từ khóa hoặc chọn bộ lọc để tìm sản phẩm."}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* HOME GALLERY SETTINGS */}
          {activeTab === "gallery" && (
            <div className="space-y-8">
              {/* Banner trên - ngay dưới Marquee */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-foreground">Banner Trên (dưới dòng chạy Marquee)</h3>
                  <button
                    type="button"
                    onClick={() => updateSettings({ topBannerImages: [...topBannerImageDrafts, ""] })}
                    className="text-xs border border-border rounded px-2.5 py-1 bg-white hover:bg-muted transition-colors"
                  >
                    + Thêm ảnh
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Ảnh banner hiển thị ngay sau dòng chữ chạy "MADMAD MAKE YOUR MARK", trước phần Nổi Bật. Khuyến nghị tỷ lệ 16:9 (1600×900px).</p>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {topBannerImageDrafts.map((url, i) => (
                    <div key={i} className="flex gap-2 items-start border border-border rounded-lg p-2 bg-stone-50">
                      <div className="flex-shrink-0 w-12 h-8 rounded border border-border overflow-hidden bg-muted">
                        {url.trim() && <img src={url.trim()} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <ImageUploadInput
                        value={url}
                        onChange={(v) => {
                          const n = [...topBannerImageDrafts];
                          n[i] = v;
                          updateSettings({ topBannerImages: n });
                        }}
                        className="flex-1"
                        placeholder={`Đường dẫn ảnh banner trên #${i + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => updateSettings({ topBannerImages: topBannerImageDrafts.filter((_, j) => j !== i) })}
                        className="px-2 py-1.5 text-sm text-red-500 hover:text-red-700 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {topBannerImageDrafts.length === 0 && (
                    <p className="text-xs text-muted-foreground italic text-center py-6">Chưa có ảnh banner trên nào được định cấu hình.</p>
                  )}
                </div>
              </div>

              {/* Banner dưới - sau phần Nổi Bật (Gallery gốc) */}
              <div className="space-y-4 border-t border-border pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-lg text-foreground">Banner Dưới (sau phần Nổi Bật)</h3>
                  <button
                    type="button"
                    onClick={() => updateSettings({ popularCategoryImages: [...popularCategoryImageDrafts, ""] })}
                    className="text-xs border border-border rounded px-2.5 py-1 bg-white hover:bg-muted transition-colors"
                  >
                    + Thêm ảnh Gallery
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">Các ảnh banner lớn toàn màn hình hiển thị giữa trang chủ, sau phần sản phẩm Nổi Bật. Khuyến nghị tỷ lệ 16:9 (1600×900px).</p>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {popularCategoryImageDrafts.map((url, i) => (
                    <div key={i} className="flex gap-2 items-start border border-border rounded-lg p-2 bg-stone-50">
                      <div className="flex-shrink-0 w-12 h-8 rounded border border-border overflow-hidden bg-muted">
                        {url.trim() && <img src={url.trim()} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <ImageUploadInput
                        value={url}
                        onChange={(v) => {
                          const n = [...popularCategoryImageDrafts];
                          n[i] = v;
                          updateSettings({ popularCategoryImages: n });
                        }}
                        className="flex-1"
                        placeholder={`Đường dẫn ảnh gallery #${i + 1}`}
                      />
                      <button
                        type="button"
                        onClick={() => updateSettings({ popularCategoryImages: popularCategoryImageDrafts.filter((_, j) => j !== i) })}
                        className="px-2 py-1.5 text-sm text-red-500 hover:text-red-700 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {popularCategoryImageDrafts.length === 0 && (
                    <p className="text-xs text-muted-foreground italic text-center py-6">Chưa có ảnh gallery nào được định cấu hình.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* INSTAGRAM FEED SETTINGS */}
          {activeTab === "instagram" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  Instagram Feed (Marquee)
                </h3>
                <button 
                  type="button" 
                  onClick={() => updateSettings({ instagramImages: [...instagramImageDrafts, ""] })} 
                  className="text-xs font-bold border border-border rounded px-2.5 py-1 bg-white hover:bg-muted transition-colors"
                >
                  + Thêm ảnh Instagram
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Luồng ảnh chạy ngang vô tận ở cuối trang chủ. Tỷ lệ dọc 2:3 khuyến nghị. Để trống để sử dụng 5 hình ảnh Editorial mặc định.</p>
              
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {instagramImageDrafts.map((url, i) => (
                  <div key={i} className="flex gap-2 items-start border border-border rounded-lg p-2 bg-stone-50">
                    <div className="flex-shrink-0 w-10 h-12 rounded border border-border overflow-hidden bg-muted">
                      {url.trim() && <img src={url.trim()} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <ImageUploadInput 
                      value={url} 
                      onChange={(v) => {
                        const n = [...instagramImageDrafts];
                        n[i] = v;
                        updateSettings({ instagramImages: n });
                      }} 
                      className="flex-1" 
                      placeholder={`Đường dẫn ảnh Instagram #${i + 1}`} 
                    />
                    <button 
                      type="button" 
                      onClick={() => updateSettings({ instagramImages: instagramImageDrafts.filter((_, j) => j !== i) })} 
                      className="px-2 py-1.5 text-sm text-red-500 hover:text-red-700 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {instagramImageDrafts.length === 0 && (
                  <p className="text-xs text-muted-foreground italic text-center py-6">Đang sử dụng luồng 5 ảnh mặc định của MADMAD Studio.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT LIVE PREVIEW PANEL */}
        <div className="lg:col-span-2 space-y-4">
          <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <div className="border-b border-border px-4 py-3 flex items-center justify-between bg-stone-50">
              <p className="text-xs font-bold uppercase tracking-wider text-black/55">Realtime Preview (Hero Banner)</p>
              {previewHeroImages.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={goToPrevPreviewHero} className="rounded-full bg-black/5 p-1 hover:bg-black/10 transition-colors">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-[10px] text-muted-foreground font-mono">{previewHeroIndex + 1}/{previewHeroImages.length}</span>
                  <button type="button" onClick={goToNextPreviewHero} className="rounded-full bg-black/5 p-1 hover:bg-black/10 transition-colors">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            
            <div className="relative h-64 bg-stone-100 overflow-hidden">
              {previewHeroImages.map((imgUrl, idx) => {
                const isAct = idx === Math.min(previewHeroIndex, previewHeroImages.length - 1);
                return (
                  <ImageWithFallback 
                    key={`${imgUrl}-${idx}`} 
                    src={imgUrl} 
                    alt={`Preview slide ${idx + 1}`} 
                    className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${isAct ? "opacity-100" : "opacity-0"}`} 
                    style={{ transform: `scale(${isAct ? heroScale : heroScale + 0.05})` }} 
                  />
                );
              })}
              
              <div 
                className="absolute inset-0" 
                style={{ 
                  background: `linear-gradient(to right, rgba(0,0,0,${overlayLeft}), rgba(0,0,0,${overlayMid}), rgba(0,0,0,${overlayRight}))` 
                }} 
              />
              
              <div className="absolute inset-0 flex items-center p-5 text-white">
                <div className={`flex w-full ${heroJustifyClass}`}>
                  <div className={`max-w-xs space-y-2 ${heroTextAlignClass} ${heroFontClass}`}>
                    <p className="text-[8px] uppercase tracking-widest opacity-80">{settings.heroBadgeText}</p>
                    <h2 className="text-lg font-black leading-tight">{settings.heroTitleLine1}<br />{settings.heroTitleLine2}</h2>
                    <p className="text-[10px] opacity-80 line-clamp-2">{settings.heroDescription}</p>
                    <span className="inline-block rounded bg-primary px-3 py-1 text-[10px] font-bold">{settings.heroButtonText}</span>
                  </div>
                </div>
              </div>
              
              {previewHeroImages.length > 1 && (
                <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {previewHeroImages.map((_, idx) => (
                    <button 
                      key={idx} 
                      type="button" 
                      onClick={() => setPreviewHeroIndex(idx)} 
                      className={`h-1 rounded-full transition-all ${idx === previewHeroIndex ? "bg-white w-4" : "bg-white/40 w-1.5"}`} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {bestSellers.length > 0 && (
            <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-black/55">Preview Best Sellers (4 sản phẩm đầu)</p>
              <div className="grid grid-cols-2 gap-3">
                {bestSellers.slice(0, 4).map((p) => (
                  <ProductCard key={p.id} product={p} variant="home" />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
