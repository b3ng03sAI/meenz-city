import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {Sky} from 'three/addons/objects/Sky.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// ============================================================
//  MEENZ CITY — Open-World in Mainz (three.js r160)
//  1 Einheit = 1 Meter, +x = Osten, -z = Norden, Ursprung = Dom
// ============================================================
window.addEventListener('error',e=>{const el=document.getElementById('errbox');if(el){el.hidden=false;el.textContent+='\n'+(e.message||e)+' @'+(e.lineno||'');}});
window.addEventListener('unhandledrejection',e=>{const el=document.getElementById('errbox');if(el){el.hidden=false;el.textContent+='\n'+(e.reason&&e.reason.message||e.reason);}});

const IS_TOUCH=!!(window.matchMedia&&matchMedia('(pointer: coarse)').matches);
// Mobilgeräte: Touch-Zeigegerät, Handy-/Tablet-Kennung oder iPad im Desktop-Modus (meldet sich als Mac mit Touch)
const IS_MOBILE=IS_TOUCH||/iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent||'')||(navigator.platform==='MacIntel'&&(navigator.maxTouchPoints||0)>1);
const IS_PHONE=IS_MOBILE&&Math.min(screen.width||0,screen.height||0)<600;
let QUALITY=null;try{QUALITY=localStorage.getItem('meenz-quality');}catch(e){}
if(location.hash==='#niedrig')QUALITY='niedrig';
if(!['ultra','hoch','mittel','niedrig'].includes(QUALITY))QUALITY=IS_PHONE?'niedrig':IS_MOBILE?'mittel':'ultra';
if(IS_MOBILE&&(QUALITY==='ultra'||QUALITY==='hoch'))QUALITY=IS_PHONE?'niedrig':'mittel';// Mobil nie über „Mittel“: GPU/Speicher der Handys reichen dafür nicht
const QS={
  ultra:{tileRes:1536,shadow:4096,shadowBox:150,ao:true,bloom:true,pom:true,msaa:4,detail:2,tex:1024,peds:60,traffic:28,parked:16,pr:2,lights:8,sharp:0.5},
  hoch:{tileRes:1024,shadow:2048,shadowBox:130,ao:false,bloom:true,pom:true,msaa:4,detail:1,tex:1024,peds:50,traffic:24,parked:14,pr:1.5,lights:6,sharp:0.45},
  mittel:{tileRes:512,shadow:2048,shadowBox:110,ao:false,bloom:false,pom:false,msaa:0,detail:0,tex:512,peds:34,traffic:16,parked:8,pr:IS_TOUCH?1.35:1.15,lights:0,sharp:0},
  niedrig:{tileRes:256,shadow:1024,shadowBox:90,ao:false,bloom:false,pom:false,msaa:0,detail:0,tex:256,peds:20,traffic:10,parked:6,pr:1,lights:0,sharp:0,noShadow:true,lowLOD:true},
}[QUALITY];
const Q={tileRes:QS.tileRes,shadow:QS.shadow,peds:QS.peds,traffic:QS.traffic,parked:QS.parked,pixelRatio:Math.min(window.devicePixelRatio||1,QS.pr)};

// ---------- Höhennebel (wie "Exponential Height Fog") ----------
THREE.ShaderChunk.lights_pars_begin='#define HAS_LIGHT_PARS\n'+THREE.ShaderChunk.lights_pars_begin;
THREE.ShaderChunk.fog_pars_vertex=`#ifdef USE_FOG
varying float vFogDepth; varying vec3 vFogWorld;
#endif`;
THREE.ShaderChunk.fog_vertex=`#ifdef USE_FOG
vFogDepth = - mvPosition.z;
vFogWorld = ( inverse( viewMatrix ) * mvPosition ).xyz;
#endif`;
THREE.ShaderChunk.fog_pars_fragment=`#ifdef USE_FOG
uniform vec3 fogColor; varying float vFogDepth; varying vec3 vFogWorld;
#ifdef FOG_EXP2
uniform float fogDensity;
#else
uniform float fogNear; uniform float fogFar;
#endif
#endif`;
THREE.ShaderChunk.fog_fragment=`#ifdef USE_FOG
{
 vec3 fRay = vFogWorld - cameraPosition; float fDist = length(fRay); vec3 fDir = fRay / max(fDist, 1e-4);
 float fA = fogNear; float fB = fogFar; float fH = max(cameraPosition.y, 0.0);
 float rd = fDir.y; float fogAmt;
 if (abs(rd) < 1e-3) fogAmt = fA * exp(-fB*fH) * fDist;
 else fogAmt = (fA/fB) * exp(-fB*fH) * (1.0 - exp(-fB*rd*fDist)) / rd;
 float fogFactor = 1.0 - exp(-max(fogAmt, 0.0));
 vec3 fCol = fogColor;
 #if defined(HAS_LIGHT_PARS) && NUM_DIR_LIGHTS > 0
  vec3 vRay = normalize((viewMatrix * vec4(fDir, 0.0)).xyz);
  float sAmt = pow(max(dot(vRay, directionalLights[0].direction), 0.0), 6.0);
  fCol += directionalLights[0].color * 0.12 * sAmt;
 #endif
 gl_FragColor.rgb = mix(gl_FragColor.rgb, fCol, fogFactor);
}
#endif`;

