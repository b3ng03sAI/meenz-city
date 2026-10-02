# S-Bahn S8 Mainz Hbf ⇄ Wiesbaden Hbf: Strecke auf den Gleisen über die Kaiserbrücke, Zeitraffer, Einsteigen/Abteil,
# Durchsagen + Verspätung, Halt auf der Brücke, Kontrolle mit Fahrschein / zahlen / abhauen, Ankunft am anderen Hbf
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
S = '__MEENZ.SBAHN'

TRAIN = f"()=>{{const T={S}.train;return {{s:T.s,v:T.v,st:T.state,dir:T.dir,doors:T.doors,jumps:T.jumps,depT:T.depT,now:{S}.fn.now()}}}}"
RIDE = f"()=>{{const R={S}.riding;return R?{{ticket:R.hasTicket,t:R.t,jumps:R.jumps,eye:R.eye,cond:!!R.conductor,people:R.people.length}}:null}}"
# Spieler an eine Tür des Mittelwagens auf der Bahnsteigseite der Station stellen, an der der Zug steht
AT_DOOR = f"""()=>{{const M={M},S=M.SBAHN,T=S.train,P=M.P1;if(P.car)M.exitCar(P,true);const side=T.dir>0?S.sideMz:S.sideWi;
  const ds=S.fn.doors().slice(4,8).filter(d=>d[2]===side);const d=ds[0];P.h.room=null;P.h.x=d[0];P.h.z=d[1];P.h.y=M.groundYFn(d[0],d[1],3);P.vy=0;
  return {{x:d[0],z:d[1],y:P.h.y,near:S.fn.doorNear(P),plat:S.fn.platform(P)}}}}"""
PLAYER = f"()=>{{const M={M},h=M.P1.h;return {{x:h.x,z:h.z,y:h.y,vis:h.g.visible,inCar:h.inCar,money:M.G.money,w:M.wanted}}}}"


async def until(g, cond, maxs, dt=0.5):
    """Lässt Spielzeit laufen, bis `cond` (JS) wahr ist; liefert die verstrichene Zeit oder None."""
    t = 0.0
    while t < maxs:
        if await g.js(cond): return t
        await g.step(dt); t += dt
    return t if await g.js(cond) else None


async def setup_trip(g, d, dep, ticket, control, gag, delay, money):
    await g.js(f"""([d,dep,tk,c,gag,delay,money])=>{{const M={M},S=M.SBAHN,ST=M.STRABA;M.setWanted(0);M.G.money=money;
        ST.ticket.validUntil=tk?S.fn.now()+200:-1;ST.control=null;ST.lastControl=null;S.forceControl=c;S.forceGag=gag;S.forceDelay=delay;
        S.lastAlight=null;S.lastArrival=null;S.anns.length=0;S.fn.station(d,dep)}}""", [d, dep, ticket, control, gag, delay, money])
    await g.js(AT_DOOR)
    await g.step(0.3)                       # Hbf-Bahnsteige werden gebaut, sobald der Spieler in der Nähe ist
    return await g.js(AT_DOOR)


