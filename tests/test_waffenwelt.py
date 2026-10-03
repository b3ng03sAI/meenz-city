# Waffenverstecke in der ganzen Welt (p6u_waffenwelt.js): ~300 Verstecke in Mainz + Wiesbaden, verteilt über alle Stadtteile,
# Reviere und Lazy-Zonen; Seltenheit je Umgebung (schwere Waffen nur in Geheimverstecken); Meshes nur in Spielernähe;
# Einsammeln mit Mundart-Hinweis und Zähler; Nachschub nach 5 bzw. 15 min; kein globaler Zufall; alte Pickups unberührt.
# real=True nur für den Screenshot (MEENZ_WW_SHOT=1): tests/out/waffenwelt_cluster.jpg
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
S = f'{M}.WWELT'
SHOT = os.environ.get('MEENZ_WW_SHOT') == '1'

TELE = f"([x,z,y])=>{{const M={M},P=M.P1;if(P.car)M.exitCar(P,true);P.h.x=x;P.h.z=z;P.h.y=(y===undefined||y===null)?M.groundYFn(x,z,0):y;P.h.vy=0;P.h.sync()}}"
SPOT = f"(i)=>{{const s={S}.spots[i];return {{i:s.i,x:s.x,z:s.z,y:s.y,kind:s.kind,secret:s.secret,active:s.active,t:s.t,live:s.live,roof:s.roof,name:s.name}}}}"
NEAR = f"""([x,z])=>{{const W={S};return {{live:W.live.length,inst:W.api.instCount(),dc:W.api.drawCalls(),
  liveAct:W.live.filter(s=>s.active).reduce((a,s)=>a+s.items.length,0),maxLiveD:Math.max(0,...W.live.map(s=>Math.hypot(s.x-x,s.z-z))),
  inR:W.spots.filter(s=>Math.hypot(s.x-x,s.z-z)<W.rIn).length,inRlive:W.spots.filter(s=>Math.hypot(s.x-x,s.z-z)<W.rIn&&s.live).length}}}}"""


async def tele(g, x, z, y=None):
    await g.js(TELE, [x, z, y])


