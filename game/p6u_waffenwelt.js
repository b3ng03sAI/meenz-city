// ===================== WAFFENVERSTECKE IN DER GANZEN WELT (Paket „Viel mehr Waffen zum Einsammeln“) =====================
// Rund 300 Waffenverstecke in Mainz und Wiesbaden: Sackgassen, Hinterhöfe, Parks, Parkplätze, Baustellen, Gleise, Rheinufer,
// Häfen, Flugplatz, unter Brücken und auf Dächern (Jetpack) – dazu gut 20 Geheimverstecke mit den schweren Waffen.
// Die Verstecke werden beim Boot einmal aus den Spieldaten berechnet (eigener Zufallsstrom, nie Math.random) und sind bis
// dahin nur Zahlen. Meshes gibt es nur in Spielernähe: unter rIn (120 m) wird ein Versteck „lebendig“, über rOut (180 m)
// wieder nicht. Gezeichnet wird je Waffenart EIN InstancedMesh (geteilte WGEO/WMAT) plus EIN Points-Objekt für den Schein –
// also höchstens (Arten in der Nähe + 1) Draw-Calls, gedeckelt auf maxKinds + 1 = 15. Manche Verstecke sind kleine Lager mit
// 2–3 Teilen (z. B. Pistole + Munitionskiste), Geheimverstecke immer schwere Waffe + Munition + Weste; ein Versteck wird als
// Ganzes eingesammelt. Die alten Pickups (PICKUPS, p4d_world.js/p4z_waffen.js) und Missions-Pickups bleiben unberührt.
// Seltenheit: Nahkampf (Schläger, Messer) und Pistole überall; MP/Schrotflinte/Kettensäge nur in rauen Ecken (Industrie,
// Häfen, Gleise, Baustellen, Brücken, Flugplatz, raue Stadtteile); Sturmgewehr/Scharfschützengewehr/Molotow/Granate selten;
// Minigun/Flammenwerfer/Raketenwerfer nur in Geheimverstecken. Dazu Schutzwesten und Munitionskisten.
// Nachschub: ein geleertes Versteck füllt sich nach 5 min Spielzeit wieder (Geheimversteck nach 15 min).
const WWELT={spots:[],live:[],found:new Set(),rIn:120,rOut:180,respawn:300,respawnSecret:900,gap:45,gapCore:22,target:320,lazyMin:2,distMin:3,
  scanT:0,cap:LOWMEM?12:16,maxKinds:14,glowCap:64,gfx:null,instN:{},glowN:0,stats:{collected:0,lives:0,settles:0,moved:0,scans:0},
  noAmmoT:0,lastHint:'',bootMs:0,api:null};

const WW_SAY={bat:'Ei, e Baseballschläger!',messer:'Ei guck emol, e Messer!',pistol:'Ei, do leit e Pistol!',smg:'Allmächd, e Maschinepistol!',
  shotgun:'Ui, e Schrotflint!',saege:'Uff de Baustell vergesse: e Kettesäch!',rifle:'Jesses, e Sturmgewehr!',scharf:'Ei verbibbsch, e Scharfschützegewehr!',
  molotov:'E Molotowcocktail – des is kaan Schoppe!',grenade:'Obacht, e Granat!',minigun:'Ach du liewer Gott, e Minigun!',
  flammen:'Heiß wie de Rosenmontagszug: e Flammewerfer!',rpg:'Allmächd, e Raketewerfer!',armor:'Ei, e Schutzwest – die zieh ich aa!',
  ammo:'E Kist Munition – des langt e Weil!'};
const WW_TIER={bat:'common',messer:'common',pistol:'common',armor:'common',ammo:'common',smg:'rough',shotgun:'rough',saege:'rough',
  rifle:'rare',scharf:'rare',molotov:'rare',grenade:'rare',minigun:'heavy',flammen:'heavy',rpg:'heavy'};
const WW_HEAVY=['rpg','minigun','flammen'];
// Gewichte je Umgebung (ohne schwere Waffen – die gibt es nur in Geheimverstecken)
const WW_W={
  normal:{bat:24,messer:18,pistol:30,armor:9,ammo:10,rifle:2,scharf:1,molotov:3,grenade:3},
  rough:{bat:10,messer:9,pistol:18,smg:18,shotgun:15,armor:8,ammo:10,rifle:4,scharf:2,molotov:3,grenade:3},
  bau:{bat:8,messer:6,pistol:12,smg:10,shotgun:8,saege:14,armor:8,ammo:8,rifle:3,molotov:4,grenade:3},
  dach:{pistol:10,rifle:6,scharf:8,grenade:5,molotov:4,armor:6,ammo:6}};
