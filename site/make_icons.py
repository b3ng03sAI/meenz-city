"""Erzeugt die App-Icons in site/icons/ (einmalig, Ergebnis ist eingecheckt).

Rendert eine kleine Icon-Seite mit der eingebetteten Bungee-Schrift in Chromium (Playwright) und speichert PNGs.
Aufruf: .venv/bin/python site/make_icons.py
"""
import asyncio, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'game'))
import embed
from playwright.async_api import async_playwright

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'icons')
WHEEL = ('<svg viewBox="0 0 24 24" style="width:{w}%;height:{w}%"><circle cx="12" cy="12" r="9" fill="none" stroke="#c8102e" '
         'stroke-width="2.4"/><g stroke="#c8102e" stroke-width="2"><line x1="12" y1="3" x2="12" y2="21"/><line x1="4.2" '
         'y1="7.5" x2="19.8" y2="16.5"/><line x1="4.2" y1="16.5" x2="19.8" y2="7.5"/></g><circle cx="12" cy="12" r="2.4" '
         'fill="#c8102e"/></svg>')


def page(size, pad):
    # pad: Anteil Rand (maskable braucht ~10 % sichere Zone je Seite)
    inner = size * (1 - 2 * pad)
    return f"""<html><head>{embed.fonts_css()}<style>html,body{{margin:0;width:{size}px;height:{size}px;background:#0b0d10}}
    .c{{position:absolute;inset:{size * pad}px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:{inner * .03}px}}
    .t{{font-family:Bungee;color:#fff;font-size:{inner * .2}px;line-height:.95;text-align:center;letter-spacing:.01em}}
    .t span{{color:#ffd23f}}</style></head><body><div class="c">{WHEEL.format(w=38)}<div class="t">MEENZ<br><span>CITY</span></div></div></body></html>"""


async def main():
    os.makedirs(OUT, exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, size, pad in (('icon-192.png', 192, .06), ('icon-512.png', 512, .06),
                                ('icon-maskable-512.png', 512, .14), ('apple-touch-icon.png', 180, .08)):
            pg = await b.new_page(viewport={'width': size, 'height': size})
            await pg.set_content(page(size, pad))
            await pg.evaluate('document.fonts.ready')
            await pg.screenshot(path=os.path.join(OUT, name))
            await pg.close()
        await b.close()
    print('Icons:', sorted(os.listdir(OUT)))

asyncio.run(main())
