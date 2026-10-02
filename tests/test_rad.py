# Fahrräder + Fahrradführerschein: geparkte Räder, Fahren ohne Motor, Stern ohne Schein, Rad-Polizist, Prüfungsmission, Speicherstand
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'

# Lange gerade Straßenkante suchen und das Rad am Anfang Richtung Ende aufstellen (pro Aufruf ein anderer Index → frische Strecke)
PLACE = f"""(k)=>{{const M={M},P=M.P1;if(P.car)M.exitCar(P,true);
    const es=M.EDGES.map((E,i)=>[E,i]).filter(([E])=>E.car&&E.len>260&&!E.ow);const [E,i]=es[k%es.length];
    const a=M.NODES[E.a],b=M.NODES[E.b];const dx=(b.x-a.x)/E.len,dz=(b.z-a.z)/E.len;
    const c=M.RAD.bikes[k%M.RAD.bikes.length];c.x=a.x+dx*12;c.z=a.z+dz*12;c.h=Math.atan2(dx,dz);c.vx=c.vz=c.speed=0;c.sync();
    P.h.x=c.x-dx*2;P.h.z=c.z-dz*2;P.h.y=M.groundYFn(P.h.x,P.h.z,0);P.cam.yaw=c.h;M.tryEnterExit(P);return !!P.car&&P.car===c}}"""
STATE = f"()=>{{const M={M},c=M.P1.car;return c?{{x:c.x,z:c.z,sp:Math.abs(c.speed),max:c.T.max}}:null}}"


async def ride(g, sec, chunk=0.1):
    """Hält W für `sec` s Spielzeit; liefert (höchste Geschwindigkeit, gefahrene Strecke, höchster Stern-Level)."""
    p0 = await g.js(STATE)
    top, star = 0.0, 0
    await g.page.keyboard.down('KeyW')
    for _ in range(round(sec / chunk)):
        await g.step(chunk)
        s = await g.js(f"()=>[{M}.P1.car?Math.abs({M}.P1.car.speed):0,{M}.wanted]")
        top, star = max(top, s[0]), max(star, s[1])
    await g.page.keyboard.up('KeyW')
    p1 = await g.js(STATE)
    d = ((p1['x'] - p0['x']) ** 2 + (p1['z'] - p0['z']) ** 2) ** 0.5 if p1 and p0 else 0
    return top, d, star


async def keep_away(g):
    """Wanted frisch halten (sonst läuft die Fahndung aus) und den Spieler 30 m vom Polizisten weghalten (sonst nimmt er ihn fest)."""
    await g.js(f"()=>{{const M={M},h=M.RAD.cop,P=M.P1.h;M.setWanted(1);if(h){{P.x=h.x+30;P.z=h.z;P.y=M.groundYFn(P.x,P.z,0)}}}}")


async def bubble_text(g):
    return await g.js(f"()=>{{const h={M}.RAD.cop;return h&&h.bubble?h.bubble.textContent:''}}")


