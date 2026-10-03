# Paket 40.5 (Welle 10, tiles): Straßen/Boden/Gleise/Bäume je 320-m-Kachel nur in Spielernähe bauen, fern freigeben.
# Haupttest als Handy (LOWMEM: bauen < 1700 m, frei > 2000 m), danach ein kurzer Desktop-Lauf (3200/3500 m).
# Plan §8 Punkte 1–6 und 8 für Straßen/Boden/Gleise/Bäume; HG (rle/CRC) prüft test_hgcold, Lazy-Zonen test_ruckler.
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
WI_MITTE = (-2239, -9205)
WI_WESTEND = (-3365, -9232)
# Fahrt Start → Theodor-Heuss-Brücke → Kastel → Wiesbaden-Mitte (150-m-Schritte)
ROUTE = [(300, -500), (593, -808), (-1200, -5000), WI_MITTE]

TILE = f"([x,z])=>{M}.STREAM.at(x,z)"
# Kacheln im Bau-Radius (Abstand zum Spieler), die noch nicht fertig sind / außerhalb des Freigabe-Radius (Abstand zur Kapsel
# Spieler → Vorausschau, wie STREAM selbst plant), die noch Meshes haben und nicht zur Freigabe anstehen
RING = f"""([x,z])=>{{const S={M}.STREAM;const n=S.near(x,z,1e9);
  return {{open:n.filter(t=>t.d<S.R.build&&t.state!=='built').map(t=>[t.key,t.state,Math.round(t.d)]),
          stale:n.filter(t=>t.dp>S.R.free+1&&t.streamed>0&&t.state!=='freeing').map(t=>[t.key,t.state,Math.round(t.d)]),
          built:n.filter(t=>t.state==='built').length,freeing:n.filter(t=>t.state==='freeing').length}}}}"""


async def teleport(g, x, z):
    await g.js(f"([x,z])=>{{const M={M},h=M.P1.h;if(M.P1.car)M.exitCar(M.P1,true);h.x=x;h.z=z;h.y=M.groundYFn(x,z);h.sync()}}", [x, z])


async def drain(g, limit=40):
    """Spielzeit laufen lassen, bis keine st:-Pakete mehr in der Warteschlange stehen."""
    for _ in range(limit):
        if await g.js(f"()=>{M}.STREAM.pending()") == 0:
            return True
        await g.step(0.5)
    return await g.js(f"()=>{M}.STREAM.pending()") == 0


