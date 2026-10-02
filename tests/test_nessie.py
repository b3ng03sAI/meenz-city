# Nessie im Rhein: Auftauchen beim Schwimmen, 2,50 Mark zahlen (Y) → Schunkel-Granate, ablehnen (X) oder zögern → erledigt,
# Cooldown, Spielstand, Granate werfen → Schunkeln, Autos halten, Fahndung weg.
#   python3 tests/test_nessie.py          Stub-Test mit Asserts
#   python3 tests/test_nessie.py shot     echte Darstellung, Screenshots nach tests/out/nessie_*.jpg
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run, OUT

M = '__MEENZ'
SHOT = 'shot' in sys.argv[1:]

# Spieler mitten in den Rhein (≈300 m rheinaufwärts vom Rathaus) setzen
SWIM = f"""(dz)=>{{const M={M},P=M.P1;if(P.car)M.exitCar(P,true);const s=M.NESSIE.rhineSpot(M.POI.rathaus[0],M.POI.rathaus[1]+dz);
  P.h.x=s[0];P.h.z=s[1];P.h.y=-5.55;P.vy=0;P.cam.yaw=0;}}"""
ACTIVE = f"()=>{{const A={M}.NESSIE.active;return A?{{phase:A.phase,d:Math.hypot(A.x-{M}.P1.h.x,A.z-{M}.P1.h.z)}}:null}}"
UI = "()=>{const e=document.getElementById('nessie');return e?{shown:!e.hidden,opts:!e.querySelector('.opts').hidden,line:e.querySelector('.line').textContent}:null}"
INV = f"()=>{{const M={M},P=M.P1;return {{g:M.NESSIE.granate,own:!!P.owned.nessgran,ammo:P.ammo.nessgran||0,w:P.weapon,money:M.G.money}}}}"

# Fußgänger + Polizist um den Spieler, Verkehrsauto auf einer Straße daneben
CROWD = f"""()=>{{const M={M},P=M.P1;const es=M.EDGES.filter(E=>E.car&&E.len>50&&!E.road.bridge);
  for(const E of es){{const a=M.NODES[E.a],b=M.NODES[E.b];const dx=(b.x-a.x)/E.len,dz=(b.z-a.z)/E.len;const px=a.x+dx*20-dz*9,pz=a.z+dz*20+dx*9;
    if(M.blockedFn(px,pz)||M.swimHere(px,pz))continue;const spots=[];for(let k=0;k<40&&spots.length<7;k++){{const ang=k*0.9,r=3+(k%5)*1.3;const x=px+Math.cos(ang)*r,z=pz+Math.sin(ang)*r;if(!M.blockedFn(x,z)&&!M.swimHere(x,z))spots.push([x,z]);}}
    if(spots.length<7)continue;
    P.h.x=px;P.h.z=pz;P.h.y=M.groundYFn(px,pz,0);P.swim=false;P.vy=0;M.setWanted(1);// Polizist bleibt so im Dienst
    const hs=spots.map(([x,z],i)=>{{const h=M.mkHuman(i===6?'cop':'ped');h.x=x;h.z=z;h.y=M.groundYFn(x,z,0);h.side=1;if(i===6)h.state='cop';h.nessieTest=true;return h;}});
    const c=new M.Car('kombi',a.x+dx*12,a.z+dz*12,Math.atan2(dx,dz),{{ctrl:'ai'}});c.ai={{mode:'traffic'}};c.nessieTest=true;
    return {{n:hs.length,car:true}};}}return null;}}"""
TEST_HUMANS = f"()=>{M}.HUMANS.filter(h=>h.nessieTest)"


async def to_ask(g, dz=300):
    await g.js(SWIM, dz)
    await g.step(0.4)
    await g.js(f"()=>{{const N={M}.NESSIE;N.cooldown=0;N.force=true}}")
    await g.step(0.2)
    a = await g.js(ACTIVE)
    await g.step(2.3)
    return a


