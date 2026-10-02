# Rausspringen aus fahrenden Fahrzeugen: Abrollen statt "Zu schnell", Schaden nach Tempo, Auto rollt führerlos weiter
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
S = f'{M}.SPRUNG'

# Fahrzeug `type` am Anfang einer langen geraden Straße (k-te) aufstellen, Spieler einsteigen lassen, Tempo `sp` geben
PLACE = f"""([type,k,sp])=>{{const M={M},P=M.P1;if(P.car)M.exitCar(P,true);M.setWanted(0);P.h.health=100;P.armor=0;
    const es=M.EDGES.map((E,i)=>[E,i]).filter(([E])=>E.car&&E.len>260&&!E.ow);const [E]=es[k%es.length];
    const a=M.NODES[E.a],b=M.NODES[E.b];const dx=(b.x-a.x)/E.len,dz=(b.z-a.z)/E.len;
    const c=new M.Car(type,a.x+dx*30,a.z+dz*30,Math.atan2(dx,dz),{{ctrl:'none'}});c.ai={{mode:'parked'}};
    P.h.x=c.x;P.h.z=c.z;M.enterCar(P,c);if(P.car!==c)return null;
    c.vx=dx*sp;c.vz=dz*sp;c.speed=sp;window.__sp={{c,x:c.x,z:c.z,dx,dz}};document.getElementById('hint').innerHTML='';return true}}"""
# Spieler-Abstand quer zur Fahrlinie, Auto-Strecke ab Absprung, Bodenabstand
GEO = f"""()=>{{const M={M},s=window.__sp,h=M.P1.h,c=s.c;const rx=h.x-s.x,rz=h.z-s.z;
    return {{lat:Math.abs(rx*s.dz-rz*s.dx),along:rx*s.dx+rz*s.dz,car:Math.hypot(c.x-s.x0,c.z-s.z0),csp:Math.hypot(c.vx,c.vz),
      gy:Math.abs(h.y-M.groundYFn(h.x,h.z,h.y)),hp:h.health,rolling:!!{S}.rolling,inCar:!!M.P1.car,mode:c.ai.mode,
      health:c.health,crashed:c.health<100}}}}"""


async def bail(g, type, k, sp):
    ok = await g.js(PLACE, [type, k, sp])
    g.check(f'{type} @ {sp} m/s aufgestellt', ok)
    await g.key('KeyF', after=0)
    await g.js("()=>{const s=window.__sp;s.x0=s.c.x;s.z0=s.c.z}")
    return await g.js(f"()=>({{inCar:!!{M}.P1.car,hint:document.getElementById('hint').textContent,last:{S}.last&&{{speed:{S}.last.speed,damage:{S}.last.damage,same:{S}.last.car===window.__sp.c}},rolling:!!{S}.rolling,hp:{M}.P1.h.health}})")


