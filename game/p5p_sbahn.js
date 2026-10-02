// ===================== 30 S-Bahn Mainz – Wiesbaden mitfahren =====================
// Eine S8 pendelt zwischen Mainz Hbf (Gleis 4) und Wiesbaden Hbf über die Kaiserbrücke. E/F an der offenen Tür steigt ein,
// man sitzt im Abteil (Innenansicht). Lange, langweilige Abschnitte laufen im Zeitraffer (Abblende + Sprung), über die
// Kaiserbrücke fährt man in Echtzeit. Durchsagen auf Meenzerisch/Hessisch, Verspätungs-Gags, ab und zu ein Halt auf der Brücke.
// Fahrschein + Kontrolle über die Straßenbahn-Funktionen (p5j_straba.js): B am Bahnsteig kauft, B bei der Kontrolle zahlt,
// wer bis zur Endstation nicht zahlt, haut beim Aussteigen ab (1 Stern).
// Strecke: offline aus den OSM-Gleisen (RAILS ohne Straßenbahn) zusammengesetzt – Hbf-Gleis 4 → Mainz Nord → Kaiserbrücke →
// Amöneburg → Wiesbaden Hbf, vereinfacht (Douglas-Peucker 0,25 m). Der Gleisgraph braucht zur Laufzeit zu lange und hat an
// Weichen winzige Querstücke; die feste Linie spart beides. test_sbahn prüft, dass sie auf den Gleisen liegt.
const SBAHN_PTS=[[-1031.3,-142.1],[-1094.2,-253.5],[-1120.8,-298.2],[-1164.3,-374.7],[-1241.5,-505.8],[-1259.7,-532.2],[-1317.9,-609.7],[-1333.2,-630.5],[-1338.3,-638.5],[-1339.4,-637.8],[-1355.9,-656.8],[-1355.1,-657.5],[-1647.7,-1040.8],[-1748.3,-1174.1],[-1778.5,-1220],[-1783.4,-1226.3],[-1792.9,-1240.1],[-1806.4,-1264.5],[-1844.5,-1314.3],[-1896.2,-1386.4],[-1940,-1448.9],[-1971.8,-1492.8],[-2056,-1603.8],[-2070.7,-1622.4],[-2110.1,-1673.8],[-2150.4,-1724.7],[-2164.9,-1746.5],[-2176.5,-1766.5],[-2185.4,-1784.3],[-2196.1,-1808],[-2204.4,-1831.4],[-2211.1,-1853.5],[-2216.8,-1877.6],[-2219.2,-1890.2],[-2222.3,-1911],[-2224.8,-1940.3],[-2224.5,-1968.9],[-2223.4,-1990.8],[-2220.7,-2012.8],[-2216.3,-2038.2],[-2209.8,-2065.3],[-2201.8,-2091.2],[-2191.3,-2118.1],[-2184,-2134.2],[-2171.4,-2157.8],[-2162.2,-2172.8],[-2144.6,-2198.2],[-2124.3,-2222.3],[-2097.3,-2251.1],[-2076.5,-2268.3],[-2052.4,-2286.3],[-2024.8,-2303.7],[-2008.8,-2312.3],[-1991.5,-2320.8],[-1964.1,-2332.2],[-1874.6,-2365.3],[-1850.6,-2375.3],[-1821.9,-2388.2],[-1783.9,-2403.3],[-1768.3,-2408.8],[-1743.3,-2419.6],[-1717.9,-2432.3],[-1684,-2452.6],[-1656.9,-2471.6],[-1640.8,-2483.9],[-1593.2,-2527.6],[-1334,-2736.9],[-1017.9,-2993.8],[-917,-3073.8],[-848.8,-3129.7],[-687.4,-3259.8],[-633.8,-3304],[-588.4,-3343.1],[-563.4,-3367.8],[-537.6,-3397.5],[-525.2,-3413.7],[-513.7,-3430.5],[-503,-3447.9],[-489.4,-3473.3],[-480.9,-3492],[-471.9,-3515.3],[-467.1,-3530.8],[-462.8,-3547.5],[-459.5,-3564.4],[-457.5,-3579.1],[-456.2,-3593.9],[-455.7,-3608.7],[-456.7,-3641.8],[-458.3,-3659.9],[-460.9,-3677.9],[-464.4,-3695.8],[-468.9,-3713.4],[-474.2,-3730.8],[-480.5,-3747.9],[-487.6,-3764.7],[-500.4,-3789.9],[-510.1,-3806.1],[-520.6,-3821.8],[-532,-3836.9],[-544.1,-3851.4],[-557,-3865.2],[-570.7,-3878.2],[-717.4,-4005.5],[-937.7,-4195.2],[-955.2,-4212.8],[-980,-4240.4],[-998.5,-4263.7],[-1010.8,-4280.2],[-1051.8,-4338.4],[-1080.9,-4383.9],[-1148.8,-4496.9],[-1169,-4543.9],[-1192.8,-4594.5],[-1203.6,-4616],[-1232.5,-4664.6],[-1240.2,-4679.2],[-1256.4,-4714.3],[-1272.9,-4745.3],[-1283.5,-4763.8],[-1299.7,-4796.4],[-1307.9,-4815.3],[-1320.4,-4848.5],[-1329.4,-4874.4],[-1335.4,-4896.7],[-1353.6,-4988.5],[-1358.6,-5023.4],[-1364.3,-5099.1],[-1365,-5119.5],[-1365.3,-5156.5],[-1364.5,-5186.4],[-1363.2,-5210.7],[-1358.3,-5267],[-1335.9,-5490.6],[-1322.7,-5700.9],[-1320.4,-5759.1],[-1320,-5826.9],[-1322,-5899.6],[-1326,-5961.8],[-1328.6,-5992.3],[-1331.7,-6020.1],[-1339.3,-6080.4],[-1350,-6142.1],[-1360.2,-6185.2],[-1385.8,-6279],[-1403.1,-6336.5],[-1425.2,-6401.3],[-1436,-6428.7],[-1451.7,-6464.4],[-1480.7,-6519.2],[-1492.3,-6538.1],[-1516.8,-6574.9],[-1544.7,-6614.5],[-1582.7,-6664.4],[-1629.3,-6729],[-1664.5,-6782.6],[-1767.9,-6952.7],[-1811.9,-7030.7],[-1836.1,-7071.2],[-1856.7,-7107.3],[-1880.7,-7152.2],[-1899.9,-7197],[-1914.1,-7224.3],[-1921,-7242.3],[-1924.7,-7254.3],[-1937.7,-7311.7],[-1957,-7387.1],[-1965.1,-7420.9],[-1979.5,-7476.5],[-1993.8,-7534.7],[-2021,-7641.8],[-2044.4,-7736.9],[-2076.6,-7822.3]];
// Kaiserbrücke: Enden des OSM-Brückengleises (Fallback, falls es in RAILS fehlt)
const SBAHN_BRIDGE_ENDS=[[-1593.2,-2527.6],[-917,-3073.8]];
// s = Lage der Zugmitte entlang der Strecke (0 = Südende Gleis 4 in Mainz). dir +1 Richtung Wiesbaden, -1 Richtung Mainz.
const SBAHN={route:null,train:null,riding:null,trip:null,anns:[],lastArrival:null,lastAlight:null,bridge:null,platform:null,hud:null,annEl:null,annT:0,
  VMAX:30,ACC:1.0,DEC:1.1,DWELL:35,DOOR_T:1.5,CL:22,GAP:1.2,W:2.9,FLOOR:1.05,DOOR_Z:5.2,DOOR_W:1.4,
  SKIP_OUT:150,SKIP_IN:420,BR_PRE:150,BR_POST:110,JUMP_GUARD:600,
  CONTROL_CHANCE:0.5,GAG_CHANCE:0.35,GAG_T:6,forceControl:null,forceDelay:null,forceGag:null,
  sMz:144,sWi:0,sB0:0,sB1:0,sideMz:1,sideWi:1,fade:0,tripN:0,fn:null};
