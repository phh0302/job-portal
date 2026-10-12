@echo off
chcp 65001 >nul
REM Cap nhat sau moi lan them tinh nang: cai thu vien moi, tao + chay migration, seed du lieu
set ROOT=%~dp0..

echo === 1/4 Cai thu vien moi cho web (pdfmake - tao CV PDF) ===
cd /d "%ROOT%\web"
call npm install
if errorlevel 1 goto :loi

cd /d "%ROOT%\api"
echo.
echo === 2/4 Tao migration tu thay doi trong entity ===
call npm run migration:generate --name=SchemaUpdate > "%TEMP%\jp-migration.txt" 2>&1
type "%TEMP%\jp-migration.txt"
findstr /C:"No changes in database schema" "%TEMP%\jp-migration.txt" >nul && echo (Khong co thay doi moi - bo qua buoc nay) && goto :run
findstr /C:"has been generated successfully" "%TEMP%\jp-migration.txt" >nul && goto :run
echo.
echo KHONG TAO DUOC MIGRATION - xem loi o tren.
goto :loi

:run

echo.
echo === 3/4 Chay migration ===
call npm run migration:run
if errorlevel 1 goto :loi

echo.
echo === 4/4 Seed du lieu (goi dich vu, tai khoan demo) ===
call npm run seed
if errorlevel 1 goto :loi

echo.
echo HOAN TAT. Hay khoi dong lai "npm run dev".
pause
exit /b 0

:loi
echo.
echo CO LOI - hay chup man hinh cua so nay gui cho Claude.
pause
exit /b 1
