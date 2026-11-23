import { Router } from "express";
import { prisma } from "../config/prisma";
import { sendOrderConfirmationEmail } from "../services/email.service";
import {
  deductProductStockWithLog,
  restoreProductStockWithLog,
} from "../services/stock-movement.service";
import { getProductImageForColorFromDb, isStoredImageMismatch } from "../utils/product-image";
import {
  INSUFFICIENT_STOCK_MESSAGE,
  resolveVariantColor,
  resolveVariantSize,
} from "../utils/product-stock";
import { createRateLimiter } from "../utils/rate-limit";
import {
  deductOrderItemsIfNeeded,
  isInactiveOrderStatus,
  reconcileEditedOrderStockAdjustments,
  restoreOrderItemsIfDeducted,
  syncMissingOrderOutboundDeductions,
} from "../services/stock-outbound.service";

import { requireAdminAuth } from "../utils/auth.middleware";

const router = Router();

// Hàm hỗ trợ tự động tính toán thăng hạng VIP

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

// ---- Helpers dùng chung cho tính giá đơn công khai + validate-coupon ----

type StorefrontCoupon = {
  code: string;
  discountType?: "amount" | "percent";
  discountAmount?: number;
  discountPercent?: number;
  usageLimit?: number;
  usageCount?: number;
  applyToSaleItems?: boolean;
};

type MembershipTierConfig = {
  tier: string;
  minPoints?: number;
  discountPercent?: number;
  gifts?: string;
};

type GiftConditions = {
  minOrderTotal?: number;
  minProductCount?: number;
};

function parseJsonArray<T>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

// Tra cứu coupons từ StorefrontSetting.couponsJson (cùng logic với PUT /:id/coupon).
function parseCouponsJson(raw: string | null | undefined): StorefrontCoupon[] {
  return parseJsonArray<StorefrontCoupon>(raw);
}

function parseMembershipTiersJson(raw: string | null | undefined): MembershipTierConfig[] {
  return parseJsonArray<MembershipTierConfig>(raw);
}

function parseGiftConditionsJson(raw: string | null | undefined): GiftConditions {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as GiftConditions) : {};
  } catch {
    return {};
  }
}

// Điều kiện quà tặng, tính trên các món ĐÃ TRẢ (không tính quà).
// Không có điều kiện nào thì đủ điều kiện.
function isGiftEligible(conditions: GiftConditions, paidSubtotal: number, paidItemCount: number): boolean {
  const minOrderTotal = Number(conditions.minOrderTotal || 0);
  const minProductCount = Number(conditions.minProductCount || 0);
  if (minOrderTotal > 0 && paidSubtotal < minOrderTotal) return false;
  if (minProductCount > 0 && paidItemCount < minProductCount) return false;
  return true;
}

type CouponCheckResult =
  | { valid: true; coupon: StorefrontCoupon; computedDiscount: number }
  | { valid: false; message: string };

// Luật coupon dùng chung cho POST / (tạo đơn) và POST /validate-coupon.
// Thứ tự kiểm tra: tồn tại + mức giảm > 0 -> chưa hết lượt -> không chặn hàng sale.
function checkCoupon(
  coupons: StorefrontCoupon[],
  rawCode: string,
  subtotal: number,
  hasSaleItems: boolean,
): CouponCheckResult {
  const code = String(rawCode ?? "").trim().toUpperCase();
  if (!code) return { valid: false, message: "Mã giảm giá không hợp lệ." };

  const coupon = coupons.find((c) => String(c.code ?? "").trim().toUpperCase() === code);
  if (!coupon) return { valid: false, message: "Mã giảm giá không hợp lệ." };

  const rawDiscount =
    coupon.discountType === "percent"
      ? Math.round((subtotal * Number(coupon.discountPercent || 0)) / 100)
      : Number(coupon.discountAmount || 0);
  if (!(rawDiscount > 0)) return { valid: false, message: "Mã giảm giá không hợp lệ." };

  if (
    coupon.usageLimit !== undefined &&
    coupon.usageLimit !== null &&
    Number(coupon.usageCount ?? 0) >= Number(coupon.usageLimit)
  ) {
    return { valid: false, message: "Mã giảm giá đã hết lượt sử dụng." };
  }

  if (coupon.applyToSaleItems === false && hasSaleItems) {
    return {
      valid: false,
      message: `Mã ${coupon.code} không thể áp dụng cho đơn hàng có chứa sản phẩm đang giảm giá.`,
    };
  }

  return { valid: true, coupon, computedDiscount: Math.min(rawDiscount, subtotal) };
}

