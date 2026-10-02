# Fahrphysik: Spielerfahrzeuge sprechen schnell an (Lenkung, Gas, Bremse), bleiben in Kurven stabil, driften nur mit
# Handbremse; Touch-Joystick mit Totzone/Kurve, Tastatur-Lenkung rampt schnell; KI-Autos fahren unverändert.
# Gemessen wird isoliert auf dem freien Gelände am Großen Sand: Fahrzeug mit ctrl 'player' anlegen, c.inp setzen,
# c.physics(1/60) aufrufen (ohne Weltschleife → kein Verkehr, deterministisch).
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

MEASURE = r"""([id,ctrl,on])=>{__MEENZ.FP.on=on;const M=__MEENZ;const dt=1/60;const KMH=50/3.6;M.WEATHER.wet=0;
  const mk=(x,z,h,v=0)=>{const c=new M.Car(id,x,z,h,{ctrl});c.vx=Math.sin(h)*v;c.vz=Math.cos(h)*v;c.speed=v;return c;};
  const st=(c,o)=>{c.inp={throttle:0,brake:0,steer:0,hand:false,...o};c.physics(dt);};
  const beta=c=>{const sp=Math.hypot(c.vx,c.vz);if(sp<1)return 0;const fx=Math.sin(c.h),fz=Math.cos(c.h);return Math.acos(Math.max(-1,Math.min(1,(c.vx*fx+c.vz*fz)/sp)))*180/Math.PI;};
  const R={};let c=mk(-3820,-100,Math.PI/2);const V=Math.min(KMH,c.T.max*0.85);c.remove();
  // 0→50 km/h
  c=mk(-3820,-100,Math.PI/2);let t=0;while(c.speed<V&&t<20){st(c,{throttle:1});t+=dt;}R.acc50=t;c.remove();
  // Höchstgeschwindigkeit (25 s Vollgas)
  c=mk(-3820,-100,Math.PI/2);for(t=0;t<25;t+=dt){st(c,{throttle:1});if(c.x>-3350){c.x=-3820;}}R.vmax=c.speed*3.6;c.remove();
  // Bremsweg 50→0
  c=mk(-3820,-100,Math.PI/2,V);let x0=c.x;t=0;while(c.speed>0.3&&t<10){st(c,{brake:1});t+=dt;}R.brake=c.x-x0;R.brakeT=t;c.remove();
  // Lenkansprechen (bei 30 km/h): Zeit bis 90 % Volleinschlag, Rückstellung auf <10 %
  c=mk(-3820,-100,Math.PI/2,30/3.6);t=0;while(c.steer<0.9&&t<3){st(c,{steer:1,throttle:0.3});t+=dt;}R.steer90=t;
  t=0;while(c.steer>0.1&&t<3){st(c,{throttle:0.3});t+=dt;}R.center=t;c.remove();
  // Gierrate folgt: Sprung auf halben Einschlag bei 50 km/h, Zeit bis 90 % der Gierrate nach 1.5 s
  c=mk(-3400,-60,Math.PI/2,V);const yr=[];for(t=0;t<1.5;t+=dt){st(c,{steer:0.5,throttle:0.4});yr.push(Math.abs(c.yawRate));}
  const yEnd=yr[yr.length-1];R.yaw90=yr.findIndex(y=>y>=0.9*yEnd)*dt;R.yawSS=yEnd*180/Math.PI;c.remove();
  // Wendekreis bei Schrittgeschwindigkeit (~5 km/h), voller Einschlag
  c=mk(-3400,-50,Math.PI/2);let xs=[],zs=[];for(t=0;t<12;t+=dt){const e=1.4-c.speed;st(c,{steer:1,throttle:e>0?Math.min(1,e*2):0,brake:e<-0.2?Math.min(1,-e):0});if(t>4){xs.push(c.x);zs.push(c.z);}}
  {const mx=xs.reduce((a,b)=>a+b)/xs.length,mz=zs.reduce((a,b)=>a+b)/zs.length;R.circle=2*xs.reduce((a,x,i)=>a+Math.hypot(x-mx,zs[i]-mz),0)/xs.length;}c.remove();
  // 50-km/h-Kurve mit vollem Einschlag ohne Handbremse: kein Dreher, Querbeschleunigung
  c=mk(-3400,-50,Math.PI/2,V);let bmax=0,ay=0,n=0;for(t=0;t<3;t+=dt){st(c,{steer:1,throttle:0.5});bmax=Math.max(bmax,beta(c));if(t>1.5){ay+=Math.abs(c.yawRate*Math.hypot(c.vx,c.vz));n++;}}
  R.cornerBeta=bmax;R.cornerG=ay/n/9.81;R.cornerV=Math.hypot(c.vx,c.vz)*3.6;c.remove();
  // gegenlenken: nach voller Linkskurve voll rechts – Gierrate dreht innerhalb kurzer Zeit das Vorzeichen
  c=mk(-3400,-50,Math.PI/2,V);for(t=0;t<1;t+=dt)st(c,{steer:1,throttle:0.4});const s0=Math.sign(c.yawRate);t=0;while(Math.sign(c.yawRate)===s0&&t<3){st(c,{steer:-1,throttle:0.4});t+=dt;}R.counter=t;c.remove();
  // Drift mit Handbremse: 1 s Einschlag + Handbremse, dann loslassen und geradeaus → fängt sich
  c=mk(-3400,-50,Math.PI/2,V);let dmax=0;for(t=0;t<1;t+=dt){st(c,{steer:1,throttle:0.6,hand:true});dmax=Math.max(dmax,beta(c));}R.drift=dmax;
  t=0;while(beta(c)>8&&t<5){st(c,{throttle:0.3,steer:0});t+=dt;}R.recover=t;c.remove();
  // Rückwärts: 3 s Bremse/zurück aus dem Stand
  c=mk(-3820,-100,Math.PI/2);for(t=0;t<3;t+=dt)st(c,{brake:1});R.rev3=-c.speed*3.6;c.remove();
  __MEENZ.FP.on=true;for(const k in R)R[k]=Math.round(R[k]*100)/100;R.V=Math.round(V*3.6);return R;}"""


