@echo off
REM Start MintWeb OS on http://localhost:8080 (Windows)
cd /d "%~dp0"
set PORT=8080
if not "%1"=="" set PORT=%1
echo MintWeb OS running at http://localhost:%PORT%  (close this window to stop)
start "" http://localhost:%PORT%
where py >nul 2>nul && (py -3 -m http.server %PORT% & goto :eof)
where python >nul 2>nul && (python -m http.server %PORT% & goto :eof)
where npx >nul 2>nul && (npx --yes serve -l %PORT% . & goto :eof)
echo Python or Node.js not found. Opening index.html directly instead.
start "" "%~dp0index.html"
pause
