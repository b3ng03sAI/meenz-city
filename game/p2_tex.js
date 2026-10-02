// ===================== PROZEDURALE PBR-TEXTUREN =====================
// Jede Textur wird in vier Ebenen gemalt: Albedo (A), Höhe (H), Rauheit (R), Leuchten (E)
// und einer Tönungsmaske (M: weiß = wird mit der Hausfarbe eingefärbt).
// Daraus entstehen: map (sRGB, Alpha = Tönungsmaske), normalMap, ORM (R=AO, G=Rauheit, B=Höhe für Parallax), emissiveMap.
const TS=QS.tex/1024;
function cnv(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c;}
function mkTex(c,srgb=true,repeat=true){const t=new THREE.CanvasTexture(c);t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;}t.anisotropy=ANISO;return t;}
function tnoise(w,h,cell,oct,seed){const out=new Float32Array(w*h);const R=mulberry32(seed);let amp=1,tot=0,c=cell;
  for(let o=0;o<oct;o++){const gx=Math.max(1,Math.round(w/c)),gy=Math.max(1,Math.round(h/c));const g=new Float32Array(gx*gy);for(let i=0;i<g.length;i++)g[i]=R();
    for(let y=0;y<h;y++){const fy=y/h*gy,y0=Math.floor(fy),ty=fy-y0,sy=ty*ty*(3-2*ty),r0=(y0%gy)*gx,r1=((y0+1)%gy)*gx;
      for(let x=0;x<w;x++){const fx=x/w*gx,x0=Math.floor(fx),tx=fx-x0,sx=tx*tx*(3-2*tx),c0=x0%gx,c1=(x0+1)%gx;out[y*w+x]+=amp*((g[r0+c0]*(1-sx)+g[r0+c1]*sx)*(1-sy)+(g[r1+c0]*(1-sx)+g[r1+c1]*sx)*sy);}}
    tot+=amp;amp*=0.5;c/=2;}
  for(let i=0;i<out.length;i++)out[i]/=tot;return out;}
