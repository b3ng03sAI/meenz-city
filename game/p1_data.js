// ---------- Sicherheit: OSM-Texte landen in innerHTML-Hinweisen → spitze Klammern entfernen (Security-Audit F1) ----------
const OSM_SANITIZED=(()=>{let n=0;const walk=a=>{if(!Array.isArray(a)||!a.length)return;if(typeof a[0]==='number'&&typeof a[a.length-1]==='number'&&a.length>8)return;
  for(let i=0;i<a.length;i++){const v=a[i];if(typeof v==='string'){if(/[<>]/.test(v)){a[i]=v.replace(/[<>]/g,'');n++;}}else if(Array.isArray(v))walk(v);}};
  for(const k in OSM){const v=OSM[k];if(Array.isArray(v))walk(v);}return n;})();
// ---------- Weltgrenzen (1 Einheit = 1 m, Ursprung = Dom, +x Ost, -z Nord) ----------
const [MINX,MINZ,WW,WH]=OSM.bounds||[-6016,-3264,9216,5888];const MAXX=MINX+WW, MAXZ=MINZ+WH;
const MAP_CX=(MINX+MAXX)/2, MAP_CZ=(MINZ+MAXZ)/2, MAP_R=Math.hypot(WW,WH)/2;
function decRing(a){const p=[];let x=0,z=0;for(let i=0;i<a.length;i+=2){x+=a[i];z+=a[i+1];p.push([x/10,z/10]);}return p;}
const ONAME=i=>i>=0?OSM.names[i]:'';
function polyArea(P){let a=0;for(let i=0,j=P.length-1;i<P.length;j=i++)a+=P[j][0]*P[i][1]-P[i][0]*P[j][1];return a/2;}
function polyCentroid(P){let a=0,cx=0,cz=0;for(let i=0,j=P.length-1;i<P.length;j=i++){const f=P[j][0]*P[i][1]-P[i][0]*P[j][1];a+=f;cx+=(P[j][0]+P[i][0])*f;cz+=(P[j][1]+P[i][1])*f;}if(Math.abs(a)<1e-6){let x=0,z=0;for(const p of P){x+=p[0];z+=p[1];}return [x/P.length,z/P.length];}return [cx/(3*a),cz/(3*a)];}
function polyBBox(P){let x0=1e9,z0=1e9,x1=-1e9,z1=-1e9;for(const p of P){if(p[0]<x0)x0=p[0];if(p[0]>x1)x1=p[0];if(p[1]<z0)z0=p[1];if(p[1]>z1)z1=p[1];}return [x0,z0,x1,z1];}

// ---------- Rhein (echte Uferlinien aus OpenStreetMap) ----------
const WATER_O=OSM.water.o.map(decRing), WATER_I=OSM.water.i.map(decRing);
const WATER_ALL=[...WATER_O,...WATER_I];const WATER_BB=WATER_ALL.map(polyBBox);
function inRiver(x,z){let c=false;for(let k=0;k<WATER_ALL.length;k++){const b=WATER_BB[k];if(x<b[0]||x>b[2]||z<b[1]||z>b[3])continue;if(pip(x,z,WATER_ALL[k]))c=!c;}return c;}
function waterPath(g){g.beginPath();for(const r of WATER_ALL){g.moveTo(r[0][0],r[0][1]);for(let i=1;i<r.length;i++)g.lineTo(r[i][0],r[i][1]);g.closePath();}}
const RHINE_LINE=decRing(OSM.rhine);
const RHINE_CUM=(()=>{const c=[0];for(let i=1;i<RHINE_LINE.length;i++)c.push(c[i-1]+Math.hypot(RHINE_LINE[i][0]-RHINE_LINE[i-1][0],RHINE_LINE[i][1]-RHINE_LINE[i-1][1]));return c;})();
function rhineAt(s){const L=RHINE_CUM[RHINE_CUM.length-1];s=clamp(s,0,L);let i=1;while(i<RHINE_CUM.length-1&&RHINE_CUM[i]<s)i++;const a=RHINE_LINE[i-1],b=RHINE_LINE[i];const f=(s-RHINE_CUM[i-1])/((RHINE_CUM[i]-RHINE_CUM[i-1])||1);const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz)||1;return {x:a[0]+dx*f,z:a[1]+dz*f,dx:dx/l,dz:dz/l};}
// Seite des Rheins: >0 = rechtes Ufer (Kastel/Kostheim)
const RS_C=16,RS_W=Math.ceil(WW/RS_C)+1,RS_GRID=new Int8Array(RS_W*(Math.ceil(WH/RS_C)+1));
function rhineSide(x,z){const gx=Math.floor((x-MINX)/RS_C),gz=Math.floor((z-MINZ)/RS_C);if(gx>=0&&gz>=0&&gx<RS_W){const k=gz*RS_W+gx;if(k<RS_GRID.length){let v=RS_GRID[k];if(!v){v=rhineSide0(MINX+(gx+0.5)*RS_C,MINZ+(gz+0.5)*RS_C)>0?1:-1;RS_GRID[k]=v;}return v;}}return rhineSide0(x,z);}
function rhineSide0(x,z){let best=1e18,bi=0;for(let i=0;i<RHINE_LINE.length-1;i++){const d=segDist(x,z,RHINE_LINE[i][0],RHINE_LINE[i][1],RHINE_LINE[i+1][0],RHINE_LINE[i+1][1]).d;if(d<best){best=d;bi=i;}}
  const a=RHINE_LINE[bi],b=RHINE_LINE[bi+1];return (b[0]-a[0])*(z-a[1])-(b[1]-a[1])*(x-a[0]);}

