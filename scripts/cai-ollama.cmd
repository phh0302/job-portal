@echo off
chcp 65001 >nul
REM Cai AI chay tren may (Ollama) cho JobPortal – khong can ANTHROPIC_API_KEY.
REM  1. Cai Ollama (neu chua co) bang winget
REM  2. Tai mo hinh (mac dinh qwen2.5:7b ~4.7GB; may yeu: chay "cai-ollama.cmd qwen2.5:3b")
REM  3. Them AI_PROVIDER=ollama va OLLAMA_MODEL vao api\.env (neu chua co)
REM Sau do khoi dong lai API.
set "ROOT=%~dp0.."
set "MODEL=%~1"
if "%MODEL%"=="" set "MODEL=qwen2.5:7b"

where ollama >nul 2>&1
if errorlevel 1 (
  echo [1/3] Chua co Ollama - dang cai bang winget...
  winget install -e --id Ollama.Ollama --accept-source-agreements --accept-package-agreements
  if errorlevel 1 (
    echo Khong cai duoc tu dong. Tai thu cong tai https://ollama.com/download roi chay lai script nay.
    pause
    exit /b 1
  )
  echo Da cai Ollama. Neu lenh "ollama" chua nhan, hay dong cua so nay va chay lai script.
  set "PATH=%PATH%;%LOCALAPPDATA%\Programs\Ollama"
) else (
  echo [1/3] Da co Ollama.
)

echo [2/3] Tai mo hinh %MODEL% (lan dau mat vai phut)...
ollama pull %MODEL%
if errorlevel 1 (
  echo Tai mo hinh that bai. Kiem tra ung dung Ollama dang chay ^(bieu tuong o khay he thong^) roi chay lai.
  pause
  exit /b 1
)

echo [3/3] Cap nhat api\.env
findstr /B /C:"AI_PROVIDER=" "%ROOT%\api\.env" >nul 2>&1
if errorlevel 1 (
  >>"%ROOT%\api\.env" echo.
  >>"%ROOT%\api\.env" echo # AI chay tren may bang Ollama ^(them boi scripts\cai-ollama.cmd^)
  >>"%ROOT%\api\.env" echo AI_PROVIDER=ollama
  >>"%ROOT%\api\.env" echo OLLAMA_MODEL=%MODEL%
  echo Da them AI_PROVIDER=ollama, OLLAMA_MODEL=%MODEL%
) else (
  echo api\.env da co dong AI_PROVIDER - giu nguyen. Muon dung Ollama thi sua thanh AI_PROVIDER=ollama va OLLAMA_MODEL=%MODEL%
)

echo.
echo Thu nhanh mo hinh:
ollama run %MODEL% "Tra loi 1 cau bang tieng Viet: ban la ai?"
echo.
echo Xong. Khoi dong lai API ^(Ctrl+C roi npm run start:dev^) de bat AI.
pause