const WW_ROUGH_CAT={baustelle:1,bahn:1,hafen:1,flugplatz:1,bruecke:1};
const WW_CORE=/^(Altstadt|Innenstadt|Neustadt|Hauptbahnhof|Oberstadt|Zitadelle|Bleichenviertel|Mainz-Kastel|Wiesbaden-Innenstadt|Wiesbaden-Westend|Dichterviertel|Wiesbaden-Südost|Wiesbaden-Biebrich)$/;
const WW_ROUGH=/Zollhafen|Mombach|Amöneburg|Kastel|Kostheim|Biebrich|Schierstein|Hauptbahnhof|Neustadt|Westend|Erbenheim/;
const WW_CATNAME={gasse:'Hinnergass',hinterhof:'Hinnerhof',park:'Park',parkplatz:'Parkplatz',baustelle:'Baustell',bahn:'Gleisvorfeld',
  rheinufer:'Rheiufer',hafen:'Hafe',flugplatz:'Flugplatz',bruecke:'unner de Brück',dach:'Dach',geheim:'Geheimversteck'};
// Obergrenzen je Kategorie in der Auffüllrunde
const WW_CAP={gasse:90,hinterhof:90,park:60,parkplatz:45,baustelle:22,bahn:16,rheinufer:28,hafen:20,flugplatz:6,bruecke:6,dach:18};
const WW_RR=['gasse','hinterhof','park','parkplatz','rheinufer','gasse','hinterhof','baustelle','bahn','dach','hafen','park','parkplatz','flugplatz','bruecke'];

// ---------- Ortssuche (rein, deterministisch) ----------
function wwInRoom(x,z){return x>ROOM_X0-200&&z<ROOM_Z+200;}
function wwLand(x,z,under){const i=idx(x,z);if(i<0||wwInRoom(x,z))return false;if(mfG(i)&4)return false;return !blocked(x,z,under?0:undefined);}
// flaches Dach (Jetpack): Höhe 7–45 m, im Umkreis von 2,5 m überall gleich hoch
function wwRoofAt(x,z){const v=gridH(x,z);if(v<7||v>45)return 0;for(const [a,b] of [[2.5,0],[-2.5,0],[0,2.5],[0,-2.5]])if(gridH(x+a,z+b)!==v)return 0;return v;}
function wwRoofNear(x,z,R){for(let r=0;r<=R;r+=4){const n=r?Math.max(8,Math.round(r*TAU/5)):1;for(let k=0;k<n;k++){const a=k/n*TAU,px=x+Math.sin(a)*r,pz=z+Math.cos(a)*r;
  const v=wwRoofAt(px,pz);if(v)return {x:px,z:pz,ry:v};}}return null;}
// unter der Brücke: erster Punkt vom Brückenende her mit Land darunter und Deck ≥ 5 m darüber
function wwUnderBridge(br,end){if(!br)return null;for(let k=0;k*6<br.L;k++){const t=end?br.L-k*6:k*6;const x=br.A[0]+br.U[0]*t,z=br.A[1]+br.U[1]*t;
  if(deckY(t,br)<5)continue;if(!wwLand(x,z,true))continue;return {x,z,under:true};}return null;}
function wwAreaNear(kinds,x,z,R,largest){let best=null,bv=largest?0:1e18;for(const a of AREAS){if(!kinds.includes(a.kind))continue;const p=a.poly[0];if(Math.abs(p[0]-x)>R+800||Math.abs(p[1]-z)>R+800)continue;
  const c=polyCentroid(a.poly);const d=Math.hypot(c[0]-x,c[1]-z);if(d>R)continue;const v=largest?Math.abs(polyArea(a.poly)):d;if(largest?v>bv:v<bv){bv=v;best=c;}}return best;}
