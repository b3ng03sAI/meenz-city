# Johannisnacht: Gautschen – Fest am Gutenbergplatz (Bütte, Bühne, Stände, Publikum), Lehrlinge fangen (E) und eintunken,
# Zeit um → Ergebnis + Geld + Gautschbrief, Jubel ohne senkrechte Arme, Abbau räumt alle Figuren weg, Mission + Startmarker
import math, os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
GA = f'{M}.GAUTSCH'
DENKMAL = (-172.2, -5.2)   # OSM.pl.gutdenk

# Spieler neben den nächsten fliehenden Lehrling stellen (Blick zu ihm); liefert dessen Namen
NEXT_TO_APPRENTICE = f"""()=>{{const M={M},A=M.GAUTSCH,P=M.P1.h;const h=A.apprentices.find(o=>o.alive&&!o.removed&&o.ga.act==='flee');if(!h)return null;
    P.x=h.x+1.2;P.z=h.z;P.y=M.groundYFn(P.x,P.z,0);P.facing=-Math.PI/2;return h.npcName}}"""
NEXT_TO_TUB = f"()=>{{const M={M},T=M.GAUTSCH.tub,P=M.P1.h;P.x=T.x+2.6;P.z=T.z;P.y=M.groundYFn(P.x,P.z,0)}}"
CARRY = f"()=>{{const C={GA}.carry;return C?{{who:C.h.npcName,act:C.h.ga.act}}:null}}"
# Höhe der Hand über der Schulter in Grad (Arm hängt an -y; Euler XYZ: erst z, dann x): asin(-cos z · cos x)
ARM_ELEV = """(a)=>Math.asin(Math.max(-1,Math.min(1,-Math.cos(a.rotation.z)*Math.cos(a.rotation.x))))*180/Math.PI"""
MAX_ELEV = f"""()=>{{const A={GA},e={ARM_ELEV};let m=-90;for(const h of [...A.crowd,...A.apprentices,...(A.meister?[A.meister]:[])]){{if(h.removed)continue;
    m=Math.max(m,e(h.armL),e(h.armR));}}return m}}"""


async def catch_and_dunk(g):
    """Fängt den nächsten Lehrling per echter E-Taste und tunkt ihn an der Bütt ein."""
    name = await g.js(NEXT_TO_APPRENTICE)
    await g.key('KeyE', after=0)
    carry = await g.js(CARRY)
    await g.step(0.5)  # tragen
    carried_y = await g.js(f"()=>{{const C={GA}.carry;return C?C.h.y-{M}.P1.h.y:null}}")
    await g.js(NEXT_TO_TUB)
    await g.key('KeyE', after=0)
    flying = await g.js(f"()=>{GA}.apprentices.some(h=>h.ga.act==='fly')")
    await g.step(1.0)
    return name, carry, carried_y, flying


