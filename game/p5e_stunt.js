// ===================== 24 STUNTSPRÜNGE =====================
// 20 versteckte Rampen (Rheinufer, Zitadelle, Brückenauffahrten, Parkplätze, Wiesbaden). Rampen sind Stufen-Funktionen
// (STEP_FNS) → befahrbar für Autos und Fußgänger. Wer mit genug Tempo oben abhebt, fliegt ballistisch (eigene
// Vertikal-Physik für Autos), Zeitlupe + Kamerafahrt; saubere Landung = Geldbonus, jeder Sprung zahlt nur einmal.
const STUNT={ramps:[],done:[],get count(){return STUNT.done.length;},TOTAL:20,last:null,slow:false,
  LEN:12,W:4.6,H:2.5,RUN:36,LAND:46,SPACING:160,
  MIN_SPEED:14,MIN_DIST:12,SLOW:0.35,SLOW_MAX:4,BONUS:300,BONUS_M:10,HARD_LAND:16,
  get timeScale(){return timeScale;}};
const STUNT_LINES={paid:['Ei Gude, wie fliegt des!','Des war net schlecht, Herr Stuntman!','Uff de Kopp gefalle bist de jedenfalls net!','Meenz bleibt Meenz – un du fliegst!'],
  again:'Den Sprung kennste schon – do gibt’s kää Geld mehr.',short:'Des war eher e Hupser als e Sprung.',crash:'Bruchlandung! Des zählt net.'};

// --- Rampen-Lookup: Rampen-Koordinaten t (entlang, 0…LEN) und l (quer) ---
function stuntLocal(R,x,z){const dx=x-R.x,dz=z-R.z;return [dx*R.dx+dz*R.dz,dx*R.rx+dz*R.rz];}
function stuntRampAt(x,z){for(const R of STUNT.ramps){const b=R.bb;if(x<b[0]||x>b[2]||z<b[1]||z>b[3])continue;
  const [t,l]=stuntLocal(R,x,z);if(t>=0&&t<=R.len&&Math.abs(l)<=R.w/2)return {R,t};}return null;}

// --- Platzsuche: freie, ebene Gerade (Anlauf + Rampe + Landezone) auf einer befahrbaren Straße ---
function stuntLineFree(x,z,dx,dz){const rx=-dz,rz=dx;const S=STUNT;
  for(let t=-S.RUN;t<=S.LEN+S.LAND;t+=2)for(const l of [-2.6,-1.3,0,1.3,2.6]){const px=x+dx*t+rx*l,pz=z+dz*t+rz*l;const i=idx(px,pz);
    if(i<0||(mfG(i)&4)||ELEV.has(i)||blocked(px,pz)||stepAt(px,pz)!==undefined||bridgeLocal(px,pz)||Math.abs(groundY(px,pz))>0.01)return false;}
  return true;}
function stuntFind(spec){const [ax,az]=spec.at;const R2=spec.r*spec.r;const cand=[];
  for(const E of EDGES){if(!(E.car||spec.ped)||E.len<6||E.road.bridge||(spec.re&&!spec.re.test(E.road.name||'')))continue;const A=NODES[E.a],B=NODES[E.b];
    const mx=(A.x+B.x)/2-ax,mz=(A.z+B.z)/2-az;if(mx*mx+mz*mz>R2)continue;
    const ux=(B.x-A.x)/E.len,uz=(B.z-A.z)/E.len;const off=E.car?clamp((E.road.w||6)/2-2.6,0,5):0;
    for(let s=0;s<=E.len;s+=8)for(const dir of (E.ow?[1]:[1,-1])){const dx=ux*dir,dz=uz*dir;const px=A.x+ux*s-dz*off,pz=A.z+uz*s+dx*off;
      cand.push([Math.hypot(px-ax,pz-az),px,pz,dx,dz]);}}
  cand.sort((a,b)=>a[0]-b[0]);
  for(const [,x,z,dx,dz] of cand.slice(0,600)){if(STUNT.ramps.some(R=>Math.hypot(R.x-x,R.z-z)<STUNT.SPACING))continue;if(stuntLineFree(x,z,dx,dz))return [x,z,dx,dz];}
  return null;}

