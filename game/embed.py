"""Einbetten für den Release: three.js + Addons und die Schriften direkt in die HTML-Datei, damit das Spiel beim Spielen
keine Anfragen an Dritte stellt (Security-Audit X01/X02: kein CDN, keine Google-Fonts-IP-Übertragung).

three.js (MIT) kommt aus node_modules/three (über package-lock.json mit Integrität gepinnt). Jedes Modul läuft in einem
eigenen Funktionsbereich, damit seine internen Namen nicht mit dem Spiel-Code (ein gemeinsamer Modul-Scope) kollidieren.
"""
import base64, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
THREE_DIR = os.path.join(ROOT, 'node_modules', 'three')
# Addon-Module in Abhängigkeitsreihenfolge (Pfad relativ zu examples/jsm, ohne .js)
ADDONS = ['math/SimplexNoise', 'shaders/CopyShader', 'shaders/LuminosityHighPassShader', 'shaders/OutputShader',
          'shaders/GTAOShader', 'shaders/PoissonDenoiseShader', 'postprocessing/Pass', 'postprocessing/MaskPass',
          'postprocessing/ShaderPass', 'postprocessing/EffectComposer', 'postprocessing/RenderPass',
          'postprocessing/UnrealBloomPass', 'postprocessing/OutputPass', 'postprocessing/GTAOPass', 'objects/Sky',
          'utils/BufferGeometryUtils']


def _names(spec):
    """'A, B as C' → [('A','A'),('B','C')]"""
    out = []
    for part in spec.replace('\n', ' ').split(','):
        part = part.strip()
        if not part:
            continue
        m = re.match(r'(\S+)\s+as\s+(\S+)$', part)
        out.append((m.group(1), m.group(2)) if m else (part, part))
    return out


def _three():
    src = open(os.path.join(THREE_DIR, 'build', 'three.module.min.js'), encoding='utf-8').read()
    m = re.search(r'export\s*\{([^}]*)\}\s*;?\s*$', src)
    if not m:
        raise SystemExit('three.module.min.js: Export-Liste nicht gefunden')
    body = src[:m.start()]
    if re.search(r'^\s*(import|export)\b', body, re.M) or 'import.meta' in body:
        raise SystemExit('three.module.min.js: unerwartete import/export-Anweisung')
    pairs = _names(m.group(1))   # (intern, extern)
    obj = ','.join(f'{ext}:{loc}' for loc, ext in pairs)
    return f'const THREE=(()=>{{{body};return Object.freeze({{{obj}}});}})();\n', {ext for _, ext in pairs}


def _addon(path, three_names):
    src = open(os.path.join(THREE_DIR, 'examples', 'jsm', path + '.js'), encoding='utf-8').read()
    base = os.path.dirname(path)

    def imp(m):
        names, frm = m.group(1), m.group(2)
        binds = ','.join(f'{a}:{b}' if a != b else a for a, b in _names(names))
        if frm == 'three':
            for a, _ in _names(names):
                if a not in three_names:
                    raise SystemExit(f'{path}: three exportiert {a} nicht')
            return f'const {{{binds}}}=THREE;'
        dep = os.path.normpath(os.path.join(base, frm)).replace(os.sep, '/')[:-3]
        if dep not in ADDONS:
            raise SystemExit(f'{path}: unbekannte Abhängigkeit {dep}')
        return f'const {{{binds}}}=__ADDON["{dep}"];'
    src = re.sub(r'import\s*\{([^}]*)\}\s*from\s*[\'"]([^\'"]+)[\'"]\s*;?', imp, src)
    if re.search(r'^\s*import\b', src, re.M):
        raise SystemExit(f'{path}: nicht unterstützte import-Form')
    exports = []

    def exp_list(m):
        exports.extend(_names(m.group(1)))   # (lokal, exportiert)
        return ''
    src = re.sub(r'^\s*export\s*\{([^}]*)\}\s*;?', exp_list, src, flags=re.M)
    for kw in ('class', 'function', 'const', 'let', 'var'):
        for m in re.finditer(rf'^\s*export\s+{kw}\s+([A-Za-z_$][\w$]*)', src, re.M):
            exports.append((m.group(1), m.group(1)))
        src = re.sub(rf'^(\s*)export\s+{kw}\b', rf'\1{kw}', src, flags=re.M)
    if re.search(r'^\s*export\b', src, re.M):
        raise SystemExit(f'{path}: nicht unterstützte export-Form')
    ret = ','.join(dict.fromkeys(f'{e}:{l}' if l != e else l for l, e in exports))
    return f'__ADDON["{path}"]=(()=>{{{src}\nreturn {{{ret}}};}})();\n'


def bundle():
    """JS-Text, der THREE und __ADDON bereitstellt."""
    head, names = _three()
    parts = [head, 'const __ADDON={};\n'] + [_addon(p, names) for p in ADDONS]
    return ''.join(parts)


IMPORT_RE = re.compile(r"^import\s*(\*\s+as\s+THREE|\{([^}]*)\})\s*from\s*'([^']+)';\s*$", re.M)


def rewrite_game(code):
    """ES-Imports des Spielcodes (p0_render.js) auf das eingebettete Bündel umstellen."""
    def rep(m):
        if m.group(1).startswith('*'):
            return '/* THREE eingebettet */'
        spec = m.group(3).replace('three/addons/', '')[:-3]
        return f'const {{{m.group(2)}}}=__ADDON["{spec}"];'
    code = IMPORT_RE.sub(rep, code)
    code = code.replace("await import('three/addons/postprocessing/GTAOPass.js')", '__ADDON["postprocessing/GTAOPass"]')
    if "from 'three" in code or "import('three" in code:
        raise SystemExit('Spielcode enthält noch three-Importe')
    return code


def fonts_css():
    fonts = json.load(open(os.path.join(ROOT, 'game', 'fonts', 'fonts.json'), encoding='utf-8'))
    css = []
    for fam, w, fn, rng in fonts:
        data = base64.b64encode(open(os.path.join(ROOT, fn), 'rb').read()).decode()
        css.append(f"@font-face{{font-family:'{fam}';font-style:normal;font-weight:{w};font-display:swap;"
                   f"src:url(data:font/woff2;base64,{data}) format('woff2');unicode-range:{rng}}}")
    return '<style>/* Schriften eingebettet (SIL OFL 1.1, siehe licenses/) */' + ''.join(css) + '</style>'


def rewrite_shell(shell):
    """Google-Fonts-Links und Import-Map entfernen, eingebettete Schriften einsetzen."""
    shell = re.sub(r'<link rel="preconnect" href="https://fonts\.googleapis\.com">\s*', '', shell)
    shell, n = re.subn(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com/css2[^"]*">', fonts_css(), shell)
    if n != 1:
        raise SystemExit('shell.html: Google-Fonts-Link nicht gefunden')
    shell, n = re.subn(r'<script type="importmap">.*?</script>\s*', '', shell, flags=re.S)
    if n != 1:
        raise SystemExit('shell.html: Import-Map nicht gefunden')
    return shell