async def measure(g, vid, ctrl='player', on=True):
    return await g.js(MEASURE, [vid, ctrl, on])


LEAN = r"""()=>{const M=__MEENZ;const dt=1/60;const c=new M.Car('motorrad',-3400,-50,Math.PI/2,{ctrl:'player'});c.vx=50/3.6;c.vz=0;
  for(let t=0;t<1.5;t+=dt){c.inp={throttle:0.4,brake:0,steer:1,hand:false};c.physics(dt);c.sync(dt);}
  const r={lean:c.lean,rotZ:c.g.rotation.z,yaw:c.yawRate,ay:Math.abs(c.speed*c.yawRate)/9.81};c.remove();return r;}"""

# Fahrer im Spiel auf das freie Gelände setzen (echte Eingabe → vehicleInput → physStep)
ENTER = r"""(id)=>{const M=__MEENZ;if(M.P1.car)M.exitCar(M.P1,true);const c=new M.Car(id,-3820,-100,Math.PI/2,{});c.ai={mode:'parked'};
  M.enterCar(M.P1,c);window._fpC=c;M.WEATHER.wet=0;return M.P1.car===c&&c.ctrl==='player';}"""
CAR = """()=>{const c=_fpC;const sp=Math.hypot(c.vx,c.vz),fx=Math.sin(c.h),fz=Math.cos(c.h);return {steer:c.steer,speed:c.speed*3.6,thr:c.inp.throttle,brk:c.inp.brake,
  inSteer:c.inp.steer,h:c.h,beta:sp>1?Math.acos(Math.min(1,(c.vx*fx+c.vz*fz)/sp))*180/Math.PI:0}}"""
