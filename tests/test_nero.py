# Nerobergbahn + Kochbrunnen: Stationen am echten Ort, Wagen im Gegenverkehr mit Wasserballast, Mitfahren per F
# (Fahrpreis, Ankunft oben auf Bahnsteighöhe und wieder runter), begehbares Viadukt, Kochbrunnen per E
# (heilt, Stinke-Wolke, Passanten ekeln sich, Abklingzeit).
# Screenshots (echtes Rendering): NERO_SHOT=1 python3 tests/run.py nero  → tests/out/nero_*.jpg
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
N = f'{M}.NERO'
CARS = f"()=>{N}.cars.map(c=>({{s:c.s,x:c.x,y:c.y,z:c.z,off:c.off,docked:c.docked,ballast:c.ballast}}))"
OSM_TAL = (-3477.2, -10662.3)       # OSM-Gebäude „Nerobergbahn Talstation“
OSM_BRUNNEN = (-2298.6, -9736.9)    # OSM amenity=drinking_water „Kochbrunnen“


async def step_until(g, cond, limit, chunk=0.25):
    t = 0.0
    while t < limit:
        if await g.js(cond): return True
        await g.step(chunk); t += chunk
    return await g.js(cond)


async def player(g):
    return await g.js(f"()=>{{const h={M}.P1.h;return {{x:h.x,y:h.y,z:h.z,hp:h.health,money:{M}.G.money}}}}")


async def board(g, key):
    """Stellt den Spieler an den Bahnsteig der Station `key` und drückt F."""
    await g.js(f"""(k)=>{{const M={M},P=M.P1,st=M.NERO.stations[k];P.h.x=st.board[0];P.h.z=st.board[1];
        P.h.y=M.groundYFn(P.h.x,P.h.z,st.y+0.5);P.vy=0;M.G.money=Math.max(M.G.money,100)}}""", key)
    money = (await player(g))['money']
    await g.key('KeyF')
    return money