class Layers{
  constructor(w,h,{emis=false,base=null}={}){this.w=w;this.h=h;this.s=TS;this.c={};
    for(const k of ['A','H','R','M',...(emis?['E']:[])]){const c=cnv(w*TS,h*TS);const g=c.getContext('2d',{willReadFrequently:true});g.setTransform(TS,0,0,TS,0,0);this.c[k]={c,g};}
    this.fill(0,0,w,h,{a:base?base.a:'#808080',h:base?base.h:0.5,r:base?base.r:0.9,m:base?base.m:1,e:'#000'});}
  g(k){return this.c[k].g;}
  _set(k,v){const g=this.g(k);if(k==='A'||k==='E'){g.fillStyle=v;g.strokeStyle=v;}else{const n=Math.round(clamp(v,0,1)*255);const s=`rgb(${n},${n},${n})`;g.fillStyle=s;g.strokeStyle=s;}}
  each(o,fn){for(const [k,key] of [['A','a'],['H','h'],['R','r'],['M','m'],['E','e']]){if(!this.c[k]||o[key]===undefined||o[key]===null)continue;this._set(k,o[key]);fn(this.g(k));}}
  fill(x,y,w,h,o){this.each(o,g=>g.fillRect(x,y,w,h));}
  path(o,build,stroke=0){this.each(o,g=>{g.beginPath();build(g);if(stroke){g.lineWidth=stroke;g.lineCap='round';g.stroke();}else g.fill();});}
  noise(k,amt,n,seed=7){const R=mulberry32(seed);const g=this.g(k);for(let i=0;i<n;i++){const v=R()<0.5?0:255;g.fillStyle=`rgba(${v},${v},${v},${amt*R()})`;g.fillRect(R()*this.w,R()*this.h,0.6+R()*2.2,0.6+R()*2.2);}}
  overlayNoise(k,arr,amp,dark=true){const c=this.c[k].c,g=c.getContext('2d');const id=g.getImageData(0,0,c.width,c.height);const d=id.data;const W=c.width,H=c.height;
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=y*W+x;const v=(arr[(Math.floor(y/H*this.nh)*this.nw+Math.floor(x/W*this.nw))]||0.5)-0.5;const f=1+v*amp;d[i*4]=clamp(d[i*4]*f,0,255);d[i*4+1]=clamp(d[i*4+1]*f,0,255);d[i*4+2]=clamp(d[i*4+2]*f,0,255);}
    g.putImageData(id,0,0);}
  modulate(k,arr,nw,amp){const c=this.c[k].c,g=c.getContext('2d');const id=g.getImageData(0,0,c.width,c.height);const d=id.data;const W=c.width,H=c.height;
    for(let y=0;y<H;y++){const ny=Math.floor(y/H*nw);for(let x=0;x<W;x++){const i=y*W+x;const v=arr[ny*nw+Math.floor(x/W*nw)]-0.5;const f=1+v*amp;d[i*4]=clamp(d[i*4]*f,0,255);d[i*4+1]=clamp(d[i*4+1]*f,0,255);d[i*4+2]=clamp(d[i*4+2]*f,0,255);}}
    g.putImageData(id,0,0);}
  build({normal=2.5,ao=1.5,emisTex=false,tintAlpha=true,repeat=true}={}){
    const A=this.c.A.c,Hc=this.c.H.c,Rc=this.c.R.c,Mc=this.c.M.c;const W=A.width,H=A.height;
    const hd=Hc.getContext('2d').getImageData(0,0,W,H).data,rd=Rc.getContext('2d').getImageData(0,0,W,H).data;
    const bl=cnv(W,H),bg=bl.getContext('2d');bg.filter=`blur(${Math.max(1,Math.round(5*TS))}px)`;bg.drawImage(Hc,0,0);bg.filter='none';
    // Ränder für die Unschärfe wiederholen (kachelbar)
    const bd=bg.getImageData(0,0,W,H).data;
    const hv=new Float32Array(W*H);for(let i=0;i<W*H;i++)hv[i]=hd[i*4]/255;
    const nc=cnv(W,H),ng=nc.getContext('2d');const nid=ng.createImageData(W,H),nd=nid.data;
    const oc=cnv(W,H),og=oc.getContext('2d');const oid=og.createImageData(W,H),od=oid.data;const st=normal*TS*0+normal;
    for(let y=0;y<H;y++){const ym=((y-1+H)%H)*W,yp=((y+1)%H)*W,yc=y*W;for(let x=0;x<W;x++){const xm=(x-1+W)%W,xp=(x+1)%W;
      const dx=(hv[yc+xp]-hv[yc+xm])*st,dy=(hv[yp+x]-hv[ym+x])*st;let nx=-dx,ny=dy,nz=1;const l=Math.hypot(nx,ny,nz);nx/=l;ny/=l;nz/=l;const i=(yc+x)*4;
      nd[i]=(nx*0.5+0.5)*255;nd[i+1]=(ny*0.5+0.5)*255;nd[i+2]=(nz*0.5+0.5)*255;nd[i+3]=255;
      const cav=clamp(1-ao*Math.max(0,bd[i]/255-hv[yc+x]),0.25,1);od[i]=cav*255;od[i+1]=rd[i];od[i+2]=hd[i];od[i+3]=255;}}
    ng.putImageData(nid,0,0);og.putImageData(oid,0,0);
    if(tintAlpha){const ag=A.getContext('2d');const aid=ag.getImageData(0,0,W,H);const ad=aid.data;const md=Mc.getContext('2d').getImageData(0,0,W,H).data;for(let i=0;i<W*H;i++)ad[i*4+3]=128+Math.round(md[i*4]/255*127);ag.putImageData(aid,0,0);}
    const out={map:mkTex(A,true,repeat),normalMap:mkTex(nc,false,repeat),orm:mkTex(oc,false,repeat)};
    if(this.c.E)out.emissiveMap=mkTex(this.c.E.c,true,repeat);
    return out;}
}