function wwPlaceNear(re,dx,dz){const p=PLACES.find(q=>re.test(q.name));return p?[p.x+dx,p.z+dz]:null;}
// Geheimverstecke (handverteilt; schwere Waffen reihum)
const WW_SECRET=[
  ['Zitadelle, hinner de Bastion',()=>[POI.zitadelle[0]-70,POI.zitadelle[1]+45]],
  ['Reduit-Keller',()=>[POI.reduit[0]+35,POI.reduit[1]-25]],
  ['Zollhafe-Kran',()=>[POI.zollhafen[0]-60,POI.zollhafen[1]-90]],
  ['Winterhafe-Mole',()=>[POI.winterhafen[0]+70,POI.winterhafen[1]+50]],
  ['Flugplatz-Hangar',()=>POI.flugplatz?[POI.flugplatz[0]+90,POI.flugplatz[1]-40]:null],
  ['Unner de Theodor-Heuss-Brück (Meenzer Seit)',()=>wwUnderBridge(BRIDGES[0],0)],
  ['Unner de Theodor-Heuss-Brück (Kastel)',()=>wwUnderBridge(BRIDGES[0],1)],
  ['Unner de Schiersteiner Brück',()=>wwUnderBridge(BRIDGES[1],0)],
  ['Unner de Schiersteiner Brück (anner Seit)',()=>wwUnderBridge(BRIDGES[1],1)],
  ['Kupferberg-Keller',()=>[POI.kupferberg[0]-30,POI.kupferberg[1]+25]],
  ['Volkspark-Gebüsch',()=>wwAreaNear(['park','forest'],-644,1657,500,true)||[-644,1657]],
  ['Steinbruch Weisenau',()=>wwPlaceNear(/Weisenau/,350,250)],
  ['Lennebergwald',()=>wwAreaNear(['forest'],-4465,-1083,2500,true)],
  ['Amöneburger Werksgelände',()=>wwPlaceNear(/Amöneburg/,-160,-120)],
  ['Biebricher Schlosspark',()=>wwAreaNear(['park'],-2790,-4303,600,true)||[-2790,-4303]],
  ['Kurpark Wissbaade',()=>wwAreaNear(['park'],-1874,-9663,500,true)||[-1700,-9663]],
  ['Neroberg',()=>wwAreaNear(['forest'],-2100,-10500,1400,true)],
  ['Gleisvorfeld Wissbaade Hbf',()=>wwAreaNear(['rail'],-2175,-7951,1200,false)],
  ['Maaraue',()=>wwAreaNear(['park','grass','forest','pitch'],2300,-150,900,true)],
  ['Schiersteiner Hafe',()=>wwPlaceNear(/Schierstein/,60,250)],
  ['Mombacher Industriegebiet',()=>wwAreaNear(['construction','rail','parking'],-3539,-2144,900,false)],
  ['Dach vom Hauptbahnhof',()=>wwRoofNear(POI.hbf[0],POI.hbf[1],140)],
  ['Dach in de Altstadt',()=>wwRoofNear(60,178,160)],
  ['Dach in Wissbaade',()=>wwRoofNear(-1838,-9318,220)],
  ['Uni-Dach',()=>wwRoofNear(-2430,760,240)]];

function wwShuffle(a,R){for(let k=a.length-1;k>0;k--){const j=Math.floor(R()*(k+1));const t=a[k];a[k]=a[j];a[j]=t;}return a;}
function wwPick(w,R){let s=0;for(const k in w)s+=w[k];let r=R()*s;for(const k in w){r-=w[k];if(r<0)return k;}return 'pistol';}

