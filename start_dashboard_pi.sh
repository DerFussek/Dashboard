#!/bin/bash
# Startet den Node.js Server und oeffnet das Dashboard im Chromium Browser im Vollbild

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

npm start &
SERVER_PID=$!

# kurze Wartezeit, damit der Server hochfahren kann
sleep 5

# Dashboard im Vollbildmodus oeffnen
if command -v chromium-browser > /dev/null; then
  chromium-browser --kiosk http://localhost:3000/dashboard.html &
elif command -v chromium > /dev/null; then
  chromium --kiosk http://localhost:3000/dashboard.html &
else
  xdg-open http://localhost:3000/dashboard.html &
fi

wait $SERVER_PID