const SBAHN_TXT={
  depart:{1:'Gude un willkomme in de S8 nach Wiesbaden Hauptbahnhof! Nächster Halt: Wiesbaden Hbf. Mainz Nord un Wiesbaden Ost lasse mer heut aus – die wisse Bescheid.',
    '-1':'Gude, hier spricht Ihr Zugbegleiter aus Biebrich. Die S8 fährt nach Mainz Hauptbahnhof – mer mache aach rüwwer ins schöne Meenz, gell.'},
  bridge:['Mir fahre jetzt über die Kaiserbrücke. Links sehe Se de Rhoi – un rechts sehe Se … aach de Rhoi.','Kaiserbrücke! Bitte winke Se de Schiffer zu, die freue sich.',
    'Achtung, mir überquere jetzt de Rhoi. Wer seekrank wird: Des is e Brück, kää Schiff.'],
  arrive:{wi:'Wiesbaden Hauptbahnhof. Endstation – bitte alle aussteige, un vergesse Se Ihr Fleischworscht-Weck net!',
    mz:'Mainz Hauptbahnhof. Endstation. Willkomme dahoam in Meenz – Helau!'},
  warn:'Bitte einsteige, die Türe schließe selbsttätig. Un net mit em Fuß uffhalte, gell!',
  onTime:'Information zu S8 nach {dest}: heut pünktlich. Mir sin selbst ganz überrascht.',
  delay:'Information zu S8 nach {dest}: Abfahrt heut ca. {min} Minute später wege {why}.',
  why:['eme Fahrgast, der mit de Tür diskutiert','ner Taub, die des Gleis net freigebe will','Reparaturarbeite am Kaffeeautomat im Führerstand',
    'em Streit, ob des jetzt Mainz-Kastel oder Wiesbaden-Kastel heißt','ner Fastnachtssitzung im letzte Wage','eme verspätete Gegezug – wie immer',
    'Verzögerunge im Betriebsablauf – de Lokführer sucht sei Weckglas Fleischworscht'],
  gag:['Kurzer Halt uff de Kaiserbrück: Unser Lokführer genießt die Aussicht. Weiterfahrt glei.','Mir halte kurz – e Schiff hat gehupt, un mer hupe zurück. Des is Tradition.',
    'Außerplanmäßiger Halt: E Möw sitzt uff em Signal un guckt uns streng an.'],
  resume:'So, weiter geht\'s. Die Möw hat\'s erlaubt.',
  chat:['Ei gude wie?','Ich fahr nach Wiesbade. Freiwillig.','Die Brück hat de Kaiser gebaut. Odder sei Nachbar.','Mei Fahrschein? Den hat mei Hund gefresse.',
    'Do driwwe is Kastel. Odder Kostheim. Odder Amöneburg.','Wenn die S-Bahn pünktlich is, stimmt was net.']};

// ---------------- Strecke ----------------
function sbahnProject(x,z){const R=SBAHN.route,P=R.pts;let bd=1e9,bs=0;
  for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i];if(Math.min(a[0],b[0])-bd>x||Math.max(a[0],b[0])+bd<x||Math.min(a[1],b[1])-bd>z||Math.max(a[1],b[1])+bd<z)continue;
    const dx=b[0]-a[0],dz=b[1]-a[1],L2=dx*dx+dz*dz||1;const t=clamp(((x-a[0])*dx+(z-a[1])*dz)/L2,0,1);const d=Math.hypot(a[0]+dx*t-x,a[1]+dz*t-z);if(d<bd){bd=d;bs=R.s[i-1]+t*Math.sqrt(L2);}}
  return {s:bs,d:bd};}
// Abstand zum nächsten OSM-Eisenbahngleis (nicht Straßenbahn) – für den Test der eingebetteten Strecke
function sbahnRailDist(x,z){let bd=Infinity;for(const r of RAILS){if(r.tram)continue;const P=r.pts;for(let i=1;i<P.length;i++){const a=P[i-1],b=P[i];
    if(Math.min(a[0],b[0])-bd>x||Math.max(a[0],b[0])+bd<x||Math.min(a[1],b[1])-bd>z||Math.max(a[1],b[1])+bd<z)continue;const dx=b[0]-a[0],dz=b[1]-a[1],L2=dx*dx+dz*dz||1;
    const t=clamp(((x-a[0])*dx+(z-a[1])*dz)/L2,0,1);bd=Math.min(bd,Math.hypot(a[0]+dx*t-x,a[1]+dz*t-z));}}return bd;}
function sbahnBridgeEnds(){const near=p=>sbahnProject(p[0],p[1]).d<2;let best=null,bl=0;
  for(const r of RAILS){if(r.tram||!r.bridge||r.pts.length<2)continue;const a=r.pts[0],b=r.pts[r.pts.length-1];const L=Math.hypot(b[0]-a[0],b[1]-a[1]);if(L>bl&&L>400&&near(a)&&near(b)){bl=L;best=[a,b];}}
  return best||SBAHN_BRIDGE_ENDS;}
// Bahnsteig 4/5 in Mainz: Treppe wie in buildHbf (Mitte am nächsten zur Unterführung), Seite relativ zur Fahrtrichtung +s
function sbahnMainzStop(){const S=SBAHN;const pl=(typeof HBF_PLATS!=='undefined')&&HBF_PLATS.find(p=>p.n==='4/5');if(!pl)return;let near=null,nd=1e9;
  pl.p.forEach((q,i)=>{const mx=(q[0]+q[2])/2,mz=(q[1]+q[3])/2;const d=Math.hypot(mx+1075,mz+262);if(d<nd&&i>2&&i<pl.p.length-3){nd=d;near=[mx,mz];}});if(!near)return;
  const pr=sbahnProject(near[0],near[1]);S.sMz=pr.s+20;const p=strabaPos(S.route,S.sMz);S.sideMz=((near[0]-p[0])*p[3]-(near[1]-p[1])*p[2])>=0?1:-1;}
function sbahnHalfLen(){return SBAHN.CL*1.5+SBAHN.GAP;}

