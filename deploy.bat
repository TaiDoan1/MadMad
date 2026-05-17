@echo off
cls
echo ==========================================================
echo           MADMAD STUDIO - AUTOMATED DEPLOYMENT
echo ==========================================================
echo.
echo [1/3] Dong bo ma nguon len GitHub...
git add .
git commit -m "sync: production automated 1-click update"
git push origin main
echo.
echo ----------------------------------------------------------
echo [2/3] Dang deploy Backend len Vercel...
call npx.cmd vercel --prod .\Fashion-eCommerce-Website\backend
echo.
echo ----------------------------------------------------------
echo [3/3] Dang deploy Frontend len Vercel...
call npx.cmd vercel --prod
echo.
echo ==========================================================
echo      CONGRATULATIONS! DEPLOYMENT COMPLETED SUCCESSFULLY!
echo ==========================================================
echo  - Frontend URL: https://www.madmadstudio.com
echo  - Backend URL:  https://madmad-backend.vercel.app
echo ==========================================================
