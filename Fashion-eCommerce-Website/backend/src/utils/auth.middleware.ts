import { Request, Response, NextFunction } from "express";

/**
 * Middleware bảo mật API Admin
 * Chỉ cho phép các request có mã khóa bảo mật chính xác trong Header `x-admin-key`
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  // Bỏ qua kiểm tra đối với phương thức OPTIONS (CORS preflight)
  if (req.method === "OPTIONS") {
    return next();
  }

  const adminKey = req.headers["x-admin-key"];
  const expectedKey = process.env.ADMIN_SECRET_KEY || "MADMAD_DEFAULT_SECRET_KEY_2026";

  if (!adminKey || adminKey !== expectedKey) {
    console.warn(`⚠️ [SECURITY ALERT] Unauthorized access blocked from IP: ${req.ip} on URL: ${req.originalUrl}`);
    return res.status(401).json({
      error: true,
      message: "Quyền truy cập bị từ chối. Bạn không có quyền truy cập thông tin này!"
    });
  }

  next();
}
