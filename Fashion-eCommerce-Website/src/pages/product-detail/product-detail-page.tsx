import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { Search, ShoppingCart, User, Share2, ArrowLeft } from "lucide-react";

import { ImageWithFallback } from "@/components/common/image-with-fallback";
import { useTransitionTo } from "@/components/common/page-transition";
import { useCart } from "@/features/cart/context/cart-context";
import { useProducts } from "@/features/products/context/product-context";
import { useStorefrontSettings } from "@/features/settings/context/storefront-settings-context";

const COLOR_MAP: Record<string, { bg: string, text: string }> = {
  "Trắng": { bg: "#FFFFFF", text: "#000000" },
  "Đen": { bg: "#171717", text: "#FFFFFF" },
  "Xám": { bg: "#9CA3AF", text: "#FFFFFF" },
  "Đỏ": { bg: "#EF4444", text: "#FFFFFF" },
  "Navy": { bg: "#1E3A8A", text: "#FFFFFF" },
  "Xanh/Trắng": { bg: "#3B82F6", text: "#FFFFFF" },
  "Đỏ/Trắng": { bg: "#EF4444", text: "#FFFFFF" },
  "Sọc": { bg: "#6B7280", text: "#FFFFFF" },
  "Hoa": { bg: "#F472B6", text: "#FFFFFF" },
  "Be": { bg: "#FDE68A", text: "#000000" },
  "Camel": { bg: "#D97706", text: "#FFFFFF" },
};

function findImageForColor(color: string, images: string[]): string | undefined {
  if (!images || images.length === 0) return undefined;
  
  const normalizedColor = color.trim().toLowerCase();
  
  const colorKeywordsMap: Record<string, string[]> = {
    "trắng": ["trang", "white"],
    "đen": ["den", "black"],
    "xám": ["xam", "gray", "grey"],
    "đỏ": ["do", "red"],
    "navy": ["navy", "blue"],
    "be": ["be", "beige"],
    "camel": ["camel", "brown"],
    "sọc": ["soc", "stripe"],
    "hoa": ["hoa", "floral"],
    "xanh/trắng": ["xanh-trang", "blue-white"],
    "đỏ/trắng": ["do-trang", "red-white"]
  };
  
  const keywords = colorKeywordsMap[normalizedColor] || [normalizedColor];
  
  for (const keyword of keywords) {
    const matched = images.find(img => img.toLowerCase().includes(keyword));
    if (matched) return matched;
  }
  
  return undefined;
}

