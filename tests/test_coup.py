# Der große Coup im Gutenberg-Museum: Missionskette (Crew, Fluchtwagen, Ausrüstung, Plan, Finale), Wachleute mit
# Sichtkegeln, Alarm, Fahndung, Flucht über die Rheinbrücke, Belohnung, Zeitungsartikel, Speicherstand.
#   python3 tests/test_coup.py        # Assert-Test (Stub)
#   python3 tests/test_coup.py real   # Screenshots Museum + Zeitung nach tests/out/ (real.html, SwiftShader)
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run, OUT

M = '__MEENZ'
STATE = f"()=>{{const C={M}.COUP;return {{stage:C.stage,crew:[...C.crew],car:C.car,gear:[...C.gear],plan:C.plan,alarm:C.alarm,done:C.done,loot:C.loot}}}}"
ACTIVE = f"()=>{{const a={M}.activeMission;return a?a.id:null}}"


async def start_mission(g, mid, at=None):
    """Spieler zum Startpunkt (oder `at`) stellen und die Mission direkt starten."""
    await g.js(f"""([id,at])=>{{const M={M},P=M.P1;if(P.car)M.exitCar(P,true);const m=M.MISSIONS.find(m=>m.id===id);const p=at||m.start;
        P.h.x=p[0];P.h.z=p[1];P.h.y=M.groundYFn(p[0],p[1],0);M.startMission(m,P)}}""", [mid, at])
    await g.step(0.1)


async def put_local(g, lx, lz):
    """Spieler im Museum auf Raumkoordinaten stellen."""
    await g.js(f"([x,z])=>{{const h={M}.P1.h,r=h.room;h.x=r.ox+x;h.z=r.oz+z;h.y=r.oy;h.vx=h.vz=0}}", [lx, lz])


async def buy_gear(g, cat, name):
    """Laden der Kategorie betreten, an die Theke, F, Ware per Ziffer kaufen. Liefert (Preisdifferenz, Ware im Menü?)."""
    await g.js(f"""(cat)=>{{const M={M},P=M.P1;const [px,pz]=M.ppos(P);let b=null,bd=1e18;
        for(const s of M.SHOPS){{if(s.cat!==cat||s.inVenue)continue;const d=(s.x-px)**2+(s.z-pz)**2;if(d<bd){{bd=d;b=s}}}}
        M.enterShop(P,b);const k=P.h.room.keeper;P.h.x=k.x;P.h.z=k.z+1.4}}""", cat)
    await g.step(0.2)
    await g.key('KeyF', after=0.1)
    idx = await g.js("(n)=>[...document.querySelectorAll('#shopitems .item')].findIndex(b=>b.textContent.includes(n))", name)
    m0 = await g.js(f"()=>{M}.G.money")
    if idx >= 0:   # Kauf passiert synchron im keydown – Geld vor dem nächsten Schritt lesen (sonst zahlt die Mission schon aus)
        await g.page.keyboard.down(f'Digit{idx + 1}'); await g.page.keyboard.up(f'Digit{idx + 1}')
    m1 = await g.js(f"()=>{M}.G.money")
    await g.js(f"()=>{M}.exitShop({M}.P1)")
    await g.step(0.1)
    return m0 - m1, idx >= 0