// ---------- Fassaden ----------
const GLASS_A='#11171c';
function windowUnit(L,x,y,w,h,{cols=2,rows=2,frame='#f2f1ec',lit=false,litCol='#ffcf8a',curtain=null,deep=0.06,mask=0}={}){
  // Laibung (dunkel, zurückgesetzt)
  L.fill(x-6,y-6,w+12,h+12,{a:'#57524b',h:0.42,r:0.9,m:mask});
  L.fill(x,y,w,h,{a:frame,h:0.32,r:0.45,m:0,e:lit?'#3a2a14':'#000'});
  const fw=5,pw=(w-fw*(cols+1))/cols,ph=(h-fw*(rows+1))/rows;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const px=x+fw+c*(pw+fw),py=y+fw+r*(ph+fw);
    L.fill(px,py,pw,ph,{a:GLASS_A,h:deep,r:0.04,m:0,e:lit?litCol:'#000'});
    // Spiegelungs-Verlauf im Glas
    const ga=L.g('A');const gr=ga.createLinearGradient(px,py,px+pw,py+ph);gr.addColorStop(0,'rgba(120,140,160,0.18)');gr.addColorStop(0.5,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(90,110,130,0.12)');ga.fillStyle=gr;ga.fillRect(px,py,pw,ph);}
  if(curtain){const cw=w*0.22;for(const cx of [x+fw,x+w-fw-cw]){L.fill(cx,y+fw,cw,h-fw*2,{a:curtain,h:deep+0.04,r:0.95,m:0,e:lit?'#7a5a34':null});}}
}
function facadeLayers(style,seed){
  const R=mulberry32(seed);const W=1024,B=256;
  const L=new Layers(W,W,{emis:true,base:{a:style==='modern'?'#d9d9d5':'#eeeae2',h:0.78,r:0.92,m:1}});
  L.noise('A',0.06,9000,seed);L.noise('H',0.05,6000,seed+1);
  const curtains=['#e9e2d2','#d8c8a8','#b8483a','#f4f2ea','#7d8a6a',null,null];
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){const x=col*B,y=row*B,k=row*4+col;const lit=R()<0.36;const litCol=R()<0.12?'#a9c7ff':R()<0.5?'#ffd08a':'#ffbf6e';const cur=curtains[Math.floor(R()*curtains.length)];
    if(style==='plaster'){
      L.fill(x,y+226,B,30,{a:'#e4ddd0',h:0.9,r:0.85,m:1});L.fill(x,y+226,B,4,{a:'#f6f3ec',h:1,m:1});L.fill(x,y+252,B,4,{a:'#bdb5a8',h:0.82,m:1});
      L.fill(x+64,y+38,128,172,{a:'#f1ece2',h:0.88,r:0.82,m:0});
      L.path({a:'#f1ece2',h:1,m:0},g=>{g.moveTo(x+110,y+26);g.lineTo(x+146,y+26);g.lineTo(x+140,y+44);g.lineTo(x+116,y+44);g.closePath();});
      windowUnit(L,x+84,y+56,88,134,{cols:2,rows:3,lit,litCol,curtain:cur});
      L.fill(x+70,y+196,116,12,{a:'#d9d1c2',h:1,r:0.8,m:0});L.fill(x+72,y+208,112,5,{a:'rgba(0,0,0,0.22)',m:null});
      if(k%3===1){for(const sx of [x+42,x+178]){L.fill(sx,y+54,36,140,{a:'#3e6650',h:0.92,r:0.7,m:0});for(let i=0;i<12;i++)L.fill(sx+2,y+58+i*11,32,3,{a:'#2c4a3a',h:0.8});}}
      if(k%5===2){L.fill(x+76,y+184,104,14,{a:'#6b4a2a',h:1,r:0.9,m:0});for(let i=0;i<14;i++){L.fill(x+80+R()*96,y+172+R()*12,7,7,{a:R()<0.5?'#c43a3a':'#3f7a3a',h:1,m:0});}}
    }else if(style==='fachwerk'){
      const beam=R()<0.5?'#4a2c1e':'#5a3424';const bo={a:beam,h:0.95,r:0.8,m:0};
      L.fill(x,y,12,B,bo);L.fill(x+B-12,y,12,B,bo);L.fill(x,y+B-26,B,26,bo);L.fill(x,y,B,14,bo);
      L.fill(x+64,y+60,12,128,bo);L.fill(x+180,y+60,12,128,bo);L.fill(x+64,y+50,128,12,bo);L.fill(x+64,y+186,128,12,bo);
      L.path(bo,g=>{g.moveTo(x+12,y+B-26);g.lineTo(x+64,y+150);},14);L.path(bo,g=>{g.moveTo(x+B-12,y+B-26);g.lineTo(x+192,y+150);},14);
      if(k%2)L.path(bo,g=>{g.moveTo(x+12,y+14);g.lineTo(x+64,y+70);g.moveTo(x+B-12,y+14);g.lineTo(x+192,y+70);},14);
      windowUnit(L,x+82,y+70,92,104,{cols:2,rows:3,frame:'#efe9dc',lit,litCol,curtain:cur,mask:0});
      if(k%3===0){L.fill(x+78,y+174,100,12,{a:'#5a3a22',h:1,m:0});for(let i=0;i<14;i++)L.fill(x+80+R()*92,y+162+R()*12,7,7,{a:R()<0.6?'#d23a3a':'#3a7a3a',h:1,m:0});}
      const gw=L.g('A');gw.fillStyle='rgba(0,0,0,0.08)';for(let i=0;i<40;i++)gw.fillRect(x+R()*B,y+R()*B,1+R()*3,6+R()*20);
    }else if(style==='sandstone'){
      for(let i=0;i<8;i++)L.fill(x,y+i*32,B,2.5,{a:'rgba(0,0,0,0.13)',h:0.62});
      for(let i=0;i<8;i++)L.fill(x+((i%2)*64)+R()*8,y+i*32,2,32,{a:'rgba(0,0,0,0.09)',h:0.66});
      L.fill(x,y+222,B,34,{a:'#ddd2c0',h:0.93,r:0.85,m:1});L.fill(x,y+222,B,5,{a:'#efe8dc',h:1,m:1});
      L.fill(x+68,y+40,120,170,{a:'#e9dfcf',h:0.88,r:0.85,m:1});
      if(k%2)L.path({a:'#e4d9c6',h:1,m:1},g=>{g.moveTo(x+60,y+42);g.lineTo(x+128,y+10);g.lineTo(x+196,y+42);g.closePath();});
      else L.path({a:'#e4d9c6',h:1,m:1},g=>{g.moveTo(x+62,y+42);g.quadraticCurveTo(x+128,y+4,x+194,y+42);g.closePath();});
      windowUnit(L,x+84,y+56,88,142,{cols:2,rows:3,lit,litCol,curtain:cur,mask:1});
      L.fill(x+72,y+198,112,12,{a:'#ddd2c0',h:1,m:1});
      if((k===5||k===10||k===6)&&row>0){L.fill(x+50,y+206,156,10,{a:'#cfc5b4',h:1,m:1});for(let i=0;i<16;i++)L.fill(x+54+i*9.6,y+164,3,42,{a:'#1d1d1d',h:1,r:0.5,m:0});L.fill(x+52,y+160,152,5,{a:'#1d1d1d',h:1,m:0});}
    }else{ // modern
      L.fill(x,y,B,3,{a:'rgba(0,0,0,0.25)',h:0.6});L.fill(x,y,3,B,{a:'rgba(0,0,0,0.2)',h:0.6});
      L.fill(x+6,y+34,B-12,170,{a:'#9aa1a6',h:0.5,r:0.35,m:0});
      for(let i=0;i<4;i++){const px=x+12+i*60;L.fill(px,y+40,52,158,{a:GLASS_A,h:0.12,r:0.03,m:0,e:lit?litCol:'#000'});
        if(cur&&R()<0.5)L.fill(px,y+40,52,40+R()*90,{a:'#c9c6bd',h:0.15,r:0.9,m:0,e:lit?'#806a50':null});}
      L.fill(x,y+204,B,8,{a:'#bcbdbb',h:0.85,m:1});
    }}
  // Verwitterung: dunkle Schlieren von oben nach unten
  const ga=L.g('A');for(let i=0;i<60;i++){const x=R()*W,y=R()*W;const gr=ga.createLinearGradient(x,y,x,y+120);gr.addColorStop(0,'rgba(40,35,30,0.10)');gr.addColorStop(1,'rgba(40,35,30,0)');ga.fillStyle=gr;ga.fillRect(x,y,3+R()*6,120);}
  return L.build({normal:style==='modern'?2:3,ao:2.2});
}
const SHOP_FASCIA=[['BÄCKEREI','#7a4a22'],['APOTHEKE','#1e7a3c'],['WEINSTUBE','#5a1f2a'],['CAFÉ','#2b3a4a'],['METZGEREI','#8a2a22'],['BUCHHANDLUNG','#1f3a5a'],['FRISEUR','#2a2a2a'],['OPTIK','#3a3f46']];
function shopLayers(){
  const R=mulberry32(77);const W=2048,H=256,B=256;
  const L=new Layers(W,H,{emis:true,base:{a:'#ece7de',h:0.8,r:0.9,m:1}});L.noise('A',0.06,6000,3);
  const awn=['#9b2c2c','#2f5d3a','#2c4a7a','#b07a2a','#6a2a4a','#3a3a3a','#8a6a2a','#2a5a5a'];
  for(let k=0;k<8;k++){const x=k*B;const [name,col]=SHOP_FASCIA[k];
    L.fill(x,y0(236),B,20,{a:'#8d8a84',h:0.92,r:0.85,m:0});
    if(k===2||k===5){ // Haustür
      L.fill(x+70,26,116,6,{a:'#d8d0c2',h:1,m:0});L.fill(x+76,32,104,204,{a:'#57524b',h:0.45,m:0});L.fill(x+82,36,92,200,{a:'#4a3324',h:0.3,r:0.6,m:0});
      L.fill(x+92,48,72,70,{a:GLASS_A,h:0.2,r:0.05,m:0,e:'#ffcf8a'});for(let i=0;i<4;i++)L.fill(x+90,130+i*24,76,4,{a:'#3a281c',h:0.36});L.fill(x+156,150,8,4,{a:'#c9a24a',h:0.5,r:0.2});
      continue;}
    L.fill(x+6,6,B-12,34,{a:col,h:0.95,r:0.6,m:0,e:'#000'});
    if(R()<0.7){L.path({a:awn[k],h:1,r:0.85,m:0},g=>{g.moveTo(x+12,44);g.lineTo(x+B-12,44);g.lineTo(x+B-4,72);g.lineTo(x+4,72);g.closePath();});const ga=L.g('A');ga.fillStyle='rgba(255,255,255,0.3)';for(let i=0;i<9;i++)ga.fillRect(x+12+i*26,44,13,28);L.fill(x+4,72,B-8,6,{a:'rgba(0,0,0,0.35)',h:null});}
    L.fill(x+14,84,B-28,148,{a:'#57524b',h:0.42,m:0});L.fill(x+18,88,B-36,140,{a:GLASS_A,h:0.1,r:0.04,m:0,e:'#2a2116'});
    const ga=L.g('A'),ge=L.g('E');for(let i=0;i<10;i++){const px=x+30+R()*180,py=150+R()*60,pw=10+R()*30,ph=10+R()*40;const c=`hsl(${R()*360},${30+R()*40}%,${30+R()*30}%)`;ga.fillStyle=c;ga.globalAlpha=0.55;ga.fillRect(px,py,pw,ph);ga.globalAlpha=1;ge.fillStyle=c;ge.fillRect(px,py,pw,ph);}
    ge.fillStyle='rgba(255,220,170,0.55)';ge.fillRect(x+18,88,B-36,140);
    L.fill(x+B/2-2,88,4,140,{a:'#3a3a3a',h:0.35,m:0});}
  function y0(v){return v;}
  return L.build({normal:3,ao:2});
}
// ---------- Dächer ----------
function roofLayers(kind){const R=mulberry32(kind==='slate'?31:21);const W=512;
  const L=new Layers(W,W,{base:{a:'#ddd5cd',h:0.3,r:0.8,m:1}});
  if(kind==='tile'){const tw=W/14,th=W/17;for(let r=0;r<17;r++){for(let c=-1;c<15;c++){const x=c*tw+(r%2)*tw/2,y=r*th;const v=200+R()*55|0;const moss=R()<0.06;
      const ga=L.g('A');const gh=L.g('H');
      for(const ox of [0,W])if(x+ox-W<W){const X=x+ox-W>-tw?x:x;}
      const draw=(X)=>{ga.fillStyle=moss?`rgb(${v-60},${v-30},${v-90})`:`rgb(${v},${v-6},${v-12})`;ga.beginPath();ga.moveTo(X+1,y);ga.lineTo(X+tw-1,y);ga.lineTo(X+tw-1,y+th*0.75);ga.quadraticCurveTo(X+tw/2,y+th*1.25,X+1,y+th*0.75);ga.closePath();ga.fill();
        const gr=gh.createLinearGradient(0,y,0,y+th*1.1);gr.addColorStop(0,'#555');gr.addColorStop(0.85,'#f0f0f0');gr.addColorStop(1,'#bbb');gh.fillStyle=gr;gh.beginPath();gh.moveTo(X+1,y);gh.lineTo(X+tw-1,y);gh.lineTo(X+tw-1,y+th*0.75);gh.quadraticCurveTo(X+tw/2,y+th*1.25,X+1,y+th*0.75);gh.closePath();gh.fill();
        if(moss)L.c.M.g.fillRect(X,y,tw,th);};
      draw(x);if(x<0)draw(x+W);if(x+tw>W)draw(x-W);}}
    L.c.M.g.fillStyle='#000';}
  else{const tw=W/10,th=W/14;for(let r=0;r<14;r++)for(let c=-1;c<11;c++){const x=c*tw+(r%2)*tw/2+R()*4,y=r*th;const v=150+R()*60|0;
      const ga=L.g('A'),gh=L.g('H');const draw=X=>{ga.fillStyle=`rgb(${v},${v},${v+6})`;ga.fillRect(X+1,y,tw-2,th*1.3);const gr=gh.createLinearGradient(0,y,0,y+th*1.3);gr.addColorStop(0,'#444');gr.addColorStop(1,'#eee');gh.fillStyle=gr;gh.fillRect(X+1,y,tw-2,th*1.3);};
      draw(x);if(x<0)draw(x+W);if(x+tw>W)draw(x-W);}}
  L.noise('A',0.08,4000,kind.length);
  return L.build({normal:kind==='tile'?4:3,ao:2.5});}
