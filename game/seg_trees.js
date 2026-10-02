// ===================== BÄUME UND LATERNEN (echte Standorte aus OSM) =====================
const TREES=[];
const TREE_HASH=new Map();
function treeNear(x,z,r){const cx=Math.floor(x/8),cz=Math.floor(z/8);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const l=TREE_HASH.get((cx+a)+','+(cz+b));if(l)for(const t of l)if(Math.abs(t.x-x)<r&&Math.abs(t.z-z)<r)return true;}return false;}
function addTree(x,z,s=1,force=false){const i=idx(x,z);if(i<0||hgG(i)||(mfG(i)&4)||bridgeLocal(x,z))return false;if(!force&&(mfG(i)&2))return false;
  if(treeNear(x,z,force?2.2:4.5))return false;const t={x,z,s};TREES.push(t);const k=Math.floor(x/8)+','+Math.floor(z/8);if(!TREE_HASH.has(k))TREE_HASH.set(k,[]);TREE_HASH.get(k).push(t);return true;}
function placeTrees(){
  const T0=OSM.trees;for(let i=0;i<T0.length;i+=3){const x=T0[i]/10,z=T0[i+1]/10,h=T0[i+2];addTree(x,z,h>0?clamp(h/11,0.6,1.6):rr(0.8,1.25),true);}
  const R=mulberry32(77);
  for(const a of AREAS){const k=a.kind;if(!(k==='park'||k==='forest'||k==='grass'||k==='cemetery'||k==='garden'))continue;const area=Math.abs(polyArea(a.poly));if(area<120)continue;
    const dens=k==='forest'?1/55:k==='park'?1/320:k==='cemetery'?1/200:k==='garden'?1/400:1/900;const n=Math.min(400,Math.floor(area*dens));const bb=a.bb||bboxOf(a.poly);
    let placed=0;for(let t=0;t<n*8&&placed<n;t++){const x=lerp(bb[0],bb[2],R()),z=lerp(bb[1],bb[3],R());if(!pip(x,z,a.poly))continue;if(addTree(x,z,0.75+R()*0.6))placed++;}}
  for(const t of TREES)rasterCirc(HG,t.x,t.z,0.45,6);
}
function placeLamps(){
  const L=OSM.lamps;for(let i=0;i<L.length;i+=2){const x=L[i]/10,z=L[i+1]/10;const k=idx(x,z);if(k<0||hgG(k)>6||(mfG(k)&4)||bridgeLocal(x,z))continue;
    // zur nächsten Straße ausrichten
    const n=nearestNode(x,z,false);let face=0;if(n>=0){const N=NODES[n];face=Math.atan2(N.x-x,N.z-z);}LAMPS.push({x,z,y:0,face});}
  // Hauptstraßen ohne erfasste Laternen auffüllen
  const has=(x,z)=>LAMPS.some(l=>Math.abs(l.x-x)<14&&Math.abs(l.z-z)<14);
  for(const r of ROADS){if(r.type!=='main'||r.bridge)continue;const pts=r.pts;let acc=0;for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1];const Ls=Math.hypot(b[0]-a[0],b[1]-a[1]);if(Ls<0.1)continue;const n=[-(b[1]-a[1])/Ls,(b[0]-a[0])/Ls];
    for(let t=(30-acc%30);t<Ls;t+=30){const x=lerp(a[0],b[0],t/Ls),z=lerp(a[1],b[1],t/Ls);const s=((i+Math.floor(t/30))%2)?1:-1;const o=r.w/2+Math.max(0.6,r.sw-0.7);const px=x+n[0]*o*s,pz=z+n[1]*o*s;const k=idx(px,pz);if(k<0||hgG(k)||(mfG(k)&4)||has(px,pz))continue;LAMPS.push({x:px,z:pz,y:0,face:Math.atan2(-n[0]*s,-n[1]*s)});}acc+=Ls;}}
  for(const l of LAMPS)if(l.y===0)rasterCirc(HG,l.x,l.z,0.2,6);
}
