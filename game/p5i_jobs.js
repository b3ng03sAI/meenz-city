// ===================== 23 NEBENJOBS: TAXI, RETTUNGSWAGEN, FEUERWEHR =====================
// Im passenden Fahrzeug startet/beendet J einen Nebenjob. Jeder erledigte Auftrag hebt die Stufe (knappere Zeit,
// mehr Fahrgäste/Patienten/Brandherde), die Serie bringt Bonus. Zeit um, Fahrzeug Schrott oder > 15 s ausgestiegen
// beendet die Schicht mit Bilanz. Beste Stufe je Job landet im Spielstand (snapshot().jobsBest).
const JOBS={active:null,best:{taxi:0,rettung:0,feuer:0},vehicles:{},depots:[],last:null,hud:null,beacon:null,
  OFF_MAX:15,STOP_SPEED:3,ARRIVE_R:10,SPRAY_RANGE:28,SPRAY_WIDTH:3.4,
  LABEL:{taxi:'Taxi',rettung:'Rettungsdienst',feuer:'Feuerwehr'}};

// --- Fahrzeugtypen (Laufzeit-Zuweisung; Karosserie aus dem Transporter-Generator mit eigenen Maßen) ---
CAR_TYPES.rettungswagen={name:'Rettungswagen',L:5.9,W:2.1,H:2.75,van:true,max:42,acc:7,grip:6.8,mass:3.2,wb:3.6,wr:0.38,cab:[1.5,1.6],color:0xf3f3ee,ambulance:true};
CAR_TYPES.loeschfahrzeug={name:'Löschfahrzeug',L:7.6,W:2.45,H:3.05,van:true,max:31,acc:5,grip:6.2,mass:7,wb:4.1,wr:0.5,cab:[2,2],color:0xc4161c,fireTruck:true};
function jobsKindOf(c){if(!c)return null;const T=c.T;return T.taxi?'taxi':T.ambulance?'rettung':T.fireTruck?'feuer':null;}

// --- Aufbauten: Warnstreifen, Rollläden, Leiter, Wasserwerfer (eine geteilte Geometrie je Typ), Schriftzüge, Blaulicht ---
const JOBS_DECO=new Map();
function jobsDecoGeo(id){if(JOBS_DECO.has(id))return JOBS_DECO.get(id);const T=CAR_TYPES[id],hf=T.L/2,W=T.W,H=T.H,gb=new GB();
  const red={r:0.78,g:0.06,b:0.06},orange={r:1,g:0.5,b:0.04},white={r:0.95,g:0.95,b:0.93},alu={r:0.66,g:0.68,b:0.71},dark={r:0.12,g:0.12,b:0.13};
  if(T.ambulance){for(const s of [-1,1]){gbox(gb,s*(W/2+0.006),0.98,-0.25,0.012,0.2,T.L-0.6,red);gbox(gb,s*(W/2+0.006),2.15,-0.75,0.012,0.12,T.L-2.2,orange);}
    gbox(gb,0,H+0.12,-1.2,1.0,0.24,1.3,{r:0.8,g:0.8,b:0.8});gbox(gb,0,1.15,-hf-0.08,W*0.9,0.14,0.02,red);gbox(gb,0,1.9,-hf-0.082,0.03,1.3,0.02,dark);}
  else{for(const s of [-1,1]){const x=s*(W/2+0.008);gbox(gb,x,1.0,-0.2,0.014,0.14,T.L-0.5,white);
      for(const zc of [-2.75,-1.3,0.15]){gbox(gb,x,1.85,zc,0.016,1.45,1.3,alu);for(let k=0;k<8;k++)gbox(gb,x+s*0.006,1.22+k*0.18,zc,0.012,0.025,1.28,{r:0.45,g:0.47,b:0.5});}}
    for(const s of [-1,1])gb.beam([s*0.45,H+0.3,-3.6],[s*0.45,H+0.3,1.3],0.07,0.09,alu);
    for(let z=-3.45;z<1.3;z+=0.38)gb.beam([-0.45,H+0.3,z],[0.45,H+0.3,z],0.04,0.04,alu);
    gbox(gb,0,H+0.12,-3.25,1.3,0.24,1.0,dark);gbox(gb,0,H+0.12,0.9,0.5,0.24,0.5,dark);
    gbox(gb,0,H+0.18,hf-1.75,0.36,0.3,0.36,alu);gb.beam([0,H+0.32,hf-1.75],[0,H+0.5,hf-1.0],0.11,0.11,alu);
    gbox(gb,0,0.55,hf+0.04,W*0.96,0.3,0.12,dark);}
  JOBS_DECO.set(id,gb.geo());return JOBS_DECO.get(id);}