// --- Geometrie: Keil mit Holzbohlen, Stahlwangen und gelb-schwarzer Kante (eine geteilte Geometrie, ein InstancedMesh) ---
let STUNT_GEO=null,STUNT_MAT=null;
function stuntGeo(){if(STUNT_GEO)return STUNT_GEO;const S=STUNT,L=S.LEN,W=S.W/2,H=S.H,y0=0.07;const gb=new GB();
  const wood=[{r:0.55,g:0.38,b:0.22},{r:0.47,g:0.31,b:0.18}],steel={r:0.32,g:0.34,b:0.37},yel={r:1,g:0.78,b:0.05},blk={r:0.06,g:0.06,b:0.06};
  const ref=[0,H*0.3,L*0.7];const y=z=>y0+H*z/L;const N=12;
  for(let i=0;i<N;i++){const z0=L*i/N,z1=L*(i+1)/N;gb.quadOut([-W+0.3,y(z0),z0],[W-0.3,y(z0),z0],[W-0.3,y(z1),z1],[-W+0.3,y(z1),z1],[0,0],[1,0],[1,1],[0,1],wood[i%2],ref);
    for(const s of [-1,1])gb.quadOut([s*W,y(z0),z0],[s*(W-0.3),y(z0),z0],[s*(W-0.3),y(z1),z1],[s*W,y(z1),z1],[0,0],[1,0],[1,1],[0,1],i%2?yel:blk,ref);}
  for(const s of [-1,1])gb.triOut([s*W,0,0],[s*W,0,L],[s*W,y(L),L],[0,0],[1,0],[1,1],steel,ref);
  const M=8;for(let i=0;i<M;i++){const x0=-W+2*W*i/M,x1=-W+2*W*(i+1)/M;gb.quadOut([x0,0,L],[x1,0,L],[x1,y(L),L],[x0,y(L),L],[0,0],[1,0],[1,1],[0,1],i%2?yel:blk,ref);}
  STUNT_GEO=gb.geo();STUNT_MAT=stdMat({vertexColors:true,roughness:0.8,metalness:0.1});return STUNT_GEO;}

// --- Rampe registrieren: Stufen-Funktion (befahrbar), Bounding-Box für stepAt ---
function stuntAddRamp(id,name,x,z,dx,dz){const S=STUNT;const R={id,name,x,z,dx,dz,rx:-dz,rz:dx,h:Math.atan2(dx,dz),len:S.LEN,w:S.W,H:S.H,k:S.H/S.LEN,y:0};
  const ex=[x,x+dx*S.LEN],ez=[z,z+dz*S.LEN];const p=S.W/2+0.5;R.bb=[Math.min(...ex)-p,Math.min(...ez)-p,Math.max(...ex)+p,Math.max(...ez)+p];
  STEP_FNS.push({bb:R.bb,f:(px,pz)=>{const [t,l]=stuntLocal(R,px,pz);return t>=0&&t<=R.len&&Math.abs(l)<=R.w/2?R.y+0.07+R.k*t:undefined;}});
  STEP_BB[0]=Math.min(STEP_BB[0],R.bb[0]);STEP_BB[1]=Math.min(STEP_BB[1],R.bb[1]);STEP_BB[2]=Math.max(STEP_BB[2],R.bb[2]);STEP_BB[3]=Math.max(STEP_BB[3],R.bb[3]);
  S.ramps.push(R);return R;}

