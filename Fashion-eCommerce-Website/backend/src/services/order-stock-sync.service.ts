import { prisma } from "../config/prisma";
import {
  deductProductStockWithLog,
  resolveOrderStockReason,
} from "./stock-movement.service";

export async function syncMissingOrderStockDeductions() {
  const orders = await prisma.order.findMany({
    where: { status: { not: "cancelled" } },
    include: { items: true },
    orderBy: { createdAt: "asc" },
  });

  let deductedItems = 0;
  let skippedItems = 0;
  let giftItemsDeducted = 0;
  const errors: string[] = [];

  for (const order of orders) {
    try {
      await prisma.$transaction(async (tx) => {
        for (const item of order.items) {
          if (item.isPreOrder) {
            skippedItems += 1;
            continue;
          }

          const existingMovements = await tx.stockMovement.count({
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

          if (existingMovements > 0) {
            skippedItems += 1;
            continue;
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
            notes: isGiftLine
              ? "Đồng bộ trừ kho hàng tặng trong đơn hàng"
              : "Đồng bộ trừ kho cho đơn hàng cũ",
          });

          deductedItems += 1;
          if (isGiftLine) {
            giftItemsDeducted += 1;
          }
        }
      });
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
