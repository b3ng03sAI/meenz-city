# Startplatz-Leistung (Handy, Grafik „niedrig“, quer, echtes three.js): Draw-Calls und Dreiecke am Startplatz beim Start,
# während und nach der Einleitung, 30 s später und beim Marktfrühstück; RINFO zählt genau ein Bild (eine Szenen-Runde,
# kein Objekt doppelt – z. B. durch transmission-Materialien); Handy-Sichtweite zeichnet nichts Kleines aus der Ferne;
# stadtweite Requisiten nur in Kameranähe; Marktstände als Instanzen.
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
CALLS, TRIS = 450, 1_600_000
LAND = {'width': 852, 'height': 393}   # iPhone 14 Pro quer
FAR = 500                              # Sichtweite einzelner Szenen-Meshes (450 m + eigener Radius) + Luft

# Ein Bild über RINFO zeichnen und dabei jede Zeichnung der Szene mitzählen (Objekt + Gruppe):
# n = erwartete Draw-Calls (durchsichtig + beidseitig zeichnet three.js als Rück- und Vorderseite = 2);
# doppelt = dieselbe Zeichnung (Objekt + Gruppe) mehrmals in einem Bild (z. B. Extra-Durchgang für transmission);
# fern = einzelnes Szenen-Mesh aus der Sichtweiten-Liste, das ganz hinter FAR m liegt (Kugel unabhängig aus der Geometrie).
FRAME = """(far)=>{const M=__MEENZ,P=M.P1,scene=P.h.g.parent,cam=P.camera.position;
  const cnt=new Map(),hooked=[],farL=[];let n=0;
  scene.traverse(o=>{if(!(o.isMesh||o.isSprite||o.isPoints||o.isLine))return;const own=Object.prototype.hasOwnProperty.call(o,'onBeforeRender')?o.onBeforeRender:null;
    hooked.push([o,own]);
    o.onBeforeRender=function(r,s,c,g,m,grp){if(own)own.apply(this,arguments);if(s!==scene)return;
      n+=m.transparent&&m.side===2&&!m.forceSinglePass?2:1;
      const k=o.id+'|'+(grp?grp.materialIndex+':'+grp.start:'');const e=cnt.get(k)||{n:0,o,m};e.n++;cnt.set(k,e);
      const s0=o.userData.muxS;if(o.parent!==scene||!s0||s0[2]>900||o.isInstancedMesh||!g.boundingSphere)return;
      const w=g.boundingSphere.center.clone().applyMatrix4(o.matrixWorld),me=o.matrixWorld.elements;
      const sc=Math.sqrt(Math.max(me[0]*me[0]+me[1]*me[1]+me[2]*me[2],me[4]*me[4]+me[5]*me[5]+me[6]*me[6],me[8]*me[8]+me[9]*me[9]+me[10]*me[10]));
      const d=Math.hypot(w.x-cam.x,w.z-cam.z)-g.boundingSphere.radius*sc;if(d>far&&farL.length<5)farL.push([o.type,o.material&&o.material.type,Math.round(w.x),Math.round(w.z),Math.round(d)]);};});
  M.MUX.cull.t=0;// Sichtweiten-Liste frisch wie im laufenden Spiel (dort spätestens alle 30 Bilder neu)
  let ri;try{ri=M.RINFO;}finally{for(const [o,own] of hooked){if(own)o.onBeforeRender=own;else delete o.onBeforeRender;}}
  const dup=[...cnt.values()].filter(e=>e.n>1).map(e=>[e.o.type,e.m.type,e.n]).slice(0,5);
  let trans=0;scene.traverse(o=>{const ms=Array.isArray(o.material)?o.material:o.material?[o.material]:[];for(const m of ms)if(m.transmission>0)trans++;});
  return {ri,n,dup,far:farL,trans,cam:[cam.x,cam.y,cam.z].map(Math.round)};}"""


