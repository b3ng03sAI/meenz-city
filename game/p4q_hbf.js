// ===================== MAINZ HAUPTBAHNHOF: HALLE, UNTERFÜHRUNG, BAHNSTEIGE, ZÜGE =====================
const HBF={built:false,tracks:{},plats:[],trains:[],sched:[],boardTex:null,clockTex:null,lastMin:-1,annT:40,funT:150,dispTex:{}};
const PLAT_H=0.76;
const TRAIN_TYPES=[
  {k:'ice',cars:7,len:26,h:3.9,w:2.95,col:0xf2f2f2,stripe:0xc8102e,vmax:22,w8:1,lines:[['ICE 27','Köln Hbf'],['ICE 28','Frankfurt (Main) Hbf'],['ICE 1093','München Hbf'],['IC 2027','Passau Hbf']]},
  {k:'re',cars:4,len:27,h:4.6,w:2.9,col:0xb5121b,stripe:0xf2f2f2,vmax:18,w8:3,lines:[['RE 2','Frankfurt (Main) Hbf'],['RE 2','Koblenz Hbf'],['RE 3','Saarbrücken Hbf'],['RE 4','Karlsruhe Hbf'],['RE 13','Mannheim Hbf']]},
  {k:'rb',cars:2,len:24,h:3.9,w:2.9,col:0xc8102e,stripe:0x3a3a3a,vmax:16,w8:3,lines:[['RB 26','Koblenz Hbf'],['RB 31','Alzey'],['RB 33','Idar-Oberstein'],['RB 75','Wiesbaden Hbf']]},
  {k:'s',cars:3,len:23,h:3.8,w:3.0,col:0xeeeeee,stripe:0xc8102e,vmax:17,w8:3,lines:[['S8','Wiesbaden Hbf'],['S8','Hanau Hbf'],['S8','Frankfurt (Main) Flughafen']]}];
