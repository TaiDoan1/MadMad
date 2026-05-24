@echo off
chcp 65001 > nul
title MADMAD STUDIO - Live Log Monitor
echo.
echo  Đang khởi động Live Log Monitor...
echo  Nhấn Ctrl+C để dừng.
echo.
node xem-log.cjs
pause
