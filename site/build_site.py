"""GitHub-Pages-Ausgabe: das Release (game/meenz-city.html) als installierbare Web-App nach dist/.

Aufruf (nach `cd game && python3 build.py`):  python3 site/build_site.py [ausgabeordner]
"""
import hashlib, json, os, shutil, sys

SITE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SITE)
OUT = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, 'dist')

game = open(os.path.join(ROOT, 'game', 'meenz-city.html'), encoding='utf-8').read()
version = json.load(open(os.path.join(ROOT, 'package.json'), encoding='utf-8'))['version']
icons = sorted(os.listdir(os.path.join(SITE, 'icons')))
files = ['./', 'manifest.webmanifest'] + ['icons/' + f for f in icons]

h = hashlib.sha256(game.encode('utf-8'))
for f in ('sw.js', 'manifest.webmanifest', 'pwa.js'):
    h.update(open(os.path.join(SITE, f), 'rb').read())
build = version + '-' + h.hexdigest()[:10]

head = f"""<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="description" content="GTA-artiges Open-World-Spiel in Mainz und Wiesbaden – im Browser, auf Meenzerisch.">
<meta name="theme-color" content="#0b0d10">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Meenz City">
<meta name="meenz-build" content="{build}">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<script>{open(os.path.join(SITE, 'pwa.js'), encoding='utf-8').read()}</script>
</head>
<body>
"""
page = head + game + '\n</body>\n</html>\n'

if os.path.exists(OUT):
    shutil.rmtree(OUT)
os.makedirs(os.path.join(OUT, 'icons'))
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(page)
for f in icons:
    shutil.copy(os.path.join(SITE, 'icons', f), os.path.join(OUT, 'icons', f))
shutil.copy(os.path.join(SITE, 'manifest.webmanifest'), OUT)
sw = open(os.path.join(SITE, 'sw.js'), encoding='utf-8').read()
sw = sw.replace('__BUILD__', build).replace('__FILES__', json.dumps(files))
open(os.path.join(OUT, 'sw.js'), 'w', encoding='utf-8').write(sw)
open(os.path.join(OUT, '.nojekyll'), 'w').close()
print(f'dist: Version {build}, {len(page) // 1024} KB, {len(files)} Dateien im Offline-Cache')
