# Spielbank im Kurhaus Wiesbaden: Tische im großen Saal, Dresscode-Gag am Eingang, Roulette und Black Jack mit
# Einsatzlimit (nur Spielgeld G.money), deterministisch über die Spiel-RNG (g.reseed), Croupiers auf Hessisch.
#   python3 tests/test_spielbank.py        # Assert-Test (Stub)
#   python3 tests/test_spielbank.py real   # zusätzlich Screenshots + Haltung + Speicher (real.html) nach tests/out/
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

REAL = len(sys.argv) > 1 and sys.argv[1] == 'real'
M = '__MEENZ'
S = f'{M}.SPIELBANK'
MENU = "()=>{const e=document.getElementById('spielbankmenu');return !!e&&!e.hidden}"


async def money(g, v=None):
    if v is not None:
        await g.js(f"(v)=>{{{M}.G.money=v}}", v)
    return await g.js(f"()=>{M}.G.money")


async def digit(g, n):
    await g.page.keyboard.down(f'Digit{n}')
    await g.page.keyboard.up(f'Digit{n}')


async def put_local(g, lx, lz, face=3.14159):
    await g.js(f"([lx,lz,f])=>{{const h={M}.P1.h,r=h.room;h.x=r.ox+lx;h.z=r.oz+lz;h.y=r.oy;h.vx=h.vz=0;h.facing=f;{M}.P1.cam.yaw=f}}", [lx, lz, face])


async def bj(g, ranks, actions=(), stake=10):
    """Teilt mit fester Kartenfolge aus, führt Aktionen aus, lässt die Bank fertig ziehen. Liefert Netto, Ergebnis, Werte."""
    m0 = await money(g, 1000)
    await g.js(f"(s)=>{{{S}.stake=s}}", stake)
    ok = await g.js(f"(r)=>{S}.bjDeal(r)", list(ranks))
    for a in actions:
        await g.js(f"()=>{S}.bj{a}()")
    await g.step(4)
    J = await g.js(f"()=>{{const J={S}.bj;return {{phase:J.phase,result:J.result,net:J.net,stake:J.stake,p:{S}.handValue(J.player),d:{S}.handValue(J.dealer),nd:J.dealer.length}}}}")
    J['ok'] = ok
    J['delta'] = await money(g) - m0
    return J


