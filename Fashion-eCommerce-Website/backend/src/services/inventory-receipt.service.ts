import type { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { parseVariantStock, usesVariantStock } from "../utils/product-stock";
import { recordStockMovement } from "./stock-movement.service";

type TxClient = Prisma.TransactionClient;

type DbProduct = {
  id: string;
  name: string;
  sizes: string;
  colors: string;
  stock: number | null;
  variantStock: string | null;
  receivedStock?: number | null;
  receivedVariantStock?: string | null;
};

const RETURN_REASONS = new Set([
  "ORDER_CANCEL",
  "ORDER_EDIT_IN",
  "MARKETING_GIFT_CANCEL",
  "RETURN",
  "REFUND",
]);

const SALE_REASONS = new Set([
  "CHECKOUT",
  "MANUAL_ORDER",
  "ORDER_EDIT_OUT",
  "ORDER_UNCANCEL",
  "MARKETING_GIFT",
]);

function parseVariantKey(key: string, sizes: string[]): { color: string; size: string } {
  for (const size of sizes) {
    const suffix = `-${size}`;
    if (key.endsWith(suffix)) {
      return { color: key.slice(0, -suffix.length), size };
    }
  }

  const parts = key.split("-");
  if (parts.length < 2) {
    return { color: key, size: "—" };
  }

  return {
    color: parts.slice(0, -1).join("-"),
    size: parts[parts.length - 1],
  };
}

function buildVariantKeys(product: DbProduct): string[] {
  const sizes = product.sizes ? product.sizes.split(",").filter(Boolean) : [];
  const colors = product.colors ? product.colors.split(",").filter(Boolean) : [];
  if (colors.length === 0 || sizes.length === 0) return [];
  return colors.flatMap((color) => sizes.map((size) => `${color}-${size}`));
}

async function logInventoryDelta(
  tx: TxClient,
  product: DbProduct,
  params: {
    color: string;
    size: string;
    oldQty: number;
    newQty: number;
    notes?: string;
  },
) {
  const delta = params.newQty - params.oldQty;
  if (delta === 0) return;

  await recordStockMovement(tx, {
    productId: product.id,
    productName: product.name,
    color: params.color,
    size: params.size,
    quantityDelta: delta,
    reason: delta > 0 ? "STOCK_RECEIPT" : "ADMIN_ADJUSTMENT",
    referenceType: "product_inventory",
    referenceId: product.id,
    referenceLabel: product.name,
    stockBefore: params.oldQty,
    stockAfter: params.newQty,
    notes:
      params.notes ??
      (delta > 0 ? "Nhập kho / tăng tồn từ admin sản phẩm" : "Admin giảm tồn kho thủ công"),
  });
}

export async function logInitialInventoryReceipt(
  tx: TxClient,
  product: DbProduct,
  stock: number | null,
  variantStock: Record<string, number>,
) {
  const sizes = product.sizes ? product.sizes.split(",").filter(Boolean) : [];
  const usesVariant = usesVariantStock({
    sizes: product.sizes,
    colors: product.colors,
    stock,
    variantStock: JSON.stringify(variantStock),
    inStock: true,
  });

  if (usesVariant) {
    for (const [key, qty] of Object.entries(variantStock)) {
      const quantity = Number(qty || 0);
      if (quantity <= 0) continue;
      const { color, size } = parseVariantKey(key, sizes);
      await recordStockMovement(tx, {
        productId: product.id,
        productName: product.name,
        color,
        size,
        quantityDelta: quantity,
        reason: "STOCK_RECEIPT",
        referenceType: "product_inventory",
        referenceId: product.id,
        referenceLabel: product.name,
        stockBefore: 0,
        stockAfter: quantity,
        notes: "Nhập kho ban đầu",
      });
    }
    return;
  }

  const quantity = Number(stock ?? 0);
  if (quantity <= 0) return;

  await recordStockMovement(tx, {
    productId: product.id,
    productName: product.name,
    color: "Tổng",
    size: "—",
    quantityDelta: quantity,
    reason: "STOCK_RECEIPT",
    referenceType: "product_inventory",
    referenceId: product.id,
    referenceLabel: product.name,
    stockBefore: 0,
    stockAfter: quantity,
    notes: "Nhập kho ban đầu",
  });
}

export async function applyProductInventoryChange(
  tx: TxClient,
  product: DbProduct,
  incoming: { stock?: number | null; variantStock?: Record<string, number> },
) {
  const sizes = product.sizes ? product.sizes.split(",").filter(Boolean) : [];
  const oldVariant = parseVariantStock(product.variantStock);
  const receivedVariant = parseVariantStock(product.receivedVariantStock);
  let receivedStock = product.receivedStock;

  const usesVariant = usesVariantStock({
    stock: product.stock,
    variantStock: product.variantStock,
    sizes: product.sizes,
    colors: product.colors,
    inStock: true,
  });

  if (usesVariant && incoming.variantStock) {
    const newVariant = { ...incoming.variantStock };
    const keys = new Set([...buildVariantKeys(product), ...Object.keys(oldVariant), ...Object.keys(newVariant)]);

    for (const key of keys) {
      const oldQty = Number(oldVariant[key] ?? 0);
      const newQty = Number(newVariant[key] ?? 0);
      if (oldQty === newQty) continue;

      const { color, size } = parseVariantKey(key, sizes);
      await logInventoryDelta(tx, product, { color, size, oldQty, newQty });

      if (newQty > oldQty) {
        receivedVariant[key] = Number(receivedVariant[key] ?? 0) + (newQty - oldQty);
      }
    }

    return {
      stock: null,
      variantStock: JSON.stringify(newVariant),
      receivedStock: null,
      receivedVariantStock: JSON.stringify(receivedVariant),
    };
  }

  if (incoming.stock !== undefined && incoming.stock !== null) {
    const oldQty = Number(product.stock ?? 0);
    const newQty = Number(incoming.stock);
    if (oldQty !== newQty) {
      await logInventoryDelta(tx, product, {
        color: "Tổng",
        size: "—",
        oldQty,
        newQty,
      });

      if (newQty > oldQty) {
        receivedStock = Number(receivedStock ?? 0) + (newQty - oldQty);
      } else if (receivedStock === null || receivedStock === undefined) {
        receivedStock = Math.max(newQty, oldQty);
      }
    }

    return {
      stock: newQty,
      variantStock: product.variantStock ?? "{}",
      receivedStock,
      receivedVariantStock: product.receivedVariantStock ?? "{}",
    };
  }

  return null;
}

export function buildInitialReceivedStock(
  stock: number | null,
  variantStock: Record<string, number>,
  product: Pick<DbProduct, "sizes" | "colors" | "stock" | "variantStock">,
) {
  const usesVariant = usesVariantStock({
    sizes: product.sizes,
    colors: product.colors,
    stock,
    variantStock: JSON.stringify(variantStock),
    inStock: true,
  });

  if (usesVariant) {
    return {
      receivedStock: null,
      receivedVariantStock: JSON.stringify({ ...variantStock }),
    };
  }

  return {
    receivedStock: Number(stock ?? 0),
    receivedVariantStock: "{}",
  };
}

export async function inferReceivedFromMovements(product: DbProduct) {
  const movements = await prisma.stockMovement.findMany({
    where: { productId: product.id },
    select: { color: true, size: true, quantityDelta: true, reason: true },
  });

  const sizes = product.sizes ? product.sizes.split(",").filter(Boolean) : [];
  const usesVariant = usesVariantStock({
    stock: product.stock,
    variantStock: product.variantStock,
    sizes: product.sizes,
    colors: product.colors,
    inStock: true,
  });
  const currentVariant = parseVariantStock(product.variantStock);

  if (usesVariant) {
    const receivedVariant: Record<string, number> = { ...parseVariantStock(product.receivedVariantStock) };
    const keys = new Set([...buildVariantKeys(product), ...Object.keys(currentVariant)]);

    for (const key of keys) {
      if (receivedVariant[key] !== undefined && receivedVariant[key] > 0) continue;

      const { color, size } = parseVariantKey(key, sizes);
      const current = Number(currentVariant[key] ?? 0);
      let sold = 0;
      let returned = 0;

      movements.forEach((movement) => {
        if (movement.color !== color || movement.size !== size) return;
        if (movement.quantityDelta < 0 && SALE_REASONS.has(movement.reason)) {
          sold += Math.abs(movement.quantityDelta);
        }
        if (movement.quantityDelta > 0 && RETURN_REASONS.has(movement.reason)) {
          returned += movement.quantityDelta;
        }
      });

      receivedVariant[key] = Math.max(current + sold - returned, current);
    }

    return {
      receivedStock: null,
      receivedVariantStock: JSON.stringify(receivedVariant),
    };
  }

  const current = Number(product.stock ?? 0);
  let sold = 0;
  let returned = 0;

  movements.forEach((movement) => {
    if (movement.quantityDelta < 0 && SALE_REASONS.has(movement.reason)) {
      sold += Math.abs(movement.quantityDelta);
    }
    if (movement.quantityDelta > 0 && RETURN_REASONS.has(movement.reason)) {
      returned += movement.quantityDelta;
    }
  });

  const inferred = Math.max(current + sold - returned, current);
  return {
    receivedStock: inferred,
    receivedVariantStock: "{}",
  };
}
