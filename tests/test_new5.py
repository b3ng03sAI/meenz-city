# Neue Features: freie Missionen, Schwimmen + Jetski, Waffen-Cheat, Raketen/Flammenwerfer/Scharfschütze/Säge, UFO, Gokart-Rennen
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
WEAPONS = ['fist', 'bat', 'messer', 'saege', 'pistol', 'smg', 'shotgun', 'rifle', 'scharf', 'minigun', 'flammen', 'rpg', 'molotov', 'grenade']
PLAYER = f"()=>{{const P={M}.P1;return {{x:P.h.x,z:P.h.z,y:P.h.y,swim:!!P.swim,car:!!P.car}}}}"


async def walk(g, sec):
    await g.page.keyboard.down('KeyW')
    await g.step(sec)
    await g.page.keyboard.up('KeyW')
    return await g.js(PLAYER)


async def test(g):
    await g.start()
    await g.reseed(1)
    g.check('Spiel läuft', await g.js(f"()=>{M}.mode") == 'play')
    free = await g.js(f"()=>{M}.MISSIONS.filter(m=>m.free).map(m=>m.id)")
    v31 = ['erstflug', 'luftbild', 'jetski', 'eis', 'oldtimer', 'ufojagd']
    g.check('6 freie V31-Missionen in Reihenfolge da', [m for m in free if m in v31] == v31, free)

    # Schwimmen: Ufer neben dem zweiten Jetski suchen, ins Wasser laufen, wieder raus
    n = await g.js(f"()=>{M}.CARS.filter(c=>c.T.jetski).length")
    g.check('4 Jetskis', n == 4, n)
    shore = await g.js(f"""()=>{{const M={M},P=M.P1;const w=M.CARS.filter(c=>c.T.jetski)[1];let bx=null;
        for(let r=4;r<60&&!bx;r+=2)for(let a=0;a<6.28;a+=0.3){{const x=w.x+Math.cos(a)*r,z=w.z+Math.sin(a)*r;if(!M.swimHere(x,z,0)&&!M.blocked(x,z)){{bx=[x,z,a];break;}}}}
        if(!bx)return false;P.h.x=bx[0];P.h.z=bx[1];P.h.y=0;P.cam.yaw=Math.atan2(-Math.cos(bx[2]),-Math.sin(bx[2]));return true}}""")
    g.check('Uferstelle neben Jetski gefunden', shore)
    if shore:
        p = await walk(g, 3)
        g.check('ins Wasser gelaufen → schwimmt unter Wasserlinie', p['swim'] and -7 < p['y'] < -4, p)
        await g.js(f"()=>{{const P={M}.P1;P.cam.yaw+=Math.PI}}")
        p = await walk(g, 6)
        g.check('wieder rausgelaufen → schwimmt nicht, Bodenhöhe', not p['swim'] and abs(p['y']) < 0.5, p)

    # Jetski fahren, im Wasser aussteigen, schwimmen
    await g.js(f"()=>{{const M={M},P=M.P1;const j=M.CARS.filter(c=>c.T.jetski)[0];P.h.x=j.x;P.h.z=j.z;M.enterCar(P,j)}}")
    await g.page.keyboard.down('KeyW'); await g.step(6); await g.page.keyboard.up('KeyW')
    kmh = await g.js(f"()=>Math.round({M}.P1.car.speed*3.6)")
    g.check('Jetski fährt schnell (> 40 km/h)', kmh > 40, f'{kmh} km/h')
    await g.key('KeyF', after=1)
    p = await g.js(PLAYER)
    g.check('vom Jetski ins Wasser → schwimmt', not p['car'] and p['swim'] and -7 < p['y'] < -4, p)
    p0 = p
    p = await walk(g, 4)
    d = ((p['x'] - p0['x']) ** 2 + (p['z'] - p0['z']) ** 2) ** 0.5
    g.check('Schwimmen bewegt den Spieler (> 3 m in 4 s)', p['swim'] and d > 3, f'{d:.1f} m')

    # Waffen-Cheat + Waffen
    owned = await g.js(f"()=>{{const M={M},P=M.P1;M.CHEAT.codes.MEENZERWAFFE(P);return Object.keys(P.owned).filter(k=>P.owned[k])}}")
    g.check('Cheat MEENZERWAFFE gibt alle 14 Waffen', sorted(owned) == sorted(WEAPONS), owned)
    r = await g.js(f"()=>{{const M={M},P=M.P1;P.h.x=M.POI.markt[0];P.h.z=M.POI.markt[1];P.h.y=0;P.swim=false;P.weapon='rpg';M.playerFire(P,{{fireP:true,aim:true}});return M.ROCKETS.length}}")
    g.check('Raketenwerfer feuert eine Rakete', r == 1, r)
    await g.step(2)
    g.check('Rakete nach 2 s eingeschlagen', await g.js(f"()=>{M}.ROCKETS.length") == 0)
    fl = await g.js(f"""()=>{{const M={M},P=M.P1;P.weapon='flammen';const m0=P.mag.flammen;
        for(let i=0;i<60;i++){{M.playerFire(P,{{fire:true}});M.update(1/60);}}return [m0,P.mag.flammen]}}""")
    g.check('Flammenwerfer verbraucht Munition', fl[1] < fl[0], fl)
    await g.step(0.5)  # Feuerpause (fireT) des Flammenwerfers ablaufen lassen – der Alttest schoss hier ins Leere
    sn = await g.js(f"()=>{{const M={M},P=M.P1;P.weapon='scharf';P.h.aiming=true;const m0=P.mag.scharf;M.playerFire(P,{{fireP:true,aim:true}});return [m0,P.mag.scharf]}}")
    g.check('Scharfschützengewehr: ein Schuss = eine Patrone', sn[1] == sn[0] - 1, sn)

    # UFO: Anflug → (Schweben) → Beamen → Flucht → weg
    ph = await g.js(f"""()=>{{const M={M};M.ufoStart(true);const seen=[];for(let i=0;i<60*70;i++){{M.update(1/60);
        if(seen[seen.length-1]!==M.UFO.phase)seen.push(M.UFO.phase);if(!M.UFO.on)break;}}return [seen,M.UFO.on]}}""")
    seen, on = ph
    g.check('UFO durchläuft Anflug → Beamen → Flucht', [s for s in seen if s in ('anflug', 'beam', 'flucht')] == ['anflug', 'beam', 'flucht'], seen)
    g.check('UFO ist nach spätestens 70 s wieder weg', on is False, on)

    await g.reseed(7)   # Rennstrecke und KI-Fahrer unabhängig vom Zufallsverbrauch anderer Features
    # Gokart: Angebot, einsteigen, Rennen, Zieleinlauf mit Preisgeld
    k = await g.js(f"""()=>{{const M={M},P=M.P1;M.setWanted(0);if(M.activeMission)M.activeMission.timer=0.001;M.update(1/60);if(P.car)M.exitCar(P,true);
        P.h.x=M.POI.markt[0];P.h.z=M.POI.markt[1];P.h.y=0;M.KART.next=0;window.__reseed(7);for(let i=0;i<5&&!M.KART.offer;i++)M.kartOffer();
        const o=M.KART.offer;return {{why:M.KART.why||null,mission:M.activeMission&&M.activeMission.id,offer:!!o,len:o&&o.route.len}}}}""")
    g.check('Gokart-Angebot kommt', k['offer'], k)
    if not k['offer']:
        return
    g.check('Rennstrecke > 500 m', k['len'] > 500, round(k['len']))
    race = await g.js(f"()=>{{const M={M},P=M.P1;const c=M.KART.offer.c;P.h.x=c.x;P.h.z=c.z;M.enterCar(P,c);M.update(1/60);return !!M.KART.race}}")
    g.check('Einsteigen startet das Rennen', race)
    await g.step(50)
    st = await g.js(f"()=>{{const K={M}.KART.race;return {{ai:K.karts.map(k=>k.lap*K.R.len+k.s),n:K.karts.length,boxes:K.boxes.length}}}}")
    g.check('5 KI-Karts fahren die Strecke (> 500 m in 50 s)', st['n'] == 5 and all(s > 500 for s in st['ai']), [round(s) for s in st['ai']])
    g.check('Item-Boxen auf der Strecke', st['boxes'] > 0, st['boxes'])
    money0 = await g.js(f"()=>{{const M={M};M.KART.race.player.lap=2;return M.G.money}}")
    await g.step(6)
    fin = await g.js(f"()=>[!!{M}.KART.race,{M}.G.money]")
    g.check('Rennen nach Zieleinlauf beendet', fin[0] is False)
    g.check('Sieg bringt 1500 € Preisgeld', fin[1] - money0 == 1500, f'{money0}→{fin[1]}')

    # Kettensäge zuletzt: der Test-Passant verbraucht Zufallszahlen und darf die geseedete Folge davor nicht verschieben
    await g.js(f"()=>{{const M={M};if(M.P1.car)M.exitCar(M.P1,true);M.P1.h.x=M.POI.markt[0];M.P1.h.z=M.POI.markt[1];M.P1.h.y=0;}}")
    saw = await g.js(f"()=>{{const M={M},P=M.P1;const h=M.mkHuman();h.x=P.h.x+1.2;h.z=P.h.z;h.y=P.h.y;const hp=h.health;P.weapon='saege';P.h.aiming=false;P.aimT=0;P.fireT=0;P.swim=false;P.h.facing=Math.PI/2;for(let i=0;i<30;i++){{M.playerFire(P,{{fire:true,fireP:i==0}});M.update(1/60);}}return [hp,h.health]}}")
    g.check('Kettensäge verletzt einen Passanten direkt davor', saw[1] < saw[0], saw)

run(test)
