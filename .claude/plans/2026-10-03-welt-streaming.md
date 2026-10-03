# Paket 40.5 – Welt in Abschnitten laden (Handy-Speicher): Messung, Entwurf, Aufwand

Stand 2026-10-03, Branch `feat/w9-stream` (Basis `feat/welle-9`). **Nur Analyse und Plan.** Diese Welle ändert keinen
Produktionscode. Die Umsetzung braucht eine eigene Freigabe (Aufwand s. Abschnitt 9).

Spec (Notion): „Handy-Arbeitsspeicher senken (JS-Heap ~665 MB nach dem Laden, Ziel ≤ 350 MB): nur das Gebiet um den
Spieler (~1–2 km) aufbauen, den Rest beim Hinfahren entpacken und danach wieder freigeben (z. B. Wiesbaden erst beim
Überqueren der Brücke). Download bleibt 6,7 MB einmalig.“ Invarianten 1–4 und Abnahme: `.claude/plans/2026-10-03-welle-9.md`.

---

## 1 Messung (Ist-Stand)

Werkzeug: `tests/manual/mob9.py` (erweitert, s. u.), Server auf 127.0.0.1:8871, `real.html`, Chromium headless,
`__NORENDER`. Handy = iPhone-13-Emulation → `LOWMEM`, Qualität **niedrig** (geprüft: `QUALITY==='niedrig'`).

| Lauf | Ladezeit bis `__MEENZ` | `usedJSHeapSize` nach GC | V8-Objekte (`usedSize`) | ArrayBuffer (`backingStorageSize`) |
|---|---|---|---|---|
| Handy (`mob9.py m`), 2 Läufe | 30,2 s / 27,3 s | **666 / 667 MB** (nach 3 Bildern 668) | 231 MB | 437 MB |
| Desktop (`mob9.py d`, ultra) | 33,6 s | **793 MB** (nach 3 Bildern 803) | 238 MB | 565 MB |
| Handy-Tour Start → Brücke → Wiesbaden Westend → Start | – | 668 → 670 → 673 → 674 → 682 → **684 MB** | | |

Die Maschine war geteilt, Ladezeiten streuen um ±3 s. **Wichtig:** `usedJSHeapSize` enthält in Chromium die
ArrayBuffer-Speicher (Typed Arrays). Fast zwei Drittel des Heaps sind also Rohdaten in Typed Arrays, keine JS-Objekte.

### 1.1 Verursacher (Handy, niedrig, MB)

| # | Verursacher | MB | Herkunft (Messung) |
|---|---|---|---|
| A | **CPU-Kopien der Straßen-/Boden-/Gleis-Meshes**, davon ~200 MB unsichtbar (> 1700 m, `STATIC_LOD`) | **≈ 255** | geoCPU: asphalt 95, sidewalk 52, plaza 32, curb 24, gravel 12, paint 11, grass 7, cobble 2,5, Gleise/sonstige ~20 |
| B | **HG + MFLAG-Kacheln** (24 088 + 6 765 Kacheln à 4 KB) | **126** | `__GRID` |
| C | Gebäude als JS-Objekte (`decodeBuildings` 31, `planBuilding` 23,5, davon Ringe `decRing` ~9) | ≈ 55 | Heap-Sampling |
| G | Straßengraph `buildGraph` (+`nid`) | 34 | Heap-Sampling |
| D | Bäume: `addTree` 23 (127 705 Objekte + `TREE_HASH`), `buildTrees` 15, Instanz-Matrizen ~18 (ArrayBuffer) | ≈ 56 | Sampling + Rechnung |
| O | geparstes OSM-JSON (`OSM.*`, Quelle für alles) | ≈ 25 | `(anon):5133`, Parser |
| S | `buildRoadSegHash` 7,7 · `elevPoly`/`ELEV` (113 020 Zellen) ~7 · Flussmauern (129k + 83k Vertices, nie freigegeben) ~12 · Props/Shops ~5 | ≈ 32 | Sampling, geoCPU |
| R | Rest (three.js, Figuren, Autos, Texturen-Metadaten, Features) | ≈ 85 | |

Die Liste im Vertrag (`decodeBuildings`, `buildGraph`, `addTree`, `planBuilding`, HG) stimmt für die **V8-Objekte**.
Der größte Posten taucht im Sampling aber gar nicht auf: Auf dem Handy registriert `staticMesh()` die Boden- und
Straßen-Meshes und blendet sie jenseits von 1700 m aus. `dropCPU()` gibt die Arrays erst **nach dem GPU-Upload** frei.
Unsichtbare Meshes werden nie hochgeladen. Deshalb liegen ~200 MB Geometrie für Straßen, die man nie sieht, dauerhaft
im RAM. Auf dem Desktop behält `staticMesh` alles (kein `LOWMEM`).

