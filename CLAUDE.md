# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Meenz City – Arbeitsanleitung für Claude Code

GTA-artiges Browser-Spiel in Mainz + Wiesbaden (three.js r160). Das Spiel wird als **eine einzige HTML-Datei** ausgeliefert
(`game/meenz-city.html`, ~7 MB inkl. eingebettetem three.js + Schriften). Veröffentlicht als installierbare Web-App auf
**GitHub Pages** https://b3ng03sai.github.io/meenz-city/ und als claude.ai-Artifact
https://claude.ai/artifact/Mg1JaXqKwiitTMRnBoWDjq (beide Stand: Version 33). Der lokale `main` ist weiter (Wellen 7–8,
Handy-UX, Fahrphysik) und **noch nicht gepusht** – Stand und nächste Schritte: `tasks/stand.md`.

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
in `game/` ändern und neu bauen. Kurzformen: `npm run build`, `npm run serve`, `npm test` (= `tests/run.py`).

## Veröffentlichen
- **Haupt-Link: GitHub Pages** (installierbare Web-App: Vollbild, Home-Bildschirm-Icon, offline):
  https://b3ng03sai.github.io/meenz-city/ – `.github/workflows/pages.yml` baut bei jedem Push eines Tags `v*` die
  Spielquellen **dieses Tags** und legt den Rahmen aus `site/` drum (`site/build_site.py` → `dist/`: Manifest, Service
  Worker mit Cache je Build, Icons aus `site/make_icons.py`, Hinweis „Zum Home-Bildschirm“ für iOS). Einen älteren Tag
  von Hand: `gh workflow run pages.yml -f tag=vNN.0.0`. Test: `tests/test_pwa.py` (inkl. Offline-Start).
- claude.ai-Artifact (Link oben) bleibt als Zweitkanal; dort gibt es kein Manifest/Service Worker.

## Testen (Playwright, headless Chromium)
```bash
python3 -m venv .venv && .venv/bin/pip install playwright && .venv/bin/playwright install chromium   # einmalig
npm install                      # three@0.160.0, nur für real.html / tests/manual
npm test                         # = python3 tests/run.py: baut, startet Server, alle tests/test_*.py, Exit 0/1
python3 tests/run.py rad hbf     # nur test_rad.py + test_hbf.py;  --no-build überspringt den Build
```
- **Test schreiben:** `tests/test_<thema>.py` mit `from harness import run` (`tests/lib/harness.py`, Vorlage
  `tests/test_all.py`). `g.start()`, `g.step(sek)` (Spielzeit), `g.key('KeyE', hold, after)`, `g.js("()=>…")`,
  `g.check(name, bedingung, detail)`. Jeder Test scheitert zusätzlich an `#errbox`, `pageerror` und Konsolenfehlern.
- **Deterministisch:** Die Harness setzt `window.__MANUAL=true` (rAF-Schleife ruft `update()` nicht mehr auf, Zeit nur über
  `g.step`), `__NORENDER=true` und seedet `Math.random` (`MEENZ_SEED`). Keine Sleeps, keine `wait_for_timeout`.
- Neue Feature-Zustände über `window.__MEENZ` (in `p4e_main.js`) zugänglich machen – Tests prüfen Zustand, keine Pixel.
- `test.html` nutzt `three-stub.js` (Proxy, rendert nichts). Neue THREE-Klassen ggf. im Stub ergänzen.
  Achtung: im Stub ist `group.children` kein echtes Array → mit `Array.isArray` absichern.
- `real.html` rendert echt (SwiftShader); `run(test, real=True)` bzw. `g.snap(name)` → JPEG nach `tests/out/`.
- **Manuell (ohne Asserts)** in `tests/manual/`: `shot3.py hoch <prefix>` / `shot4.py` / `fly.py` (Screenshots),
  `mob9.py m` (Handy-Speicher, Ziel s. u.), `prof.py` (Ladezeit je Phase), `scan2.py` (Analyse). Brauchen einen Server
  auf Port 8765 (`npm run serve`, nur auf 127.0.0.1). Screenshots nach dem Lauf selbst ansehen.