async def test(g):
    await g.start()
    st = await g.js(f"()=>({{tal:{N}.stations.tal,berg:{N}.stations.berg,b:{N}.brunnen,n:{N}.cars.length}})")
    tal, berg, b = st['tal'], st['berg'], st['b']

    # 1. Stationen am echten Ort, Bergstation innerhalb der Karte, deutlich höher
    d_tal = ((tal['x'] - OSM_TAL[0]) ** 2 + (tal['z'] - OSM_TAL[1]) ** 2) ** 0.5
    g.check('Talstation < 20 m von der OSM-Talstation', d_tal < 20, f'{d_tal:.1f} m')
    span = ((berg['x'] - tal['x']) ** 2 + (berg['z'] - tal['z']) ** 2) ** 0.5
    g.check('Bergstation 70–100 m bergauf (Kartenrand begrenzt)', 70 < span < 100, f'{span:.1f} m')
    g.check('Bergstation nördlich der Talstation und innerhalb der Kartengrenze (z > -10752)', -10752 < berg['z'] < tal['z'], berg['z'])
    g.check('Bergstation mindestens 12 m höher', berg['y'] - tal['y'] > 12, f"{tal['y']:.1f} → {berg['y']:.1f}")
    d_b = ((b['x'] - OSM_BRUNNEN[0]) ** 2 + (b['z'] - OSM_BRUNNEN[1]) ** 2) ** 0.5
    g.check('Kochbrunnen am OSM-Ort (< 3 m)', d_b < 3, f'{d_b:.1f} m')
    g.check('zwei Wagen', st['n'] == 2, st['n'])

    # 2. Wagen auf dem Gleis, symmetrisch, an je einem Ende
    cars = await g.js(CARS)
    g.check('Wagenpositionen symmetrisch (s0 + s1 = s_tal + s_berg)', abs(cars[0]['s'] + cars[1]['s'] - tal['s'] - berg['s']) < 0.01, [c['s'] for c in cars])
    for i, c in enumerate(cars):
        g.check(f'Wagen {i} auf der Gleisachse (Querabstand < 1.6 m)', abs(c['off']) < 1.6, c['off'])
        g.check(f'Wagen {i} über dem Boden (y > 0)', c['y'] > 0, c['y'])

    # 3. Gegenverkehr, Ausweiche, Enden tauschen, Wasserballast
    start = await g.js(CARS)
    g.check('Start: Wagen 0 unten, Wagen 1 oben', [c['docked'] for c in start] == ['tal', 'berg'], [c['docked'] for c in start])
    g.check('Abfahrt innerhalb einer Haltezeit', await step_until(g, f"()=>{N}.phase==='fahrt'", 20))
    before = await g.js(CARS)
    await g.step(3)
    after = await g.js(CARS)
    d0, d1 = after[0]['s'] - before[0]['s'], after[1]['s'] - before[1]['s']
    g.check('Wagen fahren entgegengesetzt', d0 * d1 < 0 and abs(d0) > 1, f'{d0:.2f} / {d1:.2f}')
    g.check('Ausweiche: Wagen begegnen sich nebeneinander', await step_until(g, f"()=>Math.abs({N}.prog-0.5)<0.03", 30, 0.1))
    mid = await g.js(CARS)
    sep = abs(mid[0]['off'] - mid[1]['off'])
    g.check('Ausweiche: Querabstand in der Mitte > 2.4 m', sep > 2.4, f'{sep:.2f}')
    gap = ((mid[0]['x'] - mid[1]['x']) ** 2 + (mid[0]['z'] - mid[1]['z']) ** 2) ** 0.5
    g.check('Wagen kollidieren nicht (Abstand Mitte > 2.4 m)', gap > 2.4, f'{gap:.2f}')
    g.check('Ankunft innerhalb einer Fahrzeit', await step_until(g, f"()=>{N}.phase==='halt'", 40))
    end = await g.js(CARS)
    g.check('Wagen haben die Enden getauscht', [c['docked'] for c in end] == [start[1]['docked'], start[0]['docked']], [c['docked'] for c in end])
    g.check('je ein Wagen oben und unten', sorted(c['docked'] or '' for c in end) == ['berg', 'tal'], [c['docked'] for c in end])
    await g.step(5)
    later = await g.js(CARS)
    up = next(i for i, c in enumerate(end) if c['docked'] == 'berg')
    lo = 1 - up
    g.check('oben wird Wasser getankt', later[up]['ballast'] > end[up]['ballast'], f"{end[up]['ballast']:.2f} → {later[up]['ballast']:.2f}")
    g.check('unten wird Wasser abgelassen', later[lo]['ballast'] < end[lo]['ballast'] or end[lo]['ballast'] == 0, f"{end[lo]['ballast']:.2f} → {later[lo]['ballast']:.2f}")
    g.check('Ballast vor der Talfahrt: oberer Wagen schwerer', later[up]['ballast'] > later[lo]['ballast'], f"{later[up]['ballast']:.2f} / {later[lo]['ballast']:.2f}")

    # 4. Mitfahren: Talstation → Bergstation, Fahrpreis, Ankunft auf Bahnsteighöhe
    g.check('Halt mit Wagen unten (Rest-Haltezeit > 3 s)', await step_until(
        g, f"()=>{N}.phase==='halt'&&{N}.t<{N}.DWELL-3&&{N}.cars.some(c=>c.docked==='tal')", 60))
    m0 = await board(g, 'tal')
    ride = await g.js(f"()=>{N}.riding?{{docked:{N}.riding.car.docked}}:null")
    g.check('F an der Talstation: eingestiegen (NERO.riding)', ride is not None and ride['docked'] == 'tal', ride)
    p = await player(g)
    g.check('Fahrpreis 4 € abgezogen', m0 - p['money'] == 4, f"{m0} → {p['money']}")
    top_y = p['y']
    t = 0.0
    while t < 60 and await g.js(f"()=>!!{N}.riding"):
        await g.step(0.5); t += 0.5
        top_y = max(top_y, (await player(g))['y'])
    p = await player(g)
    d = ((p['x'] - berg['board'][0]) ** 2 + (p['z'] - berg['board'][1]) ** 2) ** 0.5
    g.check('Fahrt endet (riding wieder null)', not await g.js(f"()=>!!{N}.riding"), f'{t:.1f} s')
    g.check('Ankunft am Bahnsteig der Bergstation (< 4 m)', d < 4, f'{d:.1f} m')
    g.check('Spieler steht auf Bergstations-Höhe', abs(p['y'] - berg['y']) < 1.5, f"{p['y']:.2f} vs {berg['y']:.2f}")
    gy = await g.js(f"([x,z,y])=>{M}.groundYFn(x,z,y)", [p['x'], p['z'], p['y'] + 0.3])
    g.check('Boden unter dem Spieler trägt (groundY = Spielerhöhe)', abs(gy - p['y']) < 0.05, f'{gy:.2f}')
    await g.step(1)
    p2 = await player(g)
    g.check('Spieler fällt oben nicht runter', abs(p2['y'] - p['y']) < 0.3, f"{p['y']:.2f} → {p2['y']:.2f}")

    # 5. wieder runter
    g.check('Wagen steht noch oben', await g.js(f"()=>{N}.phase==='halt'&&{N}.cars.some(c=>c.docked==='berg')"))
    m0 = await board(g, 'berg')
    g.check('F an der Bergstation: eingestiegen', await g.js(f"()=>!!{N}.riding"))
    await step_until(g, f"()=>!{N}.riding", 60, 0.5)
    p = await player(g)
    g.check('Talfahrt: Spieler unten auf Talstations-Höhe', abs(p['y'] - tal['y']) < 1.6 and not await g.js(f"()=>!!{N}.riding"), f"{p['y']:.2f}")
    g.check('Talfahrt kostet ebenfalls 4 €', m0 - p['money'] == 4, f"{m0} → {p['money']}")

    # 6. F ohne Wagen an der Station: kein Einsteigen, kein Geld weg
    await step_until(g, f"()=>{N}.phase==='fahrt'", 20)
    m0 = await board(g, 'tal')
    g.check('F während der Fahrt: nicht eingestiegen, kein Geld abgezogen',
            not await g.js(f"()=>!!{N}.riding") and (await player(g))['money'] == m0)

    # 7. Viadukt begehbar
    mid = await g.js(f"()=>{{const N={N};const p=N.w(47,3.5);return {{x:p[0],z:p[1],y:N.deckY(47)}}}}")
    gy = await g.js(f"([x,z])=>{M}.groundYFn(x,z,60)", [mid['x'], mid['z']])
    g.check('Treppenweg trägt auf Viadukt-Höhe', abs(gy - mid['y']) < 0.25, f"{gy:.2f} vs {mid['y']:.2f}")
    await g.js(f"([x,z,y])=>{{const P={M}.P1;P.h.x=x;P.h.z=z;P.h.y=y;P.vy=0}}", [mid['x'], mid['z'], mid['y']])
    await g.step(1)
    p = await player(g)
    g.check('Spieler steht auf dem Viadukt', abs(p['y'] - mid['y']) < 0.3, f"{p['y']:.2f}")
    under = await g.js(f"([x,z])=>{M}.groundYFn(x,z,0)", [mid['x'], mid['z']])
    g.check('unter dem Viadukt bleibt der Boden auf 0', abs(under) < 0.01, under)

    # 8. Kochbrunnen
    await g.js(f"([x,z])=>{{const M={M},P=M.P1;P.h.x=x+1.9;P.h.z=z;P.h.y=M.groundYFn(P.h.x,P.h.z,1);P.vy=0;P.h.health=20}}", [b['x'], b['z']])
    await g.step(0.3)
    await g.key('KeyE')
    s = await g.js(f"()=>({{hp:{M}.P1.h.health,stink:{N}.stinkT,cool:{N}.cool}})")
    g.check('E am Kochbrunnen heilt voll', s['hp'] == 100, s)
    g.check('Stinke-Effekt aktiv (stinkT > 25 s)', s['stink'] > 25, s)
    ped = await g.js(f"""()=>{{const M={M},P=M.P1.h;const h=M.mkHuman('ped');h.x=P.x+3;h.z=P.z+0.5;h.y=P.y;h.state='walk';h.wps=null;h.sync();
        window.__neroPed=h;return Math.hypot(h.x-P.x,h.z-P.z)}}""")
    await g.step(0.5)
    r = await g.js(f"()=>{{const h=window.__neroPed;return {{txt:h.bubble?h.bubble.textContent:'',id:h.neroEkelId||0,st:h.state,expr:h.fx?h.fx.exprName:'',lines:{N}.STINK_LINES}}}}")
    g.check('Passant reagiert mit Sprechblase (Hessisch)', r['txt'] in r['lines'], r['txt'])
    g.check('Passant flieht (hält Abstand)', r['st'] == 'flee', r['st'])
    await g.step(1.5)
    d2 = await g.js("()=>{const h=window.__neroPed,P=__MEENZ.P1.h;return Math.hypot(h.x-P.x,h.z-P.z)}")
    g.check('Passant entfernt sich', d2 > ped + 1, f'{ped:.1f} → {d2:.1f} m')
    await g.js(f"()=>{{{M}.P1.h.health=30}}")
    await g.key('KeyE')
    g.check('Abklingzeit: sofortiges Nachtrinken heilt nicht', await g.js(f"()=>{M}.P1.h.health") == 30 and await g.js(f"()=>{N}.cool") > 0)
    await g.js(f"()=>{{{N}.cool=0.3}}")
    await g.step(0.5)
    await g.key('KeyE')
    g.check('nach der Abklingzeit heilt der Brunnen wieder', await g.js(f"()=>{M}.P1.h.health") == 100)
    await g.step(31)
    g.check('Stinke-Effekt endet nach 30 s', await g.js(f"()=>{N}.stinkT") == 0)


