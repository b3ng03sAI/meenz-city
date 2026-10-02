import os
CHROME=os.environ.get('CHROME') or None  # Pfad zu Chromium, sonst Playwright-Standard
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'out')+'/'
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=CHROME,args=['--no-sandbox'])
        pg=await b.new_page()
        await pg.goto('http://localhost:8765/game/test.html')
        await pg.wait_for_function("window.__MEENZ!==undefined",timeout=300000)
        print(await pg.evaluate("""()=>{const M=window.__MEENZ;const g=M.ROADSx.filter(r=>/Grillparzer/.test(r.name||''));const k=M.ROADSx.filter(r=>/Adenauer-Ring/.test(r.name||''));
          let best=null;for(const a of g)for(const p of a.pts)for(const b of k)for(const q of b.pts){const d=Math.hypot(p[0]-q[0],p[1]-q[1]);if(!best||d<best[0])best=[d,p,q];}
          return JSON.stringify({g:g.length,k:k.length,gn:[...new Set(g.map(r=>r.name))],kn:[...new Set(k.map(r=>r.name))],best,kpts:k.map(r=>r.pts.length)})}"""))
        await b.close()
asyncio.run(main())
