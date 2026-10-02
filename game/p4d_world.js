// ===================== HUD =====================
function fmtMoney(v){return '€'+String(Math.max(0,Math.floor(v))).padStart(8,'0');}
let bigT=0,hintT=0,hint2T=0,missT=0,zoneT=0,lastZone='',lastStreet='';
function showBig(text,cls='',dur=3,sub=''){const b=$('big');b.className='big show '+cls;b.innerHTML=`<div class="big-t">${text}</div>${sub?`<div class="big-s">${sub}</div>`:''}`;bigT=dur;}
function hint(text,dur=5,P=null){if(P&&P.id===1){const h=$('hint2');h.innerHTML=text;h.hidden=false;hint2T=dur;return;}const h=$('hint');h.innerHTML=text;h.hidden=false;hintT=dur;}
function missionText(text,dur=6){const m=$('mtext');m.innerHTML=text;m.hidden=false;missT=dur;}
function weaponLabel(P){const W=WEAPONS[P.weapon];if(W.melee)return ['',W.name];if(W.thrown)return [String(P.ammo[P.weapon]||0),W.name];return [P.reloadT>0?'LADEN…':`${P.mag[P.weapon]||0} / ${P.ammo[P.weapon]||0}`,W.name];}
function hudPlayer(P,sfx){const h=P.h;if(!h)return;const [am,nm]=weaponLabel(P);$('weapon'+sfx).textContent=nm;$('ammo'+sfx).textContent=am;
  $('hp'+sfx).style.width=clamp(h.health,0,100)+'%';$('ar'+sfx).style.width=clamp(P.armor,0,100)+'%';$('arwrap'+sfx).hidden=P.armor<=0;
  const sp=$('speed'+sfx);if(P.car){sp.hidden=false;sp.innerHTML=Math.round(Math.abs(P.car.speed)*3.6)+'<span> km/h</span>';}else sp.hidden=true;
  if(P.jet){$('jet'+sfx).style.width=Math.round(P.jet.fuel*100)+'%';$('jetwrap'+sfx).classList.toggle('on',!!P.jet.on);}
  const W=WEAPONS[P.weapon];$('cross'+sfx).hidden=!(!W.melee&&!P.car&&(P.inp.aim||P.aimT>0));}
function updateHUD(dt){
  $('money').textContent=fmtMoney(G.money);
  const hh=Math.floor(gameMin/60),mm=Math.floor(gameMin%60);$('clock').textContent=String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');
  const ws=document.querySelectorAll('#wanted .wheel');ws.forEach((w,i)=>w.classList.toggle('on',i<wanted));$('wanted').classList.toggle('flash',wanted>0&&!playerSeen);
  hudPlayer(P1,'');if(P2)hudPlayer(P2,'2');
  $('hurt').style.opacity=clamp(Math.max(P1.hurtT,P2?P2.hurtT:0)*2,0,0.7);
  if(bigT>0){bigT-=dt;if(bigT<=0)$('big').className='big';}
  if(hintT>0){hintT-=dt;if(hintT<=0)$('hint').hidden=true;}
  if(hint2T>0){hint2T-=dt;if(hint2T<=0)$('hint2').hidden=true;}
  if(missT>0){missT-=dt;if(missT<=0&&!activeMission)$('mtext').hidden=true;}
  if(zoneT>0){zoneT-=dt;if(zoneT<=0)$('zone').classList.remove('show');}
  if(activeMission&&activeMission.timer!=null){$('timer').hidden=false;const t=Math.max(0,activeMission.timer);$('timer').textContent=Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');$('timer').classList.toggle('low',t<20);}else $('timer').hidden=true;
  $('schoppen').textContent=SCHOPPEN.filter(s=>s.got).length+'/11';}
let zoneCheckT=0;
const ROAD_SEG_HASH=new Map();
function buildRoadSegHash(){for(const r of ROADS){if(!r.name)continue;for(let i=0;i<r.pts.length-1;i++){const a=r.pts[i],b=r.pts[i+1];const x0=Math.floor(Math.min(a[0],b[0])/40),x1=Math.floor(Math.max(a[0],b[0])/40),z0=Math.floor(Math.min(a[1],b[1])/40),z1=Math.floor(Math.max(a[1],b[1])/40);
  for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){const k=x+','+z;if(!ROAD_SEG_HASH.has(k))ROAD_SEG_HASH.set(k,[]);ROAD_SEG_HASH.get(k).push([r,i]);}}}}
function streetNameAt(x,z){const cx=Math.floor(x/40),cz=Math.floor(z/40);let best=null,bd=1e9;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const l=ROAD_SEG_HASH.get((cx+a)+','+(cz+b));if(!l)continue;
  for(const [r,i] of l){const p=r.pts;const d=segDist(x,z,p[i][0],p[i][1],p[i+1][0],p[i+1][1]).d-(r.w/2+r.sw)-(r.type==='path'?0:1);if(d<bd){bd=d;best=r;}}}return bd<4?best.name:null;}
function zoneAt(x,z){const i=idx(x,z);if(i>=0&&(mfG(i)&4)&&!bridgeLocal(x,z))return 'Rhein';{const b=bridgeLocal(x,z);if(b)return b.br.name;}return districtAt(x,z);}
function updateZone(dt){zoneCheckT-=dt;if(zoneCheckT>0)return;zoneCheckT=0.6;const [x,z]=ppos(P1);if(P1.h&&P1.h.room)return;const st=streetNameAt(x,z)||'';const zn=zoneAt(x,z);
  if(zn!==lastZone||(st&&st!==lastStreet)){if(zn!==lastZone||st){$('zone').innerHTML=(st?`<b>${st}</b>`:'')+`<span>${zn}</span>`;$('zone').classList.add('show');zoneT=4;}lastZone=zn;if(st)lastStreet=st;}}

// ---------- Minimap ----------
function blipList(forP){const out=[];
  for(const c of CARS)if(c.T.police&&(c.ai.mode==='police'||c.ai.mode==='police_parked'))out.push({x:c.x,z:c.z,c:((simTime*4|0)%2)?'#ff3b3b':'#3b7bff',r:4});
  for(const h of HUMANS)if(h.kind==='cop'&&h.alive&&!h.inCar&&wanted>0)out.push({x:h.x,z:h.z,c:'#ff6b6b',r:2.5});
  for(const h of HUMANS)if(h.kind==='gang'&&h.alive&&h.mission)out.push({x:h.x,z:h.z,c:'#ff4040',r:3});
  if(heli.on)out.push({x:heli.x,z:heli.z,c:'#ff3b3b',r:5,sq:true});
  if(!activeMission)for(const m of availableMissions())out.push({x:m.start[0],z:m.start[1],c:'#ffd23f',r:6,ring:true,label:m.tag});
  if(activeMission){if(activeMission.target)out.push({x:activeMission.target[0],z:activeMission.target[1],c:'#ffd23f',r:6,ring:true,edge:true});if(activeMission.marks)for(const p of activeMission.marks)out.push({x:p[0],z:p[1],c:'#ff8a3d',r:4,ring:true});}
  for(const p of PICKUPS)if(p.active&&p.kind!=='money'&&p.kind!=='crate')out.push({x:p.x,z:p.z,c:p.kind==='health'?'#5fd36a':p.kind==='armor'?'#58a8ff':'#e8e8e8',r:2.5});
  for(const p of PICKUPS)if(p.active&&p.kind==='crate')out.push({x:p.x,z:p.z,c:'#c06bff',r:4,ring:true});
  if(G.mapSchoppen)for(const s of SCHOPPEN)if(!s.got)out.push({x:s.x,z:s.z,c:'#ffd86b',r:3});
  out.push({x:POI.lack[0],z:POI.lack[1],c:'#c06bff',r:4,sq:true});
  for(const P of PLAYERS)if(P!==forP&&P.h){const [x,z]=ppos(P);out.push({x,z,c:P.id?'#58a8ff':'#ffffff',r:4.5,ring:true});}
  return out;}
function drawMinimap(P,canvas){const mctx=canvas.getContext('2d');const W=canvas.width,R=W/2;const [px,pz]=ppos(P);const spd=P.car?Math.abs(P.car.speed):0;const mpp=1.3+Math.min(1.6,spd*0.05);const k=1/mpp;
  const rot=P.cam.yaw+Math.PI;mctx.save();mctx.clearRect(0,0,W,W);mctx.beginPath();mctx.arc(R,R,R-2,0,TAU);mctx.clip();mctx.fillStyle='#3d6f86';mctx.fillRect(0,0,W,W);
  mctx.translate(R,R);mctx.rotate(rot);mctx.scale(k/OV_SC,k/OV_SC);mctx.translate(-(px-MINX)*OV_SC,-(pz-MINZ)*OV_SC);mctx.drawImage(OVERVIEW,0,0);
  if(activeMission&&activeMission.route){mctx.strokeStyle='rgba(255,210,63,0.9)';mctx.lineWidth=3/k;mctx.lineJoin='round';mctx.beginPath();activeMission.route.forEach((p,i)=>{const X=(p[0]-MINX)*OV_SC,Z=(p[1]-MINZ)*OV_SC;i?mctx.lineTo(X,Z):mctx.moveTo(X,Z);});mctx.stroke();}
  mctx.restore();
  const cr=Math.cos(rot),sr=Math.sin(rot);
  for(const b of blipList(P)){let dx=(b.x-px)*k,dz=(b.z-pz)*k;let sx=dx*cr-dz*sr,sy=dx*sr+dz*cr;const L=Math.hypot(sx,sy);if(L>R-10){if(!b.ring)continue;sx*=(R-10)/L;sy*=(R-10)/L;}
    mctx.fillStyle=b.c;mctx.strokeStyle='#111';mctx.lineWidth=1.5;mctx.beginPath();if(b.sq)mctx.rect(R+sx-b.r,R+sy-b.r,b.r*2,b.r*2);else mctx.arc(R+sx,R+sy,b.r,0,TAU);mctx.fill();mctx.stroke();}
  const f=P.car?P.car.h:P.h.facing;const a=f-P.cam.yaw;mctx.save();mctx.translate(R,R);mctx.rotate(-a);mctx.fillStyle=P.id?'#58a8ff':'#fff';mctx.strokeStyle='#111';mctx.lineWidth=1.5;mctx.beginPath();mctx.moveTo(0,-8);mctx.lineTo(6,7);mctx.lineTo(0,3);mctx.lineTo(-6,7);mctx.closePath();mctx.fill();mctx.stroke();mctx.restore();
  const nX=R+(0*cr-(-1)*sr)*(R-11),nY=R+(0*sr+(-1)*cr)*(R-11);mctx.fillStyle='#111';mctx.beginPath();mctx.arc(nX,nY,8,0,TAU);mctx.fill();mctx.fillStyle='#fff';mctx.font='700 11px "Barlow Condensed",sans-serif';mctx.textAlign='center';mctx.textBaseline='middle';mctx.fillText('N',nX,nY+0.5);
  mctx.strokeStyle='rgba(0,0,0,0.6)';mctx.lineWidth=3;mctx.beginPath();mctx.arc(R,R,R-2,0,TAU);mctx.stroke();}
