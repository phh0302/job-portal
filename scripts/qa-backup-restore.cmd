@echo off
chcp 65001 >nul
REM CHI DUNG CHO MOI TRUONG DEV/QA – TC-REL-003: sao luu DB trong container Docker, RESTORE VERIFYONLY,
REM khoi phuc sang DB tam job_portal_qa_restore, so sanh so dong cac bang chinh, roi xoa DB tam va file .bak.
REM Khong dung toi DB job_portal ngoai viec doc. Ghi ket qua ra scripts\qa-backup-restore.txt
set "ROOT=%~dp0.."
set "OUT=%~dp0qa-backup-restore.txt"
for /f "tokens=1,* delims==" %%a in ('findstr /B "DB_PASSWORD=" "%ROOT%\api\.env"') do set "DBPASS=%%b"
set "SQL=docker exec jobportal-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "%DBPASS%" -C -b"
echo ===== 1. BACKUP ===== > "%OUT%"
%SQL% -Q "BACKUP DATABASE [job_portal] TO DISK = N'/var/opt/mssql/data/qa_backup.bak' WITH INIT, CHECKSUM" >> "%OUT%" 2>&1
echo EXIT_BACKUP=%ERRORLEVEL% >> "%OUT%"
echo ===== 2. RESTORE VERIFYONLY ===== >> "%OUT%"
%SQL% -Q "RESTORE VERIFYONLY FROM DISK = N'/var/opt/mssql/data/qa_backup.bak' WITH CHECKSUM" >> "%OUT%" 2>&1
echo EXIT_VERIFY=%ERRORLEVEL% >> "%OUT%"
echo ===== 3. RESTORE sang job_portal_qa_restore ===== >> "%OUT%"
%SQL% -Q "DECLARE @d sysname, @l sysname; SELECT @d = name FROM sys.master_files WHERE database_id = DB_ID('job_portal') AND type = 0; SELECT @l = name FROM sys.master_files WHERE database_id = DB_ID('job_portal') AND type = 1; DECLARE @s nvarchar(max) = N'RESTORE DATABASE [job_portal_qa_restore] FROM DISK = N''/var/opt/mssql/data/qa_backup.bak'' WITH REPLACE, MOVE N''' + @d + N''' TO N''/var/opt/mssql/data/qa_restore.mdf'', MOVE N''' + @l + N''' TO N''/var/opt/mssql/data/qa_restore_log.ldf'''; EXEC (@s)" >> "%OUT%" 2>&1
echo EXIT_RESTORE=%ERRORLEVEL% >> "%OUT%"
echo ===== 4. So sanh so dong (goc / khoi phuc) ===== >> "%OUT%"
%SQL% -W -Q "SET NOCOUNT ON; SELECT t.name AS bang, (SELECT SUM(p.rows) FROM job_portal.sys.partitions p JOIN job_portal.sys.tables x ON x.object_id = p.object_id WHERE x.name = t.name AND p.index_id IN (0,1)) AS goc, (SELECT SUM(p.rows) FROM job_portal_qa_restore.sys.partitions p JOIN job_portal_qa_restore.sys.tables x ON x.object_id = p.object_id WHERE x.name = t.name AND p.index_id IN (0,1)) AS khoi_phuc FROM job_portal.sys.tables t WHERE t.name IN ('users','companies','jobs','applications','resumes','company_reviews','plan_orders','notifications','email_outbox','support_tickets') ORDER BY t.name" >> "%OUT%" 2>&1
echo ===== 5. Don dep ===== >> "%OUT%"
%SQL% -Q "ALTER DATABASE [job_portal_qa_restore] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [job_portal_qa_restore]" >> "%OUT%" 2>&1
docker exec -u root jobportal-sqlserver rm -f /var/opt/mssql/data/qa_backup.bak >> "%OUT%" 2>&1
echo EXIT_CLEANUP=%ERRORLEVEL% >> "%OUT%"
echo Xong. Ket qua: scripts\qa-backup-restore.txt
pause
