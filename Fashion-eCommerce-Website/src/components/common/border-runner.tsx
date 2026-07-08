import { useEffect, useRef, useState } from "react";

import runnerIcon from "@/imports/logo-m-drip.png";
import { useStorefrontSettings } from "@/features/settings/context/storefront-settings-context";

const DEFAULT_PHRASES = [
  "Ê, mua đồ chưa? 👀",
  "MADMAD nè!",
  "Stay Real 🔥",
  "Chạm nhẹ tay thôi :))",
  "Săn sale liền tay!",
  "Đẹp trai như mình nè 😎",
];

const DEFAULT_HINT_TEXT = "Hãy chạm vào tôi đi nè.";
const DEFAULT_HINT_INTERVAL_SEC = 5;
const HINT_DELAY_MS = 1800;
const HINT_TYPE_SPEED_MS = 60;
const HINT_HOLD_MS = 3000;

function playChime() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    // iOS Safari (và một số trình duyệt di động) tạo AudioContext ở trạng thái "suspended" —
    // phải resume() tường minh trong cùng lượt chạm thì mới thực sự phát được âm thanh.
    if (ctx.state === "suspended") {
      void ctx.resume();
    }
    const notes = [523.25, 659.25, 783.99];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;

      const startTime = ctx.currentTime + i * 0.1;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.3, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });

    setTimeout(() => ctx.close(), 600);
  } catch {
    // Web Audio API không khả dụng — bỏ qua âm thanh, vẫn hiện bong bóng thoại
  }
}

type BubblePlacement = {
  vertical: "above" | "below";
  horizontal: "left" | "right";
};

function computePlacement(rect: DOMRect): BubblePlacement {
  return {
    vertical: rect.top < window.innerHeight / 2 ? "below" : "above",
    horizontal: rect.left > window.innerWidth / 2 ? "right" : "left",
  };
}

/**
 * Logo MADMAD nhỏ chạy vòng quanh viền màn hình cho vui mắt 🐱
 * Cố định theo viewport (không cuộn theo trang). Nhấn/chạm vào sẽ phát tiếng chime + hiện bong bóng thoại.
 * Khi chưa ai tương tác, tự gõ chữ mời gọi (cấu hình được trong Admin) lặp lại theo chu kỳ.
 */
export function BorderRunner() {
  const { settings } = useStorefrontSettings();
  const hintText = settings.borderRunnerHintText?.trim() || DEFAULT_HINT_TEXT;
  const intervalSec =
    settings.borderRunnerHintIntervalSec && settings.borderRunnerHintIntervalSec > 0
      ? settings.borderRunnerHintIntervalSec
      : DEFAULT_HINT_INTERVAL_SEC;
  const phrases = settings.borderRunnerPhrases?.filter((p) => p.trim()).length
    ? settings.borderRunnerPhrases.filter((p) => p.trim())
    : DEFAULT_PHRASES;

  const buttonRef = useRef<HTMLButtonElement>(null);
  const [bubble, setBubble] = useState<string | null>(null);
  const [placement, setPlacement] = useState<BubblePlacement>({ vertical: "above", horizontal: "left" });
  const [hintTyped, setHintTyped] = useState("");
  const [showHint, setShowHint] = useState(false);
  const bubbleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasInteractedRef = useRef(false);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTypeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const repeatBaseMs = Math.max(1, intervalSec) * 1000;
    const repeatMinMs = Math.max(1000, repeatBaseMs - 1000);
    const repeatMaxMs = repeatBaseMs + 1000;
    const randomRepeatGap = () => repeatMinMs + Math.random() * (repeatMaxMs - repeatMinMs);

    const clearHintTimers = () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      if (hintTypeIntervalRef.current) clearInterval(hintTypeIntervalRef.current);
    };

    const scheduleHintCycle = (delay: number) => {
      clearHintTimers();
      hintTimerRef.current = setTimeout(() => {
        if (hasInteractedRef.current || !buttonRef.current) return;

        setPlacement(computePlacement(buttonRef.current.getBoundingClientRect()));
        setShowHint(true);
        setHintTyped("");

        let charIndex = 0;
        hintTypeIntervalRef.current = setInterval(() => {
          charIndex += 1;
          setHintTyped(hintText.slice(0, charIndex));
          if (charIndex >= hintText.length) {
            if (hintTypeIntervalRef.current) clearInterval(hintTypeIntervalRef.current);
            hintTimerRef.current = setTimeout(() => {
              if (hasInteractedRef.current) return;
              setShowHint(false);
              scheduleHintCycle(randomRepeatGap());
            }, HINT_HOLD_MS);
          }
        }, HINT_TYPE_SPEED_MS);
      }, delay);
    };

    scheduleHintCycle(HINT_DELAY_MS);

    return clearHintTimers;
  }, [hintText, intervalSec]);

  const handleActivate = (event: React.MouseEvent<HTMLButtonElement>) => {
    hasInteractedRef.current = true;
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    if (hintTypeIntervalRef.current) clearInterval(hintTypeIntervalRef.current);
    setShowHint(false);
    playChime();

    setPlacement(computePlacement(event.currentTarget.getBoundingClientRect()));

    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    setBubble(phrase);
    if (bubbleTimeoutRef.current) clearTimeout(bubbleTimeoutRef.current);
    bubbleTimeoutRef.current = setTimeout(() => setBubble(null), 2200);
  };

  const activeText = bubble ?? (showHint ? hintTyped : null);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={handleActivate}
      aria-label="MADMAD easter egg"
      className="border-runner fixed z-[70] h-8 w-8 cursor-pointer touch-manipulation border-0 bg-transparent p-0"
    >
      <img
        src={runnerIcon}
        alt=""
        aria-hidden="true"
        className="border-runner-spin h-8 w-8 object-contain drop-shadow-md select-none"
      />
      {activeText ? (
        <span className={`thought-bubble tb-${placement.vertical} tb-${placement.horizontal}`}>
          {activeText}
          {showHint && !bubble ? <span className="thought-bubble-cursor">|</span> : null}
        </span>
      ) : null}
    </button>
  );
}