// ---------- Bodenbeläge ----------
function asphaltLayers(){const R=mulberry32(5);const W=1024;const L=new Layers(W,W,{base:{a:'#46464a',h:0.5,r:0.88,m:0}});
  const n=tnoise(256,256,64,4,11);L.modulate('A',n,256,0.35);L.modulate('R',n,256,-0.15);
  const ga=L.g('A'),gh=L.g('H'),gr=L.g('R');
  for(let i=0;i<70000;i++){const x=R()*W,y=R()*W,s=0.8+R()*2.4;const v=R();ga.fillStyle=v<0.5?`rgba(20,20,22,${0.5*R()})`:`rgba(170,168,160,${0.5*R()})`;ga.fillRect(x,y,s,s);gh.fillStyle=`rgba(255,255,255,${0.5*R()})`;gh.fillRect(x,y,s,s);}
  for(let i=0;i<10;i++){let x=R()*W,y=R()*W,a=R()*TAU;gh.strokeStyle='#000';ga.strokeStyle='rgba(18,18,18,0.8)';gh.lineWidth=2.5;ga.lineWidth=1.8;gh.beginPath();ga.beginPath();gh.moveTo(x,y);ga.moveTo(x,y);for(let k=0;k<40;k++){a+=mr(-0.6,0.6);x+=Math.cos(a)*6;y+=Math.sin(a)*6;gh.lineTo(x,y);ga.lineTo(x,y);}gh.stroke();ga.stroke();}
  for(let i=0;i<3;i++){const x=R()*W*0.7,y=R()*W*0.7,w=80+R()*200,h=60+R()*160;L.fill(x,y,w,h,{a:'rgba(30,30,32,0.45)',r:0.8});ga.strokeStyle='rgba(15,15,15,0.6)';ga.lineWidth=2;ga.strokeRect(x,y,w,h);}
  for(let i=0;i<6;i++){const x=R()*W,y=R()*W,r=20+R()*60;const g2=ga.createRadialGradient(x,y,1,x,y,r);g2.addColorStop(0,'rgba(10,10,12,0.35)');g2.addColorStop(1,'rgba(10,10,12,0)');ga.fillStyle=g2;ga.fillRect(x-r,y-r,r*2,r*2);const g3=gr.createRadialGradient(x,y,1,x,y,r);g3.addColorStop(0,'rgba(40,40,40,0.6)');g3.addColorStop(1,'rgba(40,40,40,0)');gr.fillStyle=g3;gr.fillRect(x-r,y-r,r*2,r*2);}
  return L.build({normal:5,ao:1.2,tintAlpha:false});}
