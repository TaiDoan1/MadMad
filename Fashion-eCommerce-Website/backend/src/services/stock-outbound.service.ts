import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import {
  deductProductStockWithLog,
  restoreProductStockWithLog,
  resolveOrderStockReason,
  type StockMovementReason,
} from "./stock-movement.service";

type TxClient = Prisma.TransactionClient;

export const OUTBOUND_ORDER_STATUSES = ["processing", "shipping", "completed"] as const;

type OrderItemRow = {
  productId: string;
  productName: string;
  color: string;
  size: string;
  quantity: number;
  isPreOrder: boolean;
  price: number;
};

type OrderRow = {
  id: number;
  orderNumber: string;
  status: string;
  items: OrderItemRow[];
};

type MarketingGiftRow = {
  id: string;
  giftNumber: string;
  status: string;
  items: Array<{
    productId: string;
    productName: string;
    color: string;
    size: string;
    quantity: number;
  }>;
};

export const INACTIVE_ORDER_STATUSES = ["cancelled", "returned"] as const;

export function isOutboundOrderStatus(status: string) {
  return OUTBOUND_ORDER_STATUSES.includes(status as (typeof OUTBOUND_ORDER_STATUSES)[number]);
}

export function isInactiveOrderStatus(status: string) {
  return INACTIVE_ORDER_STATUSES.includes(status as (typeof INACTIVE_ORDER_STATUSES)[number]);
}

export async function orderItemHasStockMovement(
  tx: TxClient,
  order: Pick<OrderRow, "id" | "orderNumber">,
  item: Pick<OrderItemRow, "productId" | "color" | "size">,
) {
  const count = await tx.stockMovement.count({
    where: {
      productId: item.productId,
      color: item.color,
      size: item.size,
      OR: [
        { referenceType: "order", referenceId: String(order.id) },
        { referenceLabel: order.orderNumber },
      ],
    },
  });
  return count > 0;
}

export async function marketingItemHasStockMovement(
  tx: TxClient,
  gift: Pick<MarketingGiftRow, "giftNumber">,
  item: Pick<MarketingGiftRow["items"][number], "productId" | "color" | "size">,
) {
  const count = await tx.stockMovement.count({
    where: {
      productId: item.productId,
      color: item.color,
      size: item.size,
      OR: [
        { referenceType: "marketing_gift", referenceId: gift.giftNumber },
        { referenceLabel: gift.giftNumber },
      ],
    },
  });
  return count > 0;
}

export async function deductOrderItemIfNeeded(
  tx: TxClient,
  order: OrderRow,
  item: OrderItemRow,
  notes?: string,
) {
  if (item.isPreOrder) {
    return { deducted: false, skipped: true, isGiftLine: false };
  }

  if (await orderItemHasStockMovement(tx, order, item)) {
    return { deducted: false, skipped: true, isGiftLine: false };
  }

  const product = await tx.product.findUnique({ where: { id: item.productId } });
  const isGiftLine = item.price <= 0 || Boolean(product?.isGiftProduct);

  await deductProductStockWithLog(tx, {
    productId: item.productId,
    productName: item.productName,
    color: item.color,
    size: item.size,
    quantity: item.quantity,
    reason: resolveOrderStockReason(order.orderNumber),
    referenceType: "order",
    referenceId: String(order.id),
    referenceLabel: order.orderNumber,
    notes:
      notes ??
      (isGiftLine
        ? "Trừ kho hàng tặng khi đặt hàng thành công"
        : "Trừ kho khi đặt hàng thành công"),
  });

  return { deducted: true, skipped: false, isGiftLine };
}

export async function deductOrderItemsIfNeeded(
  tx: TxClient,
  order: OrderRow,
  notes?: string,
) {
  let deductedItems = 0;
  let skippedItems = 0;
  let giftItemsDeducted = 0;

  for (const item of order.items) {
    const result = await deductOrderItemIfNeeded(tx, order, item, notes);
    if (result.skipped) {
      skippedItems += 1;
    } else if (result.deducted) {
      deductedItems += 1;
      if (result.isGiftLine) giftItemsDeducted += 1;
    }
  }

  return { deductedItems, skippedItems, giftItemsDeducted };
}

/** @deprecated use deductOrderItemsIfNeeded */
export async function deductOutboundOrderItems(
  tx: TxClient,
  order: OrderRow,
  notes?: string,
) {
  if (!isOutboundOrderStatus(order.status)) {
    return { deductedItems: 0, skippedItems: 0, giftItemsDeducted: 0 };
  }

  return deductOrderItemsIfNeeded(tx, order, notes);
}

