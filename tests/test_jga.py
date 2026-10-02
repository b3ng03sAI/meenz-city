# Sondermission JGA-Planung: Truppe zusammentrommeln, Team-Shirts, Bauchladen, Altstadt-Aufgaben, Bräutigam einfangen,
# Kneipentour + Rheinufer-Party, Fotoalbum, Speicherstand, Haltungsregel beim Tanzen.
#   python3 tests/test_jga.py        # Assert-Test (Stub)
#   python3 tests/test_jga.py real   # Screenshots Truppe in der Altstadt + Rheinufer-Party nach tests/out/ (real.html)
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run, OUT

M = '__MEENZ'
STATE = f"""()=>{{const J={M}.JGA;return {{stage:J.stage,group:J.group.length,friends:[...J.friends],shirts:J.shirts,sold:J.sold,
  dares:J.dares.map(d=>({{id:d.id,done:d.done}})),groomLost:J.groomLost,catches:J.catches,done:J.done}}}}"""
ACTIVE = f"()=>{{const a={M}.activeMission;return a?a.id:null}}"
MENU = "()=>{const e=document.getElementById('jgamenu');return !!e&&!e.hidden}"


async def put(g, x, z):
    await g.js(f"([x,z])=>{{const M={M},h=M.P1.h;h.x=x;h.z=z;h.y=M.groundYFn(x,z,0);h.vx=h.vz=0}}", [x, z])


async def digit(g, n):
    """Ziffer drücken ohne Spielzeit laufen zu lassen (Wirkung passiert synchron im keydown)."""
    await g.page.keyboard.down(f'Digit{n}')
    await g.page.keyboard.up(f'Digit{n}')


async def wait_call(g, mid):
    """Kalle ruft nach einer gewonnenen Etappe an und startet die nächste."""
    for _ in range(40):
        if await g.js(ACTIVE) == mid: return True
        await g.step(0.5)
    return False


async def group_near(g, r):
    return await g.js(f"(r)=>{{const M={M},h=M.P1.h;return M.JGA.group.filter(o=>Math.hypot(o.x-h.x,o.z-h.z)<r).length}}", r)


