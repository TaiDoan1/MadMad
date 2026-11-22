import { API_URL } from "@/config/api";

// 📡 Telemetry tối giản, không tài khoản ngoài:
// - Báo lỗi client về POST /api/client-errors (tối đa ~200 lỗi gần nhất trong DB).
// - Beacon lượt xem trang về POST /api/page-views (chỉ ngày + đường dẫn + số lượt).
// Mọi lần gửi đều fire-and-forget và KHÔNG BAO GIỜ throw — bản thân việc gửi lỗi
// mà lỗi thì bỏ qua, không gửi nữa, không tạo vòng lặp.

let telemetryStarted = false;

function postTelemetry(path: string, payload: Record<string, unknown>): void {
  try {
    const body = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(`${API_URL}${path}`, new Blob([body], { type: "application/json" }));
      return;
    }
    fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Bỏ qua mọi lỗi khi gửi telemetry.
  }
}

export function reportClientError(message: string, path?: string, stack?: string): void {
  try {
    postTelemetry("/client-errors", {
      message: String(message).slice(0, 1000),
      path: (path ?? window.location.pathname).slice(0, 500),
      occurredAt: new Date().toISOString(),
      stack: stack ? String(stack).slice(0, 5000) : undefined,
    });
  } catch {
    // Không throw — tránh vòng lặp báo lỗi.
  }
}

export function sendPageView(path: string): void {
  try {
    const clean = (path || "/").split(/[?#]/)[0].slice(0, 200) || "/";
    postTelemetry("/page-views", { path: clean });
  } catch {
    // Không chặn hiển thị trang.
  }
}

type RouterLike = {
  subscribe: (listener: (state: { location: { pathname: string } }) => void) => () => void;
};

export function initClientTelemetry(router: RouterLike): void {
  if (telemetryStarted || typeof window === "undefined") return;
  telemetryStarted = true;

  window.addEventListener("error", (event) => {
    reportClientError(
      event.message || "window.onerror",
      window.location.pathname,
      (event.error as Error | undefined)?.stack,
    );
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason as { message?: unknown; stack?: unknown } | null;
    reportClientError(
      typeof reason?.message === "string" ? reason.message : String(reason ?? "unhandledrejection"),
      window.location.pathname,
      typeof reason?.stack === "string" ? reason.stack : undefined,
    );
  });

  // Lượt xem trang đầu tiên + mỗi lần đổi route (SPA không tải lại trang).
  sendPageView(window.location.pathname);
  try {
    if (router && typeof router.subscribe === "function") {
      router.subscribe((state) => {
        sendPageView(state.location.pathname);
      });
    }
  } catch {
    // Router không hỗ trợ subscribe thì chỉ ghi lượt xem đầu trang.
  }
}
