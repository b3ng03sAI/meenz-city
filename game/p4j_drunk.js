// ===================== MITTRINKEN & BETRUNKEN (GTA-Style) =====================
const DRUNK_HICK=['*hicks*','*hick*','Hicks!','*rülps* … ’tschuldigung','Isch bin net betrunke!','Wer hat de Bode so schief gemacht?','Ich lieb euch all!','Wo is mei Auto? … Wo bin ich?','*summt Fassenachtslied*','Noch eeeeiner!'];
let drunkHud=null;
function drinkPartner(P){const h=P.h;if(!h||P.car||h.room||P.gameOver||!MARKT.on)return null;let best=null,bd=2.6;
  for(const o of MARKT.people){if(!o.alive||o.removed||o.state!=='markt'||!o.mk||o.mk.arrive)continue;const d=Math.hypot(o.x-h.x,o.z-h.z);if(d<bd){bd=d;best=o;}}return best;}
function drinkAdd(P,amt=0.28){P.drunk=Math.min(1.75,(P.drunk||0)+amt);P.drinkAnim=1.6;chime([392]);
  const pm=(P.drunk*1.4).toFixed(1).replace('.',',');hint(P.drunk>1.3?`Hicks! ${pm} ‰ – du siehst Doppelte Dome.`:P.drunk>0.8?`Prost! ${pm} ‰ – alles dreht sich ein bisschen.`:`Prost! ${pm} ‰`,2.2,P);}
function drinkWith(P,o){if(!o)return;const vendor=o.mk.role==='vendor';
  if(vendor){if(G.money<4){say(o,'Vier Euro, Schatz. Ohne Geld kein Woi.',2.5);o.setExpr('disgust');return;}G.money-=4;say(o,mpick(['Bitteschön, en Schoppe!','Wohl bekomm’s!','Riesling, halbtrocken. Für dich.']),2.5);o.setExpr('smile');}
  else{const t=o.mk.table;const grp=MARKT.people.filter(q=>q.alive&&q.state==='markt'&&q.mk&&(q===o||t&&q.mk.table===t));for(const q of grp){q.mk.act='prost';q.mk.actT=1.6;q.setExpr('laugh');}
    say(o,mpick(['PROOOST! Auf dich!','Endlich mal einer, der mittrinkt!','Ex! Ex! Ex!','Zum Wohl, Fremder!','Auf Meenz!','Der hier is in Ordnung, Leute!']),2.4,'loud');marktSfx('clink',o);}
  const h=P.h;h.facing=Math.atan2(o.x-h.x,o.z-h.z);drinkAdd(P);}
function drunkInput(P,I,dt){const d=P.drunk||0;if(d<=0.02){P.dIx=I.mx;P.dIz=I.mz;P.dSteer=I.steer;return;}const t=simTime;
  if(P.stunT>0){P.stunT-=dt;I.mx=0;I.mz=0;I.sprint=false;I.jumpP=false;}
  // träge, verzögerte Steuerung
  const k=Math.min(1,dt*(12-Math.min(10,d*7)));P.dIx=lerp(P.dIx||0,I.mx,k);P.dIz=lerp(P.dIz||0,I.mz,k);
  let mx=P.dIx,mz=P.dIz;const a=Math.sin(t*0.83)*0.55*d+Math.sin(t*2.1+1)*0.2*d;const ca=Math.cos(a),sa=Math.sin(a);[mx,mz]=[mx*ca-mz*sa,mx*sa+mz*ca];
  // Torkler zur Seite
  P.lurchT=(P.lurchT??mr(2,5))-dt;if(P.lurchT<=0){P.lurchT=mr(2.5,6)/Math.max(0.4,d);P.lurch=[mpick([-1,1])*mr(0.5,1)*Math.min(1,d),mr(0.35,0.7)];}
  if(P.lurch&&P.lurch[1]>0){P.lurch[1]-=dt;mx+=P.lurch[0];if(Math.hypot(I.mx,I.mz)<0.1&&d<0.5)mx-=P.lurch[0]*0.6;}
  const L=Math.hypot(mx,mz);if(L>1){mx/=L;mz/=L;}I.mx=mx;I.mz=mz;
  // Sprinten im Suff → Stolpern
  if(I.sprint&&d>0.6&&Math.hypot(I.mx,I.mz)>0.3&&Math.random()<dt*0.35*d&&!P.car&&!(P.stunT>0)){P.stunT=1.1;P.cam.shake=0.35;if(P.h)say(P.h,mpick(['Hoppla!','Uiii–','Wer hat da ’ne Stufe hingebaut?!','*stolper*']),1.8);noiseHit&&noiseHit(0.25,0.08,180);}
  if(d>0.9&&Math.random()<dt*0.25)I.sprint=false;
  // Auto: Lenkung schwammig, zieht zur Seite
  if(P.car){P.dSteer=lerp(P.dSteer||0,I.steer,Math.min(1,dt*(9-Math.min(7,d*5))));I.steer=clamp(P.dSteer+Math.sin(t*1.25)*0.32*d+Math.sin(t*3.7)*0.1*d,-1,1);if(Math.random()<dt*0.2*d)I.throttle=Math.max(I.throttle,0.6);}
  // Kamera driftet
  if(!P.talk)P.cam.yaw+=Math.sin(t*0.61)*0.22*d*dt;}
