// ===================== RHEINPROMENADE, RHEINTREPPEN, HÖFCHEN =====================
const RHEIN={built:false,people:[],ducks:[],bank:[],musT:0};
function bankXAt(z){for(let x=-150;x<900;x+=1){const i=idx(x,z);if(i>=0&&(mfG(i)&4)){let n=0;for(let k=0;k<8;k++){const j=idx(x+k,z);if(j>=0&&(mfG(j)&4))n++;}if(n>=7)return x;}}return null;}
function freeCell(x,z){const i=idx(x,z);return i>=0&&hgG(i)===0&&!(mfG(i)&4)&&stepAt(x,z)===undefined;}
function buildRhein(){if(RHEIN.built)return;RHEIN.built=true;
  const pave=new GB(),stone=new GB(),iron=new GB(),wood=new GB(),glow=new GB(),misc=new GB();const P=C3(0xcfc3ad),Q=C3(0xb9ab92),S=C3(0x9c8f7c),I=C3(0x2c3136),Wd=C3(0x8a5a30),Gl=C3(0xffe2a8);
  // Uferlinie
  const bank=[];for(let z=-760;z<=480;z+=4){const x=bankXAt(z);if(x!==null&&(!bank.length||Math.abs(x-bank[bank.length-1][0])<12))bank.push([x,z]);}
  RHEIN.bank=bank;
  for(let i=0;i<bank.length-1;i++){const [x0,z0]=bank[i],[x1,z1]=bank[i+1];const dx=x1-x0,dz=z1-z0,L=Math.hypot(dx,dz);const nx=-dz/L,nz=dx/L;// nx zeigt Richtung Land (−x)
    const s=nx<0?1:-1;const lx=nx*s,lz=nz*s;// landeinwärts
    // Promenadenbelag 9 m breit, nur auf freien Flächen
    const ok=[0,3,6,8.5].every(o=>freeCell(x0-lx*0-(-lx)*o,z0-(-lz)*o));
    const A=(o,x,z)=>[x+lx*o,0.03,z+lz*o];
    if(ok){pave.quad(A(0.6,x0,z0),A(0.6,x1,z1),A(9,x1,z1),A(9,x0,z0),[0,0],[L/3,0],[L/3,3],[0,3],(i%2?P:Q));
      // Ufermauer + Geländer
      stone.box((x0+x1)/2+lx*0.3,-0.4,(z0+z1)/2+lz*0.3,0.6,1.0,L+0.05,Math.atan2(dx,dz),S);
      if(i%2===0){iron.box(x0+lx*0.3,0.6,z0+lz*0.3,0.06,1.0,0.06,0,I);}iron.box((x0+x1)/2+lx*0.3,1.55,(z0+z1)/2+lz*0.3,0.05,0.05,L,Math.atan2(dx,dz),I);iron.box((x0+x1)/2+lx*0.3,1.1,(z0+z1)/2+lz*0.3,0.03,0.03,L,Math.atan2(dx,dz),I);
      const face=Math.atan2(-lx,-lz);
      if(i%4===1){wood.box(x0+lx*2.2,0.42,z0+lz*2.2,1.9,0.08,0.55,face,Wd);wood.box(x0+lx*2.5,0.55,z0+lz*2.5,1.9,0.5,0.08,face,Wd);for(const o of [-0.8,0.8])iron.box(x0+lx*2.2+Math.cos(face)*o,0,z0+lz*2.2-Math.sin(face)*o,0.06,0.42,0.5,face,I);}
      if(i%6===3){iron.box(x0+lx*7.8,0,z0+lz*7.8,0.14,4.6,0.14,0,I);iron.box(x0+lx*7.8,4.6,z0+lz*7.8,0.5,0.12,0.5,0,I);glow.box(x0+lx*7.8,4.15,z0+lz*7.8,0.32,0.45,0.32,0,Gl);}
      if(i%9===5){iron.box(x0+lx*1.2,0,z0+lz*1.2,0.08,1.6,0.08,0,I);const r=new THREE.Mesh(new THREE.TorusGeometry(0.32,0.08,8,16),cmat(0xff6a13,0.6));r.position.set(x0+lx*1.15,1.3,z0+lz*1.15);r.rotation.y=face;scene.add(r);}
      if(i%11===8){misc.box(x0+lx*5,0,z0+lz*5,0.4,0.9,0.4,0,C3(0x3e6b3a));}}}
  // Rheintreppen (Sitzstufen) an drei Stellen
  RHEIN.stairs=[];const cand=[];for(let k=3;k<bank.length-4;k++){const z=bank[k][1];if(z<-560||z>330)continue;const [bx,bz]=bank[k];const [ax,az]=bank[k-3],[cx,cz]=bank[k+3];const dx=cx-ax,dz=cz-az,L=Math.hypot(dx,dz);let lx=-dz/L,lz=dx/L;if(lx>0){lx=-lx;lz=-lz;}const tx=dx/L,tz=dz/L;let f=0,n=0;for(let u=-13;u<=13;u+=2)for(let o=0.6;o<=13;o+=2){n++;if(freeCell(bx+tx*u+lx*o,bz+tz*u+lz*o))f++;}cand.push([f/n,k]);}
  cand.sort((a,b)=>b[0]-a[0]);const picks=[];for(const [r,k] of cand){if(r<0.97||picks.length>=3)break;if(picks.some(p=>Math.abs(bank[p][1]-bank[k][1])<110))continue;picks.push(k);}
  for(const k of picks){const [bx,bz]=bank[k];const [ax,az]=bank[k-3],[cx,cz]=bank[k+3];const dx=cx-ax,dz=cz-az,L=Math.hypot(dx,dz);let lx=-dz/L,lz=dx/L;if(lx>0){lx=-lx;lz=-lz;}
    const tx=dx/L,tz=dz/L,W=26,rot=Math.atan2(tx,tz);let free=true;
    const prof=o=>o<0.6?0:o<4.8?Math.min(1.8,0.3*Math.ceil((o-0.6)/0.7)):o<8.8?1.8:o<13?Math.max(0,1.8-0.3*Math.ceil((o-8.8)/0.7)):0;
    {const xs=[],zs=[];for(const u of [-W/2,W/2])for(const o of [0,13]){xs.push(bx+tx*u+lx*o);zs.push(bz+tz*u+lz*o);}const bb=[Math.min(...xs),Math.min(...zs),Math.max(...xs),Math.max(...zs)];
      STEP_FNS.push({bb,f:(x,z)=>{const dx=x-bx,dz=z-bz;const u=dx*tx+dz*tz,o=dx*lx+dz*lz;if(Math.abs(u)>W/2||o<0.6||o>=13)return undefined;const h=prof(o);return h>0?h:undefined;}});
      STEP_BB[0]=Math.min(STEP_BB[0],bb[0]);STEP_BB[1]=Math.min(STEP_BB[1],bb[1]);STEP_BB[2]=Math.max(STEP_BB[2],bb[2]);STEP_BB[3]=Math.max(STEP_BB[3],bb[3]);}
    for(let s=1;s<=6;s++){const o0=0.6+(s-1)*0.7;stone.box(bx+lx*(o0+0.35),0,bz+lz*(o0+0.35),W,0.3*s,0.7,rot,s%2?C3(0xcbbfa8):C3(0xc2b59c));}
    stone.box(bx+lx*6.8,0,bz+lz*6.8,W,1.8,4,rot,C3(0xd2c7b2));for(let s=1;s<=6;s++){const o0=8.8+(s-1)*0.7;stone.box(bx+lx*(o0+0.35),0,bz+lz*(o0+0.35),W,1.8-0.3*s+0.3,0.7,rot,C3(0xc2b59c));}
    for(const u of [-W/2,W/2])iron.box(bx+tx*u+lx*6.8,1.8,bz+tz*u+lz*6.8,0.06,1,4,rot,I);
    const sign=textTex('RHEINUFER',{bg:'#f4ead0',fg:'#1d3557'});const m=new THREE.Mesh(new THREE.PlaneGeometry(3,0.6),new THREE.MeshStandardMaterial({map:sign,roughness:0.7}));m.position.set(bx+lx*8.6,2.5,bz+lz*8.6);m.rotation.y=Math.atan2(lx,lz);scene.add(m);
    RHEIN.stairs.push({bx,bz,lx,lz,tx,tz,W});label('Rheintreppe',bx+lx*5,bz+lz*5,'small');}
  // Höfchen: Cafés, Blumen, Musiker, Tauben
  RHEIN.hof=[];const H0=[-112,-52];const um=[0xc8102e,0xf2f2f2,0x2a6f97,0xe9c46a];let n=0;
  for(let k=0;k<60&&n<7;k++){const x=H0[0]+mr(-26,26),z=H0[1]+mr(-20,20);if(![0,1.6,-1.6].every(o=>freeCell(x+o,z)&&freeCell(x,z+o)))continue;if(RHEIN.hof.some(p=>Math.hypot(p[0]-x,p[1]-z)<5))continue;n++;RHEIN.hof.push([x,z]);
    misc.box(x,0,z,0.8,0.74,0.8,0,C3(0xeeeeee));iron.box(x,0,z,0.06,2.3,0.06,0,I);const u=new THREE.Mesh(new THREE.ConeGeometry(1.7,0.6,8),cmat(um[n%4],0.8));u.position.set(x,2.5,z);u.castShadow=true;scene.add(u);
    for(let c=0;c<3;c++){const a=c*2.1;misc.box(x+Math.cos(a)*1.1,0,z+Math.sin(a)*1.1,0.42,0.46,0.42,a,C3(0x6b4426));}}
  for(let k=0;k<6;k++){const x=H0[0]+mr(-24,24),z=H0[1]+mr(-18,18);if(!freeCell(x,z))continue;misc.box(x,0,z,1.4,0.5,0.6,0,C3(0x7a6a58));const f=new THREE.Mesh(new THREE.SphereGeometry(0.55,8,6),cmat(mpick([0xd94b8a,0xf4a261,0xe76f51,0x9b5de5]),0.9));f.scale.set(1.3,0.6,0.6);f.position.set(x,0.75,z);scene.add(f);}
  label('Höfchen',H0[0],H0[1],'small');
  for(const [G,mat] of [[pave,stdMat({vertexColors:true,roughness:0.85})],[stone,stdMat({vertexColors:true,roughness:0.8})],[iron,stdMat({vertexColors:true,roughness:0.45,metalness:0.6})],[wood,stdMat({vertexColors:true,roughness:0.7})],[glow,new THREE.MeshBasicMaterial({vertexColors:true})],[misc,stdMat({vertexColors:true,roughness:0.7})]]){if(G.empty)continue;const m=new THREE.Mesh(G.geo(),mat);m.receiveShadow=true;m.castShadow=G!==pave;scene.add(m);}
  // Enten & Schwäne
  for(let k=0;k<14;k++){const b=bank[Math.floor(Math.random()*bank.length)];if(!b)continue;const swan=Math.random()<0.25;const g=new THREE.Group();const body=new THREE.Mesh(new THREE.SphereGeometry(swan?0.35:0.18,8,6),cmat(swan?0xffffff:0x6b5a3a,0.8));body.scale.set(1,0.6,1.5);g.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(swan?0.12:0.09,6,5),cmat(swan?0xffffff:0x1f6b3a,0.6));head.position.set(0,swan?0.45:0.15,swan?0.3:0.22);g.add(head);if(swan){const n2=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.06,0.45,6),cmat(0xffffff,0.8));n2.position.set(0,0.25,0.3);g.add(n2);}
    g.position.set(b[0]+mr(3,14),-0.25,b[1]);scene.add(g);RHEIN.ducks.push({g,ph:Math.random()*10,vx:mr(-0.3,0.3),vz:mr(-0.5,0.5)});}}
