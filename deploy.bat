@echo off
cls
echo ==========================================================
echo           MADMAD STUDIO - AUTOMATED DEPLOYMENT
echo ==========================================================
echo.
echo [1/2] Dong bo ma nguon len GitHub...
git add .
git commit -m "sync: production automated 1-click update"
git push origin main
echo.
echo ----------------------------------------------------------
echo [2/2] Kich hoat Vercel Cloud deploy tu dong...
echo.
echo [OK] Code da duoc day len GitHub!
echo Vercel dang tu dong deploy song hanh ca 2 du an:
echo  1. Backend:  https://madmad-backend.vercel.app
echo  2. Frontend: https://www.madmadstudio.com
echo.
echo Bạn co the theo doi tien trinh build truc tiep tren:
echo  - https://vercel.com/taidoan1s-projects
echo.
echo ==========================================================
echo           HE THONG DANG TU DONG BUILD ON-LINE!
echo ==========================================================
