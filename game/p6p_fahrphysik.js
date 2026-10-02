// ===================== FAHRPHYSIK (Spielerfahrzeuge) =====================
// Spielergesteuerte Autos, Motorräder, Fahrräder und Gokarts fahren direkter: Lenkung mit schneller linearer Rampe statt
// träger Exponentialglättung, mehr Lenkwinkel bei Tempo, Gierraten-Hilfe (folgt dem Einschlag schnell, begrenzt auf die
// Haftung → kein Dreher ohne Handbremse), mehr Zug im mittleren Drehzahlbereich, kräftigere Bremse, Motorbremse.
// Handbremse lässt das Heck kommen (Drift), Motorräder legen sich physikalisch in die Kurve.
// KI-Fahrzeuge, Boote, Jetskis, Flugzeug und Hubschrauber laufen unverändert über Car.prototype.physStep (p3_actors.js).
// Touch: Joystick mit Totzone, leichter Kurve, Tempo-Lenkhilfe und Gas beim seitlichen Lenken.
const FP={on:true,
  // Grundwerte; je Klasse überschrieben. up/back: Lenkrampe 1/s (hin/zurück), maxS/fall: Lenkwinkel und Abnahme mit Tempo,
  // pow/force: Motorleistung/-kraft relativ zu p3 (Höchstgeschwindigkeit bleibt T.max), brk: Bremskraft, coast: Motorbremse m/s²,
  // yawK/yawLim: Gierraten-Hilfe (Rate, Anteil der Haftgrenze), latK: Querschlupf-Dämpfung, inertia: Gierträgheit,
  // hand: Hinterachs-Haftung mit Handbremse, handBeta: max. Driftwinkel (Grad), lean: Schräglage nach Querbeschleunigung
  BASE:{up:10,back:14,maxS:0.62,fall:0.022,pow:1.35,force:1.2,brk:1.12,coast:0.25,yawK:7,yawLim:1.0,latK:1.5,inertia:0.75,hand:0.38,handBeta:55,lean:0},
  CLS:{
    klein:{maxS:0.66,pow:1.4},
    sport:{pow:1.45,force:1.25,brk:1.2,yawK:8},
    schwer:{up:7,back:11,maxS:0.58,pow:1.25,brk:1.0,yawK:5,inertia:0.9},
    bus:{up:6,back:10,maxS:0.62,fall:0.03,pow:1.3,brk:1.0,yawK:4,inertia:1.0,hand:0.6,handBeta:25},
    motorrad:{up:12,back:16,maxS:0.55,fall:0.03,pow:1.3,brk:1.15,yawK:10,inertia:0.6,hand:0.55,handBeta:30,lean:1},
    rad:{up:11,back:16,maxS:0.6,fall:0.04,pow:1.5,force:1.4,brk:1.1,coast:0.3,yawK:10,inertia:0.6,hand:0.6,handBeta:25,lean:1},
    kart:{up:12,back:16,pow:1.0,force:1.0,brk:1.0,yawK:9,handBeta:35}},
  TOUCH:{dz:0.1,curve:1.4,hiV:30,hiCut:0.25,thr0:0.15,thrSpan:0.5,brk0:0.3,brkSpan:0.45,side:0.45},
  cache:{},stats:{steps:0,touch:0}};
function fpClass(T){if(T.kart)return 'kart';if(T.pedal)return 'rad';if(T.bike)return 'motorrad';if(T.bus||T.mass>=3)return 'bus';
  if(T.van||T.mass>=2)return 'schwer';if(T.max>=60)return 'sport';if(T.L<4)return 'klein';return '';}
function fpParams(T){const id=T.name;let p=FP.cache[id];if(!p){const k=fpClass(T);p=FP.cache[id]={...FP.BASE,...(FP.CLS[k]||{}),cls:k||'auto'};}return p;}
function fpActive(c){const T=c.T;return FP.on&&c.ctrl==='player'&&!T.boat&&!T.plane&&!T.hubi&&!c.dead&&!(c.burn>0);}

