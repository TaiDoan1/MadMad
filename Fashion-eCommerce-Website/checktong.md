# 📋 HƯỚNG DẪN SỬ DỤNG CÔNG CỤ QUẢN TRỊ - MADMAD STUDIO

> **Dành cho:** Chủ cửa hàng / Người quản trị hệ thống  
> **Cập nhật:** Tháng 5/2026  
> **Yêu cầu:** Máy tính đã cài đặt Node.js và Git

---

## 🚀 CÁCH SỬ DỤNG NHANH NHẤT

**Chỉ cần click đúp vào file `checktong.bat`** — đây là file tổng hợp chứa toàn bộ công cụ bên dưới trong một menu duy nhất. Bạn không cần nhớ tên từng file riêng lẻ.

```
📁 Fashion-eCommerce-Website/
│
├── 👑 checktong.bat          ← DÙNG FILE NÀY LÀ ĐỦ (menu tổng hợp)
│
├── 🔍 KiemTraHeThong.bat     ← Kiểm tra sức khỏe toàn hệ thống
├── 📺 XemLog.bat             ← Xem log lỗi realtime trên Terminal
└── 🚀 deploy.bat             ← Triển khai phiên bản mới lên Server
```

---

## 📌 CHI TIẾT TỪNG FILE

---

### 1️⃣ `checktong.bat` — Trung Tâm Điều Khiển

> **Đây là file bạn nên dùng hàng ngày.**

**Cách dùng:** Click đúp vào file → Một cửa sổ Terminal (màu đen) sẽ hiện ra với menu lựa chọn.

```
╔══════════════════════════════════════════════════════════════╗
║         🛍️  MADMAD STUDIO - TRUNG TÂM ĐIỀU KHIỂN           ║
╚══════════════════════════════════════════════════════════════╝

  [1]  🔍  Kiểm Tra Hệ Thống Toàn Diện
  [2]  📺  Xem Nhật Ký Lỗi & Upload Ảnh Live (Realtime Monitor)
  [3]  📦  Di Chuyển Ảnh Cũ Sang Cloudinary (DB Migration)
  [4]  ⚡  Kiểm Tra Tốc Độ Tải API (Speed Test)
  [5]  🚀  Triển Khai Phiên Bản Mới (Deploy GitHub/Vercel)
  [0]  ❌  Thoát
```

Nhập số tương ứng rồi nhấn **Enter** để chọn chức năng.

---

### 2️⃣ `KiemTraHeThong.bat` — Kiểm Tra Sức Khỏe Toàn Hệ Thống

**Mục đích:** Chạy một lần để kiểm tra toàn bộ hệ thống có hoạt động đúng không.

**Kiểm tra những gì:**
| Hạng Mục | Mô Tả |
|---|---|
| ✅ Cấu trúc mã nguồn Frontend | Kiểm tra `package.json`, `node_modules`, `vite.config.ts` |
| ✅ Cấu trúc Backend | Kiểm tra `backend/package.json`, `.env`, `schema.prisma` |
| ✅ Kết nối Database | Thử kết nối thực tế đến Neon Postgres, đếm số sản phẩm |
| ✅ Build Production | Biên dịch toàn bộ mã nguồn, phát hiện lỗi TypeScript |

**Khi nào dùng:**
- Trước khi chạy quảng cáo lớn để chắc chắn hệ thống ổn định.
- Khi nghi ngờ có lỗi nhưng không biết lỗi ở đâu.
- Sau khi thêm tính năng mới để xác nhận không có lỗi.

**Kết quả mong đợi:**
```
🎉  CHẨN ĐOÁN: HỆ THỐNG HOÀN TOÀN KHỎE MẠNH & SẴN SÀNG! 🎉
```

---

### 3️⃣ `XemLog.bat` — Theo Dõi Lỗi Thực Tế (Live Monitor)

**Mục đích:** Mở một màn hình Terminal theo dõi liên tục, tự động cập nhật mỗi 5 giây.

**Hiển thị những gì:**

**► TRẠNG THÁI HỆ THỐNG** — Kiểm tra từng API có phản hồi không và tốc độ bao nhiêu ms:
```
  ✅ Backend API (Vercel)   → HTTP 200 | 665ms
  ✅ Products API           → HTTP 200 | 320ms
  ✅ Orders API             → HTTP 200 | 410ms
  ✅ Members API            → HTTP 200 | 290ms
```

