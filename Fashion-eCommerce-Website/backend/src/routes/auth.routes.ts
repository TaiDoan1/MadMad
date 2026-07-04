import { Router } from "express";
import { prisma } from "../config/prisma";
import jwt from "jsonwebtoken";

const router = Router();

// JWT secret: dùng env var nếu có, fallback về giá trị mặc định kèm cảnh báo
const getJwtSecret = (): string => {
  const secret = process.env.ADMIN_JWT_SECRET || process.env.ADMIN_SECRET_KEY;
  if (!secret) {
    console.warn("⚠️  [SECURITY WARNING] Không tìm thấy ADMIN_JWT_SECRET hay ADMIN_SECRET_KEY trong .env. Sử dụng mã bí mật dự phòng mặc định (Không an toàn trong môi trường Production!)");
    return "MADMAD_DEFAULT_SECRET_KEY_2026";
  }
  return secret;
};

const JWT_SECRET = getJwtSecret();
const JWT_EXPIRES_IN = "90d"; // Token có hiệu lực 90 ngày
const JWT_REFRESH_THRESHOLD_DAYS = 14; // Tự động gia hạn khi còn ít hơn 14 ngày

// Xác minh JWT token - dùng được ở mọi nơi, không cần RAM store
export function verifyAdminToken(token: string): boolean {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    return decoded?.role === "admin";
  } catch {
    return false;
  }
}

// 0. POST /api/auth/admin-login - Xác thực tài khoản Admin ở phía Server-side
router.post("/admin-login", async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const expectedUser = process.env.ADMIN_USERNAME || "admin";
    const expectedPass = process.env.ADMIN_PASSWORD || "admin123";

    if (username === expectedUser && password === expectedPass) {
      // Sinh JWT token có hiệu lực 90 ngày - sống qua mọi lần server restart
      const token = jwt.sign(
        { role: "admin", user: username, issuedAt: Date.now() },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      return res.json({
        success: true,
        token,
        expiresIn: JWT_EXPIRES_IN
      });
    }

    // Trả về lỗi mập mờ để tránh bị Brute-force quét mật khẩu
    return res.status(401).json({ success: false, message: "Tài khoản hoặc mật khẩu không chính xác!" });
  } catch (error) {
    next(error);
  }
});

// 0b. POST /api/auth/admin-refresh - Tự động gia hạn token khi còn gần hết hạn
// Không cần username/password — chỉ cần token hiện tại còn hợp lệ
router.post("/admin-refresh", (req, res) => {
  try {
    const authHeader = req.headers["x-admin-key"] as string;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: "Thiếu token xác thực!" });
    }

    // Xác minh token hiện tại có hợp lệ không
    let decoded: any;
    try {
      decoded = jwt.verify(authHeader, JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: "Token không hợp lệ hoặc đã hết hạn!" });
    }

    if (decoded?.role !== "admin") {
      return res.status(403).json({ success: false, message: "Token không có quyền Admin!" });
    }

    // Kiểm tra xem token còn bao nhiêu ngày nữa hết hạn
    const nowSeconds = Math.floor(Date.now() / 1000);
    const remainingSeconds = (decoded.exp || 0) - nowSeconds;
    const remainingDays = Math.floor(remainingSeconds / 86400);

    // Chỉ gia hạn nếu còn ít hơn ngưỡng cho phép
    if (remainingDays > JWT_REFRESH_THRESHOLD_DAYS) {
      return res.json({
        success: true,
        refreshed: false,
        remainingDays,
        message: `Token vẫn còn hiệu lực ${remainingDays} ngày, chưa cần gia hạn.`
      });
    }

    // Cấp token mới 90 ngày
    const newToken = jwt.sign(
      { role: "admin", user: decoded.user || "admin", issuedAt: Date.now() },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.json({
      success: true,
      refreshed: true,
      token: newToken,
      expiresIn: JWT_EXPIRES_IN,
      message: `Đã gia hạn thành công! Token mới có hiệu lực 90 ngày.`
    });
  } catch {
    return res.status(500).json({ success: false, message: "Lỗi server khi gia hạn token." });
  }
});

