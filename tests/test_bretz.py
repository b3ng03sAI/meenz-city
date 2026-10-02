# Bretzenheim, Zahlbach + Uni-Campus: Römersteine, Zentralmensa/Hörsaal (begehbar), Fahrradständer, Alt-Bretzenheim-Szenen,
# Schnellreise – und die Lazy-Regel aus Welle 8: vier Zonen (Mensa, Campus, Römersteine, Ortskern), nichts beim Boot gebaut,
# Bau < 350 m, Freigabe > 500 m (inkl. Rückbau der Rastereinträge und der Innenräume).
# Mit Argument "shots": echte Screenshots (real.html) nach tests/out/bretz_*.jpg und Draw-Call-Messung je Zone.
import math, os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
B = f'{M}.BRETZ'
RS_REAL = ((8.250718 - 8.2740) * 71540, -(49.989323 - 49.9988) * 111200)   # 49.989323 N, 8.250718 E
ZONES = ('campus', 'mensa', 'roemer', 'ort')

GOTO = f"""([x,z])=>{{const M={M},P=M.P1;if(P.car)M.exitCar(P,true);P.h.x=x;P.h.z=z;P.h.y=M.groundYFn(x,z,0);P.h.sync();}}"""
ZSTATE = f"""()=>Object.fromEntries({B}.zones.map(Z=>[Z.bretzKey,{{built:Z.built,group:Z.group!==null,owned:Z.owned.length,npcs:Z.npcs.length,
    alive:Z.npcs.filter(h=>!h.removed).length,meshes:Z.bretzMeshes.length,hg:Z.bretzHG.length/2,builds:Z.builds,disposes:Z.disposes,
    bikes:Z.bretzBikes||0,racks:Z.bretzRacks||0,inst:Z.bretzInstN||0,shadow:Z.bretzMeshes.some(m=>m.castShadow)}}]))"""


async def zone(g, key):
    return (await g.js(ZSTATE))[key]


async def goto_zone(g, key, dx=0, dz=0):
    c = await g.js(f"(k)=>{{const Z={B}.zones.find(Z=>Z.bretzKey===k);return [Z.x,Z.z]}}", key)
    await g.js(GOTO, [c[0] + dx, c[1] + dz])
    await g.step(0.3)
    return c


