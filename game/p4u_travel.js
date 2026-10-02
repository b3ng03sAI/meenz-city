// ===================== SCHNELLREISE ÜBER DIE KARTE =====================
const FT={list:null,hits:[],sel:null,panel:null,down:null};
function ftDestinations(){if(FT.list)return FT.list;venueNear(0,0);const L=[];const add=(n,g,x,z)=>{if(x<MINX+20||x>MINX+WW-20||z<MINZ+20||z>MINZ+WH-20)return;if(L.some(d=>Math.hypot(d.x-x,d.z-z)<120))return;L.push({n,g,x,z});};
  const door=id=>{const v=VENUES.find(v=>v.id===id);return v&&v.door;};const pl=k=>(OSM.pl&&OSM.pl[k])||null;
  const fixed=[['Dom & Marktplatz','Altstadt',POI.markt],['Hauptbahnhof','Neustadt/Hbf',door('hbf')],['Rheinufer am Rathaus','Altstadt',pl('rathaus')?[pl('rathaus')[0]+60,pl('rathaus')[1]]:null],['Christuskirche','Neustadt',door('christus')],['Kurfürstliches Schloss','Altstadt',pl('schloss')],['Zitadelle','Oberstadt',POI.zitadelle||[60,660]],['Malakoff-Passage','Altstadt',door('malakoff')],['Staatstheater & Höfchen','Altstadt',pl('theater')],['Römisches Theater','Altstadt',pl('rtheater')],['Theodor-Heuss-Brücke','Rhein',BRIDGES[0]?[BRIDGES[0].A[0],BRIDGES[0].A[1]]:null],['Holzturm','Altstadt',pl('holzturm')],['Polizeiinspektion','Altstadt',POI.polizei]];
  for(const [n,g,p] of fixed)if(p)add(n,g,p[0],p[1]);
  for(const B of BRIDGES.slice(1))if(B.name)add(B.name,'Rhein',B.A[0]-(B.B[0]-B.A[0])/B.L*25,B.A[1]-(B.B[1]-B.A[1])/B.L*25);
  for(const P of PLACES)add(P.name,P.kind==='suburb'||P.kind==='town'||P.kind==='village'?'Stadtteil':'Viertel',P.x,P.z);
  return FT.list=L.concat(ftSpecials());}
function ftSpecials(){const S=[];const sp=(n,x,z,y,face)=>S.push({n,g:'Besondere Orte',x,z,y,face,special:true});
  try{if(typeof BREZEL!=='undefined'){if(!BREZEL.grp)buildBrezel();sp('Brezel-Schalter (Marktfrühstück)',BREZEL.x+Math.sin(BREZEL.grp.rotation.y)*1.6,BREZEL.z+Math.cos(BREZEL.grp.rotation.y)*1.6);}}catch(e){}
  for(const id of ['dom','christus','malakoff','hbf']){const v=VENUES.find(v=>v.id===id);if(v&&v.door)sp((id==='hbf'?'Hauptbahnhof':v.name)+' – Eingang',v.door[0]+Math.sin(v.door[2])*1.5,v.door[1]+Math.cos(v.door[2])*1.5);}
  try{buildHbf();for(const pl of HBF.plats)if(pl.stair){const [x,z,hd]=pl.stair;sp('Hbf – Bahnsteig Gleis '+pl.n.replace('/',' / '),x+Math.sin(hd)*3.4,z+Math.cos(hd)*3.4,PLAT_H);}}catch(e){}
  try{buildRhein();(RHEIN.stairs||[]).forEach((s,i)=>sp('Rheintreppe '+(i+1),s.bx+s.lx*15,s.bz+s.lz*15));}catch(e){}
  try{const names={grill:'Dach-Grillparty',sonne:'Sonnenanbeter-Dach',tauben:'Dach des Taubenkönigs',yoga:'Dach-Yoga',alu:'Alu-Hut-Dach',sofa:'Dach-Sofa',zwerge:'Gartenzwerg-Dach',tuba:'Tuba-Dach',wanne:'Badewannen-Dach',golf:'Dach-Minigolf'};const used=new Set();
    const L=roofCandidates().filter(b=>b.roofHash<28).sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z));for(const b of L){const key=SCENE_KEYS[b.roofHash%SCENE_KEYS.length];if(used.has(key))continue;if(!roofFlat(b.x,b.z,b.roofV,Math.ceil(ROOF_SCENES[key].w/2)))continue;used.add(key);sp(names[key]||key,b.x+3.2,b.z+3.2,b.roofV+0.05);}}catch(e){}
  {const p=eggW([-4,-22]);sp('Grillparzerstraße',p[0],p[1]);}
  try{flugBuild();const p=POI.flugplatz;sp('Flugplatz Großer Sand',p[0],p[1]);}catch(e){}
  return S;}
