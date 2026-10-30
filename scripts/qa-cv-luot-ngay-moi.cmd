@echo off
chcp 65001 >nul
REM CHI DUNG CHO MOI TRUONG DEV/QA: doi cac luot "Kiem tra CV voi JD" hom nay cua uv2@demo.local ve hom qua
REM de test TC-CAN19-013 (luot duoc tinh lai sang ngay moi). Ghi ket qua ra scripts\qa-cv-luot.txt
set "ROOT=%~dp0.."
set "OUT=%~dp0qa-cv-luot.txt"
for /f "tokens=1,* delims==" %%a in ('findstr /B "DB_PASSWORD=" "%ROOT%\api\.env"') do set "DBPASS=%%b"
docker exec jobportal-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "%DBPASS%" -C -d job_portal -Q "SET NOCOUNT ON; UPDATE c SET created_at = DATEADD(day,-1,c.created_at) FROM cv_job_checks c JOIN candidate_profiles p ON p.id = c.candidate_id JOIN users u ON u.id = p.user_id WHERE u.email = 'uv2@demo.local' AND c.created_at >= CAST(GETDATE() AS date); SELECT @@ROWCOUNT AS so_dong_da_doi" > "%OUT%" 2>&1
echo Xong. Ket qua: scripts\qa-cv-luot.txt
pause
