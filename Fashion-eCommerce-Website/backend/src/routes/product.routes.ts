import { Router } from "express";
import { prisma } from "../config/prisma";
import { uploadToCloudinary } from "../utils/cloudinary";
import { parseVariantStock } from "../utils/product-stock";
import {
  applyProductInventoryChange,
  buildInitialReceivedStock,
  logInitialInventoryReceipt,
} from "../services/inventory-receipt.service";
import { fulfillReleasedPreOrderItems } from "../services/stock-outbound.service";

const router = Router();

// Helper: serialize/parse images array
const serializeImages = (images: any): string => {
  if (!images) return "[]";
  if (Array.isArray(images)) return JSON.stringify(images.filter(Boolean));
  if (typeof images === "string") {
    try { JSON.parse(images); return images; } catch { return "[]"; }
  }
  return "[]";
};

const parseProduct = (p: any) => ({
  ...p,
  sizes: p.sizes ? p.sizes.split(",") : [],
  colors: p.colors ? p.colors.split(",") : [],
  colorImages: p.colorImages ? JSON.parse(p.colorImages) : {},
  images: p.images ? JSON.parse(p.images) : [],
  variantStock: p.variantStock ? JSON.parse(p.variantStock) : {},
  receivedVariantStock: p.receivedVariantStock ? JSON.parse(p.receivedVariantStock) : {},
  stock: p.stock !== null && p.stock !== undefined ? Number(p.stock) : 999,
  receivedStock: p.receivedStock !== null && p.receivedStock !== undefined ? Number(p.receivedStock) : null,
  inStock: p.inStock !== null && p.inStock !== undefined ? !!p.inStock : true,
  originalPrice: p.originalPrice !== null && p.originalPrice !== undefined ? Number(p.originalPrice) : null,
  discountPercent: p.discountPercent !== null && p.discountPercent !== undefined ? Number(p.discountPercent) : null,
  showDiscountPercent: !!p.showDiscountPercent,
  isPreOrder: !!p.isPreOrder,
  preOrderDays: p.preOrderDays !== null && p.preOrderDays !== undefined ? Number(p.preOrderDays) : null,
  isGiftProduct: !!p.isGiftProduct,
  giftConditions: (() => {
    if (!p.giftConditionsJson) return undefined;
    try {
      const parsed = JSON.parse(p.giftConditionsJson);
      return parsed && typeof parsed === "object" ? parsed : undefined;
    } catch {
      return undefined;
    }
  })(),
  sizeGuideProfile: p.sizeGuideProfile ? String(p.sizeGuideProfile) : undefined,
  sizeGuideOverride: (() => {
    if (!p.sizeGuideOverrideJson) return undefined;
    try {
      const parsed = JSON.parse(p.sizeGuideOverrideJson);
      return Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  })(),
});

// Helper: Tiền xử lý tất cả các trường ảnh của sản phẩm (Tải lên Cloudinary nếu là Base64)
async function processProductImages(productName: string, image: string, images: any, colorImages: any) {
  const t0 = Date.now();
  console.log(`🖼️  [IMG PROCESS] Bắt đầu xử lý ảnh sản phẩm: "${productName}"`);
  
  // Lưu log bắt đầu vào database
  prisma.systemLog.create({
    data: {
      level: "info",
      source: "backend",
      message: `🖼️ [IMG PROCESS] Bắt đầu xử lý ảnh sản phẩm: "${productName}"`,
    }
  }).catch(() => {});

  // 1. Xử lý ảnh chính (image)
  const uploadedImage = image ? await uploadToCloudinary(image) : "";

  // 2. Xử lý danh sách ảnh phụ (images)
  let resolvedImages: string[] = [];
  if (Array.isArray(images)) {
    console.log(`🖼️  [IMG PROCESS] Đang xử lý ${images.length} ảnh bộ sưu tập...`);
    resolvedImages = await Promise.all(
      images.map(img => (img ? uploadToCloudinary(img) : ""))
    );
  } else if (typeof images === "string" && images.trim()) {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        console.log(`🖼️  [IMG PROCESS] Đang xử lý ${parsed.length} ảnh bộ sưu tập...`);
        resolvedImages = await Promise.all(
          parsed.map(img => (img ? uploadToCloudinary(img) : ""))
        );
      }
    } catch {
      resolvedImages = [await uploadToCloudinary(images)];
    }
  }
  resolvedImages = resolvedImages.filter(Boolean);

  // 3. Xử lý ảnh theo màu sắc (colorImages)
  let resolvedColorImages: Record<string, string> = {};
  if (typeof colorImages === "object" && colorImages !== null) {
    const keys = Object.keys(colorImages);
    if (keys.length > 0) console.log(`🖼️  [IMG PROCESS] Đang xử lý ${keys.length} ảnh màu sắc...`);
    const values = await Promise.all(
      keys.map(k => uploadToCloudinary(colorImages[k]))
    );
    keys.forEach((k, i) => {
      resolvedColorImages[k] = values[i];
    });
  } else if (typeof colorImages === "string" && colorImages.trim()) {
    try {
      const parsed = JSON.parse(colorImages);
      if (typeof parsed === "object" && parsed !== null) {
        const keys = Object.keys(parsed);
        if (keys.length > 0) console.log(`🖼️  [IMG PROCESS] Đang xử lý ${keys.length} ảnh màu sắc...`);
        const values = await Promise.all(
          keys.map(k => uploadToCloudinary(parsed[k]))
        );
        keys.forEach((k, i) => {
          resolvedColorImages[k] = values[i];
        });
      }
    } catch {}
  }

  const elapsed = Date.now() - t0;
  console.log(`✅ [IMG PROCESS] Hoàn tất xử lý ảnh "${productName}" trong ${elapsed}ms. Ảnh bộ sưu tập: ${resolvedImages.length}, Ảnh màu: ${Object.keys(resolvedColorImages).length}`);

  // Lưu log hoàn tất vào database
  prisma.systemLog.create({
    data: {
      level: "success",
      source: "backend",
      message: `✅ [IMG PROCESS] Hoàn tất xử lý ảnh "${productName}" trong ${elapsed}ms.`,
      details: JSON.stringify({
        imagesCount: resolvedImages.length,
        colorImagesCount: Object.keys(resolvedColorImages).length,
        duration: elapsed
      }),
      duration: elapsed
    }
  }).catch(() => {});

  return {
    image: uploadedImage,
    images: resolvedImages,
    colorImages: resolvedColorImages
  };
}

