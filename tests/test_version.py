# Versionsnummer im Pausebildschirm: kommt beim Bauen aus package.json (+ git-Stand), nie der Platzhalter.
import json, os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VER = json.load(open(os.path.join(ROOT, 'package.json')))['version']


async def test(g):
    await g.start()
    txt = await g.js("()=>(document.getElementById('pausever')||{}).textContent||''")
    g.check('Pausebildschirm zeigt die Version aus package.json', f'Version {VER}' in txt, txt)
    g.check('kein Platzhalter mehr im Spiel', '__MEENZ_VERSION__' not in await g.js("()=>document.documentElement.innerHTML.slice(0,200000)"))
    await g.key('Escape')
    await g.step(0.2)
    vis = await g.js("()=>{const p=document.getElementById('pause'),v=document.getElementById('pausever');return !p.hidden&&v.offsetHeight>0}")
    g.check('Version ist im geöffneten Pausemenü sichtbar', vis)

run(test)
