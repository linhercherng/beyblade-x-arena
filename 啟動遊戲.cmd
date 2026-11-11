@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo 請先安裝 Node.js 22 或更新版本：https://nodejs.org/
  pause
  exit /b 1
)
if not exist node_modules (
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo 正在啟動極限陀螺競技場，瀏覽器將自動開啟。
echo 保留此視窗；按 Ctrl+C 可關閉遊戲伺服器。
call npm run dev -- --open
pause
