# GitHub Pages + installierbare Web-App (PWA)

Ziel (Nutzer, 2026-10-02): GitHub Pages als endgültiger Spiele-Link – Vollbild, Icon auf dem Startbildschirm,
offline spielbar, ohne App Store. Hintergrund: claude.ai-Artifacts erlauben kein Manifest/Service Worker.

## Umsetzung
- `site/` (Repo-Wurzel): Rahmen nur für Pages, unabhängig vom Spielcode.
  - `build_site.py`: nimmt `game/meenz-city.html` (Release-Build), setzt ein echtes Dokument drum herum
    (`<!doctype html>`, Viewport mit `viewport-fit=cover`, Manifest, Apple-Meta, Icons, SW-Registrierung,
    Update-Hinweis, iOS-Hinweis „Zum Home-Bildschirm“) → `dist/` (gitignored).
  - `sw.js`: Cache-first für alle Dateien der Seite; Cache-Name enthält einen Hash des Builds → neues Release =
    neuer Service Worker, alter Cache wird gelöscht. Datenvolumen: 6,7 MB einmalig pro Version.
  - `manifest.webmanifest`, `icons/` (192, 512, maskable 512, apple-touch 180), erzeugt mit `make_icons.py`
    (Playwright-Screenshot einer Icon-Seite mit eingebetteter Bungee-Schrift) und eingecheckt.
- `.github/workflows/pages.yml`: läuft bei Push eines Tags `v*` (Release) und per Hand (`workflow_dispatch` mit
  Eingabe `tag`). Baut die Spielquellen **des Tags** (`git checkout <tag> -- game package.json package-lock.json`)
  mit dem aktuellen `site/`-Rahmen → so lässt sich auch v33 veröffentlichen, ohne Welle 7 vorzuziehen.
- Spielcode bleibt unverändert; das Artifact funktioniert weiter wie bisher.

## Verifikation
- `tests/test_pwa.py`: baut `dist/`, lädt `dist/index.html` in Chromium (iPhone-Profil): Manifest + Icons
  abrufbar, Service Worker kontrolliert die Seite nach Neuladen, **offline** neu laden → Spiel bootet ohne Fehler.
- WebKit-iPhone-Profil: Seite lädt, Hinweis „Zum Home-Bildschirm“ erscheint und lässt sich schließen.
- Nach dem Deploy: Pages-URL abrufen (HTTP 200, Manifest, sw.js), Screenshot.