function stuntSpecs(){const bh=BRIDGES.find(b=>/Theodor/.test(b.name)),bs=BRIDGES.find(b=>/Schierstein/.test(b.name));
  const bEnd=(b,e)=>b?(e?[b.A[0]+b.U[0]*(b.L+40),b.A[1]+b.U[1]*(b.L+40)]:[b.A[0]-b.U[0]*40,b.A[1]-b.U[1]*40]):null;
  const pk=AREAS.filter(a=>a.kind==='parking'&&a.poly&&a.poly.length>2).map(a=>{let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;for(const [x,z] of a.poly){x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z);}
    return {name:a.name,at:[(x0+x1)/2,(z0+z1)/2],A:(x1-x0)*(z1-z0)};}).sort((a,b)=>b.A-a.A);
  const lots=[];for(const p of pk){if(lots.length>=4)break;if(lots.every(q=>Math.hypot(q.at[0]-p.at[0],q.at[1]-p.at[1])>900))lots.push(p);}
  const wb=(re,fb)=>wbPlace(re,fb);
  return [
    {id:'adenauer',name:'Adenauer-Ufer',re:/Adenauer-Ufer/,ped:true,at:POI.rathaus,r:900},
    {id:'stresemann',name:'Stresemann-Ufer',re:/Stresemann-Ufer/,ped:true,at:POI.holzturm,r:900},
    {id:'victorhugo',name:'Victor-Hugo-Ufer',re:/Victor-Hugo-Ufer/,ped:true,at:POI.zollhafen,r:1500},
    {id:'rheinallee',name:'Rheinallee',re:/Rheinallee/,at:POI.zollhafen,r:1500},
    {id:'museumsufer',name:'Kasteler Museumsufer',re:/Kasteler Museumsufer|Rheinufer/,ped:true,at:POI.reduit,r:900},
    {id:'biebrich',name:'Biebricher Rheinufer',re:/Rheinufer|Rheingaustra|Uferstra/,ped:true,at:wb(/Biebrich/,[-2400,-2800]),r:1500},
    {id:'mainufer',name:'Mainufer Kostheim',re:/Mainufer/,ped:true,at:wb(/Kostheim/,[1800,-1200]),r:2500},
    {id:'zitadelle',name:'Zitadelle',re:/Zitadell/,at:POI.zitadelle,r:500},
    {id:'zitadelle2',name:'Zitadellengraben',at:POI.zitadelle,r:400},
    {id:'thb_mainz',name:'Theodor-Heuss-Brücke (Mainzer Auffahrt)',at:bEnd(bh,0)||POI.eisenturm,r:300},
    {id:'thb_kastel',name:'Theodor-Heuss-Brücke (Kasteler Auffahrt)',at:bEnd(bh,1)||POI.reduit,r:300},
    {id:'sb_mainz',name:'Schiersteiner Brücke (Mombacher Auffahrt)',at:bEnd(bs,0)||[-4400,-3500],r:500},
    {id:'sb_wiesbaden',name:'Schiersteiner Brücke (Schiersteiner Auffahrt)',at:bEnd(bs,1)||[-4400,-4700],r:500},
    ...lots.map((p,i)=>({id:'parkplatz'+(i+1),name:`Parkplatz ${p.name||districtAt(p.at[0],p.at[1])}`,at:p.at,r:250})),
    {id:'winterhafen',name:'Winterhafen',at:POI.winterhafen,r:400},
    {id:'wiesbaden',name:'Wiesbaden Innenstadt',at:wb(/Mitte|Wiesbaden$/,[-200,-5200]),r:700},
    {id:'schierstein',name:'Schiersteiner Hafen',at:wb(/Schierstein/,[-4000,-4300]),r:900},
    // Reserve, falls oben etwas keinen Platz findet
    {id:'hbf',name:'Hauptbahnhof',at:POI.hbf,r:500},{id:'kupferberg',name:'Kupferberg',at:POI.kupferberg,r:500},
    {id:'stephan',name:'St. Stephan',at:POI.stephan,r:500},{id:'klinik',name:'Oberstadt',at:POI.klinik,r:600},
    {id:'schloss',name:'Kurfürstliches Schloss',at:POI.schloss,r:500},{id:'gonsenheim',name:'Gonsenheim',at:wb(/Gonsenheim/,[-1800,800]),r:900}];}