Weitere Messwerte für den Entwurf:
- **HG-Kacheln, RLE** (64 Zeilenoffsets + Läufe à 2 B): 98,7 MB → **10,4 MB** (Faktor 9,5). Alle 24 090 Kacheln zu
  kodieren dauerte 56 ms (Desktop-CPU). **MFLAG, RLE:** 27,7 MB → **4,0 MB** (Faktor 6,9).
- **Dichte:** Im Umkreis von 1000 m um den Start liegen 3223 Gebäude, 4476 Bäume, 4918 Knoten und 651 HG-Kacheln.
  Bei 1500 m sind es 6165 Gebäude und 1471 Kacheln. Wiesbaden-Mitte, 1500 m: 8579 Gebäude. Das ist ≈ 10 % der Welt
  je Umkreis.
- **Straßen-Kacheln (320 m):** 1267 Kacheln mit Boden-/Straßengeometrie, zusammen 5,15 Mio. Vertices. Median
  3068 Vertices je Kachel, Maximum 23 634.
- **Ladephasen** (Handy-Emulation): Texturen 1,4 s · Rhein/Wahrzeichen 0,4 s · Straßennetz 0,2 s · Gebäude
  dekodieren/planen 0,8 s · Fern-/Nah-Gebäude, Straßen- und Boden-Meshes zusammen 0,9 s · Rhein/Bäume/Läden 0,7 s ·
  **Bodentexturen 14,5 s** (Fernansicht 5,3 s, 15 Nahkacheln + Übersichtskarte 9,2 s; Canvas in SwiftShader) ·
  Feature-Setups ~5 s. Die ganze Welt aus den Rohdaten aufzubauen kostet ≈ 3 s. Die Ladezeit bestimmt das Malen der
  Bodentexturen. Dieses Paket ändert daran nichts.

### 1.2 Erweiterung `tests/manual/mob9.py` (in diesem Commit)
`mob9.py m|d [--q niedrig] [--at x,z;…] [--tour] [--top N]`. Neu sind: die Ladezeit, die Qualität, Weltzähler
(`BUILDINGS`, `TREES`, `NODES`, HG-Kacheln, `ELEV` …), `STREAM`-Zustand, **geoCPU** (CPU-Geometrie nach
Kachel/Szene/Lazy, Material und Sichtbarkeit), Heap-Sampling **je Weltaufbau-Phase** (nächster bekannter Aufrufer),
Teleport-Ziele und die Tour mit Heap je Etappe. Das Bild geht nach `tests/out/mob_snap.jpg`, statt in das
Arbeitsverzeichnis.

---

## 2 Grundentscheidung

**Einmal komplett generieren, danach packen, nur in Spielernähe entpacken und bauen.**

Der Boot erzeugt wie heute die ganze Welt aus den OSM-Daten: Planung, HG-Raster, Übersichtskarte, Fernansicht,
Straßengraph. Alle Feature-Wrapper wirken dabei mit (`planBuilding` Altstadt, `planOSMBuilding` Neustadt/Weisenau,
`addTree` Nero/Weisenau). Danach wird **gepackt**:
1. Teure Darstellungen entstehen nur noch im Umkreis der Spieler. Das sind Straßen-, Boden- und Gleis-Meshes sowie
   Baum-Instanzen.
2. Rohdaten fern vom Spieler werden **verlustfrei komprimiert**, nicht verworfen. Das betrifft HG/MFLAG-Kacheln und
   Gebäude-Ringe.

Folge: Alle Abfragen (`hgG/mfG/idx`, `groundY/blocked`, `BUILDINGS`, `ROADS`, `NODES/EDGES`, `AREAS`, `SHOPS`,
`TREES`, `OSM.*`) beantworten **überall** dasselbe wie heute. Fern vom Spieler sind sie nur langsamer. Invariante 1
(≥ 900 m resident) gilt damit trivial weltweit. Invariante 2 (nichts fällt durch den Boden) kann nicht brechen, weil
HG nie fehlt.

