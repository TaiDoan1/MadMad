import { Request, Response, NextFunction } from "express";
import { verifyAdminToken } from "../routes/auth.routes";

/**
 * Middleware bảo mật API Admin
 * Cho phép request có Header `x-admin-key` là JWT hợp lệ
 */
export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  // Bỏ qua kiểm tra đối với phương thức OPTIONS (CORS preflight)
  if (req.method === "OPTIONS") {
    return next();
  }

  const adminKey = req.headers["x-admin-key"];

  if (!adminKey) {
    return res.status(401).json({
      error: true,
      message: "Quyền truy cập bị từ chối. Vui lòng cung cấp khóa xác thực!"
    });
  }

  const isValid = verifyAdminToken(String(adminKey));

  if (!isValid) {
    return res.status(401).json({
      error: true,
      message: "Quyền truy cập bị từ chối. Khóa xác thực không hợp lệ hoặc đã hết hạn!"
    });
  }

  next();
}
