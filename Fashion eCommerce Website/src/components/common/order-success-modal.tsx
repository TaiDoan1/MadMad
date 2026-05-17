import { useEffect, useState } from "react";
import { Package, ArrowRight, Sparkles } from "lucide-react";
import { brandLogo } from "@/assets/images";

interface OrderSuccessModalProps {
  open: boolean;
  orderNumber: string;
  customerName: string;
  total: number;
  onClose: () => void;
}

/** Chữ "CẢM ƠN BẠN" hiển thị từng ký tự */
function AnimatedText({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <span aria-label={text} className="inline-flex flex-wrap justify-center gap-[2px]">
      {text.split("").map((char, i) => (
        <span
          key={i}
          className="order-success-char"
          style={{ animationDelay: `${delay + i * 60}ms` }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
}

/** Mini confetti particle */
function Particle({ style }: { style: React.CSSProperties }) {
  return <span className="order-particle" style={style} />;
}

const PARTICLE_COLORS = ["#aa1e22", "#1a1a1a", "#D4A373", "#E8DCC4", "#8B4513"];
const PARTICLES = Array.from({ length: 24 }, (_, i) => ({
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 40}%`,
  background: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
  width: `${4 + Math.random() * 6}px`,
  height: `${4 + Math.random() * 6}px`,
  animationDelay: `${Math.random() * 600}ms`,
  animationDuration: `${800 + Math.random() * 800}ms`,
  borderRadius: Math.random() > 0.5 ? "50%" : "2px",
  transform: `rotate(${Math.random() * 360}deg)`,
}));

export function OrderSuccessModal({
  open,
  orderNumber,
  customerName,
  total,
  onClose,
}: OrderSuccessModalProps) {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (open) {
      // slight delay so animation plays after mount
      const t = setTimeout(() => setVisible(true), 20);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
      setClosing(false);
    }
  }, [open]);

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 400);
  };

  if (!open) return null;

  return (
    <div
      className={`order-success-backdrop ${visible && !closing ? "order-success-backdrop--in" : "order-success-backdrop--out"}`}
      onClick={handleClose}
    >
      {/* Confetti particles */}
      {visible && PARTICLES.map((p, i) => <Particle key={i} style={p} />)}

      {/* Modal card */}
      <div
        className={`order-success-card ${visible && !closing ? "order-success-card--in" : "order-success-card--out"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Shimmer stripe at top */}
        <div className="order-success-stripe" />

        {/* Brand logo */}
        <div className="order-success-icon-wrap">
          <div className="order-success-icon-ring" />
          <img
            src={brandLogo}
            alt="MADMAD"
            className="order-success-logo"
          />
          <Sparkles className="order-success-sparkle order-success-sparkle--tl" />
          <Sparkles className="order-success-sparkle order-success-sparkle--br" />
        </div>

        {/* Animated "CẢM ƠN BẠN" heading */}
        <h2 className="order-success-title">
          <AnimatedText text="CẢM ƠN" delay={200} />
          <br />
          <AnimatedText text={customerName.toUpperCase() || "BẠN"} delay={600} />
          <span className="order-success-title-accent">!</span>
        </h2>

        <p className="order-success-subtitle">
          Đơn hàng của bạn đã được xác nhận thành công
        </p>

        {/* Order info box */}
        <div className="order-success-info">
          <div className="order-success-info-row">
            <span className="order-success-info-label">
              <Package className="inline h-3.5 w-3.5 mr-1 opacity-60" />
              Mã đơn hàng
            </span>
            <span className="order-success-info-value">{orderNumber}</span>
          </div>
          <div className="order-success-info-divider" />
          <div className="order-success-info-row">
            <span className="order-success-info-label">Tổng thanh toán</span>
            <span className="order-success-info-value order-success-info-value--price">
              {total.toLocaleString("vi-VN")}₫
            </span>
          </div>
        </div>

        <p className="order-success-note">
          Chúng tôi sẽ liên hệ xác nhận và giao hàng sớm nhất có thể 🚀
        </p>

        {/* CTA button */}
        <button className="order-success-btn" onClick={handleClose}>
          <span>Tiếp tục mua sắm</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  );
}