// 1. GET /api/orders - Lấy danh sách tất cả đơn hàng (có bộ lọc)
router.get("/", requireAdminAuth, async (req, res, next) => {
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
router.post("/sync-item-images", requireAdminAuth, async (_req, res, next) => {
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
router.post("/sync-stock-deductions", requireAdminAuth, async (_req, res, next) => {
  try {
    const result = await syncMissingOrderOutboundDeductions();
    const reconciled = await reconcileEditedOrderStockAdjustments();
    res.json({ ...result, reconciled });
  } catch (error) {
    next(error);
  }
});

// 2. GET /api/orders/:id - Chi tiết đơn hàng
router.get("/:id", requireAdminAuth, async (req, res, next) => {
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
// 3a0. POST /api/orders/validate-coupon - Kiểm tra mã giảm giá mà KHÔNG tạo đơn.
// Đặt TRƯỚC các route /:id để không bị nuốt (khác số segment với POST /:id/items nên không trùng).
router.post(
  "/validate-coupon",
  createRateLimiter({ windowMs: 60000, max: 10 }),
  async (req, res, next) => {
    try {
      const { code, subtotal, hasSaleItems } = req.body || {};
      const settings = await prisma.storefrontSetting.findUnique({ where: { id: 1 } });
      const couponsList = parseCouponsJson(settings?.couponsJson);
      const numericSubtotal = Math.max(0, Number(subtotal) || 0);
      const checked = checkCoupon(couponsList, String(code ?? ""), numericSubtotal, !!hasSaleItems);

      if (!checked.valid) {
        return res.json({ valid: false, message: checked.message });
      }

      const coupon = checked.coupon;
      return res.json({
        valid: true,
        code: coupon.code,
        discountType: coupon.discountType || "amount",
        discountPercent: Number(coupon.discountPercent || 0),
        discountAmount: Number(coupon.discountAmount || 0),
        applyToSaleItems: coupon.applyToSaleItems ?? true,
        computedDiscount: checked.computedDiscount,
        message: `Áp dụng mã ${coupon.code} thành công.`,
      });
    } catch (error) {
      next(error);
    }
  },
);

// 3a. POST /api/orders - Tạo đơn hàng mới công khai từ khách hàng (Storefront)
// Chặn giả mạo Admin params để đảm bảo an toàn tuyệt đối
// Giá tiền do client gửi (subtotal/discount/shipping/total/price từng dòng) đều bị
// bỏ qua hoàn toàn: server tự tính lại toàn bộ từ giá trong Database.
router.post(
  "/",
  createRateLimiter({ windowMs: 60000, max: 20 }),
  async (req, res, next) => {
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
      paymentMethod,
      shippingMethod,
      notes,
      couponCode,
      items
    } = req.body;

    if (!customerName || !customerPhone || !items || items.length === 0) {
      return res.status(400).json({ message: "Thiếu thông tin đặt hàng bắt buộc!" });
    }

    // Luôn kiểm tra xem mã đơn hàng có giả mạo các nguồn đặc quyền của Admin (POS, Social) không
    const finalOrderNumber = orderNumber || `DH${Date.now()}`;
    if (finalOrderNumber.startsWith("DH-POS") || finalOrderNumber.startsWith("DH-FB") || finalOrderNumber.startsWith("DH-IG")) {
      return res.status(403).json({ message: "Mã đơn hàng không hợp lệ cho khách hàng công khai!" });
    }

    const normalizedItems = Array.isArray(items) ? items : [];
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

    // Đọc cấu hình Storefront MỘT lần trước transaction, dùng chung cho coupon + VIP + phí ship.
    // Chưa có row thì dùng mặc định: ship thường 30.000đ, ship nhanh 60.000đ, freeship từ 500.000đ.
    const settings = await prisma.storefrontSetting.findUnique({ where: { id: 1 } });
    const couponsList = parseCouponsJson(settings?.couponsJson);
    const tierConfigs = parseMembershipTiersJson(settings?.membershipTiersJson);
    const shippingFeeStandard = settings?.shippingFeeStandard ?? 30000;
    const shippingFeeExpress = settings?.shippingFeeExpress ?? 60000;
    const shippingFreeThreshold = settings?.shippingFreeThreshold ?? 500000;

    // Resolve từng dòng theo Database: giá + tên + isPreOrder/preOrderDays lấy từ Product,
    // không tin client. Thiếu sản phẩm thì 400.
    type ResolvedLine = {
      productId: string;
      productName: string;
      productImage: string;
      isPreOrder: boolean;
      preOrderDays: number | null;
      quantity: number;
      size: any;
      color: any;
      price: number;
      isGift: boolean;
      discountPercent: number;
    };
    const lines: ResolvedLine[] = [];
    for (const item of normalizedItems) {
      const productId = String(item.productId || item.product?.id || "");
      const product = productMap.get(productId);
      if (!product) {
        return res.status(400).json({ message: "Không tìm thấy sản phẩm" });
      }
      const color = String(item.color || "");
      let productImage = String(item.productImage || item.product?.image || "");
      if (color) {
        const resolvedImage = getProductImageForColorFromDb(product, color);
        if (resolvedImage) productImage = resolvedImage;
      }
      lines.push({
        productId,
        productName: product.name,
        productImage,
        isPreOrder: !!product.isPreOrder,
        preOrderDays: product.preOrderDays ?? null,
        quantity: Math.max(1, Number(item.quantity) || 1),
        size: item.size,
        color: item.color,
        price: Number(product.price),
        isGift: !!product.isGiftProduct,
        discountPercent: Number(product.discountPercent || 0),
      });
    }

    // Quà tặng: điều kiện tính trên các món ĐÃ TRẢ (giá DB, không tính quà).
    const paidSubtotal = lines.reduce(
      (sum, line) => sum + (line.isGift ? 0 : line.price * line.quantity),
      0,
    );
    const paidItemCount = lines.reduce(
      (sum, line) => sum + (line.isGift ? 0 : line.quantity),
      0,
    );
    for (const line of lines) {
      if (!line.isGift) continue;
      const product = productMap.get(line.productId);
      const conditions = parseGiftConditionsJson(product?.giftConditionsJson);
      if (!isGiftEligible(conditions, paidSubtotal, paidItemCount)) {
        return res.status(400).json({ message: "Quà tặng không đủ điều kiện." });
      }
      line.price = 0;
    }

    const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const hasSaleItems = lines.some((line) => line.discountPercent > 0);
    const nonSaleSubtotal = lines.reduce(
      (sum, line) => sum + (line.discountPercent > 0 ? 0 : line.price * line.quantity),
      0,
    );

    // Coupon: frontend gửi mã SẠCH (chỉ mã). Mã gửi lên mà không hợp lệ thì 400.
    const rawCouponCode = typeof couponCode === "string" ? couponCode.trim() : "";
    let couponDiscount = 0;
    let appliedCouponCode: string | null = null;
    if (rawCouponCode) {
      const checked = checkCoupon(couponsList, rawCouponCode, subtotal, hasSaleItems);
      if (!checked.valid) {
        return res.status(400).json({ message: checked.message });
      }
      couponDiscount = checked.computedDiscount;
      appliedCouponCode = checked.coupon.code;
    }

    // Giảm giá VIP: chỉ giảm trên món full-price (discountPercent bằng 0/null).
    let vipDiscount = 0;
    const cleanPhone = typeof customerPhone === "string" ? customerPhone.trim().replace(/\s+/g, "") : "";
    const cleanEmail = typeof customerEmail === "string" ? customerEmail.trim().toLowerCase() : "";
    const vipOrConditions: Array<{ phone: string } | { email: string }> = [];
    if (cleanPhone) vipOrConditions.push({ phone: cleanPhone });
    if (cleanEmail) vipOrConditions.push({ email: cleanEmail });
    if (vipOrConditions.length > 0) {
      const member = await prisma.vIPMember.findFirst({ where: { OR: vipOrConditions } });
      if (member) {
        const tierConfig = tierConfigs.find(
          (t) => String(t.tier).trim().toUpperCase() === String(member.tier).trim().toUpperCase(),
        );
        const vipPercent = Number(tierConfig?.discountPercent || 0);
        if (vipPercent > 0) {
          vipDiscount = Math.round((nonSaleSubtotal * vipPercent) / 100);
        }
      }
    }

    // Tổng giảm chặn tối đa 35% subtotal.
    const totalDiscount = Math.min(couponDiscount + vipDiscount, Math.round(subtotal * 0.35));

    // Phí ship: express thì phí nhanh; còn lại freeship khi (subtotal - totalDiscount)
    // đạt ngưỡng, không thì phí thường.
    const shippingMethodValue = String(shippingMethod || "standard");
    const shipping =
      shippingMethodValue === "express"
        ? shippingFeeExpress
        : subtotal - totalDiscount >= shippingFreeThreshold
          ? 0
          : shippingFeeStandard;
    const total = Math.max(0, subtotal - totalDiscount) + shipping;
    const computedContainsPreOrder = lines.some((line) => line.isPreOrder);

    const itemsForCreate = lines.map((line) => ({
      productId: line.productId,
      productName: line.productName,
      productImage: line.productImage,
      isPreOrder: line.isPreOrder,
      preOrderDays: line.preOrderDays,
      quantity: line.quantity,
      size: line.size,
      color: line.color,
      price: line.price,
    }));

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
          subtotal,
          discount: totalDiscount,
          shipping,
          total,
          paymentMethod: paymentMethod || "cod",
          shippingMethod: shippingMethodValue,
          status: "pending", // Khách hàng công khai chỉ được tạo đơn ở trạng thái pending
          isPaid: false,      // Khách hàng công khai không được phép tự duyệt đã thanh toán
          containsPreOrder: computedContainsPreOrder,
          notes: notes || "",
          couponCode: appliedCouponCode,
          items: {
            create: itemsForCreate,
          },
        },
        include: { items: true },
      });

      // Trừ kho khi đặt hàng thành công
      await deductOrderItemsIfNeeded(
        tx,
        {
          id: created.id,
          orderNumber: finalOrderNumber,
          status: "pending",
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
        "Trừ kho khi khách hàng đặt hàng công khai",
      );

      return created;
    });

    sendOrderConfirmationEmail(newOrder).catch((err) => {
      console.error("❌ Lỗi gửi email xác nhận đơn hàng:", err);
    });

    res.status(201).json(newOrder);
  } catch (error) {
    next(error);
  }
  },
);

