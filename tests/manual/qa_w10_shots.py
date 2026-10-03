"""Welle-10-QA: Vorher/Nachher-Screenshots (ohne Asserts).

    MEENZ_URL=http://127.0.0.1:8875 python3 tests/manual/qa_w10_shots.py <prefix> [ultra|niedrig] [mobil]

Ansichten: start (Dom), kastel (747,-1061), wi (-2239,-9205) zu Fuss; far1/far2 Flug aus 400/700 m ueber Mainz.
`mobil` = iPhone-13-Emulation (Handy-Pfad, LOWMEM) statt Desktop 1280x720. Bilder: tests/out/<prefix>_<ansicht>.jpg
Der Spielstand wird mit __MANUAL/update() getaktet, bis FRAMEB/STREAM leer sind (Vorher-Stand hat beides evtl. nicht).
"""
import os, sys, asyncio, base64, time
from playwright.async_api import async_playwright
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'out') + '/'
PREFIX = sys.argv[1] if len(sys.argv) > 1 else 'qa'
Q = sys.argv[2] if len(sys.argv) > 2 else 'ultra'
MOB = len(sys.argv) > 3 and sys.argv[3] == 'mobil'
BASE = os.environ.get('MEENZ_URL', 'http://127.0.0.1:8875').rstrip('/')

SETTLE = """()=>{const M=__MEENZ;const MINI=%d;let i=0;for(;i<900;i++){M.update(0.05);
 const s=M.STREAM&&M.STREAM.pending?M.STREAM.pending():0;const f=M.FRAMEB&&M.FRAMEB.jobs?M.FRAMEB.jobs.size:0;
 if(i>=MINI&&!s&&!f)break;}return i;}""" % int(os.environ.get('SETTLE_MIN', 40))
WALK = """([x,z,yaw,pitch,road])=>{const M=__MEENZ,P=M.P1;if(P.car)M.exitCar(P,true);
 if(road){let bd=1e18;for(const N of M.NODES){if(!N.car)continue;const d=(N.x-x)**2+(N.z-z)**2;if(d<bd){bd=d;P.h.x=N.x;P.h.z=N.z;}}x=P.h.x;z=P.h.z;}P.h.x=x;P.h.z=z;P.h.y=M.groundYFn(x,z,2);
 P.cam.yaw=yaw;P.h.facing=yaw;P.cam.pitch=pitch;P.cam.zoom=road?2.2:1.0;P.cam.init=false;return [P.h.x,P.h.y,P.h.z];}"""
FLY = """([x,z,y,h])=>{const M=__MEENZ,P=M.P1;const pl=M.FLUG.planes[0];if(P.car)M.exitCar(P,true);
 pl.x=x;pl.z=z;pl.y=y;pl.air=true;pl.speed=45;pl.pitch=-0.02;pl.roll=0;pl.alt=y;pl.h=h;P.h.x=x;P.h.z=z;M.enterCar(P,pl);
 P.cam.yaw=h;P.cam.pitch=0.3;P.cam.init=false;return [pl.x,pl.y,pl.z];}"""
INFO = """()=>{const M=__MEENZ;const S=M.STREAM,P=M.P1;return JSON.stringify({q:M.QUALITY,pos:[Math.round(P.h.x),Math.round(P.h.y),Math.round(P.h.z)],
 tiles:S&&S.counts?S.counts():null,gt:M.GROUND.tiles.size,ch:M.CITY.chunks.size,err:(document.getElementById('errbox')||{}).textContent||''})}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
        if MOB:
            dev = p.devices['iPhone 13']
            ctx = await b.new_context(viewport=dev['viewport'], device_scale_factor=2, is_mobile=True, has_touch=True, user_agent=dev['user_agent'])
        else:
            ctx = await b.new_context(viewport={'width': 1280, 'height': 720})
        pg = await ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append('pageerror ' + str(e)[:300]))
        pg.on('console', lambda m: errs.append('console ' + m.text[:300]) if m.type == 'error' and 'font' not in m.text else None)
        await pg.add_init_script("try{localStorage.setItem('meenz-quality','%s')}catch(e){};window.__NORENDER=true;" % Q)
        t0 = time.time()
        await pg.goto(BASE + '/game/real.html')
        await pg.wait_for_function("window.__MEENZ!==undefined&&__MEENZ.mode==='menu'", timeout=400000, polling=500)
        print('load', round(time.time() - t0, 1), 's')
        E = pg.evaluate
        await E("()=>{const M=__MEENZ;M.INTRO.done=true;M.startGame();window.__MANUAL=true;M.gameMin=14*60;M.UFO.next=1e9;M.KART.next=1e9;M.setWanted(0);}")
        views = [('start', 'walk', [0, 12, 0, 0.15]), ('kastel', 'walk', [747, -1061, 1.6, 0.25, 1]), ('wi', 'walk', [-2239, -9205, 0.5, 0.15]),
                 ('far1', 'fly', [-300, 700, 400, 0.3]), ('far2', 'fly', [900, -1500, 650, -2.4])]
        # Start zuerst ohne Teleport (Spawn-Punkt)
        for name, kind, a in views:
            if name == 'start':
                await E("()=>{const M=__MEENZ;M.P1.cam.init=false;}")
            elif kind == 'walk':
                await E(WALK, a)
            else:   # erst am Boden unter dem Flugpunkt einschwingen (das Flugzeug soll waehrend SETTLE nicht fliegen), dann hoch
                await E(WALK, [a[0], a[1], a[3], 0.1])
            n = await E(SETTLE)
            if kind == 'fly':
                print('fly', await E(FLY, a))
            d = await E("()=>__MEENZ.snap(3)")
            open(OUT + f'{PREFIX}_{name}.jpg', 'wb').write(base64.b64decode(d.split(',')[1]))
            print(name, 'settle', n, await E(INFO))
        print('errs', errs[:5])
        await b.close()
asyncio.run(main())
