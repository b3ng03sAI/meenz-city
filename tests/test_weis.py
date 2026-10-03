# Weisenau: Synagoge (Modell, Tafel, Ruhezone), Zementwerk ohne Markentext, Steinbruch (Terrassen, Zaun, Aussichtspunkt),
# Strandkiosk betreten/verlassen, Rheinufer-Bänke, Großberg-Siedlung, Mundart-Szenen, Schnellreise.
# Lazy (Welle 8): drei Zonen (Synagoge, Rheinufer, Süd) – beim Boot nichts gebaut, Bau < 350 m, Freigabe > 500 m.
# `python3 tests/test_weis.py real` rendert zusätzlich Screenshots nach tests/out/ und misst Draw-Calls je Zone.
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run
import math

M = '__MEENZ'
W = f'{M}.WEIS'
REAL = 'real' in sys.argv[1:]
SYN_OSM = (1759.4, 1463.3)  # Mittelpunkt des OSM-Umrisses „Weisenauer Synagoge“

PUT = f"""([x,z,y,yaw])=>{{const M={M},P=M.P1;if(P.car)M.exitCar(P,true);const h=P.h;h.x=x;h.z=z;h.y=y===null?M.groundYFn(x,z):y;
    h.vx=h.vz=0;P.vy=0;if(yaw!==null){{P.cam.yaw=yaw;h.facing=yaw;}}P.cam.init=false;h.sync();}}"""
POS = f"()=>{{const h={M}.P1.h;return [h.x,h.z,h.y]}}"


async def put(g, x, z, y=None, yaw=None, settle=0.3):
    await g.js(PUT, [x, z, y, yaw])
    if settle: await g.step(settle)


async def walk(g, sec, key='KeyW', chunk=0.25):
    await g.page.keyboard.down(key)
    for _ in range(round(sec / chunk)): await g.step(chunk)
    await g.page.keyboard.up(key)
    await g.step(0.1)
    return await g.js(POS)


ZONES = f"""()=>Object.fromEntries(Object.entries({W}.zones).map(([k,Z])=>[k,{{built:Z.built,group:Z.group!==null,owned:Z.owned.length,
    npcs:Z.npcs.length,builds:Z.builds,disposes:Z.disposes,stats:{W}.stats[k]||null}}]))"""
SILO = "(()=>{const s=__MEENZ.WEIS.zement.silos[0];return [s.x,s.z]})()"
FENCE_CELL = "__MEENZ.WEIS.steinbruch.fenceCells[0]"


def unbuilt(z):
    return all(not v['built'] and not v['group'] and v['owned'] == 0 and v['npcs'] == 0 for v in z.values())


async def collision_state(g):
    return await g.js(f"""()=>{{const M={M},s={SILO};return {{silo:M.blockedFn(s[0],s[1]),elev:M.ELEV.has({FENCE_CELL}),qOn:{W}.qOn,
        syn:M.blockedFn({W}.synagoge.x,{W}.synagoge.z)}}}}""")


