const handler={
  get(t,p){ if(p===Symbol.toPrimitive) return ()=>0; if(p==='then') return undefined; if(p===Symbol.iterator) return undefined; if(p in t) return t[p]; return U(); },
  apply(){ return U(); }, construct(){ return U(); }, set(t,p,v){ t[p]=v; return true; }
};
function U(){ const f=function(){}; return new Proxy(f,handler); }
export class WebGLRenderer{ constructor(){ this.domElement=document.createElement('canvas'); return new Proxy(this,handler);} }
const names='ACESFilmicToneMapping AdditiveBlending BackSide BoxGeometry BufferGeometry CanvasTexture CircleGeometry ClampToEdgeWrapping Color ConeGeometry CylinderGeometry DirectionalLight DoubleSide Float32BufferAttribute Fog Group HemisphereLight IcosahedronGeometry InstancedMesh Line LineBasicMaterial Matrix4 Mesh MeshBasicMaterial MeshStandardMaterial NormalBlending PCFSoftShadowMap PerspectiveCamera PlaneGeometry PointLight Quaternion RepeatWrapping RingGeometry SRGBColorSpace Scene ShaderMaterial SphereGeometry Sprite SpriteMaterial Vector3 SpotLight';
export const ACESFilmicToneMapping=U(),AdditiveBlending=U(),BackSide=U(),BoxGeometry=U(),BufferGeometry=U(),CanvasTexture=U(),CircleGeometry=U(),ClampToEdgeWrapping=U(),Color=U(),ConeGeometry=U(),CylinderGeometry=U(),DirectionalLight=U(),DoubleSide=U(),Float32BufferAttribute=U(),Fog=U(),Group=U(),HemisphereLight=U(),IcosahedronGeometry=U(),InstancedMesh=U(),Line=U(),LineBasicMaterial=U(),Matrix4=U(),Mesh=U(),MeshBasicMaterial=U(),MeshStandardMaterial=U(),NormalBlending=U(),PCFSoftShadowMap=U(),PerspectiveCamera=U(),PlaneGeometry=U(),PointLight=U(),Quaternion=U(),RepeatWrapping=U(),RingGeometry=U(),SRGBColorSpace=U(),Scene=U(),ShaderMaterial=U(),SphereGeometry=U(),LatheGeometry=U(),TorusKnotGeometry=U(),OctahedronGeometry=U(),Sprite=U(),SpriteMaterial=U(),Vector3=U();

export const PMREMGenerator=U(),PointsMaterial=U(),Points=U(),BufferAttribute=U(),WebGLRenderTarget=U(),HalfFloatType=U(),NoColorSpace=U(),Vector2=U(),Shape=U(),Path=U(),ShapeGeometry=U(),ExtrudeGeometry=U(),CapsuleGeometry=U(),MeshPhysicalMaterial=U(),InstancedBufferAttribute=U(),LineSegments=U(),ShaderChunk=U();
export const SpotLight=U();
export const TorusGeometry=U(),ShapeUtils=U();
