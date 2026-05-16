import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { Link } from "react-router";

import { ImageWithFallback } from "@/components/common/image-with-fallback";
import { useCart } from "@/features/cart/context/cart-context";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
  variant?: "home" | "shop";
}

export function ProductCard({ product, variant = "shop" }: ProductCardProps) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const isHome = variant === "home";
  const imageFrameClass = isHome ? "aspect-square" : "aspect-square";
  const cardBg = isHome ? "bg-transparent" : "bg-white";

  const primaryTag = (product.tags ?? [])[0];
  const isOnSale = Boolean(product.originalPrice && product.originalPrice > product.price);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1_500);
  };

  return (
    <div className={`group relative flex h-full flex-col overflow-hidden ${cardBg} transition-all duration-300`}>
      {/* ── Image ─────────────────────────────────────────────────────────── */}
      <Link to={`/product/${product.id}`} className={`relative block overflow-hidden ${imageFrameClass}`}>
        <ImageWithFallback
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {/* Sale badge — bottom-left, Protect.LDN style */}
        {isOnSale && (
          <span className="absolute bottom-3 left-3 z-10 bg-primary px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
            Sale
          </span>
        )}

        {/* Tag badge — top-left */}
        {primaryTag && !isOnSale && (
          <span className="absolute left-3 top-3 z-10 bg-black px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
            {primaryTag}
          </span>
        )}

        {/* Quick-add button — appears on hover */}
        <button
          type="button"
          onClick={handleQuickAdd}
          className="absolute bottom-3 right-3 z-10 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100"
          title="Thêm vào giỏ"
        >
          <span
            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition-colors duration-200 ${
              added ? "bg-green-600 text-white" : "bg-black text-white hover:bg-primary"
            }`}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {added ? "Đã thêm" : "Thêm nhanh"}
          </span>
        </button>
      </Link>

      {/* ── Info ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-0.5 px-0 pb-5 pt-2.5">
        <Link to={`/product/${product.id}`}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-black transition-colors hover:text-primary line-clamp-1 leading-tight">
            {product.name}
          </h3>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-black">
            {product.price.toLocaleString("vi-VN")}₫
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-xs text-black/40 line-through">
              {product.originalPrice.toLocaleString("vi-VN")}₫
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
