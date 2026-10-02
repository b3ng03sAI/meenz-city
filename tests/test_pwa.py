# GitHub-Pages-Version (site/): Manifest, Icons, Service Worker und Offline-Start.
# Baut dist/ aus dem vorhandenen Release-Build und lädt dist/index.html im iPhone-Profil (Chromium).
import asyncio, json, os, subprocess, sys
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.environ.get('MEENZ_URL', 'http://localhost:8765').rstrip('/')
CHROME = os.environ.get('CHROME') or None
results = []


def check(name, ok, detail=''):
    results.append(ok)
    print(f"  {'ok  ' if ok else 'FAIL'} {name}" + (f'  [{detail}]' if detail != '' else ''))


async def booted(pg):
    for _ in range(240):
        st = await pg.evaluate("()=>({m:!!window.__MEENZ,err:(document.getElementById('errbox')||{}).textContent||''})")
        if st['m'] or st['err']:
            return st
        await asyncio.sleep(0.5)
    return st


async def main():
    subprocess.run([sys.executable, os.path.join(ROOT, 'site', 'build_site.py')], check=True)
    url = f'{BASE}/dist/'
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME, args=['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
        ctx = await b.new_context(**p.devices['iPhone 13'])
        await ctx.add_init_script('window.__NORENDER=true')
        pg = await ctx.new_page()
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        await pg.goto(url, timeout=120000)
        st = await booted(pg)
        check('Spiel bootet über dist/index.html', st['m'] and not st['err'], st)
        man = await pg.evaluate("async()=>{const l=document.querySelector('link[rel=manifest]');const r=await fetch(l.href);return r.ok?await r.json():null}")
        check('Manifest abrufbar, Vollbild, Name', bool(man) and man['display'] == 'fullscreen' and man['name'] == 'Meenz City', man and man.get('display'))
        icons = await pg.evaluate("async(ic)=>{const o=[];for(const i of ic){const r=await fetch(i.src);o.push(r.ok&&r.headers.get('content-type').includes('png'))}return o}", man['icons'] if man else [])
        check('alle Manifest-Icons sind PNGs', icons and all(icons), icons)
        check('Apple-Touch-Icon + Vollbild-Meta', await pg.evaluate("()=>!!document.querySelector('link[rel=apple-touch-icon]')&&document.querySelector('meta[name=apple-mobile-web-app-capable]').content==='yes'"))
        ctl = await pg.evaluate("async()=>{const r=await navigator.serviceWorker.ready;return !!r.active}")
        check('Service Worker aktiv', ctl)
        await pg.reload()
        await booted(pg)
        check('Service Worker kontrolliert die Seite nach Neuladen', await pg.evaluate("()=>!!navigator.serviceWorker.controller"))
        cached = await pg.evaluate("async()=>{const k=(await caches.keys()).filter(x=>x.startsWith('meenz-'));const c=await caches.open(k[0]);return {keys:k.length,n:(await c.keys()).length}}")
        check('genau ein Versions-Cache mit allen Dateien', cached['keys'] == 1 and cached['n'] >= 6, cached)
        await ctx.set_offline(True)
        await pg.reload()
        st = await booted(pg)
        check('offline: Spiel startet aus dem Cache', st['m'] and not st['err'], st)
        await ctx.set_offline(False)
        check('keine Seitenfehler', not errors, errors[:3])
        await b.close()
    ok = sum(results)
    print(f'{ok}/{len(results)} Checks ok')
    sys.exit(0 if ok == len(results) else 1)

asyncio.run(main())
