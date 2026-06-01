@echo off
echo ==========================================
echo  Ruki - Your AI Study Companion
echo  Development Launcher
echo ==========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH.
    echo Please install Python from https://python.org/
    pause
    exit /b 1
)

echo Starting Ruki Backend...
start "Ruki Backend" cmd /k "cd backend && python -m uvicorn main:app --reload --port 8000"

echo Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo Starting Ruki Frontend...
start "Ruki Frontend" cmd /k "npm run electron:dev"

echo.
echo Ruki is starting up!
echo - Backend: http://localhost:8000
echo - Frontend: Electron window will appear shortly
echo.
pause
