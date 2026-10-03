"""Welle 10 Ruckler-Abnahme: Fluessigkeit auf dem Handy (WebKit, iPhone 14 Pro quer, Qualitaet niedrig, ECHTES Rendern).

    MEENZ_URL=http://127.0.0.1:8874 .venv/bin/python tests/manual/ruck_tour.py [Fahrsekunden=30] [nachSchnellreise=10]

Ablauf: Auto ~300 m vor der Theodor-Heuss-Bruecke (Mainzer Seite) -> 30 s Fahrt mit echter Fahrphysik ueber die Bruecke
nach Kastel Richtung Wiesbaden (Pure-Pursuit-Treiber setzt W/S/A/D je rAF) -> eine Schnellreise nach Wiesbaden
(`fastTravel`, Bildschirm kurz schwarz) -> weitere Sekunden Fahrt dort. Kein __MANUAL/__NORENDER: die rAF-Schleife des
Spiels laeuft selbst. Je Frame: rAF-Abstand, Position, Zaehler (Lazy-Zonen, Bodenkacheln, Chunks, Pakete) und - falls
vorhanden - die Messhaken `__MEENZ.RUCK.fr` (ms je verdaechtiger Funktion im letzten Spielframe, siehe p6s_ruck.js).
Drei RINFO-Proben (Draw-Calls/Dreiecke eines vollen Bildes; rendert EINEN Zusatzframe, das Folgebild ist ausgenommen).
Ausgabe: tests/out/ruck_tour.json + Zusammenfassung. Headless-WebKit ist eine Emulation, kein echtes iPhone.
Schwerer Lauf: nicht in Schleifen starten, die Maschine ist geteilt.
"""
import os, sys, json, asyncio, time
from playwright.async_api import async_playwright

BASE = os.environ.get('MEENZ_URL', 'http://127.0.0.1:8874').rstrip('/')
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'out') + '/'
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 30.0
DUR2 = float(sys.argv[2]) if len(sys.argv) > 2 else 10.0
PRE = 300.0
M = 'window.__MEENZ'

ROUTE = r"""()=>{const M=__MEENZ;
 const nearestN=(x,z)=>{let b=-1,bd=1e18;M.NODES.forEach((N,i)=>{if(!N.car)return;const d=(N.x-x)**2+(N.z-z)**2;if(d<bd){bd=d;b=i;}});return b;};
 window.__ROUTE=(x0,z0,x1,z1)=>{const s=nearestN(x0,z0),t=nearestN(x1,z1);const N=M.NODES,E=M.EDGES;const d=new Map([[s,0]]),pr=new Map();const q=[[0,s]];const done=new Set();
  while(q.length){q.sort((a,b)=>a[0]-b[0]);const [dd,n]=q.shift();if(done.has(n))continue;done.add(n);if(n===t)break;
   for(const ei of N[n].e){const e=E[ei];if(!e.car)continue;if(e.ow&&e.a!==n)continue;const o=e.a===n?e.b:e.a;const nd=dd+e.len;if(nd<(d.has(o)?d.get(o):1e18)){d.set(o,nd);pr.set(o,n);q.push([nd,o]);}}}
  const out=[];for(let n=t;n!==undefined;n=pr.get(n)){out.push([N[n].x,N[n].z]);if(n===s)break;}return out.reverse();};
 return true;}"""

SETUP = r"""(pre)=>{const R=window.__ROUTE;
 const full=R(0,0,747,-1061).concat(R(747,-1061,-2239,-9205).slice(1));
 let acc=[0];for(let i=1;i<full.length;i++)acc.push(acc[i-1]+Math.hypot(full[i][0]-full[i-1][0],full[i][1]-full[i-1][1]));
 let ib=full.findIndex(p=>p[0]>430);if(ib<0)ib=Math.floor(full.length/2);
 let i0=0;for(let i=0;i<=ib;i++)if(acc[ib]-acc[i]>=pre)i0=i;
 window.__PATH=full.slice(i0);
 return {len:Math.round(acc[acc.length-1]-acc[i0]),pts:window.__PATH.length,start:window.__PATH[0]};}"""

