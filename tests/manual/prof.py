import os
CHROME=os.environ.get('CHROME') or None  # Pfad zu Chromium, sonst Playwright-Standard
OUT=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'out')+'/'  # tests/out
import asyncio,time
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=CHROME,args=['--no-sandbox'])
        pg=await b.new_page()
        await pg.goto('http://localhost:8765/game/test.html')
        t0=time.time();last=None;marks=[]
        while time.time()-t0<200:
            try:
                txt=await pg.evaluate("()=>(document.getElementById('loadtxt')||{}).textContent")
                done=await pg.evaluate("()=>window.__MEENZ!==undefined")
            except Exception as e: txt='?';done=False
            key=(txt or '').split(' ')[0:2]
            if txt!=last and (not last or key!=(last or '').split(' ')[0:2]): marks.append((round(time.time()-t0,1),txt[:50]));last=txt
            if done: marks.append((round(time.time()-t0,1),'DONE'));break
            await asyncio.sleep(0.25)
        for m in marks: print(m)
        print(await pg.evaluate("()=>[Math.round(performance.memory.usedJSHeapSize/1e6),JSON.stringify(Object.fromEntries(Object.entries(window.__T||{}).map(([k,v])=>[k,Math.round(v)])))]"))
        await b.close()
asyncio.run(main())
