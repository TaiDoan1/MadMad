import { Router } from "express";
import { prisma } from "../config/prisma";
import { getVariantAvailable, resolveVariantColor, resolveVariantSize } from "../utils/product-stock";
import { getProductImageForColorFromDb, isStoredImageMismatch } from "../utils/product-image";
import {
  deductProductStockWithLog,
  restoreProductStockWithLog,
} from "../services/stock-movement.service";
import {
  restoreMarketingItemsIfDeducted,
  syncMissingMarketingOutboundDeductions,
} from "../services/stock-outbound.service";

const router = Router();

const parseGift = (gift: any) => ({
  ...gift,
  items: Array.isArray(gift.items) ? gift.items : [],
});

const buildGiftNumber = () => {
  const now = new Date();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `MK${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${random}`;
};

router.get("/", async (req, res, next) => {
  try {
    const month = typeof req.query.month === "string" ? req.query.month : undefined;
    const where = buildMonthWhere(month);

    const gifts = await prisma.marketingGift.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(gifts.map(parseGift));
  } catch (error) {
    next(error);
  }
});

function buildMonthWhere(month?: string) {
  if (!month || month === "all" || !/^\d{4}-\d{2}$/.test(month)) {
    return {};
  }
  const [year, monthIndex] = month.split("-").map(Number);
  const start = new Date(year, monthIndex - 1, 1);
  const end = new Date(year, monthIndex, 1);
  return {
    createdAt: {
      gte: start,
      lt: end,
    },
  };
}

router.post("/sync-item-images", async (_req, res, next) => {
  try {
    const giftItems = await prisma.marketingGiftItem.findMany({
      where: { color: { not: "" } },
    });

    const productIds = [...new Set(giftItems.map((item) => item.productId).filter(Boolean))];
    const products = productIds.length
      ? await prisma.product.findMany({ where: { id: { in: productIds } } })
      : [];
    const productMap = new Map(products.map((product) => [product.id, product]));

    let updated = 0;
    for (const item of giftItems) {
      const product = productMap.get(item.productId);
      if (!product || !item.color?.trim()) continue;

      const expectedImage = getProductImageForColorFromDb(product, item.color);
      if (!isStoredImageMismatch(item.productImage ?? "", expectedImage)) continue;

      await prisma.marketingGiftItem.update({
        where: { id: item.id },
        data: { productImage: expectedImage },
      });
      updated += 1;
    }

    res.json({ updated, total: giftItems.length });
  } catch (error) {
    next(error);
  }
});