// ---------------- Modell: dreiteiliger Triebzug mit Abteil ----------------
let SBAHN_GEO=null,SBAHN_MAT=null,SBAHN_GLASS=null;
function sbahnGeo(){if(SBAHN_GEO)return SBAHN_GEO;const S=SBAHN,W=S.W,hl=S.CL/2,F=S.FLOOR,DZ=S.DOOR_Z,DW=S.DOOR_W;
  const c=(r,g,b)=>({r,g,b});const body=c(0.9,0.91,0.92),red=c(0.72,0.07,0.1),roof=c(0.42,0.44,0.46),dark=c(0.12,0.12,0.13),floor=c(0.3,0.31,0.33),
    seat=c(0.16,0.29,0.5),seatB=c(0.12,0.21,0.37),ceil=c(0.93,0.93,0.9),pole=c(0.95,0.78,0.1),lamp=c(1,1,0.94),inner=c(0.8,0.81,0.8),glassF=c(0.05,0.07,0.09),light=c(1,0.96,0.82);
  const WY0=F+0.9,WY1=F+1.85,TOP=F+2.25,DH=2.0;
  const seats=[];
  const car=cab=>{const b=new GB(),g=new GB();const zEnd=cab?hl-2.2:hl;
    gbox(b,0,0.55,0,W-0.3,0.8,S.CL-1.2,dark);for(const z of [-hl+3.4,hl-3.4])gbox(b,0,0.42,z,W-0.45,0.62,2.8,dark);                     // Unterbau, Drehgestelle
    gbox(b,0,F-0.05,0,W,0.1,S.CL,floor);gbox(b,0,TOP+0.03,0,W,0.06,S.CL,ceil);gbox(b,0,TOP+0.33,0,W-0.25,0.55,S.CL-0.4,roof);             // Boden, Decke, Dach
    gbox(b,0,TOP+0.75,-hl*0.45,1.5,0.3,3.2,roof);for(const x of [-0.5,0.5])gbox(b,x,TOP-0.01,0,0.18,0.02,S.CL-2,lamp);                  // Klimagerät, Lichtbänder
    for(const sx of [-1,1]){const x=sx*(W/2-0.03),xo=sx*(W/2+0.006);
      const runs=[[-hl,-DZ-DW/2],[-DZ+DW/2,DZ-DW/2],[DZ+DW/2,hl]];
      for(const [z0,z1] of runs){gbox(b,x,(F+WY0)/2,(z0+z1)/2,0.06,WY0-F,z1-z0,body);gbox(b,x,(WY1+TOP)/2,(z0+z1)/2,0.06,TOP-WY1,z1-z0,body);
        gbox(b,xo,F+0.3,(z0+z1)/2,0.02,0.36,z1-z0,red);                                                                                      // roter Streifen außen
        const za=z0,zb=Math.min(z1,zEnd);if(zb-za<0.6){gbox(b,x,(WY0+WY1)/2,(z0+z1)/2,0.06,WY1-WY0,z1-z0,body);continue;}
        if(z1>zb)gbox(b,x,(WY0+WY1)/2,(zb+z1)/2,0.06,WY1-WY0,z1-zb,body);                                                                    // Führerstand: keine Seitenfenster
        const n=Math.max(1,Math.round((zb-za)/2.3));const step=(zb-za)/n;
        for(let k=0;k<=n;k++){const zp=za+k*step;gbox(b,x,(WY0+WY1)/2,clamp(zp,za+0.09,zb-0.09),0.08,WY1-WY0,0.18,body);
          if(k<n)gbox(g,x,(WY0+WY1)/2,zp+step/2,0.02,WY1-WY0,step-0.18,c(0.6,0.7,0.76));}}
      for(const dz of [-DZ,DZ])gbox(b,x,(F+DH+TOP)/2,dz,0.06,TOP-F-DH,DW,body);}                                                               // Wand über der Tür
    for(const zs of [-1,1]){const ze=zs*(hl-0.03);if(cab&&zs>0)continue;                                                                    // Stirnwand mit Übergangstür
      gbox(b,-(W/2+0.45)/2,(F+TOP)/2,ze,(W-0.9)/2,TOP-F,0.06,inner);gbox(b,(W/2+0.45)/2,(F+TOP)/2,ze,(W-0.9)/2,TOP-F,0.06,inner);
      gbox(b,0,(F+DH+TOP)/2,ze,0.9,TOP-F-DH,0.06,inner);gbox(b,0,F+DH/2,ze,0.9,DH,0.03,glassF);gbox(b,0,2.25,zs*(hl+S.GAP*0.27),W-0.7,2.5,S.GAP*0.55,dark);}
    if(cab){gbox(b,0,(F+TOP)/2,zEnd,W-0.06,TOP-F,0.08,inner);gbox(b,0,F+1.0,zEnd-0.05,0.8,2.0,0.03,c(0.35,0.36,0.38));                     // Führerstandswand
      gbox(b,0,(F+TOP)/2,hl+0.2,W,TOP-F+0.3,0.4,body);gbox(b,0,F+1.55,hl+0.41,W-0.5,1.0,0.03,glassF);gbox(b,0,F+0.25,hl+0.41,W-0.1,0.5,0.03,red);
      for(const sx of [-1,1])gbox(b,sx*0.95,F+0.35,hl+0.43,0.32,0.14,0.03,light);gbox(b,0,0.62,hl+0.1,1.3,0.9,0.5,dark);}
    // Sitze: Vierergruppen gegenüber, je Bank zwei Plätze; Haltestangen an den Türen
    const bays=[[-hl+(cab?0.4:0.6),-DZ-DW/2-0.9],[-DZ+DW/2+0.9,DZ-DW/2-0.9],[DZ+DW/2+0.9,zEnd-0.5]];
    for(const [z0,z1] of bays){const grp=Math.floor((z1-z0)/1.95);const off=z0+((z1-z0)-grp*1.95)/2;
      for(let k=0;k<grp;k++){const zA=off+k*1.95+0.38,zB=off+k*1.95+1.57;
        for(const sx of [-1,1]){const x=sx*(W/2-0.62);
          for(const [zc,fz] of [[zA,1],[zB,-1]]){gbox(b,x,F+0.22,zc,0.98,0.44,0.5,seat);gbox(b,x,F+0.8,zc-fz*0.28,0.98,0.72,0.1,seatB);
            if(!cab)for(const lx of [sx*(W/2-0.38),sx*(W/2-0.86)])seats.push({lx,lz:zc,face:fz,win:Math.abs(lx)>W/2-0.5});}}}}
    for(const dz of [-DZ,DZ])for(const sx of [-1,1])gbox(b,sx*0.55,(F+TOP)/2,dz,0.05,TOP-F,0.05,pole);
    return {body:b.geo(),glass:g.geo()};};
  const leaf=dir=>{const b=new GB();for(const sx of [-1,1])for(const dz of [-DZ,DZ]){const z=dz+dir*DW/4;
      gbox(b,sx*(W/2+0.02),F+0.5,z,0.05,1.0,DW/2,red);gbox(b,sx*(W/2+0.02),F+1.5,z,0.05,1.0,DW/2,c(0.08,0.1,0.12));}return b.geo();};
  const cabG=car(true),midG=car(false);
  SBAHN_GEO={cab:cabG.body,cabGlass:cabG.glass,mid:midG.body,midGlass:midG.glass,leafA:leaf(-1),leafB:leaf(1),sign:new THREE.PlaneGeometry(1.7,0.3),seats};
  SBAHN_MAT=stdMat({vertexColors:true,roughness:0.5,metalness:0.12});
  SBAHN_GLASS=new THREE.MeshStandardMaterial({color:0x9ab3c2,transparent:true,opacity:0.22,roughness:0.1,metalness:0.2,depthWrite:false});
  return SBAHN_GEO;}
function sbahnSignTex(dest){return freeAfterUpload(canvasTex(256,48,(g,w,h)=>{g.fillStyle='#0b0b0b';g.fillRect(0,0,w,h);g.fillStyle='#ffb300';g.font='700 30px Arial';g.textBaseline='middle';
  g.fillText('S8',8,h/2+1);g.font='600 24px Arial';g.fillText(dest,58,h/2+1,w-64);},false));}
