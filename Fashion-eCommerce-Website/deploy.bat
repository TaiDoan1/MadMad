@echo off
chcp 65001 > nul
title Triển khai mã nguồn (Deploy) lên Server
echo =======================================================
echo          MADMAD STUDIO - DEPLOYMENT SCRIPT
echo =======================================================
echo.
echo Đang tự động thêm các thay đổi vào Git...
git add .

echo.
echo Đang ghi nhận các thay đổi (Commit)...
git commit -m "Auto deploy update from deploy.bat"

echo.
echo Đang đẩy mã nguồn lên GitHub (Push) để tự động Deploy...
git push

echo.
echo =======================================================
echo Hoàn tất! Mã nguồn đã được đẩy lên Server thành công.
echo Nếu dự án được liên kết với Vercel/Render, website sẽ 
echo được tự động cập nhật trong 1-2 phút tới.
echo =======================================================
pause
