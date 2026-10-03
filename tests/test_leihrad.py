# Meenzer Leihrad: Stationen in Mainz + Wiesbaden, Räder nur in Spielernähe, Ausleihen für 1 €, Karte, einmaliger Hinweis,
# kein globaler Zufall, Parkplatz-Budget unberührt, Fahrradführerschein-Polizist wie bei p5c_rad.
# real=True: echtes three.js für den Screenshot der Start-Station (tests/out/leihrad_start.jpg)
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'

# Start-Station = nächste zu POI.start
START = f"()=>{{const M={M},S=M.POI.start;let b=null,bd=1e9;for(const s of M.LEIH.stations){{const d=Math.hypot(s.x-S[0],s.z-S[1]);if(d<bd){{bd=d;b=s}}}}return {{i:b.i,d:bd,x:b.x,z:b.z,f:b.f,bikes:b.bikes.length,active:b.active}}}}"
# Spieler zu Fuß neben ein abgestelltes Rad der Station i stellen (seitlich, 1,2 m), Blick aufs Rad
NEXT_TO = f"""(i)=>{{const M={M},P=M.P1,s=M.LEIH.stations[i];if(P.car)M.exitCar(P,true);const k=s.bikes[0];if(k===undefined)return false;const p=s.slots[k];
  const nx=Math.sin(p.h),nz=Math.cos(p.h);P.h.x=p.x+nx*1.3;P.h.z=p.z+nz*1.3;P.h.y=M.groundYFn(P.h.x,P.h.z,0);P.h.facing=Math.atan2(-nx,-nz);P.cam.yaw=P.h.facing;P.h.sync();return true}}"""
TELE = f"([x,z])=>{{const M={M},P=M.P1;if(P.car)M.exitCar(P,true);P.h.x=x;P.h.z=z;P.h.y=M.groundYFn(x,z,0);P.h.sync()}}"
# Leihrad auf eine lange gerade Straße stellen (wie test_rad), Spieler sitzt drauf
ROAD = f"""(k)=>{{const M={M},c=M.P1.car;if(!c)return false;const es=M.EDGES.map((E,i)=>[E,i]).filter(([E])=>E.car&&E.len>260&&!E.ow);const [E]=es[k%es.length];
  const a=M.NODES[E.a],b=M.NODES[E.b];const dx=(b.x-a.x)/E.len,dz=(b.z-a.z)/E.len;c.x=a.x+dx*12;c.z=a.z+dz*12;c.h=Math.atan2(dx,dz);c.vx=c.vz=c.speed=0;c.y=M.groundYFn(c.x,c.z,0);c.sync();M.P1.cam.yaw=c.h;return true}}"""
PARKED = f"()=>{{const M={M};let p=0;for(const c of M.CARS)if(c.ai.mode==='parked'&&!c.persist)p++;return {{parked:p,cars:M.CARS.length}}}}"


async def ride(g, sec, chunk=0.1):
    star, d = 0, 0.0
    p0 = await g.js(f"()=>{{const c={M}.P1.car;return c?[c.x,c.z]:null}}")
    await g.page.keyboard.down('KeyW')
    for _ in range(round(sec / chunk)):
        await g.step(chunk)
        star = max(star, await g.js(f"()=>{M}.wanted"))
    await g.page.keyboard.up('KeyW')
    p1 = await g.js(f"()=>{{const c={M}.P1.car;return c?[c.x,c.z]:null}}")
    if p0 and p1: d = ((p1[0] - p0[0]) ** 2 + (p1[1] - p0[1]) ** 2) ** 0.5
    return star, d