function sbahnMakeTrain(){const S=SBAHN,G=sbahnGeo();const signs=[new THREE.MeshBasicMaterial({map:sbahnSignTex('Mainz Hbf')}),new THREE.MeshBasicMaterial({map:sbahnSignTex('Wiesbaden Hbf')})];
  const cars=[];for(let k=0;k<3;k++){const cab=k!==1;const g=new THREE.Group();const inner=new THREE.Group();if(k===2)inner.rotation.y=Math.PI;g.add(inner);
    const body=new THREE.Mesh(cab?G.cab:G.mid,SBAHN_MAT);body.castShadow=true;body.receiveShadow=false;const glass=new THREE.Mesh(cab?G.cabGlass:G.midGlass,SBAHN_GLASS);glass.renderOrder=2;
    const dA=new THREE.Mesh(G.leafA,SBAHN_MAT),dB=new THREE.Mesh(G.leafB,SBAHN_MAT);inner.add(body);inner.add(glass);inner.add(dA);inner.add(dB);
    let sign=null;if(cab){sign=new THREE.Mesh(G.sign,signs[1]);sign.position.set(0,S.FLOOR+2.05,S.CL/2+0.42);inner.add(sign);}
    scene.add(g);cars.push({g,dA,dB,sign,x:0,z:0,h:0});}
  return {cars,signs,s:S.sMz,v:0,dir:1,state:'dwell',depT:0,doors:1,x:0,z:0,h:0,visible:true,jumps:0,gagT:0,warned:false,soundT:0};}
function sbahnPlace(){const S=SBAHN,T=S.train,R=S.route,off=S.CL+S.GAP;
  T.cars.forEach((c,k)=>{const sk=T.s+(1-k)*off;const a=strabaPos(R,sk+7.5),b=strabaPos(R,sk-7.5);c.x=(a[0]+b[0])/2;c.z=(a[1]+b[1])/2;c.h=Math.atan2(a[0]-b[0],a[1]-b[1]);});
  const m=T.cars[1];T.x=m.x;T.z=m.z;T.h=m.h;}
function sbahnSync(){const S=SBAHN,T=S.train;let near=false;for(const P of PLAYERS){if(!P.h)continue;const [px,pz]=ppos(P);if(Math.abs(px-T.x)<1500&&Math.abs(pz-T.z)<1500){near=true;break;}}
  if(near!==T.visible){T.visible=near;for(const c of T.cars)c.g.visible=near;}if(!near)return;const o=T.doors*S.DOOR_W/2*0.95;
  for(const c of T.cars){c.g.position.set(c.x,0,c.z);c.g.rotation.y=c.h;c.dA.position.z=-o;c.dB.position.z=o;if(c.sign)c.sign.material=T.signs[T.dir>0?1:0];}}

// ---------------- Kaiserbrücke + Bahnsteig Wiesbaden ----------------
function sbahnBuildBridge(){const S=SBAHN,R=S.route,b=new GB();const steel={r:0.26,g:0.32,b:0.3},deck={r:0.38,g:0.39,b:0.4},stone={r:0.6,g:0.42,b:0.33},rail={r:0.45,g:0.42,b:0.4};
  const P=(s,lat,y)=>{const p=strabaPos(R,s);return [p[0]+p[3]*lat,y,p[1]-p[2]*lat];};const head=s=>{const p=strabaPos(R,s);return Math.atan2(p[2],p[3]);};
  const a0=S.sB0-12,a1=S.sB1+12;
  for(let s=a0;s<a1;s+=6){const q=P(s+3,0,0);b.box(q[0],-1.7,q[2],6.4,1.75,6.08,head(s+3),deck);
    for(const lat of [-3.05,3.05]){b.beam(P(s,lat,1.15),P(s+6,lat,1.15),0.07,0.07,steel);const q2=P(s,lat,0);b.box(q2[0],0.05,q2[2],0.08,1.1,0.08,0,steel);}
    for(const lat of [-0.72,0.72])b.beam(P(s,lat,0.1),P(s+6,lat,0.1),0.09,0.12,rail);}
  // Strombrücken (Wasser) bekommen Bogenträger, Land/Insel nur Pfeiler
  const wet=s=>{const p=strabaPos(R,s);const i=idx(p[0],p[1]);return i>=0&&(mfG(i)&4)!==0;};const spans=[];let st=null;
  for(let s=S.sB0;s<=S.sB1;s+=4){const w=wet(s);if(w&&st===null)st=s;if((!w||s+4>S.sB1)&&st!==null){if(s-st>40)spans.push([st,s]);st=null;}}
  const merged=[];for(const sp of spans){const l=merged[merged.length-1];if(l&&sp[0]-l[1]<30)l[1]=sp[1];else merged.push(sp.slice());}
  const arches=[];for(const [w0,w1] of merged){const n=Math.max(1,Math.round((w1-w0)/125));const L=(w1-w0)/n;for(let k=0;k<n;k++)arches.push([w0+k*L,w0+(k+1)*L]);}
  const pier=s=>{const q=P(s,0,0);b.box(q[0],-9,q[2],7.8,7.35,3.6,head(s),stone);};
  for(const [s0,s1] of arches){const L=s1-s0,H=clamp(L*0.12,8,15),N=12;pier(s0);pier(s1);
    const pt=(k,lat)=>{const u=k/N;return P(s0+L*u,lat,0.2+H*4*u*(1-u));};
    for(const lat of [-3.2,3.2]){for(let k=0;k<N;k++){b.beam(pt(k,lat),pt(k+1,lat),0.5,0.7,steel);
        const d0=P(s0+L*k/N,lat,0.1),d1=P(s0+L*(k+1)/N,lat,0.1);b.beam(k<N/2?d0:d1,k<N/2?pt(k+1,lat):pt(k,lat),0.16,0.16,steel);}
      for(let k=1;k<N;k++){const top=pt(k,lat);b.beam(P(s0+L*k/N,lat,0.1),top,0.2,0.2,steel);}}
    for(let k=1;k<N;k++){const l=pt(k,-3.2),r=pt(k,3.2);if(l[1]>5.6)b.beam(l,r,0.22,0.3,steel);}}
  let last=-1e9;for(let s=S.sB0+20;s<S.sB1-10;s+=40){if(wet(s)||arches.some(([s0,s1])=>s>s0-20&&s<s1+20)||s-last<30)continue;pier(s);last=s;}
  const m=new THREE.Mesh(b.geo(),stdMat({vertexColors:true,roughness:0.6,metalness:0.35}));m.castShadow=true;m.receiveShadow=true;scene.add(m);staticMesh(m);
  const mid=strabaPos(R,(S.sB0+S.sB1)/2);label('Kaiserbrücke',mid[0],mid[1],'small');
  S.bridge={mesh:m,arches,len:S.sB1-S.sB0};}