async def test(g):
    await g.start()
    g.check('Spiel läuft', await g.js(f"()=>{M}.mode") == 'play')

    # (a) nach dem Boot am Standard-Start: nichts gebaut, nichts angemeldet
    zs = await g.js(ZSTATE)
    g.check('vier Bretzenheim-Zonen bei LAZY angemeldet', sorted(zs) == sorted(ZONES) and
            await g.js(f"()=>{B}.zones.every(Z=>{M}.LAZY.zones.includes(Z))&&{B}.zone.bretzKey==='campus'"), list(zs))
    g.check('(a) Boot: keine Zone gebaut, group null, owned/npcs leer, kein Raster',
            all(not z['built'] and not z['group'] and z['owned'] == 0 and z['npcs'] == 0 and z['hg'] == 0 and z['builds'] == 0 for z in zs.values()), zs)
    g.check('Boot: Innenräume noch nicht gebaut', await g.js(f"()=>!{B}.campus.mensa.room&&!{B}.campus.hoersaal.room"))
    g.check('Boot: Szenen ohne Figuren', await g.js(f"()=>{B}.scenes.every(s=>!s.spawned&&s.people.length===0)"))

    # 1. Römersteine (Zone roemer): Lage ist Boot-Datum, Pfeiler/Raster erst gebaut
    rs = await g.js(f"()=>{{const r={B}.roemersteine;return r&&{{x:r.x,z:r.z,n:r.n,p:r.pillars}}}}")
    g.check('Römersteine angelegt', rs is not None)
    d = ((rs['x'] - RS_REAL[0]) ** 2 + (rs['z'] - RS_REAL[1]) ** 2) ** 0.5
    g.check('Römersteine-Zentrum < 30 m von der echten Position', d < 30, f'{d:.1f} m')
    g.check('mind. 15 Pfeilerreste in einer Reihe', rs['n'] >= 15, rs['n'])
    far = max(((p['x'] - RS_REAL[0]) ** 2 + (p['z'] - RS_REAL[1]) ** 2) ** 0.5 for p in rs['p'])
    g.check('alle Pfeiler < 120 m von der echten Position', far < 120, f'{far:.0f} m')
    p0 = rs['p'][len(rs['p']) // 2]
    PILLAR = f"(p)=>[{M}.blockedFn(p.x,p.z),{M}.blockedFn(p.x,p.z,p.h+0.5),{M}.groundYFn(p.x,p.z,p.h+0.5)]"
    g.check('vor dem Bau: Pfeilerstelle frei (kein Boot-Raster)', not (await g.js(PILLAR, p0))[0])
    await goto_zone(g, 'roemer', 0, 12)
    z = await zone(g, 'roemer')
    g.check('(b) Römersteine nah: gebaut, Meshes + Führungs-NPCs da', z['built'] and z['group'] and z['owned'] > 0 and z['meshes'] >= 3 and z['alive'] >= 4, z)
    zs = await g.js(ZSTATE)
    g.check('andere Zonen bleiben ungebaut', not any(zs[k]['built'] for k in ('campus', 'mensa', 'ort')))
    solid = await g.js(PILLAR, p0)
    g.check('Pfeiler ist Hindernis, oben begehbar', solid[0] and not solid[1] and abs(solid[2] - round(p0['h'])) < 1.01, [solid, p0['h']])

    # 2. Campus-Props: Räder instanziert (Mensa- + Campus-Zone), nicht fahrbar
    c = await g.js(f"()=>{{const c={B}.campus;return {{bikes:c.bikes,racks:c.racks,signs:c.signs,pedal:{M}.CARS.filter(k=>k.T&&k.T.pedal).length,rad:{M}.RAD.bikes.length}}}}")
    g.check('mind. 60 abgestellte Räder am Campus (Lage)', c['bikes'] >= 60, c['bikes'])
    door = await g.js(f"()=>{B}.campus.mensa.door")
    g.check('Mensa hat Tür in der Welt', door is not None and len(door) == 3, door)
    await g.js(GOTO, [door[0], door[1]])
    await g.step(0.3)
    zm = await zone(g, 'mensa')
    g.check('(b) Mensa-Zone gebaut, Räder als Instanzen, Studierende draußen', zm['built'] and zm['inst'] == 3 and zm['bikes'] > 0 and zm['alive'] == 4, zm)
    g.check('Campus-Räder sind keine Fahrzeuge (fahrbar sind nur die Räder aus p5c_rad)',
            await g.js(f"()=>{M}.CARS.filter(k=>k.T&&k.T.pedal).length==={M}.RAD.bikes.length"), [c['pedal'], c['rad']])
    g.check('Beschilderung: Schilder an Mensa/Hörsaal/Philosophicum/Bibliothek + Stele', c['signs'] >= 5, c['signs'])
    g.check('Römersteine-Zone > 500 m entfernt → entsorgt', not (await zone(g, 'roemer'))['built'])
    g.check('nach Freigabe: Pfeilerstelle wieder frei (Raster zurückgebaut)', not (await g.js(PILLAR, p0))[0])

    # 3. Zentralmensa betreten / verlassen (Raum liegt abseits → Mensa-Zone wird entsorgt, Raum bleibt belegt)
    near = await g.js(f"(d)=>{{const v={M}.venueNear(d[0],d[1]);return v&&v.id}}", door)
    g.check('venueNear an der Mensatür findet die Mensa', near == 'bretz_mensa', near)
    await g.key('KeyF', after=0.5)
    inside = await g.js(f"()=>{{const r={M}.P1.h.room;return r&&r.venue?{{id:r.venue.id,people:r.people.filter(p=>!p.removed).length,sit:r.people.filter(p=>p.vpose==='sit').length}}:null}}")
    g.check('mit F in die Zentralmensa', inside and inside['id'] == 'bretz_mensa', inside)
    g.check('Studierende in der Mensa (≥ 10 sitzend)', inside and inside['sit'] >= 10, inside)
    zm = await zone(g, 'mensa')
    g.check('im Raum (ppos = Tür): Außenbereich bleibt gebaut, Raum hängt in der Szene', zm['built'] and await g.js(f"()=>!!{B}.campus.mensa.room&&{B}.campus.mensa.room.grp.parent!==null"), zm)
    await g.step(20)
    said = await g.js(f"()=>{M}.P1.h.room&&{M}.P1.h.room.people.some(p=>p.bubble&&p.bubble.textContent.length>0)")
    g.check('in der Mensa wird gebabbelt (Sprechblase)', said)
    await g.js(f"()=>{{const h={M}.P1.h,r=h.room;h.x=r.ox;h.z=r.oz+9.5;h.facing=0;}}")
    await g.page.keyboard.down('KeyS'); await g.step(1.5); await g.page.keyboard.up('KeyS')
    out = await g.js(f"()=>{{const h={M}.P1.h;return {{room:!!h.room,x:h.x,z:h.z}}}}")
    g.check('durch die Tür wieder raus (draußen an der Mensa)', not out['room'] and ((out['x'] - door[0]) ** 2 + (out['z'] - door[1]) ** 2) ** 0.5 < 6, out)
    g.check('Mensa-Personen beim Verlassen entfernt', await g.js(f"()=>{B}.campus.mensa.room.people.length===0"))
    zm = await zone(g, 'mensa')
    g.check('nach dem Rausgehen: Mensa-Zone gebaut, Studierende draußen, nur einmal gebaut', zm['built'] and zm['builds'] == 1 and zm['alive'] == 4, zm)

    # 4. Hörsaal (Campus-Zone)
    hd = await g.js(f"()=>{B}.campus.hoersaal.door")
    await g.js(GOTO, [hd[0], hd[1]])
    await g.step(0.3)
    zc = await zone(g, 'campus')
    g.check('(b) Campus-Zone gebaut: Räder, Schilder, Stele, Studierende', zc['built'] and zc['inst'] == 3 and zc['bikes'] > 0 and zc['alive'] >= 3 and zc['hg'] > 0, zc)
    g.check('Mensa-Zone wieder entsorgt, leerer Mensa-Raum freigegeben',
            not (await zone(g, 'mensa'))['built'] and await g.js(f"()=>{B}.campus.mensa.room===null&&{B}.campus.mensa.bretzRoomFrees>=1"))
    g.check('alle Campus-Räder gebaut (Mensa + Campus = Lage)', zm['bikes'] + zc['bikes'] == c['bikes'], [zm['bikes'], zc['bikes'], c['bikes']])
    await g.key('KeyF', after=0.5)
    hs = await g.js(f"()=>{{const r={M}.P1.h.room;return r&&r.venue?{{id:r.venue.id,sit:r.people.filter(p=>p.vpose==='sit').length}}:null}}")
    g.check('Hörsaal begehbar mit Studierenden', hs and hs['id'] == 'bretz_hoersaal' and hs['sit'] >= 10, hs)
    await g.js(f"()=>{M}.exitVenue({M}.P1)")
    await g.step(0.3)

    # 4b. Qualität „niedrig“: weniger Räder/NPCs, keine Schatten (Zone neu bauen)
    full = await zone(g, 'campus')
    await g.js(f"()=>{{const Q={M}.QS;window.__bretzQ=[Q.lowLOD,Q.noShadow];Q.lowLOD=true;Q.noShadow=true;}}")
    await g.js(GOTO, [0, 0]); await g.step(0.2)
    await g.js(GOTO, [hd[0], hd[1]]); await g.step(0.3)
    low = await zone(g, 'campus')
    await g.js(f"()=>{{const Q={M}.QS;[Q.lowLOD,Q.noShadow]=window.__bretzQ;}}")
    g.check('QS.lowLOD: etwa halb so viele Räder, nicht mehr NPCs', low['built'] and low['bikes'] <= full['bikes'] * 0.6 and low['alive'] <= full['alive'], [full['bikes'], low['bikes'], full['alive'], low['alive']])
    g.check('QS.noShadow: kein castShadow', not low['shadow'] and full['shadow'], [full['shadow'], low['shadow']])
    await g.js(GOTO, [0, 0]); await g.step(0.2)

    # 5. Straßenszenen: Alt-Bretzenheim, Campus, Römersteine
    sc = await g.js(f"()=>{B}.scenes.map(s=>({{id:s.id,zone:s.zone,name:s.name,x:s.x,z:s.z,n:s.spots.length}}))")
    wein = [s for s in sc if s['id'].startswith('wein')]
    g.check('zwei Weinstubb-Szenen im Ortskern Alt-Bretzenheim', len(wein) == 2, [s['name'] for s in wein])
    ok = await g.js(f"()=>{{const c={B}.ortskern;return {B}.taverns.length===2&&{B}.taverns.every(t=>Math.hypot(t.x-c[0],t.z-c[1])<170)}}")
    g.check('Weinstubb-Fassaden < 170 m vom Rathaus Bretzenheim', ok)
    g.check('Szenen an Mensa, Hörsaal und Römersteinen vorhanden', {'campus', 'atrium', 'roemer'} <= {s['id'] for s in sc}, [s['id'] for s in sc])
    for s in sc:
        await g.js(GOTO, [s['x'] + 4, s['z'] + 4])
        await g.step(0.6)
        st = await g.js(f"(id)=>{{const s={B}.scenes.find(s=>s.id===id);return {{sp:s.spawned,n:s.people.filter(h=>!h.removed&&h.alive).length,st:s.people.every(h=>h.state==='roof')}}}}", s['id'])
        g.check(f'Szene „{s["name"]}“: NPCs da', st['sp'] and st['n'] == s['n'] and st['st'], st)
        await g.step(16)
        lines = await g.js(f"(id)=>{B}.scenes.find(s=>s.id===id).lines", s['id'])
        g.check(f'Szene „{s["name"]}“: Mundart-Dialog läuft', lines >= 3, lines)
        if s['zone'] == 'ort':
            zo = await zone(g, 'ort')
            g.check(f'(b) Ortskern-Zone gebaut bei „{s["name"]}“: Fassaden, Schilder, Möbel, Gäste', zo['built'] and zo['meshes'] >= 4 and zo['alive'] >= 6, zo)
    talk = await g.js(f"""()=>{{const M={M},s={B}.scenes.find(s=>s.id==='roemer');const h=s.people[0];const P=M.P1;P.h.x=h.x+Math.sin(h.facing)*1.2;P.h.z=h.z+Math.cos(h.facing)*1.2;P.h.facing=h.facing+Math.PI;
        M.startTalk(P,h);const ok=!!M.TALK;return ok}}""")
    g.check('Szenen-NPC lässt sich ansprechen (E-Gespräch)', talk)
    await g.step(0.5)

    # (c) weit weg: alles entsorgt
    await g.js(f"()=>{{window.__bretzNpcs={B}.zones.flatMap(Z=>Z.npcs);}}")
    await g.js(GOTO, [0, 0])
    await g.step(1)
    zs = await g.js(ZSTATE)
    g.check('(c) weit weg: alle Zonen entsorgt (built false, group null, owned/npcs leer, Raster zurück)',
            all(not z['built'] and not z['group'] and z['owned'] == 0 and z['npcs'] == 0 and z['hg'] == 0 for z in zs.values()), zs)
    g.check('(c) jede Zone mind. einmal entsorgt', all(z['disposes'] >= 1 for z in zs.values()), {k: z['disposes'] for k, z in zs.items()})
    g.check('(c) NPCs removed, Szenen leer', await g.js(f"()=>window.__bretzNpcs.length>0&&window.__bretzNpcs.every(h=>h.removed)&&!{M}.HUMANS.some(h=>h.bretzScene)&&{B}.scenes.every(s=>!s.spawned&&s.people.length===0)"))
    g.check('(c) Innenräume freigegeben', await g.js(f"()=>!{B}.campus.mensa.room&&!{B}.campus.hoersaal.room"))
    g.check('(c) Pfeilerstelle wieder frei', not (await g.js(PILLAR, p0))[0])

    # (d) erneut hin → wieder gebaut, ohne Fehler
    await goto_zone(g, 'roemer', 0, 12)
    z = await zone(g, 'roemer')
    g.check('(d) Römersteine erneut gebaut', z['built'] and z['builds'] >= 2 and z['meshes'] >= 3 and z['alive'] >= 4 and (await g.js(PILLAR, p0))[0], z)

    # 6. Schnellreise
    ft = await g.js(f"()=>{M}.ftDestinations().filter(d=>d.g==='Bretzenheim & Uni').map(d=>({{n:d.n,x:d.x,z:d.z,sp:!!d.special}}))")
    names = [d['n'] for d in ft]
    g.check('Schnellreise-Ziele Campus/Mensa, Römersteine, Alt-Bretzenheim', all(n in names for n in ('Uni-Campus · Zentralmensa', 'Römersteine (Zahlbach)', 'Alt-Bretzenheim · Weinstubb')), names)
    g.check('keine zusätzlichen „besonderen Orte“ (test_ft zählt 23)', not any(d['sp'] for d in ft))
    dst = next(d for d in ft if d['n'] == 'Alt-Bretzenheim · Weinstubb')
    await g.js(f"(n)=>{{const M={M};M.fastTravel(M.ftDestinations().find(d=>d.n===n))}}", dst['n'])
    await g.page.wait_for_function("(d)=>{const h=__MEENZ.P1.h;return Math.hypot(h.x-d.x,h.z-d.z)<3}", arg=dst, polling=50, timeout=5000)
    await g.step(1)
    g.check('Schnellreise nach Alt-Bretzenheim kommt an, Ortskern-Zone gebaut', (await zone(g, 'ort'))['built'])


LOOK = f"""([x,z,tx,tz,pitch])=>{{const M={M},P=M.P1,h=P.h;if(P.car)M.exitCar(P,true);h.x=x;h.z=z;h.y=M.groundYFn(x,z,0);
    h.facing=P.cam.yaw=Math.atan2(tx-x,tz-z);P.cam.pitch=pitch;P.cam.init=false;h.sync();}}"""


async def shots(g):
    """Echte Screenshots je Zone und lazyDrawCalls (≤ 150) im gebauten Zustand."""
    await g.start()
    await g.js(f"()=>{{const M={M};M.gameMin=17*60;M.setWeather('klar');M.setWanted&&M.setWanted(0)}}")
    S = await g.js(f"()=>{{const r={B}.roemersteine;return [r.x,r.z,r.side[0],r.side[1],r.ux,r.uz]}}")
    D = await g.js(f"()=>{B}.campus.doors")
    T = await g.js(f"()=>{B}.taverns.map(t=>[t.x,t.z,t.nx,t.nz,t.ex,t.ez])")
    views = {
        'roemer': [S[0] + S[2] * 22 - S[4] * 30, S[1] + S[3] * 22 - S[5] * 30, S[0], S[1], 0.1],
        'mensa': [D['mensa'][0] + math.sin(D['mensa'][2]) * 22, D['mensa'][1] + math.cos(D['mensa'][2]) * 22, D['mensa'][0], D['mensa'][1], 0.1],
        'campus': [D['atrium'][0] + math.sin(D['atrium'][2]) * 22, D['atrium'][1] + math.cos(D['atrium'][2]) * 22, D['atrium'][0], D['atrium'][1], 0.1],
        'ort': [T[0][0] + T[0][2] * 7 + T[0][4] * 4, T[0][1] + T[0][3] * 7 + T[0][5] * 4, T[0][0], T[0][1], 0.12],
    }
    only = [a for a in sys.argv if a in views]   # z. B. `shots ort` → nur diese Ansicht
    calls = {}
    for key, v in views.items():
        if only and key not in only:
            continue
        await g.js(f"([x,z])=>{{const P={M}.P1;P.h.x=x;P.h.z=z;}}", v[:2])
        await g.js(f"([x,z])=>{{const M={M},P=M.P1,h=P.h;const f=(()=>{{for(let r=0;r<12;r+=1.5)for(let a=0;a<6.3;a+=0.5){{const px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;if(!M.blockedFn(px,pz))return [px,pz];}}return [x,z]}})();h.x=f[0];h.z=f[1];}}", v[:2])
        pos = await g.js(f"()=>[{M}.P1.h.x,{M}.P1.h.z]")
        await g.js(LOOK, [pos[0], pos[1], v[2], v[3], v[4]])
        await g.step(1.5)
        dc = await g.js(f"()=>{B}.drawCalls()")
        calls[key] = dc[key]
        print('  Bild:', await g.snap('bretz_' + key))
    print(f'  lazyDrawCalls je Zone (gebaut): {calls}')
    g.check('jede Zone gebaut ≤ 150 Draw-Calls (lazyDrawCalls)', all(0 < n <= 150 for n in calls.values()), calls)
    print(f"  Speicher je Zone: {await g.js(f'()=>{B}.mem')}")
    door = D['mensa']
    await g.js(LOOK, [door[0], door[1], door[0] + 1, door[1], 0.1])
    await g.step(0.5)
    await g.key('KeyF', after=1.5)
    await g.js(f"()=>{{const P={M}.P1;P.cam.yaw=Math.PI;P.cam.pitch=0.15;P.cam.init=false}}")
    await g.step(0.5)
    print('  Bild:', await g.snap('bretz_mensa_innen'))


if 'shots' in sys.argv:
    run(shots, real=True)
else:
    run(test)