function ftSpot(d,car){if(car){const s=roadSpot(d.x,d.z);if(s&&!blocked(s[0],s[1]))return s;}const [x,z]=freeSpot(d.x,d.z,0.6);return [x,z,0];}
function fastTravel(d){const P=P1;if(!P.h||P.gameOver)return;if(wanted>0){ftMsg('Nicht während einer Fahndung! Erst die Polizei abhängen.');return;}if(P.h.room){ftMsg('Erst nach draußen gehen.');return;}if(TALK)endTalk();
  const c=P.car;if(c&&d.special){ftMsg('Besondere Orte gehen nur zu Fuß – erst aussteigen.');return;}const s=d.special?[d.x,d.z,d.face||0]:ftSpot(d,!!c&&!c.T.boat);if(c&&c.T.boat){ftMsg('Mit dem Boot geht keine Schnellreise.');return;}
  closeMap();const el=renderer.domElement;el.style.transition='filter .35s';el.style.filter='brightness(0)';
  setTimeout(()=>{if(c){c.x=s[0];c.z=s[1];c.h=s[2]||0;c.vx=c.vz=0;c.speed=0;c.y=groundY(c.x,c.z);c.sync&&c.sync(0);}else{const h=P.h;h.x=s[0];h.z=s[1];h.y=d.y!==undefined?d.y:groundY(h.x,h.z);P.vy=0;h.sync();}
    if(P2&&P2.h&&G.split){const h2=P2.h;if(!P2.car){h2.x=s[0]+2;h2.z=s[1];h2.y=groundY(h2.x,h2.z);}}
    P.cam.init=false;gameMin=(gameMin+10)%1440;envDirty=true;lampAssignT=0;updateCityLOD(0,0,99,true,[[s[0],s[1]]]);updateGround(0,0,true,99,[[s[0],s[1]]]);managePopulation(0,true);
    showBig(d.n.toUpperCase(),'mission',2.2,'Schnellreise · '+d.g);el.style.filter='';setTimeout(()=>{el.style.transition='';},400);},380);}
function ftMsg(t){const p=FT.panel;if(!p)return;const m=p.querySelector('.ftmsg');m.textContent=t;m.style.display='';clearTimeout(m._t);m._t=setTimeout(()=>{m.style.display='none';},3500);}
function ftPanel(){if(FT.panel)return FT.panel;const p=document.createElement('div');p.id='ftpanel';p.style.cssText='position:absolute;left:12px;top:86px;bottom:60px;width:min(260px,44vw);overflow:auto;background:rgba(12,16,20,.86);border-radius:10px;padding:10px 10px 12px;color:#eee;font:500 14px "Barlow Condensed",sans-serif;z-index:3;box-shadow:0 6px 24px rgba(0,0,0,.4)';
  $('map').appendChild(p);FT.panel=p;ftRenderPanel();return p;}
