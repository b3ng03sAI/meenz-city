# Paket 40.5 Phase B (Welle 10, raster): HG/MFLAG fern vom Spieler lauflängenkodiert („kalt“), nah roh („heiß“).
# Prüft über __MEENZ.HGC: Wiesbaden nach dem Boot kalt, kaltes Lesen verlustfrei (blockedFn/groundYFn == entpackte Kopie),
# Annäherung über die Theodor-Heuss-Brücke macht < 1000 m heiß, Teleport < 300 m sofort heiß (und gebaute Lazy-Zonen haben
# ihre 900-m-Umgebung roh), Wegfahren packt wieder mit identischer CRC, Schreiben auf kalte Kacheln entpackt exakt.
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
WI_MITTE = (-2239, -9205)
WESTEND = (-3365, -9232)
WEIS_UFER = (2215, 1740)          # Lazy-Zone weis_ufer (Mainz-Weisenau), weit weg von Start und Wiesbaden

# 20 feste Punkte: je Ort 7 Hindernis-Zellen (HG 1..254) und 3 freie Zellen, ohne Treppen/ELEV/Brücken,
# deterministisch aus einem festen Suchmuster (Spirale in 7-m-Schritten) gewählt – Werte aus der entpackten Kopie.
PICK = f"""([cx,cz])=>{{const M={M},H=M.HGC;const occ=[],free=[];
  for(let r=0;r<60&&(occ.length<7||free.length<3);r++)for(let a=0;a<8;a++){{
    const x=cx+Math.round(Math.cos(a*0.785+r*0.37)*r*7)+0.5,z=cz+Math.round(Math.sin(a*0.785+r*0.37)*r*7)+0.5;
    if(M.stepAt(x,z)!==undefined||M.ELEV.has(M.idx(x,z))||M.BRIDGES.some(b=>{{const bb=b.bb;return x>=bb[0]&&x<=bb[2]&&z>=bb[1]&&z<=bb[3]}}))continue;
    const v=H.rawAt(x,z).hg;if(v>0&&v<255&&occ.length<7)occ.push([x,z]);else if(v===0&&free.length<3)free.push([x,z]);}}
  return occ.concat(free);}}"""

# Für jeden Punkt: Spielwert (kaltes Lesen über blocked/groundY/hgG/mfG) gegen die entpackte Kopie
COMPARE = f"""(pts)=>{{const M={M},H=M.HGC;const bad=[];
  for(const [x,z] of pts){{const r=H.rawAt(x,z),g=H.get(x,z);
    const expB=r.hg!==0,expG=(r.hg>0&&r.hg<255)?r.hg:0;
    const b=M.blockedFn(x,z),gy=M.groundYFn(x,z,300),bo=r.hg>0&&r.hg<255?M.blockedFn(x,z,r.hg+0.5):false;
    if(g.hg!==r.hg||g.mf!==r.mf||b!==expB||gy!==expG||bo)bad.push([x,z,r.hg,g.hg,r.mf,g.mf,b,gy,bo]);}}
  return bad;}}"""

STATES = f"(pts)=>pts.map(([x,z])=>{{const s={M}.HGC.tileState(x,z);return s.hg+'/'+s.mf}})"
CRCS = f"(pts)=>pts.map(([x,z])=>{{const c={M}.HGC.crc(x,z);return c.hg+'/'+c.mf}})"

# Alle Abtastpunkte (32-m-Raster) näher als R am Spieler, die in einer kalten Kachel liegen
COLD_WITHIN = f"""(R)=>{{const M={M},H=M.HGC,h=M.P1.h;let n=0,ex=null;
  for(let dz=-R;dz<=R;dz+=32)for(let dx=-R;dx<=R;dx+=32){{if(dx*dx+dz*dz>=R*R)continue;const s=H.tileState(h.x+dx,h.z+dz);
    if(s&&(s.hg==='rle'||s.mf==='rle')){{n++;if(!ex)ex=[Math.round(h.x+dx),Math.round(h.z+dz),s.hg,s.mf];}}}}
  return [n,ex];}}"""

