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
  if (totalStock !== null && totalStock <= 0) {
    return { ...product, inStock: false };
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
