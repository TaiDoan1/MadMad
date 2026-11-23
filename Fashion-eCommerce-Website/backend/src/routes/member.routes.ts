import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma";
import { requireAdminAuth } from "../utils/auth.middleware";
import { createRateLimiter } from "../utils/rate-limit";
import { verifyAdminToken } from "./auth.routes";

const router = Router();

// JWT secret dùng để verify member JWT — cùng secret mà auth.routes dùng để ký
// token member (google-login). getJwtSecret KHÔNG được export từ auth.routes nên
// đọc lại từ env ở đây. KHÔNG hardcode giá trị fallback mặc định của auth.routes:
// nếu env thiếu thì chuỗi rỗng -> jwt.verify luôn lỗi -> tra cứu bằng member JWT
// trả 401 (an toàn hơn là chấp nhận token ký bằng secret mặc định đã lộ).
const MEMBER_JWT_SECRET =
  process.env.ADMIN_JWT_SECRET || process.env.ADMIN_SECRET_KEY || "";

// 1. GET /api/members - Danh sách thành viên VIP (Yêu cầu quyền Admin)
router.get("/", requireAdminAuth, async (req, res, next) => {
  try {
    const members = await prisma.vIPMember.findMany({
      orderBy: { points: "desc" }
    });
    res.json(members);
  } catch (error) {
    next(error);
  }
});

// 2. GET /api/members/check - Tra cứu thành viên bằng Số điện thoại hoặc Email (Checkout / POS)
// Bảo mật: rate limit theo IP (10 phút / 30 lần) + chỉ tra cứu khi thỏa MỘT trong:
// (a) header x-admin-key là JWT admin hợp lệ, (b) member JWT hợp lệ và khớp
// query (email) hoặc khớp member tìm được (memberId), (c) kèm query orderNumber
// của đơn có SĐT/email khớp query. Không thỏa -> 401, không tiết lộ member tồn tại.
router.get("/check", createRateLimiter({ windowMs: 10 * 60 * 1000, max: 30 }), async (req, res, next) => {
  try {
    const { query, orderNumber } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Thiếu từ khóa tra cứu query (SĐT hoặc Email)!" });
    }

    const searchStr = String(query).trim().replace(/\s+/g, "");
    const searchEmail = searchStr.toLowerCase();

    // (a) Header x-admin-key là JWT admin hợp lệ
    const adminKey = req.headers["x-admin-key"];
    let authorized =
      typeof adminKey === "string" && adminKey.length > 0 && verifyAdminToken(adminKey);

    // (b) Member JWT hợp lệ ở header Authorization: Bearer <token>
    let memberToken: any = null;
    const authHeader = req.headers["authorization"];
    if (!authorized && typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice("Bearer ".length).trim();
      if (token && MEMBER_JWT_SECRET) {
        try {
          memberToken = jwt.verify(token, MEMBER_JWT_SECRET);
        } catch {
          memberToken = null;
        }
      }
      // Nhánh email: email trong token khớp query đã chuẩn hóa
      if (
        memberToken?.role === "member" &&
        typeof memberToken.email === "string" &&
        memberToken.email.trim().toLowerCase() === searchEmail
      ) {
        authorized = true;
      }
    }

    // Tra cứu member (nội bộ) — chỉ dùng để đối chiếu, chưa trả về gì.
    const member = await prisma.vIPMember.findFirst({
      where: {
        OR: [
          { phone: searchStr },
          { email: searchEmail }
        ]
      }
    });

    // (b) Nhánh memberId: memberId trong token khớp id của member tìm được
    if (
      !authorized &&
      memberToken?.role === "member" &&
      member &&
      Number(memberToken.memberId) === member.id
    ) {
      authorized = true;
    }

    // (c) Kèm query orderNumber: đơn tồn tại và SĐT/email của đơn khớp query
    if (!authorized && typeof orderNumber === "string" && orderNumber.trim()) {
      const order = await prisma.order.findFirst({
        where: { orderNumber: orderNumber.trim() }
      });
      if (order) {
        const orderPhone = (order.customerPhone || "").trim().replace(/\s+/g, "");
        const orderEmail = (order.customerEmail || "").trim().toLowerCase();
        if (
          (orderPhone && orderPhone === searchStr) ||
          (orderEmail && orderEmail === searchEmail)
        ) {
          authorized = true;
        }
      }
    }

    // Không thỏa điều kiện nào -> 401, không tiết lộ member có tồn tại hay không
    if (!authorized) {
      return res.status(401).json({ message: "Không có quyền tra cứu thông tin thành viên." });
    }

    if (!member) {
      return res.status(404).json({ message: "Không tìm thấy thông tin thành viên VIP." });
    }

    // 🛡️ Chỉ trả về thông tin tối thiểu cần thiết để checkout (ẩn email, sđt hoàn chỉnh, googleId để tránh thu thập PII)
    const secureMember = {
      id: member.id,
      fullName: member.fullName,
      points: member.points,
      tier: member.tier,
      avatarUrl: member.avatarUrl,
      // Chỉ để lộ 3 chữ số cuối sđt để đối chiếu
      phoneMasked: member.phone ? `*${member.phone.slice(-3)}` : null
    };

    res.json(secureMember);
  } catch (error) {
    next(error);
  }
});