async def test(g):
    await g.start()
    g.check('Spiel läuft', await g.js(f"()=>{M}.mode") == 'play')
    s = await g.js(STATE)
    g.check('COUP-Startzustand: stage 0, nix gesammelt, plan null, kein Alarm',
            s == {'stage': 0, 'crew': [], 'car': None, 'gear': [], 'plan': None, 'alarm': False, 'done': False, 'loot': False}, s)
    door = await g.js(f"()=>{{const v={M}.COUP.venue;return v&&v.door&&[v.door[0],v.door[1]]}}")
    g.check('Museumstür am Liebfrauenplatz (Haus zum Römischen Kaiser)', door and abs(door[0] - 113) < 8 and abs(door[1] + 88) < 8, door)
    await g.js(f"()=>{{{M}.G.money=20000}}")

    # Gating: Plan-Mission startet nicht, solange die Kette nicht so weit ist
    await g.js(f"()=>{{const M={M},P=M.P1,p=M.COUP.hideout;P.h.x=p[0];P.h.z=p[1];P.h.y=M.groundYFn(p[0],p[1],0)}}")
    await g.step(5)
    g.check('am Versteck startet ohne Vorstufen keine Mission', await g.js(ACTIVE) is None, await g.js(ACTIVE))

    # 1. Kette startet per Hinlaufen zum Professer
    await g.js(f"()=>{{const M={M},P=M.P1,p=M.COUP.contact;P.h.x=p[0];P.h.z=p[1];P.h.y=M.groundYFn(p[0],p[1],0)}}")
    await g.step(0.5)
    g.check('Hinlaufen startet coup_crew', await g.js(ACTIVE) == 'coup_crew', await g.js(ACTIVE))
    g.check('stage 1 nach Kettenstart', (await g.js(STATE))['stage'] == 1)
    n = await g.js(f"()=>{M}.activeMission.npcs.length")
    g.check('drei Spezialisten in der Stadt', n == 3, n)
    for i in range(3):
        await g.js(f"(i)=>{{const M={M},h=M.activeMission.npcs[i],P=M.P1;P.h.x=h.x+1.5;P.h.z=h.z;P.h.y=M.groundYFn(P.h.x,P.h.z,0)}}", i)
        await g.step(0.3)
        crew = (await g.js(STATE))['crew']
        g.check(f'Spezialist {i + 1} angeheuert', len(crew) == i + 1, crew)
    s = await g.js(STATE)
    g.check('3 Leute → Mission gewonnen, stage 2', await g.js(ACTIVE) is None and s['stage'] == 2
            and await g.js(f"()=>!!{M}.G.done.coup_crew"), s)
    g.check('Crew sind edwin, fritzi, schorsch', sorted(s['crew']) == ['edwin', 'fritzi', 'schorsch'], s['crew'])

    # 2. Fluchtwagen
    await start_mission(g, 'coup_car')
    g.check('coup_car aktiv mit Sportwagen', await g.js(f"()=>{{const a={M}.activeMission;return a&&a.id==='coup_car'&&a.car&&a.car.id==='sport'}}"))
    slow = await g.js(f"""()=>{{const M={M},P=M.P1,G=M.COUP.garage;const c=new M.Car('kleinwagen',G[0],G[1],G[2]||0,{{ctrl:'none'}});c.ai={{mode:'parked'}};c.sync();
        P.h.x=c.x+2;P.h.z=c.z;M.enterCar(P,c);return P.car===c}}""")
    await g.step(1)
    g.check('langsamer Kleinwagen in der Garage zählt nicht', slow and await g.js(ACTIVE) == 'coup_car')
    await g.js(f"()=>{{const M={M},P=M.P1,c=P.car;M.exitCar(P,true);c.remove()}}")
    await g.js(f"()=>{{const M={M},P=M.P1,c=M.activeMission.car;P.h.x=c.x+2;P.h.z=c.z;M.enterCar(P,c)}}")
    await g.step(0.2)
    st = await g.js(f"()=>({{st:{M}.activeMission.stage,w:{M}.wanted}})")
    g.check('Sportwagen geklaut: Ziel Garage, Alarmanlage gibt einen Stern', st['st'] == 1 and st['w'] >= 1, st)
    await g.js(f"()=>{{const M={M},c=M.P1.car,G=M.COUP.garage;c.x=G[0];c.z=G[1];c.vx=c.vz=0;c.speed=0;c.sync()}}")
    await g.step(0.3)
    s = await g.js(STATE)
    g.check('Fluchtwagen in der Garage → stage 3, car=sport', await g.js(ACTIVE) is None and s['stage'] == 3 and s['car'] == 'sport', s)
    await g.js(f"()=>{{const M={M};if(M.P1.car)M.exitCar(M.P1,true);M.setWanted(0)}}")

    # 3. Ausrüstung
    await start_mission(g, 'coup_gear')
    g.check('coup_gear aktiv', await g.js(ACTIVE) == 'coup_gear')
    for cat, name, price in [(11, 'Störsender', 1500), (13, 'Glasschneider', 600), (2, 'Sturmhauben', 300)]:
        paid, listed = await buy_gear(g, cat, name)
        g.check(f'{name} im Ladenmenü (Kategorie {cat})', listed)
        g.check(f'{name} kostet €{price} (Geld abgezogen)', paid == price, paid)
    await g.step(0.3)
    s = await g.js(STATE)
    g.check('Ausrüstung komplett → stage 4', await g.js(ACTIVE) is None and s['stage'] == 4 and sorted(s['gear']) == ['glasschneider', 'stoersender', 'sturmhaube'], s)
    paid, listed = await buy_gear(g, 11, 'Störsender')
    g.check('nach stage 3 wird kein Störsender mehr angeboten', not listed and paid == 0)

    # 4. Plan – beide Varianten per Ziffer im eigenen Menü
    for key, plan in [('Digit2', 'laut'), ('Digit1', 'leise')]:
        await g.js(f"()=>{{const M={M};delete M.G.done.coup_plan;M.COUP.stage=4}}")
        await start_mission(g, 'coup_plan')
        vis = await g.js("()=>{const e=document.getElementById('coupplan');return !!e&&!e.hidden}")
        g.check(f'Planungsmenü offen ({plan})', vis and await g.js(f"()=>{M}.COUP.menuOpen"))
        await g.key(key, after=0.2)
        s = await g.js(STATE)
        g.check(f'{key} wählt plan={plan}, Mission gewonnen, stage 5', s['plan'] == plan and s['stage'] == 5 and await g.js(ACTIVE) is None, s)
        g.check(f'Menü nach Wahl ({plan}) zu', not await g.js(f"()=>{M}.COUP.menuOpen"))

    save5 = await g.js(f"()=>JSON.parse(JSON.stringify({M}.snapshot()))")

    # 5a. Finale leise: Versteckt bleiben → kein Alarm, Beute leise holen, raus → 4 Sterne
    await start_mission(g, 'coup_finale')
    car = await g.js(f"()=>{{const a={M}.activeMission;return a&&a.car&&a.car.id}}")
    g.check('Finale: Fluchtwagen vom Typ COUP.car an der Garage', car == 'sport', car)
    await g.js(f"()=>{M}.enterVenue({M}.P1,{M}.COUP.venue)")
    await g.step(0.2)
    info = await g.js(f"()=>{{const a={M}.activeMission,r={M}.P1.h.room;return {{phase:a.phase,timer:a.timer,guards:r.coupGuards.length,room:r.name}}}}")
    g.check('im Museum: Phase inside, Timer läuft, 3 Wachleute', info['phase'] == 'inside' and info['timer'] and info['guards'] == 3, info)
    vis = await g.js(f"()=>{{const M={M};M.snap(1);return M.P1.h.room.coupGuards.every(h=>h.g.visible)}}")
    g.check('Wachleute sind beim Rendern sichtbar (trotz INDOOR)', vis)
    p0 = await g.js(f"()=>{M}.P1.h.room.coupGuards.map(h=>[h.x,h.z,h.facing])")
    await put_local(g, -5, 13.5)
    seen = False
    for _ in range(20):
        await g.step(1)
        seen = seen or await g.js(f"()=>{M}.COUP.alarm")
    g.check('20 s im Foyer außer Sicht: kein Alarm', not seen)
    p1 = await g.js(f"()=>{M}.P1.h.room.coupGuards.map(h=>[h.x,h.z,h.facing])")
    g.check('Wachleute patrouillieren/drehen sich', all(abs(a[0] - b[0]) + abs(a[1] - b[1]) + abs(a[2] - b[2]) > 0.3 for a, b in zip(p0, p1)))
    await put_local(g, 0, 0.3)
    await g.step(0.2)
    await g.key('KeyF', after=3)
    s = await g.js(STATE)
    g.check('Druckstock leise geschnappt (Glasschneider), kein Alarm', s['loot'] and not s['alarm'], s)
    plate = await g.js(f"()=>{M}.P1.h.room.coupPlate.visible")
    g.check('Druckstock aus der Vitrine verschwunden', plate is False)
    await g.js(f"()=>{M}.exitVenue({M}.P1)")
    await g.step(0.2)
    esc = await g.js(f"()=>({{phase:{M}.activeMission.phase,w:{M}.wanted,t:{M}.activeMission.timer}})")
    g.check('raus mit Beute ohne Alarm: Flucht mit 4 Sternen, Timer aus', esc['phase'] == 'escape' and esc['w'] == 4 and esc['t'] is None, esc)
    await g.js(f"(s)=>{M}.applySave(s)", save5)
    await g.step(0.2)

    # 5b. Finale leise: gesehen werden → Alarm
    await start_mission(g, 'coup_finale')
    await g.js(f"()=>{M}.enterVenue({M}.P1,{M}.COUP.venue)")
    await g.step(0.2)
    g.check('leise: beim Betreten kein Alarm', not await g.js(f"()=>{M}.COUP.alarm"))
    await g.js(f"()=>{{const h={M}.P1.h,gd=h.room.coupGuards[0];h.x=gd.x+Math.sin(gd.facing)*3;h.z=gd.z+Math.cos(gd.facing)*3;h.vx=h.vz=0}}")
    await g.step(0.2)
    al = await g.js(f"()=>({{a:{M}.COUP.alarm,w:{M}.wanted}})")
    g.check('vor einem Wachmann gesehen → Alarm, Fahndung >= 4', al['a'] and al['w'] >= 4, al)
    await g.js(f"(s)=>{M}.applySave(s)", save5)
    await g.step(0.2)
    s = await g.js(STATE)
    g.check('abgebrochenes Finale setzt Alarm/Beute zurück, stage bleibt 5', not s['alarm'] and not s['loot'] and s['stage'] == 5, s)

    # 5c. Finale laut: Einbruch → Alarm, 4 Sterne, Wachleute wehren sich; Flucht über die Brücke ins Versteck
    await g.js(f"()=>{{{M}.COUP.plan='laut'}}")
    await start_mission(g, 'coup_finale')
    await g.js(f"()=>{M}.enterVenue({M}.P1,{M}.COUP.venue)")
    await g.step(0.2)
    al = await g.js(f"()=>({{a:{M}.COUP.alarm,w:{M}.wanted}})")
    g.check('laut: Einbruch löst Alarm aus, wanted >= 4', al['a'] and al['w'] >= 4, al)
    await g.js(f"()=>{{const P={M}.P1;P.armor=100;P.h.health=100}}")
    await put_local(g, 0, 0.3)
    await g.step(1.5)
    g.check('laut: Wachleute ziehen die Waffe', await g.js(f"()=>{M}.P1.h.room.coupGuards.some(h=>h.gun.visible)"))
    await g.key('KeyF', after=0.2)
    g.check('laut: Druckstock geschnappt', (await g.js(STATE))['loot'])
    await g.js(f"()=>{M}.exitVenue({M}.P1)")
    await g.step(0.2)
    esc = await g.js(f"()=>({{phase:{M}.activeMission&&{M}.activeMission.phase,w:{M}.wanted}})")
    g.check('laut: Flucht mit 5 Sternen', esc['phase'] == 'escape' and esc['w'] == 5, esc)
    await g.js(f"()=>{{const M={M},P=M.P1,p=M.COUP.hideout;P.h.x=p[0];P.h.z=p[1];P.h.y=M.groundYFn(p[0],p[1],0)}}")
    await g.step(0.3)
    g.check('Versteck ohne Brücke erreicht → noch nicht gewonnen', await g.js(ACTIVE) == 'coup_finale')
    await g.js(f"""()=>{{const M={M},P=M.P1,b=M.BRIDGES[0];const x=b.A[0]+b.U[0]*b.L/2,z=b.A[1]+b.U[1]*b.L/2;P.h.x=x;P.h.z=z;P.h.y=M.groundYFn(x,z,30)}}""")
    await g.step(0.3)
    g.check('über die Theodor-Heuss-Brücke', await g.js(f"()=>!!{M}.activeMission.crossed"))
    money0 = await g.js(f"()=>{M}.G.money")
    await g.js(f"()=>{{const M={M},P=M.P1,p=M.COUP.hideout;P.h.x=p[0];P.h.z=p[1];P.h.y=M.groundYFn(p[0],p[1],0)}}")
    await g.step(0.3)
    money1 = await g.js(f"()=>{M}.G.money")
    s = await g.js(STATE)
    g.check('Versteck nach Brücke → Finale gewonnen, done, stage 6', await g.js(ACTIVE) is None and s['done'] and s['stage'] == 6
            and await g.js(f"()=>!!{M}.G.done.coup_finale"), s)
    g.check('Belohnung €25.000', money1 - money0 == 25000, money1 - money0)
    g.check('Fahndung im Versteck aufgehoben', await g.js(f"()=>{M}.wanted") == 0)
    news = await g.js("()=>{const e=document.getElementById('coupnews');return e&&!e.hidden?e.textContent:''}")
    g.check('Zeitungsartikel sichtbar mit Schlagzeile', 'Druckstock futsch' in news and 'BLÄTTCHE' in news, news[:80])
    g.check('Zeitung zeigt die Statistik (Plan laut, Alarm ja, Beute)', 'laut' in news and 'Alarm: ja' in news and '25.000' in news)
    await g.step(26)
    g.check('Zeitung verschwindet nach Ablauf', await g.js("()=>document.getElementById('coupnews').hidden"))

    # 6. Speicherstand
    snap = await g.js(f"()=>{M}.snapshot().coup")
    g.check('snapshot enthält Coup-Fortschritt', snap and snap['stage'] == 6 and snap['done'] is True and snap['plan'] == 'laut'
            and len(snap['crew']) == 3 and len(snap['gear']) == 3 and snap['car'] == 'sport', snap)
    old = await g.js(f"()=>{{const M={M};const s=JSON.parse(JSON.stringify(M.snapshot()));delete s.coup;return M.applySave(s)}}")
    s = await g.js(STATE)
    g.check('alter Spielstand ohne coup lädt → Kette zurück auf Anfang',
            old and s == {'stage': 0, 'crew': [], 'car': None, 'gear': [], 'plan': None, 'alarm': False, 'done': False, 'loot': False}, s)
    await g.js(f"(s)=>{M}.applySave(s)", save5)
    s = await g.js(STATE)
    g.check('Spielstand mit coup (stage 5) wird geladen', s['stage'] == 5 and s['plan'] == 'leise' and s['car'] == 'sport' and len(s['crew']) == 3, s)
    bad = await g.js(f"()=>{{const M={M};const s=JSON.parse(JSON.stringify(M.snapshot()));s.coup={{stage:'x',crew:['nobody'],car:'ufo',gear:[1],plan:'egal'}};M.applySave(s);return M.COUP.stage===0&&!M.COUP.crew.length&&M.COUP.car===null&&!M.COUP.gear.length&&M.COUP.plan===null}}")
    g.check('kaputte coup-Daten werden verworfen', bad)


