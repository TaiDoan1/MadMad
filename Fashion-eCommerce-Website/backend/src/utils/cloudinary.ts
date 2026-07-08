import { v2 as cloudinary } from "cloudinary";
import { prisma } from "../config/prisma";

// Cấu hình Cloudinary sử dụng biến môi trường
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Tải ảnh hoặc video (dạng Base64 hoặc URL trực tiếp) lên Cloudinary.
 * Trả về link URL bảo mật (secure_url) từ Cloudinary CDN.
 * Nếu đã là URL sẵn (bắt đầu bằng http/https), giữ nguyên.
 */
export async function uploadToCloudinary(imageStr: string): Promise<string> {
  if (!imageStr) return "";

  // Nếu đã là URL Cloudinary, trả về nguyên trạng
  if (imageStr.startsWith("http://") || imageStr.startsWith("https://")) {
    console.log(`☁️  [CLOUDINARY] Media đã là URL CDN, giữ nguyên.`);
    return imageStr;
  }

  const isVideo = imageStr.startsWith("data:video/");

  // Nếu không phải dạng data URL Base64 (ảnh hoặc video), giữ nguyên
  if (!imageStr.startsWith("data:image/") && !isVideo) {
    return imageStr;
  }

  const originalKB = Math.round(imageStr.length / 1024);
  console.log(`☁️  [CLOUDINARY] Phát hiện ${isVideo ? "video" : "ảnh"} Base64 (~${originalKB} KB), đang upload lên CDN...`);

  try {
    const result = await cloudinary.uploader.upload(imageStr, {
      folder: isVideo ? "madmad-hero-videos" : "madmad-products",
      resource_type: isVideo ? "video" : "image",
    });
    const savedKB = originalKB - Math.round((result.bytes || 0) / 1024);
    console.log(`✅ [CLOUDINARY] Upload thành công! URL: ${result.secure_url.substring(0, 60)}...`);
    console.log(`   Dung lượng gốc: ~${originalKB} KB → Trên CDN: ${Math.round((result.bytes || 0) / 1024)} KB (tiết kiệm ~${savedKB} KB)`);
    
    // Lưu log vào database để xem trên xem-log.cjs
    prisma.systemLog.create({
      data: {
        level: "success",
        source: "backend",
        message: `☁️ [CLOUDINARY] Upload thành công ảnh Base64 (~${originalKB} KB) -> CDN: ${Math.round((result.bytes || 0) / 1024)} KB (tiết kiệm ~${savedKB} KB)`,
        details: JSON.stringify({ url: result.secure_url, bytes: result.bytes }),
      }
    }).catch(() => {});

    return result.secure_url;
  } catch (error: any) {
    console.error(`❌ [CLOUDINARY ERROR] Không thể tải ảnh lên: ${error.message || error}`);
    console.error(`   Nguyên nhân có thể: Sai credentials hoặc mất kết nối mạng.`);
    
    // Lưu log lỗi vào database để xem trên xem-log.cjs
    prisma.systemLog.create({
      data: {
        level: "error",
        source: "backend",
        message: `❌ [CLOUDINARY ERROR] Lỗi upload ảnh: ${error.message || error}`,
        details: JSON.stringify({ error: error.message || String(error) }),
      }
    }).catch(() => {});

    return imageStr;
  }
}


