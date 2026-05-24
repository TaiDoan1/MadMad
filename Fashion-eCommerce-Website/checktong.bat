@echo off
chcp 65001 > nul
title MADMAD STUDIO - Trung Tam Control Panel

:MENU
cls
echo.
echo  =============================================================
echo         MADMAD STUDIO - TRUNG TÂM ĐIỀU KHIỂN & GIÁM SÁT
echo  =============================================================
echo.
echo   [1]  Kiểm Tra Hệ Thống Toàn Diện
echo         Kịch bản chẩn đoán DB, Backend, Frontend, Vite Build
echo.
echo   [2]  Xem Nhật Ký Lỗi & Upload Ảnh Live (Realtime Monitor)
echo         Theo dõi lỗi người dùng và trạng thái upload Cloudinary
echo.
echo   [3]  Di Chuyển Ảnh Cũ Sang Cloudinary (DB Migration)
echo         Tìm ảnh Base64 cũ trong PostgreSQL và chuyển thành link CDN
echo.
echo   [4]  Kiểm Tra Tốc Độ Tải API (Speed Test)
echo         Đo tốc độ tải thực tế và dung lượng phản hồi của API
echo.
echo   [5]  Triển Khai Phiên Bản Mới (Deploy GitHub/Vercel)
echo         Đẩy toàn bộ thay đổi lên GitHub để Vercel tự động build
echo.
echo   [0]  Thoát
echo.
echo  =============================================================
echo.
set /p CHOICE=  Chọn chức năng (nhập số rồi nhấn Enter): 

if "%CHOICE%"=="1" goto KIEM_TRA
if "%CHOICE%"=="2" goto XEM_LOG
if "%CHOICE%"=="3" goto MIGRATION
if "%CHOICE%"=="4" goto SPEED_TEST
if "%CHOICE%"=="5" goto DEPLOY
if "%CHOICE%"=="0" goto THOAT

echo.
echo  Lựa chọn không hợp lệ. Vui lòng nhập số từ 0 đến 5.
pause
goto MENU

:KIEM_TRA
cls
echo.
echo  [1] Đang chạy kiểm tra hệ thống toàn diện...
echo.
node check-system.cjs
echo.
echo  Xong! Nhấn phím bất kỳ để quay lại menu...
pause > nul
goto MENU

:XEM_LOG
cls
echo.
echo  [2] Đang khởi động Live Log Monitor...
echo  Nhấn Ctrl+C để dừng và quay lại menu.
echo.
node xem-log.cjs
echo.
pause > nul
goto MENU

:MIGRATION
cls
echo.
echo  [3] Đang chạy di chuyển ảnh cũ sang Cloudinary...
echo.
cd backend && node migrate-to-cloudinary.cjs && cd ..
echo.
echo  Hoàn tất di chuyển database! Nhấn phím bất kỳ để quay lại menu...
pause > nul
goto MENU

:SPEED_TEST
cls
echo.
echo  [4] Đang đo tốc độ phản hồi và dung lượng API...
echo.
node scratch-check-api.cjs
echo.
echo  Xong! Nhấn phím bất kỳ để quay lại menu...
pause > nul
goto MENU

:DEPLOY
cls
echo.
echo  [5] Đang tiến hành deploy mã nguồn mới...
echo.
git add .
echo.
git commit -m "Auto deploy update from Control Panel"
echo.
git push
echo.
echo  Hoàn tất! Mã nguồn đã được đẩy lên Server thành công.
echo  Website sẽ tự động cập nhật trong 1-2 phút.
echo.
echo  Nhấn phím bất kỳ để quay lại menu...
pause > nul
goto MENU

:THOAT
echo.
echo  Tạm biệt! Chúc bạn kinh doanh thuận lợi!
echo.
timeout /t 2 > nul
exit