const HBF_FUN=['Information zu RB 26: Der Zug fällt heute aus. Grund ist eine Taube im Stellwerk.','Achtung an Gleis 4: Bitte nicht mit dem Jetpack über die Gleise fliegen.','Die Fahrgäste mit dem Dackel im Flugzeug werden gebeten, ihr Tier anzuleinen.','Information zu S8: heute ca. 20 Minuten später. Grund ist ein Fahrgast, der mit der Tür diskutiert.','Wir bitten den Besitzer der Fleischworscht auf Bahnsteig 2 zur Information.','Achtung! Auf Gleis 5 fährt ein Zug ein. Vermutlich. Ganz sicher sind wir uns nicht.','Der RE 2 nach Frankfurt hat heute umgekehrte Wagenreihung. Und umgekehrte Gefühle.','Aus betrieblichen Gründen beginnt das Marktfrühstück heute am Bahnsteig 1. Das war ein Scherz.'];
function trackOf(k){const t=HBF.tracks[k];if(t)return t;const P=HBF_TRACKS[k];if(!P)return null;const cum=[0];for(let i=1;i<P.length;i++)cum.push(cum[i-1]+Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]));return HBF.tracks[k]={k,P,cum,L:cum[cum.length-1]};}
function trackAt(T,s){s=clamp(s,0,T.L);let lo=0,hi=T.cum.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(T.cum[m]<=s)lo=m;else hi=m;}const a=T.P[lo],b=T.P[hi];const L=T.cum[hi]-T.cum[lo]||1;const f=(s-T.cum[lo])/L;return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,Math.atan2(b[0]-a[0],b[1]-a[1])];}
// ---------- Bahnsteige ----------
function hbfSignTex(text,w=512,h=96){return textTex(text,{w,h,bg:'#16326e',fg:'#ffffff',font:'700 58px "Barlow Condensed", Arial Narrow, sans-serif'});}
function buildHbf(){if(HBF.built)return;HBF.built=true;for(const k in HBF_TRACKS)trackOf(k);
  const top=new GB(),side=new GB(),line=new GB(),roof=new GB(),steel=new GB(),wood=new GB(),glow=new GB();const grey=C3(0xa9a6a0),dk=C3(0x6d6a64),wh=C3(0xf2f2f2),ye=C3(0xe8c840),st=C3(0x4a5560),gl=C3(0xfff3d6),wd=C3(0x8a5a30),rf=C3(0x3c4650);
  for(const pl of HBF_PLATS){const P=pl.p;const mids=[];
    for(let i=0;i<P.length;i++){const [px,pz,qx,qz]=P[i];mids.push([(px+qx)/2,(pz+qz)/2,Math.hypot(qx-px,qz-pz)]);}
    for(let i=0;i<P.length-1;i++){const [ax,az,bx,bz]=P[i],[cx,cz,dx,dz]=P[i+1];if(Math.hypot(cx-ax,cz-az)>6)continue;const y=PLAT_H;
      top.quadOut([ax,y,az],[cx,y,cz],[dx,y,dz],[bx,y,bz],[0,0],[1,0],[1,1],[0,1],grey,[(ax+dx)/2,-10,(az+dz)/2]);
      for(const [p0,p1] of [[[ax,az],[cx,cz]],[[bx,bz],[dx,dz]]]){side.quadOut([p0[0],0,p0[1]],[p1[0],0,p1[1]],[p1[0],y,p1[1]],[p0[0],y,p0[1]],[0,0],[1,0],[1,1],[0,1],dk,[(ax+dx)/2,y/2,(az+dz)/2]);
        // Sicherheitslinie
        const mx=(ax+bx+cx+dx)/4,mz=(az+bz+cz+dz)/4;const f=(p,t)=>[p[0]+(mx-p[0])*t,p[1]+(mz-p[1])*t];const a1=f(p0,0.13),b1=f(p1,0.13),a2=f(p0,0.16),b2=f(p1,0.16);if(!pl.haus||p0[0]===ax)line.quadOut([a1[0],y+0.01,a1[1]],[b1[0],y+0.01,b1[1]],[b2[0],y+0.01,b2[1]],[a2[0],y+0.01,a2[1]],[0,0],[1,0],[1,1],[0,1],wh,[mx,-10,mz]);}
      // begehbare Fläche
      for(let u=0.04;u<=0.96;u+=0.05)for(let v=0;v<=1;v+=0.25){const x0=ax+(bx-ax)*u,z0=az+(bz-az)*u,x1=cx+(dx-cx)*u,z1=cz+(dz-cz)*u;const x=x0+(x1-x0)*v,z=z0+(z1-z0)*v;const i2=idx(x,z);if(i2>=0&&hgG(i2)===0)stepSet(x,z,PLAT_H);}}
    // Dach über dem Bahnhofsbereich, Masten, Schilder, Bänke
    const label=pl.haus?'Gleis 1':('Gleis '+pl.g[0]+'  |  Gleis '+pl.g[1]);pl.mids=mids;let near=null,nd=1e9;
    for(let i=0;i<mids.length;i++){const [mx,mz,w]=mids[i];const j=Math.min(mids.length-1,i+1);const hd=Math.atan2(mids[j][0]-mids[Math.max(0,j-1)][0],mids[j][1]-mids[Math.max(0,j-1)][1]);
      const inHall=mz>-340&&mz<-120;const d=Math.hypot(mx+1075,mz+262);if(d<nd&&i>2&&i<mids.length-3){nd=d;near=[mx,mz,hd,w];}
      if(inHall&&i%3===0){steel.box(mx,PLAT_H,mz,0.3,3.6,0.3,hd,st);if(i+3<mids.length){const n=mids[Math.min(mids.length-1,i+3)];const L=Math.hypot(n[0]-mx,n[1]-mz);roof.box((mx+n[0])/2,PLAT_H+3.6,(mz+n[1])/2,Math.min(w-0.6,8),0.25,L+0.4,hd,rf);glow.box((mx+n[0])/2,PLAT_H+3.55,(mz+n[1])/2,0.25,0.05,L-1,hd,gl);}}
      if(i%8===4){const t=hbfSignTex(label);for(const s of [0,Math.PI]){const m=new THREE.Mesh(new THREE.PlaneGeometry(3.4,0.64),new THREE.MeshBasicMaterial({map:t}));m.position.set(mx,PLAT_H+3.05,mz);m.rotation.y=hd+s;scene.add(m);}steel.box(mx,PLAT_H+3.35,mz,0.05,0.4,0.05,hd,st);}
      if(i%6===1){for(const o of pl.haus?[-1.5]:[-1.3,1.3]){const nx=Math.cos(hd)*o,nz=-Math.sin(hd)*o;wood.box(mx+nx,PLAT_H,mz+nz,0.5,0.45,1.8,hd,wd);}}
      if(i%14===7&&!pl.haus){const t=hbfDisplayTex(pl.g[0]);const t2=hbfDisplayTex(pl.g[1]);for(const [tt,s] of [[t,-1],[t2,1]]){const nx=Math.cos(hd)*0.08*s,nz=-Math.sin(hd)*0.08*s;const m=new THREE.Mesh(new THREE.PlaneGeometry(1.8,0.5),new THREE.MeshBasicMaterial({map:tt}));m.position.set(mx+nx,PLAT_H+2.4,mz+nz);m.rotation.y=hd+(s>0?Math.PI/2:-Math.PI/2);scene.add(m);}steel.box(mx,PLAT_H+2.1,mz,0.12,0.6,0.12,hd,st);}}
    // Treppe zur Unterführung
    if(near){const [sx,sz,hd,w]=near;const ox=pl.haus?Math.cos(hd)*1.2:0,oz=pl.haus?-Math.sin(hd)*1.2:0;const x=sx+ox,z=sz+oz;
      steel.box(x,PLAT_H,z,1.9,1.1,0.1,hd,st);for(const s of [-1,1]){const nx=Math.cos(hd)*s*0.95,nz=-Math.sin(hd)*s*0.95;steel.box(x+nx,PLAT_H,z+nz,0.06,1.0,5.5,hd,st);}
      line.box(x,PLAT_H+0.005,z,1.8,0.01,5.2,hd,C3(0x2a2a2a));const t=hbfSignTex('↓ Unterführung · Ausgang');const m=new THREE.Mesh(new THREE.PlaneGeometry(2.6,0.48),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));m.position.set(x,PLAT_H+2.4,z);m.rotation.y=hd;scene.add(m);steel.box(x,PLAT_H,z,0.08,2.2,0.08,hd,st);
      pl.stair=[x,z,hd];}
    HBF.plats.push(pl);}
  for(const [G,mat] of [[top,stdMat({vertexColors:true,roughness:0.9})],[side,stdMat({vertexColors:true,roughness:0.9})],[line,stdMat({vertexColors:true,roughness:0.6})],[roof,stdMat({vertexColors:true,roughness:0.5,metalness:0.4})],[steel,stdMat({vertexColors:true,roughness:0.45,metalness:0.6})],[wood,stdMat({vertexColors:true,roughness:0.7})],[glow,new THREE.MeshBasicMaterial({vertexColors:true})]]){if(G.empty)continue;const m=new THREE.Mesh(G.geo(),mat);m.receiveShadow=true;m.castShadow=G!==line&&G!==top;scene.add(m);}
  label('Gleise 1–11',-1120,-300,'small');}
