import { Router } from "express";
import { prisma } from "../config/prisma";
import { sendManualCustomEmail } from "../services/email.service";
import { requireAdminAuth } from "../utils/auth.middleware";

const router = Router();

// 🗑️ In-memory cache invalidation timestamp (no database needed)
let cacheInvalidationTimestamp = Date.now();

// 🚫 Prevent browser caching for dynamic data (settings, cache-version)
router.use((req, res, next) => {
  res.set("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
  next();
});

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
          smtpSenderName: "MADMAD STUDIO",

          couponsJson: "[]",
          productOptionsJson: "{}",
          membershipTiersJson: "[]",
          sizeGuideJson: "{}",
        }
      });
    }

    console.log("⚙️ [GET /settings] Loaded setting status from database:");
    console.log(`- enableCod: ${setting.enableCod}`);
    console.log(`- enableBank: ${setting.enableBank}`);
    console.log(`- enableMomo: ${setting.enableMomo}`);
    console.log(`- enablePaypal: ${setting.enablePaypal}`);
    console.log(`- bankAccount: ${setting.bankAccount}`);

    // Parse mảng ảnh Instagram dạng JSON String trước khi trả về
    const coupons = setting.couponsJson ? JSON.parse(setting.couponsJson) : [];
    const productOptions = setting.productOptionsJson ? JSON.parse(setting.productOptionsJson) : {};
    const membershipTiers = setting.membershipTiersJson ? JSON.parse(setting.membershipTiersJson) : [];
    const sizeGuide = setting.sizeGuideJson ? JSON.parse(setting.sizeGuideJson) : {};
    const instagramImages = setting.instagramImages ? JSON.parse(setting.instagramImages) : [];

    // Kiểm tra quyền Admin. Nếu có header x-admin-key hợp lệ, cho phép trả về đầy đủ.
    // Nếu là client công khai thông thường (khách mua hàng), ẩn toàn bộ các trường nhạy cảm.
    const adminKey = req.headers["x-admin-key"] as string;
    
    // Hỗ trợ kiểm tra cả Token phiên động và Khóa tĩnh bí mật
    const expectedStaticKey = process.env.ADMIN_SECRET_KEY || "MADMAD_DEFAULT_SECRET_KEY_2026";
    const isStaticValid = adminKey === expectedStaticKey;
    
    const { verifyAdminToken } = require("./auth.routes");
    const isTokenValid = adminKey && typeof verifyAdminToken === "function" && verifyAdminToken(adminKey);
    
    const isAdmin = isStaticValid || isTokenValid;

    const CryptoJS = require("crypto-js");
    const ENCRYPTION_KEY = "MADMAD_SECURE_PAYLOAD_KEY_2026";

    let rawData: any;
    if (isAdmin) {
      rawData = {
        ...setting,
        instagramImages,
        coupons,
        productOptions,
        membershipTiers,
        sizeGuide,
      };
    } else {
      // Ẩn đi các trường nhạy cảm (SMTP, API keys...) nhưng vẫn giữ thông tin thanh toán
      // vì khách hàng cần số tài khoản/momo để thực hiện chuyển khoản khi checkout
      rawData = {
        id: setting.id,
        brandName: setting.brandName,
        logoUrl: setting.logoUrl,
        manifestoSlogan: setting.manifestoSlogan,
        facebookUrl: setting.facebookUrl,
        instagramUrl: setting.instagramUrl,
        tiktokUrl: setting.tiktokUrl,
        shopeeUrl: setting.shopeeUrl,
        instagramImages,
        storeEmail: setting.storeEmail,
        storePhone: setting.storePhone,
        storeAddress: setting.storeAddress,
        enableCod: setting.enableCod,
        enableBank: setting.enableBank,
        enableMomo: setting.enableMomo,
        enablePaypal: setting.enablePaypal,
        // 💳 Thông tin thanh toán - khách hàng cần thấy để chuyển khoản
        bankId: setting.bankId,
        bankAccount: setting.bankAccount,
        bankAccountName: setting.bankAccountName,
        momoPhone: setting.momoPhone,
        momoAccountName: setting.momoAccountName,
        shippingFeeStandard: setting.shippingFeeStandard,
        shippingFeeExpress: setting.shippingFeeExpress,
        shippingFreeThreshold: setting.shippingFreeThreshold,
        shippingExpressCities: setting.shippingExpressCities,
        currencyMode: setting.currencyMode,
        exchangeRate: setting.exchangeRate,
        intlConversionFeePercent: setting.intlConversionFeePercent,
        intlShippingFee: setting.intlShippingFee,
        intlMarkupPercent: setting.intlMarkupPercent,
        productOptions,
        membershipTiers,
        sizeGuide,
      };
    }

    // Thực hiện mã hóa AES toàn bộ dữ liệu trước khi phản hồi về Client
    const cipherText = CryptoJS.AES.encrypt(JSON.stringify(rawData), ENCRYPTION_KEY).toString();
    res.json({ encryptedPayload: cipherText });
  } catch (error) {
    next(error);
  }
});

