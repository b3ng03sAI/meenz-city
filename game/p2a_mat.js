// ===================== HILFEN, MATERIALIEN =====================
function noiseFill(g,w,h,amt,n){for(let i=0;i<n;i++){g.fillStyle=Math.random()<0.5?`rgba(0,0,0,${amt})`:`rgba(255,255,255,${amt})`;g.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*2,1+Math.random()*2);}}
const LOWMEM=IS_TOUCH||((navigator.deviceMemory||8)<=4);
// Canvas-Speicher nach dem Hochladen auf die GPU freigeben (iOS begrenzt den gesamten Canvas-Speicher)
function freeAfterUpload(t){t.onUpdate=()=>{const c=t.image;if(c&&c.getContext){t.userData.w=c.width;t.userData.h=c.height;c.width=1;c.height=1;}t.onUpdate=null;};return t;}
function shrinkCanvas(c,max){if(c.width<=max&&c.height<=max)return c;const k=max/Math.max(c.width,c.height);const d=document.createElement('canvas');d.width=Math.max(1,Math.round(c.width*k));d.height=Math.max(1,Math.round(c.height*k));const g=d.getContext('2d');g.imageSmoothingQuality='high';g.drawImage(c,0,0,d.width,d.height);c.width=1;c.height=1;return d;}
function texFromCanvas(c,repeat=true,srgb=true){const t=new THREE.CanvasTexture(c);if(srgb)t.colorSpace=THREE.SRGBColorSpace;if(repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;}t.anisotropy=ANISO;return t;}
function canvasTex(w,h,draw,repeat=true){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);return texFromCanvas(c,repeat);}
function textTex(text,{w=512,h=96,bg='#fff',fg='#111',font='700 56px "Barlow Condensed", Arial Narrow, sans-serif',border=null}={}){
  return canvasTex(w,h,g=>{g.fillStyle=bg;g.fillRect(0,0,w,h);if(border){g.strokeStyle=border;g.lineWidth=8;g.strokeRect(4,4,w-8,h-8);}g.fillStyle=fg;g.font=font;g.textAlign='center';g.textBaseline='middle';g.fillText(text,w/2,h/2+2);},false);}
