# Straßenbahn: Linien aus den Gleisen, Fahrplan-Halte, Ein-/Aussteigen, Fahrschein, Kontrolleur (zahlen / abhauen)
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
S = '__MEENZ.STRABA'

# Bahn i auf Route 0 an Halt k stellen (Türen offen, Abfahrt in 4 s). k wird so gewählt, dass der nächste Abschnitt kurz und frei ist.
PREP = f"""(i)=>{{const S={S},t=S.trams[i],R=t.line.routes[0],now=S.fn.now();
  let k=-1;for(let j=1;j<R.stops.length-2;j++){{const a=R.stops[j],b=R.stops[j+1];if(b.s-a.s<200||b.s-a.s>650)continue;
    if(S.trams.some(o=>o!==t&&Math.hypot(o.x-a.x,o.z-a.z)<900))continue;k=j;break;}}
  if(k<0)return null;t.ri=0;t.k=k;t.s=R.stops[k].s;t.state='dwell';t.v=0;t.doors=1;t.dwellT=0;t.cycle0=now-R.dep[k];t.depT=now+4;
  return {{k,next:k+1,name:R.stops[k].name}}}}"""
STATE = f"(i)=>{{const t={S}.trams[i];return {{st:t.state,k:t.k,ri:t.ri,doors:t.doors,s:t.s,x:t.x,z:t.z,v:t.v}}}}"
# Spieler an die nächstgelegene Tür auf der Bahnsteigseite stellen
AT_DOOR = f"""(i)=>{{const M={M},S=M.STRABA,t=S.trams[i],P=M.P1;if(P.car)M.exitCar(P,true);const st=t.line.routes[t.ri].stops[t.k];
  const ds=S.fn.doors(t).filter(d=>d[2]===st.side);const d=ds[0];P.h.x=d[0];P.h.z=d[1];P.h.y=M.groundYFn(d[0],d[1],0);P.h.room=null;return true}}"""
RIDE = f"()=>{{const R={S}.riding;return R?{{tram:{S}.trams.indexOf(R.tram),line:R.line.no,ticket:R.hasTicket}}:null}}"


async def wait_dwell(g, i, k, maxs=150):
    """Lässt Zeit laufen, bis Bahn i an Halt k steht und die Türen offen sind; liefert die verstrichene Zeit oder None."""
    t = 0.0
    while t < maxs:
        await g.step(1); t += 1
        st = await g.js(STATE, i)
        if st['st'] == 'dwell' and st['k'] == k and st['ri'] == 0 and st['doors'] > 0.6: return t
    return None


async def board(g, i, ticket, control):
    prep = await g.js(PREP, i)
    g.check(f'Bahn {i} an einen Halt mit kurzem Folgeabschnitt gestellt', prep is not None, prep)
    await g.js(f"([v,c])=>{{const S={S};S.ticket.validUntil=v?S.fn.now()+100:-1;S.forceControl=c;S.CONTROL_CHANCE=0;S.control=null;S.lastControl=null}}", [ticket, control])
    await g.step(0.3)
    await g.js(AT_DOOR, i)
    await g.step(0.1)   # ein laufendes Gespräch endet, sobald der Spieler > 6 m weg ist
    await g.key('KeyF')
    return prep


