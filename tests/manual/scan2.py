import os
CHROME=os.environ.get('CHROME') or None  # Pfad zu Chromium, sonst Playwright-Standard
OUT=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'out')+'/'  # tests/out
import asyncio,time,json
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=CHROME,args=['--no-sandbox'])
        pg=await b.new_page();await pg.add_init_script("window.__NORENDER=true")
        await pg.goto(os.environ.get('MEENZ_URL','http://localhost:8765')+'/game/test.html');t0=time.time()
        while time.time()-t0<150:
            if await pg.evaluate("()=>window.__MEENZ!==undefined"):break
            await asyncio.sleep(0.5)
        r=await pg.evaluate('''()=>{const M=__MEENZ;const res=[];const LEN=640,W=50;
          const roadNear=(x,z)=>false;
          for(let cx=-4600;cx<=-2600;cx+=25)for(let cz=-1900;cz<=100;cz+=25)for(let a=0;a<180;a+=10){const t=a*Math.PI/180,ux=Math.sin(t),uz=Math.cos(t);let bad=0,park=0;
            for(let s=-LEN/2;s<=LEN/2&&bad<3;s+=8)for(let w=-W/2;w<=W/2;w+=8){const x=cx+ux*s-uz*w,z=cz+uz*s+ux*w;const h=M.gridH(x,z);const f=M.mfG(M.idx(x,z));if(h!==0||(f&6))bad++;else if(f&1)park++;}
            if(bad===0)res.push([cx,cz,a,park,Math.round(Math.hypot(cx+3675,cz+840))]);}
          res.sort((p,q)=>p[4]-q[4]);return JSON.stringify(res.slice(0,30))+' n='+res.length;}''')
        print(r);await b.close()
asyncio.run(main())
