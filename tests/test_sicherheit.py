# Security-Audit F1: OSM-Texte und Spielstand-Felder dürfen nie als HTML wirken.
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
EVIL = '<img src=x onerror="window.__pwned=1">'


async def test(g):
    await g.start()
    g.check('OSM-Säuberung lief beim Laden', await g.js(f"()=>typeof {M}.OSM_SANITIZED==='number'"))
    bad = await g.js(f"""()=>{{const M={M};let n=0;for(const s of M.SHOPS)if(/[<>]/.test(String(s.name||'')))n++;return n}}""")
    g.check('kein Ladenname enthält spitze Klammern', bad == 0, bad)

    # manipulierter Spielstand: Text-Felder werden escaped, falsche Typen verworfen
    r = await g.js(f"""(evil)=>{{const M={M};localStorage.setItem('meenz-save-2',JSON.stringify({{v:2,t:Date.now(),money:5,zone:evil,done:{{}}}}));
        localStorage.setItem('meenz-save-3',JSON.stringify({{v:2,t:'nope',money:'<b>x</b>',zone:'Kastel'}}));
        M.saveGame(1,true);const box=document.getElementById('slots');
        return {{img:!!box.querySelector('img'),pwned:!!window.__pwned,text:box.textContent.includes('<img'),bad:box.textContent.includes('<b>x</b>')}}}}""", EVIL)
    g.check('Spielstand-Zone wird als Text angezeigt, nicht als HTML', r['text'] and not r['img'] and not r['pwned'], r)
    g.check('Spielstand mit falschen Typen wird verworfen', not r['bad'], r)
    await g.step(0.5)
    g.check('kein eingeschleuster Code ausgeführt', not await g.js("()=>!!window.__pwned"))

run(test)