// ---------- Zufall ----------
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const rng=mulberry32(1105);
const rr=(a,b)=>a+(b-a)*rng();
const ri=(a,b)=>Math.floor(rr(a,b+1));
const pick=arr=>arr[Math.floor(rng()*arr.length)];
const mr=(a,b)=>a+(b-a)*Math.random();
const mpick=arr=>arr[Math.floor(Math.random()*arr.length)];
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const TAU=Math.PI*2;
function angDiff(a,b){let d=b-a;while(d>Math.PI)d-=TAU;while(d<-Math.PI)d+=TAU;return d;}
function smoothstep(a,b,t){t=clamp((t-a)/(b-a),0,1);return t*t*(3-2*t);}
function pip(x,z,poly){let ins=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const xi=poly[i][0],zi=poly[i][1],xj=poly[j][0],zj=poly[j][1];if(((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/(zj-zi)+xi))ins=!ins;}return ins;}
function segDist(px,pz,ax,az,bx,bz){const dx=bx-ax,dz=bz-az;const L=dx*dx+dz*dz;let t=L?((px-ax)*dx+(pz-az)*dz)/L:0;t=clamp(t,0,1);const x=ax+dx*t,z=az+dz*t;return {d:Math.hypot(px-x,pz-z),t,x,z};}
function segInter(a,b,c,d){const rx=b[0]-a[0],rz=b[1]-a[1],sx=d[0]-c[0],sz=d[1]-c[1];const den=rx*sz-rz*sx;if(Math.abs(den)<1e-9)return null;const qx=c[0]-a[0],qz=c[1]-a[1];const t=(qx*sz-qz*sx)/den,u=(qx*rz-qz*rx)/den;if(t>=0&&t<=1&&u>=0&&u<=1)return [t,u];return null;}
function circlePts(cx,cz,r,n){const p=[];for(let i=0;i<=n;i++){const a=i/n*TAU;p.push([cx+Math.cos(a)*r,cz+Math.sin(a)*r]);}return p;}
function offsetPts(pts,off){const out=[];for(let i=0;i<pts.length;i++){const p=pts[i];let nx=0,nz=0;for(const j of [i-1,i]){if(j<0||j+1>=pts.length)continue;const a=pts[j],b=pts[j+1];const dx=b[0]-a[0],dz=b[1]-a[1];const L=Math.hypot(dx,dz)||1;nx+=-dz/L;nz+=dx/L;}const L=Math.hypot(nx,nz)||1;out.push([p[0]+nx/L*off,p[1]+nz/L*off]);}return out;}
const nextFrame=()=>new Promise(r=>setTimeout(r,0));

// ===================== RENDERER / SZENE =====================
const stage=document.getElementById('stage');
const renderer=new THREE.WebGLRenderer({antialias:QS.msaa===0,powerPreference:'high-performance',stencil:false});
renderer.setPixelRatio(Q.pixelRatio);renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=!QS.noShadow;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.62;
stage.appendChild(renderer.domElement);
const ANISO=Math.min(16,renderer.capabilities.getMaxAnisotropy());
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.5,13000);
scene.fog=new THREE.Fog(0xb9c9d8,0.0011,0.012);
const hemi=new THREE.HemisphereLight(0xcfe0ff,0x5e5446,0.25);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff1dc,3.2);
sun.castShadow=!QS.noShadow;sun.shadow.mapSize.set(Q.shadow,Q.shadow);
{const sc=sun.shadow.camera,b=QS.shadowBox;sc.left=-b;sc.right=b;sc.top=b;sc.bottom=-b;sc.near=10;sc.far=900;}
sun.shadow.bias=-0.0003;sun.shadow.normalBias=0.35;
scene.add(sun);scene.add(sun.target);

