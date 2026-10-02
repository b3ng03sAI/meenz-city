# Hubschrauber fliegen: zwei geparkte Hubschrauber (Flugplatz, Klinik-Dach), Steigen, Vorwärtsflug, Gieren,
# Dachlandung, Autorotation nach dem Absprung, Bruchlandung, Polizeihubschrauber klauen (5 Sterne)
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
H = f'{M}.HUBI'

STATE = f"""()=>{{const c={M}.P1.car;return c&&c.T.hubi?{{x:c.x,y:c.y,z:c.z,h:c.h,alt:c.alt,air:!!c.air,vy:c.vy,pitch:c.pitch,
    rotor:c.rotor,hp:c.health,burn:c.burn,dead:c.dead,hAlt:{H}.alt,hRotor:{H}.rotor}}:null}}"""

# Spieler neben einen Hubschrauber stellen (gleiche Höhe, also auch aufs Dach) und einsteigen
BOARD = f"""(k)=>{{const M={M},P=M.P1,c=M.HUBI.sites[k].car;if(P.car)M.exitCar(P,true);(P.pu=P.pu||{{}}).god=999;
    P.h.x=c.x+Math.cos(c.h)*2.8;P.h.z=c.z-Math.sin(c.h)*2.8;P.h.y=c.y;M.tryEnterExit(P);return P.car===c}}"""

# Flachdach mit 15x15 m gleicher Höhe suchen (nicht der Klinik-Landeplatz)
ROOF = f"""()=>{{const M={M},S=M.HUBI.sites[1];for(const b of M.BUILDINGS){{if(b.roof>=1&&b.roof<=5||b.roof===7)continue;
    if(Math.hypot(b.x-S.x,b.z-S.z)<50)continue;const v=M.gridH(b.x,b.z);if(v<8||v>40)continue;let ok=true;
    for(let a=-7;a<=7&&ok;a++)for(let c=-7;c<=7;c++)if(M.gridH(b.x+a,b.z+c)!==v){{ok=false;break}}if(ok)return [b.x,b.z,v]}}return null}}"""


async def hold(g, code, sec, chunk=0.25, until=None):
    """Hält eine Taste `sec` s Spielzeit; bricht ab, sobald der JS-Ausdruck `until` wahr ist. Liefert die Zustände."""
    seen = []
    await g.page.keyboard.down(code)
    for _ in range(round(sec / chunk)):
        await g.step(chunk)
        s = await g.js(STATE)
        seen.append(s)
        if until and await g.js(until): break
    await g.page.keyboard.up(code)
    return seen


