import os
CHROME=os.environ.get('CHROME') or None  # Pfad zu Chromium, sonst Playwright-Standard
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'out')+'/'
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=CHROME,args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1280,'height':800})
        errs=[]
        pg.on('pageerror',lambda e: errs.append('PAGEERROR: '+str(e)))
        await pg.goto('http://localhost:8765/game/test.html')
        await pg.wait_for_function("window.__MEENZ!==undefined",timeout=300000)
        await pg.click('#btn-play'); await pg.wait_for_timeout(800)
        E=pg.evaluate
        eb=lambda: E("()=>{const b=document.getElementById('errbox');return b&&!b.hidden?b.textContent.slice(0,700):''}")
        await pg.keyboard.press('KeyM'); await pg.wait_for_timeout(600)
        print(await E("()=>{const M=window.__MEENZ;return [M.ftDestinations().length,M.ftDestinations().map(d=>d.n).slice(0,40).join(', '),M.FT.hits.length]}"))
        await pg.screenshot(path=''+OUT+'ft1.png')
        btn=await pg.query_selector('#ftpanel button[data-ft]')
        await btn.click(); await pg.wait_for_timeout(300)
        await pg.screenshot(path=''+OUT+'ft2.png')
        sel=await E("()=>window.__MEENZ.FT.sel&&window.__MEENZ.FT.sel.n")
        await pg.click('#ftgo'); await pg.wait_for_timeout(1500)
        print('travel',sel,await E("()=>{const M=window.__MEENZ;const h=M.P1.h;return [M.mode,h.x.toFixed(0),h.z.toFixed(0)]}"),await eb())
        sp=await E("()=>window.__MEENZ.ftDestinations().filter(d=>d.special).map(d=>d.n)")
        print('specials',sp)
        for name in ['Dach des Taubenkönigs','Hbf – Bahnsteig Gleis 4 / 5','Rheintreppe 1']:
            r=await E("(n)=>{const M=window.__MEENZ;const d=M.ftDestinations().find(d=>d.n===n);if(!d)return 'missing';M.fastTravel(d);return 'ok'}",name)
            await pg.wait_for_timeout(1500)
            print(name,r,await E("()=>{const h=window.__MEENZ.P1.h;return [h.x.toFixed(0),h.z.toFixed(0),h.y.toFixed(2)]}"),await eb())
        print('\n'.join(errs[:5]) or 'no pageerrors')
        await b.close()
asyncio.run(main())
