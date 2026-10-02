# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Meenz City – Arbeitsanleitung für Claude Code

GTA-artiges Browser-Spiel in Mainz + Wiesbaden (three.js r160). Das Spiel wird als **eine einzige HTML-Datei** ausgeliefert
(`game/meenz-city.html`, ~4,8 MB) und als claude.ai-Artifact veröffentlicht:
https://claude.ai/artifact/Mg1JaXqKwiitTMRnBoWDjq (Stand: Version 31).

Sprache im Spiel und in Kommentaren: **Deutsch**, Dialoge gern auf **Meenzerisch/Rheinhessisch**.

## Bauen
```bash
cd game && python3 build.py   # schreibt meenz-city.html (CDN-three), test.html (three-Stub), real.html (lokales three)
```
`build.py` hängt die Teil-Dateien **in fester Reihenfolge** an `shell.html` (Platzhalter `/*__GAME__*/`) an – alles
läuft in **einem** `<script type="module">`. `p1_osm.js` (10 MB JSON) wird dabei gzip+base64 eingebettet und beim
Laden per `DecompressionStream` (Fallback `gunzip_small.js` für alte iPhones) entpackt.

**Neue Datei?** In die Liste in `build.py` eintragen (vor `p4e_main.js`).

`meenz-city.html`, `test.html` und `real.html` sind **Build-Ausgaben** – nie direkt bearbeiten, sondern die Teil-Dateien
in `game/` ändern und neu bauen. Kurzformen: `npm run build`, `npm run serve`, `npm test` (= `tests/all.py`).

## Testen (Playwright, headless Chromium)
```bash
npm install                      # three@0.160.0 für real.html
pip install playwright && playwright install chromium   # oder CHROME=/pfad/zu/chromium setzen
cd game && python3 build.py && cd ..   # Tests laden game/test.html bzw. game/real.html – vorher bauen!
python3 -m http.server 8765      # im Repo-Wurzelverzeichnis starten
python3 tests/all.py             # Stub-Regressionstest (schnell, ohne echtes Rendering)
```
- `test.html` nutzt `three-stub.js` (Proxy, rendert nichts) → schnelle Logiktests. Neue THREE-Klassen ggf. im Stub ergänzen.
  Achtung: im Stub ist `group.children` kein echtes Array → mit `Array.isArray` absichern.
- `real.html` rendert echt (SwiftShader: `--use-angle=swiftshader --enable-unsafe-swiftshader`). Mit
  `window.__NORENDER=true` läuft keine Render-Schleife; `__MEENZ.snap(n)` rendert einmal und liefert ein JPEG (dataURL).
- **Die Tests haben keine Asserts** und keinen Exit-Code für Fehlschlag: sie geben je Schritt eine Zeile aus
  (Name, Messwerte, Inhalt von `#errbox`). Ausgabe lesen – nicht-leerer errbox-Text oder `PAGEERROR` = Fehler.
  Einzelner Test: `python3 tests/<name>.py`.
- **Immer `#errbox` prüfen** – die Hauptschleife fängt Fehler ab und schreibt sie dorthin.
- `window.__MEENZ` (in `p4e_main.js`) stellt Test-Hooks bereit (update, P1, CARS, HUMANS, MISSIONS, FLUG, UFO, KART, …).
- Tests: `all.py` (Regression), `ven.py` (Innenräume), `hbf.py`, `rh.py` (Rhein), `ft.py` (Schnellreise), `egg.py`,
  `nods.py` (ohne DecompressionStream), `new5.py` (Jetski/Schwimmen/Waffen/UFO/Kart), `mob9.py m` (Handy-Speicher),
  `shot3.py hoch new` / `shot4.py` / `fly.py` (Screenshots nach `tests/out/`), `prof.py` (Ladezeit je Phase), `scan2.py` (Analyse-Skript).
  Langsam (SwiftShader/`real.html`): `shot3`, `shot4`, `fly`, `mob9`. Chromium-Pfad optional über `CHROME=…`.

