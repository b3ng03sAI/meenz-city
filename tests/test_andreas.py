# Andreas: Zufallsereignis „HALT STOPP!! ALLES BLEIBT WIE ES IST!“ – Erscheinen in 20–40 m, Zickzack-Rennen, laute Rufe,
# roter Kopf (eigenes Material), Haltung, Flucht nach Schlag, Verschwinden, Abklingzeit, Sperre bei Mission/Auto
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
AN = f'{M}.ANDREAS'
MAIN = 'HALT STOPP!! ALLES BLEIBT WIE ES IST!'

# Spieler zu Fuß in Marktnähe (Straßenknoten fern aller Missions-Startpunkte), Mittag, Ereignis zurückgesetzt;
# ein laufendes Gespräch (Passant hat den Spieler angesprochen) endet regulär, sobald der Passant > 6 m weg ist
RESET = f"""()=>{{const M={M},P=M.P1,A=M.ANDREAS;if(P.car)M.exitCar(P,true);if(A.active&&!A.active.h.removed)A.active.h.remove();A.active=null;
    if(!window.__anSpot){{const [mx,mz]=M.POI.markt;let best=null,bd=1e9;for(const n of M.NODES){{const d=Math.hypot(n.x-mx,n.z-mz);
      if(d<bd&&d>20&&M.MISSIONS.every(m=>!m.start||Math.hypot(m.start[0]-n.x,m.start[1]-n.z)>60)&&!M.blockedFn(n.x,n.z)){{bd=d;best=[n.x,n.z];}}}}window.__anSpot=best;}}
    A.cooldown=1e9;A.rollT=0;M.setWanted(0);M.gameMin=12*60;P.h.x=window.__anSpot[0];P.h.z=window.__anSpot[1];P.h.y=M.groundYFn(P.h.x,P.h.z,0);P.h.health=100;
    P.cam.yaw=0;P.h.facing=0;P.h.vx=P.h.vz=0;
    if(M.TALK){{M.TALK.npc.x+=50;M.update(1/60);}}return !!P.h&&!M.TALK}}"""
HOLD = f"()=>{{const P={M}.P1;P.h.vx=P.h.vz=0;}}"
SAMPLE = f"""()=>{{const M={M},A=M.ANDREAS.active,P=M.P1;if(!A)return null;const h=A.h,c=h.head.material.color;
    return {{phase:A.phase,heat:A.heat,r:c.r,g:c.g,b:c.b,armR:h.armR.rotation.x,armL:h.armL.rotation.x,x:h.x,z:h.z,
      d:Math.hypot(h.x-P.h.x,h.z-P.h.z),travel:A.travel,bubble:h.bubble?h.bubble.textContent:'',loud:!!(h.bubble&&h.bubble.className.includes('loud')),
      big:!!(h.bubble&&h.bubble.className.includes('andreasRuf'))}}}}"""