// ---------- Straßen (OSM) ----------
const RN=[];for(let i=0;i<OSM.nodes.length;i+=2)RN.push([OSM.nodes[i]/10,OSM.nodes[i+1]/10]);
const CLS_DEF=[{type:'main',w:7.0,sw:3.6},{type:'main',w:6.8,sw:3.2},{type:'main',w:6.4,sw:3.0},{type:'street',w:6.0,sw:2.4},{type:'street',w:5.2,sw:0},{type:'street',w:4.0,sw:0},{type:'ped',w:7,sw:0},{type:'path',w:2.4,sw:0}];
const ROADS=OSM.roads.map(r=>{const [cls,ni,surf,fl,lanes,wdm,ids]=r;const D=CLS_DEF[cls];let w=D.w;const oneway=!!(fl&1);
  if(cls<=3){if(lanes)w=Math.max(4.2,lanes*3.15+(cls<=2?0.5:0));else if(oneway)w=Math.max(4.6,w*0.66);if(fl&64)w+=cls<=2?2:1.5;}
  if(wdm>0){const tw=wdm/10;w=cls>=6?clamp(tw,1.5,30):clamp(tw*0.75,4,24);}
  let sw=D.sw;if(fl&32&&sw===0&&cls<6)sw=2.2;if(cls<=3&&oneway)sw=Math.min(sw,2.6);
  const name=ONAME(ni);
  return {name,type:D.type,cls,surf,w,sw,lane:(D.type==='ped'||D.type==='path'||oneway)?0:w/4,oneway,ids,pts:ids.map(i=>RN[i]),bridge:!!(fl&4),minorBridge:!!(fl&2)&&!(fl&4),round:!!(fl&8),lit:!!(fl&128)};});
const STREETS=[];
for(const r of ROADS){if(r.round)r.ring=false;}

// ---------- Brücken (Theodor-Heuss-Brücke + weitere große Brücken aus OSM, z. B. Schiersteiner Brücke) ----------
function mkBridge(name,A,B,o){const L=Math.hypot(B[0]-A[0],B[1]-A[1]);const U=[(B[0]-A[0])/L,(B[1]-A[1])/L];const br=Object.assign({name,A,B,L,U,N:[-U[1],U[0]],H:9,ramp:75,hw:11.2,arch:2.2,kind:'girder',piers:[],roads:[]},o||{});
  br.bb=[Math.min(A[0],B[0])-br.hw-2,Math.min(A[1],B[1])-br.hw-2,Math.max(A[0],B[0])+br.hw+2,Math.max(A[1],B[1])+br.hw+2];return br;}
