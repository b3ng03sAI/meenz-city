// ===================== SPONTANE GOKART-RENNEN (Mainz + Wiesbaden) =====================
const KART={offer:null,next:150+Math.random()*120,race:null,hud:null};
const KART_NAMES=['Hannelore Flitzer','Schorsch vom Kappelhof','Fritz Fleischworscht','Gisela Gaspedal','Kalle Kurvenkönig','Uschi Ölfleck','Heinz Helau','Bärbel Bremsweg'];
const KART_COLORS=[0x1e88ff,0x22cc66,0xffc400,0xff3355,0x9b59ff,0xff8a1a,0x00c8c8];
// Rundkurs aus dem Straßennetz: Hinweg als Zufallsweg, Rückweg als kürzester Weg (Dijkstra, begrenzt)
function kartRoute(x,z){const n0=nearestNode(x,z,true);if(n0<0)return null;const out=[n0];let cur=n0,prev=-1,len=0;const used=new Set();
  for(let k=0;k<400&&len<650;k++){const opts=NODES[cur].e.filter(e=>EDGES[e].car&&EDGES[e].road.type!=='main'||EDGES[e].car&&Math.random()<0.3);let o2=opts.filter(e=>edgeOther(e,cur)!==prev&&!used.has(e));if(!o2.length)o2=opts.filter(e=>!used.has(e));if(!o2.length)break;const opts_=o2;const e=mpick(opts_);used.add(e);prev=cur;cur=edgeOther(e,cur);out.push(cur);len+=EDGES[e].len;}
  if(len<300){KART.why='walk '+Math.round(len);return null;}
  // Rückweg
  const R=1400,dist=new Map([[cur,0]]),from=new Map();const Q=[[0,cur]];const pop=()=>{let bi=0;for(let i=1;i<Q.length;i++)if(Q[i][0]<Q[bi][0])bi=i;return Q.splice(bi,1)[0];};
  while(Q.length){const [d,n]=pop();if(n===n0)break;if(d>(dist.get(n)??1e18))continue;for(const e of NODES[n].e){const E=EDGES[e];if(!E.car)continue;const o=edgeOther(e,n);const N=NODES[o];if(Math.hypot(N.x-x,N.z-z)>R)continue;const nd=d+E.len*(used.has(e)?6:1);if(nd<(dist.get(o)??1e18)){dist.set(o,nd);from.set(o,n);Q.push([nd,o]);}}if(Q.length>4000)break;}
  if(!from.has(n0)){KART.why='dijkstra '+dist.size;return null;}const back=[];let n=n0;while(n!==cur){back.push(n);n=from.get(n);}back.reverse();const nodes=out.concat(back.slice(1));
  // gleichmäßig abtasten (alle 6 m)
  const pts=nodes.map(i=>[NODES[i].x,NODES[i].z]);const S=[];let acc=0;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L<0.01)continue;for(let t=(6-acc%6)%6;t<L;t+=6)S.push([a[0]+(b[0]-a[0])*t/L,a[1]+(b[1]-a[1])*t/L]);acc+=L;}
  const tot=S.length*6;if(S.length<60||tot>2600){KART.why='len '+tot;return null;}
  // Kurven-Tempolimit
  const lim=S.map((p,i)=>{const a=S[(i-3+S.length)%S.length],b=S[(i+3)%S.length];const h1=Math.atan2(p[0]-a[0],p[1]-a[1]),h2=Math.atan2(b[0]-p[0],b[1]-p[1]);const dh=Math.abs(angDiff(h1,h2));return dh>0.05?Math.max(9,Math.sqrt(11*18/dh)):31;});
  for(let k=0;k<3;k++)for(let i=0;i<S.length;i++)lim[i]=Math.min(lim[i],lim[(i+1)%S.length]+3.5);
  return {S,lim,len:tot};}
