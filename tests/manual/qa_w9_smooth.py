"""Welle 9 QA: Fluessigkeit auf dem Handy (WebKit, iPhone 14 Pro quer, Qualitaet niedrig, ECHTES Rendern).

    MEENZ_URL=http://127.0.0.1:8905 .venv/bin/python tests/manual/qa_w9_smooth.py [Sekunden=45] [Streckenlaenge_vor_Bruecke_m=900]
    QA_WI=1: Teilstrecke Kastel -> Wiesbaden Schlossplatz, die letzten <Streckenlaenge> m vor dem Ziel
    QA_IDLE=1: Kontrolllauf ohne Fahren (Auto wird nur nachgesetzt)

Kein __NORENDER/__MANUAL: die eigene rAF-Schleife des Spiels laeuft. Gefahren wird mit der echten Fahrphysik:
In der Seite berechnet ein Treiber je Frame (rAF) per Pure-Pursuit die Tasten W/S/A/D (`__MEENZ.keys`) auf einer
Dijkstra-Route durch den Strassengraph (NODES/EDGES, nur Auto-Kanten) von Mainz ueber die Theodor-Heuss-Bruecke
nach Kastel. Zielgeschwindigkeit 20 m/s (72 km/h), in Kurven geringer. Je Frame werden rAF-Zeitstempel, Position,
Geschwindigkeit und Zaehler (Lazy-Zonen gebaut/entsorgt, Boden-Kacheln, Chunks) aufgezeichnet; ca. 1x/s wird
`__MEENZ.RINFO` (Draw-Calls/Dreiecke eines vollen Bildes; rendert dabei EINEN Zusatzframe) abgefragt.
Ausgabe: tests/out/qa_w9_smooth.json. Headless-WebKit ist eine Emulation, kein echtes iPhone.
"""
import os, sys, json, asyncio, time
from playwright.async_api import async_playwright

BASE = os.environ.get('MEENZ_URL', 'http://localhost:8765').rstrip('/')
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'out') + '/'
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 45.0
PRE = float(sys.argv[2]) if len(sys.argv) > 2 else 900.0
M = 'window.__MEENZ'

SETUP = r"""([pre,wi])=>{const M=__MEENZ;
 // Dijkstra Dom -> Kastel (Auto-Kanten, Einbahn beachtet)
 const route=(x0,z0,x1,z1)=>{const s=nearestN(x0,z0),t=nearestN(x1,z1);const N=M.NODES,E=M.EDGES;const d=new Map([[s,0]]),pr=new Map();const q=[[0,s]];const done=new Set();
  while(q.length){q.sort((a,b)=>a[0]-b[0]);const [dd,n]=q.shift();if(done.has(n))continue;done.add(n);if(n===t)break;
   for(const ei of N[n].e){const e=E[ei];if(!e.car)continue;if(e.ow&&e.a!==n)continue;const o=e.a===n?e.b:e.a;const nd=dd+e.len;if(nd<(d.has(o)?d.get(o):1e18)){d.set(o,nd);pr.set(o,n);q.push([nd,o]);}}}
  const out=[];for(let n=t;n!==undefined;n=pr.get(n)){out.push([N[n].x,N[n].z]);if(n===s)break;}return out.reverse();};
 const nearestN=(x,z)=>{let b=-1,bd=1e18;M.NODES.forEach((N,i)=>{if(!N.car)return;const d=(N.x-x)**2+(N.z-z)**2;if(d<bd){bd=d;b=i;}});return b;};
 const full=wi?route(747,-1061,-2239,-9205):route(0,0,747,-1061);
 // Weg auf Laenge begrenzen: Start `pre` m vor dem Punkt, an dem die Route zuerst x>430 (Rheinufer) erreicht
 let acc=[0];for(let i=1;i<full.length;i++)acc.push(acc[i-1]+Math.hypot(full[i][0]-full[i-1][0],full[i][1]-full[i-1][1]));
 let ib=wi?full.length-1:full.findIndex(p=>p[0]>430);if(ib<0)ib=Math.floor(full.length/2);
 let i0=0;for(let i=0;i<=ib;i++)if(acc[ib]-acc[i]>=pre)i0=i;
 const path=full.slice(i0);
 window.__PATH=path;window.__PATHLEN=acc[acc.length-1]-acc[i0];
 return {fullLen:Math.round(acc[acc.length-1]),startAt:path[0],bridgeIdxFromStart:ib-i0,len:Math.round(window.__PATHLEN),pts:path.length,first:path.slice(0,3),end:path[path.length-1]};}"""

