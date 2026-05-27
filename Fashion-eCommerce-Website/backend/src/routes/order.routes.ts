import { Router } from "express";
import { prisma } from "../config/prisma";
import { sendOrderConfirmationEmail } from "../services/email.service";

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

    const newOrder = await prisma.order.create({
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
          create: normalizedItems.map((item: any) => ({
            productId: String(item.productId || item.product?.id || ""),
            productName: String(item.productName || item.product?.name || ""),
            productImage: String(item.productImage || item.product?.image || ""),
            isPreOrder: !!item.isPreOrder,
            preOrderDays: item.preOrderDays !== undefined && item.preOrderDays !== null ? Number(item.preOrderDays) : null,
            quantity: Number(item.quantity),
            size: item.size,
            color: item.color,
            price: Number(item.price)
          }))
        }
      },
      include: { items: true }
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

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status }
    });

    // Tự động tích lũy điểm VIP nếu trạng thái chuyển sang Completed (Đã thành công)
    if (status === "completed") {
      await processVipPoints(updatedOrder.customerPhone, updatedOrder.customerEmail, updatedOrder.total);
    }

    res.json(updatedOrder);
  } catch (error) {
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

export default router;