async def test(g):
    await g.start()
    g.check('SPIELBANK-Objekt da, Limit 5–100', await g.js(f"()=>{S}.MIN===5&&{S}.MAX===100&&typeof {S}.roulBet==='function'"))

    # 1. Kurhaus betreten: Saal mit Spielbank gebaut, Schild ersetzt, Croupiers + Portier da
    await g.js(f"()=>{{const M={M};const v=M.VENUES.find(v=>v.id==='kurhaus');M.enterVenue(M.P1,v)}}")
    await g.step(0.5)
    st = await g.js(f"""()=>{{const B={S},r={M}.P1.h.room;return {{in:!!r&&r.venue.id==='kurhaus',built:B.built,sign:B.signFixed,meshes:B.meshes,
        cr:['roul','bj'].map(t=>!!B.croupiers[t]&&!B.croupiers[t].removed&&B.croupiers[t].mission),door:!!B.doorman&&!B.doorman.removed,
        sub:r&&r.venue.sub,hint:r&&r.venue.hints.some(h=>h.t.includes('Roulette'))}}}}""")
    g.check('im Kurhaus', st['in'], st)
    g.check('Spielbank gebaut, „bald geöffnet“-Schild ersetzt', st['built'] and st['sign'], st)
    g.check('wenige eigene Meshes (≤ 25)', 0 < st['meshes'] <= 25, st['meshes'])
    g.check('zwei Croupiers (nicht ansprechbar) + Portier', st['cr'] == [True, True] and st['door'], st)
    g.check('Untertitel/Hinweis nennen die Spielbank', 'Spielbank' in st['sub'] and 'bald' not in st['sub'] and st['hint'], st['sub'])
    T = await g.js(f"()=>{S}.TABLES")
    hall = await g.js(f"()=>{M}.WIWAHR.hall")
    for k, t in T.items():
        inside = hall['x0'] <= t['x'] - t['w'] / 2 and t['x'] + t['w'] / 2 <= hall['x1'] and hall['z0'] <= t['z'] - t['d'] / 2 and t['z'] + t['d'] / 2 <= hall['z1']
        g.check(f'{k}: Tisch liegt in der reservierten Saal-Fläche', inside, t)
        solid = await g.js(f"([x,z])=>{{const r={M}.P1.h.room;return r.blocked(r.ox+x,r.oz+z)}}", [t['x'], t['z']])
        free = await g.js(f"([x,z])=>{{const r={M}.P1.h.room;return !r.blocked(r.ox+x,r.oz+z)}}", t['seat'])
        g.check(f'{k}: Tisch massiv, Sitzplatz frei', solid and free)

    # 2. Dresscode-Gag am Saal-Eingang
    kinds = await g.js(f"""()=>{{const k={S}.dressKind;return [k({{shoes:true,hex:0}}),k({{jga:true}}),k({{drunk:0.8,hex:0xffffff}}),
        k({{hex:0x111111}}),k({{hex:0xff2020}}),k({{hex:0x6a7a8a}}),k({{}})]}}""")
    g.check('Dresscode-Urteile: Leuchtschuh/JGA/betrunke/schick/bunt/normal',
            kinds == ['leuchtschuh', 'jga', 'betrunke', 'schick', 'bunt', 'normal', 'normal'], kinds)
    d0 = await g.js(f"()=>{S}.dress.checked")
    await put_local(g, 0, 16)
    await g.step(0.2)
    g.check('Foyer: noch kein Dresscode-Check', not d0 and not await g.js(f"()=>{S}.dress.checked"))
    await put_local(g, 0, 11.5)
    await g.step(0.2)
    d = await g.js(f"()=>({{...{S}.dress,tie:!!{S}.bowtie}})")
    g.check('Saal-Eingang: Portier prüft das Outfit und leiht e Fliege', d['checked'] and d['line'] and d['tie'], d)
    talk = await g.js(f"()=>{{const M={M},h=M.SPIELBANK.doorman;return !!h.bubble&&h.bubble.textContent}}")
    g.check('Portier sagt sein Urteil (Sprechblase)', talk == d['line'], talk)

    # 3. Roulette: Auszahlung je Wette, Zero-Regel
    pays = await g.js(f"""()=>{{const p={S}.roulPayout;return [p('rot',1,10),p('rot',2,10),p('rot',0,10),p('schwarz',2,10),p('gerade',4,10),
        p('gerade',0,10),p('ungerade',7,20),p('zero',0,10),p('zero',5,10)]}}""")
    g.check('Roulette-Auszahlungen (1:1, Zero 35:1, Zero schlägt einfache Chancen)', pays == [20, 0, 0, 20, 20, 0, 40, 360, 0], pays)

    # 4. Am Roulette-Tisch per E hinsetzen, per Ziffer setzen, Kugel rollt, Auszahlung
    await put_local(g, T['roul']['seat'][0], T['roul']['seat'][1] + 0.8)
    await g.step(0.1)
    g.check('Hinweis-Bereich: Tisch in Reichweite', await g.js(f"()=>{S}.tableNear()") == 'roul')
    await g.key('KeyE', after=0.1)
    g.check('E: hingesetzt, Menü offen', await g.js(f"()=>!!{S}.seat&&{S}.seat.t==='roul'") and await g.js(MENU))
    g.check('kein Gespräch mit dem Croupier gestartet', not await g.js(f"()=>!!{M}.TALK"))
    seat = await g.js(f"()=>{{const h={M}.P1.h,r=h.room;return [h.x-r.ox,h.z-r.oz]}}")
    g.check('Spieler sitzt am Platz', abs(seat[0] - T['roul']['seat'][0]) < 0.01 and abs(seat[1] - T['roul']['seat'][1]) < 0.01, seat)
    await g.key('KeyW', hold=1.0, after=0)
    seat2 = await g.js(f"()=>{{const h={M}.P1.h,r=h.room;return [h.x-r.ox,h.z-r.oz]}}")
    g.check('Sitzend: Laufen bewegt den Spieler nicht', seat2 == seat, seat2)
    m0 = await money(g, 500)
    await g.js(f"()=>{{{S}.stake=10}}")
    await g.reseed(42)
    await digit(g, 1)   # 1 = Rot
    R = await g.js(f"()=>({{...{S}.roul,history:null}})")
    g.check('Ziffer 1: €10 uff Rot, Kugel rollt, Einsatz abgebucht', R['phase'] == 'spin' and R['bet'] == 'rot' and await money(g) == m0 - 10, R['phase'])
    g.check('während des Drehens kaa Optionen', await g.js(f"()=>{S}.menu.opts.length") == 0)
    n1 = R['n']
    await g.step(4)
    R = await g.js(f"()=>{S}.roul")
    exp = m0 - 10 + (20 if n1 in (1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36) else 0)
    g.check('Kugel liegt, Auszahlung passt zur Zahl', R['phase'] == 'idle' and R['last']['n'] == n1 and await money(g) == exp, [n1, await money(g), exp])
    await g.reseed(42)
    await g.js(f"()=>{S}.roulBet('rot')")
    g.check('gleicher Seed → gleiche Zahl (Spiel-RNG)', await g.js(f"()=>{S}.roul.n") == n1, n1)
    await g.step(4)
    await g.reseed(43)
    await g.js(f"()=>{S}.roulBet('rot')")
    n3 = await g.js(f"()=>{S}.roul.n")
    await g.step(4)
    g.check('Zahl 0–36', 0 <= n3 <= 36, n3)
    # Zero-Plein, erzwungene Zahl
    m0 = await money(g, 500)
    await g.js(f"()=>{S}.roulBet('zero',0)")
    await g.step(4)
    g.check('Zero mit €10 → +€350', await money(g) == m0 + 350, await money(g) - m0)
    # Einsatz per Ziffer ändern (Option 6) durch die Stufen
    stakes = []
    for _ in range(5):
        await digit(g, 6)
        stakes.append(await g.js(f"()=>{S}.stake"))
    g.check('Einsatzstufen 20/50/100/5/10', stakes == [20, 50, 100, 5, 10], stakes)

    # 5. Einsatzlimit + kein Geld
    m0 = await money(g, 500)
    res = []
    for s in (4, 101, 1000):
        await g.js(f"(s)=>{{{S}.stake=s}}", s)
        res.append(await g.js(f"()=>{S}.roulBet('rot')"))
    g.check('Einsatz < €5 oder > €100 abgelehnt, Geld unverändert', res == [False, False, False] and await money(g) == m0, res)
    await money(g, 3)
    await g.js(f"()=>{{{S}.stake=5}}")
    g.check('mit €3 kaa Spiel', not await g.js(f"()=>{S}.roulBet('rot')") and await money(g) == 3)
    await money(g, 500)
    await g.js(f"()=>{{{S}.stake=10}}")

    # 6. Aufstehen mit E; Ziffern danach wieder frei
    await g.key('KeyE', after=0.1)
    g.check('E: uffgestanne, Menü zu', not await g.js(f"()=>!!{S}.seat") and not await g.js(MENU))

    # 7. Black Jack: Regeln mit festen Karten
    await put_local(g, T['bj']['seat'][0], T['bj']['seat'][1] + 0.5)
    await g.step(0.1)
    await g.key('KeyE', after=0.1)
    g.check('Black-Jack-Tisch: hingesetzt', await g.js(f"()=>!!{S}.seat&&{S}.seat.t==='bj'") and await g.js(MENU))
    vals = await g.js(f"()=>{{const v=c=>{S}.handValue(c.map(r=>({{r,s:0}})));return [v([1,6]),v([1,6,10]),v([1,1,9]),v([13,12]),v([1,13])]}}")
    g.check('Handwerte: A6=17, A6K=17, AA9=21, KD=20, AK=21', vals == [17, 17, 21, 20, 21], vals)
    J = await bj(g, [1, 9, 13, 7])
    g.check('Black Jack zahlt 3:2 (€10 → +€15)', J['result'] == 'blackjack' and J['delta'] == 15, J)
    J = await bj(g, [1, 1, 13, 12])
    g.check('beide Black Jack → Gleichstand', J['result'] == 'push' and J['delta'] == 0, J)
    J = await bj(g, [10, 1, 9, 13])
    g.check('Bank hat Black Jack → verlorn', J['result'] == 'dealerbj' and J['delta'] == -10, J)
    J = await bj(g, [10, 5, 6, 9, 10], ['Hit'])
    g.check('Iwwerkauft (26) → verlorn', J['result'] == 'bust' and J['p'] == 26 and J['delta'] == -10, J)
    J = await bj(g, [10, 6, 8, 1, 10], ['Stand'])
    g.check('Bank bleibt bei weicher 17, Spieler 18 gewinnt', J['result'] == 'win' and J['d'] == 17 and J['nd'] == 2 and J['delta'] == 10, J)
    J = await bj(g, [10, 5, 9, 6, 10], ['Stand'])
    g.check('Bank zieht bei 11 → 21, Spieler 19 verliert', J['result'] == 'lose' and J['d'] == 21 and J['nd'] == 3 and J['delta'] == -10, J)
    J = await bj(g, [10, 10, 8, 6, 9], ['Stand'])
    g.check('Bank iwwerkauft → gewonne', J['result'] == 'dealerbust' and J['delta'] == 10, J)
    J = await bj(g, [10, 10, 8, 8], ['Stand'])
    g.check('18 gegen 18 → Gleichstand', J['result'] == 'push' and J['delta'] == 0, J)
    J = await bj(g, [5, 10, 6, 7, 10], ['Double'])
    g.check('Verdoppeln bei 11 → 21, Einsatz €20, +€20', J['result'] == 'win' and J['stake'] == 20 and J['delta'] == 20, J)
    await money(g, 1000)
    await g.js(f"()=>{S}.bjDeal([2,10,3,7,4,10])")
    await g.js(f"()=>{S}.bjHit()")
    g.check('Verdoppeln nur mit zwaa Karte', not await g.js(f"()=>{S}.bjDouble()"))
    await g.js(f"()=>{S}.bjStand()")
    await g.step(4)
    # über Ziffern: 1 = Austeile, dann 2 = Ich bleib; Seed macht das Blatt reproduzierbar
    hands = []
    for _ in range(2):
        await g.js(f"()=>{{{S}.bj.phase='idle';{S}.stake=10}}")
        await g.reseed(7)
        await digit(g, 1)
        hands.append(await g.js(f"()=>{S}.bj.player.map(c=>c.r+'/'+c.s).join(',')"))
        if await g.js(f"()=>{S}.bj.phase") == 'player':
            await digit(g, 2)
        await g.step(4)
    g.check('Ziffer 1 teilt aus, gleicher Seed → gleiches Blatt', hands[0] == hands[1] and len(hands[0]) > 0, hands)
    g.check('Runde abgeschlossen', await g.js(f"()=>{S}.bj.phase") == 'done')
    cards = await g.js(f"()=>{S}.vis.cards.length")
    g.check('Karten-Pool vorhanden (wiederverwendet)', cards == 12, cards)

    # 8. Croupier-Gesten halten die Haltungsregel ein (Arme tief, nach vorn)
    await g.js(f"()=>{{{S}.bj.phase='idle'}}")
    await g.js(f"(r)=>{S}.bjDeal(r)", [10, 5, 6, 9])
    await g.step(0.2)
    pose = await g.js(f"()=>{S}.pose")
    g.check('Croupier-Arme: rechter Arm nie über −1,0 rad', all(p and p['rx'] >= -1.0 and p['lx'] >= -1.0 for p in pose.values()), pose)
    await g.js(f"()=>{S}.bjStand()")
    await g.step(4)

    # 9. Pause-Hinweis nach vielen Runden, Kurhaus verlassen setzt den Besuch zurück
    g.check('nach vielen Runden: Croupier schlägt e Paus vor', await g.js(f"()=>{S}.rounds>={S}.BREAK_N&&{S}.breakSaid"),
            await g.js(f"()=>{S}.rounds"))
    await g.key('KeyE', after=0.1)
    await g.js(f"()=>{M}.exitVenue({M}.P1)")
    await g.step(0.3)
    left = await g.js(f"()=>({{seat:!!{S}.seat,tie:!!{S}.bowtie,dress:{S}.dress.checked,visit:{S}.visit,menu:!!{S}.menu}})")
    g.check('draußen: kaa Platz, kaa Fliege, Besuch zurückgesetzt', left == {'seat': False, 'tie': False, 'dress': False, 'visit': False, 'menu': False}, left)
    # Ziffern wählen draußen wieder Waffen (Menü fängt nichts mehr ab)
    g.check('kaa Menü offen → Ziffern frei', not await g.js(MENU))

    if REAL:
        await real_part(g)


