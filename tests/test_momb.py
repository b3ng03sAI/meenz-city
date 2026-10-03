# Mombach: Industrie + Güterwagen, Waggonbau-Denkmal, Kleingärten mit begehbarem Vereinsheim, Mainzer Sand,
# Rheinufer mit Bänken/Anglern, Straßenszenen, Schiersteiner Brücke weiter befahrbar, Schnellreise-Ziele.
# Lazy (Welle 8): sechs Teilzonen (MOMB.zones) – beim Boot nichts gebaut, < 350 m gebaut, > 500 m entsorgt.
# `python3 tests/test_momb.py real` misst zusätzlich die Draw-Calls (echtes three.js) und macht Screenshots nach tests/out/momb_*.jpg.
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
REAL = 'real' in sys.argv[1:]
FT_NAMES = ['Kleingärten Mombach – Vereinsheim', 'Mainzer Sand (Naturschutzgebiet)', 'Rheinufer Mombach', 'Waggonbau-Denkmal Mombach']
ZONES = ['hafen', 'rhein', 'bahnw', 'bahno', 'kgv', 'sand']
FAR = (-150, -30)  # Standard-Start am Dom, > 2,5 km von allen Mombacher Zonen
ROOM = f"()=>{{const h={M}.P1.h;return {{in:!!h.room,name:h.room&&h.room.name,people:h.room&&h.room.people.length,x:h.x,z:h.z,y:h.y,oy:h.room&&h.room.oy}}}}"
PIP = "const pip=(x,z,P)=>{let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;};"
STATS = f"()=>{M}.MOMB.stats()"


async def go(g, x, z, yaw=None, sec=1.0):
    await g.js(f"([x,z,yaw])=>{{const M={M},P=M.P1;if(P.car)M.exitCar(P,true);P.h.x=x;P.h.z=z;P.h.y=M.groundYFn(x,z,0);if(yaw!==null){{P.cam.yaw=yaw;P.h.facing=yaw;}}P.cam.init=false;}}", [x, z, yaw])
    await g.step(sec)


async def go_zone(g, name, sec=1.0):
    c = await g.js(f"(n)=>{{const Z={M}.MOMB.zones[n];return [Z.x,Z.z]}}", name)
    await go(g, c[0], c[1], 0, sec)


async def scene(g, sid):
    return await g.js(f"(id)=>{{const s={M}.MOMB.scenes.find(s=>s.id===id);return s&&{{active:s.active,n:s.people.length,spots:s.spots.length,roof:s.people.filter(h=>h.state==='roof').length,x:s.x,z:s.z,pos:s.people.map(h=>[h.x,h.z])}}}}", sid)


def unbuilt(st):
    return all(not z['built'] and z['meshes'] == 0 and z['owned'] == 0 and z['npcs'] == 0 for z in st.values())


# Kamerapunkte (x, z, Blickziel x, z, pitch, zoom) für die Screenshots, je Zone
SHOT = {
    'kgv': f"""()=>{{const K={M}.MOMB.kleingaerten,p=K.plots[Math.floor(K.plots.length*0.55)],c=Math.cos(p.rot),s=Math.sin(p.rot);
        const W=(u,v)=>[p.x+c*u+s*v,p.z-s*u+c*v];const kg=W(-3,-13);return [kg[0],kg[1],p.x,p.z,0.32,1.5]}}""",
    'sand': f"()=>{{const S={M}.MOMB.sand.area;return [S.cx,S.cz,S.cx+60,S.cz-40,0.18,2.0]}}",
    'rhein': f"()=>{{const rp={M}.MOMB.rhein.anglers[0];return [rp.x+14,rp.z+10,rp.x,rp.z-4,0.25,1.6]}}",
    'hafen': f"()=>{{const cr={M}.MOMB.industrie.find(o=>o.kind==='kran');return [cr.x+45,cr.z+30,cr.x,cr.z,0.12,2.2]}}",
    'bahnw': f"()=>{{const D={M}.MOMB.denkmal;return [D.x+Math.sin(D.rot)*14,D.z+Math.cos(D.rot)*14,D.x,D.z,0.2,1.6]}}",
}