// ---------- Große Karte ----------
const MAPV={cx:0,cz:0,s:0.5,init:false,drag:null};let DETAIL_BB=null;
function detailBB(){if(DETAIL_BB)return DETAIL_BB;const xs=[],zs=[];for(const b of BUILDINGS){if(b.x===undefined)continue;xs.push(b.x);zs.push(b.z);}
  if(xs.length<20){DETAIL_BB=[MINX,MINZ,MINX+WW,MINZ+WH];return DETAIL_BB;}xs.sort((a,b)=>a-b);zs.sort((a,b)=>a-b);const q=(a,p)=>a[Math.floor(p*(a.length-1))];
  DETAIL_BB=[q(xs,0.005)-150,q(zs,0.005)-150,q(xs,0.995)+150,q(zs,0.995)+150];return DETAIL_BB;}
function mapFit(){const c=$('mapc');const W=c.clientWidth||innerWidth,H=c.clientHeight||innerHeight;const bb=detailBB();const [px,pz]=ppos(P1);
  MAPV.s=Math.min(W/(bb[2]-bb[0]),H/(bb[3]-bb[1]))*0.95;MAPV.cx=(bb[0]+bb[2])/2;MAPV.cz=(bb[1]+bb[3])/2;
  // Spieler muss sichtbar sein
  const hw=W/2/MAPV.s,hh=H/2/MAPV.s;MAPV.cx=clamp(MAPV.cx,px-hw*0.85,px+hw*0.85);MAPV.cz=clamp(MAPV.cz,pz-hh*0.85,pz+hh*0.85);}
function mapZoom(f,mx,my){const c=$('mapc');const W=c.clientWidth,H=c.clientHeight;const wx=MAPV.cx+(mx-W/2)/MAPV.s,wz=MAPV.cz+(my-H/2)/MAPV.s;
  MAPV.s=clamp(MAPV.s*f,Math.min(W/WW,H/WH)*0.9,6);MAPV.cx=wx-(mx-W/2)/MAPV.s;MAPV.cz=wz-(my-H/2)/MAPV.s;drawBigMap();}
function mapHooks(){if(MAPV.hooked)return;MAPV.hooked=true;const c=$('mapc');
  c.addEventListener('wheel',e=>{e.preventDefault();const r=c.getBoundingClientRect();mapZoom(Math.exp(-e.deltaY*0.0015),e.clientX-r.left,e.clientY-r.top);},{passive:false});
  c.addEventListener('pointerdown',e=>{MAPV.drag=[e.clientX,e.clientY,MAPV.cx,MAPV.cz];c.setPointerCapture(e.pointerId);});
  c.addEventListener('pointermove',e=>{const d=MAPV.drag;if(!d)return;MAPV.cx=d[2]-(e.clientX-d[0])/MAPV.s;MAPV.cz=d[3]-(e.clientY-d[1])/MAPV.s;drawBigMap();});
  const up=()=>{MAPV.drag=null;};c.addEventListener('pointerup',up);c.addEventListener('pointercancel',up);
  c.addEventListener('dblclick',e=>{const r=c.getBoundingClientRect();mapZoom(2,e.clientX-r.left,e.clientY-r.top);});
  addEventListener('keydown',e=>{if(mode!=='map')return;if(e.code==='Equal'||e.code==='NumpadAdd'||e.code==='BracketRight'){const c2=$('mapc');mapZoom(1.4,c2.clientWidth/2,c2.clientHeight/2);}
    else if(e.code==='Minus'||e.code==='NumpadSubtract'||e.code==='Slash'){const c2=$('mapc');mapZoom(1/1.4,c2.clientWidth/2,c2.clientHeight/2);}
    else if(e.code==='Space'||e.code==='KeyC'){const [px,pz]=ppos(P1);MAPV.cx=px;MAPV.cz=pz;drawBigMap();}});
  addEventListener('resize',()=>{if(mode==='map')drawBigMap();});}
function drawBigMap(){mapHooks();if(!MAPV.open){MAPV.open=true;mapFit();}const c=$('mapc');const W=c.clientWidth,H=c.clientHeight;const dpr=Math.min(2,window.devicePixelRatio||1);c.width=W*dpr;c.height=H*dpr;const g=c.getContext('2d');g.scale(dpr,dpr);
  g.fillStyle='#1d2a31';g.fillRect(0,0,W,H);const s=MAPV.s;const ox=W/2-(MAPV.cx-MINX)*s,oz=H/2-(MAPV.cz-MINZ)*s;const T=(x,z)=>[ox+(x-MINX)*s,oz+(z-MINZ)*s];
  g.imageSmoothingEnabled=true;g.drawImage(OVERVIEW,ox,oz,WW*s,WH*s);
  g.textAlign='center';g.textBaseline='middle';const lab=s>0.55;
  for(const l of LANDMARK_LABELS){const [x,y]=T(l.x,l.z);if(x<-50||y<-50||x>W+50||y>H+50)continue;const big=l.cat==='lm';if(!big&&!lab&&l.cat!=='service')continue;g.fillStyle=l.cat==='service'?'#c06bff':big?'#ffd9a0':'#e8e0d0';g.beginPath();g.arc(x,y,big?3.5:2.5,0,TAU);g.fill();if(big||lab){g.font=(big?'700 14px':'600 12px')+' "Barlow Condensed",sans-serif';g.lineWidth=3;g.strokeStyle='rgba(10,14,18,0.85)';g.strokeText(l.name,x,y-11);g.fillStyle='#fff';g.fillText(l.name,x,y-11);}}
  const zones=(typeof PLACES!=='undefined'&&PLACES.length)?PLACES.map(p=>({n:(p.name||p.n||'').toUpperCase(),x:p.x,z:p.z})):[{n:'ALTSTADT',x:-60,z:150},{n:'NEUSTADT',x:-500,z:-1050},{n:'OBERSTADT',x:-700,z:600},{n:'INNENSTADT',x:-480,z:-250},{n:'MAINZ-KASTEL',x:950,z:-1050},{n:'KOSTHEIM',x:1150,z:-150}];
  g.font='800 '+Math.round(clamp(s*34,13,22))+'px "Bungee","Barlow Condensed",sans-serif';g.fillStyle='rgba(255,255,255,0.3)';for(const z of zones){if(!z.n)continue;const [x,y]=T(z.x,z.z);if(x<-100||y<-50||x>W+100||y>H+50)continue;g.fillText(z.n,x,y);}
  for(const b of blipList(null)){const [x,y]=T(b.x,b.z);if(x<-20||y<-20||x>W+20||y>H+20)continue;g.fillStyle=b.c;g.strokeStyle='#111';g.lineWidth=2;g.beginPath();g.arc(x,y,b.r+2,0,TAU);g.fill();g.stroke();if(b.label){g.font='700 13px "Barlow Condensed",sans-serif';g.fillStyle='#ffd23f';g.fillText(b.label,x,y+16);}}
  for(const P of PLAYERS){if(!P.h)continue;const [px,pz]=ppos(P);const [x,y]=T(px,pz);const f=P.car?P.car.h:P.h.facing;g.save();g.translate(x,y);g.rotate(Math.PI-f);g.fillStyle=P.id?'#58a8ff':'#fff';g.strokeStyle='#c8102e';g.lineWidth=2;g.beginPath();g.moveTo(0,-11);g.lineTo(8,9);g.lineTo(0,4);g.lineTo(-8,9);g.closePath();g.fill();g.stroke();g.restore();}
  // Maßstab + Bedienhinweis
  const m=[50,100,200,500,1000,2000].find(v=>v*s>70)||2000;g.fillStyle='rgba(10,14,18,0.75)';g.fillRect(12,H-46,Math.max(m*s,120)+24,34);g.fillStyle='#fff';g.fillRect(24,H-22,m*s,3);g.font='600 12px "Barlow Condensed",sans-serif';g.textAlign='left';g.fillText(m>=1000?(m/1000)+' km':m+' m',24,H-34);
  g.textAlign='right';g.fillStyle='rgba(255,255,255,0.75)';g.fillText('Mausrad/± zoomen · Ziehen verschieben · Leertaste: zu dir · Marker anklicken: Schnellreise',W-14,H-18);if(typeof ftDrawMarkers==='function')ftDrawMarkers();}

// ===================== HILFEN FÜR ORTE =====================
function roadSpot(x,z,off=0){const n=nearestNode(x,z,true);if(n<0)return freeSpot(x,z,1);const N=NODES[n];const e=N.e.find(e=>EDGES[e].car);if(e===undefined)return [N.x,N.z];const E=EDGES[e];const o=NODES[edgeOther(e,n)];const t=Math.min(8,E.len/2);
  const d=[(o.x-N.x)/E.len,(o.z-N.z)/E.len];const lo=off||(E.road.lane||0);return [N.x+d[0]*t-d[1]*lo,N.z+d[1]*t+d[0]*lo,Math.atan2(d[0],d[1])];}
function waterSpotNear(x,z,maxR=220){for(let r=2;r<maxR;r+=2){for(let a=0;a<TAU;a+=0.2){const px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;const i=idx(px,pz);if(i<0||!(mfG(i)&4)||bridgeLocal(px,pz))continue;
  // Ufer in der Nähe, aber genug freies Wasser
  let land=null;for(let b=0;b<TAU;b+=0.4){const qx=px+Math.cos(b)*9,qz=pz+Math.sin(b)*9;const j=idx(qx,qz);if(j>=0&&!(mfG(j)&4)){land=b;break;}}if(land===null)continue;
  let ok=true;for(let b=0;b<TAU;b+=0.6){const qx=px+Math.cos(b)*4,qz=pz+Math.sin(b)*4;const j=idx(qx,qz);if(j<0||!(mfG(j)&4)){ok=false;break;}}if(!ok)continue;if(blockedBoat(px,pz))continue;
  return [px,pz,land+Math.PI/2];}}return null;}

// ===================== MISSIONEN =====================
let activeMission=null;const MISSIONS=[];
function beacon(color=0xffd23f,r=1.6,h=7){const g=new THREE.Group();const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,24,1,true),new THREE.MeshBasicMaterial({color,transparent:true,opacity:0.32,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));m.position.y=h/2;g.add(m);
  const a=new THREE.Mesh(new THREE.ConeGeometry(0.6,1.2,4),new THREE.MeshBasicMaterial({color}));a.rotation.x=Math.PI;a.position.y=2.6;g.add(a);g.userData.arrow=a;scene.add(g);return g;}
