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
        eb=lambda: E("()=>{const b=document.getElementById('errbox');return b&&!b.hidden?b.textContent.slice(0,600):''}")
        print(await E("()=>{const M=window.__MEENZ;M.venueNear(0,0);return M.VENUES.map(v=>[v.id,v.door&&v.door.map(n=>n.toFixed(1))])}"))
        for vid in ['dom','christus','malakoff']:
            await E(f"()=>{{const M=window.__MEENZ;const v=M.VENUES.find(v=>v.id==='{vid}');const h=M.P1.h;h.x=v.door[0];h.z=v.door[1];h.y=0}}")
            await pg.wait_for_timeout(600)
            await pg.keyboard.press('KeyF'); await pg.wait_for_timeout(1500)
            print(vid,await E("()=>{const M=window.__MEENZ;const h=M.P1.h;return [!!h.room,h.room&&h.room.name,h.room&&h.room.people.length,h.y]}"),await eb())
            await pg.keyboard.down('KeyW'); await pg.wait_for_timeout(2500); await pg.keyboard.up('KeyW')
            print(' walk',await E("()=>{const M=window.__MEENZ;const h=M.P1.h;return [!!h.room,(h.x-(h.room?h.room.ox:0)).toFixed(1),(h.z-(h.room?h.room.oz:0)).toFixed(1)]}"),await E("()=>[...document.querySelectorAll('#bubbles .bubble')].map(e=>e.textContent).slice(0,3)"))
            if vid=='malakoff':
                await E("()=>{const M=window.__MEENZ;const r=M.P1.h.room;const s=r.mshops[0];M.P1.h.x=s.doorX+1;M.P1.h.z=s.doorZ;}")
                await pg.wait_for_timeout(500); await pg.keyboard.press('KeyF'); await pg.wait_for_timeout(800)
                print(' subshop',await E("()=>{const h=window.__MEENZ.P1.h;return [h.room&&h.room.shop&&h.room.shop.name,!!h.parentRoom]}"),await eb())
                await E("()=>{const M=window.__MEENZ;M.exitShop(M.P1)}"); await pg.wait_for_timeout(500)
                print(' back',await E("()=>{const h=window.__MEENZ.P1.h;return [h.room&&h.room.name]}"))
            # exit: teleport to exit zone and walk
            await E("()=>{const M=window.__MEENZ;const r=M.P1.h.room;if(!r||!r.venue)return;const e=r.venue.exits[0];M.P1.h.x=r.ox+e.x;M.P1.h.z=r.oz+e.z;M.P1.h.vx=1;M.P1.h.vz=1;}")
            await pg.keyboard.down('KeyW'); await pg.wait_for_timeout(500); await pg.keyboard.up('KeyW'); await pg.wait_for_timeout(500)
            print(' exit',await E("()=>{const h=window.__MEENZ.P1.h;return [!!h.room,h.x.toFixed(0),h.z.toFixed(0),h.y.toFixed(1)]}"),await eb())
        print('\n'.join(errs[:10]) or 'no pageerrors')
        await b.close()
asyncio.run(main())
