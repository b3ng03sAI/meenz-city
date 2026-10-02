# Easter Egg: Grillparzerstraße und Konrad-Adenauer-Ring liegen im Straßengraph und treffen sich
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'


async def test(g):
    await g.start()
    r = await g.js(f"""()=>{{const R={M}.ROADSx;const g=R.filter(r=>/Grillparzer/.test(r.name||''));const k=R.filter(r=>/Adenauer-Ring/.test(r.name||''));
        let best=null,bp=null;for(const a of g)for(const p of a.pts)for(const b of k)for(const q of b.pts){{const d=Math.hypot(p[0]-q[0],p[1]-q[1]);if(best===null||d<best){{best=d;bp=p;}}}}
        return {{g:g.length,k:k.length,gn:[...new Set(g.map(r=>r.name))],kn:[...new Set(k.map(r=>r.name))],best,egg:Math.hypot(bp[0]-{M}.EGG.C[0],bp[1]-{M}.EGG.C[1]),kpts:k.every(r=>r.pts.length>=2)}}}}""")
    g.check('Grillparzerstraße: 3 Segmente', r['g'] == 3, r['g'])
    g.check('Konrad-Adenauer-Ring: viele Segmente', r['k'] >= 30, r['k'])
    g.check('Straßennamen eindeutig', r['gn'] == ['Grillparzerstraße'] and r['kn'] == ['Konrad-Adenauer-Ring'], [r['gn'], r['kn']])
    g.check('Segmente haben Punkte', r['kpts'])
    g.check('beide Straßen treffen sich (gemeinsamer Knoten)', r['best'] is not None and r['best'] < 0.01, r['best'])
    g.check('Easter-Egg-Ort liegt an dieser Kreuzung (< 1 m)', r['egg'] < 1, r['egg'])

run(test)
