# Power-up Eichhörnchen: Verwandlung, Pickups im Park, Klettern, Kronensprung, Runterhüpfen, Nüsse, Passanten, Ablauf
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run, OUT

M = '__MEENZ'

# Baum mit Nachbarbaum in 5–12 m und freiem Boden 1,1 m neben dem Stamm; Spieler dorthin, Blick auf den Stamm
PLACE = f"""(k)=>{{const M={M},P=M.P1,h=P.h,T=M.TREES;let n=0;
  for(let i=0;i<T.length;i+=7){{const t=T[i];if(Math.abs(t.x)>3000||Math.abs(t.z)>3000)continue;
    const nb=T.find(o=>o!==t&&Math.hypot(o.x-t.x,o.z-t.z)>5&&Math.hypot(o.x-t.x,o.z-t.z)<12);if(!nb)continue;
    for(let a=0;a<6.28;a+=0.4){{const x=t.x+Math.sin(a)*1.1,z=t.z+Math.cos(a)*1.1;if(M.blockedFn(x,z)||M.swimHere(x,z,0))continue;
      if(n++<k)break;h.x=x;h.z=z;h.y=M.groundYFn(x,z);P.vy=0;P.ground=true;const yaw=Math.atan2(t.x-x,t.z-z);P.cam.yaw=yaw;h.facing=yaw;h.sync();
      return {{t:T.indexOf(t),nb:T.indexOf(nb),crown:M.EICH.crownH(t),base:M.groundYFn(t.x,t.z)}};}}}}
  return null}}"""
STATE = f"""()=>{{const M={M},P=M.P1,c=M.EICH.climbing;return {{kind:P.morph?P.morph.kind:null,hidden:!P.h.g.visible,
  climb:c?{{t:M.TREES.indexOf(c.tree),h:c.h,phase:c.phase}}:null,y:P.h.y,x:P.h.x,z:P.h.z,ground:P.ground,hp:P.h.health,nuts:M.EICH.nuts,money:M.G.money}}}}"""


async def activate(g):
    return await g.js(f"()=>{{const M={M};return M.puActivate(M.P1,'squirrel')}}")