const RHEIN_SIT=['Der Rhein is heut wieder sehr … nass.','Guck, en Schiff! … Wieder weg.','Ich wohn quasi hier. Auf de dritte Stufe.','Drüben is Kastel. Da war ich noch nie.','Die Ente da guckt mich seit ’ner Stunde an.','Wenn de Rhein Riesling wär … oh Mann.','Sonnenuntergang am Rhein. Bestes Kino der Welt.'];
const RHEIN_WALK=['Schöner Abend für en Spaziergang!','Mein Hund will ins Wasser. ICH will net.','Ich jogge. Langsam. Aber ich jogge.','Bitte net die Enten füttern!','Hast du die Fliegerdackel gesehe? Die warn eben hier!'];
function spawnRheinPeople(){for(const h of RHEIN.people)if(!h.removed)h.remove();RHEIN.people=[];
  for(const st of RHEIN.stairs||[]){const n=4+Math.floor(Math.random()*4);for(let k=0;k<n;k++){const s=1+Math.floor(Math.random()*5);const o=0.6+(s-1)*0.7+0.35,u=mr(-st.W/2+1,st.W/2-1);const x=st.bx+st.tx*u+st.lx*o,z=st.bz+st.tz*u+st.lz*o;const h=new Human('ped');h.x=x;h.z=z;h.y=0.3*s;h.facing=Math.atan2(-st.lx,-st.lz);h.state='roof';h.rheinSit=true;
      h.hips.position.y=0.55;h.legL.rotation.x=-1.5;h.legR.rotation.x=-1.5;h.sync();RHEIN.people.push(h);}}
  for(let k=0;k<5;k++){const b=mpick(RHEIN.bank);if(!b)break;const x=b[0]-mr(3,7),z=b[1];if(!freeCell(x,z))continue;const h=new Human('ped');h.x=x;h.z=z;h.y=0;h.state='walk';h.walkSpeed=mr(1.2,3.4);h.rheinWalk=true;h.side=1;pedFlee(h,x+mr(-5,5),z+mpick([-30,30]),20);h.sync();RHEIN.people.push(h);}}
