import { Router } from "express";
import { prisma } from "../config/prisma";
import { sendOrderConfirmationEmail } from "../services/email.service";
import {
  deductProductStockWithLog,
  restoreProductStockWithLog,
} from "../services/stock-movement.service";
import { getProductImageForColorFromDb, isStoredImageMismatch } from "../utils/product-image";
import {
  deductOrderItemsIfNeeded,
  orderItemHasStockMovement,
  restoreOrderItemsIfDeducted,
  syncMissingOrderOutboundDeductions,
} from "../services/stock-outbound.service";

const router = Router();

// Hàm hỗ trợ tự động tính toán thăng hạng VIP
async function processVipPoints(phone: string, email: string, orderTotal: number) {
  try {
    const cleanPhone = phone.trim().replace(/\s+/g, "");
    const cleanEmail = email.trim().toLowerCase();

    // Tìm kiếm VIP Member
    const member = await prisma.vIPMember.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          { email: cleanEmail }
        ]
      }
    });

    if (!member) return null;

    // Tính điểm kiếm được (10.000đ = 1 điểm)
    const pointsEarned = Math.max(1, Math.floor(orderTotal / 10000));
    const nextPoints = member.points + pointsEarned;

    // Quy tắc thăng hạng VIP
    let nextTier = "BRONZE";
    if (nextPoints >= 800) nextTier = "PLATINUM";
    else if (nextPoints >= 400) nextTier = "GOLD";
    else if (nextPoints >= 150) nextTier = "SILVER";

    // Cập nhật Database
    const updatedMember = await prisma.vIPMember.update({
      where: { id: member.id },
      data: {
        points: nextPoints,
        tier: nextTier
      }
    });

    console.log(`👑 VIP TÍCH LŨY: Đã cộng +${pointsEarned} điểm cho ${member.fullName}. Tổng: ${nextPoints} (${nextTier})`);
    return updatedMember;
  } catch (err) {
    console.error("❌ Lỗi tích điểm VIP:", err);
    return null;
  }
}

// 1. GET /api/orders - Lấy danh sách tất cả đơn hàng (có bộ lọc)
router.get("/", async (req, res, next) => {
  try {
    const { status, source } = req.query;

    const whereClause: any = {};
    if (status && status !== "all") {
      whereClause.status = String(status);
    }

    if (source && source !== "all") {
      // Nhận diện nguồn đơn hàng qua tiền tố Order Number
      if (source === "facebook") whereClause.orderNumber = { startsWith: "DH-FB" };
      else if (source === "instagram") whereClause.orderNumber = { startsWith: "DH-IG" };
      else if (source === "pos") whereClause.orderNumber = { startsWith: "DH-POS" };
      else if (source === "website") {
        whereClause.orderNumber = {
          not: { startsWith: "DH-FB" }
        };
        whereClause.AND = [
          { orderNumber: { not: { startsWith: "DH-IG" } } },
          { orderNumber: { not: { startsWith: "DH-POS" } } }
        ];
      }
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: { items: true },
      orderBy: { createdAt: "desc" }
    });

    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// POST /api/orders/sync-item-images - Đồng bộ ảnh sản phẩm theo màu cho các dòng đơn hàng cũ
router.post("/sync-item-images", async (_req, res, next) => {
  try {
    const orderItems = await prisma.orderItem.findMany({
      where: {
        color: { not: "" },
      },
    });

    const productIds = [...new Set(orderItems.map((item) => item.productId).filter(Boolean))];
    const products = productIds.length
      ? await prisma.product.findMany({ where: { id: { in: productIds } } })
      : [];
    const productMap = new Map(products.map((product) => [product.id, product]));

    let updated = 0;
    for (const item of orderItems) {
      const product = productMap.get(item.productId);
      if (!product || !item.color?.trim()) continue;

      const expectedImage = getProductImageForColorFromDb(product, item.color);
      if (!isStoredImageMismatch(item.productImage, expectedImage)) continue;

      await prisma.orderItem.update({
        where: { id: item.id },
        data: { productImage: expectedImage },
      });
      updated += 1;
    }

    res.json({ updated, total: orderItems.length });
  } catch (error) {
    next(error);
  }
});

// POST /api/orders/sync-stock-deductions - Trừ kho cho các dòng đơn hàng chưa có nhật ký tồn kho
router.post("/sync-stock-deductions", async (_req, res, next) => {
  try {
    const result = await syncMissingOrderOutboundDeductions();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// 2. GET /api/orders/:id - Chi tiết đơn hàng
router.get("/:id", async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true }
    });

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    res.json(order);
  } catch (error) {
    next(error);
  }
});