// 1. POST /api/auth/google-login - Đăng nhập / Đăng ký bằng Google ID Token
router.post("/google-login", async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: "Không tìm thấy thông tin xác thực Google (credential)!" });
    }

    // 🔍 Gọi API Google để xác thực ID Token an toàn (Không cần cài thêm thư viện npm)
    const googleVerifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`;
    const verifyResponse = await fetch(googleVerifyUrl);

    if (!verifyResponse.ok) {
      return res.status(401).json({ message: "Xác thực tài khoản Google thất bại hoặc Token đã hết hạn!" });
    }

    const payload = await verifyResponse.json();
    const { sub: googleId, email, name: googleName, picture: avatarUrl } = payload;

    if (!email) {
      return res.status(400).json({ message: "Tài khoản Google không có quyền truy cập Email!" });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 🔍 Tìm thành viên VIP theo Google ID hoặc Email
    let member = await prisma.vIPMember.findFirst({
      where: {
        OR: [
          { googleId },
          { email: cleanEmail }
        ]
      }
    });

    let isNewUser = false;

    if (!member) {
      isNewUser = true;

      // 💡 LẤY TÊN THÔNG MINH THEO YÊU CẦU CỦA USER:
      // Bước 1: Tra cứu xem người dùng này đã từng mua hàng bằng Gmail này chưa
      const latestOrder = await prisma.order.findFirst({
        where: { customerEmail: cleanEmail },
        orderBy: { createdAt: "desc" }
      });

      // Bước 2: Ưu tiên lấy tên từ đơn hàng cũ nhất/mới nhất, nếu chưa từng mua thì lấy tên từ tài khoản Google
      const resolvedName = latestOrder ? latestOrder.customerName : googleName;

      // Tạo tài khoản VIP thành viên mới tự động
      member = await prisma.vIPMember.create({
        data: {
          fullName: resolvedName,
          email: cleanEmail,
          googleId,
          avatarUrl,
          points: 0,
          tier: "BRONZE"
        }
      });
      console.log(`🆕 [MEMBER SYSTEM] Đã tự động tạo mới Thành viên VIP từ Google Login: ${resolvedName} (${cleanEmail})`);
    } else {
      // Cập nhật thông tin Google ID và ảnh đại diện mới nhất nếu chưa có
      member = await prisma.vIPMember.update({
        where: { id: member.id },
        data: {
          googleId,
          avatarUrl: avatarUrl || member.avatarUrl
        }
      });
      console.log(`🔐 [MEMBER SYSTEM] Thành viên đăng nhập thành công: ${member.fullName} (${cleanEmail})`);
    }

    // Sinh JWT token cho VIP Member
    const memberToken = jwt.sign(
      { role: "member", email: member.email, memberId: member.id },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      member,
      sessionToken: memberToken
    });

  } catch (error) {
    next(error);
  }
});

// 2. GET /api/auth/my-orders - Tra cứu toàn bộ lịch sử đơn hàng của Member đang đăng nhập (Sử dụng JWT thực tế)
router.get("/my-orders", async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Vui lòng cung cấp token xác thực!" });
    }

    const token = authHeader.split(" ")[1];
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn!" });
    }

    if (decoded.role !== "member" || !decoded.email) {
      return res.status(403).json({ message: "Quyền truy cập không hợp lệ!" });
    }

    const cleanEmail = String(decoded.email).trim().toLowerCase();

    // Lấy toàn bộ danh sách đơn hàng mua bằng Gmail này, kèm chi tiết sản phẩm
    const orders = await prisma.order.findMany({
      where: { customerEmail: cleanEmail },
      include: { items: true },
      orderBy: { createdAt: "desc" }
    });

    res.json(orders);
  } catch (error) {
    next(error);
  }
});

// 3. PUT /api/auth/update-profile - Thành viên tự cập nhật Họ tên / Số điện thoại của mình
router.put("/update-profile", async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Vui lòng cung cấp token xác thực!" });
    }

    const token = authHeader.split(" ")[1];
    let decoded: any;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Token không hợp lệ hoặc đã hết hạn!" });
    }

    if (decoded.role !== "member" || !decoded.email) {
      return res.status(403).json({ message: "Quyền truy cập không hợp lệ!" });
    }

    const cleanEmail = String(decoded.email).trim().toLowerCase();
    const { fullName, phone } = req.body;

    const cleanPhone = phone ? phone.trim().replace(/\s+/g, "") : undefined;

    // Tìm thành viên cần cập nhật
    const currentMember = await prisma.vIPMember.findUnique({
      where: { email: cleanEmail }
    });

    if (!currentMember) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản thành viên." });
    }

    // Cập nhật thông tin
    const updatedMember = await prisma.vIPMember.update({
      where: { id: currentMember.id },
      data: {
        fullName: fullName ? fullName.trim() : undefined,
        phone: cleanPhone
      }
    });

    res.json(updatedMember);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ message: "Số điện thoại này đã được sử dụng bởi một thành viên khác!" });
    }
    next(error);
  }
});

export default router;