async def test(g):
    await g.start()
    await g.js(f"()=>{{const M={M};M.gameMin=14*60;if(M.UFO)M.UFO.next=1e9;if(M.KART)M.KART.next=1e9;}}")
    home = await g.js(POS)

    # --- (a) Lazy: nach dem Boot am Standard-Start nichts gebaut, keine Kollision ---
    zs = await g.js(ZONES)
    g.check('Lazy (a): drei Zonen angemeldet (Synagoge, Rheinufer, Süd)', sorted(zs) == ['sued', 'syn', 'ufer'], list(zs))
    g.check('Lazy (a): beim Boot nichts gebaut (built/group/owned/npcs leer)', unbuilt(zs), zs)
    c0 = await collision_state(g)
    g.check('Lazy (a): keine Weisenau-Kollision/ELEV/Steinbruch-Höhen vor dem Bau', not c0['silo'] and not c0['elev'] and not c0['qOn'] and not c0['syn'], c0)

    # --- Synagoge: Lage, Modell, Kollision, Ruhezone ---
    s = await g.js(f"()=>{{const S={W}.synagoge;return S&&{{x:S.x,z:S.z,L:S.L,W:S.W,osm:S.osm,door:S.door,pl:S.plaque,calm:{W}.calm}}}}")
    d = ((s['x'] - SYN_OSM[0]) ** 2 + (s['z'] - SYN_OSM[1]) ** 2) ** 0.5
    g.check('Synagoge an der OSM-Position (< 3 m)', s['osm'] and d < 3, f"{d:.1f} m")
    g.check('Grundriss wie OSM (≈10,4 × 9,1 m)', 9.5 < s['L'] < 11.5 and 8 < s['W'] < 10, [round(s['L'], 1), round(s['W'], 1)])
    g.check('Gedenktafel mit Text (Synagoge Weisenau, 18. Jahrhundert)', 'Synagoge Weisenau' in s['pl']['text'] and '18. Jahrhundert' in s['pl']['text'], s['pl']['text'])
    g.check('Ruhezone um die Synagoge', s['calm']['r'] >= 20 and abs(s['calm']['x'] - s['x']) < 1, s['calm'])
    g.check('OSM-Klotz der Synagoge ersetzt (nicht in BUILDINGS)', await g.js(f"()=>!{M}.BUILDINGS.some(b=>b.name==='Weisenauer Synagoge')"))

    pl = s['pl']
    await put(g, pl['x'] + math.sin(pl['face']) * 1.0, pl['z'] + math.cos(pl['face']) * 1.0, None, None, settle=1.2)
    zs = await g.js(ZONES)
    g.check('Lazy (b): Synagogen-Zone in der Nähe gebaut (Meshes + Stadtführerin)', zs['syn']['built'] and zs['syn']['stats']['meshes'] >= 2 and zs['syn']['npcs'] >= 1, zs['syn'])
    g.check('Synagoge ist fest (Kollision)', await g.js(f"([x,z])=>{M}.blockedFn(x,z)", [s['x'], s['z']]))
    hint = await g.js("()=>{const h=document.getElementById('hint');return h&&!h.hidden?h.textContent:''}")
    g.check('Tafeltext erscheint als Hinweis an der Tafel', 'Synagoge Weisenau' in hint and 'Erinnerung' in hint, hint[:120])

    # Ruhezone: Prügelei an der Synagoge wird sofort beendet
    br = await g.js(f"""([x,z])=>{{const M={M};const o=M.mkHuman('ped');o.x=x+3;o.z=z+3;o.y=0;o.state='brawl';o.brT=0;o.hitT=5;o.sync();
        for(let i=0;i<30;i++)M.update(1/60);const r=[o.state,{W}.calmed];o.remove();return r;}}""", [s['x'], s['z']])
    g.check('Ruhezone: Prügelei an der Synagoge wird abgebrochen', br[0] != 'brawl' and br[1] >= 1, br)
    far = await g.js(f"""([x,z])=>{{const M={M};const o=M.mkHuman('ped');o.x=x+60;o.z=z;o.y=0;o.state='brawl';o.brT=0;o.hitT=5;o.sync();
        const c0={W}.calmed;for(let i=0;i<30;i++)M.update(1/60);const r=[{W}.calmed-c0];o.remove();return r;}}""", [s['x'], s['z']])
    g.check('außerhalb der Ruhezone greift sie nicht', far[0] == 0, far)

    # Stadtführerin: ruhige Szene mit Mundart-Dialog
    await g.step(0.5)
    fu = await g.js(f"()=>{{const s={W}.scenes.find(s=>s.id==='fuehrung');return s&&{{n:s.people.length,calm:!!s.calm,name:s.people[0]&&s.people[0].npcName}}}}")
    g.check('Szene an der Synagoge: Stadtführerin da, ruhig', fu and fu['n'] >= 1 and fu['calm'], fu)

    # --- Zementwerk: Modelle ohne Markentext, Staub ---
    z = await g.js(f"""()=>{{const Z={W}.zement;return {{silos:Z.silos.length,tower:!!Z.tower,kiln:!!Z.kiln,chimney:!!Z.chimney,halls:Z.halls.length,belts:Z.belts.length,
        fence:Z.fence,texts:Z.texts.length,brand:{W}.texts.filter(t=>{W}.BRAND_RX.test(t)),gate:Z.gate,s0:Z.silos[0],emit:Z.emit.length}}}}""")
    g.check('Zementwerk: ≥ 4 Silos, Vorwärmerturm, Drehrohrofen, Kamin, Hallen', z['silos'] >= 4 and z['tower'] and z['kiln'] and z['chimney'] and z['halls'] >= 2, z)
    g.check('Zementwerk: ≥ 3 Förderbänder, Zaun, Staubquellen', z['belts'] >= 3 and z['fence'] > 300 and z['emit'] >= 4, [z['belts'], round(z['fence']), z['emit']])
    g.check('Zementwerk ohne Schrift/Markennamen', z['texts'] == 0 and not z['brand'], z['brand'])
    await put(g, z['gate']['x'], z['gate']['z'] - 10, None, 0.0, settle=0)
    await g.step(0.1)
    zs = await g.js(ZONES)
    st = zs['sued']['stats']
    g.check('Lazy (b): Süd-Zone am Werkstor gebaut (Werk, Steinbruch, Großberg, Figuren)', zs['sued']['built'] and st['meshes'] >= 8 and st['inst'] >= 3 and zs['sued']['npcs'] >= 4, zs['sued'])
    g.check('Silo ist fest (Kollision)', await g.js(f"([x,z])=>{M}.blockedFn(x,z)", [z['s0']['x'], z['s0']['z']]))
    d0 = await g.js(f"()=>{W}.zement.dust||0")
    await g.step(2)
    d1 = await g.js(f"()=>{W}.zement.dust||0")
    g.check('Zementstaub wird in der Nähe erzeugt', d1 - d0 >= 10, d1 - d0)
    ar = await g.js(f"()=>{{const s={W}.scenes.find(s=>s.id==='arbeiter');return s?s.people.length:0}}")
    g.check('Schichtarbeiter am Werkstor', ar >= 2, ar)

    # --- Steinbruch: Terrassen, Zaun, Aussichtspunkt, Bagger ---
    q = await g.js(f"""()=>{{const S={W}.steinbruch,M={M},f=S.floor,v=S.viewpoint;return {{rim:S.rim,ter:S.terraces.length,fence:S.fence,exc:S.excavators.length,bushes:S.bushes,
        floor:M.groundYFn((f.x0+f.x1)/2,(f.z0+f.z1)/2,0),t1:M.groundYFn(f.x0-3,2520,5),top:M.groundYFn(2240,2580,20),vp:v,vpy:M.groundYFn(v.x,v.z,16.5)}}}}""")
    g.check('Steinbruch: Sohle auf Bodenhöhe', abs(q['floor']) < 0.01, q['floor'])
    g.check('Steinbruch: 4 Terrassen, erste auf 4 m', q['ter'] == 4 and abs(q['t1'] - 4) < 0.01, [q['ter'], q['t1']])
    g.check('Steinbruch: Plateau auf Kantenhöhe 16 m', abs(q['top'] - q['rim']) < 0.01 and q['rim'] == 16, q['top'])
    g.check('Aussichtskanzel begehbar (Bodenhöhe 16,25 m)', abs(q['vpy'] - q['vp']['y']) < 0.01, q['vpy'])
    g.check('Zaun an der Abbruchkante (≥ 150 Zellen), ≥ 3 Bagger, Büsche', q['fence'] >= 150 and q['exc'] >= 3 and q['bushes'] >= 30, [q['fence'], q['exc'], q['bushes']])
    fb = await g.js(f"()=>[{M}.blockedFn(2252.2,2540,16.3),{M}.blockedFn(2252.7,2540,12.0),{M}.blockedFn(2262,2540,4.0),{M}.blockedFn(2262,2540,8.0)]")
    g.check('Zaun blockiert oben, Terrasse darunter frei, Felswand blockiert von unten', fb == [True, False, True, False], fb)
    # vom Plateau Richtung Abbruchkante laufen: der Zaun hält
    await put(g, 2236, 2547, 16, 1.5708)
    p = await walk(g, 4)
    g.check('Zaun hält: Spieler bleibt oben auf dem Plateau', p[0] < 2252.6 and abs(p[2] - 16) < 0.4, [round(v, 2) for v in p])
    # Außenhang ist begehbar
    await put(g, 2203, 2580, None, 1.5708)
    p = await walk(g, 9)
    g.check('Außenhang begehbar (Spieler steigt bis aufs Plateau)', p[2] > 15.9 and p[0] > 2230, [round(v, 2) for v in p])
    gg = await g.js(f"()=>{{const s={W}.scenes.find(s=>s.id==='geo');return s?s.people.length:0}}")
    g.check('Hobby-Geologin am Aussichtspunkt', gg >= 1, gg)

    # --- Strandkiosk: betreten und verlassen ---
    door = await g.js(f"()=>{W}.kiosk.venue.door")
    await put(g, door[0], door[1], 0, None, settle=0.6)
    await g.key('KeyF', after=1.5)
    r = await g.js(f"()=>{{const h={M}.P1.h;return {{in:!!h.room,name:h.room&&h.room.name,people:h.room&&h.room.people.length}}}}")
    g.check('Strandkiosk betreten', r['in'] and r['name'] == 'Strandkiosk am Leinpfad', r)
    g.check('Strandkiosk: Wirtin und Gäste drin', (r['people'] or 0) >= 4, r['people'])
    await g.js(f"""()=>{{const M={M};const P=M.P1,h=P.h,r=h.room,e=r.venue.exits[0];h.x=r.ox+e.x;h.z=r.oz+e.z-3;P.cam.yaw=0;h.facing=0;}}""")
    await g.page.keyboard.down('KeyW')
    for _ in range(30):
        await g.step(0.1)
        if not await g.js(f"()=>!!{M}.P1.h.room"): break
    await g.page.keyboard.up('KeyW')
    await g.step(0.2)
    e = await g.js(POS)
    dd = ((e[0] - door[0]) ** 2 + (e[1] - door[1]) ** 2) ** 0.5
    g.check('Strandkiosk verlassen: draußen an der Tür', not await g.js(f"()=>!!{M}.P1.h.room") and dd < 4, f'{dd:.1f} m')
    await g.step(0.5)
    zs = await g.js(ZONES)
    g.check('Lazy (b): Rheinufer-Zone gebaut (Promenade, Bänke, Laternen, Figuren)', zs['ufer']['built'] and zs['ufer']['stats']['props'] >= 12 and zs['ufer']['npcs'] >= 5, zs['ufer'])
    sc = await g.js(f"()=>{W}.scenes.filter(s=>['wirt','bank','angler'].includes(s.id)).map(s=>[s.id,s.people.length])")
    g.check('Mundart-Szenen am Rheinufer (Wirtin, Bank, Angler) da', len(sc) == 3 and all(n >= 1 for _, n in sc), sc)

    # --- Rheinufer: Promenade, Bänke, Laternen, Liegestühle ---
    u = await g.js(f"""()=>{{const U={W}.ufer,M={M};const wet=U.benches.filter(b=>M.mfG(M.idx(b.x,b.z))&4).length;
        const nearW=U.benches.filter(b=>{{for(let s=0;s<14;s+=0.5){{const i=M.idx(b.x+U.n[0]*s,b.z+U.n[1]*s);if(M.mfG(i)&4)return true;}}return false}}).length;
        return {{path:U.path.length,benches:U.benches.length,lamps:U.lamps.length,chairs:U.chairs.length,sand:U.sand,wet,nearW}}}}""")
    g.check('Promenade am Weisenauer Rheinufer (≥ 40 Abschnitte)', u['path'] >= 40, u['path'])
    g.check('Rheinufer: ≥ 6 Bänke, ≥ 6 Laternen, Liegestühle, Sand', u['benches'] >= 6 and u['lamps'] >= 6 and u['chairs'] >= 2 and u['sand'] >= 3, u)
    g.check('Bänke an Land und mit Blick aufs Wasser (< 14 m)', u['wet'] == 0 and u['nearW'] == u['benches'], u)

    # Dialog in Mundart mit der Kiosk-Wirtin
    t = await g.js(f"""()=>{{const M={M},s={W}.scenes.find(s=>s.id==='wirt');const h=s.people[0];const P=M.P1;P.h.x=h.x+Math.sin(h.facing)*1.2;P.h.z=h.z+Math.cos(h.facing)*1.2;
        M.startTalk(P,h);const T=M.TALK;return T?{{who:T.who,line:T.line,n:T.choices.length}}:null}}""")
    g.check('Gespräch mit der Wirtin: eigener Mundart-Dialog', t and t['who'] == 'Kiosk-Rosi' and 'Gude' in t['line'] and t['n'] == 3, t)
    await put(g, door[0] + 30, door[1], None, None, settle=0.5)
    g.check('Gespräch endet beim Weggehen', await g.js(f"()=>!{M}.TALK"))

    # --- Großberg-Siedlung ---
    gb = await g.js(f"()=>{{const G={W}.grossberg;return {{h:G.hedges.length,g:G.garages.length,u:G.garages.reduce((a,g)=>a+g.units.length,0)}}}}")
    g.check('Großberg: ≥ 40 Hecken, ≥ 2 Garagenhöfe', gb['h'] >= 40 and gb['g'] >= 2 and gb['u'] == gb['g'] * 4, gb)

    # --- (c) Lazy: weit weg (Standard-Start) → alles entsorgt, Kollision exakt zurückgenommen ---
    await g.js(f"()=>{{window.__weisNpcs=Object.values({W}.zones).flatMap(Z=>Z.npcs);window.__weisKiosk=!!{W}.kiosk.venue.room}}")
    await put(g, home[0], home[1], None, None, settle=0.5)
    zs = await g.js(ZONES)
    g.check('Lazy (c): weit weg → alle Zonen entsorgt (built/group/owned/npcs leer, disposes ≥ 1)', unbuilt(zs) and all(v['disposes'] >= 1 for v in zs.values()), zs)
    rm = await g.js("()=>[window.__weisNpcs.length,window.__weisNpcs.filter(h=>h.removed).length]")
    g.check('Lazy (c): alle Weisenau-Figuren entfernt', rm[0] >= 5 and rm[1] == rm[0], rm)
    g.check('Lazy (c): Kiosk-Innenraum mit freigegeben', await g.js("()=>window.__weisKiosk") and await g.js(f"()=>!{W}.kiosk.venue.room&&{W}.roomsFreed>=1"))
    c1 = await collision_state(g)
    g.check('Lazy (c): Kollision/ELEV/Steinbruch-Höhen exakt wie vor dem Bau', c1 == c0, c1)

    # --- (d) Lazy: erneut hin → wieder gebaut, ohne Fehler; Qualität „niedrig“ halbiert Requisiten/Figuren, keine Schatten ---
    await put(g, 2300, 2380, None, None, settle=0.3)
    zs = await g.js(ZONES)
    full = zs['sued']
    g.check('Lazy (d): Süd-Zone zum zweiten Mal gebaut', full['built'] and full['builds'] == 2 and full['stats']['meshes'] >= 8 and full['npcs'] >= 4, full)
    g.check('Lazy (d): Kollision wieder da', (await collision_state(g))['silo'] and (await collision_state(g))['elev'])
    await g.js(f"()=>{{const Q={M}.QS;window.__weisQS=[Q.lowLOD,Q.noShadow];Q.lowLOD=true;Q.noShadow=true;}}")
    await put(g, home[0], home[1], None, None, settle=0.2)
    await put(g, 2300, 2380, None, None, settle=0.3)
    low = (await g.js(ZONES))['sued']
    g.check('„niedrig“: etwa halb so viele Requisiten und Figuren', low['built'] and low['stats']['props'] <= full['stats']['props'] * 0.6 and low['npcs'] <= full['npcs'] * 0.6 + 0.5,
            [low['stats']['props'], full['stats']['props'], low['npcs'], full['npcs']])
    g.check('„niedrig“: kein castShadow', low['stats']['cast'] == 0 and full['stats']['cast'] > 0, [low['stats']['cast'], full['stats']['cast']])
    await g.js("()=>{const Q=__MEENZ.QS;[Q.lowLOD,Q.noShadow]=window.__weisQS;}")
    await put(g, home[0], home[1], None, None, settle=0.2)
    g.check('Lazy: Speicher-Zonen nach „niedrig“ wieder entsorgt', unbuilt(await g.js(ZONES)))

    # --- Schnellreise (vom Standard-Start aus: Ziel-Zone wird beim Ankommen gebaut) ---
    ft = await g.js(f"()=>{M}.ftDestinations().filter(d=>d.g==='Weisenau').map(d=>[d.n,!!d.special])")
    names = [n for n, _ in ft]
    g.check('Schnellreise: 5 Weisenau-Ziele (normale Ziele, keine „besonderen Orte“)', len(ft) == 5 and not any(sp for _, sp in ft), names)
    d = await g.js(f"()=>{{const M={M};const d=M.ftDestinations().find(d=>d.n==='Steinbruch-Aussichtspunkt');M.fastTravel(d);return {{x:d.x,z:d.z,y:d.y}}}}")
    await g.page.wait_for_function("(d)=>{const h=__MEENZ.P1.h;return Math.hypot(h.x-d.x,h.z-d.z)<1}", arg=d, polling=50, timeout=5000)
    await g.step(0.3)
    p = await g.js(POS)
    g.check('Schnellreise zum Aussichtspunkt: oben auf der Kanzel', abs(p[2] - 16.25) < 0.1, [round(v, 2) for v in p])

    if REAL:
        await screenshots(g, s, z)


