# Gonsenheim + Gonsbachterrassen: Lennebergwald (dicht, instanziert, Spaziergänger), Gonsbach (Bach, Stege, Bänke),
# Ortskern (St.-Stephan-Uhren, Dorfbrunnen, Bank-Babbler), Gonsenheimer Kerb (Zeitfenster, Buden, Karussell, Kerbespruch,
# Musik, Aufräumen), Kerbezelt (begehbar), Schnellreise, Superschuh-Versteck.
# Lazy (Vertrag Welle 8): nichts beim Boot, Bau < 350 m, Freigabe > 500 m, zweiter Bau fehlerfrei.
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
G = f'{M}.GONS'
ZSTATE = "Z=>({name:Z.name,built:Z.built,group:Z.group===null,owned:Z.owned.length,npcs:Z.npcs.length,builds:Z.builds,disposes:Z.disposes})"


async def tp(g, x, z):
    await g.js(f"()=>{{const M={M},P=M.P1;if(P.car)M.exitCar(P,true);P.h.x={x};P.h.z={z};P.h.y=M.groundYFn({x},{z});P.vy=0}}")


async def tp_home(g):
    x, z = await g.js(f"()=>{M}.POI.markt")
    await tp(g, x, z)


async def zone(g, which='zone'):
    return await g.js(f"()=>({ZSTATE})({G}.{which})")