function setBeacon(b,x,z){const i=idx(x,z);b.position.set(x,(i>=0&&(mfG(i)&4)&&!bridgeLocal(x,z))?WATER_LEVEL:groundY(x,z),z);b.visible=true;}
const startBeacons=[];let targetBeacon=null,lackBeacon=null;
function availableMissions(){const done=MISSIONS.filter(m=>G.done[m.id]).length;return MISSIONS.filter((m,i)=>!G.done[m.id]&&(m.free||i<=done+2));}
function mP(m){return m.P||P1;}
function mpos(m){return ppos(mP(m));}
function near(m,p,r){const [x,z]=mpos(m);return Math.hypot(x-p[0],z-p[1])<r;}
function landmarkRoad(k,d){const p=POI[k]||PL[k]||d;return roadSpot(p[0],p[1]);}
function spawnMissionCar(type,pos,o={}){const c=new Car(type,pos[0],pos[1],pos[2]||0,Object.assign({ctrl:'none'},o));if(c.collides()){const [x,z]=freeSpot(pos[0],pos[1],1.6);c.x=x;c.z=z;}c.ai={mode:o.boat?'docked':'parked'};c.mission=true;c.persist=true;return c;}
function defineMissions(){
  // 1 Weck, Worscht un Woi
  MISSIONS.push({id:'wws',tag:'W',title:'Weck, Worscht un Woi',start:freeSpot(POI.markt[0],POI.markt[1],0.5),
    begin(m){m.timer=190;m.target=freeSpot(POI.reduit[0],POI.reduit[1],0.6);missionText('Der Metzger am Markt braucht dich: Bring die <b>Fleischworscht</b> und den <b>Woi</b> zum <b>Reduit</b> nach Kastel. Über die Theodor-Heuss-Brücke!',8);},
    update(m){if(near(m,m.target,6))return 'win';},reward:500,win:'Die Kasteler sind satt. Ei gude wie!'});
  // 2 Stadtrundfahrt
  const tourK=[['hbf'],['christus'],['schloss'],['deutschhaus'],['rathaus'],['holzturm'],['zitadelle'],['stephan'],['fastnacht'],['theater']];
  const tour=tourK.map(([k])=>landmarkRoad(k,[0,0]).slice(0,2));
  MISSIONS.push({id:'tour',tag:'T',title:'Meenzer Stadtrundfahrt',start:roadSpot(POI.hbf[0],POI.hbf[1]+30).slice(0,2),needCar:true,
    begin(m){m.timer=300;m.cp=0;m.target=tour[0];m.route=tour;missionText('Ein Tourist will Mainz sehen, aber schnell: Fahr alle <b>10 Wahrzeichen</b> ab, vom Hauptbahnhof bis zum Staatstheater.',8);},
    update(m){if(near(m,m.target,11)){m.cp++;chime([880]);if(m.cp>=tour.length)return 'win';m.target=tour[m.cp];m.route=tour.slice(m.cp);missionText(`Checkpunkt ${m.cp}/${tour.length}`,2);}
      if(!mP(m).car)hint('Steig wieder ein! (<b>F</b>)',1,mP(m));},reward:1000,win:'Der Tourist ist begeistert. Und ein bisschen blass.'});
  // 3 Blaulicht
  MISSIONS.push({id:'blau',tag:'B',title:'Blaulicht',start:freeSpot(POI.polizei[0],POI.polizei[1],0.5),
    begin(m){const p=roadSpot(POI.polizei[0]+10,POI.polizei[1]);m.car=spawnMissionCar('polizei',p,{plate:'MZ-P 1105'});m.target=[m.car.x,m.car.z];m.stage=0;
      missionText('Vor der <b>Polizeiinspektion</b> steht ein Streifenwagen. Klau ihn und bring ihn in die <b>Lackiererei</b> nach Kastel.',8);},
    onEnter(c){const m=activeMission;if(c===m.car&&m.stage===0){m.stage=1;setWanted(Math.max(wanted,2));m.target=POI.lack;missionText('Ab nach Kastel in die <b>Lackiererei</b>! Häng die Bullen ab oder fahr direkt rein.',6);}},
    update(m){if(m.car.dead||m.car.removed)return 'fail';if(m.stage===0)m.target=[m.car.x,m.car.z];if(m.stage===1){if(mP(m).car===m.car&&Math.hypot(m.car.x-POI.lack[0],m.car.z-POI.lack[1])<8){clearWanted();m.car.bodyMat.color.setHex(0x2d5d3a);m.car.T=CAR_TYPES.kombi;m.car.sirenOn=false;if(m.car.sirens)m.car.sirens.forEach(s=>s.visible=false);return 'win';}}},
    end(m){if(m.car){m.car.mission=false;m.car.persist=false;}},reward:1500,win:'Grün lackiert, keiner merkt was. Helau!'});
  // 4 Meenzer Taxi
  const dests=['dom','theater','rathaus','kupferberg','christus','klinik','schloss','reduit','stephan','hbf','rtheater','deutschhaus'];
  const destName={dom:'Dom',theater:'Staatstheater',rathaus:'Rathaus',kupferberg:'Kupferberg',christus:'Christuskirche',klinik:'Unimedizin',schloss:'Kurfürstliches Schloss',reduit:'Reduit in Kastel',stephan:'St. Stephan',hbf:'Hauptbahnhof',rtheater:'Römisches Theater',deutschhaus:'Landtag'};
  MISSIONS.push({id:'taxi',tag:'X',title:'Meenzer Taxi',start:roadSpot(POI.hbf[0]+25,POI.hbf[1]+60).slice(0,2),
    begin(m){const p=roadSpot(m.start[0]+6,m.start[1]);m.car=spawnMissionCar('taxi',p,{plate:'MZ-T 4711'});m.fares=0;m.stage=0;m.target=[m.car.x,m.car.z];missionText('Steig ins <b>Taxi</b> und fahr drei Fahrgäste ans Ziel. Halte neben ihnen an.',7);},
    next(m){const [px,pz]=mpos(m);let e=-1;for(let k=0;k<40&&e<0;k++){const c=randomEdgeNear(px,pz,150,420,true);if(c>=0&&EDGES[c].road.sw>0)e=c;}if(e<0)e=randomEdgeNear(px,pz,60,600,true);const E=EDGES[e];const A=NODES[E.a],B=NODES[E.b];
      const o=E.road.w/2+E.road.sw*0.5;const d=[(B.x-A.x)/E.len,(B.z-A.z)/E.len];const x=(A.x+B.x)/2-d[1]*o,z=(A.z+B.z)/2+d[0]*o;const g=new Human('ped');g.x=x;g.z=z;g.y=groundY(x,z);g.state='wait';g.mission=true;g.sync();m.pass=g;m.target=[x,z];m.stage=1;
      const dk=mpick(dests.filter(k=>Math.hypot((POI[k]||PL[k]||[0,0])[0]-x,(POI[k]||PL[k]||[0,0])[1]-z)>300));m.dest=landmarkRoad(dk,[0,0]).slice(0,2);m.destN=destName[dk];missionText(`Fahrgast ${m.fares+1}/3 wartet – siehe Karte.`,4);},
    update(m){const P=mP(m);if(m.car.dead||m.car.removed)return 'fail';
      if(m.stage===0){m.target=[m.car.x,m.car.z];if(P.car===m.car)this.next(m);return;}
      if(P.car!==m.car){hint('Zurück ins <b>Taxi</b>!',1,P);return;}
      if(m.stage===1){if(!m.pass.alive)return 'fail';if(Math.hypot(m.car.x-m.pass.x,m.car.z-m.pass.z)<9&&Math.abs(m.car.speed)<2){m.pass.remove();m.stage=2;m.target=m.dest;m.timer=Math.max(60,Math.hypot(m.dest[0]-m.car.x,m.dest[1]-m.car.z)/7);missionText(`„Zum <b>${m.destN}</b>, bitte – und zackig!“`,5);chime([660]);}}
      else if(m.stage===2){if(Math.hypot(m.car.x-m.dest[0],m.car.z-m.dest[1])<11&&Math.abs(m.car.speed)<3){m.fares++;const tip=Math.round(30+(m.timer||0)*2);G.money+=tip;chime([880,1100]);hint(`Fahrgast zufrieden: <b>€${tip}</b>`,3,P);m.timer=null;if(m.fares>=3)return 'win';this.next(m);}}},
    end(m){if(m.pass&&!m.pass.removed&&m.pass.alive){m.pass.mission=false;m.pass.state='walk';}if(m.car){m.car.mission=false;m.car.persist=false;}},reward:600,win:'Drei zufriedene Kunden. Der Taxameter glüht.'});
  // 5 Motorradkurier
  MISSIONS.push({id:'kurier',tag:'K',title:'Motorradkurier',start:roadSpot(POI.kupferberg[0],POI.kupferberg[1]).slice(0,2),
    begin(m){const p=roadSpot(m.start[0]+4,m.start[1]+4);m.car=spawnMissionCar('motorrad',p,{plate:'MZ-K 55'});m.n=0;m.stage=0;m.target=[m.car.x,m.car.z];missionText('Schnapp dir das <b>Motorrad</b> und liefer drei Päckchen in der <b>Neustadt</b> aus.',7);},
    pick(m){const cands=NODES.filter(N=>N.car&&districtAt(N.x,N.z)==='Neustadt');const N=mpick(cands);m.target=[N.x,N.z];m.timer=55;},
    update(m){const P=mP(m);if(m.car.dead||m.car.removed)return 'fail';if(m.stage===0){m.target=[m.car.x,m.car.z];if(P.car===m.car){m.stage=1;this.pick(m);}return;}
      if(near(m,m.target,9)){m.n++;chime([880]);G.money+=80;if(m.n>=3)return 'win';this.pick(m);missionText(`Päckchen ${m.n}/3 abgegeben. Weiter!`,3);}},
    end(m){if(m.car){m.car.mission=false;m.car.persist=false;}},reward:700,win:'Alles pünktlich zugestellt – und nur zwei Strafzettel.'});
  // 6 Rhein-Regatta
  const L=RHINE_CUM[RHINE_CUM.length-1];const sInMap=[];for(let s=0;s<L;s+=10){const p=rhineAt(s);if(p.x>MINX+80&&p.x<MAXX-80&&p.z>MINZ+80&&p.z<MAXZ-80)sInMap.push(s);}
  const s0=sInMap[0]||0,s1=sInMap[sInMap.length-1]||L;const regCP=[];for(let i=0;i<9;i++){const s=lerp(s0+80,s1-80,i/8);const p=rhineAt(s);const o=(i%2?1:-1)*55;regCP.push([p.x-p.dz*o,p.z+p.dx*o]);}
  const wh=waterSpotNear(POI.winterhafen[0],POI.winterhafen[1])||waterSpotNear(regCP[0][0],regCP[0][1])||[regCP[0][0],regCP[0][1],0];
  MISSIONS.push({id:'regatta',tag:'R',title:'Rhein-Regatta',start:landSpotNear(wh[0],wh[1],30)||freeSpot(POI.winterhafen[0],POI.winterhafen[1]),
    begin(m){m.car=spawnMissionCar('boot',wh,{boat:true});m.stage=0;m.target=[m.car.x,m.car.z];missionText('Das <b>Motorboot</b> liegt bereit. Fahr den Rhein hinab durch alle <b>Bojen</b> – unter der Brücke durch!',7);},
    update(m){const P=mP(m);if(m.car.dead||m.car.removed)return 'fail';if(m.stage===0){m.target=[m.car.x,m.car.z];if(P.car===m.car){m.stage=1;m.cp=0;m.timer=210;m.target=regCP[0];m.route=regCP;}return;}
      if(P.car!==m.car){hint('Zurück ins Boot!',1,P);return;}if(Math.hypot(m.car.x-m.target[0],m.car.z-m.target[1])<16){m.cp++;chime([880]);if(m.cp>=regCP.length)return 'win';m.target=regCP[m.cp];m.route=regCP.slice(m.cp);}},
    end(m){if(m.car){m.car.mission=false;}},reward:900,win:'Schnellster Kahn auf dem Rhein!'});
  // 7 Schrottplatz
  MISSIONS.push({id:'schrott',tag:'S',title:'Schrottplatz',start:freeSpot(POI.zollhafen[0],POI.zollhafen[1],0.5),
    begin(m){m.cars=[];for(let i=0;i<3;i++){const N=mpick(NODES.filter(N=>N.car&&(districtAt(N.x,N.z)==='Neustadt'||districtAt(N.x,N.z)==='Innenstadt')));const p=roadSpot(N.x,N.z);const c=spawnMissionCar(mpick(['limo','sport']),p,{color:0x111111});m.cars.push(c);}
      giveWeapon(mP(m),'molotov',4);m.timer=300;missionText('Ein Kunde will drei schwarze <b>Luxuskarren</b> verschrotten lassen – ohne Fragen. Hier sind vier <b>Molotowcocktails</b>.',8);},
    update(m){const left=m.cars.filter(c=>!c.dead&&!c.removed);m.marks=left.map(c=>[c.x,c.z]);m.target=left.length?[left[0].x,left[0].z]:null;if(!left.length)return 'win';},
    end(m){for(const c of m.cars){c.mission=false;c.persist=false;}m.marks=null;},reward:1200,win:'Drei Haufen Altmetall. Der Kunde zahlt bar.'});
  // 8 Verfolgungsjagd
  MISSIONS.push({id:'jagd',tag:'J',title:'Verfolgungsjagd',start:roadSpot(POI.fastnacht[0],POI.fastnacht[1]).slice(0,2),needCar:true,
    begin(m){const [px,pz]=mpos(m);let e=randomEdgeNear(px,pz,40,90,true);if(e<0)e=randomEdgeNear(px,pz,10,300,true);const E=EDGES[e];const from=E.a;const [x,z]=laneAt(e,from,E.len/2);const d=edgeDir(e,from);
      const c=new Car('sport',x,z,Math.atan2(d[0],d[1]),{ctrl:'ai',color:0xf2c500});c.driver='npc';c.ai={mode:'traffic'};aiEnterEdge(c,e,from);c.ai.limit*=1.7;c.flee=true;c.mission=true;c.persist=true;c.health=160;m.car=c;m.timer=180;
      missionText('Ein <b>gelber Sportwagen</b> hat die Kollekte vom Dom geklaut. Ramm ihn kaputt, bevor er entkommt!',7);},
    update(m){const c=m.car;if(c.dead)return 'win';if(c.removed)return 'fail';m.target=[c.x,c.z];c.ai.ghost=1;if(c.ai.limit<20)c.ai.limit=20;const [px,pz]=mpos(m);if(Math.hypot(px-c.x,pz-c.z)>650)return 'fail';},
    end(m){if(m.car){m.car.mission=false;m.car.persist=false;}},reward:1300,win:'Die Kollekte ist zurück. Der Bischof segnet dich.'});
  // 9 Weinlieferung
  MISSIONS.push({id:'wein',tag:'V',title:'Weinlieferung',start:freeSpot(PL.rheingold?PL.rheingold[0]:140,PL.rheingold?PL.rheingold[1]:-365,0.5),
    begin(m){m.crates=[];const alt=NODES.filter(N=>districtAt(N.x,N.z)==='Altstadt');for(let i=0;i<5;i++){const N=mpick(alt);m.crates.push(addPickup('crate',N.x,N.z,{mission:true}));}m.stage=0;m.timer=260;
      missionText('Für den <b>Weinmarkt</b> fehlen fünf <b>Kisten Riesling</b>. Sie stehen in der Altstadt – sammel sie ein und bring sie her.',8);},
    update(m){const left=m.crates.filter(p=>p.active);m.marks=left.map(p=>[p.x,p.z]);if(left.length){m.target=[left[0].x,left[0].z];}else{m.target=m.start;if(near(m,m.start,7))return 'win';}},
    end(m){for(const p of m.crates)removePickup(p);m.marks=null;},reward:1000,win:'Der Weinmarkt ist gerettet. Zum Wohl!'});
  // 10 Kopfgeld
  MISSIONS.push({id:'kopfgeld',tag:'G',title:'Kopfgeld am Zollhafen',start:freeSpot(POI.zollhafen[0]+60,POI.zollhafen[1]+60,0.5),
    begin(m){giveWeapon(mP(m),'smg',120);m.gang=[];const c=[POI.zollhafen[0],POI.zollhafen[1]];for(let i=0;i<6;i++){const [x,z]=freeSpot(c[0]+mr(-30,30),c[1]+mr(-30,30),0.5);const g=spawnGang(x,z,i===0?'rifle':mpick(['pistol','smg']),i===0);g.mission=true;m.gang.push(g);}
      m.timer=null;missionText('Die <b>Zollhafen-Bande</b> verkauft gepanschten Wein. Hier ist eine <b>MP</b> – räum auf!',7);},
    update(m){const left=m.gang.filter(g=>g.alive&&!g.removed);m.marks=left.map(g=>[g.x,g.z]);m.target=left.length?[left[0].x,left[0].z]:null;if(!left.length)return 'win';},
    end(m){for(const g of m.gang){g.mission=false;}m.marks=null;},reward:2000,win:'Der Zollhafen ist wieder sauber.'});
  // 11 Fluchtfahrer
  const bank=SHOPS.filter(s=>s.cat===9&&districtAt(s.x,s.z)!=='Mainz-Kastel').sort((a,b)=>Math.hypot(a.x+150,a.z+250)-Math.hypot(b.x+150,b.z+250))[0];
  const bankPos=bank?[bank.doorX,bank.doorZ]:POI.rathaus;const hide=roadSpot(900,-1050).slice(0,2);
  MISSIONS.push({id:'flucht',tag:'F',title:'Fluchtfahrer',start:roadSpot(bankPos[0],bankPos[1]).slice(0,2),needCar:true,
    begin(m){m.stage=0;m.t=0;m.target=m.start;missionText(`Zwei Kumpels „heben Geld ab“ bei <b>${bank?bank.name:'der Bank'}</b>. Warte mit laufendem Motor …`,6);},
    update(m){const P=mP(m);if(!P.car){hint('Du brauchst ein Fluchtauto!',1,P);if(m.stage===0)return;}
      if(m.stage===0){m.t+=1/60;if(m.t>4){m.stage=1;setWanted(3);crime('robbery',bankPos[0],bankPos[1]);m.target=hide;m.timer=240;missionText('Alarm! Häng die <b>Polizei</b> ab und bring die beiden ins <b>Versteck in Kastel</b>.',7);}}
      else if(near(m,hide,9)){if(wanted>0){hint('Erst die Polizei abhängen!',1.5,P);return;}return 'win';}},reward:2500,win:'Sauber entkommen. Dein Anteil: üppig.'});
  // 12 Rheinschmuggel
  const zh=waterSpotNear(POI.zollhafen[0]+150,POI.zollhafen[1]+50)||wh;const kq=waterSpotNear(POI.reduit[0],POI.reduit[1])||wh;
  MISSIONS.push({id:'schmuggel',tag:'U',title:'Rheinschmuggel',start:landSpotNear(zh[0],zh[1],30)||freeSpot(POI.zollhafen[0],POI.zollhafen[1]),
    begin(m){m.car=spawnMissionCar('boot',zh,{boat:true});m.stage=0;m.target=[m.car.x,m.car.z];missionText('Auf dem <b>Frachter</b> liegt ein Paket für uns. Hol es mit dem <b>Boot</b> ab und bring es zum Kasteler Ufer am <b>Reduit</b>.',8);},
    update(m){const P=mP(m);if(m.car.dead||m.car.removed)return 'fail';const ship=SHIPS[0];
      if(m.stage===0){m.target=[m.car.x,m.car.z];if(P.car===m.car){m.stage=1;m.timer=200;}return;}
      if(m.stage===1){m.target=[ship.g.position.x,ship.g.position.z];if(P.car===m.car&&Math.hypot(m.car.x-m.target[0],m.car.z-m.target[1])<26){m.stage=2;m.target=[kq[0],kq[1]];setWanted(Math.max(wanted,2));chime([660,880]);missionText('Paket an Bord! Ab zum <b>Reduit</b>.',5);}}
      else if(m.stage===2&&P.car===m.car&&Math.hypot(m.car.x-kq[0],m.car.z-kq[1])<18)return 'win';},
    end(m){if(m.car){m.car.mission=false;}},reward:1800,win:'Lieferung angekommen. Keiner hat was gesehen.'});
  // 13 Sturm auf die Zitadelle
  MISSIONS.push({id:'zitadelle',tag:'Z',title:'Sturm auf die Zitadelle',start:freeSpot(POI.zitadelle[0]-120,POI.zitadelle[1]-60,0.5),
    begin(m){const P=mP(m);giveWeapon(P,'rifle',150);giveWeapon(P,'grenade',3);P.armor=100;m.gang=[];for(let i=0;i<9;i++){const [x,z]=freeSpot(POI.zitadelle[0]+mr(-70,70),POI.zitadelle[1]+mr(-60,60),0.5);const g=spawnGang(x,z,i===0?'rifle':mpick(['pistol','smg','shotgun']),i===0);g.mission=true;m.gang.push(g);}
      missionText('Die Bande hat sich in der <b>Zitadelle</b> verschanzt. <b>Sturmgewehr</b>, <b>Granaten</b> und <b>Weste</b> – los!',7);},
    update(m){const left=m.gang.filter(g=>g.alive&&!g.removed);m.marks=left.map(g=>[g.x,g.z]);m.target=left.length?[left[0].x,left[0].z]:null;if(!left.length)return 'win';},
    end(m){for(const g of m.gang)g.mission=false;m.marks=null;},reward:5000,win:'Mainz gehört dir. Helau!'});
  for(const m of MISSIONS){const b=beacon();setBeacon(b,m.start[0],m.start[1]);b.userData.m=m;startBeacons.push(b);}
  targetBeacon=beacon(0xffd23f,2.2,12);targetBeacon.visible=false;lackBeacon=beacon(0xc06bff,3,5);setBeacon(lackBeacon,POI.lack[0],POI.lack[1]);}