// ---------- Physikalischer Himmel + IBL ----------
const sky=new Sky();sky.scale.setScalar(20000);sky.frustumCulled=false;scene.add(sky);
const skyU=sky.material.uniforms;skyU.turbidity.value=5;skyU.rayleigh.value=1.4;skyU.mieCoefficient.value=0.004;skyU.mieDirectionalG.value=0.82;
const envScene=new THREE.Scene();const envSky=new Sky();envSky.scale.setScalar(2000);envSky.material.uniforms=skyU;envScene.add(envSky);
const envGround=new THREE.Mesh(new THREE.CircleGeometry(900,32).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x3a3632}));envGround.position.y=-20;envScene.add(envGround);
const pmrem=new THREE.PMREMGenerator(renderer);let envRT=null,envT=-1e9;
function updateEnv(force){if(!force&&Math.abs(gameMinGlobal()-envT)<12)return;envT=gameMinGlobal();const rt=pmrem.fromScene(envScene,0,1,5000);if(envRT)envRT.dispose();envRT=rt;scene.environment=rt.texture;}
let __gm=17*60+35;function gameMinGlobal(){return __gm;}
// Sterne + Mond
const stars=(()=>{const n=1800,p=new Float32Array(n*3);for(let i=0;i<n;i++){const u=Math.random(),v=Math.random()*0.95;const th=u*TAU,ph=Math.acos(1-v);p[i*3]=Math.sin(ph)*Math.cos(th)*1800;p[i*3+1]=Math.cos(ph)*1800;p[i*3+2]=Math.sin(ph)*Math.sin(th)*1800;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(p,3));const m=new THREE.PointsMaterial({color:0xffffff,size:1.6,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false});const pts=new THREE.Points(g,m);pts.frustumCulled=false;pts.renderOrder=-5;scene.add(pts);return pts;})();
// Wolkenkuppel (prozedurales fbm, sonnenbeleuchtet)
const cloudU={time:{value:0},cover:{value:0.52},sunDir:{value:new THREE.Vector3(0,1,0)},sunCol:{value:new THREE.Color(1,1,1)},ambCol:{value:new THREE.Color(0.5,0.55,0.6)},night:{value:0},opacity:{value:1}};
const clouds=new THREE.Mesh(new THREE.SphereGeometry(1900,48,16,0,TAU,0,Math.PI/2),new THREE.ShaderMaterial({uniforms:cloudU,transparent:true,depthWrite:false,side:THREE.BackSide,fog:false,
  vertexShader:`varying vec3 vDir; void main(){ vDir=normalize(position); vec4 w=modelMatrix*vec4(position,1.0); gl_Position=projectionMatrix*viewMatrix*w; gl_Position.z=gl_Position.w*0.99999; }`,
  fragmentShader:`uniform float time,cover,night,opacity; uniform vec3 sunDir,sunCol,ambCol; varying vec3 vDir;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
  float fbm(vec2 p){float s=0.0,a=0.5;for(int i=0;i<6;i++){s+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=0.5;}return s;}
  void main(){ float y=max(vDir.y,0.02); vec2 p=vDir.xz/y*1.6+vec2(time*0.012,time*0.004);
    float d=fbm(p); float c=smoothstep(cover,cover+0.28,d);
    float d2=fbm(p+normalize(sunDir.xz+1e-4)*0.08); float lit=clamp(0.55+(d-d2)*4.0,0.15,1.0);
    float sc=pow(max(dot(normalize(vDir),sunDir),0.0),6.0);
    vec3 col=mix(ambCol, sunCol, lit) + sunCol*sc*0.6*(1.0-c*0.5);
    col=mix(col, ambCol*0.6, smoothstep(0.6,1.0,c)*0.4);
    float a=c*smoothstep(0.02,0.18,vDir.y)*opacity;
    gl_FragColor=vec4(col,a); }`}));
clouds.frustumCulled=false;clouds.renderOrder=-4;scene.add(clouds);

