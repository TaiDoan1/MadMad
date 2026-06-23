import { Router } from "express";
import { prisma } from "../config/prisma";
import {
  deductProductStockWithLog,
  restoreProductStockWithLog,
  type StockMovementReason,
} from "../services/stock-movement.service";
import { inferReceivedFromMovements } from "../services/inventory-receipt.service";
import { parseVariantStock } from "../utils/product-stock";
import { syncAllOutboundStockDeductions } from "../services/stock-outbound.service";
import { ensureDatabaseMigrations } from "../services/database-migrate.service";

const router = Router();

const VALID_REASONS: StockMovementReason[] = [
  "CHECKOUT",
  "MANUAL_ORDER",
  "ORDER_CANCEL",
  "ORDER_RETURN",
  "ORDER_UNCANCEL",
  "ORDER_EDIT_IN",
  "ORDER_EDIT_OUT",
  "MARKETING_GIFT",
  "MARKETING_GIFT_CANCEL",
  "MARKETING_GIFT_EDIT_IN",
  "MARKETING_GIFT_EDIT_OUT",
  "STOCK_RECEIPT",
  "ADMIN_ADJUSTMENT",
  "RETURN",
  "REFUND",
];

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

router.get("/movements", async (req, res, next) => {
  try {
    const month = typeof req.query.month === "string" ? req.query.month : undefined;
    const reason = typeof req.query.reason === "string" ? req.query.reason : undefined;
    const productId = typeof req.query.productId === "string" ? req.query.productId : undefined;
    const search = typeof req.query.search === "string" ? req.query.search.trim().toLowerCase() : "";
    const direction = typeof req.query.direction === "string" ? req.query.direction : "all";

    const where: any = {
      ...buildMonthWhere(month),
    };

    if (reason && reason !== "all" && VALID_REASONS.includes(reason as StockMovementReason)) {
      where.reason = reason;
    }

    if (productId && productId !== "all") {
      where.productId = productId;
    }

    if (direction === "in") {
      where.quantityDelta = { gt: 0 };
    } else if (direction === "out") {
      where.quantityDelta = { lt: 0 };
    }

    let movements = await prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 2000,
    });

    if (search) {
      movements = movements.filter((row) => {
        return (
          row.productName.toLowerCase().includes(search) ||
          row.productId.toLowerCase().includes(search) ||
          row.color.toLowerCase().includes(search) ||
          row.size.toLowerCase().includes(search) ||
          (row.referenceLabel ?? "").toLowerCase().includes(search) ||
          (row.notes ?? "").toLowerCase().includes(search)
        );
      });
    }

    res.json(movements);
  } catch (error) {
    next(error);
  }
});

router.get("/movements/:id", async (req, res, next) => {
  try {
    const movement = await prisma.stockMovement.findUnique({
      where: { id: req.params.id },
    });

    if (!movement) {
      return res.status(404).json({ message: "Không tìm thấy biến động tồn kho" });
    }

    const refLabel = movement.referenceLabel ?? movement.referenceId;
    const windowStart = new Date(movement.createdAt.getTime() - 2 * 60 * 1000);
    const windowEnd = new Date(movement.createdAt.getTime() + 2 * 60 * 1000);

    const related = refLabel
      ? await prisma.stockMovement.findMany({
          where: {
            id: { not: movement.id },
            createdAt: { gte: windowStart, lte: windowEnd },
            OR: [{ referenceLabel: refLabel }, { referenceId: refLabel }],
          },
          orderBy: { createdAt: "asc" },
        })
      : [];

    res.json({ movement, related });
  } catch (error) {
    next(error);
  }
});

router.get("/stats", async (req, res, next) => {
  try {
    const month = typeof req.query.month === "string" ? req.query.month : undefined;
    const productId = typeof req.query.productId === "string" ? req.query.productId : undefined;

    const where: any = {
      ...buildMonthWhere(month),
    };
    if (productId && productId !== "all") {
      where.productId = productId;
    }

    const movements = await prisma.stockMovement.findMany({
      where,
      select: {
        quantityDelta: true,
        reason: true,
      },
    });

    const totalIn = movements.filter((m) => m.quantityDelta > 0).reduce((sum, m) => sum + m.quantityDelta, 0);
    const totalOut = movements
      .filter((m) => m.quantityDelta < 0)
      .reduce((sum, m) => sum + Math.abs(m.quantityDelta), 0);

    const reasonMap = new Map<string, number>();
    movements.forEach((m) => {
      reasonMap.set(m.reason, (reasonMap.get(m.reason) ?? 0) + 1);
    });

    const byReason = [...reasonMap.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    res.json({
      totalMovements: movements.length,
      totalIn,
      totalOut,
      netChange: totalIn - totalOut,
      byReason,
    });
  } catch (error) {
    next(error);
  }
});

router.post("/returns", async (req, res, next) => {
  try {
    const {
      productId,
      color,
      size,
      quantity,
      reason = "RETURN",
      referenceLabel,
      notes,
    } = req.body;

    if (!productId || !color || !size || !quantity) {
      return res.status(400).json({ message: "Thiếu thông tin sản phẩm hoàn/trả!" });
    }

    const movementReason: StockMovementReason =
      reason === "REFUND" ? "REFUND" : "RETURN";

    const product = await prisma.product.findUnique({ where: { id: String(productId) } });
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    const qty = Math.max(1, Number(quantity));

    const movement = await prisma.$transaction(async (tx) => {
      await restoreProductStockWithLog(tx, {
        productId: product.id,
        productName: product.name,
        color: String(color).trim(),
        size: String(size).trim(),
        quantity: qty,
        reason: movementReason,
        referenceType: "manual_return",
        referenceLabel: referenceLabel ? String(referenceLabel).trim() : undefined,
        notes: notes ? String(notes).trim() : undefined,
      });

      return tx.stockMovement.findFirst({
        where: { productId: product.id },
        orderBy: { createdAt: "desc" },
      });
    });

    res.status(201).json(movement);
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Không thể ghi nhận hoàn/trả hàng" });
  }
});

router.post("/backfill-received", async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany();
    let updated = 0;

    for (const product of products) {
      const receivedVariant = parseVariantStock(product.receivedVariantStock);
      const hasReceived =
        product.receivedStock !== null && product.receivedStock !== undefined
          ? product.receivedStock > 0
          : Object.values(receivedVariant).some((qty) => Number(qty) > 0);

      if (hasReceived) continue;

      const inferred = await inferReceivedFromMovements(product);
      await prisma.product.update({
        where: { id: product.id },
        data: inferred,
      });
      updated += 1;
    }

    res.json({ updated, total: products.length });
  } catch (error) {
    next(error);
  }
});

router.post("/sync-outbound", async (_req, res, next) => {
  try {
    await ensureDatabaseMigrations();
    const result = await syncAllOutboundStockDeductions();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/migrate-db", async (_req, res, next) => {
  try {
    const result = await ensureDatabaseMigrations();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