let missionCool=0;
function updateMissions(dt){
  const av=new Set(availableMissions());
  for(const b of startBeacons){b.visible=!activeMission&&av.has(b.userData.m);b.userData.arrow.position.y=2.6+Math.sin(simTime*3)*0.3;b.userData.arrow.rotation.y+=dt*2;}
  lackBeacon.userData.arrow.rotation.y+=dt*2;
  if(!activeMission){missionCool-=dt;if(missionCool>0)return;for(const P of PLAYERS){if(P.gameOver||!P.h||P.h.room)continue;const [px,pz]=ppos(P);for(const m of av){if(Math.hypot(px-m.start[0],pz-m.start[1])<3.5){if(m.needCar&&!P.car){hint('Für diese Mission brauchst du ein <b>Auto</b>.',2,P);continue;}startMission(m,P);return;}}}
    targetBeacon.visible=false;return;}
  const m=activeMission;if(m.timer!=null){m.timer-=dt;if(m.timer<=0){endMission('fail');return;}}
  const r=m.update.call(m,m);if(r){endMission(r);return;}
  if(m.target){setBeacon(targetBeacon,m.target[0],m.target[1]);targetBeacon.userData.arrow.position.y=3+Math.sin(simTime*3)*0.4;}else targetBeacon.visible=false;}
