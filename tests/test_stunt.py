# Stuntsprünge: 20 Rampen, befahrbar, Absprung mit Zeitlupe, Geldbonus nur einmal je Sprung, Bruchlandung zählt nicht,
# Zähler im Pause-Menü, Speicherstand (neu + alt ohne Schlüssel)
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'

# Sportwagen 30 m vor Rampe k aufstellen, einsteigen und mit v m/s Richtung Rampe schicken
LAUNCH = f"""([k,v])=>{{const M={M},P=M.P1,R=M.STUNT.ramps[k];if(P.car)M.exitCar(P,true);
    const c=new M.Car('sport',R.x-R.dx*30,R.z-R.dz*30,R.h,{{ctrl:'none'}});c.ai={{mode:'parked'}};
    P.h.x=c.x-1.5;P.h.z=c.z;M.enterCar(P,c);c.vx=R.dx*v;c.vz=R.dz*v;c.speed=v;c.sync();return P.car===c}}"""
STATE = f"""()=>{{const M={M},c=M.P1.car,A=c&&c.stuntAir;return {{air:!!A,on:!!(c&&c.stuntOn),y:c?c.y:0,ts:M.STUNT.timeScale,
    cine:!!(A&&A.cine),money:M.G.money,count:M.STUNT.count}}}}"""


async def jump(g, k, v, sec=4.0, chunk=1 / 30, hook=None):
    """Fährt über Rampe k; liefert (höchste y, Zeitlupe gesehen, Flug gesehen, Kamerafahrt gesehen)."""
    assert await g.js(LAUNCH, [k, v]), 'Einsteigen fehlgeschlagen'
    top, slow, air, cine = 0.0, False, False, False
    for _ in range(round(sec / chunk)):
        await g.step(chunk)
        s = await g.js(STATE)
        top = max(top, s['y'])
        slow |= s['ts'] < 1
        air |= s['air']
        cine |= s['cine']
        if s['air'] and hook:
            await g.js(hook); hook = None
    return top, slow, air, cine


