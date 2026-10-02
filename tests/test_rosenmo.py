# Rosenmontagszug: Route über echte Straßen, Start um 11:11 am Rosenmontag, Absperrungen + Verkehr, Zugteile, Zuschauer,
# Jubelpose, Kamelle fangen, Ende + Aufräumen, Rekord im Speicherstand, Mission + Kartenstart
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
R = f'{M}.ROSENMO'

# Spieler an den Straßenrand neben einen Laufmeter s der Route stellen (Seite +1/-1)
PLACE = f"""([s,side])=>{{const M={M},R=M.ROSENMO,P=M.P1;if(P.car)M.exitCar(P,true);const p=R.posAt(s);const off=R.hw[p[3]]+1.6;
    P.h.x=p[0]+Math.cos(p[2])*off*side;P.h.z=p[1]-Math.sin(p[2])*off*side;P.h.y=M.groundYFn(P.h.x,P.h.z);P.h.sync();return [P.h.x,P.h.z]}}"""
# Rosenmontags-Menschen in HUMANS (Zugteilnehmer, Zuschauer, Polizei)
OURS = f"()=>{M}.HUMANS.filter(h=>h.rosenmo&&(h.rosenmo.unit||h.rosenmo.slot||h.rosenmo.grp)).length"
# Höchster Armwinkel über der Waagrechten (Grad) aller jubelnden Zuschauer und Werfer
# Arm hängt bei rotation (0,0); Höhe der Hand = -cos(rx)·cos(rz) → Winkel über der Waagrechten
ARM_MAX = f"""()=>{{const R={R};let mx=-90,n=0;const el=(x,z)=>Math.asin(Math.max(-1,Math.min(1,-Math.cos(x)*Math.cos(z))))*180/Math.PI;
    const hs=R.crowd.filter(h=>h.rosenmo&&h.rosenmo.cheer>0.5).concat(R.units.filter(u=>u.thrower).map(u=>u.thrower));
    for(const h of hs){{const a=h.rosenmo.arms;if(!a)continue;n++;mx=Math.max(mx,el(a[0],a[2]),el(a[1],a[3]));}}return [mx,n]}}"""
TRAFFIC_IN_ROUTE = f"""()=>{{const M={M},R=M.ROSENMO;return M.CARS.filter(c=>c.ai&&(c.ai.mode==='traffic'||c.ai.mode==='parked')&&!c.persist&&!c.mission
    &&!M.PLAYERS.some(P=>P.car===c)&&R.inRoute(c.x,c.z,1.5)).length}}"""


