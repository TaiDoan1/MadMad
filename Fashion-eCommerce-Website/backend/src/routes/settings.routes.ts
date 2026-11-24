import { Router } from "express";
import { prisma } from "../config/prisma";
import { sendManualCustomEmail } from "../services/email.service";
import { requireAdminAuth } from "../utils/auth.middleware";
import { createUploadSignature, uploadToCloudinary } from "../utils/cloudinary";

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
          smtpPass: "",
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

    // 🖼️ Parse hero banner + danh mục phổ biến + best seller (khách hàng cũng cần thấy)
    const heroImages = setting.heroImagesJson ? JSON.parse(setting.heroImagesJson) : [];
    const popularCategoryImages = setting.popularCategoryImagesJson ? JSON.parse(setting.popularCategoryImagesJson) : [];
    const topBannerImages = setting.topBannerImagesJson ? JSON.parse(setting.topBannerImagesJson) : [];
    const newArrivalImages = setting.newArrivalImagesJson ? JSON.parse(setting.newArrivalImagesJson) : [];
    const bestSellerProductIds = setting.bestSellerProductIdsJson ? JSON.parse(setting.bestSellerProductIdsJson) : [];
    const bestSellerImageOverrides = setting.bestSellerImageOverridesJson ? JSON.parse(setting.bestSellerImageOverridesJson) : {};
    const colorHexMap = setting.colorHexMapJson ? JSON.parse(setting.colorHexMapJson) : {};
    const borderRunnerPhrases = setting.borderRunnerPhrasesJson ? JSON.parse(setting.borderRunnerPhrasesJson) : [];

    // Kiểm tra quyền Admin. Nếu có header x-admin-key hợp lệ, cho phép trả về đầy đủ.
    // Nếu là client công khai thông thường (khách mua hàng), ẩn toàn bộ các trường nhạy cảm.
    const adminKey = req.headers["x-admin-key"] as string;
    
    // Hỗ trợ kiểm tra cả Token phiên động và Khóa tĩnh bí mật
    const expectedStaticKey = process.env.ADMIN_SECRET_KEY;
    // Guard: cả hai đều phải có giá trị thì mới so sánh — nếu env chưa đặt
    // thì expectedStaticKey là undefined và request không header cũng có
    // adminKey undefined, so sánh trần sẽ trả true và nhầm thành admin.
    const isStaticValid = Boolean(adminKey && expectedStaticKey && adminKey === expectedStaticKey);
    
    const { verifyAdminToken } = require("./auth.routes");
    const isTokenValid = adminKey && typeof verifyAdminToken === "function" && verifyAdminToken(adminKey);
    
    const isAdmin = isStaticValid || isTokenValid;

    let rawData: any;
    if (isAdmin) {
      rawData = {
        ...setting,
        instagramImages,
        coupons,
        productOptions,
        membershipTiers,
        sizeGuide,
        heroImages,
        popularCategoryImages,
        topBannerImages,
        newArrivalImages,
        bestSellerProductIds,
        bestSellerImageOverrides,
        colorHexMap,
        borderRunnerPhrases,
        // Các field text chưa từng có giá trị (record cũ) sẽ là null trong DB -> bỏ qua (undefined)
        // để không đè mất giá trị mặc định đẹp phía frontend
        heroImage: setting.heroImage ?? undefined,
        heroBadgeText: setting.heroBadgeText ?? undefined,
        heroTitleLine1: setting.heroTitleLine1 ?? undefined,
        heroTitleLine2: setting.heroTitleLine2 ?? undefined,
        heroDescription: setting.heroDescription ?? undefined,
        heroButtonText: setting.heroButtonText ?? undefined,
        accordionBannerImage: setting.accordionBannerImage ?? undefined,
      };
    } else {
      // Ẩn đi các trường nhạy cảm (SMTP, API keys...) nhưng vẫn giữ thông tin thanh toán
      // vì khách hàng cần số tài khoản/momo để thực hiện chuyển khoản khi checkout
      rawData = {
        id: setting.id,
        version: setting.version,
        brandName: setting.brandName,
        logoUrl: setting.logoUrl,
        manifestoSlogan: setting.manifestoSlogan,
        facebookUrl: setting.facebookUrl,
        instagramUrl: setting.instagramUrl,
        tiktokUrl: setting.tiktokUrl,
        shopeeUrl: setting.shopeeUrl,
        instagramImages,

        // 🖼️ Hero banner + danh mục phổ biến + best seller (khách hàng cần thấy trên trang chủ/shop)
        // Field text chưa từng set (record cũ) sẽ là null -> bỏ qua (undefined) để giữ default đẹp phía frontend
        heroImage: setting.heroImage ?? undefined,
        heroImages,
        accordionBannerImage: setting.accordionBannerImage ?? undefined,
        heroImageScalePercent: setting.heroImageScalePercent,
        heroSlideIntervalMs: setting.heroSlideIntervalMs,
        heroBadgeText: setting.heroBadgeText ?? undefined,
        heroTitleLine1: setting.heroTitleLine1 ?? undefined,
        heroTitleLine2: setting.heroTitleLine2 ?? undefined,
        heroDescription: setting.heroDescription ?? undefined,
        heroButtonText: setting.heroButtonText ?? undefined,
        heroOverlayOpacityLeft: setting.heroOverlayOpacityLeft,
        heroOverlayOpacityMiddle: setting.heroOverlayOpacityMiddle,
        heroOverlayOpacityRight: setting.heroOverlayOpacityRight,
        heroContentAlign: setting.heroContentAlign,
        heroFontStyle: setting.heroFontStyle,
        popularCategoryImages,
        topBannerImages,
        newArrivalImages,
        bestSellerProductIds,
        bestSellerImageOverrides,
        colorHexMap,

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

        // 🐭 Logo chạy vòng quanh viền màn hình (easter egg)
        borderRunnerHintText: setting.borderRunnerHintText ?? undefined,
        borderRunnerHintIntervalSec: setting.borderRunnerHintIntervalSec,
        borderRunnerPhrases,
      };
    }

    // Trả thẳng dữ liệu JSON thường (không mã hóa AES nữa).
    res.json(rawData);
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

      // 🖼️ Hero banner + danh mục phổ biến + best seller
      heroImage,
      accordionBannerImage,
      heroImages,
      heroImageScalePercent,
      heroSlideIntervalMs,
      heroBadgeText,
      heroTitleLine1,
      heroTitleLine2,
      heroDescription,
      heroButtonText,
      heroOverlayOpacityLeft,
      heroOverlayOpacityMiddle,
      heroOverlayOpacityRight,
      heroContentAlign,
      heroFontStyle,
      popularCategoryImages,
      topBannerImages,
      newArrivalImages,
      bestSellerProductIds,
      bestSellerImageOverrides,
      colorHexMap,

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

      // 🐭 Logo chạy vòng quanh viền màn hình (easter egg)
      borderRunnerHintText,
      borderRunnerHintIntervalSec,
      borderRunnerPhrases,

      // 🔢 Optimistic locking (nhóm 3): version client đã đọc từ GET
      version,
    } = req.body;

    console.log("📥 [PUT /settings] Received request to update settings:");
    console.log("- enableCod:", enableCod);
    console.log("- enableBank:", enableBank);
    console.log("- enableMomo:", enableMomo);
    console.log("- enablePaypal:", enablePaypal);
    console.log("- bankAccount:", bankAccount);

    // 🖼️ Mọi trường ảnh: data URL (Base64) -> Cloudinary trước khi lưu URL vào DB.
    // uploadToCloudinary giữ nguyên URL http(s) và giá trị không phải data URL, nên
    // đường này vừa là đường chính cho ảnh mới, vừa là đường dự phòng khi frontend
    // tải trực tiếp lên Cloudinary thất bại rồi gửi data URL lên như trước.
    const uploadedHeroImage =
      heroImage !== undefined ? await uploadToCloudinary(heroImage) : undefined;
    const uploadedAccordionBannerImage =
      accordionBannerImage !== undefined ? await uploadToCloudinary(accordionBannerImage) : undefined;
    const uploadedHeroImages =
      heroImages !== undefined && Array.isArray(heroImages)
        ? await Promise.all(heroImages.map((item: string) => uploadToCloudinary(item)))
        : undefined;
    const uploadedNewArrivalImages =
      newArrivalImages !== undefined && Array.isArray(newArrivalImages)
        ? await Promise.all(newArrivalImages.map((item: string) => uploadToCloudinary(item)))
        : undefined;
    const uploadedTopBannerImages =
      topBannerImages !== undefined && Array.isArray(topBannerImages)
        ? await Promise.all(topBannerImages.map((item: string) => uploadToCloudinary(item)))
        : undefined;
    const uploadedPopularCategoryImages =
      popularCategoryImages !== undefined && Array.isArray(popularCategoryImages)
        ? await Promise.all(popularCategoryImages.map((item: string) => uploadToCloudinary(item)))
        : undefined;
    const uploadedInstagramImages =
      instagramImages !== undefined && Array.isArray(instagramImages)
        ? await Promise.all(instagramImages.map((item: string) => uploadToCloudinary(item)))
        : undefined;

    const instagramImagesStr =
      uploadedInstagramImages !== undefined
        ? JSON.stringify(uploadedInstagramImages)
        : (typeof instagramImages === "string" ? instagramImages : undefined);

    // 🖼️ Hero banner + danh mục phổ biến + best seller (lưu dạng JSON String)
    const heroImagesJson =
      uploadedHeroImages !== undefined ? JSON.stringify(uploadedHeroImages) : undefined;
    const popularCategoryImagesJson =
      uploadedPopularCategoryImages !== undefined ? JSON.stringify(uploadedPopularCategoryImages) : undefined;
    const topBannerImagesJson =
      uploadedTopBannerImages !== undefined ? JSON.stringify(uploadedTopBannerImages) : undefined;
    const newArrivalImagesJson =
      uploadedNewArrivalImages !== undefined ? JSON.stringify(uploadedNewArrivalImages) : undefined;
    const bestSellerProductIdsJson =
      bestSellerProductIds !== undefined ? JSON.stringify(Array.isArray(bestSellerProductIds) ? bestSellerProductIds : []) : undefined;
    const bestSellerImageOverridesJson =
      bestSellerImageOverrides !== undefined ? JSON.stringify(typeof bestSellerImageOverrides === "object" && bestSellerImageOverrides ? bestSellerImageOverrides : {}) : undefined;
    const colorHexMapJson =
      colorHexMap !== undefined ? JSON.stringify(typeof colorHexMap === "object" && colorHexMap ? colorHexMap : {}) : undefined;

    const couponsJson =
      coupons !== undefined ? JSON.stringify(Array.isArray(coupons) ? coupons : []) : undefined;

    const productOptionsJson =
      productOptions !== undefined ? JSON.stringify(typeof productOptions === "object" && productOptions ? productOptions : {}) : undefined;

    const membershipTiersJson =
      membershipTiers !== undefined ? JSON.stringify(Array.isArray(membershipTiers) ? membershipTiers : []) : undefined;

    const sizeGuideJson =
      sizeGuide !== undefined ? JSON.stringify(typeof sizeGuide === "object" && sizeGuide ? sizeGuide : {}) : undefined;

    const borderRunnerPhrasesJson =
      borderRunnerPhrases !== undefined ? JSON.stringify(Array.isArray(borderRunnerPhrases) ? borderRunnerPhrases : []) : undefined;

    // 🔢 Optimistic locking (nhóm 3): kiểm tra version NGAY TRƯỚC khi ghi để cửa
    // sổ race nhỏ nhất. Version lệch (tab khác đã lưu trước) thì trả 409, không
    // ghi gì. PUT không kèm version (client cũ, vd. lưu coupons trực tiếp ở trang
    // admin) vẫn được chấp nhận để không vỡ luồng cũ — nhưng vẫn tăng version.
    const expectedVersion = version === undefined ? undefined : Number(version);
    if (expectedVersion !== undefined && !Number.isInteger(expectedVersion)) {
      return res.status(400).json({ error: "version phải là số nguyên" });
    }
    if (expectedVersion !== undefined) {
      const currentSetting = await prisma.storefrontSetting.findUnique({ where: { id: 1 } });
      if (currentSetting && currentSetting.version !== expectedVersion) {
        return res.status(409).json({
          error: "Settings đã thay đổi ở nơi khác, vui lòng tải lại rồi lưu lại",
          currentVersion: currentSetting.version,
        });
      }
    }

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

        // 🖼️ Hero banner + danh mục phổ biến + best seller
        heroImage: uploadedHeroImage,
        accordionBannerImage: uploadedAccordionBannerImage,
        heroImagesJson,
        heroImageScalePercent: heroImageScalePercent !== undefined ? Number(heroImageScalePercent) : undefined,
        heroSlideIntervalMs: heroSlideIntervalMs !== undefined ? Number(heroSlideIntervalMs) : undefined,
        heroBadgeText,
        heroTitleLine1,
        heroTitleLine2,
        heroDescription,
        heroButtonText,
        heroOverlayOpacityLeft: heroOverlayOpacityLeft !== undefined ? Number(heroOverlayOpacityLeft) : undefined,
        heroOverlayOpacityMiddle: heroOverlayOpacityMiddle !== undefined ? Number(heroOverlayOpacityMiddle) : undefined,
        heroOverlayOpacityRight: heroOverlayOpacityRight !== undefined ? Number(heroOverlayOpacityRight) : undefined,
        heroContentAlign,
        heroFontStyle,
        popularCategoryImagesJson,
        topBannerImagesJson,
        newArrivalImagesJson,
        bestSellerProductIdsJson,
        bestSellerImageOverridesJson,
        colorHexMapJson,

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

        // 🐭 Logo chạy vòng quanh viền màn hình (easter egg)
        borderRunnerHintText,
        borderRunnerHintIntervalSec: borderRunnerHintIntervalSec !== undefined ? Number(borderRunnerHintIntervalSec) : undefined,
        borderRunnerPhrasesJson,

        // 🔢 PUT thành công thì tăng version lên 1 (kể cả PUT không kèm version)
        version: { increment: 1 },
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

        // 🖼️ Hero banner + danh mục phổ biến + best seller
        heroImage: uploadedHeroImage,
        accordionBannerImage: uploadedAccordionBannerImage,
        heroImagesJson: heroImagesJson ?? "[]",
        heroImageScalePercent: heroImageScalePercent !== undefined ? Number(heroImageScalePercent) : 100,
        heroSlideIntervalMs: heroSlideIntervalMs !== undefined ? Number(heroSlideIntervalMs) : 6000,
        heroBadgeText,
        heroTitleLine1,
        heroTitleLine2,
        heroDescription,
        heroButtonText,
        heroOverlayOpacityLeft: heroOverlayOpacityLeft !== undefined ? Number(heroOverlayOpacityLeft) : 60,
        heroOverlayOpacityMiddle: heroOverlayOpacityMiddle !== undefined ? Number(heroOverlayOpacityMiddle) : 40,
        heroOverlayOpacityRight: heroOverlayOpacityRight !== undefined ? Number(heroOverlayOpacityRight) : 60,
        heroContentAlign: heroContentAlign || "center",
        heroFontStyle: heroFontStyle || "default",
        popularCategoryImagesJson: popularCategoryImagesJson ?? "[]",
        topBannerImagesJson: topBannerImagesJson ?? "[]",
        newArrivalImagesJson: newArrivalImagesJson ?? "[]",
        bestSellerProductIdsJson: bestSellerProductIdsJson ?? "[]",
        bestSellerImageOverridesJson: bestSellerImageOverridesJson ?? "{}",
        colorHexMapJson: colorHexMapJson ?? "{}",

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
        smtpPass: smtpPass || "",
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

        // 🐭 Logo chạy vòng quanh viền màn hình (easter egg)
        borderRunnerHintText: borderRunnerHintText || "Hãy chạm vào tôi đi nè.",
        borderRunnerHintIntervalSec: borderRunnerHintIntervalSec !== undefined ? Number(borderRunnerHintIntervalSec) : 5,
        borderRunnerPhrasesJson: borderRunnerPhrasesJson ?? "[]",

        version: 0,
      }
    });

    res.json({
      ...updatedSetting,
      instagramImages: updatedSetting.instagramImages ? JSON.parse(updatedSetting.instagramImages) : [],
      coupons: updatedSetting.couponsJson ? JSON.parse(updatedSetting.couponsJson) : [],
      productOptions: updatedSetting.productOptionsJson ? JSON.parse(updatedSetting.productOptionsJson) : {},
      membershipTiers: updatedSetting.membershipTiersJson ? JSON.parse(updatedSetting.membershipTiersJson) : [],
      sizeGuide: updatedSetting.sizeGuideJson ? JSON.parse(updatedSetting.sizeGuideJson) : {},
      heroImages: updatedSetting.heroImagesJson ? JSON.parse(updatedSetting.heroImagesJson) : [],
      accordionBannerImage: updatedSetting.accordionBannerImage ?? undefined,
      popularCategoryImages: updatedSetting.popularCategoryImagesJson ? JSON.parse(updatedSetting.popularCategoryImagesJson) : [],
      topBannerImages: updatedSetting.topBannerImagesJson ? JSON.parse(updatedSetting.topBannerImagesJson) : [],
      newArrivalImages: updatedSetting.newArrivalImagesJson ? JSON.parse(updatedSetting.newArrivalImagesJson) : [],
      bestSellerProductIds: updatedSetting.bestSellerProductIdsJson ? JSON.parse(updatedSetting.bestSellerProductIdsJson) : [],
      bestSellerImageOverrides: updatedSetting.bestSellerImageOverridesJson ? JSON.parse(updatedSetting.bestSellerImageOverridesJson) : {},
      colorHexMap: updatedSetting.colorHexMapJson ? JSON.parse(updatedSetting.colorHexMapJson) : {},
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

// 12. POST /api/settings/upload-signature - Ký tải lên trực tiếp Cloudinary (Admin)
// Frontend xin chữ ký rồi tải file THẲNG lên Cloudinary, không qua backend nữa.
// Chỉ ký bằng api_secret ở máy chủ — KHÔNG trả api_secret ra ngoài.
router.post("/upload-signature", requireAdminAuth, async (req, res, next) => {
  try {
    const requestedFolder = typeof req.body?.folder === "string" ? req.body.folder : "madmad-products";
    // Chỉ cho 2 folder đã dùng trong hệ thống, tránh ký cho folder tùy ý.
    const folder = requestedFolder === "madmad-hero-videos" ? requestedFolder : "madmad-products";
    const signature = createUploadSignature(folder);
    res.json(signature);
  } catch (error: any) {
    console.error("❌ [UPLOAD-SIGNATURE] Không tạo được chữ ký:", error?.message || error);
    res.status(500).json({ success: false, message: error?.message || "Không tạo được chữ ký upload." });
  }
});

// 13. POST /api/settings/migrate-images - Chuyển 1 lần ảnh Base64 trong DB thành link Cloudinary (Admin)
// CHỈ VIẾT endpoint, KHÔNG tự chạy vào dữ liệu thật. Chạy lại được an toàn: bỏ qua mọi
// giá trị đã là URL Cloudinary/http(s), chỉ chuyển data URL; chạy lại lần 2 không đổi gì.
router.post("/migrate-images", requireAdminAuth, async (req, res, next) => {
  try {
    const setting = await prisma.storefrontSetting.findUnique({ where: { id: 1 } });
    if (!setting) {
      return res.status(404).json({ success: false, message: "Chưa có cấu hình storefront (id 1)." });
    }

    const isDataUrl = (v: unknown): v is string =>
      typeof v === "string" && (v.startsWith("data:image/") || v.startsWith("data:video/"));
    const parseJsonArray = (raw: string | null | undefined): string[] => {
      try { const v = raw ? JSON.parse(raw) : []; return Array.isArray(v) ? v : []; } catch { return []; }
    };

    // field -> { kind, raw } — kind "single" là cột string, "json" là cột JSON-string mảng.
    const fields: Record<string, { kind: "single" | "json"; raw: string | null | undefined }> = {
      heroImage: { kind: "single", raw: setting.heroImage },
      accordionBannerImage: { kind: "single", raw: setting.accordionBannerImage },
      heroImages: { kind: "json", raw: setting.heroImagesJson },
      topBannerImages: { kind: "json", raw: setting.topBannerImagesJson },
      popularCategoryImages: { kind: "json", raw: setting.popularCategoryImagesJson },
      instagramImages: { kind: "json", raw: setting.instagramImages },
      newArrivalImages: { kind: "json", raw: setting.newArrivalImagesJson },
    };

    const summary: Record<string, { migrated: number; skipped: number; failed: number }> = {};
    // Chỉ các cột ảnh mới được ghi — gõ rõ từng cột để khớp Prisma update input.
    const updates: {
      heroImage?: string;
      accordionBannerImage?: string;
      heroImagesJson?: string;
      topBannerImagesJson?: string;
      popularCategoryImagesJson?: string;
      instagramImages?: string;
      newArrivalImagesJson?: string;
    } = {};
    let totalMigrated = 0;

    for (const [field, { kind, raw }] of Object.entries(fields)) {
      const values = kind === "single" ? [raw ?? ""] : parseJsonArray(raw);
      const result = { migrated: 0, skipped: 0, failed: 0 };
      const nextValues: string[] = [];
      for (const value of values) {
        if (!isDataUrl(value)) { result.skipped += 1; nextValues.push(value); continue; }
        const uploaded = await uploadToCloudinary(value);
        if (isDataUrl(uploaded)) { result.failed += 1; nextValues.push(value); continue; }
        result.migrated += 1;
        nextValues.push(uploaded);
      }
      summary[field] = result;
      totalMigrated += result.migrated;
      if (result.migrated > 0) {
        const json = JSON.stringify(nextValues);
        if (field === "heroImage") updates.heroImage = nextValues[0] ?? "";
        else if (field === "accordionBannerImage") updates.accordionBannerImage = nextValues[0] ?? "";
        else if (field === "heroImages") updates.heroImagesJson = json;
        else if (field === "topBannerImages") updates.topBannerImagesJson = json;
        else if (field === "popularCategoryImages") updates.popularCategoryImagesJson = json;
        else if (field === "instagramImages") updates.instagramImages = json;
        else if (field === "newArrivalImages") updates.newArrivalImagesJson = json;
      }
    }

    if (totalMigrated > 0) {
      await prisma.storefrontSetting.update({ where: { id: 1 }, data: updates });
    }

    res.json({ success: true, migrated: totalMigrated, changed: totalMigrated > 0, fields: summary });
  } catch (error) {
    next(error);
  }
});

export default router;
