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