async def real_checks(g):
    await g.js("()=>{__MEENZ.gameMin=14*60;}")
    dcs = {}
    for name in ZONES:
        await go(g, *FAR, 0, 0.5)
        await go_zone(g, name, 1.0)
        st = await g.js(STATS)
        dcs[name] = st[name]['dc']
        if name in SHOT:
            x, z, tx, tz, pitch, zoom = await g.js(SHOT[name])
            await g.js(f"([x,z,tx,tz,pitch,zoom])=>{{const M={M},P=M.P1;if(P.car)M.exitCar(P,true);P.h.x=x;P.h.z=z;P.h.y=M.groundYFn(x,z,0);const yaw=Math.atan2(tx-x,tz-z);P.cam.yaw=yaw;P.h.facing=yaw;P.cam.pitch=pitch;P.cam.zoom=zoom;P.cam.init=false;}}", [x, z, tx, tz, pitch, zoom])
            await g.step(5)
            print('  Screenshot', await g.snap('momb_' + name))
    print('  Draw-Calls je Zone (gebaut):', dcs, 'Summe', sum(dcs.values()))
    g.check('Draw-Calls je Zone <= 150 und Summe aller Zonen <= 150', max(dcs.values()) <= 150 and sum(dcs.values()) <= 150 and min(dcs.values()) > 0, dcs)
    await go_zone(g, 'kgv', 1.0)
    await g.js(f"()=>{{const M={M};M.enterVenue(M.P1,M.MOMB.kleingaerten.venue)}}")
    await g.js(f"()=>{{const P={M}.P1,h=P.h,r=h.room;h.x=r.ox+5.5;h.z=r.oz+4;P.cam.yaw=Math.atan2(-9,-5);h.facing=P.cam.yaw;P.cam.pitch=0.2;P.cam.zoom=1.2;P.cam.init=false;}}")
    await g.step(4)
    print('  Screenshot', await g.snap('momb_vereinsheim'))