// ---------- Anzeiger ----------
function hbfDisplayTex(k){if(HBF.dispTex[k])return HBF.dispTex[k];const c=document.createElement('canvas');c.width=512;c.height=140;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;HBF.dispTex[k]=t;drawDisplay(k);return t;}
const fmtT=m=>{m=((Math.round(m)%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};
function drawDisplay(k){const t=HBF.dispTex[k];if(!t)return;const c=t.image,g=c.getContext('2d');g.fillStyle='#0b1f4d';g.fillRect(0,0,512,140);const e=HBF.sched.filter(s=>s.gleis===k).sort((a,b)=>a.t-b.t)[0];
  g.fillStyle='#fff';g.font='700 34px "Barlow Condensed",sans-serif';g.fillText('Gleis '+k,14,40);if(e){g.fillText(fmtT(e.t),150,40);if(e.delay){g.fillStyle='#ffd23f';g.fillText('+'+e.delay,250,40);g.fillStyle='#fff';}g.font='800 44px "Barlow Condensed",sans-serif';g.fillText(e.dest,14,100);g.font='600 26px "Barlow Condensed",sans-serif';g.fillText(e.line,400,40);}
  else{g.font='600 30px "Barlow Condensed",sans-serif';g.fillText('Bitte beachten Sie die Ansagen.',14,96);}t.needsUpdate=true;}
function drawBoard(){const t=HBF.boardTex;if(!t)return;const c=t.image,g=c.getContext('2d');g.fillStyle='#0b1f4d';g.fillRect(0,0,1024,512);g.fillStyle='#ffd23f';g.font='800 46px "Barlow Condensed",sans-serif';g.fillText('Abfahrt  Departure',24,56);g.fillStyle='#fff';g.font='600 30px "Barlow Condensed",sans-serif';g.fillText('Zeit      Zug          Ziel                                     Gleis',24,100);
  const L=HBF.sched.slice().sort((a,b)=>a.t-b.t).slice(0,7);L.forEach((e,i)=>{const y=150+i*50;g.fillStyle=i%2?'#122a63':'#0b1f4d';g.fillRect(14,y-36,996,48);g.fillStyle='#fff';g.font='700 34px "Barlow Condensed",sans-serif';g.fillText(fmtT(e.t),24,y);g.fillText(e.line,150,y);g.fillText(e.dest,330,y);g.fillText(e.gleis,940,y);if(e.delay){g.fillStyle='#ffd23f';g.fillText('+'+e.delay,90+10,y-0);}});t.needsUpdate=true;}
function drawClock(){const t=HBF.clockTex;if(!t)return;const c=t.image,g=c.getContext('2d');g.clearRect(0,0,256,256);g.fillStyle='#fff';g.beginPath();g.arc(128,128,120,0,6.28);g.fill();g.strokeStyle='#111';g.lineWidth=8;g.stroke();for(let i=0;i<12;i++){const a=i/12*6.28;g.fillStyle='#111';g.save();g.translate(128,128);g.rotate(a);g.fillRect(-4,-112,8,26);g.restore();}
  const m=gameMin%720;const ha=m/720*6.28,ma=(gameMin%60)/60*6.28;g.save();g.translate(128,128);g.rotate(ha);g.fillStyle='#111';g.fillRect(-6,-70,12,80);g.restore();g.save();g.translate(128,128);g.rotate(ma);g.fillRect(-4,-104,8,114);g.restore();g.fillStyle='#c8102e';g.beginPath();g.arc(128,128,9,0,6.28);g.fill();t.needsUpdate=true;}
// ---------- Fahrplan, Züge ----------
function schedTrain(){const free=Object.keys(HBF_TRACKS).filter(k=>!HBF.sched.some(s=>s.gleis===k)&&!HBF.trains.some(t=>t.k===k));if(!free.length)return;const k=mpick(free);
  const ty=wpickM(TRAIN_TYPES.map(T=>[T,T.w8]));const [line,dest]=mpick(ty.lines);const delay=Math.random()<0.35?mpick([2,5,5,10,15,25]):0;HBF.sched.push({t:gameMin+mr(60,170)+delay,gleis:k,ty,line,dest,delay,ann:false});drawBoard();drawDisplay(k);}
function trainGeo(T,front){const g=new GB();const body=C3(T.col),str=C3(T.stripe),win=C3(0x1a2230),dr=C3(0xd0d0d0);const L=T.len-0.8,W=T.w,H=T.h-1.1;
  g.box(0,1.1,0,W,H,L,0,body);g.box(0,1.1+H*0.18,0,W+0.02,0.22,L,0,str);g.box(0,1.1+H*0.48,0,W+0.03,H*0.24,L-1.6,0,win);if(T.k==='re')g.box(0,1.1+H*0.78,0,W+0.03,H*0.14,L-1.6,0,win);
  for(const z of [-L*0.3,L*0.3])g.box(0,1.15,z,W+0.04,H*0.7,1.3,0,dr);g.box(0,0.25,0,W-0.6,0.85,L-1,0,C3(0x2a2a2a));g.box(0,1.1+H,0,W-0.3,0.2,L-0.4,0,C3(0x9a9a9a));
  if(front){g.box(0,1.1,L/2+0.6,W*0.9,H*0.85,1.2,0,body);g.box(0,1.1+H*0.45,L/2+1.21,W*0.7,H*0.3,0.02,0,win);g.box(-W*0.3,1.4,L/2+1.21,0.3,0.15,0.02,0,C3(0xfff6d0));g.box(W*0.3,1.4,L/2+1.21,0.3,0.15,0.02,0,C3(0xfff6d0));}
  return g.geo();}
const TRAIN_MAT=stdMat({vertexColors:true,roughness:0.35,metalness:0.25});
function spawnTrain(e){const T=trackOf(e.gleis);if(!T)return;const ty=e.ty;const dir=Math.random()<0.5?1:-1;const cars=[];
  for(let i=0;i<ty.cars;i++){const m=new THREE.Mesh(trainGeo(ty,i===0||i===ty.cars-1),TRAIN_MAT);m.castShadow=true;scene.add(m);cars.push(m);}
  const total=ty.cars*ty.len;const stop=T.L*0.5+total*0.5*dir;// Zugspitze
  const tr={k:e.gleis,T,ty,dir,cars,u:-10,stopU:dir>0?stop:T.L-stop,v:ty.vmax,stage:'in',dwell:mr(18,28),e,total,soundT:0};tr.stopU=dir>0?stop:(T.L-stop);HBF.trains.push(tr);
  hbfAnnounce(`Gleis ${e.gleis}: Einfahrt ${e.line} nach ${e.dest}. Vorsicht bei der Einfahrt.`);}
function trainPos(tr,u){return tr.dir>0?u:tr.T.L-u;}
function updateTrains(dt){for(let i=HBF.trains.length-1;i>=0;i--){const tr=HBF.trains[i];
    if(tr.stage==='in'){const rem=tr.stopU-tr.u;tr.v=Math.min(tr.ty.vmax,Math.sqrt(Math.max(0,2*0.9*rem)));tr.u+=tr.v*dt;if(rem<0.3){tr.u=tr.stopU;tr.v=0;tr.stage='dwell';trainBrake(tr,false);}if(tr.v<7&&tr.v>0.5&&!tr.squeal){tr.squeal=true;trainBrake(tr,true);}}
    else if(tr.stage==='dwell'){tr.dwell-=dt;if(tr.dwell<=0){tr.stage='out';const ix=HBF.sched.indexOf(tr.e);if(ix>=0)HBF.sched.splice(ix,1);drawBoard();drawDisplay(tr.k);trainBeep(tr);}}
    else{tr.v=Math.min(tr.ty.vmax,tr.v+0.8*dt);tr.u+=tr.v*dt;if(tr.u-tr.total>tr.T.L+20){for(const m of tr.cars){scene.remove(m);m.geometry.dispose();}HBF.trains.splice(i,1);continue;}}
    for(let c=0;c<tr.cars.length;c++){const m=tr.cars[c];const u=tr.u-(c+0.5)*tr.ty.len;if(u<0||u>tr.T.L){m.visible=false;continue;}const [x,z,h]=trackAt(tr.T,trainPos(tr,u));m.visible=true;m.position.set(x,0.05,z);m.rotation.y=h+(tr.dir>0?0:Math.PI)+(c===tr.cars.length-1?Math.PI:0);}
    // Spieler-Kollision
    for(const P of PLAYERS){const h=P.h;if(!h||P.car||h.room)continue;for(const m of tr.cars){if(!m.visible)continue;const dx=h.x-m.position.x,dz=h.z-m.position.z;if(Math.abs(dx)>20||Math.abs(dz)>20)continue;const c=Math.cos(m.rotation.y),s=Math.sin(m.rotation.y);const lx=dx*c-dz*s,lz=dx*s+dz*c;
        if(Math.abs(lx)<tr.ty.w/2+0.25&&Math.abs(lz)<tr.ty.len/2&&h.y<tr.ty.h){if(tr.v>1.5&&!(P.trainHit>0)){P.trainHit=2;damagePlayer(P,18+tr.v*2.2);P.vy=5;P.cam.shake=0.6;showBig('VOM ZUG ERWISCHT','fail',2,'Gleise sind kein Gehweg!');}
          const push=(tr.ty.w/2+0.3)*(lx>=0?1:-1);const nx=push*c,nz=-push*s;const lzc=lz;h.x=m.position.x+nx+lzc*s;h.z=m.position.z+nz+lzc*c;}}if(P.trainHit>0)P.trainHit-=dt;}
    // Fahrgeräusch
    tr.soundT-=dt;if(tr.soundT<=0&&tr.v>2){tr.soundT=0.35;const [x,z]=trackAt(tr.T,trainPos(tr,tr.u-tr.total/2));const vol=distVol(x,z,160);if(vol>0.02)noiseHit(0.12*vol*Math.min(1,tr.v/12),0.4,220);}}}
function trainBrake(tr,on){if(!on)return;const [x,z]=trackAt(tr.T,trainPos(tr,tr.u));const vol=distVol(x,z,180);const ctx=AUD.ctx;if(!ctx||vol<0.03)return;const t=ctx.currentTime;const o=ctx.createOscillator();o.type='sawtooth';o.frequency.setValueAtTime(2600,t);o.frequency.linearRampToValueAtTime(1900,t+3);const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=2400;f.Q.value=8;const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.035*vol,t+0.4);g.gain.exponentialRampToValueAtTime(0.0001,t+3.2);o.connect(f);f.connect(g);g.connect(AUD.master);o.start(t);o.stop(t+3.3);}
function trainBeep(tr){const [x,z]=trackAt(tr.T,trainPos(tr,tr.u));const vol=distVol(x,z,90);const ctx=AUD.ctx;if(!ctx||vol<0.05)return;let t=ctx.currentTime;for(let i=0;i<6;i++){const o=ctx.createOscillator();o.type='square';o.frequency.value=1150;const g=ctx.createGain();g.gain.setValueAtTime(0.03*vol,t);g.gain.setValueAtTime(0,t+0.12);o.connect(g);g.connect(AUD.master);o.start(t);o.stop(t+0.13);t+=0.25;}}
// ---------- Ansagen ----------
let ansEl=null;
function hbfGong(){const ctx=AUD.ctx;if(!ctx)return;let t=ctx.currentTime;for(const f of [784,659,523]){const o=ctx.createOscillator();o.type='sine';o.frequency.value=f;const o2=ctx.createOscillator();o2.type='sine';o2.frequency.value=f*2.01;const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.09,t+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+1.4);const g2=ctx.createGain();g2.gain.value=0.25;o.connect(g);o2.connect(g2);g2.connect(g);g.connect(AUD.master);o.start(t);o2.start(t);o.stop(t+1.5);o2.stop(t+1.5);t+=0.42;}}
function hbfAnnounce(text){const P=P1;if(!P.h)return;const [px,pz]=ppos(P);const inside=P.h.room&&P.h.room.venue&&P.h.room.venue.id==='hbf';if(!inside&&Math.hypot(px+1080,pz+270)>320)return;
  if(!ansEl){ansEl=document.createElement('div');ansEl.style.cssText='position:fixed;left:50%;top:64px;transform:translateX(-50%);max-width:min(720px,90vw);padding:8px 16px;border-radius:8px;background:rgba(11,31,77,0.92);color:#fff;font:600 17px "Barlow Condensed",sans-serif;z-index:7;pointer-events:none;box-shadow:0 4px 18px rgba(0,0,0,.4);display:none';document.body.appendChild(ansEl);}
  ansEl.innerHTML='🔊 '+text;ansEl.style.display='';clearTimeout(ansEl._t);ansEl._t=setTimeout(()=>{ansEl.style.display='none';},7000);hbfGong();}