async def real_part(g):
    from harness import OUT
    await g.js(f"()=>{{const M={M};const v=M.VENUES.find(v=>v.id==='kurhaus');M.enterVenue(M.P1,v)}}")
    await g.step(0.5)
    await put_local(g, 0, 4, 3.14159)
    await g.js(f"()=>{{const P={M}.P1;P.cam.pitch=0.18;P.cam.init=false}}")
    await g.step(0.3)
    print('  snap', await g.snap('spielbank_saal'))
    T = await g.js(f"()=>{S}.TABLES")
    await money(g, 1000)
    await put_local(g, T['roul']['seat'][0], T['roul']['seat'][1] + 0.5)
    await g.step(0.1)
    await g.js(f"()=>{S}.sit('roul')")
    await g.js(f"()=>{S}.roulBet('rot')")
    await g.step(1.0)
    print('  snap', await g.snap('spielbank_roulette'))
    await g.step(3)
    await g.js(f"()=>{S}.stand()")
    await put_local(g, T['bj']['seat'][0], T['bj']['seat'][1] + 0.5)
    await g.js(f"()=>{S}.sit('bj')")
    await g.js(f"(r)=>{S}.bjDeal(r)", [10, 9, 7, 6])
    await g.step(1.0)
    print('  snap', await g.snap('spielbank_blackjack'))
    arms = await g.js(f"()=>['roul','bj'].map(t=>{{const h={S}.croupiers[t];return [h.armR.rotation.x,h.armL.rotation.x]}})")
    g.check('real: Croupier-Arme unter Schulterhöhe', all(a[0] >= -1.0 and a[1] >= -1.0 for a in arms), arms)
    await g.js(f"()=>{S}.bjStand()")
    await g.step(4)
    await g.js(f"()=>{S}.stand()")
    # Dresscode-Szene von hinten
    await g.js(f"()=>{{const M={M};M.exitVenue(M.P1);const v=M.VENUES.find(v=>v.id==='kurhaus');M.enterVenue(M.P1,v)}}")
    await put_local(g, 1.2, 11.2, 0.6)
    await g.step(0.3)
    await g.js(f"()=>{{const P={M}.P1;P.cam.yaw=3.6;P.cam.pitch=0.1;P.cam.zoom=0.55;P.cam.init=false}}")
    await g.step(0.2)
    print('  snap', await g.snap('spielbank_fliege'))
    await put_local(g, 0.6, 14.5, 3.14159)
    await g.js(f"()=>{{const P={M}.P1;P.cam.yaw=3.14159;P.cam.pitch=0.15;P.cam.zoom=1;P.cam.init=false}}")
    await g.step(0.2)
    print('  snap', await g.snap('spielbank_portier'))
    vis = await g.js(f"()=>{{const S={M}.SPIELBANK;return [S.doorman.g.visible,S.croupiers.roul.g.visible,S.croupiers.bj.g.visible]}}")
    g.check('real: Portier und Croupiers werden gezeichnet', vis == [True, True, True], vis)
    info = await g.js(f"""()=>{{const r={M}.P1.h.room;let n=0;r.grp.traverse(o=>{{if(o.isMesh&&o.visible)n++}});
        return {{mem:{S}.mem,meshes:{S}.meshes,roomMeshes:n,people:r.people.length}}}}""")
    print('  speicher/meshes', info)


run(test, real=REAL)
