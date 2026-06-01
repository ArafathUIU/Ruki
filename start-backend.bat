@echo off
echo Starting Ruki Backend...
cd backend
python -m uvicorn main:app --reload --port 8000