// ---------- Post-Processing ----------
let composer=null,bloomPass=null,aoPass=null,gradePass=null;
const GradeShader={uniforms:{tDiffuse:{value:null},time:{value:0},vignette:{value:0.32},grain:{value:0.035},sat:{value:1.08},contrast:{value:1.06},tint:{value:new THREE.Vector3(1,1,1)},res:{value:new THREE.Vector2(1,1)},wet:{value:0},texel:{value:new THREE.Vector2(0.001,0.001)},sharp:{value:0}},
  vertexShader:`varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform sampler2D tDiffuse; uniform float time,vignette,grain,sat,contrast,wet,sharp; uniform vec3 tint; uniform vec2 res,texel; varying vec2 vUv;
  void main(){ vec2 d=vUv-0.5; float r2=dot(d,d); float ca=0.0025*r2;
    vec3 c=vec3(texture2D(tDiffuse,vUv-d*ca).r, texture2D(tDiffuse,vUv).g, texture2D(tDiffuse,vUv+d*ca).b);
    if(sharp>0.0){vec3 nb=texture2D(tDiffuse,vUv+vec2(texel.x,0.0)).rgb+texture2D(tDiffuse,vUv-vec2(texel.x,0.0)).rgb+texture2D(tDiffuse,vUv+vec2(0.0,texel.y)).rgb+texture2D(tDiffuse,vUv-vec2(0.0,texel.y)).rgb;
      vec3 sh=c+(c-nb*0.25)*sharp; c=clamp(sh,min(c*0.5,c),c*1.6+0.02);}
    float l=dot(c,vec3(0.2126,0.7152,0.0722)); c=mix(vec3(l),c,sat);
    c=0.18*pow(max(c,vec3(0.0))/0.18, vec3(contrast)); c*=tint;
    c*=mix(1.0, smoothstep(0.95,0.25,sqrt(r2)*1.35), vignette);
    float g=fract(sin(dot(vUv*res+fract(time)*91.7,vec2(12.9898,78.233)))*43758.5453)-0.5; c+=g*grain*(0.04+l*0.5);
    gl_FragColor=vec4(c,1.0);} `};
async function setupPost(){
  if(QS.msaa===0&&!QS.bloom){composer=null;return;}
  const w=innerWidth,h=innerHeight;const rt=new THREE.WebGLRenderTarget(w,h,{type:THREE.HalfFloatType,samples:QS.msaa});
  composer=new EffectComposer(renderer,rt);composer.setPixelRatio(Q.pixelRatio);composer.setSize(w,h);
  composer.addPass(new RenderPass(scene,camera));
  if(QS.ao){try{const mod=await import('three/addons/postprocessing/GTAOPass.js');aoPass=new mod.GTAOPass(scene,camera,Math.round(w*0.75),Math.round(h*0.75));aoPass.output=mod.GTAOPass.OUTPUT.Default;aoPass.blendIntensity=0.85;
      aoPass.updateGtaoMaterial({radius:1.6,distanceExponent:1.4,thickness:2.5,scale:1.0,samples:12,distanceFallOff:1.0});aoPass.updatePdMaterial({lumaPhi:10,depthPhi:2,normalPhi:3,radius:6,rings:2,samples:12});composer.addPass(aoPass);}
    catch(e){console.warn('GTAO nicht verfügbar',e);aoPass=null;}}
  if(QS.bloom){bloomPass=new UnrealBloomPass(new THREE.Vector2(w,h),0.32,0.55,0.92);composer.addPass(bloomPass);}
  gradePass=new ShaderPass(GradeShader);gradePass.uniforms.res.value.set(w,h);gradePass.uniforms.sharp.value=QS.sharp||0;gradePass.uniforms.texel.value.set(1/(w*Q.pixelRatio),1/(h*Q.pixelRatio));composer.addPass(gradePass);
  composer.addPass(new OutputPass());
}
function renderFrame(){if(composer){gradePass.uniforms.time.value=performance.now()/1000;composer.render();}else renderer.render(scene,camera);}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);if(composer){composer.setSize(innerWidth,innerHeight);gradePass.uniforms.res.value.set(innerWidth,innerHeight);gradePass.uniforms.texel.value.set(1/(innerWidth*renderer.getPixelRatio()),1/(innerHeight*renderer.getPixelRatio()));if(aoPass&&aoPass.setSize)aoPass.setSize(Math.round(innerWidth*0.75),Math.round(innerHeight*0.75));}});

// ---------- Punktlichter der Straßenlaternen (dynamisch zugewiesen) ----------
const LAMP_LIGHTS=[];for(let i=0;i<QS.lights;i++){const l=new THREE.PointLight(0xffc98a,0,28,1.6);l.castShadow=false;scene.add(l);LAMP_LIGHTS.push(l);}
