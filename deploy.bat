@echo off
cls
echo ==========================================================
echo           MADMAD STUDIO - AUTOMATED PIPELINE
echo ==========================================================
echo.
echo [1/3] Kiem tra va Bien dich (Build) Frontend local...
cd .\Fashion-eCommerce-Website
call npm.cmd run build
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Build Frontend bi loi! Vui long kiem tra code truoc khi deploy.
    cd ..
    pause
    exit /b %errorlevel%
)
cd ..
echo.
echo [OK] Frontend bien dich thanh cong! Khong co loi code!
echo.
echo ----------------------------------------------------------
echo [2/3] Dong bo ma nguon len GitHub...
git add .
git commit -m "sync: production automated 1-click update"
git push origin main
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Khong the day code len GitHub! Vui long kiem tra ket noi.
    pause
    exit /b %errorlevel%
)
echo.
echo ----------------------------------------------------------
echo [3/3] Kich hoat Vercel Cloud deploy tu dong...
echo.
echo [OK] Code da duoc day len GitHub!
echo Vercel dang tu dong deploy song hanh ca 2 du an:
echo  1. Backend:  https://madmad-backend.vercel.app
echo  2. Frontend: https://www.madmadstudio.com
echo.
echo Ban co the theo doi tien trinh build truc tiep tren:
echo  - https://vercel.com/taidoan1s-projects
echo.
echo ==========================================================
echo           HE THONG DANG TU DONG BUILD ON-LINE!
echo ==========================================================
