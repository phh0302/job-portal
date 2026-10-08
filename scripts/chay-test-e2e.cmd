@echo off
chcp 65001 >nul
REM Chay E2E test (dung database rieng job_portal_e2e, khong anh huong job_portal)
cd /d "%~dp0..\api"
echo Dang chay E2E test, vui long doi 1-2 phut...
call npm run test:e2e > "%~dp0e2e-ket-qua.txt" 2>&1
set RC=%errorlevel%
type "%~dp0e2e-ket-qua.txt"
echo.
if %RC%==0 (echo === E2E: TAT CA DEU QUA ===) else (echo === E2E: CO TEST LOI - ket qua luu o scripts\e2e-ket-qua.txt ===)
echo Hay bao Claude "da chay xong e2e" de Claude doc ket qua.
pause
