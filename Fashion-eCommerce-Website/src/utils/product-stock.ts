import type { Product } from "@/types/product";

function getVariantStock(product: Product): Record<string, number> {
  const raw = product.variantStock as Record<string, number> | string | undefined;
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as Record<string, number>;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return raw;
}

export function usesVariantStock(product: Product): boolean {
  const variantStock = getVariantStock(product);
  if (Object.keys(variantStock).length > 0) {
    return true;
  }
  const hasAttributes = (product.colors?.length ?? 0) > 0 && (product.sizes?.length ?? 0) > 0;
  return hasAttributes && (product.stock === undefined || product.stock === null);
}

export function getProductTotalStock(product: Product): number | null {
  const variantStock = getVariantStock(product);

  if (usesVariantStock(product)) {
    return (product.colors ?? []).reduce((colorSum, color) => {
      return (
        colorSum +
        (product.sizes ?? []).reduce((sizeSum, size) => {
          const key = `${color}-${size}`;
          return sizeSum + Number(variantStock[key] ?? 0);
        }, 0)
      );
    }, 0);
  }

  if (Object.keys(variantStock).length > 0) {
    return Object.values(variantStock).reduce((sum, qty) => sum + Number(qty || 0), 0);
  }

  if (product.stock !== undefined && product.stock !== null) {
    return Number(product.stock);
  }

  return null;
}

export function isProductSoldOut(product: Product): boolean {
  if (product.inStock === false) {
    return true;
  }

  const totalStock = getProductTotalStock(product);
  if (totalStock !== null) {
    return totalStock <= 0;
  }

  return false;
}

export function syncProductStock<T extends Product>(product: T): T {
  const totalStock = getProductTotalStock(product);
  if (totalStock !== null) {
    // Always sync inStock with the actual computed totalStock value
    // This fixes both:
    //   - inStock=true but stock=0 (false positive → mark as sold out)
    //   - inStock=false but stock>0 (false negative → unblock the product!)
    return { ...product, inStock: totalStock > 0 };
  }
  return product;
}

export function resolveSoldOutState({
  forceSoldOut,
  totalStock,
}: {
  forceSoldOut: boolean;
  totalStock: number;
}): { soldOut: boolean; inStock: boolean } {
  const soldOut = forceSoldOut || totalStock <= 0;
  return {
    soldOut,
    inStock: !soldOut && totalStock > 0,
  };
}

export function getForceSoldOutFromProduct(product: Product): boolean {
  const totalStock = getProductTotalStock(product);
  return product.inStock === false && (totalStock === null || totalStock > 0);
}

export function getVariantAvailableStock(product: Product, color: string, size: string): number {
  const variantStock = getVariantStock(product);
  const key = `${color}-${size}`;
  if (usesVariantStock(product)) {
    return Number(variantStock[key] ?? 0);
  }
  return Number(product.stock ?? 0);
}

function getReceivedVariantStock(product: Product): Record<string, number> {
  const raw = product.receivedVariantStock as Record<string, number> | string | undefined;
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as Record<string, number>;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return raw;
}

export function getProductReceivedTotal(product: Product): number | null {
  if (usesVariantStock(product)) {
    const receivedVariant = getReceivedVariantStock(product);
    const keys = new Set<string>();
    (product.colors ?? []).forEach((color) => {
      (product.sizes ?? []).forEach((size) => keys.add(`${color}-${size}`));
    });
    Object.keys(getVariantStock(product)).forEach((key) => keys.add(key));
    Object.keys(receivedVariant).forEach((key) => keys.add(key));

    if (keys.size === 0) return null;

    let total = 0;
    keys.forEach((key) => {
      total += Number(receivedVariant[key] ?? 0);
    });
    return total > 0 ? total : null;
  }

  if (product.receivedStock !== undefined && product.receivedStock !== null) {
    return Number(product.receivedStock);
  }

  return null;
}

export function getVariantReceivedStock(product: Product, color: string, size: string): number | null {
  if (!usesVariantStock(product)) {
    return product.receivedStock !== undefined && product.receivedStock !== null
      ? Number(product.receivedStock)
      : null;
  }

  const received = Number(getReceivedVariantStock(product)[`${color}-${size}`] ?? 0);
  return received > 0 ? received : null;
}

export function formatStockRatio(current: number, received: number | null): string {
  if (received === null || received <= 0) {
    return `${current}`;
  }
  return `${current}/${received}`;
}

export interface ProductStockSummary {
  current: number | null;
  received: number | null;
  sold: number | null;
  isVariant: boolean;
  display: string;
}

export function getProductStockSummary(product: Product): ProductStockSummary {
  const current = getProductTotalStock(product);
  const received = getProductReceivedTotal(product);
  const isVariant = usesVariantStock(product);
  const sold =
    current !== null && received !== null && received >= current ? Math.max(received - current, 0) : null;

  let display = "Còn hàng";
  if (current !== null) {
    if (current <= 0) {
      display = received !== null && received > 0 ? `0/${received}` : "Hết hàng";
    } else if (received !== null && received > 0) {
      display = formatStockRatio(current, received);
    } else {
      display = `${current}`;
    }
  }

  return { current, received, sold, isVariant, display };
}
