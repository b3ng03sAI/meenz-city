// ===================== GESCHÄFTE (echte Namen und Lagen aus OpenStreetMap, begehbar) =====================
const SHOPS=[];
const SHOP_CAT_NAMES=['Bäckerei','Apotheke','Mode','Café','Restaurant','Supermarkt','Kiosk','Buchhandlung','Friseur','Bank','Juwelier','Elektronik','Sport','Laden'];
const SIGN_STYLE=[['#6b3e1f','#f6e2b8'],['#0b7a3b','#ffffff'],['#1d1d1d','#ffffff'],['#3b2a20','#f2d7a8'],['#7a1f1f','#fff1d6'],['#b5121b','#ffffff'],['#f2c500','#1b1b1b'],['#24395e','#ffffff'],['#ece4dc','#6b2a5c'],['#c80000','#ffffff'],['#121212','#d9b75a'],['#0d4f8b','#ffffff'],['#1f5d2e','#ffffff'],['#ece7dc','#2a2a2a']];
// Markenfarben (nur Farben und Schriftzug)
const BRAND_COL=[[/^rewe/i,'#cc071e','#fff'],[/^aldi/i,'#00205b','#fff'],[/^lidl/i,'#0050aa','#fff200'],[/^dm\b|^dm-drogerie/i,'#ffffff','#002878'],[/rossmann/i,'#c3002f','#fff'],[/sparkasse/i,'#ff0000','#fff'],[/commerzbank/i,'#ffcc00','#000'],[/deutsche bank/i,'#0018a8','#fff'],[/volksbank|mainzer volksbank/i,'#0066b3','#fff'],[/postbank/i,'#ffcc00','#0a2a6b'],
  [/mcdonald/i,'#da291c','#ffc72c'],[/burger king/i,'#502314','#f5ebdc'],[/starbucks/i,'#00704a','#fff'],[/subway/i,'#008c15','#ffc600'],[/h&m/i,'#ffffff','#e50010'],[/thalia/i,'#1a1a1a','#fff'],[/douglas/i,'#000000','#fff'],[/apotheke/i,'#0b7a3b','#fff'],[/edeka/i,'#ffd400','#1f3f8f'],[/penny/i,'#cd1414','#fff'],[/netto/i,'#ffe500','#d40000'],[/tegut/i,'#e30613','#fff'],[/kamps|ditsch|backwerk/i,'#6b3e1f','#f6e2b8']];
function signColors(name,cat){for(const [re,bg,fg] of BRAND_COL)if(re.test(name))return [bg,fg];return SIGN_STYLE[cat]||SIGN_STYLE[13];}
// Schilder-Atlanten (256×40 Pixel pro Schild)
const SIGN_W=256,SIGN_H=32,SIGN_COLS=8,SIGN_ROWS=64;
let SIGN_ATLASES=[];
function signAtlasCell(i){const a=Math.floor(i/(SIGN_COLS*SIGN_ROWS)),k=i%(SIGN_COLS*SIGN_ROWS);return {a,cx:k%SIGN_COLS,cy:Math.floor(k/SIGN_COLS)};}
function drawSign(g,x,y,name,cat){const [bg,fg]=signColors(name,cat);g.fillStyle=bg;g.fillRect(x,y,SIGN_W,SIGN_H);
  g.strokeStyle='rgba(0,0,0,0.35)';g.lineWidth=2;g.strokeRect(x+1,y+1,SIGN_W-2,SIGN_H-2);
  let left=x+10;if(cat===1&&!/^dm/i.test(name)){g.fillStyle='#e2001a';g.fillRect(x+4,y+4,24,24);g.fillStyle="#fff";g.font="900 21px Arial";g.textAlign="center";g.textBaseline="middle";g.fillText("A",x+16,y+17);left=x+34;}
  g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';let fs=25;g.font=`700 ${fs}px "Barlow Condensed","Arial Narrow",sans-serif`;const maxW=x+SIGN_W-10-left;
  let w=g.measureText(name).width;if(w>maxW){fs=Math.max(14,Math.floor(fs*maxW/w));g.font=`700 ${fs}px "Barlow Condensed","Arial Narrow",sans-serif`;w=g.measureText(name).width;}
  g.save();g.translate((left+x+SIGN_W-10)/2,y+SIGN_H/2+1);if(w>maxW)g.scale(maxW/w,1);g.fillText(name,0,0);g.restore();return Math.min(1,(w+(left-x)+20)/SIGN_W);}