function slabLayers(kind){const R=mulberry32(kind==='plaza'?9:8);const W=512;const L=new Layers(W,W,{base:{a:'#2c2b29',h:0.1,r:1,m:0}});
  const cols=kind==='plaza'?6:10,rows=kind==='plaza'?8:10;const cw=W/cols,rh=W/rows;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){const off=kind==='plaza'?(r%2)*cw/2:0;const x=c*cw+off,y=r*rh;const v=kind==='plaza'?190+R()*35:150+R()*30;const col=kind==='plaza'?`rgb(${v},${v-12|0},${v-30|0})`:`rgb(${v|0},${v|0},${v-3|0})`;
    const draw=X=>{L.fill(X+1.5,y+1.5,cw-3,rh-3,{a:col,h:0.75+R()*0.1,r:0.8+R()*0.12});};draw(x);if(x+cw>W)draw(x-W);}
  L.noise('A',0.1,9000,4);L.noise('H',0.08,6000,5);
  return L.build({normal:4,ao:2,tintAlpha:false});}
function cobbleLayers(){const R=mulberry32(12);const W=512;const L=new Layers(W,W,{base:{a:'#4a4238',h:0.0,r:1,m:0}});
  const rowsN=20,rh=W/rowsN;const ga=L.g('A'),gh=L.g('H');
  for(let r=0;r<rowsN;r++){let x=-R()*20;while(x<W){const w=14+R()*14;const y=r*rh;const cx=x+w/2,cy=y+rh/2;const t=R();const col=t<0.45?`rgb(${118+R()*30|0},${116+R()*26|0},${112+R()*24|0})`:t<0.75?`rgb(${92+R()*20|0},${88+R()*16|0},${86+R()*16|0})`:`rgb(${130+R()*30|0},${100+R()*20|0},${86+R()*16|0})`;
      const draw=X=>{const X0=X+1.4,Y0=y+1.4,ww=w-2.8,hh=rh-2.8,rad=5;ga.fillStyle=col;ga.beginPath();ga.roundRect?ga.roundRect(X0,Y0,ww,hh,rad):ga.rect(X0,Y0,ww,hh);ga.fill();
        const g2=gh.createRadialGradient(X+w/2,cy,1,X+w/2,cy,Math.max(w,rh)*0.62);g2.addColorStop(0,'#fff');g2.addColorStop(0.7,'#b0b0b0');g2.addColorStop(1,'#303030');gh.fillStyle=g2;gh.beginPath();gh.roundRect?gh.roundRect(X0,Y0,ww,hh,rad):gh.rect(X0,Y0,ww,hh);gh.fill();};
      draw(x);if(x<0)draw(x+W);if(x+w>W)draw(x-W);x+=w;}}
  L.noise('A',0.12,8000,6);const gr=L.g('R');gr.globalCompositeOperation='source-over';
  const hd=L.c.H.g.getImageData(0,0,L.c.H.c.width,L.c.H.c.height);const rd=L.c.R.g.createImageData(hd.width,hd.height);for(let i=0;i<hd.data.length;i+=4){const v=255-hd.data[i]*0.45;rd.data[i]=rd.data[i+1]=rd.data[i+2]=v;rd.data[i+3]=255;}L.c.R.g.putImageData(rd,0,0);
  return L.build({normal:6,ao:2.5,tintAlpha:false});}
