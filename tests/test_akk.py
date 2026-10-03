# AKK (Amöneburg, Kastel, Kostheim): Reduit + Brückenkopf, Kasteler Rheinufer, Freibad Maaraue, Mainmündung,
# Kostheimer Schleuse, Industriepark Amöneburg (ohne Markennamen), Reduit-Kasematten (begehbar), Running Gag Mainz/Wiesbaden.
# Lazy (Welle 9): vier Zonen – beim Boot nichts gebaut, Bau < 350 m, Freigabe > 500 m, erneuter Bau ohne Fehler.
# `python3 tests/test_akk.py real` rendert zusätzlich Screenshots nach tests/out/ und misst Draw-Calls je Zone.
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run
import math

M = '__MEENZ'
A = f'{M}.AKK'
REAL = 'real' in sys.argv[1:]
KEYS = ['amoeneburg', 'kastel', 'maaraue', 'schleuse']

PUT = f"""([x,z,y,yaw])=>{{const M={M},P=M.P1;if(P.car)M.exitCar(P,true);const h=P.h;h.x=x;h.z=z;h.y=y===null?M.groundYFn(x,z):y;
    h.vx=h.vz=0;P.vy=0;if(yaw!==null){{P.cam.yaw=yaw;h.facing=yaw;}}P.cam.init=false;h.sync();}}"""
POS = f"()=>{{const h={M}.P1.h;return [h.x,h.z,h.y]}}"
ZONES = f"""()=>{{const N=window.__akkNpcs||(window.__akkNpcs=[]);for(const Z of Object.values({A}.zones))for(const h of Z.npcs)if(!N.includes(h))N.push(h);
    return Object.fromEntries(Object.entries({A}.zones).map(([k,Z])=>[k,{{built:Z.built,group:Z.group!==null,owned:Z.owned.length,
    npcs:Z.npcs.length,builds:Z.builds,disposes:Z.disposes,x:Z.x,z:Z.z,stats:{A}.stats[k]||null}}]))}}"""
# Weltpunkt im lokalen System der Schleuse (u entlang der Kammer, v quer, Richtung Insel)
LOCK_P = f"""([u,v])=>{{const K={A}.K.LOCK,c=Math.cos(K.rot),s=Math.sin(K.rot);return [K.C[0]+c*u+s*v,K.C[1]-s*u+c*v]}}"""
BAD_P = f"""([u,v])=>{{const B={A}.K.BAD;return [B.O[0]+u*B.U[0]-v*B.U[1],B.O[1]+u*B.U[1]+v*B.U[0]]}}"""


async def put(g, x, z, y=None, yaw=None, settle=0.3):
    await g.js(PUT, [x, z, y, yaw])
    if settle: await g.step(settle)


async def walk(g, sec, key='KeyW', chunk=0.25):
    await g.page.keyboard.down(key)
    for _ in range(round(sec / chunk)): await g.step(chunk)
    await g.page.keyboard.up(key)
    await g.step(0.1)
    return await g.js(POS)


def unbuilt(z):
    return all(not v['built'] and not v['group'] and v['owned'] == 0 and v['npcs'] == 0 for v in z.values())


async def talk(g, scene_id, idx=0):
    return await g.js(f"""([id,i])=>{{const M={M},s={A}.scenes.find(s=>s.id===id);if(!s||!s.people[i])return null;const h=s.people[i];const P=M.P1;
        P.h.x=h.x+Math.sin(h.facing)*1.2;P.h.z=h.z+Math.cos(h.facing)*1.2;M.startTalk(P,h);const T=M.TALK;const r=T?{{who:T.who,line:T.line,n:T.choices.length}}:null;
        return r}}""", [scene_id, idx])