function fpStep(c,dt){
  const T=c.T,P=fpParams(T),inp=c.inp;FP.stats.steps++;
  const m=T.mass*1000,g=9.81,L=T.wb,a=L*0.5,b=L*0.5,hcg=T.bike?0.6:(T.H>2?0.9:0.5);const mu=(T.grip/8)*(1-0.3*(WEATHER?WEATHER.wet:0));
  let fx=Math.sin(c.h),fz=Math.cos(c.h),rx=-fz,rz=fx;
  let vF=c.vx*fx+c.vz*fz,vL=c.vx*rx+c.vz*rz;const sp=Math.hypot(vF,vL);
  const thr=inp.throttle||0,brk=inp.brake||0,hand=!!inp.hand;
  // Lenkung: lineare Rampe – hin in ~0.1 s, zurück noch schneller; Gegenlenken nutzt erst die Rückstellrate bis zur Mitte
  const ts=clamp(inp.steer||0,-1,1);const away=Math.abs(ts)>Math.abs(c.steer)&&(c.steer===0||Math.sign(ts)===Math.sign(c.steer));
  const r=(away?P.up:P.back)*dt;c.steer+=clamp(ts-c.steer,-r,r);
  const maxS=P.maxS/(1+Math.max(0,vF)*P.fall);const delta=c.steer*maxS;
  // Antrieb wie p3, aber mehr Leistung; kDrag aus der Leistung → Höchstgeschwindigkeit bleibt T.max
  const Pmax=T.acc*m*9*P.pow,Fmax=T.acc*m*1.15*P.force;const kDrag=Pmax/Math.pow(T.max,3);
  let Fx=0;const health=c.health<30?0.6:1;
  if(thr>0){if(vF>-0.5)Fx+=Math.min(Fmax,Pmax/Math.max(1,Math.abs(vF)))*thr*health;else Fx+=Fmax*1.4*thr;}
  if(brk>0){if(vF>0.5)Fx-=m*g*mu*0.95*P.brk*brk;else if(vF>-T.max*0.25&&thr===0)Fx-=Fmax*0.55*brk;}
  if(thr===0&&brk===0)Fx-=m*P.coast*Math.sign(vF)*Math.min(1,Math.abs(vF));
  Fx-=kDrag*vF*Math.abs(vF)+m*0.015*g*Math.sign(vF)*Math.min(1,Math.abs(vF));
  const ax=c.axPrev||0;const Nf=Math.max(0.15*m*g,m*g*b/L-m*ax*hcg/L),Nr=Math.max(0.15*m*g,m*g*a/L+m*ax*hcg/L);
  const tire=al=>Math.sin(1.55*Math.atan(9*al));
  // Driftwinkel über handBeta: Heck greift wieder voll (Motorrad/Rad/Kart drehen sich mit Handbremse nicht ein)
  const beta=Math.atan2(vL,Math.max(0.5,Math.abs(vF))),over=Math.abs(beta)>P.handBeta*Math.PI/180,slide=hand&&!over;
  let Ff=0,Fr=0;
  if(sp>1.5){const vLf=vL-c.yawRate*a,vLr=vL+c.yawRate*b;const av=Math.max(Math.abs(vF),1.5);
    const af=Math.atan2(vLf,av)+delta*Math.sign(vF||1),ar=Math.atan2(vLr,av);
    Ff=-mu*Nf*tire(af);Fr=-mu*Nr*tire(ar)*(slide?P.hand:1);
    const used=Math.min(0.95,Math.abs(Fx)/(mu*Nr+1));Fr*=Math.sqrt(1-used*used);
    if(hand&&vF>0)Fx-=m*g*mu*0.35;
    const I=m*a*b*1.1*P.inertia;const torque=-(a*Ff*Math.cos(delta)-b*Fr);c.yawRate+=torque/I*dt;
    c.yawRate*=Math.exp(-0.6*dt);
    // Gierraten-Hilfe: Ziel = Einspurmodell, begrenzt auf die Haftgrenze (µ·g/v) → folgt schnell, dreht sich nicht weg.
    // Mit Handbremse nur schwach (Heck darf kommen), aber nie über handBeta hinaus.
    const vA=Math.max(3,Math.abs(vF)),lim=mu*g*P.yawLim/vA;const tgt=clamp(vF/L*Math.tan(delta),-lim,lim);
    const k=slide?P.yawK*0.12:P.yawK;c.yawRate+=(tgt-c.yawRate)*Math.min(1,k*dt);}
  else{const target=vF/L*Math.tan(delta);c.yawRate+=(target-c.yawRate)*Math.min(1,dt*12);vL*=Math.exp(-8*dt);Ff=0;Fr=0;}
  const Fy=Ff*Math.cos(delta)+Fr;
  const axl=Fx/m,ayl=Fy/m;c.axPrev=lerp(c.axPrev||0,axl,0.3);c.ayVis=lerp(c.ayVis||0,ayl,0.2);
  if(sp<1.5){const vF2=vF+axl*dt;c.h+=c.yawRate*dt;fx=Math.sin(c.h);fz=Math.cos(c.h);rx=-fz;rz=fx;c.vx=fx*vF2;c.vz=fz*vF2;}
  else{c.vx+=(fx*axl+rx*ayl)*dt;c.vz+=(fz*axl+rz*ayl)*dt;c.h+=c.yawRate*dt;fx=Math.sin(c.h);fz=Math.cos(c.h);rx=-fz;rz=fx;}
  vF=c.vx*fx+c.vz*fz;vL=c.vx*rx+c.vz*rz;
  // Querschlupf abbauen (ohne Handbremse oder über handBeta) – rutscht nicht ewig nach, fängt sich nach dem Drift
  if((!hand||over)&&sp>1.5){vL*=Math.exp(-P.latK*dt);c.vx=fx*vF+rx*vL;c.vz=fz*vF+rz*vL;}
  c.speed=vF;c.lateral=vL;c.slip=Math.abs(vL)>2.5&&sp>6?Math.abs(vL):0;
  c.move(dt);}

