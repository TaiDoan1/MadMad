import nodemailer from "nodemailer";
import { prisma } from "../config/prisma";

// 🔮 Cấu hình SMTP động: Ưu tiên lấy cấu hình từ Neon Database (StorefrontSetting), nếu không có mới dùng biến môi trường làm fallback
const getTransporter = async () => {
  let host = process.env.SMTP_HOST;
  let port = Number(process.env.SMTP_PORT || 587);
  let user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS;
  let senderName = "MADMAD STUDIO";

  try {
    const setting = await prisma.storefrontSetting.findFirst({
      orderBy: { id: "asc" }
    });

    if (setting) {
      if (setting.smtpHost) host = setting.smtpHost.trim();
      if (setting.smtpPort) port = Number(setting.smtpPort);
      if (setting.smtpUser) user = setting.smtpUser.trim();
      if (setting.smtpPass) pass = setting.smtpPass.trim();
      if (setting.smtpSenderName) senderName = setting.smtpSenderName.trim();
      console.log("🔮 [SMTP ENGINE] Đã áp dụng thành công cấu hình SMTP động từ Neon Postgres DB!");
    }
  } catch (error) {
    console.warn("⚠️ Không đọc được SMTP từ DB, chuyển sang dùng biến môi trường .env làm dự phòng:", error);
  }

  console.log("================= KIỂM TRA ĐỌC CẤU HÌNH SMTP =================");
  console.log(`- SMTP_HOST: "${host || 'KHÔNG CÓ'}"`);
  console.log(`- SMTP_PORT: ${port}`);
  console.log(`- SMTP_USER: "${user || 'KHÔNG CÓ'}"`);
  console.log(`- SMTP_PASS: "${pass ? 'ĐÃ ĐIỀN (MÃ ĐƯỢC ẨN BẢO MẬT)' : 'KHÔNG CÓ'}"`);
  console.log(`- SMTP_SENDER: "${senderName}"`);
  console.log("==================================================================");

  if (!host || !user || !pass) {
    console.warn("⚠️ CẢNH BÁO: Chưa cấu hình đầy đủ SMTP credentials. Hệ thống chạy ở chế độ console log!");
    return null;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return { transporter, user, senderName };
};

// 📩 THƯ 1 & 2: Tự động gửi Email hóa đơn cho Khách & Admin khi đặt hàng thành công
export async function sendOrderConfirmationEmail(order: any) {
  console.log(`\n📬 [EMAIL SERVICE] BẮT ĐẦU XỬ LÝ GỬI EMAIL ĐƠN HÀNG: ${order.orderNumber}`);

  const smtpInfo = await getTransporter();

  // 1. Lấy Dynamic Admin Email & Cấu hình email từ Database
  let adminEmail = "mmadmadstudio@gmail.com";
  let dbCustomerSubject = "[{{brandName}}] ĐẶT HÀNG THÀNH CÔNG - ĐƠN HÀNG {{orderNumber}}";
  let dbCustomerTemplate = "Chào bạn <strong>{{customerName}}</strong>,<br><br>Cám ơn bạn đã lựa chọn nổi loạn và khẳng định cá tính cùng <strong>{{brandName}}</strong>. Chúng tôi xác nhận đã nhận được đơn hàng của bạn và đang tiến hành đóng gói siêu tốc!";

  try {
    const setting = await prisma.storefrontSetting.findFirst({
      orderBy: { id: "asc" }
    });
    if (setting) {
      if (setting.storeEmail) adminEmail = setting.storeEmail.trim();
      if (setting.customerEmailSubject) dbCustomerSubject = setting.customerEmailSubject.trim();
      if (setting.customerEmailTemplate) dbCustomerTemplate = setting.customerEmailTemplate.trim();
    }
    console.log(`- Admin Email đích lấy từ Neon DB: "${adminEmail}"`);
  } catch (error) {
    console.error("⚠️ Không lấy được storeEmail từ DB cấu hình, dùng mặc định:", error);
  }

  // Nếu không có transporter (chưa điền cấu hình), in hóa đơn ra console
  if (!smtpInfo) {
    console.log("================= CHƯA CÓ SMTP - FALLBACK EMAIL LOG =================");
    console.log(`To Customer: ${order.customerEmail || "KHÔNG CÓ EMAIL"}`);
    console.log(`To Admin Gmail: ${adminEmail}`);
    console.log(`Subject: [MADMAD STUDIO] ĐƠN HÀNG MỚI - MÃ: ${order.orderNumber}`);
    console.log(`Order Total: ${order.total.toLocaleString("vi-VN")}₫`);
    console.log("======================================================================");
    return;
  }

  const { transporter, user, senderName } = smtpInfo;

  // 🧪 Kiểm tra kết nối SMTP với máy chủ
  console.log("🔍 Đang bắt đầu kiểm tra kết nối xác thực đến máy chủ SMTP (transporter.verify())...");
  try {
    await transporter.verify();
    console.log("✅ KẾT NỐI SMTP THÀNH CÔNG! Google chấp nhận tài khoản và mật khẩu ứng dụng.");
  } catch (verifyError: any) {
    console.error("❌ LỖI XÁC THỰC SMTP KHI KẾT NỐI GOOGLE:", verifyError);
    console.error("👉 Gợi ý khắc phục: Kiểm tra lại xem có copy dư dấu cách trong mật khẩu 16 chữ cái, hoặc gõ sai địa chỉ Gmail người gửi.");
    return;
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
  const getHtmlTemplate = (
    titleText: string,
    welcomeMessage: string,
    buttonText: string = "Quản lý đơn hàng",
    buttonUrl: string = "https://www.madmadstudio.com/admin/orders"
  ) => `
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
                  <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 4px; font-weight: 900;">${senderName}</h1>
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
                    <a href="${buttonUrl}" target="_blank" style="background-color: #000000; color: #ffffff; text-decoration: none; padding: 15px 35px; font-size: 13px; font-weight: bold; letter-spacing: 2px; border-radius: 4px; display: inline-block; text-transform: uppercase;">
                      ${buttonText}
                    </a>
                  </div>
                </td>
              </tr>
 
              <!-- Footer -->
              <tr>
                <td style="background-color: #f9f9f9; padding: 30px; text-align: center; border-top: 1px solid #eeeeee;">
                  <p style="margin: 0; font-size: 11px; color: #888888; line-height: 1.5;">
                    Thư thông báo tự động từ Hệ thống Quản trị Cửa hàng ${senderName}.<br>
                    Mọi thắc mắc vui lòng liên hệ qua Hotline: <strong>${order.storePhone || '+84 123 456 789'}</strong> hoặc gửi email về: <strong>${adminEmail}</strong>.
                  </p>
                  <p style="margin: 10px 0 0 0; font-size: 10px; color: #aaaaaa;">
                    &copy; 2026 ${senderName}. All rights reserved.
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

  // Định nghĩa hàm phân tách các từ khóa động (Tokens parser)
  const parseTemplateTokens = (templateStr: string) => {
    return templateStr
      .replace(/\{\{customerName\}\}/g, order.customerName || "quý khách")
      .replace(/\{\{orderNumber\}\}/g, order.orderNumber || "")
      .replace(/\{\{brandName\}\}/g, senderName || "MADMAD STUDIO");
  };

  const parsedSubject = parseTemplateTokens(dbCustomerSubject);
  const parsedTemplateMsg = parseTemplateTokens(dbCustomerTemplate);

  // 📩 THƯ 1: Gửi cho Khách hàng (Nếu khách hàng có email)
  if (order.customerEmail && order.customerEmail.trim()) {
    try {
      console.log(`- Đang chuẩn bị gửi email cho Khách hàng đến: ${order.customerEmail.trim()}`);
      const customerHtml = getHtmlTemplate("Đặt Hàng Thành Công!", parsedTemplateMsg, "Tra cứu đơn hàng", "https://www.madmadstudio.com/track-order");
 
      const customerInfo = await transporter.sendMail({
        from: `"${senderName}" <${user}>`,
        to: order.customerEmail.trim(),
        subject: parsedSubject,
        html: customerHtml,
      });
      console.log(`✉️ KẾT QUẢ GỬI KHÁCH HÀNG: Đã gửi email thành công! MessageId: ${customerInfo.messageId}`);
    } catch (err) {
      console.error("❌ LỖI GỬI EMAIL CHO KHÁCH HÀNG:", err);
    }
  }

  // 📩 THƯ 2: Gửi thông báo cho Admin Gmail (Luôn gửi)
  if (adminEmail) {
    try {
      console.log(`- Đang chuẩn bị gửi email thông báo cho Admin đến: ${adminEmail}`);
      const adminMsg = `Xin chào Admin,<br><br>Hệ thống ${senderName} vừa ghi nhận có **ĐƠN HÀNG MỚI ĐẶT THÀNH CÔNG** trên website! Vui lòng truy cập trang quản trị Admin để xử lý giao dịch.`;
      const adminHtml = getHtmlTemplate("Thông Báo: Có Đơn Hàng Mới!", adminMsg);

      const adminInfo = await transporter.sendMail({
        from: `"Hệ Thống ${senderName}" <${user}>`,
        to: adminEmail,
        subject: `[${senderName} - ADMIN] CÓ ĐƠN HÀNG MỚI CẦN XỬ LÝ - ${order.orderNumber}`,
        html: adminHtml,
      });
      console.log(`✉️ KẾT QUẢ GỬI ADMIN GMAIL: Đã gửi thông báo thành công! MessageId: ${adminInfo.messageId}`);
    } catch (err) {
      console.error("❌ LỖI GỬI EMAIL THÔNG BÁO CHO ADMIN GMAIL:", err);
    }
  }
}

// 📬 THƯ 3: Hàm gửi Email Thủ công trực tiếp từ Admin Form
export async function sendManualCustomEmail(to: string, subject: string, body: string) {
  console.log(`\n📬 [EMAIL SERVICE] BẮT ĐẦU GỬI EMAIL THỦ CÔNG ĐẾN: ${to}`);

  const smtpInfo = await getTransporter();

  if (!smtpInfo) {
    throw new Error("Chưa cấu hình thông tin SMTP để gửi mail! Hãy vào cài đặt SMTP trong Admin để cấu hình.");
  }

  const { transporter, user, senderName } = smtpInfo;

  // Kiểm thử xác thực
  await transporter.verify();

  // Khung template Email Minimalist Noir cực đẹp
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${subject}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f6f6f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f6f6f6; padding: 20px 0;">
        <tr>
          <td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.03);">
              <!-- Header -->
              <tr>
                <td align="center" style="background-color: #000000; padding: 25px 20px;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 20px; letter-spacing: 4px; font-weight: 900;">${senderName}</h1>
                  <p style="color: #999999; margin: 5px 0 0 0; font-size: 10px; letter-spacing: 2px;">--- THƯ TRỰC TIẾP ---</p>
                </td>
              </tr>
              
              <!-- Content Body -->
              <tr>
                <td style="padding: 40px 30px; font-size: 14px; color: #333333; line-height: 1.6;">
                  ${body.replace(/\n/g, "<br>")}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f9f9f9; padding: 25px; text-align: center; border-top: 1px solid #eeeeee;">
                  <p style="margin: 0; font-size: 11px; color: #888888; line-height: 1.5;">
                    Thư gửi từ Ban Quản Trị Hệ thống Cửa hàng ${senderName}.<br>
                    Để hỗ trợ khẩn cấp, xin vui lòng phản hồi (reply) trực tiếp email này.
                  </p>
                  <p style="margin: 10px 0 0 0; font-size: 10px; color: #aaaaaa;">
                    &copy; 2026 ${senderName}. All rights reserved.
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

  const info = await transporter.sendMail({
    from: `"${senderName}" <${user}>`,
    to,
    subject,
    html: htmlContent,
  });

  console.log(`✉️ KẾT QUẢ GỬI EMAIL THỦ CÔNG THÀNH CÔNG! MessageId: ${info.messageId}`);
  return info;
}
