#!/usr/bin/env sh
# Start MintWeb OS on http://localhost:8080 (Linux / macOS)
cd "$(dirname "$0")"
PORT="${1:-8080}"
URL="http://localhost:$PORT"
echo "MintWeb OS running at $URL  (Ctrl+C to stop)"
( sleep 1; (xdg-open "$URL" || open "$URL") >/dev/null 2>&1 ) &
if command -v python3 >/dev/null 2>&1; then exec python3 -m http.server "$PORT"
elif command -v python >/dev/null 2>&1; then exec python -m http.server "$PORT"
elif command -v npx >/dev/null 2>&1; then exec npx --yes serve -l "$PORT" .
else echo "Please install Python 3 or Node.js, or just open index.html in your browser."; fi