async def test(g):
    await g.start()
    g.check('Spiel läuft', await g.js(f"()=>{M}.mode") == 'play')
    keys = await g.js(f"()=>{{const G={G};return [!!G.kerb,'on' in G.kerb,Array.isArray(G.kerb.stalls),'carousel' in G.kerb,typeof G.wald.trees,Array.isArray(G.scenes),Array.isArray(G.ft),!!G.zone]}}")
    g.check('GONS = {zone, kerb:{on,stalls,carousel}, wald:{trees}, scenes, ft}', keys == [True, True, True, True, 'number', True, True, True], keys)

    # (a) Lazy: nach dem Boot am Standard-Start ist nichts gebaut – keine Zone, keine Meshes, keine NPCs
    z = await zone(g)
    g.check('(a) Hauptzone nach dem Boot leer (built=false, group=null, owned=0, npcs=0)',
            not z['built'] and z['group'] and z['owned'] == 0 and z['npcs'] == 0, z)
    allz = await g.js(f"()=>{G}.zones.map({ZSTATE})")
    g.check('(a) alle Gonsenheimer Zonen beim Boot leer (Haupt, Wald, Bachabschnitte)',
            len(allz) >= 4 and all(not a['built'] and a['group'] and a['owned'] == 0 and a['npcs'] == 0 for a in allz), allz)
    g.check('Zonen beim Lazy-Helfer angemeldet', await g.js(f"()=>{G}.zones.every(Z=>{M}.LAZY.zones.includes(Z))"))
    g.check('beim Boot keine Szenen, keine Kerb, keine Kollision', await g.js(f"()=>{G}.scenes.length===0&&!{G}.kerb.built&&{G}.hitOn===0"))

    # Schnellreise-Ziele (werden beim ersten Öffnen berechnet, nur Zahlen – baut nichts)
    names = await g.js(f"()=>{M}.ftDestinations().filter(d=>d.special).map(d=>d.n)")
    want = ['Gonsenheim – Juxplatz (Kerb)', 'Gonsenheim – Lennebergwald', 'Gonsenheim – Gonsbachtal', 'Gonsenheim – Dorfbrunnen']
    g.check('Schnellreise: vier Gonsenheimer Ziele unter „Besondere Orte“', all(n in names for n in want), [n for n in want if n not in names])
    g.check('Schnellreise-Liste baut nichts', await g.js(f"()=>{G}.zones.every(Z=>!Z.built)"))

    # 1. Lennebergwald: dicht, nur Instanzen, nur in der Nähe gebaut
    ft = await g.js(f"()=>{G}.ft.find(d=>/Lennebergwald/.test(d.n))")
    await tp(g, ft['x'], ft['z'])
    await g.step(1.5)
    zw = await zone(g, 'zoneWald')
    g.check('Wald-Zone gebaut, sobald der Spieler im Wald ist', zw['built'] and zw['owned'] > 0, zw)
    w = await g.js(f"""()=>{{const W={G}.wald;return {{trees:W.trees,cells:W.cells.length,meshes:W.meshes,paths:W.paths.length,
        allIn:W.cells.filter(c=>{M}.GONS.wald.c&&Math.hypot(c.x-W.c[0],c.z-W.c[1])<W.RAD+50).length,
        osm:{M}.AREAS.filter(a=>a.name==='Lennebergwald'&&a.kind==='forest').length}}}}""")
    g.check('Lennebergwald aus OSM gefunden', w['osm'] >= 1, w['osm'])
    g.check('dichter Wald: 3 000–25 000 zusätzliche Bäume', 3000 <= w['trees'] <= 25000, w['trees'])
    g.check('Bäume nur als InstancedMesh in Zellen (≤ 16 Zellen, ≤ 3 Meshes je Zelle)', 0 < w['cells'] <= 16 and w['meshes'] <= w['cells'] * 3, w)
    g.check('Waldwege für Spaziergänger', w['paths'] >= 3, w['paths'])
    lod = await g.js(f"()=>{{const W={G}.wald;return {{vis:W.visibleMeshes,walkers:W.walkers.length,dogs:W.walkers.filter(h=>h.gdog).length,full:W.cells.some(c=>c.meshes.every(e=>e.m.count===e.n))}}}}")
    g.check('im Wald: Zellen sichtbar, nahe Zelle mit allen Bäumen', lod['vis'] > 0 and lod['full'], lod)
    g.check('Jogger + Hundegassi unterwegs (4 Spaziergänger, davon 2 mit Hund)', lod['walkers'] == 4 and lod['dogs'] == 2, lod)
    tree = await g.js(f"()=>{{const H={G}.zoneWald.hits;for(const l of H.trees.values())return [l[0],l[1]];return null}}")
    g.check('Baumstämme sind Hindernisse (ohne HG-Schreibzugriff)', tree and await g.js(f"([x,z])=>{M}.blockedFn(x,z)", tree), tree)
    p0 = await g.js(f"()=>{G}.wald.walkers.map(h=>[h.x,h.z])")
    await g.step(2)
    p1 = await g.js(f"()=>{G}.wald.walkers.map(h=>[h.x,h.z])")
    moved = sum(1 for a, b in zip(p0, p1) if abs(a[0] - b[0]) + abs(a[1] - b[1]) > 1)
    g.check('Spaziergänger bewegen sich auf den Wegen', moved >= 3, moved)
    on_path = await g.js(f"""()=>{G}.wald.walkers.every(h=>{{const P=h.gw.path.pts;let d=1e9;for(let i=0;i+1<P.length;i++){{const a=P[i],b=P[i+1],dx=b[0]-a[0],dz=b[1]-a[1],L=dx*dx+dz*dz||1;
        const t=Math.max(0,Math.min(1,((h.x-a[0])*dx+(h.z-a[1])*dz)/L));d=Math.min(d,Math.hypot(a[0]+dx*t-h.x,a[1]+dz*t-h.z));}}return d<1.5}})""")
    g.check('Spaziergänger bleiben auf dem Weg (< 1,5 m)', on_path)
    await g.js(f"()=>{{window.__gonsW={G}.zoneWald.npcs.slice();window.__gonsTree={G}.zoneWald.hits.trees.values().next().value.slice(0,2)}}")
    await tp_home(g)
    await g.step(1.5)
    zw = await zone(g, 'zoneWald')
    gone = await g.js(f"()=>({{walkers:{G}.wald.walkers.length,cells:{G}.wald.cells.length,removed:window.__gonsW.every(h=>h.removed),tree:{M}.blockedFn(...window.__gonsTree)}})")
    g.check('weit weg: Wald-Zone entsorgt (group=null, owned=0, npcs=0)', not zw['built'] and zw['group'] and zw['owned'] == 0 and zw['npcs'] == 0 and zw['disposes'] >= 1, zw)
    g.check('weit weg: Spaziergänger entfernt, Zellen + Baum-Kollision weg', gone['walkers'] == 0 and gone['cells'] == 0 and gone['removed'] and not gone['tree'], gone)

    # 2. Gonsbach (Plan für den ganzen Bach, gebaut je Abschnitt)
    b = await g.js(f"()=>{{const B={G}.bach;return {{len:B.len,water:B.water,benches:B.benches.length,secs:B.secs.length,steg:B.bridges.filter(x=>x.kind==='steg').length,str:B.bridges.filter(x=>x.kind==='strasse').length}}}}")
    g.check('Gonsbach: > 1 km offenes Wasser im Gonsbachtal', b['water'] > 1000, b)
    g.check('Gonsbach: ≥ 8 Bänke am Ufer, ≥ 3 Abschnitte', b['benches'] >= 8 and b['secs'] >= 3, b)
    g.check('Gonsbach: Holzstege und Straßenbrücken', b['steg'] >= 3 and b['str'] >= 1, b)
    ftb = await g.js(f"()=>{G}.ft.find(d=>/Gonsbachtal/.test(d.n))")
    await tp(g, ftb['x'], ftb['z'])
    await g.step(1.2)
    sec = await g.js(f"""()=>{{const B={G}.bach;const s=B.secs.filter(s=>s.zone.built);return {{n:s.length,water:s.some(x=>!!x.water),wl:s.reduce((a,x)=>a+(x.waterLen||0),0),
        benches:B.benches.filter(o=>s.some(x=>o.s>=x.s0&&o.s<x.s1)).map(o=>{M}.blockedFn(o.x,o.z))}}}}""")
    g.check('am Bach: Abschnitt gebaut mit Wasser-Mesh', sec['n'] >= 1 and sec['water'] and sec['wl'] > 100, sec)
    g.check('Bänke im gebauten Abschnitt sind Hindernisse', len(sec['benches']) >= 2 and all(sec['benches']), sec['benches'])
    ang = await g.js(f"()=>{{const s={G}.scenes.find(s=>s.id==='gonsbach');return s?{{active:s.active,n:s.npcs.length,name:s.npcs[0]&&s.npcs[0].npcName}}:null}}")
    g.check('Angler Schorsch sitzt am Bach', ang and ang['active'] and ang['n'] == 1, ang)

    # 3. Ortskern: (b) Hauptzone baut beim Annähern; Uhren an St. Stephan, Dorfbrunnen, Szene mit Bank-Babblern
    f = await g.js(f"()=>{G}.ft.find(d=>/Dorfbrunnen/.test(d.n))")
    await tp(g, f['x'] + 4, f['z'] + 4)
    await g.step(1.2)
    z = await zone(g)
    g.check('(b) im Zentrum: Hauptzone gebaut, Meshes + NPCs vorhanden', z['built'] and not z['group'] and z['owned'] > 0 and z['npcs'] >= 3, z)
    st = await g.js(f"()=>{G}.stats.ortMeshes")
    g.check('(b) Ortskern-Meshes gebaut (Uhren, Brunnen, Bänke)', st >= 4, st)
    o = await g.js(f"()=>({{church:{G}.ort.church,fountain:{G}.ort.fountain,benches:{G}.ort.benches}})")
    g.check('St. Stephan: beide Türme mit Uhr + Kreuz', o['church'] and o['church']['towers'] == 2, o['church'])
    g.check('Dorfbrunnen + 2 Bänke', o['fountain'] and len(o['benches']) == 2, o)
    fo = o['fountain']
    g.check('Brunnen ist ein Hindernis', await g.js(f"()=>{M}.blockedFn({fo['x']},{fo['z']}+1)"))
    sc = await g.js(f"()=>{{const s={G}.scenes.find(s=>s.id==='dorfplatz');return {{active:s.active,n:s.npcs.length}}}}")
    g.check('Szene Dorfplatz aktiv mit 3 NPCs', sc['active'] and sc['n'] == 3, sc)
    await g.step(10)
    spoke = await g.js(f"()=>{G}.scenes.find(s=>s.id==='dorfplatz').talkI>1")
    g.check('Bank-Babbler unterhalten sich (Mundart)', spoke)
    talk = await g.js(f"""()=>{{const M={M},h=M.GONS.scenes.find(s=>s.id==='dorfplatz').npcs[0];M.startTalk(M.P1,h);const T=M.TALK;return T?T.line:'kein TALK'}}""")
    openers = await g.js(f"()=>{G}.convs.dorf.map(c=>c.o)")
    g.check('Gespräch mit Mundart-Dialog aus GONS.convs.dorf', talk in openers, talk)
    await g.step(4)
    await g.js(f"()=>{M}.chooseTalk(0)")
    await g.step(8)
    g.check('Gespräch endet, NPC bleibt in der Szene', await g.js(f"()=>!{M}.TALK&&{G}.scenes.find(s=>s.id==='dorfplatz').npcs[0].state==='venue'"))

    # (c) weit weg → alles freigegeben, NPCs entfernt
    await g.js(f"()=>{{window.__gonsN={G}.zone.npcs.slice()}}")
    await tp_home(g)
    await g.step(1)
    z = await zone(g)
    g.check('(c) weit weg: Hauptzone entsorgt (built=false, group=null, owned=0, npcs=0, disposes≥1)',
            not z['built'] and z['group'] and z['owned'] == 0 and z['npcs'] == 0 and z['disposes'] >= 1, z)
    c = await g.js(f"()=>({{removed:window.__gonsN.length>0&&window.__gonsN.every(h=>h.removed),inHumans:window.__gonsN.filter(h=>{M}.HUMANS.includes(h)).length,scenes:{G}.scenes.length,hit:{G}.hitOn,fountain:{M}.blockedFn({fo['x']},{fo['z']}+1)}})")
    g.check('(c) NPCs entfernt, Szenen abgebaut, Brunnen-Kollision weg', c['removed'] and c['inHumans'] == 0 and c['scenes'] == 0 and c['hit'] == 0 and not c['fountain'], c)

    # (d) erneut hin → wieder gebaut, kein Fehler beim zweiten Bau
    await tp(g, f['x'] + 4, f['z'] + 4)
    await g.step(1.2)
    z = await zone(g)
    g.check('(d) zweiter Bau: Hauptzone wieder gebaut', z['built'] and z['builds'] >= 2 and z['owned'] > 0 and z['npcs'] >= 3, z)

    # 4. Superschuh-Versteck in Gonsenheim
    sh = await g.js(f"()=>{{const s={G}.shoes;return s?{{x:s.x,z:s.z,active:s.active,blocked:{M}.blockedFn(s.x,s.z)}}:null}}")
    g.check('Superschuh-Versteck in Gonsenheim existiert und ist frei zugänglich', sh and sh['active'] and not sh['blocked'], sh)
    await g.js(f"()=>{{{M}.G.superShoes=false}}")
    await tp(g, sh['x'], sh['z'])
    await g.step(0.3)
    g.check('Superschuhe einsammelbar', await g.js(f"()=>{M}.G.superShoes===true"))
    await g.js(f"()=>{{const M={M};M.G.superShoes=false;M.P1.shoesOn=false}}")

    # 5. Kerb außerhalb des Zeitfensters: nichts aufgebaut (Spieler am Juxplatz, Zone gebaut)
    ftk = await g.js(f"()=>{G}.ft.find(d=>/Kerb/.test(d.n))")
    await g.js(f"()=>{{{M}.gameMin=9*60}}")
    await tp(g, ftk['x'], ftk['z'])
    await g.step(0.6)
    k = await g.js(f"()=>{{const K={G}.kerb;return {{zone:{G}.zone.built,on:K.on,built:K.built,stalls:K.stalls.length,car:!!K.carousel,door:!!{G}.tent.door}}}}")
    g.check('vormittags keine Kerb (on=false, nichts gebaut, Zelt zu)', k['zone'] and not k['on'] and not k['built'] and k['stalls'] == 0 and not k['car'] and not k['door'], k)

    # 6. Kerb startet im Fenster
    await g.js(f"()=>{{{M}.gameMin=15*60+5}}")
    await g.step(0.2)
    k = await g.js(f"""()=>{{const K={G}.kerb;return {{on:K.on,built:K.built,stalls:K.stalls.length,names:K.stalls.map(s=>s.name),car:!!K.carousel,tree:!!K.tree,
        closed:K.closed.length,closedOff:K.closed.every(E=>!E.car),door:!!{G}.tent.door}}}}""")
    g.check('15:05: Kerb läuft und ist aufgebaut', k['on'] and k['built'], k)
    g.check('≥ 6 Buden, Karussell, Kerbebaum', k['stalls'] >= 6 and k['car'] and k['tree'], k)
    g.check('Zufahrten über den Juxplatz gesperrt', k['closed'] >= 1 and k['closedOff'], k)
    g.check('Kerbezelt hat eine Tür', k['door'], k)
    r0 = await g.js(f"()=>{G}.kerb.carousel.rot")
    await g.step(1)
    r1 = await g.js(f"()=>{G}.kerb.carousel.rot")
    g.check('Karussell dreht sich', abs(r1 - r0) > 0.3, f'{r0:.2f} → {r1:.2f}')
    col = await g.js(f"""()=>{{const M={M},F=M.GONS.kerb.frame;const c=F.W(0,0),aisle=F.W(0,-9),s=M.GONS.kerb.stalls[0];const st=F.W(s.lx,s.lz);
        return {{car:M.blockedFn(c[0],c[1]),aisle:M.blockedFn(aisle[0],aisle[1]),stall:M.blockedFn(st[0],st[1])}}}}""")
    g.check('Kollision: Karussell + Bude blockieren, Gasse frei', col['car'] and col['stall'] and not col['aisle'], col)
    g.check('Schnellreise-Ziel Kerb (Juxplatz) frei', not await g.js(f"([x,z])=>{M}.blockedFn(x,z)", [ftk['x'], ftk['z']]), ftk)
    await g.step(1.2)
    ks = await g.js(f"""()=>{{const s={G}.scenes.find(s=>s.id==='kerb');return {{active:s.active,n:s.npcs.length,kb:!!s.kb&&/Kerbeborsch/.test(s.kb.npcName),y:s.kb&&s.kb.y,mus:{G}.music.mode}}}}""")
    g.check('Kerb-Szene: Kerbeborsch auf der Bühne + Budenleute + Besucher', ks['active'] and ks['kb'] and ks['n'] >= 6 and ks['y'] > 0.5, ks)
    g.check('Kerbmusik läuft in der Nähe (WebAudio-Modus kerb)', ks['mus'] == 'kerb', ks)
    said0 = await g.js(f"()=>{G}.kerb.speech.said")
    await g.step(15)
    sp = await g.js(f"()=>{{const s={G}.scenes.find(s=>s.id==='kerb');return {{said:{G}.kerb.speech.said,txt:s.kb.bubble?s.kb.bubble.textContent:''}}}}")
    g.check('Kerbeborsch hält seinen Kerbespruch', sp['said'] - said0 >= 2, sp)

    # 7. Kerbezelt: rein, Theke, raus
    door = await g.js(f"()=>{G}.tent.door")
    near = await g.js(f"([x,z])=>{{const v={M}.venueNear(x,z);return v&&v.id}}", [door[0], door[1]])
    g.check('Zelteingang wird als begehbarer Ort erkannt', near == 'gonszelt', near)
    await g.js(f"()=>{{const M={M};M.enterVenue(M.P1,M.GONS.tent)}}")
    await g.step(0.5)
    inside = await g.js(f"()=>{{const r={M}.INDOOR();return r&&r.venue?{{id:r.venue.id,people:r.people.length}}:null}}")
    g.check('im Kerbezelt mit Gästen und Kapelle', inside and inside['id'] == 'gonszelt' and inside['people'] >= 10, inside)
    g.check('Musik im Zelt (Modus zelt)', await g.js(f"()=>{G}.music.mode") == 'zelt')
    buy = await g.js(f"""()=>{{const M={M},P=M.P1,r=M.INDOOR();P.h.x=r.ox+5.2;P.h.z=r.oz+3;M.G.money=Math.max(M.G.money,10);P.h.health=50;const m0=M.G.money;r.venue.interact(P,r);return [m0-M.G.money,P.h.health]}}""")
    g.check('Theke: Weck, Worscht un Woi kostet 4 € und heilt', buy[0] == 4 and buy[1] == 75, buy)
    # Kerb endet, während der Spieler im Zelt ist → erst nach dem Rausgehen wird abgebaut
    await g.js(f"()=>{{{M}.gameMin=23*60+10}}")
    await g.step(0.3)
    g.check('Kerb vorbei, Spieler im Zelt: Platz bleibt bis zum Rausgehen', await g.js(f"()=>{{const K={G}.kerb;return !K.on&&K.built&&!!{G}.tent.door}}"))
    await g.js(f"()=>{{const M={M},P=M.P1,r=M.INDOOR();P.h.x=r.ox;P.h.z=r.oz+8.8;P.h.facing=0;P.cam.yaw=Math.PI}}")
    await g.key('KeyS', hold=1.5, after=0.3)
    out = await g.js(f"()=>{{const M={M},h=M.P1.h;return {{room:!!h.room,indoor:!!M.INDOOR(),d:Math.hypot(h.x-({door[0]}),h.z-({door[1]}))}}}}")
    g.check('zu Fuß durch den Ausgang raus, vor dem Zelt', not out['room'] and not out['indoor'] and out['d'] < 4, out)

    # 8. Aufräumen nach der Kerb
    await g.step(0.6)
    k = await g.js(f"""()=>{{const M={M},K=M.GONS.kerb;return {{on:K.on,built:K.built,stalls:K.stalls.length,car:!!K.carousel,door:!!M.GONS.tent.door,closed:K.closed.length,
        npcs:M.HUMANS.filter(h=>/Kerbeborsch|Budenbesitzer/.test(h.npcName||'')).length,scene:M.GONS.scenes.find(s=>s.id==='kerb').npcs.length,mus:M.GONS.music.mode}}}}""")
    g.check('23:10: Buden, Karussell, Zelt-Tür, NPCs weg', not k['on'] and not k['built'] and k['stalls'] == 0 and not k['car'] and not k['door'] and k['npcs'] == 0 and k['scene'] == 0, k)
    g.check('Zufahrten wieder offen, Musik aus', k['closed'] == 0 and k['mus'] is None, k)
    reopen = await g.js(f"([x,z])=>{{const v={M}.venueNear(x,z);return v&&v.id}}", [door[0], door[1]])
    g.check('Zelt nach der Kerb nicht mehr betretbar', reopen is None, reopen)
    clear = await g.js(f"()=>{{const M={M},F=M.GONS.kerb.frame,c=F.W(0,0);return M.blockedFn(c[0],c[1])}}")
    g.check('Platz wieder frei (keine Kerb-Kollision)', not clear)
    await g.js(f"()=>{{{M}.gameMin=16*60}}")
    await g.step(0.3)
    g.check('nächster Tag: Kerb wird wieder aufgebaut', await g.js(f"()=>{{const K={G}.kerb;return K.on&&K.built&&K.stalls.length>=6}}"))

    # 9. weit weg: Kerb + Zelt-Raum freigegeben, Zufahrten offen
    g.check('Zelt-Raum existiert nach dem Besuch', await g.js(f"()=>!!{G}.tent.room"))
    await tp_home(g)
    await g.step(1)
    k = await g.js(f"()=>{{const K={G}.kerb;return {{zone:{G}.zone.built,built:K.built,closed:K.closed.length,room:!!{G}.tent.room,door:!!{G}.tent.door,mus:{G}.music.mode,disp:{G}.zone.disposes}}}}")
    g.check('weit weg: Kerb abgebaut, Zelt-Raum freigegeben, Zufahrten offen, Musik aus',
            not k['zone'] and not k['built'] and k['closed'] == 0 and not k['room'] and not k['door'] and k['mus'] is None and k['disp'] >= 2, k)
    g.check('alle Gonsenheimer Zonen wieder leer', await g.js(f"()=>{G}.zones.every(Z=>!Z.built&&Z.group===null&&Z.owned.length===0&&Z.npcs.length===0)&&{G}.hitOn===0"))

run(test)
