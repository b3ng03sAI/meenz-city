# Harness-Workflow + QA-Umbau, danach Roadmap-Paket „Fahrräder + Fahrradführerschein“

## Context
Notion-Roadmap (DB „Roadmap“ unter „🎮 Meenz City – Spieleprojekt“): offen sind nur
**Fahrräder + Fahrradführerschein** (Geplant, laut CLAUDE.md das nächste Paket) und **Detailausbau neue Gebiete**
(In Arbeit, offen: Wiesbadener Wahrzeichen Kurhaus, Marktkirche, Hbf Wiesbaden, Biebricher Schloss).

Der Nutzer möchte, dass die Entwicklung künftig dem Harness-Workflow folgt (`~/.claude/guides/workflow.md`,
`rules/testing.md`, `rules/git-workflow.md`) und die QA entsprechend umgebaut wird. Was dafür heute fehlt:
- Die Tests haben keine Asserts und keinen Exit-Code. Sie warten mit festen Pausen (`wait_for_timeout`), und neben dem
  manuellen `update()` läuft die rAF-Schleife (`p4e_main.js:43`) weiter. Damit sind sie nicht deterministisch.
- Es gibt keine Tester-Rolle für Browser-Projekte. `app-tester` ist Expo-only.
- Es fehlen Branch-, PR- und Review-Ablauf, `tasks/todo.md`, eine Lessons-Datei und der Status-Rückfluss nach Notion.

Entscheidungen des Nutzers: ein neuer **globaler** Agent `web-tester`; ein **Assert-Runner mit Migration des
Altbestands** (die Screenshot-Skripte bleiben manuell); **Notion-Status wird gepflegt**.

Die Arbeit teilt sich in Schritt 0 und drei Teile: **0** platziert die Notion-Seite richtig, **A** legt die Grundlage,
**B** setzt das Fahrrad-Paket um, **C** (Wahrzeichen) bekommt später einen eigenen Plan.

---

## 0 — Notion-Projektseite einordnen (Wunsch des Nutzers)
- **Heute:** Die Seite „🎮 Meenz City – Spieleprojekt“ (`3ec1486f8cd98101b24fcdb037261cfa`) liegt auf oberster Ebene
  des Workspace.
- **Verschieben:** per `notion-move-pages` in die Datenbank „🎯 Projekte & Tasks“
  (Data Source `collection://c7f1486f-8cd9-82bb-8d72-078b024a84e4`). Die Unterdatenbank „Roadmap“ und ihre Pakete
  wandern mit.
- **Properties setzen**, nach dem Vorbild anderer privater Projekte (Tally, Harness):
  - `Status=In progress`, `Kontext=Privat`, `Priority=Medium`, `Owner=ich`;
  - `Primärboard` = URL der Roadmap-DB (`89da640a014e4cf6a195976b15068c93`);
  - `Summary`: „GTA-artiges Browserspiel in Mainz + Wiesbaden (three.js, OSM-Daten), Repo b3ng03sAI/meenz-city.
    Roadmap-Pakete in der Roadmap-DB.“
- **Der Titel bleibt.** Der Projektname „Meenz City“ steckt darin.
- **Prüfen:** Seite erneut abrufen. Die Elternseite muss jetzt „🎯 Projekte & Tasks“ sein, und die Roadmap-DB muss
  weiter abfragbar sein.
- **Folge für `CLAUDE.md`:** Jetzt greift die Workflow-Regel. Die Zeile
  `Notion-Projektseite: https://app.notion.com/p/3ec1486f8cd98101b24fcdb037261cfa` kommt in `CLAUDE.md` und
  ersetzt den Satz „Notion-Datenbank „Roadmap““.

---

## A — Workflow- und QA-Grundlage (Branch `chore/qa-harness`)

**A1 Deterministischer Schritt-Modus** in `game/p4e_main.js` als Einzeiler in `frame()`. Ist `window.__MANUAL` gesetzt,
werden im Modus `play` `update`/`updateHUD` übersprungen und die Zeit läuft nur noch über `__MEENZ.update(dt)`.
Das bestehende Verhalten ändert sich nicht, weil das Flag sonst nie gesetzt ist.

