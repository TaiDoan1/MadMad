import { useState } from "react";
import { ShoppingCart } from "lucide-react";
import { Link } from "react-router";

import { ImageWithFallback } from "@/components/common/image-with-fallback";
import { useCart } from "@/features/cart/context/cart-context";
import { useLanguage } from "@/features/settings/context/language-context";
import type { Product } from "@/types/product";
import { isProductSoldOut } from "@/utils/product-stock";
import { isGiftProduct } from "@/utils/gift-eligibility";

interface ProductCardProps {
  product: Product;
  variant?: "home" | "shop";
}

export function ProductCard({ product, variant = "shop" }: ProductCardProps) {
  const { addToCart } = useCart();
  const { formatPrice, t, translate } = useLanguage();
  const [added, setAdded] = useState(false);
  const [touchFlipped, setTouchFlipped] = useState(false);

  const isHome = variant === "home";
  const imageFrameClass = "aspect-[3/4]";
  const cardBg = isHome ? "bg-transparent" : "bg-white";

  const primaryTag = (product.tags ?? [])[0];
  const isOnSale = Boolean(product.originalPrice && product.originalPrice > product.price);
  const isPreOrder = Boolean(product.isPreOrder || (product.tags ?? []).some((tag) => tag.toLowerCase().includes("pre-order")));
  const isGift = isGiftProduct(product);
  const isSoldOut = isProductSoldOut(product);
  const canBuy = !isSoldOut && !isGift;

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

  const secondaryImage = product.images && product.images.length > 1 ? product.images[1] : null;

  // Trên thiết bị cảm ứng không có "hover" nên chạm lần 1 sẽ đổi ảnh (peek), chạm lần 2 mới vào trang sản phẩm
  const handleImageTap = (e: React.MouseEvent) => {
    if (!secondaryImage || touchFlipped) return;
    const isTouchDevice = typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;
    if (isTouchDevice) {
      e.preventDefault();
      setTouchFlipped(true);
    }
  };

  return (
    <div className={`group relative flex h-full flex-col overflow-hidden ${cardBg} transition-all duration-300`}>
      {/* ── Image ─────────────────────────────────────────────────────────── */}
      <Link to={`/product/${product.id}`} onClick={handleImageTap} className={`relative block overflow-hidden ${imageFrameClass}`}>
        <ImageWithFallback
          src={product.image}
          alt={translate(product.name)}
          className={`h-full w-full object-cover transition-all duration-700 group-hover:scale-105 ${secondaryImage ? "group-hover:opacity-0" : ""} ${touchFlipped ? "!opacity-0 !scale-105" : ""}`}
        />
        {secondaryImage && (
          <ImageWithFallback
            src={secondaryImage}
            alt={`${translate(product.name)} hover`}
            className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 opacity-0 group-hover:opacity-100 group-hover:scale-105 ${touchFlipped ? "!opacity-100 !scale-105" : ""}`}
          />
        )}

        {/* Sale badge — bottom-left, Protect.LDN style */}
        {isOnSale && (
          <span className="absolute bottom-3 left-3 z-10 bg-primary px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
            {product.showDiscountPercent && product.discountPercent ? `-${product.discountPercent}%` : "Sale"}
          </span>
        )}

        {/* Tag badge — top-left */}
        {isSoldOut ? (
          <span className="absolute left-3 top-3 z-10 bg-stone-100 border border-stone-300 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-stone-500">
            {t("Hết hàng", "Sold out")}
          </span>
        ) : isGift ? (
          <span className="absolute left-3 top-3 z-10 bg-emerald-600 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
            {t("Hàng tặng", "Gift")}
          </span>
        ) : isPreOrder ? (
          <span className="absolute left-3 top-3 z-10 bg-black px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
            Pre-order
          </span>
        ) : primaryTag && !isOnSale ? (
          <span className="absolute left-3 top-3 z-10 bg-black px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
            {primaryTag}
          </span>
        ) : null}

        {/* Quick-add button — appears on hover */}
        {!canBuy ? (
          <span className="absolute bottom-3 right-3 z-10 bg-stone-100 border border-stone-300 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-stone-400 select-none">
            {t("Hết hàng", "Sold out")}
          </span>
        ) : (
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
        )}
      </Link>

      {/* ── Info ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-0.5 px-0 pb-5 pt-2.5">
        <Link to={`/product/${product.id}`}>
          <h3 className="text-xs font-normal uppercase tracking-widest text-black hover:text-red-700 transition-colors line-clamp-1 leading-tight">
            {translate(product.name)}
          </h3>
        </Link>

        <div className="flex items-center gap-2">
          {isGift ? (
            <span className="text-sm font-semibold text-emerald-700">
              {t("Miễn phí", "Free")}
            </span>
          ) : (
            <>
              <span className="text-sm font-semibold text-black">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-xs text-black/40 line-through">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </>
          )}
        </div>

        {isGift && !isSoldOut && (
          <span className="mt-1 block text-[10px] font-black uppercase tracking-wider text-emerald-700">
            {t("Hàng tặng", "Gift item")}
          </span>
        )}

        {isPreOrder && !isSoldOut && !isGift && (
          <span className="mt-1 block text-[10px] font-black uppercase tracking-wider text-amber-700">
            Có hàng sau {product.preOrderDays ?? 7} ngày
          </span>
        )}

        {!canBuy && !isGift && (
          <span className="text-[11px] font-black text-black/40 uppercase tracking-wider mt-1 block">
            {t("Hết hàng", "Sold out")}
          </span>
        )}
      </div>
    </div>
  );
}

export function ProductCardSkeleton({ variant = "shop" }: { variant?: "home" | "shop" }) {
  const isHome = variant === "home";
  const cardBg = isHome ? "bg-transparent" : "bg-white";

  return (
    <div className={`flex flex-col h-full overflow-hidden ${cardBg} animate-pulse`}>
      {/* Aspect Ratio Box 3:4 */}
      <div className="relative aspect-[3/4] w-full bg-neutral-100 dark:bg-neutral-800" />
      {/* Text Lines */}
      <div className="flex flex-col gap-2 px-0 pb-5 pt-2.5">
        <div className="h-3.5 w-3/4 bg-neutral-200 dark:bg-neutral-700 rounded" />
        <div className="h-4 w-1/3 bg-neutral-200 dark:bg-neutral-700 rounded" />
      </div>
    </div>
  );
}

