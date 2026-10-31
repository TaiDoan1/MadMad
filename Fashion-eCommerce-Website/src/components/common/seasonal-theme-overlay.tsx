/**
 * Lớp hiệu ứng chủ đề theo mùa, chỉ phủ lên hero trang chủ.
 * Không chặn click (pointer-events: none), không dùng ảnh ngoài,
 * chỉ CSS thuần để nhẹ và tự tắt khi admin tắt công tắc.
 * Hiện tại chỉ có "halloween": sương trôi + dơi bay + lá rơi + ánh cam.
 * Thêm mùa mới: thêm một nhánh render tương tự, không sửa layout trang chủ.
 */

function Bat({ style }: { style: React.CSSProperties }) {
  return (
    <svg
      className="seasonal-bat"
      style={style}
      viewBox="0 0 48 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M24 12c-2-6-8-10-16-10-3 0-6 1-8 3 3 0 5 1 6 3-1 2-1 4 1 6 2-3 5-4 8-3 3 4 6 6 9 6s6-2 9-6c3-1 6 0 8 3 2-2 2-4 1-6 1-2 3-3 6-3-2-2-5-3-8-3-8 0-14 4-16 10z" />
    </svg>
  );
}

const BATS: React.CSSProperties[] = [
  { top: "12%", animationDuration: "16s", animationDelay: "0s" },
  { top: "22%", animationDuration: "21s", animationDelay: "5s" },
  { top: "8%", animationDuration: "26s", animationDelay: "11s" },
  { top: "30%", animationDuration: "19s", animationDelay: "8s" },
];

const LEAVES: React.CSSProperties[] = [
  { left: "6%", animationDuration: "11s", animationDelay: "0s", background: "#ff7a1a" },
  { left: "18%", animationDuration: "14s", animationDelay: "3s", background: "#d4a373" },
  { left: "32%", animationDuration: "12s", animationDelay: "6s", background: "#aa1e22" },
  { left: "47%", animationDuration: "15s", animationDelay: "1s", background: "#ff7a1a" },
  { left: "61%", animationDuration: "11s", animationDelay: "4s", background: "#c97b2d" },
  { left: "74%", animationDuration: "13s", animationDelay: "7s", background: "#d4a373" },
  { left: "86%", animationDuration: "16s", animationDelay: "2s", background: "#ff7a1a" },
  { left: "94%", animationDuration: "12s", animationDelay: "9s", background: "#aa1e22" },
];

export function SeasonalThemeOverlay({
  enabled,
  theme,
}: {
  enabled?: boolean;
  theme?: string;
}) {
  if (!enabled || theme !== "halloween") return null;

  return (
    <div
      className="seasonal-halloween pointer-events-none absolute inset-0 z-[5] overflow-hidden"
      aria-hidden="true"
    >
      <div className="seasonal-fog seasonal-fog-1" />
      <div className="seasonal-fog seasonal-fog-2" />
      <div className="seasonal-pumpkin-glow seasonal-pumpkin-glow-left" />
      <div className="seasonal-pumpkin-glow seasonal-pumpkin-glow-right" />
      {BATS.map((style, i) => (
        <Bat key={i} style={style} />
      ))}
      {LEAVES.map((style, i) => (
        <span key={i} className="seasonal-leaf" style={style} />
      ))}
    </div>
  );
}