function kartAt(R,s){const n=R.S.length;const f=((s/6)%n+n)%n;const i=Math.floor(f),t=f-i;const a=R.S[i],b=R.S[(i+1)%n];return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,Math.atan2(b[0]-a[0],b[1]-a[1])];}
function kartProject(R,x,z,s0){const n=R.S.length;let best=s0,bd=1e9;for(let k=-14;k<=24;k++){const s=s0+k*6;const p=kartAt(R,s);const d=Math.hypot(p[0]-x,p[1]-z);if(d<bd){bd=d;best=s;}}return [best,bd];}
function itemBox(x,z){const g=new THREE.Group();const box=new THREE.Mesh(new THREE.BoxGeometry(1.1,1.1,1.1),new THREE.MeshStandardMaterial({color:0xffffff,emissive:0x6644ff,emissiveIntensity:0.35,transparent:true,opacity:0.75,roughness:0.2}));
  const rib=stdMat({color:0xff3366,emissive:0x661122});const r1=new THREE.Mesh(new THREE.BoxGeometry(1.14,1.14,0.18),rib),r2=new THREE.Mesh(new THREE.BoxGeometry(0.18,1.14,1.14),rib);box.add(r1,r2);const bow=new THREE.Mesh(new THREE.TorusGeometry(0.2,0.07,6,12),rib);bow.position.y=0.65;box.add(bow);
  g.add(box);g.position.set(x,groundY(x,z)+1.1,z);scene.add(g);return {g,x,z,t:0};}
const ITEMS={turbo:'🌭 Worscht-Turbo',oel:'🛢 Ölfleck',rakete:'🚀 Zielsuch-Rakete',brezel:'🥨 Riesen-Brezel (Schild)'};
function kartOffer(){const P=P1;if(!P.h||P.gameOver||activeMission||P.h.room||INDOOR||wanted>0){KART.why='cond';return;}const [px,pz]=ppos(P);let route=null,sp=null;
  for(let k=0;k<14&&!route;k++){const a=Math.random()*TAU;const x=px+Math.cos(a)*mr(70,130),z=pz+Math.sin(a)*mr(70,130);route=kartRoute(x,z);if(route)sp=route.S[0];}
  if(!route)return;const [x,z,h]=kartAt(route,0);const c=new Car('gokart',x,z,h,{ctrl:'none',color:0xd81e1e,plate:'1'});c.ai={mode:'parked'};c.persist=true;c.mission=true;
  const b=beacon(0x30ff70,2.2,10);setBeacon(b,x,z);const dist=districtAt(x,z)||'der Stadt';KART.offer={c,b,route,t:120,where:dist};
  showBig('🏁 GOKART-RENNEN','mission',3,`Spontanes Rennen in ${dist}! Steig ins rote Kart am grünen Marker.`);hint(`🏁 <b>Gokart-Rennen</b> in ${dist} – das rote Kart wartet am <b>grünen Marker</b> (2 Min.)`,6);chime([523,659,784,1046]);}
function kartOfferEnd(keepCar){const o=KART.offer;if(!o)return;scene.remove(o.b);if(!keepCar&&!isPlayerCar(o.c))o.c.remove();KART.offer=null;}
function updateKart(dt){if(mode!=='play')return;
  if(KART.race){kartRaceUpdate(dt);return;}
  const o=KART.offer;if(o){o.t-=dt;o.b.userData.arrow.rotation.y+=dt*2;if(o.c.removed||o.c.dead||o.t<=0){kartOfferEnd(false);KART.next=200+Math.random()*200;return;}
    if(P1.car===o.c){kartOfferEnd(true);kartStart(o.c,o.route);}return;}
  if(activeMission||P1.car&&P1.car.T.plane)return;KART.next-=dt;if(KART.next<=0){KART.next=60;kartOffer();if(KART.offer)KART.next=240+Math.random()*180;}}
