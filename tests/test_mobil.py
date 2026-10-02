# Mobilgeräte (iPhone-Emulation): automatisch Grafik „Niedrig“ ohne Schatten, gespeicherte hohe Stufen werden ignoriert,
# Desktop bleibt bei Ultra. Hintergrund: v32 startete auf einem iPhone 14 Pro nicht.
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
MODE = sys.argv[1] if len(sys.argv) > 1 else 'handy'


async def test(g):
    await g.start()
    q = await g.js(f"()=>({{q:{M}.QUALITY,m:{M}.IS_MOBILE,p:{M}.IS_PHONE,noShadow:!!{M}.QS.noShadow}})")
    if MODE == 'handy':
        g.check('iPhone wird als Handy erkannt', q['m'] and q['p'], q)
        g.check('Handy startet mit Grafik „Niedrig“ ohne Schatten', q['q'] == 'niedrig' and q['noShadow'], q)
    elif MODE == 'handy-ultra':
        g.check('gespeichertes „Ultra“ wird auf dem Handy ignoriert', q['q'] == 'niedrig', q)
    else:
        g.check('Desktop bleibt bei Ultra', q['q'] == 'ultra' and not q['m'], q)
    await g.step(2)
    g.check('Spiel läuft', await g.js(f"()=>{M}.mode") == 'play')

if MODE == 'handy':
    run(test, mobile=True)
elif MODE == 'handy-ultra':
    run(test, mobile=True, init_extra="try{localStorage.setItem('meenz-quality','ultra')}catch(e){}")
else:
    run(test)