async def test(g):
    await g.start()
    g.check('Spiel läuft', await g.js(f"()=>{M}.mode") == 'play')

    # 1. Stationen: Anzahl, Verteilung, Start-Station
    st = await g.js(f"()=>{{const L={M}.LEIH;return {{n:L.stations.length,mz:L.stations.filter(s=>s.z>-3500).length,wi:L.stations.filter(s=>s.z<-7000).length,"
                    f"gap:Math.min(...L.stations.map(a=>Math.min(...L.stations.filter(b=>b!==a).map(b=>Math.hypot(a.x-b.x,a.z-b.z))))),"
                    f"meshes:Math.max(...L.stations.map(s=>s.meshes.length))}}}}")
    g.check('25–40 Leihrad-Stationen', 25 <= st['n'] <= 40, st['n'])
    g.check('Stationen in Mainz (>= 15) und Wiesbaden (>= 6)', st['mz'] >= 15 and st['wi'] >= 6, st)
    g.check('Stationen mindestens 150 m auseinander', st['gap'] >= 150, round(st['gap']))
    g.check('höchstens 3 Meshes (Draw-Calls) je Station', st['meshes'] <= 3, st['meshes'])
    s0 = await g.js(START)
    g.check('Station höchstens 25 m vom Startpunkt', s0['d'] <= 25, f"{s0['d']:.1f} m")

    # 2. kein globaler Zufall beim Bauen/Spawnen der Stationen
    rnd = await g.js(f"""()=>{{const M={M},L=M.LEIH,r=Math.random;let n=0;Math.random=function(){{n++;return r()}};
      try{{const pl=L.api.place();const far=L.stations[L.stations.length-1];const was=far.active;L.api.spawn(far);const k=far.bikes.length;L.api.despawn(far);if(was)L.api.spawn(far);
        return {{n,places:pl.length,same:pl.length===L.stations.length&&pl.every((p,i)=>Math.abs(p.x-L.stations[i].x)<1e-9&&Math.abs(p.z-L.stations[i].z)<1e-9),k}}}}finally{{Math.random=r}}}}""")
    g.check('Stationen bauen + Räder spawnen ohne Math.random', rnd['n'] == 0, rnd)
    g.check('Platzierung deterministisch (gleiches Ergebnis wie beim Boot)', rnd['same'], rnd)
    g.check('Station legt 2–4 Räder in die Bügel', 2 <= rnd['k'] <= 4, rnd['k'])

    # 3. Räder nur in Spielernähe
    near = await g.js(f"""()=>{{const M={M},L=M.LEIH,[px,pz]=M.ppos(M.P1);const act=L.stations.filter(s=>s.bikes.length);
      return {{act:act.length,maxD:Math.max(0,...act.map(s=>Math.hypot(s.x-px,s.z-pz))),inst:L.api.instCount(),sum:act.reduce((a,s)=>a+s.bikes.length,0)}}}}""")
    s0 = await g.js(START)
    g.check('Start-Station hat nach dem Start 2–4 Räder', s0['active'] and 2 <= s0['bikes'] <= 4, s0)
    g.check('beim Start keine Räder an Stationen > 250 m', near['maxD'] <= 250, near)
    g.check('Instanzen = Räder in den Bügeln', near['inst'] == near['sum'], near)
    g.check('Räder sind keine Autos (CARS ohne Leihrad)', await g.js(f"()=>!{M}.CARS.some(c=>c.leih)"))
    dc = await g.js(f"()=>{{const L={M}.LEIH,s=L.stations[{s0['i']}];return L.api.drawCalls(s.x,s.z)}}")
    g.check('höchstens 10 zusätzliche Draw-Calls an der Start-Station', 0 < dc <= 10, dc)

    # 4. Parkplatz-Budget unverändert: Stationen in der Nähe aktivieren ändert weder CARS noch geparkte Autos
    b0 = await g.js(PARKED)
    await g.js(f"()=>{{const L={M}.LEIH;for(const s of L.stations.slice(0,12))L.api.spawn(s)}}")
    b1 = await g.js(PARKED)
    g.check('Leihräder zählen nicht gegen das Parkplatz-Budget', b0 == b1, f'{b0} → {b1}')
    await g.js(f"()=>{{const L={M}.LEIH;for(const s of L.stations.slice(0,12))if(s.i!=={s0['i']})L.api.despawn(s)}}")

    # 5. Hinweis: erst nach der Einleitungs-Wartezeit, dann genau einmal
    await g.step(4)
    g.check('kein Leihrad-Hinweis in den ersten Sekunden', await g.js(f"()=>{M}.LEIH.hint.shown") == 0)
    await g.step(12)
    h = await g.js(f"()=>{{const H={M}.LEIH.hint;return {{shown:H.shown,text:H.text,t:H.t,cur:document.getElementById('hint').innerHTML}}}}")
    g.check('Hinweis „Do vorne steht e Leihrad …“ erscheint', h['shown'] == 1 and 'Leihrad' in h['text'] and '<b>E</b>' in h['text'], h)
    await g.step(12)
    h2 = await g.js(f"()=>{M}.LEIH.hint")
    g.check('Hinweis nur einmal', h2['shown'] == 1 and h2['t'] == h['t'], h2)
    tt = await g.js(f"()=>{{const T={M}.TOUCHUI,m=T.mode;T.mode='touch';{M}.LEIH.hint.shown=0;{M}.LEIH.playT=99;{M}.update(1/60);const t=document.getElementById('hint').innerHTML;T.mode=m;return t}}")
    g.check('Touch: Hinweis nennt AKTION statt E', '<b>AKTION</b>' in tt, tt)

    # 6. Minimap + große Karte
    await g.js(f"()=>{M}.drawMinimaps()")
    mi = await g.js(f"()=>{M}.LEIH.mini")
    g.check('Minimap zeichnet Leihrad-Symbole', mi['draws'] > 0 and mi['icons'] >= 1, mi)
    g.check('Minimap hebt die nächste Station hervor (zu Fuß)', mi['hi'] == s0['i'], mi)
    await g.key('KeyM')
    bm = await g.js(f"()=>{{const b={M}.LEIH.big;return {{...b,mode:{M}.mode}}}}")
    await g.js("()=>document.getElementById('btn-map-close').click()")
    g.check('große Karte zeichnet Stationen + hebt nächste hervor', bm['mode'] == 'map' and bm['draws'] > 0 and bm['icons'] >= 1 and bm['hi'] == s0['i'], bm)

    # 7. Ausleihen mit E: 1 €, Spieler fährt (ctrl player)
    g.check('Spieler neben ein Leihrad gestellt', await g.js(NEXT_TO, s0['i']))
    m0 = await g.js(f"()=>[{M}.G.money,{M}.LEIH.stations[{s0['i']}].bikes.length,{M}.LEIH.api.instCount()]")
    await g.key('KeyE')
    r = await g.js(f"()=>{{const M={M},c=M.P1.car;return {{car:!!c,pedal:!!(c&&c.T.pedal),leih:!!(c&&c.leih),ctrl:c&&c.ctrl,persist:c&&c.persist,mode:c&&c.ai.mode,money:M.G.money,"
                   f"bikes:M.LEIH.stations[{s0['i']}].bikes.length,inst:M.LEIH.api.instCount(),hint:document.getElementById('hint').innerHTML}}}}")
    g.check('E am Leihrad: Spieler sitzt auf einem Leih-Fahrrad (ctrl player)', r['car'] and r['pedal'] and r['leih'] and r['ctrl'] == 'player', r)
    g.check('Ausleihen kostet genau 1 €', r['money'] == m0[0] - 1, f"{m0[0]} → {r['money']}")
    g.check('Rad verschwindet aus dem Bügel', r['bikes'] == m0[1] - 1 and r['inst'] == m0[2] - 1, r)
    g.check('Mundart-Hinweis „E Leihrad für en Euro – gude Fahrt!“', 'E Leihrad für en Euro – gude Fahrt!' in r['hint'], r['hint'])
    g.check('Leihrad zählt danach nicht als geparktes Auto', not r['persist'] and r['mode'] == 'player', r)

    # 8. ohne Führerschein: Stern + Rad-Polizist wie bei p5c_rad
    await g.js(f"()=>{{const M={M};M.G.fahrradSchein=false;M.setWanted(0);M.RAD.forceCop=true;M.RAD.cop=null;M.RAD.copCD=0}}")
    g.check('Leihrad auf gerade Strecke gestellt', await g.js(ROAD, 0))
    star, d = await ride(g, 6)
    cop = await g.js(f"()=>{{const h={M}.RAD.cop;return !!(h&&h.radCop)}}")
    g.check('Leihrad fährt (> 10 m in 6 s)', d > 10, f'{d:.1f} m')
    g.check('ohne Fahrradführerschein: Stern', star >= 1, star)
    g.check('ohne Fahrradführerschein: Rad-Polizist („Kek“) kommt', cop)
    await g.js(f"()=>{{const M={M};M.RAD.forceCop=false;M.setWanted(0)}}")

    # 9. liegengelassenes Leihrad wird weit weg aufgeräumt
    c0 = await g.js(f"()=>{{const M={M},c=M.P1.car;M.exitCar(M.P1,true);window.__leihC=c;return [c.x,c.z,M.LEIH.cleaned]}}")
    await g.step(0.5)
    g.check('abgestelltes Leihrad bleibt in der Nähe stehen', await g.js("()=>!window.__leihC.removed"))
    await g.js(TELE, [c0[0] + 450, c0[1]])
    await g.step(1)
    cl = await g.js(f"()=>[window.__leihC.removed,{M}.LEIH.cleaned,{M}.CARS.includes(window.__leihC)]")
    g.check('liegengelassenes Leihrad > 400 m entfernt wird aufgeräumt', cl[0] and cl[1] == c0[2] + 1 and not cl[2], cl)

    # 10. weit weg: Räder der Start-Station verschwinden, zurück: neue Räder
    far = await g.js(f"()=>{{const L={M}.LEIH,s=L.stations[{s0['i']}];return [s.bikes.length,s.active,s.despawns]}}")
    g.check('Start-Station > 400 m entfernt: Räder verschwinden', far[0] == 0 and not far[1] and far[2] >= 1, far)
    await g.js(TELE, [s0['x'] + 30, s0['z']])
    await g.step(0.5)
    back = await g.js(f"()=>{{const L={M}.LEIH,s=L.stations[{s0['i']}];return [s.bikes.length,s.active,s.spawns]}}")
    g.check('zurück in der Nähe: Station hat wieder 2–4 Räder', back[1] and 2 <= back[0] <= 4, back)

    # 11. pleite: kein Rad, Hinweis
    g.check('Spieler wieder neben ein Leihrad gestellt', await g.js(NEXT_TO, s0['i']))
    br = await g.js(f"()=>{{const M={M};M.G.money=0;const b=M.LEIH.broke;M.tryEnterExit(M.P1);return {{car:!!M.P1.car,money:M.G.money,broke:M.LEIH.broke-b,hint:document.getElementById('hint').innerHTML}}}}")
    g.check('ohne Euro: kein Leihrad, Hinweis', not br['car'] and br['money'] == 0 and br['broke'] == 1 and 'Euro' in br['hint'], br)

    # 12. F/EIN-AUS leiht auch aus; Absteigen an der Station stellt das Rad zurück
    rt = await g.js(f"""()=>{{const M={M},L=M.LEIH,s=L.stations[{s0['i']}];M.G.money=10;const n0=s.bikes.length;M.tryEnterExit(M.P1);const c=M.P1.car;
      const on=!!(c&&c.leih);const n1=s.bikes.length;const r0=L.returns;M.exitCar(M.P1);return {{on,money:M.G.money,n0,n1,n2:s.bikes.length,ret:L.returns-r0,removed:!!(c&&c.removed)}}}}""")
    g.check('F/EIN-AUS am Leihrad leiht aus (1 €)', rt['on'] and rt['money'] == 9 and rt['n1'] == rt['n0'] - 1, rt)
    g.check('Absteigen an der Station: Rad zurück im Bügel', rt['ret'] == 1 and rt['removed'] and rt['n2'] == rt['n0'], rt)

    # 13. Screenshot der Start-Station (echtes three.js)
    await g.js(f"""()=>{{const M={M},P=M.P1,s=M.LEIH.stations[{s0['i']}];const nx=Math.sin(s.f),nz=Math.cos(s.f),tx=Math.cos(s.f),tz=-Math.sin(s.f);
      M.gameMin=13*60;M.setWeather('klar');P.h.x=s.x+nx*4.5+tx*3.2;P.h.z=s.z+nz*4.5+tz*3.2;P.h.y=M.groundYFn(P.h.x,P.h.z,0);
      P.h.facing=Math.atan2(s.x-P.h.x,s.z-P.h.z);P.cam.yaw=P.h.facing;P.cam.pitch=0.25;P.h.sync()}}""")
    await g.step(0.5)
    print('  Screenshot: ' + await g.snap('leihrad_start', 4))


run(test, real=True)