const BRIDGES=[];
const BRIDGE=ROADS.find(r=>r.bridge)||ROADS[0];
BRIDGES.push(mkBridge('Theodor-Heuss-Brücke',BRIDGE.pts[0],BRIDGE.pts[BRIDGE.pts.length-1],{kind:'arch',roads:[BRIDGE]}));
BRIDGE.w=14.4;BRIDGE.sw=0;BRIDGE.lane=3.6;
// weitere Straßenbrücken über den Rhein/Main erkennen und parallele Fahrbahnen zusammenfassen
{const rlen=r=>{let L=0;for(let i=1;i<r.pts.length;i++)L+=Math.hypot(r.pts[i][0]-r.pts[i-1][0],r.pts[i][1]-r.pts[i-1][1]);return L;};
  const cand=ROADS.filter(r=>r.minorBridge&&(r.type==='main'||r.type==='street')&&rlen(r)>130&&r.pts.some(p=>inRiver(p[0],p[1])));const used=new Set();
  for(const r of cand){if(used.has(r))continue;const grp=[r];used.add(r);const A=r.pts[0],B=r.pts[r.pts.length-1];const L=Math.hypot(B[0]-A[0],B[1]-A[1])||1;const u=[(B[0]-A[0])/L,(B[1]-A[1])/L];
    for(const o of cand){if(used.has(o))continue;const a=o.pts[0],b=o.pts[o.pts.length-1];const l2=Math.hypot(b[0]-a[0],b[1]-a[1])||1;const v=[(b[0]-a[0])/l2,(b[1]-a[1])/l2];if(Math.abs(u[0]*v[0]+u[1]*v[1])<0.96)continue;
      const m=[(a[0]+b[0])/2,(a[1]+b[1])/2];const perp=Math.abs((m[0]-A[0])*-u[1]+(m[1]-A[1])*u[0]);if(perp<45){grp.push(o);used.add(o);}}
    let t0=1e9,t1=-1e9,lmin=1e9,lmax=-1e9;for(const g of grp)for(const p of g.pts){const t=(p[0]-A[0])*u[0]+(p[1]-A[1])*u[1];const l=(p[0]-A[0])*-u[1]+(p[1]-A[1])*u[0];t0=Math.min(t0,t);t1=Math.max(t1,t);lmin=Math.min(lmin,l);lmax=Math.max(lmax,l);}
    const lc=(lmin+lmax)/2,n=[-u[1],u[0]];const P0=[A[0]+u[0]*t0+n[0]*lc,A[1]+u[1]*t0+n[1]*lc],P1=[A[0]+u[0]*t1+n[0]*lc,A[1]+u[1]*t1+n[1]*lc];
    const wmax=Math.max(...grp.map(g=>g.w));const hw=(lmax-lmin)/2+wmax/2+2.6;const nm=grp.find(g=>g.name)?.name||'Rheinbrücke';const big=t1-t0>600;
    const br=mkBridge(/Schierstein/i.test(nm)||big&&P0[0]<-3000?'Schiersteiner Brücke':nm,P0,P1,{hw,H:big?14:8,ramp:big?140:55,arch:big?3:1.2,roads:grp});
    for(const g of grp){g.bridge=true;g.minorBridge=false;g.bridgeRef=br;}BRIDGES.push(br);}}
for(const r of ROADS)if(r.bridge&&!r.bridgeRef)r.bridgeRef=BRIDGES[0];
// Kompatibilität (THB)
const BR_A=BRIDGES[0].A, BR_B=BRIDGES[0].B, BR_L=BRIDGES[0].L, BR_U=BRIDGES[0].U, BR_N=BRIDGES[0].N, BR_H=BRIDGES[0].H;
function bridgeLocal(x,z){for(const br of BRIDGES){const bb=br.bb;if(x<bb[0]||x>bb[2]||z<bb[1]||z>bb[3])continue;const dx=x-br.A[0],dz=z-br.A[1];const t=dx*br.U[0]+dz*br.U[1];if(t<0||t>br.L)continue;const l=dx*br.N[0]+dz*br.N[1];if(Math.abs(l)>br.hw)continue;return {t,l,br};}return null;}
function deckY(t,br=BRIDGES[0]){t=clamp(t,0,br.L);return br.H*smoothstep(0,br.ramp,t)*smoothstep(0,br.ramp,br.L-t)+br.arch*Math.sin(Math.PI*t/br.L);}
// Pfeiler: kleine Inseln (inner rings) im Fluss unter der Brücke, sonst regelmäßig im Wasser
for(const br of BRIDGES){for(const r of WATER_I){const a=Math.abs(polyArea(r));if(a>1500)continue;const [cx,cz]=polyCentroid(r);const dx=cx-br.A[0],dz=cz-br.A[1];const t=dx*br.U[0]+dz*br.U[1],l=dx*br.N[0]+dz*br.N[1];if(t<0||t>br.L||Math.abs(l)>br.hw+20)continue;
  let t0=1e9,t1=-1e9,l0=1e9,l1=-1e9;for(const p of r){const pt=(p[0]-br.A[0])*br.U[0]+(p[1]-br.A[1])*br.U[1],pl=(p[0]-br.A[0])*br.N[0]+(p[1]-br.A[1])*br.N[1];t0=Math.min(t0,pt);t1=Math.max(t1,pt);l0=Math.min(l0,pl);l1=Math.max(l1,pl);}
  br.piers.push({t:(t0+t1)/2,l:(l0+l1)/2,len:t1-t0,wid:l1-l0,poly:r});}
  if(!br.piers.length){for(let t=60;t<br.L-30;t+=95){const x=br.A[0]+br.U[0]*t,z=br.A[1]+br.U[1]*t;if(inRiver(x,z))br.piers.push({t,l:0,len:6,wid:br.hw*2-4,gen:true});}}
  br.piers.sort((a,b)=>a.t-b.t);}
