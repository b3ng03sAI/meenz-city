# Ablecke-Oma: Zufallsereignis, Verfolgung mit lauten Rufen, Ablecken, Drehen + Abheben, Entkommen, Sperren (Auto/Mission)
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'

# Spieler zu Fuß in Marktnähe stellen (Straßenknoten fern aller Missions-Startpunkte, sonst startet eine Mission von selbst),
# Blick nach Norden, Ereignis zurücksetzen (keine natürliche Auslösung im Test)
RESET = f"""()=>{{const M={M},P=M.P1,O=M.OMA;if(P.car)M.exitCar(P,true);if(O.active&&O.active.h&&!O.active.h.removed)O.active.h.remove();O.active=null;
    if(!window.__omaSpot){{const [mx,mz]=M.POI.markt;let best=null,bd=1e9;for(const n of M.NODES){{const d=Math.hypot(n.x-mx,n.z-mz);
      if(d<bd&&d>20&&M.MISSIONS.every(m=>!m.start||Math.hypot(m.start[0]-n.x,m.start[1]-n.z)>60)&&!M.blockedFn(n.x,n.z)){{bd=d;best=[n.x,n.z];}}}}window.__omaSpot=best;}}
    O.cooldown=1e9;O.rollT=0;M.setWanted(0);P.h.x=window.__omaSpot[0];P.h.z=window.__omaSpot[1];P.h.y=M.groundYFn(P.h.x,P.h.z,0);P.h.health=100;
    P.cam.yaw=0;P.h.facing=0;P.h.vx=P.h.vz=0;return !!P.h}}"""
STATE = f"""()=>{{const M={M},A=M.OMA.active,P=M.P1;if(!A)return null;const h=A.h;
    return {{phase:A.phase,t:A.t,d:Math.hypot(h.x-P.h.x,h.z-P.h.z),y:h.y,gy:M.groundYFn(h.x,h.z,0),removed:!!h.removed,
      bubble:h.bubble?h.bubble.textContent:'',loud:!!(h.bubble&&h.bubble.className.includes('loud')),tongue:!!(h.omaTongue&&h.omaTongue.visible)}}}}"""
HOLD = f"()=>{{const P={M}.P1;P.h.vx=P.h.vz=0;}}"


