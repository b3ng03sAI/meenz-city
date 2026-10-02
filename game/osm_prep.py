# Wandelt den OSM-Export (Overpass JSON, out geom) in kompakte Spieldaten um.
import json, math, re, sys, collections

import os
SRC = os.environ.get('OSM_SRC','/home/claude/game/osm2.json')
OUT = '/home/claude/game/p1_osm.js'
MINX, MINZ, WW, WH = [int(v) for v in os.environ.get('OSM_BOUNDS','-6016,-3264,9216,5888').split(',')]
MAXX, MAXZ = MINX + WW, MINZ + WH

def X(lon): return (lon - 8.2740) * 71540
def Z(lat): return -(lat - 49.9988) * 111200

import gzip
d = json.load(gzip.open(SRC,'rt') if SRC.endswith('.gz') else open(SRC))
SRC2 = os.environ.get('OSM_SRC2')
if SRC2:
    d2 = json.load(gzip.open(SRC2,'rt') if SRC2.endswith('.gz') else open(SRC2))
    seen = {(e['type'], e['id']) for e in d['elements']}
    add = [e for e in d2['elements'] if (e['type'], e['id']) not in seen]
    d['elements'] += add
    print('merge', len(add), 'neue Elemente aus', SRC2, file=sys.stderr)
E = d['elements']

def inmap(x, z, m=0):
    return MINX - m <= x <= MAXX + m and MINZ - m <= z <= MAXZ + m

def area(P):
    a = 0
    for i in range(len(P)):
        x1, z1 = P[i]; x2, z2 = P[(i + 1) % len(P)]
        a += x1 * z2 - x2 * z1
    return a / 2

def centroid(P):
    a = area(P)
    if abs(a) < 1e-6:
        return sum(p[0] for p in P) / len(P), sum(p[1] for p in P) / len(P)
    cx = cz = 0
    for i in range(len(P)):
        x1, z1 = P[i]; x2, z2 = P[(i + 1) % len(P)]
        f = x1 * z2 - x2 * z1
        cx += (x1 + x2) * f; cz += (z1 + z2) * f
    return cx / (6 * a), cz / (6 * a)

def pip(x, z, P):
    c = False; j = len(P) - 1
    for i in range(len(P)):
        xi, zi = P[i]; xj, zj = P[j]
        if (zi > z) != (zj > z) and x < (xj - xi) * (z - zi) / (zj - zi) + xi:
            c = not c
        j = i
    return c

def clip_rect(P, x0, z0, x1, z1):
    def clip(P, inside, inter):
        out = []
        for i in range(len(P)):
            A = P[i - 1]; B = P[i]
            ia, ib = inside(A), inside(B)
            if ib:
                if not ia: out.append(inter(A, B))
                out.append(B)
            elif ia:
                out.append(inter(A, B))
        return out
    def ix(A, B, x):
        t = (x - A[0]) / (B[0] - A[0]); return (x, A[1] + (B[1] - A[1]) * t)
    def iz(A, B, z):
        t = (z - A[1]) / (B[1] - A[1]); return (A[0] + (B[0] - A[0]) * t, z)
    for ins, inter in [(lambda p: p[0] >= x0, lambda a, b: ix(a, b, x0)), (lambda p: p[0] <= x1, lambda a, b: ix(a, b, x1)),
                       (lambda p: p[1] >= z0, lambda a, b: iz(a, b, z0)), (lambda p: p[1] <= z1, lambda a, b: iz(a, b, z1))]:
        if not P: break
        P = clip(P, ins, inter)
    return P

def dp(P, tol, keep):
    # Douglas-Peucker mit festen Punkten (keep: Menge der Indizes)
    n = len(P)
    if n < 3: return list(range(n))
    res = set([0, n - 1]) | set(keep)
    idxs = sorted(res)
    def rec(a, b):
        ax, az = P[a]; bx, bz = P[b]
        dx, dz = bx - ax, bz - az; L = math.hypot(dx, dz) or 1e-9
        best, bi = -1, -1
        for i in range(a + 1, b):
            px, pz = P[i]
            dd = abs((px - ax) * dz - (pz - az) * dx) / L
            if dd > best: best, bi = dd, i
        if best > tol:
            res.add(bi); rec(a, bi); rec(bi, b)
    for k in range(len(idxs) - 1):
        rec(idxs[k], idxs[k + 1])
    return sorted(res)

def simplify_ring(P, tol=0.25):
    if len(P) < 4: return P
    if P[0] == P[-1]: P = P[:-1]
    # entferne fast kollineare Punkte
    changed = True
    while changed and len(P) > 3:
        changed = False
        for i in range(len(P)):
            A = P[i - 1]; B = P[i]; C = P[(i + 1) % len(P)]
            dx, dz = C[0] - A[0], C[1] - A[1]; L = math.hypot(dx, dz)
            if L < 1e-6 or abs((B[0] - A[0]) * dz - (B[1] - A[1]) * dx) / L < tol or math.dist(A, B) < 0.3:
                P = P[:i] + P[i + 1:]; changed = True; break
    return P

def num(v):
    if v is None: return None
    m = re.match(r'\s*([0-9]+(?:[.,][0-9]+)?)', str(v))
    return float(m.group(1).replace(',', '.')) if m else None

def geom(e):
    return [(X(p['lon']), Z(p['lat'])) for p in e['geometry']]

def assemble(ways):
    # verbindet Linienstücke zu geschlossenen Ringen
    segs = [list(w) for w in ways if len(w) >= 2]
    rings = []
    key = lambda p: (round(p[0], 2), round(p[1], 2))
    while segs:
        cur = segs.pop()
        guard = 0
        while key(cur[0]) != key(cur[-1]) and guard < 10000:
            guard += 1
            found = False
            for i, s in enumerate(segs):
                if key(s[0]) == key(cur[-1]): cur += s[1:]; found = True
                elif key(s[-1]) == key(cur[-1]): cur += s[::-1][1:]; found = True
                elif key(s[-1]) == key(cur[0]): cur = s + cur[1:]; found = True
                elif key(s[0]) == key(cur[0]): cur = s[::-1] + cur[1:]; found = True
                if found: segs.pop(i); break
            if not found: break
        if len(cur) >= 4: rings.append(cur)
    return rings

