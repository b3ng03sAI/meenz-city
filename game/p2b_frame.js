// ===================== Bild-Budget für zerlegte Bauarbeiten (Welle 10, zentral) =====================
// Vertrag: .claude/plans/2026-10-03-welle-10.md. Alle Arbeiten, die im Spiel nachgebaut oder freigegeben werden
// (Straßen-/Boden-/Baum-Kacheln, HG-Packen, Gebäude-Chunks, Bodenkacheln, Lazy-Stadtteile), laufen als Arbeitspakete
// durch EINE Warteschlange. fbPump() arbeitet sie am Ende von update() nach Priorität ab, bis das Budget je Bild
// verbraucht ist (Handy 4 ms, Desktop 6 ms; mindestens ein Paket je Bild, damit es immer vorangeht).
// Unter window.__MANUAL (Tests) zählt statt Millisekunden eine feste Paketzahl → gleiche Läufe, gleiche Reihenfolge.
//
//   fbJob(key, step, {x,z,bias,prio})  Paket anmelden (gleicher key → nur Ort/Priorität aktualisieren, Fortschritt bleibt).
//                                      step() führt einen Schritt aus und gibt true zurück, wenn das Paket fertig ist
//                                      (false/undefined → bleibt in der Schlange, nächster Schritt in einem späteren Bild).
//                                      Priorität: mit x/z = fbDist(x,z)+bias (nächster Spieler/Vorausschau zuerst), sonst prio.
//   fbCancel(key) · fbHas(key) · fbFlush(pred) (alle passenden Pakete jetzt synchron fertig machen, z. B. nach Teleport)
//   fbDist(x,z)   Abstand zur Kapsel Spieler → Vorausschau-Punkt (nächster Spieler); FRAMEB.jump: Sprung > 250 m in diesem Bild.
// Pakete ziehen nie aus dem globalen Math.random (eigener Strom, Muster gonsRng) und sollen einzeln < 10 ms (Handy) bleiben.
const FRAMEB={ms:LOWMEM?4:6,manualJobs:4,jobs:new Map(),pts:[],prev:[],jump:false,jumps:0,
  timing:{last:0,max:0,n:0,hist:new Float32Array(600),hi:0,jobsLast:0,slowest:'',slowestMs:0,syncLast:0,syncMax:0},
  stats:{added:0,steps:0,done:0,cancelled:0,flushed:0}};
function fbAir(P){const y=P.car?P.car.y:P.h?P.h.y:0;return y>30;}
// Spieler- und Vorausschau-Punkte dieses Bilds (nach updatePlayer aufrufen)
function fbBegin(dt){const F=FRAMEB;F.pts.length=0;F.jump=false;
  PLAYERS.forEach((P,i)=>{if(!P.h)return;const p=ppos(P);let q=F.prev[i];
    if(!q){q=F.prev[i]={x:p[0],z:p[1],vx:0,vz:0};F.jump=true;}
    else if(Math.hypot(p[0]-q.x,p[1]-q.z)>250){F.jump=true;q.vx=q.vz=0;}
    else if(Math.hypot(p[0]-q.x,p[1]-q.z)>60){q.vx=q.vz=0;}// kleiner Versatz (Test-Teleport, Respawn): keine Fantasie-Geschwindigkeit
    else if(dt>0){const k=Math.min(1,dt*4);q.vx+=((p[0]-q.x)/dt-q.vx)*k;q.vz+=((p[1]-q.z)/dt-q.vz)*k;
      const v=Math.hypot(q.vx,q.vz);if(v>150){q.vx*=150/v;q.vz*=150/v;}}
    q.x=p[0];q.z=p[1];const T=fbAir(P)?6:3;F.pts.push({x:p[0],z:p[1],ax:p[0]+q.vx*T,az:p[1]+q.vz*T});});
  if(F.jump)F.jumps++;}
function fbDist(x,z){const P=FRAMEB.pts;if(!P.length)return 1e9;let best=1e9;
  for(const p of P){const dx=p.ax-p.x,dz=p.az-p.z,L2=dx*dx+dz*dz;let t=L2>0?((x-p.x)*dx+(z-p.z)*dz)/L2:0;t=t<0?0:t>1?1:t;
    const d=Math.hypot(x-p.x-dx*t,z-p.z-dz*t);if(d<best)best=d;}
  return best;}
function fbJob(key,step,o={}){const F=FRAMEB;let J=F.jobs.get(key);
  if(!J){J={key,step,x:undefined,z:undefined,bias:0,prio:0,steps:0,ms:0};F.jobs.set(key,J);F.stats.added++;}
  if(o.x!==undefined){J.x=o.x;J.z=o.z;}if(o.bias!==undefined)J.bias=o.bias;if(o.prio!==undefined)J.prio=o.prio;
  return J;}
function fbHas(key){return FRAMEB.jobs.has(key);}
function fbCancel(key){if(FRAMEB.jobs.delete(key))FRAMEB.stats.cancelled++;}
function fbPrio(J){return J.x!==undefined?fbDist(J.x,J.z)+J.bias:J.prio;}
function fbStep(J){const F=FRAMEB,t=performance.now();let done;
  try{done=J.step();}catch(e){F.jobs.delete(J.key);throw e;}
  const d=performance.now()-t;J.steps++;J.ms+=d;F.stats.steps++;
  if(d>F.timing.slowestMs){F.timing.slowestMs=d;F.timing.slowest=J.key;}
  if(done){F.jobs.delete(J.key);F.stats.done++;}
  return done;}
// Am Ende von update(): Pakete nach Priorität im Budget abarbeiten
function fbPump(){const F=FRAMEB,T=F.timing;let n=0;const t0=performance.now();
  if(F.jobs.size){const list=[...F.jobs.values()];for(const J of list)J._p=fbPrio(J);list.sort((a,b)=>a._p-b._p);
    for(const J of list){if(window.__MANUAL?n>=F.manualJobs:(n>0&&performance.now()-t0>=F.ms))break;
      if(!F.jobs.has(J.key))continue;n++;fbStep(J);}}
  const d=performance.now()-t0;T.last=d;T.jobsLast=n;if(d>T.max)T.max=d;T.hist[T.hi]=d;T.hi=(T.hi+1)%T.hist.length;if(T.n<T.hist.length)T.n++;}
// Synchron fertig machen (Sprung-Kern nach Teleport/Schnellreise, Notfall bei Unterschreiten eines Radius)
function fbFlush(pred){const F=FRAMEB,t0=performance.now();let n=0;
  for(const J of [...F.jobs.values()]){if(!pred(J))continue;let k=0;while(F.jobs.has(J.key)&&!fbStep(J)&&++k<100000){}n++;}
  if(n){F.stats.flushed+=n;const d=performance.now()-t0;F.timing.syncLast=d;if(d>F.timing.syncMax)F.timing.syncMax=d;}
  return n;}
function fbP95(){const T=FRAMEB.timing;if(!T.n)return 0;const a=Array.from(T.hist.subarray(0,T.n)).sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor(a.length*0.95))];}