const doorTex=canvasTex(128,256,g=>{g.fillStyle='#2b2d30';g.fillRect(0,0,128,256);const gr=g.createLinearGradient(0,0,128,256);gr.addColorStop(0,'#3b4a52');gr.addColorStop(0.5,'#1f2a30');gr.addColorStop(1,'#33424a');
  g.fillStyle=gr;g.fillRect(10,10,108,236);g.fillStyle='rgba(255,255,255,0.12)';g.beginPath();g.moveTo(14,14);g.lineTo(60,14);g.lineTo(14,120);g.fill();g.fillStyle='#b9bec2';g.fillRect(96,110,8,46);
  g.fillStyle='#e8e2d0';g.fillRect(24,150,40,26);g.fillStyle='#333';g.font='700 9px Arial';g.fillText('GEÖFFNET',27,166);},false);
const doorEmis=canvasTex(128,256,g=>{g.fillStyle='#000';g.fillRect(0,0,128,256);g.fillStyle='#8a6a3a';g.fillRect(10,10,108,236);},false);
const awnTex=canvasTex(64,64,g=>{for(let i=0;i<8;i++){g.fillStyle=i%2?'#ffffff':'#d8d8d8';g.fillRect(i*8,0,8,64);}g.fillStyle='rgba(0,0,0,0.25)';g.fillRect(0,56,64,8);});
function buildShops(){
  const list=[];const S=OSM.shops;
  for(const s of S){const [x10,z10,f1000,cat,ni,ki,len10,gid]=s;const x=x10/10,z=z10/10,face=f1000/1000;const i=idx(x,z);if(i<0)continue;
    const name=ONAME(ni);if(!name)continue;list.push({x,z,face,cat,name,kind:ONAME(ki),len:len10/10,nx:Math.sin(face),nz:Math.cos(face)});}
  // Atlanten zeichnen
  const per=SIGN_COLS*SIGN_ROWS;const nA=Math.ceil(list.length/per);const canv=[];
  for(let a=0;a<nA;a++){const c=document.createElement('canvas');c.width=SIGN_W*SIGN_COLS;c.height=SIGN_H*SIGN_ROWS;canv.push(c);}
  list.forEach((s,i)=>{const {a,cx,cy}=signAtlasCell(i);const g=canv[a].getContext('2d');s.fill=drawSign(g,cx*SIGN_W,cy*SIGN_H,s.name,s.cat);s.cell={a,cx,cy};});
  SIGN_ATLASES=canv.map(c=>{if(LOWMEM)c=shrinkCanvas(c,1024);const t=freeAfterUpload(texFromCanvas(c,false));t.wrapS=t.wrapT=THREE.ClampToEdgeWrapping;return t;});
  const signG=canv.map(()=>new GB()),back=new GB(),door=new GB(),awn=new GB();const seats=[],paras=[];
  const R=mulberry32(4242);
  for(const s of list){const gf=3.9;const nx=s.nx,nz=s.nz,tx=-nz,tz=nx;// tx/tz: entlang der Wand
    const free=(x,z)=>{const i=idx(x,z);return i>=0&&!hgG(i)&&!(mfG(i)&4);};
    // Tür
    const dw=1.5,dh=2.45,o=0.035;const P=(a,y,b)=>[s.x+tx*a+nx*b,y,s.z+tz*a+nz*b];
    door.quadOut(P(-dw/2,0.02,o),P(dw/2,0.02,o),P(dw/2,dh,o),P(-dw/2,dh,o),[0,0],[1,0],[1,1],[0,1],WHITE,P(0,1.2,-2));
    // Schild
    const sw=clamp(4.2*s.fill+0.6,2.2,Math.max(2.2,Math.min(7,s.len-0.6))),sh=0.66,sy=gf-0.95,so=0.16;const c=s.cell;const u0=c.cx/SIGN_COLS,u1=(c.cx+Math.min(1,s.fill+0.02))/SIGN_COLS,u0c=(c.cx+(1-Math.min(1,s.fill+0.02))/2)/SIGN_COLS,u1c=u0c+Math.min(1,s.fill+0.02)/SIGN_COLS;
    const v1=1-c.cy/SIGN_ROWS,v0=1-(c.cy+1)/SIGN_ROWS;
    signG[c.a].quadOut(P(-sw/2,sy,so+0.02),P(sw/2,sy,so+0.02),P(sw/2,sy+sh,so+0.02),P(-sw/2,sy+sh,so+0.02),[u0c,v0],[u1c,v0],[u1c,v1],[u0c,v1],WHITE,P(0,sy,-3));
    back.box(...(()=>{const q=P(0,0,so/2+0.01);return [q[0],sy-0.05,q[2]];})(),sw+0.12,sh+0.1,so,Math.atan2(-tz,tx),{r:0.15,g:0.15,b:0.16},1);
    // Markise
    if((s.cat===0||s.cat===3||s.cat===4||s.cat===6||s.cat===8)&&R()<0.75){const aw=sw+0.6,col=new THREE.Color(mpick([0xb3202a,0x1f5d2e,0x24395e,0x7a1f1f,0xc28a2a,0x3b2a20]));
      awn.quadOut(P(-aw/2,sy-0.12,0.05),P(aw/2,sy-0.12,0.05),P(aw/2,sy-0.65,1.35),P(-aw/2,sy-0.65,1.35),[0,1],[aw/1.2,1],[aw/1.2,0],[0,0],col,P(0,sy-3,0.5));}
    // Außengastronomie
    if((s.cat===3||s.cat===4)&&R()<0.6){for(const a of [-1.6,1.6]){const p=P(a,0,3.0);if(!free(p[0],p[2])||(mfG(idx(p[0],p[2]))&2))continue;seats.push({x:p[0],z:p[2],face:R()*TAU});if(R()<0.5)paras.push({x:p[0],z:p[2],face:0});rasterCirc(HG,p[0],p[2],0.55,2);}}
    s.doorX=s.x+nx*0.9;s.doorZ=s.z+nz*0.9;SHOPS.push(s);}
  const add=(G,mat,cast=false)=>{if(G.empty)return null;const m=new THREE.Mesh(G.geo(),mat);m.receiveShadow=true;m.castShadow=cast;scene.add(m);return m;};
  SIGN_ATLASES.forEach((t,a)=>{const m=stdMat({map:t,roughness:0.45,emissiveMap:t,emissive:0xffffff,emissiveIntensity:0});nightMats.push({m,k:0.9});add(signG[a],m);});
  add(back,stdMat({vertexColors:true,roughness:0.5,metalness:0.4}),true);
  {const m=stdMat({map:doorTex,roughness:0.15,metalness:0.3,emissiveMap:doorEmis,emissive:0xffd9a0,emissiveIntensity:0});nightMats.push({m,k:1.4});add(door,m);}
  add(awn,stdMat({map:awnTex,vertexColors:true,roughness:0.8,side:THREE.DoubleSide}),true);
  // Tische, Stühle, Sonnenschirme
  if(seats.length){const tg=new GB();tg.beam([0,0,0],[0,0.74,0],0.08,0.08);tg.box(0,0.72,0,0.8,0.04,0.8,0,WHITE,1);for(const a of [-0.75,0.75]){tg.box(a,0,0,0.42,0.45,0.42,0,{r:0.6,g:0.6,b:0.62},1);tg.box(a+(a>0?0.19:-0.19),0.45,0,0.04,0.45,0.42,0,{r:0.6,g:0.6,b:0.62},1);}
    instGeo(tg.geo(),stdMat({vertexColors:true,color:0x9a9a9a,metalness:0.6,roughness:0.4}),seats);
    if(paras.length){instGeo(new THREE.CylinderGeometry(0.03,0.03,2.3,6).translate(0,1.15,0),stdMat({color:0xdddddd,metalness:0.5}),paras);instGeo(new THREE.ConeGeometry(1.4,0.5,8,1,true).translate(0,2.35,0),stdMat({color:0xf2efe6,side:THREE.DoubleSide,roughness:0.9}),paras);}}
  // Spatial Hash für Türen
  for(const s of SHOPS){const k=Math.floor(s.x/20)+','+Math.floor(s.z/20);if(!SHOP_HASH.has(k))SHOP_HASH.set(k,[]);SHOP_HASH.get(k).push(s);}
}
const SHOP_HASH=new Map();
function shopNear(x,z,r=1.8){const cx=Math.floor(x/20),cz=Math.floor(z/20);let best=null,bd=r;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const l=SHOP_HASH.get((cx+a)+','+(cz+b));if(!l)continue;for(const s of l){const d=Math.hypot(s.doorX-x,s.doorZ-z);if(d<bd){bd=d;best=s;}}}return best;}

