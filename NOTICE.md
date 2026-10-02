# Lizenzen und Urheberrechte

**Meenz City** © 2026 Benjamin Karla

## Spiel (Code und Inhalte)
Der Quellcode und alle Spielinhalte (Texte, Dialoge, Missionen, Figuren, prozedurale Grafiken und Klänge) stehen unter der
**GNU Affero General Public License v3.0** (nur diese Version, SPDX `AGPL-3.0-only`) – Volltext in [`LICENSE`](LICENSE).

Wer das Spiel verändert und anderen über ein Netzwerk zugänglich macht (z. B. als Webseite oder Artifact), muss ihnen
den vollständigen Quellcode der veränderten Fassung unter derselben Lizenz anbieten (AGPL §13). Das Spiel zeigt dafür im
Startbildschirm einen Link auf den Quellcode; bei eigenen Fassungen auf das eigene Repository umstellen.

## Kartendaten
`game/p1_osm.js` (und die daraus eingebetteten Daten in den gebauten HTML-Dateien) enthält Daten aus OpenStreetMap:
**© OpenStreetMap-Mitwirkende**, verfügbar unter der **Open Database License (ODbL) 1.0** –
Volltext in [`licenses/ODbL-1.0.txt`](licenses/ODbL-1.0.txt), siehe https://www.openstreetmap.org/copyright.
Abgeleitete Datenbestände müssen ebenfalls unter der ODbL weitergegeben werden.

## Eingebettete Fremdbestandteile (im gebauten Spiel enthalten, keine Anfragen an Dritte)
- [three.js](https://threejs.org) r160 inkl. Addons (`examples/jsm`) – MIT-Lizenz, © 2010–2023 three.js authors,
  Volltext in [`licenses/MIT-three.js.txt`](licenses/MIT-three.js.txt). Quelle: `node_modules/three` (gepinnt per `package-lock.json`).
- Schriften „Bungee“ (© 2023 The Bungee Project Authors) und „Barlow Condensed“ (© 2017 The Barlow Project Authors) –
  SIL Open Font License 1.1, Volltexte in [`licenses/OFL-Bungee.txt`](licenses/OFL-Bungee.txt) und
  [`licenses/OFL-BarlowCondensed.txt`](licenses/OFL-BarlowCondensed.txt); Dateien in `game/fonts/` (lateinischer Zeichensatz).

## Hinweise
Fan-Projekt ohne Verbindung zu den Städten Mainz und Wiesbaden oder anderen Institutionen. Alle Personen in Dialogen und
Missionen sind frei erfunden; Ähnlichkeiten mit lebenden Personen sind nicht beabsichtigt. Echte Orts- und Straßennamen
dienen nur der Orientierung. Marken- und Produktnamen Dritter werden bewusst nicht verwendet.
