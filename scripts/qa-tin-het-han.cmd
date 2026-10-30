@echo off
chcp 65001 >nul
REM CHI DUNG CHO MOI TRUONG DEV/QA: dat han nop cua 2 tin QA (#1006 da dong, #2011 dang hien thi) ve hom qua
REM de test "mo lai tin qua han", "tu het han", "gia han tin het han". Ghi ket qua ra scripts\qa-tin-het-han.txt
set "ROOT=%~dp0.."
set "OUT=%~dp0qa-tin-het-han.txt"
for /f "tokens=1,* delims==" %%a in ('findstr /B "DB_PASSWORD=" "%ROOT%\api\.env"') do set "DBPASS=%%b"
docker exec jobportal-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "%DBPASS%" -C -d job_portal -Q "SET NOCOUNT ON; UPDATE jobs SET deadline = CAST(DATEADD(day,-1,GETDATE()) AS date) WHERE id IN (1006, 2011) AND title LIKE N'QA%%'; SELECT id, title, status, deadline FROM jobs WHERE id IN (1006, 2011)" > "%OUT%" 2>&1
echo Xong. Ket qua: scripts\qa-tin-het-han.txt
pause
