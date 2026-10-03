# Einleitung: Bürgermeisterin beim ersten Spawn eines neuen Spiels – Name, drehende Maus, 3× trinken, 2 Fragen mit
# „Is mir egal.“, höchstens 5 erklärende Sätze, Haltungsregel, Steuerung danach wieder frei. Echtes three.js (Posen).
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'


async def state(g):
    return await g.js(f"""()=>{{const I={M}.INTRO,s=I.script()[I.step]||null,h=I.h;
        return {{active:I.active,step:I.step,kind:s?(s.ask?'ask':s.drink?'drink':'say'):null,text:s&&(s.say||s.ask)||'',drinks:I.drinks,
          line:(document.getElementById('introline')||{{}}).textContent||'',
          arms:h?[h.armR.rotation.x,h.armR.rotation.z,h.armL.rotation.x,h.armL.rotation.z]:null}}}}""")


async def test(g):
    await g.start()
    g.check('Testmodus: keine Einleitung von selbst', await g.js(f"()=>!{M}.INTRO.active"))

    await g.js(f"()=>{{const I={M}.INTRO;I.force=true;I.start()}}")
    await g.step(0.2)
    m = await g.js(f"""()=>{{const I={M}.INTRO,h=I.h;return {{active:I.active,sex:h&&h.sex,name:h&&h.npcName,who:document.querySelector('#talk .who').textContent,
        talk:!document.getElementById('talk').hidden,mouse:!!I.mouse,bottle:!!I.bottle,d:Math.hypot(h.x-{M}.P1.h.x,h.z-{M}.P1.h.z)}}}}""")
    g.check('Einleitung läuft, Bürgermeisterin steht vor dem Spieler', m['active'] and m['talk'] and m['d'] < 4, m)
    g.check('Bürgermeisterin ist eine Frau mit lustigem Namen', m['sex'] == 'f' and 'Spundekäs-Fleischworscht' in m['who'], m['who'])
    g.check('Maus auf dem Kopf und Flasche in der Hand', m['mouse'] and m['bottle'])
    r0 = await g.js(f"()=>{M}.INTRO.mouse.rotation.y"); await g.step(0.5); r1 = await g.js(f"()=>{M}.INTRO.mouse.rotation.y")
    g.check('Maus dreht sich', r1 - r0 > 1.0, f'{r0:.2f} → {r1:.2f}')

    # Schutz: während der Einleitung darf niemand den Spieler verletzen (er ist gesperrt und kann sich nicht wehren)
    hp = await g.js(f"()=>{{const M={M},P=M.P1;P.h.health=100;P.armor=0;M.damagePlayer(P,30);M.knockHuman(P.h,3,0,2,25,false);return P.h.health}}")
    g.check('Einleitung: Schaden und Umfahren prallen ab', hp == 100, hp)
    b = await g.js(f"""()=>{{const M={M},P=M.P1;const o=M.HUMANS.find(h=>h.kind==='ped'&&h.alive&&!h.inCar&&h!==M.INTRO.h);if(!o)return null;
        o.x=P.h.x+0.8;o.z=P.h.z+0.3;o.state='brawl';o.target=P.h;return true}}""")
    await g.step(2)
    b2 = await g.js(f"()=>({{hp:{M}.P1.h.health,brawl:{M}.HUMANS.some(h=>h.state==='brawl'||h.state==='pester')}})")
    g.check('Einleitung: Raufbold lässt den Spieler in Ruhe', b and b2['hp'] == 100 and not b2['brawl'], [b, b2])

    # Bewegung gesperrt
    p0 = await g.js(f"()=>[{M}.P1.h.x,{M}.P1.h.z]")
    await g.page.keyboard.down('KeyW'); await g.step(1); await g.page.keyboard.up('KeyW')
    p1 = await g.js(f"()=>[{M}.P1.h.x,{M}.P1.h.z]")
    g.check('während der Einleitung kann man nicht weglaufen', abs(p1[0] - p0[0]) + abs(p1[1] - p0[1]) < 0.05, [p0, p1])

    asked, after_answer, says, single_right = 0, [], [], []
    choice = 0
    for _ in range(120):
        s = await state(g)
        if not s['active']: break
        a = s['arms']
        if a and a[0] < -1.0 - 1e-6 and not a[2] < -1.0: single_right.append(a)
        if s['kind'] == 'ask':
            asked += 1
            await g.key('Digit1' if choice == 0 else 'Digit2', after=0.05); choice += 1
            s2 = await state(g); after_answer.append(s2['text'])
        elif s['kind'] == 'drink':
            await g.step(0.3)
        else:
            if s['text'] not in says: says.append(s['text'])
            await g.key('Space', after=0.05); await g.key('Space', after=0.05)
    g.check('Einleitung endet', not (await state(g))['active'])
    g.check('genau zwei Fragen', asked == 2, asked)
    g.check('auf jede Antwort (1 und 2): „Is mir egal.“', after_answer == ['Is mir egal.', 'Is mir egal.'], after_answer)
    g.check('dreimal aus der Flasche getrunken', await g.js(f"()=>{M}.INTRO.drinks") == 3)
    expl = [t for t in says if not t.startswith('Ei Gude') and t != 'Is mir egal.' and not t.startswith('So, jetzt mach')]
    g.check('höchstens 5 erklärende Sätze', len(expl) <= 5, len(expl))
    g.check('Haltung: nie der rechte Arm allein gehoben (auch beim Trinken)', not single_right, single_right[:3])
    g.check('Dialogfenster wieder zu', await g.js("()=>document.getElementById('talk').hidden"))

    p0 = await g.js(f"()=>[{M}.P1.h.x,{M}.P1.h.z]")
    await g.page.keyboard.down('KeyW'); await g.step(1); await g.page.keyboard.up('KeyW')
    p1 = await g.js(f"()=>[{M}.P1.h.x,{M}.P1.h.z]")
    g.check('danach ist die Steuerung wieder frei', abs(p1[0] - p0[0]) + abs(p1[1] - p0[1]) > 1, [p0, p1])
    await g.step(4.5)
    hp = await g.js(f"()=>{{const M={M},P=M.P1;P.h.health=100;P.armor=0;M.damagePlayer(P,10);return P.h.health}}")
    g.check('nach der Schonfrist wirkt Schaden wieder', hp == 90, hp)

run(test, real=True)
