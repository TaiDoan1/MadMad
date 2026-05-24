@echo off
title MADMAD STUDIO - Control Panel

:MENU
cls
echo.
echo  =============================================================
echo         MADMAD STUDIO - TRUNG TAM DIEU KHIEN
echo  =============================================================
echo.
echo   [1]  Kiem Tra He Thong Toan Dien
echo         Chan doan DB, Backend, Frontend, Vite Build
echo.
echo   [2]  Xem Log Loi va Upload Anh Live (Realtime Monitor)
echo         Theo doi loi nguoi dung va trang thai upload Cloudinary
echo.
echo   [3]  Di Chuyen Anh Cu Sang Cloudinary (DB Migration)
echo         Tim anh Base64 cu trong PostgreSQL va chuyen thanh CDN URL
echo.
echo   [4]  Kiem Tra Toc Do Tai API (Speed Test)
echo         Do toc do tai thuc te va dung luong phan hoi cua API
echo.
echo   [5]  Trien Khai Phien Ban Moi (Deploy GitHub/Vercel)
echo         Day toan bo thay doi len GitHub de Vercel tu dong build
echo.
echo   [0]  Thoat
echo.
echo  =============================================================
echo.
set /p CHOICE=  Chon chuc nang (nhap so roi nhan Enter): 

if "%CHOICE%"=="1" goto KIEM_TRA
if "%CHOICE%"=="2" goto XEM_LOG
if "%CHOICE%"=="3" goto MIGRATION
if "%CHOICE%"=="4" goto SPEED_TEST
if "%CHOICE%"=="5" goto DEPLOY
if "%CHOICE%"=="0" goto THOAT

echo.
echo  Lua chon khong hop le. Vui long nhap so tu 0 den 5.
pause
goto MENU

:KIEM_TRA
cls
echo.
echo  [1] Dang chay kiem tra he thong toan dien...
echo.
node check-system.cjs
echo.
echo  Xong! Nhan phim bat ky de quay lai menu...
pause > nul
goto MENU

:XEM_LOG
cls
echo.
echo  [2] Dang khoi dong Live Log Monitor...
echo  Nhan Ctrl+C de dung va quay lai menu.
echo.
node xem-log.cjs
echo.
pause > nul
goto MENU

:MIGRATION
cls
echo.
echo  [3] Dang chay di chuyen anh cu sang Cloudinary...
echo.
cd backend
node migrate-to-cloudinary.cjs
cd ..
echo.
echo  Hoan tat di chuyen database! Nhan phim bat ky de quay lai menu...
pause > nul
goto MENU

:SPEED_TEST
cls
echo.
echo  [4] Dang do toc do phan hoi va dung luong API...
echo.
node scratch-check-api.cjs
echo.
echo  Xong! Nhan phim bat ky de quay lai menu...
pause > nul
goto MENU

:DEPLOY
cls
echo.
echo  [5] Dang tien hanh deploy ma nguon moi...
echo.
git add .
echo.
git commit -m "Auto deploy update from Control Panel"
echo.
git push
echo.
echo  Hoan tat! Ma nguon da duoc day len Server thanh cong.
echo  Website se tu dong cap nhat trong 1-2 phut.
echo.
echo  Nhan phim bat ky de quay lai menu...
pause > nul
goto MENU

:THOAT
echo.
echo  Tam biet! Chuc ban kinh doanh thuan loi!
echo.
timeout /t 2 > nul
exit