function ftRenderPanel(){const p=FT.panel;const L=ftDestinations();const groups={};for(const d of L)(groups[d.g]=groups[d.g]||[]).push(d);
  let html='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><b style="font-size:18px;letter-spacing:.04em">Schnellreise</b><span style="opacity:.6;font-size:12px">Ort wählen oder Marker anklicken</span></div><div class="ftmsg" style="display:none;background:#7a1a1a;padding:6px 8px;border-radius:6px;margin-bottom:6px"></div>';
  for(const g of Object.keys(groups).sort((a,b)=>(b==='Besondere Orte')-(a==='Besondere Orte')||(a==='Stadtteil')-(b==='Stadtteil')||a.localeCompare(b))){html+=`<div style="margin:8px 0 3px;color:#ffd23f;font-size:12px;letter-spacing:.08em;text-transform:uppercase">${g}</div>`;
    for(const d of groups[g].sort((a,b)=>a.n.localeCompare(b.n))){const i=L.indexOf(d);html+=`<button data-ft="${i}" style="display:block;width:100%;text-align:left;margin:2px 0;padding:5px 8px;border-radius:6px;border:1px solid #333c45;background:${FT.sel===d?'#2a6f97':'#1c242c'};color:#fff;font:600 14px 'Barlow Condensed',sans-serif;cursor:pointer">➜ ${d.n}</button>`;}}
  if(FT.sel)html=`<div style="position:sticky;top:-10px;background:#16326e;margin:-10px -10px 8px;padding:10px;border-radius:10px 10px 0 0"><div style="font-size:13px;opacity:.8">Reisen nach</div><div style="font:700 19px 'Barlow Condensed'">${FT.sel.n}</div><div style="display:flex;gap:6px;margin-top:6px"><button id="ftgo" style="flex:1;padding:6px;border-radius:6px;border:0;background:#ffd23f;font:700 15px 'Barlow Condensed';cursor:pointer">Losfahren</button><button id="ftno" style="padding:6px 10px;border-radius:6px;border:0;background:#444;color:#fff;font:600 15px 'Barlow Condensed';cursor:pointer">Abbrechen</button></div></div>`+html;
  p.innerHTML=html;p.querySelectorAll('[data-ft]').forEach(b=>b.addEventListener('click',()=>{const d=L[+b.dataset.ft];FT.sel=d;MAPV.cx=d.x;MAPV.cz=d.z;MAPV.s=Math.max(MAPV.s,0.9);ftRenderPanel();drawBigMap();}));
  const go=p.querySelector('#ftgo');if(go)go.onclick=()=>{const d=FT.sel;FT.sel=null;ftRenderPanel();fastTravel(d);};const no=p.querySelector('#ftno');if(no)no.onclick=()=>{FT.sel=null;ftRenderPanel();drawBigMap();};}
// Marker auf der großen Karte (wird nach drawBigMap gezeichnet)
function ftDrawMarkers(){const c=$('mapc');const g=c.getContext('2d');const W=c.clientWidth,H=c.clientHeight;const s=MAPV.s;const ox=W/2-(MAPV.cx-MINX)*s,oz=H/2-(MAPV.cz-MINZ)*s;FT.hits=[];
  g.save();g.setTransform(Math.min(2,window.devicePixelRatio||1),0,0,Math.min(2,window.devicePixelRatio||1),0,0);
  for(const d of ftDestinations()){const x=ox+(d.x-MINX)*s,y=oz+(d.z-MINZ)*s;if(x<-20||y<-20||x>W+20||y>H+20)continue;const sel=FT.sel===d;g.fillStyle=sel?'#ffd23f':d.special?'#ff7a3d':'#2a9df4';g.strokeStyle='#0b1f4d';g.lineWidth=2;
    g.beginPath();g.moveTo(x,y-14);g.lineTo(x+8,y-4);g.lineTo(x,y+2);g.lineTo(x-8,y-4);g.closePath();g.fill();g.stroke();if(sel||s>0.35){g.font='700 12px "Barlow Condensed",sans-serif';g.textAlign='center';g.lineWidth=3;g.strokeStyle='rgba(10,14,18,.85)';g.strokeText(d.n,x,y+14);g.fillStyle=sel?'#ffd23f':'#cfe8ff';g.fillText(d.n,x,y+14);}FT.hits.push([x,y-5,d]);}
  g.restore();}
function ftHooks(){if(FT.hooked)return;FT.hooked=true;const c=$('mapc');c.addEventListener('pointerdown',e=>{FT.down=[e.clientX,e.clientY];});
  c.addEventListener('pointerup',e=>{if(!FT.down)return;const moved=Math.hypot(e.clientX-FT.down[0],e.clientY-FT.down[1]);FT.down=null;if(moved>6)return;const r=c.getBoundingClientRect();const mx=e.clientX-r.left,my=e.clientY-r.top;let best=null,bd=16;for(const [x,y,d] of FT.hits){const dd=Math.hypot(x-mx,y-my);if(dd<bd){bd=dd;best=d;}}if(best){FT.sel=best;ftRenderPanel();drawBigMap();}});}