function grassLayers(){const R=mulberry32(14);const W=512;const L=new Layers(W,W,{base:{a:'#4d6a2c',h:0.4,r:0.95,m:0}});
  const n=tnoise(128,128,32,3,15);L.modulate('A',n,128,0.5);const ga=L.g('A'),gh=L.g('H');
  for(let i=0;i<22000;i++){const x=R()*W,y=R()*W,l=3+R()*7,a=-Math.PI/2+mr(-0.5,0.5);const v=R();ga.strokeStyle=v<0.3?'rgba(110,140,60,0.8)':v<0.6?'rgba(70,100,40,0.8)':v<0.9?'rgba(130,150,70,0.7)':'rgba(150,140,90,0.7)';ga.lineWidth=1;ga.beginPath();ga.moveTo(x,y);ga.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);ga.stroke();gh.strokeStyle=`rgba(255,255,255,${0.3*R()})`;gh.beginPath();gh.moveTo(x,y);gh.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);gh.stroke();}
  return L.build({normal:3,ao:1,tintAlpha:false});}
function gravelLayers(){const R=mulberry32(16);const W=512;const L=new Layers(W,W,{base:{a:'#6a6159',h:0.3,r:0.95,m:0}});const ga=L.g('A'),gh=L.g('H');
  for(let i=0;i<9000;i++){const x=R()*W,y=R()*W,s=2+R()*5;const v=90+R()*80|0;ga.fillStyle=`rgb(${v},${v-6},${v-12})`;ga.beginPath();ga.arc(x,y,s/2,0,TAU);ga.fill();gh.fillStyle=`rgba(255,255,255,${0.5+R()*0.5})`;gh.beginPath();gh.arc(x,y,s/2,0,TAU);gh.fill();}
  return L.build({normal:5,ao:2,tintAlpha:false});}