PLACE = r"""()=>{const M=__MEENZ,P=M.P1;const p=window.__PATH;const h0=Math.atan2(p[1][0]-p[0][0],p[1][1]-p[0][1]);
 if(P.car)M.exitCar(P,true);P.h.x=p[0][0];P.h.z=p[0][1];P.h.y=M.groundYFn(p[0][0],p[0][1]);
 const c=new M.Car('kompakt',p[0][0],p[0][1],h0,{});c.ai={mode:'parked'};M.enterCar(P,c);window.__CAR=c;return [c.x,c.z,c.h]}"""

# Treiber + Aufzeichnung (laeuft im rAF der Seite)
DRIVE = r"""([dur,lookBase,vmax])=>{const M=__MEENZ,K=M.keys,c=window.__CAR,path=window.__PATH;
 const R={f:[],rinfo:[],log:[],t0:0,done:false,unstick:0};window.__REC=R;
 const zonesB=()=>M.LAZY.zones.reduce((a,z)=>a+z.builds,0),zonesD=()=>M.LAZY.zones.reduce((a,z)=>a+z.disposes,0);
 const built=()=>M.LAZY.zones.filter(z=>z.built).map(z=>z.name).join(',');
 let seg=0,last=0,lastR=0,stuck=0,ppx=c.x,ppz=c.z;const wrap=a=>{while(a>Math.PI)a-=2*Math.PI;while(a<-Math.PI)a+=2*Math.PI;return a;};
 function tick(ts){if(R.done)return;if(!R.t0){R.t0=ts;last=ts;lastR=ts;}
  const dt=ts-last;last=ts;
  // Pure Pursuit: Ziel = Punkt ca. lookahead m vor dem Auto auf dem Pfad
  while(seg<path.length-2&&Math.hypot(path[seg+1][0]-c.x,path[seg+1][1]-c.z)<Math.hypot(path[seg][0]-c.x,path[seg][1]-c.z))seg++;
  const sp=Math.hypot(c.vx,c.vz);const look=lookBase+sp*0.6;let j=seg,d=0;
  while(j<path.length-1&&d<look){d+=Math.hypot(path[j+1][0]-path[j][0],path[j+1][1]-path[j][1]);j++;}
  const tg=path[Math.min(j,path.length-1)];const err=wrap(Math.atan2(tg[0]-c.x,tg[1]-c.z)-c.h);
  // Kurven: weiter voraus Winkel -> Zielgeschwindigkeit
  let j2=j,d2=0;while(j2<path.length-1&&d2<40){d2+=Math.hypot(path[j2+1][0]-path[j2][0],path[j2+1][1]-path[j2][1]);j2++;}
  const tg2=path[Math.min(j2,path.length-1)];const bend=Math.abs(wrap(Math.atan2(tg2[0]-c.x,tg2[1]-c.z)-Math.atan2(tg[0]-c.x,tg[1]-c.z)));
  const vt=Math.max(7,vmax*(1-Math.min(0.65,bend*1.2))*(1-Math.min(0.5,Math.abs(err)*0.8)));
  K.KeyW=vmax>0&&sp<vt;K.KeyS=sp>vt+4;K.KeyA=err>0.04;K.KeyD=err<-0.04;
  // Haengt das Auto fest (Verkehr/Hindernis)? -> 25 m auf dem Pfad vorsetzen
  stuck=sp<1.2?stuck+dt:0;if(stuck>3000&&ts-R.t0>3000){stuck=0;R.unstick++;const p2=path[Math.min(seg+3,path.length-1)];c.x=p2[0];c.z=p2[1];c.vx=c.vz=0;c.speed=0;R.log.push(['unstick',Math.round(ts-R.t0),Math.round(c.x),Math.round(c.z)]);}
  const fr={t:Math.round((ts-R.t0)*10)/10,dt:Math.round(dt*10)/10,x:Math.round(c.x),z:Math.round(c.z),v:Math.round(sp*10)/10,zb:zonesB(),zd:zonesD(),
    gt:M.GROUND.tiles.size,ch:M.CITY.chunks.size,nc:M.CARS.length,nh:M.HUMANS.length,hi:0,lo:0};
  for(const q of M.CITY.chunks.values()){if(q.high)fr.hi++;if(q.low)fr.lo++;}
  if(ts-lastR>=1000){lastR=ts;const a=performance.now();const ri=M.RINFO;fr.ri=1;R.rinfo.push({t:fr.t,calls:ri.calls,tris:ri.triangles,culled:ri.culled,ms:Math.round((performance.now()-a)*10)/10,x:fr.x,z:fr.z,v:fr.v,built:built()});}
  R.f.push(fr);
  if(ts-R.t0>=dur*1000||seg>=path.length-3){R.done=true;for(const k of ['KeyW','KeyS','KeyA','KeyD'])K[k]=false;R.end={x:c.x,z:c.z,seg,n:path.length};return;}
  requestAnimationFrame(tick);}
 requestAnimationFrame(tick);return true;}"""