const nightMats=[];
function stdMat(o){return new THREE.MeshStandardMaterial(Object.assign({roughness:0.85,metalness:0.0},o));}
function nightMat(m,k=1){nightMats.push({m,k});return m;}
const WIND={time:{value:0},amp:{value:1}};
const WET_MATS=[];
function patchMat(m,o){
  if(!o.tint&&!o.pom&&!o.wind)return m;
  m.onBeforeCompile=(sh)=>{
    if(o.wind){sh.uniforms.uTime=WIND.time;sh.uniforms.uWind=WIND.amp;
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nuniform float uTime; uniform float uWind;').replace('#include <begin_vertex>',`#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec2 wp = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
      #else
        vec2 wp = vec2(0.0);
      #endif
      float hgt = max(position.y - ${(o.windBase||2).toFixed(1)}, 0.0);
      transformed.x += (sin(uTime*1.3 + wp.x*0.07 + wp.y*0.05)*0.5 + sin(uTime*2.9 + wp.x*0.13 + position.y)*0.18) * 0.035 * hgt * uWind;
      transformed.z += (cos(uTime*1.1 + wp.y*0.08)*0.4 + sin(uTime*3.3 + position.x*2.0)*0.12) * 0.03 * hgt * uWind;`);}
    let fs=sh.fragmentShader;
    if(o.pom){sh.uniforms.pomScale={value:o.pomScale||0.02};
      fs=fs.replace('#include <common>','#include <common>\nuniform float pomScale;\nvec2 pomUv;');
      fs=fs.replace('void main() {',`void main() {
        pomUv = vMapUv;
        {
          vec3 vp = -vViewPosition; vec3 q0 = dFdx(vp), q1 = dFdy(vp); vec2 st0 = dFdx(vMapUv), st1 = dFdy(vMapUv);
          vec3 Nn = normalize(vNormal); vec3 q1p = cross(q1, Nn), q0p = cross(Nn, q0);
          vec3 Tt = q1p*st0.x + q0p*st1.x; vec3 Bt = q1p*st0.y + q0p*st1.y;
          float det = max(dot(Tt,Tt), dot(Bt,Bt)); float sc = det == 0.0 ? 0.0 : inversesqrt(det); Tt *= sc; Bt *= sc;
          vec3 Vv = normalize(vViewPosition); vec3 Vt = vec3(dot(Vv,Tt), dot(Vv,Bt), dot(Vv,Nn));
          float dist = length(vViewPosition);
          if (dist < 140.0 && Vt.z > 0.05) {
            float steps = mix(22.0, 8.0, clamp(Vt.z, 0.0, 1.0)); float layer = 1.0/steps;
            vec2 dUV = Vt.xy / max(Vt.z, 0.2) * pomScale * layer * (1.0 - smoothstep(90.0, 140.0, dist));
            float cur = 1.0; vec2 uv = vMapUv; float hh = texture2D(aoMap, uv).b;
            for (int i = 0; i < 22; i++) { if (float(i) >= steps || cur <= hh) break; uv -= dUV; cur -= layer; hh = texture2D(aoMap, uv).b; }
            vec2 pUv = uv + dUV; float after = hh - cur; float before = texture2D(aoMap, pUv).b - (cur + layer);
            float w = after / (after - before + 1e-5); pomUv = mix(uv, pUv, clamp(w, 0.0, 1.0));
          }
        }`);
      const rep=(c,f)=>THREE.ShaderChunk[c].split(f).join('pomUv');
      fs=fs.replace('#include <map_fragment>',rep('map_fragment','vMapUv')).replace('#include <normal_fragment_maps>',rep('normal_fragment_maps','vNormalMapUv'))
        .replace('#include <roughnessmap_fragment>',rep('roughnessmap_fragment','vRoughnessMapUv')).replace('#include <aomap_fragment>',rep('aomap_fragment','vAoMapUv'))
        .replace('#include <emissivemap_fragment>',rep('emissivemap_fragment','vEmissiveMapUv'));}
    if(o.tint){fs=fs.replace('#include <color_fragment>',`#if defined( USE_COLOR )
      #ifdef USE_MAP
        float tintM = clamp((sampledDiffuseColor.a - 0.5) * 2.0, 0.0, 1.0);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vColor, tintM);
        diffuseColor.a = opacity;
      #else
        diffuseColor.rgb *= vColor;
      #endif
      #endif`);}
    sh.fragmentShader=fs;};
  m.customProgramCacheKey=()=>'mz'+(o.tint?1:0)+(o.pom?1:0)+(o.wind?1:0);
  return m;}
function pbrMat(t,o={}){
  const m=new THREE.MeshStandardMaterial({map:t.map,normalMap:t.normalMap,roughnessMap:t.orm,aoMap:t.orm,aoMapIntensity:o.ao??1,roughness:o.rough??1,metalness:o.metal??0,color:o.color??0xffffff,vertexColors:!!o.vc});
  if(o.normalScale)m.normalScale.set(o.normalScale,o.normalScale);
  if(o.emis&&t.emissiveMap){m.emissiveMap=t.emissiveMap;m.emissive=new THREE.Color(0xffffff);m.emissiveIntensity=0;nightMats.push({m,k:o.nightK??1});}
  if(o.offset){m.polygonOffset=true;m.polygonOffsetFactor=o.offset;m.polygonOffsetUnits=o.offset;}
  if(o.wet)WET_MATS.push({m,base:m.roughness});
  return patchMat(m,{tint:!!o.vc&&o.tint!==false,pom:!!o.pom&&QS.pom,wind:o.wind,windBase:o.windBase});}
let MAT={},M={};
const texCache=new Map();
function tmat(key,make){if(!texCache.has(key))texCache.set(key,make());return texCache.get(key);}
function facMat(style,tint){return tmat('fac'+style+tint,()=>pbrMat(T[style],{color:tint,pom:true,emis:true}));}
const WHITE_C=new THREE.Color(0xffffff);
function initMaterials(){
  MAT={plaster:pbrMat(T.plaster,{vc:true,pom:true,emis:true}),fachwerk:pbrMat(T.fachwerk,{vc:true,pom:true,emis:true}),sandstone:pbrMat(T.sandstone,{vc:true,pom:true,emis:true}),
    modern:pbrMat(T.modern,{vc:true,pom:true,emis:true}),shop:pbrMat(T.shop,{vc:true,pom:true,emis:true}),
    tile:pbrMat(T.tile,{vc:true,wet:true}),slate:pbrMat(T.slate,{vc:true,wet:true}),flat:pbrMat(T.gravel,{vc:true,tint:false}),trim:pbrMat(T.ashlarLight,{vc:true}),brick:pbrMat(T.brick,{vc:true}),
    asphalt:pbrMat(T.asphalt,{offset:-2,wet:true}),cobble:pbrMat(T.cobble,{offset:-2,wet:true}),sidewalk:pbrMat(T.sidewalk,{vc:true,tint:false,offset:-1,wet:true}),
    plaza:pbrMat(T.plaza,{offset:-1,wet:true}),grass:pbrMat(T.grass,{offset:-1,color:0xd8e6c8}),gravel:pbrMat(T.gravel,{}),curb:pbrMat(T.ashlarLight,{color:0xb9b6b0,wet:true}),
    paint:stdMat({color:0xe9e8e0,roughness:0.55,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}),
    rom:pbrMat(T.rom,{vc:true,pom:true,emis:true,nightK:0.7}),copper:stdMat({vertexColors:true,color:0x5f9a84,roughness:0.42,metalness:0.55}),leaf:pbrMat(T.leaf,{vc:true,wind:true,windBase:2.5}),bark:pbrMat(T.bark,{wind:true,windBase:3})};
  M={rom:pbrMat(T.rom,{pom:true,emis:true,nightK:0.7}),romBlue:pbrMat(T.romBlue,{pom:true,emis:true,nightK:1}),stone:pbrMat(T.romLight,{pom:true,emis:true,nightK:0.7}),
    redPlain:pbrMat(T.ashlar,{}),redStone:pbrMat(T.brick,{color:0xd29a86}),lightStone:pbrMat(T.ashlarLight,{}),slate:pbrMat(T.slate,{color:0x6a7078}),tileRed:pbrMat(T.tile,{color:0xc0603e}),
    copper:stdMat({color:0x5f9a84,roughness:0.42,metalness:0.55}),bronze:stdMat({color:0x3d4a3f,roughness:0.4,metalness:0.75}),steel:stdMat({color:0x6d7b78,roughness:0.42,metalness:0.6}),
    brick:pbrMat(T.brick,{}),marble:stdMat({map:canvasTex(256,256,g=>{g.fillStyle='#d6d4ce';g.fillRect(0,0,256,256);noiseFill(g,256,256,0.05,3000);g.fillStyle='rgba(40,44,48,0.85)';for(let x=10;x<256;x+=64)g.fillRect(x,18,12,200);g.fillStyle='rgba(0,0,0,0.12)';g.fillRect(0,0,256,3);}),roughness:0.35}),
    dark:stdMat({color:0x15171a,roughness:0.5}),white:stdMat({color:0xf2f2ee}),water:stdMat({color:0x2d5b6e,roughness:0.05})};
}
function boxGeo(w,h,d,tw,th){const g=new THREE.BoxGeometry(w,h,d);if(tw){const uv=g.attributes.uv;const sz=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];for(let f=0;f<6;f++){const [su,sv]=sz[f];for(let k=0;k<4;k++){const i=f*4+k;uv.setXY(i,uv.getX(i)*su/tw,uv.getY(i)*sv/th);}}}return g;}
function scaleUV(g,su,sv){const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*su,uv.getY(i)*sv);return g;}

