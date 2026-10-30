@echo off
chcp 65001 >nul
REM CHI DUNG CHO MOI TRUONG DEV/QA – TC-SEC-013: build API, chay thu ban production o cong 3011 trong ~20 giay,
REM kiem tra /api/docs khong truy cap duoc (va /api/health van chay), roi tat. Khong dung toi API dev dang chay o cong 3000.
REM Ghi ket qua ra scripts\qa-prod-swagger.txt
set "ROOT=%~dp0.."
set "OUT=%~dp0qa-prod-swagger.txt"
pushd "%ROOT%\api"
echo ===== build ===== > "%OUT%"
call npm run build >> "%OUT%" 2>&1
echo EXIT_BUILD=%ERRORLEVEL% >> "%OUT%"
set "NODE_ENV=production"
set "PORT=3011"
set "JOB_ALERTS_ENABLED=false"
set "LOG_REQUESTS=false"
REM Ban production tu choi khoa JWT mac dinh cua .env dev -> dung khoa ngau nhien chi cho lan chay thu nay
for /f %%k in ('powershell -NoProfile -Command "[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')"') do set "JWT_ACCESS_SECRET=%%k"
start "qa-prod-api" /b cmd /c "node dist\main.js > "%~dp0qa-prod-api.log" 2>&1"
timeout /t 25 /nobreak >nul
echo ===== HTTP status ===== >> "%OUT%"
for %%U in (/api/docs /api/docs-json /api/health) do (
  for /f %%c in ('curl -s -o nul -w "%%{http_code}" "http://localhost:3011%%U"') do echo %%U = %%c >> "%OUT%"
)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3011" ^| findstr "LISTENING"') do taskkill /PID %%p /F >> "%OUT%" 2>&1
popd
echo ===== log API production (30 dong cuoi) ===== >> "%OUT%"
powershell -NoProfile -Command "Get-Content '%~dp0qa-prod-api.log' -Tail 30" >> "%OUT%" 2>&1
del "%~dp0qa-prod-api.log" >nul 2>&1
echo Xong. Ket qua: scripts\qa-prod-swagger.txt
pause