async def test(g):
    await g.start()
    g.check('Spiel läuft', await g.js(f"()=>{M}.mode") == 'play')

    # 1. geparkte Räder
    info = await g.js(f"()=>{{const B={M}.RAD.bikes;return {{n:B.length,pedal:B.every(c=>c.T.pedal),bike:B.every(c=>c.T.bike),parked:B.every(c=>c.ai.mode==='parked'),persist:B.every(c=>c.persist),inCars:B.every(c=>{M}.CARS.includes(c))}}}}")
    g.check('>= 10 geparkte Räder', info['n'] >= 10, info['n'])
    g.check('alle Räder: T.pedal, T.bike, ai.mode parked, persist, in CARS',
            info['pedal'] and info['bike'] and info['parked'] and info['persist'] and info['inCars'], info)
    await g.step(5)
    g.check('Räder bleiben nach 5 s geparkt und existieren noch',
            await g.js(f"()=>{M}.RAD.bikes.every(c=>c.ai.mode==='parked'&&!c.removed&&{M}.CARS.includes(c))"))

    # 2. Einsteigen, kein Motor, Höchstgeschwindigkeit, Bewegung
    g.check('Einsteigen per tryEnterExit klappt', await g.js(PLACE, 0))
    g.check('Fahrer auf dem Rad (P1.car.T.pedal)', await g.js(f"()=>!!({M}.P1.car&&{M}.P1.car.T.pedal)"))
    await g.js(f"()=>{{{M}.G.fahrradSchein=false}}")
    top, d, star = await ride(g, 8)
    eng = await g.js(f"()=>{M}.ENGINES.filter(e=>e&&e.active).length")
    g.check('Rad bewegt sich (> 20 m in 8 s)', d > 20, f'{d:.1f} m')
    g.check('Tempo überschreitet T.max (9 m/s) nie', 0 < top <= 9.0 + 1e-6, f'max {top:.2f} m/s')
    g.check('Rad erreicht > 2 m/s', top > 2, f'{top:.2f}')
    g.check('kein aktiver Motor beim Radeln', eng == 0, eng)

    # 3. ohne Schein: genau ein Stern, keine Eskalation
    g.check('ohne Schein: Stern 1 nach > 3 s Radeln', star == 1, star)
    worst = 0
    for k in range(1, 3):  # 2 x 10 s auf frischer Strecke
        g.check(f'Strecke {k} aufgestellt', await g.js(PLACE, k))
        top, d, star = await ride(g, 10)
        worst = max(worst, star)
    g.check('wanted eskaliert beim Weiterradeln nicht über 1', worst == 1, worst)
    await g.js(f"()=>{{const M={M};if(M.P1.car)M.exitCar(M.P1,true);M.setWanted(0)}}")

    # 4. Rad-Polizist
    await g.js(f"()=>{{const M={M};M.RAD.forceCop=true;M.RAD.cop=null;M.RAD.copCD=0}}")
    g.check('Rad für Polizist-Test aufgestellt', await g.js(PLACE, 3))
    # nur die Zeitzähler abwarten, ohne dass das Rad wegfährt: Rad steht (kein W), Zähler braucht aber Tempo → direkt Vergehen auslösen
    cop = await g.js(f"()=>{{const M={M};const h=M.radSpawnCop(M.P1);return !!h.radCop&&M.RAD.cop===h}}")
    g.check('radSpawnCop erzeugt Polizist mit radCop', cop)
    await g.js(f"()=>{{const M={M};M.setWanted(1)}}")
    await g.step(4)
    txt = await bubble_text(g)
    g.check('Sprechblase des Polizisten enthält "Kek"', 'Kek' in txt, txt)
    # Vergehen über den echten Pfad: Polizist weg, forceCop=true, Rad fahren ohne Schein
    await g.js(f"()=>{{const M={M};M.setWanted(0);M.RAD.cop&&M.RAD.cop.remove&&M.RAD.cop.remove();M.RAD.cop=null}}")
    g.check('Rad für Vergehen-Pfad aufgestellt', await g.js(PLACE, 4))
    await g.js(f"()=>{{{M}.G.fahrradSchein=false}}")
    top, d, star = await ride(g, 5)
    spawned = await g.js(f"()=>{{const h={M}.RAD.cop;return !!(h&&h.radCop)}}")
    g.check('Vergehen mit forceCop erzeugt Rad-Polizist über den Spielpfad', spawned)
    await g.step(4)
    txt = await bubble_text(g)
    spoke = await g.js(f"()=>{{const h={M}.RAD.cop;return h&&h.radCop?h.radCop.shouts:0}}")
    g.check('Polizist ruft "Kek" (Blase oder shouts > 0)', 'Kek' in txt or spoke > 0, f'{txt!r} shouts={spoke}')
    # Aufgeben per setWanted(0)
    await g.js(f"()=>{{const M={M};if(M.P1.car)M.exitCar(M.P1,true);M.setWanted(0)}}")
    await g.step(0.5)
    g.check('Polizist gibt bei wanted 0 auf (kein radCop mehr)', await g.js(f"()=>!{M}.RAD.cop"))
    # Aufgeben per COP_GIVEUP
    giveup = await g.js(f"()=>{{const M={M};M.setWanted(1);const h=M.radSpawnCop(M.P1);return M.RAD.COP_GIVEUP}}")
    for _ in range(round((giveup - 2) / 0.5)):  # wanted frisch halten, sonst läuft die Fahndung von selbst aus
        await keep_away(g); await g.step(0.5)
    still = await g.js(f"()=>!!({M}.RAD.cop&&{M}.RAD.cop.radCop)")
    g.check(f'Polizist noch aktiv kurz vor COP_GIVEUP ({giveup} s)', still)
    for _ in range(8):
        await keep_away(g); await g.step(0.5)
    g.check('Polizist gibt nach COP_GIVEUP auf (kein radCop mehr)', await g.js(f"()=>!{M}.RAD.cop"))
    await g.js(f"()=>{{const M={M};M.RAD.forceCop=false;M.setWanted(0)}}")

    # 5. mit Schein kein Stern
    await g.js(f"()=>{{const M={M};M.G.fahrradSchein=true;M.RAD.copCD=0}}")
    g.check('Rad für Schein-Fahrt aufgestellt', await g.js(PLACE, 5))
    top, d, star = await ride(g, 10)
    g.check('mit Schein: Rad fährt (> 2 m/s)', top > 2, f'{top:.2f}')
    g.check('mit Schein: kein Stern', star == 0 and await g.js(f"()=>{M}.wanted") == 0, star)
    await g.js(f"()=>{{const M={M};if(M.P1.car)M.exitCar(M.P1,true);M.G.fahrradSchein=false}}")

    # 8. Absteigen bei hohem Tempo wirft nicht um
    g.check('Rad für Absteigen-Test aufgestellt', await g.js(PLACE, 6))
    await g.js(f"()=>{{{M}.G.fahrradSchein=true}}")
    await g.page.keyboard.down('KeyW'); await g.step(7)
    sp = await g.js(f"()=>Math.abs({M}.P1.car.speed)")
    # Gang-Revier am Straßenrand würde den Spieler anschießen – geprüft wird nur der Sturz beim Absteigen
    await g.js(f"()=>{{const M={M},c=M.P1.car;for(const h of [...M.HUMANS])if(h.kind==='gang'&&Math.hypot(h.x-c.x,h.z-c.z)<80)h.remove();}}")
    hp0 = await g.js(f"()=>{M}.P1.h.health")
    await g.js(f"()=>{M}.tryEnterExit({M}.P1)")
    await g.page.keyboard.up('KeyW')
    after = await g.js(f"()=>({{car:!!{M}.P1.car,st:{M}.P1.h.state,hp:{M}.P1.h.health}})")
    g.check('Absteigen bei hohem Tempo (> 7 m/s)', sp > 7, f'{sp:.2f}')
    g.check('Spieler ist abgestiegen', not after['car'], after)
    await g.step(0.5)
    after = await g.js(f"()=>({{st:{M}.P1.h.state,hp:{M}.P1.h.health}})")
    g.check('Absteigen: Spieler nicht in "knock"', after['st'] != 'knock', after)
    g.check('Absteigen: Gesundheit unverändert', after['hp'] == hp0, f"{hp0}->{after['hp']}")
    await g.js(f"()=>{{{M}.G.fahrradSchein=false}}")

    # 7. Speicherstand ohne fahrradSchein-Schlüssel
    await g.js(f"()=>{{{M}.G.fahrradSchein=true}}")
    snap = await g.js(f"()=>{M}.snapshot().fahrradSchein")
    g.check('snapshot enthält fahrradSchein=true', snap is True, snap)
    old = await g.js(f"()=>{{const M={M};const s=JSON.parse(JSON.stringify(M.snapshot()));delete s.fahrradSchein;M.G.fahrradSchein=true;M.applySave(s);return M.G.fahrradSchein}}")
    g.check('alter Speicherstand ohne Schlüssel → fahrradSchein false', old is False, old)
    new = await g.js(f"()=>{{const M={M};const s=JSON.parse(JSON.stringify(M.snapshot()));s.fahrradSchein=true;M.G.fahrradSchein=false;M.applySave(s);return M.G.fahrradSchein}}")
    g.check('Speicherstand mit fahrradSchein=true wird geladen', new is True, new)
    await g.js(f"()=>{{{M}.G.fahrradSchein=false}}")

    # 6. Prüfungsmission
    m = await g.js(f"()=>{{const m={M}.MISSIONS.find(m=>m.id==='fahrradschein');return m?{{free:m.free,reward:m.reward}}:null}}")
    g.check('Mission fahrradschein existiert und ist free', m and m['free'] is True, m)
    await g.js(f"()=>{{const M={M};if(M.P1.car)M.exitCar(M.P1,true);M.setWanted(0)}}")
    await g.js(f"()=>{{const M={M};const m=M.MISSIONS.find(m=>m.id==='fahrradschein');M.P1.h.x=m.start[0];M.P1.h.z=m.start[1];M.startMission(m,M.P1)}}")
    started = await g.js(f"()=>{{const a={M}.activeMission;return !!(a&&a.id==='fahrradschein'&&a.car&&a.pts.length===6)}}")
    g.check('Mission gestartet, Prüfungsrad und Ringe da', started)
    await g.js(f"()=>{{const M={M},a=M.activeMission;M.P1.h.x=a.car.x-1.5;M.P1.h.z=a.car.z;M.enterCar(M.P1,a.car)}}")
    await g.step(0.3)
    st = await g.js(f"()=>({{onBike:{M}.P1.car===({M}.activeMission&&{M}.activeMission.car),stage:{M}.activeMission&&{M}.activeMission.stage}})")
    g.check('auf Prüfungsrad → Stufe 1', st['onBike'] and st['stage'] == 1, st)
    n = await g.js(f"()=>{M}.activeMission.pts.length")
    for i in range(n):
        res = await g.js(f"""()=>{{const M={M},a=M.activeMission;if(!a)return 'ended';const c=a.car;const t=a.target;
            c.x=t[0];c.z=t[1];c.y=M.groundYFn(t[0],t[1],c.y);c.vx=c.vz=0;c.sync();return a.cp}}""")
        await g.step(0.2)
    done = await g.js(f"()=>({{active:!!{M}.activeMission,schein:{M}.G.fahrradSchein,done:!!{M}.G.done.fahrradschein,snap:{M}.snapshot().fahrradSchein}})")
    g.check('Mission nach allen Ringen gewonnen (nicht mehr aktiv, G.done)', not done['active'] and done['done'], done)
    g.check('G.fahrradSchein === true nach Sieg', done['schein'] is True, done)
    g.check('snapshot().fahrradSchein === true nach Sieg', done['snap'] is True, done)
    await g.js(f"()=>{{const M={M};if(M.P1.car)M.exitCar(M.P1,true);M.G.fahrradSchein=false;delete M.G.done.fahrradschein}}")
    await g.step(5)  # missionCool

    # 6b. Fail-Pfad: > 10 s vom Rad weg
    await g.js(f"()=>{{const M={M};const m=M.MISSIONS.find(m=>m.id==='fahrradschein');M.P1.h.x=m.start[0];M.P1.h.z=m.start[1];M.startMission(m,M.P1)}}")
    await g.js(f"()=>{{const M={M},a=M.activeMission;M.P1.h.x=a.car.x-1.5;M.P1.h.z=a.car.z;M.enterCar(M.P1,a.car)}}")
    await g.step(0.3)
    g.check('Fail-Test: auf dem Prüfungsrad', await g.js(f"()=>{{const a={M}.activeMission;return !!a&&{M}.P1.car===a.car&&a.stage===1}}"))
    await g.js(f"()=>{M}.tryEnterExit({M}.P1)")
    await g.step(8)
    g.check('8 s vom Rad weg: Mission läuft noch', await g.js(f"()=>!!{M}.activeMission"))
    await g.step(3)
    failed = await g.js(f"()=>({{active:!!{M}.activeMission,schein:{M}.G.fahrradSchein}})")
    g.check('> 10 s vom Rad weg: Mission gescheitert, kein Schein', not failed['active'] and failed['schein'] is False, failed)


    # Totalschaden: kein Feuerball, Fahrer fliegt ab, Rad bleibt
    r = await g.js(f"""()=>{{const M={M},P=M.P1;if(P.car)M.exitCar(P,true);P.h.health=100;const c=M.RAD.bikes.find(b=>b.persist&&M.CARS.includes(b));if(!c)return null;M.setWanted(0);M.enterCar(P,c);
      if(P.car!==c)return null;c.damage(500,true);for(let i=0;i<120;i++)M.update(1/60);return [!!P.car,c.burn||0,c.dead||false,c.health,P.h.health,M.CARS.includes(c)]}}""")
    g.check('Rad-Totalschaden: abgeworfen, kein Brand, Rad bleibt, Fahrer lebt', r and not r[0] and r[1] == 0 and not r[2] and r[3] > 0 and r[4] > 0 and r[5], r)

run(test)