async def test(g):
    await g.start()
    s = await g.js(STATE)
    g.check('JGA-Startzustand: stage 0, keine Truppe, nix verkauft',
            s['stage'] == 0 and s['group'] == 0 and not s['shirts'] and s['sold'] == 0 and not s['done'], s)
    info = await g.js(f"()=>{{const J={M}.JGA;return {{pubs:J.pubs.length,party:!!J.partySpot,meet:!!J.meet}}}}")
    g.check('drei Kneipen, Party-Platz und Treffpunkt gesetzt', info == {'pubs': 3, 'party': True, 'meet': True}, info)
    await g.js(f"()=>{{{M}.G.money=1000}}")

    # 1. Kette startet am Treffpunkt
    meet = await g.js(f"()=>{M}.JGA.meet")
    await put(g, *meet)
    await g.step(0.5)
    g.check('Treffpunkt startet jga_truppe', await g.js(ACTIVE) == 'jga_truppe', await g.js(ACTIVE))
    s = await g.js(STATE)
    g.check('stage 1, Bräutigam Kalle in der Truppe', s['stage'] == 1 and s['group'] == 1
            and await g.js(f"()=>{M}.JGA.groom.jga.id==='kalle'"), s)
    n = await g.js(f"()=>{M}.activeMission.npcs.length")
    g.check('vier Freunde in der Stadt verteilt', n == 4, n)
    for i in range(4):
        await g.js(f"(i)=>{{const M={M},o=M.activeMission.npcs[i],h=M.P1.h;h.x=o.x+1.5;h.z=o.z;h.y=M.groundYFn(h.x,h.z,0)}}", i)
        await g.step(0.3)
        g.check(f'Freund {i + 1} macht mit', len((await g.js(STATE))['friends']) == i + 1)
    s = await g.js(STATE)
    g.check('4 Freunde → gewonnen, stage 2, Truppe 5 Leute', await g.js(ACTIVE) is None and s['stage'] == 2 and s['group'] == 5
            and await g.js(f"()=>!!{M}.G.done.jga_truppe"), s)
    g.check('Freunde: hotte, gerdi, ralf, elfi', sorted(s['friends']) == ['elfi', 'gerdi', 'hotte', 'ralf'], s['friends'])
    # Truppe folgt dem Spieler
    await put(g, *meet)
    await g.step(10)
    near = await group_near(g, 8)
    g.check('Truppe folgt zum Treffpunkt (alle 5 im Umkreis 8 m)', near == 5, near)
    await g.js(f"()=>{{const M={M},h=M.P1.h;h.facing=0}}")
    await put(g, meet[0] + 25, meet[1])
    await g.step(10)
    near = await group_near(g, 8)
    g.check('Spieler 25 m weiter: Truppe läuft hinterher', near == 5, near)

    # 2. T-Shirts: Kalle ruft an, Kauf im Modeladen
    g.check('Kalle ruft an → jga_shirts startet', await wait_call(g, 'jga_shirts'), await g.js(ACTIVE))
    await g.js(f"""()=>{{const M={M},P=M.P1;const [px,pz]=M.ppos(P);let b=null,bd=1e18;
        for(const s of M.SHOPS){{if(s.cat!==2||s.inVenue)continue;const d=(s.x-px)**2+(s.z-pz)**2;if(d<bd){{bd=d;b=s}}}}
        M.enterShop(P,b);const k=P.h.room.keeper;P.h.x=k.x;P.h.z=k.z+1.4}}""")
    await g.step(0.2)
    await g.key('KeyF', after=0.1)
    idx = await g.js("()=>[...document.querySelectorAll('#shopitems .item')].findIndex(b=>b.textContent.includes('Team-Kalle'))")
    g.check('Team-Kalle-Shirts im Modeladen', idx >= 0, idx)
    m0 = await g.js(f"()=>{M}.G.money")
    await digit(g, idx + 1)
    m1 = await g.js(f"()=>{M}.G.money")
    g.check('Shirts kosten €90', m0 - m1 == 90, m0 - m1)
    await g.js(f"()=>{M}.exitShop({M}.P1)")
    await g.step(0.3)
    s = await g.js(STATE)
    g.check('Shirts gekauft → stage 3', s['shirts'] and s['stage'] == 3 and await g.js(ACTIVE) is None, s)
    dressed = await g.js(f"()=>{M}.JGA.group.every(h=>h.jgaShirt)&&!!{M}.P1.h.jgaShirt")
    g.check('Truppe und Spieler tragen das Team-Shirt', dressed)

    save3 = await g.js(f"()=>JSON.parse(JSON.stringify({M}.snapshot()))")

    # 3. Bauchladen: an Passanten verkaufen
    g.check('Kalle ruft an → jga_bauchladen', await wait_call(g, 'jga_bauchladen'), await g.js(ACTIVE))
    g.check('Kalle trägt den Bauchladen', await g.js(f"()=>{M}.JGA.groom.jgaTray.visible"))
    await g.js(f"()=>{{{M}.G.money=1000}}")
    await g.reseed(7)
    offers = 0
    for _ in range(40):
        if (await g.js(STATE))['sold'] >= 5: break
        ok = await g.js(f"""()=>{{const M={M},h=M.P1.h;const o=M.HUMANS.find(o=>o.kind==='ped'&&o.alive&&!o.inCar&&!o.mission&&!o.keeper&&!o.jgaAsked&&o.state==='walk');
            if(!o)return false;h.x=o.x+1.2;h.z=o.z;h.y=M.groundYFn(h.x,h.z,0);return true}}""")
        if not ok:
            await g.step(2); continue
        await g.step(0.05)
        if not await g.js(MENU):
            await g.step(1); continue
        offers += 1
        await digit(g, 1 if offers % 2 else 2)
        await g.step(1)
    s = await g.js(STATE)
    dec = await g.js(f"()=>{M}.JGA.declined")
    g.check(f'Verkaufsmenü bei Passanten geöffnet ({offers}×)', offers >= 5, offers)
    g.check('manche kaufen, manche lehnen ab', dec >= 1, dec)
    g.check('5 verkauft → stage 4, Erlös gutgeschrieben', s['sold'] >= 5 and s['stage'] == 4 and await g.js(ACTIVE) is None, s)
    g.check('Bauchladen wieder abgelegt', not await g.js(f"()=>{M}.JGA.groom.jgaTray.visible"))

    # 4. Aufgaben in der Altstadt
    g.check('Kalle ruft an → jga_aufgaben', await wait_call(g, 'jga_aufgaben'), await g.js(ACTIVE))
    dares = [d['id'] for d in (await g.js(STATE))['dares']]
    g.check('drei verschiedene Aufgaben gewählt', len(set(dares)) == 3 and set(dares) <= {'brunnen', 'foto', 'schoppe', 'polonaise'}, dares)
    # alle vier Aufgaben testen: fehlende vierte für den Test dazunehmen
    await g.js(f"()=>{{const J={M}.JGA;for(const id of ['brunnen','foto','schoppe','polonaise'])if(!J.dares.some(d=>d.id===id))J.dares.push({{id,done:false}})}}")
    if 'schoppe' not in dares:
        await g.js(f"()=>{{const M={M},J=M.JGA;if(!J.stranger){{const p=J.spots.schoppe;const h=M.mkHuman();h.x=p[0];h.z=p[1];h.mission=true;h.state='jga';h.jga={{id:'ewald'}};J.stranger=h}}}}")
    S = await g.js(f"()=>{M}.JGA.spots")
    # a) Ständchen: Rhythmus-Minispiel
    await put(g, *S['brunnen'])
    await g.step(0.1)
    g.check('am Fastnachtsbrunnen startet das Rhythmus-Spiel', await g.js(f"()=>!!{M}.JGA.rhythm") and await g.js(MENU))
    await g.step(0.4)
    await digit(g, 1)   # daneben gedrückt (Einzähler)
    for b in range(8):
        t = await g.js(f"()=>{M}.JGA.rhythm.t")
        await g.step(max(1 / 60, b * 0.6 - t))
        await digit(g, 1)
    hits = await g.js(f"()=>{M}.JGA.rhythm&&{M}.JGA.rhythm.hits.filter(Boolean).length")
    g.check('im Takt gesungen: mindestens 7 Treffer', hits and hits >= 7, hits)
    await g.step(0.6)
    g.check('Ständchen erfüllt', await g.js(f"()=>{M}.JGA.dares.find(d=>d.id==='brunnen').done"))
    # b) Gruppenfoto am Dom
    await put(g, *S['foto'])
    await g.js(f"()=>{{const M={M},h=M.P1.h;for(const o of M.JGA.group){{o.x=h.x+1;o.z=h.z+1}}}}")
    await g.step(3)
    g.check('Gruppenfoto am Dom erfüllt', await g.js(f"()=>{M}.JGA.dares.find(d=>d.id==='foto').done"))
    # c) Schoppe: Dialogwahl, frech scheitert, höflich klappt
    st = await g.js(f"()=>[{M}.JGA.stranger.x,{M}.JGA.stranger.z]")
    await put(g, st[0] + 1.5, st[1])
    await g.step(0.1)
    g.check('beim Fremden öffnet sich der Dialog', await g.js(MENU) and await g.js(f"()=>{M}.JGA.menu.kind") == 'schoppe')
    await digit(g, 2)
    g.check('frech gefragt → kein Schoppe', not await g.js(f"()=>{M}.JGA.dares.find(d=>d.id==='schoppe').done") and not await g.js(MENU))
    await g.step(3)
    g.check('Dialog geht nach kurzer Pause wieder auf', await g.js(MENU))
    await g.js(f"()=>{M}.JGA.choose(0)")   # Klick auf den ersten Knopf
    g.check('höflich gefragt → Schoppe erfüllt', await g.js(f"()=>{M}.JGA.dares.find(d=>d.id==='schoppe').done"))
    # d) Polonaise: vier Punkte in Reihenfolge
    pts = S['polo']
    await put(g, *pts[1])
    await g.step(0.2)
    g.check('falsche Reihenfolge zählt nicht', await g.js(f"()=>{M}.activeMission.polo||0") == 0)
    for p in pts:
        await put(g, *p)
        await g.step(0.2)
    s = await g.js(STATE)
    g.check('alle Aufgaben erfüllt → stage 5', all(d['done'] for d in s['dares']) and s['stage'] == 5 and await g.js(ACTIVE) is None, s)

    # 5. Bräutigam: Zeit läuft ab → Etappe scheitert
    g.check('Kalle ruft an → jga_braeutigam', await wait_call(g, 'jga_braeutigam'), await g.js(ACTIVE))
    await g.js(f"()=>{{{M}.activeMission.calmT=0}}")
    await g.step(0.2)
    g0 = await g.js(f"()=>{{const k={M}.JGA.groom;return [k.x,k.z]}}")
    g.check('Kalle haut ab (groomLost)', (await g.js(STATE))['groomLost'])
    await g.step(5)
    g1 = await g.js(f"()=>{{const k={M}.JGA.groom;return [k.x,k.z]}}")
    moved = ((g1[0] - g0[0]) ** 2 + (g1[1] - g0[1]) ** 2) ** 0.5
    g.check('Kalle torkelt davon', moved > 3, round(moved, 1))
    await g.step(36)
    s = await g.js(STATE)
    g.check('nicht eingefangen → Etappe gescheitert, stage bleibt 5', await g.js(ACTIVE) is None and s['stage'] == 5 and not s['groomLost']
            and not await g.js(f"()=>!!{M}.G.done.jga_braeutigam"), s)
    # neuer Versuch: dreimal einfangen
    g.check('Kalle ruft nach dem Scheitern wieder an', await wait_call(g, 'jga_braeutigam'))
    for i in range(3):
        await g.js(f"()=>{{{M}.activeMission.calmT=0}}")
        await g.step(6)
        g.check(f'Ausbüxen {i + 1}: noch nicht gefangen, solange er nah ist', (await g.js(STATE))['catches'] == i)
        g.check(f'Ausbüxen {i + 1}', (await g.js(STATE))['groomLost'])
        await g.js(f"()=>{{const M={M},k=M.JGA.groom,h=M.P1.h;h.x=k.x+1;h.z=k.z;h.y=M.groundYFn(h.x,h.z,0)}}")
        await g.step(0.1)
        s = await g.js(STATE)
        g.check(f'Kalle eingefangen ({i + 1}/3)', not s['groomLost'] and s['catches'] == i + 1, s)
    await g.step(0.2)
    s = await g.js(STATE)
    g.check('3× eingefangen → stage 6', s['stage'] == 6 and await g.js(ACTIVE) is None, s)

    # 6. Finale: Kneipentour + Rheinufer-Party
    g.check('Kalle ruft an → jga_finale', await wait_call(g, 'jga_finale'), await g.js(ACTIVE))
    for i in range(3):
        await g.js(f"(i)=>{{const M={M};M.enterShop(M.P1,M.JGA.pubs[i])}}", i)
        await g.step(0.5)
        await g.js(f"()=>{M}.exitShop({M}.P1)")
        await g.step(0.2)
        v = await g.js(f"()=>{M}.JGA.visited.length")
        g.check(f'Kneipe {i + 1} besucht (rein + raus)', v == i + 1, v)
    g.check('nach drei Kneipen geht es zur Party', await g.js(f"()=>{M}.activeMission.phase") == 'party')
    sp = await g.js(f"()=>{M}.JGA.partySpot")
    await put(g, *sp)
    await g.step(0.3)
    g.check('Party am Rheinufer läuft', await g.js(f"()=>{M}.JGA.party"))
    money0 = await g.js(f"()=>{M}.G.money")
    worst = -9
    for _ in range(10):
        await g.step(1)
        a = await g.js(f"""()=>{{const J={M}.JGA;let w=-9,both=false;for(const h of J.group){{const r=h.armR.rotation,l=h.armL.rotation;
            w=Math.max(w,-r.x);if(r.x<-2.3&&l.x<-2.3)both=true}}return [w,both]}}""")
        worst = max(worst, a[0])
        g.check('beim Tanzen nie beide Arme senkrecht', not a[1]) if a[1] else None
    g.check('Tanz: rechter Arm bleibt unter Schulterhöhe (rot.x > -1.0)', worst < 1.0, round(worst, 2))
    near = await group_near(g, 6)
    g.check('Truppe tanzt um den Spieler', near == 5, near)
    await g.step(11)
    money1 = await g.js(f"()=>{M}.G.money")
    s = await g.js(STATE)
    g.check('Finale gewonnen → done, stage 7', s['done'] and s['stage'] == 7 and await g.js(ACTIVE) is None
            and await g.js(f"()=>!!{M}.G.done.jga_finale"), s)
    g.check('Belohnung €5.000', money1 - money0 == 5000, money1 - money0)
    album = await g.js("()=>{const e=document.getElementById('jgaalbum');return e&&!e.hidden?e.textContent:''}")
    g.check('Fotoalbum mit Bildunterschriften', 'Fotoalbum' in album and 'Team Kalle' in album and 'Rheinufer' in album
            and await g.js("()=>document.querySelectorAll('#jgaalbum figure').length") >= 8, album[:80])
    await g.step(31)
    g.check('Album verschwindet nach Ablauf, Truppe geht heim',
            await g.js("()=>document.getElementById('jgaalbum').hidden") and (await g.js(STATE))['group'] == 0)

    # Speicherstand
    snap = await g.js(f"()=>{M}.snapshot().jga")
    g.check('snapshot enthält JGA-Fortschritt', snap and snap['stage'] == 7 and snap['done'] and snap['shirts']
            and len(snap['friends']) == 4 and snap['sold'] >= 5 and len(snap['dares']) == 4, snap)
    old = await g.js(f"()=>{{const M={M};const s=JSON.parse(JSON.stringify(M.snapshot()));delete s.jga;return M.applySave(s)}}")
    s = await g.js(STATE)
    g.check('alter Spielstand ohne jga lädt → Kette zurück auf Anfang', old and s['stage'] == 0 and not s['friends'] and not s['done'], s)
    await g.js(f"(s)=>{M}.applySave(s)", save3)
    await g.step(0.5)
    s = await g.js(STATE)
    g.check('Spielstand mit jga (stage 3) lädt, Truppe in Shirts wieder da', s['stage'] == 3 and s['shirts'] and s['group'] == 5
            and await g.js(f"()=>{M}.JGA.group.every(h=>h.jgaShirt)"), s)
    bad = await g.js(f"""()=>{{const M={M};const s=JSON.parse(JSON.stringify(M.snapshot()));s.jga={{stage:'x',friends:['nobody',3],sold:-4,dares:[{{id:'strip'}}],shirts:0}};
        M.applySave(s);const J=M.JGA;return J.stage===0&&!J.friends.length&&J.sold===0&&!J.dares.length&&!J.shirts}}""")
    g.check('kaputte jga-Daten werden verworfen', bad)


