# Hauptbahnhof: Bahnsteige, Empfangshalle, Treppe hoch zu Gleis 4/5, Züge fahren ein und halten, Treppe runter
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
PLAT_H = 0.76  # Bahnsteighöhe (PLAT_H in p4q_hbf.js)


async def test(g):
    await g.start()
    await g.js(f"()=>{{const M={M};M.venueNear(0,0);const v=M.VENUES.find(v=>v.id==='hbf');const h=M.P1.h;h.x=v.door[0];h.z=v.door[1];h.y=0}}")
    await g.step(1.5)
    built, plats, sched = await g.js(f"()=>{{const H={M}.HBF;return [H.built,H.plats.map(p=>[p.n,p.p.length,!!p.stair]),H.sched.length]}}")
    g.check('Hbf in der Nähe gebaut', built)
    g.check('5 Bahnsteige, alle mit Treppe', [p[0] for p in plats] == ['1/11', '2/3', '4/5', '6/8', '1'] and all(p[1] > 0 and p[2] for p in plats), plats)
    g.check('Fahrplan hat 6 Einträge', sched == 6, sched)

    await g.key('KeyF', after=1.5)
    r = await g.js(f"()=>{{const h={M}.P1.h;return [h.room&&h.room.name,h.room&&h.room.people.length]}}")
    g.check('Empfangshalle betreten', r[0] == 'Mainz Hauptbahnhof', r[0])
    g.check('Leute in der Halle', (r[1] or 0) >= 10, r[1])

    # Treppe Gleis 4/5 (x=18 in der Unterführung) hochlaufen. Oben angekommen verlässt der Spieler den
    # Innenraum (hbfToPlatform → exitVenue): room=null ist hier also das erwartete Ergebnis.
    await g.js(f"()=>{{const M={M};const r=M.P1.h.room;M.P1.h.x=r.ox+18;M.P1.h.z=r.oz+2.0;M.P1.cam.yaw=0;}}")
    await g.key('KeyW', hold=1.2, after=0.5)
    p = await g.js(f"""()=>{{const M={M};const h=M.P1.h;const s=M.HBF.plats.find(p=>p.n==='4/5').stair;
        return {{in:!!h.room,y:h.y,step:M.stepAt(h.x,h.z),d:Math.hypot(h.x-s[0],h.z-s[1])}}}}""")
    g.check('Treppe hoch: Spieler ist draußen auf dem Bahnsteig', not p['in'], p)
    g.check('Bahnsteig Gleis 4/5 auf Bahnsteighöhe', abs(p['y'] - PLAT_H) < 0.05 and p['step'] == PLAT_H, p['y'])
    g.check('neben dem Treppenaufgang 4/5 (< 8 m)', p['d'] < 8, round(p['d'], 1))
    p0 = await g.js(f"()=>[{M}.P1.h.x,{M}.P1.h.z]")
    await g.key('KeyW', hold=2)
    w = await g.js(f"()=>{{const M={M};const h=M.P1.h;return [h.y,M.stepAt(h.x,h.z),h.x,h.z]}}")
    g.check('Laufen auf dem Bahnsteig bleibt auf Bahnsteighöhe', abs(w[0] - PLAT_H) < 0.05 and w[1] == PLAT_H, w[:2])
    g.check('Spieler ist auf dem Bahnsteig gelaufen', ((w[2] - p0[0]) ** 2 + (w[3] - p0[1]) ** 2) ** 0.5 > 1, w[2:])

    # Fahrplan vorziehen: alle Züge kommen in 19–29 Spielminuten (1 min/s) und spawnen 18 min vorher
    # Gleis 4 gehört der S8 (Paket 30, SBAHN): sie steht dort im Fahrplan, Deko-Züge bekommen die übrigen 5 Gleise
    s8 = await g.js(f"""()=>{{const M={M},S=M.SBAHN;S.fn.station(1,90);const e=M.HBF.sched.filter(q=>q.sbahn);const p=S.fn.pos(S.sMz),st=M.HBF.plats.find(q=>q.n==='4/5').stair;
        return {{e:e.map(q=>q.gleis+' '+q.line),deco:M.HBF.sched.filter(q=>!q.sbahn).map(q=>q.gleis),d:Math.hypot(p[0]-st[0],p[1]-st[1]),st:S.train.state}}}}""")
    g.check('S8 auf Gleis 4 im Fahrplan und am Bahnsteig 4/5', s8['e'] == ['4 S8'] and s8['d'] < 60 and s8['st'] == 'dwell', s8)
    g.check('Deko-Züge nicht auf Gleis 4', '4' not in s8['deco'], s8['deco'])
    await g.js(f"()=>{{const M={M};for(const e of M.HBF.sched)if(!e.sbahn)e.t=M.gameMin+19+Math.random()*10;}}")
    await g.step(22)
    tr = await g.js(f"()=>{M}.HBF.trains.map(t=>({{k:t.k,stage:t.stage,u:t.u,stopU:t.stopU,v:t.v}}))")
    g.check('5 Deko-Züge eingefahren', len(tr) == 5, [t['k'] for t in tr])
    g.check('Züge auf 5 verschiedenen Gleisen, keiner auf Gleis 4', len({t['k'] for t in tr}) == 5 and '4' not in {t['k'] for t in tr})
    g.check('Züge in Einfahrt oder am Halt, nicht über den Halt hinaus',
            all(t['stage'] in ('in', 'dwell') and t['u'] <= t['stopU'] + 0.01 for t in tr),
            [(t['k'], t['stage'], round(t['u']), round(t['stopU'])) for t in tr])
    await g.step(25)
    tr2, n = await g.js(f"()=>[{M}.HBF.trains.map(t=>({{k:t.k,stage:t.stage,u:t.u,stopU:t.stopU}})),{M}.HBF.sched.length]")
    # Haltezeit ist zufällig 18–28 s: ein früh eingefahrener Zug darf schon wieder ausfahren ('out')
    g.check('nach 47 s haben alle 5 Deko-Züge ihren Halt erreicht', len(tr2) == 5 and all(t['stage'] in ('dwell', 'out') and t['u'] >= t['stopU'] - 0.01 for t in tr2),
            [(t['k'], t['stage'], round(t['u'])) for t in tr2])
    g.check('die meisten Züge stehen noch am Bahnsteig', sum(t['stage'] == 'dwell' for t in tr2) >= 4, [t['stage'] for t in tr2])
    g.check('Fahrplan weiter mit 6 Einträgen', n == 6, n)

    # Treppe runter am Bahnsteig 2/3 (F) → zurück in die Unterführung an Treppe x=13
    await g.js(f"()=>{{const M={M};const pl=M.HBF.plats.find(p=>p.n==='2/3');const h=M.P1.h;h.x=pl.stair[0];h.z=pl.stair[1];h.y={PLAT_H}}}")
    await g.step(0.6)
    await g.key('KeyF', after=0.8)
    d = await g.js(f"()=>{{const h={M}.P1.h;return [h.room&&h.room.name,h.room&&h.x-h.room.ox]}}")
    g.check('Treppe runter: in der Unterführung an Treppe 2/3', d[0] == 'Mainz Hauptbahnhof' and d[1] is not None and abs(d[1] - 13) < 0.5, d)

run(test)