// 3. POST /api/orders - Tạo đơn hàng mới (từ Storefront Checkout hoặc tạo tay POS)
router.post("/", async (req, res, next) => {
  try {
    const {
      orderNumber,
      customerName,
      customerEmail,
      customerPhone,
      street,
      ward,
      district,
      province,
      subtotal,
      discount,
      shipping,
      total,
      paymentMethod,
      shippingMethod,
      status,
      isPaid,
      notes,
      couponCode,
      containsPreOrder,
      items
    } = req.body;

    if (!customerName || !customerPhone || !items || items.length === 0) {
      return res.status(400).json({ message: "Thiếu thông tin đặt hàng bắt buộc!" });
    }

    // Tự sinh mã đơn hàng nếu chưa có
    const finalOrderNumber = orderNumber || `DH${Date.now()}`;

    const normalizedItems = Array.isArray(items) ? items : [];
    const computedContainsPreOrder =
      typeof containsPreOrder === "boolean"
        ? containsPreOrder
        : normalizedItems.some((item: any) => !!item?.isPreOrder);

    const productIds = [
      ...new Set(
        normalizedItems
          .map((item: any) => String(item.productId || item.product?.id || ""))
          .filter(Boolean),
      ),
    ];
    const products = productIds.length
      ? await prisma.product.findMany({ where: { id: { in: productIds } } })
      : [];
    const productMap = new Map(products.map((product) => [product.id, product]));

    const itemsForCreate = normalizedItems.map((item: any) => {
      const productId = String(item.productId || item.product?.id || "");
      const product = productMap.get(productId);
      const color = String(item.color || "");
      let productImage = String(item.productImage || item.product?.image || "");
      if (product && color) {
        const resolvedImage = getProductImageForColorFromDb(product, color);
        if (resolvedImage) productImage = resolvedImage;
      }

      return {
        productId,
        productName: String(item.productName || item.product?.name || ""),
        productImage,
        isPreOrder: !!item.isPreOrder,
        preOrderDays:
          item.preOrderDays !== undefined && item.preOrderDays !== null
            ? Number(item.preOrderDays)
            : null,
        quantity: Number(item.quantity),
        size: item.size,
        color: item.color,
        price: Number(item.price),
      };
    });

    const newOrder = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber: finalOrderNumber,
          customerName,
          customerEmail: customerEmail || "",
          customerPhone,
          street: street || "Mua trực tiếp tại Shop",
          ward: ward || "",
          district: district || "",
          province: province || "",
          subtotal: Number(subtotal),
          discount: Number(discount || 0),
          shipping: Number(shipping || 0),
          total: Number(total),
          paymentMethod: paymentMethod || "cod",
          shippingMethod: shippingMethod || "standard",
          status: status || "pending",
          isPaid: !!isPaid,
          containsPreOrder: computedContainsPreOrder,
          notes: notes || "",
          couponCode: couponCode || "",
          items: {
            create: itemsForCreate,
          },
        },
        include: { items: true },
      });

      const orderStatus = status || "pending";
      if (orderStatus !== "cancelled") {
        await deductOrderItemsIfNeeded(
          tx,
          {
            id: created.id,
            orderNumber: finalOrderNumber,
            status: orderStatus,
            items: created.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              color: item.color,
              size: item.size,
              quantity: item.quantity,
              isPreOrder: item.isPreOrder,
              price: item.price,
            })),
          },
          "Trừ kho khi đặt hàng thành công",
        );
      }

      return created;
    });

    // Nếu đơn hàng tạo ra đã Thành công ngay (ví dụ POS/Cửa hàng đã thanh toán và giao trực tiếp), tự tích điểm VIP
    if (newOrder.status === "completed") {
      await processVipPoints(newOrder.customerPhone, newOrder.customerEmail, newOrder.total);
    }

    // Gửi email tự động thông báo đặt hàng thành công! (Tự động gửi cho cả Khách hàng và Admin Gmail)
    sendOrderConfirmationEmail(newOrder).catch((err) => {
      console.error("❌ Lỗi gửi email xác nhận đơn hàng:", err);
    });

    res.status(201).json(newOrder);
  } catch (error) {
    next(error);
  }
});