**A2 Test-Bibliothek `tests/lib/harness.py`:**
- startet Chromium (`CHROME` optional) und setzt die Init-Skripte `__NORENDER=true` und `__MANUAL=true`;
- lädt `game/test.html` (Stub) oder `real.html` und wartet per `wait_for_function` auf `__MEENZ`, dann `startGame()`;
- bietet `step(sec, dt=1/60)`: eine Schleife über `update` im Browser, ohne Sleeps;
- bietet `check(name, cond, detail)`. Nach jedem Test prüft es automatisch `#errbox`, `pageerror` und Konsolenfehler;
- gibt eine Zusammenfassung aus und endet mit Exit-Code ≠ 0, sobald ein Check fehlschlägt.

**A3 Runner `tests/run.py`:**
- baut (`game/build.py`), startet `http.server` auf einem freien Port als Subprozess und führt `tests/test_*.py` aus;
- `python3 tests/run.py test_rad` führt einen einzelnen Test aus;
- in `package.json` wird `"test"` auf `python3 tests/run.py` umgestellt. Das ist eine Script-Änderung, keine Dependency.

**A4 Migration des Altbestands.**
- **Vorher** die alten Skripte (`all, ven, hbf, rh, ft, egg, nods, new5`) auf `main` laufen lassen und ihre Ausgabe
  als Baseline in `tests/out/baseline-*.txt` sichern.
- Dann je eine `tests/test_<name>.py` mit Asserts auf genau diese Fakten anlegen. Beispiele: Hunde ohne errbox,
  Betrunkenheit > 0 nach dem Trinken, Jetski-/UFO-/Kart-Phasen, Schnellreise-Ziele.
- Tastendrücke laufen über `M.keys` und `step()` statt `keyboard.press` mit Wartezeit.
- Alte Skripte löschen, sobald ihr Ersatz grün ist.
- `shot3, shot4, fly, mob9, prof, scan2` wandern nach `tests/manual/`. Sie bleiben Screenshot-, Speicher- und
  Profiling-Werkzeuge ohne Asserts.

**A5 Neuer globaler Agent `~/.claude/agents/qa/web-tester.md`.** Das ist eine Harness-Änderung im Repo `~/.claude`,
dort auf einem eigenen Branch mit PR.
- Generisch für Browser- und Playwright-Projekte, ohne Projektnamen; Vorlage ist `app-tester.md`.
- Er lädt die Code-Regeln (`rules/softwaredevelopment.md`, `rules/testing.md`) und liest die Testbefehle aus der
  Projekt-CLAUDE.md.
- Er schreibt und führt nur Tests aus, nie Produktionscode, und schwächt keinen Test ab.
- Completion-Gate: Er meldet „fertig“ erst mit grüner Suite. Kann er die Suite nicht ausführen, meldet er das sofort
  als Blocker.
- Ausgabe: neue Tests, Laufergebnis, Lücken und eine manuelle QA-Checkliste für Rendering und Handy.
- Dazu eine Zeile in der Agent-Tabelle in `~/.claude/README.md`.

**A6 Projektdoku und Ablauf:**
- `CLAUDE.md`, Abschnitt Testen: Runner, Schritt-Modus, `check()`-Muster, Stub- und real-Tests.
- `CLAUDE.md`, neuer Abschnitt „Ablauf je Roadmap-Paket“ mit diesen Schritten:
  1. Notion → In Arbeit;
  2. Plan unter `.claude/plans/YYYY-MM-DD-*.md` mit Verifikation;
  3. Branch `feat/<paket>`;
  4. Umsetzung in eigener Datei;
  5. `web-tester` schreibt Feature-Tests;
  6. `npm test` grün plus manuelle Screenshot- und Handy-Prüfung;
  7. PR mit `reviewer` und `adversarial-reviewer`;
  8. Merge;
  9. Version erhöhen, Tag, Artifact veröffentlichen — nur nach Rückfrage;
  10. Notion → Fertig mit Notizen;
  11. Lessons.