**Verworfen:** Weltdaten erst beim Hinfahren aus `OSM` dekodieren, rastern und planen („echtes Lazy-Generieren“). Dafür
spricht wenig, dagegen viel:
- Es spart nur ≈ 1,5 s Ladezeit.
- Feature-Setups schreiben beim Boot weltweit in HG (`p5h_wiwahr` in Wiesbaden, `p4x_flug`, `p6a/b`, `p5l_nero`). Das
  müsste man protokollieren und nachspielen.
- `faceStreet`/`free()` lesen HG und MFLAG der Nachbarkacheln. Ergebnisse würden davon abhängen, was gerade geladen ist.
- `pick()` zieht aus dem globalen `rng` in Reihenfolge aller Gebäude. Neu geplante Fassadenfarben wären also nicht
  reproduzierbar.
- Übersichtskarte und Fernansicht brauchen trotzdem alle Grundrisse.

---

## 3 Was global bleibt, was regional wird

| Daten / Darstellung | Heute | Nach 40.5 |
|---|---|---|
| `OSM.*` (geparstes JSON) | global | **global**. Quelle zum Neu-Dekodieren, Download unverändert 6,7 MB, keine Nachlade-Anfragen |
| `ROADS`, `NODES/EDGES`, `NODE_HASH`, `buildRoadSegHash` | global | **global** (KI-Verkehr, Polizei, Routing, Missionen, Minimap, Kart, Busse, Straba) |
| `AREAS`, `SHOPS`, `SHOP_HASH`, `LAMPS`, `BUS_STOPS`, `ZEBRAS`, `ELEV`, `SOLIDS` | global | **global** (klein oder von vielen Features gelesen) |
| `OVERVIEW` (Karte/Minimap), `GROUND.far` (Fernboden), Hügel, Fernstadt, Rhein-Wasser, Brücken, Wahrzeichen | global | **global** (einmal beim Boot, wie heute) |
| Gebäude-Chunks `CITY.low/high` | regional (1300 m / 280 m) | unverändert regional |
| Bodentexturen `GROUND.tiles` (512 m, 750 m) | regional | unverändert |
| Lazy-Stadtteile `p6_lazy` (350/500 m) | regional | unverändert. Die API bleibt (`lazyZone/…/updateLazy`) |
| **Straßen-, Gehweg-, Bordstein-, Markierungs-, Platz-, Grün-, Gleis-Meshes** | global gebaut, auf dem Handy > 1700 m versteckt | **regional je 320-m-Kachel**: bauen < R_mesh, freigeben > R_mesh + 300 m |
| **Baum-Instanzen** (`buildTrees`) | global, ~1000 InstancedMeshes | **regional je Kachel und Baumart** (gleiche Form: direkte Szenen-Kinder mit `MAT.leaf/bark`) |
| **HG/MFLAG-Kacheln** | global roh | **heiß** (roh) < 1000 m, sonst **kalt** (RLE); Lesen kalt ohne Entpacken, Schreiben entpackt |
| **Gebäude-Datensätze** `BUILDINGS`/`OB` | 66 392 volle Objekte inkl. Ringe | **gleiche Objekte, gleiche Reihenfolge**, aber `poly/holes` werden per Getter aus `OSM.b` dekodiert und nur < 1000 m zwischengespeichert; `b.R` (Closure) fällt weg |
| `TREES` | 127 705 Objekte | **bleibt** (`test_eich` nutzt Indizes, `p6c_oberst` setzt `t.y`) |

Radien (Hysterese je 300 m, Messung immer zum **nächsten** Spieler; geteilter Bildschirm → Vereinigung):

| Ebene | Handy (`LOWMEM`) | Desktop |
|---|---|---|
| Daten heiß (HG/MFLAG roh, Gebäude-Ringe im Cache) | 1000 / 1300 m | 1000 / 1300 m |
| Straßen-/Boden-/Gleis-Meshes, Bäume | **1700 / 2000 m** (= heutiges `STATIC_LOD.R`, Optik unverändert) | **3200 / 3500 m** (= `CITY_LOW_R`) |

Raster: Die **Bau-Einheit ist die bestehende 320-m-Kachel** (`chunkKey`, gleiche Schlüssel wie `CITY.chunks`, Straßen-
und Boden-GBs). Die Daten-Einheit ist die 64-m-HG-Kachel bzw. die 128-m-MFLAG-Kachel. Ein gröberes „Regionsraster“
braucht es nicht: Wiesbaden wird automatisch erst beim Überqueren der Brücke heiß bzw. gebaut, weil es > 2 km entfernt
liegt.

---

## 4 Bausteine (je Phase, in Wert-Reihenfolge)