// 4. PUT /api/orders/:id/status - Cập nhật trạng thái vận hành đơn
router.put("/:id/status", async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Thiếu trạng thái cập nhật!" });
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!existingOrder) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      if (status === "cancelled" && existingOrder.status !== "cancelled") {
        await restoreOrderItemsIfDeducted(
          tx,
          existingOrder,
          existingOrder.items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            color: item.color,
            size: item.size,
            quantity: item.quantity,
            isPreOrder: item.isPreOrder,
            price: item.price,
          })),
          "Hoàn kho do hủy đơn hàng",
        );
      }

      if (status !== "cancelled" && existingOrder.status === "cancelled") {
        await deductOrderItemsIfNeeded(
          tx,
          {
            id: existingOrder.id,
            orderNumber: existingOrder.orderNumber,
            status,
            items: existingOrder.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              color: item.color,
              size: item.size,
              quantity: item.quantity,
              isPreOrder: item.isPreOrder,
              price: item.price,
            })),
          },
          "Trừ kho lại khi hoàn tác hủy đơn",
        );
      }

      return tx.order.update({
        where: { id: orderId },
        data: { status },
        include: { items: true },
      });
    });

    // Tự động tích lũy điểm VIP nếu trạng thái chuyển sang Completed (Đã thành công)
    if (status === "completed") {
      await processVipPoints(updatedOrder.customerPhone, updatedOrder.customerEmail, updatedOrder.total);
    }

    res.json(updatedOrder);
  } catch (error: any) {
    if (error?.message?.includes("Không đủ tồn kho")) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

// 5. PUT /api/orders/:id/payment - Xác nhận hoặc hủy thanh toán (Xác nhận chuyển khoản / thu COD)
router.put("/:id/payment", async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const { isPaid } = req.body;

    if (isPaid === undefined) {
      return res.status(400).json({ message: "Thiếu trạng thái thanh toán isPaid!" });
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { isPaid: !!isPaid }
    });

    res.json(updatedOrder);
  } catch (error) {
    next(error);
  }
});

// 6. PUT /api/orders/:id/internal-note - Ghi chú nội bộ (đóng gói/vận hành)
router.put("/:id/internal-note", async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const { internalNote } = req.body;

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { internalNote: typeof internalNote === "string" ? internalNote : null },
    });

    res.json(updatedOrder);
  } catch (error) {
    next(error);
  }
});

function parseEditMetaJson(raw: string | null | undefined): Record<string, { from: string; to: string; fromId?: string; toId?: string }> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function buildEditMetaJson(
  item: { productId: string; productName: string; color: string; size: string; editMetaJson: string | null },
  next: { productId: string; productName: string; color: string; size: string },
) {
  const existing = parseEditMetaJson(item.editMetaJson);
  const meta: Record<string, { from: string; to: string; fromId?: string; toId?: string }> = {};

  const productChanged = next.productId !== item.productId;
  const colorChanged = next.color !== item.color;
  const sizeChanged = next.size !== item.size;

  if (productChanged || existing.product) {
    const from = existing.product?.from ?? item.productName;
    const to = next.productName;
    if (from !== to) {
      meta.product = {
        from,
        to,
        fromId: existing.product?.fromId ?? item.productId,
        toId: next.productId,
      };
    }
  }

  if (colorChanged || existing.color) {
    const from = existing.color?.from ?? item.color;
    const to = next.color;
    if (from !== to) {
      meta.color = { from, to };
    }
  }

  if (sizeChanged || existing.size) {
    const from = existing.size?.from ?? item.size;
    const to = next.size;
    if (from !== to) {
      meta.size = { from, to };
    }
  }

  return Object.keys(meta).length > 0 ? JSON.stringify(meta) : null;
}