const JOBS_SIGN={};
function jobsSign(kind){if(JOBS_SIGN[kind])return JOBS_SIGN[kind];const amb=kind==='rettung';
  const tex=freeAfterUpload(textTex(amb?'RETTUNGSDIENST':'FEUERWEHR MEENZ',{w:512,h:72,bg:amb?'#f3f3ee':'#c4161c',fg:amb?'#c8102e':'#ffffff',font:'800 54px "Barlow Condensed", Arial Narrow, sans-serif'}));
  JOBS_SIGN[kind]={mat:stdMat({map:tex,roughness:0.5}),geo:new THREE.PlaneGeometry(amb?2.4:3.0,amb?0.34:0.4)};return JOBS_SIGN[kind];}
let JOBS_LIGHT_G=null;
function jobsDecorate(c){const T=c.T,hf=T.L/2,W=T.W,H=T.H,amb=!!T.ambulance;
  const d=new THREE.Mesh(jobsDecoGeo(c.id),DET_MAT);d.castShadow=true;c.g.add(d);
  const S=jobsSign(amb?'rettung':'feuer');
  for(const s of [-1,1]){const p=new THREE.Mesh(S.geo,S.mat);p.position.set(s*(W/2+0.02),amb?1.6:2.82,amb?-0.7:-1.3);p.rotation.y=s*Math.PI/2;c.g.add(p);}
  if(amb){const p=new THREE.Mesh(S.geo,S.mat);p.scale.set(0.7,0.7,1);p.position.set(0,2.45,-hf-0.09);p.rotation.y=Math.PI;c.g.add(p);}
  JOBS_LIGHT_G=JOBS_LIGHT_G||new THREE.BoxGeometry(0.55,0.16,0.3);
  c.sirens=[-1,1].map(s=>{const m=new THREE.Mesh(JOBS_LIGHT_G,SIREN_OFF);m.position.set(s*0.42,H+0.08,hf-1.3);c.g.add(m);return m;});}
const _jobsSync=Car.prototype.sync;
Car.prototype.sync=function(dt){_jobsSync.call(this,dt);if(this.jobsInit||!(this.T.ambulance||this.T.fireTruck))return;this.jobsInit=true;jobsDecorate(this);};

// --- Sprüche (fiktive Fahrgäste, Meenzerisch) ---
const JOBS_LINES={
  taxiPick:['Ei Gude! In die {a}, awwer dalli – isch hab um drei Termin beim Friseur!','Gude! Fahr mich mol in die {a}, gell? Un net übers Gonsbachtal, des is en Umweg!',
    'Zur {a}, bitte. Mei Fraa wart’ mit em Handkäs mit Musik!','Endlich e Taxi! {a}, so schnell wie’s geht – de Schoppe wird warm!','Bring mich in die {a}. Isch zahl aach in bar, net in Kreppel.'],
  taxiCrash:['Hopla! Haste dein Führerschein beim Fassenachtszug gewonne?','Mei Weck is uff de Bodde gefalle!','Ei verbibbsch, fahr doch net wie en Schorle-Lieferant!'],
  taxiGood:['Merci! Do haste e ordentlich Trinkgeld, des haste dir verdient.','Des war flotter wie die Straßebahn – stimmt so!','Pünktlich wie de Dom-Glocke. Do gibt’s en Schoppe extra.'],
  taxiBad:['Na ja … Trinkgeld gibt’s heut kaans.','Des nächste Mol nemm isch de Bus.','Mir is schlecht. Hier is dei Geld, mehr net.'],
  patient:['Aua, mei Knie! Isch bin vom Weinfass gefalle …','Isch hab zu viel Spundekäs gesse …','Bloß net so ruckele, sonst kimmt alles widder raus!',
    'Mei Kreislauf! Des war de dritte Schoppe zu viel.','Mich hat e Konfetti-Kanone erwischt, mitten ins Aach!'],
  klinik:['Ei Gott, die Uniklinik! Merci, isch leb noch!','Endlich! Die Schwester kenn isch, die is aus Bretzenheim.'],
  fireStart:['Brand in de {s}! Ab dafür!','Es brennt in de {s} – Wasser marsch, sobald de da bist!','Rauch über de {s}! Die Leit warte uff dich!'],
  fireDone:['Gelöscht! Des Bier danach geht uff misch.','Feuer aus – gut gemacht!','Alles nass, alles gut. Meenz is gerettet!']};
function jobsLine(k,o={}){let s=mpick(JOBS_LINES[k]);for(const key in o)s=s.replace('{'+key+'}',o[key]);return s;}

