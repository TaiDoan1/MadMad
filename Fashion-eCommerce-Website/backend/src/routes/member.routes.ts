import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAdminAuth } from "../utils/auth.middleware";

const router = Router();

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
router.get("/check", async (req, res, next) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Thiếu từ khóa tra cứu query (SĐT hoặc Email)!" });
    }

    const searchStr = String(query).trim().replace(/\s+/g, "");

    const member = await prisma.vIPMember.findFirst({
      where: {
        OR: [
          { phone: searchStr },
          { email: searchStr.toLowerCase() }
        ]
      }
    });

    if (!member) {
      return res.status(404).json({ message: "Không tìm thấy thông tin thành viên VIP." });
    }

    res.json(member);
  } catch (error) {
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