function sbahnBuildPlatform(){const S=SBAHN,R=S.route,b=new GB(),sd=S.sideWi;const grey={r:0.66,g:0.65,b:0.62},white={r:0.95,g:0.95,b:0.95},wood={r:0.54,g:0.35,b:0.19},st={r:0.29,g:0.33,b:0.38};
  const s0=R.L-118,s1=R.L-3,wid=5,c0=S.W/2+0.15;
  for(let s=s0;s<s1;s+=5){const p=strabaPos(R,s+2.5),h=Math.atan2(p[2],p[3]),nx=p[3]*sd,nz=-p[2]*sd;
    b.box(p[0]+nx*(c0+wid/2),0,p[1]+nz*(c0+wid/2),wid,PLAT_H,5.04,h,grey);b.box(p[0]+nx*(c0+0.45),PLAT_H,p[1]+nz*(c0+0.45),0.12,0.012,5.04,h,white);
    for(let u=0.3;u<wid;u+=0.5)for(let v=0;v<5;v+=0.5){const x=p[0]+nx*(c0+u)+p[2]*(v-2.5),z=p[1]+nz*(c0+u)+p[3]*(v-2.5);const i=idx(x,z);if(i>=0&&hgG(i)===0)stepSet(x,z,PLAT_H);}
    if(Math.round(s-s0)%30===10){b.box(p[0]+nx*(c0+3.6),PLAT_H,p[1]+nz*(c0+3.6),1.8,0.45,0.5,h+Math.PI/2,wood);}}
  const pm=strabaPos(R,R.L-50),nx=pm[3]*sd,nz=-pm[2]*sd,x=pm[0]+nx*(c0+2.5),z=pm[1]+nz*(c0+2.5);b.box(x,PLAT_H,z,0.12,2.9,0.12,0,st);
  const m=new THREE.Mesh(b.geo(),stdMat({vertexColors:true,roughness:0.85}));m.receiveShadow=true;scene.add(m);staticMesh(m);
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(3.2,0.6),new THREE.MeshBasicMaterial({map:freeAfterUpload(textTex('Wiesbaden Hbf · Gleis 4 · S8',{w:512,h:96,bg:'#16326e',fg:'#ffffff'})),side:THREE.DoubleSide}));
  sign.position.set(x,PLAT_H+3.0,z);sign.rotation.y=Math.atan2(pm[2],pm[3])+Math.PI/2;scene.add(sign);
  S.platform={mesh:m,sign,x,z,s0,s1};}

// ---------------- Fahrplan, Durchsagen ----------------
function sbahnDest(dir){return dir>0?'Wiesbaden Hbf':'Mainz Hbf';}
function sbahnNewTrip(dir){const S=SBAHN;S.tripN++;const T=SBAHN_TXT;
  const delay=S.forceDelay!==null?S.forceDelay:mpick([0,0,3,5,5,10]);const gag=S.forceGag!==null?S.forceGag:Math.random()<S.GAG_CHANCE;
  S.trip={n:S.tripN,dir,delay,why:mpick(T.why),gag,gagDone:false,bridgeAnn:false,annAt:simTime+4,boardEntry:null};return S.trip;}
function sbahnDelayText(tr){const t=tr.delay>0?SBAHN_TXT.delay:SBAHN_TXT.onTime;return t.replace('{dest}',sbahnDest(tr.dir)).replace('{min}',tr.delay).replace('{why}',tr.why);}
function sbahnStationXZ(dir){const S=SBAHN;return strabaPos(S.route,dir>0?S.sMz:S.sWi);}
function sbahnHears(x,z){const S=SBAHN;if(S.riding)return true;const P=P1;if(!P.h)return false;const [px,pz]=ppos(P);return Math.hypot(px-x,pz-z)<260;}
function sbahnAnnounce(text,kind,x,z){const S=SBAHN;S.anns.push({t:simTime,kind,text});if(S.anns.length>24)S.anns.shift();if(!sbahnHears(x,z))return;
  if(!S.annEl){const el=document.createElement('div');el.id='sbahnAnn';el.style.cssText='position:fixed;left:50%;top:108px;transform:translateX(-50%);max-width:min(720px,90vw);padding:8px 16px;border-radius:8px;'+
    'background:rgba(120,12,20,0.92);color:#fff;font:600 17px "Barlow Condensed",sans-serif;z-index:7;pointer-events:none;box-shadow:0 4px 18px rgba(0,0,0,.4);display:none';document.body.appendChild(el);S.annEl=el;}
  S.annEl.innerHTML='🔊 <b>S8</b> · '+text;S.annEl.style.display='';S.annT=8;hbfGong();}
// Abfahrt in Mainz erscheint auf Anzeiger + Abfahrtstafel (Gleis 4 ist für die S8 reserviert)
function sbahnBoardEntry(){const S=SBAHN,T=S.train,tr=S.trip;if(typeof HBF==='undefined'||T.dir<0||tr.boardEntry)return;
  const ty=TRAIN_TYPES.find(q=>q.k==='s')||TRAIN_TYPES[0];tr.boardEntry={t:gameMin+Math.max(0,T.depT-simTime),gleis:'4',ty,line:'S8',dest:'Wiesbaden Hbf',delay:tr.delay,ann:true,spawned:true,sbahn:true};
  HBF.sched.push(tr.boardEntry);if(HBF.built){drawBoard();drawDisplay('4');}}
function sbahnBoardClear(){const tr=SBAHN.trip;if(!tr||!tr.boardEntry||typeof HBF==='undefined')return;const i=HBF.sched.indexOf(tr.boardEntry);if(i>=0)HBF.sched.splice(i,1);tr.boardEntry=null;if(HBF.built){drawBoard();drawDisplay('4');}}
const _sbahnSchedTrain=schedTrain;
schedTrain=function(){_sbahnSchedTrain();for(let i=HBF.sched.length-1;i>=0;i--){const e=HBF.sched[i];if(e.gleis==='4'&&!e.sbahn&&!e.spawned)HBF.sched.splice(i,1);}};

// ---------------- Zug: Halt, Fahrt, Zeitraffer ----------------
// Stellt den Zug abfahrbereit an eine Endstation (dir +1: Mainz → Wiesbaden). Auch für Tests.
function sbahnStation(dir,depIn){const S=SBAHN,T=S.train;sbahnBoardClear();T.dir=dir;T.s=dir>0?S.sMz:S.sWi;T.v=0;T.state='dwell';T.doors=1;T.warned=false;
  const tr=sbahnNewTrip(dir);T.depT=simTime+(depIn===undefined?S.DWELL:depIn)+tr.delay;sbahnPlace();sbahnBoardEntry();return tr;}
function sbahnWatched(s){const p=strabaPos(SBAHN.route,s);for(const P of PLAYERS){if(!P.h||sbahnRideOf(P))continue;const [px,pz]=ppos(P);if(Math.hypot(px-p[0],pz-p[1])<SBAHN.JUMP_GUARD)return true;}return false;}
function sbahnSkipTarget(){const S=SBAHN,T=S.train,s=T.s;
  if(T.dir>0){if(s>S.sMz+S.SKIP_OUT&&s<S.sB0-S.BR_PRE-1)return S.sB0-S.BR_PRE;if(s>S.sB1+S.BR_POST&&s<S.sWi-S.SKIP_IN-1)return S.sWi-S.SKIP_IN;}
  else{if(s<S.sWi-S.SKIP_OUT&&s>S.sB1+S.BR_PRE+1)return S.sB1+S.BR_PRE;if(s<S.sB0-S.BR_POST&&s>S.sMz+S.SKIP_IN+1)return S.sMz+S.SKIP_IN;}
  return null;}
function sbahnSkip(){const S=SBAHN,T=S.train;const to=sbahnSkipTarget();if(to===null||sbahnWatched(T.s)||sbahnWatched(to))return;
  T.s=to;T.jumps++;sbahnPlace();const R=S.riding;if(!R)return;R.jumps++;S.fade=1;sbahnSeat(R.P);const x=R.P.h.x,z=R.P.h.z;
  lampAssignT=0;updateCityLOD(0,0,99,true,[[x,z]]);updateGround(0,0,true,99,[[x,z]]);managePopulation(0,true);}
function sbahnArrive(){const S=SBAHN,T=S.train,tr=S.trip;const at=T.dir>0?'wi':'mz';T.state='dwell';T.v=0;T.s=T.dir>0?S.sWi:S.sMz;T.doors=0;T.warned=false;sbahnPlace();
  S.lastArrival={where:at,t:simTime,trip:tr.n,jumps:T.jumps};const p=strabaPos(S.route,T.s);sbahnAnnounce(SBAHN_TXT.arrive[at],'arrive',p[0],p[1]);
  if(S.riding)S.riding.arrived=true;T.jumps=0;
  const nt=sbahnNewTrip(-T.dir);T.dir=-T.dir;T.depT=simTime+S.DWELL+nt.delay;sbahnBoardEntry();}