async def test(g):
    await g.start()
    assert await g.js(f"()=>{M}.mode") == 'play'

    # 1. zwei geparkte Hubschrauber an Flugplatz und Klinik-Dach
    info = await g.js(f"""()=>{{const M={M},L={H}.list,S={H}.sites;const [fx,fz]=M.flugP(-150,M.FLUG.side*55);const f=S[0].car,k=S[1].car;
        return {{n:L.length,hubi:L.every(c=>c.T.hubi),parked:L.every(c=>c.ai.mode==='parked'),persist:L.every(c=>c.persist),inCars:L.every(c=>M.CARS.includes(c)),
          fApron:Math.hypot(f.x-fx,f.z-fz),fPoi:Math.hypot(f.x-M.POI.flugplatz[0],f.z-M.POI.flugplatz[1]),
          kPoi:Math.hypot(k.x-M.POI.klinik[0],k.z-M.POI.klinik[1]),kY:k.y,kRoof:M.groundYFn(k.x,k.z,k.y),kGrid:M.gridH(k.x,k.z)}}}}""")
    g.check('>= 2 Hubschrauber gespawnt', info['n'] >= 2, info['n'])
    g.check('alle: T.hubi, geparkt, persist, in CARS', info['hubi'] and info['parked'] and info['persist'] and info['inCars'], info)
    g.check('Hubschrauber 1 auf dem Vorfeld am Flugplatz Großer Sand', info['fApron'] < 3 and info['fPoi'] < 120, info)
    g.check('Hubschrauber 2 auf dem Klinik-Dach (< 260 m von POI.klinik, Dachhöhe > 8 m)',
            info['kPoi'] < 260 and info['kY'] > 8 and abs(info['kRoof'] - info['kY']) < 0.01 and info['kGrid'] == round(info['kY']), info)
    p0 = await g.js(f"()=>{H}.list.map(c=>[c.x,c.y,c.z])")
    await g.step(5)
    p1 = await g.js(f"()=>{H}.list.map(c=>[c.x,c.y,c.z])")
    drift = max(abs(a - b) for u, v in zip(p0, p1) for a, b in zip(u, v))
    g.check('geparkte Hubschrauber bleiben 5 s liegen (auch auf dem Dach)', drift < 0.01, f'{drift:.3f}')

    # 2. Einsteigen auf dem Dach, HUD
    g.check('Einsteigen in den Klinik-Hubschrauber', await g.js(BOARD, 1))
    g.check('HUBI.active ist das Fahrzeug des Spielers', await g.js(f"()=>{H}.active==={M}.P1.car"))
    await g.step(0.2)
    hud = await g.js("()=>{const d=document.getElementById('hubihud');return d?[d.style.display,d.textContent]:null}")
    g.check('Hubschrauber-HUD sichtbar mit Höhe', hud and hud[0] == 'block' and 'Höhe' in hud[1], hud)
    s0 = await g.js(STATE)

    # 3. Kollektiv hoch (Leertaste): > 30 m Höhe in wenigen Sekunden
    seen = await hold(g, 'Space', 8)
    s1 = seen[-1]
    g.check('Rotor läuft hoch (HUBI.rotor > 0.95)', s1['hRotor'] > 0.95, f"{s1['hRotor']:.2f}")
    g.check('Leertaste 8 s: Höhe über Dach > 30 m', s1['alt'] > 30 and s1['air'], f"alt {s1['alt']:.1f}")
    g.check('HUBI.alt entspricht der Flughöhe', abs(s1['hAlt'] - s1['alt']) < 0.01)
    g.check('steigt wirklich (y + 30 m)', s1['y'] - s0['y'] > 30, f"{s1['y'] - s0['y']:.1f}")
    await g.step(1.5)  # Steigrate abbauen (Vertikalbeschleunigung ist begrenzt)
    s1b = await g.js(STATE)
    await g.step(3)
    s2 = await g.js(STATE)
    g.check('ohne Eingabe: Schwebeflug hält die Höhe (±1 m in 3 s)', abs(s2['y'] - s1b['y']) < 1, f"{s2['y'] - s1b['y']:.2f}")

    # 4. Nase runter (W): Vorwärtsflug in Blickrichtung
    seen = await hold(g, 'KeyW', 4)
    s3 = seen[-1]
    import math
    dx, dz = s3['x'] - s2['x'], s3['z'] - s2['z']
    along = dx * math.sin(s2['h']) + dz * math.cos(s2['h'])
    g.check('W 4 s: > 40 m nach vorn', along > 40, f'{along:.1f} m')
    g.check('Nase neigt sich nach vorn (pitch < -0.1)', min(s['pitch'] for s in seen) < -0.1, f"{min(s['pitch'] for s in seen):.2f}")
    g.check('bleibt dabei in der Luft (> 20 m)', s3['air'] and s3['alt'] > 20, f"{s3['alt']:.1f}")
    await g.step(3)

    # 5. Gieren (A)
    h0 = (await g.js(STATE))['h']
    await hold(g, 'KeyA', 1.5)
    h1 = (await g.js(STATE))['h']
    g.check('A 1,5 s: Hubschrauber dreht (> 0.8 rad)', abs(h1 - h0) > 0.8, f'{h1 - h0:.2f}')

    # 6. Dachlandung: über ein anderes Flachdach setzen, mit Shift sinken
    roof = await g.js(ROOF)
    g.check('Flachdach für Landetest gefunden', roof is not None, roof)
    await g.js(f"""(r)=>{{const c={M}.P1.car;c.x=r[0];c.z=r[1];c.y=r[2]+15;c.vx=c.vz=c.vy=0;c.speed=0;c.air=true;c.health=100}}""", roof)
    await g.step(0.5)
    await hold(g, 'ShiftLeft', 10, until=f"()=>!{M}.P1.car.air")
    s4 = await g.js(STATE)
    g.check('mit Shift gelandet (nicht mehr in der Luft)', not s4['air'], s4)
    g.check('steht auf Dachhöhe', abs(s4['y'] - roof[2]) < 0.3, f"y {s4['y']:.2f} / Dach {roof[2]}")
    g.check('sanfte Landung: kein Schaden', s4['hp'] == 100, s4['hp'])
    await g.step(2)
    s5 = await g.js(STATE)
    g.check('bleibt auf dem Dach stehen (2 s später)', abs(s5['y'] - roof[2]) < 0.3 and not s5['air'], s5['y'])

    # 7. Abspringen im Schwebeflug: verlassener Hubschrauber sinkt per Autorotation und landet heil
    await hold(g, 'Space', 3)
    up = await g.js(STATE)
    g.check('wieder abgehoben (> 4 m)', up['air'] and up['alt'] > 4, f"{up['alt']:.1f}")
    left = await g.js(f"()=>{{const M={M},c=M.P1.car;M.tryEnterExit(M.P1);return {{out:!M.P1.car,air:!!c.air,ctrl:c.ctrl}}}}")
    g.check('Absprung in der Luft: Spieler draußen, Hubschrauber fliegt noch', left['out'] and left['air'], left)
    await g.step(8)
    ab = await g.js(f"()=>{{const c={H}.sites[1].car;return {{air:!!c.air,alt:c.alt,hp:c.health,y:c.y,persist:c.persist}}}}")
    g.check('verlassener Hubschrauber landet sanft (Autorotation)', not ab['air'] and ab['hp'] == 100, ab)
    g.check('verlassener Hubschrauber bleibt persistent', ab['persist'], ab)

    # 8. Bruchlandung: aus 30 m mit 25 m/s Sinkrate
    g.check('Einsteigen am Flugplatz', await g.js(BOARD, 0))
    await g.js(f"()=>{{const M={M},c=M.P1.car;c.air=true;c.rotor=1;c.y=M.groundYFn(c.x,c.z)+30;c.vy=-25;c.vx=c.vz=0}}")
    for _ in range(20):
        await g.step(0.25)
        if not await g.js(f"()=>{M}.P1.car&&{M}.P1.car.air"): break
    s6 = await g.js(f"()=>{{const c={H}.sites[0].car;return {{air:!!c.air,hp:c.health,burn:c.burn,dead:c.dead}}}}")
    g.check('harter Aufschlag beschädigt den Hubschrauber (> 30 Schaden)', not s6['air'] and s6['hp'] < 70, s6)
    await g.js(f"()=>{{const M={M};if(M.P1.car)M.exitCar(M.P1,true)}}")
    await g.step(6)

    # 9. Polizeihubschrauber landet bei 4 Sternen und lässt sich klauen → 5 Sterne
    await g.js(f"()=>{{const M={M};M.setWanted(4);(M.P1.pu=M.P1.pu||{{}}).god=999}}")
    await g.step(1)
    g.check('Polizeihubschrauber ist bei 4 Sternen unterwegs', await g.js(f"()=>{H}.copHeli.on"))
    g.check('Landung des Polizeihubschraubers ausgelöst', await g.js(f"()=>{H}.copLand({M}.P1)"))
    AWAY = f"""()=>{{const M={M},E=M.HUBI.cop,P=M.P1;M.setWanted(4);if(!E)return 'none';const h=P.h;h.x=E.x+45;h.z=E.z;h.y=M.groundYFn(h.x,h.z);return E.phase}}"""
    phase = ''
    for _ in range(90):
        phase = await g.js(AWAY)
        if phase == 'ground': break
        await g.step(0.5)
    g.check('Polizeihubschrauber setzt auf (Phase ground, Fahrzeug da)', phase == 'ground' and await g.js(f"()=>!!{H}.cop.car&&{H}.cop.car.hubiCop"), phase)
    stolen = await g.js(f"""()=>{{const M={M},c=M.HUBI.cop.car,P=M.P1;P.h.x=c.x+Math.cos(c.h)*2.8;P.h.z=c.z-Math.sin(c.h)*2.8;P.h.y=c.y;M.tryEnterExit(P);
        return {{inCop:P.car===c,wanted:M.wanted,event:!!M.HUBI.cop,heliOn:M.HUBI.copHeli.on,rotor:c.rotor}}}}""")
    g.check('Polizeihubschrauber geklaut → 5 Sterne', stolen['inCop'] and stolen['wanted'] == 5, stolen)
    g.check('Lande-Ereignis beendet, Original-Hubschrauber weg', not stolen['event'] and not stolen['heliOn'], stolen)
    seen = await hold(g, 'Space', 3)
    g.check('geklauter Polizeihubschrauber hebt sofort ab', seen[-1]['air'] and seen[-1]['alt'] > 10, f"{seen[-1]['alt']:.1f}")
    await g.js(f"()=>{{const M={M},c=M.P1.car;c.air=false;c.y=M.groundYFn(c.x,c.z);M.exitCar(M.P1,true);M.setWanted(0)}}")
    await g.step(2)

    # 10. nicht geklaut: nach COP_WAIT hebt er wieder ab, das Fahrzeug verschwindet
    await g.js(f"()=>{{const M={M};M.setWanted(4)}}")
    await g.step(1)
    g.check('zweite Landung ausgelöst', await g.js(f"()=>{H}.copLand({M}.P1)"))
    for _ in range(90):
        phase = await g.js(AWAY)
        if phase == 'ground': break
        await g.step(0.5)
    car_ok = await g.js(f"()=>{{const c={H}.cop&&{H}.cop.car;window.__hubiCop=c;return !!c}}")
    g.check('zweiter Polizeihubschrauber gelandet', phase == 'ground' and car_ok, phase)
    wait = await g.js(f"()=>{H}.COP_WAIT")
    for _ in range(round((wait + 12) / 0.5)):
        phase = await g.js(AWAY)
        if phase == 'none': break
        await g.step(0.5)
    gone = await g.js(f"()=>{{const c=window.__hubiCop;return {{removed:!!(c&&c.removed),inList:{H}.list.includes(c),event:!!{H}.cop}}}}")
    g.check('nicht geklaut: hebt wieder ab, Fahrzeug entfernt, Ereignis beendet', gone['removed'] and not gone['inList'] and not gone['event'], gone)
    await g.js(f"()=>{M}.setWanted(0)")


run(test)
