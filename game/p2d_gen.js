// ===================== WELT ERZEUGEN (aus OpenStreetMap-Daten) =====================
async function generateWorld(progress0){const t0=performance.now();const progress=(f,t)=>{progress0(f,t+' ('+((performance.now()-t0)/1000).toFixed(1)+' s)');};
  progress(0.01,'Texturen');await nextFrame();
  await buildTextures((f,n)=>progress(0.01+f*0.28,'Material: '+n));
  initMaterials();
  progress(0.3,'Wahrzeichen');await nextFrame();
  buildLandmarks();
  progress(0.33,'Rhein');await nextFrame();
  {maskInto(MFLAG,g=>{waterPath(g);g.fill('evenodd');},110,4);}
  waterToHG();
  maskInto(MFLAG,(g,v)=>{for(const a of PARKS){const b=a.bb||(a.bb=bboxOf(a.poly));if(b[2]<v[0]||b[0]>v[2]||b[3]<v[1]||b[1]>v[3])continue;fillShape(g,a.poly);}});PARK_GRID=true;
  for(const s of SOLIDS){const h=Math.min(254,Math.ceil(s.h));if(s.k==='obb')rasterOBB(HG,s.x,s.z,s.w,s.d,s.rot,h);else rasterCirc(HG,s.x,s.z,s.r,h);}
  for(const s of ELEVS){if(s.k==='obb')elevOBB(s.x,s.z,s.w,s.d,s.rot,s.b,s.t);else elevCirc(s.x,s.z,s.r,s.b,s.t,s.dome?(u=>Math.sqrt(Math.max(0,1-u*u))*0.53+0.47):s.cone?(u=>1-u):null);}
  progress(0.36,'Straßennetz');await nextFrame();
  {maskInto(MFLAG,(g,v)=>{for(const r of ROADS){if(r.type==='path'||r.bridge)continue;const b=r.bb0||(r.bb0=bboxOf(r.pts,r.w+r.sw+2));if(b[2]<v[0]||b[0]>v[2]||b[3]<v[1]||b[1]>v[3])continue;strokePts(g,r.pts,Math.max(2,r.w+2*r.sw-1));}},110,2);
  buildGraph();}
  gridCompact();
  progress(0.4,'Gebäude');await nextFrame();
  {decodeBuildings();
  for(let i=0;i<OB.length;i++){planOSMBuilding(OB[i]);}}
  // Landmarken-Flächen frei halten
  progress(0.44,'Gebäude');await nextFrame();
  cityChunks();{let i=0;const n=CITY.chunks.size;for(const c of CITY.chunks.values()){if(Math.hypot(c.cx-POI.start[0],c.cz-POI.start[1])>CITY_LOW_R){i++;continue;}c.low=buildChunkGroup(c,-1);i++;if(i%12===0){progress(0.44+0.1*i/n,`Gebäude (Fernansicht) ${i}/${n}`);await nextFrame();}}}
  progress(0.54,'Gebäude in der Nähe');await nextFrame();updateCityLOD(POI.start[0],POI.start[1],999,true);
  progress(0.57,'Straßen und Plätze');await nextFrame();
  buildRoads();buildGroundMeshes();
  progress(0.63,'Rhein und Brücke');await nextFrame();
  buildRiver();buildBridge();buildGirderBridges();
  progress(0.68,'Bäume und Stadtmöbel');await nextFrame();
  placeTrees();placeLamps();buildTrees();buildProps();buildShips();
  progress(0.72,'Geschäfte');await nextFrame();
  buildShops();
  progress(0.75,'Boden');await nextFrame();
  await buildGround(f=>progress(0.75+f*0.2,'Boden'));
  buildOverview();
  updateStaticLOD(POI.start[0],POI.start[1],true);window.__GRID=gridCompact();maskC.width=1;maskC.height=1;
  progress(0.96,'Licht');await nextFrame();
}