// 7. PUT /api/orders/:id/items/:itemId - Chỉnh sửa sản phẩm trong đơn (size/màu/mẫu)
router.put("/:id/items/:itemId", async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const itemId = Number(req.params.itemId);
    const { productId, color, size, quantity } = req.body;

    if (!productId || !color || !size || !quantity) {
      return res.status(400).json({ message: "Thiếu thông tin sản phẩm cần cập nhật!" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    if (order.status === "completed" || order.status === "cancelled") {
      return res.status(400).json({ message: "Không thể chỉnh sửa đơn đã hoàn thành hoặc đã hủy!" });
    }

    const item = order.items.find((row) => row.id === itemId);
    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm trong đơn hàng" });
    }

    const nextQuantity = Math.max(1, Number(quantity));
    const nextProduct = await prisma.product.findUnique({ where: { id: String(productId) } });
    if (!nextProduct) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm mới" });
    }

    const nextColor = String(color).trim();
    const nextSize = String(size).trim();
    const nextProductId = String(productId);
    const nextProductName = nextProduct.name;
    const nextProductImage = getProductImageForColorFromDb(nextProduct, nextColor);
    const nextIsPreOrder = !!nextProduct.isPreOrder;
    const nextPreOrderDays = nextProduct.preOrderDays ?? null;
    const nextPrice = Number(nextProduct.price);

    const unchanged =
      item.productId === nextProductId &&
      item.color === nextColor &&
      item.size === nextSize &&
      item.quantity === nextQuantity;

    if (unchanged) {
      return res.status(400).json({ message: "Không có thay đổi nào để cập nhật!" });
    }

    const shouldAdjustStock = !item.isPreOrder && !nextIsPreOrder && order.status !== "cancelled";

    const result = await prisma.$transaction(async (tx) => {
      if (shouldAdjustStock) {
        const hadStockDeduction = await orderItemHasStockMovement(tx, order, item);

        if (hadStockDeduction) {
          await restoreProductStockWithLog(tx, {
            productId: item.productId,
            productName: item.productName,
            color: item.color,
            size: item.size,
            quantity: item.quantity,
            reason: "ORDER_EDIT_IN",
            referenceType: "order",
            referenceId: String(orderId),
            referenceLabel: order.orderNumber,
            notes: `Hoàn kho dòng cũ trước khi chỉnh sửa đơn`,
          });
        }

        await deductProductStockWithLog(tx, {
          productId: nextProductId,
          productName: nextProductName,
          color: nextColor,
          size: nextSize,
          quantity: nextQuantity,
          reason: "ORDER_EDIT_OUT",
          referenceType: "order",
          referenceId: String(orderId),
          referenceLabel: order.orderNumber,
          notes: `Trừ kho dòng mới sau khi chỉnh sửa đơn`,
        });
      }

      const editMetaJson = buildEditMetaJson(item, {
        productId: nextProductId,
        productName: nextProductName,
        color: nextColor,
        size: nextSize,
      });

      await tx.orderItem.update({
        where: { id: itemId },
        data: {
          productId: nextProductId,
          productName: nextProductName,
          productImage: nextProductImage,
          color: nextColor,
          size: nextSize,
          quantity: nextQuantity,
          price: nextPrice,
          isPreOrder: nextIsPreOrder,
          preOrderDays: nextPreOrderDays,
          editMetaJson,
        },
      });

      const updatedItems = order.items.map((row) =>
        row.id === itemId
          ? {
              ...row,
              productId: nextProductId,
              productName: nextProductName,
              productImage: nextProductImage,
              color: nextColor,
              size: nextSize,
              quantity: nextQuantity,
              price: nextPrice,
              isPreOrder: nextIsPreOrder,
              preOrderDays: nextPreOrderDays,
              editMetaJson,
            }
          : row,
      );

      const subtotal = updatedItems.reduce((sum, row) => sum + row.price * row.quantity, 0);
      const total = subtotal - order.discount + order.shipping;
      const containsPreOrder = updatedItems.some((row) => row.isPreOrder);

      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          subtotal,
          total,
          containsPreOrder,
          isEdited: true,
          editedAt: new Date(),
        },
        include: { items: true },
      });

      return updatedOrder;
    });

    res.json(result);
  } catch (error: any) {
    if (error?.message?.includes("Không đủ tồn kho")) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

export default router;