### A – Straßen/Boden/Gleise je Kachel (−≈ 210 MB)
- `p2c_city.js`: `buildRoads`/`buildGroundMeshes` werden in Kachel-Bauer zerlegt. Ein Index ordnet einmalig beim Boot
  Straßen, Flächen und Gleise ihren Kacheln zu, nach derselben Regel wie heute (Straße → Kachel des mittleren Punkts,
  Fläche → Mitte der BBox, Kante → Knoten A). Die Kachel-Bauer heißen
  `streamRoadLayer(key,layer)` mit `layer ∈ {asp+cob+slab+gravel, sw, curb+paint, ground, rails}` und
  `streamTreeLayer(key)`. Je Ebene entsteht ein **eigenes Arbeitspaket**, damit dichte Kacheln (max. 23 634 Vertices)
  unter der Scheibengrenze bleiben.
- Gebaute Meshes kommen in die Szene. Auf dem Handy laufen sie über `staticMesh` (`dropCPU` nach dem Upload) und werden
  beim Freigeben aus `STATIC_LOD.list` entfernt (`geometry.dispose()`).
- `MANHOLES` und `ZEBRAS`: Positionen werden beim Boot global berechnet (billig), die Kanaldeckel mit eigenem RNG statt
  `Math.random`. Gezeichnet werden sie weiter als ein globales InstancedMesh (klein).
- Flussmauern/Brücken/Uferkappen (`buildRiver/buildBridge`): auf dem Handy `dropCPU` (−≈ 12 MB, Phase E).
- Effekt beim Boot: Die ~255 MB werden **gar nicht erst gebaut**. Auch die **Spitze beim Laden** sinkt (wichtig für
  iOS-Jetsam).

### B – HG/MFLAG kalt komprimieren (−≈ 108 MB)
- `seg_masks.js`: `SGrid` bekommt `rle[]` je Kachel. Kodierung: 64 Zeilenoffsets (Uint16) + Läufe (Wert, Länge).
  - `sgGet` liest aus einer kalten Kachel **ohne Entpacken**: Zeilenoffset, dann ≤ 64 Läufe linear durchsuchen.
  - `sgSet` auf eine kalte Kachel entpackt sie zuerst (heiß). Dadurch funktionieren die Schreib-/Rückbau-Journale von
    `p6d_bretz`, `p6f_momb` und `p6g_weis` unverändert, weil die Werte exakt bleiben.
  - `uni[]` (gleichförmige Kacheln) bleibt wie heute.
- Packen: einmal am Ende des Boots, nach allen Feature-Setups. Dafür kommt `streamPack()` an das Ende der Boot-Zeile in
  `p4e_main.js`. Gepackt werden alle Kacheln außerhalb von 1000 m um den Start, Kosten ≈ 80 ms Desktop, ~0,3 s Handy
  im Ladebildschirm.
- Im Spiel: Heiß-Halten und Wieder-Packen in Zeitscheiben (Abschnitt 5).
- Heiß um alle Spieler plus Vorausschau. So bleibt der heiße Pfad (`blocked/groundY` für Spieler, Fußgänger, Autos)
  ein reiner Array-Zugriff wie heute.

### C – Gebäude-Datensätze schlank (−≈ 22 MB)
- `seg_bld.js`/`p2d_gen.js`: `decodeBuildings` speichert den Index in `OSM.b` (`b.src`). Nach Planung, Raster,
  Übersichtskarte und Fernboden ersetzt ein Getter `poly`/`holes`:
  - Dekodiert wird per `decRing` aus `OSM.b[b.src]`.
  - Gecacht wird nur, solange die Kachel heiß ist (Cache-Liste je Kachel, beim Kaltwerden geleert).
- Die übrigen Felder bleiben unverändert am selben Objekt (`x,z,H,mh,roof,area,name,gid,style,tint,…`). `BUILDINGS`
  behält Länge, Reihenfolge und Identität. Damit bleiben `test_altst` (`BUILDINGS.includes`), `test_nods`, `test_hubi`,
  `test_oberst`, `test_wiwahr` und `test_weis` gültig.
- `b.R` (eine Closure je Gebäude) entfällt, weil es nur in `planBuilding` gebraucht wird.
- Ringe, die Features fern dekodieren (z. B. `jobsFireStation` sucht nur über `name`), werden nicht gecacht. Die Kosten
  sind µs je Gebäude.