function ashlarLayers(base,seed){const R=mulberry32(seed);const W=512;const L=new Layers(W,W,{base:{a:'#3a2a24',h:0.2,r:0.9,m:1}});const rows=8,rh=W/rows;
  for(let r=0;r<rows;r++){let x=(r%2)*30-30;while(x<W){const w=50+R()*50;const c=new THREE.Color(base).offsetHSL(mr(-0.01,0.01),mr(-0.05,0.05),mr(-0.06,0.05));const col='#'+c.getHexString();
      const draw=X=>L.fill(X+1.5,r*rh+1.5,w-3,rh-3,{a:col,h:0.8+R()*0.15,r:0.85});draw(x);if(x+w>W)draw(x-W);if(x<0)draw(x+W);x+=w;}}
  L.noise('A',0.12,9000,seed);L.noise('H',0.1,8000,seed+1);
  const ga=L.g('A');for(let i=0;i<30;i++){const x=R()*W,y=R()*W;const gr=ga.createLinearGradient(x,y,x,y+90);gr.addColorStop(0,'rgba(20,15,12,0.16)');gr.addColorStop(1,'rgba(20,15,12,0)');ga.fillStyle=gr;ga.fillRect(x,y,3+R()*8,90);}
  return L;}
function romanesqueLayers(base,glass,glassE,seed){const L=ashlarLayers(base,seed);const W=512;
  L.fill(0,0,34,W,{a:'#c47662',h:0.95,r:0.85});L.fill(W-34,0,34,W,{a:'#c47662',h:0.95,r:0.85});
  for(let x=34;x<W-34;x+=40)L.path({a:'#b4644f',h:0.92},g=>{g.moveTo(x,28);g.arc(x+20,28,20,Math.PI,0);g.lineTo(x+40,38);g.lineTo(x,38);g.closePath();});
  L.path({a:'#c98a72',h:0.9},g=>{g.moveTo(170,430);g.lineTo(170,190);g.arc(256,190,86,Math.PI,0);g.lineTo(342,430);g.closePath();});
  L.path({a:'#57423a',h:0.45},g=>{g.moveTo(188,420);g.lineTo(188,196);g.arc(256,196,68,Math.PI,0);g.lineTo(324,420);g.closePath();});
  L.path({a:glass,h:0.12,r:0.05,m:0,e:glassE},g=>{g.moveTo(200,412);g.lineTo(200,200);g.arc(256,200,56,Math.PI,0);g.lineTo(312,412);g.closePath();});
  for(let y=230;y<412;y+=30)L.fill(200,y,112,3,{a:'#3a3a3a',h:0.2});L.fill(254,150,4,262,{a:'#3a3a3a',h:0.2});
  L.fill(150,430,212,14,{a:'#c98a72',h:1});return L;}
function brickLayers(){const R=mulberry32(18);const W=512;const L=new Layers(W,W,{base:{a:'#b9ac98',h:0.3,r:0.95,m:1}});const rows=24,rh=W/rows;
  for(let r=0;r<rows;r++){let x=(r%2)*22-22;while(x<W){const w=44;const v=R();const col=`rgb(${150+v*40|0},${92+v*22|0},${72+v*18|0})`;const draw=X=>L.fill(X+1.5,r*rh+1.5,w-3,rh-3,{a:col,h:0.8+R()*0.15,r:0.85});draw(x);if(x+w>W)draw(x-W);x+=w;}}
  L.noise('A',0.1,6000,19);return L.build({normal:4,ao:2,tintAlpha:true});}
function leafLayers(){const R=mulberry32(20);const W=512;const L=new Layers(W,W,{base:{a:'#2f4a1f',h:0.2,r:0.85,m:1}});const ga=L.g('A'),gh=L.g('H');
  for(let i=0;i<3800;i++){const x=R()*W,y=R()*W,s=5+R()*9,a=R()*TAU;const v=R();ga.fillStyle=v<0.3?'#5c7d34':v<0.6?'#46662a':v<0.85?'#6f8f3d':'#3a5524';
    ga.save();ga.translate(x,y);ga.rotate(a);ga.beginPath();ga.ellipse(0,0,s,s*0.5,0,0,TAU);ga.fill();ga.restore();gh.fillStyle=`rgba(255,255,255,${0.4+R()*0.6})`;gh.save();gh.translate(x,y);gh.rotate(a);gh.beginPath();gh.ellipse(0,0,s,s*0.5,0,0,TAU);gh.fill();gh.restore();}
  return L.build({normal:4,ao:3,tintAlpha:true});}