async def test(g):
    await g.start()
    await g.js(f"()=>{{const R={M}.REVIER;if(R){{R.incomeT=R.attackT=1e9;if(R.war&&R.endWar)R.endWar(false);}}}}")

    # 1. Strecke aus den OSM-Gleisen, über die Kaiserbrücke, von Hbf zu Hbf
    r = await g.js(f"""()=>{{const M={M},S=M.SBAHN,R=S.route,f=S.fn;const d=[],bb=M.WIWAHR.models.hbf.bbox,dbb=(x,z)=>Math.hypot(Math.max(bb[0]-x,0,x-bb[3]),Math.max(bb[2]-z,0,z-bb[5]));
        for(let i=1;i<R.pts.length;i++){{const a=R.pts[i-1],b=R.pts[i];for(const t of [0,0.5])d.push(f.railDist(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t));}}
        d.sort((a,b)=>a-b);const mz=f.pos(S.sMz),wi=f.pos(S.sWi);
        return {{L:R.L,max:d[d.length-1],p95:d[Math.floor(d.length*0.95)],bridge:S.sB1-S.sB0,arches:S.bridge.arches.length,
          mz:Math.hypot(mz[0]+1080,mz[1]+270),wi:dbb(wi[0],wi[1]),cars:S.train.cars.length}}}}""")
    g.check('Strecke Mainz Hbf → Wiesbaden Hbf ist 8–11 km lang', 8000 < r['L'] < 11000, round(r['L']))
    g.check('Strecke liegt auf OSM-Gleisen (95 % < 0,6 m, max < 3 m)', r['p95'] < 0.6 and r['max'] < 3, f"{r['p95']:.2f} / {r['max']:.2f}")
    g.check('Kaiserbrücke aus den Gleisdaten (> 800 m) mit Bogenträgern', r['bridge'] > 800 and r['arches'] >= 2, r)
    g.check('Halt Mainz am Hbf (< 250 m), Halt Wiesbaden direkt am Empfangsgebäude (< 40 m)', r['mz'] < 250 and r['wi'] < 40, [round(r['mz']), round(r['wi'])])
    g.check('dreiteiliger Zug', r['cars'] == 3, r['cars'])

    # 2. Ohne Fahrgast: Zug fährt los, Zeitraffer abseits der Spieler, kommt in Wiesbaden an
    await g.js(f"()=>{{const S={S};S.forceGag=false;S.forceDelay=0;S.lastArrival=null;S.fn.station(1,2)}}")
    t = await until(g, f"()=>!!{S}.lastArrival", 240, 1)
    arr = await g.js(f"()=>({{a:{S}.lastArrival,dir:{S}.train.dir,st:{S}.train.state}})")
    g.check('leerer Zug kommt in Wiesbaden an (< 200 s, mit Zeitraffer)', t is not None and t < 200 and arr['a']['where'] == 'wi' and arr['a']['jumps'] >= 2, f'{t} {arr}')
    g.check('danach Rückfahrt Richtung Mainz geplant', arr['dir'] == -1 and arr['st'] == 'dwell', arr)

    # 3. Mit Fahrschein Mainz → Wiesbaden: B kauft, Verspätung angesagt, E steigt ein, Abteil, Brücke mit Halt, Kontrolle ok
    await g.reseed(30)
    door = await setup_trip(g, 1, 8, False, True, True, 5, 100)
    g.check('Spieler steht am Bahnsteig an der offenen Tür', door['near'] and door['plat'] == 'mz' and door['y'] > 0.5, door)
    await g.key('KeyB')
    tk = await g.js(f"()=>({{money:{M}.G.money,valid:{M}.STRABA.fn.ticketValid()}})")
    g.check('B am Bahnsteig: Fahrschein für 2,90 €', abs(tk['money'] - 97.10) < 1e-6 and tk['valid'], tk)
    dep0 = await g.js(TRAIN)
    g.check('5 Minuten Verspätung: Abfahrt 8 + 5 s später', abs(dep0['depT'] - dep0['now'] - 13) < 0.5, round(dep0['depT'] - dep0['now'], 2))
    await g.step(4.5)
    anns = await g.js(f"()=>{S}.anns.map(a=>a.kind+': '+a.text)")
    g.check('Verspätungs-Durchsage mit Minuten und Grund', any(a.startswith('delay:') and '5 Minute' in a and 'wege' in a for a in anns), anns)
    sched = await g.js(f"()=>{M}.HBF.sched.filter(e=>e.sbahn).map(e=>e.gleis+' '+e.line+' '+e.dest+' +'+e.delay)")
    g.check('Abfahrtstafel Mainz zeigt die S8 auf Gleis 4 mit Verspätung', sched == ['4 S8 Wiesbaden Hbf +5'], sched)
    await g.key('KeyE')
    ride = await g.js(RIDE)
    pl = await g.js(PLAYER)
    g.check('E an der Tür: eingestiegen, Spieler versteckt im Zug', ride is not None and ride['ticket'] and not pl['vis'] and pl['inCar'], [ride, pl])
    g.check('Mitreisende im Abteil', ride and ride['people'] == 3, ride)
    await g.key('KeyE')
    g.check('E im stehenden Zug vor Abfahrt: wieder ausgestiegen', await g.js(RIDE) is None and (await g.js(PLAYER))['vis'])
    await g.js(AT_DOOR)
    await g.key('KeyF')
    g.check('F an der Tür steigt ebenfalls ein', await g.js(RIDE) is not None)
    t_dep = await until(g, f"()=>{S}.train.state==='run'", 20, 0.25)
    g.check('Zug fährt nach Verspätung ab', t_dep is not None, t_dep)
    await g.key('KeyE')
    g.check('während der Fahrt kein Aussteigen', await g.js(RIDE) is not None)
    await g.step(3)
    eye = await g.js(f"()=>{{const S={S},e=S.riding.eye;return Object.assign(S.fn.carLocal(e[0],e[1],e[2]),{{W:S.W,CL:S.CL,F:S.FLOOR}})}}")
    g.check('Kamera sitzt im Abteil (im Wagenkasten, Augenhöhe)', abs(eye['lat']) < eye['W'] / 2 - 0.1 and abs(eye['along']) < eye['CL'] / 2 and eye['F'] + 0.8 < eye['y'] < eye['F'] + 1.8, eye)
    t_br = await until(g, f"()=>{{const S={S},T=S.train;return T.s>S.sB0&&T.s<S.sB1}}", 60, 0.5)
    tr = await g.js(TRAIN)
    g.check('Zeitraffer bis vor die Kaiserbrücke (Sprung, < 40 s)', t_br is not None and t_br < 40 and tr['jumps'] >= 1 and (await g.js(RIDE))['jumps'] >= 1, f'{t_br} {tr}')
    t_gag = await until(g, f"()=>{S}.train.state==='gag'", 60, 0.25)
    gag = await g.js(f"()=>{{const S={S},T=S.train;return {{mid:Math.abs(T.s-(S.sB0+S.sB1)/2),ann:S.anns.some(a=>a.kind==='gag'),bridge:S.anns.some(a=>a.kind==='bridge')}}}}")
    g.check('Verspätungs-Gag: Halt mitten auf der Brücke mit Durchsage', t_gag is not None and gag['mid'] < 2 and gag['ann'] and gag['bridge'], gag)
    await g.step(3)
    g.check('steht während des Gags', (await g.js(TRAIN))['v'] == 0)
    ctl = await g.js(f"()=>({{last:({M}.STRABA.lastControl||{{}}).result,open:!!{M}.STRABA.control,cond:{S}.riding&&!!{S}.riding.conductor}})")
    g.check('Kontrolle auf der Brücke: Fahrschein gültig', ctl['last'] == 'ok' and not ctl['open'] and ctl['cond'], ctl)
    t_arr = await until(g, f"()=>!{S}.riding", 150, 0.5)
    pl = await g.js(PLAYER)
    hw = await g.js(f"""()=>{{const M={M},bb=M.WIWAHR.models.hbf.bbox,h=M.P1.h,A=M.SBAHN.lastAlight;return {{d:Math.hypot(Math.max(bb[0]-h.x,0,h.x-bb[3]),Math.max(bb[2]-h.z,0,h.z-bb[5])),a:A,
        gy:M.groundYFn(h.x,h.z,h.y),people:M.HUMANS.filter(q=>q.state==='sbahn').length}}}}""")
    g.check('Ankunft: automatisch am Wiesbadener Hbf ausgestiegen', t_arr is not None and hw['a'] and hw['a']['where'] == 'wi' and hw['a']['auto'] and not hw['a']['fled'], hw)
    g.check('Spieler steht am Hbf Wiesbaden (< 60 m vom Gebäude), auf dem Bahnsteig', hw['d'] < 60 and pl['vis'] and not pl['inCar'] and abs(pl['y'] - hw['gy']) < 0.05 and pl['y'] > 0.5, [hw['d'], pl])
    g.check('Mitreisende/Schaffner wieder weg, kein Stern, Geld unverändert', hw['people'] == 0 and pl['w'] == 0 and abs(pl['money'] - 97.10) < 1e-6, [hw['people'], pl])
    g.check('Ankunfts-Durchsage Wiesbaden', await g.js(f"()=>{S}.anns.some(a=>a.kind==='arrive'&&/Wiesbaden/.test(a.text))"))

    # 4. Ohne Fahrschein Wiesbaden → Mainz, Kontrolle → B zahlt 60 €
    await g.reseed(31)
    door = await setup_trip(g, -1, 4, False, True, False, 0, 200)
    g.check('am Bahnsteig Wiesbaden an der Tür', door['near'] and door['plat'] == 'wi', door)
    await g.key('KeyE')
    g.check('ohne Fahrschein eingestiegen', (await g.js(RIDE) or {}).get('ticket') is False)
    t_c = await until(g, f"()=>!!{M}.STRABA.control", 90, 0.5)
    g.check('Kontrolleur kommt während der Fahrt', t_c is not None and (await g.js(RIDE))['cond'], t_c)
    await g.key('KeyB')
    paid = await g.js(f"()=>({{money:{M}.G.money,ctl:!!{M}.STRABA.control,res:({M}.STRABA.lastControl||{{}}).result,ride:!!{S}.riding}})")
    g.check('B bei der Kontrolle: 60 € gezahlt, weiter mitfahren', paid['money'] == 140 and not paid['ctl'] and paid['res'] == 'paid' and paid['ride'], paid)
    t_arr = await until(g, f"()=>!{S}.riding", 150, 0.5)
    mz = await g.js(f"""()=>{{const M={M},S=M.SBAHN,h=M.P1.h,p=S.fn.pos(S.sMz);return {{d:Math.hypot(h.x-p[0],h.z-p[1]),y:h.y,a:S.lastAlight,w:M.wanted}}}}""")
    g.check('Ankunft Mainz Hbf: am Bahnsteig Gleis 4 ausgestiegen, kein Stern', t_arr is not None and mz['a']['where'] == 'mz' and mz['d'] < 20 and mz['y'] > 0.5 and mz['w'] == 0, mz)

    # 5. Ohne Fahrschein, nicht zahlen → an der Endstation abgehauen (1 Stern, Geld bleibt)
    await g.reseed(32)
    await setup_trip(g, 1, 4, False, True, False, 0, 200)
    await g.key('KeyE')
    t_c = await until(g, f"()=>!!{M}.STRABA.control", 90, 0.5)
    t_arr = await until(g, f"()=>!{S}.riding", 150, 0.5)
    fled = await g.js(f"()=>({{w:{M}.wanted,res:({M}.STRABA.lastControl||{{}}).result,money:{M}.G.money,a:{S}.lastAlight}})")
    g.check('nicht gezahlt: an der Endstation abgehauen, 1 Stern, kein Geld weg', t_c is not None and t_arr is not None and fled['w'] == 1 and fled['res'] == 'fled'
            and fled['money'] == 200 and fled['a']['fled'] and fled['a']['where'] == 'wi', fled)

    # 6. Fahrender Zug: kein Einsteigen
    await setup_trip(g, -1, 1, True, False, False, 0, 50)
    await until(g, f"()=>{S}.train.state==='run'", 10, 0.25)
    await g.step(1)
    await g.js(f"()=>{{const M={M},S=M.SBAHN,P=M.P1,d=S.fn.doors()[4];P.h.x=d[0];P.h.z=d[1]}}")
    await g.key('KeyE')
    g.check('in den fahrenden Zug steigt keiner ein', await g.js(RIDE) is None and not await g.js(f"()=>{S}.fn.doorNear({M}.P1)"))
    await g.js(f"()=>{{const M={M},S=M.SBAHN;M.setWanted(0);S.forceControl=S.forceGag=S.forceDelay=null}}")


run(test)
