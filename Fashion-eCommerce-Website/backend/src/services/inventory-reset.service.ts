import { prisma } from "../config/prisma";
import { getTotalStock, parseVariantStock, usesVariantStock } from "../utils/product-stock";

export async function resetInventoryToFreshBaseline() {
  const products = await prisma.product.findMany();
  let productsUpdated = 0;

  const deletedMovements = await prisma.$transaction(async (tx) => {
    const movementResult = await tx.stockMovement.deleteMany({});

    for (const product of products) {
      const variantStock = parseVariantStock(product.variantStock);
      const usesVariant = usesVariantStock(product);

      if (usesVariant) {
        const normalizedVariant = { ...variantStock };
        const total = getTotalStock({
          ...product,
          variantStock: JSON.stringify(normalizedVariant),
        });

        await tx.product.update({
          where: { id: product.id },
          data: {
            stock: null,
            variantStock: JSON.stringify(normalizedVariant),
            receivedStock: null,
            receivedVariantStock: JSON.stringify({ ...normalizedVariant }),
            inStock: total > 0,
          },
        });
      } else {
        const stock = Number(product.stock ?? 0);

        await tx.product.update({
          where: { id: product.id },
          data: {
            stock,
            variantStock: product.variantStock ?? "{}",
            receivedStock: stock,
            receivedVariantStock: "{}",
            inStock: stock > 0,
          },
        });
      }

      productsUpdated += 1;
    }

    return movementResult.count;
  });

  return {
    deletedMovements,
    productsUpdated,
    productsTotal: products.length,
  };
}