async def test(g):
    await g.start()
    g.check('Spiel läuft', await g.js(f"()=>{M}.mode") == 'play')
    api = await g.js(f"()=>{{const A={AN};return {{a:A.active,f:typeof A.force,main:A.MAIN,cd:A.cooldown>0}}}}")
    g.check('ANDREAS-API: active null, force(), Hauptruf exakt, Abklingzeit zu Spielbeginn', api == {'a': None, 'f': 'function', 'main': MAIN, 'cd': True}, api)
    g.check('Spieler am Markt aufgestellt', await g.js(RESET))

    # 1. Im Testmodus erscheint er nie von selbst (Standard-Chance, Abklingzeit 0, viele Würfe)
    r = await g.js(f"""()=>{{const M={M},A=M.ANDREAS;A.cooldown=0;A.rollT=A.ROLL_EVERY;const MP=A.MIN_PEDS;A.MIN_PEDS=0;
        for(let i=0;i<600;i++){{A.rollT=A.ROLL_EVERY;M.update(1/60);}}A.MIN_PEDS=MP;return {{active:!!A.active,n:A.count}}}}""")
    g.check('Testmodus: keine Zufallsauslösung ohne force()', not r['active'] and r['n'] == 0, r)

    # 2. Natürliche Auslösung bei Chance 1 (zu Fuß) setzt Abklingzeit; im Auto bleibt sie aus
    await g.js(RESET)
    r = await g.js(f"""()=>{{const M={M},P=M.P1,A=M.ANDREAS;const c=new M.Car('kompakt',P.h.x+3,P.h.z,0,{{ctrl:'none'}});c.ai={{mode:'parked'}};M.enterCar(P,c);
        const ch=A.CHANCE,mp=A.MIN_PEDS;A.CHANCE=1;A.MIN_PEDS=0;A.cooldown=0;A.rollT=A.ROLL_EVERY;for(let i=0;i<20;i++)M.update(1/60);
        const f=A.force();const res={{inCar:P.car===c,active:!!A.active,forced:f}};A.CHANCE=ch;A.MIN_PEDS=mp;M.exitCar(P,true);c.remove();return res}}""")
    g.check('im Auto: weder Zufall noch force()', r['inCar'] and not r['active'] and r['forced'] is None, r)
    await g.js(RESET)
    r = await g.js(f"""()=>{{const M={M},A=M.ANDREAS;const ch=A.CHANCE,mp=A.MIN_PEDS;A.CHANCE=1;A.MIN_PEDS=0;A.cooldown=0;A.rollT=A.ROLL_EVERY-0.05;
        for(let i=0;i<10;i++)M.update(1/60);A.CHANCE=ch;A.MIN_PEDS=mp;return {{active:!!A.active,cd:A.cooldown,n:A.count}}}}""")
    g.check('zu Fuß: Chance 1 löst aus, Abklingzeit gesetzt', r['active'] and r['cd'] > 500 and r['n'] == 1, r)

    # 3. force(): 20–40 m entfernt, erwachsener Mann, eigene Materialien
    await g.js(RESET)
    g.check('force() erzeugt Ereignis', await g.js(f"()=>!!{AN}.force()"))
    look = await g.js(f"""()=>{{const M={M},A=M.ANDREAS.active,h=A.h,P=M.P1;const mine=new Set(h.andreasMats);let shared=0,others=0;
        for(const o of M.HUMANS){{if(o===h)continue;others++;o.g.traverse(m=>{{if(m.material&&mine.has(m.material))shared++;}});}}
        const skin=h.andreasSkin;return {{d:Math.hypot(h.x-P.h.x,h.z-P.h.z),sex:h.sex,age:h.age,name:h.npcName,inH:M.HUMANS.includes(h),
          headOwn:mine.has(h.head.material),shared,others,cd:M.ANDREAS.cooldown,phase:A.phase,skin:[skin.r,skin.g,skin.b]}}}}""")
    g.check('erscheint 20–40 m vom Spieler', 20 <= look['d'] <= 40, f"{look['d']:.1f} m")
    g.check('erwachsener Mann namens Andreas, in HUMANS', look['sex'] == 'm' and look['age'] == 'adult' and look['name'] == 'Andreas' and look['inH'], look)
    g.check('Kopf hat eigenes Material, mit keiner anderen Figur geteilt', look['headOwn'] and look['shared'] == 0 and look['others'] > 5, look)
    g.check('Abklingzeit nach force() gesetzt', look['cd'] > 500, look['cd'])

    # 4. Bewegung: in 5 s deutlich unterwegs, Zickzack (Richtungswechsel), bleibt beim Spieler
    pts = []
    for _ in range(20):
        await g.js(HOLD); await g.step(0.25)
        s = await g.js(SAMPLE); pts.append(s)
    trav = pts[-1]['travel'] - pts[0]['travel']
    g.check('läuft in 5 s mehr als 10 m (trotz Brüll-Pausen)', trav > 10, f'{trav:.1f} m')
    import math
    heads = [math.atan2(b['x'] - a['x'], b['z'] - a['z']) for a, b in zip(pts, pts[1:]) if math.hypot(b['x'] - a['x'], b['z'] - a['z']) > 0.3]
    turns = sum(1 for a, b in zip(heads, heads[1:]) if abs((b - a + math.pi) % (2 * math.pi) - math.pi) > 0.35)
    g.check('Zickzack: mehrere Richtungswechsel', turns >= 3, f'{turns} Wechsel bei {len(heads)} Abschnitten')

    # 5. Ganzes Ereignis abtasten: Rufe, roter Kopf, Abkühlen, Haltung, Ende
    samples, bubbles, t = list(pts), set(), 5.0
    while t < 70:
        await g.js(HOLD); await g.step(0.2); t += 0.2
        s = await g.js(SAMPLE)
        if s is None: break
        samples.append(s)
        if s['bubble']: bubbles.add((s['bubble'], s['loud'], s['big']))
    texts = {b[0] for b in bubbles}
    g.check('Hauptruf exakt in seiner Sprechblase', MAIN in texts, sorted(texts))
    g.check('Hauptruf als große laute Sprechblase', any(b[0] == MAIN and b[1] and b[2] for b in bubbles), sorted(bubbles))
    g.check('Mundart-Varianten dazwischen', len(texts - {MAIN}) >= 2, sorted(texts))
    peak = max(samples, key=lambda s: s['heat'])
    g.check('Kopf wird beim Brüllen tiefrot (r hoch, g/b niedrig)', peak['r'] > 0.5 and peak['g'] < 0.1 and peak['b'] < 0.1 and peak['heat'] > 0.9,
            f"heat {peak['heat']:.2f} rgb {peak['r']:.2f}/{peak['g']:.2f}/{peak['b']:.2f}")
    i_peak = samples.index(peak)
    cool = min((s['heat'] for s in samples[i_peak:] if s['phase'] == 'run'), default=1)
    g.check('kühlt zwischen den Rufen ab', cool < peak['heat'] - 0.3, f'{peak["heat"]:.2f} → {cool:.2f}')
    phases = {s['phase'] for s in samples}
    g.check('Phasen run, rant, leave durchlaufen', {'run', 'rant', 'leave'} <= phases, sorted(phases))
    g.check('bleibt während des Ereignisses in Spielernähe (< 45 m)', max(s['d'] for s in samples if s['phase'] != 'leave') < 45,
            f"{max(s['d'] for s in samples if s['phase'] != 'leave'):.1f} m")
    arm_r = min(s['armR'] for s in samples)
    g.check('Haltung: rechter Arm nie über Schulterhöhe', arm_r >= -1.0 - 1e-6, f'{arm_r:.2f}')
    g.check('Haltung: nie beide Arme senkrecht', not any(s['armR'] < -2.3 and s['armL'] < -2.3 for s in samples))
    end = await g.js(f"""()=>{{const A={AN},h=A.last;return {{a:A.active,end:A.lastEnd,rem:!!h.removed,inH:{M}.HUMANS.includes(h),cd:A.cooldown}}}}""")
    g.check('Ereignis 25–50 s lang', 25 <= t <= 50, f'{t:.1f} s')
    g.check('verschwindet danach (active null, entfernt, nicht in HUMANS)', end['a'] is None and end['rem'] and not end['inH'] and end['end'] == 'left', end)
    g.check('Abklingzeit läuft weiter', end['cd'] > 0, end['cd'])

    # 6. Pose vor der Haltungs-Sperre: er fordert nie selbst einen zu hohen rechten Arm an
    await g.js(RESET)
    await g.js(f"()=>!!{AN}.force()")
    await g.step(12)
    pr = await g.js(f"()=>{{const A={AN}.active;return A&&{{minR:A.minArmR,both:A.bothUp}}}}")
    g.check('eigene Posen: rechter Arm ≥ −1,0 rad, nie beide oben', pr and pr['minR'] >= -1.0 and not pr['both'], pr)

    # 7. Geschlagen: fällt, steht auf, flieht laut, verschwindet
    await g.js(f"()=>{{const M={M},h={AN}.active.h,P=M.P1;M.knockHuman(h,(h.x-P.h.x)*0.3,(h.z-P.h.z)*0.3,3,10,true)}}")
    ph = None
    for _ in range(30):
        await g.step(0.2)
        s = await g.js(SAMPLE)
        ph = s and s['phase']
        if ph == 'flee': break
    g.check('nach Schlag: Flucht', ph == 'flee', ph)
    s = await g.js(SAMPLE)
    hit_texts = await g.js(f"()=>{AN}.HIT")
    g.check('flieht rufend', s and s['bubble'] in hit_texts and s['loud'], s and s['bubble'])
    d0 = s['d']
    await g.js(HOLD); await g.step(2)
    s2 = await g.js(SAMPLE)
    g.check('rennt vom Spieler weg', s2 and s2['d'] > d0 + 5, f"{d0:.1f} → {s2 and s2['d']:.1f}")
    await g.step(8)
    end = await g.js(f"()=>({{a:{AN}.active,end:{AN}.lastEnd,rem:!!{AN}.last.removed}})")
    g.check('nach der Flucht entfernt, Ende = hit', end['a'] is None and end['rem'] and end['end'] == 'hit', end)

    # 8. Screenshot: Andreas brüllt mit rotem Kopf, Kamera hinter dem Spieler auf ihn gerichtet
    # (Verkehr kann ihn umfahren → dann Flucht und Ende; bis zu 3 Anläufe, bis er brüllt)
    ready = False
    for _ in range(3):
        await g.js(RESET)
        why = await g.js(f"()=>{AN}.canSpawn()")
        g.check('Screenshot: force() möglich', await g.js(f"()=>!!{AN}.force()"), why)
        for _ in range(40):
            await g.step(0.25)
            s = await g.js(SAMPLE)
            if not s or (s['phase'] == 'rant' and s['heat'] > 0.6): break
        if s and s['phase'] == 'rant':
            ready = True; break
    g.check('Screenshot: Andreas brüllt', ready)
    await g.js(f"""()=>{{const M={M},A=M.ANDREAS.active,h=A.h,P=M.P1;A.rantT=5;A.heat=1;
        const a=h.facing;P.h.x=h.x+Math.sin(a)*2.5;P.h.z=h.z+Math.cos(a)*2.5;P.h.y=M.groundYFn(P.h.x,P.h.z,0);
        P.h.facing=P.cam.yaw=Math.atan2(h.x-P.h.x,h.z-P.h.z);P.cam.init=false;
        for(const o of M.HUMANS)if(o.state==='approach'||o.state==='shout')o.state='walk';if(M.TALK){{M.TALK.npc.x+=50;}}}}""")
    await g.step(0.5)
    talk = await g.js(f"()=>!!{M}.TALK")
    print(f'  (Gespräch beim Screenshot: {talk})')
    # Spielfigur ausgeblendet (snap(n, hide)), sonst steht sie zwischen Kamera und Andreas
    import base64
    url = await g.js(f"()=>{M}.snap(4,true)")
    os.makedirs(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out'), exist_ok=True)
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'andreas_ruf.jpg')
    with open(path, 'wb') as f:
        f.write(base64.b64decode(url.split(',', 1)[1]))
    await g.js(f"()=>{{{M}.P1.h.g.visible=true}}")
    print('  Screenshot: ' + path)

    # 9. Missionsstart (zuletzt, die Mission bleibt aktiv) beendet ihn; während der Mission kein force()
    await g.js(RESET)
    g.check('force() vor der Mission', await g.js(f"()=>!!{AN}.force()"))
    r = await g.js(f"""()=>{{const M={M};const m=M.MISSIONS.find(m=>m.id==='fahrradschein');M.startMission(m,M.P1);const on=!!M.activeMission;
        for(let i=0;i<5;i++)M.update(1/60);const f=M.ANDREAS.force();return {{on,active:M.ANDREAS.active,end:M.ANDREAS.lastEnd,rem:!!M.ANDREAS.last.removed,forced:f}}}}""")
    g.check('Mission: Ereignis endet, force() gesperrt', r['on'] and r['active'] is None and r['end'] == 'mission' and r['rem'] and r['forced'] is None, r)

# real=True: echtes three.js, damit Kopffarbe und Armwinkel messbar sind und der Screenshot rendert
run(test, real=True)
