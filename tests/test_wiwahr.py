# Wiesbadener Wahrzeichen: Modelle auf den OSM-Grundrissen, OSM-Gebäude ersetzt, Kollision, Schnellreise, Kurhaus begehbar
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
# Schwerpunkte der OSM-Grundrisse (aus p1_osm.js ermittelt), damit auch die Grundriss-Suche selbst geprüft ist
ANCHOR = {'kurhaus': (-1896, -9580), 'marktkirche': (-2219, -9276), 'hbf': (-2150, -7935), 'biebrich': (-2850, -4300)}
# plausible Gesamthöhe (m): Kuppel ~38, Hauptturm 98, Uhrturm ~50, Rotunde ~26
HEIGHT = {'kurhaus': (30, 45), 'marktkirche': (92, 105), 'hbf': (42, 60), 'biebrich': (20, 35)}
NAMES = {'kurhaus': 'Kurhaus Wiesbaden', 'marktkirche': 'Marktkirche', 'hbf': 'Hauptbahnhof Wiesbaden', 'biebrich': 'Biebricher Schloss'}
ROOM = f"()=>{{const h={M}.P1.h;return {{in:!!h.room,name:h.room&&h.room.name,people:h.room&&h.room.people.length,y:h.y,oy:h.room&&h.room.oy,x:h.x,z:h.z}}}}"


def dist(a, b):
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5


