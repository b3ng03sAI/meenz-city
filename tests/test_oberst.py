# Paket 36: Oberstadt, Hartenberg-Münchfeld + Zitadelle – Wälle begehbar (Treppen, Tordurchfahrten), Drususstein,
# Museum in den Kasematten, Volkspark, Universitätsmedizin, Vorgärten, Szenen mit Mundart, Schnellreise, Speicherbudget
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
O = f'{M}.OBERST'
ROOM = f"()=>{{const h={M}.P1.h;return {{in:!!h.room,name:h.room&&h.room.name,people:h.room&&h.room.people.length,y:h.y,x:h.x,z:h.z}}}}"
FT_NAMES = ['Zitadelle – Bastion Drusus (Wall)', 'Zitadelle – Stadthistorisches Museum', 'Volkspark – Spielplatz',
            'Universitätsmedizin – Besuchereingang', 'Hartenberg-Münchfeld – Wohnstraßen']
# Mundart-Merkmale: mindestens eins davon in jeder Szenen-Zeile
DIALECT = ('Ei', 'gell', 'isch', 'Isch', 'emol', 'net', 'mer', 'Gude', 'gude', 'hot', 'hawwe', 'uff', 'Uff', 'aach', 'des', 'Des',
           'Woi', 'Worscht', 'Weck', 'widder', 'kaa', 'Kaa', 'Meenz', 'mir', 'mache', 'glaab', 'Glaab', 'Gugg', 'Wissbade')


def dist(a, b):
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5


async def to(g, x, z, y=None):
    await g.js(f"([x,z,y])=>{{const h={M}.P1.h;h.x=x;h.z=z;h.y=y===null?{M}.groundYFn(x,z):y;{M}.P1.vy=0;h.sync();}}", [x, z, y])


