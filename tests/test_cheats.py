# Cheat-Codes (p4z_waffen.js): blind eintippen während des Spiels – auf US- und auf deutscher QWERTZ-Tastatur.
# Auf QWERTZ liefert die Z-Taste e.code 'KeyY' (und umgekehrt) – Cheats müssen nach dem Buchstaben (e.key) gehen.
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
QWERTZ = {'Z': 'KeyY', 'Y': 'KeyZ'}


async def type_code(g, word, layout):
    """Tippt ein Wort als echte keydown/keyup-Ereignisse; layout 'de' vertauscht die physischen Codes von Y/Z."""
    for ch in word:
        code = QWERTZ.get(ch, 'Key' + ch) if layout == 'de' else 'Key' + ch
        await g.js(f"""()=>{{for(const t of ['keydown','keyup'])window.dispatchEvent(new KeyboardEvent(t,{{key:'{ch.lower()}',code:'{code}',bubbles:true}}))}}""")
    await g.step(0.1)


async def test(g):
    await g.start()
    for layout in ('us', 'de'):
        await g.js(f"()=>{{const P={M}.P1;P.h.health=20;P.armor=0}}")
        await type_code(g, 'HELAU', layout)
        hp = await g.js(f"()=>[{M}.P1.h.health,{M}.P1.armor]")
        g.check(f'HELAU ({layout}): Gesundheit + Weste voll', hp == [100, 100], hp)

        await g.js(f"()=>{{const P={M}.P1;P.armor=0;for(const k in (P.ammo||{{}}))P.ammo[k]=0}}")
        await type_code(g, 'MEENZERWAFFE', layout)
        w = await g.js(f"()=>{{const P={M}.P1;return {{armor:P.armor,n:Object.keys(P.ammo||{{}}).filter(k=>P.ammo[k]>0).length,owned:(P.weapons||[]).length}}}}")
        g.check(f'MEENZERWAFFE ({layout}): Waffen + Weste', w['armor'] == 100 and (w['n'] >= 10 or w['owned'] >= 10), w)

        n0 = await g.js(f"()=>{M}.CARS.filter(c=>c.T&&c.T.name&&/flug/i.test(c.type||c.T.name)).length")
        await type_code(g, 'FLIEGEMAA', layout)
        n1 = await g.js(f"()=>{M}.CARS.filter(c=>c.T&&c.T.name&&/flug/i.test(c.type||c.T.name)).length")
        g.check(f'FLIEGEMAA ({layout}): Flugzeug erscheint', n1 == n0 + 1, [n0, n1])
    g.check('Karte nach dem Cheat wieder zu (M öffnet sie beim Tippen)', await g.js(f"()=>{M}.mode") == 'play')
    n0 = await g.js(f"()=>{M}.CARS.filter(c=>c.T&&c.T.jetski).length")
    await type_code(g, 'JETSKI', 'de')
    n1 = await g.js(f"()=>{M}.CARS.filter(c=>c.T&&c.T.jetski).length")
    g.check('JETSKI: Jetski liegt am Wasser', n1 == n0 + 1, [n0, n1])
    await type_code(g, 'UFOKOMMT', 'de')
    g.check('UFOKOMMT: UFO-Ereignis startet', await g.js(f"()=>!!({M}.UFO&&{M}.UFO.on)"))
    # im Menü (nicht im Spiel) wirkt nichts
    await g.js(f"()=>{{const P={M}.P1;P.h.health=20}}")
    await g.key('Escape'); await g.step(0.1)
    await type_code(g, 'HELAU', 'us')
    g.check('im Pausemenü wirkt kein Cheat', await g.js(f"()=>{M}.P1.h.health") == 20)

run(test)
