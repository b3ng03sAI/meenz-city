# Nebenjobs: Taxi, Rettungswagen, Feuerwehr – Fahrzeuge, Start per J, Abliefern, Stufen, Zeitlimit, Löschen, Speicherstand
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'

# Spieler neben ein Fahrzeug stellen und einsteigen; liefert true, wenn er drin sitzt
ENTER = f"""(c)=>{{const M={M},P=M.P1;if(P.car)M.exitCar(P,true);P.h.x=c.x+Math.cos(c.h)*2.6;P.h.z=c.z-Math.sin(c.h)*2.6;
    P.h.y=M.groundYFn(P.h.x,P.h.z,0);M.enterCar(P,c);return P.car===c}}"""
# Fahrzeug des aktiven Jobs auf einen Punkt setzen und stillstellen
TELE = f"""([x,z,h])=>{{const M={M},c=M.JOBS.active.car;c.x=x;c.z=z;if(h!==undefined&&h!==null)c.h=h;c.vx=c.vz=c.speed=c.yawRate=0;
    c.y=M.groundYFn(x,z,c.y);c.sync();return true}}"""
ACTIVE = f"()=>{{const A={M}.JOBS.active;return A?{{kind:A.kind,level:A.level,timer:A.timer,streak:A.streak,stage:A.stage,target:A.target,n:A.items.length}}:null}}"
BIG = "()=>document.getElementById('big').textContent"


async def key_j(g):
    await g.key('KeyJ', after=0.1)


async def enter_type(g, key):
    return await g.js(f"(k)=>{{const c={M}.JOBS.vehicles[k];return ({ENTER})(c)}}", key)