### D – Bäume je Kachel (−≈ 28 MB)
- `p2c_city.js`: `buildTrees` baut je Kachel und Baumart. Zufall für Drehung, Skalierung und Farbe kommt aus dem
  Kachel-RNG.
- Die Höhe wird aus `t.y` übernommen. `p6c_oberst` hebt Bäume auf den Wällen an, ein Neubau behält das also.
- `TREES`, `TREE_HASH` und `treeNear` bleiben global (Eich, Gonsenheim, Bretzenheim, Oberstadt).
- Optionaler Nachschritt: `TREE_HASH` auf Zahlen-Schlüssel umstellen (−≈ 5 MB).

### E – Kleinkram (−≈ 15 MB, optional)
`dropCPU` für Fluss-/Brückenmeshes und Ladenschilder auf dem Handy. `ELEV` (113 020 Zellen als `Map` mit Objekten) in
kachelweise Typed Arrays (−≈ 5 MB).

**Erwarteter Heap nach dem Laden (Handy, niedrig):** 666 − A 210 − B 108 − C 22 − D 28 − E 10 ≈ **290 MB**
(Spanne 280–320).
- A+B allein ergeben ≈ 345 MB. Das ist zu knapp für die Abnahme, deshalb gehören C und D zum Paket.
- Während der Fahrt kommen +20–40 MB dazu: noch nicht hochgeladene Geometrie im Sichtkegel und heiße Kacheln vor dem
  Wieder-Packen.
- Desktop (ultra): erwartet ≈ 450–500 MB statt 793 MB.

---

## 5 Zeitscheiben, Vorausschau, Schnellreise

**`updateStream(dt)`** (`p2e_stream.js`):
- Die Zeile wandert in `update()` **hinter** `updatePlayer`, damit die aktuelle Position zählt. Die Lazy-Zonen sind
  davon unabhängig, weil die Daten immer verfügbar sind.
- Ablauf je Bild:
  1. Spielerpositionen und Vorausschau-Punkte bestimmen.
  2. Alle 0,25 s die Soll-Menge je Ebene neu berechnen.
  3. Die Warteschlange abarbeiten, sortiert nach Abstand zum nächsten Spieler- oder Vorausschau-Punkt.
  4. Freigaben und Packen haben eine niedrige Priorität.
- **Budget je Bild:** Handy 6 ms, Desktop 8 ms. Gemessen wird mit `performance.now()`. Nach jedem Arbeitspaket wird
  geprüft, und ein Paket wird nie angefangen, wenn das Budget erschöpft ist.
- Arbeitspakete sind einzeln klein: eine Ebene einer Kachel, 64 HG-Kacheln (de)kodieren oder ein Ring-Cache. Ziel:
  **jedes Paket < 10 ms auf dem Handy**, damit eine Scheibe nie über **30 ms** kommt.
- Messgrößen in `STREAM.timing`: letzte, maximale und p95-Scheibe (Ringpuffer 600), langsamstes Paket mit Name, Zahl
  der Pakete je Bild.

**Vorausschau** (schnelle Fahrzeuge):
- Vorausschau-Punkt = Position + Geschwindigkeit × T.
- Geschwindigkeit: `P.car.vx/vz` für Auto, Motorrad, Boot und Jetski; Flugzeug und Hubschrauber aus `speed`/`h`;
  Jetpack aus der Spielerbewegung.
- T = 3 s am Boden, **6 s in der Luft** (Flugzeug ~90 m/s → 540 m voraus).
- Heiß-Menge und Bau-Priorität nutzen die Kapsel Position→Vorausschau.
- Durchsatz-Rechnung: Bei 90 m/s überstreicht der Rand des 1,7-km-Kreises ≈ 3 Kacheln/s. Bei ~1–5 ms je Ebene genügen
  wenige Pakete je Bild.

**Schnellreise / Teleport:**
- Ein **Sprung** > 250 m zwischen zwei Updates gilt als Teleport. Er wird automatisch erkannt (`fastTravel`,
  Test-Teleports über `P1.h.x/z`, Spielstand laden, Respawn).
- Im Sprung-Bild läuft ein **synchroner Kern**:
  - HG/MFLAG-Kacheln < 300 m heiß (≈ 2 ms);
  - Straßen-/Boden-Ebenen der Kacheln < 450 m bis zu 250 ms. Bei `fastTravel` ist der Bildschirm in dem Moment
    schwarz, dort wird zusätzlich `streamJump(x,z)` als Einzeiler aufgerufen (wie schon `updateCityLOD(…,99,true)`).
