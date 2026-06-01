@echo off
echo Starting Ruki Backend...
call backend\venv\Scripts\activate.bat
python -m uvicorn backend.main:app --reload --port 8000
