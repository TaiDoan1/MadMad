import { v2 as cloudinary } from "cloudinary";

// Cấu hình Cloudinary sử dụng biến môi trường
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Tải ảnh (dạng Base64 hoặc URL trực tiếp) lên Cloudinary.
 * Trả về link URL ảnh bảo mật (secure_url) từ Cloudinary CDN.
 * Nếu ảnh đã là URL sẵn (bắt đầu bằng http/https), giữ nguyên.
 */
export async function uploadToCloudinary(imageStr: string): Promise<string> {
  if (!imageStr) return "";

  // Nếu đã là URL, trả về nguyên trạng
  if (imageStr.startsWith("http://") || imageStr.startsWith("https://")) {
    return imageStr;
  }

  // Nếu không phải dạng data URL Base64, giữ nguyên
  if (!imageStr.startsWith("data:image/")) {
    return imageStr;
  }

  try {
    const result = await cloudinary.uploader.upload(imageStr, {
      folder: "madmad-products",
    });
    return result.secure_url;
  } catch (error: any) {
    console.error("❌ [CLOUDINARY ERROR] Không thể tải ảnh lên:", error.message || error);
    // Trả về ảnh gốc thay vì crash để tránh gián đoạn tính năng
    return imageStr;
  }
}
