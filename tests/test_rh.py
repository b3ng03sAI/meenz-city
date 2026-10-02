# Rheinpromenade: Uferlinie, Rheintreppen, Höfchen, Enten, Leute; Sitzstufen der ersten Rheintreppe hochlaufen
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'


async def test(g):
    await g.start()
    await g.js(f"()=>{{const h={M}.P1.h;h.x=200;h.z=-150;h.y=0}}")
    await g.step(2.5)
    R = await g.js(f"""()=>{{const R={M}.RHEIN;return {{built:R.built,bank:R.bank.length,b0:R.bank[0],b1:R.bank[R.bank.length-1],
        stairs:(R.stairs||[]).map(s=>[s.bx,s.bz]),hof:R.hof.length,ducks:R.ducks.length,people:R.people.length}}}}""")
    g.check('Rheinpromenade gebaut', R['built'])
    g.check('Uferlinie mit > 250 Punkten von z=-760 bis 480', R['bank'] > 250 and R['b0'][1] == -760 and R['b1'][1] == 480,
            [R['bank'], R['b0'], R['b1']])
    g.check('3 Rheintreppen, mind. 110 m auseinander', len(R['stairs']) == 3 and
            all(abs(a[1] - b[1]) >= 110 for i, a in enumerate(R['stairs']) for b in R['stairs'][i + 1:]),
            [[round(x), round(z)] for x, z in R['stairs']])
    g.check('Höfchen-Elemente, Enten und Leute da', R['hof'] > 0 and R['ducks'] > 0 and R['people'] > 0,
            [R['hof'], R['ducks'], R['people']])

    # Stufenprofil der Treppe: von landseitig (o=11,8) zur Mitte (o=9) steigt stepAt in 0,3-m-Stufen auf 1,5
    prof = await g.js(f"""()=>{{const M={M},s=M.RHEIN.stairs[0];const out=[];for(let k=0;k<15;k++){{const o=11.8-k*0.2;
        const x=s.bx+s.lx*o,z=s.bz+s.lz*o;out.push([+o.toFixed(1),M.stepAt(x,z),M.blockedFn(x,z,0.3)]);}}return out}}""")
    hs = [p[1] for p in prof]
    g.check('Stufenprofil steigt monoton von 0,3 auf 1,5', all(h is not None for h in hs) and
            all(b >= a - 1e-9 for a, b in zip(hs, hs[1:])) and abs(hs[0] - 0.3) < 0.01 and abs(hs[-1] - 1.5) < 0.01, prof)
    g.check('aus 0,3 m Höhe: Stufen bis 0,6 begehbar, ab 0,9 blockiert', all(p[2] == (p[1] > 0.75) for p in prof),
            [(p[0], p[2]) for p in prof])

    # Treppe hochlaufen: 14 m landseitig starten, Richtung Rhein laufen
    await g.js(f"""()=>{{const M={M},s=M.RHEIN.stairs[0];const h=M.P1.h;h.x=s.bx+s.lx*14;h.z=s.bz+s.lz*14;h.y=0;
        h.facing=Math.atan2(-s.lx,-s.lz);M.P1.cam.yaw=h.facing;}}""")
    await g.step(0.5)
    POS = f"()=>{{const M={M},h=M.P1.h,s=M.RHEIN.stairs[0];return [h.y,(h.x-s.bx)*s.lx+(h.z-s.bz)*s.lz,M.stepAt(h.x,h.z)]}}"
    samples = []
    await g.page.keyboard.down('KeyW')
    for _ in range(10):
        await g.step(0.3)
        samples.append(await g.js(POS))
    await g.page.keyboard.up('KeyW')
    ymax = max(s[0] for s in samples)
    o = samples[-1][1]
    await g.step(0.5)  # beim Runtergehen fällt der Spieler kurz – erst landen lassen
    y, _, st = await g.js(POS)
    g.check('Spieler steigt die Sitzstufen hoch (max. Höhe ≥ 1,5 m)', ymax >= 1.5, [[round(a, 2), round(b, 1)] for a, b, _ in samples])
    g.check('Spieler kommt über die Stufen bis zur Flussseite (o < 6)', o < 6, round(o, 1))
    g.check('Spieler steht auf der Stufe (Höhe ≈ stepAt)', st is not None and abs(y - st) < 0.15, [round(y, 2), st])

run(test)