## Architektur (Kurzfassung)
| Datei | Inhalt |
|---|---|
| `p0_render.js` | Renderer, Qualitätsstufen `QS` (ultra/hoch/mittel/niedrig; Handys starten immer auf „niedrig“, Tablets auf „mittel“ – `IS_MOBILE`/`IS_PHONE`, Test `test_mobil.py`), Postprocessing inkl. Schärfefilter, Nebel |
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
| `p5c…p5p` | Fahrrad + Führerschein, Autoradio, Stunts, Gautschen, Hubschrauber, Wiesbadener Wahrzeichen (`WIWAHR`), Nebenjobs, Straßenbahn, Rosenmontagszug, Nerobergbahn, Revierkämpfe (`REVIER`), Coup, Spielbank, S-Bahn |
| `p6_lazy.js` | Gemeinsamer Lazy-Helfer für Stadtteile: Aufbau < 350 m, Freigabe > 500 m, Kollisionsraster-Schreibzugriffe werden protokolliert und zurückgenommen (`LAZY`) |
| `p6a…p6g` | Stadtteile Altstadt, Neustadt, Oberstadt, Bretzenheim, Gonsenheim, Mombach, Weisenau (je eigenes Objekt + Test) |
| `p6h…p6l` | Eichhörnchen-Power-up, Rausspringen, Ablecke-Oma, Nessie, JGA-Mission |
| `p6m_touch.js`, `p6o_mobilux.js` | Touch-Steuerung (Kontextknöpfe) und Handy-Bedienung: Quer-Layout, Overlays, Karten-Pinch, Zielhilfe, Draw-Call-Begrenzung auf „niedrig“ (`__MEENZ.RINFO`) |
| `p6n_intro.js` | Einleitung mit der Bürgermeisterin (nur bei neuem Spiel) |
| `p6p_fahrphysik.js` | Direktere Fahrphysik für **Spieler**fahrzeuge (Wrapper um `physStep`, Tabelle `FP.CLS`), Kamera-Nachlauf, Polizei-Antritt; KI fährt unverändert |
| `site/` | Rahmen für GitHub Pages (Manifest, Service Worker, Icons) – kein Spielcode |

Koordinaten: `x=(lon-8.2740)*71540`, `z=-(lat-49.9988)*111200` (Ursprung ≈ Dom). Bounds aus `OSM.bounds`.

### Muster & Fallstricke
- Alles teilt sich **einen globalen Modul-Scope** → eindeutige Namen wählen (Präfix je Feature, z. B. `flug…`, `kart…`).
- Bestehende Funktionen erweitern per Wrapper: `const _x=playerFire; playerFire=function(P,I){…; _x(P,I);}`
  (Funktionsdeklarationen sind neu zuweisbar). Reihenfolge der Wrapper = Reihenfolge in `build.py`.
- Neue Update-Funktion → in die Hauptschleife in `p4e_main.js` (`updateEgg(dt);updateFlug(dt);…`) eintragen;
  Setup → in `boot()` nach `setupVehicles()`.
- `GB.geo()` gibt die JS-Arrays danach frei – vorher alles anhängen.
- Handy (`LOWMEM`): Canvas-Texturen nach GPU-Upload freigeben (`freeAfterUpload`), statische Meshes über
  `staticMesh()/staticInst()` registrieren (Distanz-LOD), Speicherbudget mit `tests/manual/mob9.py m` prüfen
  (Ziel: JS-Heap < ~700 MB im iPhone-Emulator, keine Canvas > 16 Mio. Pixel).
- Spielerbezogene Bodenhöhe: `playerGroundY()` (Wasser → Schwimmhöhe), sonst `groundY(x,z,y)`.
- **Neue Stadtteile/Orte immer lazy** über `p6_lazy.js` (nichts beim Boot anlegen) und mit **eigenem Seed-Zufall** –
  nie `Math.random` beim Aufbau/Update ziehen, sonst verschiebt sich der Zufall aller Tests (Gonsenheim-Lektion).
- Qualität `niedrig` (`QS.lowLOD`, `QS.noShadow`) existiert – Code darf nicht nur ultra/hoch/mittel annehmen.
- Tests, die eine Strecke über eine feste Gehzeit zurücklegen, die Dauer aus `__MEENZ.FOOT.walk` ableiten (Tempo wurde schon geändert).
- Tests, die Geld prüfen: Revier-Einnahmen (`REVIER.incomeT=1e9`) vorher abschalten – sie zahlen zufällig dazwischen.

## Inhaltliche Regeln
- **Keine echten lebenden Politiker** darstellen – nur fiktive Figuren (z. B. „Dr. Hubertus Schoppenhauer“).
- **Keine fremden Marken/Figuren nachbauen** (z. B. Mario-Kart-Elemente: keine Pilze, Panzer, ?-Blöcke) – eigene Designs.
- **Keine Gesten, die nach verbotenem Gruß aussehen:** nie den rechten Arm allein gestreckt über ~33° unter der Waagerechten
  heben (Faustschlag = Stoß schräg nach unten zur Körpermitte), nie beide Arme senkrecht (Jubel nur als seitliches V).
  `game/p3c_haltung.js` erzwingt das am Ende jedes `update()` für alle Figuren; `tests/test_haltung.py` prüft es mit echtem
  three.js. Neue Posen trotzdem von vornherein so bauen.
- Kartendaten © OpenStreetMap-Mitwirkende (ODbL).
- **Lizenz:** Spiel AGPL-3.0-only, OSM-Daten ODbL (`LICENSE`, `NOTICE.md`). Keinen fremden Code/Assets übernehmen, deren Lizenz
  nicht AGPL-kompatibel ist; neue Laufzeit-Abhängigkeiten in `NOTICE.md` eintragen. Quellcode-Link im Startbildschirm nie entfernen (AGPL §13).

## Kartendaten neu erzeugen
```bash
cd game
OSM_SRC=/pfad/mainz-osm-gross.json.gz OSM_SRC2="/pfad/wiesbaden-osm.json.gz" \
OSM_BOUNDS=-7808,-10752,11008,13376 python3 osm_prep.py   # → p1_osm.js
```