router.post("/sync-stock-deductions", async (_req, res, next) => {
  try {
    const result = await syncMissingMarketingOutboundDeductions();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/stats", async (req, res, next) => {
  try {
    const month = typeof req.query.month === "string" ? req.query.month : undefined;
    const gifts = await prisma.marketingGift.findMany({
      where: {
        status: "completed",
        ...buildMonthWhere(month),
      },
      select: {
        productValue: true,
        cashAmount: true,
        totalCost: true,
        kolName: true,
      },
    });

    const totalGifts = gifts.length;
    const totalProductValue = gifts.reduce((sum, gift) => sum + gift.productValue, 0);
    const totalCash = gifts.reduce((sum, gift) => sum + gift.cashAmount, 0);
    const totalCost = gifts.reduce((sum, gift) => sum + gift.totalCost, 0);

    const kolMap = new Map<string, number>();
    gifts.forEach((gift) => {
      kolMap.set(gift.kolName, (kolMap.get(gift.kolName) ?? 0) + gift.totalCost);
    });
    const topKols = [...kolMap.entries()]
      .map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5);

    res.json({ totalGifts, totalProductValue, totalCash, totalCost, topKols });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const { kolName, kolHandle, platform, contactInfo, cashAmount = 0, notes, items } = req.body;

    if (!kolName?.trim()) {
      return res.status(400).json({ message: "Vui lòng nhập tên KOL/KOC" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Vui lòng thêm ít nhất một sản phẩm tặng" });
    }

    const gift = await prisma.$transaction(async (tx) => {
      const normalizedItems: Array<{
        productId: string;
        productName: string;
        productImage: string | null;
        color: string;
        size: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
      }> = [];

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: String(item.productId) } });
        if (!product) {
          throw new Error(`Sản phẩm không tồn tại: ${item.productId}`);
        }

        const quantity = Math.max(1, Number(item.quantity) || 1);
        const color = String(item.color || "").trim();
        const size = String(item.size || "").trim();
        if (!color || !size) {
          throw new Error(`Thiếu màu hoặc size cho sản phẩm "${product.name}"`);
        }

        const available = getVariantAvailable(product, color, size);
        if (available < quantity) {
          throw new Error(`"${product.name}" [${color}/${size}] không đủ hàng (còn ${available})`);
        }

        const unitPrice = Number(product.price) || 0;
        normalizedItems.push({
          productId: product.id,
          productName: product.name,
          productImage: getProductImageForColorFromDb(product, color),
          color,
          size,
          quantity,
          unitPrice,
          lineTotal: unitPrice * quantity,
        });
      }

      const giftNumber = buildGiftNumber();

      for (const item of normalizedItems) {
        await deductProductStockWithLog(tx, {
          productId: item.productId,
          productName: item.productName,
          color: item.color,
          size: item.size,
          quantity: item.quantity,
          reason: "MARKETING_GIFT",
          referenceType: "marketing_gift",
          referenceId: giftNumber,
          referenceLabel: giftNumber,
        });
      }

      const productValue = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
      const cash = Math.max(0, Number(cashAmount) || 0);
      const totalCost = productValue + cash;

      return tx.marketingGift.create({
        data: {
          giftNumber,
          kolName: kolName.trim(),
          kolHandle: kolHandle?.trim() || null,
          platform: platform?.trim() || null,
          contactInfo: contactInfo?.trim() || null,
          cashAmount: cash,
          productValue,
          totalCost,
          notes: notes?.trim() || null,
          status: "completed",
          items: {
            create: normalizedItems,
          },
        },
        include: { items: true },
      });
    });

    res.status(201).json(parseGift(gift));
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Không thể tạo phiếu tặng" });
  }
});