// 2. PUT /api/settings - Cập nhật cấu hình Storefront (Admin) bao gồm SMTP
router.put("/", requireAdminAuth, async (req, res, next) => {
  try {
    const {
      brandName,
      logoUrl,
      manifestoSlogan,
      storeName,
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
      customerEmailTemplate,

      // 💳 Cổng Thanh Toán & Vận Chuyển
      bankId,
      bankAccount,
      bankAccountName,
      momoPhone,
      momoAccountName,
      enableCod,
      enableBank,
      enableMomo,
      enablePaypal,
      shippingFeeStandard,
      shippingFeeExpress,
      shippingFreeThreshold,
      shippingExpressCities,
      orderAutoCancelHours,

      // 🌐 Cấu hình Tiền tệ Quốc tế
      currencyMode,
      exchangeRate,
      intlConversionFeePercent,
      intlShippingFee,
      intlMarkupPercent,

      // 🖨️ Hóa đơn in thêm
      printInvoiceSubheader,
      printInvoiceBankId,
      printInvoiceBankAccount,
      printInvoiceAccountName,

      // 🎟️ Coupons
      coupons,

      // 📦 Product options
      productOptions,

      // 👑 Membership tiers
      membershipTiers,

      // 📏 Size guide (gợi ý size)
      sizeGuide,
    } = req.body;

    console.log("📥 [PUT /settings] Received request to update settings:");
    console.log("- enableCod:", enableCod);
    console.log("- enableBank:", enableBank);
    console.log("- enableMomo:", enableMomo);
    console.log("- enablePaypal:", enablePaypal);
    console.log("- bankAccount:", bankAccount);

    const instagramImagesStr = Array.isArray(instagramImages) 
      ? JSON.stringify(instagramImages) 
      : (typeof instagramImages === "string" ? instagramImages : undefined);

    const couponsJson =
      coupons !== undefined ? JSON.stringify(Array.isArray(coupons) ? coupons : []) : undefined;

    const productOptionsJson =
      productOptions !== undefined ? JSON.stringify(typeof productOptions === "object" && productOptions ? productOptions : {}) : undefined;

    const membershipTiersJson =
      membershipTiers !== undefined ? JSON.stringify(Array.isArray(membershipTiers) ? membershipTiers : []) : undefined;

    const sizeGuideJson =
      sizeGuide !== undefined ? JSON.stringify(typeof sizeGuide === "object" && sizeGuide ? sizeGuide : {}) : undefined;

    const updatedSetting = await prisma.storefrontSetting.upsert({
      where: { id: 1 },
      update: {
        brandName,
        storeName,
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
        smtpPort: smtpPort !== undefined ? Number(smtpPort) : undefined,
        smtpUser,
        smtpPass,
        smtpSenderName,

        // 💳 Cổng Thanh Toán & Vận Chuyển
        bankId,
        bankAccount,
        bankAccountName,
        momoPhone,
        momoAccountName,
        enableCod: enableCod !== undefined ? Boolean(enableCod) : undefined,
        enableBank: enableBank !== undefined ? Boolean(enableBank) : undefined,
        enableMomo: enableMomo !== undefined ? Boolean(enableMomo) : undefined,
        enablePaypal: enablePaypal !== undefined ? Boolean(enablePaypal) : undefined,
        shippingFeeStandard: shippingFeeStandard !== undefined ? Number(shippingFeeStandard) : undefined,
        shippingFeeExpress: shippingFeeExpress !== undefined ? Number(shippingFeeExpress) : undefined,
        shippingFreeThreshold: shippingFreeThreshold !== undefined ? Number(shippingFreeThreshold) : undefined,
        shippingExpressCities,
        orderAutoCancelHours: orderAutoCancelHours !== undefined ? Number(orderAutoCancelHours) : undefined,

        // 🌐 Cấu hình Tiền tệ Quốc tế
        currencyMode,
        exchangeRate: exchangeRate !== undefined ? Number(exchangeRate) : undefined,
        intlConversionFeePercent: intlConversionFeePercent !== undefined ? Number(intlConversionFeePercent) : undefined,
        intlShippingFee: intlShippingFee !== undefined ? Number(intlShippingFee) : undefined,
        intlMarkupPercent: intlMarkupPercent !== undefined ? Number(intlMarkupPercent) : undefined,

        // 🖨️ Hóa đơn in thêm
        printInvoiceSubheader,
        printInvoiceBankId,
        printInvoiceBankAccount,
        printInvoiceAccountName,

        // 🎟️ Coupons
        couponsJson,

        // 📦 Product options
        productOptionsJson,

        // 👑 Membership tiers
        membershipTiersJson,

        // 📏 Size guide
        sizeGuideJson,
      },
      create: {
        id: 1,
        brandName: brandName || "MADMAD STUDIO",
        storeName: storeName || brandName || "MADMAD Studio",
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
        smtpPort: smtpPort !== undefined ? Number(smtpPort) : 587,
        smtpUser: smtpUser || "mmadmadstudio@gmail.com",
        smtpPass: smtpPass || "yxmbctjhsxkyeznx",
        smtpSenderName: smtpSenderName || "MADMAD STUDIO",

        // 💳 Cổng Thanh Toán & Vận Chuyển
        bankId: bankId || "MB",
        bankAccount: bankAccount || "0999999999",
        bankAccountName: bankAccountName || "MADMAD STUDIO",
        momoPhone: momoPhone || "0999999999",
        momoAccountName: momoAccountName || "MADMAD STUDIO",
        enableCod: enableCod !== undefined ? Boolean(enableCod) : true,
        enableBank: enableBank !== undefined ? Boolean(enableBank) : true,
        enableMomo: enableMomo !== undefined ? Boolean(enableMomo) : true,
        enablePaypal: enablePaypal !== undefined ? Boolean(enablePaypal) : false,
        shippingFeeStandard: shippingFeeStandard !== undefined ? Number(shippingFeeStandard) : 30000,
        shippingFeeExpress: shippingFeeExpress !== undefined ? Number(shippingFeeExpress) : 60000,
        shippingFreeThreshold: shippingFreeThreshold !== undefined ? Number(shippingFreeThreshold) : 500000,
        shippingExpressCities: shippingExpressCities || "79,01",
        orderAutoCancelHours: orderAutoCancelHours !== undefined ? Number(orderAutoCancelHours) : 24,

        // 🌐 Cấu hình Tiền tệ Quốc tế
        currencyMode: currencyMode || "auto",
        exchangeRate: exchangeRate !== undefined ? Number(exchangeRate) : 25000,
        intlConversionFeePercent: intlConversionFeePercent !== undefined ? Number(intlConversionFeePercent) : 3.5,
        intlShippingFee: intlShippingFee !== undefined ? Number(intlShippingFee) : 250000,
        intlMarkupPercent: intlMarkupPercent !== undefined ? Number(intlMarkupPercent) : 10,

        // 🖨️ Hóa đơn in thêm
        printInvoiceSubheader: printInvoiceSubheader || "Tối giản . Độc bản . Cao cấp",
        printInvoiceBankId: printInvoiceBankId || "MB",
        printInvoiceBankAccount: printInvoiceBankAccount || "0999999999",
        printInvoiceAccountName: printInvoiceAccountName || "MADMAD STUDIO",

        // 🎟️ Coupons
        couponsJson: couponsJson ?? "[]",

        // 📦 Product options
        productOptionsJson: productOptionsJson ?? "{}",

        // 👑 Membership tiers
        membershipTiersJson: membershipTiersJson ?? "[]",

        // 📏 Size guide
        sizeGuideJson: sizeGuideJson ?? "{}",
      }
    });

    res.json({
      ...updatedSetting,
      instagramImages: updatedSetting.instagramImages ? JSON.parse(updatedSetting.instagramImages) : [],
      coupons: updatedSetting.couponsJson ? JSON.parse(updatedSetting.couponsJson) : [],
      productOptions: updatedSetting.productOptionsJson ? JSON.parse(updatedSetting.productOptionsJson) : {},
      membershipTiers: updatedSetting.membershipTiersJson ? JSON.parse(updatedSetting.membershipTiersJson) : [],
      sizeGuide: updatedSetting.sizeGuideJson ? JSON.parse(updatedSetting.sizeGuideJson) : {},
    });
  } catch (error) {
    next(error);
  }
});

