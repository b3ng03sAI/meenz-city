# Laden ohne DecompressionStream (alte iPhones): Fallback gunzip_small entpackt die OSM-Daten
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'


async def test(g):
    g.check('DecompressionStream fehlt', await g.js("()=>typeof DecompressionStream") == 'undefined')
    await g.start()
    n = await g.js(f"()=>{M}.BUILDINGS.length")
    g.check('Gebäude aus den OSM-Daten geladen', n > 60000, n)
    g.check('Spiel läuft', await g.step(1) == 'play')

run(test, init_extra='delete window.DecompressionStream;')
