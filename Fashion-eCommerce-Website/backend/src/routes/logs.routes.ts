import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAdminAuth } from "../utils/auth.middleware";

const router = Router();

// ─── POST /api/logs ───────────────────────────────────────────────────────────
// Nhận lỗi bắn về từ Frontend (trình duyệt của khách hàng)
router.post("/", async (req, res) => {
  try {
    const { level, source, message, details, url, userAgent } = req.body;

    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0].trim()
      || req.socket.remoteAddress
      || "unknown";

    const log = await prisma.systemLog.create({
      data: {
        level: level || "error",
        source: source || "frontend",
        message: String(message).slice(0, 1000),
        details: details ? JSON.stringify(details).slice(0, 5000) : null,
        url: url ? String(url).slice(0, 500) : null,
        userAgent: userAgent ? String(userAgent).slice(0, 300) : null,
        ip,
      },
    });

    console.log(`📋 [LOG RECEIVED] [${log.level.toUpperCase()}] ${log.source}: ${log.message}`);
    res.status(201).json({ ok: true, id: log.id });
  } catch (err: any) {
    console.error("❌ Lỗi lưu log:", err.message);
    res.status(500).json({ error: "Không thể lưu log" });
  }
});

// ─── GET /api/logs ────────────────────────────────────────────────────────────
// Lấy danh sách log để xem trên Terminal hoặc Admin Dashboard
router.get("/", requireAdminAuth, async (req, res) => {
  try {
    const limit  = Math.min(Number(req.query.limit)  || 50, 200);
    const level  = req.query.level  as string | undefined;
    const source = req.query.source as string | undefined;

    const where: any = {};
    if (level  && level  !== "all") where.level  = level;
    if (source && source !== "all") where.source = source;

    const logs = await prisma.systemLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    res.json(logs);
  } catch (err: any) {
    console.error("❌ Lỗi lấy logs:", err.message);
    res.status(500).json({ error: "Không thể lấy danh sách log" });
  }
});

// ─── DELETE /api/logs ─────────────────────────────────────────────────────────
// Xóa toàn bộ log cũ (dọn dẹp)
router.delete("/", requireAdminAuth, async (req, res) => {
  try {
    const { count } = await prisma.systemLog.deleteMany({});
    res.json({ ok: true, deleted: count });
  } catch (err: any) {
    res.status(500).json({ error: "Không thể xóa logs" });
  }
});

// ─── GET /api/logs/summary ────────────────────────────────────────────────────
// Tóm tắt số lỗi theo mức độ trong 24 giờ qua
router.get("/summary", requireAdminAuth, async (req, res) => {
  try {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total, criticals, errors, warnings, infos] = await Promise.all([
      prisma.systemLog.count({ where: { createdAt: { gte: since24h } } }),
      prisma.systemLog.count({ where: { level: "critical", createdAt: { gte: since24h } } }),
      prisma.systemLog.count({ where: { level: "error",    createdAt: { gte: since24h } } }),
      prisma.systemLog.count({ where: { level: "warning",  createdAt: { gte: since24h } } }),
      prisma.systemLog.count({ where: { level: "info",     createdAt: { gte: since24h } } }),
    ]);

    res.json({ total, critical: criticals, error: errors, warning: warnings, info: infos, since: since24h });
  } catch (err: any) {
    res.status(500).json({ error: "Không thể lấy thống kê log" });
  }
});

export default router;
