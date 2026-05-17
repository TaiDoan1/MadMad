import nodemailer from "nodemailer";
import { prisma } from "../config/prisma";

// Cấu hình SMTP động từ tệp .env (mặc định fallback ghi log bảng tin ra console nếu chưa cấu hình)
const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn("⚠️ CẢNH BÁO: Chưa cấu hình SMTP credentials trong file .env (SMTP_HOST, SMTP_USER, SMTP_PASS). Hệ thống sẽ chuyển sang chế độ ghi log ra console!");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true nếu dùng port 465, false cho 587
    auth: { user, pass },
  });
};

export async function sendOrderConfirmationEmail(order: any) {
  const transporter = getTransporter();

  // 1. Lấy Dynamic Admin Email cấu hình từ Database
  let adminEmail = "contact@madmad.studio";
  try {
    const setting = await prisma.storefrontSetting.findUnique({
      where: { id: 1 }
    });
    if (setting && setting.storeEmail) {
      adminEmail = setting.storeEmail.trim();
    }
  } catch (error) {
    console.error("⚠️ Không lấy được storeEmail từ DB cấu hình, dùng mặc định:", error);
  }

  // Chi tiết hóa sản phẩm thành bảng HTML
  const itemsHtml = order.items.map((item: any) => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eeeeee;">
        <div style="font-weight: bold; color: #111111;">${item.productName}</div>
        <div style="font-size: 11px; color: #666666;">Size: ${item.size} | Màu: ${item.color}</div>
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eeeeee; text-align: center; font-family: monospace;">
        ${item.quantity}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #eeeeee; text-align: right; font-family: monospace; font-weight: bold;">
        ${item.price.toLocaleString("vi-VN")}₫
      </td>
    </tr>
  `).join("");

  // Thiết kế HTML Email chuẩn Minimalist Noir cực sang trọng
  const getHtmlTemplate = (titleText: string, welcomeMessage: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>MADMAD Studio - Đơn hàng mới</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f6f6f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f6f6f6; padding: 20px 0;">
        <tr>
          <td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.03);">
              <!-- Header -->
              <tr>
                <td align="center" style="background-color: #000000; padding: 30px 20px;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 4px; font-weight: 900;">MADMAD STUDIO</h1>
                  <p style="color: #999999; margin: 5px 0 0 0; font-size: 11px; letter-spacing: 2px;">--- MADE FOR REBELS ---</p>
                </td>
              </tr>
              
              <!-- Content Body -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="margin: 0 0 15px 0; font-size: 18px; color: #111111; text-transform: uppercase; letter-spacing: 1px;">${titleText}</h2>
                  <p style="margin: 0 0 25px 0; font-size: 14px; color: #444444; line-height: 1.6;">
                    ${welcomeMessage}
                  </p>

                  <!-- Thông tin đơn hàng tóm tắt -->
                  <div style="background-color: #fafafa; border: 1px solid #eeeeee; border-radius: 6px; padding: 20px; margin-bottom: 30px;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px;">
                      <tr>
                        <td style="padding-bottom: 8px; color: #666666;">Mã đơn hàng:</td>
                        <td style="padding-bottom: 8px; text-align: right; font-weight: bold; color: #000000;">${order.orderNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px; color: #666666;">Ngày đặt hàng:</td>
                        <td style="padding-bottom: 8px; text-align: right; color: #000000;">${new Date().toLocaleDateString("vi-VN")}</td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 8px; color: #666666;">Khách hàng:</td>
                        <td style="padding-bottom: 8px; text-align: right; font-weight: bold; color: #000000;">${order.customerName} (${order.customerPhone})</td>
                      </tr>
                      <tr>
                        <td style="color: #666666; vertical-align: top;">Địa chỉ giao nhận:</td>
                        <td style="text-align: right; color: #000000; line-height: 1.4;">
                          ${order.street}<br>
                          ${order.ward ? `${order.ward}, ` : ""}${order.district ? `${order.district}, ` : ""}${order.province || ""}
                        </td>
                      </tr>
                      ${order.notes ? `
                      <tr>
                        <td style="padding-top: 8px; color: #666666; vertical-align: top;">Ghi chú:</td>
                        <td style="padding-top: 8px; text-align: right; color: #c62828; font-style: italic;">${order.notes}</td>
                      </tr>
                      ` : ""}
                    </table>
                  </div>

                  <!-- Chi tiết sản phẩm bảng -->
                  <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #111111; border-bottom: 2px solid #000000; padding-bottom: 5px; text-transform: uppercase;">Sản phẩm đặt mua</h3>
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; margin-bottom: 30px;">
                    <thead>
                      <tr style="background-color: #f9f9f9;">
                        <th style="padding: 10px; text-align: left; color: #666666; font-weight: 500;">Sản phẩm</th>
                        <th style="padding: 10px; text-align: center; color: #666666; font-weight: 500;">SL</th>
                        <th style="padding: 10px; text-align: right; color: #666666; font-weight: 500;">Giá</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsHtml}
                    </tbody>
                  </table>

                  <!-- Tính tiền tóm tắt -->
                  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px; margin-bottom: 30px;">
                    <tr>
                      <td style="padding: 6px 0; color: #666666;">Tạm tính:</td>
                      <td style="padding: 6px 0; text-align: right; font-family: monospace;">${order.subtotal.toLocaleString("vi-VN")}₫</td>
                    </tr>
                    ${order.discount > 0 ? `
                    <tr>
                      <td style="padding: 6px 0; color: #22c55e;">Ưu đãi giảm giá:</td>
                      <td style="padding: 6px 0; text-align: right; font-family: monospace; color: #22c55e;">-${order.discount.toLocaleString("vi-VN")}₫</td>
                    </tr>
                    ` : ""}
                    <tr>
                      <td style="padding: 6px 0; color: #666666;">Phí vận chuyển:</td>
                      <td style="padding: 6px 0; text-align: right; font-family: monospace;">${order.shipping === 0 ? "Miễn phí" : `${order.shipping.toLocaleString("vi-VN")}₫`}</td>
                    </tr>
                    <tr style="border-top: 1px dashed #dddddd;">
                      <td style="padding: 15px 0 0 0; font-size: 16px; font-weight: bold; color: #c62828;">Tổng cộng:</td>
                      <td style="padding: 15px 0 0 0; font-size: 18px; font-weight: bold; text-align: right; font-family: monospace; color: #c62828;">${order.total.toLocaleString("vi-VN")}₫</td>
                    </tr>
                  </table>

                  <!-- Nút kiểm tra trạng thái đơn hàng -->
                  <div align="center" style="margin-top: 30px;">
                    <a href="https://www.madmadstudio.com/admin/orders" target="_blank" style="background-color: #000000; color: #ffffff; text-decoration: none; padding: 15px 35px; font-size: 13px; font-weight: bold; letter-spacing: 2px; border-radius: 4px; display: inline-block; text-transform: uppercase;">
                      Quản lý đơn hàng
                    </a>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                  <p style="margin: 0; font-size: 11px; color: #888888; line-height: 1.5;">
                    Thư thông báo tự động từ Hệ thống Quản trị Cửa hàng MADMAD Studio.<br>
                    Mọi thắc mắc vui lòng liên hệ qua Hotline: <strong>+84 123 456 789</strong> hoặc gửi email về: <strong>contact@madmad.studio</strong>.
                  </p>
                  <p style="margin: 10px 0 0 0; font-size: 10px; color: #aaaaaa;">
                    &copy; 2026 MADMAD Studio. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Gửi email thật qua SMTP hoặc fallback log console
  if (transporter) {
    // 📩 THƯ 1: Gửi cho Khách hàng (Nếu khách hàng có email)
    if (order.customerEmail && order.customerEmail.trim()) {
      try {
        const customerMsg = `Chào bạn <strong>${order.customerName}</strong>,<br><br>Cám ơn bạn đã lựa chọn nổi loạn và khẳng định cá tính cùng <strong>MADMAD Studio</strong>. Chúng tôi xác nhận đã nhận được đơn hàng của bạn và đang tiến hành đóng gói siêu tốc!`;
        const customerHtml = getHtmlTemplate("Đặt Hàng Thành Công!", customerMsg);

        await transporter.sendMail({
          from: `"MADMAD Studio" <${process.env.SMTP_USER}>`,
          to: order.customerEmail.trim(),
          subject: `[MADMAD STUDIO] ĐẶT HÀNG THÀNH CÔNG - ĐƠN HÀNG ${order.orderNumber}`,
          html: customerHtml,
        });
        console.log(`✉️ EMAIL: Đã gửi email xác nhận đặt hàng thành công đến Khách hàng: ${order.customerEmail}`);
      } catch (err) {
        console.error("❌ Lỗi gửi email cho Khách hàng:", err);
      }
    }

    // 📩 THƯ 2: Gửi thông báo cho Admin Gmail (Luôn gửi)
    if (adminEmail) {
      try {
        const adminMsg = `Xin chào Admin,<br><br>Hệ thống MADMAD Studio vừa ghi nhận có **ĐƠN HÀNG MỚI ĐẶT THÀNH CÔNG** trên website! Vui lòng truy cập trang quản trị Admin để xử lý giao dịch.`;
        const adminHtml = getHtmlTemplate("Thông Báo: Có Đơn Hàng Mới!", adminMsg);

        await transporter.sendMail({
          from: `"Hệ Thống MADMAD" <${process.env.SMTP_USER}>`,
          to: adminEmail,
          subject: `[MADMAD STUDIO - ADMIN] CÓ ĐƠN HÀNG MỚI CẦN XỬ LÝ - ${order.orderNumber}`,
          html: adminHtml,
        });
        console.log(`✉️ EMAIL: Đã gửi thông báo đơn hàng mới thành công đến Admin Gmail: ${adminEmail}`);
      } catch (err) {
        console.error("❌ Lỗi gửi email thông báo cho Admin Gmail:", err);
      }
    }
  } else {
    // Fallback log console đẹp mắt
    console.log("================= FALLBACK EMAIL LOG =================");
    console.log(`To Customer: ${order.customerEmail || "KHÔNG CÓ EMAIL"}`);
    console.log(`To Admin Gmail: ${adminEmail}`);
    console.log(`Subject: [MADMAD STUDIO] ĐƠN HÀNG MỚI - MÃ: ${order.orderNumber}`);
    console.log(`Order Total: ${order.total.toLocaleString("vi-VN")}₫`);
    console.log("======================================================");
  }
}
