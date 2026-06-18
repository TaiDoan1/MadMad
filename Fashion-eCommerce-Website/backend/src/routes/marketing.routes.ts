import { Router } from "express";
import { prisma } from "../config/prisma";
import { deductStockData, getVariantAvailable, restoreStockData } from "../utils/product-stock";

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

router.get("/", async (_req, res, next) => {
  try {
    const gifts = await prisma.marketingGift.findMany({
      include: { items: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(gifts.map(parseGift));
  } catch (error) {
    next(error);
  }
});

router.get("/stats", async (_req, res, next) => {
  try {
    const gifts = await prisma.marketingGift.findMany({
      where: { status: "completed" },
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
          productImage: product.image,
          color,
          size,
          quantity,
          unitPrice,
          lineTotal: unitPrice * quantity,
        });
      }

      for (const item of normalizedItems) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;
        const nextStock = deductStockData(product, item.color, item.size, item.quantity);
        await tx.product.update({
          where: { id: item.productId },
          data: nextStock,
        });
      }

      const productValue = normalizedItems.reduce((sum, item) => sum + item.lineTotal, 0);
      const cash = Math.max(0, Number(cashAmount) || 0);
      const totalCost = productValue + cash;

      return tx.marketingGift.create({
        data: {
          giftNumber: buildGiftNumber(),
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
      for (const item of gift.items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) continue;
        const nextStock = restoreStockData(product, item.color, item.size, item.quantity);
        await tx.product.update({
          where: { id: item.productId },
          data: nextStock,
        });
      }

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

export default router;