async def test(g):
    await g.start()
    N = await g.js(f"()=>{{const N={M}.NESSIE;return {{a:N.active,s:N.schunkel,g:N.granate,cd:typeof N.cooldown,w:!!{M}.WEAPONS.nessgran}}}}")
    g.check('NESSIE-API: active/schunkel null, granate false, cooldown Zahl, Waffe registriert',
            N['a'] is None and N['s'] is None and N['g'] is False and N['cd'] == 'number' and N['w'], N)

    # 1. Ohne Wasser kein Auftauchen, auch nicht erzwungen
    await g.js(f"()=>{{const N={M}.NESSIE;N.cooldown=0;N.force=true}}")
    await g.step(1.2)
    g.check('an Land: erzwungen trotzdem keine Nessie', await g.js(ACTIVE) is None)
    await g.js(f"()=>{{{M}.NESSIE.force=false}}")

    # 2. Erzwungen beim Schwimmen im Rhein → taucht nahe beim Spieler auf, fragt nach 2,50 Mark
    await g.js(SWIM, 300)
    await g.step(0.4)
    sw = await g.js(f"()=>{{const P={M}.P1;return [P.swim,{M}.NESSIE.inRhine(P.h.x,P.h.z)]}}")
    g.check('Spieler schwimmt im Rhein', sw == [True, True], sw)
    await g.js(f"()=>{{const N={M}.NESSIE;N.cooldown=0;N.force=true}}")
    await g.step(0.2)
    a = await g.js(ACTIVE)
    g.check('Nessie taucht auf (phase rise, 6–18 m entfernt)', a and a['phase'] == 'rise' and 6 < a['d'] < 18, a)
    await g.step(2.3)
    a = await g.js(ACTIVE); ui = await g.js(UI)
    g.check('nach dem Auftauchen: Frage offen (phase ask)', a and a['phase'] == 'ask', a)
    g.check('Dialog sichtbar mit Y/X-Knöpfen und „zwei Mark fuffzisch“', ui['shown'] and ui['opts'] and 'zwei Mark fuffzisch' in ui['line'], ui)

    # 3. Zahlen mit Y: −2,50, Granate im Inventar, Spielstand enthält sie
    await g.js(f"()=>{{{M}.G.money=100}}")
    await g.key('KeyY')
    a = await g.js(ACTIVE); inv = await g.js(INV)
    g.check('Y → phase pay', a and a['phase'] == 'pay', a)
    g.check('2,50 abgezogen (100 → 97,5)', abs(inv['money'] - 97.5) < 1e-9, inv['money'])
    g.check('Schunkel-Granate im Inventar (granate, owned, 1 Stück)', inv['g'] and inv['own'] and inv['ammo'] == 1, inv)
    snap = await g.js(f"()=>{M}.snapshot()")
    g.check('snapshot enthält die Granate', snap.get('nessie', {}).get('granate') is True and snap['p']['owned'].get('nessgran'), snap.get('nessie'))
    await g.key('KeyX')
    g.check('X nach der Antwort ändert nichts mehr', (await g.js(ACTIVE))['phase'] in ('pay', 'dive'))

    # 4. Nessie verschwindet, Cooldown verhindert sofortiges Wiederkommen
    await g.step(6)
    g.check('Nessie danach weg (active null, Dialog zu)', await g.js(ACTIVE) is None and not (await g.js(UI))['shown'])
    cd = await g.js(f"()=>{M}.NESSIE.cooldown")
    g.check('Cooldown läuft (> 200 s)', cd > 200, cd)
    await g.js(f"()=>{{{M}.NESSIE.force=true}}")
    await g.step(1.5)
    g.check('Cooldown: erzwungen kein zweites Auftauchen', await g.js(ACTIVE) is None)
    await g.js(f"()=>{{{M}.NESSIE.force=false}}")

    # 5. Spielstände: alter Stand ohne Nessie lädt, neuer Stand bringt die Granate zurück
    old = dict(snap); old.pop('nessie'); old['p'] = dict(snap['p']); old['p']['owned'] = {k: v for k, v in snap['p']['owned'].items() if k != 'nessgran'}
    old['p']['ammo'] = {k: v for k, v in snap['p']['ammo'].items() if k != 'nessgran'}; old['p']['weapon'] = 'fist'
    ok = await g.js(f"(d)=>{M}.applySave(d)", old); inv = await g.js(INV)
    g.check('alter Spielstand ohne nessie lädt, keine Granate', ok and not inv['g'] and not inv['own'], inv)
    ok = await g.js(f"(d)=>{M}.applySave(d)", snap); inv = await g.js(INV)
    g.check('neuer Spielstand bringt die Granate zurück', ok and inv['g'] and inv['own'] and inv['ammo'] == 1, inv)

    # 6. Werfen: alle im Umkreis schunkeln, Auto hält, Fahndung weg, Granate verbraucht
    crowd = await g.js(CROWD)
    g.check('Testmenge + Verkehrsauto aufgestellt', crowd and crowd['n'] == 7, crowd)
    await g.step(0.5)
    await g.js(f"()=>{{const M={M},P=M.P1;M.setWanted(2);P.weapon='nessgran';P.fireT=0;M.playerFire(P,{{fireP:true,fire:true}})}}")
    inv = await g.js(INV)
    g.check('nach dem Wurf: Granate weg (owned false, 0 Stück)', not inv['own'] and inv['ammo'] == 0, inv)
    g.check('Granate fliegt (NESSIE.proj)', await g.js(f"()=>!!{M}.NESSIE.proj"))
    await g.step(2)
    K = await g.js(f"""()=>{{const M={M},K=M.NESSIE.schunkel;if(!K)return null;const hs=M.HUMANS.filter(h=>h.nessieTest);
      return {{t:K.t,n:K.people.length,ours:hs.filter(h=>h.state==='nessieS'&&K.people.includes(h)).length,cop:hs.some(h=>h.kind==='cop'&&h.nessieS&&h.nessieS.prev==='cop'),linked:hs.filter(h=>h.nessieS&&(h.nessieS.hasL||h.nessieS.hasR)).length,
        wanted:M.wanted,proj:!!M.NESSIE.proj}}}}""")
    g.check('Schunkeln läuft (NESSIE.schunkel, ~20 s)', K and 15 < K['t'] <= 20, K)
    g.check('alle 7 Testleute schunkeln, auch der Polizist im Dienst (state nessieS)', K and K['ours'] == 7 and K['cop'], K)
    g.check('eingehakt: jede Testperson hat einen Nachbarn', K and K['linked'] == 7, K)
    g.check('Fahndung gelöscht (wanted 0)', K and K['wanted'] == 0, K)
    await g.step(3)
    car = await g.js(f"()=>{{const c={M}.CARS.find(c=>c.nessieTest);return c?{{stop:!!c.nessieStop,mode:c.ai.mode,sp:Math.abs(c.speed)}}:null}}")
    g.check('Verkehrsauto im Umkreis hält an', car and car['stop'] and car['mode'] == 'traffic' and car['sp'] < 0.5, car)
    inv = await g.js(INV)
    g.check('Granate bleibt weg (granate false, Waffe gewechselt)', not inv['g'] and inv['w'] != 'nessgran', inv)
    g.check('snapshot ohne Granate', (await g.js(f"()=>{M}.snapshot().nessie.granate")) is False)
    cl = await g.js(f"()=>{M}.HALTUNG.clamped")
    await g.step(1)
    g.check('Schunkel-Pose löst die Haltungssperre nicht aus', await g.js(f"()=>{M}.HALTUNG.clamped") == cl)
    await g.step(16)
    after = await g.js(f"""()=>{{const M={M};const hs=M.HUMANS.filter(h=>h.nessieTest&&!h.removed);const c=M.CARS.find(c=>c.nessieTest);
      return {{s:M.NESSIE.schunkel,st:hs.map(h=>h.state),car:c?[c.ai.mode,!!c.nessieStop]:null}}}}""")
    g.check('nach 20 s: Schunkeln vorbei, Leute laufen weiter', after['s'] is None and all(s in ('walk', 'flee', 'cop', 'copReturn') for s in after['st']), after)
    g.check('Auto fährt wieder (traffic, nicht mehr angehalten)', after['car'] is None or after['car'] == ['traffic', False], after['car'])

    # 7. Ablehnen mit X → unter Wasser gezogen → erledigt → normaler Respawn
    a = await to_ask(g, 500)
    g.check('zweite Begegnung: Frage offen', (await g.js(ACTIVE) or {}).get('phase') == 'ask', a)
    await g.key('KeyX')
    g.check('X → Nessie wird wütend (phase wrath)', (await g.js(ACTIVE) or {}).get('phase') == 'wrath')
    await g.step(4)
    g.check('Spieler ist erledigt (gameOver wasted)', await g.js(f"()=>{M}.P1.gameOver") == 'wasted')
    await g.step(3)
    g.check('Nessie danach abgetaucht', await g.js(ACTIVE) is None)
    await g.step(4)
    r = await g.js(f"()=>{{const P={M}.P1;return [P.gameOver,P.h.health]}}")
    g.check('Respawn wie gewohnt (gameOver null, Gesundheit 100)', r[0] is None and r[1] == 100, r)

    # 8. Zögern (12 s) zählt als Ablehnen
    await to_ask(g, -300)
    g.check('dritte Begegnung: Frage offen', (await g.js(ACTIVE) or {}).get('phase') == 'ask')
    await g.step(11)
    g.check('nach 11 s noch offen', (await g.js(ACTIVE) or {}).get('phase') == 'ask')
    await g.step(5)
    g.check('Zeit abgelaufen → erledigt', await g.js(f"()=>{M}.P1.gameOver") == 'wasted')
    await g.step(10)

    # 9. Pleite: Y ohne 2,50 → keine Granate, kein Tod
    await to_ask(g, 300)
    await g.js(f"()=>{{{M}.G.money=1}}")
    await g.key('KeyY')
    await g.step(6)
    inv = await g.js(INV)
    g.check('pleite: kein Geld weg, keine Granate, nicht erledigt, Nessie weg',
            inv['money'] == 1 and not inv['g'] and await g.js(f"()=>{M}.P1.gameOver") is None and await g.js(ACTIVE) is None, inv)


