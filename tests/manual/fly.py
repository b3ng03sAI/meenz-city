import os
CHROME=os.environ.get('CHROME') or None  # Pfad zu Chromium, sonst Playwright-Standard
OUT=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'out')+'/'  # tests/out
import asyncio,base64
from playwright.async_api import async_playwright
SP=OUT
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=CHROME,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg=await b.new_page(viewport={'width':960,'height':540});errs=[];pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.add_init_script("try{localStorage.setItem('meenz-quality','hoch')}catch(e){};window.__NORENDER=true;")
        await pg.goto(os.environ.get('MEENZ_URL','http://localhost:8765')+'/game/real.html');await pg.wait_for_function("window.__MEENZ!==undefined",timeout=400000)
        E=pg.evaluate
        await E("()=>document.getElementById('btn-play').click()"); await pg.wait_for_timeout(1500)
        await E("()=>{const M=window.__MEENZ;M.gameMin=14*60;M.UFO.next=1e9;M.KART.next=1e9;}")
        print(await E("""()=>{const M=window.__MEENZ;const P=M.P1;const pl=M.FLUG.planes[0];pl.x=M.POI.dom[0]-300;pl.z=M.POI.dom[1]-120;pl.y=110;pl.air=true;pl.speed=50;pl.pitch=0.05;pl.roll=-0.25;pl.alt=110;pl.h=Math.atan2(300,120);P.h.x=pl.x;P.h.z=pl.z;M.enterCar(P,pl);P.cam.yaw=pl.h+0.5;P.cam.pitch=0.18;P.cam.init=false;
          for(let i=0;i<6;i++)M.update(0.016);const c=P.camera.position;return JSON.stringify({cam:[c.x,c.y,c.z],pl:[pl.x,pl.y,pl.z,pl.pitch,pl.roll,pl.h,pl.speed],g:[pl.g.position.x,pl.g.position.y]});}"""))
        d=await E("()=>window.__MEENZ.snap(3)");open(SP+'fly.jpg','wb').write(base64.b64decode(d.split(',')[1]))
        await E("""()=>{const M=window.__MEENZ;const P=M.P1;M.exitCar(P,true);P.h.x=M.POI.markt[0]+3;P.h.z=M.POI.markt[1]+3;P.h.y=0;M.ufoStart(true);M.UFO.x=P.h.x+20;M.UFO.z=P.h.z+70;M.UFO.y=40;M.UFO.phase='schweben';P.cam.yaw=0.3;P.cam.pitch=0.7;P.cam.zoom=1.5;P.cam.init=false;}""")
        d=await E("()=>window.__MEENZ.snap(3)");open(SP+'ufo2.jpg','wb').write(base64.b64decode(d.split(',')[1]))
        print(errs[:3]);await b.close()
asyncio.run(main())
