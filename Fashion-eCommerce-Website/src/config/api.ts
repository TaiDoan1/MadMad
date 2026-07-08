/**
 * 🌐 Cấu hình API Endpoint cho MADMAD Studio
 * Tự động nhận diện môi trường để trỏ tới server local hoặc server chạy thật trực tuyến.
 * Bổ sung cơ chế thông minh tự động fallback sang Production live nếu local backend chưa chạy.
 */

import { safeLocalStorage } from "@/utils/safe-storage";

// 🌐 Đọc URL backend từ biến môi trường VITE_API_URL (set trên Railway/Vercel)
const envApiUrl = import.meta.env.VITE_API_URL as string | undefined;

let base = envApiUrl ? envApiUrl.replace(/\/api\/?$/, "") : "https://madmad-production.up.railway.app";

if (import.meta.env.DEV) {
  const localOffline = typeof window !== "undefined" && safeLocalStorage.getItem("madmad.local-backend-offline") === "true";
  if (!localOffline) {
    base = "http://localhost:5000";
  }
}

export const API_BASE_URL = base;
export const API_URL = import.meta.env.DEV ? `${API_BASE_URL}/api` : (envApiUrl || `${API_BASE_URL}/api`);

// Hàm hỗ trợ chuyển đổi nhanh sang Production khi phát hiện kết nối local thất bại
export function markLocalBackendOffline(offline: boolean) {
  if (typeof window !== "undefined") {
    if (offline) {
      safeLocalStorage.setItem("madmad.local-backend-offline", "true");
    } else {
      safeLocalStorage.removeItem("madmad.local-backend-offline");
    }
  }
}

// 🔑 Nhập Google Client ID của bạn ở đây để đồng bộ hóa cho toàn bộ website
export const GOOGLE_CLIENT_ID = "510445218979-m81v10hm2hj8kuj3egjiip9ieft8a27k.apps.googleusercontent.com";

// 🔑 Khóa bí mật giao tiếp API Admin (Tải động từ localStorage thay vì lưu cứng mã độc hại)
export const getAdminKey = (): string => {
  if (typeof window !== "undefined") {
    return safeLocalStorage.getItem("fashion-ecommerce.admin-token") || "";
  }
  return "";
};