// ===================== INNENRÄUME =====================
const ROOM_Y=-80,ROOM_X0=3400,ROOM_Z=-3400;
const ROOMS={};
const ROOM_SIZE={0:[8,7],1:[9,8],2:[12,10],3:[12,9],4:[13,10],5:[16,13],6:[7,6],7:[11,10],8:[9,8],9:[12,10],10:[8,7],11:[12,10],12:[12,10],13:[11,9]};
const roomFloorTex=canvasTex(512,512,g=>{g.fillStyle='#8a6a4a';g.fillRect(0,0,512,512);const R=mulberry32(5);for(let y=0;y<512;y+=32)for(let x=-(y/32%2)*64;x<512;x+=128){const v=R()*30-15;g.fillStyle=`rgb(${138+v},${104+v},${72+v})`;g.fillRect(x+1,y+1,126,30);}noiseFill(g,512,512,0.05,8000);});
const roomTileTex=canvasTex(256,256,g=>{g.fillStyle='#d9d6cf';g.fillRect(0,0,256,256);g.fillStyle='#bdb8ae';for(let i=0;i<=256;i+=64){g.fillRect(i-1,0,2,256);g.fillRect(0,i-1,256,2);}noiseFill(g,256,256,0.03,3000);});
function makeRoom(cat){if(ROOMS[cat])return ROOMS[cat];const [W,D]=ROOM_SIZE[cat]||[11,9];const H=3.6;const ox=ROOM_X0+cat*45,oy=ROOM_Y,oz=ROOM_Z;
  const grp=new THREE.Group();grp.position.set(ox,oy,oz);grp.visible=false;scene.add(grp);const R=mulberry32(900+cat);
  const boxes=[];// Kollision: lokale AABBs [x0,z0,x1,z1]
  const solid=(x,z,w,d)=>boxes.push([x-w/2,z-d/2,x+w/2,z+d/2]);
  const items=new GB(),wood=new GB(),metal=new GB(),glass=new GB(),glow=new GB();
  const addM=(G,mat,cast=true)=>{if(G.empty)return;const m=new THREE.Mesh(G.geo(),mat);m.castShadow=cast;m.receiveShadow=true;grp.add(m);};
  // Boden, Wände, Decke
  const floorMat=stdMat({map:(cat===1||cat===5||cat===9||cat===11)?roomTileTex:roomFloorTex,roughness:0.55});floorMat.map.repeat&&floorMat.map.repeat.set(1,1);
  const fl=new THREE.Mesh(new THREE.PlaneGeometry(W,D).rotateX(-Math.PI/2),floorMat);fl.receiveShadow=true;scale_uv(fl.geometry,W/4,D/4);grp.add(fl);
  const wallCol=[0xf1e7d6,0xf4f6f4,0xe9e4dc,0xe8d9c0,0xd9b9a0,0xeef0f0,0xe4e0d8,0xe6dcc8,0xf2ece8,0xe9edf0,0xe8e2d8,0xe9eef3,0xe2ebe2,0xece4d6][cat]||0xeeeeee;
  const wm=stdMat({color:wallCol,roughness:0.9,side:THREE.DoubleSide});
  for(const [x,z,w,ry] of [[0,-D/2,W,0],[-W/2,0,D,Math.PI/2],[W/2,0,D,-Math.PI/2]]){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,H),wm);m.position.set(x,H/2,z);m.rotation.y=ry;m.receiveShadow=true;grp.add(m);}
  // Vorderwand mit Tür und Schaufenstern
  const fw=new GB();const dz=D/2;const seg=(x0,x1,y0,y1)=>fw.quadOut([x0,y0,dz],[x1,y0,dz],[x1,y1,dz],[x0,y1,dz],[0,0],[1,0],[1,1],[0,1],WHITE,[(x0+x1)/2,(y0+y1)/2,dz+1]);
  seg(-W/2,-0.75,2.7,H);seg(0.75,W/2,2.7,H);seg(-0.75,0.75,2.45,H);seg(-W/2,-W/2+0.4,0,2.7);seg(W/2-0.4,W/2,0,2.7);seg(-W/2,-0.75,0,0.5);seg(0.75,W/2,0,0.5);
  {const m=new THREE.Mesh(fw.geo(),new THREE.MeshStandardMaterial({color:wallCol,roughness:0.9,side:THREE.DoubleSide}));grp.add(m);}
  const winMat=stdMat({color:0xcfe6f0,emissive:0x9fc0d8,emissiveIntensity:0.9,roughness:0.1});
  for(const s of [-1,1]){const m=new THREE.Mesh(new THREE.PlaneGeometry(W/2-1.15,2.2),winMat);m.position.set(s*(W/4+0.17),1.6,dz-0.01);m.rotation.y=Math.PI;grp.add(m);}
  const dm=new THREE.Mesh(new THREE.PlaneGeometry(1.5,2.45),stdMat({map:doorTex,roughness:0.2}));dm.position.set(0,1.225,dz-0.02);dm.rotation.y=Math.PI;grp.add(dm);
  const ceil=new THREE.Mesh(new THREE.PlaneGeometry(W,D).rotateX(Math.PI/2),stdMat({color:0xf4f2ee,roughness:1}));ceil.position.y=H;grp.add(ceil);
  // Leuchten
  const lightPts=[];for(let i=0;i<3;i++){const x=(i-1)*W/3.2;for(const z of [-D/4,D/5]){glow.box(x,H-0.05,z,1.4,0.04,0.35,0,WHITE,1);lightPts.push([x,H-0.3,z]);}}
  // Sockelleiste
  for(const [x0,z0,x1,z1] of [[-W/2,-D/2+0.01,W/2,-D/2+0.01],[-W/2+0.01,-D/2,-W/2+0.01,D/2],[W/2-0.01,-D/2,W/2-0.01,D/2]])wood.quadOut([x0,0,z0],[x1,0,z1],[x1,0.12,z1],[x0,0.12,z0],[0,0],[1,0],[1,0.1],[0,0.1],{r:0.3,g:0.22,b:0.15},[0,0.5,0]);
  // Theke + Kasse + Verkäufer
  const cW=Math.min(3.4,W*0.35),cx=W/2-cW/2-1.0,cz=-D/2+1.9;
  wood.box(cx,0,cz,cW,1.05,0.75,0,cat===10||cat===9?{r:0.25,g:0.25,b:0.28}:{r:0.62,g:0.45,b:0.3},1);wood.box(cx,1.05,cz,cW+0.1,0.05,0.85,0,{r:0.85,g:0.82,b:0.78},1);
  metal.box(cx-cW/4,1.1,cz,0.42,0.28,0.38,0,{r:0.2,g:0.2,b:0.22},1);glow.box(cx-cW/4,1.36,cz-0.05,0.3,0.16,0.04,0,{r:0.3,g:0.9,b:0.5},1);
  solid(cx,cz,cW+0.2,0.95);solid(cx,-D/2+0.5,cW+1.5,1.0);
  const keeperPos=[cx,-D/2+1.05];
  // Regale an den Wänden
  const shelf=(x,z,w,ry,h=2.1,depth=0.45)=>{const c=Math.cos(ry),s=Math.sin(ry);const P=(lx,lz)=>[x+lx*c+lz*s,z-lx*s+lz*c];
    wood.box(x,0,z,w,0.1,depth,ry,{r:0.5,g:0.38,b:0.27},1);for(const lx of [-w/2+0.03,w/2-0.03]){const q=P(lx,0);wood.box(q[0],0,q[1],0.05,h,depth,ry,{r:0.5,g:0.38,b:0.27},1);}
    const bq=P(0,-depth/2+0.02);wood.box(bq[0],0,bq[1],w,h,0.04,ry,{r:0.42,g:0.32,b:0.22},1);
    for(let y=0.45;y<h;y+=0.5){wood.box(x,y,z,w,0.03,depth,ry,{r:0.55,g:0.42,b:0.3},1);
      for(let lx=-w/2+0.15;lx<w/2-0.1;){const pw=0.08+R()*0.22,ph=0.12+R()*0.3;if(lx+pw>w/2-0.1)break;const q=P(lx+pw/2,0.02);const col=new THREE.Color().setHSL(R(),0.45+R()*0.4,0.35+R()*0.35);
        items.box(q[0],y+0.03,q[1],pw,ph,depth*0.7,ry,col,1);lx+=pw+0.02;}}
    const hw=Math.abs(w*c)/2+Math.abs(depth*s)/2,hd=Math.abs(w*s)/2+Math.abs(depth*c)/2;boxes.push([x-hw,z-hd,x+hw,z+hd]);};
  const table=(x,z,r=0.45,chairs=2)=>{metal.beam([x,0,z],[x,0.74,z],0.07,0.07);wood.box(x,0.72,z,r*2,0.04,r*2,0,{r:0.55,g:0.4,b:0.28},1);
    for(let k=0;k<chairs;k++){const a=k/chairs*TAU+0.4;const px=x+Math.cos(a)*(r+0.45),pz=z+Math.sin(a)*(r+0.45);wood.box(px,0.44,pz,0.42,0.05,0.42,a,{r:0.35,g:0.25,b:0.18},1);for(const [ex,ez] of [[-0.17,-0.17],[0.17,-0.17],[-0.17,0.17],[0.17,0.17]])metal.box(px+ex,0,pz+ez,0.03,0.44,0.03,0,{r:0.2,g:0.2,b:0.2},1);}
    solid(x,z,r*2+0.4,r*2+0.4);};
  // Kategorie-Einrichtung
  const side=(n,fn)=>{for(let i=0;i<n;i++){const z=-D/2+2.6+i*((D-4.2)/Math.max(1,n-1||1));fn(z);}};
  if(cat===5){// Supermarkt: Regalreihen + Kassen
    for(const x of [-W/2+0.3]){side(Math.floor((D-3.5)/2.1),z=>shelf(x,z,2.0,-Math.PI/2));}for(const x of [W/2-0.3])side(Math.floor((D-5)/2.1),z=>shelf(x,z+0.6,2.0,Math.PI/2));
    for(let i=0;i<3;i++){const x=-W/2+3.4+i*2.9;for(const zz of [-1.6,1.4]){shelf(x-0.24,zz,3.0,Math.PI/2,1.7,0.42);shelf(x+0.24,zz,3.0,-Math.PI/2,1.7,0.42);}}
    for(const x of [-2.2,0.6])  {wood.box(x,0,D/2-2.3,0.7,0.9,1.9,0,{r:0.3,g:0.3,b:0.32},1);solid(x,D/2-2.3,0.8,2.0);}
    // Kühlregal
    glass.box(-W/2+4,0,-D/2+0.5,5,2.0,0.8,0,{r:0.7,g:0.85,b:0.95},1);glow.box(-W/2+4,1.9,-D/2+0.9,4.8,0.06,0.02,0,WHITE,1);solid(-W/2+4,-D/2+0.5,5,0.9);}
  else if(cat===3||cat===4){// Café / Restaurant
    const nx=Math.max(2,Math.floor((W-2)/2.6)),nz=Math.max(1,Math.floor((D-4.5)/2.4));for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){const x=-W/2+1.6+i*((W-3.2)/Math.max(1,nx-1)),z=-D/2+3.6+j*2.4;if(Math.abs(x)<1.2&&z>D/2-2.5)continue;if(x>cx-cW/2-0.8&&z<cz+1.4)continue;table(x,z,0.42,cat===4?4:2);}
    shelf(cx,-D/2+0.25,cW+1.2,0,2.2,0.3);}
  else if(cat===0){// Bäckerei: Glastheke mit Brot
    glass.box(cx-0.2,0,cz+0.9,cW+0.4,1.15,0.7,0,{r:0.75,g:0.88,b:0.95},1);solid(cx-0.2,cz+0.9,cW+0.5,0.8);
    for(let i=0;i<14;i++){const x=cx-cW/2+0.2+R()*(cW-0.2),z=cz+0.75+R()*0.3;items.box(x,0.75,z,0.22,0.1,0.13,R()*3,{r:0.7,g:0.45,b:0.2},1);}
    shelf(-W/2+0.3,-0.5,3.0,-Math.PI/2);shelf(-1.0,-D/2+0.3,2.4,0);}
  else if(cat===2||cat===12){// Mode / Sport: Kleiderständer + Regale
    for(let i=0;i<3;i++){const x=-W/2+2.2+i*2.6;for(const z of [-0.8,1.4]){metal.beam([x-0.9,1.55,z],[x+0.9,1.55,z],0.04,0.04);for(const e of [-0.9,0.9])metal.beam([x+e,0,z],[x+e,1.55,z],0.04,0.04);
      for(let k=0;k<9;k++){const col=new THREE.Color().setHSL(R(),0.4+R()*0.4,0.25+R()*0.45);items.box(x-0.8+k*0.2,0.65,z,0.04,0.85,0.5,0,col,1);}solid(x,z,2.0,0.6);}}
    shelf(-W/2+0.3,-D/2+2.4,2.4,-Math.PI/2);if(cat===12)for(let i=0;i<6;i++)items.box(-W/2+0.6,1.3,-D/2+1.6+i*0.4,0.3,0.3,0.3,0,new THREE.Color().setHSL(R(),0.7,0.5),1);
    glass.box(W/2-0.05,0.2,0.5,0.04,2.0,1.2,0,{r:0.85,g:0.92,b:0.98},1);}
  else if(cat===8){// Friseur
    for(let i=0;i<3;i++){const z=-D/2+2.6+i*1.7;glass.box(-W/2+0.04,0.9,z,0.03,1.3,1.0,0,{r:0.85,g:0.92,b:0.98},1);metal.box(-W/2+1.1,0,z,0.6,0.5,0.6,0,{r:0.15,g:0.15,b:0.15},1);metal.box(-W/2+1.1,0.5,z,0.6,0.12,0.6,0,{r:0.12,g:0.12,b:0.12},1);metal.box(-W/2+1.38,0.6,z,0.06,0.6,0.6,0,{r:0.12,g:0.12,b:0.12},1);solid(-W/2+0.9,z,1.2,0.8);}}
  else if(cat===9){// Bank: Schalter mit Glas, Geldautomaten
    glass.box(cx,1.1,cz+0.35,cW,1.0,0.03,0,{r:0.8,g:0.9,b:0.95},1);for(let i=0;i<2;i++){metal.box(-W/2+0.5,0,-1+i*1.4,0.6,1.7,0.9,0,{r:0.3,g:0.32,b:0.36},1);glow.box(-W/2+0.82,1.15,-1+i*1.4,0.02,0.3,0.4,0,{r:0.3,g:0.6,b:1},1);solid(-W/2+0.5,-1+i*1.4,0.7,1.0);}
    table(-0.5,0.8,0.5,0);}
  else if(cat===10){// Juwelier: Vitrinen
    for(let i=0;i<3;i++){const x=-W/2+1.4+i*2.0;glass.box(x,0,0.3,1.4,1.0,0.7,0,{r:0.75,g:0.85,b:0.95},1);for(let k=0;k<8;k++)items.box(x-0.55+k*0.15,1.0,0.3+(R()-0.5)*0.3,0.06,0.04,0.06,0,R()<0.5?{r:1,g:0.82,b:0.35}:{r:0.9,g:0.9,b:0.95},1);solid(x,0.3,1.5,0.8);}}
  else if(cat===11){// Elektronik: Tische mit Bildschirmen
    for(let i=0;i<3;i++){const x=-W/2+2+i*2.8;wood.box(x,0,0.5,2.0,0.8,1.0,0,{r:0.85,g:0.85,b:0.85},1);for(const k of [-0.6,0,0.6]){metal.box(x+k,0.8,0.5,0.4,0.28,0.02,0,{r:0.1,g:0.1,b:0.12},1);glow.box(x+k,0.82,0.53,0.36,0.24,0.01,0,new THREE.Color().setHSL(R(),0.6,0.6),1);}solid(x,0.5,2.1,1.1);}
    shelf(-W/2+0.3,-D/2+2.5,2.6,-Math.PI/2);}
  else if(cat===6){// Kiosk: Zeitschriften + Kühlschrank
    for(let i=0;i<5;i++)for(let k=0;k<4;k++)items.box(-W/2+0.2,0.6+k*0.35,-D/2+1.2+i*0.38,0.06,0.32,0.3,0,new THREE.Color().setHSL(R(),0.7,0.55),1);solid(-W/2+0.3,-D/2+2.1,0.6,2.1);
    glass.box(-W/2+0.6,0,D/2-1.6,0.9,1.9,0.8,0,{r:0.7,g:0.85,b:0.95},1);glow.box(-W/2+1.06,0.3,D/2-1.6,0.02,1.5,0.7,0,{r:0.6,g:0.8,b:1},1);solid(-W/2+0.6,D/2-1.6,1.0,0.9);}
  else{// Buchhandlung, Apotheke, Laden
    side(Math.floor((D-3)/2.2),z=>shelf(-W/2+0.3,z,2.0,-Math.PI/2,cat===7?2.4:2.1));if(W>9)for(let i=0;i<2;i++){const x=-W/2+3.3+i*2.6;shelf(x-0.22,0.6,2.2,Math.PI/2,1.6,0.4);shelf(x+0.22,0.6,2.2,-Math.PI/2,1.6,0.4);}
    if(cat===1){glow.box(0,2.6,-D/2+0.03,0.6,0.6,0.02,0,{r:0.1,g:0.9,b:0.3},1);}}
  // Innenschild mit Namen (wird beim Betreten beschriftet)
  const nameTex=new THREE.CanvasTexture(document.createElement('canvas'));nameTex.image.width=512;nameTex.image.height=96;nameTex.colorSpace=THREE.SRGBColorSpace;
  const nameSign=new THREE.Mesh(new THREE.PlaneGeometry(3.2,0.6),stdMat({map:nameTex,emissiveMap:nameTex,emissive:0xffffff,emissiveIntensity:0.6,roughness:0.5}));nameSign.position.set(cx,2.85,-D/2+0.04);grp.add(nameSign);
  addM(items,stdMat({vertexColors:true,roughness:0.6}));addM(wood,stdMat({vertexColors:true,roughness:0.65}));addM(metal,stdMat({vertexColors:true,metalness:0.6,roughness:0.35}));
  addM(glass,new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:0.05,metalness:0,transparent:true,opacity:0.35,depthWrite:false}),false);addM(glow,new THREE.MeshBasicMaterial({vertexColors:true,toneMapped:false}),false);
  const keeper=new Human('ped');keeper.keeper=true;keeper.kind='keeper';keeper.state='keeper';keeper.walkSpeed=0;keeper.x=ox+keeperPos[0];keeper.z=oz+keeperPos[1];keeper.y=oy;keeper.facing=0;keeper.g.visible=false;keeper.sync();
  const room={cat,W,D,H,ox,oy,oz,grp,boxes,lightPts,keeper,keeperPos,nameTex,shop:null,
    blocked(x,z){const lx=x-ox,lz=z-oz;if(lx<-W/2+0.3||lx>W/2-0.3||lz<-D/2+0.3||lz>D/2-0.25)return true;for(const b of boxes)if(lx>b[0]&&lx<b[2]&&lz>b[1]&&lz<b[3])return true;return false;}};
  ROOMS[cat]=room;return room;}
