# Lessons

## 2026-10-02 — QA-Umbau auf Assert-Runner
**What worked:** Echte Tastendrücke (`keyboard.down/up`) landen synchron in `keys`/`keysP`; mit `__MANUAL` und `g.step()` braucht kein Test mehr Wartezeiten – `test_all` läuft in 7 s statt 35 s.
**What didn't:** macOS hat kein `timeout`-Kommando – der erste Baseline-Lauf schrieb nur Fehlermeldungen.
**What didn't:** Ein Check auf die Endgeschwindigkeit nach 3 s Gas war rot, weil das Motorrad gegen eine Wand fuhr; Fahrzustand über die zurückgelegte Strecke prüfen, nicht über einen Momentwert.
**Carry forward:** Vor jeder Testmigration die Ausgabe der alten Skripte als Baseline sichern – sie zeigte drei verdächtige Altbefunde (Malakoff-Ausgang, Schnellreise „missing“, Hbf-Bahnsteig).

## 2026-10-02 — Review PR #1 und parallele Wellen
**What worked:** Gemeinsame Dateien vor einer Welle zentral verdrahten (Stubs + Einträge in build/boot/loop/`__MEENZ`) – die Agents fassen dann nur eigene Dateien an.
**What didn't:** Persistente Fahrzeuge zählten gegen das Parkplatz-Budget – 11 neue Räder verdrängten alle geparkten Autos, und kein Test hat es gemerkt.
**What didn't:** Zufallsabhängige Checks (Kart-Strecke > 500 m) brechen, sobald ein Feature beim Boot oder im Test zusätzliche Zufallszahlen verbraucht.
**What didn't:** Projektlokale Agents unter `.claude/agents/` lädt eine laufende Session nicht nach – Agents als `general-purpose` mit „lies erst die Definition“ starten.
**Carry forward:** Harness setzt den Seed nach `start()` neu; zufallsabhängige Abschnitte rufen zusätzlich `g.reseed(n)`. Neue Massen-Objekte immer gegen bestehende Budgets/Limits prüfen (Parkplätze, Bubbles, Draw-Calls).

## 2026-10-03 — Handy, Wellen 7–8, Fahrphysik
**What worked:** Echte Safari-Engine (Playwright-WebKit, iPhone-Profil) statt nur Chromium – zeigte Layout-, Viewport- und Touch-Probleme, die SwiftShader-Tests nie sehen.
**What worked:** Lazy-Stadtteile mit Protokoll der Kollisionsraster-Schreibzugriffe – vier Stadtteile kosten beim Start +2 MB statt ~40 MB.
**What didn't:** Ein Stadtteil zog beim Aufbau `Math.random` und verschob damit einen Kampf in einem fremden Test (Straßenbahn) – eigener Seed-Zufall ist Pflicht.
**What didn't:** Geld-Asserts (JGA, Nerobergbahn) brachen zufällig durch Revier-Einnahmen; Ursache erst nach Einzellauf-Vergleich sichtbar.
**What didn't:** Ein manuelles Messskript lief gegen einen fremden Server auf demselben Port und lieferte plausible, aber falsche Zahlen.
**What didn't:** Zu viele parallele Agents + volle Suiten trieben die Last auf 60–90; Tests liefen in Zeitüberschreitungen, Agents standen stundenlang.
**Carry forward:** Fahrgefühl über Zahlen spezifizieren (0→50, Bremsweg, Lenk-/Gieransprechen, Kamera-Nachlauf) und KI-Physik per Test unverändert halten.
