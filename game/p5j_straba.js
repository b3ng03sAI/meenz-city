// ===================== 25 STRASSENBAHN MITFAHREN + SCHWARZFAHREN =====================
// Linien entstehen aus den r.tram-Gleisen (RAILS): Gleisgraph mit Abbiegeverbot an spitzen Winkeln, je Linie eine Hin- und
// eine Rückfahrt (möglichst auf dem Parallelgleis), Haltestellen = Bushalte-Punkte nahe am Gleis. Bahnen fahren nach Fahrplan,
// halten, öffnen die Türen; F steigt ein/aus, B kauft an der Haltestelle einen Fahrschein. Ohne Fahrschein kommt manchmal ein
// (fiktiver) Kontrolleur: 60 € zahlen (B) oder an der nächsten Haltestelle abhauen (1 Stern).
// Wiederverwendbar (Paket 30, S-Bahn): strabaTicketValid(), strabaBuyTicket(P), strabaControl(P,opts), strabaControlPay(P),
// strabaControlFlee(P), strabaControlForce(P).
const STRABA={lines:[],trams:[],riding:null,ticket:{validUntil:-1,price:2.9,minutes:120},control:null,lastControl:null,
  FINE:60,CONTROL_CHANCE:0.3,forceControl:false,VMAX:12,ACC:1.1,DEC:1.3,DWELL:12,DOOR_T:1.6,
  SEC:9.4,GAP:0.6,W:2.3,hud:null};
// Endstellen je Linie (Koordinaten der Gleisenden). Die Strecke Richtung Lerchenberg endet in den Gleisdaten bei Marienborn
// (Hans-Böckler-Straße): Lerchenberg selbst liegt außerhalb der OSM-Daten des Spiels.
const STRABA_DEFS=[{no:'50',color:'#c8102e',a:[-6167,295],aName:'Finthen',b:[-277,2536],bName:'Hechtsheim'},
  {no:'51',color:'#e07b00',a:[-6167,295],aName:'Finthen',b:[-2478,2542],bName:'Marienborn',via:'Richtung Lerchenberg'}];
const STRABA_TALK={start:'Gude! Fahrscheinkontrolle – die Fahrausweise bitte!',
  ok:['Merci, passt. Gute Fahrt noch!','Alles in Ordnung, weiter so!','Gestempelt un gültig – so mag ich des.'],
  none:'Ei, kää Fahrschein? Des koste 60 Euro – oder willste mir was vom Pferd verzähle?',
  paid:'Merci. Un nächstes Mal en Fahrschein, gell?',poor:'Kää 60 Euro dabei? Dann bleib halt hocke … bis zur nächste Haltestell.',
  flee:'Ei, bleib stehe, du Schwarzfahrer! Des gibt e Anzeige!',force:'Nix da mit Aussitze – 60 Euro, awwer dalli!',
  broke:'Kää Geld un kää Fahrschein? Raus hier – die Polizei waas Bescheid!'};

// ---------------- Gleisgraph ----------------
function strabaSplitJoins(lines){// Gleisenden, die mitten auf einem anderen Gleis enden (Abzweig ohne gemeinsamen Endpunkt), dort auftrennen
  for(let pass=0;pass<3;pass++){let split=false;
    for(let i=0;i<lines.length;i++)for(const p of [lines[i][0],lines[i][lines[i].length-1]])
      for(let j=0;j<lines.length;j++){if(j===i)continue;const q=lines[j];if(Math.hypot(q[0][0]-p[0],q[0][1]-p[1])<3||Math.hypot(q[q.length-1][0]-p[0],q[q.length-1][1]-p[1])<3)continue;
        for(let k=1;k<q.length;k++){const a=q[k-1],b=q[k];if(Math.min(a[0],b[0])-3>p[0]||Math.max(a[0],b[0])+3<p[0]||Math.min(a[1],b[1])-3>p[1]||Math.max(a[1],b[1])+3<p[1])continue;
          const dx=b[0]-a[0],dz=b[1]-a[1],L2=dx*dx+dz*dz||1;const t=clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dz)/L2,0,1);const x=a[0]+dx*t,z=a[1]+dz*t;
          if(Math.hypot(x-p[0],z-p[1])<2.2){lines[j]=q.slice(0,k).concat([[x,z]]);lines.push([[x,z]].concat(q.slice(k)));split=true;break;}}}
    if(!split)break;}
  return lines;}
function strabaPolyLen(pts){const s=[0];for(let i=1;i<pts.length;i++)s.push(s[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));return s;}
function strabaGraph(){const V=[],E=[];const vAt=p=>{for(let i=0;i<V.length;i++)if(Math.hypot(V[i].x-p[0],V[i].z-p[1])<2.5)return i;V.push({x:p[0],z:p[1],e:[]});return V.length-1;};
  const lines=strabaSplitJoins(RAILS.filter(r=>r.tram&&r.pts.length>=2).map(r=>r.pts.slice()));
  for(const pts of lines){const s=strabaPolyLen(pts);const L=s[s.length-1];if(L<0.5)continue;const a=vAt(pts[0]),b=vAt(pts[pts.length-1]);if(a===b)continue;
    const k=E.length;E.push({a,b,pts,s,L});V[a].e.push(k);V[b].e.push(k);}
  return {V,E};}
// Richtung an einem Kantenende, gemittelt über die ersten 4 m (kurze OSM-Stücke rauschen sonst)
function strabaEndDir(E,fromStart){const P=E.pts,n=P.length;let i=fromStart?0:n-1;const st=fromStart?1:-1;const p0=P[i];let q=P[i+st];
  for(let j=i+st;j>=0&&j<n;j+=st){q=P[j];if(Math.hypot(q[0]-p0[0],q[1]-p0[1])>=4)break;}const dx=q[0]-p0[0],dz=q[1]-p0[1],L=Math.hypot(dx,dz)||1;return [dx/L,dz/L];}
