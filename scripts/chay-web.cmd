@echo off
chcp 65001 >nul
REM Mo API (cong 3000) va web (cong 5173) trong 2 cua so rieng. Dong cua so de tat.
set ROOT=%~dp0..
start "Job Portal - API" cmd /k "cd /d %ROOT%\api && npm run start:dev"
start "Job Portal - Web" cmd /k "cd /d %ROOT%\web && npm run dev"
echo Dang khoi dong... doi khoang 20 giay roi mo http://localhost:5173
timeout /t 5 >nul
