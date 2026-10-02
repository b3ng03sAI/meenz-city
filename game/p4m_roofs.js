// ===================== DACH-SZENEN (lustig, normal, skurril) =====================
const ROOF={list:null,active:new Map(),scanT:0,clutter:new Map()};
const _rG={box:new THREE.BoxGeometry(1,1,1),cyl:new THREE.CylinderGeometry(0.5,0.5,1,12),sph:new THREE.SphereGeometry(0.5,10,8),cone:new THREE.ConeGeometry(0.5,1,10),disc:new THREE.CylinderGeometry(0.5,0.5,0.04,16)};
const _rM={};function rmat(c,r=0.7,m=0,e){const k=c+'|'+r+'|'+m+'|'+(e||0);if(!_rM[k])_rM[k]=new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m,emissive:e||0});return _rM[k];}
function rp(g,geo,c,x,y,z,sx,sy,sz,o={}){const m=new THREE.Mesh(_rG[geo],o.mat||rmat(c,o.r??0.7,o.m||0,o.e));m.position.set(x,y,z);m.scale.set(sx,sy,sz);if(o.rx)m.rotation.x=o.rx;if(o.ry)m.rotation.y=o.ry;if(o.rz)m.rotation.z=o.rz;m.castShadow=o.cast!==false;m.receiveShadow=true;g.add(m);return m;}
// ---------- Szenen ----------
const ROOF_SCENES={
  grill:{w:6,npc:3,greet:['Wie bist DU denn hier hochgekommen?!','Ey, en Jetpack! Willste ’ne Worscht?','Des is ’ne private Grillparty! … Na gut, setz dich.'],lines:['Die Worscht is noch roh. Wie ich.','Wer hat de Senf runtergeworfe?!','Unten hat einer „Hallo“ gerufen. Ignoriern.','Noch ’n Bier? Die Kist is auf de Antenn.'],
    build(g,R){rp(g,'cyl',0x222222,0,0.85,0,0.6,0.12,0.6,{m:0.6,r:0.4});for(let i=0;i<3;i++){const a=i*2.1;rp(g,'cyl',0x333333,Math.cos(a)*0.22,0.4,Math.sin(a)*0.22,0.04,0.8,0.04);}
      for(let i=0;i<4;i++)rp(g,'cyl',0xb5523a,-0.18+i*0.12,0.93,0,0.04,0.25,0.04,{rx:Math.PI/2});
      for(let i=0;i<2;i++){rp(g,'box',0x1f5a2a,2+i*0.42,0.17,1.4,0.4,0.33,0.3);}rp(g,'box',0x2b5d9a,-2,0.3,1.5,1.6,0.06,0.8);rp(g,'box',0xdddddd,-2,0.15,1.5,0.06,0.3,0.06);
      return {smoke:[0,1.1,0],pos:[[1.3,-0.6,-1.8],[-1.2,0.9,-1.8],[0.4,1.6,3.2]]};}},
  sonne:{w:5,npc:1,pose:'lie',greet:['Psst. Ich bräun grad.','Du stehst mir in de Sonn.','Ich bin seit 1998 hier oben. Bräune dauert halt.'],lines:['*schnarcht*','Noch zwei Stunden, dann dreh ich mich um.','Hat einer de Sonnencreme gesehe? … Egal.'],
    build(g,R){rp(g,'box',0xf0c419,0,0.02,0,0.9,0.02,2,{cast:false});rp(g,'cyl',0xdddddd,1.1,1.1,0.4,0.03,2.2,0.03);rp(g,'cone',0xd94b3a,1.1,2.25,0.4,2.2,0.5,2.2);rp(g,'cyl',0x3a7bd5,-0.9,0.25,1.1,0.16,0.5,0.16);
      return {pos:[[0,0,0,0]]};}},
  tauben:{w:6,npc:1,greet:['Halt! Du betrittst des Taubenreich!','Die Tauben gehorchen nur mir. Merk dir des.','Knie nieder vor dem Taubenkönig von Meenz!'],lines:['Gurr. … Des war ich, net die Taube.','Sie planen was. Gegen de Dom.','Ich hab ihne Namen gegebe. Alle heiße Günther.'],
    build(g,R){rp(g,'cyl',0xe8c040,0,1.87,0,0.2,0.1,0.2,{m:0.8,r:0.3});const birds=[];for(let i=0;i<14;i++){const a=R()*6.28,r=1+R()*2.3;const b=new THREE.Group();b.position.set(Math.cos(a)*r,0,Math.sin(a)*r);b.rotation.y=R()*6.28;g.add(b);
        rp(b,'sph',0x8a8f98,0,0.13,0,0.16,0.14,0.24);rp(b,'sph',0x6c7380,0,0.25,0.1,0.09,0.09,0.09);rp(b,'cone',0xd08a20,0,0.24,0.16,0.03,0.06,0.03,{rx:Math.PI/2});birds.push(b);}
      return {birds,pos:[[0,0,0,0]],crown:true};}},
  yoga:{w:7,npc:3,pose:'yoga',greet:['Ommmm … wer bist du? … Ommmm.','Du störst unser Chakra. Und die Antenne.','Mach mit! Herabschauender Meenzer!'],lines:['Einatmen … Rheinluft … ausatmen … Diesel.','Ich spür mei Knie nimmer.','Namasté. Oder wie mir sage: Ei gude.'],
    build(g,R){const cols=[0x8e44ad,0x16a085,0xe67e22];for(let i=0;i<3;i++)rp(g,'box',cols[i],-2+i*2,0.015,0,0.7,0.03,1.8,{cast:false});rp(g,'box',0x444444,0,0.25,2.2,0.5,0.5,0.3);
      return {pos:[[-2,0,0,0],[0,0,0,0],[2,0,0,0]]};}},
  alu:{w:6,npc:1,greet:['Bleib wo du bist! Hast du Strahlen dabei?','Die senden aus Wiesbaden. Ich empfang alles.','Du bist von denen, oder? DU BIST VON DENEN!'],lines:['Kanal 7 sagt, die Tauben sind Drohnen.','Mei Hut is aus Alufolie. Und Liebe.','Die Antenne Nummer 4 hört Schlager. Gefährlich.'],
    build(g,R){const dishes=[];for(let i=0;i<7;i++){const a=i/7*6.28,r=1.8+R()*0.8;const d=new THREE.Group();d.position.set(Math.cos(a)*r,0,Math.sin(a)*r);g.add(d);rp(d,'cyl',0x777777,0,0.5,0,0.04,1,0.04);
        const s=rp(d,'sph',0xe9e9e9,0,1.05,0,0.75,0.75,0.25,{r:0.4,m:0.3});s.rotation.x=-0.6;s.rotation.y=R()*6.28;dishes.push(s);}
      return {pos:[[0,0,0,0]],foil:true,dishes};}},
  sofa:{w:6,npc:2,pose:'sit',greet:['Psst! Gleich kommt Fassenacht im Fernsehe!','Setz dich, aber net auf mei Chips.','Wir habbe hier oben besseren Empfang. Und kein Sofa-Verbot.'],lines:['Des Programm is schlecht. Ich bleib trotzdem.','Wo is die Fernbedienung? … Die is unten. Seit 2019.','Mir gucke ein Testbild. Is spannender als de Tatort.'],
    build(g,R){rp(g,'box',0x7a2e2e,0,0.25,0,2.4,0.5,0.9);rp(g,'box',0x7a2e2e,0,0.65,-0.38,2.4,0.6,0.18);for(const s of [-1,1])rp(g,'box',0x6a2626,s*1.2,0.45,0,0.18,0.5,0.9);
      rp(g,'box',0x222222,0,0.55,2.1,1.3,0.85,0.2);const scr=rp(g,'box',0x88aaff,0,0.57,1.99,1.15,0.7,0.02,{e:0x5577cc});rp(g,'box',0x5a3b20,0,0.12,2.1,1.5,0.24,0.5);
      return {pos:[[-0.5,0,0.05,Math.PI],[0.5,0,0.05,Math.PI]],screen:scr};}},
  zwerge:{w:6,npc:0,greet:[],lines:[],
    build(g,R){for(let i=0;i<5;i++)for(let j=0;j<5;j++){const x=-2+i,z=-2+j;const c=[0xc0392b,0x2980b9,0x27ae60,0xf1c40f][(i+j)%4];rp(g,'cyl',0x3f6fb5,x,0.18,z,0.2,0.3,0.2);rp(g,'sph',0xf2c9a0,x,0.42,z,0.16,0.16,0.16);rp(g,'cone',c,x,0.62,z,0.2,0.32,0.2);rp(g,'sph',0xffffff,x,0.33,z+0.07,0.13,0.14,0.08);}
      const t=new THREE.Mesh(new THREE.PlaneGeometry(1.6,0.5),new THREE.MeshStandardMaterial({map:textTex?textTex('ZWERGENLAND – BETRETEN VERBOTEN',{bg:'#f4ead0',fg:'#7a1a1a'}):null,roughness:0.8}));t.position.set(0,1.1,-2.9);g.add(t);rp(g,'cyl',0x6b4426,0,0.5,-2.95,0.06,1,0.06);
      return {pos:[]};}},
  tuba:{w:4,npc:1,greet:['*TRÖÖÖT* … Oh, Publikum!','Ich üb für de Rosenmontagszug. Seit elf Jahr.','Wünsch dir was! … Außer „Atemlos“.'],lines:['*TRÖÖÖÖT*','*tröt-tröt-TRÖÖÖT*','Die Nachbarn habbe mich hier hochgeschickt. Freiwillig.'],
    build(g,R){rp(g,'box',0x444444,0.8,0.4,0.8,0.05,0.8,0.05);rp(g,'box',0xf4f4f4,0.8,0.82,0.8,0.5,0.35,0.02,{rx:-0.5});return {pos:[[0,0,0,0]],tuba:true};}},
  wanne:{w:4,npc:1,pose:'bath',greet:['IS BESETZT!','Hier oben hört mich keiner singe. Dachte ich.','Reich mir mal die Ente.'],lines:['*singt falsch* Am Rosenmontag bin ich gebore …','Des Wasser is kalt. Wie mei Ex.','Ich hab de Stöpsel verlore. Seit Dienstag.'],
    build(g,R){const tub=rp(g,'box',0xf5f5f5,0,0.3,0,1.8,0.6,0.85,{r:0.25});rp(g,'box',0xbfe6ff,0,0.56,0,1.6,0.04,0.7,{r:0.1});for(let i=0;i<8;i++)rp(g,'sph',0xffffff,mr(-0.7,0.7),0.62,mr(-0.3,0.3),0.25,0.18,0.25);rp(g,'sph',0xffd23f,0.5,0.66,0.2,0.14,0.12,0.16);
      for(const [x,z] of [[-0.8,-0.35],[0.8,-0.35],[-0.8,0.35],[0.8,0.35]])rp(g,'sph',0xd4af37,x,0.05,z,0.1,0.1,0.1,{m:0.8});return {pos:[[-0.35,0,0,Math.PI/2]]};}},
  golf:{w:6,npc:1,greet:['Loch sieben von eins. Par 12.','Pass auf, wo du landest! Des is mei Grün!','Wenn de Ball runterfällt, zählt des als Hole-in-one. Unten.'],lines:['Fore! … Sorry, unten!','Mei Handicap is mei Schwiegermutter.','Des Grün is aus’m Baumarkt. Wie mei Frisur.'],
    build(g,R){rp(g,'cyl',0x3fa34d,0,0.01,0,4.5,0.02,4.5,{cast:false});rp(g,'cyl',0x111111,1.2,0.02,0.8,0.12,0.02,0.12,{cast:false});rp(g,'cyl',0xdddddd,1.2,0.75,0.8,0.02,1.5,0.02);rp(g,'box',0xe74c3c,1.38,1.35,0.8,0.32,0.22,0.01);rp(g,'sph',0xffffff,-0.6,0.04,-0.4,0.05,0.05,0.05);
      return {pos:[[-1,0,-0.8,0.8]],golf:true};}},
};
const SCENE_KEYS=Object.keys(ROOF_SCENES);
function roofFlat(x,z,v,r){for(let dz=-r;dz<=r;dz+=1)for(let dx=-r;dx<=r;dx+=1){const i=idx(x+dx,z+dz);if(i<0||hgG(i)!==v)return false;}return true;}
function roofCandidates(){if(ROOF.list)return ROOF.list;ROOF.list=[];for(const b of BUILDINGS){if(b.roof!==0||!(b.area>=110)||b.H<6||b.H>48||b.mh>0.5)continue;const i=idx(b.x,b.z);if(i<0)continue;const v=hgG(i);if(v<6||v>=255)continue;
    const hsh=((b.gid||0)*2654435761>>>0)%100;b.roofV=v;b.roofHash=hsh;ROOF.list.push(b);}return ROOF.list;}
