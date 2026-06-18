import type { Product } from "@/types/product";

export function isProductSoldOut(product: Product): boolean {
  if (product.isPreOrder || (product.tags ?? []).some((tag) => tag.toLowerCase().includes("pre-order"))) {
    return false;
  }

  if (!product.inStock) {
    return true;
  }

  if (product.variantStock && Object.keys(product.variantStock).length > 0) {
    return Object.values(product.variantStock).reduce((sum, qty) => sum + qty, 0) <= 0;
  }

  return (product.stock ?? 999) <= 0;
}
