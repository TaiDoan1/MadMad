import runnerIcon from "@/imports/logo-m-drip.png";

/**
 * Logo MADMAD nhỏ chạy vòng quanh viền màn hình cho vui mắt 🐱
 * Cố định theo viewport (không cuộn theo trang), không chặn click.
 */
export function BorderRunner() {
  return (
    <img
      src={runnerIcon}
      alt=""
      aria-hidden="true"
      className="border-runner fixed z-[70] h-8 w-8 object-contain drop-shadow-md pointer-events-none select-none"
    />
  );
}