PLACE = r"""()=>{const M=__MEENZ,P=M.P1;const p=window.__PATH;const h0=Math.atan2(p[1][0]-p[0][0],p[1][1]-p[0][1]);
 if(P.car)M.exitCar(P,true);P.h.x=p[0][0];P.h.z=p[0][1];P.h.y=M.groundYFn(p[0][0],p[0][1]);
 const c=new M.Car('kompakt',p[0][0],p[0][1],h0,{});c.ai={mode:'parked'};M.enterCar(P,c);window.__CAR=c;return [c.x,c.z,c.h]}"""

# Treiber + Aufzeichnung (rAF der Seite). Phase 1: Fahrt; dann Schnellreise; Phase 2: Fahrt in Wiesbaden.
DRIVE = r"""([dur,dur2,vmax])=>{const M=__MEENZ,K=M.keys,c=window.__CAR;let path=window.__PATH;
 const R={f:[],rinfo:[],log:[],t0:0,done:false,unstick:0,ft:null};window.__REC=R;
 const zb=()=>M.LAZY.zones.reduce((a,z)=>a+z.builds,0),zd=()=>M.LAZY.zones.reduce((a,z)=>a+z.disposes,0);
 const zbusy=()=>M.LAZY.zones.filter(z=>z.building).length;
 const built=()=>M.LAZY.zones.filter(z=>z.built).map(z=>z.name).join(',');
 let seg=0,last=0,stuck=0,phase=1,tFt=0,riNext=[5000,20000];const wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};
 const probe=(fr)=>{const a=performance.now();const ri=M.RINFO;fr.ri=1;R.rinfo.push({t:fr.t,calls:ri.calls,tris:ri.triangles,ms:Math.round((performance.now()-a)*10)/10,x:fr.x,z:fr.z,built:built()});};
 function tick(ts){if(R.done)return;if(!R.t0){R.t0=ts;last=ts;}
  const dt=ts-last;last=ts;const t=ts-R.t0;
  const sp=Math.hypot(c.vx,c.vz);
  if(phase!==2){
   while(seg<path.length-2&&Math.hypot(path[seg+1][0]-c.x,path[seg+1][1]-c.z)<Math.hypot(path[seg][0]-c.x,path[seg][1]-c.z))seg++;
   const look=14+sp*0.6;let j=seg,d=0;
   while(j<path.length-1&&d<look){d+=Math.hypot(path[j+1][0]-path[j][0],path[j+1][1]-path[j][1]);j++;}
   const tg=path[Math.min(j,path.length-1)];const err=wrap(Math.atan2(tg[0]-c.x,tg[1]-c.z)-c.h);
   let j2=j,d2=0;while(j2<path.length-1&&d2<40){d2+=Math.hypot(path[j2+1][0]-path[j2][0],path[j2+1][1]-path[j2][1]);j2++;}
   const tg2=path[Math.min(j2,path.length-1)];const bend=Math.abs(wrap(Math.atan2(tg2[0]-c.x,tg2[1]-c.z)-Math.atan2(tg[0]-c.x,tg[1]-c.z)));
   const vt=Math.max(7,vmax*(1-Math.min(0.65,bend*1.2))*(1-Math.min(0.5,Math.abs(err)*0.8)));
   K.KeyW=sp<vt;K.KeyS=sp>vt+4;K.KeyA=err>0.04;K.KeyD=err<-0.04;
   stuck=sp<1.2?stuck+dt:0;if(stuck>3000&&t>3000){stuck=0;R.unstick++;const p2=path[Math.min(seg+3,path.length-1)];c.x=p2[0];c.z=p2[1];c.vx=c.vz=0;c.speed=0;R.log.push(['unstick',Math.round(t),Math.round(c.x),Math.round(c.z)]);}
  }else{for(const k of ['KeyW','KeyS','KeyA','KeyD'])K[k]=false;}
  const fr={t:Math.round(t*10)/10,dt:Math.round(dt*10)/10,ph:phase,x:Math.round(c.x),z:Math.round(c.z),v:Math.round(sp*10)/10,zb:zb(),zd:zd(),zq:zbusy(),
    gt:M.GROUND.tiles.size,ch:M.CITY.chunks.size,hi:0,lo:0,nc:M.CARS.length,nh:M.HUMANS.length,fb:M.FRAMEB?M.FRAMEB.jobs.size:0};
  for(const q of M.CITY.chunks.values()){if(q.high)fr.hi++;if(q.low)fr.lo++;}
  if(M.RUCK&&M.RUCK.fr)fr.r=Object.assign({},M.RUCK.fr);
  if(riNext.length&&t>=riNext[0]){riNext.shift();probe(fr);}
  R.f.push(fr);
  if(phase===1&&(t>=dur*1000||seg>=path.length-3)){phase=2;tFt=t;for(const k of ['KeyW','KeyS','KeyA','KeyD'])K[k]=false;
   const L=M.ftDestinations();let best=null,bd=1e18;for(const d of L){const e=Math.hypot(d.x+2239,d.z+9205);if(e<bd){bd=e;best=d;}}
   R.ft={t:Math.round(t),n:best.n,x:Math.round(best.x),z:Math.round(best.z)};M.fastTravel(best);}
  else if(phase===2&&t>tFt+1500){phase=3;seg=0;path=window.__ROUTE(c.x,c.z,c.x+700,c.z+500);R.log.push(['wi-route',path.length]);riNext=[t+4000];}
  else if(phase===3&&(t>=tFt+1500+dur2*1000||seg>=path.length-3)){R.done=true;for(const k of ['KeyW','KeyS','KeyA','KeyD'])K[k]=false;R.end={x:c.x,z:c.z,t:Math.round(t)};return;}
  requestAnimationFrame(tick);}
 requestAnimationFrame(tick);return true;}"""