const PIERS=BRIDGES[0].piers;

// ---------- Flächen ----------
const AREA_KIND=['park','grass','forest','square','parking','rail','pitch','construction','playground','garden','cemetery','flowerbed'];
const AREAS=OSM.areas.map(a=>({kind:AREA_KIND[a[0]],name:ONAME(a[1]),poly:decRing(a[2])}));
const PLAZAS=AREAS.filter(a=>a.kind==='square');
const PARKS=AREAS.filter(a=>a.kind==='park'||a.kind==='grass'||a.kind==='garden'||a.kind==='forest'||a.kind==='cemetery'||a.kind==='flowerbed'||a.kind==='pitch'||a.kind==='playground');
const RAILS=OSM.rail.map(r=>({tram:!!r[0],bridge:!!r[1],pts:decRing(r[2])}));
const PONDS=OSM.pond.map(p=>({fountain:!!p[0],poly:decRing(p[1])}));


// ---------- Orte ----------
const PL=OSM.pl;
const POI={
  start:[-150,-30], markt:[-20,-75], dom:[0,0], reduit:PL.reduit||[593,-808], bahnhof:[-1000,-230], hbf:[-1000,-230], polizei:PL.polizei||[-191,182],
  lack:[700,-760], klinik:[-1040,600], schloss:PL.schloss||[-273,-892], christus:PL.christus||[-535,-950], theater:PL.theater||[-203,-72],
  fastnacht:PL.fastnacht||[-428,83], zitadelle:[40,640], rathaus:PL.rathaus||[174,-189], stephan:PL.stephan||[-367,348], winterhafen:[800,600], zollhafen:[-700,-1400],
  kupferberg:PL.kupferberg||[-781,150], holzturm:PL.holzturm||[294,186], eisenturm:PL.eisenturm||[95,-256], rtheater:PL.rtheater||[288,631], deutschhaus:PL.deutschhaus||[-160,-739],
};
// Stadtteile (grob nach realer Lage)
const PLACES=(OSM.places||[]).filter(p=>p[1]==='suburb'||p[1]==='quarter'||p[1]==='village'||p[1]==='town').map(p=>({name:p[0],kind:p[1],x:p[2],z:p[3]}));
function districtAt(x,z){
  if(rhineSide(x,z)>0){let best=null,bd=1e9;for(const p of PLACES){if(p.rs===undefined)p.rs=rhineSide(p.x,p.z);if(p.rs<=0)continue;const d=Math.hypot(p.x-x,p.z-z);if(d<bd){bd=d;best=p;}}if(best&&bd<1800)return best.name.startsWith('Mainz')||best.name.startsWith('Wiesbaden')||best.name==='Dichterviertel'||best.z<-4450?best.name:'Mainz-'+best.name;return z<-300?'Mainz-Kastel':'Mainz-Kostheim';}
  if(x>-1300&&x<1300&&z>-1550&&z<1050){
    if(Math.hypot(x-40,z-660)<170)return 'Zitadelle';
    if(x<-820&&z>-480&&z<150)return 'Hauptbahnhof';
    if(z<-390||(x<-650&&z<-300))return 'Neustadt';
    if(z>420||(x<-560&&z>60))return 'Oberstadt';
    if(z>-160&&x>-480)return 'Altstadt';
    return 'Innenstadt';}
  let best=null,bd=1e9;for(const p of PLACES){if(p.rs===undefined)p.rs=rhineSide(p.x,p.z);if(p.rs>0)continue;const d=Math.hypot(p.x-x,p.z-z)*(p.kind==='quarter'?1.15:1);if(d<bd){bd=d;best=p;}}
  return best?best.name:'Mainz';}
const ZONES=[];
