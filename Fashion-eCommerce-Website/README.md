# 🖤 TÀI LIỆU TOÀN TẬP DỰ ÁN MADMAD STUDIO

Tài liệu này cung cấp toàn bộ thông tin về kiến trúc, cơ sở dữ liệu, cách vận hành, và hướng dẫn chi tiết về bảo mật, sao lưu dữ liệu cho dự án thương mại điện tử MADMAD Studio.

---

## 1. THÔNG TIN TỔNG QUAN DỰ ÁN
- **Tên dự án:** MADMAD Fashion eCommerce Platform
- **Mô hình:** Monorepo (Frontend và Backend nằm trong cùng một kho lưu trữ)
- **Frontend:** React (Vite), TypeScript, Tailwind CSS, Lucide Icons.
- **Backend:** Node.js, Express, Prisma ORM.
- **Cơ sở dữ liệu (Database):** PostgreSQL (Triển khai trên Cloud Database như Neon / Vercel Postgres).
- **Hệ thống Triển khai (CI/CD):** Vercel (Tự động hóa bằng mã lệnh `deploy.bat`).

---

## 2. KIẾN TRÚC CƠ SỞ DỮ LIỆU (DATABASE SCHEMA)
Hệ thống sử dụng Prisma ORM với cơ sở dữ liệu PostgreSQL. Dưới đây là 5 bảng (tables) quan trọng nhất đang vận hành:

### 🛍️ Bảng `Product` (Sản Phẩm)
Lưu trữ toàn bộ quần áo, phụ kiện.
- `id`, `name` (Tên), `sku` (Mã sp), `price` (Giá).
- `image`, `colorImages` (Ảnh theo màu).
- `sizes` (S, M, L...), `colors` (Đen, Trắng...), `category` (Danh mục).

### 📦 Bảng `Order` & `OrderItem` (Đơn Hàng)
Lưu thông tin mua sắm của khách.
- `Order`: `orderNumber` (Mã đơn), Thông tin người nhận (Tên, Email, SĐT, Địa chỉ), Tổng tiền (`total`), Trạng thái đơn (`status`), v.v.
- `OrderItem`: Chi tiết các sản phẩm trong đơn (Tên sản phẩm, Màu, Size, Số lượng, Giá).

### 👑 Bảng `VIPMember` (Thành Viên VIP)
Quản lý thẻ thành viên và tích điểm.
- `fullName` (Họ Tên), `phone` (SĐT), `email` (Email).
- `points` (Điểm tích lũy).
- `tier` (Hạng thẻ: BRONZE, SILVER, GOLD, PLATINUM).

### ⚙️ Bảng `StorefrontSetting` (Cấu hình Hệ thống)
Cho phép Admin thay đổi nội dung web không cần code.
- Logo, Slogan, Mạng xã hội, Footer.
- Cấu hình SMTP (Gmail) để gửi email tự động cho khách.
- Cấu hình nội dung Mẫu in Hóa đơn.

---

## 3. HƯỚNG DẪN VẬN HÀNH & ĐẨY LÊN WEB (DEPLOYMENT)
Để đưa bất kỳ bản cập nhật nào (sửa chữ, sửa hình, thêm tính năng) lên trang web chính thức, bạn **KHÔNG CẦN** phải nhớ quá nhiều thao tác.

1. Mở Terminal (Powershell) tại thư mục gốc của dự án.
2. Gõ duy nhất lệnh sau:
   ```powershell
   .\deploy.bat
   ```
3. Lệnh này sẽ tự động làm 3 việc:
   - Build thử Frontend trên máy của bạn để phát hiện lỗi.
   - Tự động đóng gói và đẩy lên GitHub (Tên commit: "Auto Deploy...").
   - Kích hoạt Vercel Cloud tự động kéo code mới nhất về và cập nhật toàn cầu.

---

## 4. HƯỚNG DẪN SAO LƯU & BẢO VỆ DỮ LIỆU (BACKUP)

Dữ liệu khách hàng và lịch sử đơn hàng là tài sản quý giá nhất. Dự án đã được thiết lập **2 Phương án Sao lưu** song song để đảm bảo an toàn tuyệt đối.

### 🟢 Phương Án 1: Backup Bằng Tay Ra Excel (Bản Vật Lý)
Đây là phương án giúp bạn nắm file dữ liệu vật lý trong ổ cứng máy tính cá nhân.
1. Truy cập vào trang **Quản trị Admin** của bạn.
2. Vào mục **Cài Đặt** > Chuyển sang Tab **Sao Lưu Dữ Liệu** (Màu đỏ).
3. Nhấn nút **TẢI BẢN SAO LƯU EXCEL / CSV NGAY**.
4. Hệ thống sẽ kết nối với Database và ngay lập tức tải về 2 file: 
   - `MADMAD_Orders_Backup...`
   - `MADMAD_VIPMembers_Backup...`
5. **Khuyến nghị:** Hãy làm việc này vào mỗi sáng Thứ 2 hàng tuần.

### 🔵 Phương Án 2: Phục Hồi Dữ Liệu Đám Mây (Cloud Database Recovery)
Đây là phương án cứu mạng khi bạn hoặc nhân viên lỡ tay xóa nhầm đơn hàng hay bảng dữ liệu trên Database (Sử dụng tính năng Point-In-Time Recovery của Neon/Supabase/Vercel Postgres).

1. Đăng nhập vào trang quản trị của nhà cung cấp Database (Ví dụ: [Vercel.com](https://vercel.com) hoặc [Neon.tech](https://neon.tech)).
2. Chọn đúng Database Project của trang MADMAD.
3. Tìm đến thẻ **"Backups"** hoặc **"Restore"** trên menu bên trái.
4. Nhà cung cấp Cloud luôn chụp (snapshot) lại toàn bộ dữ liệu của bạn mỗi ngày. Bạn sẽ thấy danh sách các bản sao lưu theo từng ngày.
5. Nhấn chọn bản sao lưu của ngày hôm qua (Hoặc một mốc thời gian an toàn trước khi xảy ra sự cố).
6. Nhấn nút **Restore** (Khôi phục).
7. Chờ khoảng 1-2 phút, toàn bộ database của bạn sẽ được "quay ngược thời gian" trở về trạng thái hoàn hảo đó.

---
*Tài liệu được biên soạn và tối ưu hóa bởi Trợ lý AI Antigravity - Phục vụ riêng cho nền tảng MADMAD Studio.*