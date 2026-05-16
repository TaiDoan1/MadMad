import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { brandLogo } from "@/assets/images";

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Correct transition order:
 *  1. User clicks link → e.preventDefault() stops React Router
 *  2. Curtain slides IN (covers old page) + logo animates
 *  3. onAnimationEnd → navigate() to new route
 *  4. Short delay → Curtain slides OUT (reveals new page)
 */
export function PageTransition({ children }: PageTransitionProps) {
  const navigate = useNavigate();
  const [curtain, setCurtain] = useState<"hidden" | "covering" | "revealing">("hidden");
  const pendingPath = useRef<string | null>(null);
  const curtainRef = useRef<"hidden" | "covering" | "revealing">("hidden");

  // Keep ref in sync so click handler (closure) has fresh value
  useEffect(() => {
    curtainRef.current = curtain;
  }, [curtain]);

  // Global click interceptor — capture phase runs BEFORE React Router
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Skip if already transitioning
      if (curtainRef.current !== "hidden") return;

      const anchor = (e.target as Element)?.closest("a");
      if (!anchor?.href) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;       // external
      if (anchor.getAttribute("target") === "_blank") return;  // new tab
      if (anchor.hasAttribute("download")) return;             // download

      const dest = url.pathname + url.search + url.hash;
      const curr = window.location.pathname + window.location.search + window.location.hash;
      if (dest === curr) return; // same page

      // ── Block React Router from navigating ──────────────────────────────
      e.preventDefault();
      // stopImmediatePropagation blocks React's synthetic event system too,
      // preventing React Router's <Link> onClick from calling navigate()
      e.stopImmediatePropagation();

      // Store destination and start COVER animation
      pendingPath.current = dest;
      setCurtain("covering");
    };

    // capture: true → fires before React's synthetic event system
    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, []);

  const handleAnimationEnd = () => {
    if (curtainRef.current === "covering") {
      // ── Curtain fully covers screen → navigate + scroll to top ──────────
      if (pendingPath.current) {
        navigate(pendingPath.current);
        // Scroll to top while curtain hides the jump — user never sees it
        window.scrollTo({ top: 0, behavior: "instant" });
        pendingPath.current = null;
      }
      // Small RAF to let React render new page, then reveal
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setCurtain("revealing"));
      });
    } else if (curtainRef.current === "revealing") {
      setCurtain("hidden");
    }
  };

  return (
    <>
      {/* ── Curtain overlay ──────────────────────────────────────────────── */}
      {curtain !== "hidden" && (
        <div
          aria-hidden="true"
          className={`fixed inset-0 z-[9998] bg-white flex items-center justify-center ${
            curtain === "covering" ? "curtain-slide-in" : "curtain-slide-out"
          }`}
          onAnimationEnd={handleAnimationEnd}
        >
          <img
            src={brandLogo}
            alt="MADMAD"
            className={`w-72 sm:w-96 object-contain select-none ${
              curtain === "covering" ? "curtain-logo" : "opacity-0"
            }`}
          />
        </div>
      )}

      {children}
    </>
  );
}
