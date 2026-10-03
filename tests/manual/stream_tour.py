"""Kachel-Streaming unter Last messen (ohne Asserts, Paket 40.5): CPU-Drosselung ×4 per CDP, Autofahrt Start → Theodor-Heuss-
Brücke → Kastel Richtung Wiesbaden, danach ein Flug nach Wiesbaden-Mitte. Ausgabe: Bild-Budget-Scheibe (FRAMEB) p95/max,
ganzes update() p95/max, langsamstes Paket, langsamstes st:-Paket, Kachelzustand.

Aufruf:  python3 tests/manual/stream_tour.py [m|d] [--rate 4] [--q niedrig]
Braucht einen Server (MEENZ_URL, Standard http://localhost:8765), lädt real.html. Ohne Rendern (__NORENDER): GPU-Uploads
neuer Meshes sind nicht enthalten, nur die JS-Arbeit je Bild.
"""
import os, sys, time, asyncio, argparse, json
from playwright.async_api import async_playwright

ap = argparse.ArgumentParser()
ap.add_argument('dev', nargs='?', default='m')
ap.add_argument('--rate', type=float, default=4)
ap.add_argument('--q', default=None)
A = ap.parse_args()
MOB = A.dev == 'm'
URL = os.environ.get('MEENZ_URL', 'http://localhost:8765') + '/game/real.html'
CAR = [(300, -500), (593, -808), (1200, -1700), (1500, -2600)]  # Start → Brücke → Kastel → Richtung Wiesbaden
FLY = [(-2239, -9205)]                                            # Flug nach Wiesbaden-Mitte

# Ein Abschnitt: Fahrzeug je Bild um speed*dt entlang der Wegpunkte setzen, update() laufen lassen, Zeiten sammeln
LEG = """async ([pts,speed,y,frames])=>{const M=__MEENZ,F=M.FRAMEB,P=M.P1,T=window.__tour,v=T.v;const dt=1/60;
  // Budget in Millisekunden wie im Spiel (unter __MANUAL zählt FRAMEB nur Pakete); rAF kann hier nicht dazwischenfunken
  window.__MANUAL=false;try{
  for(let f=0;f<frames;f++){if(T.i>=pts.length)return true;const [tx,tz]=pts[T.i];const dx=tx-T.x,dz=tz-T.z,d=Math.hypot(dx,dz),s=speed*dt;
    if(d<=s){T.x=tx;T.z=tz;T.i++;}else{T.x+=dx/d*s;T.z+=dz/d*s;}const h=Math.atan2(dx,dz);
    v.health=1e6;P.h.health=100;if(P.car!==v)M.enterCar(P,v);v.x=T.x;v.z=T.z;v.h=h;v.vx=Math.sin(h)*speed;v.vz=Math.cos(h)*speed;v.speed=speed;if(y!==null){v.y=y;v.air=true;v.alt=y;}
    const t0=performance.now();M.update(dt);const u=performance.now()-t0;T.up.push(u);T.sl.push(F.timing.last);T.jobs+=F.timing.jobsLast;
    if(u>T.worst[0])T.worst=[u,F.timing.slowest,F.timing.slowestMs];}
  }finally{window.__MANUAL=true;}
  return false;}"""


def pct(a, q):
    a = sorted(a)
    return a[min(len(a) - 1, int(len(a) * q))] if a else 0


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        ctx = await (b.new_context(**p.devices['iPhone 13']) if MOB else b.new_context(viewport={'width': 1280, 'height': 800}))
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        init = "window.__NORENDER=true;window.__MANUAL=true;"
        if A.q: init += "try{localStorage.setItem('meenz-quality','" + A.q + "')}catch(e){};"
        await pg.add_init_script(init)
        await pg.goto(URL)
        await pg.wait_for_function("window.__MEENZ!==undefined&&__MEENZ.mode==='menu'", timeout=400000)
        print('Qualität', await pg.evaluate("()=>__MEENZ.QUALITY"), 'Radien', await pg.evaluate("()=>JSON.stringify(__MEENZ.STREAM.R)"), flush=True)
        await pg.evaluate("""()=>{const M=__MEENZ,P=M.P1;M.startGame();M.UFO.next=1e9;M.KART.next=1e9;M.setWanted(0);
          const c=new M.Car('kompakt',P.h.x+3,P.h.z,0,{ctrl:'none'});c.ai={mode:'parked'};M.enterCar(P,c);for(let i=0;i<30;i++)M.update(1/60);}""")
        cdp = await ctx.new_cdp_session(pg)
        await cdp.send('Emulation.setCPUThrottlingRate', {'rate': A.rate})
        res = {}
        for name, pts, speed, y in [('Auto 45 m/s', CAR, 45, None), ('Flug 90 m/s, 150 m', FLY, 90, 150)]:
            if y is not None:
                await pg.evaluate("""()=>{const M=__MEENZ,P=M.P1;M.exitCar(P,true);const pl=M.FLUG.planes[0];pl.x=P.h.x;pl.z=P.h.z;pl.y=150;pl.air=true;pl.speed=90;pl.alt=150;
                  P.h.x=pl.x;P.h.z=pl.z;M.enterCar(P,pl);}""")
            await pg.evaluate("()=>{const F=__MEENZ.FRAMEB.timing,S=__MEENZ.STREAM.st;F.max=0;F.slowest='';F.slowestMs=0;S.maxMs=0;S.slowest='';S.slowestMs=0;"
                              "const v=__MEENZ.P1.car;window.__tour={v,i:0,x:v.x,z:v.z,up:[],sl:[],jobs:0,worst:[0,'',0]};}")
            t0 = time.time()
            while not await pg.evaluate(LEG, [pts, speed, y, 120]):
                pass
            r = await pg.evaluate("()=>{const T=window.__tour,F=__MEENZ.FRAMEB.timing,S=__MEENZ.STREAM;return {up:T.up,sl:T.sl,jobs:T.jobs,worst:T.worst,"
                                  "slowest:F.slowest,slowestMs:F.slowestMs,st:S.st,counts:S.counts(),pending:S.pending(),cpuGeoMB:S.stats.cpuGeoBytes/1e6}}")
            up, sl = r['up'], r['sl']
            n = len(up)
            res[name] = r
            print(f"== {name}: {n} Bilder ({n / 60:.0f} s Spielzeit) in {time.time() - t0:.0f} s, Drosselung ×{A.rate:g}")
            print(f"   Scheibe (FRAMEB):  p95 {pct(sl, 0.95):.1f} ms  max {max(sl):.1f} ms  ({r['jobs']} Pakete)")
            print(f"   update() gesamt:   p95 {pct(up, 0.95):.1f} ms  max {max(up):.1f} ms  >100 ms: {sum(1 for u in up if u > 100)}  (langsamstes Bild: {r['worst'][0]:.0f} ms, Paket {r['worst'][1]})")
            print(f"   langsamstes Paket: {r['slowest']} {r['slowestMs']:.1f} ms · langsamstes st:-Paket: {r['st']['slowest']} {r['st']['slowestMs']:.1f} ms")
            print(f"   Kacheln {json.dumps(r['counts'])} offen {r['pending']} · CPU-Geometrie {r['cpuGeoMB']:.0f} MB", flush=True)
        await cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1})
        print('Fehler:', errs[:3] or 'keine')
        await b.close()

asyncio.run(main())
