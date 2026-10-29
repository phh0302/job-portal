@echo off
chcp 65001 >nul
REM Lay link xac minh / dat lai mat khau trong 10 email moi nhat (moi truong DEV), ghi ra scripts\email-links.txt
set "ROOT=%~dp0.."
set "OUT=%~dp0email-links.txt"
for /f "tokens=1,* delims==" %%a in ('findstr /B "DB_PASSWORD=" "%ROOT%\api\.env"') do set "DBPASS=%%b"
docker exec jobportal-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "%DBPASS%" -C -d job_portal -y 0 -Q "SET NOCOUNT ON; SELECT TOP 10 CONCAT(id, ' | ', to_email, ' | ', subject, ' | ', html) FROM email_outbox ORDER BY id DESC" > "%OUT%" 2>&1
echo Xong. Ket qua: scripts\email-links.txt
pause
