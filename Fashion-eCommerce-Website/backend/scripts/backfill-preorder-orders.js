require("dotenv").config();

const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    const t0 = Date.now();
    console.log("🔁 Backfill pre-order fields for existing orders...");

    const products = await prisma.product.findMany({
      select: { id: true, isPreOrder: true, preOrderDays: true, tags: true },
    }).catch(async () => {
      // In case `tags` does not exist in DB schema, fall back.
      return await prisma.product.findMany({
        select: { id: true, isPreOrder: true, preOrderDays: true },
      });
    });

    const productMap = new Map(
      products.map((p) => [
        String(p.id),
        {
          isPreOrder: !!p.isPreOrder,
          preOrderDays: p.preOrderDays ?? null,
          tags: Array.isArray(p.tags) ? p.tags : null,
        },
      ]),
    );

    const orderItems = await prisma.orderItem.findMany({
      select: { id: true, orderId: true, productId: true, isPreOrder: true, preOrderDays: true },
    });

    let updatedItems = 0;
    const touchedOrders = new Set();

    for (const item of orderItems) {
      const p = productMap.get(String(item.productId));
      if (!p) continue;

      const shouldBePreOrder = !!p.isPreOrder;
      const nextDays = shouldBePreOrder ? (p.preOrderDays ?? 7) : null;

      const needsUpdate =
        item.isPreOrder !== shouldBePreOrder ||
        (shouldBePreOrder && (item.preOrderDays ?? null) !== nextDays) ||
        (!shouldBePreOrder && (item.preOrderDays ?? null) !== null);

      if (!needsUpdate) continue;

      await prisma.orderItem.update({
        where: { id: item.id },
        data: {
          isPreOrder: shouldBePreOrder,
          preOrderDays: shouldBePreOrder ? nextDays : null,
        },
      });

      updatedItems += 1;
      touchedOrders.add(item.orderId);
    }

    // Update containsPreOrder on touched orders
    let updatedOrders = 0;
    for (const orderId of touchedOrders) {
      const count = await prisma.orderItem.count({
        where: { orderId, isPreOrder: true },
      });
      await prisma.order.update({
        where: { id: orderId },
        data: { containsPreOrder: count > 0 },
      });
      updatedOrders += 1;
    }

    console.log(
      `✅ Done. Updated items: ${updatedItems}, updated orders: ${updatedOrders}. Took ${Date.now() - t0}ms`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("❌ Backfill failed:", e);
  process.exit(1);
});