- Bleibt danach noch etwas < 450 m offen: Hinweis „Die Gegend lädt …“, bis es fertig ist (Invariante 2: kurzer
  sichtbarer Ladezustand).
- Durch den Boden fallen kann man nicht, weil HG global lesbar bleibt.

---

## 6 Fernansicht ohne Löcher

- Unter allen 3D-Straßen liegen wie heute der globale Fernboden (`GROUND.far`, y = −0,03) und die Nahbodenkacheln. Auf
  beiden sind Straßen, Plätze und Grün **gemalt**. Eine noch nicht gebaute Kachel zeigt also gemalte Straße statt
  Loch. Es fehlen kurz nur Bordsteine und Markierungen.
- Gebaut wird von innen nach außen, deshalb fehlt etwas höchstens am äußeren Rand.
  - Handy: dort blendet `STATIC_LOD` heute schon aus (1700 m).
  - Desktop: 3,2 km im Dunst. Zu prüfen per Screenshot-Vergleich von oben (`shot3.py`/`fly.py`, vorher/nachher).
- Freigabe erst bei R + 300 m (Hysterese), höchstens 4 Freigaben je Bild.
- Gebäude (`CITY.low/high`), Fernstadt und Hügel bleiben unverändert.

---

## 7 Invarianten 1–4 und bestehende Features

1. **Daten ≥ 900 m resident:** Alle Abfragen sind weltweit gültig (Abschnitt 2). Zusätzlich hält `STREAM` die Daten
   < 1000 m heiß. Ein Wrapper um `lazyBuild` zählt `STREAM.zoneBuildsCold`, das sind Zonenbauten, bei denen im Umkreis
   von 900 m noch kalte Kacheln lagen. Erwartet ist 0, der Test prüft es. Gating von `lazyBuild` ist nicht nötig.
2. **Teleport:** Synchroner Kern und HG immer lesbar (Abschnitt 5).
3. **KI, Polizei, Missionen, Karte, Rhein/Brücken, Lazy-Stadtteile `p6a…p6r`, Wahrzeichen:** Sie lesen nur globale
   Daten, die Datenform bleibt (Abschnitt 3).
   - HG-Schreiber in Lazy-Zonen arbeiten über das Entpacken bei `sgSet`.
   - `p6c_oberst` (Baum-Anheben) sucht Baum-InstancedMeshes über `scene.children`. Die Kachel-Bäume bleiben solche
     direkten Kinder, ein Neubau übernimmt `t.y`.
   - `p6q_akk` und `p6r_wiesi` werden nicht angefasst. Sie halten sich laut Vertrag an „Weltdaten nur in `build(Z)`“.
4. **Determinismus:** Neubauten ziehen **nie** aus dem globalen `Math.random`.
   - Kachel-Seed = `streamSeed(ebene, i, j)` mit eigenem `mulberry32`.
   - Der alte Bau-Code (`mr/mpick` in `buildTrees`/Kanaldeckeln) läuft in
     `streamWithRng(seed, fn)` = Tausch von `Math.random` (Muster `gonsRng`).
   - Der globale `rng` (`pick`) kommt in den Kachel-Bauern nicht vor (geprüft).
   - Folge beim Boot: Es werden weniger `Math.random`-Zahlen gezogen. Die Harness setzt den Seed nach `start()` neu,
     die Testfolgen ändern sich also nicht. Trotzdem gehört das zur Prüfliste (s. u.).

---

## 8 Verifikation

**`tests/test_streaming.py`** (über `window.__MEENZ.STREAM`, deterministisch, nur `g.step`). Der Haupttest läuft mit
`mobile=True` (LOWMEM), ein Kurztest auf Desktop.
1. Nach dem Boot am Start:
   - Wiesbaden-Mitte (−2239,−9205) und Westend: Kachelzustand `cold`, keine Straßen-/Baum-Meshes dieser Kacheln in der
     Szene, HG-Kachel dort `rle`.
   - Trotzdem liefert `blockedFn/groundYFn` an 20 festen Punkten dort exakt die Werte, die `STREAM.hgRawAt` (Entpacken
     zum Vergleich) liefert.
2. **Annäherung** über die Theodor-Heuss-Brücke in 150-m-Schritten mit `g.step`: Spätestens bei 1700 m Abstand sind die
   Kacheln gebaut. Bei < 1000 m sind die HG-Kacheln `raw`. `timing.max ≤ 30 ms`.
