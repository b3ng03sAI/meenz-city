// ===================== EASTER EGG: HÖRN & FÖRKL (Grillparzerstraße / Konrad-Adenauer-Ring, Wiesbaden) =====================
const EGG={C:[-2968.65,-7562.29],built:false,sq:[],t:0,callT:2,turn:0,u:0.2,dir:1};
// Fassade Grillparzerstraße 39 zum Ring (OSM-Umriss, relativ zur Kreuzung)
const EGG_FA=[3.1,-35.0],EGG_FB=[10.5,-14.9];
function eggW(p){return [EGG.C[0]+p[0],EGG.C[1]+p[1]];}
function squirrelModel(fur){const g=new THREE.Group();const M=c=>cmat(c,0.9);const add=(geo,c,x,y,z,rx=0,ry=0,rz=0,par=g)=>{const m=new THREE.Mesh(geo,M(c));m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=true;par.add(m);return m;};
  const body=add(new THREE.SphereGeometry(0.1,12,10).scale(0.85,1.15,1),fur,0,0.16,0);add(new THREE.SphereGeometry(0.07,10,8).scale(0.9,1,0.8),0xf3e6d0,0,0.15,0.055);// Bauch
  const head=new THREE.Group();head.position.set(0,0.31,0.02);g.add(head);add(new THREE.SphereGeometry(0.068,12,10),fur,0,0,0,0,0,0,head);add(new THREE.SphereGeometry(0.035,8,6),fur,0,-0.012,0.058,0,0,0,head);
  add(new THREE.SphereGeometry(0.009,6,5),0x111111,0,-0.008,0.092,0,0,0,head);for(const s of [-1,1]){add(new THREE.SphereGeometry(0.013,8,6),0x111111,s*0.03,0.018,0.055,0,0,0,head);add(new THREE.ConeGeometry(0.02,0.06,6),fur,s*0.035,0.068,-0.005,0,0,s*-0.25,head);add(new THREE.ConeGeometry(0.006,0.025,4),fur,s*0.04,0.105,-0.005,0,0,0,head);}
  // buschiger Schwanz aus Segmenten
  const tail=[];let par=g;let y=0.1,z=-0.08;for(let i=0;i<6;i++){const sg=new THREE.Group();sg.position.set(0,i?0.065:0.08,i?-0.01:-0.08);par.add(sg);add(new THREE.SphereGeometry(0.055+Math.sin(i/5*Math.PI)*0.03,8,6),fur,0,0.03,0,0,0,0,sg);sg.rotation.x=i===0?-0.9:0.35;tail.push(sg);par=sg;}
  const legs=[];for(const s of [-1,1]){const l=new THREE.Group();l.position.set(s*0.05,0.08,0.01);g.add(l);add(new THREE.CapsuleGeometry(0.022,0.05,3,6),fur,0,-0.04,0.01,0,0,0,l);add(new THREE.SphereGeometry(0.022,6,5).scale(1,0.6,1.6),fur,0,-0.075,0.03,0,0,0,l);legs.push(l);}
  const arms=[];for(const s of [-1,1]){const a=new THREE.Group();a.position.set(s*0.07,0.22,0.03);g.add(a);add(new THREE.CapsuleGeometry(0.014,0.07,3,6),fur,0,-0.045,0,0,0,0,a);arms.push(a);}
  g.userData={head,tail,legs,arms};g.scale.setScalar(2.4);scene.add(g);return g;}
function eggBuild(){if(EGG.built)return;EGG.built=true;const C=EGG.C;
  // Hörnchen
  EGG.sq=[squirrelModel(0xa0522d),squirrelModel(0xb5651d)];EGG.bubs=EGG.sq.map(g=>({x:0,y:0,z:0,alive:true,removed:false,g}));EGG.names=['Hörn','Förkl'];
  // Hausnummer, Straßenschilder, Hecke, Zebrastreifen
  const [ax,az]=eggW(EGG_FA),[bx,bz]=eggW(EGG_FB);const fx=bx-ax,fz=bz-az,FL=Math.hypot(fx,fz);const tx=fx/FL,tz=fz/FL;const nx=-tz,nz=tx;// nx zeigt zum Ring (−x)
  EGG.tx=tx;EGG.tz=tz;EGG.nx=nx;EGG.nz=nz;EGG.ax=ax;EGG.az=az;EGG.FL=FL;
  const plate=new THREE.Mesh(new THREE.PlaneGeometry(0.42,0.32),new THREE.MeshStandardMaterial({map:textTex('39',{w:128,h:96,bg:'#1d3a7a',fg:'#ffffff',font:'700 72px "Barlow Condensed",sans-serif'}),roughness:0.5}));
  const mx=(ax+bx)/2,mz=(az+bz)/2;plate.position.set(mx+nx*0.06,3.1,mz+nz*0.06);plate.rotation.y=Math.atan2(nx,nz);scene.add(plate);
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,3.2,8),cmat(0x8a8f96,0.4));const [px,pz]=eggW([4.2,-7.5]);pole.position.set(px,1.6,pz);pole.castShadow=true;scene.add(pole);
  const sign=(txt,ang,y)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.26,0.02),[cmat(0xf4f4f4,0.5),cmat(0xf4f4f4,0.5),cmat(0xf4f4f4,0.5),cmat(0xf4f4f4,0.5),new THREE.MeshStandardMaterial({map:textTex(txt,{w:512,h:96,bg:'#f4f4f4',fg:'#111',font:'600 44px "Barlow Condensed",sans-serif',border:'#111'}),roughness:0.5}),new THREE.MeshStandardMaterial({map:textTex(txt,{w:512,h:96,bg:'#f4f4f4',fg:'#111',font:'600 44px "Barlow Condensed",sans-serif',border:'#111'}),roughness:0.5})]);m.position.set(px,y,pz);m.rotation.y=ang;scene.add(m);};
  sign('Grillparzerstraße',Math.atan2(-0.928,0.372)+Math.PI/2,3.0);sign('Konrad-Adenauer-Ring',Math.atan2(0.468,0.884)+Math.PI/2,2.68);
  const hedge=new GB();const hc=C3(0x3f6b33);for(let s=0.5;s<FL-0.5;s+=1.0){const x=ax+tx*s+nx*0.7,z=az+tz*s+nz*0.7;hedge.box(x,0,z,0.6,0.85+Math.sin(s*3)*0.05,1.02,Math.atan2(tx,tz),hc);}
  const hm=new THREE.Mesh(hedge.geo(),stdMat({vertexColors:true,roughness:0.95,map:GROUND_DETAIL}));hm.castShadow=true;hm.receiveShadow=true;scene.add(hm);
  const zebra=new GB();const wh=C3(0xf2f2f2);for(const [cr,dir] of [[[8.5,-3.9],[-0.928,0.372]],[[2.7,29.0],[0.468,0.884]]]){const [cx,cz]=eggW(cr);const px2=-dir[1],pz2=dir[0];for(let k=-3;k<=3;k++){const x=cx+dir[0]*k*1.0,z=cz+dir[1]*k*1.0;zebra.box(x,0.035,z,0.5,0.01,4.2,Math.atan2(px2,pz2),wh);}}
  scene.add(new THREE.Mesh(zebra.geo(),stdMat({vertexColors:true,roughness:0.6})));
  }
