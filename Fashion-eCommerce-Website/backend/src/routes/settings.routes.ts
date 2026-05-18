import { Router } from "express";
import { prisma } from "../config/prisma";
import { sendManualCustomEmail } from "../services/email.service";

const router = Router();

// 1. GET /api/settings - Lấy cấu hình Storefront (Tự tạo dòng 1 nếu chưa tồn tại)
router.get("/", async (req, res, next) => {
  try {
    let setting = await prisma.storefrontSetting.findUnique({
      where: { id: 1 }
    });

    if (!setting) {
      // Khởi tạo cấu hình mặc định ban đầu bao gồm cả SMTP
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
          printInvoicePolicy: "* Quý khách vui lòng kiểm tra kỹ sản phẩm khi nhận hàng. Đối với các yêu cầu đổi trả sản phẩm nguyên tag mác, xin hãy nhắn tin trực tiếp fanpage Facebook/Instagram của MADMAD Studio trong vòng 3 ngày kể từ ngày nhận hàng.",
          storeEmail: "mmadmadstudio@gmail.com",
          storePhone: "+84 123 456 789",
          storeAddress: "123 Fashion Street, Ho Chi Minh City",
          customerEmailSubject: "[{{brandName}}] ĐẶT HÀNG THÀNH CÔNG - ĐƠN HÀNG {{orderNumber}}",
          customerEmailTemplate: "Chào bạn <strong>{{customerName}}</strong>,<br><br>Cám ơn bạn đã lựa chọn nổi loạn và khẳng định cá tính cùng <strong>{{brandName}}</strong>. Chúng tôi xác nhận đã nhận được đơn hàng của bạn và đang tiến hành đóng gói siêu tốc!",
          smtpHost: "smtp.gmail.com",
          smtpPort: 587,
          smtpUser: "mmadmadstudio@gmail.com",
          smtpPass: "yxmbctjhsxkyeznx",
          smtpSenderName: "MADMAD STUDIO"
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

// 2. PUT /api/settings - Cập nhật cấu hình Storefront (Admin) bao gồm SMTP
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
      printInvoicePolicy,
      
      // Nhận diện cấu hình cửa hàng mới
      storeEmail,
      storePhone,
      storeAddress,

      // Nhận diện SMTP cấu hình mới
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpSenderName,

      // Nhận diện mẫu email động mới
      customerEmailSubject,
      customerEmailTemplate
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
        printInvoicePolicy,
        
        // Cập nhật cấu hình cửa hàng
        storeEmail,
        storePhone,
        storeAddress,

        // Cấu hình email khách hàng
        customerEmailSubject,
        customerEmailTemplate,

        // Cập nhật SMTP động
        smtpHost,
        smtpPort: smtpPort ? Number(smtpPort) : undefined,
        smtpUser,
        smtpPass,
        smtpSenderName
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
        printInvoicePolicy,
        
        // Khởi tạo cấu hình cửa hàng
        storeEmail: storeEmail || "contact@madmad.studio",
        storePhone: storePhone || "+84 123 456 789",
        storeAddress: storeAddress || "123 Fashion Street, Ho Chi Minh City",

        // Mẫu email khách hàng
        customerEmailSubject: customerEmailSubject || "[{{brandName}}] ĐẶT HÀNG THÀNH CÔNG - ĐƠN HÀNG {{orderNumber}}",
        customerEmailTemplate: customerEmailTemplate || "Chào bạn <strong>{{customerName}}</strong>,<br><br>Cám ơn bạn đã lựa chọn nổi loạn và khẳng định cá tính cùng <strong>{{brandName}}</strong>. Chúng tôi xác nhận đã nhận được đơn hàng của bạn và đang tiến hành đóng gói siêu tốc!",

        // Khởi tạo SMTP động
        smtpHost: smtpHost || "smtp.gmail.com",
        smtpPort: smtpPort ? Number(smtpPort) : 587,
        smtpUser: smtpUser || "mmadmadstudio@gmail.com",
        smtpPass: smtpPass || "yxmbctjhsxkyeznx",
        smtpSenderName: smtpSenderName || "MADMAD STUDIO"
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

// 3. POST /api/settings/send-test-email - Gửi email thủ công trực tiếp từ Admin Form
router.post("/send-test-email", async (req, res, next) => {
  try {
    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ message: "Vui lòng điền đầy đủ các thông tin: Người nhận, Tiêu đề và Nội dung thư!" });
    }

    console.log(`📡 [API DIRECT MAIL] Yêu cầu gửi mail thủ công tới: "${to}"`);
    const info = await sendManualCustomEmail(to.trim(), subject.trim(), body.trim());

    res.json({
      success: true,
      message: "Gửi email thành công!",
      messageId: info.messageId
    });
  } catch (error: any) {
    console.error("❌ Lỗi khi gửi email thủ công từ API:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Gửi email thất bại! Vui lòng kiểm tra lại cấu hình SMTP của bạn."
    });
  }
});

export default router;