PLACE = """([s,l,yaw,pitch,zoom,yHint])=>{const M=__MEENZ,N=M.NERO,P=M.P1;const p=N.w(s,l);P.h.x=p[0];P.h.z=p[1];P.h.y=M.groundYFn(p[0],p[1],yHint);P.vy=0;
  const o=N.w(0,0),U=[N.w(1,0)[0]-o[0],N.w(1,0)[1]-o[1]],Q=[N.w(0,1)[0]-o[0],N.w(0,1)[1]-o[1]];
  const d={U,mN:[-Q[0],-Q[1]],N:Q,city:[N.brunnen.x-p[0],N.brunnen.z-p[1]]}[yaw];P.cam.yaw=Math.atan2(d[0],d[1]);P.cam.pitch=pitch;P.cam.zoom=zoom;P.cam.lastLook=1e9}"""


async def shot(g, name, args):
    """Spieler an Gleiskoordinate (s, l) stellen, Kamera einschwingen lassen, Bild nach tests/out/."""
    for _ in range(2):
        await g.js(PLACE, args)
        await g.step(1)
    print(await g.snap(name, 3))


async def shots(g):
    await g.start()
    await g.js(f"()=>{{const M={M};M.gameMin=14*60;M.setWeather('klar');const N=M.NERO;N.phase='fahrt';N.p0=0;N.p1=1;N.t=N.RIDE*0.45}}")
    await shot(g, 'nero_viadukt', [45, 60, 'mN', 0.2, 2.2, 0])       # Viadukt von der Seite, Wagen in der Ausweiche
    await shot(g, 'nero_talstation', [-32, 4, 'U', 0.15, 1.6, 0])    # Talstation von der Stadtseite
    await shot(g, 'nero_terrasse', [95, 9, 'city', 0.25, 1.0, 40])   # Aussichtsterrasse Richtung Wiesbaden
    await shot(g, 'nero_kulisse', [95, 2, 'U', -0.05, 1.0, 40])      # Kulissen-Neroberg hinter dem Kartenrand
    # Mitfahrt mit Blick über Wiesbaden
    await g.js(f"()=>{{const N={M}.NERO;N.phase='halt';N.prog=0;N.t=N.DWELL-1}}")
    await g.step(0.1)
    await board(g, 'tal')
    await g.step(20)
    print(await g.snap('nero_fahrt', 4))
    await step_until(g, f"()=>!{N}.riding", 40, 0.5)
    # Kochbrunnen mit Dampf, dann Stinke-Wolke mit echten Passanten
    await g.js(f"()=>{{const M={M},b=M.NERO.brunnen,P=M.P1;P.h.x=b.x+7;P.h.z=b.z+6;P.h.y=0;P.cam.yaw=Math.atan2(b.x-P.h.x,b.z-P.h.z);P.cam.pitch=0.12;P.cam.zoom=1}}")
    await g.step(4)
    print(await g.snap('nero_kochbrunnen', 4))
    await g.js(f"()=>{{const M={M},b=M.NERO.brunnen,P=M.P1;P.h.x=b.x+2.1;P.h.z=b.z;P.h.y=0.3;P.cam.yaw=-Math.PI/2+0.5;P.cam.pitch=0.25;P.cam.zoom=1.5}}")
    await g.step(0.5)
    await g.key('KeyE')
    await g.js(f"()=>{{const M={M},P=M.P1.h;let k=0;for(const h of M.HUMANS){{if(h.kind!=='ped'||h.mission||h===P||!h.alive||h.inCar)continue;h.x=P.x+4+k;h.z=P.z+3-k*2.5;h.y=0;if(++k>=3)break;}}}}")
    await g.step(1.0)
    print(await g.snap('nero_stinke', 3))


if os.environ.get('NERO_SHOT'):
    run(shots, real=True)
else:
    run(test)