async def shots(g):
    await g.start()
    await g.js(f"""()=>{{const M={M},J=M.JGA;J.stage=4;J.shirts=true;J.friends=['hotte','gerdi','ralf','elfi'];M.G.done.jga_truppe=M.G.done.jga_shirts=M.G.done.jga_bauchladen=true;
        M.gameMin=15*60;M.setWeather('klar');const P=M.P1,h=P.h;h.x=-6;h.z=-74;h.y=M.groundYFn(h.x,h.z,0)}}""")
    await g.step(0.5)
    await g.js(f"()=>{{const M={M},P=M.P1,h=P.h;h.facing=P.cam.yaw=Math.atan2(6,74);P.cam.pitch=0.1;M.JGA.group.forEach((o,i)=>{{o.x=h.x-3+i*1.5;o.z=h.z+4+(i%2);o.facing=Math.PI;o.sync()}})}}")
    await g.step(0.3)
    await g.step(1.2)
    print('  Bild:', await g.snap('jga_altstadt'))
    await g.js(f"""()=>{{const M={M},J=M.JGA;J.stage=6;M.G.done.jga_aufgaben=M.G.done.jga_braeutigam=true;M.gameMin=18*60+20;
        const m=M.MISSIONS.find(m=>m.id==='jga_finale');const sp=J.partySpot;const P=M.P1,h=P.h;h.x=sp[0];h.z=sp[1];h.y=M.groundYFn(sp[0],sp[1],0);
        M.startMission(m,P);M.activeMission.phase='party';for(const o of J.group){{o.x=sp[0]+1;o.z=sp[1]+1}}}}""")
    await g.step(4)
    await g.js(f"()=>{{const M={M},P=M.P1,h=P.h,sp=M.JGA.partySpot;h.x=sp[0]+5;h.z=sp[1]+1.5;P.cam.yaw=Math.atan2(-5,-1.5);P.cam.pitch=0.15;h.facing=P.cam.yaw}}")
    await g.step(0.5)
    url = await g.js(f"()=>{M}.snap(3,true)")
    import base64
    os.makedirs(OUT, exist_ok=True)
    with open(OUT + 'jga_party.jpg', 'wb') as f:
        f.write(base64.b64decode(url.split(',', 1)[1]))
    print('  Bild:', OUT + 'jga_party.jpg')
    g.check('Party läuft', await g.js(f"()=>{M}.JGA.party"))


if len(sys.argv) > 1 and sys.argv[1] == 'real':
    run(shots, real=True)
else:
    run(test)
