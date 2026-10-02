# Innenräume: Dom, Christuskirche, Malakoff-Passage (inkl. Laden in der Passage) betreten, drin laufen, wieder raus
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
# Türpositionen (x, z) laut Baseline; rayDoor ist deterministisch, Toleranz für Datenänderungen
DOORS = {'dom': (-18.0, -53.5), 'christus': (-543.6, -919.7), 'malakoff': (471.0, 418.0), 'hbf': (-990.0, -292.0)}
NAMES = {'dom': 'Hoher Dom St. Martin', 'christus': 'Christuskirche', 'malakoff': 'Malakoff-Passage'}

ROOM = f"()=>{{const h={M}.P1.h;return {{in:!!h.room,name:h.room&&h.room.name,people:h.room&&h.room.people.length,y:h.y,oy:h.room&&h.room.oy,lx:h.room?h.x-h.room.ox:null,lz:h.room?h.z-h.room.oz:null,x:h.x,z:h.z}}}}"


async def test(g):
    await g.start()
    doors = await g.js(f"()=>{{{M}.venueNear(0,0);return {M}.VENUES.map(v=>[v.id,v.door])}}")
    doors = {k: d for k, d in doors}
    for vid, (x, z) in DOORS.items():
        d = doors.get(vid)
        g.check(f'Tür {vid} platziert', d and abs(d[0] - x) < 5 and abs(d[1] - z) < 5, d and [round(d[0], 1), round(d[1], 1)])

    for vid in ['dom', 'christus', 'malakoff']:
        door = await g.js(f"(id)=>{{const M={M};const v=M.VENUES.find(v=>v.id===id);const h=M.P1.h;h.x=v.door[0];h.z=v.door[1];h.y=0;return v.door}}", vid)
        await g.step(0.6)
        await g.key('KeyF', after=1.5)
        r = await g.js(ROOM)
        g.check(f'{vid}: betreten', r['in'] and r['name'] == NAMES[vid], r['name'])
        g.check(f'{vid}: Leute drin', (r['people'] or 0) >= 5, r['people'])
        g.check(f'{vid}: Spieler auf Raumhöhe', r['in'] and abs(r['y'] - r['oy']) < 0.01 and r['oy'] < -50, r['y'])

        await g.key('KeyW', hold=2.5, after=0)
        w = await g.js(ROOM)
        g.check(f'{vid}: Laufen bleibt im Raum', w['in'], [w['lx'], w['lz']])
        g.check(f'{vid}: Spieler hat sich im Raum bewegt', ((w['lx'] - r['lx']) ** 2 + (w['lz'] - r['lz']) ** 2) ** 0.5 > 1, [r['lx'], r['lz'], w['lx'], w['lz']])

        if vid == 'malakoff':
            await g.js(f"()=>{{const M={M};const s=M.P1.h.room.mshops[0];M.P1.h.x=s.doorX+1;M.P1.h.z=s.doorZ;}}")
            await g.step(0.5)
            await g.key('KeyF', after=0.8)
            s = await g.js(f"()=>{{const h={M}.P1.h;return [h.room&&h.room.shop&&h.room.shop.name,!!h.parentRoom]}}")
            g.check('malakoff: Laden REWE in der Passage betreten', s == ['REWE', True], s)
            await g.js(f"()=>{M}.exitShop({M}.P1)")
            await g.step(0.5)
            b = await g.js(ROOM)
            g.check('malakoff: zurück in der Passage', b['in'] and b['name'] == NAMES['malakoff'], b['name'])

        # Ausgang: 3 m vor die Ausgangszone stellen, Blick zum Ausgang, loslaufen (wie ein Spieler).
        # Der Alttest teleportierte direkt in die Zone an die Wand: dort ist moveHuman blockiert (Probe +0,3 m
        # steckt in der Wand) – nach dem Ladenbesuch blickt die Kamera seitlich, der Spieler bewegt sich nicht,
        # und ohne Bewegung (|v|>0,2) greift der Ausgang nicht.
        await g.js(f"""()=>{{const M={M};const P=M.P1,h=P.h,r=h.room,e=r.venue.exits[0];
            const ox=Math.abs(e.x)/(r.W/2)>Math.abs(e.z)/(r.D/2);const nx=ox?Math.sign(e.x):0,nz=ox?0:Math.sign(e.z);
            h.x=r.ox+e.x-nx*3;h.z=r.oz+e.z-nz*3;P.cam.yaw=Math.atan2(nx,nz);}}""")
        await g.page.keyboard.down('KeyW')
        for _ in range(30):
            await g.step(0.1)
            if not await g.js(f"()=>!!{M}.P1.h.room"): break
        await g.page.keyboard.up('KeyW')
        await g.step(0.1)
        e = await g.js(ROOM)
        dd = ((e['x'] - door[0]) ** 2 + (e['z'] - door[1]) ** 2) ** 0.5
        g.check(f'{vid}: draußen nach Ausgang', not e['in'], [round(e['x']), round(e['z']), round(e['y'], 1)])
        g.check(f'{vid}: draußen an der Tür (< 2,5 m) auf Bodenhöhe', dd < 2.5 and abs(e['y']) < 1, f'{dd:.1f} m, y={e["y"]:.1f}')

run(test)
