/**
 * 🌐 Cấu hình API Endpoint cho MADMAD Studio
 * Tự động nhận diện môi trường để trỏ tới server local hoặc server chạy thật trực tuyến.
 * Bổ sung cơ chế thông minh tự động fallback sang Production live nếu local backend chưa chạy.
 */

let base = "https://madmad-backend.vercel.app";

if (import.meta.env.DEV) {
  const localOffline = typeof window !== "undefined" && window.localStorage.getItem("madmad.local-backend-offline") === "true";
  if (!localOffline) {
    base = "http://localhost:5000";
  }
}

export const API_BASE_URL = base;
export const API_URL = `${API_BASE_URL}/api`;

// Hàm hỗ trợ chuyển đổi nhanh sang Production khi phát hiện kết nối local thất bại
export function markLocalBackendOffline(offline: boolean) {
  if (typeof window !== "undefined") {
    if (offline) {
      window.localStorage.setItem("madmad.local-backend-offline", "true");
      console.warn("⚠️ [MADMAD SDK] Đã đánh dấu Local Backend offline. Tự động chuyển hướng sang Production live!");
    } else {
      window.localStorage.removeItem("madmad.local-backend-offline");
      console.log("🔌 [MADMAD SDK] Khôi phục kết nối tới Local Backend.");
    }
  }
}

// 🔑 Nhập Google Client ID của bạn ở đây để đồng bộ hóa cho toàn bộ website
export const GOOGLE_CLIENT_ID = "510445218979-m81v10hm2hj8kuj3egjiip9ieft8a27k.apps.googleusercontent.com";