function drunkPose(P){if(!(P.drinkAnim>0)||!P.h||P.car)return;const h=P.h;const k=Math.min(1,P.drinkAnim*2,(1.6-P.drinkAnim)*4);h.armR.rotation.x=-1.05*k;h.armR.rotation.z=-0.06-0.75*k;h.hips.rotation.x=-0.12*k;}
function blackout(P){const h=P.h;if(P.car)exitCar(P,true);const s=landSpotNear(330,-200,140)||landSpotNear(150,-150,200)||[POI.start[0],POI.start[1]];h.x=s[0];h.z=s[1];h.y=groundY(h.x,h.z);P.vy=0;P.cam.init=false;
  const lost=Math.min(G.money,Math.round(mr(20,90)));G.money-=lost;gameMin=(gameMin+180)%1440;envDirty=true;P.drunk=0.35;P.stunT=1.5;
  showBig('FILMRISS','fail',3.5,lost?`Du wachst am Rheinufer auf. €${lost} sind weg. Dein Kopf brummt.`:'Du wachst am Rheinufer auf. Dein Kopf brummt.');
  BLACK_T=3;const el=renderer.domElement;el.style.transition='none';el.style.filter='brightness(0)';setTimeout(()=>{el.style.transition='filter 2.5s';el.style.filter='';},400);setTimeout(()=>{el.style.transition='';},3000);}
let BLACK_T=0;
function updateDrunk(dt){if(!drunkHud){drunkHud=document.createElement('div');drunkHud.id='drunkhud';drunkHud.style.cssText='position:fixed;left:50%;bottom:86px;transform:translateX(-50%);padding:4px 12px;border-radius:14px;background:rgba(90,20,40,0.78);color:#ffe3ea;font:700 15px "Barlow Condensed",sans-serif;letter-spacing:.04em;pointer-events:none;z-index:6;display:none';document.body.appendChild(drunkHud);}
  let maxD=0;
  for(const P of PLAYERS){if(!P.h)continue;const d=P.drunk||0;if(P.drinkAnim>0){P.drinkAnim-=dt;drunkPose(P);}
    if(d>0){P.drunk=Math.max(0,d-dt*0.0075);if(d>=1.7&&!P.gameOver){blackout(P);continue;}
      P.hickT=(P.hickT??mr(4,9))-dt;if(P.hickT<=0){P.hickT=mr(5,12)/Math.max(0.5,d);if(!P.car&&!P.h.room)say(P.h,mpick(DRUNK_HICK),2,'quiet');talkBlip&&talkBlip(260);}}
    maxD=Math.max(maxD,P.drunk||0);}
  const el=renderer.domElement;if(BLACK_T>0)BLACK_T-=dt;else{const tf=tripFilter();el.style.filter=((maxD>0.12&&mode==='play'?`blur(${(maxD*1.1).toFixed(2)}px) saturate(${(1+maxD*0.45).toFixed(2)}) hue-rotate(${(Math.sin(simTime*0.4)*maxD*12).toFixed(1)}deg)`:'')+' '+tf).trim();}
  if(maxD>0.05){drunkHud.style.display='';drunkHud.textContent='🍷 '+(maxD*1.4).toFixed(1).replace('.',',')+' ‰'+(maxD>1.3?' – kurz vorm Filmriss!':maxD>0.8?' – sternhagelvoll':maxD>0.4?' – angeheitert':'');}else drunkHud.style.display='none';
  const P=P1;if(!TALK&&P.h&&!P.car){P._drT=(P._drT||0)-dt;if(P._drT<=0){P._drT=0.7;const o=drinkPartner(P);if(o)hint(`<b>G</b>: ${o.mk.role==='vendor'?'Schoppe kaufen (€4)':'mittrinken'} · <b>E</b>: ansprechen`,0.9,P);}}}
addEventListener('keydown',e=>{if(mode!=='play'||TALK||SHOP_UI.open)return;if(e.code==='KeyG'){const o=drinkPartner(P1);if(o)drinkWith(P1,o);else if(P1.h&&!P1.car&&MARKT.on===false&&brezelNear&&brezelNear(P1))hint('Erst den Brezel-Schalter drücken (E) – dann gibt’s was zu trinken!',2,P1);}});
