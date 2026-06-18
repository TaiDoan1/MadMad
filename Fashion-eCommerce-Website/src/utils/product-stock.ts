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

export function isProductSoldOut(product: Product): boolean {
  if (product.isPreOrder || (product.tags ?? []).some((tag) => tag.toLowerCase().includes("pre-order"))) {
    return false;
  }

  if (product.inStock === false) {
    return true;
  }

  const variantStock = getVariantStock(product);
  if (Object.keys(variantStock).length > 0) {
    return Object.values(variantStock).reduce((sum, qty) => sum + Number(qty || 0), 0) <= 0;
  }

  return (product.stock ?? 999) <= 0;
}