// 3. POST /api/settings/send-test-email - Gửi email thủ công trực tiếp từ Admin Form
router.post("/send-test-email", requireAdminAuth, async (req, res, next) => {
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

// 10.5 GET /api/settings/test-db - Test database connection
router.get("/test-db", async (req, res) => {
  try {
    const result = await prisma.storefrontSetting.findUnique({ where: { id: 1 } });
    res.json({
      success: true,
      message: result ? "Record found" : "Record not found",
      record: result ? { id: result.id, brandName: result.brandName } : null
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

// 11. POST /api/settings/invalidate-cache - Admin trigger cache invalidation (no database!)
router.post("/invalidate-cache", requireAdminAuth, async (req, res) => {
  try {
    // Update in-memory timestamp - clients will detect change and refetch
    cacheInvalidationTimestamp = Date.now();

    console.log("🗑️ [CACHE INVALIDATE] Admin cleared cache at", new Date().toISOString());

    res.json({
      success: true,
      message: "Cache invalidated! Clients will refetch data on next check.",
      timestamp: cacheInvalidationTimestamp
    });
  } catch (error) {
    console.error("❌ [CACHE INVALIDATE] Error:", error);
    res.status(500).json({ success: false, message: String(error) });
  }
});

// 11b. GET /api/settings/cache-version - Client checks if cache invalidated
router.get("/cache-version", async (req, res) => {
  res.json({ timestamp: cacheInvalidationTimestamp });
});

export default router;