async def measure(g, name):
    r = await g.js(FRAME, FAR)
    ri = r['ri']
    print(f'  info {name}: calls={ri["calls"]} tris={ri["triangles"]} culled={ri["culled"]} cam={r["cam"]}', flush=True)
    g.check(f'{name}: ≤ {CALLS} Draw-Calls', ri['calls'] <= CALLS, ri['calls'])
    g.check(f'{name}: ≤ 1,6 Mio. Dreiecke', ri['triangles'] <= TRIS, ri['triangles'])
    g.check(f'{name}: RINFO = genau ein Bild (eine Szenen-Runde, ein render, kein Schatten/Nachbearbeitung)',
            ri['scenePasses'] == 1 and ri['renders'] == 1 and ri['shadow']['calls'] == 0 and ri['post']['calls'] == 0
            and ri['main']['calls'] == ri['calls'], {k: ri[k] for k in ('scenePasses', 'renders', 'shadow', 'post', 'main')})
    g.check(f'{name}: jede Zeichnung einmal gezählt (Haken = RINFO)', r['n'] == ri['main']['calls'], [r['n'], ri['main']['calls']])
    g.check(f'{name}: kein Objekt doppelt gezeichnet, kein transmission-Material', not r['dup'] and r['trans'] == 0, [r['dup'], r['trans']])
    g.check(f'{name}: kein einzelnes Mesh weiter als {FAR} m gezeichnet (Handy-Sichtweite)', not r['far'], r['far'])
    return ri


async def test(g):
    await g.page.set_viewport_size(LAND)
    await g.start()
    await g.js("()=>dispatchEvent(new Event('resize'))")
    st = await g.js(f"()=>({{q:{M}.QUALITY,low:!!{M}.QS.lowLOD,on:{M}.MUX.cull.on,asp:{M}.P1.camera.aspect,intro:{M}.INTRO.active}})")
    g.check('Handy startet auf „niedrig“ mit Sichtweiten-Culling, quer', st['q'] == 'niedrig' and st['low'] and st['on'] and abs(st['asp'] - 852 / 393) < 0.01, st)

    # 1. direkt nach dem Start
    await measure(g, 'nach dem Start')
    pr = await g.js(f"""()=>{{const P={M}.MUX.props,c={M}.P1.camera.position;let bad=0;
      for(const e of P.list){{const a=e.im.instanceMatrix.array;for(let i=0;i<e.im.count;i++)if(Math.hypot(a[i*16+12]-c.x,a[i*16+14]-c.z)>P.R+P.step*1.5)bad++;}}
      return {{n:P.list.length,shown:P.shown,total:P.total,bad,R:P.R}}}}""")
    g.check('stadtweite Requisiten (Laternen, Bänke …) nur im Umkreis der Kamera', pr['n'] >= 8 and 0 < pr['shown'] < pr['total'] * 0.2 and pr['bad'] == 0, pr)

    # 2. Einleitung (Bürgermeisterin, Kamera auf Augenhöhe quer über den Platz)
    await g.js(f"()=>{M}.INTRO.start()")
    await g.step(3)
    g.check('Einleitung läuft', await g.js(f"()=>{M}.INTRO.active"))
    await measure(g, 'Einleitung')
    await g.step(8)
    await measure(g, 'Einleitung +8 s (getrunken)')

    # 3. nach der Einleitung und 30 s später
    await g.js(f"()=>{M}.INTRO.end()")
    await g.step(1)
    await measure(g, 'nach der Einleitung')
    await g.step(30)
    await measure(g, '30 s später')

    # 4. Marktfrühstück (9 Uhr): Stände als Instanzen
    await g.js(f"()=>{{{M}.gameMin=9*60+5}}")
    await g.step(3)
    mk = await g.js(f"""()=>{{const g={M}.MARKT.grp;if(!g)return null;let meshes=0,inst=0,parts=0;
      g.traverse(o=>{{if(!o.isMesh)return;meshes++;if(o.isInstancedMesh){{inst++;parts+=o.count;}}}});return {{on:{M}.MARKT.on,vis:g.visible,meshes,inst,parts}}}}""")
    g.check('Marktstände als Instanzen: ≤ 30 Meshes für > 200 Teile', mk and mk['on'] and mk['vis'] and mk['meshes'] <= 30 and mk['parts'] > 200, mk)
    await measure(g, 'Marktfrühstück')

    dog = await g.js(f"()=>{{const D={M}.DOGS[0];if(!D)return null;let n=0;D.g.traverse(o=>{{if(o.isMesh)n++;}});return n}}")
    g.check('Fliegerdackel: unbewegte Teile zusammengefügt (≤ 22 statt 36 Meshes)', dog is not None and dog <= 22, dog)

    # 5. Requisiten: geteilter Bildschirm zeichnet ohne Sichtweite → wieder alle Instanzen
    full = await g.js(f"""()=>{{const P={M}.MUX.props;P.all();let s=0;for(const e of P.list)s+=e.im.count;return [s,P.total,P.full]}}""")
    g.check('Requisiten: P.all() stellt alle Instanzen wieder her', full[0] == full[1] and full[2], full)


run(test, real=True, mobile=True)
