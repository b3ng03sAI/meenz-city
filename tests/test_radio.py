# Meenzer Autoradio: Sender per N im Auto, aus zu Fuß und auf dem Rad, Musik-Zustand, Ducking,
# Nachrichten nach Straftat und Raserei, Verkehrsfunk mit echten Straßennamen, HUD
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'

# Neues Auto (ohne NPC-Fahrer → kein Carjacking) am Anfang einer langen Straßenkante, Spieler steigt ein
CAR = f"""(k)=>{{const M={M},P=M.P1;if(P.car)M.exitCar(P,true);
    const es=M.EDGES.map((E,i)=>[E,i]).filter(([E])=>E.car&&E.len>260&&!E.ow);const [E]=es[k%es.length];
    const a=M.NODES[E.a],b=M.NODES[E.b];const dx=(b.x-a.x)/E.len,dz=(b.z-a.z)/E.len;
    const c=new M.Car('kompakt',a.x+dx*12,a.z+dz*12,Math.atan2(dx,dz),{{ctrl:'none'}});if(!M.CARS.includes(c))M.CARS.push(c);
    c.ai={{mode:'parked'}};c.sync();
    P.h.x=c.x-dx*2;P.h.z=c.z-dz*2;P.h.y=M.groundYFn(P.h.x,P.h.z,0);M.enterCar(P,c);return !!P.car&&P.car===c&&!c.T.pedal}}"""
STATE = f"()=>{{const R={M}.RADIO,h=document.getElementById('radio');return {{on:R.on,station:R.station,line:R.line,sel:R.sel,hud:!!h&&!h.hidden,hudText:h?h.textContent:''}}}}"
TUNE = f"(id)=>{{const R={M}.RADIO;return R.station===id}}"


async def tune(g, sid, maxn=6):
    """Drückt N, bis der Sender `sid` läuft (None = Aus)."""
    for _ in range(maxn):
        if (await g.js(STATE))['station'] == sid:
            return True
        await g.key('KeyN', after=0.05)
    return (await g.js(STATE))['station'] == sid