// --- Orte: Bordstein an einer befahrbaren Straße, echte Straßennamen ---
function jobsRoadside(x,z,named){const n=nearestNode(x,z,true);if(n<0)return null;
  const es=NODES[n].e.filter(e=>{const E=EDGES[e];return E.car&&!E.road.bridge&&E.len>12&&(!named||E.road.name);});if(!es.length)return null;
  const e=mpick(es),E=EDGES[e],t=E.len/2,o=E.road.w/2+Math.max(0.9,E.road.sw*0.5);let [sx,sz]=laneAt(e,n,t,o);
  if(blocked(sx,sz))[sx,sz]=freeSpot(sx,sz,0.4);const [lx,lz]=laneAt(e,n,t,E.road.lane||0);const d=edgeDir(e,n);
  return {x:sx,z:sz,lx,lz,h:Math.atan2(d[0],d[1]),street:E.road.name||'',num:1+(e*7919)%87};}
function jobsSpotNear(px,pz,rmin,rmax,named){for(let k=0;k<40;k++){const a=Math.random()*TAU,r=mr(rmin,rmax);const s=jobsRoadside(px+Math.cos(a)*r,pz+Math.sin(a)*r,named);
    if(!s)continue;const d=Math.hypot(s.lx-px,s.lz-pz);if(d<rmin*0.6||d>rmax*1.4)continue;return s;}
  const r=jobsRoadside(px,pz,false);if(r)return r;const q=roadSpot(px,pz);return {x:q[0],z:q[1],lx:q[0],lz:q[1],h:q[2]||0,street:'',num:1};}
function jobsAddress(px,pz,rmin,rmax){const s=jobsSpotNear(px,pz,rmin,rmax,true);if(!s)return null;s.label=s.street?`${s.street} ${s.num}`:districtAt(s.x,s.z);
  if(Math.random()<0.4){let best=null,bd=70;for(const sh of SHOPS){const d=Math.hypot(sh.doorX-s.x,sh.doorZ-s.z);if(d<bd){bd=d;best=sh;}}
    if(best){const r=jobsRoadside(best.doorX,best.doorZ,true);if(r&&Math.hypot(r.x-best.doorX,r.z-best.doorZ)<35){r.label=`${best.name}, ${r.street}`;return r;}}}
  return s;}
function jobsCount(L){return Math.min(3,1+((L-1)>>1));}
// Zeitlimit: Luftlinie × Umwegfaktor durch Soll-Tempo (steigt mit der Stufe) plus Puffer je Fahrgast/Patient/Brand
function jobsTime(kind,L,dist,n){const pace={taxi:7.5,rettung:8,feuer:7}[kind]+Math.min(7,0.7*(L-1));const slack=Math.max(8,25-2*(L-1));
  return Math.round(dist*1.3/pace+slack*n+(kind==='feuer'?6*n:0));}
function jobsKlinik(){return JOBS.klinik||(JOBS.klinik=(()=>{const r=roadSpot(POI.klinik[0],POI.klinik[1]);return {x:r[0],z:r[1],lx:r[0],lz:r[1],label:'Uniklinik – Notaufnahme'};})());}

// --- Figuren: winkender Fahrgast, liegender Patient ---
function jobsHuman(x,z,state){const h=new Human('ped');h.x=x;h.z=z;h.y=groundY(x,z);h.mission=true;h.state=state;h.walkSpeed=1.4;h.side=1;
  h.health=400;if(state==='jobHurt'){h.lie();h.setExpr('cringe');}h.sync();return h;}
function jobsToPed(h){if(!h||h.removed)return;h.mission=false;h.inCar=false;h.g.visible=true;h.stand();h.y=groundY(h.x,h.z);
  if(!h.alive)return;h.state='walk';const n=nearestNode(h.x,h.z,false);if(n>=0&&NODES[n].e.length)pedEnterEdge(h,NODES[n].e[0],n);else h.state='flee';}
function jobsPose(A,dt){const c=A.car;
  for(const it of A.items){const h=it.h;if(!h||h.removed||it.inCar||it.out)continue;
    if(!h.alive){if(A.kind!=='feuer')return A.kind==='taxi'?'passenger':'patient';continue;}
    const want=A.kind==='rettung'?'jobHurt':'jobWave';
    if(h.state!==want){if(h.state==='knock'||h.state==='dying')continue;h.state=want;h.health=Math.max(h.health,50);if(want==='jobHurt')h.lie();else h.stand();}
    if(want==='jobHurt'){h.y=groundY(h.x,h.z)+0.14;h.g.rotation.x=-Math.PI/2;if(Math.hypot(c.x-h.x,c.z-h.z)<25&&!it.said){it.said=true;say(h,jobsLine('patient'),4);}}
    else{faceTo(h,c.x-h.x,c.z-h.z,dt,4);const w=Math.sin(simTime*9+it.k);h.armR.rotation.set(-1.9,0,-0.45+w*0.25);h.armL.rotation.set(0,0,0.06);}
    h.sync();}
  return null;}

