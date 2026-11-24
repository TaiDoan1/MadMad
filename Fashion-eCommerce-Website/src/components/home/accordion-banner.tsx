import { useCallback, useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { Link } from "react-router";
import { useLanguage } from "@/features/settings/context/language-context";
import { useStorefrontSettings } from "@/features/settings/context/storefront-settings-context";
import { cloudinarySrcSet, optimizeImageUrl } from "@/utils/cloudinary";

// ─── Accordion Banner — 1 dải dài duy nhất, cuộn ngang ──────────────────────
// Thay hẳn banner túi tote ở chỗ banner trên trang chủ (ngay dưới Marquee,
// trên NEW ARRIVAL). Dải 5474×1824 (~3:1): desktop rộng khoảng 168% viewport,
// mobile cao 74svh; ảnh cao 100%, rộng tự động, không cắt xén.
// Lúc mới mở chỉ hiện hình 1, chừa trắng bên trái hình 1: desktop là khoảng
// trắng 58vw (vừa đủ để hình 1 lấp đầy phần còn lại), mobile là panel chữ
// 55vw (hình 1 ló ra 45vw — vì ~14% đầu hình 1 là nền trắng nên panel
// phải hẹp thì mẫu mới ló ra được). Kéo tự do qua mới tới hình 2, 3, 4.
// Panel chữ có đoạn text giới thiệu bộ sưu tập (WINTER 2026) cho đỡ trống;
// text nằm trong dải nên kéo thì chạy theo dải luôn.
// Thả tay ra thì tự căn về vị trí chuẩn gần nhất (mỗi hình canh trái màn
// hình, vị trí 0 là panel chữ lúc mới mở) để không dừng lưng chừng làm hình
// bị cắt đôi. Kéo/vuốt để lướt, lăn chuột thì lướt ngang, phím mũi tên
// chuyển, vuốt cảm ứng dùng cuộn native. Lăn tới cuối dải rồi thì trang
// cuộn tiếp xuống xem tiếp, không kẹt ở banner. URL rỗng thì không hiện gì.

const STRIP_WIDTHS = [1200, 2400, 3200];

export function AccordionBanner() {
  const { settings } = useStorefrontSettings();
  const { t } = useLanguage();
  const stripUrl = (settings.accordionBannerImage ?? "").trim();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startScrollLeft: number } | null>(null);
  const isPointerDownRef = useRef(false);
  const snapTimerRef = useRef<number | null>(null);

  // Tải trước dải (đúng URL đã tối ưu ở cỡ lớn nhất) để banner không trống.
  useEffect(() => {
    if (!stripUrl) return;
    const img = new Image();
    img.src = optimizeImageUrl(stripUrl, 3200);
  }, [stripUrl]);

  // Tự căn về vị trí chuẩn gần nhất: mỗi hình canh trái màn hình (vị trí 0
  // là panel chữ lúc mới mở). Chỉ căn khi đã thả tay và ngừng lướt.
  const snapToNearest = useCallback(() => {
    const el = scrollerRef.current;
    const img = imgRef.current;
    const spacer = spacerRef.current;
    if (!el || !img || !spacer) return;
    if (el.scrollWidth <= el.clientWidth) return;
    const imgW = img.clientWidth / 4;
    const spacerW = spacer.offsetWidth;
    if (imgW <= 0 || spacerW <= 0) return;
    const max = el.scrollWidth - el.clientWidth;
    const positions = [0];
    for (let i = 0; i < 4; i++) {
      positions.push(Math.min(spacerW + i * imgW, max));
    }
    const uniq = [...new Set(positions.map((p) => Math.round(p)))].sort((a, b) => a - b);
    const current = el.scrollLeft;
    let best = uniq[0];
    let bestDist = Math.abs(current - best);
    for (const p of uniq) {
      const d = Math.abs(current - p);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    if (bestDist > 4) el.scrollTo({ left: best, behavior: "smooth" });
  }, []);

  // Sau khi ngừng lướt 200ms (hết quán tính vuốt, hết lăn chuột) thì tự căn.
  // Không căn trong lúc đang giữ chuột/ngón tay.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => {
      if (isPointerDownRef.current) return;
      if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
      snapTimerRef.current = window.setTimeout(() => {
        snapToNearest();
      }, 200);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
    };
  }, [stripUrl, snapToNearest]);

  // Lăn chuột dọc -> lướt ngang dải (nghe native với passive: false để
  // preventDefault được; React onWheel không chặn được cuộn dọc mặc định).
  // Kéo tới cuối dải (hoặc về đầu dải) rồi thì để trang cuộn tiếp xuống
  // (hoặc lên), không giữ chuột kẹt ở banner nữa.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      if (el.scrollWidth <= el.clientWidth) return;
      const maxScrollLeft = el.scrollWidth - el.clientWidth;
      if (e.deltaY > 0 && el.scrollLeft >= maxScrollLeft - 1) return;
      if (e.deltaY < 0 && el.scrollLeft <= 1) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel as EventListener, { passive: false });
    return () => el.removeEventListener("wheel", onWheel as EventListener);
  }, [stripUrl]);

  // Kéo chuột để lướt (vuốt cảm ứng dùng cuộn native qua touchAction pan-x).
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    isPointerDownRef.current = true;
    if (e.pointerType !== "mouse") return;
    const el = scrollerRef.current;
    if (!el) return;
    dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startScrollLeft: el.scrollLeft };
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = scrollerRef.current;
    if (!drag || !el || drag.pointerId !== e.pointerId) return;
    el.scrollLeft = drag.startScrollLeft - (e.clientX - drag.startX);
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    isPointerDownRef.current = false;
    if (dragRef.current?.pointerId === e.pointerId) {
      dragRef.current = null;
      // Kéo chuột không có quán tính nên thả tay ra là căn ngay.
      snapToNearest();
    }
  };

  // Phím mũi tên chuyển dải (mỗi lần ~80% viewport).
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = el.clientWidth * 0.8;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      el.scrollBy({ left: step, behavior: "smooth" });
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      el.scrollBy({ left: -step, behavior: "smooth" });
    }
  };

  if (!stripUrl) return null;

  return (
    <section className="bg-background">
      <div
        ref={scrollerRef}
        tabIndex={0}
        role="region"
        aria-label={t("Banner bộ sưu tập — kéo để xem", "Collection banner — drag to explore")}
        className="flex h-[74svh] w-full cursor-grab overflow-x-auto overscroll-x-contain select-none active:cursor-grabbing sm:h-[56vw] [&::-webkit-scrollbar]:hidden"
        style={{
          scrollbarWidth: "none",
          touchAction: "pan-x",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
      >
        {/* Panel chữ bên trái hình 1 — lúc mới mở chỉ hiện panel chữ + hình 1.
            Text nằm trong dải nên kéo thì chạy theo dải luôn. */}
        <div ref={spacerRef} className="flex h-full w-[55vw] shrink-0 items-center bg-white sm:w-[58vw]">
          <div className="pl-[6vw] pr-[4vw]">
            <p
              className="text-[15vw] leading-[0.85] tracking-wide text-black sm:text-[11vw]"
              style={{ fontFamily: "'Bebas Neue', 'Oswald', sans-serif" }}
            >
              WINTER
              <br />
              2026
            </p>
            <p className="mt-[1.5vw] text-xs tracking-wide text-neutral-600 sm:text-sm">
              {t("Bộ sưu tập mùa đông 2026", "The Winter 2026 collection")}
            </p>
            <p className="mt-[3vw] text-xs font-bold uppercase tracking-[0.25em] text-black">
              {t("Kéo để xem →", "Drag to explore →")}
            </p>
          </div>
        </div>
        <img
          ref={imgRef}
          src={optimizeImageUrl(stripUrl, 3200)}
          srcSet={cloudinarySrcSet(stripUrl, STRIP_WIDTHS)}
          sizes="(max-width: 640px) 222svh, 168vw"
          alt={t("Banner bộ sưu tập MADMAD", "MADMAD collection banner")}
          draggable={false}
          className="h-full w-auto max-w-none shrink-0"
        />
      </div>

      {/* Nút xem bộ sưu tập — căn giữa, dưới dải */}
      <div className="flex justify-center bg-background py-6">
        <Link
          to="/shop"
          className="rounded-none border border-black px-8 py-2.5 text-xs font-bold uppercase tracking-widest text-black transition-all duration-300 hover:bg-black hover:text-white"
        >
          {t("Xem bộ sưu tập", "Shop the collection")}
        </Link>
      </div>
    </section>
  );
}
