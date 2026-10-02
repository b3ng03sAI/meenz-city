import os
CHROME=os.environ.get('CHROME') or None  # Pfad zu Chromium, sonst Playwright-Standard
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'out')+'/'
import asyncio,time,json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=CHROME,args=['--no-sandbox'])
        pg=await b.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)[:300]))
        await pg.add_init_script("window.__NORENDER=true")
        await pg.goto('http://localhost:8765/game/test.html');t0=time.time()
        while time.time()-t0<150:
            if await pg.evaluate("()=>window.__MEENZ!==undefined"):break
            await asyncio.sleep(0.5)
        await pg.evaluate("()=>__MEENZ.startGame&&__MEENZ.startGame()")
        await asyncio.sleep(1)
        ev=lambda js: pg.evaluate(js)
        print('mode',await ev("()=>__MEENZ.mode"))
        print('missions',await ev("()=>__MEENZ.MISSIONS.filter(m=>m.free).map(m=>m.id+':'+m.start.map(v=>Math.round(v)).join(','))"))
        r=await ev("""()=>{const M=__MEENZ,P=M.P1;const log=[];
          const js=M.CARS.filter(c=>c.T.jetski);log.push('jetskis '+js.length);{const w=js[1];let bx=null;for(let r=4;r<60&&!bx;r+=2)for(let a=0;a<6.28;a+=0.3){const x=w.x+Math.cos(a)*r,z=w.z+Math.sin(a)*r;if(!M.swimHere(x,z,0)&&!M.blocked(x,z)){bx=[x,z,a];break;}}if(bx){P.h.x=bx[0];P.h.z=bx[1];P.h.y=0;P.cam.yaw=Math.atan2(-Math.cos(bx[2]),-Math.sin(bx[2]));M.keys.KeyW=true;for(let i=0;i<60*3;i++)M.update(1/60);M.keys.KeyW=false;log.push('walked into water swim='+P.swim+' y='+P.h.y.toFixed(2));M.keys.KeyW=true;M.P1.cam.yaw=Math.atan2(Math.cos(bx[2]),Math.sin(bx[2]));for(let i=0;i<60*6;i++)M.update(1/60);M.keys.KeyW=false;log.push('back out swim='+P.swim+' y='+P.h.y.toFixed(2));}}const j=js[0];P.h.x=j.x;P.h.z=j.z;M.enterCar(P,j);M.keys.KeyW=true;for(let i=0;i<60*6;i++)M.update(1/60);M.keys.KeyW=false;log.push('jetski speed '+Math.round(j.speed*3.6)+' kmh');
          M.keys.KeyF=true;M.update(1/60);M.keys.KeyF=false;for(let i=0;i<60;i++)M.update(1/60);log.push('after exit swim='+P.swim+' y='+P.h.y.toFixed(2)+' car='+!!P.car);
          M.keys.KeyW=true;for(let i=0;i<60*4;i++)M.update(1/60);M.keys.KeyW=false;log.push('swam to '+Math.round(P.h.x)+','+Math.round(P.h.z)+' swim='+P.swim);
          // Waffen-Cheat
          M.CHEAT.codes.MEENZERWAFFE(P);log.push('owned '+Object.keys(P.owned).filter(k=>P.owned[k]).join(','));
          // Raketenwerfer an Land
          const sp=M.freeSpot?M.freeSpot(0,0):[0,0];P.h.x=M.POI.markt[0];P.h.z=M.POI.markt[1];P.h.y=0;P.swim=false;P.weapon='rpg';M.playerFire(P,{fireP:true,aim:true});log.push('rockets '+M.ROCKETS.length);for(let i=0;i<120;i++)M.update(1/60);log.push('rockets after '+M.ROCKETS.length);
          P.weapon='flammen';for(let i=0;i<60;i++){M.playerFire(P,{fire:true});M.update(1/60);}log.push('flame mag '+P.mag.flammen);
          P.weapon='scharf';P.h.aiming=true;M.playerFire(P,{fireP:true,aim:true});log.push('sniper mag '+P.mag.scharf);
          P.weapon='saege';for(let i=0;i<30;i++){M.playerFire(P,{fire:true,fireP:i==0});M.update(1/60);}
          // UFO
          M.ufoStart(true);let ph=[];for(let i=0;i<60*70;i++){M.update(1/60);if(i%600==0)ph.push(M.UFO.phase+'@'+Math.round(M.UFO.y));}log.push('ufo '+ph.join(' ')+' on='+M.UFO.on);
          return log.join('\\n');}""")
        print(r)
        # Kart
        r=await ev("""()=>{const M=__MEENZ,P=M.P1;const log=[];M.setWanted(0);if(M.activeMission)M.activeMission.timer=0.001;M.update(1/60);if(P.car)M.exitCar(P,true);P.h.x=M.POI.markt[0];P.h.z=M.POI.markt[1];P.h.y=0;M.KART.next=0;for(let i=0;i<5&&!M.KART.offer;i++){M.kartOffer();}
          log.push('why '+M.KART.why+' am '+(M.activeMission&&M.activeMission.id)+' w '+M.wanted);log.push('offer '+!!M.KART.offer+' '+(M.KART.offer&&M.KART.offer.where)+' len='+(M.KART.offer&&M.KART.offer.route.len));if(!M.KART.offer)return log.join('\\n');const c=M.KART.offer.c;P.h.x=c.x;P.h.z=c.z;M.enterCar(P,c);M.update(1/60);
          log.push('race '+!!M.KART.race);const K=M.KART.race;for(let i=0;i<60*50;i++){M.update(1/60);}log.push('ai '+K.karts.map(k=>k.lap+':'+Math.round(k.s)).join(' ')+' player '+K.player.lap+':'+Math.round(K.player.s)+' boxes '+K.boxes.length);
          K.player.lap=2;for(let i=0;i<60*6;i++)M.update(1/60);log.push('after finish race='+!!M.KART.race+' money='+M.G.money);return log.join('\\n');}""")
        print(r)
        print('errs',errs[:5])
        await b.close()
asyncio.run(main())