function roofHuman(sc,p,v,b){const [x,y0,z,f]=p;const h=new Human('ped');h.x=b.x+x;h.z=b.z+z;h.y=v;h.facing=f||0;h.state='roof';h.roofScene=sc;h.walkSpeed=1;const pose=ROOF_SCENES[sc.key].pose;
  if(pose==='lie'){h.g.rotation.x=-Math.PI/2;h.y=v+0.15;h.armL.rotation.x=-2.9;h.armR.rotation.x=-2.9;}
  else if(pose==='sit'){h.hips.position.y=0.55;h.legL.rotation.x=-1.5;h.legR.rotation.x=-1.5;h.y=v;}
  else if(pose==='bath'){h.g.rotation.z=Math.PI/2*0;h.hips.position.y=0.42;h.legL.rotation.x=-1.5;h.legR.rotation.x=-1.5;h.hips.rotation.x=0.5;}
  if(sc.extra.crown&&!sc.crowned){sc.crowned=true;const c=new THREE.Mesh(_rG.cyl,rmat(0xe8c040,0.3,0.8));c.scale.set(0.2,0.1,0.2);c.position.set(0,0.95,0);h.hips.add(c);}
  if(sc.extra.foil){const c=new THREE.Mesh(_rG.cone,rmat(0xd8d8d8,0.15,0.9));c.scale.set(0.24,0.3,0.24);c.position.set(0,1.0,0);h.hips.add(c);}
  if(sc.extra.tuba){const t=new THREE.Group();t.position.set(0,0.45,0.25);h.hips.add(t);rp(t,'cyl',0xd4af37,0,0,0,0.16,0.5,0.16,{m:0.9,r:0.25});rp(t,'cone',0xd4af37,0,0.38,0,0.45,0.3,0.45,{m:0.9,r:0.25,rx:Math.PI});h.tuba=t;}
  if(sc.extra.golf){h.club=rp(h.armR,'cyl',0x999999,0,-0.95,0.05,0.02,0.75,0.02,{m:0.8});}
  h.sync();return h;}