async def test(g):
    await g.start()
    # Revier (Paket aus Welle 1) zahlt periodisch Geld aus und startet Bandenkriege – beides verfälscht Geld/Gesundheit hier
    await g.js(f"()=>{{const R={M}.REVIER;if(R){{R.incomeT=R.attackT=1e9;if(R.war&&R.endWar)R.endWar(false);}}}}")
    await g.js(f"()=>{{const M={M};M.setWanted(0);M.G.money=500}}")

    # 1. Linien aus den Gleisen
    info = await g.js(f"""()=>{{const S={S};return {{n:S.lines.length,stops:S.lines.map(L=>L.stops.length),names:S.lines.map(L=>L.name),trams:S.trams.length,
        maxRail:Math.max(...S.lines.flatMap(L=>L.routes.flatMap(R=>R.pts.filter((p,i)=>i%7===0).map(p=>S.fn.railDist(p[0],p[1]))))),
        stopRail:Math.max(...S.lines.flatMap(L=>L.routes.flatMap(R=>R.stops.map(s=>S.fn.railDist(s.x,s.z))))),
        lerch:S.lines.some(L=>/Lerchenberg/.test(L.via))}}}}""")
    g.check('mindestens eine Linie', info['n'] >= 1, info['names'])
    g.check('eine Linie hat >= 4 Halte', max(info['stops'] or [0]) >= 4, info['stops'])
    g.check('Linienverlauf liegt auf r.tram-Gleisen (< 0,5 m)', info['maxRail'] < 0.5, round(info['maxRail'], 3))
    g.check('Halte liegen auf dem Gleis', info['stopRail'] < 0.5, round(info['stopRail'], 3))
    g.check('2–4 Bahnen unterwegs', 2 <= info['trams'] <= 4, info['trams'])
    g.check('Strecke Richtung Lerchenberg vorhanden', info['lerch'], info['names'])

    # 2. Bahnen fahren auf den Gleisen und halten an Haltestellen
    prep = await g.js(PREP, 0)
    g.check('Bahn 0 an einen Halt gestellt', prep is not None, prep)
    await g.step(0.1)
    p0 = await g.js(STATE, 0)
    await g.step(14)
    p1 = await g.js(STATE, 0)
    moved = ((p1['x'] - p0['x']) ** 2 + (p1['z'] - p0['z']) ** 2) ** 0.5
    g.check('Bahn fährt nach der Abfahrt los (> 15 m in 14 s)', p1['st'] == 'run' and moved > 15, f"{p1['st']} {moved:.1f} m")
    off = await g.js(f"()=>{{const S={S},t=S.trams[0];return Math.max(...t.secs.map(sc=>S.fn.railDist(sc.x,sc.z)))}}")
    g.check('alle Wagenkästen fahren auf den Schienen (< 0,6 m)', off < 0.6, round(off, 3))
    g.check('Tempo <= VMAX', 0 < p1['v'] <= await g.js(f"()=>{S}.VMAX") + 1e-6, round(p1['v'], 2))
    dt = await wait_dwell(g, 0, prep['next'])
    st = await g.js(f"()=>{{const t={S}.trams[0],R=t.line.routes[0];return {{ds:Math.abs(t.s-R.stops[t.k].s),doors:t.doors,v:t.v}}}}")
    g.check('Bahn hält am nächsten Halt (Türen offen, steht genau am Halt)', dt is not None and st['ds'] < 0.5 and st['v'] == 0, f'{dt} s {st}')

    # 3. Fahrschein kaufen
    await g.js(f"""()=>{{const M={M},S=M.STRABA,P=M.P1,st=S.lines[0].stops[2];P.h.x=st.x+3;P.h.z=st.z;P.h.y=M.groundYFn(P.h.x,P.h.z,0);M.G.money=100;S.ticket.validUntil=-1}}""")
    await g.key('KeyB')
    tk = await g.js(f"()=>{{const S={S};return {{money:{M}.G.money,left:S.ticket.validUntil-S.fn.now(),valid:S.fn.ticketValid()}}}}")
    g.check('B an der Haltestelle: -2,90 €', abs(tk['money'] - 97.10) < 1e-6, tk['money'])
    g.check('Fahrschein gültig für ~120 Spielminuten', tk['valid'] and 110 < tk['left'] <= 120, round(tk['left'], 1))
    await g.key('KeyB')
    g.check('zweimal B kauft nicht doppelt', abs(await g.js(f"()=>{M}.G.money") - 97.10) < 1e-6)
    await g.js(f"()=>{{const M={M},P=M.P1;P.h.x+=400;P.h.z+=400;M.G.money=100;M.STRABA.ticket.validUntil=-1}}")
    await g.key('KeyB')
    g.check('weit weg von Haltestellen: kein Kauf', await g.js(f"()=>{M}.G.money") == 100)

    # 4. Einsteigen, mitfahren, aussteigen am nächsten Halt
    prep = await board(g, 1, True, False)
    r = await g.js(RIDE)
    g.check('F an der offenen Tür: eingestiegen', r is not None and r['tram'] == 1, r)
    g.check('Fahrgast versteckt und als inCar markiert', await g.js(f"()=>!{M}.P1.h.g.visible&&{M}.P1.h.inCar&&!{M}.P1.car"))
    await g.step(12)
    cam = await g.js(f"""()=>{{const M={M},t=M.STRABA.trams[1],h=M.P1.h;let d=M.P1.cam.yaw-t.h;d=Math.atan2(Math.sin(d),Math.cos(d));
        return {{yaw:Math.abs(d),pl:Math.hypot(h.x-t.x,h.z-t.z),st:t.state}}}}""")
    g.check('während der Fahrt: Spieler sitzt in der Bahn', cam['pl'] < 0.5 and cam['st'] == 'run', cam)
    g.check('Kamera dreht sich hinter die fahrende Bahn (Gierwinkel < 0,3)', cam['yaw'] < 0.3, round(cam['yaw'], 3))
    await g.key('KeyF')
    g.check('F während der Fahrt: kein Aussteigen', await g.js(RIDE) is not None)
    dt = await wait_dwell(g, 1, prep['next'])
    g.check('Bahn erreicht den nächsten Halt mit Fahrgast', dt is not None and await g.js(RIDE) is not None, dt)
    await g.key('KeyF')
    out = await g.js(f"""()=>{{const M={M},S=M.STRABA,t=S.trams[1],st=t.line.routes[0].stops[t.k],h=M.P1.h;
        return {{ride:!!S.riding,vis:h.g.visible,inCar:h.inCar,dStop:Math.min(Math.hypot(h.x-st.x,h.z-st.z),Math.hypot(h.x-st.bx,h.z-st.bz)),dy:Math.abs(h.y-M.groundYFn(h.x,h.z,h.y)),hp:h.health}}}}""")
    g.check('ausgestiegen (riding null, sichtbar, nicht inCar)', not out['ride'] and out['vis'] and not out['inCar'], out)
    g.check('Spieler steht am Halt (< 15 m)', out['dStop'] < 15, round(out['dStop'], 1))
    g.check('Spieler steht auf dem Boden', out['dy'] < 0.3, round(out['dy'], 3))
    await g.step(10)
    after = await g.js(f"()=>({{st:{M}.P1.h.state,hp:{M}.P1.h.health}})")
    g.check('abfahrende Bahn wirft den Spieler nicht um', after['st'] != 'knock' and after['hp'] == out['hp'], after)

    # 5. Kontrolle ohne Fahrschein → 60 € zahlen
    await g.js(f"()=>{{const M={M};M.setWanted(0);M.G.money=200}}")
    prep = await board(g, 0, False, True)
    g.check('ohne Fahrschein eingestiegen', (await g.js(RIDE) or {}).get('ticket') is False, await g.js(RIDE))
    ctl = None
    for _ in range(20):
        await g.step(1)
        ctl = await g.js(f"()=>{{const C={S}.control;return C?{{fine:C.fine}}:null}}")
        if ctl: break
    g.check('Kontrolleur kommt während der Fahrt', ctl is not None and ctl['fine'] == 60, ctl)
    await g.key('KeyB')
    paid = await g.js(f"()=>({{money:{M}.G.money,ctl:!!{S}.control,res:({S}.lastControl||{{}}).result,ride:!!{S}.riding,w:{M}.wanted}})")
    g.check('B bei der Kontrolle: -60 €', paid['money'] == 140, paid)
    g.check('Kontrolle erledigt (bezahlt), weiter mitfahren, kein Stern', not paid['ctl'] and paid['res'] == 'paid' and paid['ride'] and paid['w'] == 0, paid)
    await wait_dwell(g, 0, prep['next'])
    await g.key('KeyF')
    g.check('nach dem Zahlen normal ausgestiegen ohne Stern', await g.js(RIDE) is None and await g.js(f"()=>{M}.wanted") == 0)

    # 6. Kontrolle ohne Fahrschein → abhauen an der nächsten Haltestelle
    await g.js(f"()=>{{const M={M};M.setWanted(0);M.G.money=200}}")
    prep = await board(g, 1, False, True)
    for _ in range(20):
        await g.step(1)
        if await g.js(f"()=>!!{S}.control"): break
    g.check('zweite Kontrolle aktiv', await g.js(f"()=>!!{S}.control"))
    dt = await wait_dwell(g, 1, prep['next'])
    g.check('Bahn hält, Kontrolle noch offen', dt is not None and await g.js(f"()=>!!{S}.control"), dt)
    await g.key('KeyF')
    fled = await g.js(f"()=>({{ride:!!{S}.riding,w:{M}.wanted,res:({S}.lastControl||{{}}).result,money:{M}.G.money}})")
    g.check('abgehauen: ausgestiegen, 1 Stern, kein Geld weg', not fled['ride'] and fled['w'] == 1 and fled['res'] == 'fled' and fled['money'] == 200, fled)

    # 7. Sitzenbleiben ohne Geld → Rauswurf mit Stern
    await g.js(f"()=>{{const M={M};M.setWanted(0);M.G.money=20}}")
    prep = await board(g, 0, False, True)
    for _ in range(20):
        await g.step(1)
        if await g.js(f"()=>!!{S}.control"): break
    await wait_dwell(g, 0, prep['next'])
    for _ in range(30):
        await g.step(1)
        if await g.js(RIDE) is None: break
    thrown = await g.js(f"()=>({{ride:!!{S}.riding,w:{M}.wanted,res:({S}.lastControl||{{}}).result,vis:{M}.P1.h.g.visible}})")
    g.check('ohne Geld sitzen geblieben: rausgeworfen mit 1 Stern', not thrown['ride'] and thrown['w'] == 1 and thrown['res'] == 'thrown' and thrown['vis'], thrown)
    await g.js(f"()=>{{const M={M};M.setWanted(0);M.STRABA.forceControl=false;M.STRABA.CONTROL_CHANCE=0.3}}")

    # 8. Fahrplan: nach 60 s stehen und fahren Bahnen weiter, nichts hängt fest
    s0 = await g.js(f"()=>{S}.trams.map(t=>t.s+t.ri*1e5+t.k*1e7)")
    await g.step(60)
    s1 = await g.js(f"()=>{S}.trams.map(t=>t.s+t.ri*1e5+t.k*1e7)")
    g.check('alle Bahnen kommen im Fahrplan voran', all(a != b for a, b in zip(s0, s1)), list(zip(s0, s1)))


run(test)