async def test(g):
    await g.start()
    W = await g.js(f"()=>JSON.parse(JSON.stringify({{models:{M}.WIWAHR.models,positions:{M}.WIWAHR.positions,hall:{M}.WIWAHR.hall}}))")
    models, pos = W['models'], W['positions']

    # 1. Modelle an der echten Stelle, in plausibler Größe
    for k, (lo, hi) in HEIGHT.items():
        m = models.get(k)
        g.check(f'{k}: Modell gebaut ({NAMES[k]})', m and m['name'] == NAMES[k] and m['meshes'] > 0, m and m['meshes'])
        if not m: continue
        g.check(f'{k}: OSM-Grundriss gefunden', m['osmFound'] and dist(m['osm'], ANCHOR[k]) < 40, [round(v) for v in m['osm']])
        g.check(f'{k}: Modell < 60 m vom OSM-Gebäude', dist((m['x'], m['z']), m['osm']) < 60, f"{dist((m['x'], m['z']), m['osm']):.1f} m")
        g.check(f'{k}: Höhe {lo}–{hi} m', lo <= m['height'] <= hi, round(m['height'], 1))
        bb = m['bbox']
        g.check(f'{k}: Grundfläche plausibel (20–320 m)', 20 < max(bb[3] - bb[0], bb[5] - bb[2]) < 320, [round(bb[3] - bb[0]), round(bb[5] - bb[2])])
    g.check('Kurhaus: Front > 100 m lang', max(models['kurhaus']['bbox'][3] - models['kurhaus']['bbox'][0], models['kurhaus']['bbox'][5] - models['kurhaus']['bbox'][2]) > 100)

    # 2. OSM-Gebäude ersetzt, Kollision am Modell, Bahnsteighalle unten begehbar
    gids = [gid for m in models.values() for gid in m['gids']]
    left = await g.js(f"(ids)=>{M}.BUILDINGS.filter(b=>ids.includes(b.gid)).length", gids)
    g.check('OSM-Gebäude der Wahrzeichen nicht mehr in BUILDINGS', left == 0, left)
    # core = Hauptbaukörper (Mittelbau, Kirchenschiff, Uhrturm, Rotunde)
    for k, m in models.items():
        g.check(f'{k}: Hauptbaukörper massiv (Kollision)', await g.js(f"([x,z])=>{M}.blockedFn(x,z,0)", m['core']), [round(v) for v in m['core']])
    hall = models['hbf']['hall']
    g.check('Hbf: unter der Bahnsteighalle frei begehbar', hall and not await g.js(f"([x,z])=>{M}.blockedFn(x,z,0)", hall), hall)

    # 3. Vorplätze und Schnellreise
    for k, p in pos.items():
        m = models[k]
        g.check(f'{k}: Vorplatz 15–80 m vor dem Hauptbaukörper, frei', p and 15 < dist(p, m['core']) < 80 and not await g.js(f"([x,z])=>{M}.blockedFn(x,z,0)", p),
                p and f"{dist(p, m['core']):.0f} m")
    ft = await g.js(f"()=>{M}.ftDestinations().map(d=>[d.n,d.g,d.x,d.z,!!d.special])")
    by = {d[0]: d for d in ft}
    for k, n in NAMES.items():
        d = by.get(n)
        g.check(f'Schnellreise: {n}', d and d[1] == 'Wiesbaden' and dist((d[2], d[3]), pos[k]) < 1, d)
    g.check('Schnellreise: Kurhaus-Ziel < 70 m vom Eingang', dist(pos['kurhaus'], (models['kurhaus']['x'], models['kurhaus']['z'])) < 70)
    n2 = await g.js(f"()=>{{const L={M}.ftDestinations();return L.filter(d=>d.g==='Wiesbaden').length}}")
    g.check('Schnellreise-Liste doppelt abgefragt: keine Duplikate', n2 == 4, n2)

    # 4. Kurhaus betreten, im Raum laufen, wieder raus
    door = await g.js(f"()=>{{const v={M}.VENUES.find(v=>v.id==='kurhaus');return v&&v.door}}")
    g.check('Kurhaus: Tür platziert, < 40 m vom Modell', door and dist(door, (models['kurhaus']['x'], models['kurhaus']['z'])) < 40, door)
    g.check('Kurhaus: Saal-Fläche für die Spielbank reserviert', W['hall'] and W['hall']['x1'] > W['hall']['x0'], W['hall'])
    near = await g.js(f"(d)=>{{const v={M}.venueNear(d[0],d[1]);return v&&v.id}}", door)
    g.check('Kurhaus: venueNear an der Tür', near == 'kurhaus', near)
    await g.js(f"(d)=>{{const h={M}.P1.h;h.x=d[0];h.z=d[1];h.y=0}}", door)
    await g.step(0.6)
    await g.key('KeyF', after=1.5)
    r = await g.js(ROOM)
    g.check('Kurhaus: betreten', r['in'] and r['name'] == 'Kurhaus Wiesbaden', r['name'])
    g.check('Kurhaus: Leute drin', (r['people'] or 0) >= 5, r['people'])
    g.check('Kurhaus: Spieler auf Raumhöhe', r['in'] and abs(r['y'] - r['oy']) < 0.01 and r['oy'] < -50, r['y'])
    await g.key('KeyW', hold=2.5, after=0)
    w = await g.js(ROOM)
    g.check('Kurhaus: Laufen bleibt im Raum', w['in'])
    # wie test_ven: 3 m vor die Ausgangszone, Blick zum Ausgang, loslaufen
    await g.js(f"""()=>{{const M={M};const P=M.P1,h=P.h,r=h.room,e=r.venue.exits[0];
        h.x=r.ox+e.x;h.z=r.oz+e.z-3;P.cam.yaw=0;}}""")
    await g.page.keyboard.down('KeyW')
    for _ in range(30):
        await g.step(0.1)
        if not await g.js(f"()=>!!{M}.P1.h.room"): break
    await g.page.keyboard.up('KeyW')
    await g.step(0.1)
    o = await g.js(ROOM)
    dd = dist((o['x'], o['z']), door)
    g.check('Kurhaus: draußen nach Ausgang', not o['in'], [round(o['x']), round(o['z'])])
    g.check('Kurhaus: draußen an der Tür (< 2,5 m) auf Bodenhöhe', dd < 2.5 and abs(o['y']) < 1, f'{dd:.1f} m, y={o["y"]:.1f}')
    g.check('Kurhaus: draußen nicht in der Wand', not await g.js(f"()=>{M}.blockedFn({M}.P1.h.x,{M}.P1.h.z,0)"))


run(test)
