"""Handy-Speicher messen (ohne Asserts): JS-Heap nach dem Laden, Verursacher je Funktion, Szenengröße.

Aufruf:  python3 tests/manual/mob9.py m              # iPhone-13-Emulation (Qualität ergibt sich daraus: „niedrig“)
         python3 tests/manual/mob9.py d              # Desktop 1280×800 (Ladezeit-Basislinie)
Optionen: --q niedrig|mittel|hoch|ultra   Qualität fest setzen (localStorage meenz-quality)
          --at x,z[;x,z…]                 nach dem Laden dorthin teleportieren (je Ziel Heap + STREAM-Zustand)
          --tour                          Fahrt Start → Brücke → Wiesbaden → zurück (Heap je Etappe, Paket 40.5)
          --top N                         Anzahl Zeilen der Verursacherlisten (Standard 25)
Braucht einen Server (MEENZ_URL, Standard http://localhost:8765). Bild: tests/out/mob_snap.jpg.
"""
import os
CHROME=os.environ.get('CHROME') or None  # Pfad zu Chromium, sonst Playwright-Standard
OUT=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'out')+'/'  # tests/out
import asyncio,time,sys,json,collections,argparse,base64
from playwright.async_api import async_playwright
ap=argparse.ArgumentParser()
ap.add_argument('dev',nargs='?',default='m')
ap.add_argument('--q',default=None)
ap.add_argument('--at',default=None)
ap.add_argument('--tour',action='store_true')
ap.add_argument('--top',type=int,default=25)
A=ap.parse_args()
MOB=A.dev=='m'
# Weltaufbau-Funktionen: Heap-Stichproben werden dem nächsten dieser Aufrufer zugeordnet
PHASES=['decodeBuildings','planOSMBuilding','planBuilding','elevPoly','rasterPoly','rasterOBB','rasterCirc','maskInto','waterToHG',
        'buildGraph','buildRoadSegHash','cityChunks','buildChunkGroup','updateCityLOD','buildRoads','buildGroundMeshes','buildRiver',
        'buildBridge','buildGirderBridges','placeTrees','addTree','placeLamps','buildTrees','buildProps','buildShips','buildShops',
        'buildGround','updateGround','groundTileMesh','buildOverview','buildLandmarks','buildTextures','initMaterials','setupVehicles',
        'managePopulation','setupPost','updateStream','streamBuild','streamDecode','lazyBuild']
async def heap(pg):
    await pg.evaluate("()=>window.gc&&gc()")
    return await pg.evaluate("()=>Math.round(performance.memory.usedJSHeapSize/1e6)")
