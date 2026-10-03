"""Welle-10-QA: Rueckkehr-Heap. Start -> Wiesbaden -> zurueck, jeweils bis alle Pakete (FRAMEB/STREAM) leer + 300 Zusatzbilder.
Zeigt, was nach der Rueckkehr mehr im Heap liegt (HGC, Lazy-Zonen, STREAM-Kacheln). MEENZ_URL=... python3 tests/manual/qa_w10_leak.py"""
import os, asyncio, json
from playwright.async_api import async_playwright
BASE = os.environ.get('MEENZ_URL', 'http://127.0.0.1:8875')
STATE = """()=>{const M=__MEENZ;const S=M.STREAM,H=M.HGC;gc&&gc();const o={heap:Math.round(performance.memory.usedJSHeapSize/1e6),
 jobs:M.FRAMEB.jobs.size,zones:M.LAZY.zones.filter(z=>z.built).map(z=>z.name),tiles:S.counts(),cpuGeoMB:Math.round(S.stats.cpuGeoBytes/1e5)/10};
 if(H){const h={};for(const k in H){const v=H[k];if(typeof v==='number')h[k]=v;}o.hgc=h;}
 const b=M.BLDS;if(b){const h={};for(const k in b){const v=b[k];if(typeof v==='number')h[k]=v;}o.blds=h;}
 let c=0;for(const q of M.CITY.chunks.values()){if(q.high)c++;if(q.low)c++;}o.chunkGroups=c;o.gt=M.GROUND.tiles.size;return JSON.stringify(o);}"""
RUN = """([x,z,n])=>{const M=__MEENZ;M.P1.h.x=x;M.P1.h.z=z;for(let i=0;i<n;i++){M.update(0.05);}for(let i=0;i<2000&&(M.FRAMEB.jobs.size||M.STREAM.pending());i++)M.update(0.05);M.snap(1);return M.FRAMEB.jobs.size}"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-precise-memory-info', '--js-flags=--expose-gc'])
        dev = p.devices['iPhone 13']
        ctx = await b.new_context(viewport=dev['viewport'], device_scale_factor=3, is_mobile=True, has_touch=True, user_agent=dev['user_agent'])
        pg = await ctx.new_page()
        await pg.add_init_script("window.__NORENDER=true;")
        await pg.goto(BASE + '/game/real.html')
        await pg.wait_for_function("window.__MEENZ!==undefined", timeout=300000, polling=500)
        E = pg.evaluate
        await E("()=>{const M=__MEENZ;M.INTRO.done=true;M.startGame();window.__MANUAL=true;M.setWanted(0);}")
        await E(RUN, [-150, -30, 300]); print('start      ', await E(STATE))
        await E(RUN, [-2239, -9205, 300]); print('wiesbaden  ', await E(STATE))
        await E(RUN, [-150, -30, 300]); print('zurueck    ', await E(STATE))
        for k in range(10):
            await E(RUN, [-150, -30, 100]); d = json.loads(await E(STATE)); print('zurueck +%d Bilder' % (100 * (k + 1)), 'heap', d['heap'], 'cpuGeoMB', d['cpuGeoMB'], 'chunkGroups', d['chunkGroups'], 'zones', d['zones'])
        await b.close()
asyncio.run(main())
