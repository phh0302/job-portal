@echo off
chcp 65001 >nul
REM CHI DUNG CHO MOI TRUONG DEV/QA – chuan bi du lieu cho P2 luot 2 (Nha tuyen dung). Ghi ket qua ra scripts\qa-p2-ntd.txt
REM  1. Loi moi qa.expire@test.local het han (TC-EMP11-009)
REM  2. Them loi moi gia qa.pendNN@test.local cho cong ty #1 den du 20 loi moi dang cho (TC-EMP11-008)
REM  3. Goi dich vu cong ty cua qa.ntd01 het han tu hom qua (TC-EMP14-012)
REM  4. Don #2005 tao 91 ngay truoc (TC-EMP15-003); don #2006 tao 4 ngay truoc, xoa moc nhac (TC-EMP15-004)
set "ROOT=%~dp0.."
set "OUT=%~dp0qa-p2-ntd.txt"
for /f "tokens=1,* delims==" %%a in ('findstr /B "DB_PASSWORD=" "%ROOT%\api\.env"') do set "DBPASS=%%b"
docker exec jobportal-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "%DBPASS%" -C -d job_portal -Q "SET NOCOUNT ON; UPDATE company_invitations SET expires_at = DATEADD(hour,-1,GETDATE()) WHERE email = 'qa.expire@test.local' AND accepted_at IS NULL AND revoked_at IS NULL; DECLARE @need int = 20 - (SELECT COUNT(*) FROM company_invitations WHERE company_id = 1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > GETDATE()); ;WITH n AS (SELECT TOP (CASE WHEN @need > 0 THEN @need ELSE 0 END) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS i FROM sys.objects) INSERT INTO company_invitations (company_id, email, role, token_hash, invited_by_id, expires_at, created_at) SELECT 1, CONCAT('qa.pend', RIGHT('0' + CAST(i AS varchar(3)), 2), '@test.local'), 'MEMBER', LOWER(CONVERT(char(64), HASHBYTES('SHA2_256', CONCAT('qa-pend-', i, '-', NEWID())), 2)), 2, DATEADD(day, 7, GETDATE()), GETDATE() FROM n; UPDATE c SET plan_expires_at = DATEADD(day,-1,GETDATE()) FROM companies c JOIN employer_profiles p ON p.company_id = c.id JOIN users u ON u.id = p.user_id WHERE u.email = 'qa.ntd01@test.local'; UPDATE applications SET created_at = DATEADD(day,-91,GETDATE()), responded_at = DATEADD(day,-90,GETDATE()) WHERE id = 2005; UPDATE applications SET created_at = DATEADD(day,-4,GETDATE()) WHERE id = 2006; UPDATE companies SET response_reminded_at = NULL WHERE id = 1; SELECT (SELECT COUNT(*) FROM company_invitations WHERE company_id = 1 AND accepted_at IS NULL AND revoked_at IS NULL AND expires_at > GETDATE()) AS loi_moi_dang_cho, (SELECT expires_at FROM company_invitations WHERE email = 'qa.expire@test.local' AND revoked_at IS NULL) AS het_han_qa_expire; SELECT id, status, created_at, responded_at FROM applications WHERE id IN (2005, 2006)" > "%OUT%" 2>&1
echo Xong. Ket qua: scripts\qa-p2-ntd.txt
pause
