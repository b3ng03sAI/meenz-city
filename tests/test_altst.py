# Altstadt + Bleichenviertel: Fachwerk am Kirschgarten, Weinstube mit Stammtisch, Leichhof-Café mit Domblick,
# belebte Bleichen, Straßenszenen, Schnellreise. `python3 tests/test_altst.py shots` macht echte Screenshots (tests/out/).
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
KG_REAL = (-31.0, 157.0)      # Platz „Kirschgarten“ laut OSM
LH_REAL = (-55.0, 55.0)       # Platz „Leichhof“ laut OSM
AUG_REAL = ((74, 233), (-20, 141))  # Augustinerstraße (OSM-Polylinie, Anfang/Ende)
WS = 'altst_weinstube'

ROOM = f"()=>{{const h={M}.P1.h;return {{in:!!h.room,name:h.room&&h.room.name,y:h.y,oy:h.room&&h.room.oy,x:h.x,z:h.z}}}}"
PEDS_NEAR = f"""(r)=>{{const M={M},h=M.P1.h;let n=0,all=0;for(const o of M.HUMANS){{if(o.kind!=='ped'||!o.alive||o.removed||o.inCar)continue;all++;
    if(Math.hypot(o.x-h.x,o.z-h.z)<r)n++;}}return [n,all]}}"""
CLEAR_PEDS = f"()=>{{const M={M};for(const o of M.HUMANS.slice())if(o.kind==='ped'&&!o.mission&&!o.room&&o.state==='walk')o.remove();}}"


def seg_dist(p, a, b):
    ax, az = a; bx, bz = b; dx, dz = bx - ax, bz - az
    t = max(0, min(1, ((p[0] - ax) * dx + (p[1] - az) * dz) / (dx * dx + dz * dz)))
    return ((p[0] - ax - dx * t) ** 2 + (p[1] - az - dz * t) ** 2) ** 0.5


async def goto(g, x, z, yaw=None):
    await g.js(f"([x,z,yaw])=>{{const M={M},P=M.P1;if(P.car)M.exitCar(P,true);if(P.h.room)M.exitVenue(P);P.h.x=x;P.h.z=z;P.h.y=M.groundYFn(x,z,0);if(yaw!==null){{P.cam.yaw=yaw;P.h.facing=yaw;}}P.cam.init=false;}}", [x, z, yaw])


