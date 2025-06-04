@echo off
REM Startet den Node.js Server und oeffnet das Dashboard im Browser
cd /d %~dp0

REM Server in neuem Fenster starten
start "" cmd /c "npm start"

REM Kurze Wartezeit, damit der Server hochfahren kann
timeout /t 5 > nul

REM Dashboard im Vollbildmodus oeffnen (Edge oder Chrome)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --kiosk http://localhost:3000/dashboard.html
) else if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --start-fullscreen http://localhost:3000/dashboard.html
) else (
    start "" http://localhost:3000/dashboard.html
)
