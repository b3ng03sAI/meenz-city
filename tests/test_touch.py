# Paket 51: Touch-Steuerung – Moduswechsel, Kontext-Knöpfe je nach Lage, Knöpfe lösen echte Aktionen aus, Touch-Hilfe
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run


async def test(g):
    await g.start()
    M = '__MEENZ'
    vis = lambda ids: g.js(f"()=>Object.fromEntries({ids}.map(id=>{{const b=document.getElementById(id);return [id,!!b&&!b.hidden]}}))")

    g.check('Start im Tastaturmodus (kein Touch-Gerät)', await g.js(f"()=>{M}.TOUCHUI.mode") == 'keys')
    await g.js(f"()=>{M}.TOUCHUI.setMode('touch')"); await g.step(0.1); await g.js(f"()=>{M}.TOUCHUI.refresh()")
    g.check('Touch-Modus: Touch-Oberfläche sichtbar', await g.js("()=>!document.getElementById('touch').hidden"))
    g.check('Touch-Hilfe im Startbildschirm aktiv', await g.js("()=>document.documentElement.classList.contains('touchmode')&&getComputedStyle(document.querySelector('.tkeys')).display!=='none'&&getComputedStyle(document.querySelector('.keys')).display==='none'"))

    v = await vis("['tc-act','tc-radio','tc-horn','tc-down']")
    g.check('zu Fuß: AKTION da, Fahrzeugknöpfe weg', v['tc-act'] and not v['tc-radio'] and not v['tc-horn'] and not v['tc-down'], v)

    # AKTION löst ein echtes E aus (keysP / keydown)
    e = await g.js(f"""()=>{{let got=false;const f=ev=>{{if(ev.code==='KeyE')got=true}};addEventListener('keydown',f);
        document.getElementById('tc-act').dispatchEvent(new PointerEvent('pointerdown',{{bubbles:true}}));removeEventListener('keydown',f);return got}}""")
    g.check('AKTION-Knopf sendet Taste E', e)

    # Auto: RADIO + HUPE, Radio schaltet um
    await g.js(f"""()=>{{const M={M};const c=M.CARS.find(c=>c.ai.mode==='parked'&&!c.T.boat&&!c.T.bike&&!c.T.plane&&!c.T.hubi);M.enterCar(M.P1,c);}}""")
    await g.step(0.1); await g.js(f"()=>{M}.TOUCHUI.refresh()")
    v = await vis("['tc-act','tc-radio','tc-horn','tc-down']")
    g.check('im Auto: RADIO und HUPE da, AKTION weg', v['tc-radio'] and v['tc-horn'] and not v['tc-act'], v)
    st0 = await g.js(f"()=>{M}.RADIO&&{M}.RADIO.station")
    await g.js("()=>document.getElementById('tc-radio').dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}))"); await g.step(0.2)
    st1 = await g.js(f"()=>{M}.RADIO&&{M}.RADIO.station")
    g.check('RADIO-Knopf schaltet den Sender', st1 != st0, f'{st0} → {st1}')
    g.check('Sprungknopf heißt im Auto HANDBR.', await g.js("()=>document.getElementById('tb-jump').textContent") == 'HANDBR.')

    # Hubschrauber: RUNTER (halten) + HOCH
    ok = await g.js(f"""()=>{{const M={M};M.exitCar(M.P1,true);const h=M.HUBI&&M.HUBI.list&&M.HUBI.list[0];if(!h)return false;M.enterCar(M.P1,h);return M.P1.car===h}}""")
    g.check('in den Hubschrauber eingestiegen', ok)
    await g.step(0.1); await g.js(f"()=>{M}.TOUCHUI.refresh()")
    v = await vis("['tc-down','tc-horn']")
    g.check('im Hubschrauber: RUNTER da, HUPE weg', v['tc-down'] and not v['tc-horn'], v)
    g.check('Sprungknopf heißt im Flieger HOCH', await g.js("()=>document.getElementById('tb-jump').textContent") == 'HOCH')
    held = await g.js(f"""()=>{{const b=document.getElementById('tc-down');b.dispatchEvent(new PointerEvent('pointerdown',{{bubbles:true}}));const a={M}.keys.ShiftLeft;
        b.dispatchEvent(new PointerEvent('pointerup',{{bubbles:true}}));return [!!a,!!{M}.keys.ShiftLeft]}}""")
    g.check('RUNTER hält Shift solange gedrückt', held == [True, False], held)

    # echte Tastatur schaltet zurück
    await g.page.keyboard.press('KeyT'); await g.step(0.1)
    g.check('echter Tastendruck → Tastaturmodus, Touch weg', await g.js(f"()=>{M}.TOUCHUI.mode==='keys'&&document.getElementById('touch').hidden"))

run(test)
