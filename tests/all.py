import os
CHROME=os.environ.get('CHROME') or None  # Pfad zu Chromium, sonst Playwright-Standard
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'out')+'/'
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=CHROME,args=['--no-sandbox'])
        pg=await b.new_page(viewport={'width':1280,'height':800})
        errs=[];cons=[]
        pg.on('pageerror',lambda e: errs.append('PAGEERROR: '+str(e)))
        pg.on('console',lambda m: cons.append(m.text) if m.type=='error' else None)
        await pg.goto('http://localhost:8765/game/test.html')
        await pg.wait_for_function("window.__MEENZ!==undefined",timeout=300000)
        await pg.click('#btn-play'); await pg.wait_for_timeout(800)
        E=pg.evaluate
        eb=lambda: E("()=>{const b=document.getElementById('errbox');return b&&!b.hidden?b.textContent.slice(0,400):''}")
        # dogs visit + buzz
        await E("()=>{const D=window.__MEENZ.DOGS;D[0].nextT=0;}"); await pg.wait_for_timeout(700)
        await E("()=>{const D=window.__MEENZ.DOGS;D[0].buzz={t:5,said:false,side:1};}"); await pg.wait_for_timeout(3000)
        print('dogs',await eb())
        # markt + brezel + drink
        await E("()=>{const M=window.__MEENZ,B=M.BREZEL;const h=M.P1.h;h.x=B.x+1.2;h.z=B.z;}"); await pg.wait_for_timeout(600)
        await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(6000)
        await E("()=>{const M=window.__MEENZ;const g=M.MARKT.people.find(h=>h.mk&&h.mk.role==='guest'&&h.state==='markt'&&!h.mk.arrive);if(g){M.P1.h.x=g.x+1;M.P1.h.z=g.z;}}"); await pg.wait_for_timeout(300)
        await pg.keyboard.press('KeyG'); await pg.wait_for_timeout(2000)
        print('markt/drink',await E("()=>window.__MEENZ.P1.drunk.toFixed(2)"),await eb())
        # trip
        await E("()=>{const M=window.__MEENZ;M.P1.trip={t:20,dur:110}}"); await pg.wait_for_timeout(3000)
        print('trip',await E("()=>[window.__MEENZ.TRIP.shapes.length,window.__MEENZ.TRIP.scaled.size]"),await eb())
        # roofs
        r=await E("()=>{const M=window.__MEENZ;const sc=[...M.ROOF.active.values()].find(s=>s&&s.people.length);if(!sc)return 'none';const h=M.P1.h;h.x=sc.b.x+3;h.z=sc.b.z+3;h.y=sc.v+0.1;return sc.key}")
        await pg.wait_for_timeout(3000); print('roof',r,await eb())
        # jetpack
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(100); await pg.keyboard.down('Space'); await pg.wait_for_timeout(1500); await pg.keyboard.up('Space'); await pg.wait_for_timeout(2500)
        print('jet',await eb())
        # car + engine
        await E("()=>{const M=window.__MEENZ;const c=M.CARS.find(c=>c.ai.mode==='parked'&&!c.T.boat);M.P1.h.x=c.x-2;M.P1.h.z=c.z;M.P1.h.y=0;M.tryEnterExit(M.P1);}")
        await pg.keyboard.down('KeyW'); await pg.wait_for_timeout(3000); await pg.keyboard.up('KeyW')
        print('car',await E("()=>{const E=window.__MEENZ.ENGINES[0];return E?[E.key,Math.round(E.rpm)]:null}"),await eb())
        # map + keys
        await pg.keyboard.press('KeyM'); await pg.wait_for_timeout(400); await pg.keyboard.press('KeyM'); await pg.keyboard.press('KeyK'); await pg.wait_for_timeout(300)
        print('ui',await eb())
        print('\n'.join(errs[:10]) or 'no pageerrors'); print('console:',cons[:5])
        await b.close()
asyncio.run(main())