function kartStart(pc,route){const R=route;const K={R,laps:2,t:-3.5,karts:[],boxes:[],oils:[],rockets:[],player:{c:pc,s:0,lap:0,item:null,turbo:0,spin:0,shield:0},done:false,result:null};KART.race=K;pc.persist=true;
  // Startaufstellung hinter der Linie
  const [x0,z0,h0]=kartAt(R,0);pc.x=x0;pc.z=z0;pc.h=h0;pc.vx=pc.vz=0;pc.speed=0;
  for(let i=0;i<5;i++){const s=-(i+1)*5;const [x,z,h]=kartAt(R,s);const lat=(i%2?1.4:-1.4);const c=new Car('gokart',x+Math.cos(h)*lat,z-Math.sin(h)*lat,h,{ctrl:'none',color:KART_COLORS[i%KART_COLORS.length],plate:String(i+2)});c.ai={mode:'kart'};c.persist=true;c.mission=true;
    const d=new Human('ped');d.mission=true;d.state='kart';d.inCar=true;const hc=[0x1e88ff,0x22cc66,0xffc400,0x9b59ff,0x00c8c8,0xf2f2f2][i%6];const helm=new THREE.Mesh(new THREE.SphereGeometry(0.175,14,10),stdMat({color:hc,roughness:0.2,metalness:0.4}));helm.position.set(0,0.8,0);d.hips.add(helm);const vis=new THREE.Mesh(new THREE.SphereGeometry(0.178,14,8,-0.9,1.8,1.2,0.7),new THREE.MeshStandardMaterial({color:0x111418,roughness:0.05,metalness:0.6}));vis.position.copy(helm.position);d.hips.add(vis);if(d.face)d.face.visible=false;d.noFace=true;
    K.karts.push({c,d,s,lat,lap:0,base:mr(24.5,28.5),spin:0,item:null,itemT:mr(4,10),name:KART_NAMES[i%KART_NAMES.length],shield:0});}
  K.player.s=0;for(let s=90;s<R.len-40;s+=Math.max(160,R.len/4)){const [x,z,h]=kartAt(R,s);for(const l of [-2.6,0,2.6])K.boxes.push(itemBox(x+Math.cos(h)*l,z-Math.sin(h)*l));}
  const P=P1;startMission({id:'kart',tag:'K',title:'Gokart-Rennen',start:[x0,z0],free:true,begin(m){m.target=null;},update(m){return KART.race&&KART.race.result?KART.race.result:undefined;},end(m){kartCleanup();},reward:0,win:''},P);
  if(!KART.hud){const d=document.createElement('div');d.style.cssText='position:fixed;right:14px;top:70px;padding:8px 14px;border-radius:12px;background:rgba(10,12,20,.66);color:#fff;font:700 17px "Barlow Condensed",sans-serif;z-index:30;line-height:1.35;pointer-events:none;min-width:180px';document.body.appendChild(d);KART.hud=d;}
  KART.hud.style.display='block';missionText('Zwei Runden! Fahr durch die <b>Geschenk-Kisten</b> für Items – benutzen mit <b>E</b> oder Klick.',6);}