**► NHẬT KÝ LỖI** — Khi có lỗi từ khách hàng sẽ hiển thị:
```
  🔴 ERROR    [FRONTEND]  23:15:42 24/5/2026
     TypeError: Cannot read properties of undefined (reading 'id')
     📍 URL: https://madmad.vercel.app/checkout
     📱 Thiết bị: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0...)
```

**► THỐNG KÊ ĐƠN HÀNG NHANH:**
```
  📦 Tổng đơn hàng:   17
  🕐 Chờ xác nhận:    4
  ⚙️  Đang xử lý:      8
  🚚 Đang giao:        1
  ✅ Hoàn thành:       3
  ❌ Đã hủy:           1
```

**Cách dùng:**
- Click đúp vào `XemLog.bat` hoặc chọn **[2]** trong `checktong.bat`.
- Terminal sẽ tự cập nhật **mỗi 5 giây** mà không cần làm gì.
- Nhấn **Ctrl+C** để dừng.

**Lưu ý:** Công cụ này hoàn toàn **độc lập với web**. Dù website hay Admin Panel có bị sập, bạn vẫn chạy được file này bình thường.

---

### 3️⃣ Di Chuyển Ảnh Cũ Sang Cloudinary (DB Migration)

**Mục đích:** Chuyển đổi toàn bộ ảnh dạng chuỗi Base64 dài dòng trong database thành link Cloudinary CDN ngắn gọn để tăng tốc hệ thống.

**Khi nào dùng:**
- Khi bạn vừa cấu hình tài khoản Cloudinary lần đầu tiên.
- Khi database có dữ liệu cũ chứa ảnh chưa tối ưu hóa.

---

### 4️⃣ Kiểm Tra Tốc Độ Tải API (Speed Test)

**Mục đích:** Đo tốc độ tải thực tế và kích thước phản hồi của API sản phẩm (`/api/products`).

**Kết quả mong đợi:**
- Dung lượng API giảm từ **~2.75 MB xuống 9.3 KB** (giảm 99.7%).
- Tốc độ tải giảm từ **~3-5 giây xuống ~100-500ms** (nhanh hơn gấp nhiều lần).

---

### 5️⃣ Triển Khai Phiên Bản Mới (Deploy GitHub/Vercel)

**Mục đích:** Đẩy các thay đổi mã nguồn mới nhất lên GitHub để Vercel tự động build lại website.

**Cách dùng:** Chọn **[5]** trong `checktong.bat`. 

---

## ❓ CÁC TÌNH HUỐNG THƯỜNG GẶP

| Tình Huống | Nên Dùng Chọn Số Mấy Trong `checktong.bat` |
|---|---|
| Muốn kiểm tra nhanh hệ thống có ổn không | **[1]** Kiểm Tra Hệ Thống Toàn Diện |
| Khách hàng báo lỗi, muốn biết lỗi gì / Theo dõi upload ảnh | **[2]** Xem Nhật Ký Lỗi & Upload Ảnh Live |
| Cấu hình Cloudinary xong, cần tối ưu ảnh cũ trong DB | **[3]** Di Chuyển Ảnh Cũ Sang Cloudinary |
| Muốn đo xem API tải nhanh hơn bao nhiêu sau tối ưu | **[4]** Kiểm Tra Tốc Độ Tải API |
| Vừa sửa lỗi hoặc thêm tính năng mới, muốn cập nhật web | **[5]** Triển Khai Phiên Bản Mới |
| Muốn làm tất cả mọi thứ từ 1 chỗ | Chạy file `checktong.bat` ← **DÙNG CÁI NÀY** |

---

## ⚠️ LƯU Ý QUAN TRỌNG

> [!WARNING]
> Không xóa các file `.cjs` đi kèm:
> - `check-system.cjs` — Engine của `KiemTraHeThong.bat`
> - `xem-log.cjs` — Engine của `XemLog.bat`
>
> Nếu xóa các file này, các file `.bat` tương ứng sẽ không hoạt động.

> [!NOTE]
> **Yêu cầu máy tính phải có kết nối Internet** khi chạy `XemLog.bat` và `deploy.bat` vì cần kết nối đến Server thực tế trên Cloud.

---

*MADMAD STUDIO — Hệ thống được xây dựng và vận hành bởi Antigravity AI*
