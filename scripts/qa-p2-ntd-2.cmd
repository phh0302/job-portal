@echo off
chcp 65001 >nul
REM CHI DUNG CHO MOI TRUONG DEV/QA – buoc 2 cua P2 luot 2. Ghi ket qua ra scripts\qa-p2-ntd.txt
REM  1. Loi moi qa.expire2@test.local het han (TC-EMP11-009)
REM  2. Tra ngay tao don #2005, #2006 ve hom nay (khoi phuc sau TC-EMP15-003/004)
set "ROOT=%~dp0.."
set "OUT=%~dp0qa-p2-ntd.txt"
for /f "tokens=1,* delims==" %%a in ('findstr /B "DB_PASSWORD=" "%ROOT%\api\.env"') do set "DBPASS=%%b"
docker exec jobportal-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "%DBPASS%" -C -d job_portal -Q "SET NOCOUNT ON; UPDATE company_invitations SET expires_at = DATEADD(hour,-1,GETDATE()) WHERE email = 'qa.expire2@test.local' AND accepted_at IS NULL AND revoked_at IS NULL; UPDATE applications SET created_at = DATEADD(hour,-3,GETDATE()), responded_at = DATEADD(hour,-2,GETDATE()) WHERE id = 2005; UPDATE applications SET created_at = DATEADD(hour,-3,GETDATE()) WHERE id = 2006; SELECT email, expires_at FROM company_invitations WHERE email = 'qa.expire2@test.local'; SELECT id, status, created_at, responded_at FROM applications WHERE id IN (2005, 2006)" > "%OUT%" 2>&1
echo Xong. Ket qua: scripts\qa-p2-ntd.txt
pause