async def test(g):
    await g.start()

    # (a) Boot: nichts gebaut, keine NPCs, keine Geometrie; Schnellreise-Ziele trotzdem da
    st = await g.js(STATS)
    g.check('6 Teilzonen angelegt', sorted(st) == sorted(ZONES), list(st))
    g.check('(a) nach dem Boot keine Zone gebaut (group null, owned/npcs leer)', unbuilt(st) and await g.js(f"()=>Object.values({M}.MOMB.zones).every(Z=>Z.group===null&&Z.builds===0)"), st)
    g.check('(a) keine Mombach-Daten nach dem Boot', await g.js(f"()=>{{const O={M}.MOMB;return O.industrie.length+O.wagons.length+O.props.length+O.scenes.length===0&&!O.denkmal}}"))
    names = await g.js(f"()=>{M}.ftDestinations().filter(d=>d.g==='Mombach').map(d=>d.n)")
    g.check('Schnellreise-Ziele für Mombach schon vor dem Bau', all(n in names for n in FT_NAMES), names)

    # 1. Hafen: Industrie
    await go_zone(g, 'hafen')
    st = await g.js(STATS)
    g.check('(b) Hafen-Zone gebaut mit Meshes und NPCs', st['hafen']['built'] and st['hafen']['meshes'] > 0 and st['hafen']['npcs'] > 0, st['hafen'])
    ind = await g.js(f"()=>{{const I={M}.MOMB.industrie;const c=k=>I.filter(o=>o.kind===k).length;return {{kran:c('kran'),schorn:c('schornstein'),tanks:c('tanks'),cont:c('container')}}}}")
    g.check('Industrie: >= 2 Hafenkräne, Tanklager, Container', ind['kran'] >= 2 and ind['tanks'] == 1 and ind['cont'] == 1, ind)
    solid = await g.js(f"()=>{{const M={M};return M.MOMB.industrie.filter(o=>o.kind!=='kran').every(o=>{{const s=o.solid||[o.x,o.z];return M.blocked(s[0],s[1])}})}}")
    g.check('Schornsteine/Tanks/Container sind fest (blocked)', solid)
    hs = await scene(g, 'hafen')
    g.check('Hafenarbeiter mit Helm stehen am Kran', hs and hs['active'] and hs['roof'] >= 1, hs and hs['n'])
    chim = ind['schorn']

    # 2. Rheinufer (+ Brückenkorridor frei, solange Hafen und Rhein gebaut sind)
    await go_zone(g, 'rhein')
    rh = await g.js(f"()=>{{const M={M},R=M.MOMB.rhein;return {{path:R.path.length,benches:R.benches.length,solid:R.benches.every(b=>M.blocked(b.x,b.z)),anglers:R.anglers.length}}}}")
    g.check('Rheinufer: Weg, >= 5 Bänke (fest), >= 2 Angler', rh['path'] >= 20 and rh['benches'] >= 5 and rh['solid'] and rh['anglers'] >= 2, rh)
    rs = await scene(g, 'rhein')
    g.check('Angler sitzen am Ufer', rs['active'] and rs['roof'] >= 2, [rs['n'], rs['roof']])
    near = await g.js(f"""()=>{{const M={M},B=M.BRIDGES.find(b=>/Schierstein/.test(b.name));if(!B)return null;
        return M.MOMB.props.filter(p=>{{const dx=p.x-B.A[0],dz=p.z-B.A[1];const t=dx*B.U[0]+dz*B.U[1],l=dx*B.N[0]+dz*B.N[1];return t>-350&&t<B.L+350&&Math.abs(l)<B.hw+30}}).length}}""")
    g.check('keine Mombach-Objekte im Brückenkorridor', near == 0, near)
    await g.step(15)
    g.check('Szenen sagen Mundart-Sätze', await g.js(f"()=>{M}.MOMB.scenes.some(s=>s.said>0)"))

    # 3. Güterbahnhof West (Denkmal) + Ost
    await go_zone(g, 'bahnw')
    dk = await g.js(f"()=>{{const M={M},D=M.MOMB.denkmal;return D&&{{x:D.x,z:D.z,b:M.blocked(D.x,D.z)}}}}")
    g.check('Wahrzeichen: Waggonbau-Denkmal steht und ist fest', dk and dk['b'], dk)
    chim += await g.js(f"()=>{M}.MOMB.industrie.filter(o=>o.kind==='schornstein'&&o.zone==='momb_bahnw').length")
    g.check('Industrie: >= 2 Schornsteine (Hafen + Bahn)', chim >= 2, chim)
    await go_zone(g, 'bahno')
    wg = await g.js(f"()=>{{const M={M},W=M.MOMB.wagons;return {{n:W.length,tank:W.filter(w=>w.tank).length,solid:W.every(w=>M.blocked(w.x,w.z)),yard:W.every(w=>w.x>-3780&&w.x<-2730&&w.z>-2845&&w.z<-2515),w:W.filter(w=>w.zone==='momb_bahnw').length}}}}")
    g.check('Güterbahnhof: >= 20 abgestellte Wagen, beide Bauarten, in beiden Zonen', wg['n'] >= 20 and 0 < wg['tank'] < wg['n'] and 0 < wg['w'] < wg['n'], wg)
    g.check('Güterwagen fest und im Güterbahnhof', wg['solid'] and wg['yard'], wg)

    # 4. Kleingärten + Vereinsheim
    await go_zone(g, 'kgv')
    kg = await g.js(f"()=>{{const K={M}.MOMB.kleingaerten;window.__mombV=K.venue;return {{plots:K.plots.length,gnomes:K.gnomes,club:!!K.clubhouse,door:K.venue&&K.venue.door,sheds:K.plots.every(p=>{M}.blocked(p.shed[0],p.shed[1]))}}}}")
    g.check('Kleingärten: >= 20 Parzellen mit Laube, >= 5 Zwerge', kg['plots'] >= 20 and kg['gnomes'] >= 5, kg)
    g.check('Lauben sind fest', kg['sheds'])
    g.check('Vereinsheim mit Tür', kg['club'] and kg['door'] is not None, kg['door'])
    gs = await scene(g, 'kleingarten')
    g.check('Kleingarten-Szene aktiv mit Gärtnern (state roof)', gs['active'] and gs['roof'] >= 3, gs and [gs['n'], gs['roof']])
    d = kg['door']
    await go(g, d[0], d[1], None, 0.6)
    await g.key('KeyF', after=1.5)
    r = await g.js(ROOM)
    vname = await g.js(f"()=>window.__mombV.name")
    g.check('Vereinsheim betreten', r['in'] and r['name'] == vname, r['name'])
    g.check('Vorstand sitzt drin (>= 6 Leute)', (r['people'] or 0) >= 6, r['people'])
    g.check('Spieler auf Raumhöhe', r['in'] and abs(r['y'] - r['oy']) < 0.01, r['y'])
    # ppos() zählt im Raum die Tür als Position: die Zone bleibt gebaut, beim Rausgehen kein Neubau
    g.check('im Raum bleibt die Kleingarten-Zone gebaut (Tür zählt)', (await g.js(STATS))['kgv']['built'])
    s0 = await g.js(f"()=>{M}.MOMB.kleingaerten.sitzung.step")
    await g.step(12)
    s1 = await g.js(f"()=>{{const S={M}.MOMB.kleingaerten.sitzung;return [S.step,S.last||'']}}")
    g.check('Vorstandssitzung läuft (Wortmeldungen)', s1[0] >= s0 + 2 and s1[1] != '', s1)
    g.check('Raum bleibt bestehen, solange man drin ist', await g.js("()=>!!window.__mombV.room"))
    await g.js(f"()=>{{const M={M},P=M.P1,h=P.h,r=h.room,c=r.people[0];h.x=c.x+1.6;h.z=c.z;h.facing=-Math.PI/2;P.cam.yaw=h.facing;}}")
    await g.key('KeyE', after=0.3)
    t = await g.js(f"()=>{{const T={M}.TALK;return T&&{{who:T.who,line:T.line}}}}")
    g.check('Vorsitzender redet Meenzerisch (eigenes Gespräch)', t and 'Vorsitzender' in t['who'] and 'Wartelist' in t['line'], t)
    await g.js(f"()=>{{const h={M}.P1.h,r=h.room;h.x=r.ox+5;h.z=r.oz+3.5;}}")
    await g.step(0.3)
    g.check('Gespräch endet beim Weggehen', await g.js(f"()=>!{M}.TALK"))
    await g.js(f"""()=>{{const M={M};const P=M.P1,h=P.h,r=h.room,e=r.venue.exits[0];h.x=r.ox+e.x;h.z=r.oz+e.z-3;P.cam.yaw=0;}}""")
    await g.page.keyboard.down('KeyW')
    for _ in range(30):
        await g.step(0.1)
        if not await g.js(f"()=>!!{M}.P1.h.room"): break
    await g.page.keyboard.up('KeyW')
    await g.step(0.2)
    e = await g.js(ROOM)
    dd = ((e['x'] - d[0]) ** 2 + (e['z'] - d[1]) ** 2) ** 0.5
    g.check('Vereinsheim verlassen, draußen an der Tür', not e['in'] and dd < 4 and abs(e['y']) < 0.5, [round(dd, 1), e['y']])
    g.check('draußen ist die Kleingarten-Zone wieder gebaut', (await g.js(STATS))['kgv']['built'])

    # 5. Mainzer Sand
    await go_zone(g, 'sand')
    sd = await g.js(f"""()=>{{const M={M},S=M.MOMB.sand,A=S.area;{PIP}
        return {{m2:A.m2,pines:S.pines,tufts:S.tufts,osm:M.BUILDINGS.filter(b=>pip(b.x,b.z,A.poly)).length,
          props:M.MOMB.props.filter(p=>pip(p.x,p.z,A.poly)).length}}}}""")
    g.check('Mainzer Sand als Fläche markiert (> 5 ha)', sd['m2'] > 50000, sd['m2'])
    g.check('Mainzer Sand ohne Gebäude (OSM und neue)', sd['osm'] == 0 and sd['props'] == 0, sd)
    g.check('Mainzer Sand: Kiefern und Trockengras', sd['pines'] >= 20 and sd['tufts'] >= 200, sd)
    a = await scene(g, 'sand')
    await g.step(8)
    b = await scene(g, 'sand')
    moved = max((((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2) ** 0.5 for p, q in zip(a['pos'], b['pos'])), default=0)
    g.check('Spaziergänger im Mainzer Sand unterwegs', a['active'] and a['n'] >= 2 and moved > 2, [a['n'], round(moved, 1)])

    # (c) weit weg: alles entsorgt, NPCs entfernt, Kollision exakt zurückgebaut, Vereinsheim-Raum freigegeben
    await go_zone(g, 'kgv')
    await g.js(f"""()=>{{const O={M}.MOMB;window.__mombNpcs=Object.values(O.zones).flatMap(Z=>Z.npcs);
        window.__mombSolid=[...O.kleingaerten.plots.map(p=>p.shed),[O.kleingaerten.clubhouse.x,O.kleingaerten.clubhouse.z]];}}""")
    await go(g, *FAR, 0, 1.0)
    st = await g.js(STATS)
    builds_c = st['kgv']['builds']
    g.check('(c) weit weg: alle Zonen entsorgt (group null, owned/npcs leer)', unbuilt(st) and await g.js(f"()=>Object.values({M}.MOMB.zones).every(Z=>Z.group===null)"), st)
    g.check('(c) jede Zone mindestens einmal entsorgt', all(z['disposes'] >= 1 for z in st.values()), {k: z['disposes'] for k, z in st.items()})
    g.check('(c) alle Mombach-NPCs removed', await g.js(f"()=>window.__mombNpcs.length>0&&window.__mombNpcs.every(h=>h.removed&&!{M}.HUMANS.includes(h))"))
    g.check('(c) Kollision zurückgebaut (Lauben/Vereinsheim nicht mehr blocked)', await g.js(f"()=>window.__mombSolid.every(p=>!{M}.blocked(p[0],p[1]))"))
    g.check('(c) Mombach-Daten geleert', await g.js(f"()=>{{const O={M}.MOMB;return O.industrie.length+O.wagons.length+O.props.length+O.scenes.length===0&&!O.denkmal&&O.kleingaerten.plots.length===0}}"))
    g.check('(c) Vereinsheim-Raum freigegeben', await g.js(f"()=>window.__mombV.room===null&&{M}.MOMB.roomDisposes>=1"))

    # (d) wieder hin: zweiter Bau ohne Fehler, gleiche Anlage
    await go_zone(g, 'kgv')
    st = await g.js(STATS)
    kg2 = await g.js(f"()=>{{const K={M}.MOMB.kleingaerten;return {{plots:K.plots.length,door:K.venue&&K.venue.door,solid:window.__mombSolid.every(p=>{M}.blocked(p[0],p[1]))}}}}")
    g.check('(d) erneut gebaut (builds +1), gleiche Parzellen und Tür', st['kgv']['built'] and st['kgv']['builds'] == builds_c + 1 and kg2['plots'] == kg['plots'] and kg2['door'] == kg['door'] and kg2['solid'], [st['kgv'], kg2['plots']])

    # Qualität „niedrig“: halb so viele Props/NPCs, keine Schatten
    await go(g, *FAR, 0, 0.5)
    await g.js(f"()=>{{const Q={M}.QS;window.__mombQ=[Q.lowLOD,Q.noShadow];Q.lowLOD=true;Q.noShadow=true;}}")
    await go_zone(g, 'sand')
    lo = await g.js(f"()=>{{const O={M}.MOMB,Z=O.zones.sand;let cast=0;Z.group.traverse(m=>{{if(m.castShadow)cast++;}});return {{tufts:O.sand.tufts,pines:O.sand.pines,npcs:Z.npcs.length,cast}}}}")
    await go(g, *FAR, 0, 0.5)
    await g.js(f"()=>{{const Q={M}.QS;[Q.lowLOD,Q.noShadow]=window.__mombQ;}}")
    g.check('niedrig: etwa halb so viele Props/NPCs, kein castShadow', lo['tufts'] <= sd['tufts'] // 2 + 1 and lo['pines'] <= sd['pines'] // 2 + 1 and lo['npcs'] < a['n'] and lo['cast'] == 0, [lo, sd['tufts'], a['n']])

    # Schiersteiner Brücke von Mombach aus befahrbar
    ok = await g.js(f"""()=>{{const M={M},P=M.P1,B=M.BRIDGES.find(b=>/Schierstein/.test(b.name));const x=B.A[0]+B.U[0]*2,z=B.A[1]+B.U[1]*2;
        const c=new M.Car('sport',x,z,Math.atan2(B.U[0],B.U[1]),{{ctrl:'none'}});c.ai={{mode:'parked'}};c.y=M.groundYFn(x,z);c.sync(0);
        P.h.x=x-B.N[0]*2.6;P.h.z=z-B.N[1]*2.6;P.h.y=M.groundYFn(P.h.x,P.h.z,0);M.enterCar(P,c);return P.car===c}}""")
    g.check('Auto an der Brückenauffahrt bestiegen', ok)
    y0 = await g.js(f"()=>{M}.P1.car.y")
    top = y0
    await g.page.keyboard.down('KeyW')
    for _ in range(40):
        await g.step(0.15)
        top = max(top, await g.js(f"()=>{M}.P1.car?{M}.P1.car.y:0"))
    await g.page.keyboard.up('KeyW')
    g.check('Brücke befahrbar: Auto steigt auf der Rampe (> 4 m)', top - y0 > 4, [round(y0, 1), round(top, 1)])
    await g.js(f"()=>{{const M={M};const c=M.P1.car;c.vx=c.vz=0;c.speed=0;M.exitCar(M.P1,true)}}")

    # Schnellreise
    dst = await g.js(f"()=>{{const M={M};M.setWanted(0);const d=M.ftDestinations().find(d=>d.n==='Mainzer Sand (Naturschutzgebiet)');M.fastTravel(d);return {{x:d.x,z:d.z}}}}")
    await g.page.wait_for_function("(d)=>{const h=__MEENZ.P1.h;return Math.hypot(h.x-d.x,h.z-d.z)<3}", arg=dst, polling=50, timeout=5000)
    inside = await g.js(f"()=>{{const M={M},h=M.P1.h;{PIP}return pip(h.x,h.z,{M}.MOMB.sand.area?{M}.MOMB.sand.area.poly:[])||pip(h.x,h.z,[[-4660,-2000],[-4560,-2040],[-4455,-1990],[-4440,-1700],[-4452,-1455],[-4720,-1432],[-4880,-1530],[-4872,-1640],[-4720,-1720],[-4682,-1850]])}}")
    g.check('Schnellreise landet im Mainzer Sand', inside)
    await g.step(0.5)
    g.check('nach der Schnellreise ist der Mainzer Sand gebaut', (await g.js(STATS))['sand']['built'])
    print('  Zonen:', {k: {kk: v[kk] for kk in ('meshes', 'npcs', 'owned', 'hg', 'builds', 'disposes')} for k, v in (await g.js(STATS)).items()})

    if REAL:
        await real_checks(g)


run(test, real=REAL)