function sbahnStep(dt){const S=SBAHN,T=S.train,tr=S.trip;
  if(T.state==='dwell'){const closing=simTime>=T.depT-S.DOOR_T;T.doors=clamp(T.doors+(closing?-dt:dt)/S.DOOR_T,0,1);
    if(!T.warned&&simTime>=T.depT-10){T.warned=true;const p=strabaPos(S.route,T.s);sbahnAnnounce(SBAHN_TXT.warn,'warn',p[0],p[1]);}
    if(simTime>=T.depT&&T.doors<=0){T.state='run';sbahnBoardClear();const p=strabaPos(S.route,T.s);sbahnAnnounce(SBAHN_TXT.depart[T.dir],'depart',p[0],p[1]);}
    return;}
  if(T.state==='gag'){T.gagT-=dt;if(T.gagT<=0){T.state='run';sbahnAnnounce(SBAHN_TXT.resume,'resume',T.x,T.z);}return;}
  const target=T.dir>0?S.sWi:S.sMz;const dist=(target-T.s)*T.dir;let vmax=Math.min(S.VMAX,Math.sqrt(2*S.DEC*Math.max(0,dist)));
  if(tr.gag&&!tr.gagDone){const dm=((S.sB0+S.sB1)/2-T.s)*T.dir;if(dm>-1){vmax=Math.min(vmax,Math.sqrt(2*S.DEC*Math.max(0,dm)));
      if(dm<0.6&&T.v<0.6){tr.gagDone=true;T.state='gag';T.gagT=S.GAG_T;T.v=0;sbahnAnnounce(mpick(SBAHN_TXT.gag),'gag',T.x,T.z);return;}}}
  T.v=T.v<vmax?Math.min(vmax,T.v+S.ACC*dt):Math.max(vmax,T.v-S.DEC*2*dt);T.s+=T.v*dt*T.dir;
  const onBridge=T.s>S.sB0&&T.s<S.sB1;if(onBridge&&!tr.bridgeAnn){tr.bridgeAnn=true;sbahnAnnounce(mpick(SBAHN_TXT.bridge),'bridge',T.x,T.z);}
  sbahnSkip();if(dist<0.3&&T.v<0.3)sbahnArrive();}
// Wer auf dem Gleis steht, wird zur Seite geschoben – bei Fahrt gibt's Schaden
function sbahnPush(){const S=SBAHN,T=S.train;if(!T.visible)return;const hl=S.CL/2,hw=S.W/2;
  for(const P of PLAYERS){const h=P.h;if(!h||P.car||h.room||sbahnRideOf(P)||h.y>4||Math.abs(h.x-T.x)>60||Math.abs(h.z-T.z)>60)continue;
    for(const c of T.cars){const fx=Math.sin(c.h),fz=Math.cos(c.h);const dx=h.x-c.x,dz=h.z-c.z;const lz=dx*fx+dz*fz,lx=dx*fz-dz*fx;
      if(Math.abs(lz)<hl&&Math.abs(lx)<hw+0.3){const sd=lx>=0?1:-1;const pen=hw+0.35-Math.abs(lx);h.x+=fz*sd*pen;h.z+=-fx*sd*pen;
        if(T.v>2&&!(P.sbahnHitT>simTime)){P.sbahnHitT=simTime+2;damagePlayer(P,15+T.v*2);P.vy=4;showBig('VON DER S-BAHN ERWISCHT','fail',2,'Gleise sind kein Gehweg!');}break;}}}}

// ---------------- Mitfahren ----------------
function sbahnRideOf(P){const R=SBAHN.riding;return R&&R.P===P?R:null;}
function sbahnDoorPoints(){const S=SBAHN,T=S.train,out=[];for(const c of T.cars){const fx=Math.sin(c.h),fz=Math.cos(c.h);
  for(const dz of [-S.DOOR_Z,S.DOOR_Z])for(const sd of [-1,1])out.push([c.x+fx*dz+fz*sd*(S.W/2+0.6),c.z+fz*dz-fx*sd*(S.W/2+0.6),sd]);}return out;}
function sbahnDoorNear(P){const S=SBAHN,T=S.train,h=P.h;if(!T||!h||P.car||h.room||S.riding||T.state!=='dwell'||T.doors<0.5)return false;
  if(Math.abs(h.x-T.x)>50||Math.abs(h.z-T.z)>50)return false;return sbahnDoorPoints().some(d=>Math.hypot(d[0]-h.x,d[1]-h.z)<2.4);}
// am Bahnsteig einer Endstation (für Fahrschein + HUD): 'mz' | 'wi' | null
function sbahnPlatformNear(P){const S=SBAHN,h=P.h;if(!S.route||!h||P.car||h.room||sbahnRideOf(P))return null;
  for(const [k,s,w] of [['mz',S.sMz,110],['wi',S.sWi,90]]){const p=strabaPos(S.route,s);if(Math.abs(h.x-p[0])>w+20||Math.abs(h.z-p[1])>w+20)continue;
    const pr=sbahnProject(h.x,h.z);if(pr.d<9&&Math.abs(pr.s-s)<w)return k;}return null;}
function sbahnSeatWorld(R){const S=SBAHN,c=S.train.cars[1],cs=Math.cos(c.h),sn=Math.sin(c.h);return [c.x+cs*R.seat.lx+sn*R.seat.lz,c.z-sn*R.seat.lx+cs*R.seat.lz];}
function sbahnSeat(P){const R=sbahnRideOf(P);if(!R)return;const h=P.h,c=SBAHN.train.cars[1];const [x,z]=sbahnSeatWorld(R);h.x=x;h.z=z;h.y=SBAHN.FLOOR;h.vx=h.vz=0;
  h.facing=c.h+(R.seat.face>0?0:Math.PI);h.g.visible=false;h.sync();}
function sbahnPickSeat(dir){const seats=sbahnGeo().seats.filter(q=>q.win&&q.face===dir);seats.sort((a,b)=>Math.abs(a.lz)-Math.abs(b.lz));return seats[0]||sbahnGeo().seats[0];}
function sbahnSpawnPerson(lx,lz,face,sit){const h=new Human('ped');h.state='sbahn';h.sbahn={lx,lz,face};if(sit){h.hips.position.y=0.55;h.legL.rotation.x=-1.5;h.legR.rotation.x=-1.5;}
  sbahnPosePerson(h);return h;}
function sbahnPosePerson(h){const c=SBAHN.train.cars[1],q=h.sbahn,cs=Math.cos(c.h),sn=Math.sin(c.h);h.x=c.x+cs*q.lx+sn*q.lz;h.z=c.z-sn*q.lx+cs*q.lz;h.y=SBAHN.FLOOR;
  h.facing=c.h+(q.face>0?0:Math.PI);h.sync();}