async def stream_state(pg):
    return await pg.evaluate("()=>{const S=window.__MEENZ.STREAM||{};const o={};for(const k in S){const v=S[k];if(typeof v==='number'||typeof v==='string'||typeof v==='boolean')o[k]=v;else if(Array.isArray(v))o[k]='['+v.length+']';else if(v instanceof Map||v instanceof Set)o[k]='{'+v.size+'}';}return JSON.stringify(o);}")
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=CHROME,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-precise-memory-info','--js-flags=--expose-gc'])
        dev=p.devices['iPhone 13']
        ctx=await (b.new_context(viewport=dev['viewport'],device_scale_factor=3,is_mobile=True,has_touch=True,user_agent=dev['user_agent']) if MOB else b.new_context(viewport={'width':1280,'height':800}))
        pg=await ctx.new_page()
        cdp=await ctx.new_cdp_session(pg)
        await cdp.send('HeapProfiler.enable');await cdp.send('HeapProfiler.startSampling',{'samplingInterval':65536})
        init="window.__NORENDER=true;"
        if A.q:init+="try{localStorage.setItem('meenz-quality','"+A.q+"')}catch(e){};"
        await pg.add_init_script(init)
        t0=time.time()
        await pg.goto(os.environ.get('MEENZ_URL','http://localhost:8765')+'/game/real.html')
        while time.time()-t0<300:
            if await pg.evaluate("()=>window.__MEENZ!==undefined"):break
            await asyncio.sleep(0.5)
        tl=round(time.time()-t0,1)
        await pg.evaluate("()=>window.gc&&gc()")
        print('load',tl,'s',await pg.evaluate("()=>[window.__MEENZ.QUALITY,Math.round(performance.memory.usedJSHeapSize/1e6),JSON.stringify(window.__GRID),(document.getElementById('errbox')||{}).textContent,(document.getElementById('loadtxt')||{}).textContent]"))
        print(await pg.evaluate('''()=>{const M=__MEENZ;const f=M.GROUND.far.material.map.image;let lo=0,hi=0;for(const c of M.CITY.chunks.values()){if(c.low)lo++;if(c.high)hi++;}return JSON.stringify({far:[f.width,f.height],tiles:M.GROUND.tiles.size,ov:[M.OVERVIEW&&M.OVERVIEW.width,M.OVERVIEW&&M.OVERVIEW.height],signs:M.SIGN_ATLASES().length,chunks:M.CITY.chunks.size,lo,hi,WW:M.HG.grid.W,WH:M.HG.grid.H})}'''))
        # Weltdaten-Zähler (was 40.5 regional machen will)
        print('world',await pg.evaluate('''()=>{const M=__MEENZ;const cnt=G=>G.tiles.reduce((n,t)=>n+(t?1:0),0);let pts=0,holes=0;for(const b of M.BUILDINGS){pts+=b.poly.length;for(const h of b.holes)pts+=h.length;holes+=b.holes.length;}
          let rp=0;for(const r of M.ROADS)rp+=r.pts.length;let ap=0;for(const a of M.AREAS)ap+=a.poly.length;
          return JSON.stringify({BUILDINGS:M.BUILDINGS.length,bldPts:pts,bldHoles:holes,ROADS:M.ROADS.length,roadPts:rp,NODES:M.NODES.length,EDGES:M.EDGES.length,AREAS:M.AREAS.length,areaPts:ap,TREES:M.TREES.length,LAMPS:M.LAMPS.length,SHOPS:M.SHOPS.length,HUMANS:M.HUMANS.length,CARS:M.CARS.length,
            hgTiles:cnt(M.HG.grid),hgTilesAll:M.HG.grid.tiles.length,mfTiles:M.MFLAG?cnt(M.MFLAG.grid):null,ELEV:M.ELEV.size,lazyZones:M.LAZY.zones.length});}'''))
        print('stream',await stream_state(pg))
        d=await pg.evaluate("()=>__MEENZ.snap(3)");os.makedirs(OUT,exist_ok=True);open(OUT+'mob_snap.jpg','wb').write(base64.b64decode(d.split(',')[1]))
        for k in range(3):
            await pg.evaluate("()=>{__MEENZ.P1.h.x+=60;for(let i=0;i<20;i++)__MEENZ.update(0.05);return __MEENZ.snap(1).length}")
        await pg.evaluate("()=>window.gc&&gc()")
        print('after render',await pg.evaluate("()=>[Math.round(performance.memory.usedJSHeapSize/1e6),(document.getElementById('errbox')||{}).textContent]"),json.dumps(await cdp.send('Runtime.getHeapUsage')))
        print(await pg.evaluate('''()=>{const seen=new Set();let geo=0,n=0,tex=0;const big=[];const M=window.__MEENZ;
 let sc=M.P1.h.g.parent;while(sc.parent)sc=sc.parent;
 sc.traverse(o=>{const g=o.geometry;if(g&&!seen.has(g)){seen.add(g);let b=0;for(const k in g.attributes){const a=g.attributes[k];b+=a.array.byteLength;}if(g.index)b+=g.index.array.byteLength;geo+=b;n++;if(b>3e6)big.push([o.name||o.type,(o.parent&&o.parent.name)||'',Math.round(b/1e6)]);}
  const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];for(const m of ms)for(const k of ['map','normalMap','roughnessMap','aoMap','emissiveMap']){const t=m[k];if(t&&!seen.has(t)){seen.add(t);const im=t.image;if(im)tex+=(im.width||0)*(im.height||0)*4;}}});
 const tl=[];const ts=new Set();sc.traverse(o=>{const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];for(const m of ms)for(const k in m){const t=m[k];if(t&&t.isTexture&&!ts.has(t)){ts.add(t);const im=t.image;tl.push([k,(im&&im.width)+'x'+(im&&im.height),Math.round((im?im.width*im.height*4:0)/1e5)/10,(t.name||'')]);}}});tl.sort((a,b)=>b[2]-a[2]);
 const mm=[];sc.children.forEach(c=>{if(!c.isMesh)return;const g=c.geometry;let b=0;for(const k in g.attributes)b+=g.attributes[k].array.byteLength;if(g.index)b+=g.index.array.byteLength;mm.push([Math.round(b/1e5)/10,g.attributes.position.count,Object.keys(g.attributes).join(','),c.material.type||'arr',c.material.map?(c.material.map.image.width+'x'+c.material.map.image.height):'',c.position.x|0,c.position.z|0,c.isInstancedMesh?c.count:0]);});mm.sort((a,b)=>b[0]-a[0]);
 return JSON.stringify({mm:mm.slice(0,12),nm:mm.length,sumSmall:Math.round(mm.filter(x=>x[0]<1).reduce((a,x)=>a+x[0],0)),ntex:tl.length})+' || '+JSON.stringify({geoMB:Math.round(geo/1e6),n,texMB:Math.round(tex/1e6),big:big.slice(0,15)});}'''))
        # CPU-Kopien der Geometrie (ArrayBuffer-Speicher, zählt in usedJSHeapSize): wo liegen sie, sichtbar/hochgeladen?
        print('geoCPU',await pg.evaluate('''()=>{const M=__MEENZ;let sc=M.P1.h.g.parent;while(sc.parent)sc=sc.parent;const matName=new Map();for(const k in M.MAT)matName.set(M.MAT[k],k);
 const chunkG=new Set();for(const c of M.CITY.chunks.values()){if(c.low)chunkG.add(c.low);if(c.high)chunkG.add(c.high);}const lazyG=new Set();for(const Z of M.LAZY.zones)if(Z.group)lazyG.add(Z.group);
 const seen=new Set();const by={};const add=(k,b)=>{by[k]=(by[k]||0)+b;};
 sc.traverse(o=>{const g=o.geometry;if(!g||seen.has(g))return;seen.add(g);let b=0;for(const k in g.attributes)b+=g.attributes[k].array.byteLength;if(g.index)b+=g.index.array.byteLength;if(o.isInstancedMesh){b+=o.instanceMatrix.array.byteLength;if(o.instanceColor)b+=o.instanceColor.array.byteLength;}
  let top=o;while(top.parent&&top.parent!==sc)top=top.parent;let vis=true;for(let p=o;p;p=p.parent)if(p.visible===false){vis=false;break;}
  const where=chunkG.has(top)?'stadtkachel':lazyG.has(top)?'lazy':top===o?'szene':'gruppe';const mat=Array.isArray(o.material)?'arr':(matName.get(o.material)||(o.material&&o.material.type)||'?');
  add(where+(o.isInstancedMesh?'/inst':'')+'/'+mat+(vis?'':' (unsichtbar)'),b);});
 return JSON.stringify(Object.entries(by).map(([k,v])=>[k,Math.round(v/1e5)/10]).filter(x=>x[1]>=0.5).sort((a,b)=>b[1]-a[1]).slice(0,30));}'''))
        prof=(await cdp.send('HeapProfiler.getSamplingProfile'))['profile']
        agg=collections.Counter();byPhase=collections.Counter();bySelf=collections.Counter()
        def walk(n,stack):
            cf=n['callFrame'];fn=cf['functionName'] or '(anon)';name=fn+':'+str(cf['lineNumber'])
            s=stack+[(fn,name)]
            if n['selfSize']:
                agg[' < '.join(reversed([x[1] for x in s[-3:]]))]+=n['selfSize']
                bySelf[name]+=n['selfSize']
                ph='(sonst)'
                for f,_ in reversed(s):
                    if f in PHASES:ph=f;break
                if ph=='(sonst)':
                    ph='(sonst) '+name
                byPhase[ph]+=n['selfSize']
            for c in n.get('children',[]):walk(c,s)
        walk(prof['head'],[])
        tot=sum(byPhase.values())
        print('--- lebende Stichproben gesamt',round(tot/1e6),'MB; je Weltaufbau-Phase (nächster bekannter Aufrufer) ---')
        for k,v in byPhase.most_common(A.top):print(round(v/1e6,1),k)
        print('--- je allozierender Funktion ---')
        for k,v in bySelf.most_common(A.top):print(round(v/1e6,1),k)
        print('--- Aufrufketten (3 Ebenen) ---')
        for k,v in agg.most_common(A.top):print(round(v/1e6,1),k)
        # Teleport-Ziele / Tour (Paket 40.5)
        stops=[]
        if A.at:stops+=[tuple(float(v) for v in s.split(',')) for s in A.at.split(';')]
        if A.tour:stops+=[(-150,-30),(300,-500),(593,-808),(-1200,-5000),(-2239,-9205),(-3365,-9232),(-150,-30)]
        for (x,z) in stops:
            t1=time.time()
            await pg.evaluate("([x,z])=>{const M=__MEENZ;M.P1.h.x=x;M.P1.h.z=z;for(let i=0;i<40;i++)M.update(0.05);}",[x,z])
            print('at',(x,z),'step',round(time.time()-t1,1),'s heap',await heap(pg),'MB',await stream_state(pg),(await pg.evaluate("()=>(document.getElementById('errbox')||{}).textContent")) or '')
        await b.close()
asyncio.run(main())