async def test(g):
    await g.start()
    await g.js(f"()=>{{const M={M};M.gameMin=14*60;if(M.UFO)M.UFO.next=1e9;if(M.KART)M.KART.next=1e9;}}")
    home = await g.js(POS)

    # --- (a) Lazy: nach dem Boot am Standard-Start nichts gebaut ---
    zs = await g.js(ZONES)
    g.check('Lazy (a): vier Zonen angemeldet (Kastel, Maaraue, Schleuse, Amöneburg)', sorted(zs) == KEYS, list(zs))
    g.check('Lazy (a): beim Boot nichts gebaut (built/group/owned/npcs leer)', unbuilt(zs), zs)
    far = {k: round(math.hypot(v['x'] - home[0], v['z'] - home[1])) for k, v in zs.items()}
    g.check('Lazy (a): alle Zonenzentren > 500 m vom Standard-Start', all(d > 500 for d in far.values()), far)
    st0 = await g.js(f"()=>{{const a={A};return {{live:a.live.length,hit:a.hitOn,step:a.stepOn,pool:a.poolOn,scenes:a.scenes.length,reduit:a.reduit,bad:a.bad,room:!!a.venue.room}}}}")
    g.check('Lazy (a): keine Kollision/Stufen/Becken/Szenen/Modelle vor dem Bau', st0 == {'live': 0, 'hit': 0, 'step': 0, 'pool': 0, 'scenes': 0, 'reduit': None, 'bad': None, 'room': False}, st0)

    # ========== KASTEL: Reduit, Brückenkopf, Rheinufer ==========
    await put(g, 555, -833, settle=0.5)
    zs = await g.js(ZONES)
    k = zs['kastel']
    g.check('Lazy (b): Kastel gebaut (Meshes, Instanzen, Figuren)', k['built'] and k['group'] and k['stats']['meshes'] >= 5 and k['stats']['inst'] >= 4 and k['npcs'] >= 5, k)
    r = await g.js(f"()=>{{const R={A}.reduit;return {{osm:R.osm,h:R.h,edges:R.edges,merlons:R.merlons,slits:R.slits,cannons:R.cannons,flags:R.flags.map(f=>f.side)}}}}")
    g.check('Reduit: Modell sitzt auf dem OSM-Umriss (Zinnen, Gesims, Schießscharten)', r['osm'] and r['edges'] >= 10 and r['merlons'] >= 100 and r['slits'] >= 100, r)
    g.check('Reduit-Hof: zwei Kanonen, zwei Fahnen (rot-weiß, blau-gelb)', len(r['cannons']) == 2 and sorted(r['flags']) == ['mz', 'wi'], r)
    c = r['cannons'][0]
    g.check('Kanone ist fest (Kollision)', await g.js(f"([x,z])=>{M}.blockedFn(x,z)", [c['x'], c['z']]))
    bk = await g.js(f"()=>{{const B={A}.brueckenkopf;return {{p:B.pylons,sign:B.sign,osm:B.osm,B:B.B}}}}")
    d_bk = min(math.hypot(p['x'] - bk['B'][0], p['z'] - bk['B'][1]) for p in bk['p']) if bk['p'] else 99
    g.check('Brückenkopf: zwei Portalpfeiler am Brückenende der Theodor-Heuss-Brücke', bk['osm'] and len(bk['p']) == 2 and d_bk < 25, [len(bk['p']), round(d_bk, 1)])
    texts = await g.js(f"()=>{A}.texts")
    g.check('Ortsschild-Gag: „Mainz-Kastel“ über „Landeshauptstadt Wiesbaden“, Aufkleber, Wegweiser', bk['sign'] is not None and all(t in texts for t in
            ['Mainz-Kastel', 'Landeshauptstadt Wiesbaden', 'AKK bleibt Meenzerisch!', 'Mainz  0,5 km', 'Wiesbaden  9 km']), bk['sign'])
    u = await g.js(f"""()=>{{const U={A}.ufer,M={M};const wet=U.benches.filter(b=>M.mfG(M.idx(b.x,b.z))&4).length;
        const nearW=U.benches.filter(b=>{{for(let s=0;s<12;s+=0.5){{const i=M.idx(b.x+U.n[0]*s,b.z+U.n[1]*s);if(M.mfG(i)&4)return true;}}return false}}).length;
        return {{path:U.path.length,benches:U.benches.length,lamps:U.lamps.length,bins:U.bins.length,bushes:U.bushes.length,wet,nearW}}}}""")
    g.check('Kasteler Rheinufer: Uferlinie ≥ 60 Abschnitte, ≥ 8 Bänke, ≥ 8 Laternen, Abfalleimer, Grün', u['path'] >= 60 and u['benches'] >= 8 and u['lamps'] >= 8 and u['bins'] >= 3 and u['bushes'] >= 10, u)
    g.check('Bänke an Land mit Blick aufs Wasser (< 12 m)', u['wet'] == 0 and u['nearW'] == u['benches'], u)
    sc = await g.js(f"()=>{A}.scenes.filter(s=>s.zone==='kastel').map(s=>[s.id,s.people.length])")
    g.check('Kastel-Szenen: Fahnewart, Ortsschild-Streit (2), Bank (2), Angler', dict(sc) == {'fahne': 1, 'ortsschild': 2, 'bank': 2, 'angler': 1}, sc)
    t = await talk(g, 'fahne')
    g.check('Gespräch mit dem Fahnewart (eigener Mundart-Dialog, 3 Antworten)', t and t['who'] == 'Fahnewart Erwin' and 'Fahnewart' in t['line'] and t['n'] == 3, t)
    await put(g, 555, -833, settle=0.2)
    await put(g, 555 + 30, -833, settle=0.3)
    g.check('Gespräch endet beim Weggehen', await g.js(f"()=>!{M}.TALK"))

    # Running Gag: Ortsschild-Streit wechselt Meenz/Wissbaade ab
    o = await g.js(f"()=>{{const s={A}.scenes.find(s=>s.id==='ortsschild');return [s.x,s.z,s.people.map(h=>h.akkSide)]}}")
    await put(g, o[0] + 3, o[1] + 3, settle=0.1)
    lines = []
    for _ in range(8):
        await g.step(2.5)
        gg = await g.js(f"()=>{{const G={A}.gag;return [G.lines,G.side,G.last]}}")
        if not lines or lines[-1][0] != gg[0]: lines.append(gg)
    gag = await g.js(f"()=>{A}.gagText")
    sides = [l[1] for l in lines if l[0] > 0]
    ok_alt = len(sides) >= 3 and all(a != b for a, b in zip(sides, sides[1:]))
    ok_txt = all(l[2] in gag[l[1]] for l in lines if l[0] > 0)
    g.check('Running Gag: Ortsschild-Streit, Meenzer und Wissbadener wechseln sich ab (≥ 3 Sprüche)', ok_alt and ok_txt and sorted(o[2]) == ['mz', 'wi'], lines)
    # Fahnenstreit: jede volle Stunde wechselt die obere Fahne
    await put(g, 555, -833, settle=0.1)
    f0 = await g.js(f"()=>{{const M={M};M.gameMin=10*60+5;}}")
    await g.step(0.5)
    f0 = await g.js(f"()=>[{A}.gag.flag,{A}.gag.swaps]")
    await g.js(f"()=>{{{M}.gameMin=11*60+5;}}")
    await g.step(4)
    f1 = await g.js(f"()=>{{const R={A}.reduit;return [{A}.gag.flag,{A}.gag.swaps,R.flags.map(f=>[f.side,+f.y.toFixed(2)])]}}")
    hy = {s: y for s, y in f1[2]}
    g.check('Fahnenstreit am Reduit: neue Stunde → andere Fahne oben (Zähler, Höhe)', f0[0] == 'mz' and f1[0] == 'wi' and f1[1] == f0[1] + 1 and hy['wi'] > 7 and hy['mz'] < 4, [f0, f1])
    await g.js(f"()=>{{{M}.gameMin=14*60;}}")

    # Reduit-Kasematten betreten und verlassen
    door = await g.js(f"()=>{A}.venue.door")
    await put(g, door[0], door[1], 0, None, settle=0.4)
    await g.key('KeyF', after=1.5)
    rr = await g.js(f"()=>{{const h={M}.P1.h;return {{in:!!h.room,name:h.room&&h.room.name,people:h.room&&h.room.people.length,blocked:{M}.blockedFn({door[0]},{door[1]})}}}}")
    g.check('Reduit-Kasematten betreten (Tür vor dem Reduit, frei zugänglich)', rr['in'] and rr['name'] == 'Reduit-Kasematten', rr)
    g.check('Kasematten: Museumsführerin und Besucher drin', (rr['people'] or 0) >= 3, rr['people'])
    hint = await g.js(f"""()=>{{const M={M},P=M.P1,h=P.h,r=h.room;h.x=r.ox;h.z=r.oz-3.4;for(let i=0;i<60;i++)M.update(1/60);const e=document.getElementById('hint');return e&&!e.hidden?e.textContent:''}}""")
    g.check('Kasematten: Tafel „Wem gehört AKK?“ als Hinweis', 'Wem gehört AKK?' in hint and '1945' in hint, hint[:120])
    await g.js(f"""()=>{{const M={M};const P=M.P1,h=P.h,r=h.room,e=r.venue.exits[0];h.x=r.ox+e.x;h.z=r.oz+e.z-3;P.cam.yaw=0;h.facing=0;}}""")
    await g.page.keyboard.down('KeyW')
    for _ in range(30):
        await g.step(0.1)
        if not await g.js(f"()=>!!{M}.P1.h.room"): break
    await g.page.keyboard.up('KeyW')
    await g.step(0.2)
    e = await g.js(POS)
    dd = math.hypot(e[0] - door[0], e[1] - door[1])
    g.check('Kasematten verlassen: draußen im Reduit-Hof an der Tür', not await g.js(f"()=>!!{M}.P1.h.room") and dd < 4, f'{dd:.1f} m')

    # ========== MAARAUE: Freibad, Sprungturm, Mainmündung ==========
    await put(g, 1346, 220, settle=0.5)
    zs = await g.js(ZONES)
    m = zs['maaraue']
    g.check('Lazy (b): Maaraue gebaut (Becken, Zaun, Liegewiese, Figuren)', m['built'] and m['stats']['meshes'] >= 4 and m['stats']['inst'] >= 2 and m['npcs'] >= 4, m)
    b = await g.js(f"()=>{{const B={A}.bad;return {{pools:B.pools.map(p=>p.id),fence:B.fence,towels:B.towels.length,umb:B.umbrellas.length,gate:B.gate,tower:B.tower,chair:B.chair,kiosk:B.kiosk}}}}")
    g.check('Freibad Maaraue: Schwimmer-, Sprung-, Nichtschwimmer- und Planschbecken', sorted(b['pools']) == ['nichtschwimmer', 'plansch', 'schwimmer', 'sprung'], b['pools'])
    g.check('Freibad: Zaun (≥ 300 m), Liegewiese mit Handtüchern und Schirmen, Kiosk, Bademeisterstuhl', b['fence'] > 300 and b['towels'] >= 20 and b['umb'] >= 5 and b['kiosk'] and b['chair'], [round(b['fence']), b['towels'], b['umb']])
    free = await g.js(f"""(bp)=>{{const M={M};const P=(u,v)=>{{const B={A}.K.BAD;return [B.O[0]+u*B.U[0]-v*B.U[1],B.O[1]+u*B.U[1]+v*B.U[0]]}};let bad=0,n=0;
        for(const p of {A}.K.BAD.pools){{const us=p.r!==undefined?[p.cu-p.r+1,p.cu+p.r-1]:[p.u0,p.u1],vs=p.r!==undefined?[p.cv-p.r+1,p.cv+p.r-1]:[p.v0,p.v1];
          for(let u=us[0];u<=us[1];u+=2)for(let v=vs[0];v<=vs[1];v+=2){{const [x,z]=P(u,v);const i=M.idx(x,z);n++;if(i<0||M.mfG(i)&4||M.blockedFn(x,z))bad++;}}}}return [bad,n]}}""", 0)
    g.check('Becken liegen auf freiem Land (kein Wasser, keine Gebäude)', free[0] == 0 and free[1] > 300, free)
    # Gate passierbar, Zaun fest
    fz = await g.js(f"""()=>{{const M={M},B={A}.K.BAD,F=B.fence,P=(u,v)=>[B.O[0]+u*B.U[0]-v*B.U[1],B.O[1]+u*B.U[1]+v*B.U[0]];const g=P((F.gate[0]+F.gate[1])/2,F.v0),w=P(F.u1,10);
        return [M.blockedFn(g[0],g[1]),M.blockedFn(w[0],w[1])]}}""")
    g.check('Freibad-Zaun fest, Eingangstor frei', fz == [False, True], fz)
    # Reinwaten ins Schwimmerbecken: Spieler steht im Wasser, es platscht
    sp = b['pools'] and await g.js(f"()=>{{const p={A}.bad.pools.find(p=>p.id==='schwimmer');return [p.x,p.z]}}")
    s0 = await g.js(f"()=>{A}.swim.splashes")
    await put(g, sp[0], sp[1], 0, None, settle=1.0)
    p = await g.js(POS)
    s1 = await g.js(f"()=>[{A}.swim.splashes,{A}.swim.in]")
    g.check('Schwimmerbecken: Spieler steht im Wasser (Brusthöhe), Platscher', -1.3 < p[2] < -0.8 and s1[0] == s0 + 1 and s1[1], [round(p[2], 2), s1])
    # Raus aus dem Becken: auf dem Beckenrand wieder auf Bodenhöhe
    edge = await g.js(BAD_P, [0, -13])
    await put(g, edge[0], edge[1], 0, None, settle=0.5)
    p = await g.js(POS)
    g.check('Aus dem Becken raus: wieder auf Bodenhöhe', abs(p[2]) < 0.1 and not await g.js(f"()=>{A}.swim.in"), round(p[2], 2))
    # Sprungturm: Treppe hoch, vom 3-m-Brett springen
    tw = b['tower']
    stair = await g.js(f"([x,z])=>[{M}.stepAt(x,z),{M}.groundYFn(x,z,3)]", [tw['board'][0], tw['board'][2]])
    g.check('Sprungturm: 3-m-Brett trägt (Stufenhöhe 3 m)', stair[0] == 3 and abs(stair[1] - 3) < 0.01, stair)
    st_bottom = await g.js(BAD_P, [55, -9.6])
    await put(g, st_bottom[0], st_bottom[1], 0, 0.0, settle=0.1)
    yaw_up = await g.js("([x,z])=>Math.atan2(x,z)", [-0.4837, 0.8753])
    await g.js(f"(y)=>{{const P={M}.P1;P.cam.yaw=y;P.h.facing=y;}}", yaw_up)
    p = await walk(g, 3.5)
    g.check('Sprungturm: Treppe hoch bis zur Plattform (≈ 3 m)', p[2] > 2.6, [round(v, 2) for v in p])
    yaw_board = await g.js("([x,z])=>Math.atan2(x,z)", [-0.8753, -0.4837])
    await put(g, tw['board'][0] + 0.8753 * 5.5, tw['board'][2] + 0.4837 * 5.5, 3.0, yaw_board, settle=0.2)
    j0 = await g.js(f"()=>{A}.swim.jumps")
    p = await walk(g, 3.0)
    j1 = await g.js(f"()=>[{A}.swim.jumps,{A}.swim.in]")
    g.check('Vom 3-m-Brett ins Sprungbecken: Sprung gezählt, Spieler im Wasser', j1[0] == j0 + 1 and j1[1] and p[2] < -0.8, [j1, [round(v, 2) for v in p]])
    # Mainmündung
    mu = await g.js(f"""()=>{{const U={A}.muendung,M={M};return {{band:U.band.length,wet:U.band.filter(p=>M.mfG(M.idx(p[0],p[1]))&4).length,deck:M.groundYFn(U.x,U.z,0.3),x:U.x,z:U.z}}}}""")
    g.check('Mainmündung: Aussichtsdeck (0,25 m) an der Maaraue-Spitze, Mainwasser-Streifen im Rhein', abs(mu['deck'] - 0.25) < 0.01 and mu['band'] >= 6 and mu['wet'] == mu['band']
            and math.hypot(mu['x'] - 1512, mu['z'] - 404) < 15, mu)
    g.check('Mainmündung: Infotafel (Main, Rhein, Main-Kilometer 0)', all(t in texts for t in ['Mainmündung', 'Hier fließt der Main in den Rhein.']), '')
    sc = await g.js(f"()=>{A}.scenes.filter(s=>s.zone==='maaraue').map(s=>[s.id,s.people.length])")
    g.check('Maaraue-Szenen: Bademeister, Liegewiese (2), Kiosk, Rentner an der Mündung', dict(sc) == {'bademeister': 1, 'badegast': 2, 'kiosk': 1, 'muendung': 1}, sc)
    t = await talk(g, 'bademeister')
    g.check('Gespräch mit dem Bademeister (Mundart)', t and t['who'] == 'Bademeister Horst' and 'Becke' in t['line'] and t['n'] == 3, t)
    await put(g, 1346, 220, settle=0.2)

    # ========== KOSTHEIM: Schleuse ==========
    await put(g, 3043, -530, settle=0.5)
    zs = await g.js(ZONES)
    s = zs['schleuse']
    g.check('Lazy (b): Schleuse gebaut (Kammer, Tore, Wehr, Steuerstand, Figuren)', s['built'] and s['stats']['meshes'] >= 10 and s['npcs'] >= 2, s)
    K = await g.js(f"()=>{A}.K.LOCK")
    wall = await g.js(LOCK_P, [0, K['W'] + 1.5])
    wall2 = await g.js(LOCK_P, [0, -(K['W'] + 1.5)])
    mid = await g.js(LOCK_P, [0, 0])
    w = await g.js(f"([a,b,c])=>[{M}.stepAt(a[0],a[1]),{M}.stepAt(b[0],b[1]),{M}.stepAt(c[0],c[1]),{M}.mfG({M}.idx(c[0],c[1]))&4]", [wall, wall2, mid])
    g.check('Kammermauern begehbar (Stufe 0,4 m), Kammer in Wasser', w[0] == 0.4 and w[1] == 0.4 and w[2] is None and w[3] == 4, w)
    # über den Steg am Oberhaupt vom Kostheimer Ufer auf die Insel laufen
    a = await g.js(LOCK_P, [K['L'] + 1.2, -15])
    yaw = await g.js(f"()=>{{const K={A}.K.LOCK;return Math.atan2(Math.sin(K.rot),Math.cos(K.rot))}}")
    await put(g, a[0], a[1], 0.4, yaw, settle=0.1)
    p = await walk(g, 12)
    v = await g.js(f"""([x,z])=>{{const K={A}.K.LOCK,c=Math.cos(K.rot),s=Math.sin(K.rot),dx=x-K.C[0],dz=z-K.C[1];return [c*dx-s*dz,s*dx+c*dz]}}""", [p[0], p[1]])
    g.check('Steg über das Oberhaupt: vom Ufer trockenen Fußes auf die Insel', v[1] > 12 and p[2] > -0.1 and not await g.js(f"()=>{M}.P1.swim"), [round(x, 1) for x in v] + [round(p[2], 2)])
    # Schleusung: Wasser steigt und fällt, Tore öffnen und schließen
    ph = []
    for _ in range(16):
        await g.step(4)
        ph.append(await g.js(f"()=>{{const S={A}.schleuse;return [S.phase,+S.level.toFixed(2),+S.gates[0].open.toFixed(2),+S.gates[1].open.toFixed(2),S.cycles]}}"))
    phases = {x[0] for x in ph}
    lv = [x[1] for x in ph]
    g.check('Schleusung läuft: Füllen und Leeren (Pegel −5 m ↔ −1,6 m), beide Tore öffnen', {'fuellen', 'leeren', 'oben', 'einfahrt'} <= phases and min(lv) <= -4.9 and max(lv) >= -1.7
            and any(x[2] == 1 for x in ph) and any(x[3] == 1 for x in ph) and not any(x[2] > 0 and x[3] > 0 for x in ph), ph)
    g.check('Schleusung: mindestens ein vollständiger Zyklus', ph[-1][4] >= 1, ph[-1][4])
    wr = await g.js(f"""()=>{{const W={A}.schleuse.weir,M={M};const zs=(W.z1-W.z0)/5;return [{A}.schleuse.weirPiers,M.blockedFn(W.x+1.5,W.z0+zs*0.5,-5.5),M.blockedFn(W.x+1.5,W.z0+zs*0.5,5),W.z1-W.z0]}}""")
    g.check('Wehr quer über den Main: 6 Pfeiler, Schütze sperren Schwimmer/Boote', wr[0] == 6 and wr[1] and not wr[2] and wr[3] > 150, wr)
    bld = await g.js(f"()=>{{const B={A}.schleuse.building;return {M}.blockedFn(B.x,B.z)}}")
    g.check('Steuerstand auf der Insel ist fest', bld)
    # in die Kammer gefallen: über die Steigleiter zurück auf die Mauer
    await put(g, mid[0], mid[1], -5.55, None, settle=4)
    p = await g.js(POS)
    g.check('Kammer: Steigleiter bringt Spieler zurück auf die Mauer', abs(p[2] - 0.4) < 0.05 and await g.js(f"()=>{A}.schleuse.ladders>=1"), [round(x, 2) for x in p])
    t = await talk(g, 'schleuse')
    g.check('Gespräch mit dem Schleusewärter (Mundart)', t and t['who'] == 'Schleusewärter Bernd' and 'Schleusewärter' in t['line'] and t['n'] == 3, t)
    await put(g, 3043, -530, settle=0.2)

    # ========== AMÖNEBURG: Industriepark ==========
    await put(g, -1294, -3640, settle=0.5)
    zs = await g.js(ZONES)
    a_ = zs['amoeneburg']
    g.check('Lazy (b): Amöneburg gebaut (Tanks, Schornsteine, Rohrbrücke, Figuren)', a_['built'] and a_['stats']['meshes'] >= 4 and a_['npcs'] >= 2, a_)
    ind = await g.js(f"()=>{{const S={A}.industrie;return {{tanks:S.tanks.length,ch:S.chimneys.length,sup:S.supports,rack:S.rack,fence:S.fence,gate:S.gate,t0:S.tanks[0],orts:!!S.ortsschild}}}}")
    g.check('Industriepark: 4 Tanks in Auffangwanne, 2 Schornsteine, Rohrbrücke mit ≥ 3 Portalen', ind['tanks'] == 4 and ind['ch'] == 2 and ind['sup'] >= 3 and ind['rack'] > 30 and ind['fence'] > 100, ind)
    brand = await g.js(f"""()=>{{const A_={A};const all=A_.texts.concat(Object.values(A_.gagText).flat());return all.filter(t=>A_.BRAND_RX.test(t))}}""")
    g.check('Industriepark und alle AKK-Schilder ohne Markennamen', not brand, brand)
    g.check('Tank ist fest (Kollision)', await g.js(f"([x,z])=>{M}.blockedFn(x,z)", [ind['t0']['x'], ind['t0']['z']]))
    s0 = await g.js(f"()=>{A}.industrie.steam")
    await put(g, ind['gate']['x'] + 4, ind['gate']['z'], settle=2)
    s1 = await g.js(f"()=>[{A}.industrie.steam,+{A}.industrie.barrier.toFixed(2)]")
    await put(g, ind['gate']['x'] + 30, ind['gate']['z'], settle=2)
    s2 = await g.js(f"()=>+{A}.industrie.barrier.toFixed(2)")
    g.check('Dampf aus dem Schornstein, Schranke öffnet bei Annäherung und schließt wieder', s1[0] - s0 >= 10 and s1[1] > 0.9 and s2 < 0.1, [s1, s2])
    g.check('Ortsschild-Gag in Amöneburg', ind['orts'] and 'Mainz-Amöneburg' in texts)
    t = await talk(g, 'pfoertner')
    g.check('Gespräch mit dem Pförtner (Mundart)', t and t['who'] == 'Pförtner Manfred' and 'Werksausweis' in t['line'] and t['n'] == 3, t)
    await put(g, ind['gate']['x'] + 30, ind['gate']['z'], settle=0.2)
    cannon, wall_pt, pool_pt = c, wall, sp

    # --- (c) Lazy: weit weg (Standard-Start) → alles entsorgt ---
    await put(g, home[0], home[1], settle=0.5)
    zs = await g.js(ZONES)
    g.check('Lazy (c): weit weg → alle Zonen entsorgt (built/group/owned/npcs leer, disposes ≥ 1)', unbuilt(zs) and all(v['disposes'] >= 1 for v in zs.values()), zs)
    rm = await g.js("()=>[window.__akkNpcs.length,window.__akkNpcs.filter(h=>h.removed).length]")
    g.check('Lazy (c): alle AKK-Figuren entfernt', rm[0] >= 12 and rm[1] == rm[0], rm)
    c1 = await g.js(f"""([c,w,p])=>{{const M={M},a={A};return {{cannon:M.blockedFn(c.x,c.z),wall:M.stepAt(w[0],w[1])??null,pool:a.api.poolAt(p[0],p[1]),live:a.live.length,hit:a.hitOn,step:a.stepOn,
        poolOn:a.poolOn,scenes:a.scenes.length,room:!!a.venue.room,freed:a.roomsFreed}}}}""", [cannon, wall_pt, pool_pt])
    g.check('Lazy (c): Kollision, Stufen, Becken und Szenen zurückgenommen, Kasematten freigegeben', c1 == {'cannon': False, 'wall': None, 'pool': None, 'live': 0, 'hit': 0, 'step': 0, 'poolOn': 0,
            'scenes': 0, 'room': False, 'freed': c1['freed']} and c1['freed'] >= 1, c1)

    # --- (d) Lazy: erneut hin → wieder gebaut; „niedrig“ halbiert Requisiten/Figuren, kein Schatten ---
    await put(g, 555, -833, settle=0.3)
    full = (await g.js(ZONES))['kastel']
    g.check('Lazy (d): Kastel zum zweiten Mal gebaut', full['built'] and full['builds'] == 2 and full['stats']['meshes'] >= 5 and full['npcs'] >= 5, full)
    g.check('Lazy (d): Kanone wieder fest', await g.js(f"([x,z])=>{M}.blockedFn(x,z)", [cannon['x'], cannon['z']]))
    await g.js(f"()=>{{const Q={M}.QS;window.__akkQS=[Q.lowLOD,Q.noShadow];Q.lowLOD=true;Q.noShadow=true;}}")
    await put(g, home[0], home[1], settle=0.2)
    await put(g, 555, -833, settle=0.3)
    low = (await g.js(ZONES))['kastel']
    g.check('„niedrig“: etwa halb so viele Requisiten und Figuren', low['built'] and low['stats']['props'] <= full['stats']['props'] * 0.65 and low['npcs'] < full['npcs'],
            [low['stats']['props'], full['stats']['props'], low['npcs'], full['npcs']])
    g.check('„niedrig“: kein castShadow', low['stats']['cast'] == 0 and full['stats']['cast'] > 0, [low['stats']['cast'], full['stats']['cast']])
    await g.js(f"()=>{{const Q={M}.QS;[Q.lowLOD,Q.noShadow]=window.__akkQS;}}")
    await put(g, home[0], home[1], settle=0.2)
    g.check('Lazy: Zonen nach „niedrig“ wieder entsorgt', unbuilt(await g.js(ZONES)))

    # --- Eigener Zufallsstrom: Bau und Abbau verschieben die globale Zufallsfolge nicht ---
    rng = await g.js(f"""()=>{{window.__reseed(4242);const a=[Math.random(),Math.random()];window.__reseed(4242);
        for(const k of ['kastel','maaraue','schleuse','amoeneburg']){{{A}.api.build(k);{A}.api.dispose(k);}}const b=[Math.random(),Math.random()];return [a,b]}}""")
    g.check('Bau/Abbau aller Zonen zieht nicht aus dem globalen Math.random', rng[0] == rng[1], rng)

    # --- Schnellreise: eigene Gruppe „AKK“, keine besonderen Orte; Ankunft baut die Zone ---
    ft = await g.js(f"()=>{M}.ftDestinations().filter(d=>d.g==='AKK').map(d=>[d.n,!!d.special,d.x,d.z])")
    names = [n for n, *_ in ft]
    others = await g.js(f"()=>{M}.ftDestinations().filter(d=>d.g!=='AKK').map(d=>[d.x,d.z])")
    mind = min(math.hypot(x - ox, z - oz) for _, _, x, z in ft for ox, oz in others)
    g.check('Schnellreise: 7 AKK-Ziele (Gruppe „AKK“, keine besonderen Orte), ≥ 120 m zu anderen Zielen', len(ft) == 7 and not any(sp for _, sp, *_ in ft) and mind >= 120, [names, round(mind)])
    d = await g.js(f"()=>{{const M={M};const d=M.ftDestinations().find(d=>d.n==='Kostheimer Schleuse');M.fastTravel(d);return {{x:d.x,z:d.z}}}}")
    await g.page.wait_for_function("(d)=>{const h=__MEENZ.P1.h;return Math.hypot(h.x-d.x,h.z-d.z)<6}", arg=d, polling=50, timeout=5000)
    await g.step(0.3)
    g.check('Schnellreise zur Kostheimer Schleuse: Zone wird beim Ankommen gebaut', (await g.js(ZONES))['schleuse']['built'])

    if REAL:
        await screenshots(g)


