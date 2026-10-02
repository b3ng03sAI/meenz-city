# Neustadt + Zollhafen: Kranhaus, Gründerzeit-Fassaden, Wochenmarkt Gartenfeldplatz, Kranbar (begehbar),
# Straßenszenen auf Meenzerisch, dichterer Rheinallee-Verkehr, Schnellreiseziele
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
KRAN_REAL = (-770, -1650)   # Südende des Zollhafenbeckens (Kai-Seite), siehe NEUST_KRAN_TARGET
FT_NAMES = ['Zollhafen & Kranhaus', 'Gartenfeldplatz (Wochenmarkt)', 'Feldbergplatz']

ROOM = f"()=>{{const h={M}.P1.h;return {{in:!!h.room,name:h.room&&h.room.name,people:h.room&&h.room.people.length,lx:h.room?h.x-h.room.ox:null,lz:h.room?h.z-h.room.oz:null,x:h.x,z:h.z}}}}"
TELE = f"([x,z])=>{{const M={M},h=M.P1.h;if(M.P1.car)M.exitCar(M.P1,true);h.x=x;h.z=z;h.y=M.groundYFn(x,z,0);h.sync&&h.sync();}}"

PEDS = f"()=>[{M}.HUMANS.filter(h=>h.kind==='ped'&&h.alive).length,{M}.NEUST.pedCap()]"
PEDS_OK = f"()=>{M}.HUMANS.filter(h=>h.kind==='ped'&&h.alive).length<={M}.NEUST.pedCap()"


async def market_state(g):
    return await g.js(f"""()=>{{const N={M}.NEUST.markt;const near=N.vendors.filter(h=>h.alive&&!h.removed&&N.stands.some(s=>Math.hypot(s.x-h.x,s.z-h.z)<3));
        return {{on:N.on,stands:N.stands.length,vendors:N.vendors.length,shoppers:N.shoppers.length,nearStand:near.length,visible:!!(N.grp&&N.grp.visible),
          inHumans:N.vendors.filter(h=>{M}.HUMANS.includes(h)).length}}}}""")