function barkLayers(){const R=mulberry32(22);const W=256;const L=new Layers(W,W,{base:{a:'#6b5a4a',h:0.5,r:0.95,m:1}});const ga=L.g('A'),gh=L.g('H');
  for(let i=0;i<220;i++){const x=R()*W;ga.fillStyle=`rgba(30,22,16,${0.3+R()*0.4})`;ga.fillRect(x,0,1+R()*3,W);gh.fillStyle='rgba(0,0,0,0.5)';gh.fillRect(x,0,1+R()*3,W);}
  return L.build({normal:4,ao:2,tintAlpha:true});}
function waterNormal(){const W=512;const c=cnv(W,W);const g=c.getContext('2d');const id=g.createImageData(W,W);const d=id.data;const R=mulberry32(30);
  const waves=[];for(let i=0;i<14;i++){waves.push({kx:Math.round(mr(-9,9))||1,ky:Math.round(mr(-9,9))||2,a:mr(0.3,1)/(1+i*0.25),p:R()*TAU});}
  for(let y=0;y<W;y++)for(let x=0;x<W;x++){let dx=0,dy=0;for(const w of waves){const ph=TAU*(w.kx*x+w.ky*y)/W+w.p;const c2=Math.cos(ph)*w.a;dx+=c2*w.kx;dy+=c2*w.ky;}
    let nx=-dx*0.05,ny=dy*0.05,nz=1;const l=Math.hypot(nx,ny,nz);const i=(y*W+x)*4;d[i]=(nx/l*0.5+0.5)*255;d[i+1]=(ny/l*0.5+0.5)*255;d[i+2]=(nz/l*0.5+0.5)*255;d[i+3]=255;}
  g.putImageData(id,0,0);return mkTex(c,false,true);}
function posterTex(){const c=cnv(512,256),g=c.getContext('2d');const R=mulberry32(40);g.fillStyle='#ddd6c6';g.fillRect(0,0,512,256);
  const words=['KONZERT','FASTNACHT','WEINMARKT','KINO','THEATER','MESSE','ZIRKUS','FLOHMARKT','JAZZ','OPER','HELAU!','MAINZ 05'];
  for(let i=0;i<14;i++){const x=R()*460,y=R()*200,w=60+R()*80,h=80+R()*60;g.fillStyle=`hsl(${R()*360},${50+R()*40}%,${35+R()*35}%)`;g.fillRect(x,y,w,h);g.fillStyle=R()<0.5?'#fff':'#111';g.font=`800 ${14+R()*10|0}px "Barlow Condensed", Arial Narrow, sans-serif`;g.fillText(words[i%words.length],x+6,y+24);g.fillRect(x+6,y+34,w*0.6,3);}
  return mkTex(c,true,true);}

const T={};
async function buildTextures(progress){
  const steps=[
    ['plaster',()=>facadeLayers('plaster',101)],['fachwerk',()=>facadeLayers('fachwerk',202)],['sandstone',()=>facadeLayers('sandstone',303)],['modern',()=>facadeLayers('modern',404)],
    ['shop',()=>shopLayers()],['tile',()=>roofLayers('tile')],['slate',()=>roofLayers('slate')],['asphalt',()=>asphaltLayers()],['sidewalk',()=>slabLayers('side')],['plaza',()=>slabLayers('plaza')],
    ['cobble',()=>cobbleLayers()],['grass',()=>grassLayers()],['gravel',()=>gravelLayers()],
    ['ashlar',()=>ashlarLayers('#b0614a',50).build({normal:4,ao:2})],['ashlarLight',()=>ashlarLayers('#d8c7a6',51).build({normal:4,ao:2})],
    ['rom',()=>romanesqueLayers('#b0614a','#191719','#ffb35a',52).build({normal:4,ao:2.4,tintAlpha:false})],['romBlue',()=>romanesqueLayers('#a9584a','#1f3fa0','#3f6cff',53).build({normal:4,ao:2.4,tintAlpha:false})],
    ['romLight',()=>romanesqueLayers('#d8c7a6','#191719','#ffcc80',54).build({normal:4,ao:2.4,tintAlpha:false})],
    ['brick',()=>brickLayers()],['leaf',()=>leafLayers()],['bark',()=>barkLayers()],
  ];
  for(let i=0;i<steps.length;i++){const tt=performance.now();T[steps[i][0]]=steps[i][1]();console.log('[tex]',steps[i][0],Math.round(performance.now()-tt));progress(i/steps.length,steps[i][0]+' '+Math.round(performance.now()-tt)+'ms');if(i%2)await nextFrame();}
  T.water=waterNormal();T.poster=posterTex();
}