async def test(g):
    await g.start()
    g.check('Spiel läuft', await g.js(f"()=>{M}.mode") == 'play')
    api = await g.js(f"()=>{{const O={M}.OMA;return {{a:O.active,cd:typeof O.cooldown,n:typeof O.count,f:typeof O.force}}}}")
    g.check('OMA-API: active null, cooldown/count Zahlen, force()', api == {'a': None, 'cd': 'number', 'n': 'number', 'f': 'function'}, api)
    g.check('Spieler am Markt aufgestellt', await g.js(RESET))

    # 1. Sperre im Auto
    r = await g.js(f"""()=>{{const M={M},P=M.P1;const c=new M.Car('kompakt',P.h.x+3,P.h.z,0,{{ctrl:'none'}});c.ai={{mode:'parked'}};M.enterCar(P,c);
        const inCar=P.car===c;const a=M.OMA.force();const res={{inCar,forced:a,active:M.OMA.active}};M.exitCar(P,true);c.remove();return res}}""")
    g.check('im Auto: force() liefert null, keine Oma', r['inCar'] and r['forced'] is None and r['active'] is None, r)
    # natürliche Auslösung im Auto: Chance 1, Abklingzeit 0 → trotzdem nichts
    await g.js(RESET)
    r = await g.js(f"""()=>{{const M={M},P=M.P1,O=M.OMA;const c=new M.Car('kompakt',P.h.x+3,P.h.z,0,{{ctrl:'none'}});c.ai={{mode:'parked'}};M.enterCar(P,c);
        const ch=O.CHANCE,mp=O.MIN_PEDS;O.CHANCE=1;O.MIN_PEDS=0;O.cooldown=0;O.rollT=O.ROLL_EVERY;for(let i=0;i<30;i++)M.update(1/60);
        const res={{inCar:P.car===c,active:!!O.active}};O.CHANCE=ch;O.MIN_PEDS=mp;M.exitCar(P,true);c.remove();return res}}""")
    g.check('im Auto: natürliche Auslösung bleibt aus', r['inCar'] and not r['active'], r)

    # 2. Natürliche Auslösung zu Fuß (Chance 1, Abklingzeit 0)
    await g.js(RESET)
    n0 = await g.js(f"()=>{M}.OMA.count")
    r = await g.js(f"""()=>{{const M={M},O=M.OMA;const ch=O.CHANCE,mp=O.MIN_PEDS;O.CHANCE=1;O.MIN_PEDS=0;O.cooldown=0;O.rollT=O.ROLL_EVERY-0.05;
        for(let i=0;i<10;i++)M.update(1/60);O.CHANCE=ch;O.MIN_PEDS=mp;return {{active:!!O.active,cd:O.cooldown,n:O.count}}}}""")
    g.check('zu Fuß: natürliche Auslösung erzeugt Oma, Abklingzeit gesetzt', r['active'] and r['cd'] > 400 and r['n'] == n0 + 1, r)
    await g.js(RESET)

    # 3. force(): hinter dem Spieler, Verfolgung, laute Rufe, Zunge
    g.check('force() erzeugt Ereignis', await g.js(f"()=>!!{M}.OMA.force()"))
    look = await g.js(f"""()=>{{const M={M},A=M.OMA.active,h=A.h,P=M.P1;const yaw=P.cam.yaw;const fx=Math.sin(yaw),fz=Math.cos(yaw);
        return {{phase:A.phase,d:Math.hypot(h.x-P.h.x,h.z-P.h.z),dot:((h.x-P.h.x)*fx+(h.z-P.h.z)*fz),sex:h.sex,age:h.age,look:!!h.omaLook,inHumans:M.HUMANS.includes(h),
          cd:M.OMA.cooldown}}}}""")
    g.check('Phase chase direkt nach force()', look['phase'] == 'chase', look)
    g.check('Oma erscheint ~25 m entfernt', 15 < look['d'] < 35, look['d'])
    g.check('Oma erscheint hinter dem Spieler (außer Sicht)', look['dot'] < -10, look['dot'])
    g.check('Oma: Frau, Seniorin, eigenes Outfit, in HUMANS', look['sex'] == 'f' and look['age'] == 'senior' and look['look'] and look['inHumans'], look)
    g.check('Abklingzeit nach force() gesetzt', look['cd'] > 400, look['cd'])
    s0 = await g.js(STATE)
    await g.js(HOLD); await g.step(1.5)
    s1 = await g.js(STATE)
    g.check('Spieler steht still → Abstand schrumpft', s1['d'] < s0['d'] - 3, f"{s0['d']:.1f} → {s1['d']:.1f}")
    speed = (s0['d'] - s1['d']) / 1.5
    foot = await g.js(f"()=>{M}.FOOT")
    g.check('Tempo schneller als Gehen, langsamer als Sprinten', foot['walk'] < speed < foot['run'], f"{speed:.2f} m/s (gehen {foot['walk']}, rennen {foot['run']})")
    g.check('laute Sprechblase in Mundart', s1['loud'] and ('disch' in s1['bubble'] or 'Schätzelsche' in s1['bubble'] or 'Oma' in s1['bubble']), s1['bubble'])
    g.check('Zunge sichtbar', s1['tongue'])

    # 4. Erwischt: lick → spin → steigt > 50 m → entfernt
    phases, top, removed = set(), 0.0, False
    for _ in range(80):
        await g.js(HOLD); await g.step(0.25)
        s = await g.js(STATE)
        if s is None:
            removed = True; break
        phases.add(s['phase']); top = max(top, s['y'] - s['gy'])
        if s['phase'] == 'lick' and 'lickHint' not in phases:
            phases.add('lickHint')
            ov = await g.js("()=>{const e=document.getElementById('omaSlobber');return e?e.style.opacity:''}")
            hint = await g.js("()=>document.getElementById('hint').textContent")
            g.check('Ablecken: Schlabber-Overlay sichtbar + Hinweis', ov == '1' and 'schleck' in hint.lower(), f'{ov!r} {hint!r}')
            hp = await g.js(f"()=>{M}.P1.h.health")
            g.check('Ablecken macht keinen Schaden', hp == 100, hp)
    g.check('Phasen lick und spin durchlaufen', {'lick', 'spin'} <= phases, sorted(phases))
    g.check('Oma steigt > 50 m auf', top > 50, f'{top:.1f} m')
    end = await g.js(f"()=>({{a:{M}.OMA.active,end:{M}.OMA.lastEnd,rem:!!{M}.OMA.last.removed,inH:{M}.HUMANS.includes({M}.OMA.last)}})")
    g.check('danach entfernt (active null, nicht mehr in HUMANS)', removed and end['a'] is None and end['rem'] and not end['inH'], end)
    g.check('Ende = flown', end['end'] == 'flown', end['end'])
    await g.step(3)
    ov = await g.js("()=>document.getElementById('omaSlobber').style.opacity")
    g.check('Overlay wieder aus', ov == '0', ov)
    g.check('Abklingzeit läuft (> 0)', await g.js(f"()=>{M}.OMA.cooldown") > 0)

    # 5. Entkommen: Spieler weit weg (> 60 m) für 10 s → gibt auf, geht weg, verschwindet
    await g.js(RESET)
    g.check('force() für Flucht-Test', await g.js(f"()=>!!{M}.OMA.force()"))
    FAR = f"()=>{{const M={M},h=M.OMA.active&&M.OMA.active.h,P=M.P1;if(!h)return;P.h.x=h.x+90;P.h.z=h.z;P.h.y=M.groundYFn(P.h.x,P.h.z,0);P.h.vx=P.h.vz=0}}"
    for _ in range(9):
        await g.js(FAR); await g.step(1)
    s = await g.js(STATE)
    g.check('nach 9 s auf Abstand: noch Verfolgung', s and s['phase'] == 'chase', s and s['phase'])
    for _ in range(2):
        await g.js(FAR); await g.step(1)
    s = await g.js(STATE)
    g.check('nach > 10 s auf Abstand: gibt auf (Phase gone, Ende escaped)', s and s['phase'] == 'gone' and await g.js(f"()=>{M}.OMA.lastEnd") == 'escaped', s)
    g.check('beim Aufgeben eine Zeile gesagt', s and s['bubble'] != '', s and s['bubble'])
    await g.step(7)
    end = await g.js(f"()=>({{a:{M}.OMA.active,rem:!!{M}.OMA.last.removed}})")
    g.check('nach dem Weggehen entfernt', end['a'] is None and end['rem'], end)

    # 6. Zeitlimit: 40 s ohne Erwischen → gibt auf
    await g.js(RESET)
    await g.js(f"()=>!!{M}.OMA.force()")
    KITE = f"()=>{{const M={M},h=M.OMA.active&&M.OMA.active.h,P=M.P1;if(!h)return;P.h.x=h.x+30;P.h.z=h.z;P.h.y=M.groundYFn(P.h.x,P.h.z,0);P.h.vx=P.h.vz=0}}"
    secs = 0
    for secs in range(1, 46):
        await g.js(KITE); await g.step(1)
        if await g.js(f"()=>!{M}.OMA.active||{M}.OMA.active.phase!=='chase'"): break
    s = await g.js(STATE)
    g.check('Zeitlimit ~40 s → gibt auf', s and s['phase'] == 'gone' and 39 <= secs <= 42, f"{secs} s, {s and s['phase']}")
    await g.step(7)

    # 7. Mission: force() gesperrt; laufendes Ereignis bricht bei Missionsstart ab
    await g.js(RESET)
    g.check('force() vor der Mission', await g.js(f"()=>!!{M}.OMA.force()"))
    r = await g.js(f"""()=>{{const M={M};const m=M.MISSIONS.find(m=>m.id==='fahrradschein');M.startMission(m,M.P1);const on=!!M.activeMission;
        for(let i=0;i<5;i++)M.update(1/60);return {{on,active:M.OMA.active,end:M.OMA.lastEnd,rem:!!M.OMA.last.removed}}}}""")
    g.check('Missionsstart beendet laufendes Ereignis', r['on'] and r['active'] is None and r['end'] == 'mission' and r['rem'], r)
    r = await g.js(f"""()=>{{const M={M},O=M.OMA;const a=O.force();const ch=O.CHANCE,mp=O.MIN_PEDS;O.CHANCE=1;O.MIN_PEDS=0;O.cooldown=0;O.rollT=O.ROLL_EVERY;
        for(let i=0;i<30;i++)M.update(1/60);const res={{forced:a,active:!!O.active,mission:!!M.activeMission}};O.CHANCE=ch;O.MIN_PEDS=mp;O.cooldown=1e9;return res}}""")
    g.check('während Mission: force() null, natürliche Auslösung bleibt aus', r['mission'] and r['forced'] is None and not r['active'], r)

run(test)