async def test(g):
    await g.start()
    A = f'{M}.ALTST'

    # 1. Kirschgarten: Fachwerk, Brunnen, Pflaster
    kg = await g.js(f"()=>{A}.kg")
    g.check('Kirschgarten an der echten Position (< 15 m)', ((kg['x'] - KG_REAL[0]) ** 2 + (kg['z'] - KG_REAL[1]) ** 2) ** 0.5 < 15, kg)
    fw = await g.js(f"""()=>{{const A={A},M={M},k=A.kg;const L=A.fachwerk.filter(f=>Math.hypot(f.x-k.x,f.z-k.z)<60);
        return {{n:L.length,styles:[...new Set(L.map(f=>f.b.style))],inCity:L.every(f=>M.BUILDINGS.includes(f.b))}}}}""")
    g.check('>= 8 Fachwerkhäuser am Kirschgarten', fw['n'] >= 8, fw['n'])
    g.check('alle als Fachwerk geplant und Teil der Stadt', fw['styles'] == ['fachwerk'] and fw['inCity'], fw)
    fo = await g.js(f"()=>{{const A={A},f=A.fountain;return f&&{{d:Math.hypot(f.x-A.kg.x,f.z-A.kg.z),blk:{M}.blockedFn(f.x,f.z,0)}}}}")
    g.check('Kirschgartenbrunnen am Platz (< 15 m) und massiv', fo and fo['d'] < 15 and fo['blk'], fo)
    g.check('eigene Meshes (Balken, Brunnen, Pflaster, Café, Bleichen) in der Szene', await g.js(f"()=>{A}.meshes.length") >= 8)

    # 2. Leichhof: Café-Tische mit Domblick
    cafe = await g.js(f"()=>{A}.cafe.map(t=>[t.x,t.z,t.view])")
    g.check('>= 4 Café-Tische am Leichhof', len(cafe) >= 4, len(cafe))
    g.check('Café-Tische am echten Leichhof (< 30 m)', cafe and all(((x - LH_REAL[0]) ** 2 + (z - LH_REAL[1]) ** 2) ** 0.5 < 30 for x, z, _ in cafe),
            [[round(x), round(z)] for x, z, _ in cafe])
    g.check('jeder Tisch mit freier Sichtachse zum Dom', cafe and all(v for *_, v in cafe))
    await goto(g, cafe[0][0] + 1.5, cafe[0][1] + 1.5)
    await g.step(1.2)
    hint = await g.js("()=>{const h=document.getElementById('hint');return h&&!h.hidden?h.textContent:''}")
    g.check('Domblick-Hinweis am Leichhof', 'Domblick' in hint, hint[:60])
    st = await g.js(f"()=>{{const s={A}.scenes.find(s=>s.key==='stammtisch');return s&&{{a:s.active,n:s.people.length,sit:s.people.every(h=>h.altstSit&&{A}.sitters.includes(h))}}}}")
    g.check('Schoppe-Stammtisch draußen sitzt am Café-Tisch', st and st['a'] and st['n'] == 3 and st['sit'], st)

    # 3. Kirschgarten-Szene: Fastnachter proben, sprechen Mundart, verschwinden weit weg
    f = await g.js(f"()=>{A}.fountain")
    await goto(g, f['x'] + 6, f['z'] + 4)
    await g.step(10)
    sc = await g.js(f"""()=>{{const s={A}.scenes.find(s=>s.key==='fastnacht');const t=s.people.map(h=>h.bubble?h.bubble.textContent:'').filter(Boolean);
        return {{a:s.active,n:s.people.length,wait:s.people.every(h=>h.state==='wait'),said:t,t:s.t}}}}""")
    g.check('Fastnachter-Szene aktiv (3 Leute, stehen)', sc['a'] and sc['n'] == 3 and sc['wait'], sc)
    g.check('Fastnachter-Szene läuft (Schunkel-Uhr)', sc['t'] > 5, sc['t'])
    g.check('Fastnachter sagen was auf Meenzerisch (Sprechblase)', len(sc['said']) > 0, sc['said'])

    # 4. Weinstube in der Augustinerstraße
    door = await g.js(f"()=>{A}.weinstube.door")
    dd = min(seg_dist(door, AUG_REAL[0], AUG_REAL[1]), 99)
    g.check('Weinstube-Tür an der Augustinerstraße (< 10 m)', dd < 10, [round(door[0], 1), round(door[1], 1), round(dd, 1)])
    g.check('venueNear findet die Weinstube an der Tür', await g.js(f"(d)=>{{const v={M}.venueNear(d[0],d[1]);return v&&v.id}}", door) == WS)
    await goto(g, door[0], door[1])
    await g.step(0.5)
    await g.key('KeyF', after=1.2)
    r = await g.js(ROOM)
    g.check('Weinstube betreten', r['in'] and r['name'] == 'Weinstubb „Zum Dubbeglas“', r['name'])
    g.check('Spieler auf Raumhöhe', r['in'] and abs(r['y'] - r['oy']) < 0.01 and r['oy'] < -50, r['y'])
    stamm = await g.js(f"""()=>{{const r={M}.P1.h.room;const s=r.people.filter(h=>h.altstStamm);
        return {{n:s.length,sit:s.every(h=>h.altstSit&&{A}.sitters.includes(h)),names:s.map(h=>h.npcName),all:r.people.length}}}}""")
    g.check('4 Stammgäste am Stammtisch, sitzend', stamm['n'] == 4 and stamm['sit'], stamm)
    g.check('Wirtin + weitere Gäste (>= 8 Leute)', stamm['all'] >= 8, stamm['all'])

    # Gespräch mit einem Stammgast: vor ihn stellen, ansehen, E
    await g.js(f"""()=>{{const M={M},P=M.P1,h=P.h,r=h.room;const o=r.people.find(o=>o.altstStamm);const a=Math.atan2(o.x-(r.ox-3),o.z-(r.oz-2));
        h.x=o.x+Math.sin(a)*1.3;h.z=o.z+Math.cos(a)*1.3;h.facing=Math.atan2(o.x-h.x,o.z-h.z);P.cam.yaw=h.facing;}}""")
    await g.step(0.2)
    await g.key('KeyE', after=0.5)
    t = await g.js(f"()=>{{const T={M}.TALK;return T&&{{stamm:!!T.npc.altstStamm,who:T.who,line:T.line,n:T.choices.length}}}}")
    g.check('Gespräch mit Stammgast startet', t and t['stamm'] and t['n'] == 3, t)
    g.check('Stammtisch-Dialog auf Meenzerisch', t and any(w in t['line'] for w in ('Ei gude', 'Meenz', 'Worscht', 'Elfte', 'Wiesbade')), t and t['line'])
    await g.js(f"()=>{{const T={M}.TALK;if(T)T.typed=T.line.length}}")
    await g.step(0.3)
    await g.key('Digit1', after=2.5)
    rep = await g.js(f"()=>{{const T={M}.TALK;return T&&[T.stage,T.line]}}")
    g.check('Stammgast antwortet', rep and rep[0] in ('reply', 'end'), rep)
    await g.js(f"()=>{{const T={M}.TALK;if(T)T.typed=T.line.length}}")   # Antwort fertig getippt, sonst ergänzt E nur den Text
    await g.key('KeyE', after=0.3)
    await g.step(0.5)
    end = await g.js(f"()=>[!!{M}.TALK,{M}.P1.h.room.people.filter(h=>h.altstStamm).map(h=>[h.state,!!h.altstSit,{A}.sitters.includes(h)])]")
    g.check('Gespräch beendet, Stammgast sitzt wieder', not end[0] and all(s == ['venue', True, True] for s in end[1]), end)

    # Weck, Worscht un Woi an der Theke
    m0 = await g.js(f"()=>{{const M={M};M.G.money=Math.max(M.G.money,20);const h=M.P1.h,r=h.room;h.x=r.ox+3.5;h.z=r.oz-5.2;M.P1.drunk=0;return M.G.money}}")
    await g.step(0.3)
    await g.key('KeyF', after=0.5)
    o = await g.js(f"()=>[{M}.G.money,{A}.orders||0,{M}.P1.drunk||0,!!{M}.P1.h.room]")
    g.check('F an der Theke: Weck, Worscht un Woi (-5 €, ein Schoppe intus)', o[0] == m0 - 5 and o[1] == 1 and o[2] > 0 and o[3], o)

    # Rausgehen wie ein Spieler
    await g.js(f"""()=>{{const M={M},P=M.P1,h=P.h,r=h.room,e=r.venue.exits[0];h.x=r.ox+e.x;h.z=r.oz+e.z-3;P.cam.yaw=0;h.facing=0;}}""")
    await g.page.keyboard.down('KeyW')
    for _ in range(30):
        await g.step(0.1)
        if not await g.js(f"()=>!!{M}.P1.h.room"): break
    await g.page.keyboard.up('KeyW')
    await g.step(0.1)
    e = await g.js(ROOM)
    d2 = ((e['x'] - door[0]) ** 2 + (e['z'] - door[1]) ** 2) ** 0.5
    g.check('draußen an der Tür (< 2,5 m) auf Bodenhöhe', not e['in'] and d2 < 2.5 and abs(e['y']) < 1, f'{d2:.1f} m, y={e["y"]:.1f}')
    await g.step(1)
    wp = await g.js(f"()=>{{const s={A}.scenes.find(s=>s.key==='weinprobe');return s&&{{a:s.active,n:s.people.length,glass:s.people.every(h=>!!h.altstGlass)}}}}")
    g.check('Weinprobe vor der Weinstube (3 Leute mit Glas)', wp and wp['a'] and wp['n'] == 3 and wp['glass'], wp)

    # 5. Bleichenviertel: mehr Passanten als ohne das Paket (gleiches Gesamtbudget), Tüten, Schaufenster, Fahrradbügel
    bl = await g.js(f"()=>({{bl:{A}.bl,ft:{A}.ft.find(d=>d.n.startsWith('Bleichenviertel')),d:{A}.displays.length,r:{A}.racks.length,s:{A}.stands.length}})")
    g.check('Bleichen-Schaufenster (>= 10)', bl['d'] >= 10, bl['d'])
    g.check('Kleiderständer vor Modeläden (>= 3)', bl['r'] >= 3, bl['r'])
    g.check('Fahrradbügel an den Bleichen (>= 10)', bl['s'] >= 10, bl['s'])
    p = bl['ft']
    counts = {}
    for on in (False, True):
        await g.js(f"(on)=>{{{A}.on=on}}", on)
        await goto(g, p['x'], p['z'])
        await g.step(0.6)          # Szenen weit weg abbauen
        await g.js(CLEAR_PEDS)
        await g.reseed(77)
        for _ in range(10):        # wie beim Ankommen per Schnellreise, bis das Passanten-Budget voll ist
            await g.js(f"()=>{A}.populate()")
            await g.step(0.5)
        counts[on] = await g.js(PEDS_NEAR, 80)
    (off_n, off_all), (on_n, on_all) = counts[False], counts[True]
    cap = await g.js(f"()=>{A}.pedCap()")
    g.check('Bleichen belebter: Passanten im 80-m-Umkreis mind. 1,5× und +6 ggü. ohne Paket', on_n >= off_n * 1.5 and on_n - off_n >= 6, f'ohne {off_n}/{off_all}, mit {on_n}/{on_all}')
    g.check('Gesamtzahl Passanten bleibt im normalen Budget', on_all <= cap + 1, f'mit {on_all}, Budget {cap}')
    bags = await g.js(f"()=>{A}.shoppers.filter(h=>!h.removed&&h.alive).length")
    g.check('>= 5 Passanten mit Einkaufstüten', bags >= 5, bags)
    gone = await g.js(f"()=>{A}.scenes.every(s=>!s.active&&!s.people.length)")
    g.check('Szenen der Altstadt sind weit weg abgebaut', gone)

    # 6. Schnellreise
    names = await g.js(f"()=>{M}.ftDestinations().filter(d=>d.g==='Altstadt').map(d=>d.n)")
    for n in ['Kirschgarten (Fachwerk)', 'Weinstubb „Zum Dubbeglas“ – Augustinerstraße', 'Leichhof (Domblick)', 'Bleichenviertel – Einkaufsstraßen']:
        g.check(f'Schnellreise-Ziel „{n}“', n in names)
    d = await g.js(f"()=>{{const d={M}.ftDestinations().find(d=>d.n==='Kirschgarten (Fachwerk)');{M}.setWanted(0);{M}.fastTravel(d);return {{x:d.x,z:d.z,special:!!d.special}}}}")
    g.check('Kirschgarten ist kein „besonderer Ort“ (Liste in test_ft bleibt gleich)', not d['special'])
    await g.page.wait_for_function("(d)=>{const h=__MEENZ.P1.h;return Math.hypot(h.x-d.x,h.z-d.z)<2}", arg=d, polling=50, timeout=5000)
    pos = await g.js(f"()=>[{M}.P1.h.x,{M}.P1.h.z]")
    g.check('Schnellreise landet am Kirschgarten (< 20 m)', ((pos[0] - kg['x']) ** 2 + (pos[1] - kg['z']) ** 2) ** 0.5 < 20, pos)


