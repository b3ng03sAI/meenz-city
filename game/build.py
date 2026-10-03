import sys,os
import gzip,base64
def part(f):
    t=open(f).read()
    if f=='p1_osm.js':
        j=t[t.index('{'):t.rindex('}')+1]
        b=base64.b64encode(gzip.compress(j.encode('utf-8'),9)).decode()
        return open('gunzip_small.js').read()+'const OSM=await (async()=>{const b=atob("'+b+'");const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);if(typeof DecompressionStream==="undefined")return JSON.parse(new TextDecoder().decode(gunzipSmall(u)));const r=new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream("gzip")));return JSON.parse(await r.text());})();\n'
    return t+'\n'
code=''.join(part(f) for f in ['p0_render.js','p1_osm.js','p1_data.js','p2_tex.js','p2a_mat.js','p2b_frame.js','seg_landmarks.js','seg_masks.js','p2c_city.js','seg_bld.js','seg_paint.js','seg_ships.js','seg_trees.js','seg_shops.js','p2d_gen.js','p2e_stream.js','p2f_hgcold.js','p2g_bldslim.js','p3_actors.js','p3d_autos.js','p3b_style.js','p3c_haltung.js','p4a_core.js','p4b_combat.js','p4c_player.js','p4d_world.js','p4f_social.js','p4g_markt.js','p4i_dog.js','p4j_drunk.js','p4k_engine.js','p4l_ui.js','p4m_roofs.js','p4n_trip.js','p4o_bus.js','p4p_venues.js','hbf_data.js','p4q_hbf.js','p4r_rhein.js','p4s_perf.js','p4t_dialekt.js','p4u_travel.js','p4v_powerups.js','p4w_egg.js','p4x_flug.js','p4y_wasser.js','p4z_waffen.js','p4za_ufo.js','p5_missionen.js','p5b_kart.js','p5c_rad.js','p5d_radio.js','p5e_stunt.js','p5f_gautsch.js','p5g_hubi.js','p5h_wiwahr.js','p5i_jobs.js','p5j_straba.js','p5k_rosenmo.js','p5l_nero.js','p5m_revier.js','p5n_coup.js','p5o_spielbank.js','p5p_sbahn.js','p6_lazy.js','p6a_altst.js','p6b_neust.js','p6c_oberst.js','p6d_bretz.js','p6e_gons.js','p6f_momb.js','p6g_weis.js','p6h_eich.js','p6i_sprung.js','p6j_oma.js','p6k_nessie.js','p6l_jga.js','p6m_touch.js','p6n_intro.js','p6o_mobilux.js','p6p_fahrphysik.js','p6q_theater.js','p6r_andreas.js','p6q_akk.js','p6r_wiesi.js','p6s_ruck.js','p4e_main.js'])
shell=open('shell.html').read()
# Versionsanzeige (Pausebildschirm): package.json + git-Stand; auf einem Release-Tag nur die Nummer
import json,subprocess,datetime
def meenz_version():
    v=json.load(open('../package.json'))['version']
    try:
        d=subprocess.run(['git','describe','--tags','--long','--dirty'],capture_output=True,text=True,check=True).stdout.strip()
        n=int(d.rsplit('-',3)[1]) if not d.endswith('-dirty') else int(d.rsplit('-',4)[1])
        sha=subprocess.run(['git','rev-parse','--short','HEAD'],capture_output=True,text=True,check=True).stdout.strip()
        if n==0 and not d.endswith('-dirty'): return 'Version '+v
        return f"Version {v}+{n} · Entwicklungsstand {sha}{' (geändert)' if d.endswith('-dirty') else ''} · {datetime.date.today():%d.%m.%Y}"
    except Exception:
        return 'Version '+v
MEENZ_VERSION=(os.environ.get('MEENZ_VERSION') or meenz_version()).replace('Version v','Version ')  # Pages-Workflow setzt die Tag-Version
shell=shell.replace('__MEENZ_VERSION__',MEENZ_VERSION)
print(MEENZ_VERSION)
# Cover-/Ladescreen-Bilder als data-URI einbetten (Vorschaubild beim Teilen + Splash)
for n,f in (('01','cover/01_dom_rhein.jpg'),('02','cover/02_dom_abend.jpg'),('03','cover/03_rhein_luft.jpg')):
    shell=shell.replace('/*__COVER_'+n+'__*/','data:image/jpeg;base64,'+base64.b64encode(open(f,'rb').read()).decode())
out=shell.replace('/*__GAME__*/',code)
# test variant with local stub (three-Stub, keine Schriften)
open('test.html','w').write(out.replace('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js','./three-stub.js').replace('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/','./addons/').replace('https://fonts.googleapis.com/css2','data:text/css,'))
# Release + echte Tests: three.js, Addons und Schriften eingebettet → keine Anfragen an Dritte (Security-Audit X01/X02)
import embed
if os.path.exists(embed.THREE_DIR):
    rel=embed.rewrite_shell(shell).replace('/*__GAME__*/',embed.bundle()+embed.rewrite_game(code))
    for bad in ('cdn.jsdelivr.net','fonts.googleapis.com','fonts.gstatic.com'):
        assert bad not in rel, 'Release enthält noch '+bad
    print('Release: three.js + Schriften eingebettet')
else:
    rel=out;print('WARNUNG: node_modules/three fehlt (npm install) – Release lädt three.js/Schriften per CDN')
open('meenz-city.html','w').write(rel)
open('real.html','w').write(rel)
print(len(rel))
