"""Welle 9 QA: JS-Heap (iPhone-13-Emulation, Qualität niedrig) am Start und nach Teleport in neue Stadtteile.

    MEENZ_URL=http://127.0.0.1:8905 .venv/bin/python tests/manual/qa_w9_mem.py

Messung wie mob9.py (gc + performance.memory, __NORENDER). Kein Assert – Zahlen zum Ansehen.
"""
import os, time, asyncio, json
from playwright.async_api import async_playwright

CHROME = os.environ.get('CHROME') or None
BASE = os.environ.get('MEENZ_URL', 'http://localhost:8765').rstrip('/')
M = 'window.__MEENZ'
HEAP = "()=>{window.gc&&gc();return Math.round(performance.memory.usedJSHeapSize/1e6)}"
TP = f"([x,z])=>{{const M={M},P=M.P1;if(P.car)M.exitCar(P,true);P.h.x=x;P.h.z=z;P.h.y=M.groundYFn(x,z);P.vy=0;for(let i=0;i<20;i++)M.update(0.05);}}"


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
                                                                  '--enable-precise-memory-info', '--js-flags=--expose-gc'])
        dev = p.devices['iPhone 13']
        ctx = await b.new_context(viewport=dev['viewport'], device_scale_factor=3, is_mobile=True, has_touch=True, user_agent=dev['user_agent'])
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        pg.on('console', lambda m: errs.append(m.text[:300]) if m.type == 'error' and 'font' not in m.text and 'favicon' not in m.text else None)
        await pg.add_init_script("window.__NORENDER=true")
        await pg.goto(BASE + '/game/real.html')
        t0 = time.time()
        while time.time() - t0 < 200:
            if await pg.evaluate("()=>window.__MEENZ!==undefined&&__MEENZ.mode==='menu'"): break
            await asyncio.sleep(0.5)
        print('quality', await pg.evaluate(f"()=>{M}.QUALITY"), 'load s', round(time.time() - t0, 1))
        print('1 geladen (Menue)      ', await pg.evaluate(HEAP), 'MB')
        await pg.evaluate(f"()=>{M}.startGame()")
        await pg.evaluate(f"()=>{{for(let i=0;i<30;i++){M}.update(0.05)}}")
        print('2 Start + 1.5 s        ', await pg.evaluate(HEAP), 'MB  built:', await pg.evaluate(f"()=>{M}.LAZY.zones.filter(z=>z.built).map(z=>z.name)"))
        spots = [('Kastel (AKK kastel)', 747, -1061), ('Schlossplatz (Wiesbaden)', -2239, -9205)]
        for name, x, z in spots:
            await pg.evaluate(TP, [x, z])
            built = await pg.evaluate(f"()=>{M}.LAZY.zones.filter(z=>z.built).map(z=>z.name)")
            print(f'3 {name:26s}', await pg.evaluate(HEAP), 'MB  built:', built)
            await pg.evaluate(TP, [x + 5, z + 5])
            print(f'  (nach 20 weiteren Schritten) ', await pg.evaluate(HEAP), 'MB')
        await pg.evaluate(TP, [0, 0])
        built = await pg.evaluate(f"()=>{M}.LAZY.zones.filter(z=>z.built).map(z=>z.name)")
        print('4 zurueck am Dom         ', await pg.evaluate(HEAP), 'MB  built:', built)
        print('errors:', errs, 'errbox:', await pg.evaluate("()=>(document.getElementById('errbox')||{}).textContent||''"))
        await b.close()

asyncio.run(main())