// Kandidaten aus den Spieldaten: {x,z,cat,roof?,ry?,under?}
function wwCandidates(R){const C={gasse:[],hinterhof:[],park:[],parkplatz:[],baustelle:[],bahn:[],rheinufer:[],hafen:[],flugplatz:[],bruecke:[],dach:[]};
  for(const N of NODES){if(N.e.length!==1||EDGES[N.e[0]].road.type==='main')continue;if(R()<0.13)C.gasse.push({x:N.x,z:N.z,cat:'gasse'});}
  for(let k=Math.floor(R()*23);k<BUILDINGS.length;k+=23){const b=BUILDINGS[k];if(b&&Number.isFinite(b.x))C.hinterhof.push({x:b.x,z:b.z,cat:'hinterhof'});}
  for(let k=Math.floor(R()*41);k<BUILDINGS.length;k+=41){const b=BUILDINGS[k];if(!b||!Number.isFinite(b.x))continue;const v=wwRoofAt(b.x,b.z);if(v)C.dach.push({x:b.x,z:b.z,cat:'dach',roof:true,ry:v});}
  for(const a of AREAS){const k=a.kind;let cat=null;
    if(k==='park'||k==='forest'||k==='playground'||k==='cemetery'||k==='pitch')cat=Math.abs(polyArea(a.poly))>800?'park':null;
    else if(k==='grass'||k==='garden')cat=Math.abs(polyArea(a.poly))>5000?'park':null;
    else if(k==='parking')cat='parkplatz';else if(k==='construction')cat='baustelle';else if(k==='rail')cat='bahn';
    if(!cat)continue;const c=polyCentroid(a.poly);C[cat].push({x:c[0],z:c[1],cat});}
  // Rheinufer: alle ~220 m vom Strom aus nach links und rechts bis an Land
  {let acc=1e9;for(let i=1;i<RHINE_LINE.length;i++){const a=RHINE_LINE[i-1],b=RHINE_LINE[i];acc+=Math.hypot(b[0]-a[0],b[1]-a[1]);if(acc<220)continue;acc=0;
    const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1,nx=-dz/l,nz=dx/l;
    for(const s of [-1,1])for(let d=15;d<900;d+=15){const x=b[0]+nx*s*d,z=b[1]+nz*s*d;const j=idx(x,z);if(j<0)break;if(mfG(j)&4)continue;
      C.rheinufer.push({x:x+nx*s*12,z:z+nz*s*12,cat:'rheinufer'});break;}}}
  const ring=(cx,cz,radii,cat)=>{for(const r of radii)for(let k=0;k<8;k++){const a=k/8*TAU+r*0.01;C[cat].push({x:cx+Math.sin(a)*r,z:cz+Math.cos(a)*r,cat});}};
  for(const p of [POI.zollhafen,POI.winterhafen,POI.reduit,wwPlaceNear(/Amöneburg/,0,0),wwPlaceNear(/Schierstein/,0,200),wwPlaceNear(/Biebrich/,0,250)])if(p)ring(p[0],p[1],[60,120,180,240],'hafen');
  if(POI.flugplatz)ring(POI.flugplatz[0],POI.flugplatz[1],[70,150,230],'flugplatz');
  for(const br of BRIDGES)for(const e of [0,1]){const u=wwUnderBridge(br,e);if(u)C.bruecke.push(Object.assign(u,{cat:'bruecke'}));}
  for(const k in C)wwShuffle(C[k],R);
  return C;}

// Sperrpunkte: Missionsstarts, POIs, Stadtteilmitten, Lazy-Zonen, alte Pickups, Schoppen, Leihrad-Stationen (Teleportziele in
// Tests und Spiel – dort soll niemand ungewollt eine Waffe aufsammeln)
function wwBlockers(){const L=[];const add=p=>{if(p&&Number.isFinite(p[0])&&Number.isFinite(p[1]))L.push(p);};
  for(const k in POI)add(POI[k]);for(const p of PLACES)add([p.x,p.z]);for(const Z of LAZY.zones)add([Z.x,Z.z]);
  for(const m of MISSIONS)if(m.start)add(m.start);for(const p of PICKUPS)add([p.x,p.z]);for(const s of SCHOPPEN)add([s.x,s.z]);
  if(typeof LEIH!=='undefined')for(const s of LEIH.stations)add([s.x,s.z]);return L;}