async def test(g):
    await g.start()
    J = f'{M}.JOBS'

    # 1. Fahrzeuge
    v = await g.js(f"""()=>{{const M={M},V=M.JOBS.vehicles,P=M.POI,F=M.JOBS.fireStation;const d=(c,p)=>Math.hypot(c.x-p[0],c.z-p[1]);
        return {{rw:V.rettung&&V.rettung.id,amb:!!(V.rettung&&V.rettung.T.ambulance),lf:V.feuer&&V.feuer.id,ft:!!(V.feuer&&V.feuer.T.fireTruck),
          inCars:[V.rettung,V.feuer,V.taxi].every(c=>M.CARS.includes(c)),rwKlinik:d(V.rettung,P.klinik),lfWache:d(V.feuer,[F.x,F.z]),wache:F.name,
          sirens:!!(V.rettung.sirens&&V.feuer.sirens),types:!!(M.Car&&V.rettung.T===V.rettung.T)}}}}""")
    g.check('Rettungswagen gespawnt (CAR_TYPES.rettungswagen, ambulance)', v['rw'] == 'rettungswagen' and v['amb'], v)
    g.check('Löschfahrzeug gespawnt (CAR_TYPES.loeschfahrzeug, fireTruck)', v['lf'] == 'loeschfahrzeug' and v['ft'], v)
    g.check('Job-Fahrzeuge stehen in CARS', v['inCars'])
    g.check('Rettungswagen an der Uniklinik (< 80 m)', v['rwKlinik'] < 80, f"{v['rwKlinik']:.0f} m")
    g.check('Löschfahrzeug an der Feuerwache (< 80 m)', v['lfWache'] < 80, f"{v['lfWache']:.0f} m · {v['wache']}")
    g.check('Blaulicht-Aufbau an beiden Fahrzeugen', v['sirens'])
    near = await g.js(f"()=>{{const M={M};return Object.entries(M.JOBS.vehicles).flatMap(([k,c])=>M.MISSIONS.filter(m=>Math.hypot(m.start[0]-c.x,m.start[1]-c.z)<12).map(m=>k+':'+m.id))}}")
    g.check('kein Job-Fahrzeug steht auf einem Missions-Startpunkt', not near, near)
    await g.step(3)
    g.check('Job-Fahrzeuge bleiben nach 3 s erhalten',
            await g.js(f"()=>{{const V={J}.vehicles;return !V.rettung.removed&&!V.feuer.removed}}"))

    # 2. J zu Fuß / im normalen Auto: kein Job
    await g.js(f"()=>{{const M={M};if(M.P1.car)M.exitCar(M.P1,true)}}")
    await key_j(g)
    g.check('J zu Fuß startet keinen Job', await g.js(ACTIVE) is None)
    ok = await g.js(f"""()=>{{const M={M},P=M.P1;const c=new M.Car('kompakt',P.h.x+4,P.h.z,0,{{ctrl:'none'}});c.persist=true;return ({ENTER})(c)}}""")
    g.check('in normales Auto eingestiegen', ok)
    await key_j(g)
    g.check('J im normalen Auto startet keinen Job', await g.js(ACTIVE) is None)

    # 3. Taxi: Start, Abholen, Abliefern → Geld + Stufe
    g.check('ins Taxi eingestiegen', await enter_type(g, 'taxi'))
    await key_j(g)
    a = await g.js(ACTIVE)
    g.check('J im Taxi startet Taxi-Job (Stufe 1, Ziel, Zeitlimit)',
            a and a['kind'] == 'taxi' and a['level'] == 1 and a['target'] and a['timer'] > 0 and a['stage'] == 'pickup', a)
    g.check('JOBS-Form {active:{kind,level,target,timer,streak}, best:{taxi,rettung,feuer}}',
            await g.js(f"()=>{{const J={J},A=J.active;return ['kind','level','target','timer','streak'].every(k=>k in A)&&['taxi','rettung','feuer'].every(k=>k in J.best)}}"))
    wave = await g.js(f"()=>{{const it={J}.active.items[0];return {{st:it.h.state,mission:it.h.mission,alive:it.h.alive}}}}")
    g.check('Fahrgast winkt am Straßenrand (state jobWave, mission)', wave['st'] == 'jobWave' and wave['mission'], wave)
    money0 = await g.js(f"()=>{M}.G.money")
    await g.js(TELE, await g.js(f"()=>{J}.active.target"))
    await g.step(0.3)
    a = await g.js(ACTIVE)
    g.check('Halt am Fahrgast → Fahrt beginnt (stage ride, neues Zeitlimit)', a['stage'] == 'ride' and a['timer'] > 0, a)
    dest = await g.js(f"()=>{{const d={J}.active.items[0].dest;return {{lab:d.label,t:[d.lx,d.lz]}}}}")
    g.check('Ziel ist eine echte Adresse/Ort (Label gesetzt)', isinstance(dest['lab'], str) and len(dest['lab']) > 3, dest['lab'])
    await g.js(TELE, dest['t'])
    await g.step(0.3)
    a = await g.js(ACTIVE)
    money1 = await g.js(f"()=>{M}.G.money")
    g.check('Abliefern zahlt Fahrpreis', money1 > money0, f'{money0} → {money1}')
    g.check('Abliefern hebt die Stufe (2) und Serie (1)', a and a['level'] == 2 and a['streak'] == 1, a)
    g.check('best.taxi = 1 nach erstem Auftrag', await g.js(f"()=>{J}.best.taxi") == 1)
    g.check('neuer Fahrgast für Stufe 2 wartet', a and a['stage'] == 'pickup' and a['n'] >= 1, a)

    # 4. Zeitlimit beendet die Schicht mit Bilanz
    await g.js(f"()=>{{{J}.active.timer=0.05}}")
    await g.step(0.2)
    last = await g.js(f"()=>{J}.last")
    g.check('Zeit abgelaufen → Job beendet', await g.js(ACTIVE) is None and last['reason'] == 'timeout', last)
    big = await g.js(BIG)
    g.check('Bilanz-Banner zeigt Grund und Stufe', 'ZEIT' in big and 'Stufe' in big, big)
    g.check('Fahrgäste nach Ende wieder normale Passanten (mission=false)',
            await g.js(f"()=>{M}.HUMANS.every(h=>!(h.state==='jobWave'||h.state==='jobHurt'))"))

    # 5. J beendet freiwillig; Aussteigen > 15 s beendet ebenfalls
    await key_j(g)
    g.check('J startet erneut', (await g.js(ACTIVE) or {}).get('kind') == 'taxi')
    await key_j(g)
    g.check('J im laufenden Job → Feierabend', await g.js(ACTIVE) is None and (await g.js(f"()=>{J}.last.reason")) == 'quit')
    await key_j(g)
    await g.js(f"()=>{M}.exitCar({M}.P1,true)")
    await g.step(10)
    g.check('10 s ausgestiegen: Job läuft noch', await g.js(ACTIVE) is not None, await g.js(f"()=>{J}.last"))
    await g.step(6)
    g.check('> 15 s ausgestiegen: Job beendet (left)', await g.js(ACTIVE) is None and (await g.js(f"()=>{J}.last.reason")) == 'left')

    # 6. Rettungswagen: Patient abholen, Uniklinik, Sirene
    g.check('in den Rettungswagen eingestiegen', await enter_type(g, 'rettung'))
    await key_j(g)
    a = await g.js(ACTIVE)
    g.check('J im Rettungswagen startet Rettungs-Job', a and a['kind'] == 'rettung' and a['stage'] == 'pickup', a)
    await g.step(0.1)
    g.check('Sirene an während des Einsatzes', await g.js(f"()=>{J}.active.car.sirenOn===true"))
    lying = await g.js(f"()=>{J}.active.items.every(it=>it.h.state==='jobHurt'&&it.h.mission)")
    g.check('Verletzte liegen am Boden (jobHurt)', lying)
    n = await g.js(f"()=>{J}.active.items.length")
    for i in range(n):
        await g.js(TELE, await g.js(f"()=>{J}.active.target"))
        await g.step(0.3)
    a = await g.js(ACTIVE)
    g.check('alle Patienten an Bord → Ziel Uniklinik', a['stage'] == 'klinik', a)
    kl = await g.js(f"()=>{{const t={J}.active.target,P={M}.POI.klinik;return Math.hypot(t[0]-P[0],t[1]-P[1])}}")
    g.check('Ziel liegt an der Uniklinik (< 80 m vom POI)', kl < 80, f'{kl:.0f} m')
    money0 = await g.js(f"()=>{M}.G.money")
    await g.js(TELE, await g.js(f"()=>{J}.active.target"))
    await g.step(0.3)
    a = await g.js(ACTIVE)
    g.check('Ablieferung an der Klinik zahlt und hebt Stufe', a and a['level'] == 2 and await g.js(f"()=>{M}.G.money") > money0, a)
    g.check('best.rettung = 1', await g.js(f"()=>{J}.best.rettung") == 1)
    await key_j(g)
    await g.step(0.1)
    g.check('Sirene nach Feierabend aus', await g.js(f"()=>{J}.vehicles.rettung.sirenOn===false"))

    # 7. Löschfahrzeug: Brand löschen durch Spritzen (Feuerknopf halten)
    g.check('ins Löschfahrzeug eingestiegen', await enter_type(g, 'feuer'))
    await key_j(g)
    a = await g.js(ACTIVE)
    g.check('J im Löschfahrzeug startet Feuer-Job', a and a['kind'] == 'feuer' and a['stage'] == 'fire', a)
    await g.js(f"()=>{{window.__jobFires={J}.active.items.map(it=>it.fire)}}")
    nf = await g.js(f"()=>{J}.active.items.filter(it=>it.fire&&it.fire.job&&!it.fire.out).length")
    g.check('Brandherd(e) brennen', nf >= 1, nf)
    # Fahrzeug 14 m vor den Brand stellen, Front und Blick auf den Brand
    await g.js(f"""()=>{{const M={M},A=M.JOBS.active,c=A.car;const f=A.items[0].fire;const t=A.target;let dx=t[0]-f.x,dz=t[1]-f.z;const L=Math.hypot(dx,dz)||1;
        const k=Math.min(1,14/L);const x=f.x+dx*k,z=f.z+dz*k;const h=Math.atan2(f.x-x,f.z-z);c.x=x;c.z=z;c.h=h;c.vx=c.vz=c.speed=c.yawRate=0;c.sync();
        M.P1.cam.yaw=h;M.P1.cam.lastLook=1e9;}}""")
    await g.step(2)
    g.check('ohne Spritzen bleibt der Brand an', await g.js(f"()=>{J}.active.items.every(it=>!it.fire.out)"))
    down = "()=>{const c=[...document.querySelectorAll('canvas')].sort((a,b)=>b.width*b.height-a.width*a.height)[0];c.dispatchEvent(new MouseEvent('mousedown',{button:0,bubbles:true}));}"
    up = "()=>dispatchEvent(new MouseEvent('mouseup',{button:0}))"
    money0 = await g.js(f"()=>{M}.G.money")
    await g.js(down)
    for _ in range(16):
        await g.js(f"()=>{{const M={M},A=M.JOBS.active;if(A){{const f=A.items.find(it=>!it.fire.out);if(f){{const c=A.car;M.P1.cam.yaw=Math.atan2(f.fire.x-c.x,f.fire.z-c.z)}}}}}}")
        await g.step(0.5)
        if (await g.js(f"()=>{J}.active&&{J}.active.level")) == 2: break
    await g.js(up)
    a = await g.js(ACTIVE)
    g.check('Spritzen löscht den Brand → Stufe 2', a and a['level'] == 2, a)
    g.check('Löschen zahlt', await g.js(f"()=>{M}.G.money") > money0)
    g.check('best.feuer = 1', await g.js(f"()=>{J}.best.feuer") == 1)
    await key_j(g)
    await g.step(2)
    g.check('gelöschte Brände sind aus (out, ausgebrannt)', await g.js("()=>__jobFires.every(f=>f.out&&f.t<=0)"))

    # 8. Speicherstand
    snap = await g.js(f"()=>{M}.snapshot().jobsBest")
    g.check('snapshot enthält jobsBest mit den Rekorden', snap == {'taxi': 1, 'rettung': 1, 'feuer': 1}, snap)
    old = await g.js(f"()=>{{const M={M};const s=JSON.parse(JSON.stringify(M.snapshot()));delete s.jobsBest;M.applySave(s);return M.JOBS.best}}")
    g.check('alter Speicherstand ohne jobsBest lädt (Rekorde 0)', old == {'taxi': 0, 'rettung': 0, 'feuer': 0}, old)
    new = await g.js(f"()=>{{const M={M};const s=JSON.parse(JSON.stringify(M.snapshot()));s.jobsBest={{taxi:4,rettung:2,feuer:3}};M.applySave(s);return M.JOBS.best}}")
    g.check('Speicherstand mit jobsBest wird geladen', new == {'taxi': 4, 'rettung': 2, 'feuer': 3}, new)

    # 9. Fahrzeug Schrott beendet die Schicht
    g.check('wieder ins Taxi', await enter_type(g, 'taxi'))
    await key_j(g)
    await g.js(f"()=>{{{J}.active.car.dead=true}}")
    await g.step(0.1)
    g.check('Fahrzeug zerstört → Job beendet (wrecked)', await g.js(ACTIVE) is None and (await g.js(f"()=>{J}.last.reason")) == 'wrecked')


run(test)
