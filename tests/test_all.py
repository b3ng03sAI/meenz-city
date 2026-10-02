# Regression quer durch: Fliegerdackel, Marktfrühstück + Mittrinken, Pilz-Trip, Dachszene, Jetpack, Auto + Motor, Karte/Tasten
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run


async def test(g):
    await g.start()
    M = '__MEENZ'
    # Fliegerdackel: Besuch + Vorbeiflug
    await g.js(f"()=>{{{M}.DOGS[0].nextT=0}}"); await g.step(0.7)
    await g.js(f"()=>{{{M}.DOGS[0].buzz={{t:5,said:false,side:1}}}}"); await g.step(3)
    g.check('Dackel aktiv', await g.js(f"()=>{M}.DOGS.length") > 0)

    # Marktfrühstück: Brezel-Schalter (E), dann mit einem Gast trinken (G)
    await g.js(f"()=>{{const B={M}.BREZEL,h={M}.P1.h;h.x=B.x+1.2;h.z=B.z;}}"); await g.step(0.6)
    await g.key('KeyE', after=6)
    g.check('Markt läuft nach Brezel-Schalter', await g.js(f"()=>{M}.MARKT.on===true"))
    found = await g.js(f"""()=>{{const M={M};const p=M.MARKT.people.find(h=>h.mk&&h.mk.role==='guest'&&h.state==='markt'&&!h.mk.arrive);
        if(!p)return false;M.P1.h.x=p.x+1;M.P1.h.z=p.z;return true}}""")
    g.check('Marktgast gefunden', found)
    await g.step(0.3); await g.key('KeyG', after=2)
    drunk = await g.js(f"()=>{M}.P1.drunk")
    g.check('Mittrinken macht betrunken', drunk > 0, round(drunk, 2))

    # Pilz-Trip
    await g.js(f"()=>{{{M}.P1.trip={{t:20,dur:110}}}}"); await g.step(3)
    shapes, scaled = await g.js(f"()=>[{M}.TRIP.shapes.length,{M}.TRIP.scaled.size]")
    g.check('Trip erzeugt Formen', shapes > 0 and scaled > 0, f'{shapes}/{scaled}')

    # Dachszene: Spieler auf ein aktives Dach mit Leuten
    roof = await g.js(f"""()=>{{const M={M};const sc=[...M.ROOF.active.values()].find(s=>s&&s.people.length);
        if(!sc)return null;const h=M.P1.h;h.x=sc.b.x+3;h.z=sc.b.z+3;h.y=sc.v+0.1;return sc.key}}""")
    g.check('aktive Dachszene vorhanden', roof, roof); await g.step(3)

    # Jetpack: Leertaste halten
    await g.key('Space', after=0.1); y0 = await g.js(f"()=>{M}.P1.h.y")
    await g.key('Space', hold=1.5, after=0)
    y1 = await g.js(f"()=>{M}.P1.h.y")
    g.check('Jetpack hebt ab', y1 > y0 + 1, f'{y0:.1f}→{y1:.1f}'); await g.step(2.5)

    # Auto knacken, Gas geben, Motorgeräusch
    ok = await g.js(f"""()=>{{const M={M};const c=M.CARS.find(c=>c.ai.mode==='parked'&&!c.T.boat);if(!c)return false;
        M.P1.h.x=c.x-2;M.P1.h.z=c.z;M.P1.h.y=0;M.tryEnterExit(M.P1);return !!M.P1.car}}""")
    g.check('in geparktes Fahrzeug eingestiegen', ok)
    p0 = await g.js(f"()=>[{M}.P1.car.x,{M}.P1.car.z]")
    await g.key('KeyW', hold=3, after=0)
    eng = await g.js(f"()=>{{const E={M}.ENGINES[0];return E?[E.key,Math.round(E.rpm)]:null}}")
    g.check('Motor läuft mit Drehzahl', eng and eng[1] > 0, eng)
    d = await g.js(f"(p)=>{{const c={M}.P1.car;return c?Math.hypot(c.x-p[0],c.z-p[1]):0}}", p0)
    g.check('Fahrzeug fährt los (Strecke in 3 s)', d > 5, f'{d:.1f} m')

    # Karte auf/zu, Tastenübersicht
    await g.key('KeyM'); g.check('Karte öffnet', await g.js(f"()=>{M}.mode") == 'map')
    await g.key('KeyM'); g.check('Karte schließt', await g.js(f"()=>{M}.mode") == 'play')
    await g.key('KeyK')

run(test)