// Verstecke berechnen (ohne Meshes, ohne globalen Zufall): [{i,x,z,cat,dist,rough,secret,name,kind,roof,ry,under}]
function wwPlace(){const R=mulberry32(lazySeed('waffenwelt'));const C=wwCandidates(R);const BL=wwBlockers();const out=[];const grid=new Map();
  const cell=(x,z)=>Math.floor(x/50)+','+Math.floor(z/50);
  const free=(x,z,gap)=>{for(const p of BL)if(Math.abs(p[0]-x)<25&&Math.abs(p[1]-z)<25&&Math.hypot(p[0]-x,p[1]-z)<25)return false;
    const cx=Math.floor(x/50),cz=Math.floor(z/50);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const l=grid.get((cx+a)+','+(cz+b));if(l)for(const s of l)if(Math.hypot(s.x-x,s.z-z)<gap)return false;}return true;};
  const take=(c,o={})=>{if(!c||c.used)return null;c.used=true;let x=c.x,z=c.z;
    if(!Number.isFinite(x)||!Number.isFinite(z))return null;
    if(c.roof){if(wwRoofAt(x,z)!==c.ry)return null;}
    else if(!wwLand(x,z,c.under)){if(c.under)return null;[x,z]=freeSpot(x,z,0.4);if(!wwLand(x,z,false))return null;}
    if(!free(x,z,o.gap||(WW_CORE.test(c.dist||'')?WWELT.gapCore:WWELT.gap)))return null;
    const dist=districtAt(x,z);const s={i:out.length,x,z,cat:o.cat||c.cat,dist,rough:!!(WW_ROUGH_CAT[c.cat]||WW_ROUGH.test(dist)),secret:!!o.secret,name:o.name||'',
      kind:o.kind||null,single:!!o.single,roof:!!c.roof,ry:c.roof?c.ry:null,under:!!c.under};
    out.push(s);const k=cell(x,z);if(!grid.has(k))grid.set(k,[]);grid.get(k).push(s);return s;};
  // 0) Geheimverstecke
  let h=0;for(const [name,fn] of WW_SECRET){let p=fn();if(!p)continue;if(Array.isArray(p))p={x:p[0],z:p[1]};
    if(take(Object.assign({},p,{cat:p.roof||p.ry?'dach':p.under?'bruecke':'geheim',roof:!!p.ry}),{secret:true,name,cat:'geheim',kind:WW_HEAVY[h%3],gap:60}))h++;}
  // 0b) ein Schläger in Sichtweite des Startpunkts (hinter dem Spieler, der nach Osten schaut) – zeigt, dass es Verstecke gibt
  for(const [dx,dz] of [[-40,-18],[-40,18],[-30,-35]])if(take({x:POI.start[0]+dx,z:POI.start[1]+dz,cat:'gasse'},{kind:'bat',single:true,gap:30}))break;
  const all=[];for(const k in C)for(const c of C[k])all.push(c);wwShuffle(all,R);
  // 1) jede Lazy-Zone (Stadtteile, die erst in der Nähe gebaut werden) bekommt ihre Verstecke
  for(const Z of LAZY.zones){let n=out.filter(s=>Math.hypot(s.x-Z.x,s.z-Z.z)<450).length;
    for(const c of all){if(n>=WWELT.lazyMin)break;if(!c.used&&Math.hypot(c.x-Z.x,c.z-Z.z)<420&&take(c))n++;}}
  // 2) jeder Stadtteil (districtAt) mindestens distMin Verstecke
  for(const c of all)c.dist=districtAt(c.x,c.z);
  const byDist=new Map();for(const c of all){if(c.used)continue;if(!byDist.has(c.dist))byDist.set(c.dist,[]);byDist.get(c.dist).push(c);}
  for(const [d,list] of byDist){let n=out.filter(s=>s.dist===d).length;for(const c of list){if(n>=WWELT.distMin)break;const s=take(c);if(s&&s.dist===d)n++;}}
  // 2b) jedes Revier (p5m_revier.js) mindestens ein Versteck in seinen Zellen
  if(REVIER.grid)for(const zone of REVIER.zones){if(out.some(s=>revierZoneAt(s.x,s.z)===zone))continue;let ok=false;
    for(const c of all){if(c.used||revierZoneAt(c.x,c.z)!==zone)continue;const s=take(c);if(s&&revierZoneAt(s.x,s.z)===zone){ok=true;break;}}
    if(!ok){const p=revierSpot(zone,zone.cx,zone.cz);take({x:p[0],z:p[1],cat:'hinterhof'},{gap:20});}}
  // 3) auffüllen, reihum nach Kategorie; zwei Drittel aus der Kernstadt (dort auch dichter, 22 m), damit es dort mehr gibt, wo man spielt
  const goal=WWELT.target+h,cnt={},Q={};for(const s of out)cnt[s.cat]=(cnt[s.cat]||0)+1;
  for(const cat in C){Q[cat]=[{l:C[cat].filter(c=>WW_CORE.test(c.dist)),p:0},{l:C[cat].filter(c=>!WW_CORE.test(c.dist)),p:0}];Q[cat].t=0;}
  const next=q=>{while(q.p<q.l.length){const c=q.l[q.p++];if(take(c))return true;}return false;};
  for(let prog=true;prog&&out.length<goal;){prog=false;
    for(const cat of WW_RR){if(out.length>=goal)break;if((cnt[cat]||0)>=WW_CAP[cat])continue;const q=Q[cat];const a=q.t++%3===2?1:0;
      if(next(q[a])||next(q[1-a])){cnt[cat]=(cnt[cat]||0)+1;prog=true;}}}
  // Inhalt je Versteck: Hauptstück (kind) + in manchen Verstecken ein kleines Lager mit 2–3 Teilen; Geheimverstecke immer
  // schwere Waffe + Munition + Weste
  for(const s of out){if(s.secret){s.items=[s.kind,'ammo','armor'];continue;}
    const w=s.cat==='dach'?(s.rough?Object.assign({},WW_W.dach,{smg:6,shotgun:4}):WW_W.dach):s.cat==='baustelle'?WW_W.bau:s.rough?WW_W.rough:WW_W.normal;
    if(!s.kind)s.kind=wwPick(w,R);s.items=[s.kind];if(s.single)continue;
    if(R()<(s.rough||s.cat==='dach'?0.35:0.15)){const k2=R()<0.5?(s.kind==='ammo'?'armor':'ammo'):wwPick(w,R);if(k2!==s.kind)s.items.push(k2);
      if(R()<0.3){const k3=wwPick(w,R);if(!s.items.includes(k3))s.items.push(k3);}}}
  return out;}

