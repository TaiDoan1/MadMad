import { useState, useEffect } from "react";
import { brandLogo } from "@/assets/images";
import { useLanguage } from "@/features/settings/context/language-context";

/**
 * Full-screen welcome/splash screen shown once per session.
 * Reveals a custom "SELECT YOUR LOCATION" modal in the center.
 */
export function SplashScreen() {
  const { setLanguageAndCurrency } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Show only once per browser session
    const seen = sessionStorage.getItem("madmad_splash_seen");
    if (!seen) {
      setVisible(true);
      // Fade in location selector modal after 1.2s of clean logo pulse
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleSelect = (lang: "vi" | "en", curr: "VND" | "USD") => {
    setLanguageAndCurrency(lang, curr);
    if (exiting) return;
    setExiting(true);
    // After exit animation completes, hide and mark seen
    setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem("madmad_splash_seen", "1");
    }, 900);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleSelect("vi", "VND");
  };

  if (!visible) return null;

  return (
    <div
      aria-modal="true"
      role="dialog"
      onClick={() => handleSelect("vi", "VND")}
      className={`fixed inset-0 z-[99999] flex cursor-pointer flex-col items-center justify-center bg-black select-none ${
        exiting ? "splash-exit" : "splash-enter"
      }`}
    >
      {/* ── Background noise/grain texture ── */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03] splash-grain" />

      {/* ── Content ── */}
      <div className={`flex flex-col items-center gap-6 w-full ${exiting ? "splash-content-exit" : "splash-content-enter"}`}>
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
        {!showModal && (
          <p className="text-xs sm:text-sm uppercase tracking-[0.35em] text-white/50 splash-pulse">
            Click anywhere to enter
          </p>
        )}

        {/* 🌐 SELECT YOUR LOCATION MODAL (Stressmama style) */}
        {showModal && (
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="mt-6 w-[90%] max-w-md border border-white bg-white text-black text-center shadow-2xl relative animate-fadeIn rounded-xl overflow-hidden cursor-default"
          >
            {/* Header Area */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/10">
              <h2 className="w-full text-center text-[10px] font-black uppercase tracking-[0.25em] pl-6 select-none text-black">
                SELECT YOUR LOCATION
              </h2>
              <button 
                onClick={handleClose}
                className="w-6 h-6 border border-black flex items-center justify-center font-bold text-[10px] uppercase hover:bg-black hover:text-white transition-all duration-300 rounded"
              >
                ✕
              </button>
            </div>

            {/* Buttons Area */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 p-6">
              <button 
                onClick={() => handleSelect("vi", "VND")}
                className="w-full sm:w-[48%] py-3 px-4 border border-black text-[10px] font-black uppercase hover:bg-black hover:text-white transition-all duration-300 rounded-lg tracking-wider"
              >
                Vietnamese version
              </button>
              <button 
                onClick={() => handleSelect("en", "USD")}
                className="w-full sm:w-[48%] py-3 px-4 border border-black text-[10px] font-black uppercase hover:bg-black hover:text-white transition-all duration-300 rounded-lg tracking-wider"
              >
                International version
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
