# Schnellreise über die Karte: Zielliste, Panel-Klick + „Losfahren“, besondere Orte (Dach, Bahnsteig, Rheintreppe)
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
SPECIALS = ['Brezel-Schalter (Marktfrühstück)', 'Hoher Dom St. Martin – Eingang', 'Christuskirche – Eingang',
            'Malakoff-Passage – Eingang', 'Hauptbahnhof – Eingang', 'Hbf – Bahnsteig Gleis 1 / 11',
            'Hbf – Bahnsteig Gleis 2 / 3', 'Hbf – Bahnsteig Gleis 4 / 5', 'Hbf – Bahnsteig Gleis 6 / 8',
            'Hbf – Bahnsteig Gleis 1', 'Rheintreppe 1', 'Rheintreppe 2', 'Rheintreppe 3', 'Dach des Taubenkönigs',
            'Dach-Grillparty', 'Alu-Hut-Dach', 'Gartenzwerg-Dach', 'Dach-Sofa', 'Badewannen-Dach', 'Dach-Minigolf',
            'Dach-Yoga', 'Grillparzerstraße', 'Flugplatz Großer Sand']


async def arrived(g, d):
    """fastTravel teleportiert per setTimeout (380 ms Echtzeit) – auf die Ankunft warten, nicht schlafen."""
    await g.page.wait_for_function("(d)=>{const h=__MEENZ.P1.h;return Math.hypot(h.x-d.x,h.z-d.z)<1}", arg=d,
                                   polling=50, timeout=5000)
    return await g.js(f"()=>{{const h={M}.P1.h;return [h.x,h.z,h.y]}}")


async def test(g):
    await g.start()
    # Ohne <meta charset> dekodiert Chromium die per http.server ausgelieferte Seite als windows-1252:
    # alle Umlaute/Gedankenstriche in den Spiel-Strings werden zu Mojibake („TaubenkÃ¶nigs“).
    cs = await g.js("()=>document.characterSet")
    g.check('Seite wird als UTF-8 dekodiert', cs == 'UTF-8', cs)

    await g.key('KeyM', after=0.6)
    g.check('Karte offen', await g.js(f"()=>{M}.mode") == 'map')
    n, hits = await g.js(f"()=>[{M}.ftDestinations().length,{M}.FT.hits.length]")
    g.check('mind. 60 Schnellreiseziele', n >= 60, n)
    g.check('alle Ziele als Marker auf der Karte', hits == n, f'{hits}/{n}')

    await g.page.click('#ftpanel button[data-ft]')
    sel = await g.js(f"()=>{{const d={M}.FT.sel;return d&&{{n:d.n,x:d.x,z:d.z,y:d.y}}}}")
    g.check('Klick auf erstes Ziel wählt es aus', sel and sel['n'] == 'Alu-Hut-Dach', sel and sel['n'])
    await g.page.click('#ftgo')
    p = await arrived(g, sel)
    g.check('nach „Losfahren“ wieder im Spiel', await g.js(f"()=>{M}.mode") == 'play')
    g.check('am Ziel Alu-Hut-Dach auf dem Dach', abs(p[2] - sel['y']) < 0.05 and sel['y'] > 5, [round(v, 1) for v in p])

    sp = await g.js(f"()=>{M}.ftDestinations().filter(d=>d.special).map(d=>d.n)")
    g.check('23 besondere Orte', len(sp) == len(SPECIALS), len(sp))
    missing = [s for s in SPECIALS if s not in sp]
    g.check('alle besonderen Orte mit richtigem Namen in der Liste', not missing, missing)

    for name, ymin, ymax in [('Dach des Taubenkönigs', 5, 200), ('Hbf – Bahnsteig Gleis 4 / 5', 0.75, 0.77), ('Rheintreppe 1', -0.01, 0.01)]:
        d = await g.js(f"(n)=>{{const d={M}.ftDestinations().find(d=>d.n===n);if(!d)return null;{M}.fastTravel(d);return {{x:d.x,z:d.z,y:d.y}}}}", name)
        g.check(f'Ziel „{name}“ gefunden', d is not None)
        if d is None:
            continue
        p = await arrived(g, d)
        g.check(f'„{name}“: angekommen auf passender Höhe', ymin <= p[2] <= ymax, [round(v, 2) for v in p])
        await g.step(0.5)

run(test)
