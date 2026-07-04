import { Router } from "express";
import { prisma } from "../config/prisma";
import { requireAdminAuth } from "../utils/auth.middleware";

const router = Router();

// 🛡️ InMemory Rate Limiter cho việc nhận logs nhằm tránh spam bộ nhớ và DB
const ipLogCounts = new Map<string, { count: number; resetTime: number }>();
const LIMIT_WINDOW_MS = 60 * 1000; // 1 phút
const MAX_LOGS_PER_WINDOW = 30;   // Tối đa 30 logs/phút/IP

router.post("/", async (req, res) => {
  try {
    const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0].trim()
      || req.socket.remoteAddress
      || "unknown";

    // Kiểm tra Rate Limit
    const now = Date.now();
    const ipRecord = ipLogCounts.get(ip);

    if (ipRecord) {
      if (now > ipRecord.resetTime) {
        // Hết chu kỳ giới hạn, reset bộ đếm
        ipLogCounts.set(ip, { count: 1, resetTime: now + LIMIT_WINDOW_MS });
      } else if (ipRecord.count >= MAX_LOGS_PER_WINDOW) {
        // Vượt quá giới hạn
        return res.status(429).json({ error: "Too many logs sent. Please wait before retrying." });
      } else {
        ipRecord.count += 1;
      }
    } else {
      ipLogCounts.set(ip, { count: 1, resetTime: now + LIMIT_WINDOW_MS });
    }

    const { level, source, message, details, url, userAgent } = req.body;

    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

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

// ─── GET /api/logs/visits ──────────────────────────────────────────────────────
// Thống kê lượng truy cập (views và unique visitors)
router.get("/visits", requireAdminAuth, async (req, res) => {
  try {
    const range = (req.query.range as string) || "30days";
    const now = new Date();
    const where: any = { level: "visit" };

    if (range === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      where.createdAt = { gte: start };
    } else if (range === "7days") {
      const past7 = new Date();
      past7.setDate(now.getDate() - 7);
      where.createdAt = { gte: past7 };
    } else if (range === "30days") {
      const past30 = new Date();
      past30.setDate(now.getDate() - 30);
      where.createdAt = { gte: past30 };
    }

    const logs = await prisma.systemLog.findMany({
      where,
      select: { ip: true, createdAt: true, url: true },
      orderBy: { createdAt: "asc" }
    });

    const totalViews = logs.length;
    const uniqueIps = new Set(logs.map(l => l.ip).filter(Boolean)).size;

    // Phân tích theo ngày
    const dailyStats: Record<string, { views: number; visitors: Set<string> }> = {};
    logs.forEach(log => {
      const dateStr = new Date(log.createdAt).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit"
      });
      if (!dailyStats[dateStr]) {
        dailyStats[dateStr] = { views: 0, visitors: new Set() };
      }
      dailyStats[dateStr].views += 1;
      if (log.ip) {
        dailyStats[dateStr].visitors.add(log.ip);
      }
    });

    const chartData = Object.entries(dailyStats).map(([date, data]) => ({
      date,
      views: data.views,
      visitors: data.visitors.size
    }));

    // Thống kê trang được xem nhiều nhất
    const pageCounts: Record<string, number> = {};
    logs.forEach(log => {
      if (log.url) {
        let path = "/";
        try {
          const parsedUrl = new URL(log.url);
          path = parsedUrl.pathname;
        } catch {
          path = log.url;
        }
        pageCounts[path] = (pageCounts[path] || 0) + 1;
      }
    });

    const topPages = Object.entries(pageCounts)
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({
      totalViews,
      uniqueVisitors: uniqueIps,
      chartData,
      topPages
    });
  } catch (err: any) {
    console.error("❌ Lỗi lấy thống kê truy cập:", err.message);
    res.status(500).json({ error: "Không thể thống kê lượt truy cập" });
  }
});

export default router;
