@echo off
cd /d "%~dp0"

if not exist node_modules (
  echo Installing dependencies...
  call npm install
)

echo Starting web app...
start "Purun Web App" cmd /k npm run dev

rem Give the dev server a few seconds, then open the browser.
timeout /t 6 /nobreak >nul
start "" http://localhost:3000