async def test(g):
    await g.start()
    g.check('NEUST eingerichtet', await g.js(f"()=>{M}.NEUST.ready===true"))

    # 1. Kranhaus nahe der realen Lage, mit Kollision und begehbarem Dach
    k = await g.js(f"""()=>{{const M={M},K=M.NEUST.kranhaus;if(!K)return null;const F=(lx,lz)=>[K.x+Math.sin(K.a)*lx+Math.cos(K.a)*lz,K.z+Math.cos(K.a)*lx-Math.sin(K.a)*lz];
        const c=F(0,0),b=F(8,0);return {{x:K.x,z:K.z,meshes:K.meshes,crane:!!K.crane,solid:M.blockedFn(c[0],c[1],0.5),roof:M.groundYFn(b[0],b[1],31),door:K.door}}}}""")
    g.check('Kranhaus vorhanden', k is not None)
    d = ((k['x'] - KRAN_REAL[0]) ** 2 + (k['z'] - KRAN_REAL[1]) ** 2) ** 0.5
    g.check('Kranhaus < 120 m von der realen Lage am Zollhafenbecken', d < 120, f'{d:.0f} m')
    g.check('Kranhaus aus wenigen geteilten Meshes (<= 8) + historischer Kran', 3 <= k['meshes'] <= 8 and k['crane'], k['meshes'])
    g.check('Kranhaus-Sockel blockiert', k['solid'])
    g.check('Kranhaus-Dach ist begehbar (Höhe ~30 m)', 29 < k['roof'] < 31, k['roof'])
    prom = await g.js(f"()=>{M}.NEUST.promenade.map(p=>p.kind)")
    g.check('Hafenpromenade mit Pollern, Bänken, Laternen', len(prom) >= 15 and {'poller', 'bank', 'laterne'} <= set(prom), len(prom))

    # 2. Gründerzeit-Fassaden (Neustadt) und Neubauten (Zollhafen)
    gz = await g.js(f"""()=>{{const B={M}.BUILDINGS;const m=B.filter(b=>b.neustGz),z=B.filter(b=>b.neustZoll);
        return {{n:m.length,neust:m.every(b=>b.dist==='Neustadt'),styles:[...new Set(m.map(b=>b.style))],zoll:z.length,modern:z.every(b=>b.style==='modern'&&b.roof===0),cnt:{M}.NEUST.gz,built:{M}.NEUST.gzBuilt}}}}""")
    g.check('Gründerzeit-Variante an >= 500 Neustadt-Gebäuden', gz['n'] >= 500 and gz['n'] == gz['cnt'], gz['n'])
    g.check('Gründerzeit nur in der Neustadt, nur Putz/Sandstein', gz['neust'] and set(gz['styles']) <= {'plaster', 'sandstone'}, gz['styles'])
    g.check('Zollhafen-Neubauten modern mit Flachdach (>= 20)', gz['zoll'] >= 20 and gz['modern'], gz['zoll'])
    # Chunks in der Neustadt bauen (Schnellreise erzwingt den Chunk-Bau am Ziel; im Stub folgt die Kamera nicht)
    b0 = gz['built']
    dest = await g.js(f"()=>{{const M={M};const d=M.ftDestinations().find(d=>d.n==='Gartenfeldplatz (Wochenmarkt)');M.fastTravel(d);return {{x:d.x,z:d.z}}}}")
    await g.page.wait_for_function("(d)=>{const h=__MEENZ.P1.h;return Math.hypot(h.x-d.x,h.z-d.z)<15}", arg=dest, polling=50, timeout=5000)
    b1 = await g.js(f"()=>{M}.NEUST.gzBuilt")
    g.check('Fassadendetails werden beim Chunk-Bau in der Neustadt erzeugt', b1 > b0, f'{b0}→{b1}')

    # 3. Wochenmarkt Gartenfeldplatz: läuft 7–13 Uhr, sonst nicht
    c = await g.js(f"()=>[{M}.NEUST.markt.x,{M}.NEUST.markt.z]")
    await g.js(f"()=>{{{M}.gameMin=5*60}}")
    await g.js(TELE, [c[0] + 12, c[1] + 12])
    await g.step(1)
    s = await market_state(g)
    g.check('5 Uhr: kein Markt', not s['on'] and s['vendors'] == 0, s)
    # Passanten bis zur Obergrenze auffüllen (wartende Fußgänger 150 m entfernt)
    await g.js(f"""()=>{{const M={M},h0=M.P1.h;let n=M.HUMANS.filter(h=>h.kind==='ped'&&h.alive).length;
        for(let k=0;n<M.NEUST.pedCap();k++,n++){{const h=M.mkHuman('ped');h.x=h0.x+150*Math.sin(k);h.z=h0.z+150*Math.cos(k);h.y=M.groundYFn(h.x,h.z,0);h.state='wait';h.sync();}}}}""")
    pc = await g.js(PEDS)
    g.check('Fußgänger vor dem Markt an der Obergrenze', pc[0] >= pc[1] - 4, pc)
    await g.js(f"()=>{{{M}.gameMin=9*60}}")
    await g.step(1)
    s = await market_state(g)
    g.check('9 Uhr: Markt läuft', s['on'], s)
    g.check('>= 6 Stände, aufgebaut und sichtbar', s['stands'] >= 6 and s['visible'], s)
    g.check('je Stand ein Händler an seinem Stand', s['vendors'] == s['stands'] and s['nearStand'] == s['stands'] and s['inHumans'] == s['vendors'], s)
    g.check('Kundschaft unterwegs (>= 4)', s['shoppers'] >= 4, s['shoppers'])
    g.check('Marktleute kommen aus der Fußgänger-Obergrenze (keine Figuren zusätzlich)', await g.js(PEDS_OK), await g.js(PEDS))
    p0 = await g.js(f"()=>{M}.NEUST.markt.shoppers.map(h=>[h.x,h.z])")
    talk = False
    for _ in range(12):
        await g.step(2)
        talk = talk or await g.js(f"()=>{M}.NEUST.markt.vendors.concat({M}.NEUST.markt.shoppers).some(h=>h.bubble&&h.bubble.textContent.length>3)")
    p1 = await g.js(f"()=>{M}.NEUST.markt.shoppers.map(h=>[h.x,h.z])")
    moved = sum(1 for a, b in zip(p0, p1) if ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5 > 1)
    g.check('Händler/Kundschaft reden (Sprechblasen)', talk)
    g.check('Kundschaft geht von Stand zu Stand', moved >= 2, moved)
    people = await g.js(f"()=>{{window.__nm={M}.NEUST.markt.vendors.concat({M}.NEUST.markt.shoppers);return window.__nm.length}}")
    await g.js(f"()=>{{{M}.gameMin=14*60}}")
    await g.step(1)
    s = await market_state(g)
    gone = await g.js("()=>window.__nm.every(h=>h.removed||h.state==='talk')")
    g.check('14 Uhr: Markt beendet, Händler weg, Stände abgebaut', not s['on'] and s['vendors'] == 0 and gone and not s['visible'], s)

    # 4. Kranbar betreten und wieder verlassen
    door = k['door']
    await g.js(TELE, [door[0], door[1]])
    await g.step(0.6)
    near = await g.js(f"()=>{{const v={M}.venueNear({M}.P1.h.x,{M}.P1.h.z);return v&&v.id}}")
    g.check('Tür der Kranbar erkannt', near == 'kranbar', near)
    await g.key('KeyF', after=1.5)
    r = await g.js(ROOM)
    g.check('Kranbar betreten', r['in'] and r['name'] == 'Kranbar am Zollhafen', r['name'])
    g.check('Leute in der Kranbar (>= 6)', (r['people'] or 0) >= 6, r['people'])
    await g.key('KeyW', hold=1.5, after=0)
    w = await g.js(ROOM)
    g.check('Laufen bleibt im Raum', w['in'], [w['lx'], w['lz']])
    await g.js(f"""()=>{{const M={M};const P=M.P1,h=P.h,r=h.room,e=r.venue.exits[0];h.x=r.ox+e.x;h.z=r.oz+e.z-3;P.cam.yaw=0;}}""")
    await g.page.keyboard.down('KeyW')
    for _ in range(30):
        await g.step(0.1)
        if not await g.js(f"()=>!!{M}.P1.h.room"): break
    await g.page.keyboard.up('KeyW')
    e = await g.js(ROOM)
    dd = ((e['x'] - door[0]) ** 2 + (e['z'] - door[1]) ** 2) ** 0.5
    g.check('Kranbar verlassen, vor der Tür', not e['in'] and dd < 4, f'{dd:.1f} m')

    # 5. Straßenszenen: Leute erscheinen und unterhalten sich auf Meenzerisch
    scenes = await g.js(f"()=>{M}.NEUST.scenes.map(s=>[s.id,s.x,s.z])")
    g.check('fünf Straßenszenen', {s[0] for s in scenes} >= {'feldberg', 'spielplatz', 'frauenlob', 'zollhafen', 'rheinallee'}, [s[0] for s in scenes])
    for sid, x, z in scenes:
        await g.js(TELE, [x + 6, z + 6])
        await g.step(1)
        a = await g.js(f"(id)=>{{const s={M}.NEUST.scenes.find(s=>s.id===id);return [s.active,s.people.filter(h=>h.alive&&!h.removed).length,s.said]}}", sid)
        await g.step(12)
        b = await g.js(f"(id)=>{{const s={M}.NEUST.scenes.find(s=>s.id===id);return [s.said,s.people.some(h=>h.bubble)]}}", sid)
        g.check(f'Szene {sid}: aktiv mit >= 2 Leuten, Dialog läuft', a[0] and a[1] >= 2 and b[0] > a[2], [a, b])
        g.check(f'Szene {sid}: Fußgänger-Obergrenze eingehalten', await g.js(PEDS_OK), await g.js(PEDS))
    far = await g.js(f"()=>{{const M={M};const s=M.NEUST.scenes[0];const h=M.P1.h;h.x=s.x+400;h.z=s.z;for(let i=0;i<10;i++)M.update(0.1);return [s.active,s.people.length]}}")
    g.check('Szene baut sich in der Ferne ab', far == [False, 0], far)

    # 6. Rheinallee: höherer Anteil an Neuspawns, gleiche Obergrenze
    mid = await g.js(f"()=>{{const R={M}.NEUST.ra;let b=null,bd=1e9;for(const m of R.mids){{const d=Math.hypot(m[0]+905,m[1]+1495);if(d<bd){{bd=d;b=m;}}}}return b}}")
    g.check('Rheinallee-Kanten gefunden', mid is not None and await g.js(f"()=>{M}.NEUST.ra.edges.length") > 20)

    CLEAR = f"()=>{{const M={M};for(const c of [...M.CARS])if(c.ai.mode==='traffic'&&!c.mission&&!c.persist&&M.P1.car!==c)c.remove();}}"
    TRAFFIC = f"()=>{M}.CARS.filter(c=>c.ai.mode==='traffic').length"

    async def traffic_share(bias):
        await g.js(f"(b)=>{{const R={M}.NEUST.ra;R.bias=b;R.spawned=0;R.onRa=0;}}", bias)
        await g.js(TELE, [mid[0] + 8, mid[1] + 8])
        await g.reseed(35)
        for _ in range(12):   # Verkehr immer wieder leeren, damit laufend neu gespawnt wird
            await g.js(CLEAR)
            await g.step(2.5)
        r = await g.js(f"()=>{{const R={M}.NEUST.ra;return [R.onRa,R.spawned]}}")
        return r[0] / max(1, r[1]), r[1]

    s0, n0 = await traffic_share(0)
    s1, n1 = await traffic_share(0.5)
    g.check('Neuspawns in beiden Läufen', n0 >= 8 and n1 >= 30, [n0, n1])
    g.check('Rheinallee-Anteil mit Bias deutlich höher als ohne', s1 > s0 + 0.15, f'{s0:.2f} → {s1:.2f}')
    # Obergrenze: ohne Leeren füllt sich der Verkehr bis zum Limit, aber nicht darüber
    cap = await g.js(f"()=>{M}.NEUST.ra.cap")
    top = 0
    for _ in range(20):
        await g.step(2)
        top = max(top, await g.js(TRAFFIC))
    g.check('Verkehr bleibt mit Bias unter der Obergrenze', 0 < top <= cap, [top, cap])
    await g.js(f"()=>{{{M}.NEUST.ra.bias=0.5}}")

    # 7. Schnellreise
    fts = await g.js(f"()=>{M}.ftDestinations().filter(d=>d.g==='Neustadt').map(d=>d.n)")
    g.check('drei Neustadt-Schnellreiseziele', set(FT_NAMES) <= set(fts), fts)
    sp = await g.js(f"()=>{M}.ftDestinations().filter(d=>d.special&&/Kran|Gartenfeld|Feldberg/.test(d.n)).length")
    g.check('Neustadt-Ziele zählen nicht als besondere Orte', sp == 0, sp)
    dest = await g.js(f"()=>{{const M={M};M.setWanted(0);const d=M.ftDestinations().find(d=>d.n==='Zollhafen & Kranhaus');M.fastTravel(d);return {{x:d.x,z:d.z}}}}")
    await g.page.wait_for_function("(d)=>{const h=__MEENZ.P1.h;return Math.hypot(h.x-d.x,h.z-d.z)<15}", arg=dest, polling=50, timeout=5000)
    p = await g.js(f"()=>{{const M={M},K=M.NEUST.kranhaus,h=M.P1.h;return Math.hypot(h.x-K.x,h.z-K.z)}}")
    g.check('Schnellreise „Zollhafen & Kranhaus“ landet am Kranhaus', p < 40, f'{p:.1f} m')
    await g.step(0.5)

