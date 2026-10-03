# Staatstheater Mainz: Modell an der OSM-Stelle, Front zum Gutenbergplatz, OSM-Block ersetzt, Kollision, Treppe, Draw-Calls
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run, INIT, BASE

M = '__MEENZ'
OSM_C = (-199.7, -64.0)   # Mitte der Rotunde (OSM-Teil, Kreis r≈15,9)
START = (-150, -30)       # POI.start


async def test(g):
    await g.start()
    T = await g.js(f"()=>{{const T={M}.THEAT;return {{built:T.built,low:T.low,draws:T.draws,meshes:T.meshes.length,C:T.C,F:T.F,R:T.R,osm:T.osm,bbox:T.bbox,parts:T.nParts,stairs:T.stairs,vis:T.meshes.filter(m=>m.visible).length}}}}")
    g.check('Theater gebaut', T['built'] and T['meshes'] > 0, T['meshes'])
    g.check('alle 7 OSM-Teile gefunden', T['parts'] == 7, T['parts'])
    g.check('Rahmen aus OSM: Rotunden-Mitte', abs(T['C'][0] - OSM_C[0]) < 2 and abs(T['C'][1] - OSM_C[1]) < 2, T['C'])
    # Front zeigt zum Platz/Startpunkt (F · (Start − C) deutlich positiv)
    d = (START[0] - T['C'][0], START[1] - T['C'][1]); L = (d[0] ** 2 + d[1] ** 2) ** 0.5
    dot = (T['F'][0] * d[0] + T['F'][1] * d[1]) / L
    g.check('Schauseite zeigt zum Gutenbergplatz', dot > 0.7, round(dot, 2))
    # Umriss passt zum OSM-Grundriss (Treppe ragt ~2 m vor)
    o, b = T['osm'], T['bbox']
    diffs = [b[0] - o[0], b[2] - o[1], b[3] - o[2], b[5] - o[3]]
    # Freitreppe ragt vorn (F zeigt nach +x/+z) um ihre Tiefe über den Grundriss hinaus
    dep = T['stairs']['depth']; tol = [4, 4, 4 + dep, 4 + dep]
    g.check('Bounding-Box ≈ OSM-Grundriss (±4 m, vorn + Treppe)', all(abs(x) < t for x, t in zip(diffs, tol)), [round(x, 1) for x in diffs])
    g.check('Höhe 35–40 m (Bühnenturm, OSM 38 m)', 35 < b[4] < 40, round(b[4], 1))
    left = await g.js(f"()=>{M}.BUILDINGS.filter(b=>b.gid===23655731).length")
    g.check('generischer OSM-Block entfernt', left == 0, left)
    # Draw-Calls (ultra/Desktop)
    g.check('ultra: ≤ 25 Draw-Calls', T['draws'] <= 25 and not T['low'], T['draws'])

    # Kollision: Wände massiv, Platz davor frei, Treppe begehbar mit Stufenhöhe
    W = lambda u, v: g.js(f"([u,v])=>{M}.THEAT.world(u,v)", [u, v])
    blk = lambda p, y=0: g.js(f"([x,z,y])=>{M}.blockedFn(x,z,y)", [p[0], p[1], y])
    gy = lambda p, y=0: g.js(f"([x,z,y])=>{M}.groundYFn(x,z,y)", [p[0], p[1], y])
    for nm, u, v in [('Fassade Mitte', 0, 25.5), ('Pavillon', 15, 22), ('Seitenflügel', 19, 8), ('Hinterhaus', 0, -20), ('Rotunde', 0, 5)]:
        p = await W(u, v)
        g.check(f'Wand blockiert: {nm}', await blk(p, 0), [round(x) for x in p])
    for nm, u, v in [('Platz 8 m vor der Treppe', 0, 37), ('Platz vor Pavillon', 15, 33)]:
        p = await W(u, v)
        g.check(f'frei: {nm}', not await blk(p, 0), [round(x) for x in p])
    top = await W(0, 27.15); bot = await W(0, 29.0)
    g.check('oberste Stufe ≈ 1 m, begehbar', abs(await gy(top, 1.0) - T['stairs']['top']) < 0.05 and not await blk(top, 1.0), await gy(top, 1.0))
    g.check('unterste Stufe 0,17 m', abs(await gy(bot, 0) - 0.17) < 0.02, await gy(bot, 0))

    # Spieler läuft vom Platz die Treppe hoch bis an die Arkaden (nicht hinein in die Wand)
    p0 = await W(0, 34)
    await g.js(f"([x,z])=>{{const P={M}.P1,h=P.h;h.x=x;h.z=z;h.y=0;const F={M}.THEAT.F;h.facing=Math.atan2(-F[0],-F[1]);P.cam.yaw=h.facing;}}", p0)
    await g.step(0.3)
    yaw = await g.js(f"()=>{M}.P1.h.facing")
    await g.key('KeyW', hold=3.0, after=0.5)
    pos = await g.js(f"()=>{{const h={M}.P1.h;return [h.x,h.z,h.y,...{M}.THEAT.local(h.x,h.z)]}}")
    g.check('Spieler ist die Treppe hoch bis in die Arkade gelaufen', 25.3 < pos[4] < 29.5 and pos[2] > 0.8, [round(x, 2) for x in pos])
    pier = await g.js(f"()=>{{const T={M}.THEAT,bay=2*T.TH/5,t=-T.TH+bay;return T.world(26*Math.sin(t),26*Math.cos(t))}}")
    g.check('Pfeiler zwischen den Arkaden massiv', await blk(pier, 1.02), [round(x) for x in pier])

    # Stufe „niedrig“ in einer zweiten Seite (Qualität aus localStorage)
    pg = await g.page.context.new_page()
    await pg.add_init_script(INIT + ";try{localStorage.setItem('meenz-quality','niedrig')}catch(e){}")
    await pg.goto(f'{BASE}/game/test.html')
    await pg.wait_for_function("()=>window.__MEENZ!==undefined", timeout=180000)
    lo = await pg.evaluate("()=>({q:__MEENZ.QUALITY,low:__MEENZ.THEAT.low,draws:__MEENZ.THEAT.draws,built:__MEENZ.THEAT.built})")
    g.check('niedrig: schlichte Stufe gebaut', lo and lo['q'] == 'niedrig' and lo['low'] and lo['built'], lo)
    g.check('niedrig: ≤ 10 Draw-Calls', lo and lo['draws'] <= 10, lo and lo['draws'])
    eb = await pg.evaluate("()=>{const e=document.getElementById('errbox');return e&&e.offsetParent?e.textContent:''}")
    g.check('niedrig: kein errbox', not eb, eb)
    await pg.close()


run(test)