async def test(g):
    await g.start()
    g.check('Keine Szene aktiv ohne Spieler in der Nähe', await g.js(f"()=>{O}.scenes.length>0&&{O}.scenes.every(s=>!s.active)"))
    Z = await g.js(f"""()=>{{const Z={O}.zita;return {{C:Z.C,tips:Z.tips,walls:Z.walls.length,stairs:Z.stairs.map(s=>({{bottom:s.bottom,face:s.face,L:s.L}})),
        gates:Z.gates.map(g=>({{name:g.name,mid:g.mid,hw:g.hw}})),hasVenue:!!Z.venue}}}}""")

    # 1. Zitadelle: Grundriss mit vier Bastionen um die OSM-Lage
    poi = await g.js(f"()=>{M}.POI.zitadelle")
    g.check('Zitadelle: Mittelpunkt < 60 m von POI.zitadelle', dist(Z['C'], poi) < 60, [Z['C'], poi])
    names = [t['name'] for t in Z['tips']]
    g.check('Zitadelle: vier Bastionen inkl. Bastion Drusus', len(names) == 4 and 'Bastion Drusus' in names, names)
    side = dist((Z['tips'][0]['x'], Z['tips'][0]['z']), (Z['tips'][1]['x'], Z['tips'][1]['z']))
    g.check('Zitadelle: Bastionsabstand 250–400 m (real ≈ 330 m)', 250 < side < 400, round(side))
    g.check('Zitadelle: Wallmauern außen + innen (≥ 16 Abschnitte)', Z['walls'] >= 16, Z['walls'])
    g.check('Zitadelle: Meshes gebaut', await g.js(f"()=>{O}.meshes") >= 5)

    # 2. Wallkrone begehbar (7 m), Brustwehr außen höher, Hof frei
    wall = await g.js(f"""()=>{{const O={O},Z=O.zita,R=Z.raster;let crown=null,par=null;for(let j=0;j<R.h&&!(crown&&par);j+=3)for(let i=0;i<R.w;i+=3){{const v=R.a[j*R.w+i];
        const x=R.x0+i+0.5,z=R.z0+j+0.5;if(v===1&&!crown)crown=[x,z];if(v===2&&!par)par=[x,z];}}
        return {{crown,par,yc:crown&&{M}.groundYFn(crown[0],crown[1],7.5),yp:par&&{M}.groundYFn(par[0],par[1],8.5),
          yHof:{M}.groundYFn(Z.C[0],Z.C[1],0),bHof:{M}.blockedFn(Z.C[0]+5,Z.C[1]+5,0)}}}}""")
    g.check('Wallkrone trägt auf 7 m', wall['crown'] and abs(wall['yc'] - 7) < 0.01, wall['yc'])
    g.check('Brustwehr außen 8,1 m', wall['par'] and abs(wall['yp'] - 8.1) < 0.01, wall['yp'])
    g.check('Hof auf Bodenhöhe und frei', abs(wall['yHof']) < 0.01 and not wall['bHof'], wall)

    # 3. Tordurchfahrten: unten frei (Autos, Fußgänger), oben Wallkrone
    gnames = [x['name'] for x in Z['gates']]
    g.check('Tore: mindestens zwei, eins heißt Haupttor', len(gnames) >= 2 and 'Haupttor' in gnames, gnames)
    for gt in Z['gates']:
        r = await g.js(f"(p)=>[{M}.blockedFn(p[0],p[1],0),{M}.groundYFn(p[0],p[1],0),{M}.groundYFn(p[0],p[1],7.5)]", gt['mid'])
        g.check(f"{gt['name']}: unten frei, Boden 0, oben 7 m", not r[0] and abs(r[1]) < 0.01 and abs(r[2] - 7) < 0.01, r)

    # 4. Treppen: hochlaufen bis auf die Wallkrone
    g.check('Treppen: mindestens drei', len(Z['stairs']) >= 3, len(Z['stairs']))
    for k, s in enumerate(Z['stairs'][:3]):
        await to(g, s['bottom'][0], s['bottom'][1], 0)
        await g.js(f"(f)=>{{const P={M}.P1;P.cam.yaw=f;P.h.facing=f;}}", s['face'])
        await g.step(0.2)
        await g.page.keyboard.down('KeyW')
        top = 0
        for _ in range(24):
            await g.step(0.25)
            top = max(top, await g.js(f"()=>{M}.P1.h.y"))
            if top > 6.9: break
        await g.page.keyboard.up('KeyW')
        g.check(f'Treppe {k + 1}: hochgelaufen auf ≈ 7 m', top > 6.9, round(top, 2))

    # 5. Stuntrampen (Welle 1) an der Zitadelle: Anlauf/Sprung/Landung kreuzen weder Wall noch Torgewölbe
    # Wall = Raster-Zelle (Kollision); Torgewölbe (4,4 m Decke) nur im Anlauf, nie über Rampe oder Flugbahn
    ramps = await g.js(f"""()=>{{const O={O},S={M}.STUNT,E={M}.ELEV;return S.ramps.filter(R=>Math.hypot(R.x-O.zita.C[0],R.z-O.zita.C[1])<500).map(R=>{{let wall=0,roof=0;
        for(let t=-S.RUN;t<=S.LEN+S.LAND;t+=0.5)for(const l of [-2.6,-1.3,0,1.3,2.6]){{const x=R.x+R.dx*t+R.rx*l,z=R.z+R.dz*t+R.rz*l;if(O.zitaAt(x,z))wall++;
          if(t>=0&&E.has({M}.idx(x,z)))roof++;}}return [R.id,wall,roof];}})}}""")
    g.check('Stuntrampen an der Zitadelle vorhanden (Welle 1)', len(ramps) >= 1, ramps)
    g.check('Stuntrampen: Bahn kreuzt keinen Wall, kein Gewölbe über Rampe/Landung', all(w == 0 and r == 0 for _, w, r in ramps), ramps)

    # 6. Drususstein: Modell statt Klötzchen, massiv, ~20 m
    d = await g.js(f"()=>{O}.drusus")
    g.check('Drususstein: Modell gebaut, OSM-Klötzchen ersetzt', d and d['replaced'] >= 1, d)
    g.check('Drususstein: 18–24 m hoch', d and 18 <= d['h'] <= 24, d and d['h'])
    g.check('Drususstein: massiv (Kollision)', await g.js(f"(d)=>{M}.blockedFn(d.x,d.z,0)", d))
    left = await g.js(f"(d)=>{M}.BUILDINGS.filter(b=>b.name==='Drususstein'&&Math.hypot(b.x-d.x,b.z-d.z)<20).length", d)
    g.check('Drususstein: nicht mehr in BUILDINGS', left == 0, left)

    # 7. Szenen: in Spielernähe erzeugt, sprechen Mundart, verschwinden wieder
    scenes = await g.js(f"()=>{O}.scenes.map(s=>({{id:s.id,name:s.name,x:s.x,z:s.z,lines:s.lines}}))")
    ids = {s['id'] for s in scenes}
    for want in ('zita_wall', 'zita_drusus', 'vp_play', 'vp_picnic', 'vp_dogs', 'kl_raucher', 'hb_hecke'):
        g.check(f'Szene {want} angelegt', want in ids)
    for s in scenes:
        n = sum(1 for l in s['lines'] if any(w in l for w in DIALECT))
        g.check(f"Szene {s['id']}: ≥ 5 Zeilen, überwiegend Mundart", len(s['lines']) >= 5 and n >= 0.75 * len(s['lines']), f"{n}/{len(s['lines'])}")
    for s in scenes:
        y = 7.05 if s['id'] == 'zita_wall' else None
        await to(g, s['x'] + 2.5, s['z'] + 2.5, y)
        await g.step(14)
        r = await g.js(f"(id)=>{{const s={O}.scenes.find(s=>s.id===id);return {{a:s.active,n:s.people.filter(h=>!h.removed&&h.alive).length,said:s.said||0}}}}", s['id'])
        g.check(f"Szene „{s['name']}“: aktiv, Leute da, spricht", r['a'] and r['n'] >= 2 and r['said'] >= 1, r)
        if s['id'] == 'vp_play':
            SW = f"()=>{O}.scenes.find(s=>s.id==='vp_play').swingers.map(k=>[k.a,k.h.y])"
            sw = await g.js(SW)
            await g.step(0.4)
            sw2 = await g.js(SW)
            g.check('Spielplatz: Kinder schaukeln (Sitz und Kind bewegen sich)', len(sw) >= 2 and all(abs(a[0] - b[0]) > 0.005 and abs(a[1] - b[1]) > 0.001 for a, b in zip(sw, sw2)), [sw, sw2])
    await to(g, 0, -60)
    await g.step(1)
    r = await g.js(f"()=>{O}.scenes.filter(s=>s.active||s.people.length).map(s=>s.id)")
    g.check('Szenen weg, wenn der Spieler weit weg ist', r == [], r)

    # 8. Volkspark, Universitätsmedizin, Hartenberg-Münchfeld
    v = await g.js(f"()=>{{const V={O}.volkspark;return {{kinds:[...new Set(V.play.map(p=>p.kind))],bl:V.blankets.length,sw:V.swings.length}}}}")
    g.check('Volkspark: ≥ 5 verschiedene Spielgeräte', len(v['kinds']) >= 5, v['kinds'])
    g.check('Volkspark: Picknickdecken auf der Wiese', v['bl'] >= 3, v['bl'])
    k = await g.js(f"()=>{{const K={O}.klinik;return {{signs:K.signs.length,bay:K.bay,heli:K.helipad,R:K.heliR}}}}")
    g.check('Universitätsmedizin: Beschilderung (≥ 3 Schilder)', k['signs'] >= 3, k['signs'])
    g.check('Universitätsmedizin: Liegendanfahrt, nicht auf dem Landeplatz', k['bay'] and dist((k['bay']['x'], k['bay']['z']), k['heli']) > k['R'], k['bay'])
    h = await g.js(f"()=>{{const H={O}.hartenberg;return [H.hedges,H.fences,H.mesh.length]}}")
    g.check('Hartenberg-Münchfeld: Vorgärten mit Hecken und Zäunen', h[0] >= 50 and h[1] >= 20, h)
    g.check('Hartenberg-Münchfeld: als Instanzen (≤ 2 Draw-Calls)', h[2] <= 2, h[2])
    inb = await g.js(f"""()=>{{const O={O};const P=[...O.volkspark.play,...O.volkspark.blankets,...O.klinik.signs];
        return P.filter(p=>{M}.blockedFn(p.x,p.z,0)).map(p=>[p.kind||p.text||'decke',Math.round(p.x),Math.round(p.z)])}}""")
    g.check('Spielgeräte, Decken, Schilder nicht in Gebäuden', inb == [], inb)

    # 9. Museum in den Kasematten: betreten, Leute drin, raus
    door = await g.js(f"()=>{{const v={M}.VENUES.find(v=>v.id==='zitamuseum');return v&&v.door}}")
    g.check('Museum: Tür < 100 m vom Zitadellen-Mittelpunkt', door and dist(door, Z['C']) < 100, door)
    near = await g.js(f"(d)=>{{const v={M}.venueNear(d[0],d[1]);return v&&v.id}}", door)
    g.check('Museum: venueNear an der Tür', near == 'zitamuseum', near)
    g.check('Museum: Tür nicht in der Wand', not await g.js(f"(d)=>{M}.blockedFn(d[0]+Math.sin(d[2])*1.5,d[1]+Math.cos(d[2])*1.5,0)", door))
    await to(g, door[0], door[1], 0)
    await g.step(0.6)
    await g.key('KeyF', after=1.5)
    r = await g.js(ROOM)
    g.check('Museum: betreten', r['in'] and r['name'] == 'Stadthistorisches Museum', r['name'])
    g.check('Museum: Leute drin', (r['people'] or 0) >= 5, r['people'])
    await g.js(f"""()=>{{const h={M}.P1.h,r=h.room,e=r.venue.exits[0];h.x=r.ox+e.x;h.z=r.oz+e.z-3;{M}.P1.cam.yaw=0;}}""")
    await g.page.keyboard.down('KeyW')
    for _ in range(30):
        await g.step(0.1)
        if not await g.js(f"()=>!!{M}.P1.h.room"): break
    await g.page.keyboard.up('KeyW')
    await g.step(0.1)
    o = await g.js(ROOM)
    g.check('Museum: draußen an der Tür, Bodenhöhe', not o['in'] and dist((o['x'], o['z']), door) < 2.5 and abs(o['y']) < 1, o)

    # 10. Schnellreise: fünf Ziele, ohne Duplikate, Wall-Ziel landet oben
    ft = await g.js(f"()=>{M}.ftDestinations().map(d=>d.n)")
    for n in FT_NAMES:
        g.check(f'Schnellreise: {n}', ft.count(n) == 1, ft.count(n))
    ft2 = await g.js(f"()=>{{{M}.FT.list=null;return {M}.ftDestinations().filter(d=>d.n.startsWith('Zitadelle –')).length}}")
    g.check('Schnellreise: neu aufgebaut, keine Duplikate', ft2 == 2, ft2)
    d = await g.js(f"(n)=>{{const d={M}.ftDestinations().find(d=>d.n===n);{M}.fastTravel(d);return {{x:d.x,z:d.z}}}}", FT_NAMES[0])
    await g.page.wait_for_function("(d)=>{const h=__MEENZ.P1.h;return Math.hypot(h.x-d.x,h.z-d.z)<1}", arg=d, polling=50, timeout=5000)
    await g.step(0.5)
    y = await g.js(f"()=>{M}.P1.h.y")
    g.check('Schnellreise Bastion Drusus: Spieler steht auf der Wallkrone', abs(y - 7) < 0.1, round(y, 2))

    # 11. Speicherbudget (Handy): Draw-Calls und Geometrie
    mem = await g.js(f"()=>{O}.mem")
    g.check('Speicher: ≤ 150 zusätzliche statische Meshes', mem['meshes'] <= 150, mem)
    g.check('Speicher: Geometrie + Raster < 25 MB', mem['geoBytes'] + mem['rasterBytes'] < 25e6, mem)
    print(f"  (Oberstadt: {mem['meshes']} Meshes, Geometrie {mem['geoBytes'] / 1e6:.2f} MB, Raster {mem['rasterBytes'] / 1e6:.2f} MB, Setup {mem['ms']} ms)")


run(test)
