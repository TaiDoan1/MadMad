/**
 * 🌐 Cấu hình API Endpoint cho MADMAD Studio
 * Tự động nhận diện môi trường để trỏ tới server local hoặc server chạy thật trực tuyến.
 */

export const API_BASE_URL = import.meta.env.DEV
  ? "http://localhost:5000"
  : "https://madmad-backend.vercel.app";

export const API_URL = `${API_BASE_URL}/api`;

// 🔑 Nhập Google Client ID của bạn ở đây để đồng bộ hóa cho toàn bộ website
export const GOOGLE_CLIENT_ID = "510445218979-m81v10hm2hj8kuj3egjiip9ieft8a27k.apps.googleusercontent.com";
