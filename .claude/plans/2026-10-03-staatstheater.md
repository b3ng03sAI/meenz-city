# Staatstheater Mainz (Großes Haus) – detailliertes Modell

Branch `feat/theater` (vom lokalen `main`). Datei `game/p6q_theater.js` (Präfix `theat`/`THEAT`), Test `tests/test_theater.py`.

## 1. Recherche (Quellen)

| Punkt | Befund | Quelle |
|---|---|---|
| Architekt / Epoche | Georg Moller, erbaut 1829–1833, klassizistisch; Eröffnung 21.09.1833 | de/en Wikipedia „Staatstheater Mainz“ |
| Grundidee | erstmals wurde das **Halbrund des Zuschauerraums nach außen** gezeigt (Vorbild Kolosseum) | de.wikipedia.org/wiki/Staatstheater_Mainz |
| Umbauten | 1910–12 Foyer-Vorbau (Stadtbaumeister Adolf Gelius), Rundung ging dabei verloren; 1942 Bombenschaden, Wiederaufbau 1949–51 (Richard Jörg); 1976/77 Oesterlen: „Moller-Rotunde wiederhergestellt“; 1998–2001 Entkernung hinter den geschützten Fassaden | de/en Wikipedia; mainz.de/…/sehenswertes/staatstheater |
| Dachaufbau heute | **gläserne Rotunde** („Glaskuppel“) auf dem Dach, bis 2009 Restaurant, seit 2012 Studiobühne „Glashaus“ | de.wikipedia; mainz.de |
| Foyer | folgt der Rundung des Moller-Baus über 5 Ebenen, von den **Arkaden am Gutenbergplatz** bis zum Glasaufbau und der Dachterrasse | Suchtreffer world-architects.com/…/staatstheater-mainz-1 (Seite selbst 403) |
| Reliefs | Reliefs „Komödie“ und „Tragödie“ (Ludwig Lipp) | mainz.de |