function kartPlace(K){const all=[{me:true,p:K.player.lap*K.R.len+K.player.s}].concat(K.karts.map(k=>({me:false,p:k.lap*K.R.len+k.s})));all.sort((a,b)=>b.p-a.p);return all.findIndex(a=>a.me)+1;}
function kartUseItem(){const K=KART.race;if(!K||K.t<0)return;const me=K.player;const it=me.item;if(!it)return;me.item=null;const c=me.c;
  if(it==='turbo'){me.turbo=2.6;chime([660,990]);}
  else if(it==='oel'){const fx=Math.sin(c.h),fz=Math.cos(c.h);const x=c.x-fx*2.4,z=c.z-fz*2.4;const m=new THREE.Mesh(new THREE.CircleGeometry(1.4,18).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:0x0a0a0c,roughness:0.05,metalness:0.6}));m.position.set(x,groundY(x,z)+0.04,z);scene.add(m);K.oils.push({x,z,m,t:25,owner:'p'});}
  else if(it==='rakete'){const ps=K.player.lap*K.R.len+K.player.s;let tgt=null,bd=1e9;for(const k of K.karts){const p=k.lap*K.R.len+k.s;if(p>ps&&p-ps<bd){bd=p-ps;tgt=k;}}if(!tgt)tgt=mpick(K.karts);const m=new THREE.Mesh(WGEO.rakete||new THREE.ConeGeometry(0.1,0.5,8).rotateX(Math.PI/2),stdMat({color:0xff3322}));m.position.set(c.x,c.y+0.8,c.z);scene.add(m);K.rockets.push({m,tgt,x:c.x,y:c.y+0.8,z:c.z,t:0});noiseHit(0.5,0.4,700);}
  else if(it==='brezel'){me.shield=8;chime([523,784]);}}
