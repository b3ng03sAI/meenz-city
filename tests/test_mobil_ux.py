# Mobil-UX (Handy-Audit): Pause-Knopf erreichbar (hoch + quer), Querformat-Layout ohne Überlappung, Startpanel scrollt
# von oben, Einleitung überspringen, Laden schließen, Karte mit Pinch, RINFO, Ton-Fortsetzen, Zielhilfe.
import asyncio, os, sys; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
from harness import run

M = '__MEENZ'
RECT = """(s)=>{const e=document.querySelector(s);if(!e||e.closest('[hidden]'))return null;const r=e.getBoundingClientRect();return r.width?[r.left,r.top,r.right,r.bottom]:null}"""


def overlap(a, b):
    return bool(a and b) and min(a[2], b[2]) - max(a[0], b[0]) > 0.5 and min(a[3], b[3]) - max(a[1], b[1]) > 0.5


async def pause_hit(g):
    return await g.js("""()=>{const b=document.getElementById('btn-hud-pause');const r=b.getBoundingClientRect();
        const t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return {hit:t===b,w:r.width,h:r.height,top:t&&(t.id||t.className)}}""")


async def test(g):
    # --- Startbildschirm (vor dem Spielstart) ---
    for _ in range(1200):
        if await g.js('()=>window.__MEENZ!==undefined&&__MEENZ.mode==="menu"'): break
        await asyncio.sleep(0.25)   # nur Ladezeit
    await g.js(f"()=>{M}.TOUCHUI.setMode('touch')")
    st = await g.js("""()=>{const o=document.getElementById('start'),p=o.querySelector('.panel');o.scrollTop=0;const top=p.getBoundingClientRect().top;
        o.scrollTop=99999;const sc=o.scrollTop;o.scrollTop=0;return {top,sc,split:getComputedStyle(document.getElementById('btn-split')).display,
        vp:!!document.querySelector('meta[name=viewport][content*="viewport-fit=cover"]'),q:document.getElementById('qualnote').textContent}}""")
    g.check('Viewport-Meta mit viewport-fit=cover im Spiel', st['vp'])
    g.check('Startpanel beginnt oben (nicht abgeschnitten) und scrollt', st['top'] >= 0 and st['sc'] > 0, st)
    g.check('Touch: kein Split-Screen-Knopf', st['split'] == 'none')
    g.check('Handy-Grafikhinweis nennt die echte Stufe, nicht „Ultra“', 'Niedrig' in st['q'] and 'Ultra' not in st['q'], st['q'][:60])

    await g.start()
    await g.js(f"()=>{{{M}.TOUCHUI.setMode('touch');{M}.TOUCHUI.refresh()}}"); await g.step(0.1)
    p = await pause_hit(g)
    g.check('Hochformat: Pause-Knopf ist oben (elementFromPoint) und ≥ 44×44', p['hit'] and p['w'] >= 44 and p['h'] >= 44, p)

    # --- Querformat ---
    await g.page.set_viewport_size({'width': 844, 'height': 390}); await g.step(0.1); await g.js(f"()=>{M}.TOUCHUI.refresh()")
    p = await pause_hit(g)
    g.check('Querformat: Pause-Knopf ist oben und ≥ 44×44', p['hit'] and p['w'] >= 44 and p['h'] >= 44, p)
    r = {s: await g.js(RECT, s) for s in ['#tpad', '.tbtns', '.tctx', '#money', '#clock', '#btn-hud-pause', '#mini', '#wanted']}
    g.check('Querformat: Stick links unten', r['#tpad'] and r['#tpad'][0] < 844 * 0.25 and r['#tpad'][3] > 390 * 0.75, r['#tpad'])
    bad = [f'{a}×{b}' for a in ('.tbtns', '.tctx') for b in ('#money', '#clock', '#btn-hud-pause', '#mini', '#wanted') if overlap(r[a], r[b])]
    g.check('Querformat: Knöpfe überdecken weder Geld/Uhr/Fahndung/Pause noch Minikarte', not bad and r['.tbtns'] and r['.tctx'], bad or r)
    g.check('Querformat: Minikarte kleiner (~110 px)', r['#mini'] and r['#mini'][2] - r['#mini'][0] <= 120, r['#mini'])
    await g.page.set_viewport_size({'width': 390, 'height': 664}); await g.step(0.1)

    # --- Einleitung überspringen ---
    await g.js(f"()=>{{const I={M}.INTRO;I.force=true;I.start()}}"); await g.step(0.2)
    has = await g.js("()=>{const b=document.getElementById('introskip');return !!b&&!!b.offsetParent}")
    g.check('Einleitung: Überspringen-Knopf sichtbar', has and await g.js(f"()=>{M}.INTRO.active"))
    await g.js("()=>document.getElementById('introskip').click()"); await g.step(0.1)
    g.check('Überspringen beendet die Einleitung', await g.js(f"()=>!{M}.INTRO.active&&{M}.INTRO.done&&document.getElementById('talk').hidden"))

    # --- Laden: Schließen-Knopf ---
    await g.js(f"()=>{M}.MUX.t.openShop({M}.SHOPS[0])")
    vis = await g.js("()=>{const b=document.getElementById('shopclose');const r=b.getBoundingClientRect();return !!b.offsetParent&&r.height>=44}")
    g.check('Laden: Schließen-Knopf sichtbar (≥ 44 px)', await g.js(f"()=>{M}.MUX.t.shopOpen") and vis)
    await g.js("()=>document.getElementById('shopclose').click()")
    g.check('Schließen-Knopf schließt den Laden', await g.js(f"()=>!{M}.MUX.t.shopOpen&&document.getElementById('shopmenu').hidden"))

    # --- Karte: touch-action none, Pinch zoomt ---
    await g.js(f"()=>{M}.MUX.t.openMap()")
    ta = await g.js("()=>getComputedStyle(document.getElementById('mapc')).touchAction")
    g.check('Karte: touch-action none', ta == 'none', ta)
    g.check('Karte: Legende im Touch-Modus ausgeblendet', await g.js("()=>getComputedStyle(document.querySelector('.legend')).display==='none'"))
    s0 = await g.js(f"()=>{M}.MUX.t.mapScale")
    await g.js("""()=>{const c=document.getElementById('mapc');c.setPointerCapture=()=>{};const r=c.getBoundingClientRect();const cx=r.left+r.width/2,cy=r.top+r.height/2;
        const ev=(t,id,x)=>c.dispatchEvent(new PointerEvent(t,{pointerId:id,clientX:x,clientY:cy,bubbles:true,pointerType:'touch'}));
        ev('pointerdown',11,cx-40);ev('pointerdown',12,cx+40);for(let i=1;i<=5;i++){ev('pointermove',11,cx-40-i*12);ev('pointermove',12,cx+40+i*12);}ev('pointerup',12,cx+100);ev('pointerup',11,cx-100);}""")
    s1 = await g.js(f"()=>{M}.MUX.t.mapScale")
    g.check('Karte: zwei Finger auseinander = hineinzoomen', s1 > s0 * 1.5, f'{s0:.3f} → {s1:.3f}')
    rowh = await g.js("()=>{const b=document.querySelector('#ftpanel [data-ft]');return b?b.getBoundingClientRect().height:0}")
    g.check('Schnellreise-Zeilen ≥ 44 px', rowh >= 44, rowh)
    await g.js("()=>document.getElementById('muxftbtn').click()")
    g.check('Schnellreise-Liste einklappbar', await g.js("()=>getComputedStyle(document.getElementById('ftpanel')).display==='none'"))
    await g.js("()=>document.getElementById('muxftbtn').click()")
    await g.js("()=>document.getElementById('btn-map-close').click()")

    # --- RINFO, Ton ---
    ri = await g.js(f"()=>{{const r={M}.RINFO;return r&&typeof r==='object'&&'calls' in r&&'triangles' in r}}")
    g.check('__MEENZ.RINFO liefert calls/triangles', ri)
    au = await g.js(f"""()=>{{const A={M}.MUX.t.AUD,old=A.ctx;const fake={{state:'suspended',resume(){{this.state='running';return Promise.resolve()}}}};A.ctx=fake;
        document.dispatchEvent(new Event('visibilitychange'));const a=fake.state;fake.state='interrupted';
        window.dispatchEvent(new PointerEvent('pointerdown',{{bubbles:true}}));const b=fake.state;A.ctx=old;return [{M}.MUX.audio.hooked,a,b]}}""")
    g.check('Ton wird bei Sichtbarkeit und nächstem Tippen fortgesetzt', au == [True, 'running', 'running'], au)

    # --- Touch-Texte ---
    t = await g.js(f"()=>{M}.MUX.touchText('Geh zur <b>Theke</b> und drück <b>F</b>. <b>E</b>: ansprechen')")
    g.check('Hinweise nennen im Touch-Modus die Knöpfe', 'EIN/AUS' in t and 'AKTION' in t and '<b>F</b>' not in t, t)

    # --- Zielhilfe ---
    aim = await g.js(f"""()=>{{const M={M},P=M.P1,h=P.h;P.weapon='pistol';P.mag.pistol=12;P.fireT=0;P.reloadT=0;
        const o=M.HUMANS.find(x=>x!==h&&x.alive&&!x.inCar&&x.kind==='ped');const yaw=P.cam.yaw,a=yaw+8*Math.PI/180;
        o.x=h.x+Math.sin(a)*20;o.z=h.z+Math.cos(a)*20;o.y=h.y;o.hostile=true;o.state='walk';
        const n0=M.MUX.aim.snaps;M.MUX.t.fire({{}});const d=Math.atan2(o.x-h.x,o.z-h.z)-P.cam.yaw;return {{snap:M.MUX.aim.snaps-n0,err:Math.abs(Math.atan2(Math.sin(d),Math.cos(d))),tgt:M.MUX.aim.last===o}}}}""")
    g.check('Zielhilfe: FEUER richtet auf feindliches Ziel im 12°-Kegel aus', aim['snap'] == 1 and aim['tgt'] and aim['err'] < 0.01, aim)

run(test, mobile=True)