function scale_uv(g,su,sv){const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*su,uv.getY(i)*sv);return g;}
function labelRoom(room,shop){const c=room.nameTex.image;const g=c.getContext('2d');const [bg,fg]=signColors(shop.name,shop.cat);g.fillStyle=bg;g.fillRect(0,0,512,96);g.fillStyle=fg;g.textAlign='center';g.textBaseline='middle';
  let fs=60;g.font=`700 ${fs}px "Barlow Condensed",sans-serif`;let w=g.measureText(shop.name).width;if(w>480){g.save();g.translate(256,50);g.scale(480/w,1);g.fillText(shop.name,0,0);g.restore();}else g.fillText(shop.name,256,50);room.nameTex.needsUpdate=true;}
// Waren je Kategorie: [Name, Preis, Wirkung]
function shopItems(shop){const c=shop.cat;const k=shop.kind;
  const food=(n,p,hp)=>({n,p,f:P=>{P.h.health=Math.min(100,P.h.health+hp);return `+${hp} Gesundheit`;}});
  if(c===0)return [food('Laugenbrezel',2,15),food('Fleischworschtweck',4,30),food('Streuselkuchen',5,40)];
  if(c===1)return [{n:'Verbandszeug',p:25,f:P=>{P.h.health=Math.min(100,P.h.health+50);return '+50 Gesundheit';}},{n:'Erste-Hilfe-Kasten',p:60,f:P=>{P.h.health=100;return 'Gesundheit voll';}}];
  if(c===2)return [{n:'Neues Outfit',p:120,f:P=>{restyle(P.h);if(wanted>0&&wanted<=2){clearWanted();return 'Neu eingekleidet – die Polizei erkennt dich nicht mehr.';}return 'Neu eingekleidet.';}}];
  if(c===3)return [food('Kaffee',3,10),food('Käsekuchen',5,25),food('Frühstück',11,55)];
  if(c===4)return [food('Schoppe Riesling',5,15),food('Spundekäs mit Brezel',8,35),food('Handkäs mit Musik',8,40),food('Rheinhessen-Teller',22,100)];
  if(c===5)return [food('Wasser',1,5),food('Belegtes Brötchen',3,20),food('Meenzer Fleischworscht',5,35)];
  if(c===6)return [{n:'Allgemeine Zeitung',p:2,f:()=>mpick(['Schlagzeile: „Fastnacht 2027 wird größer denn je“','Schlagzeile: „Brücke wieder einspurig?“','Tipp: Die Lackiererei in Kastel macht dich unsichtbar für die Polizei.','Tipp: Elf Schoppen sind in der Stadt versteckt.'])},
    {n:'Rubbellos',p:2,f:()=>{const r=Math.random();const w=r<0.6?0:r<0.9?5:r<0.99?50:1000;G.money+=w;return w?`Gewonnen: €${w}!`:'Leider nichts.';}},food('Energydrink',3,12)];
  if(c===7)return [{n:'Mainz-Stadtplan',p:15,f:()=>{G.mapSchoppen=true;return 'Die Schoppen sind jetzt auf der Karte markiert.';}},{n:'Krimi „Tatort Meenz“',p:12,f:()=>'Spannende Lektüre.'}];
  if(c===8)return [{n:'Neuer Haarschnitt',p:40,f:P=>{restyle(P.h,true);if(wanted>0){setWanted(wanted-1);return 'Neuer Look – ein Fahndungsstern weniger.';}return 'Schicker Schnitt!';}}];
  if(c===9)return [{n:'Kontostand anzeigen',p:0,f:()=>`Guthaben: €${G.money}`}];
  if(c===10)return [{n:'Goldring',p:800,f:()=>'Schöner Ring. Nützt nur nix.'}];
  if(c===11)return [{n:'Handy',p:300,f:()=>{G.phone=true;return 'Neues Handy: Missionen werden auf der Karte angezeigt.';}}];
  if(c===12)return /weapon|hunting/.test(k)?[{n:'Pistole + 36 Schuss',p:400,f:P=>{giveWeapon(P,'pistol',36);return 'Pistole gekauft.';}},{n:'Schrotflinte',p:900,f:P=>{giveWeapon(P,'shotgun',18);return 'Schrotflinte gekauft.';}}]
    :[{n:'Superschuhe (Turbo-Sprint)',p:750,f:P=>{giveShoes(P);return 'Superschuhe! Mit U an- und ausschalten.';}},{n:'Baseballschläger',p:60,f:P=>{giveWeapon(P,'bat',1);return 'Baseballschläger gekauft.';}},{n:'Schutzweste',p:300,f:P=>{P.armor=100;return 'Schutzweste angelegt.';}}];
  return [{n:'Souvenir „Mainz bleibt Mainz“',p:10,f:()=>'Helau!'}];}
function restyle(h,hair=false){const m=stdMat({color:new THREE.Color().setHSL(Math.random(),0.55,0.35+Math.random()*0.2),roughness:0.85});
  const torso=h.hips.children[0];if(torso&&torso.isMesh)torso.material=m;for(const a of [h.armL,h.armR]){const c=a.children[0];if(c&&c.isMesh)c.material=m;}
  if(hair)h.hips.traverse(o=>{if(o.isMesh&&o.geometry===HGEO.hair)o.material=stdMat({color:new THREE.Color().setHSL(Math.random(),0.45,0.12+Math.random()*0.45),roughness:0.9});});}
const ROB_CASH=[[60,180],[150,500],[200,700],[80,250],[200,600],[300,900],[60,200],[100,300],[80,250],[3000,8000],[2500,5000],[400,1200],[300,900],[100,400]];
