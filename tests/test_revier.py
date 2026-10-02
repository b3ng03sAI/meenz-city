# Revierkämpfe: Zonen beider Rheinseiten, AKK umkämpft, Bandenfarben, Revierkampf (Sieg/Niederlage), Verteidigung,
# Einnahmen, AKK-Running-Gag, Karte/Minimap mit Revierfarben, Speicherstand (neu und alt)
import os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

PRE = "const M=__MEENZ,R=M.REVIER,P=M.P1;"
ZID = f"(n)=>{{{PRE}const z=R.zones.find(z=>z.name===n);return z?z.id:0}}"
# Spieler (zu Fuß) auf einen begehbaren Punkt der Zone stellen; liefert, ob er wirklich in der Zone steht
TP = f"""(id)=>{{{PRE}if(P.car)M.exitCar(P,true);const z=R.zone(id);const [x,zz]=R.spot(z,z.cx,z.cz);
    P.h.x=x;P.h.z=zz;P.h.y=M.groundYFn(x,zz,0);P.h.sync();return R.zoneAt(x,zz)===z}}"""
HEAL = f"()=>{{{PRE}P.h.health=100;P.armor=100;M.setWanted(0)}}"
OWNER = f"(id)=>{{{PRE}const z=R.zone(id);return [z.owner,z.contested]}}"
WAR = f"()=>{{{PRE}const W=R.war;return W?{{zone:W.zone,kind:W.kind,wave:W.wave,waves:W.waves,timer:W.timer,alive:W.attackers.filter(a=>a.alive).length,n:W.attackers.length}}:null}}"
KILL_WAVE = f"()=>{{{PRE}for(const a of R.war.attackers)a.health=0}}"


async def safe_step(g, sec, chunk=0.5):
    """Spielzeit vorrücken und den Spieler zwischendurch heilen – Kommando-Leute schießen auf ihn."""
    t = 0.0
    while t < sec - 1e-9:
        await g.js(HEAL)
        await g.step(min(chunk, sec - t))
        t += chunk


async def fight_waves(g):
    """Alle Wellen des laufenden Revierkampfs abarbeiten; liefert die Wellen-Nummern und Angreiferzahlen."""
    seen = []
    for _ in range(12):
        w = await g.js(WAR)
        if not w: break
        await safe_step(g, 3)
        w = await g.js(WAR)
        if not w: break
        if w['alive']:
            seen.append((w['wave'], w['n']))
            await g.js(KILL_WAVE)
        await safe_step(g, 0.5)
    return seen


