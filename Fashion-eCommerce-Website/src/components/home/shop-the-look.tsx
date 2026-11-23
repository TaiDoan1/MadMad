import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useLanguage } from "@/features/settings/context/language-context";
import { useStorefrontSettings } from "@/features/settings/context/storefront-settings-context";
import { cloudinarySrcSet, optimizeImageUrl } from "@/utils/cloudinary";

// ─── Shop the Look — mục NEW ARRIVAL trên trang chủ ──────────────────────────
// Vòng xoay các look theo đúng bản test đã duyệt (hiệu ứng giống video Hades):
// các look trên một vòng tròn thật, mẫu đứng thẳng chính diện,
// độ sâu chỉ thể hiện bằng to nhỏ / mờ / lớp trước che lớp sau.
// Ảnh lấy từ settings (admin up ở tab Gallery, mục New Arrival), theo đúng
// thứ tự ô Look 1–5; ô nào trống thì look đó không hiện.

interface ShopLookMeta {
  label: string;
  /** Tên hiển thị lớn dưới vòng xoay (tên bộ sưu tập / sản phẩm của look). */
  name: string;
  /** null = chưa có trên web (Sắp mở bán), không nhấn được */
  productId: string | null;
}

/** Thông tin cố định của từng ô, xác định bằng CHỈ SỐ Ô GỐC (không đánh lại số khi có ô trống). */
const LOOK_META: ShopLookMeta[] = [
  { label: "Look 1", name: "MEMORIES", productId: "9027b658-2f04-463f-991b-2dd804dd3af9" },
  { label: "Look 2", name: "DON'T JUST EXIST", productId: "c7faa1c9-8f96-4888-b501-324c7b56f8e6" },
  { label: "Look 3", name: "MAKE YOUR MARK", productId: "74a0abba-749b-415e-90f6-f2f7458d85df" },
  { label: "Look 4", name: "MAKE YOUR MARK", productId: "74a0abba-749b-415e-90f6-f2f7458d85df" },
  { label: "Look 5", name: "STAY MAD. STAY REAL.", productId: null },
];

interface ShopLook extends ShopLookMeta {
  /** Chỉ số ô gốc (0–4) — nhãn Look và số đếm dùng số này. */
  slot: number;
  image: string;
}

const AUTOPLAY_MS = 4000;
const TWEEN_MS = 620;