async def snap(g, name):
    """Wie g.snap, aber ohne Spielerfigur im Bild."""
    import base64
    url = await g.js(f"()=>{M}.snap(6,true)")
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', name + '.jpg')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'wb') as f:
        f.write(base64.b64decode(url.split(',', 1)[1]))
    print('  ', path)


async def shots(g):
    """Echte Screenshots: Kirschgarten, Leichhof, Weinstube innen; Draw-Calls mit/ohne Paket."""
    import math
    await g.start()
    await g.js(f"()=>{{const M={M};M.gameMin=13*60;M.setWeather('klar')}}")
    A = f'{M}.ALTST'
    f = await g.js(f"()=>{A}.fountain")
    x, z = f['x'] + 12, f['z'] + 8
    yaw = math.atan2(f['x'] - x, f['z'] - z)
    await goto(g, x, z, yaw)
    await g.step(1.5)
    calls = {}
    for key, on, sc in (('ohne', False, False), ('statisch', True, False), ('mit Szene', True, True)):
        await g.js(f"([on,sc])=>{{{A}.on=on;{A}.scenesOn=sc}}", [on, sc])
        await g.step(0.6)
        calls[key] = await g.js(f"()=>{A}.drawCalls()")
    print(f"  Draw-Calls am Kirschgarten: {calls}")
    g.check('statische Draw-Calls am Kirschgarten <= +150', calls['statisch'] - calls['ohne'] <= 150, calls)
    await g.js(f"(y)=>{{const P={M}.P1;P.cam.yaw=y;P.cam.pitch=0.1;P.cam.init=false}}", yaw)
    await g.step(0.5)
    await snap(g, 'altst_kirschgarten')
    c = await g.js(f"()=>{A}.cafe[0]")
    await goto(g, c['x'] - 2.5, c['z'] + 3, math.atan2(-10.6 - c['x'], -8.9 - c['z']))
    await g.step(1.5)
    await g.js(f"()=>{{const P={M}.P1;P.cam.pitch=0.0;P.cam.init=false}}")
    await snap(g, 'altst_leichhof')
    door = await g.js(f"()=>{A}.weinstube.door")
    await goto(g, door[0], door[1])
    await g.step(0.4)
    await g.key('KeyF', after=1.0)
    await g.js(f"()=>{{const M={M},P=M.P1,h=P.h,r=h.room;h.x=r.ox+2.5;h.z=r.oz+4.5;P.cam.yaw=Math.atan2(-3-2.5,-2-4.5);h.facing=P.cam.yaw;P.cam.pitch=0.15;P.cam.init=false}}")
    await g.step(1.0)
    await snap(g, 'altst_weinstube')
    g.check('Screenshots gemacht', True)


async def mem(g):
    """JS-Heap nach GC im iPhone-Profil (LOWMEM); mit `skip` ohne setupAltst – die Differenz ist der Zuwachs des Pakets."""
    await g.start()
    await g.step(2)
    cdp = await g.page.context.new_cdp_session(g.page)
    await cdp.send('HeapProfiler.collectGarbage')
    u = await cdp.send('Runtime.getHeapUsage')
    print(f"  JS-Heap {'ohne' if 'skip' in sys.argv else 'mit'} Altstadt-Paket: {u['usedSize'] / 1e6:.1f} MB")
    g.check('Heap gemessen', u['usedSize'] > 0)

if 'shots' in sys.argv:
    run(shots, real=True)
elif 'mem' in sys.argv:
    run(mem, mobile=True, real='real' in sys.argv, init_extra='window.__ALTST_SKIP=true;' if 'skip' in sys.argv else '')
else:
    run(test)