function eggSqueak(f){const ctx=AUD.ctx;if(!ctx)return;const t=ctx.currentTime;const o=ctx.createOscillator();o.type='triangle';o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*1.6,t+0.08);o.frequency.exponentialRampToValueAtTime(f*1.1,t+0.16);const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(0.06,t+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t+0.2);o.connect(g);g.connect(AUD.master);o.start(t);o.stop(t+0.22);}
function updateEgg(dt){if(mode!=='play')return;const P=P1;if(!P.h)return;const [px,pz]=ppos(P);const d0=Math.hypot(px-EGG.C[0],pz-EGG.C[1]);if(d0>400&&!EGG.built)return;eggBuild();
  const vis=d0<260&&!INDOOR;for(const g of EGG.sq)g.visible=vis;if(!vis)return;
  const ph=P.h;const near=Math.hypot(ph.x-(EGG.ax+EGG.tx*EGG.u*EGG.FL),ph.z-(EGG.az+EGG.tz*EGG.u*EGG.FL))<4&&!P.car;
  // gemeinsam laufen: Hand in Hand entlang der Fassade, an den Enden umdrehen
  EGG.t+=dt;if(!near){EGG.u+=EGG.dir*dt*0.55/EGG.FL;if(EGG.u>0.92){EGG.u=0.92;EGG.dir=-1;}if(EGG.u<0.08){EGG.u=0.08;EGG.dir=1;}}
  const cx=EGG.ax+EGG.tx*EGG.u*EGG.FL+EGG.nx*1.75,cz=EGG.az+EGG.tz*EGG.u*EGG.FL+EGG.nz*1.75;const head=Math.atan2(EGG.tx*EGG.dir,EGG.tz*EGG.dir);const lx=Math.cos(head),lz=-Math.sin(head);
  EGG.sq.forEach((g,i)=>{const s=i?1:-1;const hop=near?0:Math.abs(Math.sin(EGG.t*7+i*0.4))*0.06;g.position.set(cx+lx*0.3*s,groundY(cx,cz)+hop,cz+lz*0.22*s);
    let face=head;if(near)face=Math.atan2(ph.x-g.position.x,ph.z-g.position.z);g.rotation.y=face;const U=g.userData;
    U.legs.forEach((l,k)=>{l.rotation.x=near?0:Math.sin(EGG.t*14+k*Math.PI)*0.6;});
    // Händchen halten: innerer Arm zur Seite des Partners
    U.arms[i?0:1].rotation.set(-0.5,0,s*1.25);U.arms[i].rotation.set(-0.3+Math.sin(EGG.t*3)*0.2,0,0);
    U.tail.forEach((t,k)=>{t.rotation.z=Math.sin(EGG.t*2.2+k*0.6+i)*0.12;});U.head.rotation.y=Math.sin(EGG.t*1.3+i*2)*0.35;
    EGG.bubs[i].x=g.position.x;EGG.bubs[i].y=g.position.y-1.2;EGG.bubs[i].z=g.position.z;});
  // sich gegenseitig rufen
  EGG.callT-=dt;if(EGG.callT<=0){const i=EGG.turn++%2;const other=EGG.names[1-i];const long=Math.random()<0.3;EGG.callT=mr(2.2,4.2);
    say(EGG.bubs[i],long?(other==='Hörn'?'Hööörn!':'Föööörkl!'):other+'!',2.2,long?'loud':'');eggSqueak(i?1400:1100);
    if(Math.random()<0.25){for(let k=0;k<6;k++)spawnPart(cx,groundY(cx,cz)+0.9,cz,{color:0xff6b9a,size:mr(0.08,0.14),vx:mr(-0.5,0.5),vy:mr(0.8,1.6),vz:mr(-0.5,0.5),life:1.2,grow:0.3});}}}
