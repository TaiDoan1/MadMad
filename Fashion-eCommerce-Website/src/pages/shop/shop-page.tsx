import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import { ProductCard } from "@/components/shared/product-card";
import { useProducts } from "@/features/products/context/product-context";
import { useLanguage } from "@/features/settings/context/language-context";

export function ShopPage() {
  const { products } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, translate } = useLanguage();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPriceRange, setSelectedPriceRange] = useState<
    "all" | "under-500k" | "500k-1m" | "1m-2m" | "over-2m"
  >("all");
  const [sortBy, setSortBy] = useState<
    "featured" | "price-low" | "price-high" | "newest"
  >("featured");

  /* ── Derive categories from products ───────────────────────────────── */
  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category))).filter(Boolean),
    [products],
  );

  /* ── Read ?category= query param on mount ──────────────────────────── */
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat && categories.includes(cat)) setSelectedCategory(cat);
  }, [categories, searchParams]);

  /* ── Filtered + sorted products ────────────────────────────────────── */
  const filteredProducts = useMemo(() => {
    let result =
      selectedCategory === "all"
        ? products
        : products.filter((p) => p.category === selectedCategory);

    result = result.filter((p) => {
      switch (selectedPriceRange) {
        case "under-500k":
          return p.price < 500_000;
        case "500k-1m":
          return p.price >= 500_000 && p.price <= 1_000_000;
        case "1m-2m":
          return p.price > 1_000_000 && p.price <= 2_000_000;
        case "over-2m":
          return p.price > 2_000_000;
        default:
          return true;
      }
    });

    return [...result].sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      if (sortBy === "newest") return b.id - a.id;
      return 0; // featured → Giữ nguyên thứ tự custom từ context
    });
  }, [products, selectedCategory, selectedPriceRange, sortBy]);

  const clearFilters = () => {
    setSelectedCategory("all");
    setSelectedPriceRange("all");
    setSortBy("featured");
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("category");
      return next;
    });
  };

  const hasActiveFilters =
    selectedCategory !== "all" || selectedPriceRange !== "all";

  /* ── Tab button helper ──────────────────────────────────────────────── */
  const TabBtn = ({
    value,
    label,
  }: {
    value: string;
    label: string;
  }) => (
    <button
      onClick={() => setSelectedCategory(value)}
      className={`shrink-0 border-b-2 px-5 py-3.5 text-[11px] font-bold uppercase tracking-widest transition-colors ${
        selectedCategory === value
          ? "border-black text-black"
          : "border-transparent text-black/35 hover:text-black"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="border-b border-black/8">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
          {/* Large editorial title */}
          <h1 className="py-10 text-center text-4xl font-black uppercase tracking-[0.2em] lg:text-5xl">
            {t("Cửa hàng", "Shop")}
          </h1>

          {/* Category tabs — like Flowbit's collection nav */}
          <div className="flex items-center overflow-x-auto scrollbar-hide -mx-1">
            <TabBtn value="all" label={t("Tất cả", "All")} />
            {categories.map((cat) => (
              <TabBtn key={cat} value={cat} label={translate(cat)} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Slim toolbar: count + price + sort ──────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-black/8">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-12">
          <div className="flex items-center justify-between py-3">
            <span className="text-[11px] uppercase tracking-widest text-black/40">
              {filteredProducts.length} {t("sản phẩm", "products")}
            </span>

            <div className="flex items-center gap-6">
              {/* Price filter */}
              <select
                value={selectedPriceRange}
                onChange={(e) =>
                  setSelectedPriceRange(
                    e.target.value as typeof selectedPriceRange,
                  )
                }
                className="cursor-pointer appearance-none bg-transparent text-[11px] font-bold uppercase tracking-widest text-black/50 transition-colors focus:outline-none hover:text-black"
              >
                <option value="all">{t("Mọi mức giá", "All Prices")}</option>
                <option value="under-500k">{t("Dưới 500K", "Under 500K")}</option>
                <option value="500k-1m">{t("500K – 1M", "500K – 1M")}</option>
                <option value="1m-2m">{t("1M – 2M", "1M – 2M")}</option>
                <option value="over-2m">{t("Trên 2M", "Over 2M")}</option>
              </select>

              {/* Divider */}
              <span className="h-3.5 w-px bg-black/15" />

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as typeof sortBy)
                }
                className="cursor-pointer appearance-none bg-transparent text-[11px] font-bold uppercase tracking-widest text-black/50 transition-colors focus:outline-none hover:text-black"
              >
                <option value="featured">{t("Nổi bật", "Featured")}</option>
                <option value="price-low">{t("Giá: thấp → cao", "Price: Low to High")}</option>
                <option value="price-high">{t("Giá: cao → thấp", "Price: High to Low")}</option>
                <option value="newest">{t("Mới nhất", "Newest")}</option>
              </select>

              {/* Clear filters */}
              {hasActiveFilters && (
                <>
                  <span className="h-3.5 w-px bg-black/15" />
                  <button
                    onClick={clearFilters}
                    className="text-[11px] uppercase tracking-widest text-black/40 transition-colors hover:text-black"
                  >
                    {t("Xóa lọc ×", "Clear ×")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Product grid ─────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-[1400px] px-6 py-8 lg:px-12">
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-10 lg:gap-x-6 lg:gap-y-14">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} variant="shop" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <p className="text-sm uppercase tracking-widest text-black/30">
              {t("Không có sản phẩm phù hợp", "No matching products found")}
            </p>
            <button
              onClick={clearFilters}
              className="mt-8 border border-black px-10 py-3 text-[11px] font-bold uppercase tracking-widest transition-colors hover:bg-black hover:text-white"
            >
              {t("Xem tất cả sản phẩm", "View All Products")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
