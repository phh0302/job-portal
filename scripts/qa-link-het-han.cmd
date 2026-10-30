@echo off
chcp 65001 >nul
REM CHI DUNG CHO MOI TRUONG DEV/QA: lam het han link xac minh email chua dung cua qa.ntd12@test.local
REM (gia lap link qua 24 gio) va lay link do tu email_outbox. Ghi ket qua ra scripts\qa-link-het-han.txt
set "ROOT=%~dp0.."
set "OUT=%~dp0qa-link-het-han.txt"
for /f "tokens=1,* delims==" %%a in ('findstr /B "DB_PASSWORD=" "%ROOT%\api\.env"') do set "DBPASS=%%b"
docker exec jobportal-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "%DBPASS%" -C -d job_portal -y 0 -Q "SET NOCOUNT ON; UPDATE user_tokens SET expires_at = DATEADD(hour, -1, GETDATE()) WHERE type = 'VERIFY_EMAIL' AND used_at IS NULL AND user_id = (SELECT id FROM users WHERE email = 'qa.ntd12@test.local'); SELECT @@ROWCOUNT AS so_token_het_han; SELECT TOP 1 html FROM email_outbox WHERE to_email = 'qa.ntd12@test.local' AND subject LIKE N'%%minh email%%' ORDER BY id DESC" > "%OUT%" 2>&1
echo Xong. Ket qua: scripts\qa-link-het-han.txt
pause