async def snap_hidden(g, name):
    """Wie g.snap, aber ohne die Spielerfigur im Bild."""
    import base64
    url = await g.js(f"()=>{M}.snap(8,true)")
    os.makedirs(OUT, exist_ok=True)
    with open(OUT + name + '.jpg', 'wb') as f:
        f.write(base64.b64decode(url.split(',', 1)[1]))
    return OUT + name + '.jpg'


async def shots(g):
    await g.start()
    await g.js(f"()=>{{{M}.setWeather('klar');{M}.gameMin=16*60}}")
    await g.js(SWIM, 300)
    await g.step(0.4)
    await g.js(f"()=>{{const N={M}.NESSIE;N.cooldown=0;N.force=true}}")
    await g.step(2.8)
    g.check('Nessie fragt', (await g.js(ACTIVE) or {}).get('phase') == 'ask')
    # Kamera: Spieler schaut Nessie an
    await g.js(f"()=>{{const M={M},A=M.NESSIE.active,P=M.P1;P.cam.yaw=Math.atan2(A.x-P.h.x,A.z-P.h.z);P.cam.pitch=-0.25;P.cam.init=false}}")
    print('  ->', await g.snap('nessie_rhein', 8))
    await g.key('KeyY')
    await g.step(7)
    crowd = await g.js(CROWD)
    g.check('Menge aufgestellt', crowd)
    await g.js(f"()=>{{const M={M},P=M.P1;P.weapon='nessgran';P.fireT=0;M.playerFire(P,{{fireP:true,fire:true}})}}")
    await g.step(5)
    await g.js(f"""()=>{{const M={M},P=M.P1,K=M.NESSIE.schunkel;const hs=K.people.filter(h=>h.nessieTest);const mx=hs.reduce((s,h)=>s+h.x,0)/hs.length,mz=hs.reduce((s,h)=>s+h.z,0)/hs.length;
      const f=hs[0].nessieS.face;P.h.x=mx+Math.sin(f)*7;P.h.z=mz+Math.cos(f)*7;P.h.y=M.groundYFn(P.h.x,P.h.z,0);P.cam.yaw=f+Math.PI;P.cam.pitch=-0.05;P.cam.init=false}}""")
    g.check('Schunkeln läuft', await g.js(f"()=>!!{M}.NESSIE.schunkel"))
    print('  ->', await snap_hidden(g, 'nessie_schunkel'))
    arms = await g.js(f"()=>{M}.NESSIE.schunkel.people.map(h=>h.armR.rotation.x)")
    g.check('rechter Arm nie über −1,0 rad (Haltungsregel)', all(x >= -1.0 for x in arms), min(arms))


if SHOT:
    run(shots, real=True, viewport=(1280, 800))
else:
    run(test)