// ---------- Grafik (einmal, geteilt; UUIDs aus eigenem Strom) ----------
const WW_GFX_RNG=mulberry32(lazySeed('waffenwelt-gfx'));
function wwWithRng(fn){const r=Math.random;Math.random=WW_GFX_RNG;try{return fn();}finally{Math.random=r;}}
function wwGfx(){if(WWELT.gfx)return WWELT.gfx;return wwWithRng(()=>{
  const geo={armor:new THREE.BoxGeometry(0.75,0.85,0.3),ammo:new THREE.BoxGeometry(0.7,0.4,0.45)};
  const mat={armor:stdMat({color:0x2a5ea8,emissive:0x0c2244}),ammo:stdMat({color:0x5b6b2f,emissive:0x2a2a08,roughness:0.6})};
  const n=WWELT.glowCap;const gpos=new Float32Array(n*3),gcol=new Float32Array(n*3);const gg=new THREE.BufferGeometry();
  const pa=new THREE.BufferAttribute(gpos,3),ca=new THREE.BufferAttribute(gcol,3);gg.setAttribute('position',pa);gg.setAttribute('color',ca);gg.setDrawRange(0,0);
  const glow=new THREE.Points(gg,new THREE.PointsMaterial({map:puffTex,size:2.2,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:0.5,blending:THREE.AdditiveBlending,depthWrite:false}));
  glow.frustumCulled=false;glow.visible=false;scene.add(glow);
  WWELT.gfx={geo,mat,inst:{},glow,gpos,gcol,pa,ca,m4:new THREE.Matrix4(),v3:new THREE.Vector3()};return WWELT.gfx;});}
function wwInst(kind){const G=wwGfx();if(G.inst[kind])return G.inst[kind];return wwWithRng(()=>{
  const m=new THREE.InstancedMesh(G.geo[kind]||WGEO[kind],G.mat[kind]||WMAT[kind],WWELT.cap);m.count=0;m.frustumCulled=false;m.castShadow=false;m.visible=false;scene.add(m);
  G.inst[kind]=m;return m;});}

// ---------- Aufbau ----------
function setupWaffenwelt(){const t=performance.now();
  WWELT.spots=wwPlace().map(s=>Object.assign(s,{active:true,t:0,live:false,y:0,lives:0}));
  for(const s of WWELT.spots)s.y=wwY(s);
  WWELT.bootMs=performance.now()-t;}
function wwY(s){return s.roof?s.ry:s.under?groundY(s.x,s.z,0):groundY(s.x,s.z);}
// Beim Lebendigwerden nachprüfen: Lazy-Stadtteile schreiben ihre Kollision erst beim Bau ins Raster
function wwSettle(s){WWELT.stats.settles++;
  if(s.roof){if(wwRoofAt(s.x,s.z)!==s.ry){s.roof=false;s.ry=null;}else{s.y=s.ry;return;}}
  if(blocked(s.x,s.z,s.under?0:undefined)){const [x,z]=freeSpot(s.x,s.z,0.4);if(x!==s.x||z!==s.z){s.x=x;s.z=z;WWELT.stats.moved++;}}
  s.y=wwY(s);}

// ---------- Nähe: lebendige Verstecke ----------
function wwScan(){const S=WWELT;S.stats.scans++;const pts=[];for(const P of PLAYERS)if(P.h)pts.push(ppos(P));const live=[];
  for(const s of S.spots){let d=1e9;for(const p of pts){const e=Math.hypot(s.x-p[0],s.z-p[1]);if(e<d)d=e;}
    const on=d<S.rIn||(s.live&&d<S.rOut);if(on&&!s.live){s.lives++;S.stats.lives++;wwSettle(s);}s.live=on;if(on)live.push(s);}
  S.live=live;}
