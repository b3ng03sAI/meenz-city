# Inhaltsregel: keine Figur hebt den rechten Arm allein gestreckt über Schulterhöhe (sähe aus wie ein verbotener Gruß),
# keine Jubelpose mit beiden Armen senkrecht. Läuft mit echtem three.js, weil der Stub keine Rotationen speichert.
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

RMAX = -1.0 - 1e-6   # Grenzwert der Haltungs-Sperre (armR.rotation.x darf nicht kleiner werden)


async def test(g):
    await g.start()
    M = '__MEENZ'

    # 1. Faustschlag: über mehrere Schläge die gesamte Bewegung abtasten
    xs = await g.js(f"""()=>{{const M={M},P=M.P1;P.owned=P.owned||{{}};P.weapon='fist';const out=[];
        for(let k=0;k<6;k++){{P.fireT=0;M.playerFire(P,{{fire:true,fireP:true}});for(let i=0;i<20;i++){{M.update(1/60);out.push(P.h.armR.rotation.x);}}}}
        return [Math.min(...out),Math.max(...out)]}}""")
    g.check('Faustschlag: rechter Arm bleibt unter Schulterhöhe', xs[0] >= RMAX, xs)

    # 2. Wurf (Molotow): Arm seitlich statt nach oben
    xt = await g.js(f"""()=>{{const M={M},P=M.P1;P.owned.molotov=true;P.ammo=P.ammo||{{}};P.ammo.molotov=5;P.mag=P.mag||{{}};P.mag.molotov=5;P.weapon='molotov';
        const out=[];P.fireT=0;M.playerFire(P,{{fireP:true,fire:true}});for(let i=0;i<30;i++){{M.update(1/60);out.push(P.h.armR.rotation.x);}}return Math.min(...out)}}""")
    g.check('Wurf: rechter Arm bleibt unter Schulterhöhe', xt >= RMAX, xt)

    # 3. Sperre greift für jede Figur, egal wer die Pose setzt
    r = await g.js(f"""()=>{{const M={M};const h=M.mkHuman();h.x=M.P1.h.x+3;h.z=M.P1.h.z;h.y=M.P1.h.y;h.state='idle';
        h.armR.rotation.x=-1.9;h.armR.rotation.z=0;M.update(1/60);const a=[h.armR.rotation.x,h.armR.rotation.z];
        h.armL.rotation.x=-3.05;h.armR.rotation.x=-3.05;h.armL.rotation.z=0.05;h.armR.rotation.z=-0.05;M.update(1/60);
        return {{single:a,both:[h.armL.rotation.x,h.armL.rotation.z,h.armR.rotation.x,h.armR.rotation.z]}}}}""")
    g.check('Sperre: einzeln gehobener rechter Arm wird gesenkt und abgewinkelt', r['single'][0] >= RMAX and 0.3 <= r['single'][1] <= 0.5, r['single'])
    b = r['both']
    g.check('Sperre: beide Arme senkrecht → seitliches V', b[1] >= 0.6 and b[3] <= -0.6, b)

    # 4. Schwimmen bleibt unberührt (Körper waagerecht, Kraulbewegung darf durch alle Winkel)
    sw = await g.js(f"""()=>{{const M={M};const h=M.mkHuman();h.g.rotation.x=1.32;h.armR.rotation.x=-2.5;h.armL.rotation.x=0;
        M.HALTUNG.fix(h);return h.armR.rotation.x}}""")
    g.check('Schwimmen/Liegen: Sperre greift nicht bei waagerechtem Körper', sw < -1.3, sw)

    # 5. Zähler der Sperre ist erreichbar (für spätere Auswertung)
    g.check('HALTUNG-Zähler läuft', await g.js("()=>typeof __MEENZ.HALTUNG==='object'&&__MEENZ.HALTUNG.clamped>0"))

run(test, real=True)
