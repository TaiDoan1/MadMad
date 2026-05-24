# 👑 TỔNG HỢP KIẾN TRÚC DỰ ÁN & NHẬT KÝ LOG - MADMAD STUDIO

Tài liệu này tổng hợp toàn bộ các dịch vụ đám mây (Cloud Services) được tích hợp trong dự án, các công nghệ sử dụng, và chi tiết chức năng của các file log/script giám sát hỗ trợ quản trị hệ thống.

---

## ☁️ 1. Các Dịch Vụ Đám Mây Tích Hợp (Integrated Cloud Services)

Dự án **Fashion E-Commerce MADMAD Studio** sử dụng kiến trúc phân tán hiện đại, kết nối các dịch vụ đám mây hàng đầu để tối ưu hóa hiệu năng và chi phí vận hành:

### 🔺 Vercel (Hosting & Serverless Backend)
* **Chức năng:** Hosting cho toàn bộ ứng dụng.
  * **Frontend:** Biên dịch mã nguồn React + Vite và phục vụ tĩnh (Static Hosting) trên CDN toàn cầu của Vercel.
  * **Backend:** Chạy ứng dụng Node.js Express dưới dạng các hàm **Serverless Functions** (tự động mở rộng khi lượng truy cập tăng đột biến).
* **Quản lý:** Tự động kết nối với GitHub. Khi bạn chạy lệnh `deploy.bat` hoặc lựa chọn `[5]` trong `checktong.bat`, mã nguồn được đẩy lên GitHub, Vercel sẽ tự động phát hiện và tiến hành biên dịch (build) lại bản mới nhất.

### 🐘 Neon (PostgreSQL Database)
* **Chức năng:** Cung cấp cơ sở dữ liệu quan hệ **Serverless PostgreSQL** trên Cloud.
* **Chi tiết lưu trữ:** Lưu trữ tất cả dữ liệu cốt lõi của website bao gồm:
  * Thông tin sản phẩm (Product), danh mục (Category).
  * Đơn hàng (Order) và chi tiết mặt hàng mua (OrderItem).
  * Thành viên đăng nhập hệ thống VIP (VIPMember).
  * Cấu hình tùy chỉnh của cửa hàng (StorefrontSetting).
  * Nhật ký lỗi và hoạt động hệ thống (SystemLog).
* **Kết nối:** Kết nối an toàn thông qua chuỗi kết nối mã hóa SSL lưu trong file cấu hình `.env` (`DATABASE_URL`).

### ☁️ Cloudinary (Cloud Image & Optimization CDN)
* **Chức năng:** Dịch vụ lưu trữ và phân phối hình ảnh đám mây.
* **Vai trò tối ưu:** Thay thế hoàn toàn việc lưu ảnh dạng chuỗi Base64 khổng lồ trong DB PostgreSQL bằng cách:
  1. Tự động nhận diện nếu dữ liệu là Base64 (`data:image/...`) từ trang quản trị (Admin).
  2. Tải ảnh lên thư mục `madmad-products` của Cloudinary.
  3. Chuyển đổi định dạng sang `.webp` tối ưu dung lượng và trả về link URL CDN ngắn gọn lưu vào DB.
* **Kết quả:** Giảm dung lượng phản hồi API từ **2.75 MB xuống 9.3 KB** (giảm 296 lần) và tăng tốc độ tải trang từ **3.5 giây xuống ~300ms**.

### 🔑 Google Identity & APIs (OAuth Login VIP Member)
* **Chức năng:** Hệ thống đăng nhập một chạm của Google (One-tap Google Login).
* **Quy trình hoạt động:** Khi khách hàng đăng nhập tài khoản VIP trên Frontend, Google trả về một `Credential ID Token`. Backend sẽ gửi token này tới API chính thức của Google (`https://oauth2.googleapis.com/tokeninfo`) để xác thực an toàn, lấy về Họ tên, Email, Ảnh đại diện của khách để cấp quyền VIP.

### ✉️ SMTP Gmail Service (Auto Emails Notification)
* **Chức năng:** Gửi email tự động thông báo đặt hàng cho khách hàng và chủ cửa hàng.
* **Cấu hình:** Sử dụng phương thức gửi SMTP thông qua tài khoản Gmail mật định `mmadmadstudio@gmail.com` kết hợp với **Google App Password** an toàn (`yxmbctjhsxkyeznx`).
* **Linh hoạt:** Chủ cửa hàng có thể thay đổi cấu hình tài khoản SMTP, nội dung, tiêu đề template email gửi đi ngay tại giao diện Admin của trang web.

---

## 🛠️ 2. Các Công Nghệ Sử Dụng (Technology Stack)

Hệ thống được xây dựng trên ngôn ngữ **TypeScript** từ đầu đến cuối nhằm hạn chế tối đa lỗi cú pháp và nâng cao độ tin cậy:

