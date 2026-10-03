import os
CHROME=os.environ.get('CHROME') or None  # Pfad zu Chromium, sonst Playwright-Standard
OUT=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'out')+'/'  # tests/out
import asyncio,time,sys,json,collections
from playwright.async_api import async_playwright
MOB=sys.argv[1]=='m'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=CHROME,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-precise-memory-info','--js-flags=--expose-gc'])
        dev=p.devices['iPhone 13']
        ctx=await (b.new_context(viewport=dev['viewport'],device_scale_factor=3,is_mobile=True,has_touch=True,user_agent=dev['user_agent']) if MOB else b.new_context(viewport={'width':1280,'height':800}))
        pg=await ctx.new_page()
        cdp=await ctx.new_cdp_session(pg)
        await cdp.send('HeapProfiler.enable');await cdp.send('HeapProfiler.startSampling',{'samplingInterval':65536})
        await pg.add_init_script("window.__NORENDER=true")
        await pg.goto(os.environ.get('MEENZ_URL','http://localhost:8765')+'/game/real.html')
        t0=time.time()
        while time.time()-t0<170:
            if await pg.evaluate("()=>window.__MEENZ!==undefined"):break
            await asyncio.sleep(0.5)
        await pg.evaluate("()=>window.gc&&gc()")
        print('load',round(time.time()-t0,1),await pg.evaluate("()=>[Math.round(performance.memory.usedJSHeapSize/1e6),JSON.stringify(window.__GRID),(document.getElementById('errbox')||{}).textContent]"))
        print(await pg.evaluate('''()=>{const M=__MEENZ;const f=M.GROUND.far.material.map.image;let lo=0,hi=0;for(const c of M.CITY.chunks.values()){if(c.low)lo++;if(c.high)hi++;}return JSON.stringify({far:[f.width,f.height],tiles:M.GROUND.tiles.size,ov:[M.OVERVIEW&&M.OVERVIEW.width,M.OVERVIEW&&M.OVERVIEW.height],signs:M.SIGN_ATLASES().length,chunks:M.CITY.chunks.size,lo,hi,WW:M.HG.grid.W,WH:M.HG.grid.H})}'''))
        import base64
        d=await pg.evaluate("()=>__MEENZ.snap(3)");open('mob_snap.jpg','wb').write(base64.b64decode(d.split(',')[1]))
        for k in range(3):
            await pg.evaluate("()=>{__MEENZ.P1.h.x+=60;for(let i=0;i<20;i++)__MEENZ.update(0.05);return __MEENZ.snap(1).length}")
        await pg.evaluate("()=>window.gc&&gc()")
        print('after render',await pg.evaluate("()=>[Math.round(performance.memory.usedJSHeapSize/1e6),(document.getElementById('errbox')||{}).textContent]"),json.dumps(await cdp.send('Runtime.getHeapUsage')))
        print(await pg.evaluate('''()=>{const seen=new Set();let geo=0,n=0,tex=0;const big=[];const M=window.__MEENZ;
 const sc=M.P1.h.g.parent;while(sc.parent)sc=sc.parent;
 sc.traverse(o=>{const g=o.geometry;if(g&&!seen.has(g)){seen.add(g);let b=0;for(const k in g.attributes){const a=g.attributes[k];b+=a.array.byteLength;}if(g.index)b+=g.index.array.byteLength;geo+=b;n++;if(b>3e6)big.push([o.name||o.type,(o.parent&&o.parent.name)||'',Math.round(b/1e6)]);}
  const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];for(const m of ms)for(const k of ['map','normalMap','roughnessMap','aoMap','emissiveMap']){const t=m[k];if(t&&!seen.has(t)){seen.add(t);const im=t.image;if(im)tex+=(im.width||0)*(im.height||0)*4;}}});
 const tl=[];const ts=new Set();sc.traverse(o=>{const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];for(const m of ms)for(const k in m){const t=m[k];if(t&&t.isTexture&&!ts.has(t)){ts.add(t);const im=t.image;tl.push([k,(im&&im.width)+'x'+(im&&im.height),Math.round((im?im.width*im.height*4:0)/1e5)/10,(t.name||'')]);}}});tl.sort((a,b)=>b[2]-a[2]);
 const byTop={};sc.children.forEach(c=>{let b=0;const S2=new Set();c.traverse(o=>{const g=o.geometry;if(g&&!S2.has(g)){S2.add(g);for(const k in g.attributes)b+=g.attributes[k].array.byteLength;if(g.index)b+=g.index.array.byteLength;}});const key=(c.name||c.type)+(c.isMesh&&c.material&&!Array.isArray(c.material)&&c.material.map?'':'');byTop[key]=(byTop[key]||0)+b;});
 const mm=[];sc.children.forEach(c=>{if(!c.isMesh)return;const g=c.geometry;let b=0;for(const k in g.attributes)b+=g.attributes[k].array.byteLength;if(g.index)b+=g.index.array.byteLength;mm.push([Math.round(b/1e5)/10,g.attributes.position.count,Object.keys(g.attributes).join(','),c.material.type||'arr',c.material.map?(c.material.map.image.width+'x'+c.material.map.image.height):'',c.position.x|0,c.position.z|0,c.isInstancedMesh?c.count:0]);});mm.sort((a,b)=>b[0]-a[0]);const bt=Object.entries(byTop).map(([k,v])=>[k,Math.round(v/1e5)/10]).sort((a,b)=>b[1]-a[1]).slice(0,15);
 return JSON.stringify({mm:mm.slice(0,25),nm:mm.length,sumSmall:Math.round(mm.filter(x=>x[0]<1).reduce((a,x)=>a+x[0],0)),ntex:tl.length})+' || '+JSON.stringify({geoMB:Math.round(geo/1e6),n,texMB:Math.round(tex/1e6),big:big.slice(0,15)});}'''))
        prof=(await cdp.send('HeapProfiler.getSamplingProfile'))['profile']
        agg=collections.Counter()
        def walk(n,stack):
            cf=n['callFrame'];name=(cf['functionName'] or '(anon)')+':'+str(cf['lineNumber'])
            s=stack+[name]
            if n['selfSize']:agg[' < '.join(reversed(s[-3:]))]+=n['selfSize']
            for c in n.get('children',[]):walk(c,s)
        walk(prof['head'],[])
        for k,v in agg.most_common(25):print(round(v/1e6,1),k)
        await b.close()
asyncio.run(main())