async def test(g):
    await g.start()
    await g.js(HEAL)

    # 1. Zonen
    z = await g.js(f"()=>{{{PRE}return R.zones.map(z=>({{id:z.id,name:z.name,side:z.side,owner:z.owner,contested:z.contested,akk:z.akk}}))}}")
    mz = [x for x in z if x['side'] == 'MZ' and not x['akk']]
    wi = [x for x in z if x['side'] == 'WI' and not x['akk']]
    akk = [x for x in z if x['akk']]
    g.check('>= 5 Mainzer Reviere, alle bei de Rabauke', len(mz) >= 5 and all(x['owner'] == 'mz' and not x['contested'] for x in mz), len(mz))
    g.check('>= 5 Wiesbadener Reviere, alle beim Kommando', len(wi) >= 5 and all(x['owner'] == 'wi' and not x['contested'] for x in wi), len(wi))
    g.check('AKK: Amöneburg, Kastel, Kostheim da und umkämpft (owner null)',
            sorted(x['name'] for x in akk) == ['Mainz-Amöneburg', 'Mainz-Kastel', 'Mainz-Kostheim']
            and all(x['owner'] is None and x['contested'] and x['side'] == 'WI' for x in akk), akk)
    g.check('Markt liegt in einem Rabauke-Revier', await g.js(f"()=>{{{PRE}const z=R.zoneAt(M.POI.markt[0],M.POI.markt[1]);return !!z&&z.owner==='mz'}}"))
    gangs = await g.js(f"()=>{{{PRE}return Object.values(R.gangs).map(G=>[G.id,G.name,G.css])}}")
    g.check('zwei fiktive Banden mit Namen und Farbe', len(gangs) == 2 and all(n and c.startswith('#') for _, n, c in gangs), gangs)
    ids = {n: await g.js(ZID, n) for n in ['Mainz-Kastel', 'Mainz-Kostheim', 'Wiesbaden-Biebrich', 'Wiesbaden-Schierstein', 'Altstadt', 'Oberstadt']}
    g.check('Testzonen gefunden', all(ids.values()), ids)

    # 2. AKK-Running-Gag: Hinweis + Sprechblase, Antwort der Gegenseite, beim nächsten AKK-Teil eröffnet die andere Seite
    g.check('Spieler steht in Kastel', await g.js(TP, ids['Mainz-Kastel']))
    await g.js(f"()=>{{{PRE}R.spawn('mz',P.h.x+4,P.h.z+2);R.spawn('wi',P.h.x-4,P.h.z-2)}}")
    await safe_step(g, 1)
    a = await g.js(f"()=>{{{PRE}return {{n:R.akk.count,last:R.akk.last,hint:document.getElementById('hint').textContent,hidden:document.getElementById('hint').hidden,bubble:M.HUMANS.some(h=>h.bubble&&h.bubble.textContent===R.akk.last)}}}}")
    g.check('AKK betreten: Spruch erscheint als Hinweis', a['n'] == 1 and a['last'] and a['last'] in a['hint'] and not a['hidden'] and 'Meenzer' in a['hint'], a)
    g.check('AKK: Spruch auch als Sprechblase', a['bubble'])
    await safe_step(g, 4.5)
    b = await g.js(f"()=>{{{PRE}return {{n:R.akk.count,last:R.akk.last,hint:document.getElementById('hint').textContent}}}}")
    g.check('Gegenrede aus Wiesbaden folgt', b['n'] == 2 and b['last'] != a['last'] and 'Wissbaadener' in b['hint'], b)
    g.check('Spieler steht in Kostheim', await g.js(TP, ids['Mainz-Kostheim']))
    await safe_step(g, 1)
    c = await g.js(f"()=>{{{PRE}return {{n:R.akk.count,last:R.akk.last,hint:document.getElementById('hint').textContent}}}}")
    g.check('nächstes AKK-Gebiet: diesmal eröffnet Wiesbaden mit neuem Spruch',
            c['n'] == 3 and 'Wissbaadener' in c['hint'] and c['last'] not in (a['last'], b['last']), c)
    g.check('Zonenaufbau beim Boot unter 400 ms', await g.js("()=>__MEENZ.REVIER.buildMs") < 400, await g.js("()=>__MEENZ.REVIER.buildMs"))

    # 3. Bandenmitglieder tragen die Farben des Revierbesitzers (geteilte Materialien)
    DRESS = f"""()=>{{{PRE}const out=[];for(const m of R.members){{if(!m.alive||m.revWar)continue;const z=R.zoneAt(m.home[0],m.home[1]);const G=R.gangs[m.revGang];
        out.push({{g:m.revGang,owner:z?z.owner:'none',cap:m.revCap.material===G.mat.accent,shirt:m.revShirt===G.mat.shirt,kind:m.kind}});}}return out}}"""
    await g.reseed(7)
    for zone, gid in (('Wiesbaden-Biebrich', 'wi'), ('Altstadt', 'mz')):
        g.check(f'Spieler steht in {zone}', await g.js(TP, ids[zone]))
        await safe_step(g, 6)
        ms = [m for m in await g.js(DRESS) if m['owner'] == gid]
        g.check(f'{zone}: Bandenmitglieder gespawnt', len(ms) >= 1, len(ms))
        g.check(f'{zone}: alle von Bande {gid}, Mütze/Hemd in Bandenfarbe',
                all(m['g'] == gid and m['cap'] and m['shirt'] and m['kind'] == 'gang' for m in ms), ms[:4])
    lim = await g.js(f"()=>{{{PRE}const [x,z]=M.ppos(P);return R.members.filter(m=>m.alive&&!m.revWar&&Math.hypot(m.x-x,m.z-z)<220).length<=R.AMBIENT}}")
    g.check('Umgebungs-Limit eingehalten', lim)

    # 4. Revierkampf in Biebrich: KILLS umlegen → Wellen → Sieg dreht das Revier
    bie = ids['Wiesbaden-Biebrich']
    g.check('Spieler steht in Biebrich', await g.js(TP, bie))
    kills = await g.js("()=>__MEENZ.REVIER.KILLS")
    spawn3 = f"(n)=>{{{PRE}const out=[];for(let i=0;i<n;i++){{const [x,z]=M.ppos(P);out.push(R.spawn('wi',x+6+i,z+3));}}R.tmp=out;return out.every(h=>R.zoneAt(h.x,h.z)===R.zone({bie}))}}"
    g.check('Gegner im Revier gespawnt', await g.js(spawn3, kills))
    money0 = await g.js("()=>__MEENZ.G.money")
    await g.js(f"()=>{{{PRE}R.tmp.slice(0,R.KILLS-1).forEach(h=>h.health=0)}}")
    await safe_step(g, 0.5)
    k = await g.js(f"()=>{{{PRE}return [R.zone({bie}).kills,!!R.war,M.wanted]}}")
    g.check(f'{kills - 1} umgelegt: Zähler läuft, noch kein Krieg, kein Stern', k[0] == kills - 1 and not k[1] and k[2] == 0, k)
    await g.js(f"()=>{{{PRE}R.tmp.forEach(h=>h.health=0)}}")
    await safe_step(g, 0.5)
    w = await g.js(WAR)
    g.check('Revierkampf startet in Biebrich', bool(w) and w['zone'] == bie and w['kind'] == 'attack' and w['timer'] > 100, w)
    g.check('Revierkampf-Anzeige sichtbar', await g.js("()=>!document.getElementById('revier-hud').hidden"))
    await safe_step(g, 3)
    att = await g.js(f"()=>{{{PRE}return R.war.attackers.map(a=>({{g:a.revGang,hostile:a.hostile,mission:a.mission,cap:a.revCap.material===R.gangs.wi.mat.accent}}))}}")
    g.check('Angreifer: Kommando, feindlich, Blip, Bandenfarbe', len(att) > 0 and all(a['g'] == 'wi' and a['hostile'] and a['mission'] and a['cap'] for a in att), att)
    waves = await g.js("()=>__MEENZ.REVIER.WAVES")
    seen = await fight_waves(g)
    g.check('alle Wellen nacheinander mit passender Stärke', seen == [(i + 1, n) for i, n in enumerate(waves)], seen)
    o = await g.js(OWNER, bie)
    last = await g.js("()=>__MEENZ.REVIER.last")
    money1 = await g.js("()=>__MEENZ.G.money")
    g.check('Sieg: Biebrich gehört jetzt de Rabauke', o == ['mz', False] and last['won'] and last['zone'] == bie and not await g.js(WAR), [o, last])
    g.check('Sieg bringt Belohnung', money1 - money0 >= 500, money1 - money0)
    g.check('Anzeige nach dem Kampf aus', await g.js("()=>document.getElementById('revier-hud').hidden"))

    # 5. Niederlage per Zeitablauf: Revier bleibt beim Kommando
    sch = ids['Wiesbaden-Schierstein']
    g.check('Spieler steht in Schierstein', await g.js(TP, sch))
    await g.js(f"()=>{{{PRE}R.startWar({sch},'attack');R.war.timer=1}}")
    await safe_step(g, 1.5)
    o = await g.js(OWNER, sch)
    last = await g.js("()=>__MEENZ.REVIER.last")
    g.check('Zeit abgelaufen: Schierstein bleibt beim Kommando', o == ['wi', False] and not last['won'] and not await g.js(WAR), [o, last])

    # 6. Kommando greift eigenes Revier an: verteidigt → bleibt, Zeit abgelaufen → verloren
    obs = ids['Oberstadt']
    g.check('Spieler steht in der Oberstadt', await g.js(TP, obs))
    await g.js(f"()=>{{{PRE}R.attackT=0.01}}")
    await safe_step(g, 0.5)
    w = await g.js(WAR)
    g.check('Angriff aufs eigene Revier (Oberstadt)', bool(w) and w['kind'] == 'defend' and w['zone'] == obs, w)
    await fight_waves(g)
    g.check('verteidigt: Oberstadt bleibt rot-weiß', await g.js(OWNER, obs) == ['mz', False] and (await g.js("()=>__MEENZ.REVIER.last"))['won'])
    alt = ids['Altstadt']
    g.check('Spieler steht in der Altstadt', await g.js(TP, alt))
    await g.js(f"()=>{{{PRE}R.startWar({alt},'defend');R.war.timer=1}}")
    await safe_step(g, 1.5)
    g.check('nicht verteidigt: Altstadt fällt ans Kommando', await g.js(OWNER, alt) == ['wi', False])
    await g.js(f"()=>{{{PRE}R.zone({alt}).owner='mz';R.dirty=true}}")

    # 7. Einnahmen aus eigenen Revieren
    n = await g.js(f"()=>{{{PRE}return R.zones.filter(z=>z.owner==='mz').length}}")
    m0 = await g.js(f"()=>{{{PRE}R.incomeT=0.05;return M.G.money}}")
    await g.step(0.2)
    inc = await g.js(f"()=>{{{PRE}return [M.G.money,R.income,R.PER_ZONE]}}")
    g.check('Einnahmen gutgeschrieben (n Reviere × Satz)', n > 0 and inc[1] == n * inc[2] and inc[0] - m0 >= inc[1], [n, inc, m0])

    # 8. Karte und Minimap mit Revierfarben
    d0 = await g.js(f"()=>{{{PRE}return [R.draws,R.miniDraws,R.mapDraws]}}")
    await g.key('KeyM', after=0)
    g.check('Karte offen', await g.js("()=>__MEENZ.mode") == 'map')
    d1 = await g.js(f"()=>{{{PRE}return [R.draws,R.miniDraws,R.mapDraws]}}")
    g.check('große Karte: Revier-Overlay gezeichnet', d1[2] > d0[2] and d1[0] > d0[0], [d0, d1])
    px = await g.js(f"""()=>{{{PRE}const g=R.overlay.getContext('2d');const pix=id=>{{const c=R.zone(id).cells[0];return Array.from(g.getImageData(c%R.gw,Math.floor(c/R.gw),1,1).data)}};
        return [pix({bie}),pix({sch})]}}""")
    g.check('Overlay: Rabauke-Revier rot, Kommando-Revier blau', px[0][0] > px[0][2] and px[1][2] > px[1][0] and px[0][3] > 0 and px[1][3] > 0, px)
    # Legende rechts oben: Farbfeld der Rabauke (rein rot, nicht mit der Karte gemischt) muss dort stehen
    big = await g.js("""()=>{const c=document.getElementById('mapc');const g=c.getContext('2d');const w=Math.min(300,c.width);const d=g.getImageData(c.width-w,0,w,Math.min(160,c.height)).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]===214&&d[i+1]===32&&d[i+2]===46)n++;return n}""")
    g.check('Legende mit Bandenfarbe auf der großen Karte', big > 20, big)
    await g.key('KeyM', after=0)
    g.check('Karte zu', await g.js("()=>__MEENZ.mode") == 'play')
    await g.step(0.2)
    d2 = await g.js(f"()=>{{{PRE}return [R.draws,R.miniDraws,R.mapDraws]}}")
    g.check('Minimap: Revier-Overlay gezeichnet', d2[1] > d1[1] and d2[0] > d1[0], [d1, d2])

    # 9. Speicherstand: Besitz gespeichert, alter Spielstand ohne Revierdaten lädt mit Startverteilung
    s = await g.js(f"()=>{{{PRE}return M.snapshot()}}")
    own = s.get('revier', {}).get('own', {})
    g.check('snapshot enthält Revierbesitz', own.get('Wiesbaden-Biebrich') == 'mz' and own.get('Mainz-Kastel', 'x') is None and own.get('Wiesbaden-Schierstein') == 'wi', own)
    old = dict(s); old.pop('revier')
    ok = await g.js(f"(d)=>{{{PRE}return M.applySave(d)}}", old)
    g.check('alter Spielstand lädt', ok is True)
    g.check('alter Spielstand: Startverteilung (Biebrich Kommando, Kastel umkämpft)',
            await g.js(OWNER, bie) == ['wi', False] and await g.js(OWNER, ids['Mainz-Kastel']) == [None, True])
    bad = dict(s); bad['revier'] = {'own': {'Wiesbaden-Biebrich': 'xyz'}}
    await g.js(f"(d)=>{{{PRE}return M.applySave(d)}}", bad)
    g.check('unbekannter Besitzer im Spielstand → Startwert', await g.js(OWNER, bie) == ['wi', False])
    await g.js(f"(d)=>{{{PRE}return M.applySave(d)}}", s)
    g.check('neuer Spielstand stellt Biebrich wieder her', await g.js(OWNER, bie) == ['mz', False])
    await safe_step(g, 1)


run(test)
