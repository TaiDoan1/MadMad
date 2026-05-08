import { Link } from "react-router";

import { ImageWithFallback } from "@/components/common/image-with-fallback";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
  variant?: "home" | "shop";
}

export function ProductCard({ product, variant = "shop" }: ProductCardProps) {
  const imageFrameClass = variant === "home" ? "aspect-[4/5]" : "aspect-square";
  const isFlatCard = variant === "home" || variant === "shop";
  const cardShellClass =
    isFlatCard
      ? "bg-transparent shadow-none hover:-translate-y-1 hover:shadow-none"
      : "bg-white shadow-[0_4px_24px_rgba(0,0,0,0.03)] hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]";
  const mediaBgClass = isFlatCard ? "bg-transparent" : "bg-white";
  const contentBgClass = isFlatCard ? "bg-transparent" : "bg-white";
  const primaryTag = (product.tags ?? [])[0];
  const normalizedTag = (primaryTag || "").toLowerCase();
  const tagBadgeClass =
    normalizedTag.includes("new")
      ? "bg-emerald-500 text-white"
      : normalizedTag.includes("hot")
        ? "bg-orange-500 text-white"
        : normalizedTag.includes("best")
          ? "bg-violet-600 text-white"
          : "bg-slate-900 text-white";

  return (
    <div className={`group relative flex h-full flex-col overflow-hidden rounded-none transition-all duration-500 active:-translate-y-1 ${cardShellClass}`}>
      <Link to={`/product/${product.id}`} className={`relative block overflow-hidden ${mediaBgClass} ${imageFrameClass}`}>
        <ImageWithFallback
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110 group-active:scale-110"
        />
        {primaryTag ? (
          <span
            className={`absolute left-3 top-3 z-10 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide shadow-sm ${tagBadgeClass}`}
          >
            {primaryTag}
          </span>
        ) : null}
        {product.discountPercent ? (
          <span className="absolute right-3 top-3 z-10 rounded-full bg-red-600 px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
            -{product.discountPercent}%
          </span>
        ) : null}
      </Link>

      <div className={`flex min-h-[144px] flex-1 flex-col p-4 text-center ${contentBgClass}`}>
        <div className="mb-2 h-4 text-xs text-muted-foreground">
          {(product.tags ?? []).length > 1 ? `+${(product.tags ?? []).length - 1} tag khác` : ""}
        </div>
        <Link to={`/product/${product.id}`}>
          <h3 className="mb-2 min-h-[3rem] line-clamp-2 uppercase tracking-wide transition-colors hover:text-primary active:text-primary">
            {product.name}
          </h3>
        </Link>

        <div className="mt-auto flex items-center justify-center gap-2">
          <span className="text-lg">{product.price.toLocaleString("vi-VN")}₫</span>
          {product.originalPrice ? (
            <span className="text-sm text-muted-foreground line-through">{product.originalPrice.toLocaleString("vi-VN")}₫</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