function wwGlowCol(s,k){return s.secret?[1,0.69,0.19]:k==='armor'?[0.35,0.66,1]:k==='ammo'?[1,0.82,0.38]:WW_TIER[k]==='rare'?[1,0.55,0.4]:[1,1,1];}
// Instanzen für alle lebendigen, gefüllten Verstecke (drehend, schwebend)
function wwSync(){const S=WWELT;const want=S.live.some(s=>s.active);if(!want&&!S.gfx)return;const G=wwGfx();const m4=G.m4,v3=G.v3;const n={};let g=0;
  for(const s of S.live){if(!s.active)continue;const L=s.items.length;
    for(let j=0;j<L;j++){const k=s.items[j];const c=n[k]||0;if(c>=S.cap||(!c&&Object.keys(n).length>=S.maxKinds))continue;const M=wwInst(k);
      const a=j/L*TAU+s.i,r=L>1?1.2:0,x=s.x+Math.sin(a)*r,z=s.z+Math.cos(a)*r;
      const sc=(k==='armor'||k==='ammo')?1:2.2;const y=s.y+0.9+Math.sin(simTime*2.5+s.i+j)*0.12;
      m4.makeRotationY(simTime*2+s.i+j);m4.scale(v3.set(sc,sc,sc));m4.setPosition(x,y,z);M.setMatrixAt(c,m4);n[k]=c+1;
      if(g<S.glowCap){G.gpos[g*3]=x;G.gpos[g*3+1]=y;G.gpos[g*3+2]=z;const col=wwGlowCol(s,k);G.gcol[g*3]=col[0];G.gcol[g*3+1]=col[1];G.gcol[g*3+2]=col[2];g++;}}}
  for(const k in G.inst){const M=G.inst[k],c=n[k]||0;M.count=c;M.visible=c>0;if(c)M.instanceMatrix.needsUpdate=true;}
  G.glow.geometry.setDrawRange(0,g);G.glow.visible=g>0;if(g){G.pa.needsUpdate=true;G.ca.needsUpdate=true;}
  S.instN=n;S.glowN=g;}
function wwInstCount(){let n=0;for(const k in WWELT.instN)n+=WWELT.instN[k];return n;}
function wwDrawCalls(){let n=0;for(const k in WWELT.instN)if(WWELT.instN[k]>0)n++;return n+(WWELT.glowN>0?1:0);}

// ---------- Einsammeln ----------
function wwAmmo(P){const got=[];for(const w of WORDER){const W=WEAPONS[w];if(!P.owned[w]||W.melee)continue;giveWeapon(P,w,W.thrown?2:Math.max(12,(W.mag||1)*2));got.push(W.name);}return got;}
const WW_ORDER={ammo:1,armor:2};
function wwLabel(k){return k==='armor'?'SCHUTZWESTE':k==='ammo'?'MUNITIONSKISTE':WEAPONS[k].name;}
// ein Teil anwenden; null = passt gerade nicht (Weste voll, keine Waffe für die Munition, Nahkampfwaffe im Auto)
function wwApply(k,P){if(k==='armor'){if(P.armor>=100)return null;P.armor=100;return {k};}
  if(k==='ammo'){const got=wwAmmo(P);if(!got.length)return null;return {k,extra:got.length>2?'Munition für all dei Waffe':'Munition: '+got.join(', ')};}
  if(P.car&&WEAPONS[k].melee)return null;return {k,first:giveWeapon(P,k,PICK_WEAPON[k]||1)};}
// Waffen zuerst, dann Munition (passt so auch zur eben gefundenen Waffe), dann Weste
function wwCollect(s,P){const res=[];for(const k of [...s.items].sort((a,b)=>(WW_ORDER[a]||0)-(WW_ORDER[b]||0))){const r=wwApply(k,P);if(r)res.push(r);}
  if(!res.length){if(s.items.includes('ammo')&&WWELT.noAmmoT<=0){WWELT.noAmmoT=4;hint('E Kist Munition – awwer du hast jo gar kaa Waff dezu!',2.5,P);}return false;}
  const S=WWELT;s.active=false;s.t=s.secret?S.respawnSecret:S.respawn;S.stats.collected++;const isNew=!S.found.has(s.i);S.found.add(s.i);
  const main=res.find(r=>r.k===s.kind)||res[0];res.splice(res.indexOf(main),1);res.unshift(main);const first=res.some(r=>r.first);
  const parts=res.map(r=>`<b>${wwLabel(r.k)}</b>${r.extra?' ('+r.extra+')':''}`).join(' + ');
  const tail=first?' · <b>Q</b> wechselt die Waffe':res.some(r=>WEAPONS[r.k]&&!r.first)?' · Munition aufgefüllt':'';
  const head=s.secret?`<b>Geheimversteck „${s.name}“!</b> `:'';
  const text=`${head}${WW_SAY[main.k]} ${parts}${tail}<br>Waffenverstecke gefunden: ${S.found.size} / ${S.spots.length}`;
  hint(text,isNew||first?4:2.5,P);S.lastHint=text;chime(s.secret?[523,784,1046,1319]:[880,1175]);
  if(isNew&&s.secret)showBig('GEHEIMVERSTECK','win',2.5,`${s.name} · ${wwLabel(main.k)}`);
  return true;}
