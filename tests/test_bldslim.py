# Paket 40.5 Phase C (Welle 10, „bauten“): Gebäude-Ringe als Getter mit Ring-Cache nahe den Spielern, b.R weg,
# Gebäude-Chunks im Spiel als Pakete bld:hi:/bld:lo: über das gemeinsame Bild-Budget FRAMEB.
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
WIES = (-2239, -9205)   # Wiesbaden-Innenstadt, > 9 km vom Start

# Chunks um (x,z) im Umkreis r: wie viele haben die feine Gebäudestufe (c.high)
NEAR_HIGH = f"""([x,z,r])=>{{let n=0,h=0;for(const c of {M}.CITY.chunks.values()){{if(Math.hypot(c.cx-x,c.cz-z)>r)continue;n++;if(c.high)h++;}}return {{n,h}}}}"""
# Teleport (Sprung > 250 m) zu Fuß
TELE = f"""([x,z])=>{{const M={M},P=M.P1;if(P.car)M.exitCar(P,true);P.h.x=x;P.h.z=z;P.h.y=M.groundYFn(x,z,0);}}"""


async def test(g):
    await g.start()
    B = f'{M}.BLDS'

    # 1. Datensätze: gleiche Länge, Reihenfolge, Identität; Ringe identisch zum Boot-Stand; b.R weg
    st = await g.js(f"""()=>{{const M={M},S=M.BLDS,L=M.BUILDINGS;const c0=S.cached();const h=S.ringHash();
        return {{on:S.on,n:L.length,n0:S.n0,ord:S.orderHash()===S.order0,hash:h===S.hash0,h,h0:S.hash0,c0,c1:S.cached(),
          rec:L.every(b=>b instanceof S.Rec),own:L.filter(b=>Object.prototype.hasOwnProperty.call(b,'poly')||Object.prototype.hasOwnProperty.call(b,'holes')).length,
          R:L.filter(b=>'R' in b).length,fields:L.every(b=>typeof b.H==='number'&&typeof b.style==='string'&&b.tint&&b.seed>=0&&b.src>=0),
          fach:M.ALTST.fachwerk.length>0&&M.ALTST.fachwerk.every(f=>L.includes(f.b))}}}}""")
    g.check('BLDS aktiv nach dem Boot', st['on'], st)
    g.check('BUILDINGS: Länge unverändert', st['n'] == st['n0'] and st['n'] > 60000, f"{st['n']}/{st['n0']}")
    g.check('BUILDINGS: Reihenfolge unverändert (gid/src-Folge)', st['ord'])
    g.check('Ringe über Getter identisch zum Boot-Stand (Hash über alle Gebäude)', st['hash'], f"{st['h']} vs {st['h0']}")
    g.check('Hash-Lauf über ferne Gebäude füllt den Cache nicht', st['c1'] == st['c0'], f"{st['c0']} → {st['c1']}")
    g.check('alle Gebäude bleiben die dekodierten Datensätze (BldsRec)', st['rec'])
    g.check('poly/holes keine eigenen Daten-Felder mehr (Getter)', st['own'] == 0, st['own'])
    g.check('b.R (Closure je Gebäude) ist weg', st['R'] == 0, st['R'])
    g.check('übrige Felder vorhanden (H, style, tint, seed, src)', st['fields'])
    g.check('Altstadt-Fachwerk zeigt weiter auf Gebäude in BUILDINGS', st['fach'])

    # 2. Getter: heiß = derselbe Cache-Ring, kalt = jedes Mal frisches Array mit gleichem Inhalt
    gt = await g.js(f"""([wx,wz])=>{{const M={M},P=M.P1.h,L=M.BUILDINGS;
        const near=L.find(b=>Math.hypot(b.x-P.x,b.z-P.z)<150),far=L.find(b=>Math.hypot(b.x-wx,b.z-wz)<200);
        const a=far.poly,b=far.poly;return {{hotSame:near.poly===near.poly&&near.rgP!==null,coldFresh:a!==b&&far.rgP===null,
          coldEq:JSON.stringify(a)===JSON.stringify(b)&&JSON.stringify(far.holes)===JSON.stringify(far.holes)&&a.length>=3}}}}""", list(WIES))
    g.check('heiße Kachel: Getter liefert den Cache-Ring', gt['hotSame'], gt)
    g.check('kalte Kachel: Getter liefert je Zugriff ein frisches Array, nicht gecacht', gt['coldFresh'], gt)
    g.check('kalte Kachel: frische Ringe inhaltsgleich', gt['coldEq'], gt)

    # 3. Cache nur nahe dem Spieler (< 1000 m gefüllt, > 1300 m leer)
    cn = await g.js(f"()=>{{const P={M}.P1.h;return {B}.cachedNear(P.x,P.z,700)}}")
    cf = await g.js(f"([x,z])=>{B}.cachedNear(x,z,1500)", list(WIES))
    g.check('Start: Ringe < 700 m alle im Cache', cn['n'] > 500 and cn['cached'] == cn['n'], cn)
    g.check('Start: Wiesbaden (9 km) ohne Cache', cf['n'] > 1000 and cf['cached'] == 0, cf)

    # 4. Fahrt durch Altstadt/Neustadt über Chunk-Grenzen (≈ 28 m/s, kein Sprung): Chunks entstehen nur über Pakete bld:hi:/bld:lo:
    drive = await g.js(f"""()=>{{const M={M},S=M.BLDS.city,F=M.FRAMEB,P=M.P1.h;const hi0=S.built.hi,lo0=S.built.lo,sy0=S.sync.hi+S.sync.lo,j0=F.jumps;
        let maxJobs=0,seen=0,cross=0,rnd=0;const k0=M.BLDS.tileId(P.x,P.z);let k=k0;
        const R0=Math.random;Math.random=function(){{if(M.BLDS.inPkt)rnd++;return R0();}};
        for(let i=0;i<60*44;i++){{P.x-=20/60;P.z-=20/60;P.y=M.groundYFn(P.x,P.z,0);M.update(1/60);maxJobs=Math.max(maxJobs,F.timing.jobsLast);
          for(const J of F.jobs.values())if(J.key.startsWith('bld:hi:')||J.key.startsWith('bld:lo:'))seen++;
          const kk=M.BLDS.tileId(P.x,P.z);if(kk!==k){{cross++;k=kk;}}}}
        Math.random=R0;
        return {{rnd,hi:S.built.hi-hi0,lo:S.built.lo-lo0,sync:S.sync.hi+S.sync.lo-sy0,jumps:F.jumps-j0,maxJobs,seen,cross,steps:S.steps,maxMs:S.maxMs,maxHi:S.maxHi,maxLo:S.maxLo,slowest:S.slowest,x:P.x,z:P.z}}}}""")
    g.check('Fahrt: mehrere Chunk-Grenzen überquert, kein Sprung', drive['cross'] >= 3 and drive['jumps'] == 0, drive)
    g.check('Fahrt: feine Chunks (c.high) über Pakete gebaut', drive['hi'] >= 3 and drive['seen'] > 0, drive)
    g.check('Fahrt: grobe Chunks (c.low) über Pakete gebaut', drive['lo'] >= 1, drive)
    g.check('Fahrt: kein synchroner Chunk-Bau im Spiel', drive['sync'] == 0, drive['sync'])
    g.check('Fahrt: Pakete ziehen nie aus dem globalen Math.random (auch keine three.js-UUIDs)', drive['rnd'] == 0, drive['rnd'])
    g.check('Fahrt: höchstens FRAMEB.manualJobs Pakete je Bild', drive['maxJobs'] <= 4, drive['maxJobs'])
    g.check('Chunk-Pakete einzeln < 30 ms (Desktop-CPU)', 0 < drive['maxMs'] < 30, f"max {drive['maxMs']:.1f} ms ({drive['slowest']}), hi {drive['maxHi']:.1f}, lo {drive['maxLo']:.1f}")
    await g.step(1.5)
    nh = await g.js(NEAR_HIGH, [drive['x'], drive['z'], 260])
    g.check('nach der Fahrt: Chunks < 260 m fein gebaut', nh['n'] > 0 and nh['h'] == nh['n'], nh)
    ref = await g.js(f"""()=>{{const C={M}.CITY.chunks;let bad=0;for(const c of C.values()){{if(c.high&&c.low&&c.low.visible)bad++;}}return bad}}""")
    g.check('Sichtbarkeit wie bisher: grob ausgeblendet, wo fein steht', ref == 0, ref)

    # Dichtester Chunk: in Paket-Schritten gebaut ergibt dieselben Meshes wie der synchrone Bau (Material, Vertices, Inhalt)
    for hi in (True, False):
        pr = await g.js(f"(hi)=>{{const C=[...{M}.CITY.chunks.values()].sort((a,b)=>b.list.length-a.list.length)[0];return Object.assign({{key:C.key}},{B}.probe(C.key,hi))}}", hi)
        lab = 'fein' if hi else 'grob'
        g.check(f'dichtester Chunk ({lab}): in mehrere Pakete zerlegt', pr['steps'] >= 5, pr)
        g.check(f'dichtester Chunk ({lab}): Ergebnis identisch zum synchronen Bau', pr['same'] and pr['meshes'] >= 3, pr)

    # 5. Teleport nach Wiesbaden + ein Bild: nahe Chunks sofort gebaut (Sprung-Kern), danach Cache dort gefüllt, Start leer
    sy0 = await g.js(f"()=>{B}.city.sync.hi")
    await g.js(TELE, list(WIES))
    await g.step(1 / 60)
    nh = await g.js(NEAR_HIGH, [WIES[0], WIES[1], 260])
    sy1 = await g.js(f"()=>{B}.city.sync.hi")
    g.check('Teleport + ein Bild: Chunks < 260 m fein gebaut', nh['n'] > 0 and nh['h'] == nh['n'], nh)
    g.check('Teleport: Sprung-Kern synchron', sy1 > sy0, f'{sy0} → {sy1}')
    for _ in range(20):
        if not await g.js("()=>[...__MEENZ.FRAMEB.jobs.keys()].some(k=>k.startsWith('bld:ring:')||k.startsWith('bld:drop:'))"):
            break
        await g.step(0.5)
    cw = await g.js(f"([x,z])=>{B}.cachedNear(x,z,700)", list(WIES))
    cs = await g.js(f"()=>{B}.cachedNear(-150,-30,1500)")
    g.check('Wiesbaden: Ringe < 700 m jetzt im Cache', cw['n'] > 500 and cw['cached'] == cw['n'], cw)
    g.check('Start (jetzt > 9 km): Cache geleert', cs['n'] > 1000 and cs['cached'] == 0, cs)
    st2 = await g.js(f"()=>{{const S={B};return {{hash:S.ringHash()===S.hash0,fills:S.stats.fills,drops:S.stats.drops}}}}")
    g.check('nach Füllen/Verwerfen: Ringe weiter identisch', st2['hash'], st2)
    g.check('Füll- und Verwerf-Pakete gelaufen', st2['fills'] > 0 and st2['drops'] > 0, st2)

    # 6. Schnellreise zurück nach Mainz: nach der Ankunft sofort gebaut (force-Pfad wie bisher)
    d = await g.js(f"""()=>{{const M={M};const d=M.ftDestinations().find(d=>!d.special&&Math.hypot(d.x+150,d.z+30)<1500);if(!d)return null;M.fastTravel(d);return {{n:d.n,x:d.x,z:d.z}}}}""")
    g.check('Schnellreise-Ziel in Mainz gefunden', d is not None, d)
    if d:
        await g.page.wait_for_function("(d)=>{const h=__MEENZ.P1.h;return Math.hypot(h.x-d.x,h.z-d.z)<400}", arg=d, polling=50, timeout=5000)
        p = await g.js("()=>[__MEENZ.P1.h.x,__MEENZ.P1.h.z]")
        nh = await g.js(NEAR_HIGH, [p[0], p[1], 260])
        g.check(f'Schnellreise „{d["n"]}“: Chunks < 260 m sofort fein gebaut', nh['n'] > 0 and nh['h'] == nh['n'], nh)
        await g.step(1 / 60)
        cs = await g.js(f"()=>{{const P={M}.P1.h;const S={B};return S.ringHash()===S.hash0}}")
        g.check('nach Schnellreise: Ringe weiter identisch', cs)


# real=True: im three-Stub ist camera.position ein Proxy (NaN) → updateCityLOD baut dort im Spiel nie; echtes three.js nötig
run(test, mobile=True, real=True)