# Kamera: Spieler steht bei (x,z) und schaut auf (tx,tz)
LOOK = f"""([x,z,tx,tz,pitch])=>{{const M={M},P=M.P1,h=P.h;if(P.car)M.exitCar(P,true);h.x=x;h.z=z;h.y=M.groundYFn(x,z,0);
    h.facing=P.cam.yaw=Math.atan2(tx-x,tz-z);P.cam.pitch=pitch;h.sync&&h.sync();}}"""
# Draw-Calls mit und ohne alle Neustadt-Objekte (eigene Meshes + Figuren der Szenen/des Marktes) im selben Frame
# Figuren zählen zur Fußgänger-Obergrenze (ersetzen ferne Passanten) – hier nur die zusätzlichen Modelle/Möbel
DELTA = f"""()=>{{const N={M}.NEUST;const people=[...N.markt.vendors,...N.markt.shoppers,...N.scenes.flatMap(s=>s.people)].filter(h=>!h.removed).length;
    const on=N.drawCalls();const vis=N.meshes.map(m=>m.visible);N.meshes.forEach(m=>m.visible=false);
    const off=N.drawCalls();N.meshes.forEach((m,i)=>m.visible=vis[i]);
    const peds={M}.HUMANS.filter(h=>h.kind==='ped'&&h.alive).length;return {{on,off,delta:on-off,people,peds,cap:N.pedCap()}}}}"""


