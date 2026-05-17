import { Router } from "express";
import { prisma } from "../config/prisma";

const router = Router();

// 1. GET /api/settings - Lấy cấu hình Storefront (Tự tạo dòng 1 nếu chưa tồn tại)
router.get("/", async (req, res, next) => {
  try {
    let setting = await prisma.storefrontSetting.findUnique({
      where: { id: 1 }
    });

    if (!setting) {
      // Khởi tạo cấu hình mặc định ban đầu
      setting = await prisma.storefrontSetting.create({
        data: {
          id: 1,
          brandName: "MADMAD STUDIO",
          logoUrl: "",
          manifestoSlogan: "NOIR NO DESIGN STANDARD . TỐI GIẢN . ĐỘC BẢN . CAO CẤP",
          facebookUrl: "https://facebook.com/madmad.studio",
          instagramUrl: "https://instagram.com/madmad.studio",
          tiktokUrl: "https://tiktok.com/@madmad.studio",
          shopeeUrl: "https://shopee.vn/madmad.studio",
          instagramImages: JSON.stringify([]),
          printInvoiceTitle: "HÓA ĐƠN VẬN CHUYỂN & GÓI HÀNG",
          printInvoiceAddress: "Showroom: 254 Nguyễn Trãi, Q.5, TP.HCM",
          printInvoicePhone: "Hotline: 099.999.9999",
          printInvoiceFooterSlogan: "CẢM ƠN QUÝ KHÁCH ĐÃ CHỌN MADMAD STUDIO!",
          printInvoicePolicy: "* Quý khách vui lòng kiểm tra kỹ sản phẩm khi nhận hàng. Đối với các yêu cầu đổi trả sản phẩm nguyên tag mác, xin hãy nhắn tin trực tiếp fanpage Facebook/Instagram của MADMAD Studio trong vòng 3 ngày kể từ ngày nhận hàng."
        }
      });
    }

    // Parse mảng ảnh Instagram dạng JSON String trước khi trả về
    res.json({
      ...setting,
      instagramImages: setting.instagramImages ? JSON.parse(setting.instagramImages) : []
    });
  } catch (error) {
    next(error);
  }
});

// 2. PUT /api/settings - Cập nhật cấu hình Storefront (Admin)
router.put("/", async (req, res, next) => {
  try {
    const {
      brandName,
      logoUrl,
      manifestoSlogan,
      facebookUrl,
      instagramUrl,
      tiktokUrl,
      shopeeUrl,
      instagramImages,
      printInvoiceTitle,
      printInvoiceAddress,
      printInvoicePhone,
      printInvoiceFooterSlogan,
      printInvoicePolicy
    } = req.body;

    const instagramImagesStr = Array.isArray(instagramImages) 
      ? JSON.stringify(instagramImages) 
      : (typeof instagramImages === "string" ? instagramImages : undefined);

    const updatedSetting = await prisma.storefrontSetting.upsert({
      where: { id: 1 },
      update: {
        brandName,
        logoUrl,
        manifestoSlogan,
        facebookUrl,
        instagramUrl,
        tiktokUrl,
        shopeeUrl,
        instagramImages: instagramImagesStr,
        printInvoiceTitle,
        printInvoiceAddress,
        printInvoicePhone,
        printInvoiceFooterSlogan,
        printInvoicePolicy
      },
      create: {
        id: 1,
        brandName: brandName || "MADMAD STUDIO",
        logoUrl,
        manifestoSlogan,
        facebookUrl,
        instagramUrl,
        tiktokUrl,
        shopeeUrl,
        instagramImages: instagramImagesStr || "[]",
        printInvoiceTitle,
        printInvoiceAddress,
        printInvoicePhone,
        printInvoiceFooterSlogan,
        printInvoicePolicy
      }
    });

    res.json({
      ...updatedSetting,
      instagramImages: updatedSetting.instagramImages ? JSON.parse(updatedSetting.instagramImages) : []
    });
  } catch (error) {
    next(error);
  }
});

export default router;