// 2b. POST /api/members/register - Khách hàng tự đăng ký thành viên VIP (Public)
// Luôn ép points=50 (quà chào mừng) và tier=BRONZE, bỏ qua mọi giá trị points/tier client gửi lên
// để tránh bị lợi dụng tự set điểm/hạng cao khi endpoint là public.
router.post("/register", async (req, res, next) => {
  try {
    const { fullName, phone, email } = req.body;

    if (!fullName || !phone || !email) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ Tên, SĐT và Email!" });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, "");
    const cleanEmail = email.trim().toLowerCase();

    const newMember = await prisma.vIPMember.create({
      data: {
        fullName,
        phone: cleanPhone,
        email: cleanEmail,
        points: 50,
        tier: "BRONZE",
      }
    });

    res.status(201).json(newMember);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Số điện thoại hoặc Email này đã đăng ký VIP rồi!" });
    }
    next(error);
  }
});

// 3. POST /api/members - Thêm thành viên VIP mới (Yêu cầu quyền Admin)
router.post("/", requireAdminAuth, async (req, res, next) => {
  try {
    const { fullName, phone, email, points, tier } = req.body;

    if (!fullName || !phone || !email) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ Tên, SĐT và Email!" });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, "");
    const cleanEmail = email.trim().toLowerCase();

    const newMember = await prisma.vIPMember.create({
      data: {
        fullName,
        phone: cleanPhone,
        email: cleanEmail,
        points: points ? Number(points) : 0,
        tier: tier || "BRONZE"
      }
    });

    res.status(201).json(newMember);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Số điện thoại hoặc Email này đã đăng ký VIP rồi!" });
    }
    next(error);
  }
});

// 4. PUT /api/members/:id - Cập nhật thông tin thành viên VIP thủ công (Admin - Yêu cầu quyền Admin)
router.put("/:id", requireAdminAuth, async (req, res, next) => {
  try {
    const memberId = Number(req.params.id);
    const { fullName, phone, email, points, tier } = req.body;

    const cleanPhone = phone ? phone.trim().replace(/\s+/g, "") : undefined;
    const cleanEmail = email ? email.trim().toLowerCase() : undefined;

    const updatedMember = await prisma.vIPMember.update({
      where: { id: memberId },
      data: {
        fullName,
        phone: cleanPhone,
        email: cleanEmail,
        points: points !== undefined ? Number(points) : undefined,
        tier
      }
    });

    res.json(updatedMember);
  } catch (error) {
    next(error);
  }
});

// 5. DELETE /api/members/:id - Xóa thành viên VIP (Admin - Yêu cầu quyền Admin)
router.delete("/:id", requireAdminAuth, async (req, res, next) => {
  try {
    const memberId = Number(req.params.id);
    await prisma.vIPMember.delete({
      where: { id: memberId }
    });
    res.json({ success: true, message: "Đã xóa thành viên VIP thành công" });
  } catch (error) {
    next(error);
  }
});

export default router;
