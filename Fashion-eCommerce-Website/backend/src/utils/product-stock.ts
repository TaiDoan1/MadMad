type DbProduct = {
  sizes: string;
  colors: string;
  stock: number | null;
  variantStock: string | null;
  inStock: boolean;
};

export function parseVariantStock(raw: string | null | undefined): Record<string, number> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function usesVariantStock(product: DbProduct): boolean {
  const variantStock = parseVariantStock(product.variantStock);
  if (Object.keys(variantStock).length > 0) {
    return true;
  }
  const sizes = product.sizes ? product.sizes.split(",").filter(Boolean) : [];
  const colors = product.colors ? product.colors.split(",").filter(Boolean) : [];
  return sizes.length > 0 && colors.length > 0 && (product.stock === null || product.stock === undefined);
}

export function getVariantAvailable(product: DbProduct, color: string, size: string): number {
  const variantStock = parseVariantStock(product.variantStock);
  const key = `${color}-${size}`;
  if (usesVariantStock(product)) {
    return Number(variantStock[key] ?? 0);
  }
  return Number(product.stock ?? 0);
}

export function getTotalStock(product: DbProduct): number {
  const variantStock = parseVariantStock(product.variantStock);
  const sizes = product.sizes ? product.sizes.split(",").filter(Boolean) : [];
  const colors = product.colors ? product.colors.split(",").filter(Boolean) : [];

  if (usesVariantStock(product)) {
    return colors.reduce((colorSum, color) => {
      return (
        colorSum +
        sizes.reduce((sizeSum, size) => {
          const key = `${color}-${size}`;
          return sizeSum + Number(variantStock[key] ?? 0);
        }, 0)
      );
    }, 0);
  }

  if (Object.keys(variantStock).length > 0) {
    return Object.values(variantStock).reduce((sum, qty) => sum + Number(qty || 0), 0);
  }

  return Number(product.stock ?? 0);
}

export function deductStockData(
  product: DbProduct,
  color: string,
  size: string,
  quantity: number,
): { stock: number | null | undefined; variantStock: string; inStock: boolean } {
  const variantStock = parseVariantStock(product.variantStock);
  const key = `${color}-${size}`;

  if (usesVariantStock(product)) {
    const current = Number(variantStock[key] ?? 0);
    if (current < quantity) {
      throw new Error(`Không đủ tồn kho cho ${color} / ${size} (còn ${current}, cần ${quantity})`);
    }
    variantStock[key] = current - quantity;
    const total = getTotalStock({
      ...product,
      variantStock: JSON.stringify(variantStock),
    });
    return {
      stock: product.stock,
      variantStock: JSON.stringify(variantStock),
      inStock: total > 0,
    };
  }

  const current = Number(product.stock ?? 0);
  if (current < quantity) {
    throw new Error(`Không đủ tồn kho (còn ${current}, cần ${quantity})`);
  }
  const nextStock = current - quantity;
  return {
    stock: nextStock,
    variantStock: product.variantStock ?? "{}",
    inStock: nextStock > 0,
  };
}

export function restoreStockData(
  product: DbProduct,
  color: string,
  size: string,
  quantity: number,
): { stock: number | null | undefined; variantStock: string; inStock: boolean } {
  const variantStock = parseVariantStock(product.variantStock);
  const key = `${color}-${size}`;

  if (usesVariantStock(product)) {
    variantStock[key] = Number(variantStock[key] ?? 0) + quantity;
    return {
      stock: product.stock,
      variantStock: JSON.stringify(variantStock),
      inStock: true,
    };
  }

  const nextStock = Number(product.stock ?? 0) + quantity;
  return {
    stock: nextStock,
    variantStock: product.variantStock ?? "{}",
    inStock: true,
  };
}