async def test(g):
    await g.start()
    st = await g.js(f"()=>{{const R={M}.RADIO;return {{n:R.stations.length,names:R.stations.map(s=>s.name),kinds:R.stations.map(s=>s.kind),log:Array.isArray(R.log)}}}}")
    g.check('4 Sender: Musik, Talk, Nachrichten, Verkehr', st['n'] == 4 and st['kinds'] == ['music', 'talk', 'news', 'traffic'], st)
    g.check('RADIO.log ist ein Array', st['log'])
    s = await g.js(STATE)
    g.check('zu Fuß: Radio aus, HUD versteckt', not s['on'] and not s['hud'], s)
    sel0 = s['sel']
    await g.key('KeyN')
    g.check('zu Fuß: N ändert den Sender nicht', (await g.js(STATE))['sel'] == sel0)

    # 1. Einsteigen → Radio Helau läuft, Musik-Zustand läuft auch ohne Audio weiter
    g.check('ins Auto eingestiegen', await g.js(CAR, 0))
    await g.step(0.2)
    s = await g.js(STATE)
    g.check('im Auto: Radio an, Sender helau', s['on'] and s['station'] == 'helau', s)
    g.check('HUD zeigt „Radio Helau“ und eine Zeile', s['hud'] and 'Radio Helau' in s['hudText'] and s['line'] != '', s['hudText'])
    song = await g.js(f"()=>{{const S={M}.RADIO.song;return S?{{meter:S.meter,bpm:S.bpm,n:S.ev.length,dur:S.dur,title:S.title,lead:S.ev.filter(e=>e.k==='lead').length}}:null}}")
    g.check('Lied erzeugt (3/4 oder 2/4, Melodie + Begleitung)', song and song['meter'] in (2, 3) and song['lead'] > 20 and song['n'] > 100, song)
    g.check('Liedtitel steht in der Zeile', song and song['title'] in s['line'], s['line'])
    t0 = await g.js(f"()=>{M}.RADIO.songT")
    await g.step(2)
    g.check('Lied-Zeit läuft weiter (headless ohne Audio)', await g.js(f"()=>{M}.RADIO.songT") > t0 + 1.9)
    n0 = await g.js(f"()=>{M}.RADIO.songN")
    await g.step(song['dur'] + 3)
    g.check('nach Liedende kommt das nächste Lied', await g.js(f"()=>{M}.RADIO.songN") == n0 + 1)

    # 2. Ducking: mit Vollgas leiser als im Stand
    await g.step(0.5)
    still = await g.js(f"()=>{M}.RADIO.vol")
    await g.page.keyboard.down('KeyW'); await g.step(3)
    loud = await g.js(f"()=>{M}.RADIO.vol")
    await g.page.keyboard.up('KeyW')
    g.check('Lautstärke geht bei Gas runter (Ducking)', 0 < loud < still, f'{still:.3f} -> {loud:.3f}')

    # 3. Sender per N durchschalten, inkl. Aus
    seq = []
    for _ in range(5):
        await g.key('KeyN', after=0.1)
        seq.append((await g.js(STATE))['station'])
    g.check('N schaltet talk → news → verkehr → Aus → helau', seq == ['talk', 'news', 'verkehr', None, 'helau'], seq)
    await g.key('KeyN', after=0.1)
    s = await g.js(STATE)
    g.check('Talk: Zeile mit Moderator, HUD zeigt Meenz Talk', 'Meenz Talk' in s['hudText'] and s['line'] != '', s)
    await g.step(7)
    s = await g.js(STATE)
    g.check('Talk: Moderatoren reden (Schorsch/Inge)', s['line'].startswith(('Schorsch:', 'Inge:')), s['line'])
    await tune(g, None)
    s = await g.js(STATE)
    g.check('„Aus“: Radio aus, HUD versteckt, obwohl im Auto', not s['on'] and not s['hud'] and s['station'] is None, s)

    # 4. Verkehrsfunk mit echten Straßennamen
    g.check('Verkehrsfunk eingestellt', await tune(g, 'verkehr'))
    found = []
    for _ in range(4):
        await g.step(11.5)
        r = await g.js(f"""()=>{{const M={M},R=M.RADIO;const real=new Set(M.EDGES.map(E=>E.road&&E.road.name).filter(Boolean));
            return {{line:R.line,street:R.street,real:real.has(R.street),inLine:!!R.street&&R.line.includes(R.street)}}}}""")
        found.append(r)
    ok = [r for r in found if r['real'] and r['inLine']]
    g.check('Verkehrsfunk nennt echte Straßennamen aus den OSM-Daten', len(ok) >= 3, found[-1])

    # 5. Nachrichten nach einer Straftat
    g.check('Nachrichten eingestellt', await tune(g, 'news'))
    await g.step(1)
    await g.js(f"()=>{{const M={M},c=M.P1.car;M.crime('robbery',c.x+20,c.z)}}")
    await g.step(0.1)
    r = await g.js(f"()=>{{const R={M}.RADIO;const e=R.log[R.log.length-1];return {{line:R.line,type:e&&e.type,told:e&&e.told,d:e&&e.d}}}}")
    g.check('crime() landet im RADIO.log', r['type'] == 'robbery' and r['told'], r)
    g.check('Nachrichten melden den Überfall sofort', r['line'].startswith('+++ Eilmeldung') and 'Iwwerfall' in r['line'] and r['d'] in r['line'], r['line'])
    await g.step(12)
    w = await g.js(f"()=>{{const R={M}.RADIO;return R.said.slice(-4).map(x=>x.text)}}")
    g.check('Nachrichten-Rotation läuft weiter (kein Dauer-Eilmeldung)', not all(x.startswith('+++') for x in w[-2:]), w)
    await g.js(f"()=>{M}.setWanted(0)")

    # 6. Raser → Nachricht mit Straßenname
    g.check('neue Strecke für Raser-Test', await g.js(CAR, 1))
    await g.step(0.2)
    await tune(g, 'news')
    await g.js(f"()=>{{const R={M}.RADIO;R.RASER_V=8;R.raserCD=0;R.lineT=99}}")
    await g.page.keyboard.down('KeyW'); await g.step(4); await g.page.keyboard.up('KeyW')
    r = await g.js(f"()=>{{const R={M}.RADIO;const e=R.log.filter(e=>e.type==='raser').pop();return {{e:e?{{s:e.s,k:e.k}}:null,line:R.line}}}}")
    await g.js(f"()=>{{{M}.RADIO.RASER_V=33}}")
    g.check('Raserei wird geloggt (mit Straße und km/h)', r['e'] and r['e']['s'] and r['e']['k'] > 20, r)
    g.check('Nachrichten: „Raser …“ mit Straßenname', r['e'] and r['line'].startswith('+++ Eilmeldung +++ Raser') and r['e']['s'] in r['line'], r['line'])
    g.check('Präposition im Namen → kein doppeltes „uff de“', await g.js(f"()=>[{M}.RADIO.onStreet('Im Fort Montebello',true),{M}.RADIO.onStreet('Rheinallee',false)]") == ['Im Fort Montebello', 'uff de Rheinallee'])

    # 7. Aussteigen → aus
    await g.js(f"()=>{{const M={M},c=M.P1.car;c.vx=c.vz=c.speed=0;M.exitCar(M.P1,true)}}")
    await g.step(0.2)
    s = await g.js(STATE)
    g.check('ausgestiegen: Radio aus, HUD versteckt, Zeile leer', not s['on'] and not s['hud'] and s['line'] == '', s)
    g.check('Senderwahl bleibt gemerkt', s['sel'] == 2, s['sel'])

    # 8. Fahrrad: kein Radio
    ok = await g.js(f"""()=>{{const M={M},P=M.P1,c=M.RAD.bikes[0];P.h.x=c.x-1.5;P.h.z=c.z;P.h.y=M.groundYFn(P.h.x,P.h.z,0);M.enterCar(P,c);return !!P.car&&P.car.T.pedal}}""")
    g.check('aufs Fahrrad gestiegen', ok)
    await g.step(0.3)
    sel = (await g.js(STATE))['sel']
    await g.key('KeyN')
    s = await g.js(STATE)
    g.check('Fahrrad: kein Radio, N wirkungslos', not s['on'] and not s['hud'] and s['sel'] == sel, s)
    await g.js(f"()=>{{const M={M};if(M.P1.car)M.exitCar(M.P1,true);M.setWanted(0)}}")

    # 9. Audio-Zustand: kein Ton ohne laufenden AudioContext, aber auch keine Fehler
    a = await g.js(f"()=>({{ctx:!!{M}.RADIO&&typeof AudioContext!=='undefined',bus:!!{M}.RADIO.bus}})")
    print('  info Audio:', a)


run(test)
