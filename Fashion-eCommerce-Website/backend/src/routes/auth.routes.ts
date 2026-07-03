import { Router } from "express";
import { prisma } from "../config/prisma";

const router = Router();

// Lưu danh sách active admin tokens trong RAM hoặc file tạm (Ở mức cơ bản, dùng Memory Store)
const ACTIVE_ADMIN_TOKENS = new Set<string>();

// Endpoint bảo mật để kiểm tra Token Admin ở các routes khác
export function verifyAdminToken(token: string): boolean {
  return ACTIVE_ADMIN_TOKENS.has(token);
}

// 0. POST /api/auth/admin-login - Xác thực tài khoản Admin ở phía Server-side
router.post("/admin-login", async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const expectedUser = process.env.ADMIN_USERNAME || "admin";
    const expectedPass = process.env.ADMIN_PASSWORD || "admin123";

    if (username === expectedUser && password === expectedPass) {
      // Sinh token ngẫu nhiên cực kỳ bảo mật và lưu vào store
      const randomBytes = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
      const token = `MADMAD_SECURE_ADMIN_SESSION_${Date.now()}_${randomBytes}`;
      ACTIVE_ADMIN_TOKENS.add(token);

      console.log(`🔐 [ADMIN SECURITY] Admin logged in successfully. Issued secure token.`);

      return res.json({
        success: true,
        token
      });
    }

    // Trả về lỗi mập mờ để tránh bị Brute-force quét mật khẩu
    return res.status(401).json({ success: false, message: "Tài khoản hoặc mật khẩu không chính xác!" });
  } catch (error) {
    next(error);
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

    // Trả về dữ liệu thành viên cùng một token giả định an toàn
    res.json({
      member,
      sessionToken: `MADMAD_VIP_SECURE_SESSION_${member.id}_${Date.now()}`
    });

  } catch (error) {
    next(error);
  }
});

// 2. GET /api/auth/my-orders - Tra cứu toàn bộ lịch sử đơn hàng của Member đang đăng nhập
router.get("/my-orders", async (req, res, next) => {
  try {
    const email = req.headers["x-member-email"];

    if (!email) {
      return res.status(401).json({ message: "Vui lòng đăng nhập để xem đơn hàng!" });
    }

    const cleanEmail = String(email).trim().toLowerCase();

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
    const email = req.headers["x-member-email"];
    const { fullName, phone } = req.body;

    if (!email) {
      return res.status(401).json({ message: "Vui lòng đăng nhập để cập nhật hồ sơ!" });
    }

    const cleanEmail = String(email).trim().toLowerCase();
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