function startMission(m,P){activeMission=Object.assign(Object.create(m),{P,timer:null,route:null,marks:null});showBig(m.title.toUpperCase(),'mission',3);m.begin.call(activeMission,activeMission);chime([523,659,784]);}
function endMission(r){const m=activeMission;if(!m)return;try{if(m.end)m.end.call(m,m);}catch(e){console.error(e);}activeMission=null;targetBeacon.visible=false;missionCool=4;$('mtext').hidden=true;
  if(r==='win'){G.money+=m.reward;G.done[m.id]=true;G.stats.missions++;showBig('MISSION ERFÜLLT','win',4,`+ €${m.reward} · ${m.win}`);chime([523,659,784,1046]);autoSave();}
  else showBig('MISSION GESCHEITERT','fail',3);}

// ===================== PICKUPS / SCHOPPEN =====================
const PICKUPS=[],SCHOPPEN=[];
const PICK_WEAPON={bat:1,pistol:36,smg:90,shotgun:18,rifle:90,molotov:3,grenade:3};
function pickupMesh(kind){const g=new THREE.Group();let m;
  if(kind==='health'){m=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.8,0.25),stdMat({color:0x27a645,emissive:0x0d4a1a}));const w=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.14,0.27),M.white);const w2=w.clone();w2.rotation.z=Math.PI/2;m.add(w);m.add(w2);}
  else if(kind==='armor'){m=new THREE.Mesh(new THREE.BoxGeometry(0.75,0.85,0.3),stdMat({color:0x2a5ea8,emissive:0x0c2244}));}
  else if(kind==='money'){m=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.04,0.35),stdMat({color:0x5aa055,emissive:0x1f4a1c}));}
  else if(kind==='crate'){m=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.5,0.55),stdMat({color:0x9a6a3a,roughness:0.8}));for(let i=0;i<6;i++){const b=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,0.3,8),stdMat({color:0x2d5a2a,roughness:0.2}));b.position.set(-0.25+(i%3)*0.25,0.35,i<3?-0.1:0.1);m.add(b);}}
  else if(PICK_WEAPON[kind]){m=new THREE.Mesh(WGEO[kind],WMAT[kind]);m.scale.setScalar(2.2);}
  else if(kind==='shoes'){m=new THREE.Group();for(const s of [-1,1]){const sh=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.14,0.5),SHOE_MAT);sh.position.x=s*0.15;m.add(sh);}}
  else{const glass=new THREE.MeshStandardMaterial({color:0xf2e6a8,emissive:0x6b5a10,roughness:0.15,metalness:0.2,transparent:true,opacity:0.85});
    m=new THREE.Group();const cup=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.17,0.55,14),glass);cup.position.y=0.3;const st=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.3,6),glass);st.position.y=-0.12;const ft=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.16,0.03,12),glass);ft.position.y=-0.27;m.add(cup,st,ft);}
  g.add(m);const glow=new THREE.Sprite(new THREE.SpriteMaterial({map:puffTex,color:kind==='shoes'?0x40ffe0:kind==='schoppe'?0xffd86b:kind==='health'?0x5fd36a:kind==='armor'?0x58a8ff:kind==='crate'?0xc06bff:0xffffff,transparent:true,opacity:0.45,blending:THREE.AdditiveBlending,depthWrite:false}));glow.scale.setScalar(2.2);g.add(glow);scene.add(g);return g;}
function addPickup(kind,x,z,o={}){const [fx,fz]=o.raw?[x,z]:freeSpot(x,z,0.4);const p={kind,x:fx,z:fz,g:pickupMesh(kind),active:true,respawn:0,amount:o.amount||0,temp:!!o.temp,life:o.temp?30:0,mission:!!o.mission};p.g.position.set(fx,groundY(fx,fz)+0.9,fz);PICKUPS.push(p);return p;}
function removePickup(p){scene.remove(p.g);const i=PICKUPS.indexOf(p);if(i>=0)PICKUPS.splice(i,1);}
function setupPickups(){
  const H=[[POI.markt[0]+20,POI.markt[1]],[POI.christus[0]+40,POI.christus[1]],[POI.klinik[0]+30,POI.klinik[1]-40],[POI.reduit[0]-30,POI.reduit[1]],[POI.fastnacht[0],POI.fastnacht[1]+30],[POI.hbf[0]+60,POI.hbf[1]]];
  for(const [x,z] of H)addPickup('health',x,z);
  for(const [x,z] of [[POI.zitadelle[0],POI.zitadelle[1]+40],[POI.polizei[0]+20,POI.polizei[1]],[POI.lack[0]+20,POI.lack[1]]])addPickup('armor',x,z);
  const W=[['bat',POI.holzturm],['pistol',POI.hbf],['pistol',[POI.reduit[0]+40,POI.reduit[1]-60]],['smg',[POI.zollhafen[0]+30,POI.zollhafen[1]+20]],['shotgun',[POI.zitadelle[0]-40,POI.zitadelle[1]]],['rifle',POI.kupferberg],['molotov',POI.stephan],['molotov',[POI.schloss[0]+40,POI.schloss[1]+40]],['grenade',[POI.winterhafen[0]-60,POI.winterhafen[1]]]];
  for(const [k,p] of W)addPickup(k,p[0],p[1],{amount:PICK_WEAPON[k]});
  addPickup('shoes',POI.rtheater[0]+20,POI.rtheater[1]+10);{const gp=PLACES.find(p=>/Gonsenheim/.test(p.name));if(gp)addPickup('shoes',gp.x,gp.z);}
  const sp=[[0,-60],POI.fastnacht,POI.holzturm,POI.eisenturm,PL.drusus||POI.zitadelle,POI.christus,POI.schloss,POI.kupferberg,POI.reduit,POI.stephan];
  for(const [x,z] of sp){const [fx,fz]=freeSpot(x,z,0.3);const g=pickupMesh('schoppe');g.position.set(fx,groundY(fx,fz)+0.9,fz);SCHOPPEN.push({x:fx,z:fz,g,got:false});}
  {const t=BR_L*0.5;const x=BR_A[0]+BR_U[0]*t+BR_N[0]*9,z=BR_A[1]+BR_U[1]*t+BR_N[1]*9;const g=pickupMesh('schoppe');g.position.set(x,deckY(t)+1,z);SCHOPPEN.push({x,z,g,got:false,y:deckY(t)});}}
function updatePickups(dt){
  for(let i=PICKUPS.length-1;i>=0;i--){const p=PICKUPS[i];p.g.rotation.y+=dt*2;p.g.position.y=groundY(p.x,p.z)+0.9+Math.sin(simTime*2.5+i)*0.12;
    if(p.temp){p.life-=dt;if(p.life<=0){scene.remove(p.g);PICKUPS.splice(i,1);continue;}}
    if(!p.active){if(p.mission)continue;p.respawn-=dt;if(p.respawn<=0){p.active=true;p.g.visible=true;}continue;}
    for(const P of PLAYERS){if(P.gameOver||!P.h||P.h.room)continue;const [px,pz]=ppos(P);const d=Math.hypot(px-p.x,pz-p.z);const reach=P.car?2.8:1.4;if(d>reach)continue;const h=P.h;
      if(p.kind==='health'){if(h.health>=100)continue;h.health=100;hint('Gesundheit aufgefüllt',2,P);}
      else if(p.kind==='armor'){if(P.armor>=100)continue;P.armor=100;hint('Schutzweste angelegt',2,P);}
      else if(p.kind==='money'){G.money+=p.amount;}
      else if(p.kind==='crate'){hint('Weinkiste eingeladen',2,P);}
      else if(p.kind==='shoes'){if(P.car)continue;giveShoes(P);if(!p.mission){p.mission=true;}}
      else if(PICK_WEAPON[p.kind]){if(P.car&&WEAPONS[p.kind].melee)continue;const first=giveWeapon(P,p.kind,p.amount||PICK_WEAPON[p.kind]);hint(first?`<b>${WEAPONS[p.kind].name}</b> aufgehoben. <b>Q</b> oder <b>1–8</b> wechselt die Waffe.`:`${WEAPONS[p.kind].name}: Munition aufgefüllt`,first?4:2,P);}
      chime([880,1175]);if(p.temp){scene.remove(p.g);PICKUPS.splice(i,1);}else{p.active=false;p.g.visible=false;p.respawn=60;}break;}}
  for(const s of SCHOPPEN){if(s.got)continue;s.g.rotation.y+=dt*1.6;s.g.position.y=(s.y??groundY(s.x,s.z))+0.9+Math.sin(simTime*2+s.x)*0.15;
    for(const P of PLAYERS){if(!P.h||P.h.room)continue;const [px,pz]=ppos(P);if(Math.hypot(px-s.x,pz-s.z)<(P.car?3:1.5)){collectSchoppe(s);break;}}}}