function sbahnBoard(P){const S=SBAHN,T=S.train;if(S.riding)return false;const h=P.h;const has=strabaTicketValid();
  const ctl=S.forceControl!==null?S.forceControl:Math.random()<S.CONTROL_CHANCE;const seat=sbahnPickSeat(T.dir);
  const R=S.riding={P,hasTicket:has,controlDue:ctl,controlled:false,t:0,jumps:0,arrived:false,seat,yaw0:P.cam.yaw,people:[],conductor:null,near0:P.camera.near,from:T.dir>0?'mz':'wi',chatT:5,eye:null};
  h.inCar=true;h.aiming=false;h.vx=h.vz=0;P.swim=false;sbahnSeat(P);
  const free=sbahnGeo().seats.filter(q=>q!==seat&&!(Math.abs(q.lz-seat.lz)<0.1&&Math.sign(q.lx)===Math.sign(seat.lx)));
  for(let k=0;k<3&&free.length;k++){const q=free.splice(Math.floor(Math.random()*free.length),1)[0];R.people.push(sbahnSpawnPerson(q.lx,q.lz,q.face,true));}
  P.camera.near=0.12;P.camera.updateProjectionMatrix();
  hint(`<b>S8</b> → ${sbahnDest(T.dir)}${has?' · Fahrschein gültig':' · <b>ohne Fahrschein</b> – pass uff!'}`,3,P);return true;}
function sbahnExitSpot(R){const S=SBAHN,T=S.train,c=T.cars[1];const st=Math.abs(T.s-S.sMz)<Math.abs(T.s-S.sWi)?'mz':'wi';const sd=st==='mz'?S.sideMz:S.sideWi;
  const fx=Math.sin(c.h),fz=Math.cos(c.h);const dz=R.seat.lz>=0?S.DOOR_Z:-S.DOOR_Z;return {st,x:c.x+fx*dz+fz*sd*(S.W/2+1.3),z:c.z+fz*dz-fx*sd*(S.W/2+1.3),face:Math.atan2(fz*sd,-fx*sd)};}
function sbahnUnseat(P,x,z,face){const S=SBAHN,R=S.riding,h=P.h;const [fx,fz]=blocked(x,z)?freeSpot(x,z,0.4):[x,z];h.x=fx;h.z=fz;h.y=groundY(fx,fz,3);h.inCar=false;h.g.visible=true;
  h.vx=h.vz=0;P.vy=0;P.ground=true;if(face!==undefined){h.facing=face;P.cam.yaw=face;}if(h.stand)h.stand();h.sync();
  for(const p of R.people)p.remove();if(R.conductor)R.conductor.remove();P.camera.near=R.near0;P.camera.updateProjectionMatrix();P.cam.init=false;S.riding=null;}
function sbahnAlight(P,auto){const S=SBAHN,R=sbahnRideOf(P);if(!R)return false;const T=S.train;
  if(T.state!=='dwell'||T.doors<0.3){hint('Während de Fahrt bleibt mer sitze!',1.5,P);return false;}
  const fled=!!STRABA.control&&STRABA.control.P===P;const e=sbahnExitSpot(R);sbahnUnseat(P,e.x,e.z,e.face);
  S.lastAlight={where:e.st,x:P.h.x,z:P.h.z,auto:!!auto,fled,t:simTime};
  if(fled)strabaControlFlee(P);else if(auto)showBig(e.st==='wi'?'WIESBADEN HBF':'MAINZ HBF','mission',2.2,'S8 · Gleis 4 · Endstation');
  else hint(`Ausgestiegen: <b>${e.st==='wi'?'Wiesbaden Hbf':'Mainz Hbf'}</b>`,2,P);return true;}
function sbahnStartControl(R){const S=SBAHN,dirF=R.seat.face;R.controlled=true;
  R.conductor=sbahnSpawnPerson(0,R.seat.lz+dirF*2.1,-dirF,false);R.conductor.setExpr('neutral');
  strabaControl(R.P,{hasTicket:R.hasTicket,speaker:R.conductor,where:'S-Bahn'});}
function sbahnRideStep(dt){const S=SBAHN,R=S.riding;if(!R)return;const P=R.P,T=S.train;
  if(P.gameOver||!P.h||!P.h.alive){const [x,z]=sbahnSeatWorld(R);sbahnUnseat(P,x+3,z);STRABA.control=null;return;}
  sbahnSeat(P);for(const p of R.people)if(!p.removed)sbahnPosePerson(p);if(R.conductor&&!R.conductor.removed)sbahnPosePerson(R.conductor);
  if(T.state!=='dwell'){R.t+=dt;const onBridge=T.s>S.sB0&&T.s<S.sB1;if(R.controlDue&&!R.controlled&&(onBridge||R.t>30))sbahnStartControl(R);
    R.chatT-=dt;if(R.chatT<=0&&R.people.length){R.chatT=mr(9,15);say(mpick(R.people),mpick(SBAHN_TXT.chat),3.2);}}
  if(R.arrived&&T.state==='dwell'&&T.doors>0.9)sbahnAlight(P,true);}

// ---------------- Kamera im Abteil ----------------
function sbahnCamera(P,dt){const S=SBAHN,R=sbahnRideOf(P),T=S.train,c=T.cars[1];const [x,z]=sbahnSeatWorld(R);const y=S.FLOOR+1.2;
  const travel=c.h+(T.dir>0?0:Math.PI);const win=(R.seat.lx>0?1:-1)*T.dir;const look=clamp(angDiff(R.yaw0,P.cam.yaw),-2.2,2.2);
  const a=travel+win*0.85+look,pitch=-0.06+clamp(P.cam.pitch-0.22,-0.4,0.4)*0.5;const cam=P.camera;
  const shake=T.v>1?Math.sin(simTime*13.7)*0.004*Math.min(1,T.v/20):0;R.eye=[x,y+shake,z];
  cam.position.set(x,y+shake,z);_ct.set(x+Math.sin(a)*Math.cos(pitch),y+Math.sin(pitch),z+Math.cos(a)*Math.cos(pitch));cam.lookAt(_ct);
  cam.fov+=(64-cam.fov)*Math.min(1,dt*4);cam.updateProjectionMatrix();}
const _sbahnCam=updateCamera;
updateCamera=function(P,dt){if(sbahnRideOf(P)&&SBAHN.train){sbahnCamera(P,dt);return;}_sbahnCam(P,dt);};
function sbahnFade(dt){const S=SBAHN;if(S.fade<=0&&!S.fadeOn)return;S.fade=Math.max(0,S.fade-dt*1.4);const el=renderer.domElement;
  if(S.fade>0){S.fadeOn=true;el.style.filter=`brightness(${(1-S.fade).toFixed(2)})`;}else{S.fadeOn=false;el.style.filter='';}}

// ---------------- Eingabe-Wrapper ----------------
function sbahnWantsE(P){return !!(sbahnRideOf(P)||sbahnDoorNear(P));}
function sbahnAction(P){if(P.gameOver)return false;if(sbahnRideOf(P)){sbahnAlight(P,false);return true;}if(sbahnDoorNear(P)&&!P.morph){sbahnBoard(P);return true;}return false;}
const _sbahnTryEnterExit=tryEnterExit;
tryEnterExit=function(P){if(!P.car&&sbahnAction(P))return;_sbahnTryEnterExit(P);};
const _sbahnShop=shopInteract;
shopInteract=function(P){if(sbahnWantsE(P))return false;return _sbahnShop(P);};
const _sbahnTalkCandidate=talkCandidate;
talkCandidate=function(P){return sbahnWantsE(P)?null:_sbahnTalkCandidate(P);};
const _sbahnStartTalk=startTalk;
startTalk=function(P,npc){if(sbahnRideOf(P)||(npc&&npc.state==='sbahn'))return;_sbahnStartTalk(P,npc);};
const _sbahnFoot=updatePlayerFoot;
updatePlayerFoot=function(P,I,dt){if(sbahnRideOf(P)){sbahnSeat(P);return;}_sbahnFoot(P,I,dt);};
const _sbahnFire=playerFire;
playerFire=function(P,I){if(sbahnRideOf(P))return;_sbahnFire(P,I);};
// Im Abteil ist man vor Schüssen und Schaden von draußen sicher (Banden, Polizei, Explosionen am Gleis)
const _sbahnNpcShoot=npcShoot;
npcShoot=function(n,P,d){if(sbahnRideOf(P))return;return _sbahnNpcShoot(n,P,d);};
const _sbahnDamage=damagePlayer;
damagePlayer=function(P,d){if(sbahnRideOf(P))return;return _sbahnDamage(P,d);};
const _sbahnPed=updatePed;
updatePed=function(p,dt){if(p.state!=='sbahn')_sbahnPed(p,dt);};
const _sbahnFastTravel=fastTravel;
fastTravel=function(d){if(sbahnRideOf(P1)){ftMsg('Erst aus de S-Bahn aussteige.');return;}_sbahnFastTravel(d);};
// B: am Bahnsteig Fahrschein (Straßenbahn-Tarif), in der S-Bahn nur bei der Kontrolle zahlen
const _sbahnKeyB=strabaKeyB;
strabaKeyB=function(P){const ctl=STRABA.control&&STRABA.control.P===P;
  if(!ctl&&sbahnRideOf(P)){hint('Fahrscheine gibt\'s am Automat uff\'m Bahnsteig – jetzt is zu spät.',2,P);return;}
  if(!ctl&&!P.car&&sbahnPlatformNear(P)){strabaBuyTicket(P);return;}_sbahnKeyB(P);};
