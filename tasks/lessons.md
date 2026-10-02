# Lessons

## 2026-10-02 — QA-Umbau auf Assert-Runner
**What worked:** Echte Tastendrücke (`keyboard.down/up`) landen synchron in `keys`/`keysP`; mit `__MANUAL` und `g.step()` braucht kein Test mehr Wartezeiten – `test_all` läuft in 7 s statt 35 s.
**What didn't:** macOS hat kein `timeout`-Kommando – der erste Baseline-Lauf schrieb nur Fehlermeldungen.
**What didn't:** Ein Check auf die Endgeschwindigkeit nach 3 s Gas war rot, weil das Motorrad gegen eine Wand fuhr; Fahrzustand über die zurückgelegte Strecke prüfen, nicht über einen Momentwert.
**Carry forward:** Vor jeder Testmigration die Ausgabe der alten Skripte als Baseline sichern – sie zeigte drei verdächtige Altbefunde (Malakoff-Ausgang, Schnellreise „missing“, Hbf-Bahnsteig).