function updateHbf(dt){if(mode!=='play')return;const P=P1;if(!P.h)return;const [px,pz]=ppos(P);const near=Math.hypot(px+1080,pz+270)<700;
  if(near&&!HBF.built)buildHbf();if(!HBF.built)return;
  if(Math.floor(gameMin)!==HBF.lastMin){HBF.lastMin=Math.floor(gameMin);drawClock();}
  for(let n=0;n<8&&HBF.sched.length<6;n++)schedTrain();
  for(const e of HBF.sched){if(!e.spawned&&gameMin>=e.t-18){e.spawned=true;if(near)spawnTrain(e);else{const ix=HBF.sched.indexOf(e);}}}
  for(let i=HBF.sched.length-1;i>=0;i--){const e=HBF.sched[i];if(e.spawned&&!HBF.trains.some(t=>t.e===e)&&gameMin>e.t+1){HBF.sched.splice(i,1);drawBoard();drawDisplay(e.gleis);}}
  // Uhrzeit springt (T-Taste, Schalter) → Fahrplan neu
  if(HBF.sched.some(e=>e.t-gameMin>400||gameMin-e.t>30)){HBF.sched=HBF.sched.filter(e=>HBF.trains.some(t=>t.e===e));drawBoard();for(const k in HBF.dispTex)drawDisplay(k);}
  updateTrains(dt);
  HBF.funT-=dt;if(HBF.funT<=0){HBF.funT=mr(120,220);hbfAnnounce(mpick(HBF_FUN));}
  // Treppen von den Bahnsteigen in die Unterführung
  if(!P.car&&!P.h.room){for(const pl of HBF.plats){if(!pl.stair)continue;const d=Math.hypot(pl.stair[0]-P.h.x,pl.stair[1]-P.h.z);if(d<2.6&&P.h.y>0.4){P._stT=(P._stT||0)-dt;if(P._stT<=0){P._stT=0.8;hint('<b>F</b>: Treppe runter in die Unterführung',1,P);}pl._near=true;}else pl._near=false;}}}
