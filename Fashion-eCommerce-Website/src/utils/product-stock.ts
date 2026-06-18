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

export function getProductTotalStock(product: Product): number | null {
  const variantStock = getVariantStock(product);
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