async def test(g):
    await g.start()
    g.check('Spiel läuft', await g.js(f"()=>{M}.mode") == 'play')

    # 1. Anzahl, Verteilung, Abstand
    st = await g.js(f"""()=>{{const W={S},sp=W.spots;let gap=1e9;for(let i=0;i<sp.length;i++)for(let j=i+1;j<sp.length;j++){{const d=Math.hypot(sp[i].x-sp[j].x,sp[i].z-sp[j].z);if(d<gap)gap=d;}}
      const cat={{}};for(const s of sp)cat[s.cat]=(cat[s.cat]||0)+1;
      return {{n:sp.length,gap,cat,mz:sp.filter(s=>s.z>-3500).length,wi:sp.filter(s=>s.z<-4000).length,under:sp.filter(s=>s.under).length,roof:sp.filter(s=>s.roof).length,
        finite:sp.every(s=>Number.isFinite(s.x)&&Number.isFinite(s.z)&&Number.isFinite(s.y))}}}}""")
    g.check('250–350 Waffenverstecke', 250 <= st['n'] <= 350, st['n'])
    g.check('Mainz (>= 120) und Wiesbaden (>= 60) haben Verstecke', st['mz'] >= 120 and st['wi'] >= 60, st)
    g.check('Verstecke mindestens 20 m auseinander', st['gap'] >= 20, round(st['gap'], 1))
    g.check('alle Koordinaten endlich', st['finite'])
    cats = st['cat']
    want = ['gasse', 'hinterhof', 'park', 'parkplatz', 'baustelle', 'bahn', 'rheinufer', 'hafen', 'flugplatz', 'dach', 'geheim']
    g.check('alle Ortsarten vertreten (Gassen, Hinterhöfe, Parks, Parkplätze, Baustellen, Gleise, Rheinufer, Häfen, Flugplatz, Dächer)',
            all(cats.get(k, 0) >= 1 for k in want), cats)
    g.check('Verstecke unter Brücken (>= 2) und auf Dächern (>= 5)', st['under'] >= 2 and st['roof'] >= 5, [st['under'], st['roof']])

    cov = await g.js(f"""()=>{{const M={M},W=M.WWELT,sp=W.spots;
      const zonesNo=M.REVIER.zones.filter(z=>!sp.some(s=>W.api.revierZoneAt(s.x,s.z)===z.id)).map(z=>z.name);
      const lazyNo=W.api.lazyZones().filter(Z=>sp.filter(s=>Math.hypot(s.x-Z.x,s.z-Z.z)<450).length<2).map(Z=>Z.name);
      // Stadtteile mit nennenswertem Straßennetz (jeder 10. Straßenknoten, Stadtteil per districtAt)
      const cnt=new Map();for(let k=0;k<M.NODES.length;k+=10){{const N=M.NODES[k];if(!N.e.length)continue;const d=W.api.district(N.x,N.z);cnt.set(d,(cnt.get(d)||0)+1);}}
      const by=new Map();for(const s of sp)by.set(W.api.district(s.x,s.z),(by.get(W.api.district(s.x,s.z))||0)+1);
      const distNo=[...cnt].filter(([d,c])=>c>=20&&(by.get(d)||0)<2).map(([d,c])=>d+':'+c);
      return {{zones:M.REVIER.zones.length,zonesNo,lazy:W.api.lazyZones().length,lazyNo,dists:[...cnt].filter(([d,c])=>c>=20).length,distNo}}}}""")
    g.check('jedes Revier hat mindestens ein Versteck', cov['zones'] > 30 and not cov['zonesNo'], cov)
    g.check('jede Lazy-Zone hat >= 2 Verstecke im Umkreis von 450 m', cov['lazy'] > 10 and not cov['lazyNo'], cov)
    g.check('jeder Stadtteil mit Straßennetz hat >= 2 Verstecke', cov['dists'] > 25 and not cov['distNo'], cov)

    # 2. Seltenheit
    tr = await g.js(f"""()=>{{const W={S},sp=W.spots;const H=['minigun','flammen','rpg'];const n=k=>sp.filter(s=>s.kind===k).length;const has=(s,L)=>s.items.some(k=>L.includes(k));
      return {{heavyOut:sp.filter(s=>has(s,H)&&!s.secret).length,secretLight:sp.filter(s=>s.secret&&!H.includes(s.kind)).length,secret:sp.filter(s=>s.secret).length,
        roughOut:sp.filter(s=>has(s,['smg','shotgun','saege'])&&!s.rough).length,rough:n('smg')+n('shotgun'),
        items:sp.reduce((a,s)=>a+s.items.length,0),caches:sp.filter(s=>!s.secret&&s.items.length>1).length,mainFirst:sp.every(s=>s.items[0]===s.kind),
        secretCache:sp.filter(s=>s.secret).every(s=>s.items.length===3&&s.items.includes('ammo')&&s.items.includes('armor')),
        common:n('bat')+n('messer')+n('pistol'),rare:n('rifle')+n('scharf')+n('molotov')+n('grenade'),armor:n('armor'),ammo:n('ammo'),
        heavy:H.map(n),unknown:sp.filter(s=>s.items.some(k=>!(k in {M}.WEAPONS)&&k!=='armor'&&k!=='ammo')).length}}}}""")
    g.check('schwere Waffen (Minigun/Flammenwerfer/Raketenwerfer) nur in Geheimverstecken', tr['heavyOut'] == 0, tr)
    g.check('~20 Geheimverstecke, alle mit schwerer Waffe, jede Art mehrfach', 18 <= tr['secret'] <= 30 and tr['secretLight'] == 0 and min(tr['heavy']) >= 4, tr)
    g.check('MP/Schrotflinte/Kettensäge nur in rauen Ecken', tr['roughOut'] == 0 and tr['rough'] >= 15, tr)
    g.check('seltene Waffen seltener als Nahkampf + Pistole', 0 < tr['rare'] < tr['common'] / 2, tr)
    g.check('Schutzwesten und Munitionskisten verteilt (je >= 10)', tr['armor'] >= 10 and tr['ammo'] >= 10, tr)
    g.check('nur bekannte Waffenarten', tr['unknown'] == 0, tr)
    g.check('kleine Lager: >= 30 Verstecke mit 2–3 Teilen, insgesamt >= 400 Teile', tr['caches'] >= 30 and tr['items'] >= 400 and tr['mainFirst'], tr)
    g.check('Geheimverstecke: schwere Waffe + Munition + Weste', tr['secretCache'], tr)

    # 3. kein globaler Zufall: Platzierung + Instanzen anlegen; Platzierung deterministisch
    rnd = await g.js(f"""()=>{{const W={S},r=Math.random;let n=0;Math.random=function(){{n++;return r()}};
      try{{const pl=W.api.place();return {{n,len:pl.length,same:pl.length===W.spots.length&&pl.every((p,i)=>p.kind===W.spots[i].kind&&p.secret===W.spots[i].secret&&p.cat===W.spots[i].cat)}}}}finally{{Math.random=r}}}}""")
    g.check('Verstecke berechnen ohne Math.random', rnd['n'] == 0, rnd)
    # ganzer Aufbau inkl. Grafik (InstancedMesh, Points, Geometrien, Materialien – three.js zieht UUIDs aus Math.random)
    rb = await g.js(f"""()=>{{const W={S},r=Math.random;let n=0;Math.random=function(){{n++;return r()}};
      try{{W.api.rebuild();const g0=!!W.gfx;W.api.scan();W.api.sync();return {{n,len:W.spots.length,g0,g1:!!W.gfx,live:W.live.length,inst:W.api.instCount()}}}}finally{{Math.random=r}}}}""")
    g.check('Aufbau + Grafik anlegen ohne Math.random', rb['n'] == 0 and not rb['g0'] and rb['g1'] and rb['inst'] >= 1, rb)
    g.check('Platzierung deterministisch (gleiche Arten/Kategorien wie beim Boot)', rnd['same'], rnd)

    # 4. Meshes nur in Spielernähe
    p0 = await g.js(f"()=>{M}.ppos({M}.P1)")
    nr = await g.js(NEAR, p0)
    g.check('beim Start nur nahe Verstecke lebendig (< 40)', nr['live'] < 40, nr)
    g.check('lebendige Verstecke höchstens 180 m entfernt', nr['maxLiveD'] <= 180, nr)
    g.check('alle Verstecke unter 120 m sind lebendig', nr['inR'] == nr['inRlive'], nr)
    g.check('Instanzen = gefüllte lebendige Verstecke', nr['inst'] == nr['liveAct'], nr)
    dense = await g.js(f"""()=>{{const sp={S}.spots;let best=null,bn=-1;for(const a of sp){{if(a.roof)continue;const n=sp.filter(b=>Math.hypot(a.x-b.x,a.z-b.z)<120).length;if(n>bn){{bn=n;best=a;}}}}return [best.x,best.z,bn]}}""")
    await tele(g, dense[0] + 3, dense[1] + 3)
    rnd2 = await g.js(f"""()=>{{const W={S},r=Math.random;let n=0;Math.random=function(){{n++;return r()}};try{{W.api.scan();W.api.sync();return n}}finally{{Math.random=r}}}}""")
    g.check('Meshes anlegen (scan + sync) ohne Math.random', rnd2 == 0, rnd2)
    await g.step(0.3)
    nd = await g.js(NEAR, [dense[0] + 3, dense[1] + 3])
    g.check(f'dichteste Stelle ({dense[2]} Verstecke < 120 m): alle lebendig, Instanzen da', nd['inR'] == nd['inRlive'] and nd['inst'] == nd['liveAct'] and nd['inst'] >= 2, nd)
    g.check('höchstens 15 zusätzliche Draw-Calls an der dichtesten Stelle', 0 < nd['dc'] <= 15, nd)
    far = await g.js(f"()=>{{const s={S}.spots.find(s=>s.z<-8000&&!s.roof);return [s.x+60,s.z]}}")
    await tele(g, far[0], far[1])
    await g.step(0.3)
    nf = await g.js(NEAR, far)
    old = await g.js(f"([x,z])=>{S}.spots.filter(s=>s.live&&Math.hypot(s.x-x,s.z-z)<500).length", dense)
    g.check('nach Sprung nach Wiesbaden: alte Verstecke weg, neue lebendig', old == 0 and nf['live'] >= 1 and nf['maxLiveD'] <= 180, [old, nf])

    # 5. Einsammeln: Schläger nahe dem Start mit Mundart-Hinweis
    bat = await g.js(f"()=>{{const W={S},S0={M}.POI.start;const b=W.spots.filter(s=>s.kind==='bat'&&!s.secret).sort((a,b)=>Math.hypot(a.x-S0[0],a.z-S0[1])-Math.hypot(b.x-S0[0],b.z-S0[1]))[0];return [b.i,Math.hypot(b.x-S0[0],b.z-S0[1])]}}")
    g.check('Baseballschläger-Versteck in Sichtweite des Startpunkts (25–60 m)', 25 <= bat[1] <= 60, round(bat[1], 1))
    await g.js(f"()=>{{const P={M}.P1;P.owned={{fist:true}};P.ammo={{}};P.mag={{}};P.weapon='fist'}}")
    s = await g.js(SPOT, bat[0])
    await tele(g, s['x'] + 0.4, s['z'], s['y'])
    await g.step(0.4)
    got = await g.js(f"""(i)=>{{const M={M},W=M.WWELT,s=W.spots[i];return {{owned:!!M.P1.owned.bat,weapon:M.P1.weapon,active:s.active,t:s.t,found:W.found.size,
      hint:document.getElementById('hint').innerHTML,last:W.lastHint,n:W.spots.length}}}}""", bat[0])
    g.check('Schläger aufgesammelt und in der Hand', got['owned'] and got['weapon'] == 'bat', got)
    # lastHint statt #hint: der Start-Hinweis aus startGame() kommt per setTimeout nach Wanduhr und kann #hint überschreiben
    g.check('Mundart-Hinweis „Ei, e Baseballschläger!“ mit Waffennamen', 'Ei, e Baseballschläger!' in got['last'] and 'BASEBALLSCHLÄGER' in got['last'], got['last'])
    g.check('Hinweis zeigt den Zähler „Waffenverstecke gefunden: 1 / N“', f"Waffenverstecke gefunden: 1 / {got['n']}" in got['last'], got['last'])
    g.check('Versteck leer, Nachschub in 5 min', not got['active'] and 290 <= got['t'] <= 300, got)

    # 6. Nachschub nach dem Timer (Spieler steht daneben, nicht drauf)
    await tele(g, s['x'] + 12, s['z'])
    await g.js(f"()=>{S}.api.tick(290)")
    a1 = await g.js(SPOT, bat[0])
    await g.js(f"()=>{S}.api.tick(12)")
    a2 = await g.js(SPOT, bat[0])
    g.check('nach 290 s noch leer, nach 302 s wieder gefüllt', (not a1['active']) and a2['active'], [a1['active'], a2['active']])
    g.check('wieder gefülltes Versteck hat eine Instanz', await g.js(f"()=>{S}.api.instCount()>=1"))

    # 7. Geheimversteck: schwere Waffe, 15 min, Karte erst nach dem Fund
    sec = await g.js(f"()=>{{const W={S};const s=W.spots.find(s=>s.secret&&!s.roof&&!s.under);return s.i}}")
    s2 = await g.js(SPOT, sec)
    mark0 = await g.js(f"(i)=>{{const s={S}.spots[i];return {S}.api.blips(null).some(b=>b.x===s.x&&b.z===s.z)}}", sec)
    g.check('Geheimversteck vor dem Fund nicht auf der Karte', not mark0)
    await tele(g, s2['x'] + 0.4, s2['z'], s2['y'])
    await g.step(0.4)
    hv = await g.js(f"""(i)=>{{const M={M},W=M.WWELT,s=W.spots[i];return {{owned:!!M.P1.owned[s.kind],active:s.active,t:s.t,found:W.found.size,last:W.lastHint,
      mark:W.api.blips(null).some(b=>b.x===s.x&&b.z===s.z)}}}}""", sec)
    g.check(f"Geheimversteck „{s2['name']}“ gibt {s2['kind']}", hv['owned'] and not hv['active'] and 'Geheimversteck' in hv['last'], hv)
    g.check('Geheimversteck: Nachschub erst nach 15 min', 890 <= hv['t'] <= 900, hv['t'])
    g.check('Geheimversteck nach dem Fund auf der Karte', hv['mark'], hv)
    g.check('Zähler steht auf 2', hv['found'] == 2, hv['found'])
    await tele(g, s2['x'] + 15, s2['z'])
    await g.js(f"()=>{S}.api.tick(400)")
    h1 = await g.js(SPOT, sec)
    await g.js(f"()=>{S}.api.tick(510)")
    h2 = await g.js(SPOT, sec)
    g.check('Geheimversteck nach 400 s noch leer, nach 910 s wieder gefüllt', (not h1['active']) and h2['active'], [h1['active'], h2['active']])

    # 8. Weste und Munitionskiste
    for kind, setup, check, label in [
            ('armor', "P.armor=0", "P.armor===100", 'Schutzweste: Panzerung 100'),
            ('ammo', "P.owned.pistol=true;P.ammo.pistol=0;P.mag.pistol=0", "(P.ammo.pistol||0)+(P.mag.pistol||0)>0", 'Munitionskiste füllt die Pistole auf')]:
        i = await g.js(f"(k)=>{S}.spots.find(s=>s.kind===k&&!s.roof&&!s.under).i", kind)
        sp = await g.js(SPOT, i)
        await g.js(f"()=>{{const P={M}.P1;{setup}}}")
        await tele(g, sp['x'] + 0.4, sp['z'], sp['y'])
        await g.step(0.4)
        ok = await g.js(f"()=>{{const P={M}.P1;return {check}}}")
        g.check(label, ok, await g.js(f"()=>{S}.lastHint"))

    # 9. Pausenmenü-Zähler (echte Taste P)
    await g.key('KeyP')
    pz = await g.js(f"()=>{{const e=document.getElementById('wwcount');return {{mode:{M}.mode,text:e?e.textContent:'',vis:!!e&&!document.getElementById('pause').hidden}}}}")
    n = await g.js(f"()=>{S}.spots.length")
    g.check('Pausenmenü zeigt „Waffenverstecke gefunden: 4 / N“', pz['mode'] == 'pause' and pz['vis'] and f'Waffenverstecke gefunden: 4 / {n}' in pz['text'], pz)
    await g.js("()=>document.getElementById('btn-resume').click()")
    await g.step(0.1)

    # 10. Spielstand: gefundene Verstecke überleben Speichern/Laden
    sv = await g.js(f"""()=>{{const M={M},W=M.WWELT;const d=M.snapshot();const n0=W.found.size;W.found.clear();M.applySave(d);return {{saved:(d.ww||[]).length,n0,n1:W.found.size}}}}""")
    g.check('gefundene Verstecke im Spielstand', sv['saved'] == 4 and sv['n1'] == sv['n0'] == 4, sv)

    # 11. alte Pickups unberührt: Messer am Markt (p4z_waffen.js) wird wie bisher aufgesammelt
    lg = await g.js(f"""()=>{{const L={S}.api.legacy();const w=L.filter(p=>p.kind in {M}.WEAPONS);const m=L.find(p=>p.kind==='messer');return {{n:L.length,w:w.length,kinds:w.map(p=>p.kind),m:m?[m.x,m.z]:null}}}}""")
    g.check('alte Waffen-Pickups vollständig (15 Stück, inkl. Minigun/Raketenwerfer)', lg['w'] == 15 and 'minigun' in lg['kinds'] and 'rpg' in lg['kinds'], lg)
    await g.js(f"()=>{{{M}.P1.owned.messer=false}}")
    await tele(g, lg['m'][0], lg['m'][1])
    await g.step(0.3)
    g.check('altes Messer-Pickup funktioniert weiter', await g.js(f"()=>!!{M}.P1.owned.messer"))
    g.check('alte Pickups zählen nicht als Versteck', await g.js(f"()=>{S}.found.size") == 4)

    if SHOT:
        await shot(g)


async def shot(g):
    # Screenshot: Gruppe aus Verstecken an der dichtesten Stelle, Kamera von schräg oben
    c = await g.js(f"""()=>{{const sp={S}.spots.filter(s=>!s.roof);let best=null,bn=-1;for(const a of sp){{const n=sp.filter(b=>Math.hypot(a.x-b.x,a.z-b.z)<60).reduce((t,b)=>t+b.items.length,0)+a.items.length;if(n>bn){{bn=n;best=a;}}}}
      return [best.x,best.z,best.y,bn]}}""")
    await tele(g, c[0] + 3.5, c[1] + 3.5)
    await g.js(f"()=>{{for(const s of {S}.spots)s.active=true;const P={M}.P1;P.cam.yaw=Math.atan2({c[0]}-P.h.x,{c[1]}-P.h.z);P.cam.pitch=0.22;P.cam.lastLook=1e9}}")
    await g.step(1.0)
    import base64
    url = await g.js("()=>__MEENZ.snap(4,true)")
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'waffenwelt_cluster.jpg')
    with open(path, 'wb') as f:
        f.write(base64.b64decode(url.split(',', 1)[1]))
    print('  screenshot:', path, 'cluster', c)


run(test, real=SHOT)