// ---------- Empfangshalle + Unterführung (Innenraum) ----------
const HBF_STAIRS=[['1',8],['2/3',13],['4/5',18],['6/8',23],['1/11',27]];
VENUES.push({id:'hbf',name:'Mainz Hauptbahnhof',sub:'Empfangshalle · Gleise 1–11 über die Unterführung',W:58,D:30,H:12,wall:0xd9d3c4,ceil:0xeae6dc,hemiI:0.7,exp:1.0,lampI:30,lampD:28,
  lights:[[-20,10,-6],[-20,10,6],[-8,10,-6],[-8,10,6],[14,3,0],[24,3,0]],
  wp:[[-24,0],[-14,-8],[-14,8],[-4,0],[2,0],[10,0],[16,0],[22,0],[-20,-10],[-6,10]],
  spawn:[-26.5,0,Math.PI/2],
  exits:[{x:-28.6,z:0,w:0.8,d:2.4,to:'door'}],
  build(r,B){r.grp.children[0].material=stdMat({map:stoneTileTex,roughness:0.5});
    // Unterführung: Rest blockieren
    B.sbox('stone',16.5,0,-9.5,25,12,11,0xd9d3c4);B.box('stone',16.5,3.2,0,25,0.3,8,0xc8c2b6);
    {let x0=4;const xs=HBF_STAIRS.map(s=>s[1]);for(const x of [...xs,30]){const x1=x-1.3;if(x1>x0)B.sbox('stone',(x0+x1)/2,0,9.5,x1-x0,12,11,0xd9d3c4);x0=x+1.3;}
      for(const x of xs){B.solid(x,9.5,2.6,11);for(let k=0;k<16;k++)B.box('stone',x,0,4.15+k*0.31,2.5,0.2+k*0.2,0.31,0xb8b2a6);B.box('stone',x,3.4,7,2.6,0.2,6.2,0xc8c2b6);B.box('glow',x,3.3,6,0.6,0.05,1.2,0xf4f8ff);}}
    for(let x=6;x<29;x+=3)B.box('glow',x,3.1,0,1.4,0.05,0.3,0xf4f8ff);
    B.box('stone',16.5,0,-3.95,25,1.2,0.1,0x2f6b8a);B.box('stone',16.5,0,3.95,25,1.2,0.1,0x2f6b8a);
    // Treppen zu den Gleisen
    r.stairs=[];for(const [nm,x] of HBF_STAIRS){B.box('metal',x-1.25,0,3.6,0.06,1.0,1.2,0x8c949c);B.box('metal',x+1.25,0,3.6,0.06,1.0,1.2,0x8c949c);
      const t=hbfSignTex('↑ Gleis '+nm.replace('/',' | '));B.plane(t,x,2.75,3.85,2.4,0.45,Math.PI);r.stairs.push([nm,x]);}
    // Halle: Abfahrtstafel, Uhr, Reisezentrum, Läden, Automaten, Bänke
    const bc=document.createElement('canvas');bc.width=1024;bc.height=512;HBF.boardTex=new THREE.CanvasTexture(bc);HBF.boardTex.colorSpace=THREE.SRGBColorSpace;B.plane(HBF.boardTex,-6,6.2,-14.7,10,5,0);drawBoard();
    const cc=document.createElement('canvas');cc.width=256;cc.height=256;HBF.clockTex=new THREE.CanvasTexture(cc);HBF.clockTex.colorSpace=THREE.SRGBColorSpace;const cl=B.plane(HBF.clockTex,-6,10,-14.7,1.8,1.8,0);drawClock();
    B.sbox('wood',-22,0,-13,10,1.15,2,0x7a1f1f);B.plane(textTex('DB Reisezentrum',{bg:'#c8102e',fg:'#fff'}),-22,3.4,-14.7,6,1.1,0);
    r.mshops=[];[['Ditsch',0,-26,13],['Haferkater',3,-17,13],['Presse & Buch',2,-8,13]].forEach(([nm,cat,x,z])=>{B.box('dark',x,0,z+1.2,7,3.6,0.5,0x3a3f45);B.box('glow',x,0.4,z+0.9,6,2.8,0.02,0xfff6e5);B.plane(textTex(nm,{bg:'#20262c',fg:'#ffd23f'}),x,4.2,z+0.85,5,0.9,Math.PI);B.solid(x,z+1.2,7,1.4);r.mshops.push({name:nm,cat,x:r.ox+x,z:r.oz+z-0.5,doorX:r.ox+x,doorZ:r.oz+z-0.2,nx:0,nz:-1,face:Math.PI,inVenue:'hbf'});});
    for(let k=0;k<4;k++){B.sbox('stone',2,0,-12+k*1.6,1,1.8,0.9,0xc8102e);B.box('glow',1.48,1.1,-12+k*1.6,0.02,0.5,0.5,0x9fd0ff);}
    for(const z of [-5,5])B.sbox('wood',-14,0,z,5,0.45,0.6,0x8a5a30);
    for(const [x,z] of [[-20,-6],[-20,6],[-8,-6],[-8,6]])B.sbox('stone',x,0,z,1,12,1,0xc9c2b2);
    for(let x=-26;x<=0;x+=6)B.box('glow',x,11.7,0,3.5,0.05,24,0xf2f6ff);
    B.box('wood',-28.75,0,0,0.2,3.6,4.6,0x2a3b4c);B.plane(textTex('Ausgang · Bahnhofplatz',{bg:'#16326e',fg:'#fff'}),-28.6,4.2,0,4,0.7,Math.PI/2);},
  npcs(r){const T=['MEIN ZUG! MEIN ZUG!','Weiß jemand, wo Gleis 9 ¾ ist?','Die Bahn is schon wieder zu spät. Wie immer.','Ich fahr nach Wiesbaden. Freiwillig.','Hat jemand mei Ticket gesehen?','Ich hab nur noch drei Minuten Umstieg!'];
    for(let k=0;k<10;k++)vPerson(r,mr(-25,24),mr(-2.5,2.5)+(Math.random()<0.5?0:mr(-9,9))*(k<6?1:0),mr(0,6),{lines:T,suitcase:Math.random()<0.6,speed:mr(1.1,1.6)});
    vPerson(r,mr(-20,10),0,0,{lines:T,suitcase:true}).vrole='rush';
    vPerson(r,-22,-11.6,0,{role:'stand',lines:['Ich weiß auch nicht, wann der Zug kommt.','Bitte ziehen Sie eine Nummer. Die Nummer is aus.','Haben Sie es schon mit der App versucht?']});
    vPerson(r,-14,5,Math.PI,{pose:'sit',lines:['*schnarcht*','Ich wohn hier. Seit dem Zugausfall 2019.']});},
  ceilAt(lx,lz){return lx>4?3.1:11.5;},
  onEnter(r){venueMusic(null);},
  interact(P,r){const h=P.h;for(const [nm,x] of r.stairs){if(Math.abs(h.x-(r.ox+x))<1.6&&h.z-r.oz>1.4){hbfToPlatform(P,nm);return;}}},
  update(r,dt,P){const h=P.h;const lx=h.x-r.ox,lz=h.z-r.oz;r.stHint=(r.stHint||0)-dt;for(const [nm,x] of r.stairs){if(Math.abs(lx-x)<1.4&&lz>1.4){if(lz>2.6){hbfToPlatform(P,nm);return;}if(r.stHint<=0){r.stHint=0.8;hint(`Treppe hoch zu <b>Gleis ${nm}</b> (weiterlaufen oder <b>F</b>)`,1,P);}}}}});
function hbfToPlatform(P,nm){if(!HBF.built)buildHbf();const pl=HBF.plats.find(p=>p.n===nm||(p.haus&&nm==='1'));if(!pl||!pl.stair){hint('Dieser Bahnsteig ist gesperrt.',2,P);return;}const [x,z,hd]=pl.stair;const fx=Math.sin(hd),fz=Math.cos(hd);exitVenue(P,[x+fx*3.4,z+fz*3.4,hd,PLAT_H]);hint(`Bahnsteig <b>Gleis ${nm.replace('/',' / ')}</b>`,2.5,P);}
function hbfStairNear(P){if(!HBF.built||P.car||P.h.room)return null;return HBF.plats.find(p=>p._near)||null;}
