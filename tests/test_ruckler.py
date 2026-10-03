# Ruckler (Welle 10): Lazy-Zonen in Scheiben über das Bild-Budget, Sprung → sofort gebaut, eigener Zufallsstrom je Zone,
# Bodenkacheln als gr:-Pakete, Vorwärmen, Messhaken. Echtes three.js (UUIDs ziehen dort aus Math.random), Handy (LOWMEM).
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
L = '__MEENZ.LAZY'
ZONE = f"(n)=>{L}.zones.find(z=>z.name===n)"
# Spieler (zu Fuß) in Abstand d östlich vom Zonenzentrum stellen
PUT = f"""([n,d])=>{{const M={M},Z=M.LAZY.zones.find(z=>z.name===n),P=M.P1;if(P.car)M.exitCar(P,true);P.h.room=null;
  P.h.x=Z.x+d;P.h.z=Z.z;P.h.y=M.groundYFn(P.h.x,P.h.z);return true}}"""
STATE = f"""(n)=>{{const M={M},Z=M.LAZY.zones.find(z=>z.name===n);return {{built:Z.built,building:Z.building,group:Z.group!==null,
  inScene:!!(Z.group&&Z.group.parent),job:M.FRAMEB.jobs.has(Z.lzKey),steps:Z.lzSteps,builds:Z.builds,disposes:Z.disposes}}}}"""
# Ein update()-Schritt (wie g.step mit genau einem Bild), Paketzahl dieses Bilds zurück
TICK = f"()=>{{const M={M};M.update(1/60);return M.FRAMEB.timing.jobsLast}}"
# Zähler um das globale Math.random; Zonen-Bauschritte tauschen es aus und dürfen ihn nie erhöhen
COUNT_ON = "()=>{const o=Math.random;window.__rndN=0;window.__rndO=o;Math.random=function(){window.__rndN++;return o();};return true}"
COUNT_OFF = "()=>{Math.random=window.__rndO;return window.__rndN}"
FAR = 3000
# Ort ohne Lazy-Zone im Umkreis (östlich, Feld am Kartenrand)
NOWHERE = f"()=>{{const M={M},P=M.P1;if(P.car)M.exitCar(P,true);P.h.room=null;P.h.x=8000;P.h.z=9000;P.h.y=M.groundYFn(8000,9000);return M.LAZY.zones.every(z=>Math.hypot(z.x-8000,z.z-9000)>600)}}"


async def approach(g, name, ds):
    """Spieler in Schritten < 250 m (kein Sprung) auf die Zone zu; je Abstand ein Bild. Liefert Zustand je Abstand."""
    out = []
    for d in ds:
        await g.js(PUT, [name, d])
        jobs = await g.js(TICK)
        out.append((d, jobs, await g.js(STATE, name)))
    return out


