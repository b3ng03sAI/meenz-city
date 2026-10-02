"""Test-Harness für Meenz City (Playwright, headless Chromium).

Ein Test ist eine async-Funktion, die ein `Game` bekommt:

    from harness import run
    async def test(g):
        await g.start()
        n = await g.js("()=>__MEENZ.CARS.length")
        g.check('autos da', n > 50, n)
        await g.step(2)            # 2 s Spielzeit, deterministisch
    run(test)

- `__MANUAL=true`: die rAF-Schleife ruft `update()` nicht mehr auf, Spielzeit läuft nur über `g.step()`.
- `__NORENDER=true`: kein Rendern (Stub- und real-Seite).
- `Math.random` ist geseedet → gleiche Läufe liefern gleiche Werte.
- Jeder Test schlägt zusätzlich fehl bei `pageerror`, Konsolenfehlern und sichtbarem `#errbox`.
- Exit-Code 1, sobald ein Check fehlschlägt.

Umgebung: `MEENZ_URL` (Standard http://localhost:8765), `CHROME` (optionaler Chromium-Pfad),
`MEENZ_SEED` (Standard 1).
"""
import asyncio, os, sys, time, traceback
from playwright.async_api import async_playwright

BASE = os.environ.get('MEENZ_URL', 'http://localhost:8765').rstrip('/')
CHROME = os.environ.get('CHROME') or None
SEED = int(os.environ.get('MEENZ_SEED', '1'))
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'out') + '/'
SWIFTSHADER = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']

INIT = """
window.__NORENDER=true;window.__MANUAL=true;
(()=>{let s=%d>>>0;Math.random=function(){s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);
t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};window.__reseed=n=>{s=n>>>0;};})();
""" % SEED

# Konsolenfehler, die kein Spielfehler sind (fehlende Ressourcen im Offline-/Stub-Betrieb)
IGNORE_CONSOLE = ('fonts.googleapis', 'fonts.gstatic', 'favicon')