// 1. GET /api/products - Lấy danh sách sản phẩm (có lọc theo category)
router.get("/", async (req, res, next) => {
  try {
    const { category, featured } = req.query;
    const whereClause: any = {};
    if (category && category !== "all") whereClause.category = String(category);
    if (featured === "true") whereClause.isFeatured = true;

    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: [{ orderIndex: "asc" }, { createdAt: "desc" }]
    });

    const adminKey = req.headers["x-admin-key"] as string;
    const { verifyAdminToken } = require("./auth.routes");
    const isAdmin = adminKey && typeof verifyAdminToken === "function" && verifyAdminToken(adminKey);

    const parsed = products.map(parseProduct);
    if (isAdmin) {
      res.json(parsed);
    } else {
      // Ẩn thông tin tồn kho chi tiết đối với user công khai
      res.json(parsed.map(({ stock, variantStock, receivedStock, receivedVariantStock, ...rest }) => ({
        ...rest,
        // Chỉ trả về trạng thái inStock đơn giản cho client
        inStock: rest.inStock
      })));
    }
  } catch (error) {
    next(error);
  }
});

// 2. GET /api/products/:id - Chi tiết sản phẩm
router.get("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    const adminKey = req.headers["x-admin-key"] as string;
    const { verifyAdminToken } = require("./auth.routes");
    const isAdmin = adminKey && typeof verifyAdminToken === "function" && verifyAdminToken(adminKey);

    const parsed = parseProduct(product);
    if (isAdmin) {
      res.json(parsed);
    } else {
      const { stock, variantStock, receivedStock, receivedVariantStock, ...rest } = parsed;
      res.json({
        ...rest,
        inStock: rest.inStock
      });
    }
  } catch (error) {
    next(error);
  }
});