async def screenshots(g, s, z):
    """Nur mit `real`: Bilder nach tests/out/ und Draw-Calls/Heap der Weisenau-Modelle."""
    await g.js(f"()=>{{const M={M};M.gameMin=15*60;M.setWeather&&M.setWeather('klar');}}")
    ds = await g.js(f"()=>{W}.synagoge.doorSide")
    yaw = await g.js(f"([x,z])=>Math.atan2(x,z)", [-ds['nx'], -ds['nz']])
    await put(g, s['door']['x'] + ds['nx'] * 15 + ds['nz'] * 4, s['door']['z'] + ds['nz'] * 15 - ds['nx'] * 4, None, yaw)
    await g.js(f"()=>{{const P={M}.P1;P.cam.pitch=-0.05;P.cam.zoom=1.2;}}")
    print('  Bild', await g.snap('weis_synagoge', 4))
    await put(g, s['pl']['x'] + ds['nx'] * 2.2, s['pl']['z'] + ds['nz'] * 2.2, None, yaw)
    await g.js(f"()=>{{const P={M}.P1;P.cam.pitch=-0.1;P.cam.zoom=0.6;}}")
    print('  Bild', await g.snap('weis_tafel', 4))
    await put(g, 2350, 2610, 16.0, -2.5)
    await g.js(f"()=>{{const P={M}.P1;P.cam.pitch=0.35;P.cam.zoom=3.0;}}")
    print('  Bild', await g.snap('weis_steinbruch', 4))
    await put(g, 2444, 2300, None, 0.0)
    await g.js(f"()=>{{const P={M}.P1;P.cam.pitch=-0.15;P.cam.zoom=2.0;}}")
    await g.step(3)
    print('  Bild', await g.snap('weis_zementwerk', 4))
    kp = await g.js(f"()=>{W}.kiosk.pos")
    n = await g.js(f"()=>{W}.ufer.n")
    yaw = await g.js(f"([x,z])=>Math.atan2(x,z)", [-n[0], -n[1]])
    await put(g, kp['x'] + n[0] * 10, kp['z'] + n[1] * 10, None, yaw)
    await g.js(f"()=>{{const P={M}.P1;P.cam.pitch=-0.1;P.cam.zoom=1.4;}}")
    await g.step(0.5)
    print('  Bild', await g.snap('weis_kiosk', 4))
    # Draw-Calls je Zone im gebauten Zustand (lazyDrawCalls zählt im echten three.js), Summe ≤ 150
    dc = {}
    for k, (x, zz) in {'syn': (s['x'] + 20, s['z']), 'ufer': (kp['x'] + n[0] * 10, kp['z'] + n[1] * 10), 'sued': (2300, 2380)}.items():
        await put(g, x, zz, None, None, settle=0.2)
        dc[k] = await g.js(f"(k)=>{W}.drawCalls(k)", k)
    zs = await g.js(ZONES)
    print('  Draw-Calls Weisenau je Zone:', dc, 'Summe', sum(dc.values()))
    print('  Statistik:', {k: v['stats'] for k, v in zs.items()}, 'NPCs:', {k: v['npcs'] for k, v in zs.items()})
    g.check('Draw-Calls Weisenau (alle Zonen zusammen) ≤ 150, je Zone gemessen > 0', all(v > 0 for v in dc.values()) and sum(dc.values()) <= 150, dc)


if __name__ == "__main__":
    run(test, real=REAL)
