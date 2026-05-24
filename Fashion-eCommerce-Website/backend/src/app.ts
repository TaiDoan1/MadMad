import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import productRoutes  from "./routes/product.routes";
import orderRoutes   from "./routes/order.routes";
import memberRoutes  from "./routes/member.routes";
import settingsRoutes from "./routes/settings.routes";
import authRoutes    from "./routes/auth.routes";
import logsRoutes    from "./routes/logs.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for Frontend Vite development
app.use(cors({
  origin: "*", // Trong thực tế, bạn sẽ cấu hình domain cụ thể của Frontend
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-member-email"]
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// 📝 Middleware ghi nhận mọi yêu cầu HTTP để chuẩn đoán kết nối local
app.use((req, res, next) => {
  console.log(`📡 [HTTP REQUEST] ${req.method} ${req.url}`);
  next();
});

// API Base Check
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to MADMAD Studio E-commerce Backend API",
    version: "1.0.0",
    status: "healthy"
  });
});

// Register API Routes
app.use("/api/products", productRoutes);
app.use("/api/orders",  orderRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/auth",    authRoutes);
app.use("/api/logs",    logsRoutes);

// Global Error Handler Middleware — tự động ghi lối backend vào Database
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("\u274c Global Error Handler:", err);

  // Tự động lưu lồi Backend vào bảng SystemLog
  try {
    const { prisma } = require("./config/prisma");
    const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0].trim()
      || req.socket.remoteAddress || "unknown";
    prisma.systemLog.create({
      data: {
        level: err.status && err.status < 500 ? "warning" : "error",
        source: "backend",
        message: err.message || "Internal Server Error",
        details: JSON.stringify({ stack: err.stack, method: req.method, path: req.path, body: req.body }).slice(0, 5000),
        url: req.path,
        ip,
        userAgent: req.headers["user-agent"]?.slice(0, 300) || null,
      },
    }).catch(() => {}); // Không thả lồi thứ cấp
  } catch {}

  res.status(err.status || 500).json({
    error: true,
    message: err.message || "Internal Server Error"
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 MADMAD Server is running on port ${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}`);
});

export default app;
