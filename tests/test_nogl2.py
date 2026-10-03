# Gerät/Browser ohne WebGL2: klare deutsche Meldung statt Himmel ohne Welt, Ladescreen verschwindet, keine Seitenfehler.
import asyncio, os, sys
from playwright.async_api import async_playwright

BASE = os.environ.get('MEENZ_URL', 'http://localhost:8765').rstrip('/')
CHROME = os.environ.get('CHROME') or None
NO_GL2 = """(()=>{const g=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return t==='webgl2'?null:g.call(this,t,...a)};})();"""
results = []


def check(name, ok, detail=''):
    results.append(ok)
    print(f"  {'ok  ' if ok else 'FAIL'} {name}" + (f'  [{detail}]' if detail != '' else ''))


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=CHROME)
        ctx = await b.new_context(**p.devices['iPhone SE'])
        await ctx.add_init_script(NO_GL2)
        pg = await ctx.new_page()
        errors = []
        pg.on('pageerror', lambda e: errors.append(str(e)))
        await pg.goto(f'{BASE}/game/test.html', timeout=120000)
        txt = ''
        for _ in range(120):
            txt = await pg.evaluate("()=>(document.getElementById('nogl')||{}).textContent||''")
            if txt:
                break
            await asyncio.sleep(0.5)
        check('Meldung „WebGL 2“ auf Deutsch erscheint', 'WebGL 2' in txt and 'Gerät' in txt, txt[:80])
        await asyncio.sleep(1.5)
        st = await pg.evaluate("()=>({splash:!!document.getElementById('splash')&&!document.getElementById('splash').classList.contains('out'),err:(document.getElementById('errbox')||{}).textContent||'',meenz:!!window.__MEENZ})")
        check('Ladescreen weg, kein Fehlerkasten, Spiel nicht gestartet', not st['splash'] and not st['err'] and not st['meenz'], st)
        check('keine Seitenfehler', not errors, errors[:2])
        await b.close()
    ok = sum(results)
    print(f'{ok}/{len(results)} Checks ok')
    sys.exit(0 if ok == len(results) else 1)

asyncio.run(main())
