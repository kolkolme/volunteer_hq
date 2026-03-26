@echo off
echo Starting Volunteer HQ...

start "Django Backend" cmd /k "cd /d c:\Users\itrot\Desktop\volunteer_hq && .venv\Scripts\python.exe manage.py runserver 0.0.0.0:8000"
timeout /t 2 /nobreak >nul
start "Vite Frontend" cmd /k "cd /d c:\Users\itrot\Desktop\volunteer_hq\frontend && npm run dev"

echo.
echo Servers started!
echo Frontend: http://localhost:5173
echo Network:  open the Vite window to see the LAN address
echo.
pause