function buildRoofScene(b){const key=SCENE_KEYS[b.roofHash%SCENE_KEYS.length];const S=ROOF_SCENES[key];const R=mulberry32(b.gid||1);const v=b.roofV;
  if(!roofFlat(b.x,b.z,v,Math.ceil(S.w/2)))return null;
  const g=new THREE.Group();g.position.set(b.x,v,b.z);g.rotation.y=0;scene.add(g);const extra=S.build(g,R)||{};
  const sc={key,b,g,extra,people:[],greeted:false,lineT:mr(4,10),v};for(const p of (extra.pos||[]).slice(0,S.npc))sc.people.push(roofHuman(sc,p.length===3?[p[0],0,p[2],Math.atan2(-p[0],-p[2])]:p,v,b));
  if(key==='grill'||key==='yoga')for(const h of sc.people)h.facing=Math.atan2(-(h.x-b.x),-(h.z-b.z));
  return sc;}
function disposeRoofScene(sc){scene.remove(sc.g);for(const h of sc.people)if(!h.removed)h.remove();}
// normale Dachaufbauten auf vielen Flachdächern
function buildClutter(b){const R=mulberry32((b.gid||1)*31);const g=new THREE.Group();g.position.set(b.x,b.roofV,b.z);const n=1+Math.floor(R()*4);let made=0;
  for(let k=0;k<n*3&&made<n;k++){const x=(R()-0.5)*Math.sqrt(b.area)*0.6,z=(R()-0.5)*Math.sqrt(b.area)*0.6;const i=idx(b.x+x,b.z+z);if(i<0||hgG(i)!==b.roofV)continue;const t=R();made++;
    if(t<0.35){rp(g,'box',0xb8bcc0,x,0.45,z,1.2,0.9,0.8,{m:0.4,r:0.5});rp(g,'cyl',0x555555,x,0.92,z,0.5,0.05,0.5);}
    else if(t<0.55){rp(g,'box',0x8c4a3a,x,0.7,z,0.6,1.4,0.6);}
    else if(t<0.75){for(let s=0;s<3;s++)rp(g,'box',0x1d2a44,x+s*1.1,0.35,z,1,0.04,1.6,{rx:-0.5,m:0.3,r:0.3});}
    else if(t<0.88){rp(g,'cyl',0x777777,x,1.1,z,0.04,2.2,0.04);rp(g,'box',0x888888,x,2,z,1,0.04,0.04);rp(g,'box',0x888888,x,1.7,z,0.7,0.04,0.04);}
    else{rp(g,'box',0x5d8c3a,x,0.25,z,1,0.5,0.4);rp(g,'sph',0x3f7a2a,x,0.6,z,0.9,0.5,0.4);}}
  if(!made)return null;scene.add(g);return g;}
