import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router";

import { ImageWithFallback } from "@/components/common/image-with-fallback";
import { ProductCard } from "@/components/shared/product-card";
import { useProducts } from "@/features/products/context/product-context";
import { useStorefrontSettings } from "@/features/settings/context/storefront-settings-context";

export function HomePage() {
  const { products } = useProducts();
  const { settings } = useStorefrontSettings();

  const words1 = ["Coming", "Soon"];
  const words2 = ["10/05/2026"];
  const totalWords = words1.length + words2.length;
  const loopDurationMs = totalWords * 1500 + 2000;
  const [drawKey, setDrawKey] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setDrawKey((k) => k + 1);
    }, loopDurationMs);
    return () => window.clearInterval(timer);
  }, [loopDurationMs]);

  const [timeLeft, setTimeLeft] = useState({
    days: 69,
    hours: 3,
    minutes: 18,
    seconds: 32,
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTimeLeft((previousTime) => {
        if (previousTime.seconds > 0) return { ...previousTime, seconds: previousTime.seconds - 1 };
        if (previousTime.minutes > 0) return { ...previousTime, minutes: previousTime.minutes - 1, seconds: 59 };
        if (previousTime.hours > 0) return { ...previousTime, hours: previousTime.hours - 1, minutes: 59, seconds: 59 };
        if (previousTime.days > 0) return { ...previousTime, days: previousTime.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return previousTime;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const bestSellers = settings.bestSellerProductIds
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is NonNullable<typeof product> => Boolean(product));
  const resolvedBestSellers = bestSellers.length > 0 ? bestSellers : products.slice(0, 4);
  const bestSellersWithImages = resolvedBestSellers.map((product) => ({
    ...product,
    image: settings.bestSellerImageOverrides[product.id] ?? product.image,
  }));
  const newArrivals = products.slice(4, 8);
  const [activeStyleTab, setActiveStyleTab] = useState("Váy");
  const styleProducts = useMemo(() => {
    const filtered = products.filter(p => p.category?.toLowerCase() === activeStyleTab.toLowerCase());
    const remaining = 4 - filtered.length;
    if (remaining > 0) {
      const otherProducts = products.filter(p => p.category?.toLowerCase() !== activeStyleTab.toLowerCase());
      return [...filtered, ...otherProducts.slice(0, remaining)];
    }
    return filtered.slice(0, 4);
  }, [products, activeStyleTab]);
  const heroImages = useMemo(() => {
    const main = settings.heroImage.trim();
    const extras = (settings.heroImages ?? []).map((value) => value.trim()).filter(Boolean);
    return [main, ...extras].filter(Boolean);
  }, [settings.heroImage, settings.heroImages]);
  const popularCategoryImages = useMemo(
    () => (settings.popularCategoryImages ?? []).map((value) => value.trim()).filter(Boolean),
    [settings.popularCategoryImages],
  );
  const [heroIndex, setHeroIndex] = useState(0);
  const overlayLeft = Math.min(100, Math.max(0, settings.heroOverlayOpacityLeft ?? 60)) / 100;
  const overlayMid = Math.min(100, Math.max(0, settings.heroOverlayOpacityMiddle ?? 40)) / 100;
  const overlayRight = Math.min(100, Math.max(0, settings.heroOverlayOpacityRight ?? 60)) / 100;
  const heroFontClass = "font-mono";
  const heroJustifyClass = "justify-start";
  const heroTextAlignClass = "text-left";
  const goToPrevHero = () => {
    if (heroImages.length <= 1) return;
    setHeroIndex((current) => (current - 1 + heroImages.length) % heroImages.length);
  };
  const goToNextHero = () => {
    if (heroImages.length <= 1) return;
    setHeroIndex((current) => (current + 1) % heroImages.length);
  };

  useEffect(() => {
    setHeroIndex(0);
  }, [heroImages.length]);

  useEffect(() => {
    const intervalMs = Math.max(2000, Math.min(60000, Number(settings.heroSlideIntervalMs ?? 6000)));
    if (heroImages.length <= 1) return;
    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % heroImages.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [heroImages.length, settings.heroSlideIntervalMs]);

  return (
    <div>
      <section className="relative h-[calc(90vh-40px)] overflow-hidden bg-gradient-to-r from-secondary/30 to-muted">
        <div className="absolute inset-0">
          {heroImages.map((mediaUrl, index) => {
            const isActive = index === Math.min(heroIndex, heroImages.length - 1);
            const isVideo = mediaUrl.match(/\.(mp4|webm|ogg)$/i);
            const mediaClass = `absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-in-out ${isActive ? "scale-100 opacity-100" : "scale-105 opacity-0"}`;
            
            if (isVideo) {
              return (
                <video
                  key={`${mediaUrl}-${index}`}
                  src={mediaUrl}
                  className={mediaClass}
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              );
            }

            return (
              <ImageWithFallback
                key={`${mediaUrl}-${index}`}
                src={mediaUrl}
                alt={`Street Fashion ${index + 1}`}
                className={mediaClass}
              />
            );
          })}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to right, rgba(0,0,0,${overlayLeft}), rgba(0,0,0,${overlayMid}), rgba(0,0,0,${overlayRight}))`,
            }}
          />
          {heroImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={goToPrevHero}
                className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 p-3 text-white transition-bounce hover:bg-black/60 hover:scale-110 active:scale-125 active:bg-black/60"
                title="Ảnh trước"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={goToNextHero}
                className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/40 p-3 text-white transition-bounce hover:bg-black/60 hover:scale-110 active:scale-125 active:bg-black/60"
                title="Ảnh tiếp theo"
              >
                <ArrowRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className={`flex ${heroJustifyClass}`}>
                <div className={`w-full max-w-xl space-y-4 sm:space-y-6 md:space-y-8 text-white ${heroTextAlignClass} ${heroFontClass}`}>
                  <p className="animate-fadeIn text-sm sm:text-base uppercase tracking-widest opacity-90 md:text-lg font-mono">BỘ SƯU TẬP MỚI 2026</p>
                  <div className="animate-fadeInUp stagger-1 w-full flex justify-start py-2">
                    <svg key={drawKey} className="w-full overflow-visible" style={{ height: "3em", fontSize: "clamp(2.5rem, 10vw, 10rem)" }}>
                      <text
                        x="0"
                        y="0.8em"
                        dominantBaseline="middle"
                        textAnchor="start"
                        className="font-normal capitalize tracking-normal"
                        style={{ fontFamily: "'Great Vibes', cursive" }}
                      >
                        {words1.map((word, i) => (
                          <tspan key={i} className="text-draw-effect" style={{ animationDelay: `${i * 1.5}s` }}>
                            {word}{" "}
                          </tspan>
                        ))}
                      </text>
                      <text
                        x="0"
                        y="2.2em"
                        dominantBaseline="middle"
                        textAnchor="start"
                        className="font-normal capitalize tracking-normal"
                        style={{ fontFamily: "'Great Vibes', cursive" }}
                      >
                        {words2.map((word, i) => (
                          <tspan key={i} className="text-draw-effect" style={{ animationDelay: `${(words1.length + i) * 1.5}s` }}>
                            {word}{" "}
                          </tspan>
                        ))}
                      </text>
                    </svg>
                  </div>
                  <p className="animate-fadeInUp stagger-2 text-base sm:text-lg opacity-90 md:text-xl font-mono leading-relaxed max-w-2xl">
                    Khám phá phong cách street wear độc đáo.<br />
                    Thể hiện cá tính với xu hướng thời trang urban hiện đại.
                  </p>
                </div>
              </div>
            </div>
          </div>
          {heroImages.length > 1 && (
            <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 gap-2">
              {heroImages.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setHeroIndex(index)}
                  className={`h-2.5 w-8 rounded-full transition-colors ${index === heroIndex ? "bg-white" : "bg-white/40 hover:bg-white/70"
                    }`}
                  title={`Chuyển ảnh ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <div className="marquee-container flex items-center overflow-hidden bg-primary py-4 sm:py-6">
        <div className="flex shrink-0 animate-marquee items-center whitespace-nowrap">
          {Array.from({ length: 8 }).map((_, index) => (
            <img key={index} src="/assets/marquee/linebe.png" alt="MADMAD - Make Your Mark" className="mx-4 sm:mx-10 md:mx-14 h-10 sm:h-14 md:h-16 shrink-0 object-contain" />
          ))}
        </div>
        <div className="flex shrink-0 animate-marquee items-center whitespace-nowrap" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, index) => (
            <img key={index + 8} src="/assets/marquee/linebe.png" alt="MADMAD - Make Your Mark" className="mx-4 sm:mx-10 md:mx-14 h-10 sm:h-14 md:h-16 shrink-0 object-contain" />
          ))}
        </div>
      </div>

      <section className="py-16">
        <div className="px-8 sm:px-12 lg:px-16">
          <div className="mb-8 flex items-center justify-between animate-fadeIn">
            <h2 className="font-sans text-3xl font-bold tracking-tight text-black">Nổi Bật</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
            {bestSellersWithImages.map((product, index) => (
              <div key={product.id} className={`animate-fadeInUp stagger-${Math.min(index + 1, 6)}`}>
                <ProductCard product={product} variant="home" />
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link to="/shop" className="inline-flex items-center gap-2 text-primary transition-all hover:gap-4">
              Xem Tất Cả Sản Phẩm
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>



      <section className="flex min-h-[30vh] sm:min-h-[40vh] md:min-h-[50vh] items-center justify-center bg-card py-10">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <img src="/assets/marquee/slogan.png" alt="Slogan MADMAD" className="mx-auto w-full max-w-4xl animate-fadeIn object-contain" />
        </div>
      </section>

      <section className="bg-primary py-4">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="text-white text-center md:text-left">
              <h3 className="mb-1 text-lg sm:text-xl">Khuyến Mãi Có Hạn</h3>
              <p className="text-xs sm:text-sm opacity-90">Ưu đãi đặc biệt tháng này</p>
            </div>

            <div className="flex gap-4 text-white">
              {[
                { label: "NGÀY", value: timeLeft.days },
                { label: "GIỜ", value: timeLeft.hours },
                { label: "PHÚT", value: timeLeft.minutes },
                { label: "GIÂY", value: timeLeft.seconds, pulse: true },
              ].map((item, index) => (
                <div key={item.label} className="contents">
                  {index > 0 && <div className="mt-2 self-start text-3xl">:</div>}
                  <div className={`animate-fadeIn text-center stagger-${Math.min(index + 1, 6)}`}>
                    <div className={`rounded-lg bg-white/20 px-3 py-1 sm:px-4 sm:py-2 text-xl sm:text-3xl backdrop-blur-sm ${item.pulse ? "animate-pulse-slow" : ""}`}>
                      {item.value.toString().padStart(2, "0")}
                    </div>
                    <div className="mt-1 text-[10px] sm:text-xs opacity-75">{item.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <button className="animate-fadeIn stagger-5 rounded bg-white px-6 py-2 text-primary transition-all hover:scale-105 hover:bg-white/90">
              MUA NGAY
            </button>
          </div>
        </div>
      </section>

      {popularCategoryImages.length > 0 ? (
        <section className="bg-background pt-8 sm:pt-12 lg:pt-16">
          {popularCategoryImages.map((imageUrl, index) => (
            <div
              key={`${imageUrl}-${index}`}
              className={`w-full animate-fadeIn ${index > 0 ? "mt-4 sm:mt-6" : ""}`}
            >
              <ImageWithFallback
                src={imageUrl}
                alt={`Ảnh nổi bật ${index + 1}`}
                className="h-auto w-full object-contain"
              />
            </div>
          ))}
        </section>
      ) : null}

      <section className="bg-background py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex flex-col items-center sm:flex-row sm:justify-between gap-6">
            <div className="text-center sm:text-left">
              <h2 className="text-3xl sm:text-4xl font-bold mb-2">Tạo Nên Phong Cách Riêng</h2>
              <p className="text-muted-foreground text-sm sm:text-base">Những thiết kế mới nhất để bạn tự do phối đồ</p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 p-1.5 bg-background rounded-full border shadow-sm">
              {["Váy", "Áo Thun", "Áo Khoác"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveStyleTab(tab)}
                  className={`px-5 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
                    activeStyleTab === tab 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {styleProducts.map((product) => (
              <div key={product.id} className="animate-fadeInUp">
                <ProductCard product={product} variant="home" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div className="space-y-6">
              <h2 className="text-4xl">
                THỜI TRANG
                <br />
                BẢO VỆ HÀNH TINH
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground">
                Thời trang bền vững từ chất liệu thân thiện với môi trường. Mặc đẹp đồng thời bảo vệ hành tinh xanh.
              </p>
              <button className="rounded bg-foreground px-6 py-2 sm:px-8 sm:py-3 text-background transition-bounce hover:bg-foreground/90 hover:scale-105 active:scale-110 active:bg-foreground/90">
                KHÁM PHÁ THÊM
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1761581444836-a01b1341cca3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxtaW5pbWFsaXN0JTIwZmFzaGlvbiUyMHN1c3RhaW5hYmxlfGVufDF8fHx8MTc3Njc5NDY1N3ww&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Thời trang bền vững 1"
                  className="aspect-[3/4] w-full rounded-lg object-cover"
                />
              </div>
              <div className="space-y-4 pt-8">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1578747522731-9e5a179b02f7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw0fHxtaW5pbWFsaXN0JTIwZmFzaGlvbiUyMHN1c3RhaW5hYmxlfGVufDF8fHx8MTc3Njc5NDY1N3ww&ixlib=rb-4.1.0&q=80&w=1080"
                  alt="Thời trang bền vững 2"
                  className="aspect-[3/4] w-full rounded-lg object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
