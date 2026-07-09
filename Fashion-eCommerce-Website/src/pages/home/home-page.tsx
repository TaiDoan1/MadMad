import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { ImageWithFallback } from "@/components/common/image-with-fallback";
import { ScrollReveal } from "@/components/common/scroll-reveal";
import { ProductCard, ProductCardSkeleton } from "@/components/shared/product-card";
import { useProducts } from "@/features/products/context/product-context";
import { useStorefrontSettings } from "@/features/settings/context/storefront-settings-context";
import { useLanguage } from "@/features/settings/context/language-context";

// ─── Countdown Timer ───────────────────────────────────────────────────────────
function useCountdown(targetMs: number) {
  const [timeLeft, setTimeLeft] = useState(() => {
    const diff = Math.max(0, targetMs - Date.now());
    return {
      days: Math.floor(diff / 86_400_000),
      hours: Math.floor((diff % 86_400_000) / 3_600_000),
      minutes: Math.floor((diff % 3_600_000) / 60_000),
      seconds: Math.floor((diff % 60_000) / 1_000),
    };
  });

  useEffect(() => {
    const timer = window.setInterval(() => {
      const diff = Math.max(0, targetMs - Date.now());
      setTimeLeft({
        days: Math.floor(diff / 86_400_000),
        hours: Math.floor((diff % 86_400_000) / 3_600_000),
        minutes: Math.floor((diff % 3_600_000) / 60_000),
        seconds: Math.floor((diff % 60_000) / 1_000),
      });
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [targetMs]);

  return timeLeft;
}

// ─── HomePage ──────────────────────────────────────────────────────────────────
export function HomePage() {
  const { products, isLoading } = useProducts();
  const { settings, isSettingsLoaded } = useStorefrontSettings();
  const { t } = useLanguage();

  // ── Hero slideshow ─────────────────────────────────────────────────────────
  const heroImages = useMemo(() => {
    const fallback = "/assets/categories/banner.png";
    const main = settings.heroImage?.trim() || fallback;
    const extras = (settings.heroImages ?? []).map((v) => v.trim()).filter(Boolean);
    return [main, ...extras.filter((v) => v !== main)].filter(Boolean);
  }, [settings.heroImage, settings.heroImages]);

  const [heroIndex, setHeroIndex] = useState(0);
  const heroScale    = Math.min(200, Math.max(60,  settings.heroImageScalePercent    ?? 100)) / 100;
  const overlayLeft  = Math.min(100, Math.max(0,   settings.heroOverlayOpacityLeft   ?? 55))  / 100;
  const overlayMid   = Math.min(100, Math.max(0,   settings.heroOverlayOpacityMiddle ?? 30))  / 100;
  const overlayRight = Math.min(100, Math.max(0,   settings.heroOverlayOpacityRight  ?? 55))  / 100;
  const activeHeroMediaUrl = heroImages[Math.min(heroIndex, heroImages.length - 1)];
  const activeHeroIsVideo  = activeHeroMediaUrl ? /\.(mp4|webm|ogg)$/i.test(activeHeroMediaUrl) : false;

  useEffect(() => { setHeroIndex(0); }, [heroImages.length]);

  useEffect(() => {
    const ms = Math.max(2_000, Math.min(60_000, Number(settings.heroSlideIntervalMs ?? 6_000)));
    if (heroImages.length <= 1) return;
    const t = window.setInterval(() => setHeroIndex((i) => (i + 1) % heroImages.length), ms);
    return () => window.clearInterval(t);
  }, [heroImages.length, settings.heroSlideIntervalMs]);

  // ── Products ───────────────────────────────────────────────────────────────
  const bestSellers = settings.bestSellerProductIds
    .map((id) => products.find((p) => String(p.id) === String(id)))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const resolvedBestSellers = bestSellers.length > 0 ? bestSellers : products.slice(0, 6);

  const featuredProducts = resolvedBestSellers.slice(0, 6).map((product) => ({
    ...product,
    image: settings.bestSellerImageOverrides[String(product.id) as any] ?? product.image,
  }));

  // ── Popular category images ────────────────────────────────────────────────
  const popularCategoryImages = useMemo(
    () => (settings.popularCategoryImages ?? []).map((v) => v.trim()).filter(Boolean),
    [settings.popularCategoryImages],
  );

  // ── Top banner images (ngay dưới Marquee) ──────────────────────────────────
  const topBannerImages = useMemo(
    () => (settings.topBannerImages ?? []).map((v) => v.trim()).filter(Boolean),
    [settings.topBannerImages],
  );

  // ── Countdown ─────────────────────────────────────────────────────────────
  const dropDate = useMemo(() => new Date("2026-07-01T00:00:00").getTime(), []);
  const timeLeft = useCountdown(dropDate);

  // ── Editorial feed photos ──────────────────────────────────────────────────
  const editorialPhotos = [
    "/assets/categories/anh-pho-bien.jpg",
    "/assets/products/ao-thun-m-den.jpg",
    "/assets/products/sp2-den.jpg",
    "/assets/products/sp3-navy.jpg",
    "/assets/products/ao-thun-m-xam.jpg",
  ];

  const activeInstagramImages = useMemo(() => {
    const custom = settings.instagramImages ?? [];
    const filtered = custom.map((v) => v.trim()).filter(Boolean);
    return filtered.length > 0 ? filtered : editorialPhotos;
  }, [settings.instagramImages, editorialPhotos]);

  return (
    <div>
      {/* ═══ HERO ════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-[50vh] sm:h-[100svh] overflow-hidden bg-black">
        {/* Sizer (chỉ mobile): render ảnh/video đang active ở normal flow (w-full h-auto) để
            chiều cao section khớp đúng tỉ lệ gốc của ảnh — không crop, không còn vệt đen letterbox.
            Desktop giữ nguyên h-[100svh] full-bleed nên không cần sizer (sm:hidden). */}
        {isSettingsLoaded && activeHeroMediaUrl && (
          activeHeroIsVideo ? (
            <video
              key={`sizer-${activeHeroMediaUrl}`}
              src={activeHeroMediaUrl}
              muted
              playsInline
              aria-hidden="true"
              className="block w-full h-auto opacity-0 pointer-events-none sm:hidden"
            />
          ) : (
            <img
              key={`sizer-${activeHeroMediaUrl}`}
              src={activeHeroMediaUrl}
              alt=""
              aria-hidden="true"
              className="block w-full h-auto opacity-0 pointer-events-none sm:hidden"
            />
          )
        )}

        {/* Slides */}
        <div className="absolute inset-0">
          {!isSettingsLoaded && (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-neutral-800 to-black" />
          )}
          {isSettingsLoaded && heroImages.map((mediaUrl, index) => {
            const isActive = index === Math.min(heroIndex, heroImages.length - 1);
            const isVideo  = /\.(mp4|webm|ogg)$/i.test(mediaUrl);
            // Mobile: object-contain để không cắt mất ảnh (banner thường được thiết kế theo tỉ lệ desktop).
            // Desktop (sm+): giữ object-cover full-bleed như cũ.
            const cls      = `absolute inset-0 h-full w-full object-contain sm:object-cover transition-all duration-700 ease-in-out ${isActive ? "opacity-100" : "opacity-0"}`;
            const scale    = isActive ? heroScale : heroScale + 0.05;

            return isVideo ? (
              <video
                key={`${mediaUrl}-${index}`}
                src={mediaUrl}
                className={cls}
                style={{ transform: `scale(${scale})` }}
                autoPlay muted loop playsInline
              />
            ) : (
              <ImageWithFallback
                key={`${mediaUrl}-${index}`}
                src={mediaUrl}
                alt={`MADMAD ${index + 1}`}
                className={cls}
                style={{ transform: `scale(${scale})` }}
              />
            );
          })}

          {/* Diagonal colour overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to right, rgba(0,0,0,${overlayLeft}), rgba(0,0,0,${overlayMid}), rgba(0,0,0,${overlayRight}))`,
            }}
          />
          {/* Bottom fade — frames the text */}
          <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black/80 to-transparent" />
        </div>

        {/* Hero text — Protect.LDN style: condensed bold ALL CAPS, bottom-center */}
        <div className="absolute inset-x-0 bottom-20 z-10 flex flex-col items-center gap-4 px-4 text-center">
          <h1
            className="font-black uppercase text-white animate-fadeInUp"
            style={{
              fontSize: "clamp(2.2rem, 7vw, 5.5rem)",
              letterSpacing: "0.12em",
              lineHeight: 1.0,
              textShadow: "0 2px 30px rgba(0,0,0,0.6)",
            }}
          >
            NEW DROP OUT NOW
          </h1>
          <Link
            to="/shop"
            className="text-xs uppercase tracking-[0.3em] text-white/70 transition-colors duration-300 hover:text-white"
          >
            shop now
          </Link>
        </div>

        {/* Slide dots */}
        {heroImages.length > 1 && (
          <div className="absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 gap-2">
            {heroImages.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setHeroIndex(index)}
                className={`h-[3px] rounded-full transition-all duration-500 ${
                  index === heroIndex ? "bg-white w-8" : "bg-white/40 hover:bg-white/70 w-3"
                }`}
                title={`Slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* ═══ MARQUEE ════════════════════════════════════════════════════════ */}
      <div className="marquee-container flex items-center overflow-hidden bg-white border-y border-gray-100 py-4 sm:py-5">
        {[0, 1].map((set) => (
          <div key={set} className="flex shrink-0 animate-marquee items-center whitespace-nowrap" aria-hidden={set === 1}>
            {Array.from({ length: 8 }).map((_, i) => (
              <span
                key={i + set * 8}
                className="mx-8 sm:mx-12 flex items-center gap-3 text-primary font-black uppercase tracking-widest text-sm sm:text-base shrink-0"
              >
                MADMAD
                <span className="text-primary/40 text-xs">✦</span>
                MAKE YOUR MARK
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* ═══ TOP BANNER IMAGES (admin-configurable, ngay dưới Marquee) ═══════ */}
      {topBannerImages.length > 0 && (
        <section className="bg-background">
          {topBannerImages.map((imageUrl, index) => (
            <ScrollReveal key={`${imageUrl}-${index}`} className="w-full">
              <ImageWithFallback
                src={imageUrl}
                alt={`Banner ${index + 1}`}
                className="h-auto w-full object-contain"
              />
            </ScrollReveal>
          ))}
        </section>
      )}

      {/* ═══ FEATURED PRODUCTS — 3-col Protect.LDN grid ════════════════════ */}
      <section className="bg-white py-14 sm:py-20">
        <div className="px-6 sm:px-10 lg:px-16">
          {/* Section header */}
          <div className="mb-8 flex items-end justify-between border-b border-black/10 pb-4">
            <h2
              className="font-black uppercase text-black tracking-wide"
              style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.8rem)" }}
            >
              {t("NỔI BẬT", "FEATURED")}
            </h2>
            <Link
              to="/shop"
              className="text-[11px] uppercase tracking-[0.25em] text-black/40 transition-colors hover:text-black"
            >
              {t("Xem tất cả →", "View All →")}
            </Link>
          </div>

          {/* 3-column product grid */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4">
            {isLoading && products.length === 0 ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className={`animate-fadeInUp stagger-${index + 1}`}>
                  <ProductCardSkeleton variant="home" />
                </div>
              ))
            ) : (
              featuredProducts.map((product, index) => (
                <ScrollReveal key={product.id} className={`stagger-${Math.min(index + 1, 6)}`}>
                  <ProductCard product={product} variant="home" />
                </ScrollReveal>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ═══ POPULAR CATEGORY IMAGES (admin-configurable banner, sau Nổi Bật) ═══ */}
      {popularCategoryImages.length > 0 && (
        <section className="bg-background">
          {popularCategoryImages.map((imageUrl, index) => (
            <ScrollReveal key={`${imageUrl}-${index}`} className="w-full">
              <ImageWithFallback
                src={imageUrl}
                alt={`Featured ${index + 1}`}
                className="h-auto w-full object-contain"
              />
            </ScrollReveal>
          ))}
        </section>
      )}

      {/* ═══ SLOGAN ═════════════════════════════════════════════════════════ */}
      <section className="flex min-h-[22vh] items-center justify-center bg-white py-10">
        <ScrollReveal className="mx-auto max-w-4xl px-4 text-center">
          <img
            src="/assets/marquee/slogan.png"
            alt="Slogan MADMAD"
            className="mx-auto w-full object-contain"
          />
        </ScrollReveal>
      </section>

      {/* ═══ DROP COUNTDOWN ═════════════════════════════════════════════════ */}
      <section className="bg-primary py-5">
        <ScrollReveal className="mx-auto max-w-7xl px-6 sm:px-10 lg:px-16">
          <div className="flex flex-col items-center justify-between gap-5 sm:flex-row">
            <div className="text-white text-center sm:text-left">
              <p className="text-xs uppercase tracking-[0.2em] opacity-70 mb-1">Next Drop</p>
              <h3 className="text-lg sm:text-xl font-black uppercase tracking-wide">01 / 07 / 2026</h3>
            </div>

            <div className="flex items-center gap-3 text-white">
              {(
                [
                  { label: t("NGÀY", "DAYS"),  value: timeLeft.days },
                  { label: t("GIỜ", "HOURS"),   value: timeLeft.hours },
                  { label: t("PHÚT", "MINUTES"),  value: timeLeft.minutes },
                  { label: t("GIÂY", "SECONDS"),  value: timeLeft.seconds },
                ] as const
              ).map((item, index) => (
                <div key={item.label} className="flex items-center gap-3">
                  {index > 0 && <span className="text-white/40 text-2xl font-thin">:</span>}
                  <div className="text-center">
                    <div className="rounded bg-white/15 px-3 py-2 text-2xl sm:text-3xl font-black tabular-nums backdrop-blur-sm">
                      {item.value.toString().padStart(2, "0")}
                    </div>
                    <div className="mt-1 text-[9px] uppercase tracking-widest opacity-60">{item.label}</div>
                  </div>
                </div>
              ))}
            </div>

            <Link
              to="/shop"
              className="rounded-none border border-white px-8 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-all duration-300 hover:bg-white hover:text-primary"
            >
              {t("MUA NGAY", "SHOP NOW")}
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* ═══ EDITORIAL FEED — @MADMAD (MARQUEE SLIDER) ══════════════════════ */}
      <section className="bg-white pt-14 pb-0 overflow-hidden">
        {/* Feed header */}
        <ScrollReveal className="px-6 sm:px-10 lg:px-16 mb-6 flex items-center justify-between">
          <p
            className="font-black uppercase text-black tracking-[0.15em]"
            style={{ fontSize: "clamp(0.85rem, 1.5vw, 1.1rem)" }}
          >
            @MADMAD INSTAGRAM FEED
          </p>
          <a
            href={settings.instagramUrl || "https://instagram.com"}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] uppercase tracking-[0.25em] text-red-600 font-extrabold hover:text-black transition-colors"
          >
            Follow us
          </a>
        </ScrollReveal>

        {/* Photo grid sliding continuously */}
        <div className="relative flex w-full overflow-hidden border-t border-black/5 bg-stone-50/50 py-0.5 select-none">
          {[0, 1].map((setIndex) => (
            <div 
              key={setIndex} 
              className="flex shrink-0 animate-marquee gap-0.5 pr-0.5" 
              aria-hidden={setIndex === 1}
            >
              {activeInstagramImages.map((src, index) => (
                <div 
                  key={`${index}-${setIndex}`} 
                  className="relative overflow-hidden w-[50vw] sm:w-[33.33vw] lg:w-[20vw] aspect-[2/3] group cursor-pointer bg-white"
                >
                  <ImageWithFallback
                    src={src}
                    alt={`MADMAD editorial ${index + 1}`}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 transition-all duration-500 group-hover:bg-black/35 flex items-center justify-center">
                    <span className="text-white text-xs uppercase tracking-widest font-extrabold opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center gap-1">
                      📷 @madmad
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
