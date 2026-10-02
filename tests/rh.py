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
        await E("()=>{const h=window.__MEENZ.P1.h;h.x=200;h.z=-150;h.y=0}")
        await pg.wait_for_timeout(2500)
        print(await E("()=>{const R=window.__MEENZ.RHEIN;return [R.built,R.bank.length,R.bank[0],R.bank[R.bank.length-1],(R.stairs||[]).map(s=>[Math.round(s.bx),Math.round(s.bz)]),R.hof.length,R.ducks.length,R.people.length]}"),await eb())
        r=await E("()=>{const M=window.__MEENZ,R=M.RHEIN;const s=R.stairs[0];if(!s)return 'nostairs';const h=M.P1.h;h.x=s.bx+s.lx*14;h.z=s.bz+s.lz*14;h.y=0;h.facing=Math.atan2(-s.lx,-s.lz);M.P1.cam.yaw=h.facing;return [s.lx.toFixed(2),s.lz.toFixed(2)]}")
        print(r)
        await pg.wait_for_timeout(500)
        ys=[]
        await pg.keyboard.down('KeyW')
        for i in range(10):
            await pg.wait_for_timeout(300); ys.append(await E("()=>{const M=window.__MEENZ,h=M.P1.h,s=M.RHEIN.stairs[0];const o=(h.x-s.bx)*s.lx+(h.z-s.bz)*s.lz;return h.y.toFixed(2)+'@'+o.toFixed(1)+'/'+M.stepAt(h.x,h.z)}"))
        await pg.keyboard.up('KeyW')
        print('heights walking',ys[-1])
        print(await E("()=>{const M=window.__MEENZ,h=M.P1.h,s=M.RHEIN.stairs[0];const out=[];for(let o=11.8;o>9;o-=0.2){const x=s.bx+s.lx*o+ (h.x-s.bx-s.lx*((h.x-s.bx)*s.lx+(h.z-s.bz)*s.lz)),z=s.bz+s.lz*o+(h.z-s.bz-s.lz*((h.x-s.bx)*s.lx+(h.z-s.bz)*s.lz));out.push(o.toFixed(1)+':'+M.stepAt(x,z)+':'+M.blockedFn(x,z,0.3)+':'+M.HG[0])}return out}"))
        print(await E("()=>[...document.querySelectorAll('#bubbles .bubble')].map(e=>e.textContent)"),await eb())
        print('\n'.join(errs[:10]) or 'no pageerrors')
        await b.close()
asyncio.run(main())
