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
        await E("""()=>{const M=window.__MEENZ;const P=M.P1;const [x,z]=M.flugP(0,M.FLUG.side*40);P.h.x=x;P.h.z=z;P.h.y=0;M.ufoStart(true);M.UFO.x=x+70;M.UFO.z=z+5;M.UFO.y=38;M.UFO.phase='schweben';P.cam.yaw=Math.PI/2+0.1;P.h.facing=P.cam.yaw;P.cam.pitch=-0.3;P.cam.zoom=1;P.cam.init=false;}""")
        d=await E("()=>window.__MEENZ.snap(3)");open(SP+'ufo3.jpg','wb').write(base64.b64decode(d.split(',')[1]))
        await E("""()=>{const M=window.__MEENZ;const P=M.P1;M.UFO.on=false;M.UFO.g.visible=false;const bx=M.POI.markt[0]+8,bz=M.POI.markt[1]+12;const L=[];for(let i=0;i<300&&L.length<6;i++){const h=M.mkHuman('ped');const want=['m','f','kid','senior','teen','f'][L.length];const ok=want==='kid'||want==='senior'||want==='teen'?h.age===want:(h.age==='adult'&&h.sex===want);if(!ok){h.remove();continue;}L.push(h);} L.forEach((h,i)=>{h.x=bx+(i-2.5)*0.95;h.z=bz;h.y=M.groundYFn(h.x,h.z);h.state='wait';h.mission=true;h.facing=Math.PI;h.sync();});P.h.x=bx;P.h.z=bz-3.3;P.h.y=0;P.h.facing=0;P.cam.yaw=0;P.cam.pitch=0.0;P.cam.zoom=0.75;P.cam.init=false;P.h.g.visible=false;}""")
        d=await E("()=>window.__MEENZ.snap(3)");open(SP+'people2.jpg','wb').write(base64.b64decode(d.split(',')[1]))
        print(errs[:3]);await b.close()
asyncio.run(main())
