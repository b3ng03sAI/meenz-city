# Stand Meenz City – Meilenstein 2026-10-03

## Veröffentlicht
- **Version 34** (Tag `v34.0.0`, 2026-10-03) – live auf GitHub Pages https://b3ng03sai.github.io/meenz-city/ und als
  claude.ai-Artifact https://claude.ai/artifact/Mg1JaXqKwiitTMRnBoWDjq. Volle Suite vor dem Release: 55/55 grün.
- Pages-Deploy: Die Umgebung `github-pages` erlaubt nur `main` – der automatische Deploy beim Tag-Push scheitert daher;
  von Hand: `gh workflow run pages.yml --ref main -f tag=vNN.0.0` (oder in den Repo-Einstellungen Tags `v*` erlauben).

| Bereich | Inhalt von Version 34 |
|---|---|
| Wellen 7–9 | Spielbank, S-Bahn, Altstadt, Neustadt, Oberstadt, Bretzenheim, Gonsenheim, Mombach, Weisenau, AKK, Wiesbaden Innenstadt + Westend (lazy) |
| Welle 10 | Welt in Abschnitten: Handy-Heap 668 → 288 MB, Desktop 795 → 444 MB; Aufbau in Zeitscheiben, keine Frames > 100 ms nach 10 s |
| Handy | Grafik „niedrig“ automatisch, Quer-Layout, Touch-Bedienung, Zielhilfe; ohne WebGL2 klare Meldung |
| Fahren/Grafik | Direktere Fahrphysik, runde Autos, Staatstheater detailgetreu |
| Spiel | Andreas, schneller gehen/rennen/schwimmen, Cheats repariert, Schutz in der Einleitung, Versionsnummer im Pausebildschirm |

**Pause der Weiterentwicklung** seit dem Release (Nutzerwunsch). Nichts ist halb angefangen.

## Offen / bekannt
- Beim Start auf dem Platz (Intro, Marktstände) bis ~960 Draw-Calls / 2,8 Mio. Dreiecke im iPhone-Profil gemessen – beim Fahren 230–330; prüfen.
- Ladescreen ohne Download-Fortschritt; Web-App lädt beim ersten Besuch das Spiel doppelt (Service-Worker-Install).
- Mindest-Browser (Safari 13.4, wegen `??`) wird nicht geprüft.
- Kosmetik: Maaraue-Freibad karg, Schlossplatz-Pflaster mit hellem Fleck, Theater-Foyer nicht begehbar, Kompaktwagen etwas hoch.
- Notion-Notizen von Paket 7 und 51 noch mit veraltetem Text (Schreiben war blockiert; Nutzer entscheidet).

## Backlog (Notion, ohne Reihenfolge)
Wirtschafts-Modus (Big Ambitions), Verkehr auf dem Wasser, Leihräder, UFO klauen, Paket 43–45 (Biebrich/Schierstein,
Dotzheim/Klarenthal, Bierstadt/Erbenheim), Licht/Spiegelungen. Ältere Handys: geprüft vor v34 (keine Blocker; Ergebnisse in tests/out/alt/, lokal).