// 3. POST /api/products - Tạo sản phẩm mới (Admin)
router.post("/", async (req, res, next) => {
  try {
    const { name, sku, price, image, category, sizeGuideProfile, sizeGuideOverride, description, sizes, colors, colorImages, images, isFeatured, stock, variantStock, inStock, originalPrice, discountPercent, showDiscountPercent, isPreOrder, preOrderDays, isGiftProduct, giftConditions } = req.body;

    if (!name || !sku || !price || !image || !category) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin bắt buộc!" });
    }

    const sizeGuideOverrideJson =
      Array.isArray(sizeGuideOverride) && sizeGuideOverride.length > 0
        ? JSON.stringify(sizeGuideOverride)
        : null;

    // Tự động đẩy toàn bộ ảnh Base64 lên Cloudinary trước khi lưu
    console.log(`📥 [PRODUCT CREATE] Admin đang tạo sản phẩm mới: "${name}"`);
    const cleanData = await processProductImages(name, image, images, colorImages);

    const sizesStr = Array.isArray(sizes) ? sizes.join(",") : String(sizes || "S,M,L");
    const colorsStr = Array.isArray(colors) ? colors.join(",") : String(colors || "Black");

    const giftConditionsJson =
      isGiftProduct && giftConditions && typeof giftConditions === "object"
        ? JSON.stringify({
            ...(giftConditions.minOrderTotal ? { minOrderTotal: Number(giftConditions.minOrderTotal) } : {}),
            ...(giftConditions.minProductCount ? { minProductCount: Number(giftConditions.minProductCount) } : {}),
          })
        : null;

    const stockValue = stock !== undefined && stock !== null ? Number(stock) : 999;
    const variantStockObj =
      variantStock !== undefined && variantStock !== null
        ? typeof variantStock === "object"
          ? variantStock
          : JSON.parse(String(variantStock))
        : {};
    const received = buildInitialReceivedStock(stockValue, variantStockObj, {
      sizes: sizesStr,
      colors: colorsStr,
      stock: stockValue,
      variantStock: JSON.stringify(variantStockObj),
    });

    const newProduct = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
      data: {
        name,
        sku,
        price: Number(price),
        image: cleanData.image,
        category,
        sizeGuideProfile:
          sizeGuideOverrideJson ? null : sizeGuideProfile ? String(sizeGuideProfile).trim() || null : null,
        sizeGuideOverrideJson,
        description: description || "",
        sizes: sizesStr,
        colors: colorsStr,
        colorImages: JSON.stringify(cleanData.colorImages),
        images: JSON.stringify(cleanData.images),
        isFeatured: !!isFeatured,
        stock: stockValue,
        variantStock: JSON.stringify(variantStockObj),
        receivedStock: received.receivedStock,
        receivedVariantStock: received.receivedVariantStock,
        inStock: inStock !== undefined ? !!inStock : true,
        originalPrice: originalPrice !== undefined && originalPrice !== null ? Number(originalPrice) : null,
        discountPercent: discountPercent !== undefined && discountPercent !== null ? Number(discountPercent) : null,
        showDiscountPercent: showDiscountPercent !== undefined ? !!showDiscountPercent : false,
        isPreOrder: isPreOrder !== undefined ? !!isPreOrder : false,
        preOrderDays: isPreOrder ? (preOrderDays !== undefined && preOrderDays !== null ? Number(preOrderDays) : 7) : null,
        isGiftProduct: isGiftProduct !== undefined ? !!isGiftProduct : false,
        giftConditionsJson: isGiftProduct ? giftConditionsJson : null,
      },
      });

      await logInitialInventoryReceipt(tx, created, stockValue, variantStockObj);
      return created;
    });

    res.status(201).json(parseProduct(newProduct));
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Mã SKU này đã tồn tại!" });
    }
    next(error);
  }
});

