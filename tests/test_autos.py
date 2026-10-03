# Autos-Grafik: runde Karosserien je Typ, LOD-Budgets, 4 Räder im Anbauteile-Mesh, Material je Qualität,
# geteilte Geometrie, höchstens 3 Draw-Calls je Auto, LOD-Wechsel, Fahren/Einsteigen/Beulen funktionieren weiter
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'


async def test(g):
    await g.start()
    g.check('Qualität ultra (Desktop)', await g.js(f"()=>{M}.QUALITY") == 'ultra')

    # 1. jeder Straßen-Autotyp baut, Dreiecke in den LOD-Budgets, 4 Radcodes im Anbauteile-Mesh
    ids = await g.js(f"""()=>{{const M={M};const ids=[];for(const c of M.CARS)if(c.autoGeo&&!ids.includes(c.id))ids.push(c.id);
      for(const id of ['kompakt','limo','kombi','sport','transporter','taxi','polizei','kleinwagen','suv','pickup','cabrio','oldtimer','eiswagen','rettungswagen','loeschfahrzeug'])if(!ids.includes(id))ids.push(id);return ids}}""")
    info = await g.js(f"""(ids)=>{{const M={M},P=M.P1,out={{}};
      for(const id of ids){{const auto=M.AUTOS.isAuto(id);if(!auto){{out[id]={{auto}};continue;}}
        const c=new M.Car(id,P.h.x+400,P.h.z+400,0,{{ctrl:'none'}});const st=M.AUTOS.stats[id];
        const a=c.autoTrim.geometry.attributes.aM.array;const w=new Set();for(let i=3;i<a.length;i+=4)if(a[i])w.add(a[i]);
        out[id]={{auto,l0:st.l0.total,l1:st.l1.total,wheels:w.size,mat:c.bodyMat.type,glass:st.l0.glass}};c.remove();}}
      return out}}""", ids)
    bad = {k: v for k, v in info.items() if not v.get('auto')}
    g.check('alle Straßenautos (inkl. Taxi, Polizei, Rettung, Feuerwehr) nutzen die neue Karosserie', not bad, bad)
    over0 = {k: v['l0'] for k, v in info.items() if v.get('auto') and not 2000 <= v['l0'] <= 5000}
    over1 = {k: v['l1'] for k, v in info.items() if v.get('auto') and not 300 <= v['l1'] <= 600}
    g.check('LOD0 2000–5000 Dreiecke je Typ', not over0, over0 or {k: v['l0'] for k, v in info.items()})
    g.check('LOD1 300–600 Dreiecke je Typ', not over1, over1 or {k: v['l1'] for k, v in info.items()})
    g.check('4 Räder je Auto (Radcodes 1–4)', all(v['wheels'] == 4 for v in info.values()), {k: v['wheels'] for k, v in info.items()})
    g.check('eigene Glasfläche je Typ', all(v['glass'] > 50 for v in info.values()))
    g.check('Lack auf Ultra: MeshPhysicalMaterial (Klarlack)', all(v['mat'] == 'MeshPhysicalMaterial' for v in info.values()))
    mt = await g.js(f"()=>['ultra','hoch','mittel','niedrig'].map(q=>{M}.AUTOS.paintMatType(q))")
    g.check('Lack je Qualität: physical ultra/hoch, standard mittel/niedrig',
            mt == ['MeshPhysicalMaterial', 'MeshPhysicalMaterial', 'MeshStandardMaterial', 'MeshStandardMaterial'], mt)
    g.check('Bus, Motorrad, Gokart, Boot, Flugzeug bleiben bei der alten Geometrie',
            await g.js(f"()=>['bus','motorrad','fahrrad','gokart','boot','jetski','flugzeug','hubschrauber'].every(id=>!{M}.AUTOS.isAuto(id))"))

    # 2. geteilte Geometrie, Draw-Calls, LOD-Wechsel
    sh = await g.js(f"""()=>{{const M={M},P=M.P1,cam=P.camera.position;
      const a=new M.Car('kompakt',cam.x+6,cam.z+6,0,{{ctrl:'none'}}),b=new M.Car('kompakt',cam.x-6,cam.z+6,0,{{ctrl:'none'}});a.ai={{mode:'parked'}};b.ai={{mode:'parked'}};
      M.update(1/60);
      const r={{same:a.bodyMesh.geometry===b.bodyMesh.geometry&&a.autoTrim.geometry===b.autoTrim.geometry&&a.autoGlass.geometry===b.autoGlass.geometry,
        ownMat:a.bodyMat!==b.bodyMat,lod0:[a.autoLod,b.autoLod],calls0:M.AUTOS.drawCalls(a)}};
      a.x=cam.x+200;a.z=cam.z+200;a.sync(0);M.update(1/60);r.far=a.autoLod;r.calls1=M.AUTOS.drawCalls(a);r.farGeo=a.bodyMesh.geometry!==b.bodyMesh.geometry;
      a.x=cam.x+6;a.z=cam.z+6;a.sync(0);M.update(1/60);r.near=a.autoLod;a.remove();b.remove();return r}}""")
    g.check('zwei Autos desselben Typs teilen Lack-, Glas- und Anbau-Geometrie (eigenes Lackmaterial)', sh['same'] and sh['ownMat'], sh)
    g.check('nahe Autos: LOD0', sh['lod0'] == [0, 0], sh['lod0'])
    g.check('höchstens 3 Draw-Calls je Auto nah (Lack, Glas, Anbauteile)', 0 < sh['calls0'] <= 3, sh['calls0'])
    g.check('fern (> 60 m): LOD1, höchstens 2 Draw-Calls', sh['far'] == 1 and sh['farGeo'] and sh['calls1'] <= 2, sh)
    g.check('wieder nah: zurück auf LOD0', sh['near'] == 0, sh['near'])

    # 3. Polizei: Blaulicht über Shader-Uniform, Sirenen-Schnittstelle bleibt
    pol = await g.js(f"""()=>{{const M={M},P=M.P1,c=new M.Car('polizei',P.h.x+5,P.h.z+5,0,{{ctrl:'none'}});c.sirenOn=true;let on=0;
      for(let i=0;i<40;i++){{c.sync(1/60);const s=c.tailMat.userData.autosU.uSir.value;on=Math.max(on,s[0]+s[1]);}}
      const r={{sirens:Array.isArray(c.sirens)&&c.sirens.length===2,on}};c.sirens.forEach(s=>s.visible=false);c.sync(0);r.hide=c.tailMat.userData.autosU.uSir.value[2];c.remove();return r}}""")
    g.check('Polizei: c.sirens vorhanden, Blaulicht blinkt, ausblendbar', pol['sirens'] and pol['on'] > 0 and pol['hide'] == 1, pol)

    # 4. Einsteigen, Fahren, Räder drehen, Bremslicht, Beulen
    drv = await g.js(f"""()=>{{const M={M},P=M.P1;if(P.car)M.exitCar(P,true);
      const es=M.EDGES.filter(E=>E.car&&E.len>200&&!E.ow);const E=es[3%es.length],a=M.NODES[E.a],b=M.NODES[E.b];const dx=(b.x-a.x)/E.len,dz=(b.z-a.z)/E.len;
      const c=new M.Car('kompakt',a.x+dx*15,a.z+dz*15,Math.atan2(dx,dz),{{ctrl:'none'}});c.ai={{mode:'parked'}};window.__ac=c;
      P.h.x=c.x-dx*2.2;P.h.z=c.z-dz*2.2;P.h.y=M.groundYFn(P.h.x,P.h.z,0);M.tryEnterExit(P);return {{in:P.car===c,x:c.x,z:c.z}}}}""")
    g.check('Einsteigen per tryEnterExit', drv['in'], drv)
    await g.page.keyboard.down('KeyW')
    await g.step(3)
    await g.page.keyboard.up('KeyW')
    mv = await g.js("()=>{const c=window.__ac;return {x:c.x,z:c.z,spin:c.tailMat.userData.autosU.uSpin.value,lod:c.autoLod,sp:c.speed}}")
    d = ((mv['x'] - drv['x']) ** 2 + (mv['z'] - drv['z']) ** 2) ** 0.5
    g.check('Auto fährt (> 10 m in 3 s)', d > 10, f'{d:.1f} m')
    g.check('Räder drehen (uSpin ≠ 0), Spielerauto LOD0', abs(mv['spin']) > 0.01 and mv['lod'] == 0, mv)
    await g.page.keyboard.down('KeyS')
    await g.step(0.3)
    br = await g.js("()=>window.__ac.tailMat.emissiveIntensity")
    await g.page.keyboard.up('KeyS')
    g.check('Bremslicht leuchtet beim Bremsen', br >= 3.9, br)
    dm = await g.js(f"""()=>{{const c=window.__ac,A={M}.AUTOS,g0=c.bodyMesh.geometry;
      c.deform(1,0,12);const own=c.bodyMesh.geometry!==g0;A.setLod(c,1);c.deform(0,1,12);const l1ok=c.bodyMesh.geometry===c.autoGeo.l1.paint;
      A.setLod(c,0);return {{own,l1ok,back:c.bodyMesh.geometry===c.autoP0&&c.autoP0!==c.autoGeo.l0.paint}}}}""")
    g.check('Beulen: eigene Kopie erst beim Crash, auch im Fern-LOD korrekt', dm['own'] and dm['l1ok'] and dm['back'], dm)
    g.check('Aussteigen klappt', await g.js(f"()=>{{const P={M}.P1;{M}.tryEnterExit(P);for(let i=0;i<30;i++){M}.update(1/60);return !P.car}}"))
    await g.step(1)


run(test, real=True)
