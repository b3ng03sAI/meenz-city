# Bretzenheim, Zahlbach + Uni-Campus: Römersteine, Zentralmensa/Hörsaal (begehbar), Fahrradständer, Alt-Bretzenheim-Szenen, Schnellreise
# Mit Argument "shots" zusätzlich echte Screenshots (real.html) nach tests/out/bretz_*.jpg und Draw-Call-Messung.
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
B = f'{M}.BRETZ'
RS_REAL = ((8.250718 - 8.2740) * 71540, -(49.989323 - 49.9988) * 111200)   # 49.989323 N, 8.250718 E

GOTO = f"""([x,z])=>{{const M={M},P=M.P1;if(P.car)M.exitCar(P,true);P.h.x=x;P.h.z=z;P.h.y=M.groundYFn(x,z,0);P.h.sync();}}"""


async def test(g):
    await g.start()
    g.check('Spiel läuft', await g.js(f"()=>{M}.mode") == 'play')
    info = await g.js(f"()=>{{const b={B};return {{keys:Object.keys(b),mem:b.mem,meshes:b.meshes.length}}}}")
    g.check('BRETZ hat campus, roemersteine, scenes, ft', all(k in info['keys'] for k in ('campus', 'roemersteine', 'scenes', 'ft')), info['keys'])
    g.check('≤ 150 zusätzliche Draw-Calls (Welt-Meshes des Pakets)', info['meshes'] <= 150, info['meshes'])
    print('  Speicher/Draw-Calls laut setupBretz:', info['mem'])

    # 1. Römersteine an der echten Stelle
    rs = await g.js(f"()=>{{const r={B}.roemersteine;return r&&{{x:r.x,z:r.z,n:r.n,p:r.pillars}}}}")
    g.check('Römersteine angelegt', rs is not None)
    d = ((rs['x'] - RS_REAL[0]) ** 2 + (rs['z'] - RS_REAL[1]) ** 2) ** 0.5
    g.check('Römersteine-Zentrum < 30 m von der echten Position', d < 30, f'{d:.1f} m')
    g.check('mind. 15 Pfeilerreste in einer Reihe', rs['n'] >= 15, rs['n'])
    far = max(((p['x'] - RS_REAL[0]) ** 2 + (p['z'] - RS_REAL[1]) ** 2) ** 0.5 for p in rs['p'])
    g.check('alle Pfeiler < 120 m von der echten Position', far < 120, f'{far:.0f} m')
    p0 = rs['p'][len(rs['p']) // 2]
    solid = await g.js(f"(p)=>[{M}.blockedFn(p.x,p.z),{M}.blockedFn(p.x,p.z,p.h+0.5),{M}.groundYFn(p.x,p.z,p.h+0.5)]", p0)
    g.check('Pfeiler ist Hindernis, oben begehbar', solid[0] and not solid[1] and abs(solid[2] - round(p0['h'])) < 1.01, [solid, p0['h']])

    # 2. Campus-Props: Räder instanziert, nicht fahrbar
    c = await g.js(f"()=>{{const c={B}.campus;return {{bikes:c.bikes,racks:c.racks,props:c.props.map(p=>({{kind:p.kind,n:p.n}})),signs:c.signs,inst:{B}.meshes.filter(m=>m.isInstancedMesh).length,pedal:{M}.CARS.filter(k=>k.T&&k.T.pedal).length,rad:{M}.RAD.bikes.length}}}}")
    g.check('mind. 60 abgestellte Räder am Campus', c['bikes'] >= 60, c['bikes'])
    g.check('Räder als ein Instanz-Prop (bike/rack)', any(p['kind'] == 'bike' and p['n'] == c['bikes'] for p in c['props']) and c['racks'] >= 20, c['props'])
    g.check('Campus-Räder sind keine Fahrzeuge (fahrbar sind nur die Räder aus p5c_rad)', c['pedal'] == c['rad'], [c['pedal'], c['rad']])
    g.check('Beschilderung: Schilder an Mensa/Hörsaal/Philosophicum/Bibliothek + Stele', c['signs'] >= 5, c['signs'])

    # 3. Zentralmensa betreten / verlassen
    door = await g.js(f"()=>{B}.campus.mensa.door")
    g.check('Mensa hat Tür in der Welt', door is not None and len(door) == 3, door)
    near = await g.js(f"(d)=>{{const v={M}.venueNear(d[0],d[1]);return v&&v.id}}", door)
    g.check('venueNear an der Mensatür findet die Mensa', near == 'bretz_mensa', near)
    await g.js(GOTO, [door[0], door[1]])
    await g.key('KeyF', after=0.5)
    inside = await g.js(f"()=>{{const r={M}.P1.h.room;return r&&r.venue?{{id:r.venue.id,people:r.people.filter(p=>!p.removed).length,sit:r.people.filter(p=>p.vpose==='sit').length,lines:r.people.filter(p=>p.vlines).length}}:null}}")
    g.check('mit F in die Zentralmensa', inside and inside['id'] == 'bretz_mensa', inside)
    g.check('Studierende in der Mensa (≥ 10 sitzend)', inside and inside['sit'] >= 10, inside)
    await g.step(20)
    said = await g.js(f"()=>{M}.P1.h.room&&{M}.P1.h.room.people.some(p=>p.bubble&&p.bubble.textContent.length>0)")
    g.check('in der Mensa wird gebabbelt (Sprechblase)', said)
    await g.js(f"()=>{{const h={M}.P1.h,r=h.room;h.x=r.ox;h.z=r.oz+9.5;h.facing=0;}}")
    await g.page.keyboard.down('KeyS'); await g.step(1.5); await g.page.keyboard.up('KeyS')
    out = await g.js(f"()=>{{const h={M}.P1.h;return {{room:!!h.room,x:h.x,z:h.z}}}}")
    g.check('durch die Tür wieder raus (draußen an der Mensa)', not out['room'] and ((out['x'] - door[0]) ** 2 + (out['z'] - door[1]) ** 2) ** 0.5 < 6, out)
    g.check('Mensa-Personen beim Verlassen entfernt', await g.js(f"()=>{B}.campus.mensa.room.people.length===0"))

    # 4. Hörsaal
    hd = await g.js(f"()=>{B}.campus.hoersaal.door")
    await g.js(GOTO, [hd[0], hd[1]])
    await g.key('KeyF', after=0.5)
    hs = await g.js(f"()=>{{const r={M}.P1.h.room;return r&&r.venue?{{id:r.venue.id,sit:r.people.filter(p=>p.vpose==='sit').length}}:null}}")
    g.check('Hörsaal begehbar mit Studierenden', hs and hs['id'] == 'bretz_hoersaal' and hs['sit'] >= 10, hs)
    await g.js(f"()=>{M}.exitVenue({M}.P1)")
    await g.step(0.3)

    # 5. Straßenszenen: Alt-Bretzenheim, Campus, Römersteine
    sc = await g.js(f"()=>{B}.scenes.map(s=>({{id:s.id,name:s.name,x:s.x,z:s.z,n:s.spots.length}}))")
    wein = [s for s in sc if s['id'].startswith('wein')]
    g.check('zwei Weinstubb-Szenen im Ortskern Alt-Bretzenheim', len(wein) == 2, [s['name'] for s in wein])
    ok = await g.js(f"()=>{{const c={B}.ortskern;return {B}.taverns.every(t=>Math.hypot(t.x-c[0],t.z-c[1])<170)}}")
    g.check('Weinstubb-Fassaden < 170 m vom Rathaus Bretzenheim', ok)
    g.check('Campus- und Römersteine-Szene vorhanden', {'campus', 'roemer'} <= {s['id'] for s in sc}, [s['id'] for s in sc])
    for s in sc:
        await g.js(GOTO, [s['x'] + 4, s['z'] + 4])
        await g.step(0.6)
        st = await g.js(f"(id)=>{{const s={B}.scenes.find(s=>s.id===id);return {{sp:s.spawned,n:s.people.filter(h=>!h.removed&&h.alive).length,st:s.people.every(h=>h.state==='roof')}}}}", s['id'])
        g.check(f'Szene „{s["name"]}“: NPCs da', st['sp'] and st['n'] == s['n'] and st['st'], st)
        await g.step(16)
        lines = await g.js(f"(id)=>{B}.scenes.find(s=>s.id===id).lines", s['id'])
        g.check(f'Szene „{s["name"]}“: Mundart-Dialog läuft', lines >= 3, lines)
    talk = await g.js(f"""()=>{{const M={M},s={B}.scenes.find(s=>s.id==='roemer');const h=s.people[0];const P=M.P1;P.h.x=h.x+Math.sin(h.facing)*1.2;P.h.z=h.z+Math.cos(h.facing)*1.2;P.h.facing=h.facing+Math.PI;
        M.startTalk(P,h);const ok=!!M.TALK;return ok}}""")
    g.check('Szenen-NPC lässt sich ansprechen (E-Gespräch)', talk)
    await g.step(0.5)
    await g.js(GOTO, [0, 0])
    await g.step(1)
    gone = await g.js(f"()=>{B}.scenes.every(s=>!s.spawned&&s.people.length===0)")
    g.check('Szenen-NPCs verschwinden, wenn man weg ist', gone)

    # 6. Schnellreise
    ft = await g.js(f"()=>{M}.ftDestinations().filter(d=>d.g==='Bretzenheim & Uni').map(d=>({{n:d.n,x:d.x,z:d.z,sp:!!d.special}}))")
    names = [d['n'] for d in ft]
    g.check('Schnellreise-Ziele Campus/Mensa, Römersteine, Alt-Bretzenheim', all(n in names for n in ('Uni-Campus · Zentralmensa', 'Römersteine (Zahlbach)', 'Alt-Bretzenheim · Weinstubb')), names)
    g.check('keine zusätzlichen „besonderen Orte“ (test_ft zählt 23)', not any(d['sp'] for d in ft))
    dst = next(d for d in ft if d['n'] == 'Römersteine (Zahlbach)')
    await g.js(f"(n)=>{{const M={M};M.fastTravel(M.ftDestinations().find(d=>d.n===n))}}", dst['n'])
    await g.page.wait_for_function("(d)=>{const h=__MEENZ.P1.h;return Math.hypot(h.x-d.x,h.z-d.z)<3}", arg=dst, polling=50, timeout=5000)
    g.check('Schnellreise zu den Römersteinen kommt an', True)
    await g.step(1)


run(test)