def pct(a, q):
    a = sorted(a)
    return a[min(len(a) - 1, int(round(q * (len(a) - 1))))]


def cause(fr, prev):
    """Wahrscheinliche Ursache eines langen Frames: Zaehleraenderung, sonst groesster Messhaken des Spielframes davor."""
    ch = {k: (prev[k], fr[k]) for k in ('zb', 'zd', 'zq', 'gt', 'hi', 'lo', 'nc', 'nh') if prev.get(k) != fr.get(k)}
    r = fr.get('r') or {}
    top = sorted(((k, v) for k, v in r.items() if isinstance(v, (int, float)) and k not in ('n',)), key=lambda kv: -kv[1])[:5]
    return ch, top


async def main():
    async with async_playwright() as p:
        b = await p.webkit.launch()
        dev = p.devices['iPhone 14 Pro landscape']
        ctx = await b.new_context(**dev)
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)[:300]))
        pg.on('console', lambda m: errs.append('console: ' + m.text[:300]) if m.type == 'error' and 'font' not in m.text and 'favicon' not in m.text else None)
        await pg.add_init_script("try{localStorage.setItem('meenz-quality','niedrig')}catch(e){}")
        await pg.goto(BASE + '/game/real.html')
        t0 = time.time()
        while time.time() - t0 < 300:
            if await pg.evaluate("()=>window.__MEENZ!==undefined&&__MEENZ.mode==='menu'"): break
            await asyncio.sleep(0.5)
        print('geladen nach', round(time.time() - t0, 1), 's; Qualitaet', await pg.evaluate(f"()=>{M}.QUALITY"), 'phone', await pg.evaluate(f"()=>{M}.IS_PHONE"),
              'viewport', await pg.evaluate("()=>[innerWidth,innerHeight,devicePixelRatio]"), 'RUCK-Haken', await pg.evaluate(f"()=>!!({M}.RUCK&&{M}.RUCK.hooks)"))
        await pg.evaluate(f"()=>{{{M}.INTRO.done=true;{M}.startGame();}}")
        await pg.evaluate(ROUTE)
        print('route', json.dumps(await pg.evaluate(SETUP, PRE)))
        print('auto', await pg.evaluate(PLACE))
        await asyncio.sleep(6)   # Einschwingen am Startpunkt (Spiel laeuft selbst)
        print('zonen gebaut', await pg.evaluate(f"()=>{M}.LAZY.zones.filter(z=>z.built).map(z=>z.name)"))
        await pg.evaluate(DRIVE, [DUR, DUR2, 24])
        await pg.wait_for_function("()=>window.__REC&&window.__REC.done", timeout=int((DUR + DUR2) * 1000 * 4 + 60000), polling=500)
        R = await pg.evaluate("()=>window.__REC")
        fbt = await pg.evaluate(f"()=>{M}.FRAMEB?{{slowest:{M}.FRAMEB.timing.slowest,slowestMs:{M}.FRAMEB.timing.slowestMs,max:{M}.FRAMEB.timing.max,syncMax:{M}.FRAMEB.timing.syncMax,stats:{M}.FRAMEB.stats}}:null")
        ruck = await pg.evaluate(f"()=>{M}.RUCK&&{M}.RUCK.max?{{max:{M}.RUCK.max,prewarm:{M}.RUCK.prewarm}}:null")
        eb = await pg.evaluate("()=>(document.getElementById('errbox')||{}).textContent||''")
        await b.close()

    os.makedirs(OUT, exist_ok=True)
    json.dump(R, open(OUT + 'ruck_tour.json', 'w'))
    F = R['f']
    f = F[1:]
    dts = [x['dt'] for x in f]
    dur = F[-1]['t'] / 1000
    print(f"\nFrames {len(f)}  Dauer {dur:.1f}s  mittlere fps {len(f) / dur:.1f}  Schnellreise {R.get('ft')}  Ende {R.get('end')}")
    print(f"Frame-Zeit ms (alle): p50 {pct(dts, .5):.1f}  p95 {pct(dts, .95):.1f}  p99 {pct(dts, .99):.1f}  max {max(dts):.1f}")
    ri_next = {i + 1 for i, x in enumerate(F) if x.get('ri')}
    tft = R['ft']['t'] if R.get('ft') else 1e18
    steady = [x['dt'] for i, x in enumerate(F) if i > 0 and x['t'] > 10000 and i not in ri_next and not (tft <= x['t'] <= tft + 1500)]
    if steady:
        print(f"Frame-Zeit ms (nach 10 s, ohne RINFO-Folgebild/Schnellreise-Fenster): p95 {pct(steady, .95):.1f}  max {max(steady):.1f}  n {len(steady)}")
    print('Frames > 50 ms:', sum(d > 50 for d in dts), ' > 100 ms:', sum(d > 100 for d in dts))
    vs = [x['v'] for x in f if x['ph'] == 1]
    if vs: print(f"Tempo Phase 1 m/s: mittel {sum(vs) / len(vs):.1f}  max {max(vs):.1f}  unstick {R['unstick']}")
    for r in R['rinfo']:
        print(f"RINFO t {r['t'] / 1000:.1f}s  pos ({r['x']},{r['z']})  Draw-Calls {r['calls']}  Dreiecke {r['tris']}  ({r['ms']} ms)  Zonen {r['built']}")
    print('Frames > 100 ms (dt = Abstand zum Vorbild; Ursache = Zaehleraenderung / Messhaken des Spielframes davor):')
    for i, x in enumerate(F[1:], 1):
        if x['dt'] <= 100: continue
        tag = 'erste 10 s' if x['t'] <= 10000 else 'RINFO-Folgebild' if i in ri_next else 'Schnellreise' if tft <= x['t'] <= tft + 1500 else 'NACH 10 s'
        ch, top = cause(x, F[max(0, i - 3)])
        prev_r = F[i - 1].get('r') or {}
        topp = sorted(((k, v) for k, v in prev_r.items() if isinstance(v, (int, float))), key=lambda kv: -kv[1])[:4]
        print(f"  #{i} [{tag}] dt {x['dt']:.0f} ms  t {x['t'] / 1000:.1f}s  ph {x['ph']}  pos ({x['x']},{x['z']})  v {x['v']}  Zaehler {ch}  Haken {top}  Haken-1 {topp}")
    if fbt: print('FRAMEB', json.dumps(fbt))
    if ruck: print('RUCK', json.dumps(ruck))
    print('Log:', R['log'][:10])
    print('Seitenfehler:', errs, 'errbox:', eb)

asyncio.run(main())