3. **Schnellreise** (`fastTravel` auf ein Wiesbaden-Ziel), danach ein `g.step`:
   - Alle Kacheln < 450 m sind gebaut.
   - Spieler-y ≈ `groundY`, nicht im Wasser.
   - Ein mitgenommenes Auto fällt nicht (y stabil über 2 s).
4. **Wegfahren:** Teleport zurück zum Start und `g.step`, bis die Warteschlange leer ist. Danach ist Wiesbaden frei
   (`disposes ≥ 1`, Meshes aus der Szene, HG wieder `rle`). `STREAM.stats.cpuGeoBytes` sinkt.
5. **Erneut hin:** Der Hash je Kachel ist identisch, ebenso die Zahl der Meshes und Vertices, die Positionssummen, die
   Bauminstanzen und die CRC der HG-Kachel.
6. **Kein globales `Math.random`:** Ein Zähler-Wrapper um `Math.random` während eines erzwungenen Neubaus ergibt 0
   Aufrufe aus `updateStream`.
7. **Lazy-Zonen:** Teleport zu einer Zone fern vom Start (Gonsenheim, Weisenau) → die Zone ist gebaut und
   `zoneBuildsCold === 0`.
8. Kein `#errbox`, keine Konsolenfehler (Harness).

`test.html` nutzt den three-Stub (Proxy, keine echten Arrays). Deshalb rechnet `STREAM` den Kachel-Hash auf den
**GB-Daten**, also auf eigenem JS vor `geo()`: Vertex-Zahl und Positionssumme je Ebene sowie die Bauminstanzen aus der
Liste. Er wird im Kachel-Eintrag gespeichert und ist so unter Stub und echtem three.js gleich. Die Scheiben-Zeiten aus
`test.html` sind eine Desktop-Untergrenze. Die belastbaren Werte liefert das gedrosselte `stream_tour.py` auf
`real.html`.

**Manuell:**
- `mob9.py m` (niedrig): nach dem Laden **≤ 350 MB** (erwartet ≈ 290). Mit `--tour` bleibt jede Etappe ≤ 380 MB, und
  zurück am Start ist der Wert ≈ der Startwert (keine Leaks).
- `mob9.py d`: Ladezeit ≤ heute (33,6 s ± 3).
- Neues Skript `tests/manual/stream_tour.py`: CPU-Drosselung ×4 per CDP (`Emulation.setCPUThrottlingRate`), 60 s Fahrt
  Start → Brücke → Wiesbaden mit Auto, dann ein Flug. Ausgabe: Scheiben-p95/max und das langsamste Paket. Die Werte
  kommen in den Bericht.
- Screenshots (`real=True` bzw. `shot3.py hoch` und `niedrig`) vom Start, vom Brückenkopf Kastel und aus 300 m Höhe,
  jeweils vorher/nachher, selbst angesehen: keine Lücken am nahen Rand.

**Regressionen** (sequentiell, ein Aufruf):
`python3 tests/run.py streaming all ft altst neust oberst bretz gons momb weis eich wiwahr rh fahrphysik`, nach dem
Merge der Stadtteile zusätzlich `akk wiesi`. Danach einmal `test_haltung`, `test_mobil` und `test_nods`.

**Tests, deren Annahme fallen könnte:** keine erwartet, weil Datenform und Identität bleiben. Beobachtet werden:
- `test_eich`: Kronenhöhe hängt von `t.s` ab, nicht von der Instanz-Skalierung. Prüfen.
- `test_oberst`: Baum-Anheben nach Kachel-Neubau.
- `test_altst`: Fassaden brauchen `b.poly` über den Getter.
- Alles, was beim Boot geseedeten Zufall voraussetzt (Kart-Strecke, geparkte Autos).

Jede Anpassung wird einzeln begründet, Checks werden nie gelockert.

---

## 9 Aufwand (Schätzung, ein Agent)