function setupStunt(){const S=STUNT;
  for(const spec of stuntSpecs()){if(S.ramps.length>=S.TOTAL)break;if(!spec.at)continue;const f=stuntFind(spec);if(f)stuntAddRamp(spec.id,spec.name,...f);}
  if(!S.ramps.length)return;stuntGeo();
  const im=new THREE.InstancedMesh(STUNT_GEO,STUNT_MAT,S.ramps.length);im.castShadow=true;im.receiveShadow=true;const m4=new THREE.Matrix4();
  S.ramps.forEach((R,i)=>{m4.makeRotationY(R.h);m4.setPosition(R.x,R.y,R.z);im.setMatrixAt(i,m4);});
  if(im.instanceMatrix)im.instanceMatrix.needsUpdate=true;if(im.computeBoundingSphere)im.computeBoundingSphere();scene.add(im);S.mesh=im;stuntPauseUI();}

// --- Autos: auf der Rampe Höhe/Neigung der Rampe, oben Absprung in eine ballistische Flugphase ---
const _stuntPhysics=Car.prototype.physics;
Car.prototype.physics=function(dt){const A=this.stuntAir;if(!A)return _stuntPhysics.call(this,dt);
  const vx=this.vx,vz=this.vz,hp=this.health;this.move(dt);if(Math.hypot(this.vx-vx,this.vz-vz)>2||this.health<hp-1)A.hit=true;
  this.speed=this.vx*Math.sin(this.h)+this.vz*Math.cos(this.h);this.afterPhysics(dt);};
// Die Rampe ist steiler als die Stufen-Toleranz der Ecken-Samples: auf der Rampe nur gegen echte Hindernisse daneben prüfen
const _stuntCollides=Car.prototype.collides;
Car.prototype.collides=function(){if(!this.stuntOn)return _stuntCollides.call(this);const y=this.y;this.y+=0.6;const r=_stuntCollides.call(this);this.y=y;return r;};
const _stuntSync=Car.prototype.sync;
Car.prototype.sync=function(dt=0){const T=this.T;if(T.boat||T.plane)return _stuntSync.call(this,dt);_stuntSync.call(this,dt);
  if(this.stuntAir){stuntFly(this,this.stuntAir,dt);return;}
  const on=STUNT.ramps.length?stuntRampAt(this.x,this.z):null;
  if(on){const R=on.R;this.y=R.y+0.07+R.k*on.t;const al=Math.cos(this.h-R.h);this.g.position.y=this.y;this.g.rotation.x=-Math.atan(R.k*al);this.stuntOn={R,t:on.t};return;}
  const last=this.stuntOn;this.stuntOn=null;
  if(last&&dt>0&&last.t>last.R.len-2.5){const R=last.R;const vr=this.vx*R.dx+this.vz*R.dz;if(vr>3)stuntTakeoff(this,R,vr);}};

function stuntTakeoff(c,R,vr){const P=PLAYERS.find(Q=>Q.car===c)||null;const qual=!!P&&vr>=STUNT.MIN_SPEED;
  c.stuntAir={R,P,qual,t:0,rt:0,y:R.y+0.07+R.H,vy:vr*R.k,x0:c.x,z0:c.z,hit:false,cine:qual,v0:vr};
  c.y=c.stuntAir.y;c.g.position.y=c.y;
  if(qual&&!G.split&&!P.gameOver){timeScale=STUNT.SLOW;STUNT.slow=true;}}
function stuntFly(c,A,dt){A.t+=dt;A.rt+=dt/Math.max(timeScale,0.01);A.vy-=9.81*dt;const ny=A.y+A.vy*dt;const gy=c.y;
  if(ny<=gy&&A.vy<0){stuntLand(c,A,gy);return;}A.y=ny;c.y=ny;c.g.position.y=ny;
  const hs=Math.max(1,Math.hypot(c.vx,c.vz));c.g.rotation.x=clamp(-Math.atan2(A.vy,hs),-0.45,0.45);}
function stuntLand(c,A,gy){c.stuntAir=null;c.y=gy;c.g.position.y=gy;const imp=-A.vy;
  if(imp>11&&!c.dead){c.damage((imp-11)*6);onCrash(c,imp);}
  const crashed=A.hit||c.dead||c.burn>0||imp>STUNT.HARD_LAND;const dist=Math.hypot(c.x-A.x0,c.z-A.z0);
  stuntSlowOff();const P=A.P;if(!P||P.car!==c||!A.qual){STUNT.last={id:A.R.id,dist,crashed,paid:0,counted:false};return;}
  stuntResult(P,A.R,dist,crashed);}
