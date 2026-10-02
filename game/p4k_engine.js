// ===================== MOTORSOUND (Zündimpuls-Synthese mit Drehzahl- und Gangmodell) =====================
const ENG_F0=50; // Zündfrequenz des Puffers bei playbackRate 1
const ENG_PROF={
  std:{cyl:4,idle:820,red:6300,gears:[9,16,24,32,42,56],lp:520,vol:0.2,tau:0.0065,res:2.6,noise:0.35,click:0,bright:1},
  sport:{cyl:6,idle:950,red:7800,gears:[12,22,32,43,55,72],lp:900,vol:0.24,tau:0.0045,res:3.4,noise:0.3,click:0,bright:1.5,pops:true},
  diesel:{cyl:4,idle:760,red:4300,gears:[7,13,20,28,37],lp:420,vol:0.22,tau:0.009,res:2.0,noise:0.45,click:0.5,bright:0.8},
  bus:{cyl:6,idle:600,red:2500,gears:[5,10,16,23],lp:300,vol:0.26,tau:0.012,res:1.6,noise:0.5,click:0.6,bright:0.6,hiss:true},
  bike:{cyl:2,idle:1250,red:9800,gears:[8,15,23,32,42,56],lp:1300,vol:0.2,tau:0.004,res:3.8,noise:0.45,click:0,bright:2},
  boat:{cyl:4,idle:900,red:5600,gears:null,lp:480,vol:0.2,tau:0.007,res:2.2,noise:0.5,click:0,bright:0.9,water:true}};
function engProfile(c){const k=c.id||'';if(c.T.boat)return 'boat';if(c.T.bike)return 'bike';if(/bus/.test(k)||/bus/i.test(c.T.name))return 'bus';if(/transporter/.test(k)||/Transporter/.test(c.T.name))return 'diesel';if(/sport/.test(k)||/Sport/.test(c.T.name))return 'sport';return 'std';}
const ENG_BUF={};
function engBuffer(ctx,key){if(ENG_BUF[key])return ENG_BUF[key];const p=ENG_PROF[key];const N=16,sr=ctx.sampleRate,len=Math.round(sr*N/ENG_F0);const buf=ctx.createBuffer(1,len,sr);const d=buf.getChannelData(0);const R=mulberry32(77+key.length*13);
  const per=len/N;let lp=0;
  for(let i=0;i<N;i++){const amp=1+(R()-0.5)*0.3,start=Math.round(i*per+(R()-0.5)*per*0.04);const tl=Math.round(sr*p.tau*7);const f1=ENG_F0*p.res*(1+(R()-0.5)*0.08);
    for(let j=0;j<tl;j++){const t=j/sr;const env=Math.exp(-t/p.tau);const n=R()*2-1;lp+=(n-lp)*0.25;
      let v=env*(Math.sin(2*Math.PI*f1*t)*0.7+Math.sin(2*Math.PI*f1*2.03*t)*0.18*p.bright+lp*p.noise);
      if(p.click&&j<sr*0.0012)v+=(R()*2-1)*p.click*(1-j/(sr*0.0012));
      d[(start+j)%len]+=v*amp;}}
  // Grundbrummen (Kurbelwelle) beimischen + normalisieren
  for(let i=0;i<len;i++)d[i]+=Math.sin(2*Math.PI*ENG_F0*0.5*i/sr)*0.12;
  let m=0;for(let i=0;i<len;i++)m=Math.max(m,Math.abs(d[i]));for(let i=0;i<len;i++)d[i]/=m*1.05;ENG_BUF[key]=buf;return buf;}
function engShaper(ctx){const n=1024,c=new Float32Array(n);for(let i=0;i<n;i++){const x=i/(n-1)*2-1;c[i]=Math.tanh(x*1.8)/Math.tanh(1.8);}const w=ctx.createWaveShaper();w.curve=c;w.oversample='2x';return w;}
const ENGINES=[];
function makeEngine(ctx,key){const p=ENG_PROF[key];const E={key,p,rpm:p.idle,gear:1,shiftT:0,lastThr:0,popT:0};
  const src=E.src=ctx.createBufferSource();src.buffer=engBuffer(ctx,key);src.loop=true;
  const sh=engShaper(ctx);const lp=E.lp=ctx.createBiquadFilter();lp.type='lowpass';lp.Q.value=0.9;const body=E.body=ctx.createBiquadFilter();body.type='peaking';body.frequency.value=120;body.gain.value=5;body.Q.value=0.8;
  const g=E.gain=ctx.createGain();g.gain.value=0;src.connect(sh);sh.connect(lp);lp.connect(body);body.connect(g);g.connect(AUD.master);
  // Ansauggeräusch
  const ns=ctx.createBufferSource();ns.buffer=AUD.noise;ns.loop=true;const nb=E.nb=ctx.createBiquadFilter();nb.type='bandpass';nb.Q.value=1.4;const ng=E.ng=ctx.createGain();ng.gain.value=0;ns.connect(nb);nb.connect(ng);ng.connect(g);
  // Wasserrauschen (Boot)
  if(p.water){const ws=ctx.createBufferSource();ws.buffer=AUD.noise;ws.loop=true;const wf=ctx.createBiquadFilter();wf.type='lowpass';wf.frequency.value=900;const wg=E.wg=ctx.createGain();wg.gain.value=0;ws.connect(wf);wf.connect(wg);wg.connect(AUD.master);ws.start(0,Math.random());}
  src.start(0,Math.random());ns.start(0,Math.random());return E;}