function wwReach(s,P){if(P.gameOver||!P.h||P.h.room||P.morph)return false;const [px,pz]=ppos(P);const py=P.car?P.car.y:P.h.y;
  return Math.hypot(px-s.x,pz-s.z)<(P.car?2.8:s.items.length>1?2.4:1.4)&&Math.abs(py-s.y)<2.5;}

// ---------- Hauptschleife ----------
function updateWaffenwelt(dt){const S=WWELT;if(!S.spots.length)return;if(S.noAmmoT>0)S.noAmmoT-=dt;
  for(const s of S.spots)if(!s.active){s.t-=dt;if(s.t<=0){s.t=0;s.active=true;}}
  S.scanT-=dt;if(S.scanT<=0||FRAMEB.jump){S.scanT=0.25;wwScan();}
  for(const s of S.live){if(!s.active)continue;for(const P of PLAYERS)if(wwReach(s,P)&&wwCollect(s,P))break;}
  wwSync();}

// ---------- Pausenmenü, Karte, Spielstand ----------
function wwCountText(){const S=WWELT;let sf=0,st=0;for(const s of S.spots)if(s.secret){st++;if(S.found.has(s.i))sf++;}
  return `Waffenverstecke gefunden: ${S.found.size} / ${S.spots.length} · Geheimverstecke: ${sf} / ${st}`;}
function wwPauseLine(){const panel=$('pause')&&$('pause').querySelector('.panel');if(!panel)return null;let el=$('wwcount');
  if(!el){el=document.createElement('p');el.id='wwcount';el.className='note';const sl=$('slots');if(sl&&sl.parentNode===panel)panel.insertBefore(el,sl);else panel.appendChild(el);}
  el.textContent=wwCountText();return el;}
const _wwPauseGame=pauseGame;
pauseGame=function(){_wwPauseGame();if(mode==='pause')wwPauseLine();};
// Geheimverstecke erscheinen auf Karte und Minimap erst, wenn sie gefunden sind; auf der Minimap zusätzlich die
// gefüllten Verstecke in Sichtweite (wie die alten Pickups)
const _wwBlipList=blipList;
blipList=function(forP){const out=_wwBlipList(forP);const S=WWELT;
  for(const i of S.found){const s=S.spots[i];if(s&&s.secret)out.push({x:s.x,z:s.z,c:s.active?'#ffb030':'#8a7a5a',r:3.5,sq:true});}
  if(forP)for(const s of S.live)if(s.active&&!s.secret)out.push({x:s.x,z:s.z,c:'#d8d8d8',r:2});
  return out;};
const _wwSnapshot=snapshot;
snapshot=function(){const d=_wwSnapshot();d.ww=[...WWELT.found];return d;};
const _wwApplySave=applySave;
applySave=function(d){const r=_wwApplySave(d);if(r){const S=WWELT;S.found=new Set((Array.isArray(d.ww)?d.ww:[]).filter(i=>Number.isInteger(i)&&i>=0&&i<S.spots.length));
  for(const s of S.spots){s.active=true;s.t=0;}}return r;};

WWELT.api={place:wwPlace,scan:wwScan,sync:wwSync,tick:dt=>updateWaffenwelt(dt),settle:wwSettle,collect:wwCollect,reach:wwReach,
  instCount:wwInstCount,drawCalls:wwDrawCalls,district:(x,z)=>districtAt(x,z),revierZoneAt:(x,z)=>{const z_=revierZoneAt(x,z);return z_?z_.id:0;},
  pauseLine:()=>{const el=wwPauseLine();return el?el.textContent:'';},countText:wwCountText,legacy:()=>PICKUPS,blips:P=>blipList(P||null),
  lazyZones:()=>LAZY.zones.map(Z=>({name:Z.name,x:Z.x,z:Z.z}))};