function updateRoofs(dt){if(mode!=='play')return;const P=P1;if(!P.h)return;const [px,pz]=ppos(P);ROOF.scanT-=dt;
  if(ROOF.scanT<=0){ROOF.scanT=1.5;const L=roofCandidates();const near=new Set();
    for(const b of L){const d=Math.hypot(b.x-px,b.z-pz);if(d>170)continue;near.add(b);
      if(b.roofHash<28&&!ROOF.active.has(b)&&d<150){const sc=buildRoofScene(b);ROOF.active.set(b,sc);}
      else if(b.roofHash>=28&&b.roofHash<75&&!ROOF.clutter.has(b)){ROOF.clutter.set(b,buildClutter(b));}}
    for(const [b,sc] of ROOF.active)if(!near.has(b)&&Math.hypot(b.x-px,b.z-pz)>220){if(sc)disposeRoofScene(sc);ROOF.active.delete(b);}
    for(const [b,g] of ROOF.clutter)if(!near.has(b)&&Math.hypot(b.x-px,b.z-pz)>240){if(g)scene.remove(g);ROOF.clutter.delete(b);}}
  const indoor=!!P.h.room;
  for(const [b,sc] of ROOF.active){if(!sc)continue;sc.g.visible=!indoor;const S=ROOF_SCENES[sc.key];const t=simTime;
    for(const h of sc.people){if(h.removed||!h.alive||h.state==='talk')continue;if(h.state!=='roof'){continue;}
      const pose=S.pose;if(pose==='yoga'){const ph=Math.floor((t/6+h.phase)%3);h.armL.rotation.x=h.armR.rotation.x=ph===0?-3.05:ph===1?-1.57:0;h.armL.rotation.z=ph===1?-1.2:0.06;h.armR.rotation.z=ph===1?1.2:-0.06;h.legL.rotation.x=ph===2?-1.2:0;}
      else if(sc.extra.tuba){h.armL.rotation.x=-1.2;h.armR.rotation.x=-1.2;h.armL.rotation.z=0.5;h.armR.rotation.z=-0.5;if(h.tuba)h.tuba.rotation.z=Math.sin(t*2)*0.05;}
      else if(sc.extra.golf){h.armL.rotation.x=h.armR.rotation.x=-0.3+Math.sin(t*1.3)*0.6;}
      else if(!pose)h.animate(dt,0);
      if(h.fx&&h.face.visible)h.updateFace();if(pose!=='lie')h.y=sc.v;h.g.position.set(h.x,h.y,h.z);h.g.rotation.y=h.facing;
      // zum Spieler gucken, wenn er auf dem Dach ist
      const onRoof=Math.abs(P.h.y-sc.v)<2.5&&Math.hypot(P.h.x-h.x,P.h.z-h.z)<14;if(onRoof&&!pose)faceTo(h,P.h.x-h.x,P.h.z-h.z,dt,3);}
    if(sc.extra.smoke&&Math.random()<dt*5&&Math.hypot(b.x-px,b.z-pz)<80)spawnPart(b.x+sc.extra.smoke[0],sc.v+1.1,b.z+sc.extra.smoke[2],{color:0xbbbbbb,size:mr(0.4,0.8),vy:1.2,life:2,grow:1.5,alpha:0.4});
    if(sc.extra.screen)sc.extra.screen.material.emissiveIntensity=0.6+Math.random()*0.5;
    if(sc.extra.birds){for(const bd of sc.extra.birds){if(bd.fly){bd.position.y+=dt*bd.fly;bd.position.x+=dt*bd.vx;bd.position.z+=dt*bd.vz;bd.rotation.z=Math.sin(t*30)*0.4;if(bd.position.y>40){bd.fly=0;bd.position.set(bd.home[0],0,bd.home[1]);bd.visible=true;bd.back=simTime+mr(15,30);}}
        else{bd.rotation.y+=Math.sin(t*3+bd.position.x)*dt;bd.children[1].position.y=0.25+Math.abs(Math.sin(t*4+bd.position.z))*0.03;
          const wx=b.x+bd.position.x,wz=b.z+bd.position.z;if(Math.hypot(P.h.x-wx,P.h.z-wz)<3.5&&Math.abs(P.h.y-sc.v)<3){bd.home=[bd.position.x,bd.position.z];bd.fly=mr(4,7);const a=Math.random()*6.28;bd.vx=Math.cos(a)*5;bd.vz=Math.sin(a)*5;}}}}
    // Begrüßung und Sprüche
    const pd=Math.hypot(b.x-P.h.x,b.z-P.h.z);const up=Math.abs(P.h.y-sc.v)<3;
    if(!sc.greeted&&up&&pd<10&&sc.people.length&&S.greet.length){sc.greeted=true;const h=mpick(sc.people);say(h,mpick(S.greet),3.5,'loud');h.setExpr(mpick(['surprised','angry','smile']));if(sc.extra.tuba)roofHonk();}
    sc.lineT-=dt;if(sc.lineT<=0){sc.lineT=mr(7,15);if(pd<30&&sc.people.length&&S.lines.length){const h=mpick(sc.people);if(!h.bubble&&h.state==='roof')say(h,mpick(S.lines),3.4,up?'':'quiet');if(sc.extra.tuba&&Math.random()<0.6)roofHonk();}}}}
function roofHonk(){const ctx=AUD.ctx;if(!ctx)return;const t=ctx.currentTime;for(const [f,d,o] of [[98,0.5,0],[87,0.35,0.55],[110,0.9,0.95]]){const os=ctx.createOscillator();os.type='sawtooth';os.frequency.value=f;const fl=ctx.createBiquadFilter();fl.type='lowpass';fl.frequency.value=600;const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t+o);g.gain.exponentialRampToValueAtTime(0.09,t+o+0.05);g.gain.exponentialRampToValueAtTime(0.0001,t+o+d);os.connect(fl);fl.connect(g);g.connect(AUD.master);os.start(t+o);os.stop(t+o+d+0.05);}}