function engStop(E){try{E.gain.gain.setTargetAtTime(0,AUD.ctx.currentTime,0.05);if(E.wg)E.wg.gain.setTargetAtTime(0,AUD.ctx.currentTime,0.1);}catch(e){}}
function engPop(E,vol){const ctx=AUD.ctx;const t=ctx.currentTime+Math.random()*0.15;const s=ctx.createBufferSource();s.buffer=AUD.noise;const f=ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=mr(400,900);f.Q.value=1.5;const g=ctx.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.004);g.gain.exponentialRampToValueAtTime(0.0001,t+0.07);s.connect(f);f.connect(g);g.connect(AUD.master);s.start(t,Math.random());s.stop(t+0.1);}
function engHiss(vol){const ctx=AUD.ctx;const t=ctx.currentTime;const s=ctx.createBufferSource();s.buffer=AUD.noise;const f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=2500;const g=ctx.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.9);s.connect(f);f.connect(g);g.connect(AUD.master);s.start(t,Math.random());s.stop(t+1);}
let engLastT=0;
function updateEngines(){const ctx=AUD.ctx;if(!ctx)return;const t=ctx.currentTime;const dt=clamp(t-engLastT,0.001,0.1);engLastT=t;
  PLAYERS.forEach((P,i)=>{const c=P.car;let E=ENGINES[i];
    if(!c||c.T.pedal||P.gameOver||c.dead||mode!=='play'&&mode!=='map'){if(E){engStop(E);E.active=false;}return;}
    const key=engProfile(c);if(!E||E.key!==key){if(E){engStop(E);try{E.src.stop();}catch(e){}}E=ENGINES[i]=makeEngine(ctx,key);E.rpm=E.p.idle;}E.active=true;const p=E.p;
    const sp=Math.abs(c.speed||0),thr=clamp(c.inp.throttle||0,0,1),brk=c.inp.brake||0;const mul=G.split?0.7:1;let target;
    if(!p.gears){target=p.idle+thr*(p.red-p.idle)*0.85+sp*25;E.gear=1;}
    else{const gs=p.gears;let g=E.gear;
      if(g<gs.length&&sp>gs[g-1]*0.94){g++;E.shiftT=0.16;}else if(g>1&&sp<(gs[g-2]||0)*0.62){g--;E.shiftT=0.1;}E.gear=g;
      const lo=g>1?gs[g-2]*0.55:0,hi=gs[g-1];const wheel=p.idle+clamp((sp-lo)/(hi-lo),0,1.08)*(p.red-p.idle)*(g>1?0.82:1)+(g>1?(p.red-p.idle)*0.18*clamp((sp-lo)/(hi-lo),0,1):0);
      const clutch=sp<3?p.idle+thr*(p.red*0.45-p.idle):0;target=Math.max(wheel,clutch);if(c.speed<-0.5)target=p.idle+clamp(sp/gs[0],0,1)*(p.red-p.idle)*0.7;}
    if(E.shiftT>0){E.shiftT-=dt;target*=0.72;}
    E.rpm+=(target-E.rpm)*Math.min(1,dt*(thr>0.1?7:3.5));E.rpm=clamp(E.rpm,p.idle*0.9,p.red*1.02);
    const fire=E.rpm/60*p.cyl/2;E.src.playbackRate.setTargetAtTime(fire/ENG_F0,t,0.03);
    const rn=(E.rpm-p.idle)/(p.red-p.idle);const load=E.shiftT>0?0.15:thr;
    E.lp.frequency.setTargetAtTime(p.lp*(0.55+0.9*load)+E.rpm*0.22*p.bright,t,0.05);
    E.gain.gain.setTargetAtTime(p.vol*mul*(0.5+0.4*load+0.25*rn)*(E.shiftT>0?0.7:1),t,0.04);
    E.nb.frequency.setTargetAtTime(250+E.rpm*0.18,t,0.05);E.ng.gain.setTargetAtTime(0.35*load*(0.3+rn),t,0.05);
    if(E.wg)E.wg.gain.setTargetAtTime(mul*clamp(sp/18,0,1)*0.09,t,0.2);
    // Fehlzündungen beim Gaswegnehmen (Sportwagen/Motorrad)
    if((p.pops||key==='bike')&&E.lastThr>0.6&&thr<0.1&&rn>0.55)E.popT=0.5;
    if(E.popT>0){E.popT-=dt;if(Math.random()<dt*14)engPop(E,0.1*mul);}
    if(p.hiss&&E.lastSp>2&&sp<0.4&&brk>0)engHiss(0.08*mul);E.lastSp=sp;
    E.lastThr=thr;});
  for(let i=PLAYERS.length;i<ENGINES.length;i++)if(ENGINES[i])engStop(ENGINES[i]);}