async def shots(g):
    await g.start()
    await g.js(f"()=>{{const C={M}.COUP;C.stage=5;C.plan='leise';C.car='sport';C.crew=['edwin','fritzi','schorsch'];C.gear=['stoersender','glasschneider','sturmhaube']}}")
    await start_mission(g, 'coup_finale')
    await g.js(f"()=>{M}.enterVenue({M}.P1,{M}.COUP.venue)")
    await g.step(0.5)
    await g.js(f"()=>{{const P={M}.P1,h=P.h,r=h.room;h.x=r.ox+10.5;h.z=r.oz+8;h.facing=P.cam.yaw=Math.atan2(-10.5,-14);P.cam.pitch=0.25}}")
    await g.step(4)
    print('  Bild:', await g.snap('coup_museum'))
    await g.js(f"()=>{{const P={M}.P1,h=P.h,r=h.room;h.x=r.ox-3;h.z=r.oz+6;P.cam.yaw=Math.atan2(3,-8)}}")
    await g.step(1)
    print('  Bild:', await g.snap('coup_vitrine'))
    await g.js(f"()=>{M}.exitVenue({M}.P1)")
    await g.step(0.2)
    await g.js(f"()=>{{const M={M};M.COUP.loot=true;const a=M.activeMission;a.phase='escape';a.crossed=true;const p=M.COUP.hideout;M.P1.h.x=p[0];M.P1.h.z=p[1]}}")
    await g.step(0.3)
    await g.js(f"()=>{M}.snap(2)")
    os.makedirs(OUT, exist_ok=True)
    await g.page.screenshot(path=OUT + 'coup_zeitung.jpg', quality=85)
    print('  Bild:', OUT + 'coup_zeitung.jpg')
    g.check('Zeitung sichtbar', await g.js("()=>!document.getElementById('coupnews').hidden"))


if len(sys.argv) > 1 and sys.argv[1] == 'real':
    run(shots, real=True)
else:
    run(test)