- Die Zeile `Notion-Projektseite:` aus Schritt 0 wird ergänzt, dazu die URL der Roadmap-DB.
- Neu anlegen: `tasks/todo.md` und `tasks/lessons.md`. `.claude/plans/` wird versioniert, weil es ein Solo-Projekt ist.

**A-Verifikation:**
- `npm test` ist grün, und jeder migrierte Test deckt die Baseline-Fakten ab.
- Gegenprobe: Ein absichtlich kaputter Check (z. B. `throw` in `updateEgg`) muss rot werden und Exit 1 liefern.
  Danach wieder entfernen.
- Zweimal hintereinander ausführen, beide Läufe müssen dieselben Werte liefern (Determinismus).

---

## B — Paket „Fahrräder + Fahrradführerschein“ (Branch `feat/fahrrad`)

Zu Beginn den Notion-Status auf „In Arbeit“ setzen (`tickets`-Agent). Feature-Präfix: `rad`.

**Spec (vorab festgelegt)**
- **Fahrzeug:** `CAR_TYPES.fahrrad` (Einzeiler in `game/p3_actors.js:106ff`) mit
  `bike:true, pedal:true, max≈9 m/s, acc≈3.5, mass 0.09, wb 1.05, wr 0.34, L 1.75, W 0.6, H 1.1`.
  Physik, Neigung (`sync` `:322`) und Kamera (`bike` → Abstand 5,6) übernimmt es vom Motorrad.
- **Unterschiede zum Motorrad**, alle als Wrapper in der neuen Datei `game/p5c_rad.js`:
  - eigene Geometrie mit dünnem Rahmen, Lenker und Sattel, ohne Tank (Wrapper um `carGeo`);
  - Pedalbewegung der Beine über `c.spin` (Wrapper um `vehicleInput`, `p4c_player.js:21`);
  - kein Motorsound (Wrapper `engProfile` → `null`, `p4k_engine.js:10`).
- **Nicht wrappbare Einzeiler**, jeweils um `&&!T.pedal` ergänzt:
  - Kennzeichen (`p3_actors.js:244`);
  - Scheinwerfer-Spot (`p4e_main.js:36`);
  - Sturz beim Absteigen über 7 m/s (`p4c_player.js:19`).
- **Verteilung:** `setupRad()` in `boot()` nach `setupJetskis()`. Es parkt ca. 12 Räder per `roadSpot`/`freeSpot` an
  POIs in Mainz und Wiesbaden (Hbf, Markt, Uni, Neustadt, Biebrich, Innenstadt Wiesbaden) mit
  `ai={mode:'parked'}` und `persist=true`.
- **Führerschein:**
  - neues Flag `G.fahrradSchein`, gespeichert in `snapshot()`/`applySave()` (`p4e_main.js:57/66`);
  - abwärtskompatibel über `!!d.fahrradSchein`, alte Spielstände laden also mit `false`.
- **Vergehen:**
  - Auslöser: Man fährt ohne Schein, mit Geschwindigkeit > 2 m/s und länger als 3 s.
  - Folge: `setWanted(Math.max(wanted,1))` plus `hint('Ohne Fahrradführerschein unterwegs!')`. Das folgt dem Vorbild
    `p4n_trip.js:14`.
  - Es eskaliert nicht von selbst über 1★ hinaus.
- **Rad-Polizist:**
  - Auslöser: Pro Vergehen mit 35 % Wahrscheinlichkeit, Cooldown 60 s.
  - Erscheinen: `spawnCop` etwa 25 m hinter dem Spieler, markiert mit `h.radCop`.
  - Verfolgung: eigene Update-Logik. Er rennt mit 6,5 m/s, also schneller als ein normaler Cop (5,2), aber langsamer
    als das Rad (9).
  - Ruf: alle 3 s bis zu dreimal `say(h,'Ey du Kek, du hast kein Fahrradführerschein!',3.2,'loud')`.
  - Ende: Er gibt nach 25 s oder über 80 m Abstand auf und wird zu einem normalen Passanten.
  - Festnahme läuft über die bestehende `busted`-Logik, wenn der Spieler langsam ist.