## Architektur (Kurzfassung)
| Datei | Inhalt |
|---|---|
| `p0_render.js` | Renderer, Qualitätsstufen `QS` (ultra/hoch/mittel), Postprocessing inkl. Schärfefilter, Nebel |
| `p1_osm.js`, `p1_data.js` | OSM-Daten (`OSM`), Bounds, Bezirke (`districtAt`), Orte `PLACES` |
| `seg_masks.js` | Raster: `HG` (1 m Höhe/Hindernis, 255=Wasser) und `MFLAG` (2 m, Bits 1 Park/2 Straße/4 Wasser) – **dünn besetzte 64er-Kacheln**, Zugriff nur über `hgG(i)/hgS(i,v)`, `mfG(i)`; Index via `idx(x,z)` |
| `seg_*.js`, `p2*.js` | Weltgenerierung: Gebäude (Chunk-LOD), Straßen, Boden-Kacheln, Bäume, Läden, Wahrzeichen |
| `p3_actors.js` | `Human`, `Car` (+`CAR_TYPES`, `carGeo`), Kollision `blocked()/groundY()`, Stufen `STEP_*`, erhöhte Flächen `ELEV` |
| `p3b_style.js` | Figuren: Loft-Körper, Geschlecht/Alter (`h.sex`, `h.age`), Kleidung, Frisuren |
| `p4a…p4e` | Eingabe, Kampf/Waffen, Spieler/Kamera, Welt/Missionen/HUD, **Hauptschleife + Boot** (`p4e_main.js`) |
| `p4f…p4w` | Gespräche, Marktfrühstück, Fliegerdackel, Betrunken, Motor-Sound, UI, Dachszenen, Trip, Busse, Innenräume (Dom, Christuskirche, Malakoff, Hbf), Rhein, Performance, Dialekt/fiktive Politiker, Schnellreise, Powerups, Easter Egg |
| `p4x_flug.js` | Flugplatz Großer Sand + Flugzeug-Physik (`Car.prototype.planeStep/planeSync`) |
| `p4y_wasser.js` | Schwimmen, Jetskis |
| `p4z_waffen.js` | Neue Waffen, Raketen, Flammenwerfer, Cheat-Codes |
| `p4za_ufo.js` | UFO-Ereignis |
| `p5_missionen.js` | Neue Missionen (`free:true` = sofort verfügbar) |
| `p5b_kart.js` | Spontane Gokart-Rennen (Strecke aus dem Straßengraph) |

Koordinaten: `x=(lon-8.2740)*71540`, `z=-(lat-49.9988)*111200` (Ursprung ≈ Dom). Bounds aus `OSM.bounds`.

### Muster & Fallstricke
- Alles teilt sich **einen globalen Modul-Scope** → eindeutige Namen wählen (Präfix je Feature, z. B. `flug…`, `kart…`).
- Bestehende Funktionen erweitern per Wrapper: `const _x=playerFire; playerFire=function(P,I){…; _x(P,I);}`
  (Funktionsdeklarationen sind neu zuweisbar). Reihenfolge der Wrapper = Reihenfolge in `build.py`.
- Neue Update-Funktion → in die Hauptschleife in `p4e_main.js` (`updateEgg(dt);updateFlug(dt);…`) eintragen;
  Setup → in `boot()` nach `setupVehicles()`.
- `GB.geo()` gibt die JS-Arrays danach frei – vorher alles anhängen.
- Handy (`LOWMEM`): Canvas-Texturen nach GPU-Upload freigeben (`freeAfterUpload`), statische Meshes über
  `staticMesh()/staticInst()` registrieren (Distanz-LOD), Speicherbudget mit `tests/mob9.py m` prüfen
  (Ziel: JS-Heap < ~700 MB im iPhone-Emulator, keine Canvas > 16 Mio. Pixel).
- Spielerbezogene Bodenhöhe: `playerGroundY()` (Wasser → Schwimmhöhe), sonst `groundY(x,z,y)`.

## Inhaltliche Regeln
- **Keine echten lebenden Politiker** darstellen – nur fiktive Figuren (z. B. „Dr. Hubertus Schoppenhauer“).
- **Keine fremden Marken/Figuren nachbauen** (z. B. Mario-Kart-Elemente: keine Pilze, Panzer, ?-Blöcke) – eigene Designs.
- Keine Gesten, die nach verbotenem Gruß aussehen (Arme beim Jubeln senkrecht nach oben).
- Kartendaten © OpenStreetMap-Mitwirkende (ODbL).

## Kartendaten neu erzeugen
```bash
cd game
OSM_SRC=/pfad/mainz-osm-gross.json.gz OSM_SRC2="/pfad/wiesbaden-osm.json.gz" \
OSM_BOUNDS=-7808,-10752,11008,13376 python3 osm_prep.py   # → p1_osm.js
```

## Roadmap
Notion-Datenbank „Roadmap“ (Paket/Status/Phase/Bereich/Notizen). Nächstes geplantes Paket:
**Fahrräder + Fahrradführerschein** (Stern ohne Führerschein, Polizist rennt hinterher und ruft
„Ey du Kek, du hast kein Fahrradführerschein!“, Führerschein-Mission).

## Parallel arbeiten (Agent-Team)
- Ein Feature = eine eigene Datei + eigener Branch/Worktree. Konfliktträchtig sind nur `build.py`, `p4e_main.js`
  (Schleife/Boot/`__MEENZ`), `p3_actors.js` (Fahrzeugtypen) und `p4c_player.js` – Änderungen dort klein halten.
- Ein Integrations-Agent baut, lässt `tests/all.py` + Feature-Tests laufen und macht Screenshots, bevor veröffentlicht wird.
