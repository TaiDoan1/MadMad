import type { Prisma } from "@prisma/client";
import { deductStockData, getVariantAvailable, restoreStockData } from "../utils/product-stock";

export type StockMovementReason =
  | "CHECKOUT"
  | "MANUAL_ORDER"
  | "ORDER_CANCEL"
  | "ORDER_UNCANCEL"
  | "ORDER_EDIT_IN"
  | "ORDER_EDIT_OUT"
  | "MARKETING_GIFT"
  | "MARKETING_GIFT_CANCEL"
  | "STOCK_RECEIPT"
  | "ADMIN_ADJUSTMENT"
  | "RETURN"
  | "REFUND";

type TxClient = Prisma.TransactionClient;

type MovementInput = {
  productId: string;
  productName: string;
  color: string;
  size: string;
  quantityDelta: number;
  reason: StockMovementReason;
  referenceType?: string;
  referenceId?: string;
  referenceLabel?: string;
  stockBefore?: number | null;
  stockAfter?: number | null;
  notes?: string;
};

export function resolveOrderStockReason(orderNumber: string): "CHECKOUT" | "MANUAL_ORDER" {
  if (
    orderNumber.startsWith("DH-FB") ||
    orderNumber.startsWith("DH-IG") ||
    orderNumber.startsWith("DH-POS") ||
    orderNumber.startsWith("DH-ZALO")
  ) {
    return "MANUAL_ORDER";
  }
  return "CHECKOUT";
}

export async function recordStockMovement(tx: TxClient, input: MovementInput) {
  return tx.stockMovement.create({
    data: {
      productId: input.productId,
      productName: input.productName,
      color: input.color,
      size: input.size,
      quantityDelta: input.quantityDelta,
      reason: input.reason,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      referenceLabel: input.referenceLabel ?? null,
      stockBefore: input.stockBefore ?? null,
      stockAfter: input.stockAfter ?? null,
      notes: input.notes ?? null,
    },
  });
}

export async function deductProductStockWithLog(
  tx: TxClient,
  params: {
    productId: string;
    productName: string;
    color: string;
    size: string;
    quantity: number;
    reason: StockMovementReason;
    referenceType?: string;
    referenceId?: string;
    referenceLabel?: string;
    notes?: string;
  },
) {
  const product = await tx.product.findUnique({ where: { id: params.productId } });
  if (!product) {
    throw new Error(`Không tìm thấy sản phẩm: ${params.productId}`);
  }

  const stockBefore = getVariantAvailable(product, params.color, params.size);
  const nextStock = deductStockData(product, params.color, params.size, params.quantity);
  await tx.product.update({
    where: { id: params.productId },
    data: nextStock,
  });

  const stockAfter = stockBefore - params.quantity;

  await recordStockMovement(tx, {
    productId: params.productId,
    productName: params.productName || product.name,
    color: params.color,
    size: params.size,
    quantityDelta: -params.quantity,
    reason: params.reason,
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    referenceLabel: params.referenceLabel,
    stockBefore,
    stockAfter,
    notes: params.notes,
  });
}

export async function restoreProductStockWithLog(
  tx: TxClient,
  params: {
    productId: string;
    productName: string;
    color: string;
    size: string;
    quantity: number;
    reason: StockMovementReason;
    referenceType?: string;
    referenceId?: string;
    referenceLabel?: string;
    notes?: string;
  },
) {
  const product = await tx.product.findUnique({ where: { id: params.productId } });
  if (!product) {
    throw new Error(`Không tìm thấy sản phẩm: ${params.productId}`);
  }

  const stockBefore = getVariantAvailable(product, params.color, params.size);
  const nextStock = restoreStockData(product, params.color, params.size, params.quantity);
  await tx.product.update({
    where: { id: params.productId },
    data: nextStock,
  });

  const stockAfter = stockBefore + params.quantity;

  await recordStockMovement(tx, {
    productId: params.productId,
    productName: params.productName || product.name,
    color: params.color,
    size: params.size,
    quantityDelta: params.quantity,
    reason: params.reason,
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    referenceLabel: params.referenceLabel,
    stockBefore,
    stockAfter,
    notes: params.notes,
  });
}
