# Stand Meenz City – Meilenstein 2026-10-03

## Veröffentlicht
- **Version 33** (Tag `v33.0.0`, `origin/main`) – live auf GitHub Pages https://b3ng03sai.github.io/meenz-city/
  (installierbare Web-App) und als claude.ai-Artifact https://claude.ai/artifact/Mg1JaXqKwiitTMRnBoWDjq.

## Lokal fertig, nicht gepusht
Der lokale `main` liegt **78 Commits** vor `origin/main` (Nutzerwunsch seit 2026-10-02 abends: nicht pushen).
Testsuite: 50 Testdateien. Letzter voller Lauf (`npm test`, 2026-10-03, ruhige Maschine): 49/50 grün; `test_gons` scheiterte
nur an einer fest eingebauten Gehzeit (seit Gehen 4,2 m/s) – Test angepasst, danach mit zwei Seeds grün.

| Bereich | Inhalt |
|---|---|
| Wellen 7–9 | Spielbank, S-Bahn, Altstadt, Neustadt, Oberstadt, Bretzenheim, Gonsenheim, Mombach, Weisenau, AKK, Wiesbaden Innenstadt + Westend – Stadtteile **lazy** (Aufbau < 350 m, Freigabe > 500 m, je +2–10 MB nur in der Nähe) |
| Handy | Grafik „niedrig“ automatisch, Quer-Layout, Pause/Overlays/Karte per Touch, Zielhilfe, Draw-Calls quer 873 → 253 |
| Fahren | Direktere Fahrphysik (Lenk-Ansprechen 0,47 → 0,10 s), Boote/Flieger/Hubschrauber, Kamera, Polizei-Antritt; KI unverändert |
| Grafik | Runde prozedurale Autos (3 Draw-Calls/Auto, LOD), Staatstheater Mainz detailgetreu |
| Spiel | Andreas („HALT STOPP!! …“), schneller gehen/rennen/schwimmen + Touch-Rennen, Cheats repariert, Schutz in der Einleitung, Versionsnummer im Pausebildschirm |
| Stabilität | Fragile Tests (Straßenbahn, JGA, Nerobergbahn) deterministisch; Fahrgäste werden nicht angepöbelt |

## Offen / bekannt
- **Handy-Speicher:** ~667 MB JS-Heap nach dem Laden (Ziel ≤ 350 MB). Analyse + Plan für Paket 40.5:
  `.claude/plans/2026-10-03-welt-streaming.md` (Branch `feat/w9-stream`, noch nicht gemergt – das Mergen wurde vom
  Rechte-System blockiert und braucht die Freigabe des Nutzers). Phasen A–D ≈ 290 MB, ≈ 3 Agent-Tage.
- **Ruckler:** Aufbau einer Lazy-Zone kostet 20–27 ms in einem Frame (einmal 324 ms beim ersten Kastel-Aufbau);
  60–130-ms-Spitzen beim Fahren (Ursache offen: GC/Compositor?). 1,3 Mio. Dreiecke, bis 490 Draw-Calls auf „niedrig“.
- **Zufall:** `p6_lazy.js` zieht beim Anlegen der Gruppe eine UUID aus dem globalen `Math.random` (AKK schützt sich, ältere Stadtteile nicht).
- **Straßenbahn:** Schüsse von Polizei/Gangs treffen Fahrgäste noch (S-Bahn ist geschützt).
- Kosmetik: Maaraue-Freibad karg, Schlossplatz-Pflaster mit hellem Fleck, Theater-Foyer nicht begehbar, Kompaktwagen etwas hoch.
- Notion-Notizen von Paket 7 und 51 noch mit veraltetem Text (Schreiben war blockiert; Nutzer entscheidet).

## Backlog (Notion, ohne Reihenfolge)
Wirtschafts-Modus (Big Ambitions), Verkehr auf dem Wasser, Leihräder, UFO klauen, Paket 43–45 (Biebrich/Schierstein,
Dotzheim/Klarenthal, Bierstadt/Erbenheim), Licht/Spiegelungen, Prüfung auf älteren Handys.