const _fpPhysStep=Car.prototype.physStep;
Car.prototype.physStep=function(dt){if(!fpActive(this))return _fpPhysStep.call(this,dt);fpStep(this,dt);};

// Schräglage: Motorrad/Fahrrad des Spielers neigt sich nach der echten Querbeschleunigung (atan(v·ω/g)) in die Kurve
const _fpSync=Car.prototype.sync;
Car.prototype.sync=function(dt=0){_fpSync.call(this,dt);const T=this.T;if(!T.bike||T.boat||T.plane||this.stuntAir||this.stuntOn)return;
  if(this.ctrl!=='player'||!fpParams(T).lean){this.fpLean=undefined;return;}
  const tgt=clamp(-Math.atan(this.speed*this.yawRate/9.81),-0.75,0.75);this.fpLean=lerp(this.fpLean??this.lean??0,tgt,Math.min(1,dt*10));
  this.lean=this.fpLean;this.g.rotation.z=this.lean;};

// Touch-Joystick: Totzone + Kurve gegen Überlenken mit dem Daumen, bei Tempo etwas weniger Einschlag,
// Gas schon bei leicht nach oben gedrücktem Stick, beim reinen Seitwärtslenken bleibt etwas Gas stehen.
function fpTouchMap(mx,mz,speed){const K=FP.TOUCH;const s=-mx,as=Math.abs(s);
  let st=as<K.dz?0:Math.pow((as-K.dz)/(1-K.dz),K.curve)*Math.sign(s);
  st*=1-K.hiCut*clamp((Math.abs(speed)-8)/(K.hiV-8),0,1);
  let thr=clamp((mz-K.thr0)/K.thrSpan,0,1);const brk=clamp((-mz-K.brk0)/K.brkSpan,0,1);
  if(speed>2&&mz>-K.brk0&&Math.abs(mx)>0.35)thr=Math.max(thr,K.side*Math.min(1,Math.abs(mx)));
  return [st,thr,brk];}
const _fpVehicleInput=vehicleInput;
vehicleInput=function(P,I){_fpVehicleInput(P,I);const c=P.car;if(!c||P!==P1||!touch.active||!fpActive(c))return;
  const [st,thr,brk]=fpTouchMap(touch.mx,touch.mz,c.speed);const i=c.inp;i.steer=st;i.throttle=Math.max(thr,I.rt||0);i.brake=Math.max(brk,I.lt||0);FP.stats.touch++;};