// Kürzester Weg mit Abbiegeverbot: Zustand = Kante + Fahrtrichtung (d=0: a→b)
function strabaPath(g,from,to,penal){const N=g.E.length*2;const dist=new Float64Array(N).fill(Infinity),prev=new Int32Array(N).fill(-1),done=new Uint8Array(N);
  const arr=st=>{const E=g.E[st>>1];return st&1?E.a:E.b;};const cost=st=>{const k=st>>1;return g.E[k].L*(penal&&penal.has(k)?4:1);};
  const outDir=st=>{const E=g.E[st>>1];const d=strabaEndDir(E,!!(st&1));return st&1?d:[-d[0],-d[1]];};
  const inDir=st=>{const E=g.E[st>>1];return strabaEndDir(E,!(st&1));};
  for(const k of g.V[from].e){const st=k*2+(g.E[k].a===from?0:1);dist[st]=cost(st);}
  let best=-1;
  for(;;){let u=-1,bd=Infinity;for(let i=0;i<N;i++)if(!done[i]&&dist[i]<bd){bd=dist[i];u=i;}if(u<0)break;done[u]=true;const v=arr(u);if(v===to){best=u;break;}
    const od=outDir(u);for(const k of g.V[v].e){const st=k*2+(g.E[k].a===v?0:1);if((st>>1)===(u>>1))continue;const id=inDir(st);if(od[0]*id[0]+od[1]*id[1]<0.6)continue;
      const nd=bd+cost(st);if(nd<dist[st]){dist[st]=nd;prev[st]=u;}}}
  if(best<0)return null;const seq=[];for(let st=best;st>=0;st=prev[st])seq.unshift(st);
  const pts=[];for(const st of seq){const E=g.E[st>>1];const P=st&1?E.pts.slice().reverse():E.pts;for(const p of P){const l=pts[pts.length-1];if(l&&Math.hypot(l[0]-p[0],l[1]-p[1])<0.05)continue;pts.push(p);}}
  return {pts,edges:new Set(seq.map(st=>st>>1)),end:arr(best),start:from};}
function strabaRailDist(x,z){let bd=Infinity;for(const r of RAILS){if(!r.tram)continue;const P=r.pts;for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i];
    if(Math.min(a[0],b[0])-bd>x||Math.max(a[0],b[0])+bd<x||Math.min(a[1],b[1])-bd>z||Math.max(a[1],b[1])+bd<z)continue;const dx=b[0]-a[0],dz=b[1]-a[1],L2=dx*dx+dz*dz||1;
    const t=clamp(((x-a[0])*dx+(z-a[1])*dz)/L2,0,1);bd=Math.min(bd,Math.hypot(a[0]+dx*t-x,a[1]+dz*t-z));}}return bd;}
function strabaRoute(pts){const s=strabaPolyLen(pts);return {pts,s,L:s[s.length-1],stops:[],dest:''};}
// Position auf der Route (außerhalb 0…L linear verlängert): [x,z,dx,dz]
function strabaPos(R,s){const P=R.pts,S=R.s,n=P.length;let i;
  if(s<=0)i=1;else if(s>=R.L)i=n-1;else{let lo=1,hi=n-1;while(lo<hi){const m=(lo+hi)>>1;if(S[m]<s)lo=m+1;else hi=m;}i=lo;}
  const a=P[i-1],b=P[i],L=(S[i]-S[i-1])||1;const dx=(b[0]-a[0])/L,dz=(b[1]-a[1])/L;const t=s-S[i-1];return [a[0]+dx*t,a[1]+dz*t,dx,dz];}
