import { brandLogo } from "@/assets/images";

/**
 * Logo MADMAD nhỏ chạy vòng quanh viền màn hình cho vui mắt 🐱
 * Cố định theo viewport (không cuộn theo trang), không chặn click.
 */
export function BorderRunner() {
  return (
    <img
      src={brandLogo}
      alt=""
      aria-hidden="true"
      className="border-runner fixed z-[70] h-8 w-8 rounded-full bg-white object-contain p-1 shadow-md pointer-events-none select-none"
    />
  );
}
