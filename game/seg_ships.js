const SHIPS=[];
function buildShips(){
  const mk=(kind)=>{const g=new THREE.Group();
    if(kind==='barge'){const hull=new THREE.Mesh(new THREE.BoxGeometry(9.5,3.6,85),stdMat({color:0x1f2a2a}));hull.position.y=-5.4;g.add(hull);
      for(let i=0;i<7;i++)for(let j=0;j<2;j++){const c=new THREE.Mesh(new THREE.BoxGeometry(4.2,2.5,10.5),stdMat({color:mpick([0xa83a2a,0x2e5f8a,0x3d7a4a,0xc28a2a,0x7a7a7a])}));c.position.set(-2.2+j*4.4,-2.35,-28+i*11);c.castShadow=true;g.add(c);}
      const wh=new THREE.Mesh(boxGeo(7,6,6,6.8,6),facMat('modern',0xf2f2ee));wh.position.set(0,-0.6,38);wh.castShadow=true;g.add(wh);}
    else{const hull=new THREE.Mesh(new THREE.BoxGeometry(11,3.6,100),stdMat({color:0xf3f3f0}));hull.position.y=-5.2;g.add(hull);
      const band=new THREE.Mesh(new THREE.BoxGeometry(11.1,0.6,100.2),stdMat({color:0x1a4d94}));band.position.y=-4.6;g.add(band);
      for(let k=0;k<2;k++){const d=new THREE.Mesh(boxGeo(10,2.6,86-k*20,13.6,10.4),facMat('modern',0xffffff));d.position.y=-2.1+k*2.6;d.castShadow=true;g.add(d);}}
    scene.add(g);return g;};
  const L=RHINE_CUM[RHINE_CUM.length-1];
  SHIPS.push({g:mk('barge'),s:L*0.55,dir:1,speed:3.2,lane:-55});
  SHIPS.push({g:mk('barge'),s:L*0.8,dir:-1,speed:4.0,lane:60});
  SHIPS.push({g:mk('cruise'),s:L*0.7,dir:1,speed:4.5,lane:-30});
}
// Schiffe fahren entlang der Rhein-Mittellinie (s = Bogenlänge, dir +1 = flussabwärts)
function updateShips(dt){const L=RHINE_CUM[RHINE_CUM.length-1];for(const s of SHIPS){s.s+=s.dir*s.speed*dt;if(s.s>L-50)s.s=60;if(s.s<50)s.s=L-60;
  const p=rhineAt(s.s);const o=s.lane*s.dir;const nx=-p.dz,nz=p.dx;s.g.position.set(p.x+nx*o,0,p.z+nz*o);s.g.rotation.y=Math.atan2(p.dx*s.dir,p.dz*s.dir);}}