async def screenshots(g):
    """Nur mit `real`: Bilder nach tests/out/ und Draw-Calls je Zone (lazyDrawCalls im echten three.js)."""
    await g.js(f"()=>{{const M={M};M.gameMin=15*60;M.setWeather&&M.setWeather('klar');}}")
    dc = {}
    D = await g.js(f"()=>{A}.K.DOOR")
    fx, fz = math.sin(D[2]), math.cos(D[2])
    yaw = math.atan2(-fx, -fz)
    await put(g, D[0] + fx * 26 - fz * 6, D[1] + fz * 26 + fx * 6, None, yaw)
    await g.js(f"()=>{{const P={M}.P1;P.cam.pitch=0.05;P.cam.zoom=2.2;}}")
    await g.step(1)
    print('  Bild', await g.snap('akk_reduit', 4))
    dc['kastel'] = await g.js(f"()=>{A}.drawCalls('kastel')")
    bk = await g.js(f"()=>{{const B={A}.brueckenkopf;return [B.B,B.U,B.sign]}}")
    B, U, sg = bk
    await put(g, B[0] + U[0] * 60 + 4, B[1] + U[1] * 60, None, math.atan2(-U[0], -U[1]))
    await g.js(f"()=>{{const P={M}.P1;P.cam.pitch=0.0;P.cam.zoom=1.6;}}")
    await g.step(0.5)
    print('  Bild', await g.snap('akk_brueckenkopf', 4))
    bp = await g.js(BAD_P, [-10, -40])
    await put(g, bp[0], bp[1], None, math.atan2(-0.4837, 0.8753))
    await g.js(f"()=>{{const P={M}.P1;P.cam.pitch=0.35;P.cam.zoom=2.6;}}")
    await g.step(0.5)
    print('  Bild', await g.snap('akk_freibad', 4))
    dc['maaraue'] = await g.js(f"()=>{A}.drawCalls('maaraue')")
    mu = await g.js(f"()=>{A}.muendung")
    await put(g, mu['x'] + 0.35 * -8, mu['z'] - 0.94 * 8, None, math.atan2(-0.35, 0.94))
    await g.js(f"()=>{{const P={M}.P1;P.cam.pitch=0.25;P.cam.zoom=2.0;}}")
    await g.step(0.5)
    print('  Bild', await g.snap('akk_muendung', 4))
    a = await g.js(LOCK_P, [-20, -26])
    yaw = await g.js(f"()=>{{const K={A}.K.LOCK;return Math.atan2(Math.sin(K.rot),Math.cos(K.rot))+0.5}}")
    await put(g, a[0], a[1], None, yaw)
    await g.js(f"()=>{{const P={M}.P1;P.cam.pitch=0.3;P.cam.zoom=2.6;}}")
    await g.step(14)
    print('  Bild', await g.snap('akk_schleuse', 4))
    dc['schleuse'] = await g.js(f"()=>{A}.drawCalls('schleuse')")
    await put(g, -1294 + 30, -3640 + 8, None, math.atan2(-1, -0.3))
    await g.js(f"()=>{{const P={M}.P1;P.cam.pitch=0.25;P.cam.zoom=2.6;}}")
    await g.step(3)
    print('  Bild', await g.snap('akk_amoeneburg', 4))
    dc['amoeneburg'] = await g.js(f"()=>{A}.drawCalls('amoeneburg')")
    zs = await g.js(ZONES)
    print('  Draw-Calls AKK je Zone:', dc)
    print('  Statistik:', {k: v['stats'] for k, v in zs.items() if v['stats']}, 'NPCs:', {k: v['npcs'] for k, v in zs.items()})
    g.check('Draw-Calls je AKK-Zone gemessen, jeweils > 0 und ≤ 150', all(0 < v <= 150 for v in dc.values()) and len(dc) == 4, dc)


if __name__ == "__main__":
    run(test, real=REAL)