async def test(g):
    await g.start()
    g.check('Spiel läuft', await g.js(f"()=>{M}.mode") == 'play')

    # 1. Auto mit ~20 m/s: F → raus, kein "Zu schnell", Abrollen, Schaden
    r = await bail(g, 'kompakt', 0, 20)
    g.check('20 m/s: Spieler ist ausgestiegen', not r['inCar'], r)
    g.check('kein "Zu schnell"-Hinweis', 'Zu schnell' not in r['hint'], r['hint'])
    g.check('Abrollen läuft (SPRUNG.rolling)', r['rolling'])
    g.check('SPRUNG.last: Tempo ~20, eigenes Auto', r['last'] and 17 < r['last']['speed'] < 21 and r['last']['same'], r['last'])
    g.check('Schaden > 0 und von der Gesundheit abgezogen', r['last']['damage'] > 0 and abs(100 - r['hp'] - r['last']['damage']) < 0.01, r)
    await g.step(0.3)
    mid = await g.js(GEO)
    pose = await g.js(f"()=>{{const p={S}.POSE,R={M}.HALTUNG.RMAX;return {{ok:p.armR[0]>=R&&p.armL[0]>=R,armR:p.armR,armL:p.armL}}}}")
    g.check('mitten im Rollen (Rollpose: Arme angelegt, unter der Haltungs-Sperre)', mid['rolling'] and pose['ok'], pose)
    await g.step(2.5)
    a = await g.js(GEO)
    g.check('nach dem Rollen: wieder auf den Beinen', not a['rolling'], a)
    g.check('Spieler liegt neben der Fahrlinie (0,8–10 m quer)', 0.8 < a['lat'] < 10, f"{a['lat']:.2f} m")
    g.check('Spieler auf dem Boden', a['gy'] < 0.3, a['gy'])
    g.check('Auto rollt führerlos weiter (> 20 m seit Absprung)', a['car'] > 20, f"{a['car']:.1f} m")
    g.check('Auto ist dem Spieler voraus', a['car'] > a['along'] + 5, a)
    # irgendwann steht es (oder ist gekracht) und ist ein normales geparktes Auto
    for _ in range(60):
        a = await g.js(GEO)
        if a['csp'] < 0.01 and a['mode'] == 'parked': break
        await g.step(0.5)
    g.check('Auto rollt aus und steht dann geparkt (oder ist gekracht)', a['csp'] < 0.01 and a['mode'] == 'parked', a)
    g.check('Auto nicht ewig weit (< 400 m)', a['car'] < 400, f"{a['car']:.1f} m")
    g.check('Auto aus der Ausroll-Liste entfernt', await g.js(f"()=>!{S}.cars.some(e=>e.c===window.__sp.c)"))
    re = await g.js(f"()=>{{const M={M},P=M.P1,c=window.__sp.c;P.h.x=c.x;P.h.z=c.z;M.enterCar(P,c);const ok=P.car===c;M.exitCar(P,true);return ok}}")
    g.check('stehengelassenes Auto kann wieder genommen werden', re)

    # 1b. führerloses Auto kracht in ein Hindernis (geparkter Transporter 25 m voraus)
    await g.step(1)
    ok = await g.js(PLACE, ['kombi', 8, 20])
    g.check('kombi @ 20 m/s vor Hindernis aufgestellt', ok)
    await g.js(f"()=>{{const M={M},s=window.__sp;const t=new M.Car('transporter',s.x+s.dx*25,s.z+s.dz*25,Math.atan2(s.dx,s.dz),{{ctrl:'none'}});t.ai={{mode:'parked'}};s.wall=t}}")
    await g.key('KeyF', after=0)
    g.check('Absprung vor dem Hindernis', await g.js(f"()=>!{M}.P1.car&&!!{S}.rolling"))
    await g.step(3)
    cr = await g.js("()=>{const s=window.__sp;return {car:s.c.health,wall:s.wall.health,sp:Math.hypot(s.c.vx,s.c.vz)}}")
    g.check('führerloses Auto kracht (Schaden an Auto oder Hindernis)', cr['car'] < 100 or cr['wall'] < 100, cr)
    await g.js("()=>{const s=window.__sp;s.wall.remove()}")

    # 2. Schaden hängt vom Tempo ab
    await g.step(1)
    r12 = await bail(g, 'limo', 1, 12)
    await g.step(3)
    r30 = await bail(g, 'limo', 2, 30)
    await g.step(3)
    d12, d30 = r12['last']['damage'], r30['last']['damage']
    g.check('12 m/s: kaum Schaden (< 5)', 0 <= d12 < 5, f'{d12:.2f}')
    g.check('30 m/s: deutlich Schaden (> 25)', d30 > 25, f'{d30:.2f}')
    g.check('30 m/s tut mehr weh als 12 m/s', d30 > d12 * 5, f'{d12:.2f} vs {d30:.2f}')
    g.check('30 m/s überlebt', await g.js(f"()=>{M}.P1.h.health>0&&!{M}.P1.gameOver"))

    # 3. langsam: normales Aussteigen ohne Schaden und ohne Rollen
    await g.js(PLACE, ['kompakt', 3, 0])
    await g.js(f"()=>{{const s=window.__sp;s.c.vx=s.dx*4;s.c.vz=s.dz*4;s.c.speed=4;{S}.last=null}}")
    await g.key('KeyF', after=0.5)
    lo = await g.js(f"()=>({{inCar:!!{M}.P1.car,rolling:!!{S}.rolling,last:{S}.last,hp:{M}.P1.h.health,brake:window.__sp.c.inp.brake}})")
    g.check('4 m/s: ausgestiegen, kein Rollen, kein Schaden, Auto bremst', not lo['inCar'] and not lo['rolling'] and lo['last'] is None and lo['hp'] == 100 and lo['brake'] == 1, lo)

    # 4. Motorrad: gleiches Abrollen statt Umfallen
    await g.step(1)
    mb = await bail(g, 'motorrad', 4, 20)
    g.check('Motorrad 20 m/s: abgerollt', not mb['inCar'] and mb['rolling'] and mb['last']['damage'] > 0, mb)
    g.check('Motorrad: Schaden nur einmal (wie Auto bei gleichem Tempo)', abs(100 - mb['hp'] - mb['last']['damage']) < 0.01, mb)
    await g.step(0.2)
    g.check('Motorrad: Spieler nicht im alten knock-Zustand', await g.js(f"()=>{M}.P1.h.state!=='knock'"))
    await g.step(3)
    g.check('Motorrad: Spieler wieder auf den Beinen', await g.js(f"()=>!{S}.rolling&&{M}.P1.h.state==='walk'"))

    # 5. Polizeiauto bleibt Polizeiauto
    await g.step(1)
    po = await bail(g, 'polizei', 5, 18)
    g.check('Polizeiauto: abgesprungen', not po['inCar'] and po['rolling'], po)
    for _ in range(60):
        st = await g.js("()=>{const c=window.__sp.c;return {sp:Math.hypot(c.vx,c.vz),mode:c.ai.mode,police:!!c.T.police}}")
        if st['mode'] == 'parked': break
        await g.step(0.5)
    g.check('Polizeiauto steht danach geparkt und ist noch Polizei', st['mode'] == 'parked' and st['police'], st)

    # 6. Flugzeug am Boden schnell: weiter gesperrt; in der Luft: Absprung mit Jetpack-Hinweis
    await g.js(f"()=>{{{S}.last=null}}")
    pl = await bail(g, 'flugzeug', 6, 15)
    g.check('Flugzeug am Boden 15 m/s: bleibt sitzen wie bisher, kein Rollen', pl['inCar'] and not pl['rolling'] and pl['last'] is None, pl)
    air = await g.js(f"()=>{{const M={M},P=M.P1,c=P.car;c.alt=40;c.y+=40;M.exitCar(P);return {{inCar:!!P.car,ground:P.ground,rolling:!!{S}.rolling,last:{S}.last}}}}")
    g.check('Flugzeug in der Luft: Absprung wie bisher (kein Rollen)', not air['inCar'] and air['ground'] is False and not air['rolling'] and air['last'] is None, air)
    await g.step(4)

    # 7. Boot auf dem Wasser: wie bisher (schnell: bleibt drin; langsam: ins Wasser/an Land, nie Rollen oder Schaden)
    BOAT = f"""(sp)=>{{const M={M},P=M.P1;if(P.car)M.exitCar(P,true);P.h.health=100;{S}.last=null;
        const b=M.CARS.find(c=>c.T.boat&&!c.T.jetski);if(!b)return null;P.h.x=b.x;P.h.z=b.z;M.enterCar(P,b);if(P.car!==b)return null;
        const fx=Math.sin(b.h),fz=Math.cos(b.h);b.vx=fx*sp;b.vz=fz*sp;b.speed=sp;M.exitCar(P);
        return {{inCar:!!P.car,rolling:!!{S}.rolling,last:{S}.last,hp:P.h.health}}}}"""
    bo = await g.js(BOAT, 12)
    g.check('Boot 12 m/s: bleibt wie bisher sitzen, kein Rollen', bo and bo['inCar'] and not bo['rolling'] and bo['last'] is None, bo)
    bo = await g.js(BOAT, 4)
    g.check('Boot 4 m/s: steigt aus wie bisher, kein Rollen, kein Schaden', bo and not bo['inCar'] and not bo['rolling'] and bo['last'] is None and bo['hp'] == 100, bo)
    await g.step(1)

    # 8. sehr schnell: Schaden gedeckelt
    vf = await bail(g, 'sport', 7, 40)
    g.check('40 m/s: schwer verletzt, aber überlebt', 50 < vf['last']['damage'] < 100 and vf['hp'] > 0, vf)
    await g.step(3)

    # 9. tödlicher Absprung: kein Rollen bleibt übrig, nach dem Wiederbeleben wird nicht weitergerollt
    await g.js(PLACE, ['sport', 9, 35])
    await g.js(f"()=>{{{M}.P1.h.health=5}}")
    await g.key('KeyF', after=0)
    de = await g.js(f"()=>({{over:!!{M}.P1.gameOver,rolling:!!{S}.rolling}})")
    g.check('tödlicher Absprung: Game over, kein aktives Rollen', de['over'] and not de['rolling'], de)
    await g.step(8)
    g.check('nach Game over/Respawn kein Rollen', await g.js(f"()=>!{S}.rolling"))


if os.environ.get('SPRUNG_SHOT'):
    async def shots(g):
        await g.start()
        await g.js(f"()=>{{const M={M};M.gameMin=14*60;M.setWeather('klar')}}")
        ok = await g.js(PLACE, ['kompakt', 0, 18])
        g.check('aufgestellt', ok)
        await g.key('KeyF', after=0)
        await g.js(f"()=>{{const M={M},P=M.P1,s=window.__sp;P.cam.yaw=Math.atan2(s.dx,s.dz)+0.5;P.cam.pitch=0.3;P.cam.zoom=1.2}}")
        await g.step(0.35)
        print(await g.snap('sprung_rollen', 1))
        await g.step(0.25)
        print(await g.snap('sprung_rollen2', 1))
    run(shots, real=True)
else:
    run(test)