async def path(a, b, step):
    d = ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2) ** 0.5
    n = max(1, int(d // step))
    return [(a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n) for k in range(1, n + 1)]


async def test_mobile(g):
    await g.start()
    S0 = await g.js(f"()=>{{const M={M},S=M.STREAM;return {{R:S.R,c:S.counts(),st:{{...S.stats}},start:[M.P1.h.x,M.P1.h.z],ft:S.timing}}}}")
    g.check('Handy-Radien: bauen < 1700 m, frei > 2000 m', S0['R'] == {'build': 1700, 'free': 2000}, S0['R'])
    sx, sz = S0['start']

    # --- 1 Nach dem Boot: nur die Umgebung des Starts gebaut, Wiesbaden kalt ---
    for name, (x, z) in [('Wiesbaden-Mitte', WI_MITTE), ('Westend', WI_WESTEND)]:
        t = await g.js(TILE, [x, z])
        g.check(f'{name}: Kachel kalt, keine Meshes in der Szene', t and t['state'] == 'cold' and t['meshes'] == 0 and t['inScene'] == 0, t)
    t = await g.js(TILE, [sx, sz])
    g.check('Start-Kachel gebaut: alle Ebenen inkl. Bäume, Meshes in der Szene',
            t and t['state'] == 'built' and 'road' in t['built'] and 'trees' in t['built'] and t['inScene'] == t['meshes'] > 5, t)
    r = await g.js(RING, [sx, sz])
    g.check('Boot: jede Kachel < 1700 m um den Start gebaut', not r['open'], r['open'][:5])
    g.check('Boot: nichts > 2000 m gebaut', not r['stale'], r['stale'][:5])
    g.check('Boot baut nur einen Bruchteil der Welt (< 20 % der Kacheln)', S0['c']['built'] < 0.2 * sum(S0['c'].values()), S0['c'])

    # --- 2 Annäherung über die Brücke in 150-m-Schritten ---
    await g.js(f"()=>{{const S={M}.STREAM.st;S.maxMs=0;S.slowestMs=0;S.slowest=''}}")
    pos, opens, stales, worst = (sx, sz), [], [], 0
    for wp in ROUTE:
        for p in await path(pos, wp, 150):
            await g.js(f"([x,z])=>{{const M={M},h=M.P1.h;h.x=x;h.z=z;h.y=M.groundYFn(x,z)}}", list(p))
            await g.step(0.5)
            r = await g.js(RING, list(p))
            if r['open']: opens.append((p, r['open'][:3]))
        # am Wegpunkt kurz stehen: Vorausschau klingt ab, dann muss alles > 2000 m freigegeben sein oder anstehen
        await g.step(1)
        r = await g.js(RING, list(wp))
        if r['stale']: stales.append((wp, r['stale'][:3]))
        pos = wp
    tim = await g.js(f"()=>{M}.STREAM.timing")
    g.check('Fahrt: jede Kachel < 1700 m ist gebaut, wenn der Spieler ankommt', not opens, opens[:3])
    g.check('Fahrt: Kacheln > 2000 m werden freigegeben', not stales, stales[:3])
    g.check('Fahrt: kein Kachel-Paket > 30 ms', tim['stMax'] <= 30, f"{tim['stMax']:.1f} ms {tim['stSlowest']}")
    g.check('Fahrt: Bild-Budget-Scheibe ≤ 30 ms', tim['max'] <= 30, round(tim['max'], 1))
    await drain(g)
    wi = await g.js(TILE, list(WI_MITTE))
    g.check('Wiesbaden-Mitte gebaut, Meshes in der Szene', wi['state'] == 'built' and wi['inScene'] == wi['meshes'] > 0, wi)
    st = await g.js(f"()=>{M}.STREAM.at({sx},{sz})")
    g.check('Start-Kachel in Mainz nach der Fahrt freigegeben', st['state'] == 'cold' and st['meshes'] == 0, st)
    near_wi = await g.js(f"()=>{M}.STREAM.near({WI_MITTE[0]},{WI_MITTE[1]},1700).map(t=>[t.key,t.hash])")
    hash_wi = dict(near_wi)

    # --- 4 Wegfahren: Sprung zurück zum Start, Wiesbaden wird frei ---
    d0 = await g.js(f"()=>{M}.STREAM.stats.disposes")
    await teleport(g, sx, sz)
    await g.step(1 / 60)
    t = await g.js(TILE, [sx, sz])
    g.check('Sprung zurück: Start-Kachel sofort gebaut (Kern < 450 m)', t['state'] == 'built', t['state'])
    core = await g.js(f"()=>{M}.STREAM.near({sx},{sz},450).filter(t=>t.state!=='built').map(t=>t.key)")
    g.check('Sprung zurück: alle Kacheln < 450 m gebaut', not core, core)
    peak = await g.js(f"()=>{M}.STREAM.stats.cpuGeoBytes")
    g.check('Sprung: kein Lade-Hinweis nötig (Kern fertig)', not await g.js(f"()=>{M}.STREAM.loading"))
    ok = await drain(g)
    g.check('Warteschlange läuft leer', ok)
    S1 = await g.js(f"()=>{{const S={M}.STREAM;return {{st:{{...S.stats}},wi:S.at({WI_MITTE[0]},{WI_MITTE[1]}),we:S.at({WI_WESTEND[0]},{WI_WESTEND[1]}),c:S.counts()}}}}")
    g.check('Wiesbaden-Mitte wieder kalt, Meshes aus der Szene', S1['wi']['state'] == 'cold' and S1['wi']['meshes'] == 0, S1['wi'])
    g.check('Freigaben gezählt (disposes ≥ 1)', S1['st']['disposes'] > d0, [d0, S1['st']['disposes']])
    g.check('CPU-Geometrie sinkt nach dem Freigeben', S1['st']['cpuGeoBytes'] < peak, [peak, S1['st']['cpuGeoBytes']])
    r = await g.js(RING, [sx, sz])
    g.check('zurück am Start: Ring < 1700 m komplett, nichts > 2000 m', not r['open'] and not r['stale'], [r['open'][:3], r['stale'][:3]])

    # --- 3 Schnellreise mit Auto nach Wiesbaden ---
    d = await g.js(f"""()=>{{const M={M},P=M.P1;const L=M.ftDestinations().filter(d=>!d.special);let best=null,bd=1e9;
        for(const d of L){{const e=Math.hypot(d.x-({WI_MITTE[0]}),d.z-({WI_MITTE[1]}));if(e<bd){{bd=e;best=d;}}}}
        const c=new M.Car('kompakt',P.h.x+3,P.h.z,0,{{ctrl:'none'}});c.ai={{mode:'parked'}};M.enterCar(P,c);M.setWanted(0);
        M.fastTravel(best);return {{n:best.n,x:best.x,z:best.z}}}}""")
    await g.page.wait_for_function(f"(d)=>{{const c={M}.P1.car;return c&&Math.hypot(c.x-d.x,c.z-d.z)<400}}", arg=d, polling=50, timeout=5000)
    await g.step(1 / 60)
    a = await g.js(f"""()=>{{const M={M},c=M.P1.car;const n=M.STREAM.near(c.x,c.z,450);return {{x:c.x,z:c.z,y:c.y,gy:M.groundYFn(c.x,c.z),
        open:n.filter(t=>t.state!=='built').map(t=>t.key),n:n.length,swim:!!M.P1.swim}}}}""")
    g.check(f'Schnellreise „{d["n"]}“: alle Kacheln < 450 m sofort gebaut', a['n'] > 0 and not a['open'], a)
    g.check('Auto steht auf dem Boden (y ≈ groundY), nicht im Wasser', abs(a['y'] - a['gy']) < 0.3 and a['gy'] > -1, a)
    await g.step(2)
    y2 = await g.js(f"()=>{{const c={M}.P1.car;return [c.y,{M}.groundYFn(c.x,c.z)]}}")
    g.check('Auto fällt nicht (y stabil über 2 s)', abs(y2[0] - a['y']) < 0.3 and abs(y2[0] - y2[1]) < 0.3, [a['y'], y2])

    # --- 5 Erneut hin: gleiche Kachel-Hashes wie beim ersten Besuch ---
    await g.js(f"()=>{{const M={M};M.exitCar(M.P1,true)}}")
    await teleport(g, *WI_MITTE)
    await g.step(1 / 60)
    await drain(g)
    again = dict(await g.js(f"()=>{M}.STREAM.near({WI_MITTE[0]},{WI_MITTE[1]},1700).map(t=>[t.key,t.hash])"))
    diff = [k for k in hash_wi if hash_wi[k] != again.get(k)]
    g.check(f'Neubau identisch: {len(hash_wi)} Kacheln (Vertices, Positionssumme, Bauminstanzen) gleich', hash_wi and not diff,
            [(k, hash_wi[k][:120], (again.get(k) or '')[:120]) for k in diff[:2]])

    # --- 6 Kein globales Math.random bei Neubau; Neubau gleich ---
    r = await g.js(f"""()=>{{const M={M};const t0=M.STREAM.at({WI_MITTE[0]},{WI_MITTE[1]});const r0=Math.random;let n=0;
        Math.random=function(){{n++;return r0.apply(this,arguments)}};let t1;try{{t1=M.STREAM.rebuild({WI_MITTE[0]},{WI_MITTE[1]});}}finally{{Math.random=r0;}}
        return {{n,same:t0.hash===t1.hash&&t0.meshes===t1.meshes,t0:t0.hash.slice(0,80),t1:t1.hash.slice(0,80),state:t1.state}}}}""")
    g.check('erzwungener Neubau zieht 0× aus dem globalen Math.random', r['n'] == 0, r['n'])
    g.check('erzwungener Neubau liefert denselben Hash', r['same'] and r['state'] == 'built', r)


async def test_desktop(g):
    await g.start()
    S = await g.js(f"()=>{{const M={M},S=M.STREAM;return {{R:S.R,start:[M.P1.h.x,M.P1.h.z]}}}}")
    g.check('Desktop-Radien: bauen < 3200 m, frei > 3500 m', S['R'] == {'build': 3200, 'free': 3500}, S['R'])
    sx, sz = S['start']
    r = await g.js(RING, [sx, sz])
    g.check('Desktop-Boot: jede Kachel < 3200 m gebaut, nichts > 3500 m', not r['open'] and not r['stale'] and r['built'] > 200, [r['built'], r['open'][:3], r['stale'][:3]])
    t = await g.js(TILE, list(WI_MITTE))
    g.check('Desktop: Wiesbaden-Mitte (> 9 km) kalt – nur die Bäume stehen (Fernsicht wie bisher)',
            t['state'] == 'cold' and t['streamed'] == 0 and t['built'] == ['trees'] and t['meshes'] > 0, t)
    n = await g.js(f"()=>{M}.STREAM.near(0,0,1e9).filter(t=>t.need.includes('trees')&&!t.built.includes('trees')).length")
    g.check('Desktop: Bäume in allen Kacheln gebaut', n == 0, n)
    await teleport(g, *WI_MITTE)
    await g.step(1 / 60)
    t = await g.js(TILE, list(WI_MITTE))
    g.check('Desktop-Teleport: Ziel-Kachel sofort gebaut', t['state'] == 'built' and t['inScene'] == t['meshes'] > 0, t['state'])
    await drain(g, 80)
    r = await g.js(RING, list(WI_MITTE))
    g.check('Desktop: nach dem Teleport Ring < 3200 m komplett, Mainz-Start frei', not r['open'] and not r['stale'], [r['open'][:3], r['stale'][:3]])


if __name__ == '__main__':
    rc = 0
    for fn, kw in [(test_mobile, {'mobile': True}), (test_desktop, {})]:
        print(f'-- {fn.__name__}', flush=True)
        try:
            run(fn, **kw)
        except SystemExit as e:
            rc = rc or (e.code or 0)
    sys.exit(rc)
