import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Filter } from "lucide-react";
import { useSearchParams } from "react-router";

import { ProductCard } from "@/components/shared/product-card";
import { useProducts } from "@/features/products/context/product-context";
import { useStorefrontSettings } from "@/features/settings/context/storefront-settings-context";

export function ShopPage() {
  const { products } = useProducts();
  const { settings } = useStorefrontSettings();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPriceRange, setSelectedPriceRange] = useState<"all" | "under-500k" | "500k-1m" | "1m-2m" | "over-2m">("all");
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"featured" | "price-low" | "price-high" | "newest" | "rating">("featured");
  const [showFilters, setShowFilters] = useState(false);

  const PRODUCT_OPTIONS_STORAGE_KEY = "fashion-ecommerce.product-options";

  const defaultCategories = useMemo(() => Array.from(new Set(products.map((p) => p.category))).filter(Boolean), [products]);
  const defaultSizes = useMemo(() => Array.from(new Set(products.flatMap((p) => p.sizes))).filter(Boolean), [products]);
  const defaultColors = useMemo(() => Array.from(new Set(products.flatMap((p) => p.colors))).filter(Boolean), [products]);

  const productOptions = useMemo(() => {
    if (typeof window === "undefined") {
      return { categories: defaultCategories, sizes: defaultSizes, colors: defaultColors };
    }
    const raw = window.localStorage.getItem(PRODUCT_OPTIONS_STORAGE_KEY);
    if (!raw) return { categories: defaultCategories, sizes: defaultSizes, colors: defaultColors };
    try {
      const parsed = JSON.parse(raw) as { categories?: unknown; sizes?: unknown; colors?: unknown };
      return {
        categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 ? (parsed.categories as string[]) : defaultCategories,
        sizes: Array.isArray(parsed.sizes) && parsed.sizes.length > 0 ? (parsed.sizes as string[]) : defaultSizes,
        colors: Array.isArray(parsed.colors) && parsed.colors.length > 0 ? (parsed.colors as string[]) : defaultColors,
      };
    } catch {
      return { categories: defaultCategories, sizes: defaultSizes, colors: defaultColors };
    }
  }, [defaultCategories, defaultColors, defaultSizes]);

  useEffect(() => {
    const categoryFromQuery = searchParams.get("category");
    if (!categoryFromQuery) return;
    if (productOptions.categories.includes(categoryFromQuery)) {
      setSelectedCategory(categoryFromQuery);
    }
  }, [productOptions.categories, searchParams]);

  const priceRangePredicate = (price: number) => {
    switch (selectedPriceRange) {
      case "under-500k":
        return price < 500_000;
      case "500k-1m":
        return price >= 500_000 && price <= 1_000_000;
      case "1m-2m":
        return price > 1_000_000 && price <= 2_000_000;
      case "over-2m":
        return price > 2_000_000;
      default:
        return true;
    }
  };

  const filteredProducts = useMemo(() => {
    const byCategory = selectedCategory === "all" ? products : products.filter((product) => product.category === selectedCategory);
    const byPrice = byCategory.filter((product) => priceRangePredicate(product.price));
    const bySizes = selectedSizes.length === 0 ? byPrice : byPrice.filter((product) => selectedSizes.some((size) => product.sizes.includes(size)));
    const byColors = selectedColors.length === 0 ? bySizes : bySizes.filter((product) => selectedColors.some((color) => product.colors.includes(color)));

    const sorted = [...byColors];
    sorted.sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      if (sortBy === "newest") return b.id - a.id;
      if (sortBy === "rating") return b.rating - a.rating;
      return b.id - a.id;
    });

    return sorted;
  }, [products, selectedCategory, selectedColors, selectedPriceRange, selectedSizes, sortBy]);

  const clearFilters = () => {
    setSelectedCategory("all");
    setSelectedPriceRange("all");
    setSelectedSizes([]);
    setSelectedColors([]);
    setSortBy("featured");
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("category");
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-background pt-6 pb-2">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold tracking-wide uppercase font-sans">Cửa hàng</h1>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)] transition-all duration-500 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 mr-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold uppercase tracking-wider hidden sm:inline-block">Bộ lọc:</span>
            </div>
            
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="cursor-pointer appearance-none rounded border border-border bg-background px-3 py-2 pr-8 text-sm transition-colors hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">Tất cả danh mục</option>
                {productOptions.categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>

            <div className="relative">
              <select
                value={selectedPriceRange}
                onChange={(e) => setSelectedPriceRange(e.target.value as any)}
                className="cursor-pointer appearance-none rounded border border-border bg-background px-3 py-2 pr-8 text-sm transition-colors hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">Mọi mức giá</option>
                <option value="under-500k">Dưới 500K</option>
                <option value="500k-1m">500K - 1M</option>
                <option value="1m-2m">1M - 2M</option>
                <option value="over-2m">Trên 2M</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>

            {(selectedCategory !== "all" || selectedPriceRange !== "all") && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary hover:underline px-2 transition-colors"
              >
                Xóa lọc
              </button>
            )}
          </div>

          <div className="flex items-center gap-4 border-t border-border pt-4 sm:border-t-0 sm:pt-0">
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {filteredProducts.length} sản phẩm
            </span>
            <div className="relative w-full sm:w-auto">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                className="w-full cursor-pointer appearance-none rounded border border-border bg-background px-4 py-2 pr-10 text-sm transition-colors hover:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="featured">Nổi bật</option>
                <option value="price-low">Giá: thấp → cao</option>
                <option value="price-high">Giá: cao → thấp</option>
                <option value="newest">Mới nhất</option>
                <option value="rating">Đánh giá tốt</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:grid-cols-4 xl:gap-6">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} variant="shop" />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-muted-foreground">Không có sản phẩm nào phù hợp với điều kiện lọc của bạn.</p>
            <button onClick={clearFilters} className="mt-4 px-6 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors">
              Xem tất cả sản phẩm
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
