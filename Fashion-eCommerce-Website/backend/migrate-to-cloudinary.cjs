/**
 * MADMAD STUDIO - DATABASE BASE64 IMAGE MIGRATION TOOL
 * Chạy: node migrate-to-cloudinary.cjs
 * 
 * Công dụng:
 * 1. Quét toàn bộ sản phẩm hiện có trong Neon Postgres.
 * 2. Tìm các ảnh dạng Base64 (image, images, colorImages) đẩy lên Cloudinary.
 * 3. Cập nhật lại Database thành dạng URL ngắn gọn.
 * 4. Quét toàn bộ OrderItem và thay thế ảnh Base64 của sản phẩm thành URL Cloudinary tương ứng.
 */

const { PrismaClient } = require("@prisma/client");
const cloudinary = require("cloudinary").v2;
const path = require("path");
const fs = require("fs");

// 1. Tải cấu hình biến môi trường từ .env cùng thư mục
const backendEnvPath = path.join(__dirname, ".env");
if (fs.existsSync(backendEnvPath)) {
  require("dotenv").config({ path: backendEnvPath });
  console.log("✅ Đã nạp file cấu hình .env");
} else {
  console.error("❌ Không tìm thấy file cấu hình .env. Vui lòng kiểm tra lại đường dẫn.");
  process.exit(1);
}

// Kiểm tra cấu hình Cloudinary
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error("❌ THIẾU CẤU HÌNH CLOUDINARY!");
  console.error("Vui lòng đăng ký tài khoản Cloudinary và điền các trường sau vào file backend/.env trước khi chạy:");
  console.error("  CLOUDINARY_CLOUD_NAME=...");
  console.error("  CLOUDINARY_API_KEY=...");
  console.error("  CLOUDINARY_API_SECRET=...");
  process.exit(1);
}

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const prisma = new PrismaClient();

// Helper upload ảnh Base64 lên Cloudinary
async function uploadImg(base64Str) {
  if (!base64Str) return "";
  if (base64Str.startsWith("http://") || base64Str.startsWith("https://")) {
    return base64Str; // Đã là URL, giữ nguyên
  }
  if (!base64Str.startsWith("data:image/")) {
    return base64Str; // Không phải base64, giữ nguyên
  }
  try {
    const res = await cloudinary.uploader.upload(base64Str, {
      folder: "madmad-products"
    });
    console.log(`   -> Upload thành công: ${res.secure_url.substring(0, 70)}...`);
    return res.secure_url;
  } catch (err) {
    console.error(`   ❌ Lỗi upload Cloudinary:`, err.message);
    return base64Str; // Trả về chuỗi cũ nếu lỗi để tránh mất ảnh
  }
}

async function run() {
  console.log("\n========================================================");
  console.log("  MADMAD STUDIO - BẮT ĐẦU CHUYỂN ĐỔI ẢNH DATABASE");
  console.log("========================================================\n");

  try {
    // --- 1. MIGRATION SẢN PHẨM (PRODUCTS) ---
    console.log("🔄 Bước 1: Quét bảng sản phẩm (Product)...");
    const products = await prisma.product.findMany();
    console.log(`Tìm thấy ${products.length} sản phẩm.`);

    for (const p of products) {
      console.log(`\n📦 Đang xử lý sản phẩm: [${p.sku}] ${p.name}`);
      let updatedData = {};

      // A. Ảnh chính
      if (p.image && p.image.startsWith("data:image/")) {
        console.log(" - Phát hiện ảnh chính là Base64, đang tải lên Cloudinary...");
        updatedData.image = await uploadImg(p.image);
      }

      // B. Bộ sưu tập ảnh phụ (images)
      if (p.images) {
        try {
          const parsedImgs = JSON.parse(p.images);
          if (Array.isArray(parsedImgs)) {
            let hasBase64 = parsedImgs.some(img => img && img.startsWith("data:image/"));
            if (hasBase64) {
              console.log(" - Phát hiện ảnh trong Bộ sưu tập là Base64, đang tải lên...");
              const newImgs = await Promise.all(
                parsedImgs.map(img => uploadImg(img))
              );
              updatedData.images = JSON.stringify(newImgs.filter(Boolean));
            }
          }
        } catch (e) {
          console.warn(" ⚠️ Lỗi đọc trường images:", e.message);
        }
      }

      // C. Ảnh theo màu sắc (colorImages)
      if (p.colorImages) {
        try {
          const parsedColors = JSON.parse(p.colorImages);
          if (typeof parsedColors === "object" && parsedColors !== null) {
            const keys = Object.keys(parsedColors);
            let hasBase64 = keys.some(k => parsedColors[k] && parsedColors[k].startsWith("data:image/"));
            if (hasBase64) {
              console.log(" - Phát hiện ảnh trong Phân loại màu sắc là Base64, đang tải lên...");
              const newColors = {};
              for (const k of keys) {
                newColors[k] = await uploadImg(parsedColors[k]);
              }
              updatedData.colorImages = JSON.stringify(newColors);
            }
          }
        } catch (e) {
          console.warn(" ⚠️ Lỗi đọc trường colorImages:", e.message);
        }
      }

      // Cập nhật database nếu có sự thay đổi
      if (Object.keys(updatedData).length > 0) {
        await prisma.product.update({
          where: { id: p.id },
          data: updatedData
        });
        console.log(` ✅ Đã tối ưu hóa ảnh và cập nhật DB sản phẩm: ${p.name}`);
      } else {
        console.log("  (Sản phẩm đã được tối ưu hóa ảnh sẵn, bỏ qua)");
      }
    }

    // --- 2. MIGRATION CHI TIẾT ĐƠN HÀNG (ORDER ITEMS) ---
    console.log("\n========================================================");
    console.log("🔄 Bước 2: Quét bảng chi tiết đơn hàng (OrderItem)...");
    const orderItems = await prisma.orderItem.findMany();
    console.log(`Tìm thấy ${orderItems.length} chi tiết mặt hàng.`);

    let orderItemsUpdated = 0;
    for (const item of orderItems) {
      if (item.productImage && item.productImage.startsWith("data:image/")) {
        console.log(`\n🛒 Đơn hàng #${item.orderId} - Mặt hàng: ${item.productName}`);
        console.log(" - Phát hiện ảnh mặt hàng là Base64, đang tải lên Cloudinary...");
        const newUrl = await uploadImg(item.productImage);
        
        await prisma.orderItem.update({
          where: { id: item.id },
          data: { productImage: newUrl }
        });
        orderItemsUpdated++;
      }
    }
    console.log(`\n✅ Đã cập nhật xong ${orderItemsUpdated} chi tiết mặt hàng đơn hàng.`);

    console.log("\n========================================================");
    console.log(" 🎉 QUÁ TRÌNH CHUYỂN ĐỔI DATABASE HOÀN THÀNH THÀNH CÔNG!");
    console.log("========================================================\n");

  } catch (err) {
    console.error("❌ Lỗi trong quá trình chuyển đổi database:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

run();