NAMES = []; NAMEI = {}
def name_idx(n):
    if not n: return -1
    if n not in NAMEI: NAMEI[n] = len(NAMES); NAMES.append(n)
    return NAMEI[n]

def enc_ring(P, scale=10):
    # delta-kodiert in dm
    out = []; px = pz = 0
    for i, (x, z) in enumerate(P):
        ix, iz = int(round(x * scale)), int(round(z * scale))
        out += [ix - px, iz - pz]; px, pz = ix, iz
    return out

# ------------------------------------------------------------ Gebäude
TYP = {'commercial': 1, 'retail': 1, 'office': 1, 'hotel': 1, 'supermarket': 1, 'kiosk': 1,
       'church': 2, 'cathedral': 2, 'chapel': 2, 'religious': 2, 'mosque': 2, 'synagogue': 2,
       'industrial': 3, 'warehouse': 3, 'hangar': 3, 'manufacture': 3, 'service': 3, 'transportation': 3, 'train_station': 5,
       'garage': 4, 'garages': 4, 'shed': 4, 'hut': 4, 'carport': 4, 'parking': 3, 'kindergarten': 5,
       'public': 5, 'civic': 5, 'historic': 5, 'school': 5, 'university': 5, 'college': 5, 'hospital': 5, 'government': 5, 'castle': 5, 'museum': 5, 'tower': 5,
       'house': 6, 'detached': 6, 'semidetached_house': 6, 'terrace': 0, 'apartments': 0, 'residential': 0, 'yes': 0, 'dormitory': 0}
ROOF = {'flat': 0, 'gabled': 1, 'half-hipped': 1, 'gambrel': 1, 'saltbox': 1, 'hipped': 2, 'side_hipped': 2, 'mansard': 3,
        'dome': 4, 'round': 4, 'pyramidal': 5, 'skillion': 6, 'onion': 7, 'cone': 5}
COLS = []; COLI = {}
NAMED_COL = {'white': '#f2f0ea', 'grey': '#9a9a96', 'gray': '#9a9a96', 'red': '#a5503a', 'brown': '#7a5640', 'black': '#3a3a3a',
             'yellow': '#e2cf8f', 'beige': '#e0cfa8', 'darkgrey': '#5a5a5a', 'lightgrey': '#c2c2be', 'silver': '#bfc3c6', 'green': '#5c7a52',
             'blue': '#4a6a8a', 'orange': '#d0864a', 'pink': '#dba7a0', 'maroon': '#6a2f2a', 'tan': '#c9ad86', 'sandstone': '#c98c74'}
def col_idx(c):
    if not c: return -1
    c = c.strip().lower()
    c = NAMED_COL.get(c, c)
    if not re.match(r'^#[0-9a-f]{6}$', c):
        if re.match(r'^#[0-9a-f]{3}$', c): c = '#' + ''.join(ch * 2 for ch in c[1:])
        else: return -1
    if c not in COLI: COLI[c] = len(COLS); COLS.append(c)
    return COLI[c]

def bld_record(t, rings, part=False):
    outer = rings[0]; holes = rings[1:]
    outer = simplify_ring(outer)
    if len(outer) < 3: return None
    a = area(outer)
    if a < 0: outer = outer[::-1]; a = -a  # gegen den Uhrzeigersinn (x rechts, z runter) -> positive Fläche
    if a < 6: return None
    hs = []
    for h in holes:
        h = simplify_ring(h)
        if len(h) >= 3 and abs(area(h)) > 4:
            if area(h) > 0: h = h[::-1]
            hs.append(h)
    bt = t.get('building:part') if part else t.get('building')
    typ = TYP.get(bt, 0)
    h = num(t.get('height')); mh = num(t.get('min_height')) or 0
    lv = num(t.get('building:levels')); rlv = num(t.get('roof:levels'))
    ml = num(t.get('building:min_level'))
    if not mh and ml: mh = ml * 3.2
    rs = ROOF.get(t.get('roof:shape'), -1)
    rh = num(t.get('roof:height'))
    if h is None and lv is not None:
        h = lv * 3.2 + (0.8 if lv >= 1 else 0) + ((rh if rh else (rlv or 0) * 2.8) if rs not in (0, -1) else 0)
    flags = 0
    if t.get('historic') or t.get('heritage'): flags |= 1
    if bt in ('roof', 'carport'): flags |= 2
    return {'p': outer, 'holes': hs, 'h': h, 'mh': mh, 'lv': lv, 'rs': rs, 'rh': rh, 'typ': typ, 'flags': flags,
            'col': col_idx(t.get('building:colour')), 'rcol': col_idx(t.get('roof:colour')), 'a': a,
            'name': t.get('name'), 'mat': t.get('building:material') or '', 'id': None}

buildings = []; parts = []
for e in E:
    t = e.get('tags', {})
    if e['type'] == 'way' and ('building' in t or 'building:part' in t) and e.get('geometry'):
        P = geom(e)
        if len(P) < 4 or P[0] != P[-1]: continue
        cx, cz = centroid(P[:-1])
        if not inmap(cx, cz, -2): continue
        if t.get('building') in ('construction', 'no', 'ruins') or t.get('location') == 'underground': continue
        isp = 'building:part' in t and 'building' not in t
        r = bld_record(t, [P[:-1]], part=isp)
        if not r: continue
        r['id'] = e['id']
        (parts if isp else buildings).append(r)
    elif e['type'] == 'relation' and ('building' in t or 'building:part' in t):
        outs = [geom_m for geom_m in [[(X(p['lon']), Z(p['lat'])) for p in m['geometry']] for m in e['members'] if m.get('role') == 'outer' and m.get('geometry')]]
        ins = [[(X(p['lon']), Z(p['lat'])) for p in m['geometry']] for m in e['members'] if m.get('role') == 'inner' and m.get('geometry')]
        orings = assemble(outs); irings = assemble(ins)
        for o in orings:
            o = o[:-1]; cx, cz = centroid(o)
            if not inmap(cx, cz, -2): continue
            hh = [i[:-1] for i in irings if pip(i[0][0], i[0][1], o)]
            r = bld_record(t, [o] + hh, part=('building' not in t))
            if r:
                r['id'] = e['id']; (buildings if 'building' in t else parts).append(r)

