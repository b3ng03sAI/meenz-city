import os
CHROME=os.environ.get('CHROME') or None  # Pfad zu Chromium, sonst Playwright-Standard
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'out')+'/'
import asyncio,time
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=CHROME,args=['--no-sandbox'])
        pg=await b.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:200]))
        await pg.add_init_script("delete window.DecompressionStream;window.__NORENDER=true")
        await pg.goto('http://localhost:8765/game/test.html');t0=time.time()
        while time.time()-t0<150:
            if await pg.evaluate("()=>window.__MEENZ!==undefined"):break
            await asyncio.sleep(0.5)
        print('loaded',round(time.time()-t0,1),await pg.evaluate("()=>[typeof DecompressionStream,__MEENZ.BUILDINGS.length,(document.getElementById('errbox')||{}).textContent]"),errs)
        await b.close()
asyncio.run(main())