async def test(g):
    await g.start()
    gm0 = await g.js(f"()=>{M}.gameMin")
    g.check('Spielstart außerhalb des Festfensters (20:00–23:30) → Fest aus', not await g.js(f"()=>{GA}.on"), gm0)

    # 1. Aufstellung: Bütte, Bühne, Stände am Gutenbergplatz
    lay = await g.js(f"""()=>{{const A={GA};return {{tub:A.tub,stage:A.stage,stands:A.stands.map(s=>({{x:s.x,z:s.z,name:s.name}})),
        m:A.N,keys:['on','stands','apprentices','dunked','timer','score'].every(k=>k in A)}}}}""")
    g.check('GAUTSCH hat {on, stands, apprentices, dunked, timer, score}', lay['keys'])
    t = lay['tub']
    dt = math.hypot(t['x'] - DENKMAL[0], t['z'] - DENKMAL[1])
    g.check('Bütte nahe dem Gutenberg-Denkmal (< 25 m)', dt < 25, f'{dt:.1f} m')
    g.check('Bühne direkt an der Bütte (< 7 m)', math.hypot(lay['stage']['x'] - t['x'], lay['stage']['z'] - t['z']) < 7, lay['stage'])
    n = len(lay['stands'])
    g.check('4–6 Festtände', 4 <= n <= 6, n)
    far = max(math.hypot(s['x'] - t['x'], s['z'] - t['z']) for s in lay['stands'])
    g.check('alle Stände am Platz (< 30 m von der Bütte)', far < 30, f'{far:.1f} m')
    g.check('Stände mit eigenen Namen, keine doppelt', len({s['name'] for s in lay['stands']}) == n, [s['name'] for s in lay['stands']])
    m = await g.js(f"()=>{{const m={M}.MISSIONS.find(m=>m.id==='gautschen');return m?{{free:m.free,start:m.start}}:null}}")
    g.check('Mission gautschen existiert und ist free', m and m['free'] is True, m)
    g.check('Startmarker nahe der Bütte (< 20 m)', m and math.hypot(m['start'][0] - t['x'], m['start'][1] - t['z']) < 20, m and m['start'])

    # 2. Fest per Mission/Startmarker starten
    money0 = await g.js(f"()=>{M}.G.money")
    await g.js(f"()=>{{const M={M},m=M.MISSIONS.find(m=>m.id==='gautschen');M.P1.h.x=m.start[0];M.P1.h.z=m.start[1];M.P1.h.y=M.groundYFn(m.start[0],m.start[1],0)}}")
    await g.step(0.3)
    st = await g.js(f"""()=>{{const A={GA},a={M}.activeMission;return {{mission:a&&a.id,on:A.on,running:A.running,timer:A.timer,n:A.apprentices.length,crowd:A.crowd.length,
        vendors:A.vendors.length,meister:!!A.meister,grp:!!A.grp&&A.grp.visible,inHumans:[...A.apprentices,...A.crowd].every(h=>{M}.HUMANS.includes(h))}}}}""")
    g.check('Startmarker betreten startet die Mission', st['mission'] == 'gautschen', st)
    g.check('Fest an, Runde läuft, Bauten sichtbar', st['on'] and st['running'] and st['grp'], st)
    g.check('Lehrlinge (5), Publikum (≥ 6), Standleute (je Stand) und Gautschmeister da',
            st['n'] == 5 and st['crowd'] >= 6 and st['vendors'] == n and st['meister'], st)
    g.check('alle Festfiguren sind echte Human-Objekte in HUMANS', st['inHumans'])
    timer0 = st['timer']
    await g.step(2)
    timer1 = await g.js(f"()=>{GA}.timer")
    g.check('Timer läuft herunter', 1.5 < timer0 - timer1 < 2.5, f'{timer0:.1f} → {timer1:.1f}')

    # 3. Lehrlinge fliehen vor dem Spieler
    flee = await g.js(f"""()=>{{const M={M},A=M.GAUTSCH,P=M.P1.h;const h=A.apprentices.find(o=>o.ga.act==='flee');P.x=h.x+4;P.z=h.z;P.y=M.groundYFn(P.x,P.z,0);
        return {{x:h.x,z:h.z,px:P.x,pz:P.z}}}}""")
    await g.step(1.0)
    d1 = await g.js(f"""(f)=>{{const h={GA}.apprentices.find(o=>o.ga.act==='flee'||o.ga.act==='idle');return Math.hypot(h.x-f.px,h.z-f.pz)}}""", flee)
    g.check('Lehrling flieht (Abstand zum Spieler wächst)', d1 > 4.5, f'{d1:.1f} m')
    far_e = await g.js(f"""()=>{{const M={M},A=M.GAUTSCH,P=M.P1.h;const h=A.apprentices[0];P.x=h.x+6;P.z=h.z;return A.wantsE(M.P1)}}""")
    g.check('E greift nicht, wenn kein Lehrling in Reichweite', far_e is False)

    # 4. Fangen (E nahe Lehrling) und Eintunken
    name, carry, cy, flying = await catch_and_dunk(g)
    g.check('E nahe Lehrling: Lehrling wird getragen', carry and carry['who'] == name and carry['act'] == 'carried', (name, carry))
    g.check('getragener Lehrling liegt über den Schultern (1.3–2.0 m über dem Spieler)', cy is not None and 1.3 < cy < 2.0, cy)
    g.check('E an der Bütt: Lehrling fliegt hinein', flying)
    st = await g.js(f"()=>{{const A={GA};return {{d:A.dunked,s:A.score,c:!!A.carry,cheer:A.cheerT}}}}")
    g.check('Eintunken erhöht dunked auf 1 und gibt Punkte', st['d'] == 1 and st['s'] > 0 and not st['c'], st)
    g.check('Publikum jubelt nach dem Eintunken', st['cheer'] > 0, st)
    worst = -90
    for _ in range(6):
        await g.step(0.25)
        worst = max(worst, await g.js(MAX_ELEV))
    g.check('Jubel ohne senkrechte Arme: Hand höchstens 45° über der Waagerechten', worst <= 45, f'max {worst:.1f}°')
    g.check('beim Jubeln heben die Arme sich überhaupt (> 10°)', worst > 10, f'{worst:.1f}°')
    # Bild der Szene mitten im Jubel: Blickrichtung zur Bütt, bei der zwischen Spieler und Kamera kein Stand steht
    await g.js(f"""()=>{{const M={M},A=M.GAUTSCH,T=A.tub,P=M.P1;let best=null;
        for(let k=0;k<32;k++){{const a=k/32*Math.PI*2,sx=Math.sin(a),sz=Math.cos(a);let clear=99;
          for(let r=5;r<=17;r+=1){{const x=T.x+sx*r,z=T.z+sz*r;if(M.blockedFn(x,z,1))clear=Math.min(clear,0);for(const s of A.stands)clear=Math.min(clear,Math.hypot(s.x-x,s.z-z));}}
          if(!best||clear>best.c)best={{a,c:clear}};}}
        P.h.x=T.x+Math.sin(best.a)*8;P.h.z=T.z+Math.cos(best.a)*8;P.h.y=M.groundYFn(P.h.x,P.h.z,0);
        P.cam.yaw=best.a+Math.PI;P.h.facing=P.cam.yaw;P.cam.init=false;A.cheerT=3}}""")
    await g.step(0.4)
    print('  Screenshot: ' + await g.snap('gautsch_jubel', 4))
    bub = await g.js(f"()=>{GA}.crowd.filter(h=>h.bubble&&h.bubbleT>0).map(h=>h.bubble.textContent)")
    g.check('Mundart-Rufe aus dem Publikum', len(bub) > 0, bub[:3])
    await g.step(1.5)
    wet = await g.js(f"()=>{GA}.apprentices.filter(h=>h.ga.act==='wet').length")
    g.check('Gegautschter Lehrling steigt aus der Bütt (act wet)', wet == 1, wet)
    g.check('Getaufte Lehrlinge lassen sich nicht nochmal fangen', await g.js(f"""()=>{{const M={M},A=M.GAUTSCH,P=M.P1.h;const h=A.apprentices.find(o=>o.ga.act==='wet');
        P.x=h.x+1;P.z=h.z;return !A.wantsE(M.P1)}}"""))

    # zweiter Lehrling
    await catch_and_dunk(g)
    g.check('zweites Eintunken → dunked 2', await g.js(f"()=>{GA}.dunked") == 2)

    # 5. Zeit läuft ab → Ergebnis, Geld, Gautschbrief, Mission gewonnen
    left = await g.js(f"()=>{GA}.timer")
    for _ in range(int(left) + 2):
        await g.step(1)
    res = await g.js(f"""()=>{{const A={GA},M={M};return {{r:A.result,running:A.running,timer:A.timer,money:M.G.money,briefe:M.G.gautschBriefe,
        mission:!!M.activeMission,done:!!M.G.done.gautschen,brief:!!A.brief&&!A.brief.hidden&&A.brief.textContent}}}}""")
    r = res['r'] or {}
    g.check('Zeit um: Runde beendet, Timer 0', not res['running'] and res['timer'] == 0, res)
    g.check('Ergebnis: 2/5 gegautscht, Gautschbrief', r.get('dunked') == 2 and r.get('total') == 5 and r.get('brief') is True, r)
    g.check('Gautschbrief eingeblendet', res['brief'] and 'GAUTSCHBRIEF' in res['brief'], res['brief'] and res['brief'][:80])
    g.check('G.gautschBriefe zählt hoch', res['briefe'] == 1, res['briefe'])
    gained = res['money'] - money0
    g.check('Geld: Gautschgeld + Missionsbelohnung (100)', r.get('money', 0) > 0 and gained == r['money'] + 100, f"+{gained} (Gautschgeld {r.get('money')})")
    g.check('Mission gewonnen (beendet, G.done.gautschen)', not res['mission'] and res['done'], res)

    # 6. Fest endet außerhalb des Fensters und räumt alle Figuren weg
    ids = await g.js(f"()=>{{const A={GA};window.__gau=[...A.apprentices,...A.crowd,...A.vendors,A.meister];return window.__gau.length}}")
    await g.step(1)
    g.check('kurz nach der Runde steht das Fest noch (Nachlauf)', await g.js(f"()=>{GA}.on"))
    await g.step(30)
    end = await g.js(f"""()=>{{const A={GA},M={M};return {{on:A.on,lists:A.apprentices.length+A.crowd.length+A.vendors.length,meister:!!A.meister,
        removed:window.__gau.every(h=>h.removed&&!M.HUMANS.includes(h)),grp:A.grp.visible,hud:!A.hud||A.hud.hidden}}}}""")
    g.check(f'Fest beendet, alle {ids} Figuren entfernt, Bauten unsichtbar, HUD aus',
            not end['on'] and end['lists'] == 0 and not end['meister'] and end['removed'] and not end['grp'] and end['hud'], end)

    # 7. Abends startet das Fest von selbst, Runde beginnt beim Hingehen; Abbruch bei Wegfahren ohne Auszahlung
    await g.js(f"()=>{{const M={M};M.gameMin=20*60+30;const T=M.GAUTSCH.tub,P=M.P1.h;P.x=T.x+40;P.z=T.z;P.y=M.groundYFn(P.x,P.z,0)}}")
    await g.step(0.5)
    ev = await g.js(f"()=>{{const A={GA};return {{on:A.on,running:A.running}}}}")
    g.check('20:30 und in der Nähe: Fest an, Runde wartet', ev['on'] and not ev['running'], ev)
    await g.js(f"()=>{{const M={M},T=M.GAUTSCH.tub,P=M.P1.h;P.x=T.x+8;P.z=T.z;P.y=M.groundYFn(P.x,P.z,0)}}")
    await g.step(0.5)
    g.check('Hingehen startet die Runde', await g.js(f"()=>{GA}.running"))
    money1 = await g.js(f"()=>{M}.G.money")
    await g.js(f"()=>{{const M={M},T=M.GAUTSCH.tub,P=M.P1.h;P.x=T.x+700;P.z=T.z}}")
    await g.step(0.5)
    ab = await g.js(f"()=>{{const A={GA};return {{on:A.on,r:A.result,n:A.apprentices.length+A.crowd.length}}}}")
    g.check('weit weg: Fest abgebaut, Runde abgebrochen, keine Auszahlung',
            not ab['on'] and ab['r'] and ab['r']['aborted'] and ab['n'] == 0 and await g.js(f"()=>{M}.G.money") == money1, ab)
    await g.js(f"()=>{{{M}.gameMin=17*60}}")


# real=True: echtes three.js, damit die Armwinkel messbar sind und der Screenshot rendert
run(test, real=True)
