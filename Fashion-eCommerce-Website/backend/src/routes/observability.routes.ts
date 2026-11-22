import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAdminAuth } from "../utils/auth.middleware";

const router = Router();

// Số lỗi client giữ tối đa trong DB (lỗi cũ nhất bị xóa khi vượt ngưỡng).
const MAX_CLIENT_ERRORS = 200;

// ─── POST /api/client-errors ──────────────────────────────────────────────────
// Nhận lỗi từ trình duyệt (window.onerror / unhandledrejection / Error Boundary).
// Chỉ nhận message + đường dẫn + thời gian (+ stack tùy chọn). KHÔNG nhận IP,
// user agent hay id người dùng — các trường đó không được lưu ở đây.
router.post("/client-errors", async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const { message, path, occurredAt, stack } = body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message is required" });
    }
    if (message.length > 2000) {
      return res.status(413).json({ error: "message quá dài (tối đa 2000 ký tự)" });
    }
    if (path !== undefined && (typeof path !== "string" || path.length > 500)) {
      return res.status(400).json({ error: "path không hợp lệ (tối đa 500 ký tự)" });
    }
    if (stack !== undefined && (typeof stack !== "string" || stack.length > 10000)) {
      return res.status(413).json({ error: "stack quá dài (tối đa 10000 ký tự)" });
    }

    let occurredAtDate: Date | null = null;
    if (typeof occurredAt === "string") {
      const parsed = new Date(occurredAt);
      if (!Number.isNaN(parsed.getTime())) occurredAtDate = parsed;
    }

    const created = await prisma.clientError.create({
      data: {
        message: message.slice(0, 1000),
        path: typeof path === "string" ? path.slice(0, 500) : null,
        occurredAt: occurredAtDate,
        stack: typeof stack === "string" ? stack.slice(0, 5000) : null,
      },
    });

    // Giữ tối đa ~200 lỗi gần nhất: xóa lỗi cũ nhất khi vượt ngưỡng.
    const count = await prisma.clientError.count();
    if (count > MAX_CLIENT_ERRORS) {
      const excess = count - MAX_CLIENT_ERRORS;
      const oldest = await prisma.clientError.findMany({
        orderBy: { createdAt: "asc" },
        take: excess,
        select: { id: true },
      });
      if (oldest.length > 0) {
        await prisma.clientError.deleteMany({
          where: { id: { in: oldest.map((row) => row.id) } },
        });
      }
    }

    res.status(201).json({ ok: true, id: created.id });
  } catch (err) {
    console.error("❌ Lỗi lưu client-error:", err);
    res.status(500).json({ error: "Không thể lưu lỗi" });
  }
});

// ─── GET /api/client-errors (admin) ──────────────────────────────────────────
// Đọc lỗi client gần nhất (không có trang admin mới — đọc qua API là đủ).
router.get("/client-errors", requireAdminAuth, async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), MAX_CLIENT_ERRORS);
    const errors = await prisma.clientError.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    res.json(errors);
  } catch (err) {
    console.error("❌ Lỗi lấy client-errors:", err);
    res.status(500).json({ error: "Không thể lấy danh sách lỗi" });
  }
});

// ─── POST /api/page-views ────────────────────────────────────────────────────
// Beacon lượt xem trang: chỉ ghi ngày + đường dẫn + số lượt (gom theo ngày +
// đường dẫn, upsert tăng count). KHÔNG thu thập IP, user agent, id người dùng.
router.post("/page-views", async (req, res) => {
  try {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const { path } = body;

    if (typeof path !== "string" || !path.trim() || !path.startsWith("/")) {
      return res.status(400).json({ error: "path không hợp lệ" });
    }
    const cleanPath = path.split(/[?#]/)[0].slice(0, 200) || "/";

    // Ngày theo giờ Việt Nam (UTC+7), tính ở server — không tin ngày client gửi.
    const day = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);

    await prisma.pageView.upsert({
      where: { day_path: { day, path: cleanPath } },
      update: { count: { increment: 1 } },
      create: { day, path: cleanPath, count: 1 },
    });

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("❌ Lỗi ghi page-view:", err);
    res.status(500).json({ error: "Không thể ghi lượt xem" });
  }
});

// ─── GET /api/page-views (admin) ─────────────────────────────────────────────
// Đọc lượt xem theo ngày + đường dẫn (mặc định 7 ngày gần nhất).
router.get("/page-views", requireAdminAuth, async (req, res) => {
  try {
    const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);
    const since = new Date(Date.now() + 7 * 60 * 60 * 1000 - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const rows = await prisma.pageView.findMany({
      where: { day: { gte: since } },
      orderBy: [{ day: "desc" }, { count: "desc" }],
      take: 500,
    });
    res.json(rows);
  } catch (err) {
    console.error("❌ Lỗi lấy page-views:", err);
    res.status(500).json({ error: "Không thể lấy lượt xem" });
  }
});

export default router;