class Game:
    def __init__(self, page):
        self.page = page
        self.results = []      # (ok, name, detail)
        self.errors = []       # pageerror / console.error

    async def js(self, expr, arg=None):
        """Wertet einen JS-Ausdruck aus (Funktion als String, wie page.evaluate)."""
        return await self.page.evaluate(expr, arg) if arg is not None else await self.page.evaluate(expr)

    async def start(self, split=False):
        """Wartet auf das fertig geladene Spiel und startet eine neue Runde."""
        # Laden: bis das Menü steht – sofort abbrechen bei Fehlerbox oder Seitenfehler (z. B. SyntaxError bei Namenskollision)
        # Netzwerk-Abbrüche beim Laden (Server unter Last) → Seite neu laden, höchstens 2×; Spielfehler nie wiederholen
        t0 = time.time(); reloads = 0
        while time.time() - t0 < 300:
            if await self.js('()=>window.__MEENZ!==undefined&&__MEENZ.mode==="menu"'): break
            if reloads < 2 and any('net::ERR_' in e for e in self.errors):
                reloads += 1; self.errors[:] = [e for e in self.errors if 'net::ERR_' not in e]
                print(f'  (Ladeabbruch im Netzwerk – Neuladen {reloads}/2)', flush=True)
                await self.page.reload(); continue
            err = await self.errbox() or next((e for e in self.errors if e.startswith('pageerror')), '')
            if err: raise RuntimeError('Spiel lädt nicht: ' + err[:300])
            await asyncio.sleep(0.25)   # Wartezeit nur beim Laden, nicht in der Spielzeit
        else:
            raise RuntimeError('Spiel lädt nicht: Zeitüberschreitung (300 s)')
        await self.js('(s)=>{if(s)__MEENZ.enableSplit&&__MEENZ.enableSplit();__MEENZ.startGame();}', bool(split))
        await self.reseed(SEED)   # ab Spielstart dieselbe Zufallsfolge, egal wie viel Zufall neue Features beim Boot verbrauchen
        await self.step(0.1)

    async def step(self, sec, dt=1 / 60):
        """Lässt `sec` Sekunden Spielzeit in Schritten von `dt` laufen. Fehler im Update werfen hier."""
        # wie frame(): update + HUD jeden Schritt, Minimap ~30 Hz – so fallen auch HUD-/Kartenfehler in Tests auf
        return await self.js('([n,dt])=>{const M=__MEENZ;for(let i=0;i<n;i++){M.update(dt);if(M.mode==="play"){M.updateHUD(dt);if(i%2===0)M.drawMinimaps();}}return M.mode;}',
                             [max(1, round(sec / dt)), dt])

    async def reseed(self, n):
        """Setzt den Zufallsgenerator neu – vor zufallsabhängigen Abschnitten, damit neue Features mit eigenem
        Zufallsverbrauch beim Boot die Erwartungen späterer Checks nicht verschieben."""
        await self.js('(n)=>window.__reseed(n)', int(n))

    async def key(self, code, hold=0.0, after=0.1):
        """Drückt eine Taste (KeyboardEvent.code, z. B. 'KeyE'), hält sie `hold` s Spielzeit, dann `after` s weiter."""
        await self.page.keyboard.down(code)
        await self.step(max(hold, 1 / 60))
        await self.page.keyboard.up(code)
        if after: await self.step(after)

    async def errbox(self):
        return await self.js("()=>{const b=document.getElementById('errbox');return b&&!b.hidden?b.textContent.slice(0,600):''}")

    def check(self, name, cond, detail=''):
        ok = bool(cond)
        self.results.append((ok, name, detail))
        print(('  ok   ' if ok else '  FAIL ') + name + (f'  [{detail}]' if detail != '' else ''), flush=True)
        return ok

    async def snap(self, name, n=3):
        """Rendert einmal (nur real.html) und speichert ein JPEG nach tests/out/<name>.jpg."""
        import base64
        url = await self.js(f'()=>__MEENZ.snap({int(n)})')
        os.makedirs(OUT, exist_ok=True)
        path = OUT + name + '.jpg'
        with open(path, 'wb') as f:
            f.write(base64.b64decode(url.split(',', 1)[1]))
        return path


def run(test, page='test.html', viewport=(1280, 800), real=False, init_extra='', mobile=False):
    """Führt einen Test aus und beendet den Prozess mit Exit-Code 0/1."""
    async def main():
        args = ['--no-sandbox'] + (SWIFTSHADER if real else [])
        async with async_playwright() as p:
            b = await p.chromium.launch(executable_path=CHROME, args=args)
            ctx = await (b.new_context(**p.devices['iPhone 13']) if mobile
                         else b.new_context(viewport={'width': viewport[0], 'height': viewport[1]}))
            pg = await ctx.new_page()
            g = Game(pg)
            pg.on('pageerror', lambda e: g.errors.append('pageerror: ' + str(e)[:400]))
            pg.on('console', lambda m: g.errors.append('console: ' + m.text[:400])
                  if m.type == 'error' and not any(s in m.text for s in IGNORE_CONSOLE) else None)
            await pg.add_init_script(INIT + init_extra)
            await pg.goto(f'{BASE}/game/{"real.html" if real else page}')
            t0 = time.time()
            try:
                await test(g)
            except Exception as e:
                g.check('test lief ohne Ausnahme durch', False, ''.join(traceback.format_exception_only(e)).strip()[:600])
            eb = await g.errbox()
            g.check('#errbox leer', eb == '', eb)
            g.check('keine Seiten-/Konsolenfehler', not g.errors, ' | '.join(g.errors[:5]))
            await b.close()
            fails = [r for r in g.results if not r[0]]
            print(f'{len(g.results) - len(fails)}/{len(g.results)} Checks ok, {time.time() - t0:.1f}s')
            return 1 if fails else 0
    sys.exit(asyncio.run(main()))
