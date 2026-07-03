import { Request, Response, NextFunction } from "express";
import { verifyAdminToken } from "../routes/auth.routes";

/**
 * Middleware bảo mật API Admin
 * Cho phép request có Header `x-admin-key` khớp với Token phiên làm việc động hoặc Key tĩnh bí mật
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  // Bỏ qua kiểm tra đối với phương thức OPTIONS (CORS preflight)
  if (req.method === "OPTIONS") {
    return next();
  }

  const adminKey = req.headers["x-admin-key"];
  const expectedStaticKey = process.env.ADMIN_SECRET_KEY || "MADMAD_DEFAULT_SECRET_KEY_2026";

  if (!adminKey) {
    console.warn(`⚠️ [SECURITY ALERT] Denied access from IP: ${req.ip} - Missing admin key header`);
    return res.status(401).json({
      error: true,
      message: "Quyền truy cập bị từ chối. Vui lòng cung cấp khóa xác thực!"
    });
  }

  const isStaticValid = adminKey === expectedStaticKey;
  const isTokenValid = verifyAdminToken(String(adminKey));

  if (!isStaticValid && !isTokenValid) {
    console.warn(`⚠️ [SECURITY ALERT] Unauthorized access blocked from IP: ${req.ip} on URL: ${req.originalUrl}`);
    return res.status(401).json({
      error: true,
      message: "Quyền truy cập bị từ chối. Khóa xác thực không hợp lệ hoặc đã hết hạn!"
    });
  }

  next();
}
