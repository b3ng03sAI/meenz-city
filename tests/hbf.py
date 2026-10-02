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
        await E("()=>{const M=window.__MEENZ;M.venueNear(0,0);const v=M.VENUES.find(v=>v.id==='hbf');const h=M.P1.h;h.x=v.door[0];h.z=v.door[1];h.y=0}")
        await pg.wait_for_timeout(1500)
        print('hbf',await E("()=>{const M=window.__MEENZ;return [M.HBF.built,M.HBF.plats.map(p=>[p.n,p.p.length,!!p.stair]),M.HBF.sched.length,M.VENUES.find(v=>v.id==='hbf').door.map(n=>n.toFixed(0))]}"),await eb())
        await pg.keyboard.press('KeyF'); await pg.wait_for_timeout(1500)
        print('inside',await E("()=>{const h=window.__MEENZ.P1.h;return [h.room&&h.room.name,h.room&&h.room.people.length]}"),await eb())
        # go to stair 4/5
        await E("()=>{const M=window.__MEENZ;const r=M.P1.h.room;M.P1.h.x=r.ox+18;M.P1.h.z=r.oz+2.0;M.P1.cam.yaw=0;}")
        await pg.keyboard.down('KeyW'); await pg.wait_for_timeout(1200); await pg.keyboard.up('KeyW'); await pg.wait_for_timeout(500)
        print('platform',await E("()=>{const M=window.__MEENZ;const h=M.P1.h;return [!!h.room,h.x.toFixed(1),h.z.toFixed(1),h.y.toFixed(2),M.stepAt(h.x,h.z)]}"),await eb())
        await pg.keyboard.down('KeyW'); await pg.wait_for_timeout(2000); await pg.keyboard.up('KeyW')
        print('walk on platform',await E("()=>{const M=window.__MEENZ;const h=M.P1.h;return [h.y.toFixed(2),M.stepAt(h.x,h.z)]}"))
        # fast forward trains
        await E("()=>{const M=window.__MEENZ;for(const e of M.HBF.sched)e.t=M.gameMin+19+Math.random()*10;}")
        await pg.wait_for_timeout(22000)
        print('trains',await E("()=>{const M=window.__MEENZ;return M.HBF.trains.map(t=>[t.k,t.ty.k,t.stage,Math.round(t.u),Math.round(t.stopU),t.v.toFixed(1)])}"),await eb())
        await pg.wait_for_timeout(25000)
        print('trains2',await E("()=>{const M=window.__MEENZ;return [M.HBF.trains.map(t=>[t.k,t.stage,Math.round(t.u)]),M.HBF.sched.length]}"),await eb())
        # back down via F at stair
        await E("()=>{const M=window.__MEENZ;const pl=M.HBF.plats.find(p=>p.n==='2/3');const h=M.P1.h;h.x=pl.stair[0];h.z=pl.stair[1];h.y=0.76}")
        await pg.wait_for_timeout(600); await pg.keyboard.press('KeyF'); await pg.wait_for_timeout(800)
        print('down',await E("()=>{const M=window.__MEENZ;const h=M.P1.h;return [h.room&&h.room.name,h.room&&(h.x-h.room.ox).toFixed(1)]}"),await eb())
        print('\n'.join(errs[:10]) or 'no pageerrors')
        await b.close()
asyncio.run(main())