# Joystick per Pointer-Events (wie ein Daumen): Mitte des Pads + Auslenkung in px (Radius 50 px)
STICK = r"""([dx,dy])=>{const p=document.getElementById('tpad');const r=p.getBoundingClientRect();const cx=r.left+r.width/2,cy=r.top+r.height/2;
  const o={bubbles:true,pointerId:7,pointerType:'touch'};if(!window._fpDown){p.dispatchEvent(new PointerEvent('pointerdown',{...o,clientX:cx,clientY:cy}));window._fpDown=1;}
  p.dispatchEvent(new PointerEvent('pointermove',{...o,clientX:cx+dx,clientY:cy+dy}));}"""
STICK_UP = "()=>{const p=document.getElementById('tpad');p.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:7,pointerType:'touch'}));window._fpDown=0;}"


async def test(g):
    await g.start()
    # Verkehr in der Stadt läuft (KI unberührt): 10 s Weltschleife, KI-Autos bewegen sich
    await g.step(5)
    n0 = await g.js("()=>{window._fpP=new Map(__MEENZ.CARS.filter(c=>c.ai.mode==='traffic').map(c=>[c,[c.x,c.z]]));return _fpP.size}")
    await g.step(10)
    moved = await g.js("()=>[..._fpP].filter(([c,p])=>!c.removed&&Math.hypot(c.x-p[0],c.z-p[1])>5).length")
    g.check('KI-Verkehr fährt (≥ 1/3 der Autos > 5 m in 10 s)', n0 >= 3 and moved >= n0 / 3, (n0, moved))

    R0, R = {}, {}
    for vid in ['kleinwagen', 'kompakt', 'sport', 'transporter', 'bus', 'motorrad', 'fahrrad', 'gokart']:
        R0[vid] = await measure(g, vid, on=False); R[vid] = await measure(g, vid)
        print(f'  {vid:12s} vorher  {R0[vid]}\n  {"":12s} nachher {R[vid]}', flush=True)
    a, b = R['kleinwagen'], R['motorrad']

    # Gas: 0→50 ≤ 3.5 s (Kleinwagen) / ≤ 2.5 s (Motorrad) und schneller als vorher
    g.check('Kleinwagen 0→50 ≤ 3.5 s, schneller als vorher', a['acc50'] <= 3.5 and a['acc50'] < R0['kleinwagen']['acc50'], f"{R0['kleinwagen']['acc50']} → {a['acc50']} s")
    g.check('Motorrad 0→50 ≤ 2.5 s, schneller als vorher', b['acc50'] <= 2.5 and b['acc50'] < R0['motorrad']['acc50'], f"{R0['motorrad']['acc50']} → {b['acc50']} s")
    # Bremse: 50→0 ≤ 14 m (≈ 0,7 g plus Ansprechen) und kürzer als vorher
    for v in ['kleinwagen', 'motorrad']:
        g.check(f'{v}: Bremsweg 50→0 ≤ 14 m, kürzer als vorher', R[v]['brake'] <= 14 and R[v]['brake'] < R0[v]['brake'], f"{R0[v]['brake']} → {R[v]['brake']} m")
    # Lenkung: 90 % Einschlag ≤ 0.15 s (vorher ~0.47 s), zurück zur Mitte ≤ 0.1 s, Gierrate folgt ≤ 0.15 s, Gegenlenken ≤ 0.2 s
    for v in ['kleinwagen', 'kompakt', 'sport', 'motorrad', 'fahrrad', 'gokart']:
        g.check(f'{v}: Lenkung 90 % ≤ 0.15 s, Mitte ≤ 0.1 s', R[v]['steer90'] <= 0.15 and R[v]['center'] <= 0.1, f"{R0[v]['steer90']}/{R0[v]['center']} → {R[v]['steer90']}/{R[v]['center']} s")
        g.check(f'{v}: Gierrate 90 % ≤ 0.15 s', R[v]['yaw90'] <= 0.15, f"{R0[v]['yaw90']} → {R[v]['yaw90']} s")
        g.check(f'{v}: Gegenlenken dreht die Gierrate in ≤ 0.2 s', R[v]['counter'] <= 0.2, f"{R0[v]['counter']} → {R[v]['counter']} s")
    # schwere Fahrzeuge: spürbar träger als der Kleinwagen, aber nicht mehr zäh
    for v in ['transporter', 'bus']:
        g.check(f'{v}: Lenkung ≤ 0.2 s, Gierrate ≤ 0.4 s, träger als Kleinwagen', R[v]['steer90'] <= 0.2 and R[v]['yaw90'] <= 0.4 and R[v]['yaw90'] > a['yaw90'], f"{R[v]['steer90']}/{R[v]['yaw90']} s")
    # mehr Lenkautorität bei Tempo: höhere Querbeschleunigung in der vollen 50er-Kurve
    g.check('Kleinwagen: mehr Querbeschleunigung in der Kurve als vorher', a['cornerG'] > R0['kleinwagen']['cornerG'], f"{R0['kleinwagen']['cornerG']} → {a['cornerG']} g")
    for v in R:
        # Rangieren: Wendekreis bei Schritttempo ≤ 11 m (echter Kleinwagen ~10 m)
        g.check(f'{v}: Wendekreis bei Schritttempo ≤ 11 m', R[v]['circle'] <= 11, f"{R[v]['circle']} m")
        # Stabilität: volle Kurve bei 50 km/h (Fahrrad: 85 % vmax) ohne Handbremse → Schwimmwinkel ≤ 12°
        g.check(f'{v}: kein Dreher in der vollen 50er-Kurve', R[v]['cornerBeta'] <= 12, f"β {R0[v]['cornerBeta']} → {R[v]['cornerBeta']}°")
        # Höchsttempo je Typ wie vorher (±8 %) → Balance von Verfolgungen/Rennen bleibt; rückwärts geht
        g.check(f'{v}: Höchsttempo wie vorher, rückwärts geht', abs(R[v]['vmax'] - R0[v]['vmax']) <= 0.08 * R0[v]['vmax'] and R[v]['rev3'] > 5,
                f"{R0[v]['vmax']} → {R[v]['vmax']} km/h, rück {R[v]['rev3']}")
    # Handbremse: Autos driften (β ≥ 25°) und fangen sich in ≤ 1.5 s; Zweiräder/Kart schmieren begrenzt, kein Dreher
    for v in ['kleinwagen', 'kompakt', 'sport']:
        g.check(f'{v}: Handbremse → Drift, fängt sich schnell', R[v]['drift'] >= 25 and R[v]['recover'] <= 1.5, f"β {R[v]['drift']}°, {R0[v]['recover']} → {R[v]['recover']} s")
    for v in ['motorrad', 'fahrrad', 'gokart']:
        g.check(f'{v}: Handbremse schmiert, dreht nicht ein (β ≤ 50°)', 8 <= R[v]['drift'] <= 50 and R[v]['recover'] <= 1.5, f"β {R0[v]['drift']} → {R[v]['drift']}°")
    # Unterschiede je Typ
    g.check('Typen: Motorrad und Sport ziehen stärker als Kleinwagen, Transporter/Bus schwächer',
            b['acc50'] < a['acc50'] and R['sport']['acc50'] < a['acc50'] and R['transporter']['acc50'] > a['acc50'] and R['bus']['acc50'] > R['transporter']['acc50'],
            {v: R[v]['acc50'] for v in R})
    g.check('Fahrrad: leicht, aber langsam (≤ 40 km/h)', R['fahrrad']['vmax'] <= 40, R['fahrrad']['vmax'])
    g.check('Gokart: Beschleunigung/Bremse unverändert (Rennbalance)', R['gokart']['acc50'] == R0['gokart']['acc50'] and R['gokart']['brake'] == R0['gokart']['brake'])

    # KI-Fahrzeuge (ctrl 'none') fahren exakt wie vorher
    ai0 = await measure(g, 'kompakt', 'none', on=False); ai1 = await measure(g, 'kompakt', 'none', on=True)
    g.check('KI-Auto: Fahrphysik unverändert', ai0 == ai1, ai1)

    # Schräglage Motorrad nach Querbeschleunigung
    ln = await g.js(LEAN)
    g.check('Motorrad legt sich in die Kurve (> 0.4 rad, gegen die Lenkrichtung)', ln['lean'] < -0.4 and (ln['rotZ'] is None or abs(ln['rotZ'] - ln['lean']) < 1e-6), ln)

    # --- Tastatur im Spiel: digitale Lenkung rampt schnell, aber nicht schlagartig ---
    g.check('Spieler sitzt im Kleinwagen', await g.js(ENTER, 'kleinwagen'))
    await g.step(0.3)
    await g.page.keyboard.down('KeyW'); await g.step(1.5)
    await g.page.keyboard.down('KeyA'); await g.step(1 / 60); s1 = (await g.js(CAR))['steer']
    await g.step(5 / 60); s6 = (await g.js(CAR))['steer']
    await g.page.keyboard.up('KeyA'); await g.step(6 / 60); s0 = (await g.js(CAR))['steer']
    await g.page.keyboard.up('KeyW')
    g.check('Tastatur: erster Frame weich (< 0.3), nach 0.1 s ≥ 0.9, losgelassen nach 0.1 s ≈ 0', 0 < abs(s1) < 0.3 and abs(s6) >= 0.9 and abs(s0) < 0.05,
            (round(s1, 2), round(s6, 2), round(s0, 2)))

    # --- Touch-Joystick: Totzone, Kurve, Tempo-Hilfe, Gas beim Seitwärtslenken ---
    g.check('Spieler sitzt wieder im Kleinwagen', await g.js(ENTER, 'kleinwagen'))
    await g.js("()=>__MEENZ.TOUCHUI.setMode('touch')"); await g.step(0.1)
    await g.js(STICK, [-4, 0]); await g.step(0.2); c = await g.js(CAR)
    g.check('Touch: kleine Daumenbewegung (8 %) = Totzone, kein Lenken/Gas', c['inSteer'] == 0 and c['thr'] == 0, c)
    await g.js(STICK, [-25, 0]); await g.step(0.2); c = await g.js(CAR)
    g.check('Touch: halber Ausschlag lenkt sanft (0.25–0.45)', 0.25 <= c['inSteer'] <= 0.45, c['inSteer'])
    await g.js(STICK, [0, -50]); await g.step(2.5); c = await g.js(CAR)
    g.check('Touch: Stick nach oben = Vollgas, 0→50 in 2.5 s', c['thr'] == 1 and c['speed'] >= 50, c)
    h0 = c['h']; bmax = 0
    await g.js(STICK, [-50, 0])
    for _ in range(12):
        await g.step(0.125); c = await g.js(CAR); bmax = max(bmax, c['beta'])
    g.check('Touch: voll seitlich bei Tempo → Einschlag gedämpft (< 1), etwas Gas bleibt', 0.6 < c['inSteer'] < 1 and c['thr'] >= 0.4, c)
    g.check('Touch: 1.5 s voll links → fährt eine Kurve (> 30° bei ~75 km/h) ohne Dreher (β ≤ 12°)', abs(c['h'] - h0) > 0.52 and bmax <= 12, (round(abs(c['h'] - h0), 2), round(bmax, 1)))
    await g.js(STICK, [0, 40]); await g.step(1.0); c = await g.js(CAR)
    g.check('Touch: Stick nach unten bremst', c['brk'] > 0.5 and c['speed'] < 40, c)
    await g.js(STICK_UP); await g.step(0.2); c = await g.js(CAR)
    g.check('Touch: losgelassen → Lenkung zentriert, kein Gas', abs(c['steer']) < 0.05 and c['thr'] == 0, c)
    g.check('Touch-Mapping lief über vehicleInput', await g.js("()=>__MEENZ.FP.stats.touch>0"))
    await g.js("()=>__MEENZ.TOUCHUI.setMode('keys')")


# setPointerCapture verlangt einen echten aktiven Zeiger – für die synthetischen Joystick-Events stummschalten
run(test, init_extra="Element.prototype.setPointerCapture=function(){};")
