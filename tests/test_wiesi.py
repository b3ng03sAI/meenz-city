# Wiesbaden Innenstadt + Westend (Paket 42): Schlossplatz (Marktbrunnen, Rathaus mit Ratskeller, Landtag, Standesamt),
# Wilhelmstraße + Warmer Damm (Bänke, Litfaßsäulen, Café, Fontäne, Enten, Flaneure), Luisenplatz (Waterloo-Obelisk, Tauben,
# Straßenmusik), Wellritzstraße (Auslagen, Lichterketten, Kicker, Teestubb), Mundart-Gespräche, Schnellreise.
# Lazy (Vertrag Welle 9): nichts beim Boot, Bau < 350 m, Freigabe > 500 m, zweiter Bau fehlerfrei, eigener Zufallsstrom.
# `python3 tests/test_wiesi.py real` misst zusätzlich die Draw-Calls je Zone (echtes three.js) und macht Screenshots
# nach tests/out/wiesi_*.jpg.
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
W = f'{M}.WIESI'
REAL = 'real' in sys.argv[1:]
KEYS = ['schloss', 'wilhelm', 'luisen', 'westend']
ZSTATE = "Z=>({name:Z.name,built:Z.built,group:Z.group===null,owned:Z.owned.length,npcs:Z.npcs.length,builds:Z.builds,disposes:Z.disposes})"


async def tp(g, x, z, step=None):
    await g.js(f"()=>{{const M={M},P=M.P1;if(P.car)M.exitCar(P,true);P.h.x={x};P.h.z={z};P.h.y=M.groundYFn({x},{z});P.vy=0}}")
    if step: await g.step(step)


async def tp_home(g):
    x, z = await g.js(f"()=>{M}.POI.markt")
    await tp(g, x, z, 1.0)


async def zone(g, k):
    return await g.js(f"(k)=>({ZSTATE})({W}.zone[k])", k)


def built_ok(z, npcs=1):
    return z['built'] and not z['group'] and z['owned'] > 0 and z['npcs'] >= npcs


async def scenes(g, k):
    return await g.js(f"(k)=>{{const W={W};return Object.fromEntries(W.scenes.filter(s=>s.zone===W.zone[k]).map(s=>[s.id,{{active:s.active,n:s.npcs.length,lines:s.lines}}]))}}", k)


async def talk(g, scene, i=0, choice=0):
    """Stellt sich vor NPC i der Szene, spricht ihn an und wählt eine Antwort; liefert [Eröffnung, gültige Eröffnungen], Zustand danach."""
    r = await g.js(f"""([id,i])=>{{const M={M},sc=M.WIESI.scenes.find(s=>s.id===id),h=sc.npcs[i],P=M.P1;M.G.money=Math.max(M.G.money,50);window.__wm=M.G.money;
        P.h.x=h.x+Math.sin(h.facing)*1.3;P.h.z=h.z+Math.cos(h.facing)*1.3;P.h.facing=h.facing+Math.PI;P.h.health=50;M.startTalk(P,h);return [M.TALK?M.TALK.line:'kein TALK',M.WIESI.convs[h.wconv].map(c=>c.o),h.wconv]}}""", [scene, i])
    await g.step(4)
    await g.js(f"(c)=>{M}.chooseTalk(c)", choice)
    await g.step(9)
    after = await g.js(f"([id,i])=>{{const M={M},sc=M.WIESI.scenes.find(s=>s.id===id),h=sc.npcs[i];return {{talk:!!M.TALK,state:h.state,money:window.__wm-M.G.money,health:M.P1.h.health}}}}", [scene, i])
    return r, after


