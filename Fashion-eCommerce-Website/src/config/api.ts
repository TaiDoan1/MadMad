/**
 * 🌐 Cấu hình API Endpoint cho MADMAD Studio
 * Tự động nhận diện môi trường để trỏ tới server local hoặc server chạy thật trực tuyến.
 */

export const API_BASE_URL = import.meta.env.DEV
  ? "http://localhost:5000"
  : "https://madmad-backend.vercel.app";

export const API_URL = `${API_BASE_URL}/api`;