- **Mission „Fahrradführerschein“** (`free:true`, id `fahrradschein`) in `p5c_rad.js`, nach dem Muster der
  Jetski-Mission (`p5_missionen.js:37-43`):
  - Ablauf: Stufe 0 auf das Prüfungsrad steigen (`spawnMissionCar('fahrrad')`), Stufe 1 sechs Ringe (`ringMesh`)
    entlang einer Route aus dem Straßengraph, Timer 120 s.
  - Fehlschlag: Schaden über dem Limit, Passant angefahren (`crime`) oder mehr als 10 s abgestiegen.
  - Sieg: `G.fahrradSchein=true`, `showBig('Fahrradführerschein bestanden!')`, 50 € Belohnung.
  - Prüferin: eine fiktive Figur, die auf Meenzerisch kommentiert.
- **Nebenbei:** die hart kodierte Anzeige `/13 Missionen` (`p4e_main.js:77`) auf `MISSIONS.length` umstellen, als
  eigener Commit.
- **Build und Tests:**
  - `p5c_rad.js` in `build.py` vor `p4e_main.js` eintragen;
  - `RAD` (Status, `forceCop` für Tests) in `__MEENZ` aufnehmen;
  - ggf. fehlende THREE-Klassen in `three-stub.js` ergänzen.
- **Inhaltsregeln:** keine fremden Marken, keine realen Personen, keine Jubelgeste mit senkrechten Armen.

**B-Verifikation**
- **`web-tester` schreibt `tests/test_rad.py`** und deckt damit ab:
  - Es gibt mindestens 10 geparkte Räder, alle mit `T.pedal`.
  - Aufsteigen funktioniert; für das Rad gibt es keinen Motor in `ENGINES`; die Geschwindigkeit bleibt ≤ max.
  - Ohne Schein ist nach 4 s Fahrt `wanted===1`.
  - Mit `RAD.forceCop` existiert ein Rad-Polizist, und die Sprechblase enthält „Kek“.
  - Gewinnt man die Mission per Schritt-Simulation, gilt `G.fahrradSchein`, und `snapshot()` enthält das Flag.
  - Mit Schein gibt es keinen Stern.
  - `applySave` eines alten Spielstands liefert `false`.
  - Absteigen bei 8 m/s wirft den Spieler nicht um.
  - `#errbox` bleibt leer.
- **Gesamtsuite:** `npm test` ist grün, und das Verhalten des Altbestands ist unverändert.
- **Manuell:**
  - `tests/manual/shot3.py hoch rad` (SwiftShader) zeigt Rad und Pedalbewegung im Screenshot;
  - `tests/manual/mob9.py m` hält das Speicherbudget ein (< ~700 MB, keine Canvas > 16 Mio. Pixel).
- **Review:** PR, dann `reviewer` und `adversarial-reviewer`. Findings beheben und die Tests erneut laufen lassen.
- **Abschluss, nur nach Rückfrage:** Version 32 in `package.json`, Tag `v32.0.0`, Artifact-Update. Danach
  Notion → Fertig mit Notizen (V32, Testergebnis) und einen Lessons-Eintrag.

---

## C — Nächstes Paket
Die Wiesbadener Wahrzeichen bekommen nach Abschluss von B einen eigenen Plan im selben Ablauf.

## Kritische Dateien
- `game/p4e_main.js`: Schritt-Modus, Boot, `__MEENZ`, Save, Scheinwerfer
- `game/p3_actors.js`: Typ und Kennzeichen
- `game/p4c_player.js`: Sturz-Regel
- `game/build.py`
- neue Dateien: `game/p5c_rad.js`, `tests/lib/harness.py`, `tests/run.py`, `tests/test_*.py`
- `CLAUDE.md`, `package.json`, `tasks/*`
- `~/.claude/agents/qa/web-tester.md`, `~/.claude/README.md`

## Commits, Push und Freigaben
- Kleine Commits nach der Vorlage (`feat:`/`test:`/`chore:`/`docs:`, Beschreibung kleingeschrieben).
- Push, PR, Tag und Artifact-Veröffentlichung erst nach Rückfrage. Das gilt auch für den PR im Harness-Repo.
- Der Plan wird nach Freigabe in `.claude/plans/2026-10-02-harness-qa-fahrrad.md` umbenannt.