async def venue_visit(g, vid, buy_money, buy_health):
    door = await g.js(f"(id)=>{{const v={M}.VENUES.find(v=>v.id===id);return v&&v.door}}", vid)
    g.check(f'{vid}: Tür platziert', door is not None, door)
    probe = await g.js(f"""(d)=>{{const M={M},nx=Math.sin(d[2]),nz=Math.cos(d[2]);return {{door:M.blockedFn(d[0],d[1]),wall:M.blockedFn(d[0]-nx*2.2,d[1]-nz*2.2),near:(M.venueNear(d[0],d[1])||{{}}).id}}}}""", door)
    g.check(f'{vid}: Tür frei, Wand dahinter, venueNear erkennt sie', not probe['door'] and probe['wall'] and probe['near'] == vid, probe)
    await g.js(f"(d)=>{{const h={M}.P1.h;h.x=d[0];h.z=d[1];h.y=0}}", door)
    await g.step(0.5)
    await g.key('KeyF', after=1.0)
    r = await g.js(f"()=>{{const r={M}.INDOOR();return r&&r.venue?{{id:r.venue.id,people:r.people.length}}:null}}")
    g.check(f'{vid}: betreten, Gäste drin', r and r['id'] == vid and r['people'] >= 6, r)
    hint = await g.js(f"()=>{{const r={M}.INDOOR(),k=r.venue.hints[0];return [k.x,k.z]}}")
    buy = await g.js(f"""(p)=>{{const M={M},P=M.P1,r=M.INDOOR();P.h.x=r.ox+p[0];P.h.z=r.oz+p[1];M.G.money=Math.max(M.G.money,20);P.h.health=50;const m0=M.G.money;r.venue.interact(P,r);return [m0-M.G.money,P.h.health]}}""", hint)
    g.check(f'{vid}: an der Theke kaufen ({buy_money} €, +{buy_health} Gesundheit)', buy == [buy_money, 50 + buy_health], buy)
    await g.js(f"""()=>{{const M={M},P=M.P1,h=P.h,r=h.room,e=r.venue.exits[0];h.x=r.ox+e.x;h.z=r.oz+e.z-3;P.cam.yaw=0;}}""")
    await g.page.keyboard.down('KeyW')
    for _ in range(30):
        await g.step(0.1)
        if not await g.js(f"()=>!!{M}.P1.h.room"): break
    await g.page.keyboard.up('KeyW')
    await g.step(0.2)
    o = await g.js(f"(d)=>{{const M={M},h=M.P1.h;return {{room:!!h.room,indoor:!!M.INDOOR(),d:Math.hypot(h.x-d[0],h.z-d[1]),blocked:M.blockedFn(h.x,h.z,0)}}}}", door)
    g.check(f'{vid}: zu Fuß raus, vor der Tür, nicht in der Wand', not o['room'] and not o['indoor'] and o['d'] < 3 and not o['blocked'], o)


async def real_checks(g):
    await g.js(f"()=>{{const M={M};M.gameMin=14*60;M.setWeather&&M.setWeather('klar');}}")
    views = {
        'schloss': f"()=>{{const S={W}.st.schloss,B=S.brunnen;return [B.x+16,B.z-14,B.x-8,B.z+12,0.12,1.6]}}",
        'wilhelm': f"()=>{{const S={W}.st.wilhelm,p=S.pond;return [p.x-38,p.z+22,p.x,p.z,0.22,1.8]}}",
        'luisen': f"()=>{{const O={W}.st.luisen.obelisk;return [O.x+6,O.z+24,O.x,O.z,0.05,1.6]}}",
        'westend': f"()=>[-2918,-9333,-3000,-9326,0.2,1.5]",
    }
    close = {
        'schloss': [('wiesi_brunnen', f"()=>{{const B={W}.st.schloss.brunnen;return [B.x+7,B.z+5,B.x,B.z,0.25,1.0]}}"),
                    ('wiesi_landtag', f"()=>{{const S={W}.st.schloss.stele;return [S.x+12,S.z+6,S.x-6,S.z,0.15,1.2]}}")],
        'westend': [('wiesi_auslage', f"()=>{{const S={W}.st.westend.main;return [S.x+Math.sin(S.f)*7+S.tx*3,S.z+Math.cos(S.f)*7+S.tz*3,S.x,S.z,0.1,0.9]}}")],
    }
    dcs = {}
    for k in KEYS:
        await tp_home(g)
        x, z, tx, tz, pitch, zoom = await g.js(f"(k)=>{{const Z={W}.zone[k];return [Z.x,Z.z,0,0,0,0]}}", k)
        await tp(g, x, z, 1.0)
        x, z, tx, tz, pitch, zoom = await g.js(views[k])
        await g.js(f"([x,z,tx,tz,pitch,zoom])=>{{const M={M},P=M.P1;P.h.x=x;P.h.z=z;P.h.y=M.groundYFn(x,z,0);const yaw=Math.atan2(tx-x,tz-z);P.cam.yaw=yaw;P.h.facing=yaw;P.cam.pitch=pitch;P.cam.zoom=zoom;P.cam.init=false;}}",
                   [x, z, tx, tz, pitch, zoom])
        await g.step(3)
        dcs[k] = await g.js(f"(k)=>{W}.drawCalls()[k]", k)
        built = await g.js(f"()=>{W}.drawCalls()")
        print('  Draw-Calls gebaute Zonen an', k, ':', built)
        print('  Screenshot', await g.snap('wiesi_' + k, 4))
        for name, view in close.get(k, []):
            v = await g.js(view)
            await g.js(f"([x,z,tx,tz,pitch,zoom])=>{{const M={M},P=M.P1;P.h.x=x;P.h.z=z;P.h.y=M.groundYFn(x,z,0);const yaw=Math.atan2(tx-x,tz-z);P.cam.yaw=yaw;P.h.facing=yaw;P.cam.pitch=pitch;P.cam.zoom=zoom;P.cam.init=false;}}", v)
            await g.step(2)
            print('  Screenshot', await g.snap(name, 4))
    print('  Draw-Calls je Zone:', dcs)
    g.check('Draw-Calls je Zone ≤ 150 (gemessen > 0)', all(0 < v <= 150 for v in dcs.values()), dcs)
    for vid, key in (('wiesi_ratskeller', 'schloss'), ('wiesi_teestubb', 'westend')):
        door = await g.js(f"(id)=>{M}.VENUES.find(v=>v.id===id).door", vid)
        await tp(g, door[0], door[1], 1.0)
        await g.js(f"(id)=>{{const M={M};M.enterVenue(M.P1,M.VENUES.find(v=>v.id===id))}}", vid)
        await g.js(f"()=>{{const P={M}.P1,h=P.h,r=h.room;h.x=r.ox;h.z=r.oz+r.D/2-1.6;P.cam.yaw=Math.PI;h.facing=Math.PI;P.cam.pitch=0.15;P.cam.zoom=1.3;P.cam.init=false;}}")
        await g.step(2)
        print('  Screenshot', await g.snap('wiesi_' + vid.split('_')[1], 4))
        await g.js(f"()=>{{const M={M};M.exitVenue(M.P1)}}")
        await g.step(0.3)