// 3b. POST /api/orders/admin-create - Tạo đơn hàng mới từ Admin Dashboard (Ví dụ đơn POS hoặc đơn ghi tay từ Social)
router.post("/admin-create", requireAdminAuth, async (req, res, next) => {
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

    const finalOrderNumber = orderNumber || `DH-POS${Date.now()}`;
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
      if (!isInactiveOrderStatus(orderStatus)) {
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
          "Trừ kho khi Admin tạo đơn thành công",
        );
      }

      return created;
    });

    if (newOrder.status === "completed") {
      await processVipPoints(newOrder.customerPhone, newOrder.customerEmail, newOrder.total);
    }

    sendOrderConfirmationEmail(newOrder).catch((err) => {
      console.error("❌ Lỗi gửi email xác nhận đơn hàng:", err);
    });

    res.status(201).json(newOrder);
  } catch (error) {
    next(error);
  }
});

// 4. PUT /api/orders/:id/status - Cập nhật trạng thái vận hành đơn (Chỉ Admin)
router.put("/:id/status", requireAdminAuth, async (req, res, next) => {
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
      const wasInactive = isInactiveOrderStatus(existingOrder.status);
      const willBeInactive = isInactiveOrderStatus(status);

      if (willBeInactive && !wasInactive) {
        const restoreReason = status === "returned" ? "ORDER_RETURN" : "ORDER_CANCEL";
        const restoreNotes =
          status === "returned"
            ? "Hoàn kho do hoàn đơn COD (khách không nhận)"
            : "Hoàn kho do hủy đơn hàng";

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
          restoreNotes,
          restoreReason,
        );
      }

      if (!willBeInactive && wasInactive) {
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
          "Trừ kho lại khi hoàn tác hủy/hoàn đơn",
        );
      }

      return tx.order.update({
        where: { id: orderId },
        data: { status },
        include: { items: true },
      });
    });

    if (status === "completed") {
      await processVipPoints(updatedOrder.customerPhone, updatedOrder.customerEmail, updatedOrder.total);
    }

    res.json(updatedOrder);
  } catch (error: any) {
    if (error?.message?.includes(INSUFFICIENT_STOCK_MESSAGE)) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

// 5. PUT /api/orders/:id/payment - Xác nhận hoặc hủy thanh toán (Chỉ Admin)
router.put("/:id/payment", requireAdminAuth, async (req, res, next) => {
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

// 6. PUT /api/orders/:id/internal-note - Ghi chú nội bộ (Chỉ Admin)
router.put("/:id/internal-note", requireAdminAuth, async (req, res, next) => {
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
router.put("/:id/items/:itemId", requireAdminAuth, async (req, res, next) => {
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

    if (order.status === "completed" || isInactiveOrderStatus(order.status)) {
      return res.status(400).json({ message: "Không thể chỉnh sửa đơn đã hoàn thành, đã hủy hoặc đã hoàn!" });
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

    const oldProduct = await prisma.product.findUnique({ where: { id: item.productId } });

    const nextColor = resolveVariantColor(nextProduct, String(color));
    const nextSize = resolveVariantSize(nextProduct, String(size));
    const oldColor = oldProduct ? resolveVariantColor(oldProduct, item.color) : String(item.color).trim();
    const oldSize = oldProduct ? resolveVariantSize(oldProduct, item.size) : String(item.size).trim();
    const nextProductId = String(productId);
    const nextProductName = nextProduct.name;
    const nextProductImage = getProductImageForColorFromDb(nextProduct, nextColor);
    const nextIsPreOrder = !!nextProduct.isPreOrder;
    const nextPreOrderDays = nextProduct.preOrderDays ?? null;
    const nextPrice = Number(nextProduct.price);

    const unchanged =
      item.productId === nextProductId &&
      oldColor === nextColor &&
      oldSize === nextSize &&
      item.quantity === nextQuantity;

    if (unchanged) {
      return res.status(400).json({ message: "Không có thay đổi nào để cập nhật!" });
    }

    const shouldRestoreOld = !item.isPreOrder && !isInactiveOrderStatus(order.status);
    const shouldDeductNew = !nextIsPreOrder && !isInactiveOrderStatus(order.status);

    const result = await prisma.$transaction(async (tx) => {
      if (shouldRestoreOld) {
        await restoreProductStockWithLog(tx, {
          productId: item.productId,
          productName: item.productName,
          color: oldColor,
          size: oldSize,
          quantity: item.quantity,
          reason: "ORDER_EDIT_IN",
          referenceType: "order",
          referenceId: String(orderId),
          referenceLabel: order.orderNumber,
          notes: `Hoàn kho ${oldColor} / ${oldSize} (dòng cũ) khi chỉnh sửa đơn`,
        });
      }

      if (shouldDeductNew) {
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
          notes: `Trừ kho ${nextColor} / ${nextSize} (dòng mới) khi chỉnh sửa đơn`,
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
    if (error?.message?.includes(INSUFFICIENT_STOCK_MESSAGE)) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

// 8. POST /api/orders/:id/items - Thêm sản phẩm hoặc quà tặng mới vào đơn hàng (Admin)
router.post("/:id/items", requireAdminAuth, async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const { productId, color, size, quantity, isGift } = req.body;

    if (!productId || !color || !size || !quantity) {
      return res.status(400).json({ message: "Thiếu thông tin sản phẩm cần thêm!" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    if (order.status === "completed" || isInactiveOrderStatus(order.status)) {
      return res.status(400).json({ message: "Không thể chỉnh sửa đơn đã hoàn thành, đã hủy hoặc đã hoàn!" });
    }

    const product = await prisma.product.findUnique({ where: { id: String(productId) } });
    if (!product) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    }

    const nextColor = resolveVariantColor(product, String(color));
    const nextSize = resolveVariantSize(product, String(size));
    const nextQuantity = Math.max(1, Number(quantity));
    const nextPrice = isGift ? 0 : Number(product.price);
    const nextIsPreOrder = !!product.isPreOrder;
    const nextPreOrderDays = product.preOrderDays ?? null;
    const nextProductImage = getProductImageForColorFromDb(product, nextColor);

    const shouldDeduct = !nextIsPreOrder && !isInactiveOrderStatus(order.status);

    const result = await prisma.$transaction(async (tx) => {
      if (shouldDeduct) {
        await deductProductStockWithLog(tx, {
          productId: String(productId),
          productName: product.name,
          color: nextColor,
          size: nextSize,
          quantity: nextQuantity,
          reason: isGift ? "MARKETING_GIFT_EDIT_OUT" : "ORDER_EDIT_OUT",
          referenceType: "order",
          referenceId: String(orderId),
          referenceLabel: order.orderNumber,
          notes: `Thêm ${isGift ? "sản phẩm tặng" : "sản phẩm thường"} ${nextColor} / ${nextSize} khi chỉnh sửa đơn`,
        });
      }

      await tx.orderItem.create({
        data: {
          orderId,
          productId: String(productId),
          productName: product.name,
          productImage: nextProductImage,
          color: nextColor,
          size: nextSize,
          quantity: nextQuantity,
          price: nextPrice,
          isPreOrder: nextIsPreOrder,
          preOrderDays: nextPreOrderDays,
        },
      });

      const updatedItems = [
        ...order.items,
        {
          price: nextPrice,
          quantity: nextQuantity,
          isPreOrder: nextIsPreOrder,
        }
      ];

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
    if (error?.message?.includes(INSUFFICIENT_STOCK_MESSAGE)) {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
});

// 9. DELETE /api/orders/:id/items/:itemId - Xóa sản phẩm khỏi đơn hàng (Admin)
router.delete("/:id/items/:itemId", requireAdminAuth, async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    const itemId = Number(req.params.itemId);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    if (order.status === "completed" || isInactiveOrderStatus(order.status)) {
      return res.status(400).json({ message: "Không thể chỉnh sửa đơn đã hoàn thành, đã hủy hoặc đã hoàn!" });
    }

    const item = order.items.find((row) => row.id === itemId);
    if (!item) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm trong đơn hàng" });
    }

    const shouldRestore = !item.isPreOrder && !isInactiveOrderStatus(order.status);

    const result = await prisma.$transaction(async (tx) => {
      if (shouldRestore) {
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
          notes: `Hoàn kho sản phẩm khi xóa khỏi đơn hàng chỉnh sửa`,
        });
      }

      await tx.orderItem.delete({
        where: { id: itemId },
      });

      const updatedItems = order.items.filter((row) => row.id !== itemId);
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
  } catch (error) {
    next(error);
  }
});

// 10. PUT /api/orders/:id/coupon - Áp dụng một hoặc nhiều voucher giảm giá vào đơn hàng (Admin)
router.put("/:id/coupon", requireAdminAuth, async (req, res, next) => {
  try {
    const orderId = Number(req.params.id);
    // Hỗ trợ cả mảng couponCodes[] lẫn string couponCode đơn lẻ (backward compat)
    const rawCodes: string[] = Array.isArray(req.body.couponCodes)
      ? req.body.couponCodes
      : req.body.couponCode
        ? [String(req.body.couponCode)]
        : [];

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    if (order.status === "completed" || isInactiveOrderStatus(order.status)) {
      return res.status(400).json({ message: "Không thể chỉnh sửa đơn đã hoàn thành, đã hủy hoặc đã hoàn!" });
    }

    // Lấy cấu hình Storefront để tra cứu coupons
    const settings = await prisma.storefrontSetting.findUnique({ where: { id: 1 } });
    const couponsList = parseCouponsJson(settings?.couponsJson);

    let totalDiscount = 0;
    const appliedCodes: string[] = [];
    const invalidCodes: string[] = [];

    for (const rawCode of rawCodes) {
      const code = String(rawCode).trim().toUpperCase();
      if (!code) continue;

      const targetCoupon = couponsList.find(
        (c: any) => String(c.code).trim().toUpperCase() === code
      );

      if (!targetCoupon) {
        invalidCodes.push(code);
        continue;
      }

      const resolvedDiscount = targetCoupon.discountType === "percent"
        ? Math.round((Number(order.subtotal) * Number(targetCoupon.discountPercent || 0)) / 100)
        : Number(targetCoupon.discountAmount || 0);
      totalDiscount += resolvedDiscount;
      appliedCodes.push(code);
    }

    totalDiscount = Math.min(totalDiscount, Number(order.subtotal));

    if (invalidCodes.length > 0 && appliedCodes.length === 0) {
      return res.status(404).json({
        message: `Mã giảm giá không tồn tại: ${invalidCodes.join(", ")}`,
      });
    }

    // Cập nhật lại tổng tiền đơn hàng
    const subtotal = order.subtotal;
    const total = Math.max(0, subtotal - totalDiscount + order.shipping);

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        discount: totalDiscount,
        couponCode: appliedCodes.length > 0 ? appliedCodes.join(",") : null,
        total,
        isEdited: true,
        editedAt: new Date(),
      },
      include: { items: true },
    });

    res.json({
      ...updatedOrder,
      appliedCodes,
      invalidCodes,
    });
  } catch (error) {
    next(error);
  }
});

export default router;