// 4. PUT /api/products/:id - Cập nhật sản phẩm (Admin)
router.put("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, sku, price, image, category, sizeGuideProfile, sizeGuideOverride, description, sizes, colors, colorImages, images, isFeatured, stock, variantStock, inStock, originalPrice, discountPercent, showDiscountPercent, isPreOrder, preOrderDays, isGiftProduct, giftConditions } = req.body;

    const sizeGuideOverrideJson =
      sizeGuideOverride !== undefined
        ? Array.isArray(sizeGuideOverride) && sizeGuideOverride.length > 0
          ? JSON.stringify(sizeGuideOverride)
          : null
        : undefined;

    // Chỉ thực hiện xử lý ảnh nếu trường đó được truyền lên
    let finalImage = image;
    let finalImages = images;
    let finalColorImages = colorImages;

    if (image !== undefined || images !== undefined || colorImages !== undefined) {
      console.log(`✏️  [PRODUCT UPDATE] Admin đang cập nhật ảnh sản phẩm: "${name || id}"`);
      const cleanData = await processProductImages(
        name || id,
        image || "",
        images || [],
        colorImages || {}
      );
      if (image !== undefined) finalImage = cleanData.image;
      if (images !== undefined) finalImages = cleanData.images;
      if (colorImages !== undefined) finalColorImages = cleanData.colorImages;
    }

    const sizesStr = Array.isArray(sizes) ? sizes.join(",") : String(sizes || "");
    const colorsStr = Array.isArray(colors) ? colors.join(",") : String(colors || "");
    const colorImagesStr = finalColorImages !== undefined
      ? (typeof finalColorImages === "object" ? JSON.stringify(finalColorImages) : String(finalColorImages))
      : undefined;
    const imagesStr = finalImages !== undefined
      ? (Array.isArray(finalImages) ? JSON.stringify(finalImages) : String(finalImages))
      : undefined;

    const giftConditionsJson =
      isGiftProduct !== undefined
        ? isGiftProduct && giftConditions && typeof giftConditions === "object"
          ? JSON.stringify({
              ...(giftConditions.minOrderTotal ? { minOrderTotal: Number(giftConditions.minOrderTotal) } : {}),
              ...(giftConditions.minProductCount ? { minProductCount: Number(giftConditions.minProductCount) } : {}),
            })
          : null
        : undefined;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    const variantStockObj =
      variantStock !== undefined && variantStock !== null
        ? typeof variantStock === "object"
          ? variantStock
          : JSON.parse(String(variantStock))
        : undefined;

    const updatedProduct = await prisma.$transaction(async (tx) => {
      let inventoryPatch: {
        stock?: number | null;
        variantStock?: string;
        receivedStock?: number | null;
        receivedVariantStock?: string;
      } = {};

      if (stock !== undefined || variantStockObj !== undefined) {
        const change = await applyProductInventoryChange(tx, existing, {
          stock: stock !== undefined && stock !== null ? Number(stock) : undefined,
          variantStock: variantStockObj,
        });
        if (change) {
          inventoryPatch = change;
        }
      }

      return tx.product.update({
      where: { id },
      data: {
        name,
        sku,
        price: price ? Number(price) : undefined,
        image: finalImage,
        category,
        sizeGuideProfile:
          sizeGuideOverrideJson !== undefined
            ? sizeGuideOverrideJson
              ? null
              : sizeGuideProfile !== undefined
                ? sizeGuideProfile
                  ? String(sizeGuideProfile).trim() || null
                  : null
                : undefined
            : sizeGuideProfile !== undefined
              ? sizeGuideProfile
                ? String(sizeGuideProfile).trim() || null
                : null
              : undefined,
        sizeGuideOverrideJson,
        description,
        sizes: sizesStr || undefined,
        colors: colorsStr || undefined,
        colorImages: colorImagesStr,
        images: imagesStr,
        isFeatured: isFeatured !== undefined ? !!isFeatured : undefined,
        stock: inventoryPatch.stock !== undefined ? inventoryPatch.stock : stock !== undefined && stock !== null ? Number(stock) : undefined,
        variantStock:
          inventoryPatch.variantStock ??
          (variantStock !== undefined && variantStock !== null
            ? typeof variantStock === "object"
              ? JSON.stringify(variantStock)
              : String(variantStock)
            : undefined),
        receivedStock: inventoryPatch.receivedStock,
        receivedVariantStock: inventoryPatch.receivedVariantStock,
        inStock: inStock !== undefined ? !!inStock : undefined,
        originalPrice: originalPrice !== undefined ? (originalPrice !== null ? Number(originalPrice) : null) : undefined,
        discountPercent: discountPercent !== undefined ? (discountPercent !== null ? Number(discountPercent) : null) : undefined,
        showDiscountPercent: showDiscountPercent !== undefined ? !!showDiscountPercent : undefined,
        isPreOrder: isPreOrder !== undefined ? !!isPreOrder : undefined,
        preOrderDays:
          isPreOrder !== undefined
            ? (isPreOrder ? (preOrderDays !== undefined && preOrderDays !== null ? Number(preOrderDays) : 7) : null)
            : (preOrderDays !== undefined ? (preOrderDays !== null ? Number(preOrderDays) : null) : undefined),
        isGiftProduct: isGiftProduct !== undefined ? !!isGiftProduct : undefined,
        giftConditionsJson,
      },
      });
    });

    if (isPreOrder !== undefined && !isPreOrder && existing.isPreOrder) {
      await fulfillReleasedPreOrderItems({ productId: id });
    }

    res.json(parseProduct(updatedProduct));
  } catch (error) {
    next(error);
  }
});

// 5. DELETE /api/products/:id - Xóa sản phẩm (Admin)
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id } });
    res.json({ success: true, message: "Xóa sản phẩm thành công" });
  } catch (error) {
    next(error);
  }
});

// 6. PUT /api/products/reorder - Sắp xếp lại thứ tự sản phẩm
router.put("/reorder", async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) return res.status(400).json({ message: "Dữ liệu không hợp lệ" });

    await prisma.$transaction(
      items.map((item: any) =>
        prisma.product.update({ where: { id: item.id }, data: { orderIndex: item.orderIndex } })
      )
    );

    res.json({ success: true, message: "Cập nhật thứ tự thành công" });
  } catch (error) {
    next(error);
  }
});

export default router;