async def test(g):
    await g.start()
    g.check('Spiel läuft', await g.js(f"()=>{M}.mode") == 'play')
    # Revierkämpfe ruhigstellen: die Wiesbadener Gang greift Spieler zufällig an – hier nicht Thema (wie test_nero)
    await g.js(f"()=>{{const R={M}.REVIER;if(R){{R.spawnT=R.attackT=R.incomeT=1e9;for(const m of (R.members||[]))if(!m.removed)m.remove();}}}}")

    # (a) Lazy: nach dem Boot am Standard-Start nichts gebaut, keine Szenen, keine Kollision
    zs = await g.js(f"()=>{W}.zones.map({ZSTATE})")
    g.check('(a) vier Wiesbadener Zonen beim Boot leer (built=false, group=null, owned=0, npcs=0)',
            len(zs) == 4 and all(not z['built'] and z['group'] and z['owned'] == 0 and z['npcs'] == 0 for z in zs), zs)
    g.check('(a) Zonen beim Lazy-Helfer angemeldet, > 350 m vom Start',
            await g.js(f"()=>{W}.zones.every(Z=>{M}.LAZY.zones.includes(Z)&&Math.hypot(Z.x-{M}.P1.h.x,Z.z-{M}.P1.h.z)>350)"))
    g.check('(a) beim Boot keine Szenen, keine Kollision, kein Zonen-Zustand',
            await g.js(f"()=>{W}.scenes.length===0&&{W}.hitOn===0&&Object.values({W}.st).every(s=>!s)"))

    # eigener Zufallsstrom: Bau + Update ziehen nichts aus dem globalen Math.random
    # (lazyBuild selbst legt je Zone eine THREE.Group an – im echten three.js zieht deren UUID globale Zufallszahlen; das
    # gehört nicht zum Stadtteil und steckt daher auch in der Vergleichsfolge)
    rng = await g.js(f"""()=>{{const W={W},Grp={M}.P1.h.g.constructor;window.__reseed(77);for(let i=0;i<4;i++)new Grp();const a=[Math.random(),Math.random()];window.__reseed(77);
        for(const k of ['schloss','wilhelm','luisen','westend'])W.forceBuild(k);W.tick(1/60);const b=[Math.random(),Math.random()];
        const built=W.zones.every(Z=>Z.built);for(const k of ['schloss','wilhelm','luisen','westend'])W.forceDispose(k);return {{same:a[0]===b[0]&&a[1]===b[1],built,empty:W.zones.every(Z=>!Z.built&&Z.owned.length===0)}}}}""")
    g.check('Bau aller Zonen + Update verbrauchen keine globalen Zufallszahlen', rng['same'] and rng['built'] and rng['empty'], rng)

    # Schnellreise: drei Ziele, eigene Gruppe, nicht „besonders“, ≥ 120 m von allen anderen Zielen
    ft = await g.js(f"""()=>{{const M={M},L=M.ftDestinations(),mine=L.filter(d=>{W}.ft.includes(d));
        return {{n:mine.map(d=>d.n),g:[...new Set(mine.map(d=>d.g))],special:mine.some(d=>d.special),
        dmin:Math.min(...mine.map(d=>Math.min(...L.filter(o=>o!==d).map(o=>Math.hypot(o.x-d.x,o.z-d.z))))),built:{W}.zones.some(Z=>Z.built)}}}}""")
    g.check('Schnellreise: 3 Ziele (Wilhelmstraße, Luisenplatz, Wellritzstraße) in eigener Wiesbaden-Gruppe',
            len(ft['n']) == 3 and len(ft['g']) == 1 and ft['g'][0].startswith('Wiesbaden') and not ft['special'], ft)
    g.check('Schnellreise: ≥ 120 m Abstand zu allen anderen Zielen, Liste baut nichts', ft['dmin'] >= 120 and not ft['built'], round(ft['dmin']))

    # ---------- Schlossplatz ----------
    # (b) Teleport ins Zentrum → gebaut, Meshes + NPCs
    c = await g.js(f"()=>[{W}.zone.schloss.x,{W}.zone.schloss.z]")
    await tp(g, c[0], c[1], 1.5)
    z = await zone(g, 'schloss')
    g.check('(b) Schlossplatz: Zone gebaut, Meshes + NPCs da', built_ok(z, 9), z)
    s = await g.js(f"()=>{{const S={W}.st.schloss;return {{brunnen:S.brunnen,flags:S.flags.map(f=>f.kind),benches:S.benches.length,planters:S.planters,poller:S.poller,arch:!!S.arch,stele:!!S.stele,plaque:!!S.plaque,signs:S.signs,meshes:S.meshes}}}}")
    g.check('Marktbrunnen mitten auf dem Schlossplatz', s['brunnen'] and abs(s['brunnen']['x'] + 2283) < 15 and abs(s['brunnen']['z'] + 9305) < 15, s['brunnen'])
    b = s['brunnen']
    g.check('Marktbrunnen ist ein Hindernis, Bänke drumherum auch', await g.js(f"()=>{M}.blockedFn({b['x']}+1.5,{b['z']})") and s['benches'] >= 2
            and await g.js(f"()=>{W}.st.schloss.benches.every(o=>{M}.blockedFn(o.x,o.z))"), s['benches'])
    g.check('Rathaus + Landtag: je 3 Fahnen (Hessen, Deutschland, Wiesbaden, Europa)', len(s['flags']) >= 5 and {'hessen', 'deutschland', 'wiesbaden', 'europa'} <= set(s['flags']), s['flags'])
    g.check('Landtag: Plakette, Stele, Pollerreihe; Standesamt: Blumenbogen; ≥ 4 Schilder', s['plaque'] and s['stele'] and s['poller'] >= 5 and s['arch'] and s['signs'] >= 4, s)
    g.check('Ergänzungen statt Ersatz: OSM-Gebäude Rathaus/Stadtschloss bleiben, hinter Portal und Plakette massiv',
            await g.js(f"""()=>{{const M={M};return M.blockedFn(-2264.35-0.545*3.5,-9263.26+0.838*3.5)&&M.blockedFn(-2314.5-0.837*3,-9293-0.547*3)
                &&M.BUILDINGS.some(b=>b.name==='Neues Rathaus')&&M.BUILDINGS.some(b=>b.name==='Stadtschloss Wiesbaden')}}"""))
    sc = await scenes(g, 'schloss')
    g.check('Szenen: Landtag (2 Abgeordnete + Reporterin), Hochzeit am Standesamt, Stadtführung am Brunnen',
            sc.get('landtag', {}).get('n') == 3 and sc.get('hochzeit', {}).get('n', 0) >= 4 and sc.get('brunnen', {}).get('n') == 3, sc)
    names = await g.js(f"()=>{W}.zone.schloss.npcs.filter(h=>!h.removed).map(h=>h.npcName||'')")
    g.check('Politiker frei erfunden (Namen gekennzeichnet)', sum(1 for n in names if 'Abgeordnete' in n and 'frei erfunden' in n) == 2, names)
    upd = await g.js(f"()=>{{window.__reseed(5);const a=Math.random();window.__reseed(5);{W}.tick(1/60);return a===Math.random()}}")
    g.check('Update mit aktiven Szenen zieht keine globalen Zufallszahlen', upd)
    await g.step(14)
    sc = await scenes(g, 'schloss')
    g.check('NPCs babbeln miteinander (Sprechblasen-Dialoge)', sum(v['lines'] for v in sc.values()) >= 2, sc)
    r, after = await talk(g, 'landtag', 0)
    g.check('Gespräch mit Abgeordnetem: Mundart-Dialog aus WIESI.convs.landtag', r[0] in r[1], r[0])
    g.check('Gespräch endet, Abgeordneter bleibt in der Szene', not after['talk'] and after['state'] == 'venue', after)
    r, after = await talk(g, 'hochzeit', 0)
    g.check('Gespräch mit der Braut (Hochzeit, Rivalität Mainz/Wiesbaden)', r[0] in r[1], r[0])

    # Ratskeller (begehbar)
    await venue_visit(g, 'wiesi_ratskeller', 5, 30)

    # ---------- Wilhelmstraße + Warmer Damm ----------
    fw = await g.js(f"()=>{W}.ft.find(d=>/Wilhelm/.test(d.n))")
    await tp(g, fw['x'], fw['z'], 1.5)
    z = await zone(g, 'wilhelm')
    g.check('(b) Wilhelmstraße: Zone gebaut, Meshes + NPCs da', built_ok(z, 5), z)
    s = await g.js(f"""()=>{{const S={W}.st.wilhelm,M={M};return {{pond:S.pond,jet:!!S.jet,ducks:S.ducks.map(d=>[d.x,d.z]),inPond:S.ducks.every(d=>M.groundYFn(d.x,d.z)<0.5),
        pb:S.benches.filter(b=>b.pond).length,rb:S.benches.filter(b=>!b.pond).length,blocked:S.benches.every(b=>M.blockedFn(b.x,b.z)),litfass:S.litfass.map(o=>M.blockedFn(o.x,o.z)),cafe:S.cafe.length,rue:!!S.rue}}}}""")
    g.check('Warmer Damm: Teich aus OSM gefunden, Fontäne in der Mitte', s['pond'] and s['jet'] and abs(s['pond']['x'] + 2011) < 40, s['pond'])
    g.check('Enten im Teich (≥ 4)', len(s['ducks']) >= 4, len(s['ducks']))
    g.check('Bänke am Teich (≥ 3) und an der Rue (≥ 3), alle Hindernisse', s['pb'] >= 3 and s['rb'] >= 3 and s['blocked'], s)
    g.check('Litfaßsäulen (2) als Hindernis, Café-Tische vor den Fassaden', len(s['litfass']) == 2 and all(s['litfass']) and s['cafe'] >= 2, s)
    sc = await scenes(g, 'wilhelm')
    g.check('Szenen: Flaneure auf der Rue, Entenfüttern, Kurgast, Café', all(sc.get(k, {}).get('active') for k in ['rue', 'enten', 'kurgast', 'cafe']), sc)
    p0 = await g.js(f"()=>({{d:{W}.st.wilhelm.ducks.map(d=>[d.x,d.z]),w:{W}.scenes.find(s=>s.id==='rue').npcs.map(h=>[h.x,h.z])}})")
    await g.step(2.5)
    p1 = await g.js(f"()=>({{d:{W}.st.wilhelm.ducks.map(d=>[d.x,d.z]),w:{W}.scenes.find(s=>s.id==='rue').npcs.map(h=>[h.x,h.z])}})")
    mv = lambda a, b: sum(1 for u, v in zip(a, b) if abs(u[0] - v[0]) + abs(u[1] - v[1]) > 0.3)
    g.check('Enten schwimmen, Flaneure flanieren', mv(p0['d'], p1['d']) >= len(p0['d']) - 1 and mv(p0['w'], p1['w']) == 2, [mv(p0['d'], p1['d']), mv(p0['w'], p1['w'])])
    r, after = await talk(g, 'rue', 0)
    g.check('Gespräch mit der Gräfin auf der Rue (Mundart)', r[0] in r[1] and not after['talk'], r[0])

    # ---------- Luisenplatz ----------
    fl = await g.js(f"()=>{W}.ft.find(d=>/Luisenplatz/.test(d.n))")
    await tp(g, fl['x'], fl['z'], 1.5)
    z = await zone(g, 'luisen')
    g.check('(b) Luisenplatz: Zone gebaut, Meshes + NPCs da', built_ok(z, 3), z)
    s = await g.js(f"()=>{{const S={W}.st.luisen,M={M},O=S.obelisk;return {{o:O,blocked:M.blockedFn(O.x+1.8,O.z),top:M.blockedFn(O.x,O.z,10),benches:S.benches.length,bb:S.benches.every(b=>M.blockedFn(b.x,b.z)),pigeons:S.pigeons.length,litfass:S.litfass.length}}}}")
    g.check('Waterloo-Obelisk in der Platzmitte (≥ 15 m), massiv', s['o'] and s['o']['h'] >= 15 and abs(s['o']['x'] + 2451) < 15 and s['blocked'] and s['top'], s)
    g.check('Bänke rund um den Obelisk (≥ 3, Hindernis), Tauben (≥ 6), Litfaßsäule', s['benches'] >= 3 and s['bb'] and s['pigeons'] >= 6 and s['litfass'] == 1, s)
    pg = await g.js(f"()=>{{const p={W}.st.luisen.pigeons[0];return [p.x,p.z]}}")
    await tp(g, pg[0] + 0.5, pg[1], 0.5)
    fl2 = await g.js(f"()=>{{const p={W}.st.luisen.pigeons[0];return {{st:p.st,y:p.y,flown:p.flown}}}}")
    g.check('Tauben fliegen auf, wenn man auf sie zuläuft', fl2['flown'] >= 1 and (fl2['st'] == 'fly' or fl2['y'] > 0), fl2)
    sc = await scenes(g, 'luisen')
    g.check('Szenen: Straßenmusiker am Obelisk, Studis auf der Bank', sc.get('musikant', {}).get('n') == 1 and sc.get('studis', {}).get('n') == 3, sc)
    r, after = await talk(g, 'musikant', 0, 0)
    g.check('Straßenmusiker: Lied für 1 €', r[0] in r[1] and after['money'] == 1, after)

    # ---------- Westend: Wellritzstraße ----------
    fe = await g.js(f"()=>{W}.ft.find(d=>/Wellritz/.test(d.n))")
    await tp(g, fe['x'], fe['z'], 1.5)
    z = await zone(g, 'westend')
    g.check('(b) Westend: Zone gebaut, Meshes + NPCs da', built_ok(z, 6), z)
    s = await g.js(f"""()=>{{const S={W}.st.westend,M={M};return {{stands:S.stands.length,main:!!S.main,bs:S.stands.every(o=>M.blockedFn(o.x,o.z)),xs:S.stands.map(o=>o.x),
        lights:S.lights,bulbs:S.bulbs,planters:S.planters,tea:S.tea.length,low:!!(M.QS.lowLOD)}}}}""")
    g.check('Obst- und Gemüseauslagen (≥ 4, Hindernis), Hauptstand mit Markise', s['stands'] >= 4 and s['main'] and s['bs'], s)
    g.check('Auslagen über die Straße verteilt (> 150 m)', max(s['xs']) - min(s['xs']) > 150, s['xs'])
    g.check('Fußgängerzone: Lichterketten (≥ 8, je mit Birnen), Pflanzkübel (≥ 3), Tisch vor der Teestubb',
            (s['low'] or (s['lights'] >= 8 and s['bulbs'] >= s['lights'] * 6)) and s['planters'] >= 3 and s['tea'] >= 1, s)
    sc = await scenes(g, 'westend')
    g.check('Szenen: Gemüsehändler, Nachbarn am Kiosk, Kicker, Tavla', all(sc.get(k, {}).get('active') for k in ['gemuese', 'kiosk', 'kicker', 'tavla']), sc)
    k0 = await g.js(f"()=>{W}.scenes.find(s=>s.id==='kicker').ball.kicks")
    await g.step(3)
    k1 = await g.js(f"()=>{W}.scenes.find(s=>s.id==='kicker').ball.kicks")
    g.check('Kicker spielen sich den Ball zu', k1 - k0 >= 2, [k0, k1])
    r, after = await talk(g, 'gemuese', 0, 0)
    g.check('Gemüsehändler: zwei Kilo für 3 €, +10 Gesundheit', r[0] in r[1] and after['money'] == 3 and after['health'] == 60, after)
    r, after = await talk(g, 'kiosk', 0)
    g.check('Nachbarn am Kiosk: Running Gag Kastel (AKK)', r[0] in r[1] and 'Kastel' in ''.join(r[1]), r[0])
    await venue_visit(g, 'wiesi_teestubb', 1, 10)

    if REAL:
        await real_checks(g)

    # (c) weit weg → alles frei, NPCs entfernt, Kollision weg, Räume freigegeben
    builds0 = {k: (await zone(g, k))['builds'] for k in KEYS}
    await g.js(f"()=>{{window.__wiesiN={W}.zones.flatMap(Z=>Z.npcs.slice())}}")
    await tp_home(g)
    await g.step(1)
    zs = {k: await zone(g, k) for k in KEYS}
    g.check('(c) weit weg: alle Zonen entsorgt (built=false, group=null, owned=0, npcs=0, disposes≥1)',
            all(not z['built'] and z['group'] and z['owned'] == 0 and z['npcs'] == 0 and z['disposes'] >= 1 for z in zs.values()), zs)
    c2 = await g.js(f"""()=>{{const M={M},W={W};return {{removed:window.__wiesiN.length>0&&window.__wiesiN.every(h=>h.removed),inHumans:window.__wiesiN.filter(h=>M.HUMANS.includes(h)).length,
        scenes:W.scenes.length,hit:W.hitOn,brunnen:M.blockedFn({b['x']}+1.5,{b['z']}),rooms:[W.venues.ratskeller.room,W.venues.teestubb.room].filter(Boolean).length,frees:W.stats.roomFrees}}}}""")
    g.check('(c) NPCs entfernt, Szenen abgebaut, Brunnen-Kollision weg, Innenräume freigegeben',
            c2['removed'] and c2['inHumans'] == 0 and c2['scenes'] == 0 and c2['hit'] == 0 and not c2['brunnen'] and c2['rooms'] == 0 and c2['frees'] >= 2, c2)

    # (d) erneut hin → wieder gebaut, ohne Fehler
    for k in ['schloss', 'westend']:
        c = await g.js(f"(k)=>[{W}.zone[k].x,{W}.zone[k].z]", k)
        await tp(g, c[0], c[1], 1.5)
        z = await zone(g, k)
        g.check(f'(d) {k}: erneut gebaut, fehlerfrei', z['builds'] == builds0[k] + 1 and built_ok(z, 3), z)
        if k == 'schloss':
            g.check('(d) Brunnen wieder massiv, an gleicher Stelle',
                    await g.js(f"()=>{{const B={W}.st.schloss.brunnen;return B.x==={b['x']}&&B.z==={b['z']}&&{M}.blockedFn(B.x+1.5,B.z)}}"))
    await tp_home(g)

    # Qualität „niedrig“: etwa halb so viele Props, keine Lichterketten
    low = await g.js(f"""()=>{{const M={M},W={W},q=M.QS.lowLOD;M.QS.lowLOD=true;try{{for(const k of ['schloss','wilhelm','luisen','westend'])W.forceBuild(k);
        const r={{benches:W.st.schloss.benches.length,ducks:W.st.wilhelm.ducks.length,pigeons:W.st.luisen.pigeons.length,stands:W.st.westend.stands.length,lights:W.st.westend.lights}};
        for(const k of ['schloss','wilhelm','luisen','westend'])W.forceDispose(k);return r;}}finally{{M.QS.lowLOD=q;}}}}""")
    g.check('Qualität „niedrig“: halb so viele Bänke/Enten/Tauben/Auslagen, keine Lichterketten',
            low['benches'] <= 2 and low['ducks'] <= 4 and low['pigeons'] <= 6 and low['stands'] <= 4 and low['lights'] == 0, low)
    g.check('am Ende alles wieder leer', await g.js(f"()=>{W}.zones.every(Z=>!Z.built&&Z.group===null&&Z.owned.length===0&&Z.npcs.length===0)&&{W}.hitOn===0"))


if __name__ == '__main__':
    run(test, real=REAL)