function collectSchoppe(s,silent=false){s.got=true;s.g.visible=false;if(silent)return;G.money+=111;G.stats.schoppen++;const n=SCHOPPEN.filter(x=>x.got).length;chime([659,784,988,1319]);
  showBig(`SCHOPPE ${n}/11`,'win',2.5,n===11?'Alle elf gefunde! Helau! + €1111':'+ €111 · Prost!');if(n===11)G.money+=1111;}

// ===================== EREIGNISSE =====================
function onHumanKilled(h,byPlayer){if(h.keeper){h.keeperDead=true;}if(!byPlayer)return;crime(h.kind==='cop'?'killCop':'kill',h.x,h.z);
  if((h.kind==='ped'||h.kind==='gang')&&Math.random()<0.7)addPickup('money',h.x+mr(-0.5,0.5),h.z+mr(-0.5,0.5),{raw:true,temp:true,amount:5+(Math.random()*(h.kind==='gang'?150:55)|0)});
  for(const o of HUMANS)if(o.kind==='ped'&&o.alive&&o.state==='walk'&&Math.abs(o.x-h.x)<30&&Math.abs(o.z-h.z)<30)pedFlee(o,h.x,h.z);
  if(h.kind==='gang')for(const o of HUMANS)if(o.kind==='gang'&&o.alive&&Math.hypot(o.x-h.x,o.z-h.z)<60)o.hostile=true;}
function onCrash(car,imp){sfxCrash(car.x,car.z,imp);for(const P of PLAYERS)if(P.car===car)P.cam.shake=Math.min(0.6,imp*0.03);for(let i=0;i<Math.min(8,imp|0);i++)spawnPart(car.x+mr(-1,1),car.y+0.6,car.z+mr(-1,1),{color:0xffd27a,size:0.15,vy:mr(1,3),vx:mr(-3,3),vz:mr(-3,3),life:0.3,grow:0,add:true});}
function onCarHit(A,B,imp){sfxCrash(A.x,A.z,imp);const pa=isPlayerCar(A),pb=isPlayerCar(B);if(!pa&&!pb)return;const o=pa?B:A;if(o.ai)o.ai.bump=1.2;if(o.T.police)crime('copcar',o.x,o.z);for(const P of PLAYERS)if(P.car===A||P.car===B)P.cam.shake=Math.min(0.6,imp*0.03);}
let skidV=0;function skidSound(slip){skidV=Math.max(skidV,clamp((slip||0)*0.4,0,1));}
function carHumanContacts(){for(const c of CARS){if(c.T.boat)continue;const sp=Math.hypot(c.vx,c.vz);const circ=carCircles(c);
  for(const h of HUMANS){if(h.inCar||h.state==='dead'||h.state==='knock'||h.room)continue;if(Math.abs(h.x-c.x)>c.T.L||Math.abs(h.z-c.z)>c.T.L)continue;
    for(const cc of circ){const dx=h.x-cc[0],dz=h.z-cc[1];const d=Math.hypot(dx,dz);const rr2=cc[2]+0.32;if(d<rr2&&d>1e-4){
      if(sp>4&&Math.abs(h.y-c.y)<1.2){const byP=isPlayerCar(c);const pv=playerOfHuman(h);if(pv){damagePlayer(pv,sp*3.2);h.x+=dx/d*(rr2-d+0.3);h.z+=dz/d*(rr2-d+0.3);}
        else{knockHuman(h,c.vx*0.85+dx/d*2,c.vz*0.85+dz/d*2,2.5+sp*0.18,sp*7,byP);for(const P of PLAYERS)if(P.car===c)P.cam.shake=0.2;c.vx*=0.93;c.vz*=0.93;}}
      else{h.x+=dx/d*(rr2-d);h.z+=dz/d*(rr2-d);}break;}}}}}

// ===================== BEVÖLKERUNG =====================
let popT=0;
function randomEdgeNear(px,pz,rmin,rmax,carOnly){for(let k=0;k<60;k++){const e=(Math.random()*EDGES.length)|0;const E=EDGES[e];if(E.dead)continue;if(carOnly&&!E.car)continue;const A=NODES[E.a],B=NODES[E.b];const mx=(A.x+B.x)/2,mz=(A.z+B.z)/2;const d=Math.hypot(mx-px,mz-pz);if(d<rmin||d>rmax)continue;return e;}return -1;}
const TRAFFIC_MIX=[['kompakt',3.4],['limo',2.6],['kombi',2.6],['sport',0.8],['transporter',1.2],['taxi',1.1],['bus',0.5],['motorrad',0.7],['kleinwagen',2],['suv',1.6],['pickup',0.8],['cabrio',0.6],['oldtimer',0.35],['eiswagen',0.15]];
function wpickM(list){let t=0;for(const [,w] of list)t+=w;let r=Math.random()*t;for(const [v,w] of list){r-=w;if(r<=0)return v;}return list[0][0];}
function carSpaceFree(x,z,r=8){for(const c of CARS)if(Math.abs(c.x-x)<r&&Math.abs(c.z-z)<r)return false;return true;}
const regionAt=(x,z)=>rhineSide(x,z)>0?'WI':'MZ';
function spawnTraffic(px,pz,rmin,rmax){const e=randomEdgeNear(px,pz,rmin,rmax,true);if(e<0)return;const E=EDGES[e];if(E.len<8)return;let from=Math.random()<0.5?E.a:E.b;if(!edgeAllowed(e,from))from=edgeOther(e,from);const t=mr(2,E.len-2);const [x,z]=laneAt(e,from,t);
  if(blocked(x,z,E.road.bridge?undefined:0.5)||!carSpaceFree(x,z,10))return;let type=wpickM(TRAFFIC_MIX);if(type==='bus'&&E.road.type!=='main')type='kompakt';const d=edgeDir(e,from);
  const c=new Car(type,x,z,Math.atan2(d[0],d[1]),{ctrl:'ai',region:regionAt(x,z)});if(c.collides()){c.remove();return;}c.driver='npc';c.ai={mode:'traffic'};aiEnterEdge(c,e,from);c.ai.wps=[laneAt(e,from,Math.min(E.len-0.5,t+4)),c.ai.wps[1]];
  const sp=Math.min(c.ai.limit,8);c.vx=d[0]*sp;c.vz=d[1]*sp;c.speed=sp;}
function spawnParked(px,pz,rmin,rmax){const e=randomEdgeNear(px,pz,rmin,rmax,true);if(e<0)return;const E=EDGES[e];const r=E.road;if(r.bridge||E.len<12||r.type!=='street'&&r.cls>2)return;const from=Math.random()<0.5?E.a:E.b;
  const [x,z]=laneAt(e,from,mr(5,E.len-5),r.w/2-1.15);if(blocked(x,z)||!carSpaceFree(x,z,6))return;const d=edgeDir(e,from);const type=wpickM(TRAFFIC_MIX.filter(t=>t[0]!=='bus'&&t[0]!=='taxi'));
  const c=new Car(type,x,z,Math.atan2(d[0],d[1]),{ctrl:'none',region:regionAt(x,z)});if(c.collides()){c.remove();return;}c.ai={mode:'parked'};}
function spawnPed(px,pz,rmin,rmax){const e=randomEdgeNear(px,pz,rmin,rmax,false);if(e<0)return;const E=EDGES[e];if(E.road.bridge&&Math.random()<0.7)return;const p=new Human('ped');p.side=Math.random()<0.5?1:-1;p.walkSpeed=mr(1.1,1.6)*(p.walkK||1);if(E.road.type==='ped')p.pedOff=mr(-E.road.w/2+1,E.road.w/2-1);
  const from=Math.random()<0.5?E.a:E.b;const t=mr(0.5,Math.max(0.6,E.len-0.5));const [x,z]=laneAt(e,from,t,pedOffset(p,e));if(blocked(x,z,0.5)){p.remove();return;}p.x=x;p.z=z;p.y=groundY(x,z,E.road.bridge?undefined:0.5);pedEnterEdge(p,e,from);p.wps.shift();p.facing=Math.atan2(...edgeDir(e,from));p.sync();}
function minPlayerDist(x,z){let d=1e9;for(const P of PLAYERS){if(!P.h)continue;const [px,pz]=ppos(P);d=Math.min(d,Math.hypot(x-px,z-pz));}return d;}
function managePopulation(dt,force=false){popT-=dt;if(popT>0&&!force)return;popT=0.5;
  for(let i=CARS.length-1;i>=0;i--){const c=CARS[i];if(isPlayerCar(c)||c.mission||c.persist)continue;const d=minPlayerDist(c.x,c.z);if(d>430||(c.dead&&d>140)||(c.T.police&&wanted===0&&d>260)){c.remove();}}
  for(let i=HUMANS.length-1;i>=0;i--){const h=HUMANS[i];if(playerOfHuman(h)||h.inCar||h.keeper||h.mission||h.state==='markt'||h.state==='roof'||h.state==='talk'||h.state==='venue'||h.room)continue;const d=minPlayerDist(h.x,h.z);if(d>290||(h.state==='dead'&&(h.timer<=0||d>90))||(h.kind==='cop'&&wanted===0&&d>150))h.remove();}
  let traffic=0,parked=0,peds=0;for(const c of CARS){if(c.ai.mode==='traffic')traffic++;else if(c.ai.mode==='parked'&&!c.persist)parked++;}for(const h of HUMANS)if(h.kind==='ped'&&h.alive)peds++;
  const mul=G.split?1.3:1;
  for(const P of PLAYERS){if(!P.h||P.h.room&&!force)continue;const [px,pz]=ppos(P);const n=force?40:3;
    for(let k=0;k<n&&traffic<Q.traffic*mul;k++){const before=CARS.length;spawnTraffic(px,pz,force?25:110,330);if(CARS.length>before)traffic++;}
    for(let k=0;k<n&&parked<Q.parked*mul;k++){const b=CARS.length;spawnParked(px,pz,force?12:80,250);if(CARS.length>b)parked++;}
    for(let k=0;k<(force?80:4)&&peds<Q.peds*mul;k++){const b=HUMANS.length;spawnPed(px,pz,force?8:60,210);if(HUMANS.length>b)peds++;}}}
// Feste Boote an den Anlegern und Motorräder
function setupVehicles(){
  const docks=[POI.winterhafen,[POI.rathaus[0]+250,POI.rathaus[1]+50],POI.zollhafen,POI.reduit,[POI.fastnacht[0]+700,POI.fastnacht[1]-100]];
  for(const p of docks){const w=waterSpotNear(p[0],p[1],260);if(!w)continue;if(CARS.some(c=>c.T.boat&&Math.hypot(c.x-w[0],c.z-w[1])<20))continue;const c=new Car('boot',w[0],w[1],w[2],{ctrl:'none'});c.ai={mode:'docked'};c.persist=true;}
  for(const p of [[POI.markt[0]-40,POI.markt[1]-30],POI.fastnacht,[POI.hbf[0]+40,POI.hbf[1]+20],[POI.reduit[0]+40,POI.reduit[1]-20],POI.kupferberg]){const r=roadSpot(p[0],p[1]);const s=laneAt;const c=new Car('motorrad',r[0],r[1],r[2]||0,{ctrl:'none'});if(c.collides()){const [x,z]=freeSpot(r[0],r[1],1);c.x=x;c.z=z;}c.ai={mode:'parked'};c.persist=true;}}

