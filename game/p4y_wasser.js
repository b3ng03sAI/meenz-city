// ===================== SCHWIMMEN + JETSKIS =====================
const SWIM_Y=WATER_LEVEL-0.55;
function waterCell(x,z){const i=idx(x,z);return i>=0&&(mfG(i)&4)!==0;}
// Ist der Spieler hier im Wasser (nicht auf einer Brücke/Treppe darüber)?
function swimHere(x,z,y){if(!waterCell(x,z))return false;if(stepAt(x,z)!==undefined)return false;const b=bridgeLocal(x,z);if(b&&y!==undefined&&y>deckY(b.t,b.br)-2.5)return false;return true;}
// Bewegungs-Blockade für Schwimmer: Wasser frei (außer Pfeiler/Schiffe), Land wie gewohnt
function swimBlocked(x,z,y){if(swimHere(x,z,y))return bridgeHasPier(x,z)||shipAt(x,z);return blocked(x,z,y);}
function bridgeHasPier(x,z){for(const br of BRIDGES){const bb=br.bb;if(x<bb[0]-30||x>bb[2]+30||z<bb[1]-30||z>bb[3]+30)continue;const dx=x-br.A[0],dz=z-br.A[1];const t=dx*br.U[0]+dz*br.U[1],l=dx*br.N[0]+dz*br.N[1];for(const p of br.piers){if(Math.abs(t-p.t)<p.len/2+0.6&&Math.abs(l-p.l)<p.wid/2+0.6)return true;}}return false;}
function shipAt(x,z){for(const s of SHIPS){const dx=x-s.g.position.x,dz=z-s.g.position.z;const c=Math.cos(s.g.rotation.y),sn=Math.sin(s.g.rotation.y);const lx=dx*c-dz*sn,lz=dx*sn+dz*c;if(Math.abs(lx)<6&&Math.abs(lz)<52)return true;}return false;}
function splash(x,z,k=1){for(let i=0;i<14*k;i++)spawnPart(x+mr(-0.6,0.6),WATER_LEVEL+0.2,z+mr(-0.6,0.6),{color:0xeaf4f8,size:mr(0.3,0.8),vx:mr(-1.5,1.5),vy:mr(2,4.5)*k,vz:mr(-1.5,1.5),life:0.8,grow:0.6,alpha:0.7});
  const ctx=AUD.ctx;if(!ctx)return;const t=ctx.currentTime;const n=ctx.createBufferSource();const len=Math.floor(ctx.sampleRate*0.5);const b=ctx.createBuffer(1,len,ctx.sampleRate);const d=b.getChannelData(0);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,2);n.buffer=b;
  const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=1400;const g=ctx.createGain();g.gain.value=0.25*Math.min(1,k);n.connect(f);f.connect(g);g.connect(AUD.master);n.start(t);}
// Boden für den Spieler: im Wasser liegt er an der Oberfläche
function playerGroundY(P,x,z,y){if(swimHere(x,z,y))return SWIM_Y;return groundY(x,z,y);}
function swimPose(P,dt){const h=P.h;const was=P.swim;P.swim=!P.car&&swimHere(h.x,h.z,h.y)&&h.y<=SWIM_Y+0.15;
  if(P.swim&&!was){splash(h.x,h.z,Math.min(2,0.6+Math.abs(P.vy||0)*0.12));if(!P.swimHint){P.swimHint=true;hint('Du schwimmst! <b>Shift</b> = kraulen · raus am Ufer oder an einer Treppe',4,P);}}
  if(!P.swim){if(was){h.g.rotation.x=0;h.blob.visible=true;}return;}
  const mv=Math.hypot(h.vx||0,h.vz||0);P.swimT=(P.swimT||0)+dt*(2+mv*1.4);const s=P.swimT;
  h.blob.visible=false;h.g.rotation.order='YXZ';h.g.rotation.x+=((mv>0.3?1.32:0.35)-h.g.rotation.x)*Math.min(1,dt*4);h.g.position.y=h.y+(mv>0.3?0.3:-0.8)+Math.sin(s*0.7)*0.05;
  if(mv>0.3){h.armL.rotation.set(-Math.PI+Math.sin(s)*2.2-1,0,0.2);h.armR.rotation.set(-Math.PI+Math.sin(s+Math.PI)*2.2-1,0,-0.2);h.legL.rotation.x=Math.sin(s*2.2)*0.4;h.legR.rotation.x=-Math.sin(s*2.2)*0.4;}
  else{h.armL.rotation.set(-0.3+Math.sin(s)*0.4,0,0.9);h.armR.rotation.set(-0.3-Math.sin(s)*0.4,0,-0.9);h.legL.rotation.x=Math.sin(s*1.3)*0.3;h.legR.rotation.x=-Math.sin(s*1.3)*0.3;}
  if(Math.random()<dt*(2+mv*3))spawnPart(h.x+mr(-0.4,0.4),WATER_LEVEL+0.05,h.z+mr(-0.4,0.4),{color:0xeef6f8,size:mr(0.4,0.9),vy:0.2,life:0.9,grow:1.2,alpha:0.45});}
// Jetskis an den Anlegern
function setupJetskis(){const spots=[POI.winterhafen,[POI.rathaus[0]+250,POI.rathaus[1]+50],POI.reduit,POI.zollhafen];let n=0;
  for(const p of spots){const w=waterSpotNear(p[0]+18,p[1]+18,260);if(!w)continue;if(CARS.some(c=>c.T.boat&&Math.hypot(c.x-w[0],c.z-w[1])<8))continue;const c=new Car('jetski',w[0],w[1],w[2],{ctrl:'none',color:mpick([0xffd400,0x1e88ff,0xff3355,0x22cc88])});if(c.collides()){c.remove();continue;}c.ai={mode:'docked'};c.persist=true;n++;}return n;}
