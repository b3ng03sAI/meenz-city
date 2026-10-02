# Tests
Voraussetzungen: `pip install playwright` (+ `playwright install chromium`, oder `CHROME=/pfad/zu/chromium` setzen),
`npm install` im Repo-Wurzelverzeichnis (für `real.html`) und ein Webserver im Repo-Wurzelverzeichnis:
`python3 -m http.server 8765`. Vorher `cd game && python3 build.py`.

Stub-Tests (schnell): all, ven, hbf, rh, ft, egg, nods, new5. Render-Tests/Screenshots (SwiftShader, langsam): shot3, shot4, fly, mob9.
Ausgaben landen in `tests/out/`.