// --- HUD + Zielmarker ---
function jobsHud(){if(JOBS.hud)return JOBS.hud;const d=document.createElement('div');
  d.style.cssText='position:fixed;right:18px;top:calc(196px + env(safe-area-inset-top,0px));padding:8px 14px;border-radius:10px;background:rgba(10,12,20,.66);color:#fff;font:700 17px "Barlow Condensed",sans-serif;z-index:30;line-height:1.35;pointer-events:none;max-width:300px;display:none';
  document.body.appendChild(d);JOBS.hud=d;return d;}
function jobsFmt(t){t=Math.max(0,Math.ceil(t));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0');}
function jobsDrawHud(A){const d=jobsHud();d.style.display='block';const low=A.timer<15;
  d.innerHTML=`<div style="color:#4fd1ff">${JOBS.LABEL[A.kind].toUpperCase()} · Stufe ${A.level}</div>`+
    `<div style="color:${low?'#ff6b6b':'#fff'};font-size:24px">${jobsFmt(A.timer)}</div><div>Serie ${A.streak} · €${A.earned}</div>`+(A.label?`<div style="font-size:14px;opacity:.85">${A.label}</div>`:'');}

// --- Aufträge ---
function jobsNewTask(A){const c=A.car,L=A.level,n=jobsCount(L);A.items=[];A.stage='pickup';A.idx=0;A.hp0=c.health;A.label='';
  if(A.kind==='taxi'){const s=jobsSpotNear(c.x,c.z,100,320,false);A.pick=s;A.target=[s.lx,s.lz];
    let px=s.x,pz=s.z,dist=0;
    for(let i=0;i<n;i++){const dest=jobsAddress(px,pz,250,700+40*Math.min(L,8))||jobsKlinik();dist+=Math.hypot(dest.x-px,dest.z-pz);px=dest.x;pz=dest.z;
      const [hx,hz]=freeSpot(s.x+i*0.9,s.z+i*0.5,0.35);A.items.push({h:jobsHuman(hx,hz,'jobWave'),dest,k:i*1.7});}
    A.rideDist=dist;A.timer=jobsTime('taxi',L,Math.hypot(s.lx-c.x,s.lz-c.z),1);A.label=`Fahrgast wartet: ${s.street||districtAt(s.x,s.z)}`;
    missionText(n>1?`<b>${n} Fahrgäste</b> winken in de <b>${s.street||districtAt(s.x,s.z)}</b> – halt neben ihne an!`:`Fahrgast winkt in de <b>${s.street||districtAt(s.x,s.z)}</b> – halt neben ihm an!`,5);}
  else if(A.kind==='rettung'){let px=c.x,pz=c.z,dist=0;
    for(let i=0;i<n;i++){const s=jobsSpotNear(px,pz,150,450,false);dist+=Math.hypot(s.x-px,s.z-pz);px=s.x;pz=s.z;A.items.push({h:jobsHuman(s.x,s.z,'jobHurt'),spot:s,k:i});}
    const K=jobsKlinik();dist+=Math.hypot(K.x-px,K.z-pz);A.timer=jobsTime('rettung',L,dist,n);A.target=[A.items[0].spot.lx,A.items[0].spot.lz];
    A.label=`Notfall: ${A.items[0].spot.street||districtAt(px,pz)}`;missionText(`<b>Notruf!</b> ${n>1?n+' Verletzte':'En Verletzter'} – hol ${n>1?'se':'ihn'} ab un bring ${n>1?'se':'ihn'} in die <b>Uniklinik</b>.`,5);}
  else{let fs=null,road=null;for(let k=0;k<25&&!fs;k++){const a=Math.random()*TAU,r=mr(200,600);const f=facadeSpot(c.x+Math.cos(a)*r,c.z+Math.sin(a)*r,45);
      if(!f)continue;const rd=jobsRoadside(f.x+f.nx*8,f.z+f.nz*8,false);if(rd&&Math.hypot(rd.lx-f.x,rd.lz-f.z)<22){fs=f;road=rd;}}
    if(!fs){road=jobsSpotNear(c.x,c.z,200,600,false);fs={x:road.x,z:road.z,nx:0,nz:0,len:8};}
    const tx=-fs.nz,tz=fs.nx,step=Math.min(4.5,Math.max(2.5,fs.len/n));
    for(let i=0;i<n;i++){const off=(i-(n-1)/2)*step;let x=fs.x+tx*off+fs.nx*1.3,z=fs.z+tz*off+fs.nz*1.3;if(blocked(x,z)){x+=fs.nx*1.2;z+=fs.nz*1.2;}
      const f={x,z,y:groundY(x,z)+(i%2?2.6:0),r:2.4,t:1e6,owner:null,job:true,hp:3.5+0.25*L,hp0:3.5+0.25*L,tx,tz,nx:fs.nx,nz:fs.nz};FIRES.push(f);A.items.push({fire:f,k:i});}
    const st=road.street||streetNameAt(fs.x,fs.z)||districtAt(fs.x,fs.z);A.fireAt=[fs.x,fs.z];A.target=[road.lx,road.lz];A.stage='fire';
    A.timer=jobsTime('feuer',L,Math.hypot(road.lx-c.x,road.lz-c.z),n);A.label=`Brand: ${st}`;missionText(jobsLine('fireStart',{s:`<b>${st}</b>`})+(n>1?` (${n} Brandherde)`:''),5);}
  A.timer0=A.timer;chime([660,880]);}
function jobsStopped(A,x,z,r=JOBS.ARRIVE_R){const c=A.car;return Math.hypot(c.x-x,c.z-z)<r&&Math.abs(c.speed)<JOBS.STOP_SPEED;}
function jobsPenalty(A,hp){return Math.round(Math.max(0,hp-A.car.health)*1.2);}
function jobsTaskDone(A,pay){A.done++;A.streak++;const bonus=20*(A.streak-1)+(A.streak%5===0?250*(A.streak/5):0);const total=Math.max(0,pay)+bonus;
  G.money+=total;A.earned+=total;JOBS.best[A.kind]=Math.max(JOBS.best[A.kind]||0,A.level);A.level++;
  showBig(`STUFE ${A.level}`,'win',2.5,`+ €${total}`+(bonus?` · Serien-Bonus €${bonus}`:''));chime([523,659,784,1046]);jobsNewTask(A);}
function jobsUpdateTask(A,dt){const c=A.car,P=A.P;
  if(A.kind==='taxi'){
    if(A.stage==='pickup'){if(jobsStopped(A,A.pick.x,A.pick.z)){for(const it of A.items){it.inCar=true;it.h.inCar=true;it.h.g.visible=false;}
        A.stage='ride';A.idx=0;A.hpLeg=c.health;A.timer=A.timer0=jobsTime('taxi',A.level,A.rideDist,A.items.length);const d=A.items[0].dest;A.target=[d.lx,d.lz];A.label=`Ziel: ${d.label}`;
        hint(`„${jobsLine('taxiPick',{a:`<b>${d.label}</b>`})}“`,5,P);chime([660]);}}
    else{const it=A.items[A.idx],d=it.dest;
      if(c.health<A.lastHp-6&&simTime-(A.crashT||-9)>4){A.crashT=simTime;hint(`„${jobsLine('taxiCrash')}“`,3,P);}
      if(jobsStopped(A,d.x,d.z)){const legD=Math.hypot(d.x-(A.idx?A.items[A.idx-1].dest.x:A.pick.x),d.z-(A.idx?A.items[A.idx-1].dest.z:A.pick.z));
        const base=Math.round(12+legD*0.04),tip=Math.max(0,Math.round(base*0.8*clamp(A.timer/A.timer0,0,1))-jobsPenalty(A,A.hpLeg));
        const h=it.h;it.inCar=false;it.out=true;const [ex,ez]=doorPos(c,1);h.x=ex;h.z=ez;jobsToPed(h);
        hint(`„${jobsLine(tip>base*0.3?'taxiGood':'taxiBad')}“ · Fahrpreis <b>€${base}</b>${tip?` + Trinkgeld <b>€${tip}</b>`:''}`,4,P);chime([880,1100]);
        A.pay=(A.pay||0)+base+tip;A.idx++;A.hpLeg=c.health;
        if(A.idx>=A.items.length){const p=A.pay;A.pay=0;jobsTaskDone(A,p);return;}
        const nd=A.items[A.idx].dest;A.target=[nd.lx,nd.lz];A.label=`Ziel: ${nd.label}`;}}}
  else if(A.kind==='rettung'){
    if(A.stage==='pickup'){const it=A.items[A.idx];
      if(jobsStopped(A,it.spot.x,it.spot.z)){it.inCar=true;it.h.inCar=true;it.h.g.visible=false;it.h.stand();A.idx++;chime([660,990]);
        if(A.idx<A.items.length){const s=A.items[A.idx].spot;A.target=[s.lx,s.lz];A.label=`Notfall: ${s.street||districtAt(s.x,s.z)}`;hint('Patient an Bord – weiter zum nächste Notfall!',3,P);}
        else{const K=jobsKlinik();A.stage='klinik';A.target=[K.lx,K.lz];A.label=K.label;hint(`„${jobsLine('patient')}“ – ab in die <b>Uniklinik</b>!`,4,P);}}}
    else{const K=jobsKlinik();if(jobsStopped(A,K.x,K.z,14)){const n=A.items.length;
      const pay=n*(90+25*A.level)+Math.round(60*n*clamp(A.timer/A.timer0,0,1))-jobsPenalty(A,A.hp0);
      for(const it of A.items){it.out=true;it.h.remove();}hint(`„${jobsLine('klinik')}“`,4,P);jobsTaskDone(A,pay);}}}
  else{let left=0;for(const it of A.items)if(!it.fire.out)left++;
    if(!left){const n=A.items.length;const pay=n*(120+40*A.level)+Math.round(80*n*clamp(A.timer/A.timer0,0,1))-jobsPenalty(A,A.hp0);
      hint(`„${jobsLine('fireDone')}“`,4,P);jobsTaskDone(A,pay);return;}
    A.label=`Brand: ${left} Herd${left>1?'e':''} · Feuerknopf halten`;}
  A.lastHp=c.health;}

// --- Löschen: Strahl in Blickrichtung, trifft Brände nahe der Strahlachse ---
function jobsSpray(P,c,dt){const T=c.T,fx=Math.sin(P.cam.yaw),fz=Math.cos(P.cam.yaw),o=T.L/2-1.0;
  const ox=c.x+Math.sin(c.h)*o,oz=c.z+Math.cos(c.h)*o,oy=c.y+T.H+0.5,R=JOBS.SPRAY_RANGE;
  for(let k=0;k<Math.ceil(dt*110);k++){const s=Math.random(),d=s*R;
    spawnPart(ox+fx*d+mr(-0.2,0.2),oy+d*0.3-d*d*0.016,oz+fz*d+mr(-0.2,0.2),{color:mpick([0x5fa8f0,0x8cc4ff,0xe8f4ff]),size:0.6+s*1.6,vx:fx*2,vz:fz*2,vy:-1.2,life:0.35,grow:1.4,alpha:0.9});}
  JOBS.hissT=(JOBS.hissT||0)-dt;if(JOBS.hissT<=0){JOBS.hissT=0.12;noiseHit(0.05,0.14,3200);}
  for(const f of FIRES){if(f.out)continue;const dx=f.x-ox,dz=f.z-oz,al=dx*fx+dz*fz;if(al<1||al>R||Math.abs(dx*fz-dz*fx)>JOBS.SPRAY_WIDTH)continue;
    if(Math.random()<dt*12)spawnPart(f.x+mr(-1,1),f.y+1,f.z+mr(-1,1),{color:0xeeeeee,size:mr(1,2),vy:2,life:1.2,grow:1.5,alpha:0.4});
    if(f.job){f.hp-=dt;if(f.hp<=0){f.out=true;f.t=Math.min(f.t,1);chime([1046]);}}else f.t-=dt*3;}}

// Gebäudebrand sichtbar machen: breite Flammen an der Fassade und eine Rauchsäule (Basis-Feuer aus p4b ist nur Bodenfeuer)
function jobsFireFx(A,dt){const fires=A.items.filter(it=>it.fire&&!it.fire.out),k=1/Math.sqrt(Math.max(1,fires.length));
  for(const {fire:f} of fires){const s=clamp(f.hp/f.hp0,0.25,1);
    if(Math.random()<dt*45*k){const o=mr(-1.6,1.6);spawnPart(f.x+f.tx*o,f.y+mr(0.2,2.2),f.z+f.tz*o,{color:mpick([0xff5a10,0xff8a20,0xffc040]),size:mr(1.2,2.6)*s,vy:mr(2,3.5),vx:0,vz:0,life:mr(0.4,0.8),grow:1,add:true});}
    if(Math.random()<dt*6*k)spawnPart(f.x+f.nx*3+mr(-1,1),f.y+3.5,f.z+f.nz*3+mr(-1,1),{color:0x2a2a2a,size:mr(2,3)*s,vy:mr(2.5,4),vx:f.nx*0.8,vz:f.nz*0.8,life:mr(2.5,3.5),grow:1.6,alpha:0.5});}}

// --- Start / Ende ---
function jobsStart(P){const c=P.car,kind=jobsKindOf(c);
  if(!kind){hint('Nebenjobs gibt’s nur im <b>Taxi</b>, im <b>Rettungswagen</b> oder im <b>Löschfahrzeug</b>.',3,P);return false;}
  if(activeMission){hint('Erst die Mission fertig mache!',2.5,P);return false;}
  const A={kind,level:1,target:null,timer:0,streak:0,car:c,P,done:0,earned:0,off:0,items:[],lastHp:c.health,carWas:{mission:c.mission}};
  c.mission=true;JOBS.active=A;showBig(JOBS.LABEL[kind].toUpperCase(),'mission',2.5,`Nebenjob · Rekord: Stufe ${JOBS.best[kind]||0} · J zum Beenden`);jobsNewTask(A);return true;}
const JOBS_END={quit:'FEIERABEND',timeout:'ZEIT ABGELAUFEN',wrecked:'FAHRZEUG SCHROTT',left:'FAHRZEUG VERLASSEN',wasted:'SCHICHT VORBEI',passenger:'FAHRGAST VERLOREN',patient:'PATIENT VERLOREN',save:''};
function jobsEnd(reason,quiet=false){const A=JOBS.active;if(!A)return;JOBS.active=null;const c=A.car;
  for(const it of A.items){if(it.fire){if(!it.fire.out){it.fire.job=false;it.fire.t=Math.min(it.fire.t,2);}continue;}
    const h=it.h;if(!h||h.removed||it.out)continue;if(it.inCar&&!c.removed){const [ex,ez]=doorPos(c,1);h.x=ex;h.z=ez;}jobsToPed(h);}
  if(!c.removed){c.sirenOn=false;c.mission=A.carWas.mission;}
  if(JOBS.hud)JOBS.hud.style.display='none';if(JOBS.beacon)JOBS.beacon.visible=false;
  JOBS.last={kind:A.kind,level:A.level,done:A.done,earned:A.earned,reason};
  if(quiet)return;
  showBig(JOBS_END[reason]||'JOB VORBEI',reason==='quit'?'win':'fail',5,`${JOBS.LABEL[A.kind]} · ${A.done} Auftr${A.done===1?'ag':'äge'} · Stufe ${A.level} erreicht · €${A.earned} · Rekord: Stufe ${JOBS.best[A.kind]||0}`);
  chime(reason==='quit'?[784,659,523]:[392,330]);if(A.done)autoSave();}
function jobsCheck(A,dt){const c=A.car,P=A.P;
  if(P.gameOver)return 'wasted';if(c.removed||c.dead||c.burn>0)return 'wrecked';
  if(P.car!==c){A.off+=dt;if(A.off>JOBS.OFF_MAX)return 'left';hint(`Zurück ins Fahrzeug! (${Math.ceil(JOBS.OFF_MAX-A.off)} s)`,0.5,P);}else A.off=0;
  A.timer-=dt;if(A.timer<=0)return 'timeout';
  return jobsPose(A,dt);}

// --- Depots: Rettungswagen an der Uniklinik, Löschfahrzeug an einer Feuerwache aus OSM, Taxi am Hbf ---
function jobsFireStation(){let best=null,bd=2500;for(const b of BUILDINGS){if(!b.name||!/Feuerwache|Feuerwehr/.test(b.name))continue;const d=Math.hypot(b.x-POI.dom[0],b.z-POI.dom[1]);if(d<bd){bd=d;best=b;}}
  return best?{x:best.x,z:best.z,name:best.name}:{x:POI.polizei[0]+30,z:POI.polizei[1]+20,name:'Polizei (Ausweichplatz)'};}
// Depot nicht auf einen Missions-Startpunkt stellen (sonst startet die Mission beim Einsteigen)
function jobsDepotSpot(d){for(let k=0;k<12;k++){const a=k*2.4,rr=k*12;const r=roadSpot(d.x+Math.cos(a)*rr,d.z+Math.sin(a)*rr);
    if(!MISSIONS.some(m=>m.start&&Math.hypot(m.start[0]-r[0],m.start[1]-r[1])<15))return r;}return roadSpot(d.x,d.z);}
function jobsSpawnDepot(d){const r=jobsDepotSpot(d);const c=new Car(d.type,r[0],r[1],r[2]||0,{ctrl:'none',plate:d.plate});
  if(c.collides()){const [x,z]=freeSpot(r[0],r[1],1.6);c.x=x;c.z=z;}c.ai={mode:'parked'};c.persist=true;c.sync();d.car=c;JOBS.vehicles[d.key]=c;return c;}
function jobsRespawnDepots(){for(const d of JOBS.depots){const c=d.car;if(c&&!c.removed&&!c.dead&&!(c.burn>0))continue;if(c&&isPlayerCar(c))continue;
    if(PLAYERS.some(P=>P.h&&Math.hypot(ppos(P)[0]-d.x,ppos(P)[1]-d.z)<250))continue;jobsSpawnDepot(d);}}

// --- Wrapper: Spielstand, Feuerknopf im Löschfahrzeug, Minikarte, Hinweis beim Einsteigen, keine Mission während der Schicht ---
const _jobsSnapshot=snapshot;
snapshot=function(){const s=_jobsSnapshot();s.jobsBest={taxi:JOBS.best.taxi|0,rettung:JOBS.best.rettung|0,feuer:JOBS.best.feuer|0};return s;};
const _jobsApplySave=applySave;
applySave=function(d){if(JOBS.active)jobsEnd('save',true);const r=_jobsApplySave(d);if(d){const b=d.jobsBest||{};JOBS.best={taxi:b.taxi|0,rettung:b.rettung|0,feuer:b.feuer|0};}return r;};
const _jobsPlayerFire=playerFire;
playerFire=function(P,I){if(P.car&&P.car.T.fireTruck)return;_jobsPlayerFire(P,I);};
const _jobsBlipList=blipList;
blipList=function(forP){const out=_jobsBlipList(forP);const A=JOBS.active;
  if(A){if(A.target)out.push({x:A.target[0],z:A.target[1],c:'#4fd1ff',r:6,ring:true,edge:true});}
  else for(const d of JOBS.depots)if(d.car&&!d.car.removed&&!isPlayerCar(d.car))out.push({x:d.car.x,z:d.car.z,c:d.col,r:4,sq:true});
  return out;};
const _jobsEnterCar=enterCar;
enterCar=function(P,c){_jobsEnterCar(P,c);const k=jobsKindOf(c);if(k&&!JOBS.active&&P===P1)hint(`<b>${c.T.name}</b> · Drück <b>J</b> für de Nebenjob <b>${JOBS.LABEL[k]}</b>`,4,P);};
const _jobsStartMission=startMission;
startMission=function(m,P){if(JOBS.active){hint('Du bist im Dienst – erst mit <b>J</b> Feierabend mache.',1.5,P);return;}_jobsStartMission(m,P);};

function setupJobs(){
  const fw=jobsFireStation();JOBS.fireStation=fw;
  JOBS.depots=[{key:'rettung',type:'rettungswagen',x:POI.klinik[0]+15,z:POI.klinik[1]+10,plate:'MZ-RD 112',col:'#ffffff'},
    {key:'feuer',type:'loeschfahrzeug',x:fw.x,z:fw.z,plate:'MZ-FW 112',col:'#e53935'},
    {key:'taxi',type:'taxi',x:POI.hbf[0]+40,z:POI.hbf[1]-30,plate:'MZ-TX 05',col:'#f2c500'}];
  for(const d of JOBS.depots)jobsSpawnDepot(d);
  JOBS.beacon=beacon(0x4fd1ff,2.2,9);JOBS.beacon.visible=false;}

function updateJobs(dt){const jp=keysP.KeyJ;keysP.KeyJ=false;const P=P1;
  JOBS.depotT=(JOBS.depotT||0)-dt;if(JOBS.depotT<=0){JOBS.depotT=2;jobsRespawnDepots();}
  for(const Q of PLAYERS)if(Q.car&&Q.car.T.fireTruck&&Q.inp&&Q.inp.fire&&!Q.gameOver&&!Q.talk)jobsSpray(Q,Q.car,dt);
  if(jp&&mode==='play'&&P.h&&!P.gameOver&&!P.talk){if(JOBS.active){if(P.car===JOBS.active.car)jobsEnd('quit');else hint('Steig erst widder ein – oder lass es 15 s, dann is Feierabend.',2,P);}
    else if(P.car)jobsStart(P);else hint('Für en Nebenjob musst du im <b>Taxi</b>, <b>Rettungswagen</b> oder <b>Löschfahrzeug</b> sitze.',3,P);}
  const A=JOBS.active;if(!A)return;
  if(A.kind!=='taxi'&&!A.car.removed)A.car.sirenOn=A.P.car===A.car;
  const r=jobsCheck(A,dt);if(r){jobsEnd(r);return;}
  jobsUpdateTask(A,dt);
  if(JOBS.active!==A)return;
  if(A.kind==='feuer')jobsFireFx(A,dt);
  const near=A.target&&Math.hypot(A.car.x-A.target[0],A.car.z-A.target[1])<(A.kind==='feuer'?30:12);
  if(A.target&&!near){setBeacon(JOBS.beacon,A.target[0],A.target[1]);JOBS.beacon.userData.arrow.position.y=3+Math.sin(simTime*3)*0.4;}else JOBS.beacon.visible=false;
  jobsDrawHud(A);}
