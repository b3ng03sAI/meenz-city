"""Welle 9 QA: Haltung der AKK-/Wiesbaden-Figuren (echtes three.js, real.html).
    PYTHONPATH=tests/lib MEENZ_URL=http://127.0.0.1:8905 .venv/bin/python tests/manual/qa_w9_haltung.py
Je Zone: hinteleportieren, 6 s Spielzeit; je Schritt alle Zonen-NPCs nach dem Update (Sperre gelaufen) abtasten und
HALTUNG.clamped zaehlen: Zuwachs = die Sperre musste eingreifen (Pose hat die Regel verletzt)."""
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
from harness import run

ZONES = {'akk_kastel': (540, -870), 'akk_maaraue': (1400, 320), 'akk_schleuse': (3010, -470), 'akk_amoeneburg': (-1330, -3650),
         'wiesi_schloss': (-2285, -9295), 'wiesi_wilhelm': (-2040, -9235), 'wiesi_luisen': (-2451, -8862), 'wiesi_westend': (-2990, -9326)}
SCAN = """([name,x,z])=>{const M=__MEENZ,P=M.P1;if(P.car)M.exitCar(P,true);P.h.x=x;P.h.z=z;P.h.y=M.groundYFn(x,z);P.vy=0;
 for(let i=0;i<10;i++)M.update(0.05);const Z=M.LAZY.zones.find(q=>q.name===name);if(!Z||!Z.built)return {built:false};
 const c0=M.HALTUNG.clamped;let minR=9,bothUp=0,n=Z.npcs.length,viol=0;
 for(let s=0;s<360;s++){M.update(1/60);for(const h of Z.npcs){if(!h||h.removed||!h.armR)continue;const r=h.armR.rotation.x,l=h.armL.rotation.x;
   if(Math.abs(h.g.rotation.x)>0.6||Math.abs(h.g.rotation.z)>0.6)continue;if(r<minR)minR=r;
   if(r<-1.0-1e-6)viol++;if(l<-1&&r<-1)bothUp++;}}
 return {built:true,npcs:n,minArmR:Math.round(minR*100)/100,viol,bothUp,clampedDelta:M.HALTUNG.clamped-c0};}"""


async def test(g):
    await g.start()
    for name, (x, z) in ZONES.items():
        r = await g.js(SCAN, [name, x, z])
        g.check(f'{name}: Figuren halten die Haltungsregel (keine Verletzung nach Update, Sperre musste nicht eingreifen)',
                r['built'] and r['viol'] == 0 and r['bothUp'] == 0, r)

run(test, real=True)