async def test(g):
    await g.start()
    assert await g.js(f"()=>{M}.mode") == 'play'

    # 1. Rampen
    info = await g.js(f"""()=>{{const S={M}.STUNT;return {{n:S.ramps.length,total:S.TOTAL,ids:new Set(S.ramps.map(R=>R.id)).size,
        count:S.count,done:S.done.length,mesh:!!S.mesh,
        wb:S.ramps.filter(R=>R.z<-3000).length,mz:S.ramps.filter(R=>R.z>-3000).length}}}}""")
    g.check('genau 20 Rampen, TOTAL 20', info['n'] == 20 and info['total'] == 20, info)
    g.check('Rampen-Ids eindeutig', info['ids'] == 20, info['ids'])
    g.check('Mainz und Wiesbaden gemischt (je >= 4)', info['wb'] >= 4 and info['mz'] >= 4, info)
    g.check('Start: 0 gefunden, Rampen-Mesh in der Szene', info['count'] == 0 and info['done'] == 0 and info['mesh'], info)
    names = await g.js(f"()=>{M}.STUNT.ramps.map(R=>R.name).join(' | ')")
    for frag in ('Ufer', 'Zitadelle', 'Brücke', 'Parkplatz'):
        g.check(f'eine Rampe am Ort „{frag}“', frag in names, names[:200])
    incl = await g.js(f"""()=>{{const M={M};return M.STUNT.ramps.map(R=>{{const t=R.len/2,x=R.x+R.dx*t,z=R.z+R.dz*t;
        return [M.stepAt(x,z),M.groundYFn(x,z,0),M.groundYFn(R.x+R.dx*(R.len-0.3),R.z+R.dz*(R.len-0.3),2),M.blockedFn(x,z,M.groundYFn(x,z,0))]}})}}""")
    g.check('Rampenmitte ist Stufe mit Höhe ~ H/2', all(s is not None and 1.0 < s < 1.5 for s, *_ in incl), incl[:3])
    g.check('groundY steigt über die Rampe an (Mitte < Ende ~ H)', all(a < b and b > 2.3 for _, a, b, _ in incl), incl[:3])
    g.check('Rampe auf ihrer Höhe nicht blockiert (befahrbar)', all(not bl for *_, bl in incl), incl[:3])

    # 2. Sprung mit Tempo → Stunt, Geld, Zeitlupe, Kamerafahrt; danach timeScale wieder 1
    m0 = await g.js(f"()=>{M}.G.money")
    top, slow, air, cine = await jump(g, 0, 22)
    last = await g.js(f"()=>{M}.STUNT.last")
    s = await g.js(STATE)
    H = await g.js(f"()=>{M}.STUNT.ramps[0].H")
    g.check('Auto hebt ab (stuntAir) und fliegt höher als die Rampe', air and top > H + 0.5, f'top {top:.2f} m')
    g.check('Zeitlupe während des Sprungs (timeScale < 1)', slow)
    g.check('Kamerafahrt während des Sprungs aktiv', cine)
    g.check('Sprung gezählt, Weite >= MIN_DIST', last and last['counted'] and not last['crashed'] and last['dist'] >= 12, last)
    g.check('Geldbonus gutgeschrieben', s['money'] - m0 == last['paid'] and last['paid'] > 0, f"{m0} → {s['money']}")
    g.check('Zähler 1, Rampen-Id in done', s['count'] == 1 and await g.js(f"()=>{M}.STUNT.done[0]===__MEENZ.STUNT.ramps[0].id"), s)
    g.check('nach der Landung: timeScale wieder 1, Zeitlupe aus, kein Flug', s['ts'] == 1 and not s['air'] and not await g.js(f"()=>{M}.STUNT.slow"), s)
    ui = await g.js("()=>{const e=document.getElementById('stuntcount');return e?e.textContent:''}")
    g.check('Pause-Menü zeigt Stuntsprünge 1/20', '1/20' in ui, ui)

    # 3. gleicher Sprung nochmal → kein Geld
    m1 = await g.js(f"()=>{M}.G.money")
    top, slow, air, cine = await jump(g, 0, 22)
    last = await g.js(f"()=>{M}.STUNT.last")
    g.check('zweiter Sprung: geflogen, aber nicht gezählt', air and last and not last['counted'] and last['paid'] == 0, last)
    g.check('zweiter Sprung: kein Geld, Zähler bleibt 1', await g.js(f"()=>{M}.G.money") == m1 and await g.js(f"()=>{M}.STUNT.count") == 1)
    g.check('zweiter Sprung: timeScale wieder 1', await g.js(f"()=>{M}.STUNT.timeScale") == 1)

    # 4. zu langsam → kein Stunt, keine Zeitlupe
    m2 = await g.js(f"()=>{M}.G.money")
    top, slow, air, cine = await jump(g, 1, 9, sec=7)
    g.check('zu langsam (9 m/s): hebt kurz ab, aber keine Zeitlupe, kein Geld, Zähler 1',
            air and not slow and await g.js(f"()=>{M}.G.money") == m2 and await g.js(f"()=>{M}.STUNT.count") == 1, f'air={air}')

    # 5. Bruchlandung (Treffer im Flug) → zählt nicht, Zeitlupe trotzdem zurück
    top, slow, air, cine = await jump(g, 2, 22, hook=f"()=>{{{M}.P1.car.stuntAir.hit=true}}")
    last = await g.js(f"()=>{M}.STUNT.last")
    g.check('Bruchlandung: nicht gezählt, kein Geld', air and last['crashed'] and not last['counted'] and last['paid'] == 0, last)
    g.check('Bruchlandung: Zähler 1, timeScale 1', await g.js(f"()=>{M}.STUNT.count") == 1 and await g.js(f"()=>{M}.STUNT.timeScale") == 1)

    # 6. anderer Sprung → Zähler 2
    await jump(g, 3, 24)
    g.check('Sprung an zweiter Rampe zählt (2/20)', await g.js(f"()=>{M}.STUNT.count") == 2, await g.js(f"()=>{M}.STUNT.last"))

    # 7. Speicherstand
    snap = await g.js(f"()=>{M}.snapshot().stunts")
    ids = await g.js(f"()=>{M}.STUNT.done.slice()")
    g.check('snapshot enthält stunts (Ids)', snap == ids and len(snap) == 2, snap)
    old = await g.js(f"()=>{{const M={M};const s=JSON.parse(JSON.stringify(M.snapshot()));delete s.stunts;M.applySave(s);return M.STUNT.count}}")
    g.check('alter Speicherstand ohne stunts → 0/20', old == 0, old)
    ui = await g.js("()=>document.getElementById('stuntcount').textContent")
    g.check('Pause-Zähler nach Laden 0/20', '0/20' in ui, ui)
    new = await g.js(f"""()=>{{const M={M};const s=JSON.parse(JSON.stringify(M.snapshot()));s.stunts=[M.STUNT.ramps[5].id,M.STUNT.ramps[5].id,'gibtsnet'];
        M.applySave(s);return M.STUNT.done}}""")
    g.check('Speicherstand mit stunts geladen (Duplikate/unbekannte Ids gefiltert)', len(new) == 1, new)
    await g.js(f"()=>{{const M={M};M.applySave(JSON.parse(JSON.stringify(M.snapshot())))}}")
    g.check('Laden lässt timeScale bei 1', await g.js(f"()=>{M}.STUNT.timeScale") == 1)

    # 8. Laden mitten im Zeitlupen-Sprung → Zeitlupe sofort aus
    await jump(g, 4, 22, sec=4.0, hook=f"()=>{{const M={M};M.STUNT.midAirSnap=M.STUNT.timeScale;M.applySave(JSON.parse(JSON.stringify(M.snapshot())))}}")
    mid = await g.js(f"()=>[{M}.STUNT.midAirSnap,{M}.STUNT.timeScale,{M}.STUNT.slow]")
    g.check('Laden im Sprung: vorher Zeitlupe, danach timeScale 1', mid[0] < 1 and mid[1] == 1 and mid[2] is False, mid)


run(test)
