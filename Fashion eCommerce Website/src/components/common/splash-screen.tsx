import { useState, useEffect } from "react";
import { brandLogo } from "@/assets/images";

/**
 * Full-screen welcome/splash screen shown once per session.
 * Click anywhere → animate out → reveal the site.
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Show only once per browser session
    const seen = sessionStorage.getItem("madmad_splash_seen");
    if (!seen) {
      setVisible(true);
    }
  }, []);

  const handleEnter = () => {
    if (exiting) return;
    setExiting(true);
    // After exit animation completes, hide and mark seen
    setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem("madmad_splash_seen", "1");
    }, 900);
  };

  if (!visible) return null;

  return (
    <div
      aria-modal="true"
      role="dialog"
      onClick={handleEnter}
      className={`fixed inset-0 z-[99999] flex cursor-pointer flex-col items-center justify-center bg-black select-none ${
        exiting ? "splash-exit" : "splash-enter"
      }`}
    >
      {/* ── Background noise/grain texture ── */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] splash-grain" />

      {/* ── Content ── */}
      <div className={`flex flex-col items-center gap-6 ${exiting ? "splash-content-exit" : "splash-content-enter"}`}>
        {/* Logo */}
        <img
          src={brandLogo}
          alt="MADMAD"
          className="w-40 sm:w-56 md:w-72 object-contain"
          style={{ filter: "brightness(0) invert(1)" }}
          draggable={false}
        />

        {/* Tagline */}
        <p
          className="font-['Bayon',sans-serif] text-2xl sm:text-3xl md:text-4xl uppercase tracking-[0.25em] text-white/90"
          style={{ fontFamily: "'Bayon', sans-serif" }}
        >
          Make Your Mark
        </p>

        {/* Divider */}
        <div className="h-px w-16 bg-white/30" />

        {/* Enter hint — pulses */}
        <p className="text-xs sm:text-sm uppercase tracking-[0.35em] text-white/50 splash-pulse">
          Click anywhere to enter
        </p>
      </div>
    </div>
  );
}