# Teile den Gebäuden zuordnen
for b in buildings: b['parts'] = []
grid = collections.defaultdict(list)
for i, b in enumerate(buildings):
    xs = [p[0] for p in b['p']]; zs = [p[1] for p in b['p']]
    for gx in range(int(min(xs) // 50), int(max(xs) // 50) + 1):
        for gz in range(int(min(zs) // 50), int(max(zs) // 50) + 1):
            grid[(gx, gz)].append(i)
def bld_at(x, z):
    for i in grid.get((int(x // 50), int(z // 50)), []):
        if pip(x, z, buildings[i]['p']): return i
    return -1
orphan = []
for p in parts:
    cx, cz = centroid(p['p'])
    i = bld_at(cx, cz)
    if i >= 0: buildings[i]['parts'].append(p)
    else: orphan.append(p)

out_b = []
for b in buildings:
    if b['flags'] & 2: continue
    lst = b['parts'] if b['parts'] else [b]
    # Fehlende Teilhöhen von Gebäudehöhe erben
    for q in lst:
        if q is not b:
            if q['h'] is None: q['h'] = b['h']
            if q['rs'] == -1 and b['rs'] != -1 and q['mh'] == 0: q['rs'] = b['rs']
            if q['col'] < 0: q['col'] = b['col']
            if q['rcol'] < 0: q['rcol'] = b['rcol']
            q['typ'] = b['typ'] if q['typ'] == 0 else q['typ']
    grp = len(out_b)
    for q in lst:
        out_b.append((q, grp, b))
for q in orphan:
    out_b.append((q, len(out_b), q))

def rec_arr(q, b):
    h = q['h']
    return [int(round((h or 0) * 10)), int(round((q['mh'] or 0) * 10)), q['rs'], int(q['lv'] or 0), q['typ'], q['flags'],
            q['col'], q['rcol'], int(round((q['rh'] or 0) * 10)), name_idx(b.get('name')) if q is b or not q.get('name') else name_idx(q.get('name')),
            enc_ring(q['p']), [enc_ring(hh) for hh in q['holes']], b['id']]

B_OUT = [rec_arr(q, b) for (q, grp, b) in out_b]

# ------------------------------------------------------------ Straßen
CLS = {'motorway': 0, 'trunk': 0, 'primary': 0, 'motorway_link': 0, 'trunk_link': 0, 'primary_link': 0,
       'secondary': 1, 'secondary_link': 1, 'busway': 1, 'tertiary': 2, 'tertiary_link': 2,
       'residential': 3, 'unclassified': 3, 'road': 3, 'living_street': 4, 'service': 5,
       'pedestrian': 6, 'footway': 7, 'path': 7, 'cycleway': 7, 'bridleway': 7, 'track': 7}
SURF = {'asphalt': 0, 'sett': 1, 'cobblestone': 1, 'unhewn_cobblestone': 1, 'cobblestone:flattened': 1, 'paving_stones': 2, 'paved': 0,
        'gravel': 3, 'fine_gravel': 3, 'compacted': 3, 'unpaved': 3, 'dirt': 3, 'ground': 3, 'grass': 3, 'pebblestone': 3, 'concrete': 4, 'concrete:plates': 4,
        'wood': 4, 'metal': 4}
node_pos = {}
use = collections.Counter()
rways = []
R = (MINX + 3, MINZ + 3, MAXX - 3, MAXZ - 3)
def inR(p): return R[0] <= p[0] <= R[2] and R[1] <= p[1] <= R[3]
THB_ID = 153245708
for e in E:
    t = e.get('tags', {})
    if e['type'] != 'way' or 'highway' not in t: continue
    hw = t['highway']
    if hw not in CLS: continue
    if t.get('area') == 'yes': continue
    if t.get('tunnel') in ('yes', 'building_passage', 'culvert') or t.get('covered') == 'yes' or t.get('indoor') == 'yes': continue
    if num(t.get('layer')) and str(t.get('layer')).startswith('-'): continue
    if t.get('footway') in ('sidewalk', 'crossing', 'traffic_island') or t.get('cycleway') in ('crossing', 'sidewalk') or t.get('path') == 'sidewalk': continue
    if hw == 'service' and t.get('service') in ('parking_aisle', 'drive-through', 'emergency_access'): continue
    if t.get('access') == 'no' and hw in ('footway', 'path'): continue
    P = geom(e); ids = e['nodes']
    for nid, p in zip(ids, P): node_pos[nid] = p
    cls = CLS[hw]
    # Läufe innerhalb der Karte
    run = []
    runs = []
    for nid, p in zip(ids, P):
        if inR(p): run.append(nid)
        else:
            if len(run) >= 2: runs.append(run)
            run = []
    if len(run) >= 2: runs.append(run)
    flags = 0
    if t.get('oneway') in ('yes', '1', 'true'): flags |= 1
    if t.get('oneway') == '-1': flags |= 1; runs = [r[::-1] for r in runs]
    if t.get('bridge') and t.get('bridge') != 'no': flags |= 2
    if e['id'] == THB_ID: flags |= 4
    if t.get('junction') == 'roundabout': flags |= 8
    if t.get('sidewalk') in ('no', 'none', 'separate'): flags |= 16
    if t.get('sidewalk') in ('both', 'left', 'right', 'yes'): flags |= 32
    if 'parking:both' in t or 'parking:lane:both' in t or 'parking:left' in t or 'parking:right' in t: flags |= 64
    if t.get('lit') == 'yes': flags |= 128
    lanes = int(num(t.get('lanes')) or 0)
    width = num(t.get('width')) or num(t.get('est_width')) or 0
    surf = SURF.get(t.get('surface'), -1)
    nm = t.get('name') or t.get('ref') or ''
    for r in runs:
        for nid in r: use[nid] += 1
        rways.append({'cls': cls, 'name': nm, 'surf': surf, 'flags': flags, 'lanes': lanes, 'w': width, 'ids': r, 'hw': hw})
# Kreuzungspunkte: von mehreren Wegen genutzt oder Endpunkte
junction = set(n for n, c in use.items() if c > 1)
for w in rways: junction.add(w['ids'][0]); junction.add(w['ids'][-1])
NODES_OUT = []; NI = {}
def ni(nid):
    if nid not in NI:
        NI[nid] = len(NODES_OUT); x, z = node_pos[nid]; NODES_OUT.append((int(round(x * 10)), int(round(z * 10))))
    return NI[nid]
R_OUT = []
for w in rways:
    P = [node_pos[n] for n in w['ids']]
    keep = [i for i, n in enumerate(w['ids']) if n in junction]
    tol = 0.35 if w['cls'] <= 5 else 0.6
    sel = dp(P, tol, keep)
    ids = [w['ids'][i] for i in sel]
    # doppelte Nachbarpunkte entfernen
    ids2 = [ids[0]]
    for n in ids[1:]:
        if n != ids2[-1]: ids2.append(n)
    if len(ids2) < 2: continue
    R_OUT.append([w['cls'], name_idx(w['name']), w['surf'], w['flags'], w['lanes'], int(round(w['w'] * 10)), [ni(n) for n in ids2]])

# ------------------------------------------------------------ Wasser
river_rings_o = []; river_rings_i = []
for e in E:
    t = e.get('tags', {})
    if e['type'] == 'relation' and t.get('natural') == 'water' and t.get('water') == 'river':
        outs = [[(X(p['lon']), Z(p['lat'])) for p in m['geometry']] for m in e['members'] if m.get('role') == 'outer' and m.get('geometry')]
        ins = [[(X(p['lon']), Z(p['lat'])) for p in m['geometry']] for m in e['members'] if m.get('role') == 'inner' and m.get('geometry')]
        river_rings_o += assemble(outs); river_rings_i += assemble(ins)
BIG = 12500
W_OUT = {'o': [], 'i': []}
for k, rings in (('o', river_rings_o), ('i', river_rings_i)):
    for r in rings:
        c = clip_rect(r[:-1], -BIG, -BIG, BIG, BIG)
        c = simplify_ring(c, 0.3)
        if len(c) >= 3 and abs(area(c)) > 50:
            W_OUT[k].append(enc_ring(c))
small_water = []
for e in E:
    t = e.get('tags', {})
    if e['type'] == 'way' and t.get('natural') == 'water' and e.get('geometry'):
        P = geom(e)[:-1]; cx, cz = centroid(P)
        if inmap(cx, cz) and abs(area(P)) < 20000:
            small_water.append([t.get('water') == 'fountain' or t.get('amenity') == 'fountain' and 1 or 0, enc_ring(simplify_ring(P, 0.15))])


# ------------------------------------------------------------ Rhein-Mittellinie (für Schiffe)
def ring_hits(px, pz, nx, nz, rings):
    # Schnittpunkte der Linie p + s*n mit allen Ringen -> Parameter s
    hits = []
    for r in rings:
        for i in range(len(r) - 1):
            ax, az = r[i]; bx, bz = r[i + 1]
            ex, ez = bx - ax, bz - az
            den = nx * ez - nz * ex
            if abs(den) < 1e-9: continue
            t = ((ax - px) * ez - (az - pz) * ex) / den
            u = ((ax - px) * nz - (az - pz) * nx) / den
            if 0 <= u < 1 and abs(t) < 900: hits.append(t)
    return sorted(hits)
allr = river_rings_o + river_rings_i
def center_march(p, d, steps=200):
    line = []
    for k in range(steps):
        nx, nz = -d[1], d[0]
        hs = ring_hits(p[0], p[1], nx, nz, allr)
        lo = max([h for h in hs if h < 0], default=None); hi = min([h for h in hs if h > 0], default=None)
        if lo is None or hi is None: break
        mid = (p[0] + nx * (lo + hi) / 2, p[1] + nz * (lo + hi) / 2)
        if line:
            dd = (mid[0] - line[-1][0], mid[1] - line[-1][1]); L = math.hypot(*dd)
            if L > 1: d = (0.7 * d[0] + 0.3 * dd[0] / L, 0.7 * d[1] + 0.3 * dd[1] / L); Ld = math.hypot(*d); d = (d[0] / Ld, d[1] / Ld)
        line.append(mid)
        p = (mid[0] + d[0] * 40, mid[1] + d[1] * 40)
        if not (-3500 < p[0] < 3500 and -3500 < p[1] < 3500): break
    return line
def inwater(x, z):
    c = False
    for r in allr:
        if pip(x, z, r): c = not c
    return c
seed = None
for zz in (1000, 900, 800, 600, 400, 200, 0):
    xs = [x for x in range(-1500, 2500, 10) if inwater(x, zz)]
    if xs:
        # längstes zusammenhängendes Intervall
        best = []; cur = [xs[0]]
        for x in xs[1:]:
            if x - cur[-1] <= 10: cur.append(x)
            else:
                if len(cur) > len(best): best = cur
                cur = [x]
        if len(cur) > len(best): best = cur
        seed = ((best[0] + best[-1]) / 2, zz); print('Start', seed, len(best) * 10); break
south = center_march(seed, (0.1, 1.0), 60)[::-1]
north = []
prev = seed[0]
def intervals(vals, step):
    iv = []; cur = None
    for v in vals:
        if cur and v - cur[1] <= step: cur[1] = v
        else:
            if cur: iv.append(cur)
            cur = [v, v]
    if cur: iv.append(cur)
    return iv
lastz = None
for zz in range(1000, -3200, -40):
    xs = [x for x in range(int(prev) - 900, int(prev) + 900, 8) if inwater(x, zz)]
    iv = [v for v in intervals(xs, 8) if v[1] - v[0] > 60]
    if not iv: break
    v = min(iv, key=lambda v: abs((v[0] + v[1]) / 2 - prev) - (v[1] - v[0]) * 0.3)
    if v[1] - v[0] > 1500: break
    prev = (v[0] + v[1]) / 2; north.append((prev, zz)); lastz = zz
# weiter nach Westen (Rhein dreht bei Mombach)
if north:
    pz = north[-1][1]; px0 = north[-1][0]
    for xx in range(int(px0) - 40, -7600, -40):
        zs = [z for z in range(int(pz) - 900, int(pz) + 900, 8) if inwater(xx, z)]
        iv = [v for v in intervals(zs, 8) if v[1] - v[0] > 60]
        if not iv: break
        v = min(iv, key=lambda v: abs((v[0] + v[1]) / 2 - pz) - (v[1] - v[0]) * 0.3)
        nz = (v[0] + v[1]) / 2
        if abs(nz - pz) > 60 and xx < px0 - 200: pass
        pz = nz; north.append((xx, pz))
sm = []
for i in range(len(north)):
    a = north[max(0, i - 2):i + 3]; sm.append((sum(p[0] for p in a) / len(a), sum(p[1] for p in a) / len(a)))
north = sm
RHINE = south[:-1] + north

# ------------------------------------------------------------ Flächen
AREA_CODES = {'park': 0, 'grass': 1, 'forest': 2, 'square': 3, 'parking': 4, 'rail': 5, 'pitch': 6, 'construction': 7, 'playground': 8, 'garden': 9, 'cemetery': 10, 'flowerbed': 11}
def area_kind(t):
    if t.get('leisure') == 'park': return 'park'
    if t.get('leisure') == 'garden': return 'garden'
    if t.get('landuse') in ('grass', 'meadow', 'village_green', 'recreation_ground', 'allotments') or t.get('leisure') == 'common': return 'grass'
    if t.get('landuse') == 'flowerbed': return 'flowerbed'
    if t.get('landuse') == 'forest' or t.get('natural') in ('wood', 'scrub'): return 'forest'
    if t.get('place') == 'square' or (t.get('highway') in ('pedestrian', 'footway') and t.get('area') == 'yes') or t.get('area:highway') in ('pedestrian', 'footway'): return 'square'
    if t.get('amenity') == 'parking' and t.get('parking', 'surface') == 'surface' and 'building' not in t: return 'parking'
    if t.get('landuse') == 'railway': return 'rail'
    if t.get('leisure') in ('pitch', 'track'): return 'pitch'
    if t.get('landuse') in ('construction', 'brownfield'): return 'construction'
    if t.get('leisure') == 'playground': return 'playground'
    if t.get('landuse') == 'cemetery' or t.get('amenity') == 'grave_yard': return 'cemetery'
    return None
A_OUT = []
for e in E:
    t = e.get('tags', {})
    k = area_kind(t)
    if not k: continue
    rings = []
    if e['type'] == 'way' and e.get('geometry'):
        P = geom(e)
        if P[0] != P[-1]: continue
        rings = [P[:-1]]
    elif e['type'] == 'relation':
        outs = [[(X(p['lon']), Z(p['lat'])) for p in m['geometry']] for m in e['members'] if m.get('role') == 'outer' and m.get('geometry')]
        rings = [r[:-1] for r in assemble(outs)]
    for P in rings:
        c = clip_rect(P, MINX, MINZ, MAXX, MAXZ)
        c = simplify_ring(c, 0.3)
        if len(c) >= 3 and abs(area(c)) > 8:
            A_OUT.append([AREA_CODES[k], name_idx(t.get('name')), enc_ring(c)])
# Kleine Flächen zuerst? -> große zuerst zeichnen
def ring_area(enc):
    pts = []; x = z = 0
    for i in range(0, len(enc), 2):
        x += enc[i]; z += enc[i + 1]; pts.append((x, z))
    return abs(area(pts))
A_OUT.sort(key=lambda a: -ring_area(a[2]))

# ------------------------------------------------------------ Schienen
RAIL_OUT = []
for e in E:
    t = e.get('tags', {})
    if e['type'] == 'way' and t.get('railway') in ('rail', 'tram', 'light_rail') and e.get('geometry'):
        if t.get('tunnel') in ('yes',) or str(t.get('layer', '0')).startswith('-'): continue
        P = [p for p in geom(e)]
        run = []; runs = []
        for p in P:
            if inmap(p[0], p[1], -2): run.append(p)
            else:
                if len(run) >= 2: runs.append(run)
                run = []
        if len(run) >= 2: runs.append(run)
        for r in runs:
            keep = []
            sel = dp(r, 0.3, keep)
            RAIL_OUT.append([1 if t['railway'] == 'tram' else 0, 1 if t.get('bridge') == 'yes' else 0, enc_ring([r[i] for i in sel])])

# ------------------------------------------------------------ Punkte
trees = []; lamps = []; signals = []; stops = []; benches = []; bins = []; fountains = []; entrances = []; crossings = []
for e in E:
    t = e.get('tags', {})
    if e['type'] != 'node': continue
    x, z = X(e['lon']), Z(e['lat'])
    if not inmap(x, z, -1): continue
    p = (int(round(x * 10)), int(round(z * 10)))
    if t.get('natural') == 'tree': trees += [*p, int(num(t.get('height')) or 0)]
    elif t.get('highway') == 'street_lamp': lamps += p
    elif t.get('highway') == 'traffic_signals': signals += p
    elif t.get('highway') == 'bus_stop' or t.get('public_transport') == 'platform' and t.get('bus') == 'yes': stops += [*p, name_idx(t.get('name'))]
    elif t.get('amenity') == 'bench': benches += p
    elif t.get('amenity') == 'waste_basket': bins += p
    elif t.get('amenity') == 'fountain': fountains += p
    elif t.get('highway') == 'crossing': crossings += p
    if 'entrance' in t: entrances.append((x, z, t.get('entrance')))
# Baumreihen
for e in E:
    t = e.get('tags', {})
    if e['type'] == 'way' and t.get('natural') == 'tree_row' and e.get('geometry'):
        P = geom(e)
        for i in range(len(P) - 1):
            L = math.dist(P[i], P[i + 1]); n = max(1, int(L / 9))
            for k in range(n):
                f = (k + 0.5) / n; x = P[i][0] + (P[i + 1][0] - P[i][0]) * f; z = P[i][1] + (P[i + 1][1] - P[i][1]) * f
                if inmap(x, z, -1): trees += [int(round(x * 10)), int(round(z * 10)), 0]

# ------------------------------------------------------------ Geschäfte (begehbar)
SHOPCAT = [
    ('bakery', ['bakery', 'pastry', 'confectionery']),
    ('pharmacy', ['pharmacy', 'chemist', 'medical_supply']),
    ('clothes', ['clothes', 'shoes', 'boutique', 'fashion', 'bag', 'fashion_accessories', 'leather', 'tailor']),
    ('cafe', ['cafe', 'ice_cream', 'coffee', 'tea']),
    ('restaurant', ['restaurant', 'fast_food', 'pub', 'bar', 'biergarten', 'wine', 'food_court']),
    ('supermarket', ['supermarket', 'convenience', 'greengrocer', 'butcher', 'deli', 'beverages', 'organic', 'health_food', 'alcohol', 'cheese', 'farm', 'seafood', 'spices', 'chocolate']),
    ('kiosk', ['kiosk', 'tobacco', 'newsagent', 'lottery', 'e-cigarette']),
    ('books', ['books', 'stationery', 'gift', 'art', 'music', 'craft', 'frame', 'antiques', 'second_hand', 'charity', 'variety_store', 'toys', 'games', 'hobby', 'model', 'video_games']),
    ('hairdresser', ['hairdresser', 'beauty', 'cosmetics', 'perfumery', 'massage', 'tattoo', 'nail_salon', 'hearing_aids', 'optician']),
    ('bank', ['bank', 'money_lender', 'bureau_de_change', 'insurance', 'atm']),
    ('jewelry', ['jewelry', 'watches', 'pawnbroker']),
    ('electronics', ['electronics', 'mobile_phone', 'computer', 'hifi', 'photo', 'camera', 'telecommunication', 'appliance', 'repair']),
    ('sports', ['sports', 'outdoor', 'bicycle', 'weapons', 'hunting', 'fishing', 'scuba_diving']),
    ('furniture', ['furniture', 'interior_decoration', 'houseware', 'kitchen', 'bed', 'lighting', 'doityourself', 'hardware', 'florist', 'garden_centre', 'carpet', 'curtain', 'household_linen', 'department_store', 'mall', 'pet', 'travel_agency', 'copyshop', 'dry_cleaning', 'laundry', 'car_repair', 'car', 'motorcycle']),
]
CATI = {}
for i, (c, lst) in enumerate(SHOPCAT):
    for k in lst: CATI[k] = i
CATNAMES = [c for c, _ in SHOPCAT]
shops = []
for e in E:
    t = e.get('tags', {})
    nm = t.get('name')
    if not nm: continue
    k = t.get('shop') or (t.get('amenity') if t.get('amenity') in ('restaurant', 'cafe', 'fast_food', 'pharmacy', 'bank', 'bar', 'pub', 'ice_cream', 'biergarten') else None)
    if not k: continue
    cat = CATI.get(k)
    if cat is None: cat = len(SHOPCAT) - 1
    if e['type'] == 'node': x, z = X(e['lon']), Z(e['lat'])
    elif e['type'] == 'way' and e.get('geometry'): x, z = centroid(geom(e)[:-1] if geom(e)[0] == geom(e)[-1] else geom(e))
    else: continue
    if not inmap(x, z, -20): continue
    shops.append({'x': x, 'z': z, 'name': nm, 'cat': cat, 'kind': k, 'way': e['type'] == 'way', 'brand': t.get('brand', '')})

# Türpositionen: nächstes Gebäude, Kante zur Straße
bpolys = [(b['p'], b) for b in buildings if not (b['flags'] & 2)]
bgrid = collections.defaultdict(list)
for i, (P, b) in enumerate(bpolys):
    xs = [p[0] for p in P]; zs = [p[1] for p in P]
    for gx in range(int(min(xs) // 40), int(max(xs) // 40) + 1):
        for gz in range(int(min(zs) // 40), int(max(zs) // 40) + 1):
            bgrid[(gx, gz)].append(i)
def near_bld(x, z, r=40):
    s = set()
    for gx in range(int((x - r) // 40), int((x + r) // 40) + 1):
        for gz in range(int((z - r) // 40), int((z + r) // 40) + 1):
            s.update(bgrid.get((gx, gz), []))
    return s
def inside_any(x, z, cand):
    return any(pip(x, z, bpolys[i][0]) for i in cand)
# Straßenpunkte für "zur Straße hin"
rgrid = collections.defaultdict(list)
for w in rways:
    if w['cls'] > 7: continue
    for a, b in zip(w['ids'], w['ids'][1:]):
        A = node_pos[a]; B = node_pos[b]
        L = math.dist(A, B); n = max(1, int(L / 4))
        for k in range(n + 1):
            f = k / n; p = (A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f)
            rgrid[(int(p[0] // 20), int(p[1] // 20))].append(p)
def road_dist(x, z):
    best = 1e9
    for gx in range(int(x // 20) - 2, int(x // 20) + 3):
        for gz in range(int(z // 20) - 2, int(z // 20) + 3):
            for p in rgrid.get((gx, gz), []):
                d = (p[0] - x) ** 2 + (p[1] - z) ** 2
                if d < best: best = d
    return math.sqrt(best)
egrid = collections.defaultdict(list)
for (x, z, k) in entrances: egrid[(int(x // 20), int(z // 20))].append((x, z, k))

S_OUT = []
used_doors = []
for s in shops:
    cand = near_bld(s['x'], s['z'], 30)
    # Gebäude, das den Punkt enthält, oder nächstes
    host = None; hd = 1e9
    for i in cand:
        P = bpolys[i][0]
        if pip(s['x'], s['z'], P): host = i; hd = 0; break
        for j in range(len(P)):
            A = P[j]; B = P[(j + 1) % len(P)]
            dx, dz = B[0] - A[0], B[1] - A[1]; L2 = dx * dx + dz * dz or 1e-9
            f = max(0, min(1, ((s['x'] - A[0]) * dx + (s['z'] - A[1]) * dz) / L2))
            dd = math.hypot(A[0] + dx * f - s['x'], A[1] + dz * f - s['z'])
            if dd < hd: hd = dd; host = i
    if host is None or hd > 20: continue
    P = bpolys[host][0]
    best = None
    for j in range(len(P)):
        A = P[j]; B = P[(j + 1) % len(P)]
        dx, dz = B[0] - A[0], B[1] - A[1]; L = math.hypot(dx, dz)
        if L < 3.2: continue
        # Außennormale (Ring positiv orientiert: x rechts, z runter -> außen = (dz,-dx))
        nx, nz = dz / L, -dx / L
        if pip((A[0] + B[0]) / 2 + nx * 0.5, (A[1] + B[1]) / 2 + nz * 0.5, P): nx, nz = -nx, -nz
        f = max(1.4 / L, min(1 - 1.4 / L, ((s['x'] - A[0]) * dx + (s['z'] - A[1]) * dz) / (L * L)))
        px, pz = A[0] + dx * f, A[1] + dz * f
        ox, oz = px + nx * 2.5, pz + nz * 2.5
        if inside_any(ox, oz, cand): continue
        rd = road_dist(ox, oz)
        dist = math.hypot(px - s['x'], pz - s['z'])
        score = dist + rd * 0.8
        # Eingang in der Nähe?
        for (ex, ez, ek) in egrid.get((int(px // 20), int(pz // 20)), []):
            if abs((ex - A[0]) * nz * -1 + (ez - A[1]) * nx) < 0.6 and math.hypot(ex - s['x'], ez - s['z']) < 14:
                pass
        if best is None or score < best[0]: best = (score, px, pz, nx, nz, j, L)
    if not best: continue
    _, px, pz, nx, nz, j, L = best
    # Eingang (entrance=*) auf dieser Kante bevorzugen
    A = P[j]; B = P[(j + 1) % len(P)]
    for (ex, ez, ek) in [q for gx in (-1, 0, 1) for gz in (-1, 0, 1) for q in egrid.get((int(px // 20) + gx, int(pz // 20) + gz), [])]:
        dx, dz = B[0] - A[0], B[1] - A[1]
        f = ((ex - A[0]) * dx + (ez - A[1]) * dz) / (L * L)
        dl = abs((ex - A[0]) * (-dz) + (ez - A[1]) * dx) / L
        if 0.05 < f < 0.95 and dl < 0.8 and math.hypot(ex - s['x'], ez - s['z']) < 16:
            px, pz = A[0] + dx * f, A[1] + dz * f; break
    # Abstand zu bereits vergebenen Türen
    if any(math.hypot(px - ux, pz - uz) < 2.6 for ux, uz in used_doors):
        ok = False
        for sh in (3, -3, 6, -6, 9, -9):
            qx, qz = px + (B[0] - A[0]) / L * sh, pz + (B[1] - A[1]) / L * sh
            f = ((qx - A[0]) * (B[0] - A[0]) + (qz - A[1]) * (B[1] - A[1])) / (L * L)
            if 1.4 / L < f < 1 - 1.4 / L and not any(math.hypot(qx - ux, qz - uz) < 2.6 for ux, uz in used_doors):
                px, pz = qx, qz; ok = True; break
        if not ok: continue
    used_doors.append((px, pz))
    face = math.atan2(nx, nz)  # Drehung um y, Blickrichtung nach außen (+z lokal = Normale)
    S_OUT.append([int(round(px * 10)), int(round(pz * 10)), int(round(face * 1000)), s['cat'], name_idx(s['name']), name_idx(s['kind']), int(round(L * 10)), bpolys[host][1]['id'] % 100000])

# ------------------------------------------------------------ Benannte Orte
def find(nm, pred=lambda t: True, near=None):
    cands = []
    for e in E:
        t = e.get('tags', {})
        n = t.get('name', '')
        if (n == nm or (len(nm) > 8 and n.startswith(nm))) and pred(t):
            c = None
            if e['type'] == 'node': c = (X(e['lon']), Z(e['lat']))
            elif e.get('geometry'):
                P = geom(e); c = centroid(P[:-1] if P[0] == P[-1] else P)
            else:
                g = [(X(p['lon']), Z(p['lat'])) for m in e.get('members', []) for p in (m.get('geometry') or [])]
                if g: c = (sum(p[0] for p in g) / len(g), sum(p[1] for p in g) / len(g))
            if c: cands.append(c)
    if not cands: return None
    if near: cands.sort(key=lambda c: (c[0]-near[0])**2 + (c[1]-near[1])**2)
    return cands[0]
NEAR_PL = {'dom': (0, 0), 'stephan': (-367, 348), 'christus': (-535, -950), 'schloss': (-272, -891), 'theater': (-203, -71), 'rathaus': (174, -189), 'reduit': (593, -808), 'johannis': (-150, -60)}
PL = {}
for key, nm, pred in [
    ('dom', 'Hoher Dom St. Martin', lambda t: 'building' in t),
    ('stephan', 'Sankt Stephan', lambda t: 'building' in t),
    ('christus', 'Christuskirche', lambda t: 'building' in t),
    ('schloss', 'Kurfürstliches Schloss', lambda t: 'building' in t),
    ('theater', 'Staatstheater', lambda t: 'building' in t),
    ('holzturm', 'Holzturm', lambda t: True),
    ('eisenturm', 'Eisenturm', lambda t: True),
    ('rathaus', 'Rathaus', lambda t: 'building' in t),
    ('rheingold', 'Rheingoldhalle', lambda t: True),
    ('deutschhaus', 'Deutschhaus', lambda t: True),
    ('polizei', 'Polizeiinspektion Mainz 1', lambda t: True),
    ('fastnacht', 'Fastnachtsbrunnen', lambda t: True),
    ('heunen', 'Heunensäule', lambda t: True),
    ('gutdenk', 'Gutenberg-Denkmal', lambda t: True),
    ('reduit', 'Reduit', lambda t: 'building' in t or 'historic' in t),
    ('johannis', 'Alter Dom St. Johannis', lambda t: True),
    ('drusus', 'Drususstein', lambda t: True),
    ('rtheater', 'Römisches Theater', lambda t: True),
    ('gutmus', 'Gutenberg-Museum', lambda t: True),
    ('proviant', 'Proviant-Magazin', lambda t: True),
    ('fischtor', 'Fischtor', lambda t: True),
    ('kupferberg', 'Kupferberg-Museum', lambda t: True),
]:
    nr = NEAR_PL.get(key, (0, 0))
    c = find(nm, pred, nr) or find(nm, near=nr)
    if c and (c[0]-nr[0])**2 + (c[1]-nr[1])**2 > 1500**2: c = None
    if c: PL[key] = [round(c[0], 1), round(c[1], 1)]
    else: print('nicht gefunden', nm, file=sys.stderr)

# Hauptgebäude-Footprints für Wahrzeichen (Ausrichtung) und ihre OSM-IDs
LM_IDS = {}
for key, nm in [('dom', 'Hoher Dom St. Martin'), ('christus', 'Christuskirche'), ('stephan', 'Sankt Stephan'), ('holzturm', 'Holzturm'), ('eisenturm', 'Eisenturm')]:
    nr = NEAR_PL.get(key, PL.get(key, (0, 0)))
    for e in sorted([e for e in E if e.get('geometry') and 'building' in e.get('tags', {}) and (e['tags'].get('name', '') == nm or e['tags'].get('name', '').startswith(nm))], key=lambda e: (X(e['geometry'][0]['lon'])-nr[0])**2 + (Z(e['geometry'][0]['lat'])-nr[1])**2):
        t = e.get('tags', {})
        if True:
            P = geom(e)[:-1]
            # Hauptachse
            cx, cz = centroid(P)
            sxx = sum((p[0] - cx) ** 2 for p in P); szz = sum((p[1] - cz) ** 2 for p in P); sxz = sum((p[0] - cx) * (p[1] - cz) for p in P)
            ang = 0.5 * math.atan2(2 * sxz, sxx - szz)
            xs = [p[0] for p in P]; zs = [p[1] for p in P]
            LM_IDS[key] = {'id': e['id'], 'c': [round(cx, 1), round(cz, 1)], 'axis': round(ang, 4), 'bbox': [round(min(xs)), round(min(zs)), round(max(xs)), round(max(zs))]}
            break

ZITA = None
for e in E:
    t = e.get('tags', {})
    if e['type'] == 'way' and t.get('historic') == 'fort' and e.get('geometry'):
        ZITA = enc_ring(simplify_ring(geom(e)[:-1], 0.5)); print('Fort', t.get('name'), len(e['geometry']))
mb = [e for e in E if e['type'] == 'node' and e.get('tags', {}).get('name') == 'Marktbrunnen']
if mb: PL['marktbrunnen'] = [round(X(mb[0]['lon']), 1), round(Z(mb[0]['lat']), 1)]
PLACES = []
for e in E:
    t = e.get('tags', {})
    if e['type'] == 'node' and t.get('place') in ('suburb', 'quarter', 'neighbourhood', 'village', 'town') and t.get('name'):
        x, z = X(e['lon']), Z(e['lat'])
        if inmap(x, z, 300): PLACES.append([t['name'], t['place'], round(x), round(z)])
# Wiesbaden: Präfix + Dichterviertel aus Straßennamen
POETS = ('Goethestraße','Schillerplatz','Schillerstraße','Lessingstraße','Uhlandstraße','Herderstraße','Kleiststraße','Mörikestraße','Wielandstraße','Klopstockstraße','Hölderlinstraße','Lenaustraße','Gutzkowstraße','Freytagstraße','Gustav-Freytag-Straße')
pts = []
for e in E:
    t = e.get('tags', {})
    if e['type'] == 'way' and t.get('highway') and t.get('name') in POETS and e.get('geometry'):
        g = e['geometry']; x = sum(X(p['lon']) for p in g) / len(g); z = sum(Z(p['lat']) for p in g) / len(g)
        if z < -6000: pts.append((x, z))
if len(pts) >= 3:
    PLACES.append(['Dichterviertel', 'quarter', round(sum(p[0] for p in pts) / len(pts)), round(sum(p[1] for p in pts) / len(pts))])
    print('Dichterviertel aus', len(pts), 'Straßen', file=sys.stderr)
for P in PLACES:
    if P[3] < -4450 and not P[0].startswith('Mainz') and not P[0].startswith('Wiesbaden') and P[0] != 'Dichterviertel':
        P[0] = 'Wiesbaden-' + ('Innenstadt' if P[0] == 'Mitte' else P[0])
if 'rathaus' not in PL: PL['rathaus'] = [174.1, -189.3]
print('Orte', [p[0] for p in PLACES if p[1] in ('suburb', 'quarter', 'village', 'town')])
data = {
    'names': NAMES, 'cols': COLS, 'cats': CATNAMES,
    'nodes': [v for p in NODES_OUT for v in p],
    'roads': R_OUT, 'b': B_OUT, 'water': W_OUT, 'pond': small_water, 'areas': A_OUT, 'rail': RAIL_OUT,
    'trees': trees, 'lamps': lamps, 'signals': signals, 'stops': stops, 'benches': benches, 'bins': bins, 'fountains': fountains, 'crossings': crossings,
    'bounds': [MINX, MINZ, WW, WH], 'shops': S_OUT, 'zita': ZITA, 'places': PLACES, 'rhine': enc_ring(RHINE), 'pl': PL, 'lm': LM_IDS,
}
js = 'const OSM=' + json.dumps(data, separators=(',', ':'), ensure_ascii=False) + ';\n'
open(OUT, 'w').write(js)
print('Gebäude', len(B_OUT), 'Straßen', len(R_OUT), 'Knoten', len(NODES_OUT), 'Flächen', len(A_OUT), 'Schienen', len(RAIL_OUT), 'Bäume', len(trees) // 3,
      'Laternen', len(lamps) // 2, 'Geschäfte', len(S_OUT), 'von', len(shops), 'Wasser', len(W_OUT['o']), len(W_OUT['i']), 'Größe', len(js) // 1024, 'KB')
print(PL); print(LM_IDS); print('Rhein', len(RHINE), [tuple(round(v) for v in p) for p in RHINE[::8]])