async def test(g):
    await g.start()
    info = await g.js(f"()=>{{const E={M}.EICH;return {{pick:E.pickups.length,nuts:E.nutSpots.length,climb:E.climbing}}}}")
    g.check('mind. 3 Eichhörnchen-Pickups in Parks', info['pick'] >= 3, info['pick'])
    g.check('mind. 30 Nuss-Plätze in Parks', info['nuts'] >= 30, info['nuts'])
    g.check('EICH.climbing ist anfangs null', info['climb'] is None)

    # 1. Verwandlung per puActivate
    g.check('puActivate(P1,"squirrel") klappt', await activate(g))
    await g.step(0.2)
    s = await g.js(STATE)
    g.check('P1.morph.kind === squirrel', s['kind'] == 'squirrel', s['kind'])
    g.check('Mensch ausgeblendet', s['hidden'])
    m = await g.js(f"()=>{{const P={M}.P1;return {{dur:P.pu.squirrel,hud:{M}.EICH.hud&&!{M}.EICH.hud.hidden}}}}")
    g.check('Dauer ~60 s', 58 < m['dur'] <= 60, m['dur'])
    g.check('Nuss-Zähler im HUD sichtbar', m['hud'])

    # 2. Hoher Sprung
    await g.js(f"()=>{{const P={M}.P1;P.vy=0;P.ground=true}}")
    y0 = (await g.js(STATE))['y']
    await g.page.keyboard.down('Space'); await g.step(1 / 60); await g.page.keyboard.up('Space')
    top = 0
    for _ in range(40):
        await g.step(1 / 60)
        top = max(top, (await g.js(STATE))['y'] - y0)
    g.check('Eichhörnchen springt höher als ein Mensch (> 1,5 m)', top > 1.5, f'{top:.2f} m')
    await g.step(1)

    # 3. Klettern: in den Stamm laufen → hoch bis in die Krone
    tr = await g.js(PLACE, 0)
    g.check('Baum mit Nachbarbaum gefunden', tr is not None, tr)
    await g.key('KeyW', hold=0.25, after=0)
    s = await g.js(STATE)
    g.check('Lauf in den Stamm startet Klettern', s['climb'] is not None and s['climb']['t'] == tr['t'], s['climb'])
    await g.step(3)
    s = await g.js(STATE)
    g.check('sitzt in der Krone (phase sit)', s['climb'] and s['climb']['phase'] == 'sit', s['climb'])
    g.check('Höhe = Kronenhöhe', abs(s['y'] - (tr['base'] + tr['crown'])) < 0.05 and tr['crown'] > 3.5, f"y={s['y']:.2f} krone={tr['base'] + tr['crown']:.2f}")
    await g.step(1)
    g.check('bleibt ohne Eingabe in der Krone', (await g.js(STATE))['climb'] is not None)

    # 4. Leertaste: Sprung zur Nachbarkrone (Blick dorthin)
    await g.js(f"(i)=>{{const M={M},P=M.P1,t=M.TREES[i];const a=Math.atan2(t.x-P.h.x,t.z-P.h.z);P.h.facing=a;P.cam.yaw=a}}", tr['nb'])
    hp0 = (await g.js(STATE))['hp']
    await g.key('Space', after=0)
    g.check('Sprung läuft (phase leap)', (await g.js(STATE))['climb']['phase'] == 'leap')
    await g.step(2)
    s = await g.js(STATE)
    nb_crown = await g.js(f"(i)=>{{const M={M},t=M.TREES[i];return M.groundYFn(t.x,t.z)+M.EICH.crownH(t)}}", tr['nb'])
    g.check('landet in der Nachbarkrone', s['climb'] and s['climb']['t'] == tr['nb'] and s['climb']['phase'] == 'sit', s['climb'])
    g.check('Höhe = Kronenhöhe des Nachbarbaums', abs(s['y'] - nb_crown) < 0.05, f"{s['y']:.2f}/{nb_crown:.2f}")
    g.check('EICH.leaps gezählt', await g.js(f"()=>{M}.EICH.leaps") == 1)

    # 5. Laufen in der Krone: runterhüpfen, weich landen
    await g.key('KeyW', hold=0.5, after=0)
    g.check('Laufen in der Krone → Absprung', (await g.js(STATE))['climb'] is None)
    await g.step(2.5)
    s = await g.js(STATE)
    g.check('wieder am Boden', s['ground'] and s['y'] < nb_crown - 2, f"y={s['y']:.2f}")
    g.check('kein Fallschaden', s['hp'] >= hp0, f"{hp0} → {s['hp']}")

    # 6. Nüsse
    s0 = await g.js(STATE)
    n = await g.js(f"()=>{{const M={M},P=M.P1,E=M.EICH;const n=E.nutSpots.find(n=>!n.got);P.h.x=n.x+0.4;P.h.z=n.z;P.h.y=n.y;P.vy=0;P.h.sync();return E.nutSpots.indexOf(n)}}")
    await g.step(0.1)
    s = await g.js(STATE)
    g.check('Nuss eingesammelt → Zähler +1', s['nuts'] == s0['nuts'] + 1, s['nuts'])
    g.check('Belohnung +5 €', s['money'] == s0['money'] + 5, s['money'] - s0['money'])
    g.check('Nuss ist weg', await g.js(f"(i)=>{M}.EICH.nutSpots[i].got>0", n))
    g.check('HUD zeigt Nusszahl', '1 Nuss' in await g.js(f"()=>{M}.EICH.hud.textContent"))

    # 7. Passanten reagieren (verzückt oder erschrocken) mit Sprechblase
    r = await g.js(f"""()=>{{const M={M},P=M.P1,h=P.h;const o=M.HUMANS.find(o=>o.kind==='ped'&&o.alive&&!o.inCar&&!o.mission&&!o.keeper&&o.state==='walk'&&o!==h);
        if(!o)return false;for(const q of M.HUMANS)q.eichT=1e9;o.eichT=0;o.x=h.x+3;o.z=h.z;o.vx=o.vz=0;o.sync();window.__eichPed=o;return true}}""")
    g.check('Passant gefunden', r)
    await g.step(0.5)
    b = await g.js(f"()=>{{const o=window.__eichPed;return {{txt:o.bubble?o.bubble.textContent:'',n:{M}.EICH.reacts}}}}")
    g.check('Sprechblase mit Mundart-Reaktion', b['txt'] != '' and b['n'] >= 1, b)

    # 8. Ablauf: nach 60 s ist die Verwandlung vorbei, auch aus der Baumkrone heraus
    await g.js(f"()=>{{const P={M}.P1;P.pu.squirrel=0.05}}")
    await g.step(0.1)
    g.check('vorzeitiges Ende stellt Mensch wieder her', (await g.js(STATE))['kind'] is None)
    tr2 = await g.js(PLACE, 1)
    g.check('Baum 2 gefunden', tr2 is not None)
    g.check('puActivate erneut', await activate(g))
    await g.key('KeyW', hold=0.25, after=3)
    s = await g.js(STATE)
    g.check('wieder in der Krone', s['climb'] and s['climb']['phase'] == 'sit', s['climb'])
    await g.step(55)
    g.check('kurz vor Ablauf noch Eichhörnchen', (await g.js(STATE))['kind'] == 'squirrel')
    await g.step(3)
    s = await g.js(STATE)
    g.check('nach 60 s: Verwandlung vorbei, Mensch sichtbar', s['kind'] is None and not s['hidden'], s)
    g.check('Mensch steht am Boden neben dem Baum', s['y'] < tr2['base'] + 1 and s['ground'], f"y={s['y']:.2f}")
    g.check('EICH.climbing wieder null, HUD aus', await g.js(f"()=>{M}.EICH.climbing===null&&{M}.EICH.hud.hidden"))

    # 9. Pickup im Park verwandelt beim Drüberlaufen
    p = await g.js(f"()=>{{const M={M},P=M.P1,it=M.EICH.pickups[0];P.h.x=it.x+0.5;P.h.z=it.z;P.h.y=M.groundYFn(it.x,it.z);P.h.sync();return it.park}}")
    await g.step(0.2)
    s = await g.js(STATE)
    g.check(f'Park-Pickup ({p}) verwandelt in Eichhörnchen', s['kind'] == 'squirrel', s['kind'])
    g.check('Pickup ist danach weg', await g.js(f"()=>{M}.EICH.pickups[0].taken>0&&!{M}.EICH.pickups[0].g.visible"))