Fotos auf Wikimedia Commons (nur angesehen, nichts übernommen – Modell ist eigener Code):
`File:Staatstheater Mainz - Frontansicht.jpg`, `File:Mainz Staatstheater Großes Haus.jpg`, `File:Staatstheater - Mainz - Germany 2017.jpg`,
`File:Mainz Theater bei Nacht.JPG`, `File:MainzTheaterplatz20200410.jpg`, `File:Alte-Uni+Mainzer-Dom+Staatstheater-vom-Bonifaziusturm-A-741-a.jpg`
(https://commons.wikimedia.org/wiki/Category:Staatstheater_Mainz). Daraus abgelesen (Maße über die Arkadenbreite ≈ 4,7 m geschätzt):

- **Schauseite**: flach gekrümmte (Segment-)Rundung mit **5 Achsen** zwischen zwei vorspringenden **Eckpavillons**. Roter Mainsandstein.
- **EG** (≈ 0–7 m): grobes **Bossenwerk/Rustika**, **5 Rundbogenarkaden** (offen, Türen zurückgesetzt), kräftige Keilsteine,
  darüber Konsolen, die ein Balkon-Gesims tragen. Davor eine **Freitreppe** (~6 Stufen, ~1 m) über die ganze Breite.
- **OG** (≈ 7–15,5 m): **5 hohe Rundbogenfenster** mit kleinen Balkonen (Eisengitter), dazwischen flache **Lisenen/Pilaster**
  mit einfacher Basis/Kapitell; Quaderwerk (glatter als das EG).
- **Gebälk** (≈ 15,5–17,4 m): Architrav, Fries mit Konsolen, kräftiges Kranzgesims; darüber **Balustrade** (Docken, Pfeiler) bis ≈ 19 m.
- **Pavillons**: EG Rustika mit kleinem Rechteckfenster + Schaukasten („Staatstheater Mainz“), OG glatte Fläche mit **Relief**
  (Masken/Figuren) unter dem Gesims; darüber ein **Turmgeschoss** mit Dreifachfenster, Traufgesims ≈ 21,5 m,
  flaches **Zeltdach (Zink, grau)** mit Kugel-Spitze, First ≈ 24–25 m.
- **Glas-Rotunde** auf dem Dach: Zylinder Ø ≈ 31 m, ≈ 17,5–27,5 m, horizontale Bänder + schlanke Pfosten, dünner Dachrand;
  abends hell erleuchtet (Nachtfoto).
- **Seiten/Hinterhaus**: EG Rustika, darüber rosa Putz mit Sandstein-Fensterrahmen, 4 Geschosse; dahinter höherer Baukörper mit Mansarddach, Bühnenturm.
- **Schriftzug**: auf allen Fotos **kein fester Schriftzug** an der Fassade – nur wechselnde Banner am Balkongesims und
  Schaukästen mit „Staatstheater Mainz“. → Konservativ: Banner „STAATSTHEATER MAINZ“ am Balkongesims (dort hängen real die Banner)
  plus Schaukasten-Schilder. Kein erfundenes Logo.

Unklar/abweichend: OSM gibt der Front nur 13,6 m (4 Geschosse, geschätzt) – Fotos zeigen ~17 m Gesims + Balustrade; ich nehme die Foto-Maße.
OSM-Turmteile sind 6,8 m breit, auf Fotos wirken die Pavillons etwas breiter → Pavillon 7,3 m (Mittelweg). Farbe/Material nach Fotos (keine Textquelle).

## 2. OSM-Daten (Relation/gid 23655731 „Staatstheater“, 7 Teile)
Lokaler Rahmen: Ursprung = Mitte der Rotunde C = (−199,7 | −64,0), vorne f = (0,4202 | 0,9074) (zum Gutenbergplatz, grob Süd-Südost), seitlich u = (0,9074 | −0,4202).

| Teil | lokal (u, v) | Höhe OSM |
|---|---|---|
| Rotunde (Kreis) | r ≈ 15,9 um C | 28 m |
| Front-Sichel | Außenkante Bogen r ≈ 27 um C, u ±11,5, innen r ≈ 19,4 | 13,6 m |
| Eck-Türme | u ±(9,9…16,7), v 16,7…23,6 | 25 m, Zeltdach |
| Seitenflügel/Ring | u ±(16,6…19,8), v 0…18,6 | 13,6 m |
| Hinterhaus | u ±30, v −36…0 | 29 m, Mansarde |
| Bühnenturm | u ±12, v −27…−11,6 | 38 m, Satteldach |

Startpunkt (−150|−30) liegt lokal bei u ≈ 31, v ≈ 52 → schräg vor der Fassade, ~60 m.

## 3. Umsetzung
- `LM_SKIP.add(23655731)` → alle 7 OSM-Teile weg; Ersatz komplett aus eigenem Code (Wrapper um `buildLandmarks`, wie `p5h_wiwahr.js`).
- Ein Mesh pro Material (Sandstein-Quader, Rustika, Putz, Glas, Metall, Schrift, Relief) → ≈ 7 Draw-Calls; „niedrig“: weniger Segmente,
  keine Docken/Konsolen/Pfosten, Relief → Sandstein; Ziel ≤ 25 / ≤ 10.
- Texturen prozedural (Canvas), `freeAfterUpload`; Meshes `staticMesh()`.
- Kollision: eigene Grundriss-Polygone (Bogen r=27, Pavillons, Seiten, Hinterhaus) per `rasterPoly`; Freitreppe als `STEP_FNS`-Funktion
  (begehbar), Platz davor frei. Übersichtskarte: `SOLIDS` mit h=0.
- Abend: Fenster-/Rotundenglas und Arkadentüren über `nightMat`, Sandstein mit schwachem warmem Anstrahl-Glimmen.

## 4. Verifikation
- `tests/test_theater.py`: Position/Ausrichtung (Front zeigt zum Platz), BBox ≈ OSM-Grundriss (±4 m), OSM-Gebäude nicht in `BUILDINGS`,
  Wände blockieren, Platz/Treppe begehbar (Treppenhöhe), Draw-Calls ultra ≤ 25 und niedrig ≤ 10, kein errbox.
- `python3 tests/run.py theater all version`.
- Screenshots real.html: Startpunkt, Nahansicht Fassade, Abend, WebKit iPhone 14 Pro „niedrig“. Heap vorher/nachher mit `mob9.py m`.

## 5. Ergebnis (2026-10-03)
- Draw-Calls: ultra 7, niedrig 6 (ein Mesh je Material: Sandstein, Rustika, Putz, Glas, Metall, Relief, Schrift).
- Handy-Heap (`mob9.py m`, eigener Port): Laden 667 → 667 MB, nach Rendern 668 → 670 MB (usedSize +0,85 MB).
- Tests: `test_theater` 24/24, `test_all` 18/18, `test_version` 5/5, zusätzlich `test_ft` 17/17 (Schnellreise „Staatstheater & Höfchen“).
- Screenshots `tests/out/theater_{start,nah,abend,luft}.jpg` (real.html ultra), `theater_iphone_{start,nah}.jpg` (WebKit iPhone 14 Pro, niedrig).
- Offen: Foyer hinter den Arkaden nicht modelliert (Arkaden 1,6 m tief, Türen geschlossen); Fahnenmasten auf dem Platz weggelassen.
