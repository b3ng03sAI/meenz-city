"""Testlauf: baut das Spiel, startet einen Webserver und führt tests/test_*.py aus.

    python3 tests/run.py               # alle Tests
    python3 tests/run.py rad hbf       # nur test_rad.py und test_hbf.py
    python3 tests/run.py --no-build    # ohne vorherigen Build

Exit-Code 0 nur, wenn jeder Test grün ist. Läuft ein Server unter MEENZ_URL, wird er benutzt,
sonst startet der Runner selbst einen auf einem freien Port.
"""
import os, socket, subprocess, sys, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TESTS = os.path.join(ROOT, 'tests')
VENV_PY = os.path.join(ROOT, '.venv', 'bin', 'python')
PY = VENV_PY if os.path.exists(VENV_PY) else sys.executable


def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p


def up(url):
    try:
        urllib.request.urlopen(url + '/game/test.html', timeout=2); return True
    except Exception:
        return False


def main(argv):
    names = [a for a in argv if not a.startswith('--')]
    if '--no-build' not in argv:
        r = subprocess.run([sys.executable, 'build.py'], cwd=os.path.join(ROOT, 'game'), capture_output=True, text=True)
        if r.returncode:
            print('Build fehlgeschlagen:\n' + r.stderr); return 1
    files = sorted(f for f in os.listdir(TESTS) if f.startswith('test_') and f.endswith('.py'))
    if names:
        want = {n if n.startswith('test_') else 'test_' + n for n in (n.removesuffix('.py') for n in names)}
        files = [f for f in files if f[:-3] in want]
        missing = want - {f[:-3] for f in files}
        if missing:
            print('Unbekannte Tests: ' + ', '.join(sorted(missing))); return 1
    env = dict(os.environ)
    srv = None
    if not (env.get('MEENZ_URL') and up(env['MEENZ_URL'])):
        port = free_port()
        srv = subprocess.Popen([sys.executable, os.path.join(TESTS, 'lib', 'serve.py'), str(port), ROOT],
                               cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        env['MEENZ_URL'] = f'http://127.0.0.1:{port}'
        for _ in range(50):
            if up(env['MEENZ_URL']): break
            time.sleep(0.1)
        else:
            srv.terminate(); print('Webserver startet nicht: ' + env['MEENZ_URL']); return 1
    env['PYTHONPATH'] = os.path.join(TESTS, 'lib') + os.pathsep + env.get('PYTHONPATH', '')
    failed = []
    try:
        for f in files:
            print(f'== {f}', flush=True)
            t0 = time.time()
            try:
                rc = subprocess.run([PY, os.path.join(TESTS, f)], env=env, timeout=600).returncode
            except subprocess.TimeoutExpired:
                rc = 'Zeitüberschreitung (600 s)'
            print(f'== {f}: {"OK" if rc == 0 else "FEHLER " + str(rc)} ({time.time() - t0:.0f}s)\n', flush=True)
            if rc != 0: failed.append(f)
    finally:
        if srv: srv.terminate()
    print(f'{len(files) - len(failed)}/{len(files)} Testdateien grün' + (': rot sind ' + ', '.join(failed) if failed else ''))
    return 1 if failed or not files else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