addEventListener('keydown',e=>{if(e.code==='KeyE'&&KART.race)kartUseItem();});
function kartSpin(k,who){if(k.shield>0){k.shield=0;return false;}k.spin=1.6;if(who&&k.d)say(k.d,mpick(['Ei Gude, wo isch mei Lenkrad?!','Des war unfair!','Mei Kart, mei Kart!','Nää, ne!']),2);return true;}
function kartRaceUpdate(dt){const K=KART.race;const R=K.R;const me=K.player;const c=me.c;K.t+=dt;
  if(c.removed||c.dead){K.result='fail';return;}
  // Countdown
  if(K.t<0){c.vx=c.vz=0;c.speed=0;const n=Math.ceil(-K.t);if(n!==K.cd){K.cd=n;if(n<=3){showBig(String(n),'mission',0.8);chime([440]);}}}
  else if(!K.go){K.go=true;showBig('LOS!','win',1);chime([880,1320]);}
  // Spieler-Fortschritt
  {const [ns]=kartProject(R,c.x,c.z,me.s);if(ns-me.s>-40&&ns-me.s<90)me.s=ns;if(me.s>=R.len){me.s-=R.len;me.lap++;if(me.lap<K.laps){missionText(`Letzte Runde!`,2);chime([880,1100]);}}else if(me.s<0){me.s+=R.len;me.lap--;}}
  if(P1.car!==c&&K.t>0){hint('Zurück ins <b>Kart</b>!',1);K.outT=(K.outT||0)+dt;if(K.outT>25){K.result='fail';return;}}else K.outT=0;
  if(me.turbo>0){me.turbo-=dt;const fx=Math.sin(c.h),fz=Math.cos(c.h);c.vx+=fx*22*dt;c.vz+=fz*22*dt;if(Math.random()<dt*30)spawnPart(c.x-fx*1.2,c.y+0.4,c.z-fz*1.2,{color:0xffa030,size:0.5,vy:0.4,life:0.25,grow:0.5,add:true});}
  if(me.spin>0){me.spin-=dt;c.h+=dt*9;c.vx*=Math.exp(-3*dt);c.vz*=Math.exp(-3*dt);}if(me.shield>0)me.shield-=dt;
  // Kisten
  for(const b of K.boxes){b.g.rotation.y+=dt*1.5;b.g.position.y=groundY(b.x,b.z)+1.1+Math.sin(simTime*3+b.x)*0.15;if(b.t>0){b.t-=dt;b.g.visible=b.t<=0;continue;}
    if(Math.hypot(c.x-b.x,c.z-b.z)<1.8&&!me.item){me.item=mpick(Object.keys(ITEMS));b.t=6;b.g.visible=false;chime([1046,1318]);hint(`Item: <b>${ITEMS[me.item]}</b> – <b>E</b> drücken!`,2.5);}
    for(const k of K.karts)if(!k.item&&Math.hypot(k.c.x-b.x,k.c.z-b.z)<1.8){k.item=mpick(['turbo','oel','rakete']);b.t=6;b.g.visible=false;}}
  // KI-Karts
  const pp=me.lap*R.len+me.s;
  for(const k of K.karts){if(K.t<0){const [x,z,h]=kartAt(R,k.s);k.c.x=x+Math.cos(h)*k.lat;k.c.z=z-Math.sin(h)*k.lat;k.c.h=h;}
    else{const i=Math.floor(((k.s/6)%R.S.length+R.S.length)%R.S.length);const kp=k.lap*R.len+k.s;const rb=clamp(1+(pp-kp)/600,0.82,1.18);let v=Math.min(k.base*rb,R.lim[i]*(0.95+k.base/120));
      if(k.turbo>0){k.turbo-=dt;v*=1.35;}if(k.spin>0){k.spin-=dt;v*=0.15;k.c.h+=dt*9;}if(k.shield>0)k.shield-=dt;
      k.v=lerp(k.v||0,v,Math.min(1,dt*1.6));k.s+=k.v*dt;if(k.s>=R.len){k.s-=R.len;k.lap++;}
      k.lat+=((Math.sin(simTime*0.4+k.base)*1.6)-k.lat)*dt*0.5;const [x,z,h]=kartAt(R,k.s);const tx=x+Math.cos(h)*k.lat,tz=z-Math.sin(h)*k.lat;k.c.x=tx;k.c.z=tz;if(k.spin<=0)k.c.h+=angDiff(k.c.h,h)*Math.min(1,dt*8);k.c.speed=k.v;k.c.vx=k.c.vz=0;
      // Items der KI
      k.itemT-=dt;if(k.item&&k.itemT<=0){k.itemT=mr(3,8);if(k.item==='turbo')k.turbo=2;else if(k.item==='oel'){const fx=Math.sin(k.c.h),fz=Math.cos(k.c.h);const ox=k.c.x-fx*2.4,oz=k.c.z-fz*2.4;const m=new THREE.Mesh(new THREE.CircleGeometry(1.4,18).rotateX(-Math.PI/2),new THREE.MeshStandardMaterial({color:0x0a0a0c,roughness:0.05,metalness:0.6}));m.position.set(ox,groundY(ox,oz)+0.04,oz);scene.add(m);K.oils.push({x:ox,z:oz,m,t:25,owner:k});}
        else if(k.item==='rakete'&&Math.abs(kp-pp)<120&&kp<pp){const m=new THREE.Mesh(WGEO.rakete||new THREE.ConeGeometry(0.1,0.5,8).rotateX(Math.PI/2),stdMat({color:0xff3322}));m.position.set(k.c.x,k.c.y+0.8,k.c.z);scene.add(m);K.rockets.push({m,tgt:'p',x:k.c.x,y:k.c.y+0.8,z:k.c.z,t:0});}k.item=null;}}
    k.c.y=groundY(k.c.x,k.c.z);
    // Fahrer-Pose
    const d=k.d,cc=k.c;const fx=Math.sin(cc.h),fz=Math.cos(cc.h);d.x=cc.x-fx*0.2;d.z=cc.z-fz*0.2;d.y=cc.y-0.38;d.facing=cc.h;d.g.position.set(d.x,d.y,d.z);d.g.rotation.set(0,cc.h,0);d.legL.rotation.set(-1.45,0,0.12);d.legR.rotation.set(-1.45,0,-0.12);d.armL.rotation.set(-1,0,0.3);d.armR.rotation.set(-1,0,-0.3);}
  // Ölflecken
  for(let i=K.oils.length-1;i>=0;i--){const o=K.oils[i];o.t-=dt;if(o.t<=0){scene.remove(o.m);K.oils.splice(i,1);continue;}let hit=false;
    if(o.owner!=='p'&&Math.hypot(c.x-o.x,c.z-o.z)<1.6&&me.spin<=0){if(me.shield>0)me.shield=0;else{me.spin=1.4;hint('Ölfleck! Wuiiii…',1.5);}hit=true;}
    for(const k of K.karts)if(k!==o.owner&&k.spin<=0&&Math.hypot(k.c.x-o.x,k.c.z-o.z)<1.6){kartSpin(k,true);hit=true;}if(hit){scene.remove(o.m);K.oils.splice(i,1);}}
  // Raketen
  for(let i=K.rockets.length-1;i>=0;i--){const r=K.rockets[i];r.t+=dt;const tg=r.tgt==='p'?c:r.tgt.c;const dx=tg.x-r.x,dy=tg.y+0.6-r.y,dz=tg.z-r.z;const L=Math.hypot(dx,dy,dz)||1;const v=45;r.x+=dx/L*v*dt;r.y+=dy/L*v*dt;r.z+=dz/L*v*dt;r.m.position.set(r.x,r.y,r.z);r.m.lookAt(tg.x,tg.y+0.6,tg.z);
    if(Math.random()<dt*40)spawnPart(r.x,r.y,r.z,{color:0xcccccc,size:0.4,vy:0.2,life:0.6,grow:1,alpha:0.5});
    if(L<1.4||r.t>6){scene.remove(r.m);K.rockets.splice(i,1);for(let j=0;j<12;j++)spawnPart(tg.x,tg.y+0.8,tg.z,{color:mpick([0xff7a1a,0xffd060]),size:mr(0.6,1.2),vy:mr(1,3),vx:mr(-2,2),vz:mr(-2,2),life:0.5,grow:1.2,add:true});noiseHit(0.5,0.3,900);
      if(r.tgt==='p'){if(me.shield>0)me.shield=0;else{me.spin=1.6;hint('Rakete im Heck!',1.5);}}else kartSpin(r.tgt,true);}}
  // Ziel
  const place=kartPlace(K);
  if(me.lap>=K.laps&&!K.done){K.done=true;const prize=[1500,800,400,150,50,0][place-1]||0;G.money+=prize;showBig(place===1?'SIEG! 🏆':`PLATZ ${place}`,'win',4,prize?`+ €${prize}`:'Nächstes Mal!');chime(place===1?[523,659,784,1046,1318]:[523,659]);K.finT=4;}
  if(K.done){K.finT-=dt;if(K.finT<=0){K.result=place<=3?'win':'fail';}}
  if(KART.hud){const it=me.item?ITEMS[me.item]:'—';KART.hud.innerHTML=`🏁 Runde ${Math.min(K.laps,me.lap+1)}/${K.laps}<br>Platz <span style="font-size:26px">${place}</span>/6<br><span style="font-weight:600;font-size:15px">Item: ${it}${me.shield>0?' · 🥨 Schild':''}</span>`;}
  // Zielpfeil für Minikarte
  if(activeMission){const [tx,tz]=kartAt(R,me.s+60);activeMission.target=[tx,tz];const rt=[];for(let k=0;k<=R.S.length;k+=4)rt.push(kartAt(R,me.s+k*6));activeMission.route=rt.slice(0,40).map(p=>[p[0],p[1]]);}}
function kartCleanup(){const K=KART.race;if(!K)return;for(const k of K.karts){k.c.remove();k.d.remove();}for(const b of K.boxes)scene.remove(b.g);for(const o of K.oils)scene.remove(o.m);for(const r of K.rockets)scene.remove(r.m);
  K.player.c.mission=false;K.player.c.persist=false;KART.race=null;if(KART.hud)KART.hud.style.display='none';KART.next=240+Math.random()*200;}
// Item auch per Linksklick/Feuer-Taste im Kart
const _pfKart=playerFire;playerFire=function(P,I){if(P.car&&P.car.T.kart&&KART.race){if(I&&I.fireP)kartUseItem();return;}_pfKart(P,I);};
