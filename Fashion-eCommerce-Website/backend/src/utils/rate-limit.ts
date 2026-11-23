import type { Request, Response, NextFunction } from "express";

/**
 * Lấy IP của client.
 * Ưu tiên phần đầu của header x-forwarded-for (khi chạy sau proxy),
 * rồi tới req.socket.remoteAddress, cuối cùng là "unknown".
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string") {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  } else if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    const first = forwardedFor[0]?.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return req.socket?.remoteAddress ?? "unknown";
}

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
}): (req: Request, res: Response, next: NextFunction) => void {
  const { windowMs, max } = options;
  const requestsByIp = new Map<string, number[]>();

  // Dọn định kỳ các IP không còn request nào trong window,
  // tránh Map phình to vô hạn theo thời gian.
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    const cutoff = now - windowMs;
    for (const [ip, timestamps] of requestsByIp) {
      const kept = timestamps.filter((timestamp) => timestamp > cutoff);
      if (kept.length === 0) {
        requestsByIp.delete(ip);
      } else if (kept.length !== timestamps.length) {
        requestsByIp.set(ip, kept);
      }
    }
  }, 60_000);
  if (typeof cleanupInterval.unref === "function") {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = getClientIp(req);
    const now = Date.now();
    const cutoff = now - windowMs;
    const timestamps = (requestsByIp.get(ip) ?? []).filter(
      (timestamp) => timestamp > cutoff,
    );

    if (timestamps.length >= max) {
      requestsByIp.set(ip, timestamps);
      res.status(429).json({
        error: true,
        message: options.message || "Quá nhiều yêu cầu, vui lòng thử lại sau.",
      });
      return;
    }

    timestamps.push(now);
    requestsByIp.set(ip, timestamps);
    next();
  };
}
