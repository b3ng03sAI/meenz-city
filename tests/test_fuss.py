# Tempo zu Fuß: gehen, rennen, schwimmen (FOOT) und Rennen per Touch-Stick (ganz durchdrücken).
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'


async def speed(g, setup, secs=1.0):
    p0 = await g.js(f"()=>{{const M={M},P=M.P1;{setup};return [P.h.x,P.h.z]}}")
    await g.step(secs)
    p1 = await g.js(f"()=>[{M}.P1.h.x,{M}.P1.h.z]")
    return ((p1[0] - p0[0]) ** 2 + (p1[1] - p0[1]) ** 2) ** 0.5 / secs


async def test(g):
    await g.start()
    f = await g.js(f"()=>{M}.FOOT")
    g.check('Tempo-Tabelle: gehen ≥ 4, rennen ≥ 8.5, schwimmen ≥ 70 %', f['walk'] >= 4 and f['run'] >= 8.5 and f['swim'] >= 0.7, f)
    # freie Fläche: Flugplatz Großer Sand (weit, eben)
    await g.js(f"()=>{{const M={M},P=M.P1,a=M.FLUG.C;P.h.x=a[0];P.h.z=a[1]+60;P.cam.yaw=Math.PI/2}}")
    await g.page.keyboard.down('KeyW'); v_walk = await speed(g, ''); await g.page.keyboard.up('KeyW')
    await g.page.keyboard.down('ShiftLeft'); await g.page.keyboard.down('KeyW'); v_run = await speed(g, '')
    await g.page.keyboard.up('KeyW'); await g.page.keyboard.up('ShiftLeft')
    g.check('Gehen ~4 m/s', 3.6 < v_walk <= f['walk'] + 0.1, f'{v_walk:.2f}')
    g.check('Rennen ~9 m/s', 7.8 < v_run <= f['run'] + 0.1, f'{v_run:.2f}')
    # Touch: Stick ganz durch → rennen, halb → gehen
    tin = await g.js(f"""()=>{{const M={M},P=M.P1,t=M.touch;if(!t)return null;t.active=true;t.mx=0;t.mz=1;const a=M.readInput(P).sprint;t.mz=0.6;const b=M.readInput(P).sprint;t.active=false;t.mz=0;return [a,b]}}""")
    g.check('Touch: Stick ganz durch = rennen, halb = gehen', tin == [True, False], tin)

run(test)
