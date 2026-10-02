import os
CHROME=os.environ.get('CHROME') or None  # Pfad zu Chromium, sonst Playwright-Standard
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'out')+'/'
import asyncio,sys,base64
from playwright.async_api import async_playwright
SP=OUT
Q=sys.argv[1] if len(sys.argv)>1 else 'mittel'
PREFIX=sys.argv[2] if len(sys.argv)>2 else 'real'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=CHROME,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'])
        pg=await b.new_page(viewport={'width':960,'height':540})
        errs=[]
        pg.on('pageerror',lambda e: errs.append('PAGEERROR: '+str(e)))
        pg.on('console',lambda m: errs.append(m.type+': '+m.text[:200]) if m.type=='error' else None)
        await pg.add_init_script("try{localStorage.setItem('meenz-quality','"+Q+"')}catch(e){};window.__NORENDER=true;")
        await pg.goto('http://localhost:8765/game/real.html')
        await pg.wait_for_function("window.__MEENZ!==undefined",timeout=400000)
        E=pg.evaluate
        await E("()=>document.getElementById('btn-play').click()"); await pg.wait_for_timeout(1500)
        await E("()=>{const M=window.__MEENZ;M.gameMin=14*60;M.UFO.next=1e9;M.KART.next=1e9;}")
        shots=[('people',"()=>{const M=window.__MEENZ;const P=M.P1;const bx=M.POI.markt[0]+8,bz=M.POI.markt[1]+12;const L=[];for(let i=0;i<200&&L.length<9;i++){const h=M.mkHuman('ped');const want=['m','f','kid','senior','f','m','kid','senior','teen'][L.length];const ok=want==='kid'||want==='senior'||want==='teen'?h.age===want:(h.age==='adult'&&h.sex===want);if(!ok){h.remove();continue;}L.push(h);} L.forEach((h,i)=>{h.x=bx+(i-4)*1.15;h.z=bz;h.y=M.groundYFn(h.x,h.z);h.state='wait';h.mission=true;h.facing=Math.PI;h.sync();});P.h.x=bx+1.5;P.h.z=bz-6.5;P.h.y=0;P.h.facing=0;P.cam.yaw=0;P.cam.pitch=0.02;P.cam.zoom=1.0;P.cam.init=false;P.h.g.visible=false;}"),
               ('cars',"()=>{const M=window.__MEENZ;const P=M.P1;P.h.g.visible=true;const [x0,z0]=M.flugP(-60,M.FLUG.side*55);const types=['kleinwagen','suv','pickup','cabrio','oldtimer','eiswagen','gokart'];types.forEach((t,i)=>{const c=new M.Car(t,x0+(i-3)*4.2,z0,Math.PI,{ctrl:'none'});c.ai={mode:'parked'};c.persist=true;});P.h.x=x0+2;P.h.z=z0-11;P.h.y=0;P.cam.yaw=0;P.h.facing=0;P.cam.pitch=0.12;P.cam.zoom=1.2;P.cam.init=false;}"),
               ('airfield',"()=>{const M=window.__MEENZ;const P=M.P1;const [x,z]=M.flugP(-250,M.FLUG.side*20);P.h.x=x;P.h.z=z;P.h.y=0;P.cam.yaw=Math.atan2(M.POI.flugplatz[0]+60-x,M.POI.flugplatz[1]-z);P.h.facing=P.cam.yaw;P.cam.pitch=0.1;P.cam.zoom=1.6;P.cam.init=false;}"),
               ('flying',"()=>{const M=window.__MEENZ;const P=M.P1;const pl=M.FLUG.planes[0];pl.x=M.POI.dom[0]-300;pl.z=M.POI.dom[1]-120;pl.y=110;pl.air=true;pl.speed=50;pl.pitch=0.05;pl.roll=-0.25;pl.alt=110;pl.h=Math.atan2(300,120);P.h.x=pl.x;P.h.z=pl.z;M.enterCar(P,pl);P.cam.yaw=pl.h+0.5;P.cam.pitch=0.18;P.cam.init=false;}"),
               ('jetski',"()=>{const M=window.__MEENZ;const P=M.P1;if(P.car)M.exitCar(P,true);const j=M.CARS.filter(c=>c.T.jetski)[0];P.h.x=j.x;P.h.z=j.z;M.enterCar(P,j);j.speed=12;P.cam.yaw=j.h+0.7;P.cam.pitch=0.15;P.cam.init=false;}"),
               ('ufo',"()=>{const M=window.__MEENZ;const P=M.P1;if(P.car)M.exitCar(P,true);P.h.x=M.POI.markt[0];P.h.z=M.POI.markt[1]+30;P.h.y=0;M.ufoStart(true);M.UFO.x=P.h.x+10;M.UFO.z=P.h.z+60;M.UFO.y=45;M.UFO.phase='schweben';P.cam.yaw=0.15;P.cam.pitch=-0.35;P.cam.init=false;}"),
               ('kart',"()=>{const M=window.__MEENZ;const P=M.P1;M.UFO.on=false;M.UFO.g.visible=false;M.setWanted(0);for(let i=0;i<10&&!M.KART.offer;i++)M.kartOffer();const c=M.KART.offer.c;P.h.x=c.x;P.h.z=c.z;M.enterCar(P,c);for(let i=0;i<4;i++)M.update(1/60);const K=M.KART.race;K.t=-0.5;P.cam.yaw=c.h+Math.PI*0.85;P.cam.pitch=0.25;P.cam.zoom=1.4;P.cam.init=false;}")]
        for name,js in shots:
            await E(js)
            d=await E("()=>window.__MEENZ.snap(6)")
            open(SP+PREFIX+'_'+name+'.jpg','wb').write(base64.b64decode(d.split(',')[1]))
        print('\n'.join(errs[:6]) or 'no errors')
        await b.close()
asyncio.run(main())