async def shots(g):
    await g.start()
    await g.js(f"()=>{{{M}.gameMin=13*60}}")
    tr = await g.js(PLACE, 3)
    await activate(g)
    await g.js(f"()=>{{const M={M},P=M.P1,h=P.h;h.x+=1.5*Math.sin(P.cam.yaw+Math.PI);h.z+=1.5*Math.cos(P.cam.yaw+Math.PI);h.facing=P.cam.yaw+2.2;P.cam.yaw+=0.9;P.cam.pitch=0.15;h.sync()}}")
    await g.step(1)
    m = await g.js(f"()=>{{const u={M}.P1.morph.g.userData;return {{legs:u.legs.length,tail:u.tail.length}}}}")
    g.check('Modell: 4 Beine, Schwanzkette', m['legs'] == 4 and m['tail'] >= 4, m)
    print('  Bild:', await g.snap('eich_boden'))
    await g.js(PLACE, 3)
    await g.key('KeyW', hold=0.25, after=0)
    await g.js(f"()=>{{const P={M}.P1;P.cam.yaw+=0.6;P.cam.pitch=-0.3}}")
    print('  Bild:', await g.snap('eich_stamm', 1))
    await g.step(3)
    await g.js(f"()=>{{const P={M}.P1;P.cam.pitch=0.45}}")
    await g.step(0.5)
    print('  Bild:', await g.snap('eich_krone'))
    g.check('in der Krone', await g.js(f"()=>!!{M}.EICH.climbing"))


if len(sys.argv) > 1 and sys.argv[1] == 'real':
    run(shots, real=True)
else:
    run(test)