async def test(g):
    await g.start()
    info = await g.js(f"()=>{{const M={M};return {{rIn:M.LAZY.rIn,rPre:M.LAZY.rPre,rOut:M.LAZY.rOut,n:M.LAZY.zones.length,manual:M.FRAMEB.manualJobs,lowmem:M.FRAMEB.ms}}}}")
    g.check('Radien: Vorbau 450 m, sicher gebaut 350 m, frei 500 m', info['rPre'] == 450 and info['rIn'] == 350 and info['rOut'] == 500, info)
    g.check('Handy-Budget 4 ms je Bild', info['lowmem'] == 4, info['lowmem'])

    # 1. Am Standard-Start: keine Zone liegt < 450 m → keine baut, keine Gruppe (Zonen-Tests (a) bleiben gültig)
    await g.step(0.5)
    st = await g.js(f"""()=>{{const M={M},P=M.P1;return M.LAZY.zones.map(z=>({{n:z.name,d:Math.round(Math.hypot(z.x-P.h.x,z.z-P.h.z)),g:z.group!==null,b:z.building||z.built}}))}}""")
    near = [z for z in st if z['d'] < info['rPre']]
    g.check('keine Lazy-Zone näher als 450 m am Start', not near, near or min(z['d'] for z in st))
    g.check('am Start: alle Zonen ohne Gruppe und nicht im Bau', all(not z['g'] and not z['b'] for z in st), [z['n'] for z in st if z['g'] or z['b']])

    # 2. Annäherung an einen Generator-Bau (Lennebergwald): ab < 450 m im Bau, in Scheiben, Gruppe erst fertig in der Szene
    W = 'gonswald'
    seq = await approach(g, W, [520, 470, 445, 440, 435, 430, 425, 420, 415, 410, 405, 400, 395, 390, 385, 380, 375, 370, 365, 360])
    s470 = seq[1][2]; s445 = seq[2][2]
    g.check('470 m: Wald noch nicht angefangen', not s470['building'] and not s470['built'] and not s470['group'], s470)
    g.check('445 m: Wald im Bau (Paket lz:gonswald)', s445['building'] or s445['built'], s445)
    g.check('höchstens FRAMEB.manualJobs Pakete je Bild', all(j <= info['manual'] for _, j, _ in seq), [j for _, j, _ in seq])
    mid = [s for _, _, s in seq if s['building']]
    g.check('im Bau: Gruppe nicht in der Szene, built=false', mid and all(not s['inScene'] and not s['built'] for s in mid), mid[:2])
    fin = seq[-1][2]
    g.check('Wald nach einigen Bildern fertig, in mehreren Schritten', fin['built'] and fin['inScene'] and fin['steps'] > 3 and not fin['job'], fin)
    stats = await g.js(f"()=>{{const s={L}.stats;return {{maxStepMs:Math.round(s.maxStepMs*10)/10,zone:s.maxStepZone,steps:s.steps}}}}")
    print('  info Lazy-Schritte:', stats)

    # 3. Kein globales Math.random beim Bau – Schritt für Schritt (Generator) und synchron (normale Funktion, UUIDs)
    await g.js(PUT, [W, FAR]); await g.js(TICK); await g.js(TICK)
    gone = await g.js(STATE, W)
    await g.js(NOWHERE); await g.js(TICK)
    g.check('Wald > 500 m: freigegeben', not gone['built'] and not gone['group'] and gone['disposes'] >= 1, gone)
    rn = {}
    for n in ('gonswald', 'weis_sued', 'bretz_campus', 'momb_hafen', 'akk_kastel', 'wiesi_wilhelm'):
        await g.js(COUNT_ON)
        r = await g.js(f"""(n)=>{{const M={M},Z=M.LAZY.zones.find(z=>z.name===n);M.LAZY.api.start(Z);let k=0;while(!Z.built&&k<500){{M.LAZY.api.step(Z);k++;}}
          const u=Z.group?Z.group.uuid:'';M.LAZY.api.dispose(Z);M.FRAMEB.jobs.delete(Z.lzKey);return {{k,built:Z.builds,uuid:u}}}}""", n)
        rn[n] = (await g.js(COUNT_OFF), r)
    g.check('Bauschritte ziehen 0× aus dem globalen Math.random', all(c == 0 for c, _ in rn.values()), {k: v[0] for k, v in rn.items()})
    g.check('Generator-Zonen bauen in mehreren Schritten', rn['gonswald'][1]['k'] > 3 and rn['weis_sued'][1]['k'] > 3, {k: v[1]['k'] for k, v in rn.items()})
    await g.js(COUNT_ON)
    await g.js(f"(n)=>{L}.api.build({L}.zones.find(z=>z.name===n))", 'bretz_campus')
    c_sync = await g.js(COUNT_OFF)
    u2 = await g.js(f"(n)=>{{const Z={L}.zones.find(z=>z.name===n);const u=Z.group.uuid;{L}.api.dispose(Z);return u}}", 'bretz_campus')
    g.check('synchroner Bau (lazyBuild) ebenfalls 0× globales Math.random', c_sync == 0, c_sync)
    g.check('Zonen-Strom je Bau neu geseedet: gleiche Gruppen-UUID bei jedem Bau', u2 == rn['bretz_campus'][1]['uuid'] and len(u2) == 36, [u2, rn['bretz_campus'][1]['uuid']])

    # 4. Unter rIn ist die Zone im selben Bild fertig, auch wenn sie noch nicht angefangen war
    for d in (600, 460, 340):
        await g.js(PUT, ['weis_sued', d]); await g.js(TICK)
    s = await g.js(STATE, 'weis_sued')
    g.check('Weisenau-Süd: 600 → 460 → 340 m (kein Sprung) → bei 340 m im selben Bild gebaut', s['built'] and s['inScene'] and not s['job'], s)
    # angefangen bei 440 m, dann < 350 m: Rest synchron
    await g.js(PUT, ['weis_sued', FAR]); await g.js(TICK)
    await g.js(PUT, ['weis_syn', 440]); await g.js(TICK)
    a = await g.js(STATE, 'weis_syn')
    await g.js(PUT, ['weis_syn', 300]); await g.js(TICK)
    b = await g.js(STATE, 'weis_syn')
    g.check('Weisenau-Synagoge: bei 440 m angefangen, bei 300 m Rest synchron fertig', a['building'] and not a['built'] and b['built'] and b['inScene'] and not b['job'], [a, b])

    # 5. Teleport (Sprung) in ferne Zonen: sofort gebaut, keine kalten Raster-Kacheln beim Bau
    for n in ('gons', 'weis_syn', 'wiesi_schloss'):
        await g.js(PUT, [n, 20])
        await g.js(TICK)
        s = await g.js(STATE, n)
        g.check(f'Teleport nach {n}: im ersten Bild gebaut', s['built'] and s['inScene'], s)
    cold = await g.js(f"()=>{M}.HGC.zoneBuildsCold")
    g.check('HGC.zoneBuildsCold === 0', cold == 0, cold)

    # 6. Im Bau weggefahren: Bau läuft zu Ende, danach normal freigegeben, keine Reste
    await g.js(NOWHERE); await g.js(TICK)
    await g.js(PUT, ['weis_sued', 440]); await g.js(TICK)
    s0 = await g.js(STATE, 'weis_sued')
    await g.js(PUT, ['weis_sued', 600]); await g.js(TICK)
    for _ in range(20): await g.js(TICK)
    s = await g.js(STATE, 'weis_sued')
    g.check('Weisenau-Süd bei 440 m im Bau (Generator, ein Schritt je Bild)', s0['building'] and not s0['built'], s0)
    g.check('im Bau abgewandt: am Ende freigegeben (keine Gruppe, kein Paket)', not s['built'] and not s['group'] and not s['job'] and not s['building'], s)

    # 7. Bodenkacheln: beim Gehen (keine Sprünge) als gr:-Pakete, in Scheiben, nur fertige Kacheln in der Szene
    await g.js(f"()=>{{const M={M},P=M.P1;P.h.x=-150;P.h.z=-30;P.h.y=M.groundYFn(-150,-30);}}")
    for _ in range(30): await g.js(TICK)
    g0 = await g.js(f"()=>({{...{M}.GROUND.stats,tiles:{M}.GROUND.tiles.size}})")
    maxjobs = 0
    for i in range(1, 21):   # 20 × 120 m nach Westen, je 12 Bilder
        await g.js(f"(x)=>{{const M={M},P=M.P1;P.h.x=x;P.h.z=-30;P.h.y=M.groundYFn(x,-30);}}", -150 - 120 * i)
        for _ in range(12): maxjobs = max(maxjobs, await g.js(TICK))
    for _ in range(80): await g.js(TICK)
    g1 = await g.js(f"""()=>{{const M={M},G=M.GROUND,TZ=G.TZ,P=M.P1;let miss=0,far=0;
        const pend=[...M.FRAMEB.jobs.keys()].filter(k=>k.startsWith('gr:')).length;
        for(const [k,m] of G.tiles){{const d=Math.max(0,Math.hypot(m.position.x-P.h.x,m.position.z-P.h.z)-TZ*0.7);if(d>G.R+350)far++;if(!m.parent)miss++;}}
        return {{...G.stats,tiles:G.tiles.size,pend,far,notInScene:miss}}}}""")
    g.check('Bodenkacheln beim Gehen über Pakete gebaut (5 Schritte je Kachel)', g1['builds'] > g0['builds'] and g1['steps'] - g0['steps'] >= 5 * (g1['builds'] - g0['builds']), [g0, g1])
    g.check('Bodenkacheln: alte freigegeben, nichts jenseits R+350 m, alle fertigen in der Szene', g1['disposes'] > g0['disposes'] and g1['far'] == 0 and g1['notInScene'] == 0 and g1['pend'] == 0, g1)
    g.check('auch dabei höchstens FRAMEB.manualJobs Pakete je Bild', maxjobs <= info['manual'], maxjobs)

    # 8. Vorwärmen (nur mit echtem Rendern): Programme asynchron kompiliert, Texturen vor dem Einhängen hochgeladen
    await g.js(PUT, ['akk_kastel', FAR]); await g.js(TICK)
    warm = await g.js(f"""async()=>{{const M={M},Z=M.LAZY.zones.find(z=>z.name==='akk_kastel');const R=M.RUCK.prewarm,t0=R.tex,z0=R.zones;window.__NORENDER=false;
        try{{M.LAZY.api.start(Z);let k=0,inScene=[];while(!Z.built&&k<200){{M.LAZY.api.step(Z);inScene.push(!!(Z.group&&Z.group.parent));k++;if(Z.ruckWarm)await new Promise(r=>setTimeout(r,20));}}
          const r={{built:Z.built,steps:k,zones:R.zones-z0,tex:R.tex-t0,timeouts:R.timeouts,earlyScene:inScene.slice(0,-1).some(x=>x)}};M.LAZY.api.dispose(Z);M.FRAMEB.jobs.delete(Z.lzKey);return r;}}
        finally{{window.__NORENDER=true;}}}}""")
    g.check('Vorwärmen: Zone kompiliert + Texturen hochgeladen, erst danach in der Szene', warm['built'] and warm['zones'] == 1 and warm['tex'] >= 1 and warm['timeouts'] == 0 and not warm['earlyScene'], warm)
    pw = await g.js(f"()=>{M}.RUCK.prewarm")
    print('  info Vorwärmen:', pw)

    # 9. Messhaken vorhanden und ohne Fehler (frame/update/render umwickelt)
    hk = await g.js(f"()=>{{const R={M}.RUCK;return {{n:R.hooks.length,has:['update','render','mini','ground','cityLOD','lazy','fbPump'].every(k=>R.hooks.includes(k)),spikes:Array.isArray(R.spikes)}}}}")
    g.check('RUCK-Messhaken um update/render/minimap/boden/chunks/lazy/fbPump', hk['n'] >= 20 and hk['has'] and hk['spikes'], hk)


run(test, real=True, mobile=True)