// ===================== GEOMETRIE-BUILDER =====================
const WHITE={r:1,g:1,b:1};
function sub3(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
function cross3(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function norm3(a){const l=Math.hypot(a[0],a[1],a[2])||1;return [a[0]/l,a[1]/l,a[2]/l];}
class GB{
  constructor(){this.p=[];this.n=[];this.u=[];this.c=[];this.i=[];}
  _v(p,uv,col,n){this.p.push(p[0],p[1],p[2]);this.n.push(n[0],n[1],n[2]);this.u.push(uv[0],uv[1]);this.c.push(col.r,col.g,col.b);}
  quad(a,b,c,d,ua,ub,uc,ud,col=WHITE,cols=null){const n=norm3(cross3(sub3(b,a),sub3(d,a)));const s=this.p.length/3;this._v(a,ua,cols?cols[0]:col,n);this._v(b,ub,cols?cols[1]:col,n);this._v(c,uc,cols?cols[2]:col,n);this._v(d,ud,cols?cols[3]:col,n);this.i.push(s,s+1,s+2,s,s+2,s+3);}
  quadOut(a,b,c,d,ua,ub,uc,ud,col,ref){const n=cross3(sub3(b,a),sub3(d,a));const m=[(a[0]+c[0])/2-ref[0],(a[1]+c[1])/2-ref[1],(a[2]+c[2])/2-ref[2]];if(n[0]*m[0]+n[1]*m[1]+n[2]*m[2]<0)this.quad(b,a,d,c,ua,ub,uc,ud,col);else this.quad(a,b,c,d,ua,ub,uc,ud,col);}
  quadOut4(a,b,c,d,ua,ub,uc,ud,cols,ref){const n=cross3(sub3(b,a),sub3(d,a));const m=[(a[0]+c[0])/2-ref[0],(a[1]+c[1])/2-ref[1],(a[2]+c[2])/2-ref[2]];if(n[0]*m[0]+n[1]*m[1]+n[2]*m[2]<0)this.quad(b,a,d,c,ua,ub,uc,ud,null,[cols[1],cols[0],cols[3],cols[2]]);else this.quad(a,b,c,d,ua,ub,uc,ud,null,cols);}
  tri(a,b,c,ua,ub,uc,col=WHITE){const n=norm3(cross3(sub3(b,a),sub3(c,a)));const s=this.p.length/3;this._v(a,ua,col,n);this._v(b,ub,col,n);this._v(c,uc,col,n);this.i.push(s,s+1,s+2);}
  triOut(a,b,c,ua,ub,uc,col,ref){const n=cross3(sub3(b,a),sub3(c,a));const m=[(a[0]+b[0]+c[0])/3-ref[0],(a[1]+b[1]+c[1])/3-ref[1],(a[2]+b[2]+c[2])/3-ref[2]];if(n[0]*m[0]+n[1]*m[1]+n[2]*m[2]<0)this.tri(a,c,b,ua,uc,ub,col);else this.tri(a,b,c,ua,ub,uc,col);}
  beam(p0,p1,w,h,col=WHITE){const d=norm3(sub3(p1,p0));let s=norm3(cross3(d,[0,1,0]));if(!isFinite(s[0])||Math.abs(d[1])>0.999)s=[1,0,0];const u=norm3(cross3(s,d));
    const off=(p,a,b)=>[p[0]+s[0]*a+u[0]*b,p[1]+s[1]*a+u[1]*b,p[2]+s[2]*a+u[2]*b];const hw=w/2,hh=h/2;const ref=[(p0[0]+p1[0])/2,(p0[1]+p1[1])/2,(p0[2]+p1[2])/2];const L=Math.hypot(...sub3(p1,p0));
    const cs=[[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]];for(let k=0;k<4;k++){const A=cs[k],B=cs[(k+1)%4];this.quadOut(off(p0,A[0],A[1]),off(p0,B[0],B[1]),off(p1,B[0],B[1]),off(p1,A[0],A[1]),[0,0],[w,0],[w,L/3],[0,L/3],col,ref);}}
  box(cx,y0,cz,w,h,d,rot,col=WHITE,uvs=2,top=true){const c=Math.cos(rot),s=Math.sin(rot);const ex=[c,-s],ez=[s,c];const P=(lx,y,lz)=>[cx+ex[0]*lx+ez[0]*lz,y,cz+ex[1]*lx+ez[1]*lz];const hw=w/2,hd=d/2,y1=y0+h;const ref=[cx,y0+h/2,cz];
    const cs=[[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]];for(let i=0;i<4;i++){const A=cs[i],B=cs[(i+1)%4];const L=Math.hypot(B[0]-A[0],B[1]-A[1]);this.quadOut(P(A[0],y0,A[1]),P(B[0],y0,B[1]),P(B[0],y1,B[1]),P(A[0],y1,A[1]),[0,0],[L/uvs,0],[L/uvs,h/uvs],[0,h/uvs],col,ref);}
    if(top)this.quadOut(P(-hw,y1,-hd),P(hw,y1,-hd),P(hw,y1,hd),P(-hw,y1,hd),[0,0],[w/uvs,0],[w/uvs,d/uvs],[0,d/uvs],col,[cx,y0,cz]);}
  get empty(){return this.i?this.i.length===0:!this._n;}
  geo(){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(this.n,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(this.u,2));g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));g.setIndex(this.i);g.computeBoundingSphere();g.computeBoundingBox();this._n=this.i.length;this.p=this.n=this.u=this.c=this.i=null;return g;}
}
