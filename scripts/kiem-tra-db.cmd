@echo off
chcp 65001 >nul
REM Chan doan loi ket noi SQL Server, ghi ket qua ra scripts\kiem-tra-db.txt
set "ROOT=%~dp0.."
set "OUT=%~dp0kiem-tra-db.txt"
for /f "tokens=1,* delims==" %%a in ('findstr /B "DB_PASSWORD=" "%ROOT%\api\.env"') do set "DBPASS=%%b"
echo === 1. Tien trinh dang giu cong 1433 === > "%OUT%"
netstat -ano | findstr ":1433" | findstr LISTENING >> "%OUT%" 2>&1
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":1433" ^| findstr LISTENING') do tasklist /FI "PID eq %%p" /NH >> "%OUT%" 2>&1
echo. >> "%OUT%"
echo === 2. Dich vu SQL Server tren Windows === >> "%OUT%"
sc query state= all | findstr /I "SERVICE_NAME.*SQL" >> "%OUT%" 2>&1
for /f "tokens=2" %%s in ('sc query state^= all ^| findstr /I "SERVICE_NAME: MSSQL"') do (
  echo %%s >> "%OUT%"
  sc query %%s | findstr STATE >> "%OUT%" 2>&1
)
echo. >> "%OUT%"
echo === 3. Container Docker === >> "%OUT%"
docker ps -a --format "{{.Names}} / {{.Status}} / {{.Ports}}" >> "%OUT%" 2>&1
echo. >> "%OUT%"
echo === 4. Dang nhap sa trong container bang mat khau cua api.env === >> "%OUT%"
docker exec jobportal-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "%DBPASS%" -C -h -1 -Q "SET NOCOUNT ON; SELECT name FROM sys.databases" >> "%OUT%" 2>&1
echo. >> "%OUT%"
echo === 5. Log container - 30 dong cuoi === >> "%OUT%"
docker logs --tail 30 jobportal-sqlserver >> "%OUT%" 2>&1
echo Xong. Ket qua da ghi vao scripts\kiem-tra-db.txt
pause