async def shots(g):
    await g.start()
    heap0 = await g.js("()=>performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):null")
    await g.js(f"()=>{{const M={M};M.setWeather('klar');M.gameMin=9*60+30;M.setWanted(0)}}")
    st = await g.js(f"()=>{M}.NEUST.stats()")
    g.check('eigene Geometrie + Fassadendetails < 25 MB', st['bytes'] + st['gzBytes'] < 25e6, st)
    print(f"  Geometrie: {st['meshes']} Meshes, {st['bytes']/1e6:.1f} MB eigene + ~{st['gzBytes']/1e6:.1f} MB Fassadendetails (bisher gebaut); Heap {heap0} MB")

    # Zollhafen: Kranhaus von der Landseite, schräg
    # Standort mit freier Sicht: Land, 70–130 m entfernt, dazwischen nur Wasser/Freifläche
    v = await g.js(f"""()=>{{const M={M},K=M.NEUST.kranhaus;const c=[K.x+Math.sin(K.a)*8,K.z+Math.cos(K.a)*8];
        for(let d=80;d<=140;d+=10)for(let q=0;q<64;q++){{const a=q/64*Math.PI*2;const x=c[0]+Math.sin(a)*d,z=c[1]+Math.cos(a)*d;
          if(M.gridH(x,z)!==0||(M.mfG(M.idx(x,z))&6))continue;let ok=true;for(let t=0.1;t<0.82&&ok;t+=0.03){{const h=M.gridH(x+(c[0]-x)*t,z+(c[1]-z)*t);if(h>0&&h<255)ok=false;}}
          if(ok)return [x,z,c[0],c[1]];}}return null}}""")
    g.check('Aussichtspunkt aufs Kranhaus gefunden', v is not None)
    await g.js(LOOK, [v[0], v[1], v[2], v[3], -0.15])
    await g.step(2)
    print('  Bild:', await g.snap('neust_kranhaus'))
    d = await g.js(DELTA)
    g.check('Zollhafen: <= 150 zusätzliche Draw-Calls, Figuren innerhalb der Obergrenze', d['delta'] <= 150 and d['peds'] <= d['cap'], d)

    # Wochenmarkt Gartenfeldplatz (9:30 Uhr)
    c = await g.js(f"()=>[{M}.NEUST.markt.x,{M}.NEUST.markt.z]")
    await g.js(LOOK, [c[0] + 14, c[1] + 14, c[0], c[1], 0.2])
    await g.step(2)
    g.check('Markt läuft im Bild', await g.js(f"()=>{M}.NEUST.markt.on"))
    print('  Bild:', await g.snap('neust_markt'))
    d = await g.js(DELTA)
    g.check('Gartenfeldplatz mit Markt: <= 150 zusätzliche Draw-Calls, Figuren innerhalb der Obergrenze', d['delta'] <= 150 and d['peds'] <= d['cap'], d)

    # Feldbergplatz: Café-Terrassen
    t = await g.js(f"()=>{{const C={M}.NEUST.cafe;return [C.tables[0].x,C.tables[0].z,C.x,C.z]}}")
    await g.js(LOOK, [t[0] + 7, t[1] + 7, t[0], t[1], 0.15])
    await g.step(2)
    print('  Bild:', await g.snap('neust_feldberg'))
    d = await g.js(DELTA)
    g.check('Feldbergplatz: <= 150 zusätzliche Draw-Calls, Figuren innerhalb der Obergrenze', d['delta'] <= 150 and d['peds'] <= d['cap'], d)

    # Kranbar innen
    door = await g.js(f"()=>{M}.NEUST.kranhaus.door")
    await g.js(LOOK, [door[0], door[1], door[0] + 1, door[1], 0.1])
    await g.step(0.5)
    await g.key('KeyF', after=1.5)
    g.check('in der Kranbar', await g.js(f"()=>!!{M}.P1.h.room"))
    await g.js(f"()=>{{const P={M}.P1;P.cam.yaw=Math.PI;P.cam.pitch=0.1}}")
    await g.step(0.5)
    print('  Bild:', await g.snap('neust_kranbar'))
    heap1 = await g.js("()=>performance.memory?Math.round(performance.memory.usedJSHeapSize/1e6):null")
    print(f'  Heap nach Rundgang: {heap1} MB')


if len(sys.argv) > 1 and sys.argv[1] == 'real':
    run(shots, real=True)
else:
    run(test)