## Roadmap & Notion
Notion-Projektseite: https://app.notion.com/p/3ec1486f8cd98101b24fcdb037261cfa

Pakete stehen in der Roadmap-Datenbank auf dieser Seite (https://app.notion.com/p/89da640a014e4cf6a195976b15068c93,
Spalten Paket/Status/Phase/Bereich/Notizen/Reihenfolge; Status Geplant → In Arbeit → Fertig, „Pausiert“ bewusst angehalten).

## Reihenfolge: durcharbeiten ohne Pause
- **Nächstes Paket** = erst alle mit Status **In Arbeit**, dann **Geplant** nach aufsteigender Spalte „Reihenfolge“
  (Pakete ohne Reihenfolge zuletzt). „Pausiert“ wird übersprungen, bis der Nutzer es wieder freigibt.
- Nach einem fertigen Paket **direkt das nächste beginnen** – keine Rückfrage, kein Warten auf Freigabe zwischen Paketen.
  Arbeits-Branch je Welle/Stapel (`feat/welle-N`), die Feature-Agents einer Welle arbeiten in eigenen Worktrees und Branches
  (`feat/wN-<paket>`) und werden in den Arbeits-Branch gemergt. Nach jedem Paket **lokal** committen.
  **Seit 2026-10-02 abends nicht pushen** (Nutzerwunsch): Branches lokal in `main` mergen, keine PRs/Tags, bis der Nutzer
  das Pushen wieder freigibt (Force-Push sowieso nur nach Rückfrage).
- Unterbrechen nur für: Artifact-Veröffentlichung/Release-Tag, eine echte Produktentscheidung, die die Notizen nicht
  beantworten, oder einen roten Test, dessen Ursache sich nicht klären lässt. Dann kurz fragen, sonst weiter.
- Querbezüge in den Notizen beachten (z. B. „baut auf Paket 7 auf“): Voraussetzung zuerst.

## Ablauf je Roadmap-Paket
1. Notion: Paket auf **In Arbeit** (Status-Schreibzugriffe über den `tickets`-Agent).
2. Plan in `.claude/plans/YYYY-MM-DD-<thema>.md` – mit Spec der unklaren Punkte und **wie verifiziert wird**.
3. Paket-Branch: in einer Welle `feat/wN-<paket>` im eigenen Worktree (Vertrag `.claude/plans/…-welle-N.md`), sonst direkt auf
   dem Arbeits-Branch; Checkliste in `tasks/todo.md`.
4. Umsetzung in eigener Datei (Präfix je Feature), in den konfliktträchtigen Dateien nur Einzeiler.
5. `web-tester` schreibt/erweitert `tests/test_<paket>.py`; Bugfix → Regressionstest, der ohne Fix rot ist.
6. `npm test` grün; visuelle Änderungen per `tests/manual/shot3.py`, Handy-Budget per `tests/manual/mob9.py m`.
7. PR → `reviewer` und `adversarial-reviewer`; Findings beheben, Tests erneut.
8. Merge; Release nur nach Rückfrage: Version in `package.json`, Tag `vNN.0.0`, Artifact-Update (URL oben, Stand-Version
   anpassen).
9. Notion: **Fertig** + Notizen (Version, was drin ist, Teststand); Lessons in `tasks/lessons.md`.

## Parallel arbeiten (Agent-Team)
- **Rollen:** `team-lead` (`.claude/agents/team-lead.md`) plant die Welle, verdrahtet vorab, startet je Paket einen
  `meenz-dev` im eigenen Worktree, merged die Branches und gibt den Gesamtstand **einmal** an einen `web-tester`
  (volle Suite, Screenshots, `mob9`, Haltung). Feature-Agents testen nur ihre eigene Datei + `test_all`
  (`python3 tests/run.py <paket> all`), nie die volle Suite – sonst laufen N volle Suiten parallel und die Maschine kippt.
  Höchstens **5 Feature-Agents gleichzeitig, insgesamt** (Nutzervorgabe) – Nebenaufgaben zählen mit.
- Manuelle Skripte mit eigenem Server immer auf einem freien Port starten – fremde Server auf 8765/8799 o. Ä. liefern
  sonst still einen anderen Stand aus.
- Unter hoher Last (Load > 40) laufen Tests in Zeitüberschreitungen; dann nicht als Fehler werten, sondern einzeln
  wiederholen und die volle Suite auf ruhiger Maschine in einem Lauf bestätigen.
- Ein Feature = eine eigene Datei + eigener Branch/Worktree. Konfliktträchtig sind nur `build.py`, `p4e_main.js`
  (Schleife/Boot/`__MEENZ`), `p3_actors.js` (Fahrzeugtypen) und `p4c_player.js` – Änderungen dort klein halten.
- Integration in der Hauptsession: mergen, dann `npm test` im Haupt-Tree – zwei grüne Branches sind nicht automatisch
  zusammen grün.
