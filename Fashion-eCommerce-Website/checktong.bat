@echo off
chcp 65001 > nul
title MADMAD STUDIO - Trung Tam Dieu Khien

:MENU
cls
echo.
echo  =============================================================
echo         MADMAD STUDIO - TRUNG TAM DIEU KHIEN
echo  =============================================================
echo.
echo   [1]  Kiem Tra He Thong Toan Dien
echo         Kiem tra DB, Backend, Frontend, Build code
echo.
echo   [2]  Xem Log Loi Thuc Te (Live Monitor)
echo         Theo doi loi khach hang va trang thai server
echo.
echo   [3]  Trien Khai Phien Ban Moi (Deploy)
echo         Day code moi len GitHub, Vercel tu dong build
echo.
echo   [0]  Thoat
echo.
echo  =============================================================
echo.
set /p CHOICE=  Chon chuc nang (nhap so roi nhan Enter): 

if "%CHOICE%"=="1" goto KIEM_TRA
if "%CHOICE%"=="2" goto XEM_LOG
if "%CHOICE%"=="3" goto DEPLOY
if "%CHOICE%"=="0" goto THOAT

echo.
echo  Lua chon khong hop le. Vui long nhap 0, 1, 2 hoac 3.
pause
goto MENU

:KIEM_TRA
cls
echo.
echo  [1] Dang chay Kiem Tra He Thong...
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

:DEPLOY
cls
echo.
echo  [3] Dang trien khai len Server...
echo.
git add .
echo.
git commit -m "Auto deploy update"
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