addEventListener('keydown',e=>{if(e.code!=='KeyE'||e.repeat||mode!=='play'||TALK||SHOP_UI.open)return;if(sbahnAction(P1))e.stopImmediatePropagation();},true);
{const k=KEYS_HELP.find(([t])=>t==='Leute & Orte');if(k)k[1].push(['E / F (an der S-Bahn-Tür)','S8 Mainz Hbf ⇄ Wiesbaden Hbf: ein-/aussteigen'],['B (am Bahnsteig)','S-Bahn-Fahrschein kaufen']);}

// ---------------- HUD ----------------
function sbahnHudEl(){const S=SBAHN;if(S.hud)return S.hud;const hud=$('hud');if(!hud)return null;const d=document.createElement('div');d.id='sbahnHud';
  d.style.cssText='position:absolute;right:18px;top:calc(240px + env(safe-area-inset-top,0px));max-width:min(300px,calc(100vw - 36px));background:rgba(8,10,12,.82);'+
    'border-left:4px solid #2f6db5;padding:8px 12px;font:600 15px/1.35 "Barlow Condensed",Arial,sans-serif;color:#eee;display:none';
  d.addEventListener('click',e=>{if(e.target&&e.target.dataset&&e.target.dataset.sbahn)strabaKeyB(P1);});hud.appendChild(d);S.hud=d;return d;}
function sbahnHud(){const S=SBAHN,T=S.train,P=P1;const el=sbahnHudEl();if(!el)return;let html='';const tk=strabaTicketValid()?`Fahrschein: gültig, noch ${strabaTicketLeft()} min`:'Fahrschein: keiner';
  const badge='<span style="background:#2f6db5;color:#fff;padding:0 6px;border-radius:3px;margin-right:6px">S8</span>';const tr=S.trip;
  if(sbahnRideOf(P)){const togo=Math.abs((T.dir>0?S.sWi:S.sMz)-T.s);
    html=`${badge}<b>→ ${sbahnDest(T.dir)}</b><br>`+(T.state==='dwell'?(S.riding.arrived?'Endstation – aussteigen':`Abfahrt in ${Math.max(0,Math.ceil(T.depT-simTime))} s · <b>E</b> aussteigen`):`Noch ${(togo/1000).toFixed(1).replace('.',',')} km`)+`<br><small>${tk}</small>`;
    if(STRABA.control&&STRABA.control.P===P)html+=`<div style="margin-top:6px;color:#ff6b6b"><b>Fahrscheinkontrolle!</b></div>${strabaBtn('B · '+STRABA.control.fine+' € zahlen').replace('data-straba','data-sbahn')} <small>oder an der Endstation abhauen</small>`;}
  else if(T&&!P.car&&!P.gameOver){const at=sbahnPlatformNear(P);if(at){const here=(at==='mz')===(T.dir>0)&&T.state==='dwell';
      const dep=here?`Abfahrt in <b>${Math.max(0,Math.ceil(T.depT-simTime))} s</b>${tr&&tr.delay?` <span style="color:#ffd23f">(+${tr.delay} min)</span>`:''}`:'Zug unterwegs – kommt glei';
      html=`${badge}Gleis 4 → <b>${sbahnDest(at==='mz'?1:-1)}</b><br>${dep}<br><small>${tk}</small><br>`+(strabaTicketValid()?'':strabaBtn('B · Fahrschein 2,90 €').replace('data-straba','data-sbahn'))+(sbahnDoorNear(P)?' <b>E</b> einsteigen':'');}}
  if(html!==el._h){el.innerHTML=html;el._h=html;}el.style.display=html?'block':'none';}

// ---------------- Aufbau + Schleife ----------------
function setupSbahn(){const S=SBAHN;const s=strabaPolyLen(SBAHN_PTS);S.route={pts:SBAHN_PTS,s,L:s[s.length-1]};
  const [b0,b1]=sbahnBridgeEnds();const p0=sbahnProject(b0[0],b0[1]).s,p1=sbahnProject(b1[0],b1[1]).s;S.sB0=Math.min(p0,p1);S.sB1=Math.max(p0,p1);
  S.sWi=S.route.L-8-sbahnHalfLen();sbahnMainzStop();
  sbahnBuildBridge();sbahnBuildPlatform();S.train=sbahnMakeTrain();sbahnStation(1,20);sbahnSync();
  S.fn={now:()=>simTime,pos:s=>strabaPos(S.route,s),project:sbahnProject,railDist:sbahnRailDist,doors:sbahnDoorPoints,doorNear:sbahnDoorNear,platform:sbahnPlatformNear,
    station:sbahnStation,board:sbahnBoard,alight:sbahnAlight,skipTarget:sbahnSkipTarget,
    renderCalls:()=>renderer.info&&renderer.info.render?renderer.info.render.calls:-1,
    carLocal:(x,y,z)=>{const c=S.train.cars[1],dx=x-c.x,dz=z-c.z;return {lat:dx*Math.cos(c.h)-dz*Math.sin(c.h),along:dx*Math.sin(c.h)+dz*Math.cos(c.h),y};},
    geoBytes:()=>{let n=0;const add=g=>{if(!g||!g.attributes)return;for(const k in g.attributes){const a=g.attributes[k];if(a&&a.array)n+=a.array.byteLength;}if(g.index&&g.index.array)n+=g.index.array.byteLength;};
      const G=sbahnGeo();for(const k of ['cab','cabGlass','mid','midGlass','leafA','leafB'])add(G[k]);add(S.bridge.mesh.geometry);add(S.platform.mesh.geometry);return n;}};}
function updateSbahn(dt){const S=SBAHN;if(!S.train)return;sbahnStep(dt);sbahnPlace();sbahnSync();sbahnRideStep(dt);sbahnPush();
  const tr=S.trip;if(tr&&tr.annAt&&simTime>=tr.annAt){tr.annAt=0;const p=sbahnStationXZ(tr.dir);sbahnAnnounce(sbahnDelayText(tr),tr.delay>0?'delay':'ontime',p[0],p[1]);}
  if(S.annT>0){S.annT-=dt;if(S.annT<=0&&S.annEl)S.annEl.style.display='none';}
  sbahnFade(dt);sbahnHud();}