| Phase | Inhalt | Dateien | Umfang | Zeit |
|---|---|---|---|---|
| A | Kachel-Index, Kachel-Bauer Straßen/Boden/Gleise, `STREAM`-Kern (Soll-Menge, Warteschlange, Budget, Vorausschau, Sprung), `staticMesh`-Abmeldung | `p2e_stream.js` (neu, ~300 Z.), `p2c_city.js` (~120 Z. umgebaut), `p2d_gen.js`, `p4e_main.js` (Boot-Zeile, `updateStream`-Position), `p4u_travel.js` (Einzeiler) | groß | 1 Tag |
| B | RLE-Kacheln, kaltes Lesen, Entpacken beim Schreiben, Packen beim Boot und in Scheiben | `seg_masks.js` (~80 Z.), `p2e_stream.js` | mittel | ½ Tag |
| C | Gebäude-Ringe als Getter, Ring-Cache je Kachel, `b.R` weg | `seg_bld.js`, `p2d_gen.js`, ggf. `seg_paint.js` | mittel, Risiko durch 11 Nutzer | ½ Tag |
| D | Bäume je Kachel und Art mit Kachel-RNG und `t.y` | `p2c_city.js`, `seg_trees.js` | klein | ¼ Tag |
| E | `dropCPU` Fluss/Brücken/Schilder, `ELEV` kompakt (optional) | `p2c_city.js`, `seg_shops.js`, `p3_actors.js` | klein | ¼ Tag |
| V | `test_streaming.py`, `stream_tour.py`, Messungen, Screenshots, Regressionsliste (~30–40 min Maschinenzeit) | `tests/…` | mittel | ½–1 Tag |

**Summe ≈ 3 Agent-Tage.** Empfohlen sind zwei Wellen:
1. **A+B+V** zuerst. Das bringt den Großteil (≈ 345 MB) und ist risikoarm, weil sich die Datenform nicht ändert.
2. Danach **C+D+E** für den Puffer auf ≈ 290 MB.

`three-stub.js` braucht vermutlich nur `InstancedMesh.dispose`/`BufferGeometry.dispose` als No-op. Das wird vor dem
Bau geprüft.

---

## 10 Risiken und offene Punkte

- **Messung ≠ iPhone:** Die Zahlen stammen aus der Chromium-Emulation. WebKit rechnet ArrayBuffer anders ab, die
  relativen Einsparungen gelten aber. Die GPU-Speicher sind nicht enthalten. Die Abnahme bleibt `mob9.py m`, und der
  `web-tester` misst zusätzlich auf WebKit.
- **Kaltes Lesen in Schleifen:** Missionen oder Features, die fern viele `blocked()`-Abfragen machen (`freeSpot` bei
  2 km entfernten Zielen), sind langsamer: Lauf-Suche statt Array, geschätzt 5–10× je Abfrage, absolut µs. Wenn ein
  Feature Tausende Abfragen fern macht, wird die Kachel bei Bedarf heiß gemacht (LRU, max. 256 Extra-Kacheln).
- **Upload-Spitzen:** Neue Meshes werden beim ersten Rendern hochgeladen, das zählt nicht in die JS-Scheibe. Die
  Begrenzung auf wenige Pakete je Bild verteilt die Last. Gemessen wird im gedrosselten Tour-Skript (Frame-Zeit, nicht
  nur Scheibe).
- **Desktop-Optik jenseits 3,2 km** (3D-Straßen → gemalter Fernboden): Abhilfe ist ein Desktop-Radius von ∞ für die
  Mesh-Ebenen, dann bleibt aber der Desktop-Speicher wie heute. → **Entscheidung team-lead** (Empfehlung: 3,2 km +
  Screenshot-Vergleich).
- **Handy-Radius:** 1700 m (Optik wie heute) oder 1300 m (= `CITY_LOW_R` bei niedrig; −≈ 15 MB Spitze, Ring
  1,3–1,7 km nur gemalt). Empfehlung: 1700 m.
- **Boot-Zufall:** Weniger `Math.random`-Zahlen beim Boot verschieben ungeseedete Boot-Folgen (z. B. Autofarben beim
  Start). Abgedeckt durch die Regressionsliste.
- **Bestehende Hänger außerhalb des Pakets:** Eine Nahbodenkachel (`groundTileMesh`) kostet in SwiftShader ~0,6 s
  Canvas-Malen. Das ist ein bestehender Hänger, den 40.5 nicht verursacht und nicht löst. Er wird im Tour-Skript
  getrennt ausgewiesen.
- **Lazy-Zonen mit Weltbezug über Dispose hinweg:** Vertragswidrige Referenzen auf `b.poly`-Arrays bleiben gültig, weil
  ein Getter-Ergebnis ein eigenes Array ist. Sie belegen aber Speicher, bis die Zone freigibt.
- **Spitze beim Laden** sinkt nur durch A. B packt erst am Boot-Ende, die 126 MB Raster existieren also kurz voll. Bei
  Bedarf kann man nach jedem Raster-Schritt packen, mit ≈ 0,3 s mehr Ladezeit auf dem Handy.