// ===================== TAG / NACHT / WETTER =====================
const WEATHER_TYPES={
  klar:{cover:0.6,turb:3.2,fog:0.0008,rain:0,snow:0,sunK:1,label:'klar'},
  wolkig:{cover:0.38,turb:7,fog:0.0014,rain:0,snow:0,sunK:0.5,label:'bewölkt'},
  regen:{cover:0.18,turb:11,fog:0.003,rain:1,snow:0,sunK:0.16,label:'Regen'},
  gewitter:{cover:0.05,turb:14,fog:0.0042,rain:1.3,snow:0,sunK:0.06,label:'Gewitter',storm:true},
  nebel:{cover:0.3,turb:12,fog:0.016,rain:0,snow:0,sunK:0.25,label:'Nebel'},
  schnee:{cover:0.2,turb:10,fog:0.0045,rain:0,snow:1,sunK:0.3,label:'Schnee'},
};
const WEATHER={kind:'klar',cur:{...WEATHER_TYPES.klar},wet:0,snowCover:0,timer:900+Math.random()*600,flash:0,nextBolt:8};
function setWeather(k){if(!WEATHER_TYPES[k])k='klar';WEATHER.kind=k;WEATHER.timer=700+Math.random()*900;document.querySelectorAll('.wx').forEach(b=>b.textContent='Wetter: '+WEATHER_TYPES[k].label);}
const RAIN=(()=>{const N=QS.detail>=1?5000:2500;const p=new Float32Array(N*6),e=new Float32Array(N*2);for(let i=0;i<N;i++){const x=Math.random()*60,y=Math.random()*40,z=Math.random()*60;p.set([x,y,z,x,y,z],i*6);e[i*2]=0;e[i*2+1]=1;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('endp',new THREE.BufferAttribute(e,1));
  const m=new THREE.ShaderMaterial({uniforms:{time:{value:0},cam:{value:new THREE.Vector3()},amount:{value:0}},transparent:true,depthWrite:false,fog:false,
    vertexShader:`attribute float endp; uniform float time; uniform vec3 cam; void main(){ vec3 p=position; vec3 w; w.x=cam.x+mod(p.x-cam.x,60.0)-30.0; w.z=cam.z+mod(p.z-cam.z,60.0)-30.0; w.y=cam.y+mod(p.y-time*17.0-cam.y,40.0)-20.0+endp*0.75; w.x+=endp*0.12; gl_Position=projectionMatrix*viewMatrix*vec4(w,1.0);} `,
    fragmentShader:`uniform float amount; void main(){ gl_FragColor=vec4(0.55,0.6,0.66,0.32*amount);} `});
  const l=new THREE.LineSegments(g,m);l.frustumCulled=false;l.visible=false;scene.add(l);return l;})();
const SNOW=(()=>{const N=QS.detail>=1?6000:3000;const p=new Float32Array(N*3),ph=new Float32Array(N);for(let i=0;i<N;i++){p[i*3]=Math.random()*70;p[i*3+1]=Math.random()*40;p[i*3+2]=Math.random()*70;ph[i]=Math.random()*TAU;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));g.setAttribute('phase',new THREE.BufferAttribute(ph,1));
  const m=new THREE.ShaderMaterial({uniforms:{time:{value:0},cam:{value:new THREE.Vector3()},amount:{value:0},px:{value:2}},transparent:true,depthWrite:false,fog:false,
    vertexShader:`attribute float phase; uniform float time; uniform vec3 cam; uniform float px; void main(){ vec3 p=position; vec3 w; w.x=cam.x+mod(p.x+sin(time*0.7+phase)*1.5-cam.x,70.0)-35.0; w.z=cam.z+mod(p.z+cos(time*0.5+phase)*1.5-cam.z,70.0)-35.0; w.y=cam.y+mod(p.y-time*1.3-cam.y,40.0)-20.0; vec4 mv=viewMatrix*vec4(w,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=clamp(px*60.0/-mv.z,1.0,7.0);} `,
    fragmentShader:`uniform float amount; void main(){ vec2 c=gl_PointCoord-0.5; float a=smoothstep(0.5,0.2,length(c)); gl_FragColor=vec4(0.95,0.97,1.0,0.85*a*amount);} `});
  const pts=new THREE.Points(g,m);pts.frustumCulled=false;pts.visible=false;scene.add(pts);return pts;})();
const _sd=new THREE.Vector3(),_c1=new THREE.Color(),_fog=new THREE.Color();
const C_FOG_DAY=new THREE.Color(0xc3d0db),C_FOG_GREY=new THREE.Color(0x9ba3aa),C_FOG_DUSK=new THREE.Color(0xd9a17a),C_FOG_NIGHT=new THREE.Color(0x0c111b),C_FOG_SNOW=new THREE.Color(0xdfe5ea);
let envDirty=true,lampAssignT=0,lastWeatherKind='klar';
let INDOOR=null;
function updateSky(dt){gameMin=(gameMin+dt*1.0)%1440;__gm=gameMin;const t=gameMin/60;const s=Math.sin(Math.PI*(t-7)/12);const elev=s*0.95;const az=(90+180*(t-7)/12)*Math.PI/180;
  _sd.set(Math.cos(elev)*Math.sin(az),Math.sin(elev),-Math.cos(elev)*Math.cos(az));
  WEATHER.timer-=dt;if(WEATHER.timer<=0){const r=Math.random();setWeather(r<0.45?'klar':r<0.68?'wolkig':r<0.82?'regen':r<0.89?'gewitter':r<0.95?'nebel':'schnee');}
  const W=WEATHER_TYPES[WEATHER.kind],cur=WEATHER.cur,k=Math.min(1,dt*0.08);for(const p of ['cover','turb','fog','rain','snow','sunK'])cur[p]+=(W[p]-cur[p])*k;
  WEATHER.wet=clamp(WEATHER.wet+(cur.rain>0.5?dt*0.02:-dt*0.004),0,1);WEATHER.snowCover=clamp(WEATHER.snowCover+(cur.snow>0.5?dt*0.01:-dt*0.006),0,1);
  // Blitze
  if(W.storm){WEATHER.nextBolt-=dt;if(WEATHER.nextBolt<=0){WEATHER.nextBolt=mr(5,16);WEATHER.flash=0.35;sfxThunder();}}
  if(WEATHER.flash>0)WEATHER.flash-=dt;const bolt=WEATHER.flash>0?(Math.sin(WEATHER.flash*60)>0?1:0.3)*Math.min(1,WEATHER.flash*4):0;
  const night=smoothstep(0.05,-0.12,s);nightF=night;const dusk=(1-smoothstep(0.0,0.32,s))*(1-night);const overcast=clamp((0.6-cur.cover)/0.42,0,1);
  skyU.sunPosition.value.copy(_sd);skyU.turbidity.value=cur.turb;skyU.rayleigh.value=lerp(1.5,0.8,overcast)+night*0.5;skyU.mieCoefficient.value=lerp(0.004,0.012,overcast);
  const [px,pz]=P1.h?ppos(P1):[60,-150];
  if(night<0.5){sun.position.set(px+_sd.x*400,Math.max(30,_sd.y*400),pz+_sd.z*400);sun.intensity=3.3*smoothstep(-0.03,0.22,s)*cur.sunK;sun.color.setHex(0xfff4e6).lerp(_c1.setHex(0xff9450),dusk*0.85);}
  else{sun.position.set(px-_sd.x*400,Math.max(60,-_sd.y*400),pz-_sd.z*400);sun.intensity=0.28*(1-overcast*0.7);sun.color.setHex(0x8ea6ff);}
  sun.target.position.set(px,0,pz);
  hemi.intensity=lerp(0.32,0.05,night)*(1+overcast*0.8)+bolt*1.4;hemi.color.setHex(0xcfe0ff).lerp(_c1.setHex(0x26324e),night);hemi.groundColor.setHex(0x5e5446).lerp(_c1.setHex(0x0c0d10),night);
  _fog.copy(C_FOG_DAY).lerp(C_FOG_GREY,overcast).lerp(C_FOG_DUSK,dusk*(1-overcast*0.6)).lerp(C_FOG_SNOW,cur.snow*0.6).lerp(C_FOG_NIGHT,night);_fog.multiplyScalar(lerp(0.85,1,1-night));
  scene.fog.color.copy(_fog);scene.fog.near=cur.fog*(1+night*0.3);scene.fog.far=WEATHER.kind==='nebel'?0.006:0.011;
  cloudU.sunDir.value.copy(_sd);cloudU.cover.value=cur.cover;cloudU.time.value+=dt;cloudU.night.value=night;
  cloudU.sunCol.value.setHex(0xfff2e2).lerp(_c1.setHex(0xffa060),dusk).multiplyScalar(lerp(1.5,0.03,night)*lerp(1,0.5,overcast)+bolt*2);
  cloudU.ambCol.value.copy(_fog).multiplyScalar(lerp(0.9,0.6,overcast));
  stars.material.opacity=night*(1-overcast);
  RAIN.visible=cur.rain>0.03&&!INDOOR;RAIN.material.uniforms.amount.value=Math.min(1,cur.rain);RAIN.material.uniforms.time.value+=dt*(1+(cur.rain-1)*0.5);RAIN.material.uniforms.cam.value.copy(camera.position);
  SNOW.visible=cur.snow>0.03&&!INDOOR;SNOW.material.uniforms.amount.value=cur.snow;SNOW.material.uniforms.time.value+=dt;SNOW.material.uniforms.cam.value.copy(camera.position);SNOW.material.uniforms.px.value=renderer.getPixelRatio()*2;
  for(const w of WET_MATS)w.m.roughness=w.base*(1-0.6*WEATHER.wet);
  WATER_OFF.a.value.set(simTime*0.006,simTime*0.011);WATER_OFF.b.value.set(-simTime*0.009,simTime*0.004);WIND.time.value+=dt;WIND.amp.value=lerp(1,2.6,Math.min(1,cur.rain)+overcast*0.3)+(W.storm?1.2:0);
  const lit=Math.max(smoothstep(0.18,-0.04,s),WEATHER.kind==='nebel'||W.storm?0.35:0);for(const n of nightMats)n.m.emissiveIntensity=lit*n.k*(1+night*0.6);
  HEAD_MAT.emissiveIntensity=lerp(0.25,3,lit);
  renderer.toneMappingExposure=lerp(0.6,1.05,night)*lerp(1,1.25,overcast*(1-night))*(1+bolt*0.8);
  if(composer){gradePass.uniforms.sat.value=lerp(1.08,0.82,Math.min(1,cur.rain+cur.snow*0.6));if(bloomPass)bloomPass.strength=lerp(0.22,0.65,night);}
  if(Math.abs(__gm-envT)>10||envDirty||WEATHER.kind!==lastWeatherKind&&Math.random()<dt*0.5){updateEnv(true);envDirty=false;lastWeatherKind=WEATHER.kind;}
  // Innenräume: eigenes Licht, kein Nebel
  if(INDOOR){const r=INDOOR;sun.intensity=0;hemi.intensity=r.hemiI??0.22;hemi.color.setHex(0xfff2e0);hemi.groundColor.setHex(0x5a4a3a);scene.fog.near=0;renderer.toneMappingExposure=r.exp??0.8;
    LAMP_LIGHTS.forEach((L,i)=>{const p=r.lightPts[i];if(p){L.position.set(r.ox+p[0],r.oy+p[1],r.oz+p[2]);L.intensity=r.lampI??7;L.distance=r.lampD??9;}else L.intensity=0;});updateTrafficLights(simTime);return;}
  lampAssignT-=dt;if(lampAssignT<=0&&LAMP_LIGHTS.length){lampAssignT=0.4;const cx=camera.position.x,cz=camera.position.z;const near=[];
    for(const l of LAMPS){const d=(l.x-cx)**2+(l.z-cz)**2;if(d<120*120)near.push([d,l]);}near.sort((a,b)=>a[0]-b[0]);
    LAMP_LIGHTS.forEach((L,i)=>{const n=near[i];L.distance=28;if(n&&lit>0.05){const l=n[1];L.position.set(l.x+Math.sin(l.face)*1.1,l.y+5.7,l.z+Math.cos(l.face)*1.1);L.intensity=lit*14;}else L.intensity=0;});}
  updateTrafficLights(simTime);}

