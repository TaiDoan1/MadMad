import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import productRoutes from "./routes/product.routes";
import orderRoutes from "./routes/order.routes";
import memberRoutes from "./routes/member.routes";
import settingsRoutes from "./routes/settings.routes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for Frontend Vite development
app.use(cors({
  origin: "*", // Trong thực tế, bạn sẽ cấu hình domain cụ thể của Frontend
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

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
app.use("/api/orders", orderRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/settings", settingsRoutes);

// Global Error Handler Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("❌ Global Error Handler:", err);
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