def pct(a, q):
    a = sorted(a)
    return a[min(len(a) - 1, int(round(q * (len(a) - 1))))]


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
              'viewport', await pg.evaluate("()=>[innerWidth,innerHeight,devicePixelRatio]"))
        await pg.evaluate(f"()=>{{{M}.INTRO.done=true;{M}.startGame();}}")
        print('route', json.dumps(await pg.evaluate(SETUP, [PRE, bool(os.environ.get('QA_WI'))])))
        print('auto', await pg.evaluate(PLACE))
        # Einschwingen: das Spiel laeuft selbst (rAF), Boden/Chunks/Zonen um die Startposition bauen
        await asyncio.sleep(6)
        print('mode', await pg.evaluate(f"()=>[{M}.mode,{M}.P1.car&&{M}.P1.car.id]"), 'zonen gebaut', await pg.evaluate(f"()=>{M}.LAZY.zones.filter(z=>z.built).map(z=>z.name)"))
        await pg.evaluate(DRIVE, [DUR, 14, 0 if os.environ.get('QA_IDLE') else 20])  # QA_IDLE=1: Kontrolllauf ohne Fahren
        await pg.wait_for_function("()=>window.__REC&&window.__REC.done", timeout=int(DUR * 1000 * 4 + 60000), polling=500)
        R = await pg.evaluate("()=>window.__REC")
        eb = await pg.evaluate("()=>(document.getElementById('errbox')||{}).textContent||''")
        await b.close()

    os.makedirs(OUT, exist_ok=True)
    json.dump(R, open(OUT + 'qa_w9_smooth.json', 'w'))
    f = R['f'][1:]
    dts = [x['dt'] for x in f]
    print(f"\nFrames {len(f)}  Dauer {R['f'][-1]['t'] / 1000:.1f}s  mittlere fps {len(f) / (R['f'][-1]['t'] / 1000):.1f}")
    print(f"Frame-Zeit ms: p50 {pct(dts, .5):.1f}  p95 {pct(dts, .95):.1f}  p99 {pct(dts, .99):.1f}  max {max(dts):.1f}")
    print('Frames > 50 ms:', sum(d > 50 for d in dts), ' > 100 ms:', sum(d > 100 for d in dts), ' > 200 ms:', sum(d > 200 for d in dts))
    vs = [x['v'] for x in f]
    print(f"Tempo m/s: mittel {sum(vs) / len(vs):.1f}  max {max(vs):.1f}  unstick {R['unstick']}  Ende", R.get('end'))
    ri = R['rinfo']
    if ri:
        c = [r['calls'] for r in ri]; t = [r['tris'] for r in ri]
        print(f"Draw-Calls: min {min(c)}  avg {sum(c) / len(c):.0f}  max {max(c)}   Dreiecke: min {min(t)}  avg {sum(t) / len(t):.0f}  max {max(t)}  (n={len(ri)} Proben)")
        print('RINFO-Frames (Zusatzrender) dauerten ms:', [r['ms'] for r in ri][:40])
    print('Hitches > 100 ms (Frame i: dt, Zeit, Pos, Aenderung der Zaehler ggue. 2 Frames davor):')
    prev = R['f'][0]
    for i, x in enumerate(R['f'][1:], 1):
        if x['dt'] > 100:
            pv = R['f'][max(0, i - 3)]
            ch = {k: (pv[k], x[k]) for k in ('zb', 'zd', 'gt', 'hi', 'lo', 'nc', 'nh') if pv[k] != x[k]}
            print(f"  #{i} dt {x['dt']:.0f} ms  t {x['t'] / 1000:.1f}s  pos ({x['x']},{x['z']})  v {x['v']}  RINFO-Frame {bool(x.get('ri'))}  Aenderung {ch}")
    print('Zonen-/Log:', R['log'][:10])
    print('Seitenfehler:', errs, 'errbox:', eb)

asyncio.run(main())
