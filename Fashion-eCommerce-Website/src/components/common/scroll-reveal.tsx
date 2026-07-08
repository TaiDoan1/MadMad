import { useEffect, useRef, useState, type ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  /** Độ trễ (ms) trước khi bắt đầu hiệu ứng, dùng để so le nhiều khối liên tiếp */
  delayMs?: number;
}

/**
 * Bọc quanh 1 khối nội dung để tự động mờ dần + trượt lên khi cuộn tới (chỉ chạy 1 lần).
 */
export function ScrollReveal({ children, className = "", delayMs = 0 }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delayMs > 0) {
            setTimeout(() => setVisible(true), delayMs);
          } else {
            setVisible(true);
          }
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delayMs]);

  return (
    <div ref={ref} className={`${visible ? "animate-fadeInUp" : "opacity-0"} ${className}`}>
      {children}
    </div>
  );
}
