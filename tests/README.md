# Tests
`npm test` (= `python3 tests/run.py`) baut das Spiel, startet einen Server und führt alle `test_*.py` aus – Exit-Code 0
nur, wenn alles grün ist. Einzelne Tests: `python3 tests/run.py <name> [--no-build]`.

- `lib/harness.py` – Test-Bibliothek (Schritt-Modus, Checks, Fehlerkanäle); Doku im Modulkopf.
- `test_*.py` – automatische Tests mit Asserts gegen `game/test.html` (three-Stub, kein Rendering).
- `manual/` – Screenshots, Handy-Speicher, Ladeprofil; ohne Asserts, Ergebnis selbst ansehen. Server auf Port 8765 nötig.

Voraussetzung: `.venv` mit Playwright (siehe CLAUDE.md, Abschnitt Testen). Ausgaben landen in `tests/out/` (nicht versioniert).