# Gebaute Lazy-Zonen, in deren 900-m-Umkreis noch kalte Kacheln liegen (Invariante 1: Daten resident beim Zonenbau)
ZONES_COLD = f"()=>{M}.LAZY.zones.filter(Z=>Z.built&&{M}.HGC.coldNear(Z.x,Z.z,900)>0).map(Z=>Z.name)"

TELE = f"([x,z])=>{{const h={M}.P1.h;h.x=x;h.z=z;h.y={M}.groundYFn(x,z,60);h.vy=0;}}"

# Fahrt wie mit dem Auto: Spieler je Bild um v·dt Richtung Ziel schieben, dazu update/HUD wie g.step (Spielzeit, deterministisch)
DRIVE = f"""([x,z,v])=>{{const M={M},h=M.P1.h,dt=1/60;
  for(let i=0;i<100000;i++){{const dx=x-h.x,dz=z-h.z,d=Math.hypot(dx,dz);if(d<0.01)break;const s=Math.min(d,v*dt);
    h.x+=dx/d*s;h.z+=dz/d*s;h.y=M.groundYFn(h.x,h.z,60);h.vy=0;M.update(dt);if(M.mode==='play'){{M.updateHUD(dt);if(i%2===0)M.drawMinimaps();}}}}}}"""