export async function restoreOrderItemsIfDeducted(
  tx: TxClient,
  order: Pick<OrderRow, "id" | "orderNumber">,
  items: OrderItemRow[],
  notes?: string,
  reason: StockMovementReason = "ORDER_CANCEL",
) {
  let restoredItems = 0;

  for (const item of items) {
    if (item.isPreOrder) continue;
    if (!(await orderItemHasStockMovement(tx, order, item))) continue;

    await restoreProductStockWithLog(tx, {
      productId: item.productId,
      productName: item.productName,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
      reason,
      referenceType: "order",
      referenceId: String(order.id),
      referenceLabel: order.orderNumber,
      notes: notes ?? "Hoàn kho do hủy/hoàn đơn",
    });
    restoredItems += 1;
  }

  return { restoredItems };
}

export async function restoreMarketingItemsIfDeducted(
  tx: TxClient,
  gift: Pick<MarketingGiftRow, "giftNumber">,
  items: MarketingGiftRow["items"],
  notes?: string,
  reason: StockMovementReason = "MARKETING_GIFT_CANCEL",
) {
  let restoredItems = 0;

  for (const item of items) {
    if (!(await marketingItemHasStockMovement(tx, gift, item))) continue;

    await restoreProductStockWithLog(tx, {
      productId: item.productId,
      productName: item.productName,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
      reason,
      referenceType: "marketing_gift",
      referenceId: gift.giftNumber,
      referenceLabel: gift.giftNumber,
      notes: notes ?? "Hoàn kho phiếu marketing",
    });
    restoredItems += 1;
  }

  return { restoredItems };
}

export async function deductMarketingGiftItemIfNeeded(
  tx: TxClient,
  gift: MarketingGiftRow,
  item: MarketingGiftRow["items"][number],
  notes?: string,
) {
  if (gift.status !== "completed") {
    return { deducted: false, skipped: true };
  }

  if (await marketingItemHasStockMovement(tx, gift, item)) {
    return { deducted: false, skipped: true };
  }

  await deductProductStockWithLog(tx, {
    productId: item.productId,
    productName: item.productName,
    color: item.color,
    size: item.size,
    quantity: item.quantity,
    reason: "MARKETING_GIFT",
    referenceType: "marketing_gift",
    referenceId: gift.giftNumber,
    referenceLabel: gift.giftNumber,
    notes: notes ?? "Trừ kho khi xuất quà tặng KOL/KOC",
  });

  return { deducted: true, skipped: false };
}

export async function syncMissingOrderOutboundDeductions() {
  const orders = await prisma.order.findMany({
    where: { status: { notIn: [...INACTIVE_ORDER_STATUSES] } },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  });

  let deductedItems = 0;
  let skippedItems = 0;
  let giftItemsDeducted = 0;
  const errors: string[] = [];

  for (const order of orders) {
    try {
      const result = await prisma.$transaction(async (tx) =>
        deductOrderItemsIfNeeded(tx, order as OrderRow, "Đồng bộ trừ kho đơn đã đặt thành công"),
      );
      deductedItems += result.deductedItems;
      skippedItems += result.skippedItems;
      giftItemsDeducted += result.giftItemsDeducted;
    } catch (error: any) {
      errors.push(`${order.orderNumber}: ${error?.message || "Lỗi không xác định"}`);
    }
  }

  return {
    deductedItems,
    skippedItems,
    giftItemsDeducted,
    ordersChecked: orders.length,
    errors,
  };
}

export async function syncMissingMarketingOutboundDeductions() {
  const gifts = await prisma.marketingGift.findMany({
    where: { status: "completed" },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  });

  let deductedItems = 0;
  let skippedItems = 0;
  const errors: string[] = [];

  for (const gift of gifts) {
    try {
      await prisma.$transaction(async (tx) => {
        for (const item of gift.items) {
          const result = await deductMarketingGiftItemIfNeeded(
            tx,
            gift as MarketingGiftRow,
            item,
            "Đồng bộ trừ kho phiếu tặng KOL/KOC",
          );
          if (result.skipped) skippedItems += 1;
          if (result.deducted) deductedItems += 1;
        }
      });
    } catch (error: any) {
      errors.push(`${gift.giftNumber}: ${error?.message || "Lỗi không xác định"}`);
    }
  }

  return {
    deductedItems,
    skippedItems,
    giftsChecked: gifts.length,
    errors,
  };
}

export async function syncAllOutboundStockDeductions() {
  const orders = await syncMissingOrderOutboundDeductions();
  const marketing = await syncMissingMarketingOutboundDeductions();

  return {
    orders,
    marketing,
    totalDeducted: orders.deductedItems + marketing.deductedItems,
    totalErrors: [...orders.errors, ...marketing.errors],
  };
}
