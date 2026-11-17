@echo off
REM ---------------------------------------------------------------
REM  Craveo - one-click launcher for Windows
REM  Creates a virtual environment, installs dependencies and runs.
REM ---------------------------------------------------------------
cd /d "%~dp0"

if not exist "venv" (
    echo [1/3] Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo.
        echo Python was not found. Install it from https://www.python.org/downloads/
        echo and tick "Add python.exe to PATH" during installation.
        pause
        exit /b 1
    )
)

echo [2/3] Installing dependencies...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip >nul
python -m pip install -r requirements.txt

echo [3/3] Starting Craveo...
echo.
echo   Open http://127.0.0.1:5000 in your browser.
echo   Press CTRL+C to stop the server.
echo.
python app.py
pause