function updateRhein(dt){if(mode!=='play')return;const P=P1;if(!P.h)return;const [px,pz]=ppos(P);const near=px>-250&&px<800&&pz>-900&&pz<600;
  if(near&&!RHEIN.built)buildRhein();if(!RHEIN.built)return;
  const nearStairs=(RHEIN.stairs||[]).some(s=>Math.hypot(s.bx-px,s.bz-pz)<180);
  if(nearStairs&&!RHEIN.people.some(h=>!h.removed&&h.rheinSit))spawnRheinPeople();
  if(!nearStairs&&RHEIN.people.length&&RHEIN.people.every(h=>h.removed||Math.hypot(h.x-px,h.z-pz)>260)){for(const h of RHEIN.people)if(!h.removed)h.remove();RHEIN.people=[];}
  for(const h of RHEIN.people){if(h.removed||!h.rheinSit||h.state!=='roof')continue;if(h.fx&&h.face.visible)h.updateFace();h.g.position.set(h.x,h.y,h.z);h.g.rotation.y=h.facing;}
  RHEIN.musT-=dt;if(RHEIN.musT<=0){RHEIN.musT=mr(6,12);const c=RHEIN.people.filter(h=>!h.removed&&h.alive&&!h.bubble&&Math.hypot(h.x-px,h.z-pz)<30);if(c.length){const h=mpick(c);say(h,mpick(h.rheinSit?RHEIN_SIT:RHEIN_WALK),3.5,'quiet');}}
  for(const d of RHEIN.ducks){d.ph+=dt;d.g.position.x+=d.vx*dt;d.g.position.z+=d.vz*dt;d.g.position.y=-0.25+Math.sin(d.ph*2)*0.03;const i=idx(d.g.position.x,d.g.position.z);if(i<0||!(mfG(i)&4)){d.vx=-d.vx;d.vz=-d.vz;}if(Math.random()<dt*0.2){d.vx=mr(-0.3,0.3);d.vz=mr(-0.5,0.5);}d.g.rotation.y=Math.atan2(d.vx,d.vz);}}