/** Đưa offset về khoảng [-count/2, count/2] trên vòng count look. */
function wrapOffset(raw: number, count: number): number {
  let o = ((raw % count) + count) % count;
  if (o > count / 2) o -= count;
  return o;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** scale / blur / opacity theo |offset|: 0 = giữa, 1 = kề, 2 = xa, 2.5 = vòng sau.
    Look kề giữ to hơn (0.84 thay vì 0.78) để vòng xoay nhìn khít như Hades. */
function depthStyle(absOffset: number): { scale: number; blur: number; opacity: number } {
  if (absOffset <= 1) {
    const k = absOffset;
    return { scale: 1 - 0.16 * k, blur: 2 * k, opacity: 1 - 0.25 * k };
  }
  if (absOffset <= 2) {
    const k = absOffset - 1;
    return { scale: 0.84 - 0.14 * k, blur: 2 + 2 * k, opacity: 0.75 - 0.3 * k };
  }
  const k = Math.min(1, (absOffset - 2) / 0.5);
  return { scale: 0.68, blur: 4, opacity: Math.max(0.35, 0.45 - 0.1 * k) };
}

/** Bán kính vòng (px) theo bề rộng sân khấu: desktop 27%, điện thoại 34%.
    Giãn ngang hơn để 5 look xếp thành một hàng ngang (như Hades), look giữa
    không còn chót vót một mình ở giữa. */
function spacingFor(stageWidth: number): number {
  if (stageWidth < 480) return Math.min(240, Math.max(100, stageWidth * 0.34));
  return Math.min(240, Math.max(90, stageWidth * 0.27));
}

export function ShopTheLook() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { settings } = useStorefrontSettings();

  // Chỉ render các look có ảnh; mỗi look giữ nguyên chỉ số ô gốc của nó.
  const looks = useMemo<ShopLook[]>(() => {
    const images = settings.newArrivalImages ?? [];
    return LOOK_META.map((meta, slot) => ({
      ...meta,
      slot,
      image: (images[slot] ?? "").trim(),
    })).filter((look) => look.image !== "");
  }, [settings.newArrivalImages]);

  const count = looks.length;
  // Góc mỗi nấc = 360° / số look đang hiện (đủ 5 look thì đúng 72° như bản đã duyệt).
  const stepDeg = count > 0 ? 360 / count : 72;

  const stageRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(0);
  /** Vị trí liên tục trên vòng (số thực, không giới hạn) — 1 nấc = 1 look. */
  const [pos, setPos] = useState(0);
  const posRef = useRef(0);
  const targetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const dragMovedRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartPosRef = useRef(0);

  const activeIndex = count === 0 ? 0 : ((Math.round(pos) % count) + count) % count;
  const activeLook = looks[activeIndex];

  // Đo bề rộng sân khấu để tính bán kính vòng.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => setStageWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Tải trước các ảnh đang hiện để vòng xoay không bao giờ trống.
  // Tải trước đúng URL đã tối ưu (khớp src render) để trình duyệt dùng lại cache.
  useEffect(() => {
    looks.forEach((look) => {
      const img = new Image();
      img.src = optimizeImageUrl(look.image, 800);
    });
  }, [looks]);

  const cancelTween = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => cancelTween, [cancelTween]);

  /** Xoay vòng tới vị trí đích bằng tween mượt ~620ms. */
  const animateTo = useCallback(
    (target: number) => {
      cancelTween();
      targetRef.current = target;
      const from = posRef.current;
      const start = performance.now();
      const tick = (now: number) => {
        const k = Math.min(1, (now - start) / TWEEN_MS);
        const next = from + (target - from) * easeInOutCubic(k);
        posRef.current = next;
        setPos(next);
        if (k < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          rafRef.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [cancelTween],
  );

  // Tự chạy 4 giây một lần, dừng khi đang kéo.
  useEffect(() => {
    if (count === 0) return;
    const id = window.setInterval(() => {
      if (!draggingRef.current) animateTo(targetRef.current + 1);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [animateTo, count]);

  // ── Kéo / vuốt để đổi look ────────────────────────────────────────────────
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    dragMovedRef.current = false;
    dragStartXRef.current = e.clientX;
    dragStartPosRef.current = posRef.current;
    cancelTween();
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    const dx = e.clientX - dragStartXRef.current;
    if (Math.abs(dx) > 8) dragMovedRef.current = true;
    const radius = spacingFor(stageWidth || window.innerWidth);
    const next = dragStartPosRef.current - dx / radius;
    posRef.current = next;
    setPos(next);
  };

  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    animateTo(Math.round(posRef.current));
  };

  // ── Nhấn vào look ─────────────────────────────────────────────────────────
  // Look hai bên: xoay nó ra giữa. Look ở giữa: vào trang chi tiết sản phẩm.
  const onLookClick = (index: number) => {
    if (dragMovedRef.current) return;
    const offset = wrapOffset(index - posRef.current, count);
    if (Math.abs(offset) < 0.5) {
      const look = looks[index];
      if (look.productId) navigate(`/product/${look.productId}`);
      return;
    }
    animateTo(posRef.current + offset);
  };

  // Không có ảnh nào thì không hiện mục.
  if (count === 0) return null;

  const radius = spacingFor(stageWidth || (typeof window !== "undefined" ? window.innerWidth : 1200));

  return (
    <section className="bg-white py-14 sm:py-20">
      {/* Tiêu đề mục — cùng kiểu với mục FEATURED */}
      <div className="px-6 sm:px-10 lg:px-16">
        <div className="mb-8 flex items-end justify-between border-b border-black/10 pb-4">
          <h2
            className="font-black uppercase text-black tracking-wide"
            style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.8rem)" }}
          >
            {t("HÀNG MỚI", "NEW ARRIVAL")}
          </h2>
          <Link
            to="/shop"
            className="text-[11px] uppercase tracking-[0.25em] text-black/40 transition-colors hover:text-black"
          >
            {t("Xem tất cả →", "View All →")}
          </Link>
        </div>
      </div>

      {/* Sân khấu vòng xoay — full-bleed để đủ chỗ cho cả 5 mẫu trên điện thoại.
          Cao 88vw (tối đa 480px) để look giữa thấp xuống, 5 look xếp thành
          hàng ngang thay vì look giữa chót vót một mình. */}
      <div
        ref={stageRef}
        className="relative w-full select-none overflow-hidden bg-white"
        style={{ height: "min(480px, 88vw)", touchAction: "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {looks.map((look, i) => {
          const offset = wrapOffset(i - pos, count);
          const angle = (offset * stepDeg * Math.PI) / 180;
          const x = radius * Math.sin(angle);
          const z = radius * (Math.cos(angle) - 1);
          const { scale, blur, opacity } = depthStyle(Math.abs(offset));
          const isCenter = Math.abs(offset) < 0.5;
          const clickable = isCenter ? look.productId !== null : true;

          return (
            <div
              key={look.slot}
              role="button"
              aria-label={look.productId ? `${look.label} — ${t("Xem chi tiết", "View details")}` : `${look.label} — ${t("Sắp mở bán", "Coming soon")}`}
              onClick={() => onLookClick(i)}
              className="absolute bottom-0 left-1/2 h-full"
              style={{
                transform: `translateX(calc(-50% + ${x}px))`,
                zIndex: Math.round(1000 + z),
                cursor: clickable ? "pointer" : "default",
              }}
            >
              <img
                src={optimizeImageUrl(look.image, 800)}
                srcSet={cloudinarySrcSet(look.image, [400, 800, 1200])}
                sizes="(max-width: 640px) 80vw, 480px"
                alt={look.label}
                draggable={false}
                className="h-full w-auto"
                style={{
                  transform: `scale(${scale})`,
                  transformOrigin: "50% 100%",
                  filter: blur > 0 ? `blur(${blur}px)` : undefined,
                  opacity,
                }}
              />
            </div>
          );
        })}

        {/* Nhãn "Sắp mở bán" khi look ở giữa chưa có trên web */}
        {activeLook.productId === null && (
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white">
            {t("Sắp mở bán", "Coming soon")}
          </div>
        )}
      </div>

      {/* Tên bộ sưu tập của look đang ở giữa — chữ lớn, font Bebas Neue kiểu poster streetwear, đổi theo vòng xoay.
          Nhấn vào tên thì vào trang chi tiết sản phẩm (trừ look chưa mở bán). */}
      <div className="mt-6 px-6 text-center">
        <button
          key={activeLook.slot}
          type="button"
          disabled={activeLook.productId === null}
          onClick={() => {
            if (activeLook.productId) navigate(`/product/${activeLook.productId}`);
          }}
          aria-label={activeLook.productId ? `${activeLook.name} — ${t("Xem chi tiết", "View details")}` : `${activeLook.name} — ${t("Sắp mở bán", "Coming soon")}`}
          className="animate-fadeIn text-black disabled:cursor-default"
          style={{
            fontFamily: "'Bebas Neue', 'Oswald', sans-serif",
            fontSize: "clamp(2rem, 9vw, 5rem)",
            lineHeight: 1,
            letterSpacing: "0.04em",
          }}
        >
          {activeLook.name}
        </button>
      </div>
    </section>
  );
}
