@echo off
chcp 65001 >nul
REM Kiem tra CORS cua API (chi doc): goi API voi Origin la va Origin hop le, ghi header tra ve ra scripts\cors-ket-qua.txt
set "OUT=%~dp0cors-ket-qua.txt"
echo === Origin la: https://evil.example === > "%OUT%"
curl.exe -s -D - -o NUL -H "Origin: https://evil.example" "http://localhost:3000/api/jobs?limit=1" >> "%OUT%" 2>&1
echo. >> "%OUT%"
echo === Preflight tu origin la === >> "%OUT%"
curl.exe -s -D - -o NUL -X OPTIONS -H "Origin: https://evil.example" -H "Access-Control-Request-Method: POST" -H "Access-Control-Request-Headers: content-type" "http://localhost:3000/api/auth/login" >> "%OUT%" 2>&1
echo. >> "%OUT%"
echo === Origin hop le: http://localhost:5173 === >> "%OUT%"
curl.exe -s -D - -o NUL -H "Origin: http://localhost:5173" "http://localhost:3000/api/jobs?limit=1" >> "%OUT%" 2>&1
echo Xong. Ket qua: scripts\cors-ket-qua.txt
pause
