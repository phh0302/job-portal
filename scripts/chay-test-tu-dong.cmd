@echo off
chcp 65001 >nul
REM Chay unit test + E2E (API) va lint + build (web), ghi ket qua ra scripts\test-tu-dong.txt
REM E2E dung DB rieng job_portal_e2e (xoa va tao lai moi lan chay), khong dung du lieu demo
set "ROOT=%~dp0.."
set "OUT=%~dp0test-tu-dong.txt"
echo ===== API unit test ===== > "%OUT%"
pushd "%ROOT%\api"
call npm test -- --silent >> "%OUT%" 2>&1
echo EXIT_UNIT=%ERRORLEVEL% >> "%OUT%"
echo ===== API E2E ===== >> "%OUT%"
call npm run test:e2e -- --silent >> "%OUT%" 2>&1
echo EXIT_E2E=%ERRORLEVEL% >> "%OUT%"
popd
pushd "%ROOT%\web"
echo ===== WEB lint ===== >> "%OUT%"
call npm run lint >> "%OUT%" 2>&1
echo EXIT_LINT=%ERRORLEVEL% >> "%OUT%"
echo ===== WEB build ===== >> "%OUT%"
call npm run build >> "%OUT%" 2>&1
echo EXIT_BUILD=%ERRORLEVEL% >> "%OUT%"
popd
echo Xong. Ket qua: scripts\test-tu-dong.txt
pause