### 🖥️ Frontend (Giao diện người dùng)
* **Vite + React:** Bộ khung xây dựng giao diện tốc độ cực nhanh, hỗ trợ tải lại mô-đun nóng (Hot Module Replacement) khi phát triển.
* **Tailwind CSS:** Thiết kế giao diện responsive linh hoạt bằng utility classes.
* **Material UI (MUI):** Cung cấp các component UI chất lượng cao và đồng bộ.
* **Framer Motion:** Tạo hiệu ứng chuyển động và micro-animations mượt mà cho trải nghiệm cao cấp.
* **Lucide React:** Bộ thư viện icons hiện đại sắc nét.
* **Recharts:** Vẽ biểu đồ trực quan hóa dữ liệu đơn hàng và doanh thu trong trang Admin.

### ⚙️ Backend (API Server)
* **Node.js & Express:** Framework xử lý các HTTP requests và cung cấp RESTful APIs.
* **Prisma ORM:** Công cụ kết nối và thao tác cơ sở dữ liệu mạnh mẽ bằng JavaScript/TypeScript thay vì viết các câu lệnh SQL thô, đồng thời tự động đồng bộ lược đồ DB qua Prisma Migrate.
* **Cloudinary SDK:** Thư viện Node.js kết nối và tải ảnh lên Cloud.
* **Nodemailer:** Gửi email HTML chuyên nghiệp đến khách hàng.

---

## 📋 3. Tổng Hợp Các File Logs & Utility Scripts

Dự án sở hữu hệ thống log, script theo dõi và chẩn đoán toàn diện, hỗ trợ đắc lực cho quản trị viên vận hành hệ thống mà không cần hiểu sâu về kỹ thuật:

| Tên File | Loại | Chức năng chi tiết |
|---|---|---|
| **`checktong.bat`** | File Batch chạy | **Trung tâm điều khiển chính (Control Panel).** Tích hợp tất cả các script kiểm tra hệ thống, live logs, di chuyển ảnh, speed test và deploy thành một menu giao diện số duy nhất. Bạn chỉ cần chạy file này để điều khiển cả dự án. |
| **`madmad-monitor.log`** | File Log văn bản | **File lưu trữ nhật ký local.** Tự động ghi nhận tất cả kết quả chẩn đoán hệ thống từ `check-system.cjs` và logs live từ `xem-log.cjs` thành định dạng text thô (đã lọc bỏ mã màu ANSI) để bạn lưu giữ và tra cứu khi cần. |
| **`xem-log.cjs`** | Script Node.js | **Động cơ của Live Log Monitor.** <br>- Kết nối liên tục đến endpoint `/api/logs` để lấy logs của bảng `SystemLog` trong database Neon. <br>- Đo thời gian phản hồi (Latency) của từng API backend thực tế.<br>- Thống kê nhanh tình trạng đơn hàng.<br>- Hỗ trợ phím tắt điều khiển: `Space` (tạm dừng cuộn logs), `L` (lọc mức độ log), `S` (lọc nguồn backend/frontend), `C` (xóa file log local). |
| **`XemLog.bat`** | File Batch chạy | Phím tắt nhanh trên màn hình Windows để gọi `xem-log.cjs` mà không cần gõ lệnh cmd. |
| **`check-system.cjs`** | Script Node.js | **Công cụ chẩn đoán sức khỏe hệ thống.** <br>- Bước 1: Kiểm tra cấu trúc thư mục Frontend (`vite.config.ts`, `node_modules`).<br>- Bước 2: Kiểm tra cấu trúc Backend (`package.json`, `.env`).<br>- Bước 3: Thử kết nối thực tế đến Neon Postgres và đếm sản phẩm.<br>- Bước 4: Chạy biên dịch thử mã nguồn (Vite Build) xem có lỗi code nào không. |
| **`KiemTraHeThong.bat`** | File Batch chạy | Phím tắt nhanh để chạy nhanh kịch bản chẩn đoán hệ thống `check-system.cjs`. |
| **`scratch-check-api.cjs`** | Script Node.js | **Script kiểm tra nhanh tốc độ API.** Thực hiện gọi API `/api/products` thực tế trên Cloud 3 lần liên tiếp, tính toán dung lượng phản hồi (KB) và đo chính xác thời gian phản hồi (ms) để đánh giá hiệu suất tải trang thực tế. |
| **`migrate-to-cloudinary.cjs`** | Script Node.js | **Script di chuyển ảnh database (chạy trong `backend/`).** <br>- Quét toàn bộ DB, tìm ảnh sản phẩm và ảnh chi tiết đơn hàng cũ dạng Base64.<br>- Đẩy lên Cloudinary, nhận về URL CDN và ghi đè lưu lại DB.<br>- In log chi tiết quá trình upload thành công và dung lượng tiết kiệm lên màn hình. |
| **`deploy.bat`** | File Batch chạy | Phím tắt nhanh giúp tự động gom tất cả thay đổi mã nguồn mới, tạo commit tự động, và `git push` lên GitHub để kích hoạt Vercel redeploy trang web chỉ trong 1 click. |

---

> [!NOTE]
> Tài liệu này được tạo tự động bởi trợ lý AI Antigravity nhằm phục vụ công tác bàn giao và quản trị kỹ thuật dự án **MADMAD Studio**.