async def test(g):
    await g.start()
    H = f'{M}.HGC'

    # --- 1 Nach dem Boot: Wiesbaden kalt, Start heiß, Speicher gespart ---
    info = await g.js(f"()=>{{const H={H};return {{boot:+H.bootMs.toFixed(1),packed:H.bootPacked,raw:H.rawBytes,rle:H.rleBytes,c:H.counts()}}}}")
    g.check('Boot packt die Raster fern vom Start', info['packed'] > 20000, info)
    g.check('kalt + heiß zusammen < 30 MB (vorher ~126 MB roh)', info['raw'] + info['rle'] < 30e6,
            f"roh {info['raw'] / 1e6:.1f} MB, RLE {info['rle'] / 1e6:.1f} MB")
    for name, (x, z) in [('Wiesbaden-Mitte', WI_MITTE), ('Westend', WESTEND)]:
        st = await g.js(f"([x,z])=>{H}.tileState(x,z)", [x, z])
        g.check(f'{name}: HG- und MFLAG-Kachel kalt (rle)', st == {'hg': 'rle', 'mf': 'rle'}, st)
    st = await g.js(f"()=>{{const h={M}.P1.h;return {H}.tileState(h.x,h.z)}}")
    g.check('am Start roh', st == {'hg': 'raw', 'mf': 'raw'}, st)
    n, ex = await g.js(COLD_WITHIN, 1000)
    g.check('am Start keine kalte Kachel < 1000 m', n == 0, ex)

    pts = await g.js(PICK, list(WI_MITTE)) + await g.js(PICK, list(WESTEND))
    g.check('20 feste Prüfpunkte gefunden (je Ort 7 Hindernis + 3 frei)', len(pts) == 20, len(pts))
    cr0 = await g.js(f"()=>{H}.coldReads")
    bad = await g.js(COMPARE, pts)
    g.check('kaltes Lesen: blockedFn/groundYFn/hgG/mfG == entpackte Kopie an 20 Punkten', not bad, bad[:3])
    cr1 = await g.js(f"()=>{H}.coldReads")
    g.check('die Lesezugriffe liefen kalt (ohne Entpacken)', cr1 > cr0 and all(s == 'rle/rle' for s in await g.js(STATES, pts)),
            f'{cr0}→{cr1}')
    full = await g.js(f"""([x,z])=>{{const M={M},H=M.HGC;const x0=Math.floor(x/64)*64,z0=Math.floor(z/64)*64;let bad=0;
        for(let j=0;j<64;j++)for(let i=0;i<64;i++){{const px=x0+i+0.5,pz=z0+j+0.5;const r=H.rawAt(px,pz),v=H.get(px,pz);if(r.hg!==v.hg||r.mf!==v.mf)bad++;}}
        return [bad,H.tileState(x,z).hg]}}""", list(WI_MITTE))
    g.check('ganze kalte Kachel (4096 Zellen) verlustfrei lesbar', full[0] == 0 and full[1] == 'rle', full)
    crc0 = await g.js(CRCS, pts)
    # 4096 kalte Lesezugriffe in einem Bild (> 2048 je 0,25 s) → ferner Viel-Leser: Kachel wird als LRU-Extra roh
    await g.step(0.3)
    lru = await g.js(f"([x,z])=>[{H}.tileState(x,z).hg,{H}.lruUnpacks,{H}.lru.length]", list(WI_MITTE))
    g.check('LRU: viel gelesene ferne Kachel wird roh gehalten', lru[0] == 'raw' and lru[1] >= 1, lru)

    # --- 2 Annäherung mit 50 m/s: Start → Theodor-Heuss-Brücke → Kastel → Wiesbaden-Mitte, Prüfung alle 150 m ---
    route = await g.js(f"""()=>{{const b={M}.BRIDGES[0],A=b.A,B=[b.A[0]+b.U[0]*b.L,b.A[1]+b.U[1]*b.L],h={M}.P1.h;
        const d=p=>Math.hypot(p[0]-h.x,p[1]-h.z);return d(A)<d(B)?[[h.x,h.z],A,B]:[[h.x,h.z],B,A]}}""")
    route.append(list(WI_MITTE))
    steps, worst, zcold = 0, (0, None), []
    for (ax, az), (bx, bz) in zip(route, route[1:]):
        L = ((bx - ax) ** 2 + (bz - az) ** 2) ** 0.5
        k = max(1, round(L / 150))
        for s in range(1, k + 1):
            await g.js(DRIVE, [ax + (bx - ax) * s / k, az + (bz - az) * s / k, 50])
            steps += 1
            n, ex = await g.js(COLD_WITHIN, 1000)
            if n > worst[0]:
                worst = (n, ex)
            zcold += [z for z in await g.js(ZONES_COLD) if z not in zcold]
    g.check(f'Annäherung ({steps} Schritte à 150 m): alle Kacheln < 1000 m roh', worst[0] == 0, worst)
    g.check('Annäherung: gebaute Lazy-Zonen ohne kalte Kacheln im 900-m-Umkreis', not zcold, zcold)
    st = await g.js(f"([x,z])=>{H}.tileState(x,z)", list(WI_MITTE))
    g.check('Wiesbaden-Mitte jetzt roh', st == {'hg': 'raw', 'mf': 'raw'}, st)
    g.check('Werte nach dem Entpacken identisch (CRC an 20 Punkten)', await g.js(CRCS, pts) == crc0)
    bad = await g.js(COMPARE, pts)
    g.check('heiß: blockedFn/groundYFn == Vergleichswert', not bad, bad[:3])
    jm = await g.js(f"()=>{H}.jobMaxMs")
    g.check('hg:-Pakete einzeln < 30 ms', jm < 30, f'{jm:.2f} ms')

    # --- 3 Teleport in eine ferne Lazy-Zone: < 300 m sofort roh, Zonenumgebung roh ---
    st = await g.js(f"([x,z])=>{H}.tileState(x,z)", list(WEIS_UFER))
    g.check('Ziel Weisenau vor dem Sprung kalt', st['hg'] in ('rle', 'uni') and st['mf'] in ('rle', 'uni'), st)
    await g.js(TELE, list(WEIS_UFER))
    await g.step(1 / 60)
    n, ex = await g.js(COLD_WITHIN, 300)
    g.check('nach einem g.step: alle Kacheln < 300 m roh', n == 0, ex)
    z = await g.js(f"()=>{M}.LAZY.zones.filter(Z=>Z.built).map(Z=>Z.name)")
    g.check('Zone weis_ufer gebaut', 'weis_ufer' in z, z)
    g.check('gebaute Zonen ohne kalte Kacheln im 900-m-Umkreis', not await g.js(ZONES_COLD), await g.js(ZONES_COLD))
    await g.step(2)
    n, ex = await g.js(COLD_WITHIN, 1000)
    g.check('nach 2 s: alle Kacheln < 1000 m roh', n == 0, ex)

    # --- 4 Wegfahren: zurück zum Start → Wiesbaden wieder kalt, Werte/CRC identisch ---
    await g.js(TELE, route[0])
    await g.step(3)
    states = await g.js(STATES, pts)
    g.check('Wiesbaden wieder kalt (alle 20 Punkte rle/rle)', all(s == 'rle/rle' for s in states),
            [states, await g.js(f"()=>[{H}.lru.length,{H}.lruUnpacks,{M}.FRAMEB.jobs.size]")])
    g.check('CRC nach Packen identisch', await g.js(CRCS, pts) == crc0)
    bad = await g.js(COMPARE, pts)
    g.check('kalt nach Rundreise: blockedFn/groundYFn == Vergleichswert', not bad, bad[:3])
    st = await g.js(f"([x,z])=>{H}.tileState(x,z)", list(WEIS_UFER))
    g.check('Weisenau wieder kalt', 'raw' not in st.values(), st)
    c = await g.js(f"()=>[{H}.packs,{H}.unpacks]")
    g.check('Zähler packs/unpacks laufen', c[0] > info['packed'] and c[1] > 0, c)

    # --- 5 Schreiben auf eine kalte Kachel: entpackt, Wert exakt, Rest unverändert ---
    x, z = pts[12]   # Westend, Hindernis-Zelle
    before = await g.js(f"([x,z])=>{{const H={H};return [H.tileState(x,z).hg,H.rawAt(x,z).hg,H.crc(x,z).hg,H.unpacks]}}", [x, z])
    g.check('Schreibziel ist kalt', before[0] == 'rle', before)
    nv = 77 if before[1] != 77 else 78
    after = await g.js(f"([x,z,v])=>{{const H={H};H.setHG(x,z,v);return [H.tileState(x,z).hg,H.get(x,z).hg,H.rawAt(x,z).hg,H.unpacks]}}", [x, z, nv])
    g.check('Schreiben entpackt die Kachel und speichert exakt', after[0] == 'raw' and after[1] == nv and after[2] == nv and after[3] == before[3] + 1,
            after)
    back = await g.js(f"([x,z,v])=>{{const H={H};H.setHG(x,z,v);return [H.get(x,z).hg,H.crc(x,z).hg]}}", [x, z, before[1]])
    g.check('Rückbau (Journal-Muster): Altwert zurück → CRC wie vorher', back == [before[1], before[2]], [back, before])
    await g.step(1)
    st = await g.js(f"([x,z])=>{H}.tileState(x,z).hg", [x, z])
    g.check('fern beschriebene Kachel wird wieder kalt', st == 'rle', st)
    g.check('CRC nach Schreiben + Rückbau + Packen identisch', await g.js(CRCS, pts) == crc0)

    # --- 6 Zonenbau-Zähler (ruckler ruft hgcNoteZoneBuild beim Start eines Lazy-Baus) ---
    zc = await g.js(f"()=>[{H}.zoneBuildsCold,{H}.zoneBuildsNoted]")
    g.check('HGC.zoneBuildsCold vorhanden und 0', zc[0] == 0, f'kalt {zc[0]} von {zc[1]} gemeldeten Zonenbauten')


run(test, mobile=True)