function stuntResult(P,R,dist,crashed){const S=STUNT;const res={id:R.id,dist,crashed,paid:0,counted:false};S.last=res;
  if(crashed){showBig('BRUCHLANDUNG','fail',2.5,STUNT_LINES.crash);return res;}
  if(dist<S.MIN_DIST){hint(STUNT_LINES.short+` (${dist.toFixed(1)} m)`,2.5,P);return res;}
  if(S.done.includes(R.id)){hint(`<b>${R.name}</b> · ${dist.toFixed(1)} m · ${STUNT_LINES.again}`,3,P);return res;}
  S.done.push(R.id);res.counted=true;res.paid=S.BONUS+Math.round(dist)*S.BONUS_M;G.money+=res.paid;
  showBig('STUNTSPRUNG!','win',3.5,`${R.name} · ${dist.toFixed(1)} m · + €${res.paid} · ${S.count}/${S.TOTAL}`);chime([523,659,784,1046,1319]);
  hint(STUNT_LINES.paid[(S.count-1)%STUNT_LINES.paid.length],3,P);stuntPauseUI();return res;}
function stuntSlowOff(){if(STUNT.slow&&timeScale===STUNT.SLOW&&!PLAYERS.some(P=>P.gameOver))timeScale=1;STUNT.slow=false;}

// --- Kamerafahrt: während des Zeitlupen-Sprungs seitlich um das Auto schwenken ---
const _stuntV=new THREE.Vector3();
const _stuntCamera=updateCamera;
updateCamera=function(P,dt){_stuntCamera(P,dt);const c=P.car,A=c&&c.stuntAir;if(!A||!A.cine)return;
  const a=c.h+Math.PI*(0.75-0.4*Math.min(1,A.t/1.4));const d=8+c.T.L*0.6;const ex=c.x+Math.sin(a)*d,ez=c.z+Math.cos(a)*d;
  _stuntV.set(ex,Math.max(groundY(ex,ez)+1,c.y-1),ez);P.camera.position.lerp(_stuntV,1-Math.exp(-dt*8));P.camera.lookAt(c.x,c.y+0.6,c.z);};

function updateStunt(dt){if(!STUNT.slow)return;const A=CARS.some(c=>c.stuntAir&&c.stuntAir.cine&&c.stuntAir.rt<STUNT.SLOW_MAX);if(!A){for(const c of CARS)if(c.stuntAir)c.stuntAir.cine=false;stuntSlowOff();}}

// --- Spielstand: gefundene Sprünge (Ids) – alte Stände ohne Schlüssel laden mit 0/20 ---
const _stuntSnapshot=snapshot;
snapshot=function(){const d=_stuntSnapshot();d.stunts=STUNT.done.slice();return d;};
const _stuntApplySave=applySave;
applySave=function(d){const r=_stuntApplySave(d);if(!d)return r;for(const c of CARS)if(c.stuntAir)c.stuntAir.cine=false;stuntSlowOff();const ids=new Set(STUNT.ramps.map(R=>R.id));
  STUNT.done=Array.isArray(d.stunts)?[...new Set(d.stunts)].filter(id=>ids.has(id)):[];stuntPauseUI();return r;};

// --- Pause-Menü: Zähler x/20 ---
function stuntPauseUI(){const h=document.querySelector('#pause h2');if(!h)return;let el=document.getElementById('stuntcount');
  if(!el){el=document.createElement('div');el.id='stuntcount';el.style.cssText='margin:-4px 0 10px;font-size:16px;color:var(--muted,#bbb)';h.after(el);}
  el.innerHTML=`Stuntsprünge: <b style="color:#fff">${STUNT.count}/${STUNT.TOTAL}</b>`;}
const _stuntRenderSlots=renderSlots;
renderSlots=function(){_stuntRenderSlots();stuntPauseUI();};
