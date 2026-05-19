import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { Link } from "react-router";

import { ImageWithFallback } from "@/components/common/image-with-fallback";
import { useCart } from "@/features/cart/context/cart-context";
import { useLanguage } from "@/features/settings/context/language-context";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
  variant?: "home" | "shop";
}

export function ProductCard({ product, variant = "shop" }: ProductCardProps) {
  const { addToCart } = useCart();
  const { formatPrice, t, translate } = useLanguage();
  const [added, setAdded] = useState(false);

  const isHome = variant === "home";
  const imageFrameClass = "aspect-[3/4]";
  const cardBg = isHome ? "bg-transparent" : "bg-white";

  const primaryTag = (product.tags ?? [])[0];
  const isOnSale = Boolean(product.originalPrice && product.originalPrice > product.price);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const defaultSize = product.sizes && product.sizes.length > 0 ? product.sizes[0] : "Free Size";
    const defaultColor = product.colors && product.colors.length > 0 ? product.colors[0] : "Default";
    
    addToCart({
      productId: product.id,
      size: defaultSize,
      color: defaultColor,
      quantity: 1,
      priceAtAdd: product.price
    });
    
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className={`group relative flex h-full flex-col overflow-hidden ${cardBg} transition-all duration-300`}>
      {/* ── Image ─────────────────────────────────────────────────────────── */}
      <Link to={`/product/${product.id}`} className={`relative block overflow-hidden ${imageFrameClass}`}>
        <ImageWithFallback
          src={product.image}
          alt={translate(product.name)}
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
          title={t("Thêm vào giỏ", "Add to cart")}
        >
          <span
            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition-colors duration-200 ${
              added ? "bg-green-600 text-white" : "bg-black text-white hover:bg-primary"
            }`}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {added ? t("Đã thêm", "Added") : t("Thêm nhanh", "Quick Add")}
          </span>
        </button>
      </Link>

      {/* ── Info ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-0.5 px-0 pb-5 pt-2.5">
        <Link to={`/product/${product.id}`}>
          <h3 className="text-xs font-normal uppercase tracking-widest text-black hover:text-red-700 transition-colors line-clamp-1 leading-tight">
            {translate(product.name)}
          </h3>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-black">
            {formatPrice(product.price)}
          </span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-xs text-black/40 line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