router.put("/:id/items/:itemId", async (req, res, next) => {
  try {
    const { id, itemId } = req.params;
    const { productId, color, size, quantity } = req.body;

    if (!productId || !color || !size || !quantity) {
      return res.status(400).json({ message: "Thiếu thông tin sản phẩm cần cập nhật!" });
    }

    const gift = await prisma.marketingGift.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!gift) {
      return res.status(404).json({ message: "Không tìm thấy phiếu tặng" });
    }
    if (gift.status !== "completed") {
      return res.status(400).json({ message: "Chỉ sửa được phiếu tặng đang hoạt động!" });
    }

    const item = gift.items.find((row) => row.id === itemId);
    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy dòng sản phẩm trong phiếu tặng" });
    }

    const nextQuantity = Math.max(1, Number(quantity));
    const nextProduct = await prisma.product.findUnique({ where: { id: String(productId) } });
    if (!nextProduct) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm mới" });
    }

    const oldProduct = await prisma.product.findUnique({ where: { id: item.productId } });
    const nextColor = resolveVariantColor(nextProduct, String(color));
    const nextSize = resolveVariantSize(nextProduct, String(size));
    const oldColor = oldProduct ? resolveVariantColor(oldProduct, item.color) : String(item.color).trim();
    const oldSize = oldProduct ? resolveVariantSize(oldProduct, item.size) : String(item.size).trim();
    const nextProductId = String(productId);
    const nextProductName = nextProduct.name;
    const nextProductImage = getProductImageForColorFromDb(nextProduct, nextColor);
    const nextUnitPrice = Number(nextProduct.price) || 0;
    const nextLineTotal = nextUnitPrice * nextQuantity;

    const unchanged =
      item.productId === nextProductId &&
      oldColor === nextColor &&
      oldSize === nextSize &&
      item.quantity === nextQuantity;

    if (unchanged) {
      return res.status(400).json({ message: "Không có thay đổi nào để cập nhật!" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await restoreProductStockWithLog(tx, {
        productId: item.productId,
        productName: item.productName,
        color: oldColor,
        size: oldSize,
        quantity: item.quantity,
        reason: "MARKETING_GIFT_EDIT_IN",
        referenceType: "marketing_gift",
        referenceId: gift.giftNumber,
        referenceLabel: gift.giftNumber,
        notes: `Hoàn kho ${oldColor} / ${oldSize} (dòng cũ) khi sửa phiếu marketing`,
      });

      await deductProductStockWithLog(tx, {
        productId: nextProductId,
        productName: nextProductName,
        color: nextColor,
        size: nextSize,
        quantity: nextQuantity,
        reason: "MARKETING_GIFT_EDIT_OUT",
        referenceType: "marketing_gift",
        referenceId: gift.giftNumber,
        referenceLabel: gift.giftNumber,
        notes: `Trừ kho ${nextColor} / ${nextSize} (dòng mới) khi sửa phiếu marketing`,
      });

      await tx.marketingGiftItem.update({
        where: { id: itemId },
        data: {
          productId: nextProductId,
          productName: nextProductName,
          productImage: nextProductImage,
          color: nextColor,
          size: nextSize,
          quantity: nextQuantity,
          unitPrice: nextUnitPrice,
          lineTotal: nextLineTotal,
        },
      });

      const updatedItems = gift.items.map((row) =>
        row.id === itemId
          ? {
              ...row,
              productId: nextProductId,
              productName: nextProductName,
              productImage: nextProductImage,
              color: nextColor,
              size: nextSize,
              quantity: nextQuantity,
              unitPrice: nextUnitPrice,
              lineTotal: nextLineTotal,
            }
          : row,
      );

      const productValue = updatedItems.reduce((sum, row) => {
        if (row.id === itemId) return sum + nextLineTotal;
        return sum + row.lineTotal;
      }, 0);

      return tx.marketingGift.update({
        where: { id },
        data: {
          productValue,
          totalCost: productValue + gift.cashAmount,
        },
        include: { items: true },
      });
    });

    res.json(parseGift(updated));
  } catch (error: any) {
    if (error?.message?.includes("Không đủ tồn kho")) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

router.put("/:id/cancel", async (req, res, next) => {
  try {
    const { id } = req.params;
    const gift = await prisma.marketingGift.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!gift) {
      return res.status(404).json({ message: "Không tìm thấy phiếu tặng" });
    }
    if (gift.status === "cancelled") {
      return res.status(400).json({ message: "Phiếu tặng đã được hủy trước đó" });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await restoreMarketingItemsIfDeducted(
        tx,
        gift,
        gift.items,
        "Hoàn kho do hủy phiếu tặng KOL/KOC",
      );

      return tx.marketingGift.update({
        where: { id },
        data: { status: "cancelled" },
        include: { items: true },
      });
    });

    res.json(parseGift(updated));
  } catch (error) {
    next(error);
  }
});

router.delete("/bulk", async (req, res, next) => {
  try {
    const { month, ids } = req.body ?? {};

    if (Array.isArray(ids) && ids.length > 0) {
      const result = await prisma.marketingGift.deleteMany({
        where: { id: { in: ids.map(String) } },
      });
      return res.json({
        success: true,
        deletedCount: result.count,
        message: `Đã xóa ${result.count} phiếu tặng`,
      });
    }

    if (!month || month === "all" || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: "Vui lòng chọn tháng cụ thể để xóa dữ liệu đã export" });
    }

    const result = await prisma.marketingGift.deleteMany({
      where: buildMonthWhere(month),
    });

    res.json({
      success: true,
      deletedCount: result.count,
      message: `Đã xóa ${result.count} phiếu tặng tháng ${month}`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