// ===================== GESCHÄFTE: BETRETEN, EINKAUFEN, ÜBERFALL =====================
const SHOP_UI={open:false,P:null,shop:null,items:[]};
function shopInteract(P){const h=P.h;if(!h||P.car)return false;
  if(h.room&&h.room.venue){const r=h.room;if(r.nearShop){h.parentRoom=r;r.grp.visible=false;for(const o of r.people)o.g.visible=false;enterShop(P,r.nearShop);}else if(r.venue.interact)r.venue.interact(P,r);return true;}
  if(h.room){const r=h.room;if(SHOP_UI.open){closeShopMenu();return true;}const k=r.keeper;const dk=Math.hypot(k.x-h.x,k.z-h.z);if(dk<2.9&&k.alive&&!r.robbing){openShopMenu(P,r.shop);return true;}
    if(!k.alive&&dk<3.2&&!r.shop.robbed){const [a,b]=ROB_CASH[r.shop.cat]||[100,400];const cash=Math.round(mr(a,b)*0.6);G.money+=cash;r.shop.robbed=simTime;crime('robbery',r.shop.x,r.shop.z);showBig('KASSE GEPLÜNDERT','fail',2.5,`+ €${cash}`);}return true;}
  {const st=typeof hbfStairNear==='function'&&hbfStairNear(P);if(st){const v=VENUES.find(v=>v.id==='hbf');const S=HBF_STAIRS.find(s=>s[0]===st.n)||HBF_STAIRS[0];enterVenue(P,v,[S[1],1.4,Math.PI]);return true;}}
  {const v=venueNear(h.x,h.z);if(v){enterVenue(P,v);return true;}}
  const s=shopNear(h.x,h.z,1.9);if(!s)return false;if(G.split){hint('Geschäfte sind im Split-Screen geschlossen.',2,P);return true;}if(wanted>=3){hint('Der Laden hat die Tür abgeschlossen – zu viel Polizei!',2,P);return true;}enterShop(P,s);return true;}
function enterShop(P,s){const r=makeRoom(s.cat);r.shop=s;labelRoom(r,s);r.grp.visible=true;const k=r.keeper;if(!k.alive||k.removed){const nk=new Human('ped');nk.keeper=true;nk.kind='keeper';nk.state='keeper';r.keeper=nk;}
  const kk=r.keeper;kk.x=r.ox+r.keeperPos[0];kk.z=r.oz+r.keeperPos[1];kk.y=r.oy;kk.facing=0;kk.g.visible=true;kk.health=60;kk.alive=true;kk.state='keeper';kk.stand();kk.sync();r.robT=0;r.robbing=false;
  const h=P.h;h.room=r;h.x=r.ox;h.z=r.oz+r.D/2-2.0;h.y=r.oy;h.facing=Math.PI;P.vy=0;P.cam.yaw=Math.PI;P.cam.pitch=0.38;P.cam.init=false;r.insideT=0;INDOOR=r;
  showBig(s.name.toUpperCase(),'mission',2.2,SHOP_CAT_NAMES[s.cat]);hint('Geh zur <b>Theke</b> und drück <b>F</b>. Mit gezogener Waffe auf den Verkäufer zielen = Überfall.',5,P);chime([700,880]);}
function exitShop(P){const h=P.h;const r=h.room;if(!r)return;closeShopMenu();const s=r.shop;h.room=null;r.grp.visible=false;r.keeper.g.visible=false;INDOOR=null;
  if(s.inVenue&&h.parentRoom){const pr=h.parentRoom;h.parentRoom=null;h.room=pr;INDOOR=pr;pr.grp.visible=true;for(const o of pr.people)o.g.visible=true;h.x=s.doorX+s.nx*1.3;h.z=s.doorZ+s.nz*1.3;h.y=pr.oy;h.facing=Math.atan2(s.nx,s.nz);P.cam.yaw=h.facing;P.cam.init=false;pr.insideT=0;return;}
  h.x=s.x+s.nx*1.5;h.z=s.z+s.nz*1.5;h.y=groundY(h.x,h.z);h.facing=s.face;P.cam.yaw=s.face;P.cam.init=false;lampAssignT=0;envDirty=true;}
function openShopMenu(P,s){const items=shopItems(s);SHOP_UI.open=true;SHOP_UI.P=P;SHOP_UI.shop=s;SHOP_UI.items=items;$('shopcat').textContent=SHOP_CAT_NAMES[s.cat];$('shopname').textContent=s.name;$('shopmsg').textContent='';
  const box=$('shopitems');box.innerHTML='';items.forEach((it,i)=>{const b=document.createElement('button');b.className='item';b.innerHTML=`<span><kbd>${i+1}</kbd>${it.n}</span><span class="pr">${it.p?'€'+it.p:'gratis'}</span>`;b.addEventListener('click',()=>buyItem(i));box.appendChild(b);});
  $('shopmenu').hidden=false;if(document.pointerLockElement)document.exitPointerLock();}
function closeShopMenu(){if(!SHOP_UI.open)return;SHOP_UI.open=false;$('shopmenu').hidden=true;}
function buyItem(i){const it=SHOP_UI.items[i];if(!it)return;const P=SHOP_UI.P;if(G.money<it.p){$('shopmsg').textContent='Nicht genug Geld.';noiseHit(0.2,0.1,300);return;}G.money-=it.p;const msg=it.f(P)||'';$('shopmsg').textContent=msg||'Gekauft.';chime([880,1175]);}
function updateShops(dt){
  for(const P of PLAYERS){const h=P.h;if(!h||P.car||P.gameOver)continue;
    if(!h.room){P._shopHintT=(P._shopHintT||0)-dt;{const v=venueNear(h.x,h.z);if(v&&P._shopHintT<=0){hint(`<b>F</b>: <b>${v.name}</b> betreten`,1.0,P);P._shopHintT=0.8;continue;}}const s=shopNear(h.x,h.z,1.9);if(s&&P._shopHintT<=0){hint(`<b>F</b>: <b>${s.name}</b> betreten`,1.0,P);P._shopHintT=0.8;}continue;}
    const r=h.room;if(r.venue){updateVenue(P,r,dt);continue;}r.insideT+=dt;const k=r.keeper;const lx=h.x-r.ox,lz=h.z-r.oz;
    if(lz>r.D/2-0.66&&Math.abs(lx)<1.0&&r.insideT>1.0&&(h.vz||0)>0.2){exitShop(P);continue;}
    if(!k.alive){if(r.insideT>0.5&&!r.deadHint){r.deadHint=true;hint('Der Verkäufer ist tot. Die Kasse plündern: <b>F</b> an der Theke.',3,P);}}
    if(k.alive&&k.state==='keeper'){const dx=h.x-k.x,dz=h.z-k.z;k.facing+=angDiff(k.facing,Math.atan2(dx,dz))*Math.min(1,dt*4);
      const W=WEAPONS[P.weapon];const aiming=!W.melee&&!W.thrown&&(P.inp.aim||P.aimT>0);const d=Math.hypot(dx,dz);const ang=Math.abs(angDiff(P.cam.yaw,Math.atan2(k.x-h.x,k.z-h.z)));
      if(aiming&&d<10&&ang<0.4&&!r.shop.robbed){r.robT+=dt;r.robbing=true;k.armL.rotation.set(-2.9,0,0.3);k.armR.rotation.set(-2.9,0,-0.3);if(SHOP_UI.open)closeShopMenu();
        if(r.robT>1.6){const [a,b]=ROB_CASH[r.shop.cat]||[100,400];const cash=Math.round(mr(a,b));G.money+=cash;r.shop.robbed=simTime;setWanted(Math.max(wanted,r.shop.cat===9?4:r.shop.cat===10?3:2));crime('robbery',r.shop.x,r.shop.z);
          showBig('ÜBERFALL','fail',2.5,`+ €${cash} aus der Kasse`);chime([440,330]);r.robbing=false;}}
      else{if(r.robbing&&!aiming){r.robbing=false;r.robT=0;}if(!r.robbing){k.armL.rotation.x*=0.9;k.armR.rotation.x*=0.9;}
        if(d<2.9&&!SHOP_UI.open&&!(r.hintT>0)){hint('<b>F</b>: einkaufen',1.2,P);r.hintT=1.2;}}
      if(r.hintT>0)r.hintT-=dt;k.animate(dt,0);if(r.robbing){k.armL.rotation.set(-2.9,0,0.3);k.armR.rotation.set(-2.9,0,-0.3);}k.sync();}
    if(SHOP_UI.open&&Math.hypot(k.x-h.x,k.z-h.z)>4)closeShopMenu();}}
// Ziffern im Ladenmenü
addEventListener('keydown',e=>{if(!SHOP_UI.open||mode!=='play')return;if(e.code.startsWith('Digit')){const n=+e.code.slice(5);if(n>=1)buyItem(n-1);e.stopImmediatePropagation();}},true);