export function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const transitionTo = useTransitionTo();
  const { products } = useProducts();
  const { addToCart } = useCart();
  const { settings } = useStorefrontSettings();
  const product = products.find((item) => item.id === Number(id));
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>(null);
  const productImages = product?.images && product.images.length > 0 ? product.images : product ? [product.image] : [];
  const [currentImage, setCurrentImage] = useState(productImages[0] || product?.image || "");

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="mb-4 text-foreground">Không tìm thấy sản phẩm</h2>
          <Link to="/shop" className="text-primary hover:underline">
            Quay lại cửa hàng
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground pb-12 font-sans">
      <div className="mx-auto max-w-[1500px] px-4 py-4 sm:px-6 lg:px-16 xl:px-24 md:py-8">
        
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="group flex items-center gap-2 text-[11px] font-bold tracking-[0.15em] uppercase text-muted-foreground hover:text-black dark:hover:text-white transition-colors mb-2 md:mb-0 pt-2"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Quay lại
        </button>

        {/* Mobile/Tablet Title & Price */}
        <div className="lg:hidden block pt-6 pb-2">
          <span className="inline-block bg-foreground text-background px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase mb-4 rounded-sm shadow-sm">
            {product.category || "MỚI"}
          </span>
          <h1 
            className="text-2xl sm:text-3xl font-extrabold uppercase tracking-wide leading-snug mb-3 break-words"
            style={{ wordSpacing: "0.1em" }}
          >
            {product.name}
          </h1>
          <p className="text-xl sm:text-2xl font-medium">{product.price.toLocaleString("vi-VN")}₫</p>
          {!product.inStock && (
            <p className="text-red-600 font-medium text-sm mt-2">Hết hàng</p>
          )}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 md:gap-12 lg:gap-16 xl:gap-24 relative pt-4 md:pt-8">
          
          {/* Left Column */}
          <div className="md:col-span-1 lg:col-span-3 space-y-8 md:space-y-12 order-3 lg:order-1 pt-4 md:pt-8 lg:pt-0 flex flex-col justify-start lg:justify-center">
            <div className="hidden lg:block">
                <span className="inline-block bg-foreground text-background px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase mb-5 rounded-sm shadow-sm">
                  {product.category || "MỚI"}
                </span>
                <h1 
                  className="text-3xl md:text-4xl font-extrabold uppercase tracking-wide leading-snug mb-5 break-words"
                  style={{ wordSpacing: "0.1em" }}
                >
                  {product.name}
                </h1>
                <p className="text-xl md:text-2xl font-medium">{product.price.toLocaleString("vi-VN")}₫</p>
                {!product.inStock && (
                  <p className="text-red-600 font-medium text-sm mt-2">Hết hàng</p>
                )}
              </div>
              
              <div className="space-y-4 w-full lg:max-w-sm">
                <h3 className="text-xs font-bold tracking-[0.15em] uppercase border-b border-black/10 dark:border-white/10 pb-3">Mô Tả Sản Phẩm</h3>
                <p className={`text-sm text-muted-foreground leading-relaxed transition-all ${isDescExpanded ? "" : "line-clamp-4"}`}>
                  {product.description}
                </p>
                <button 
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                  className="text-[11px] font-bold underline underline-offset-4 text-foreground uppercase tracking-[0.15em] hover:text-black dark:hover:text-white transition-colors pt-2"
                >
                  {isDescExpanded ? "Thu gọn" : "Đọc thêm"}
                </button>
              </div>

              <div className="space-y-1 border-t border-black/10 dark:border-white/10 pt-6 w-full lg:max-w-sm">
                <div className="border-b border-black/10 dark:border-white/10">
                  <button 
                    onClick={() => setExpandedAccordion(expandedAccordion === "care" ? null : "care")}
                    className="w-full flex justify-between items-center py-4 cursor-pointer hover:text-black dark:hover:text-white transition-colors group"
                  >
                    <span className="text-xs font-bold uppercase tracking-[0.1em]">Chất Liệu & Bảo Quản</span>
                    <span className={`text-lg font-light transition-transform duration-300 ${expandedAccordion === "care" ? "rotate-180" : "group-hover:translate-y-1"}`}>⌄</span>
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${expandedAccordion === "care" ? "max-h-40 pb-4 opacity-100" : "max-h-0 opacity-0"}`}>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Giặt máy ở nhiệt độ tối đa 30ºC, sấy khô ở nhiệt độ thấp. Không sử dụng thuốc tẩy. Ủi ở nhiệt độ tối đa 110ºC.
                    </p>
                  </div>
                </div>

                <div className="border-b border-black/10 dark:border-white/10">
                  <button 
                    onClick={() => setExpandedAccordion(expandedAccordion === "shipping" ? null : "shipping")}
                    className="w-full flex justify-between items-center py-4 cursor-pointer hover:text-black dark:hover:text-white transition-colors group"
                  >
                    <span className="text-xs font-bold uppercase tracking-[0.1em]">Giao Hàng & Đổi Trả</span>
                    <span className={`text-lg font-light transition-transform duration-300 ${expandedAccordion === "shipping" ? "rotate-180" : "group-hover:translate-y-1"}`}>⌄</span>
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${expandedAccordion === "shipping" ? "max-h-40 pb-4 opacity-100" : "max-h-0 opacity-0"}`}>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Giao hàng miễn phí cho đơn hàng trên 1.000.000đ. Trả hàng miễn phí trong vòng 30 ngày kể từ ngày nhận hàng.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          {/* Center Column */}
          <div className="md:col-span-2 lg:col-span-6 flex flex-col items-center justify-center order-1 lg:order-2 w-full md:max-w-xl lg:max-w-none mx-auto">
            <div className="relative w-full aspect-[3/4] overflow-hidden rounded-xl bg-white">
              <ImageWithFallback 
                src={currentImage} 
                alt={product.name} 
                className="absolute inset-0 w-full h-full object-cover mix-blend-multiply hover:scale-105 transition-transform duration-700" 
              />
            </div>
            
            {productImages.length > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3 overflow-x-auto w-full max-w-md px-4 hide-scrollbar">
                {productImages.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImage(url)}
                    className={`shrink-0 w-16 h-20 rounded-lg overflow-hidden bg-white transition-all duration-300 ${
                      currentImage === url ? "ring-2 ring-black dark:ring-white ring-offset-2 ring-offset-background" : "hover:ring-2 hover:ring-black/20 dark:hover:ring-white/20 hover:ring-offset-1 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <ImageWithFallback src={url} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover mix-blend-multiply" />
                  </button>
                ))}
              </div>
            )}

            <div className="hidden lg:block text-center mt-6 md:mt-8 space-y-2 opacity-60">
              <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em]">Thiết kế tại Studio</p>
              <p className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em]">Sản xuất tại Việt Nam</p>
            </div>
          </div>

          {/* Right Column */}
          <div className="md:col-span-1 lg:col-span-3 space-y-8 lg:space-y-10 order-2 lg:order-3 pt-2 lg:pt-0 flex flex-col justify-start lg:justify-center items-start lg:items-end">
            
            <div className="w-full lg:max-w-[320px] flex flex-col items-start space-y-5 lg:space-y-6">
              
              {/* Size Selector */}
              <div className="w-full flex flex-col items-start">
                <h3 className="text-sm font-bold mb-3">Chọn Size</h3>
                <div className="flex justify-start gap-2 flex-wrap">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-[3.5rem] px-3 py-2 border text-sm font-medium transition-all rounded-sm ${
                        selectedSize === size 
                          ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" 
                          : "border-black/10 bg-transparent text-foreground hover:border-black/50 dark:border-white/10 dark:hover:border-white/50"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Selector */}
              <div className="w-full flex flex-col items-start">
                <h3 className="text-sm font-bold mb-3">Chọn Màu</h3>
                <div className="flex justify-start flex-wrap gap-2">
                  {product.colors.map((color) => {
                    const isSelected = selectedColor === color;
                    const colorStyle = COLOR_MAP[color] || { bg: "#9CA3AF", text: "#FFFFFF" };
                    return (
                      <button
                        key={color}
                        onClick={() => {
                          setSelectedColor(color);
                          const colorImage = product.colorImages?.[color] || findImageForColor(color, productImages);
                          if (colorImage) {
                            setCurrentImage(colorImage);
                          }
                        }}
                        className={`px-6 py-2 border transition-all text-sm font-medium rounded-sm ${
                          isSelected 
                            ? "border-black dark:border-white" 
                            : "border-black/10 bg-transparent text-foreground hover:border-black/50 dark:border-white/10 dark:hover:border-white/50"
                        }`}
                        style={isSelected ? { backgroundColor: colorStyle.bg, color: colorStyle.text } : {}}
                      >
                        {color}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="w-full flex flex-col items-start">
                <h3 className="text-sm font-bold mb-3">Số Lượng</h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 border border-black/10 dark:border-white/10 flex items-center justify-center bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] rounded-sm">-</button>
                  <div className="w-10 h-10 flex items-center justify-center text-sm font-medium border border-transparent">{quantity}</div>
                  <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 border border-black/10 dark:border-white/10 flex items-center justify-center bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.08] dark:hover:bg-white/[0.08] rounded-sm">+</button>
                </div>
              </div>

              {/* Actions */}
              <div className="w-full space-y-3 pt-4">
                <div className="flex w-full gap-2">
                  <button
                    onClick={() => {
                      if (!selectedSize || !selectedColor) {
                        window.alert("Vui lòng chọn size và màu sắc!");
                        return;
                      }
                      addToCart({
                        productId: product.id,
                        size: selectedSize,
                        color: selectedColor,
                        quantity,
                        priceAtAdd: product.price,
                      });
                      window.alert(`Đã thêm vào giỏ hàng!`);
                    }}
                    className="flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-sm bg-[#1a1a1a] px-3 py-2 text-[11px] font-bold uppercase text-white transition-colors hover:bg-black sm:px-4 sm:text-[12px] lg:text-[13px]"
                  >
                    <ShoppingCart className="h-4 w-4 shrink-0" />
                    <span className="text-center leading-tight whitespace-normal">THÊM VÀO GIỎ</span>
                  </button>
                  <button className="h-12 w-12 shrink-0 rounded-sm border border-black/10 dark:border-white/10 transition-colors hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-center">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => {
                    if (!selectedSize || !selectedColor) {
                      window.alert("Vui lòng chọn size và màu sắc!");
                      return;
                    }
                    addToCart({
                      productId: product.id,
                      size: selectedSize,
                      color: selectedColor,
                      quantity,
                      priceAtAdd: product.price,
                    });
                    transitionTo("/checkout");
                  }}
                  className="w-full h-12 bg-black dark:bg-white text-white dark:text-black text-[13px] font-bold uppercase hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors rounded-sm border border-black dark:border-white"
                >
                  MUA NGAY
                </button>
              </div>
            </div>
            
          </div>
        </div>

        {/* Mobile Studio Text */}
        <div className="lg:hidden text-center mt-8 space-y-2 opacity-60">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em]">Thiết kế tại Studio</p>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em]">Sản xuất tại Việt Nam</p>
        </div>

      </div>
    </div>
  );
}
