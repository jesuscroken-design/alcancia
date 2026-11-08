cd /d "%~dp0"
start "" http://localhost:4178
python -m http.server 4178
