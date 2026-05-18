import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { Search, ShoppingCart, User, Share2, ArrowLeft } from "lucide-react";

import { ImageWithFallback } from "@/components/common/image-with-fallback";
import { useTransitionTo } from "@/components/common/page-transition";
import { useCart } from "@/features/cart/context/cart-context";
import { useProducts } from "@/features/products/context/product-context";
import { useStorefrontSettings } from "@/features/settings/context/storefront-settings-context";
import { useLanguage } from "@/features/settings/context/language-context";

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
  const { formatPrice, t, translate } = useLanguage();
  const product = products.find((item) => item.id === Number(id));
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>(null);
  const productImages = product?.images && product.images.length > 0 ? product.images : product ? [product.image] : [];
  const [currentImage, setCurrentImage] = useState(productImages[0] || product?.image || "");

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="mb-4 text-foreground">{t("Không tìm thấy sản phẩm", "Product not found")}</h2>
          <Link to="/shop" className="text-primary hover:underline">
            {t("Quay lại cửa hàng", "Back to shop")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground pb-20 font-sans">
      <div className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 lg:px-12 xl:px-16 md:py-8">
        
        {/* Main Grid: 3 Columns on Desktop (Left: Info, Center: Image, Right: Actions/Sizing) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 xl:gap-16 pt-4">
          
          {/* 1. Left Column (Info & Description) - span 3 */}
          <div className="lg:col-span-3 flex flex-col justify-start items-start w-full order-2 lg:order-1 pt-6 lg:pt-0">
            {/* Back Button */}
            <button 
              onClick={() => navigate(-1)}
              className="group flex items-center gap-1.5 text-[10px] font-bold tracking-[0.2em] uppercase text-neutral-400 hover:text-black dark:hover:text-white transition-colors mb-6 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" /> {t("Quay lại", "Back")}
            </button>
            
            {/* Category tag */}
            <span className="inline-block bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-3 py-1 text-[9px] font-bold tracking-[0.25em] uppercase rounded-full mb-4">
              {translate(product.category) || t("MỚI", "NEW")}
            </span>

            {/* Product Title */}
            <h1 className="text-2xl lg:text-3xl font-extrabold uppercase tracking-wide leading-tight mb-4 font-sans text-foreground break-words">
              {translate(product.name)}
            </h1>

            {/* Bulleted list features */}
            <ul className="text-[10px] sm:text-[11px] space-y-2 mt-4 uppercase tracking-widest text-neutral-500 dark:text-neutral-400 list-inside list-disc font-semibold">
              {translate(product.description).split('. ').map((item, idx) => {
                if (!item.trim()) return null;
                return <li key={idx} className="marker:text-neutral-300 dark:marker:text-neutral-700">{item.trim().replace(/\.$/, '')}</li>;
              })}
            </ul>

            {/* Spacing bullet text decoration */}
            <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-400 mt-8 space-y-1">
              <p>PANELS.</p>
              <p>SEAMS.</p>
              <p>COMFORT.</p>
              <p>AND STYLE.</p>
            </div>
          </div>

          {/* 2. Center Column (Giữ nguyên phần hình ảnh) - span 6 */}
          <div className="lg:col-span-6 flex flex-col items-center w-full order-1 lg:order-2">
            <div className="relative w-full aspect-[3/4] overflow-hidden bg-transparent">
              <ImageWithFallback 
                src={currentImage} 
                alt={translate(product.name)} 
                className="absolute inset-0 w-full h-full object-contain hover:scale-105 transition-transform duration-700" 
              />
            </div>
            
            {productImages.length > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3 overflow-x-auto w-full max-w-md px-4 hide-scrollbar">
                {productImages.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImage(url)}
                    className={`shrink-0 w-16 h-20 overflow-hidden bg-transparent transition-all duration-300 ${
                      currentImage === url 
                        ? "border border-black dark:border-white opacity-100" 
                        : "opacity-40 hover:opacity-100"
                    }`}
                  >
                    <ImageWithFallback src={url} alt={`${translate(product.name)} ${idx + 1}`} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}

            <div className="hidden lg:block text-center mt-8 space-y-1.5 opacity-40 text-[9px] font-bold uppercase tracking-[0.25em]">
              <p>{t("Thiết kế tại Studio", "Designed in Studio")}</p>
              <p>{t("Sản xuất tại Việt Nam", "Made in Vietnam")}</p>
            </div>
          </div>

          {/* 3. Right Column (Actions, Price & Accordions) - span 3 */}
          <div className="lg:col-span-3 flex flex-col justify-start items-start w-full space-y-6 lg:space-y-8 order-3 lg:order-3 pt-6 lg:pt-0">
            
            {/* Price */}
            <div className="w-full">
              <div className="text-2xl lg:text-3xl font-black tracking-wide text-foreground">
                {formatPrice(product.price)}
              </div>
              {!product.inStock && (
                <span className="inline-block bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 px-3 py-1 text-[10px] font-bold tracking-wider uppercase rounded-full mt-3">{t("Hết hàng", "Out of stock")}</span>
              )}
            </div>

            {/* Selectors Stack */}
            <div className="w-full space-y-6">
              
              {/* Color Selector */}
              <div className="w-full">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-3">{t("Màu Sắc", "Colors")}</h3>
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
                        className={`px-4 py-2 border rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                          isSelected 
                            ? "border-black dark:border-white border-[1.5px] shadow-sm" 
                            : "border-black/10 dark:border-white/10 bg-transparent text-foreground hover:border-black/30 dark:hover:border-white/30"
                        }`}
                        style={isSelected ? { backgroundColor: colorStyle.bg, color: colorStyle.text } : {}}
                      >
                        {translate(color)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Size Selector */}
              <div className="w-full">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-3">{t("Kích Cỡ (Size)", "Sizes")}</h3>
                <div className="flex justify-start gap-2 flex-wrap">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`px-4 py-2 border rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                        selectedSize === size 
                          ? "border-black dark:border-white border-[1.5px] bg-neutral-50 dark:bg-neutral-900 text-foreground font-extrabold shadow-sm" 
                          : "border-black/10 dark:border-white/10 bg-transparent text-neutral-500 dark:text-neutral-400 hover:border-black/30 dark:hover:border-white/30"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="w-full">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-3">{t("Số Lượng", "Quantity")}</h3>
                <div className="inline-flex items-center gap-1 bg-neutral-50 dark:bg-neutral-900 rounded-full p-1 border border-black/5 dark:border-white/5">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-neutral-800 shadow-sm border border-black/5 dark:border-white/5 text-sm font-semibold transition-colors hover:bg-neutral-50 cursor-pointer"
                  >
                    -
                  </button>
                  <div className="w-10 text-center text-xs font-bold tracking-wide text-foreground">{quantity}</div>
                  <button 
                    onClick={() => setQuantity(quantity + 1)} 
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-neutral-800 shadow-sm border border-black/5 dark:border-white/5 text-sm stroke-2 font-semibold transition-colors hover:bg-neutral-50 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Main Actions Stack */}
              <div className="w-full pt-4">
                <button
                  onClick={() => {
                    if (!selectedSize || !selectedColor) {
                      window.alert(t("Vui lòng chọn size và màu sắc!", "Please select size and color!"));
                      return;
                    }
                    addToCart({
                      productId: product.id,
                      size: selectedSize,
                      color: selectedColor,
                      quantity,
                      priceAtAdd: product.price,
                    });
                    window.alert(t("Đã thêm vào giỏ hàng!", "Added to cart successfully!"));
                  }}
                  className="w-full py-4 rounded-[14px] bg-black dark:bg-white text-white dark:text-black text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2.5 shadow-md transition-all duration-300 hover:bg-neutral-900 dark:hover:bg-neutral-100 active:scale-[0.98] cursor-pointer"
                >
                  <ShoppingCart className="h-4 w-4 shrink-0" />
                  <span>{t("THÊM VÀO GIỎ HÀNG", "ADD TO CART")}</span>
                </button>
              </div>

            </div>

            {/* Accordions Stack */}
            <div className="w-full pt-4 space-y-3">
              
              {/* Size Guide Accordion */}
              <div className="w-full">
                <button 
                  onClick={() => setExpandedAccordion(expandedAccordion === "sizeguide" ? null : "sizeguide")}
                  className="w-full flex justify-between items-center py-2 cursor-pointer hover:text-black dark:hover:text-white transition-colors group text-left"
                >
                  <span className="text-xs font-bold uppercase tracking-[0.15em]">{t("Hướng Dẫn Chọn Size →", "Size Guide →")}</span>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${expandedAccordion === "sizeguide" ? "max-h-[500px] pb-4 opacity-100" : "max-h-0 opacity-0"}`}>
                  <div className="text-xs text-muted-foreground space-y-4 pt-2">
                    <p className="font-bold uppercase tracking-wider text-[10px] text-neutral-400">{t("THÔNG TIN SỐ ĐO MẪU:", "MODEL MEASUREMENTS:")}</p>
                    <ul className="list-disc list-inside space-y-1 uppercase tracking-wider text-[9px] font-semibold text-neutral-500">
                      <li>{t("Mẫu nam cao 1m85 mặc size LARGE (L)", "Male model is 1m85 wearing size LARGE (L)")}</li>
                      <li>{t("Mẫu nữ cao 1m73 mặc size SMALL (S)", "Female model is 1m73 wearing size SMALL (S)")}</li>
                    </ul>
                    <div className="grid grid-cols-2 gap-4 pt-2 items-center">
                      <div className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden text-center text-[9px]">
                        <div className="grid grid-cols-3 bg-neutral-50 dark:bg-neutral-900/50 font-bold border-b border-black/10 dark:border-white/10 py-1.5 uppercase tracking-wide">
                          <div>Size</div>
                          <div>Waist (A)</div>
                          <div>Outseam (B)</div>
                        </div>
                        {[
                          { s: "XS", a: "26-28", b: "39" },
                          { s: "S", a: "29-30", b: "40" },
                          { s: "M", a: "31-32", b: "42" },
                          { s: "L", a: "33-34", b: "44" },
                          { s: "XL", a: "35-36", b: "46" },
                          { s: "2XL", a: "37-38", b: "47" }
                        ].map((row, i) => (
                          <div key={i} className={`grid grid-cols-3 py-1.5 border-b border-black/10 dark:border-white/10 font-medium ${i % 2 === 1 ? "bg-neutral-50/50 dark:bg-neutral-900/20" : ""}`}>
                            <div className="font-bold">{row.s}</div>
                            <div>{row.a}</div>
                            <div>{row.b}</div>
                          </div>
                        ))}
                        <div className="py-1 text-[8px] opacity-50 italic border-t border-black/10 dark:border-white/10">{"ĐƠN VỊ: INCHES (1 INCH = 2.54 CM)"}</div>
                      </div>

                      <div className="flex justify-center">
                        <svg viewBox="0 0 100 120" className="w-20 h-auto stroke-current text-foreground opacity-85" fill="none" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M25,20 L75,20 L80,105 L62,105 L50,55 L38,105 L20,105 Z" fill="none" />
                          <path d="M28,32 C33,35 40,32 40,32" />
                          <path d="M72,32 C67,35 60,32 60,32" />
                          <path d="M50,20 L50,42 C50,45 46,47 46,47" strokeDasharray="2,2" />
                          
                          <line x1="25" y1="12" x2="75" y2="12" stroke="#aa1e22" strokeWidth="1" />
                          <path d="M28,9 L25,12 L28,15 M72,9 L75,12 L72,15" stroke="#aa1e22" strokeWidth="1" />
                          <text x="50" y="8" textAnchor="middle" fill="#aa1e22" fontSize="8" fontWeight="bold">A</text>

                          <line x1="84" y1="20" x2="84" y2="105" stroke="#aa1e22" strokeWidth="1" />
                          <path d="M81,23 L84,20 L87,23 M81,102 L84,105 L87,102" stroke="#aa1e22" strokeWidth="1" />
                          <text x="91" y="65" textAnchor="middle" fill="#aa1e22" fontSize="8" fontWeight="bold">B</text>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Care Instructions Accordion */}
              <div className="w-full">
                <button 
                  onClick={() => setExpandedAccordion(expandedAccordion === "care" ? null : "care")}
                  className="w-full flex justify-between items-center py-2 cursor-pointer hover:text-black dark:hover:text-white transition-colors group text-left"
                >
                  <span className="text-xs font-bold uppercase tracking-[0.15em]">{t("Chất Liệu & Bảo Quản →", "Material & Care →")}</span>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${expandedAccordion === "care" ? "max-h-40 pb-4 opacity-100" : "max-h-0 opacity-0"}`}>
                  <p className="text-[11px] text-muted-foreground leading-relaxed uppercase tracking-wider pt-2">
                    {t("Giặt máy ở nhiệt độ tối đa 30ºC, sấy khô ở nhiệt độ thấp. Không sử dụng thuốc tẩy. Ủi ở nhiệt độ tối đa 110ºC.", "Machine wash max 30ºC, low tumble dry. Do not bleach. Iron max 110ºC.")}
                  </p>
                </div>
              </div>

              {/* Shipping Accordion */}
              <div className="w-full">
                <button 
                  onClick={() => setExpandedAccordion(expandedAccordion === "shipping" ? null : "shipping")}
                  className="w-full flex justify-between items-center py-2 cursor-pointer hover:text-black dark:hover:text-white transition-colors group text-left"
                >
                  <span className="text-xs font-bold uppercase tracking-[0.15em]">{t("Giao Hàng & Đổi Trả →", "Shipping & Returns →")}</span>
                </button>
                <div className={`overflow-hidden transition-all duration-300 ${expandedAccordion === "shipping" ? "max-h-40 pb-4 opacity-100" : "max-h-0 opacity-0"}`}>
                  <p className="text-[11px] text-muted-foreground leading-relaxed uppercase tracking-wider pt-2">
                    {t("Giao hàng miễn phí cho đơn hàng trên 1.000.000đ. Trả hàng miễn phí trong vòng 30 ngày kể từ ngày nhận hàng.", "Free standard shipping on orders over 1.000.000₫. Free returns within 30 days.")}
                  </p>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Mobile Studio Text */}
        <div className="lg:hidden text-center mt-12 space-y-1.5 opacity-40 text-[9px] font-bold uppercase tracking-[0.25em]">
          <p>{t("Thiết kế tại Studio", "Designed in Studio")}</p>
          <p>{t("Sản xuất tại Việt Nam", "Made in Vietnam")}</p>
        </div>

      </div>
    </div>
  );
}