async def test(g):
    await g.start()

    # 1. Route
    rt = await g.js(f"""()=>{{const M={M},R={R};const ok=R.routeEdges.every((e,i)=>e>=0&&[M.EDGES[e].a,M.EDGES[e].b].includes(R.routeNodes[i])&&[M.EDGES[e].a,M.EDGES[e].b].includes(R.routeNodes[i+1]));
        const names=[...new Set(R.routeEdges.map(e=>M.EDGES[e].road.name))];return {{len:R.len,ok,names,n:R.route.length,paths:R.routeEdges.filter(e=>M.EDGES[e].road.type==='path').length}}}}""")
    g.check('Route ≥ 1 km', rt['len'] >= 1000, round(rt['len']))
    g.check('Route folgt lückenlos Kanten des Straßengraphs', rt['ok'] and rt['n'] > 10, rt['n'])
    g.check('Route über Große Bleiche, Schillerplatz, Ludwigsstraße, Markt',
            all(n in rt['names'] for n in ['Große Bleiche', 'Schillerplatz', 'Ludwigsstraße', 'Markt']), rt['names'])
    g.check('Route ohne Fußwege/Treppen', rt['paths'] == 0, rt['paths'])
    g.check('ROSENMO-Felder vorhanden', await g.js(f"()=>{{const R={R};return R.on===false&&Array.isArray(R.units)&&Array.isArray(R.crowd)&&Array.isArray(R.barriers)&&R.kamelle.caught===0&&R.kamelle.best===0}}"))

    # 2. Spielzeit-Auslöser: nur am Rosenmontag um 11:11
    day = await g.js(f"()=>{{const R={R};R.lastMin=1435;{M}.gameMin=5;return R.day}}")
    await g.step(0.05)
    g.check('Tageswechsel zählt den Spieltag hoch', await g.js(f"()=>{R}.day") == day + 1)
    await g.js(f"()=>{{const R={R};R.day=2;R.lastMin={R}.START;{M}.gameMin=R.START}}")
    await g.step(0.5)
    g.check('kein Zug an einem normalen Tag (Tag 2)', await g.js(f"()=>{R}.on") is False)
    await g.js(PLACE, [600, 1])
    await g.js(f"()=>{{const R={R};R.day=4;R.lastMin=R.START;{M}.gameMin=R.START}}")
    await g.step(0.2)
    st = await g.js(f"()=>{{const R={R};return {{on:R.on,reason:R.reason,rm:R.isRosenmontag(4),head:R.head}}}}")
    g.check('Zug startet um 11:11 am Rosenmontag (Tag 4)', st['on'] and st['reason'] == 'zeit' and st['rm'], st)

    # 3. Absperrungen + Verkehr
    b = await g.js(f"""()=>{{const R={R};const side=R.barriers.filter(b=>!R.routeEdges.includes(b.e));return {{n:R.barriers.length,el:R.barriers.reduce((a,b)=>a+b.n,0),side:side.length,blocked:R.barriers.every(b=>R.blockSet.has(b.e)),mesh:!!R.mesh}}}}""")
    g.check('Absperrgitter an ≥ 15 Seitenstraßen', b['n'] >= 15 and b['side'] == b['n'], b)
    g.check('abgesperrte Seitenstraßen gesperrt für den Verkehr', b['blocked'] and b['mesh'], b)
    g.check('keine Autos in der Zugstrecke nach dem Start', await g.js(TRAFFIC_IN_ROUTE) == 0, await g.js(TRAFFIC_IN_ROUTE))
    # Testauto auf einer abgesperrten Seitenstraße, Richtung Zug
    car = await g.js(f"""()=>{{const M={M},R={R};const P=M.P1;const [px,pz]=[P.h.x,P.h.z];
        const gs=R.bgroups.filter(gr=>M.EDGES[gr.e].car&&M.EDGES[gr.e].len>45).sort((a,b)=>Math.hypot(a.x-px,a.z-pz)-Math.hypot(b.x-px,b.z-pz));const gr=gs[0];if(!gr)return null;
        const E=M.EDGES[gr.e];const n=gr.n;const o=E.a===n?E.b:E.a;const N=M.NODES[n],O=M.NODES[o];const dx=(N.x-O.x)/E.len,dz=(N.z-O.z)/E.len;
        const c=new M.Car('kompakt',N.x-dx*30,N.z-dz*30,Math.atan2(dx,dz),{{ctrl:'ai'}});c.ai={{mode:'traffic'}};c.vx=dx*8;c.vz=dz*8;c.speed=8;window.__rmCar=c;return Math.round(R.nearest(c.x,c.z).d)}}""")
    g.check('Testauto auf abgesperrter Seitenstraße aufgestellt', car is not None, car)
    worst, tr = 1e9, 0
    for _ in range(24):
        await g.step(0.5)
        d = await g.js(f"()=>{{const c=window.__rmCar,R={R};if(c.removed)return -1;const q=R.nearest(c.x,c.z);return q.d-q.hw}}")
        if d != -1: worst = min(worst, d)
        tr = max(tr, await g.js(TRAFFIC_IN_ROUTE))
    g.check('Testauto hält vor der Absperrung (fährt nicht in die Zugstrecke)', worst > 1.5, round(worst, 1))
    g.check('12 s lang kein Verkehrsauto in der Zugstrecke', tr == 0, tr)

    # 4. Zugteile bewegen sich, Zuschauer + Polizei stehen
    u = await g.js(f"()=>{{const R={R};return {{n:R.units.length,wagen:R.units.filter(u=>u.kind==='wagen').length,kinds:[...new Set(R.units.map(u=>u.kind))],s:R.units[0].s,spawned:R.units.filter(u=>u.spawned).length}}}}")
    g.check('5–8 Motivwagen', 5 <= u['wagen'] <= 8, u['wagen'])
    g.check('Garde, Musikzug, Schwellköpp, Wagen dabei', set(u['kinds']) == {'garde', 'musik', 'wagen', 'schwell'}, u['kinds'])
    await g.step(5)
    s1 = await g.js(f"()=>{R}.units[0].s")
    g.check('Zugspitze rückt vor (≈ SPEED·5 s)', abs(s1 - u['s'] - 15) < 0.5, f"{u['s']:.1f}→{s1:.1f}")
    names = await g.js(f"()=>{R}.units.filter(u=>u.kind==='wagen').map(u=>u.name)")
    g.check('Motivwagen zeigen nur frei erfundene Figuren', 'Dr. Hubertus Schoppenhauer' in names and len(names) == len(set(names)), names)
    cr = await g.js(f"""()=>{{const R={R};return {{crowd:R.crowd.length,venue:R.crowd.filter(h=>h.state==='venue').length,cops:R.cops.length,
        copsIdle:R.cops.every(c=>c.kind==='cop'&&c.state==='venue'),wanted:{M}.wanted}}}}""")
    g.check('Zuschauer säumen die Strecke (≥ 20)', cr['crowd'] >= 20 and cr['venue'] == cr['crowd'], cr)
    g.check('Polizei steht ruhig an den Absperrungen', cr['cops'] >= 2 and cr['copsIdle'] and cr['wanted'] == 0, cr)

    # 5. Wagen kommt am Spieler vorbei: Jubeln, Helau, Kamelle
    first = await g.js(f"()=>{R}.units.findIndex(u=>u.kind==='wagen')")
    await g.js(f"()=>{{const R={R};const u=R.units[{first}];R.head=Math.max(R.head,R.nearest({M}.P1.h.x,{M}.P1.h.z).s+u.off+6)}}")
    await g.step(1.5)
    mx, n = await g.js(ARM_MAX)
    g.check('Zuschauer jubeln, wenn ein Wagen vorbeikommt', n >= 3, n)
    g.check('Jubelarme gehoben, aber höchstens 45° über der Waagrechten', 15 <= mx <= 45, f'{mx:.1f}°')
    for _ in range(8):
        await g.step(0.5)
        mx2, _n = await g.js(ARM_MAX)
        mx = max(mx, mx2)
    g.check('auch nach 4 s keine senkrechten Arme', mx <= 45, f'{mx:.1f}°')
    txt = await g.js(f"()=>{R}.crowd.filter(h=>h.bubble).map(h=>h.bubble.textContent)")
    g.check('Zuschauer rufen (Helau & Co.)', len(txt) > 0, txt[:3])

    c0 = await g.js(f"()=>{R}.kamelle.caught")
    hit = await g.js(f"()=>{{const R={R},P={M}.P1;return R.throwAt({first},P.h.x,P.h.z)}}")
    g.check('Wagen wirft Kamelle', hit)
    await g.step(2)
    c1 = await g.js(f"()=>{R}.kamelle.caught")
    g.check('gezielte Kamelle wird gefangen (Zähler steigt)', c1 > c0, f'{c0}→{c1}')
    miss = await g.js(f"""()=>{{const R={R},P={M}.P1,k=R.kamelle;const n=k.caught;const u=R.units[{first}];const dx=u.x-P.h.x,dz=u.z-P.h.z,L=Math.hypot(dx,dz);
        R.throwAt({first},P.h.x-dx/L*9,P.h.z-dz/L*9);return n}}""")
    await g.step(1.6)
    g.check('Kamelle 9 m daneben zählt nicht', await g.js(f"()=>{R}.kamelle.caught") == miss)
    for _ in range(20):
        await g.step(0.5)
    c2 = await g.js(f"()=>{R}.kamelle")
    g.check('Wagen werfen von selbst Kamelle (Spieler fängt weitere)', c2['caught'] > c1, c2['caught'])
    g.check('Rekord folgt dem Zähler', c2['best'] >= c2['caught'], c2['best'])
    hud = await g.js("()=>{const d=document.getElementById('rosenmo-hud');return d&&d.style.display!=='none'?d.textContent:''}")
    g.check('HUD zeigt Kamelle-Zähler', 'Kamelle' in hud, hud)

    # 6. Speicherstand
    best = c2['best']
    snap = await g.js(f"()=>{M}.snapshot().rosenmo")
    g.check('snapshot enthält Rekord + Spieltag', snap and snap['best'] == best and snap['day'] == 4, snap)
    old = await g.js(f"()=>{{const M={M};const d=M.snapshot();delete d.rosenmo;return M.applySave(d)&&M.ROSENMO.kamelle.best}}")
    g.check('alter Spielstand ohne rosenmo lädt, Rekord bleibt', old == best, old)
    new = await g.js(f"()=>{{const M={M};const d=M.snapshot();d.rosenmo={{best:42,day:7}};M.applySave(d);return [M.ROSENMO.kamelle.best,M.ROSENMO.day]}}")
    g.check('Spielstand mit rosenmo setzt Rekord + Tag', new == [42, 7], new)
    await g.js(f"()=>{{{R}.day=4}}")

    # 7. Ende + Aufräumen
    h0 = await g.js(f"()=>{M}.HUMANS.length")
    ours = await g.js(OURS)
    await g.js(f"()=>{{const R={R};const U=R.units;R.head=R.len+U[U.length-1].off+U[U.length-1].len+1}}")
    await g.step(0.3)
    end = await g.js(f"""()=>{{const R={R};return {{on:R.on,units:R.units.length,crowd:R.crowd.length,cops:R.cops.length,barriers:R.barriers.length,mesh:!!R.mesh,block:R.blockSet.size,fly:R.kamelle.flying.length+R.kamelle.ground.length}}}}""")
    g.check('Zug endet, wenn der letzte Wagen durch ist', end['on'] is False, end)
    g.check('Zugteile, Zuschauer, Polizei, Gitter, Kamelle aufgeräumt',
            end['units'] == 0 and end['crowd'] == 0 and end['cops'] == 0 and end['barriers'] == 0 and not end['mesh'] and end['block'] == 0 and end['fly'] == 0, end)
    left = await g.js(OURS)
    h1 = await g.js(f"()=>{M}.HUMANS.length")
    g.check('keine Rosenmontags-Figuren mehr in HUMANS', left == 0 and h1 <= h0 - ours + 5, f'{ours}→{left}, HUMANS {h0}→{h1}')
    await g.step(2)
    g.check('am selben Tag kein zweiter Zug', await g.js(f"()=>{R}.on") is False)
    g.check('Rekord nach dem Zug erhalten', await g.js(f"()=>{R}.kamelle.best") >= best)

    # 8. Mission am Fastnachtsbrunnen startet den Zug, 15 Kamelle = gewonnen
    ms = await g.js(f"""()=>{{const M={M};const m=M.MISSIONS.find(m=>m.id==='rosenmo');if(!m)return null;M.P1.h.x=m.start[0];M.P1.h.z=m.start[1];M.startMission(m,M.P1);
        return {{free:!!m.free,on:M.ROSENMO.on,reason:M.ROSENMO.reason,d:Math.round(M.ROSENMO.nearest(m.start[0],m.start[1]).d)}}}}""")
    g.check('Mission „Kamelle-König“ (frei) startet den Zug', ms and ms['free'] and ms['on'] and ms['reason'] == 'mission', ms)
    await g.step(1)
    await g.js(f"()=>{{{R}.kamelle.caught+=15}}")
    await g.step(0.5)
    g.check('15 Kamelle gewinnen die Mission', await g.js(f"()=>!{M}.activeMission&&!!{M}.G.done.rosenmo"))
    await g.js(f"()=>{R}.end('test')")

    # 9. Start über die Karte (Schnellreise-Eintrag)
    d = await g.js(f"()=>{{const M={M};const d=M.ftDestinations().find(d=>d.rosenmo);if(!d)return null;M.fastTravel(d);return d.n}}")
    g.check('Karte: Eintrag „Rosenmontagszug starten“ startet den Zug', d and await g.js(f"()=>{R}.on&&{R}.reason==='karte'"), d)
    await g.step(1)
    await g.js(f"()=>{R}.end('test')")
    g.check('nach Kartenstart sauber beendet', await g.js(OURS) == 0)

run(test)