function strabaShortName(n){n=(n||'').split(/\s*[\/(]/)[0].trim();return n.length>24?n.slice(0,23)+'.':n;}
// Haltestellen: Bushalte-Punkte bis 20 m neben dem Gleis, gleichnamige zusammengefasst, Mindestabstand 150 m, Endstellen ergänzt
function strabaStops(R,n0,n1){const cand=[];
  for(const st of BUS_STOPS){let bd=20,bs=-1,side=1;for(let i=1;i<R.pts.length;i++){const a=R.pts[i-1],b=R.pts[i];if(Math.abs(a[0]-st.x)>120&&Math.abs(b[0]-st.x)>120)continue;
      const dx=b[0]-a[0],dz=b[1]-a[1],L2=dx*dx+dz*dz||1;const t=clamp(((st.x-a[0])*dx+(st.z-a[1])*dz)/L2,0,1);const x=a[0]+dx*t,z=a[1]+dz*t;const d=Math.hypot(st.x-x,st.z-z);
      if(d<bd){bd=d;bs=R.s[i-1]+t*Math.sqrt(L2);side=(dx*(st.z-a[1])-dz*(st.x-a[0]))>0?-1:1;}}
    if(bs>=0&&st.name)cand.push({s:bs,name:st.name,side,bx:st.x,bz:st.z});}
  cand.sort((a,b)=>a.s-b.s);const out=[];
  for(const c of cand){const l=out[out.length-1];if(l&&(c.s-l.s<150||(l.name===c.name&&c.s-l.s<250))){if(l.name===c.name){l.n++;l.sum+=c.s;l.s=l.sum/l.n;}continue;}out.push({s:c.s,sum:c.s,n:1,name:c.name,side:c.side,bx:c.bx,bz:c.bz});}
  const E0=16,E1=R.L-16;const near=s=>{const p=strabaPos(R,s);let b=null,bd=250;for(const st of BUS_STOPS){const d=Math.hypot(st.x-p[0],st.z-p[1]);if(d<bd&&st.name){bd=d;b=st;}}return b;};
  const mk=(s,nm)=>{const b=near(s);const p=strabaPos(R,s);return {s,name:nm,side:1,bx:b?b.x:p[0],bz:b?b.z:p[1]};};
  if(!out.length||out[0].s>250)out.unshift(mk(E0,n0));else out[0].s=E0;
  if(out[out.length-1].s<R.L-250)out.push(mk(E1,n1));else out[out.length-1].s=E1;
  return out.map(o=>{const p=strabaPos(R,o.s);return {s:o.s,name:o.name,short:strabaShortName(o.name),side:o.side,x:p[0],z:p[1],bx:o.bx,bz:o.bz};});}

function strabaBuildLines(){const g=strabaGraph();if(!g.E.length)return;
  const dead=g.V.map((v,i)=>i).filter(i=>g.V[i].e.length===1);
  const group=(p)=>{let best=-1,bd=300;for(const i of dead){const d=Math.hypot(g.V[i].x-p[0],g.V[i].z-p[1]);if(d<bd){bd=d;best=i;}}
    return best<0?[]:dead.filter(i=>Math.hypot(g.V[i].x-g.V[best].x,g.V[i].z-g.V[best].z)<45);};
  const bestPath=(A,B,penal)=>{let best=null;for(const a of A)for(const b of B){const p=strabaPath(g,a,b,penal);if(p&&(!best||strabaPolyLen(p.pts).pop()<strabaPolyLen(best.pts).pop()))best=p;}return best;};
  for(const D of STRABA_DEFS){const A=group(D.a),B=group(D.b);if(!A.length||!B.length)continue;const fw=bestPath(A,B,null);if(!fw)continue;
    const Bs=B.filter(i=>i!==fw.end&&Math.hypot(g.V[i].x-g.V[fw.end].x,g.V[i].z-g.V[fw.end].z)<25);const As=A.filter(i=>i!==fw.start&&Math.hypot(g.V[i].x-g.V[fw.start].x,g.V[i].z-g.V[fw.start].z)<25);
    const bw=bestPath(Bs.length?Bs:[fw.end],As.length?As:[fw.start],fw.edges)||{pts:fw.pts.slice().reverse()};
    const routes=[strabaRoute(fw.pts),strabaRoute(bw.pts)];
    routes.forEach((R,i)=>{const n0=i?D.bName:D.aName,n1=i?D.aName:D.bName;R.stops=strabaStops(R,n0,n1);R.dest=n1;});
    if(routes.some(R=>R.stops.length<2||R.L<500))continue;
    STRABA.lines.push(strabaLine(D,routes));}}
// Fahrplan: geplante Abfahrt je Halt ab Zyklusbeginn (Abfahrt Route 0, Halt 0)
function strabaLine(D,routes){const L={no:D.no,color:D.color,via:D.via||'',routes,stops:routes[0].stops,seq:[],period:0};
  const run=d=>d/(STRABA.VMAX*0.72)+4;let t=0;
  routes[0].stops.forEach((st,k)=>{if(k>0)t+=run(st.s-routes[0].stops[k-1].s)+STRABA.DWELL;L.seq.push({ri:0,k,dep:t});});
  routes[1].stops.forEach((st,k)=>{if(k===0)return;t+=run(st.s-routes[1].stops[k-1].s)+STRABA.DWELL;L.seq.push({ri:1,k,dep:t});});
  L.period=t;for(const ri of [0,1])routes[ri].dep=routes[ri].stops.map((_,k)=>{const e=L.seq.find(q=>q.ri===ri&&q.k===k);return e?e.dep:L.period;});
  routes[1].dep[0]=routes[0].dep[routes[0].stops.length-1];L.name=`${D.no} ${routes[1].dest} ↔ ${routes[0].dest}`;return L;}

// ---------------- Modell: Niederflur-Gelenkwagen, drei Wagenkästen, beidseitig Führerstand ----------------
let STRABA_GEO=null,STRABA_MAT=null;
function strabaGeo(){if(STRABA_GEO)return STRABA_GEO;const S=STRABA,hl=S.SEC/2,W=S.W;
  const red={r:0.74,g:0.05,b:0.1},white={r:0.94,g:0.94,b:0.92},glass={r:0.04,g:0.06,b:0.08},dark={r:0.13,g:0.13,b:0.14},roof={r:0.48,g:0.49,b:0.51},inner={r:0.2,g:0.2,b:0.22};
  const doorsZ=[-2.4,2.4];
  const body=cab=>{const b=new GB();gbox(b,0,0.2,0,W-0.2,0.24,S.SEC-0.6,dark);                                       // Fahrwerk
    gbox(b,0,1.75,0,W,2.9,S.SEC,white,cab?0.35:0,0,0.08);gbox(b,0,0.66,0,W+0.02,0.72,S.SEC+0.02,red);                 // Kasten, rote Schürze
    gbox(b,0,2.62,0,W+0.02,0.12,S.SEC-0.2,red);gbox(b,0,3.27,0,W-0.4,0.12,S.SEC-0.6,roof);                             // Zierstreifen, Dach
    const panes=[[-4.45,-3.25],[-1.55,-0.06],[0.06,1.55],[3.25,cab?3.9:4.45]];
    for(const sx of [-1,1]){for(const [z0,z1] of panes)gbox(b,sx*(W/2+0.005),1.78,(z0+z1)/2,0.02,1.1,z1-z0,glass);
      for(const dz of doorsZ)gbox(b,sx*(W/2+0.004),1.35,dz,0.02,2.1,1.32,inner);}
    if(cab){gbox(b,0,2.02,hl-0.2,W-0.3,1.4,0.18,glass,0.22);for(const sx of [-1,1]){gbox(b,sx*0.72,0.95,hl+0.02,0.28,0.12,0.05,{r:1,g:0.96,b:0.82});
      gbox(b,sx*0.98,0.95,hl+0.02,0.1,0.12,0.05,{r:0.9,g:0.05,b:0.05});}gbox(b,0,1.05,hl+0.01,0.6,0.08,0.04,white);}
    else{gbox(b,0,3.45,0,1.2,0.22,1.6,dark);for(const s of [-1,1]){b.beam([0,3.56,s*0.6],[0,4.05,s*0.05],0.06,0.06,dark);b.beam([0,4.05,s*0.05],[0,4.42,s*0.5],0.05,0.05,dark);}
      gbox(b,0,4.46,0,1.5,0.05,0.12,dark);}
    if(cab)gbox(b,0,3.48,-1.2,1.5,0.28,2.6,roof);                                                                    // Klimagerät
    const g=b.geo();return g;};
  const leaf=(dir)=>{const b=new GB();for(const sx of [-1,1])for(const dz of doorsZ){const z=dz+dir*0.33;gbox(b,sx*(W/2+0.03),0.8,z,0.04,1.0,0.64,red);gbox(b,sx*(W/2+0.03),1.85,z,0.04,1.1,0.64,glass);}return b.geo();};
  const bel=new GB();gbox(bel,0,1.7,0,W-0.25,2.7,S.GAP+0.3,dark);
  STRABA_GEO={cab:body(true),mid:body(false),leafA:leaf(-1),leafB:leaf(1),bellow:bel.geo(),sign:new THREE.PlaneGeometry(1.5,0.24)};
  STRABA_MAT=stdMat({vertexColors:true,roughness:0.45,metalness:0.12});return STRABA_GEO;}
function strabaSignTex(line,text){return freeAfterUpload(canvasTex(256,40,(g,w,h)=>{g.fillStyle='#0b0b0b';g.fillRect(0,0,w,h);g.fillStyle='#ffb300';g.font='700 26px Arial';g.textBaseline='middle';
  g.fillText(line.no,8,h/2+1);g.font='600 22px Arial';g.fillText(text,52,h/2+1,w-58);},false));}
function strabaMakeTram(line){const G=strabaGeo();const secs=[];
  for(let i=0;i<3;i++){const g=new THREE.Group();const cab=i!==1;const body=new THREE.Mesh(cab?G.cab:G.mid,STRABA_MAT);body.castShadow=true;
    const inner=new THREE.Group();if(i===2)inner.rotation.y=Math.PI;inner.add(body);const dA=new THREE.Mesh(G.leafA,STRABA_MAT),dB=new THREE.Mesh(G.leafB,STRABA_MAT);g.add(inner);g.add(dA);g.add(dB);
    let sign=null;if(cab){sign=new THREE.Mesh(G.sign,line.signMat[0]);sign.position.set(0,2.9,STRABA.SEC/2-0.06);inner.add(sign);}
    scene.add(g);secs.push({g,dA,dB,sign,x:0,z:0,y:0,h:0});}
  const bellows=[0,1].map(()=>{const m=new THREE.Mesh(G.bellow,STRABA_MAT);scene.add(m);return m;});
  return {line,secs,bellows,ri:0,k:0,s:0,v:0,state:'dwell',dwellT:0,depT:0,doors:0,cycle0:0,obsT:0,bellT:0,x:0,y:0,z:0,h:0,visible:true,bub:null};}

// ---------------- Bewegung ----------------
function strabaRouteOf(t){return t.line.routes[t.ri];}
function strabaPlace(t){const R=strabaRouteOf(t),S=STRABA;const off=S.SEC+S.GAP;
  for(let i=0;i<3;i++){const sc=t.secs[i];const s=t.s+(1-i)*off;const a=strabaPos(R,s+3.4),b=strabaPos(R,s-3.4);sc.x=(a[0]+b[0])/2;sc.z=(a[1]+b[1])/2;sc.h=Math.atan2(a[0]-b[0],a[1]-b[1]);
    sc.y=groundY(sc.x,sc.z,sc.y?sc.y+1:undefined);}
  const m=t.secs[1];t.x=m.x;t.z=m.z;t.y=m.y;t.h=m.h;}
function strabaSync(t){if(!t.visible)return;const S=STRABA;const o=Math.min(1,t.doors)*0.62;
  for(const sc of t.secs){sc.g.position.set(sc.x,sc.y,sc.z);sc.g.rotation.y=sc.h;sc.dA.position.z=-o;sc.dB.position.z=o;}
  for(let i=0;i<2;i++){const A=t.secs[i],B=t.secs[i+1];const m=t.bellows[i];const hl=S.SEC/2;
    const ax=A.x-Math.sin(A.h)*hl,az=A.z-Math.cos(A.h)*hl,bx=B.x+Math.sin(B.h)*hl,bz=B.z+Math.cos(B.h)*hl;
    m.position.set((ax+bx)/2,(A.y+B.y)/2,(az+bz)/2);m.rotation.y=Math.atan2(ax-bx,az-bz)||A.h;}}
function strabaSetVisible(t,v){if(t.visible===v)return;t.visible=v;for(const sc of t.secs)sc.g.visible=v;for(const m of t.bellows)m.visible=v;}
function strabaSignFor(t){const i=t.ri;for(const sc of t.secs)if(sc.sign)sc.sign.material=t.line.signMat[i];}
function strabaArrive(t){const R=strabaRouteOf(t);t.state='dwell';t.v=0;t.s=R.stops[t.k].s;t.dwellT=0;
  t.depT=Math.max(simTime+STRABA.DWELL,t.cycle0+R.dep[t.k]);strabaBell(t);}
function strabaDepart(t){const L=t.line,R=strabaRouteOf(t);t.state='run';t.dwellT=0;
  if(t.k>=R.stops.length-1){if(t.ri===1)t.cycle0+=L.period;t.ri=1-t.ri;const R2=strabaRouteOf(t);t.s=R2.stops[0].s;t.k=1;strabaSignFor(t);strabaPlace(t);}
  else t.k++;}
// Kehre an der Endstelle: nicht auf eine Bahn springen, die noch am Startgleis steht
function strabaTurnBlocked(t){const R=strabaRouteOf(t);if(t.k<R.stops.length-1)return false;const R2=t.line.routes[1-t.ri];const p=strabaPos(R2,R2.stops[0].s);
  return STRABA.trams.some(o=>o!==t&&Math.hypot(o.x-p[0],o.z-p[1])<45&&Math.sin(o.h)*p[2]+Math.cos(o.h)*p[3]>0.5);}
function strabaBell(t){const ctx=AUD.ctx;if(!ctx)return;const v=distVol(t.x,t.z,90)*0.3;if(v<0.01)return;let at=ctx.currentTime;
  for(let i=0;i<2;i++){const o=ctx.createOscillator();o.type='sine';o.frequency.value=1180;const g=ctx.createGain();g.gain.setValueAtTime(v,at);g.gain.exponentialRampToValueAtTime(0.0001,at+0.5);
    o.connect(g);g.connect(AUD.master);o.start(at);o.stop(at+0.55);at+=0.2;}}
// Hindernis vor der Bahn (Autos, Leute): bremsen und bimmeln; nach 4 s schiebt sie sich durch
function strabaObstacle(t){const R=strabaRouteOf(t),S=STRABA;const front=S.SEC*1.5+S.GAP;const pts=[];for(let d=2;d<=14;d+=3)pts.push(strabaPos(R,t.s+front+d));
  const hit=(x,z,r)=>pts.some(p=>Math.abs(x-p[0])<8&&Math.abs(z-p[1])<8&&Math.hypot(x-p[0],z-p[1])<S.W/2+r);
  for(const o of STRABA.trams){if(o===t||Math.abs(o.x-t.x)>70||Math.abs(o.z-t.z)>70||Math.sin(o.h)*Math.sin(t.h)+Math.cos(o.h)*Math.cos(t.h)<0.5)continue;
    if(o.secs.some(sc=>hit(sc.x,sc.z,1.2)))return 'tram';}
  for(const c of CARS){if(c.dead||c.removed||c.T.boat||Math.abs(c.x-t.x)>60||Math.abs(c.z-t.z)>60)continue;if(hit(c.x,c.z,c.T.W*0.5))return true;}
  for(const h of HUMANS){if(!h.alive||h.inCar||h.room||Math.abs(h.x-t.x)>45||Math.abs(h.z-t.z)>45)continue;if(hit(h.x,h.z,0.4))return true;}
  return false;}
// Wer im Weg steht, wird zur Seite geschoben – bei Tempo umgeworfen
function strabaShove(t){const S=STRABA,hl=S.SEC/2+0.2,hw=S.W/2;
  const push=(o,r,fn)=>{for(const sc of t.secs){const fx=Math.sin(sc.h),fz=Math.cos(sc.h);const dx=o.x-sc.x,dz=o.z-sc.z;const lz=dx*fx+dz*fz,lx=dx*fz-dz*fx;
    if(Math.abs(lz)<hl+r*0.5&&Math.abs(lx)<hw+r){const sd=lx>=0?1:-1;const pen=hw+r-Math.abs(lx)+0.05;fn(fz*sd,-fx*sd,pen);return;}}};
  for(const c of CARS){if(c.dead||c.removed||c.T.boat||Math.abs(c.x-t.x)>25||Math.abs(c.z-t.z)>25)continue;
    push(c,c.T.W*0.5,(nx,nz,pen)=>{c.x+=nx*pen;c.z+=nz*pen;c.vx=c.vx*0.5+nx*Math.min(6,t.v*0.5);c.vz=c.vz*0.5+nz*Math.min(6,t.v*0.5);if(t.v>4&&c.health>0)c.health-=t.v*0.3;});}
  for(const h of HUMANS){if(!h.alive||h.inCar||h.room||h.state==='knock'||Math.abs(h.x-t.x)>25||Math.abs(h.z-t.z)>25)continue;
    push(h,0.35,(nx,nz,pen)=>{h.x+=nx*pen;h.z+=nz*pen;if(t.v<=3)return;const pv=playerOfHuman(h);if(pv){damagePlayer(pv,t.v*2.5);}else knockHuman(h,nx*4+Math.sin(t.h)*t.v*0.6,nz*4+Math.cos(t.h)*t.v*0.6,2.5,t.v*5,false);});}}
function strabaStep(t,dt){const S=STRABA,R=strabaRouteOf(t);
  if(t.state==='dwell'){t.dwellT+=dt;const closing=simTime>=t.depT-S.DOOR_T;t.doors=clamp(t.doors+(closing?-dt:dt)/S.DOOR_T*1.0,0,1);
    if(simTime>=t.depT&&t.doors<=0){if(strabaTurnBlocked(t))t.depT=simTime+3;else{strabaBeforeDepart(t);strabaDepart(t);}}}
  else{const target=R.stops[t.k].s;const dist=target-t.s;let vmax=Math.min(S.VMAX,Math.sqrt(2*S.DEC*Math.max(0,dist)));
    const ob=strabaObstacle(t);if(ob){t.obsT+=dt;if(t.obsT<4||ob==='tram')vmax=0;t.bellT-=dt;if(t.bellT<=0){t.bellT=1.6;strabaBell(t);}}else t.obsT=0;
    t.v=t.v<vmax?Math.min(vmax,t.v+S.ACC*dt):Math.max(vmax,t.v-S.DEC*2.5*dt);t.s+=t.v*dt;
    if(dist<0.35&&t.v<0.4)strabaArrive(t);}
  strabaPlace(t);if(t.v>0.5)strabaShove(t);}

// ---------------- Fahrschein + Kontrolle (wiederverwendbar) ----------------
function strabaTicketValid(){return simTime<STRABA.ticket.validUntil;}
function strabaTicketLeft(){return Math.max(0,Math.ceil(STRABA.ticket.validUntil-simTime));}   // Spielminuten (1 Spielminute = 1 s)
function strabaBuyTicket(P){const T=STRABA.ticket;if(strabaTicketValid()){hint(`Dein Fahrschein gilt noch <b>${strabaTicketLeft()} min</b>.`,2,P);return false;}
  if(G.money<T.price){hint('Zu wenig Geld für en Fahrschein!',2,P);return false;}
  G.money=Math.round((G.money-T.price)*100)/100;T.validUntil=simTime+T.minutes;chime([660,880]);
  hint(`Fahrschein gekauft: <b>${T.price.toFixed(2).replace('.',',')} €</b> · gültig ${T.minutes} min`,2.5,P);return true;}
function strabaSpeaker(t){if(!t)return null;if(!t.bub)t.bub={alive:true,removed:false,g:t.secs[1].g,x:0,y:0,z:0};t.bub.x=t.x;t.bub.y=t.y+2.2;t.bub.z=t.z;return t.bub;}
// Startet eine Kontrolle. opts: {hasTicket, speaker (für Sprechblasen), where}. Liefert das Kontrollobjekt oder null (Fahrschein ok).
function strabaControl(P,opts={}){const has=opts.hasTicket!==undefined?opts.hasTicket:strabaTicketValid();const spk=opts.speaker||null;
  hint(`Kontrolleur: „${STRABA_TALK.start}“`,2.5,P);
  if(has){if(spk)say(spk,mpick(STRABA_TALK.ok),3);STRABA.lastControl={result:'ok',t:simTime};return null;}
  STRABA.control={P,t:0,fine:STRABA.FINE,where:opts.where||'Straßenbahn',speaker:spk};if(spk)say(spk,STRABA_TALK.none,4.5,'loud');
  showBig('KONTROLLE!','',2.5,`<b>B</b> ${STRABA.FINE} € zahlen · oder an der nächsten Haltestelle abhauen`);return STRABA.control;}
function strabaControlPay(P){const C=STRABA.control;if(!C)return false;if(G.money<C.fine){if(C.speaker)say(C.speaker,STRABA_TALK.poor,3.5);hint(`Kää ${C.fine} € – da hilft nur abhauen!`,2.5,P);return false;}
  G.money-=C.fine;if(C.speaker)say(C.speaker,STRABA_TALK.paid,3);hint(`Erhöhtes Beförderungsentgelt: <b>-${C.fine} €</b>`,2.5,P);STRABA.control=null;STRABA.lastControl={result:'paid',t:simTime};return true;}
function strabaControlFlee(P){const C=STRABA.control;if(!C)return false;setWanted(Math.max(wanted,1));if(C.speaker)say(C.speaker,STRABA_TALK.flee,3.5,'loud');
  hint('Schwarzgefahren und abgehauen! ★',2.5,P);STRABA.control=null;STRABA.lastControl={result:'fled',t:simTime};return true;}
// Sitzenbleiben gilt nicht: Strafe, notfalls Rauswurf mit Stern. Liefert true, wenn der Fahrgast raus muss.
function strabaControlForce(P){const C=STRABA.control;if(!C)return false;if(G.money>=C.fine){if(C.speaker)say(C.speaker,STRABA_TALK.force,3,'loud');strabaControlPay(P);return false;}
  if(C.speaker)say(C.speaker,STRABA_TALK.broke,3.5,'loud');setWanted(Math.max(wanted,1));STRABA.control=null;STRABA.lastControl={result:'thrown',t:simTime};return true;}

// ---------------- Mitfahren ----------------
function strabaRideOf(P){const R=STRABA.riding;return R&&R.P===P?R:null;}
function strabaDoors(t){const out=[],S=STRABA;for(const sc of t.secs){const fx=Math.sin(sc.h),fz=Math.cos(sc.h),rx=fz,rz=-fx;
  for(const dz of [-2.4,2.4])for(const sd of [-1,1])out.push([sc.x+fx*dz+rx*sd*(S.W/2+0.7),sc.z+fz*dz+rz*sd*(S.W/2+0.7),sd]);}return out;}
function strabaDoorTram(P){const h=P.h;if(!h||P.car||h.room)return null;let best=null,bd=3;
  for(const t of STRABA.trams){if(t.state!=='dwell'||t.doors<0.5||Math.abs(t.x-h.x)>30||Math.abs(t.z-h.z)>30)continue;
    for(const d of strabaDoors(t)){const dd=Math.hypot(d[0]-h.x,d[1]-h.z);if(dd<bd){bd=dd;best=t;}}}return best;}
function strabaBoard(P,t){if(STRABA.riding){hint('Die Bahn is schon voll mit dir.',1.5,P);return false;}const h=P.h;const R=strabaRouteOf(t);
  const has=strabaTicketValid();STRABA.riding={P,tram:t,line:t.line,hasTicket:has,controlDue:!has&&(STRABA.forceControl||Math.random()<STRABA.CONTROL_CHANCE),runT:0};
  h.inCar=true;h.aiming=false;h.g.visible=false;h.vx=h.vz=0;P.swim=false;strabaSeat(P);
  hint(`<b>Linie ${t.line.no}</b> → ${R.dest}${has?' · Fahrschein gültig':' · <b>ohne Fahrschein</b> – pass uff!'}`,3,P);return true;}
function strabaSeat(P){const R=strabaRideOf(P);if(!R)return;const h=P.h,t=R.tram;h.x=t.x;h.z=t.z;h.y=t.y+0.35;h.vx=h.vz=0;h.facing=t.h;h.g.visible=false;h.sync();}
function strabaUnseat(P,x,z){const h=P.h;const [fx,fz]=blocked(x,z)?freeSpot(x,z,0.4):[x,z];h.x=fx;h.z=fz;h.y=groundY(fx,fz);h.inCar=false;h.g.visible=true;h.vx=h.vz=0;P.vy=0;P.ground=true;
  if(h.stand)h.stand();h.sync();STRABA.riding=null;}
function strabaExitSpot(t){const R=strabaRouteOf(t);const st=R.stops[t.k]||R.stops[R.stops.length-1];const sd=st?st.side:1;const sc=t.secs[1];const fx=Math.sin(sc.h),fz=Math.cos(sc.h);
  return [sc.x+fz*sd*(STRABA.W/2+1.1)+fx*2.4,sc.z-fx*sd*(STRABA.W/2+1.1)+fz*2.4];}
function strabaTryExit(P,R){const t=R.tram;if(t.state!=='dwell'||t.doors<0.3){hint('Erst an de nächste Haltestell aussteige!',1.5,P);return false;}
  const fled=!!STRABA.control&&STRABA.control.P===P;const [x,z]=strabaExitSpot(t);strabaUnseat(P,x,z);if(fled)strabaControlFlee(P);
  else{const st=strabaRouteOf(t).stops[t.k];hint(`Ausgestiegen: <b>${st?st.short:'Haltestelle'}</b>`,2,P);}return true;}
// Kurz vor der Abfahrt: wer bei offener Kontrolle sitzen bleibt, zahlt (oder fliegt raus)
function strabaBeforeDepart(t){const R=STRABA.riding;if(!R||R.tram!==t||!STRABA.control||STRABA.control.P!==R.P)return;
  if(strabaControlForce(R.P)){const [x,z]=strabaExitSpot(t);strabaUnseat(R.P,x,z);}}
function strabaRideStep(dt){const R=STRABA.riding;if(!R)return;const P=R.P,t=R.tram;
  if(P.gameOver||!P.h||!P.h.alive){const [x,z]=strabaExitSpot(t);strabaUnseat(P,x,z);STRABA.control=null;return;}
  strabaSeat(P);if(t.state==='run'){R.runT+=dt;if(R.controlDue&&R.runT>3){R.controlDue=false;strabaControl(P,{hasTicket:R.hasTicket,speaker:strabaSpeaker(t)});}}
  else R.runT=0;if(STRABA.control&&STRABA.control.P===P){STRABA.control.t+=dt;strabaSpeaker(t);}}

// ---------------- Eingabe-/Kamera-Wrapper ----------------
const _strabaTryEnterExit=tryEnterExit;
tryEnterExit=function(P){if(!P.gameOver){const R=strabaRideOf(P);if(R){strabaTryExit(P,R);return;}if(!P.car&&!P.morph){const t=strabaDoorTram(P);if(t){strabaBoard(P,t);return;}}}
  _strabaTryEnterExit(P);};
const _strabaFoot=updatePlayerFoot;
updatePlayerFoot=function(P,I,dt){if(strabaRideOf(P)){strabaSeat(P);return;}_strabaFoot(P,I,dt);};
const _strabaShop=shopInteract;
shopInteract=function(P){if(strabaRideOf(P)||strabaDoorTram(P))return false;return _strabaShop(P);};
const _strabaFire=playerFire;
playerFire=function(P,I){if(strabaRideOf(P))return;_strabaFire(P,I);};
const _strabaStartTalk=startTalk;
startTalk=function(P,npc){if(strabaRideOf(P))return;_strabaStartTalk(P,npc);};
const STRABA_CAM={x:0,y:0,z:0,h:0,speed:0,T:{H:3.4,L:16}};
const _strabaCam=updateCamera;
updateCamera=function(P,dt){const R=strabaRideOf(P);if(!R){_strabaCam(P,dt);return;}const t=R.tram,c=STRABA_CAM;c.x=t.x;c.y=t.y;c.z=t.z;c.h=t.h;c.speed=t.v;
  P.car=c;try{_strabaCam(P,dt);}finally{P.car=null;}};
{const k=KEYS_HELP.find(([t])=>t==='Leute & Orte');if(k)k[1].push(['F (an offener Bahntür)','Straßenbahn: ein-/aussteigen'],['B (an der Haltestelle)','Fahrschein kaufen / Strafe zahlen']);}

// ---------------- HUD ----------------
function strabaHudEl(){if(STRABA.hud)return STRABA.hud;const hud=$('hud');if(!hud)return null;const d=document.createElement('div');
  d.id='strabaHud';d.style.cssText='position:absolute;right:18px;top:calc(240px + env(safe-area-inset-top,0px));max-width:min(300px,calc(100vw - 36px));background:rgba(8,10,12,.82);'+
    'border-left:4px solid #c8102e;padding:8px 12px;font:600 15px/1.35 "Barlow Condensed",Arial,sans-serif;color:#eee;display:none';
  d.addEventListener('click',e=>{if(e.target&&e.target.dataset&&e.target.dataset.straba)strabaKeyB(P1);});hud.appendChild(d);STRABA.hud=d;return d;}
function strabaNearStop(P){const [px,pz]=ppos(P);let best=null,bd=22;
  for(const L of STRABA.lines)for(const R of L.routes)for(const st of R.stops){const d=Math.min(Math.hypot(st.x-px,st.z-pz),Math.hypot(st.bx-px,st.bz-pz));if(d<bd){bd=d;best={st,L,R};}}
  return best;}
function strabaNearAnyStop(P){if(strabaNearStop(P))return true;const [px,pz]=ppos(P);return BUS_STOPS.some(s=>Math.abs(s.x-px)<15&&Math.abs(s.z-pz)<15&&Math.hypot(s.x-px,s.z-pz)<15);}
function strabaEta(L,R,st){let best=Infinity;for(const t of STRABA.trams){if(t.line!==L||t.line.routes[t.ri]!==R)continue;const d=st.s-t.s;if(d<-1)continue;
  const n=R.stops.filter(q=>q.s>t.s+1&&q.s<st.s-1).length;const e=(t.state==='dwell'&&d<1)?0:d/(STRABA.VMAX*0.72)+n*STRABA.DWELL+(t.state==='dwell'?Math.max(0,t.depT-simTime):0);best=Math.min(best,e);}return best;}
function strabaBadge(L){return `<span style="background:${L.color};color:#fff;padding:0 6px;border-radius:3px;margin-right:6px">${L.no}</span>`;}
function strabaBtn(txt){return `<span data-straba="1" style="pointer-events:auto;cursor:pointer;display:inline-block;margin-top:4px;padding:1px 8px;border:1px solid #ffd23f;border-radius:4px;color:#ffd23f">${txt}</span>`;}
function strabaHud(){const el=strabaHudEl();if(!el)return;const P=P1;let html='';const tk=strabaTicketValid()?`Fahrschein: gültig, noch ${strabaTicketLeft()} min`:'Fahrschein: keiner';
  const R=strabaRideOf(P);
  if(R){const t=R.tram,RT=strabaRouteOf(t);const st=RT.stops[t.k];
    html=`${strabaBadge(t.line)}<b>→ ${RT.dest}</b><br>`+(t.state==='dwell'?`Halt: <b>${st.short}</b> · Abfahrt in ${Math.max(0,Math.ceil(t.depT-simTime))} s · <b>F</b> aussteigen`:`Nächster Halt: <b>${st.short}</b>`)+`<br><small>${tk}</small>`;
    if(STRABA.control&&STRABA.control.P===P)html+=`<div style="margin-top:6px;color:#ff6b6b"><b>Fahrscheinkontrolle!</b></div>${strabaBtn('B · '+STRABA.control.fine+' € zahlen')} <small>oder an der nächsten Haltestelle abhauen</small>`;}
  else if(!P.car&&!P.gameOver){const n=strabaNearStop(P);if(n){const lines=STRABA.lines.map(L=>{const rows=L.routes.map(Rr=>{const s=Rr.stops.find(q=>q.name===n.st.name);if(!s)return '';
        const e=strabaEta(L,Rr,s);return `${strabaBadge(L)}→ ${Rr.dest} · ${e===0?'<b>steht da</b>':isFinite(e)?'in '+Math.ceil(e)+' s':'–'}`;}).filter(Boolean);return rows.join('<br>');}).filter(Boolean).join('<br>');
      const door=strabaDoorTram(P);html=`Haltestelle <b>${n.st.short}</b><br>${lines}<br><small>${tk}</small><br>`+(strabaTicketValid()?'':strabaBtn('B · Fahrschein 2,90 €'))+(door?` <b>F</b> einsteigen`:'');}}
  if(html!==el._h){el.innerHTML=html;el._h=html;}el.style.display=html?'block':'none';}
function strabaKeyB(P){if(STRABA.control&&STRABA.control.P===P){strabaControlPay(P);return;}
  if(strabaRideOf(P)){hint('Fahrscheine gibt\'s an de Haltestell – jetzt is zu spät.',2,P);return;}
  if(P.car)return;if(!strabaNearAnyStop(P)){hint('Fahrscheine gibt\'s nur an de Haltestell.',1.5,P);return;}strabaBuyTicket(P);}

// ---------------- Aufbau + Schleife ----------------
function setupStraba(){strabaBuildLines();const S=STRABA;
  S.lines.forEach((L,li)=>{L.signMat=L.routes.map(R=>new THREE.MeshBasicMaterial({map:strabaSignTex(L,R.dest)}));const n=L.routes[0].stops.length>3?2:1;
    for(let j=0;j<n;j++){const t=strabaMakeTram(L);const T=((j+li*0.37)/n%1)*L.period;t.cycle0=simTime-T;const q=L.seq.find(e=>e.dep>=T)||L.seq[0];
      t.ri=q.ri;t.k=q.k;const R=strabaRouteOf(t);t.s=R.stops[t.k].s;t.state='dwell';t.depT=t.cycle0+q.dep;t.doors=1;strabaSignFor(t);strabaPlace(t);strabaSync(t);S.trams.push(t);}});
  S.fn={doors:strabaDoors,ticketValid:strabaTicketValid,buy:strabaBuyTicket,control:strabaControl,pay:strabaControlPay,flee:strabaControlFlee,force:strabaControlForce,railDist:strabaRailDist,now:()=>simTime};}
function updateStraba(dt){if(keysP.KeyB){keysP.KeyB=false;if(mode==='play')strabaKeyB(P1);}
  if(!STRABA.trams.length)return;
  for(const t of STRABA.trams){strabaStep(t,dt);let near=false;for(const P of PLAYERS){const [px,pz]=ppos(P);if(Math.abs(px-t.x)<900&&Math.abs(pz-t.z)<900){near=true;break;}}
    strabaSetVisible(t,near);strabaSync(t);}
  strabaRideStep(dt);strabaHud();}
