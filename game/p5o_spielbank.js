// ===================== 28 Spielbank im Kurhaus Wiesbaden =====================
// Roulette and Black Jack in the Kurhaus hall (WIWAHR.hall), play money G.money only, a bet limit per round, a doorman
// with a dress-code gag and croupiers who speak Hessisch. Everything hooks into the Kurhaus venue through wrappers
// around its build/npcs hooks, so the room stays lazy (built on first entry) and static parts merge into the
// venue's existing per-material meshes (no extra draw calls for tables, stools and chips).
const SPIELBANK={MIN:5,MAX:100,STAKES:[5,10,20,50,100],stake:10,seat:null,menu:null,visit:false,
  roul:{phase:'idle',bet:null,stake:0,n:null,spinT:0,last:null,history:[],wheelA:0,ballA:0,ballR:0.3,line:''},
  bj:{phase:'idle',stake:0,player:[],dealer:[],deck:[],result:null,net:0,doubled:false,dealT:0,line:''},
  dress:{checked:false,kind:null,line:null},bowtie:null,rounds:0,net:0,breakSaid:false,signFixed:false,built:false,
  croupiers:{},doorman:null,vis:null,pose:{roul:null,bj:null},mem:null,meshes:0,hintT:0,
  SPIN_T:3.2,DEAL_STEP:0.7,BREAK_N:12,SEAT_R:1.7,
  // local hall coordinates (inside WIWAHR.hall); seat = where the player sits, facing the table (-z)
  TABLES:{roul:{x:-6,z:-10,w:4.2,d:1.8,seat:[-5.3,-8.55],name:'Roulette'},bj:{x:6,z:-10,w:3.0,d:1.6,seat:[6,-8.65],name:'Black Jack'}},
  DOOR:{x0:-5,x1:5,z0:9,z1:13.5}};

// European wheel order (pocket i sits at angle i*TAU/37 on the wheel texture)
const SPIELBANK_WHEEL=[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const SPIELBANK_RED=new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const SPIELBANK_BETS={rot:{label:'Rot',odds:1},schwarz:{label:'Schwarz',odds:1},gerade:{label:'Gerade',odds:1},
  ungerade:{label:'Ungerade',odds:1},zero:{label:'Zero',odds:35}};
const SPIELBANK_SUITS=['♠','♥','♦','♣'];
const SPIELBANK_RANKS=['','A','2','3','4','5','6','7','8','9','10','B','D','K'];
const SPIELBANK_SAY={
  roulStart:['Mache Se Ihr Spiel, mei Liewe!','Faites vos jeux – odder uff Hessisch: Setze Se mal!','Rot, Schwarz, Zero – alles is drin, nix is sicher.'],
  roulSpin:['Rien ne va plus – nix geht mehr!','Jetzt is Schluss mit Setze, die Kugel rollt!','Die Kugel is unnerwegs. Finger weg vom Tisch!'],
  win:['Ei gude, do haste awwer Massel gehabbt!','Gewonne! Des langt fer e Rippche mit Kraut.','Ei verbibbsch, schon widder gewonne!','Na also. Do freut sich die Oma.'],
  lose:['Schad drum. Des Geld geht jetzt in de Kurpark.','Verlorn. Awwer schee gespielt, gell?','Ach Gottche. Nächstes Mal, bestimmt.','Des war nix. Kopp hoch, die Kuppel is aach noch do.'],
  zero:['Null! Do freut sich die Bank – un des Land Hesse.'],
  bjDeal:['Zwaa Karte fer Sie, zwaa fer mich.','Dann wolle mer mal. Karte kommt!','Gemischt is, geteilt werd.'],
  bjBj:['Black Jack! Do guck ich awwer – des gibt anderthalbfach!'],
  bjBust:['Iwwerkauft! Mehr wie einezwanzisch is zu viel, mei Liewer.'],
  bjDealer:['Ich zieh bis sechzeh, ab siebzeh bleib ich. Is Vorschrift, net mei Idee.'],
  bjPush:['Gleichstand. Do kriehe Se Ihr Geld zurück, ganz ohne Gebabbel.'],
  limit:['Unner fünf Euro mache mer nix, iwwer hunnert aach net. Mir sin e anständisch Haus!'],
  broke:['Ohne Geld kaa Spiel. Geh erst emol schaffe!'],
  pause:['Jetzt mach emol Paus, guck dir die Ente im Kurpark aa. Die Karte laafe net fort.'],
  idle:['Ei gude! Hock dich hie, der Tisch is frei.','Kaa Echtgeld, nur Spielgeld – un trotzdem spannend.','Ich bin seit 1987 im Haus. De Tisch aach.']};
const SPIELBANK_DRESS={
  leuchtschuh:'Leuchtschuh? Mir sin e Spielbank, kaa Disco. Na gut – nemme Se die Fliege, dann fällt’s net so uff.',
  jga:'Team Kalle? Der Junggeselleabschied is draus am Brunne. Fliege um, dann derfe Se rei.',
  betrunke:'Sie schwanke ja wie de Rhein bei Hochwasser. Hier, e Fliege – un an de Bar nur Wasser, gell?',
  schick:'Dunkel von Kopp bis Fuß – Sie sehe aus wie unser Croupier. Bitte, eintrete! Die Fliege gibt’s trotzdem.',
  bunt:'Des Hemd is so laut, do hör ich die Kugel net mehr. Hier, e Leih-Fliege, dann geht’s.',
  normal:'Dresscode is Sakko. Sie hawwe … e Jack. Na ja. Hier, e Leih-Fliege, dann sin Se fein.'};

// ---------- pure rules (also used by the test) ----------
function spielbankStakeOk(stake,money){if(!(stake>=SPIELBANK.MIN&&stake<=SPIELBANK.MAX))return 'limit';if(money<stake)return 'broke';return null;}
function spielbankRoulWins(kind,n){if(kind==='zero')return n===0;if(n===0)return false;
  if(kind==='rot')return SPIELBANK_RED.has(n);if(kind==='schwarz')return !SPIELBANK_RED.has(n);if(kind==='gerade')return n%2===0;if(kind==='ungerade')return n%2===1;return false;}
// gross return (stake included) for a resolved roulette bet; even-money bets lose on zero ("die Bank gewinnt")
function spielbankRoulPayout(kind,n,stake){return spielbankRoulWins(kind,n)?stake*(SPIELBANK_BETS[kind].odds+1):0;}
function spielbankCardVal(c){return c.r>=10?10:c.r;}
function spielbankHandValue(hand){let s=0,ace=false;for(const c of hand){s+=spielbankCardVal(c);if(c.r===1)ace=true;}return ace&&s+10<=21?s+10:s;}
function spielbankIsBj(hand){return hand.length===2&&spielbankHandValue(hand)===21;}
function spielbankCardText(c){return SPIELBANK_RANKS[c.r]+SPIELBANK_SUITS[c.s];}
function spielbankHandText(hand,hideHole){return hand.map((c,i)=>hideHole&&i===1?'🂠':spielbankCardText(c)).join(' ');}
function spielbankDressKind(o){if(o.shoes)return 'leuchtschuh';if(o.jga)return 'jga';if(o.drunk>0.3)return 'betrunke';
  if(typeof o.hex!=='number')return 'normal';
  // HSL from the sRGB hex by hand: the verdict must not depend on THREE (stubbed in tests)
  const r=(o.hex>>16&255)/255,g=(o.hex>>8&255)/255,b=(o.hex&255)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),l=(mx+mn)/2;
  const s=mx===mn?0:(mx-mn)/(1-Math.abs(2*l-1));if(l<0.12)return 'schick';if(s>0.55&&l>0.25)return 'bunt';return 'normal';}

// ---------- shared resources (built once with the room) ----------
const SPIELBANK_RES={};
function spielbankWheelTex(){return freeAfterUpload(canvasTex(512,512,g=>{const c=256;g.fillStyle='#3a2314';g.fillRect(0,0,512,512);
  g.fillStyle='#5a3a20';g.beginPath();g.arc(c,c,254,0,TAU);g.fill();
  const N=37,da=TAU/N;g.textAlign='center';g.textBaseline='middle';g.font='700 22px Arial,sans-serif';
  for(let i=0;i<N;i++){const n=SPIELBANK_WHEEL[i],a0=i*da-da/2;g.fillStyle=n===0?'#1f7a3a':SPIELBANK_RED.has(n)?'#b3121e':'#141414';
    g.beginPath();g.moveTo(c,c);g.arc(c,c,236,a0,a0+da);g.closePath();g.fill();g.strokeStyle='#d4af37';g.lineWidth=2;g.stroke();
    g.save();g.translate(c+Math.cos(i*da)*214,c+Math.sin(i*da)*214);g.rotate(i*da+Math.PI/2);g.fillStyle='#f5ecd2';g.fillText(String(n),0,0);g.restore();}
  g.fillStyle='#4a2c16';g.beginPath();g.arc(c,c,150,0,TAU);g.fill();g.strokeStyle='#d4af37';g.lineWidth=6;g.beginPath();g.arc(c,c,150,0,TAU);g.stroke();
  g.fillStyle='#d4af37';g.beginPath();g.arc(c,c,40,0,TAU);g.fill();for(let k=0;k<4;k++){g.save();g.translate(c,c);g.rotate(k*Math.PI/2);g.fillRect(-6,-110,12,90);g.restore();}},false));}
function spielbankLayoutTex(){return freeAfterUpload(canvasTex(512,256,g=>{g.fillStyle='#0f5a2a';g.fillRect(0,0,512,256);g.strokeStyle='#f1e6c8';g.lineWidth=2;
  g.textAlign='center';g.textBaseline='middle';const x0=56,cw=37.5,ch=46;
  g.fillStyle='#1f7a3a';g.fillRect(8,10,x0-12,ch*3);g.strokeRect(8,10,x0-12,ch*3);g.fillStyle='#f1e6c8';g.font='700 26px Arial,sans-serif';g.fillText('0',8+(x0-12)/2,10+ch*1.5);
  for(let col=0;col<12;col++)for(let row=0;row<3;row++){const n=col*3+(3-row);const x=x0+col*cw,y=10+row*ch;g.strokeRect(x,y,cw,ch);
    g.fillStyle=SPIELBANK_RED.has(n)?'#b3121e':'#141414';g.beginPath();g.arc(x+cw/2,y+ch/2,15,0,TAU);g.fill();g.fillStyle='#f1e6c8';g.font='700 17px Arial,sans-serif';g.fillText(String(n),x+cw/2,y+ch/2+1);}
  const labels=[['GERADE','#f1e6c8'],['ROT','#b3121e'],['SCHWARZ','#141414'],['UNGERADE','#f1e6c8']];const bw=(cw*12)/4;
  labels.forEach(([t,col],k)=>{const x=x0+k*bw,y=10+ch*3+10;g.strokeRect(x,y,bw,52);g.fillStyle=col==='#f1e6c8'?'#f1e6c8':col;
    if(col!=='#f1e6c8'){g.fillRect(x+12,y+10,bw-24,32);g.fillStyle='#f1e6c8';}g.font='700 20px "Barlow Condensed",Arial Narrow,sans-serif';g.fillText(t,x+bw/2,y+26);});
  g.font='italic 700 16px "Barlow Condensed",Arial Narrow,sans-serif';g.fillStyle='#e9d9a8';g.fillText('Einsatz € 5 – 100 · nur Spielgeld',256,244);},false));}
function spielbankBjFeltTex(){return freeAfterUpload(canvasTex(512,256,g=>{g.fillStyle='#0f4f3a';g.fillRect(0,0,512,256);g.strokeStyle='#e9d9a8';g.lineWidth=3;
  g.beginPath();g.arc(256,-150,330,0.25*Math.PI,0.75*Math.PI);g.stroke();g.textAlign='center';g.fillStyle='#e9d9a8';
  g.font='800 34px "Barlow Condensed",Arial Narrow,sans-serif';g.fillText('BLACK JACK ZAHLT 3 : 2',256,70);
  g.font='italic 700 22px "Barlow Condensed",Arial Narrow,sans-serif';g.fillText('Die Bank zieht bis 16 un bleibt ab 17',256,104);
  g.strokeRect(206,150,100,70);g.font='700 18px "Barlow Condensed",Arial Narrow,sans-serif';g.fillText('EINSATZ',256,190);},false));}
// card atlas: 14 columns (A..K + back) x 4 suits, 73x128 px each
function spielbankCardTex(){return freeAfterUpload(canvasTex(1024,512,g=>{g.fillStyle='#222';g.fillRect(0,0,1024,512);g.textAlign='center';g.textBaseline='middle';
  for(let s=0;s<4;s++)for(let r=1;r<=14;r++){const x=(r-1)*73,y=s*128;
    if(r===14){g.fillStyle='#7a0f1a';g.fillRect(x+3,y+3,67,122);g.strokeStyle='#e9d9a8';g.lineWidth=2;g.strokeRect(x+8,y+8,57,112);
      for(let k=0;k<6;k++){g.beginPath();g.arc(x+36.5,y+64,6+k*7,0,TAU);g.stroke();}continue;}
    g.fillStyle='#fbf8f0';g.fillRect(x+3,y+3,67,122);const red=s===1||s===2;g.fillStyle=red?'#c0101c':'#111';
    g.font='700 24px Arial,sans-serif';g.fillText(SPIELBANK_RANKS[r],x+19,y+22);g.font='20px Arial,sans-serif';g.fillText(SPIELBANK_SUITS[s],x+19,y+44);
    g.font='48px Arial,sans-serif';g.fillText(SPIELBANK_SUITS[s],x+40,y+82);}},false));}
function spielbankRes(){if(SPIELBANK_RES.cardMat)return SPIELBANK_RES;const R=SPIELBANK_RES;
  R.wheelMat=new THREE.MeshStandardMaterial({map:spielbankWheelTex(),roughness:0.35,metalness:0.2});
  R.layoutMat=new THREE.MeshStandardMaterial({map:spielbankLayoutTex(),roughness:0.9});
  R.bjMat=new THREE.MeshStandardMaterial({map:spielbankBjFeltTex(),roughness:0.9});
  R.cardMat=new THREE.MeshStandardMaterial({map:spielbankCardTex(),roughness:0.6});
  R.ballMat=new THREE.MeshStandardMaterial({color:0xf8f8f4,roughness:0.2});
  R.bowlMat=new THREE.MeshStandardMaterial({color:0x4a2c16,roughness:0.5,metalness:0.1});
  R.vest=stdMat({color:0x5a0f1a,roughness:0.7});R.shirt=stdMat({color:0xf2f0ea,roughness:0.8});R.portier=stdMat({color:0x1b2a1f,roughness:0.7});
  R.tieMat=stdMat({color:0x7a0f1a,roughness:0.6});R.tieWing=new THREE.ConeGeometry(0.03,0.06,4).rotateZ(Math.PI/2);R.tieKnot=new THREE.SphereGeometry(0.014,6,4);
  R.cardGeo={};return R;}
function spielbankCardGeo(c){const R=spielbankRes();const k=c?c.s*13+c.r-1:'back';if(R.cardGeo[k])return R.cardGeo[k];
  const geo=new THREE.PlaneGeometry(0.15,0.24).rotateX(-Math.PI/2);const col=c?c.r-1:13,row=c?c.s:0;
  const u0=col*73/1024,u1=(col+1)*73/1024,v1=1-row*0.25,v0=1-(row+1)*0.25;const uv=geo.attributes&&geo.attributes.uv;
  if(uv&&uv.setXY){uv.setXY(0,u0,v1);uv.setXY(1,u1,v1);uv.setXY(2,u0,v0);uv.setXY(3,u1,v0);uv.needsUpdate=true;}
  return R.cardGeo[k]=geo;}

// ---------- building into the Kurhaus hall ----------
function spielbankBuild(r,B){const R=spielbankRes();const T=SPIELBANK.TABLES;const memA=spielbankHeap();let meshes=0;const add=m=>{B.mesh(m);meshes++;return m;};
  // Roulette table: wood body, green felt, gold rim, bowl with spinning wheel at the croupier end
  {const t=T.roul;B.sbox('wood',t.x,0,t.z,t.w,0.86,t.d,0x4a2a14);B.box('cloth',t.x,0.86,t.z,t.w-0.1,0.03,t.d-0.1,0x0f5a2a);
    for(const s of [-1,1]){B.box('gold',t.x,0.86,t.z+s*(t.d/2-0.03),t.w,0.05,0.06,0xd4af37);B.box('gold',t.x+s*(t.w/2-0.03),0.86,t.z,0.06,0.05,t.d,0xd4af37);}
    const wx=t.x-1.3;const bowl=add(new THREE.Mesh(new THREE.CylinderGeometry(0.52,0.46,0.14,32),R.bowlMat));bowl.position.set(wx,0.96,t.z);
    const wheel=add(new THREE.Mesh(new THREE.CircleGeometry(0.44,48).rotateX(-Math.PI/2),R.wheelMat));wheel.position.set(wx,1.035,t.z);
    const ball=add(new THREE.Mesh(new THREE.SphereGeometry(0.022,10,8),R.ballMat));ball.position.set(wx+0.3,1.06,t.z);
    const lay=add(new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.2).rotateX(-Math.PI/2),R.layoutMat));lay.position.set(t.x+0.65,0.895,t.z);
    SPIELBANK.vis={wheel,ball,wx,wz:t.z,cards:[]};
    // chip stacks of the bank
    [[0xb3121e,0],[0x1f3a8a,0.09],[0xf2f0ea,0.18],[0x1a1a1a,0.27]].forEach(([c,o])=>B.box('cloth',t.x-0.35+o,0.89,t.z-0.62,0.07,0.08+o*0.3,0.07,c));
    for(const sx of [-0.6,0.7,1.8])B.box('wood',t.x+sx,0,t.z+1.35,0.42,0.5,0.42,0x5a3a22);}
  // Black Jack table
  {const t=T.bj;B.sbox('wood',t.x,0,t.z,t.w,0.86,t.d,0x4a2a14);B.box('cloth',t.x,0.86,t.z,t.w-0.1,0.03,t.d-0.1,0x0f4f3a);
    for(const s of [-1,1]){B.box('gold',t.x,0.86,t.z+s*(t.d/2-0.03),t.w,0.05,0.06,0xd4af37);B.box('gold',t.x+s*(t.w/2-0.03),0.86,t.z,0.06,0.05,t.d,0xd4af37);}
    const felt=add(new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.3).rotateX(-Math.PI/2),R.bjMat));felt.position.set(t.x,0.893,t.z);
    B.box('wood',t.x+1.0,0.89,t.z-0.6,0.3,0.18,0.2,0x2a1a0e);   // card shoe
    [[0xb3121e,0],[0x1f3a8a,0.09],[0x1a1a1a,0.18]].forEach(([c,o])=>B.box('cloth',t.x-1.1+o,0.89,t.z-0.6,0.07,0.1,0.07,c));
    for(const sx of [-1.0,0,1.0])B.box('wood',t.x+sx,0,t.z+1.3,0.42,0.5,0.42,0x5a3a22);}
  // red carpet runner from the foyer to the tables, velvet ropes at the hall entrance
  B.box('cloth',0,0.031,-1,3,0.01,22,0x7a1020);
  for(const s of [-1,1]){for(const z of [8,6])B.box('gold',s*2.2,0,z,0.12,1.0,0.12,0xd4af37);B.box('cloth',s*2.2,0.85,7,0.05,0.06,2,0x8a1020);}
  // Card meshes are pooled and reused (one shared atlas material)
  for(let i=0;i<12;i++){const m=add(new THREE.Mesh(spielbankCardGeo(null),R.cardMat));m.visible=false;SPIELBANK.vis.cards.push(m);}
  SPIELBANK.meshes=meshes;SPIELBANK.built=true;const memB=spielbankHeap();SPIELBANK.mem=memA!=null&&memB!=null?memB-memA:null;}
function spielbankHeap(){const m=performance&&performance.memory;return m&&typeof m.usedJSHeapSize==='number'?m.usedJSHeapSize:null;}
// the placeholder sign is drawn by the Kurhaus build; swap its text while that build runs
const spielbankBuildKurhaus=WIWAHR.venue.build;
WIWAHR.venue.build=function(r,B){const _tt=textTex;
  textTex=function(text,o){if(text==='SPIELBANK – BALD GEÖFFNET'){SPIELBANK.signFixed=true;return freeAfterUpload(_tt('SPIELBANK · ROULETTE · BLACK JACK',Object.assign({},o,{bg:'#3a0d14',fg:'#ffd23f'})));}return _tt(text,o);};
  try{spielbankBuildKurhaus.call(this,r,B);}finally{textTex=_tt;}
  spielbankBuild(r,B);};
WIWAHR.venue.sub='Foyer unter der Kuppel · Großer Saal · Spielbank';
for(const k of WIWAHR.venue.hints)if(k.t.includes('bald die Spielbank'))k.t='Die Spielbank: Roulette links, Black Jack rechts. Hin un <b>E</b> drücke.';

function spielbankDressCroupier(h,vest){const R=spielbankRes();h.g.traverse(m=>{const G2=m.geometry;if(!G2)return;
  if(G2===BODY.torsoM||G2===BODY.torsoF)m.material=vest;else if(G2===BODY.armM||G2===BODY.armF||G2===SG.shoulder)m.material=R.shirt;});}
const spielbankNpcsKurhaus=WIWAHR.venue.npcs;
WIWAHR.venue.npcs=function(r){spielbankNpcsKurhaus.call(this,r);const R=spielbankRes();const T=SPIELBANK.TABLES;
  for(const o of r.people)if(o.vlines&&o.vlines.some(l=>l.includes('mache mer grad schee')))o.vlines=['Gude! Willkommen im Kurhaus.','Die Spielbank is im große Saal. Dresscode! Mehr odder weniger.','Bitte die Schuh abputze, des is Parkett.','Aus Meenz? Ei, des sieht mer.'];
  const mk=(lx,lz,face,vest,lines)=>{const h=vPerson(r,lx,lz,face,{role:'stand',lines});h.vpose='spielbank';h.mission=true;h.health=1e5;spielbankDressCroupier(h,vest);return h;};
  SPIELBANK.croupiers={roul:mk(T.roul.x-0.4,T.roul.z-1.3,0,R.vest,SPIELBANK_SAY.idle),bj:mk(T.bj.x,T.bj.z-1.25,0,R.vest,SPIELBANK_SAY.idle)};
  SPIELBANK.croupiers.roul.spielbankName='Frau Hildegard Bernsdorf';SPIELBANK.croupiers.bj.spielbankName='Herr Erwin Schnorrbusch';
  SPIELBANK.doorman=mk(3.6,11.4,0,R.portier,['Gude. Spielbank is do hinne.','Dresscode, gell? Ich guck genau.']);SPIELBANK.doorman.spielbankName='Portier Pfeiffer';
  const G1=['Ich setz immer uff Rot. Ich bin halt Meenzer.','Psst, ich zähl Karte. Bis drei.','Mei Glückssocke wirkt heut net.','Ei, des is spannender wie Fernsehe.'];
  vPerson(r,T.roul.x+1.8,T.roul.z+1.35,Math.PI,{pose:'sit',lines:G1});vPerson(r,T.bj.x-1.0,T.bj.z+1.3,Math.PI,{pose:'sit',lines:G1});};

// ---------- money & croupier talk ----------
function spielbankSay(key,who){const h=who||null;const line=mpick(SPIELBANK_SAY[key]);if(h&&!h.removed)say(h,line,3.4);return line;}
function spielbankCroupier(t){const h=SPIELBANK.croupiers[t];return h&&!h.removed?h:null;}
function spielbankTake(t,stake){const err=spielbankStakeOk(stake,G.money);if(err){const line=spielbankSay(err,spielbankCroupier(t));hint(line,2.5,P1);chime([300,220]);return false;}
  G.money-=stake;return true;}
function spielbankCount(net){SPIELBANK.rounds++;SPIELBANK.net+=net;
  if(SPIELBANK.rounds>=SPIELBANK.BREAK_N&&!SPIELBANK.breakSaid){SPIELBANK.breakSaid=true;const t=SPIELBANK.seat?SPIELBANK.seat.t:'roul';spielbankSay('pause',spielbankCroupier(t));}}

// ---------- roulette ----------
// forcedN only for tests that need a specific pocket; normal play draws from the game RNG (Math.random, seeded in tests)
function spielbankRoulBet(kind,forcedN){const R=SPIELBANK.roul;if(R.phase!=='idle'||!SPIELBANK_BETS[kind])return false;const stake=SPIELBANK.stake;
  if(!spielbankTake('roul',stake))return false;
  R.phase='spin';R.bet=kind;R.stake=stake;R.n=typeof forcedN==='number'?forcedN:Math.floor(Math.random()*37);R.spinT=SPIELBANK.SPIN_T;R.ballR=0.4;
  R.line=spielbankSay('roulSpin',spielbankCroupier('roul'));chime([660]);spielbankMenuRender();return true;}
function spielbankRoulResolve(){const R=SPIELBANK.roul;if(R.phase!=='spin')return;const pay=spielbankRoulPayout(R.bet,R.n,R.stake);G.money+=pay;
  const net=pay-R.stake;R.last={n:R.n,bet:R.bet,stake:R.stake,pay,net};R.history.unshift(R.n);R.history.length=Math.min(R.history.length,8);R.phase='idle';R.spinT=0;
  const col=R.n===0?'grün':SPIELBANK_RED.has(R.n)?'rot':'schwarz';const cr=spielbankCroupier('roul');
  R.line=net>0?spielbankSay('win',cr):R.n===0?spielbankSay('zero',cr):spielbankSay('lose',cr);
  hint(`<b>${R.n}</b> ${col} · ${net>0?`gewonne <b>+€${net}</b>`:`verlorn −€${R.stake}`}`,3,P1);chime(net>0?[523,659,784]:[330,262]);
  spielbankCount(net);spielbankMenuRender();}
function spielbankRoulUpdate(dt){const R=SPIELBANK.roul,V=SPIELBANK.vis;R.wheelA+=dt*(R.phase==='spin'?1.6:0.25);
  const target=SPIELBANK_WHEEL.indexOf(R.n??0)*TAU/37-R.wheelA;
  if(R.phase==='spin'){R.spinT-=dt;const k=Math.max(0,R.spinT/SPIELBANK.SPIN_T);R.ballA=target-k*k*26;R.ballR=0.3+0.1*Math.min(1,k*1.6);if(R.spinT<=0)spielbankRoulResolve();}
  else{R.ballA=target;R.ballR=0.3;}
  if(V&&V.wheel){V.wheel.rotation.y=R.wheelA;V.ball.position.set(V.wx+Math.cos(R.ballA)*R.ballR,1.06,V.wz+Math.sin(R.ballA)*R.ballR);}}

// ---------- black jack ----------
function spielbankNewDeck(forced){if(forced)return forced.map((r,i)=>({r,s:i%4}));const d=[];for(let s=0;s<4;s++)for(let r=1;r<=13;r++)d.push({r,s});
  for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}return d;}
function spielbankDraw(){const J=SPIELBANK.bj;if(!J.deck.length)J.deck=spielbankNewDeck();return J.deck.shift();}
// forcedRanks (tests only): ranks in deal order player, dealer, player, dealer(hole), then hits/dealer draws
function spielbankBjDeal(forcedRanks){const J=SPIELBANK.bj;if(J.phase!=='idle'&&J.phase!=='done')return false;const stake=SPIELBANK.stake;
  if(!spielbankTake('bj',stake))return false;
  J.deck=spielbankNewDeck(forcedRanks);J.player=[];J.dealer=[];J.stake=stake;J.doubled=false;J.result=null;J.net=0;
  J.player.push(spielbankDraw());J.dealer.push(spielbankDraw());J.player.push(spielbankDraw());J.dealer.push(spielbankDraw());
  J.phase='player';J.line=spielbankSay('bjDeal',spielbankCroupier('bj'));
  const pb=spielbankIsBj(J.player),db=spielbankIsBj(J.dealer);
  if(pb||db)spielbankBjFinish(pb&&db?'push':pb?'blackjack':'dealerbj');else spielbankMenuRender();return true;}
function spielbankBjHit(){const J=SPIELBANK.bj;if(J.phase!=='player')return false;J.player.push(spielbankDraw());const v=spielbankHandValue(J.player);
  if(v>21)spielbankBjFinish('bust');else if(v===21)spielbankBjStand();else spielbankMenuRender();return true;}
function spielbankBjCanDouble(){const J=SPIELBANK.bj;return J.phase==='player'&&J.player.length===2&&G.money>=J.stake&&!J.doubled;}
function spielbankBjDouble(){const J=SPIELBANK.bj;if(!spielbankBjCanDouble())return false;G.money-=J.stake;J.stake*=2;J.doubled=true;J.player.push(spielbankDraw());
  if(spielbankHandValue(J.player)>21)spielbankBjFinish('bust');else spielbankBjStand();return true;}
function spielbankBjStand(){const J=SPIELBANK.bj;if(J.phase!=='player')return false;J.phase='dealer';J.dealT=SPIELBANK.DEAL_STEP;J.line=spielbankSay('bjDealer',spielbankCroupier('bj'));spielbankMenuRender();return true;}
// dealer draws one card per DEAL_STEP until 17 or more (stands on soft 17)
function spielbankBjDealerStep(){const J=SPIELBANK.bj;const v=spielbankHandValue(J.dealer);if(v<17){J.dealer.push(spielbankDraw());spielbankMenuRender();return;}
  const p=spielbankHandValue(J.player);spielbankBjFinish(v>21?'dealerbust':p>v?'win':p===v?'push':'lose');}
function spielbankBjFinish(result){const J=SPIELBANK.bj;const s=J.stake;
  const pay={blackjack:s+Math.floor(s*1.5),win:2*s,dealerbust:2*s,push:s,lose:0,bust:0,dealerbj:0}[result];
  G.money+=pay;J.net=pay-s;J.result=result;J.phase='done';const cr=spielbankCroupier('bj');
  J.line=result==='blackjack'?spielbankSay('bjBj',cr):result==='bust'?spielbankSay('bjBust',cr):result==='push'?spielbankSay('bjPush',cr):J.net>0?spielbankSay('win',cr):spielbankSay('lose',cr);
  const txt={blackjack:'BLACK JACK!',win:'Gewonne!',dealerbust:'Bank iwwerkauft – gewonne!',push:'Gleichstand',lose:'Verlorn',bust:'Iwwerkauft',dealerbj:'Bank hat Black Jack'}[result];
  hint(`${txt} ${J.net>0?`<b>+€${J.net}</b>`:J.net<0?`−€${-J.net}`:'±€0'}`,3,P1);chime(J.net>0?[523,659,784]:J.net<0?[330,262]:[440]);
  spielbankCount(J.net);spielbankMenuRender();}
function spielbankBjUpdate(dt){const J=SPIELBANK.bj;if(J.phase==='dealer'){J.dealT-=dt;if(J.dealT<=0){J.dealT=SPIELBANK.DEAL_STEP;spielbankBjDealerStep();}}
  const V=SPIELBANK.vis;if(!V)return;const t=SPIELBANK.TABLES.bj;let k=0;
  const place=(hand,z,hide)=>hand.forEach((c,i)=>{const m=V.cards[k++];if(!m)return;m.visible=true;m.geometry=spielbankCardGeo(hide&&i===1?null:c);m.position.set(t.x-0.3+i*0.17,0.9+i*0.002,t.z+z);});
  if(J.phase!=='idle'){place(J.player,0.3,false);place(J.dealer,-0.3,J.phase==='player');}
  for(;k<V.cards.length;k++)V.cards[k].visible=false;}

// ---------- seat, menu, keys ----------
function spielbankRoom(){const v=WIWAHR.venue;return v&&v.room&&P1.h&&P1.h.room===v.room?v.room:null;}
function spielbankTableNear(P){const r=spielbankRoom();if(!r||P!==P1||P.car)return null;const h=P.h;
  for(const t in SPIELBANK.TABLES){const T=SPIELBANK.TABLES[t];if(Math.hypot(h.x-r.ox-T.seat[0],h.z-r.oz-T.seat[1])<SPIELBANK.SEAT_R)return t;}return null;}
function spielbankBusy(){return SPIELBANK.roul.phase==='spin'||SPIELBANK.bj.phase==='player'||SPIELBANK.bj.phase==='dealer';}
function spielbankSit(t){const r=spielbankRoom();if(!r||!SPIELBANK.TABLES[t])return false;SPIELBANK.seat={t};const P=P1;P.vy=0;
  const cr=spielbankCroupier(t);if(cr)say(cr,mpick(t==='roul'?SPIELBANK_SAY.roulStart:SPIELBANK_SAY.bjDeal),3);
  spielbankMenuRender();if(document.pointerLockElement)document.exitPointerLock();return true;}
function spielbankStand(){if(!SPIELBANK.seat)return false;if(spielbankBusy()){hint('Erst fertig spiele, dann uffstehe!',2,P1);return false;}
  SPIELBANK.seat=null;if(SPIELBANK.bj.phase==='done')SPIELBANK.bj.phase='idle';spielbankMenuClose();return true;}
function spielbankCycleStake(){const L=SPIELBANK.STAKES;SPIELBANK.stake=L[(L.indexOf(SPIELBANK.stake)+1)%L.length];spielbankMenuRender();}
function spielbankMenuOpts(){const s=SPIELBANK.seat;if(!s)return [];const st=`Einsatz: €${SPIELBANK.stake} (ändern)`;
  if(s.t==='roul'){if(SPIELBANK.roul.phase!=='idle')return [];
    return [...['rot','schwarz','gerade','ungerade'].map(k=>({label:`€${SPIELBANK.stake} uff ${SPIELBANK_BETS[k].label} (1:1)`,fn:()=>spielbankRoulBet(k)})),
      {label:`€${SPIELBANK.stake} uff Zero (35:1)`,fn:()=>spielbankRoulBet('zero')},{label:st,fn:spielbankCycleStake},{label:'Uffstehe',fn:spielbankStand}];}
  const J=SPIELBANK.bj;if(J.phase==='player'){const o=[{label:'Karte!',fn:spielbankBjHit},{label:'Ich bleib',fn:spielbankBjStand}];if(spielbankBjCanDouble())o.push({label:`Verdoppele (+€${J.stake})`,fn:spielbankBjDouble});return o;}
  if(J.phase==='dealer')return [];
  return [{label:`Austeile – €${SPIELBANK.stake}`,fn:()=>spielbankBjDeal()},{label:st,fn:spielbankCycleStake},{label:'Uffstehe',fn:spielbankStand}];}
function spielbankMenuText(){const s=SPIELBANK.seat;if(s.t==='roul'){const R=SPIELBANK.roul;
    const hist=R.history.length?`<div style="opacity:.75">Letzte Zahle: ${R.history.map(n=>`<b style="color:${n===0?'#5fd38a':SPIELBANK_RED.has(n)?'#ff6b6b':'#ddd'}">${n}</b>`).join(' ')}</div>`:'';
    const now=R.phase==='spin'?`Die Kugel rollt … (€${R.stake} uff ${SPIELBANK_BETS[R.bet].label})`:R.last?`Zuletzt: <b>${R.last.n}</b> – ${R.last.net>0?`+€${R.last.net}`:`−€${R.last.stake}`}`:'Mache Se Ihr Spiel!';
    return `${now}${hist}<div style="opacity:.8;font-style:italic">Croupière Hildegard: „${R.line||'Gude!'}“</div>`;}
  const J=SPIELBANK.bj;if(J.phase==='idle')return `Zwaa Karte, dann entscheide Se. Bank bleibt ab 17, Black Jack zahlt 3:2.<div style="opacity:.8;font-style:italic">Croupier Erwin: „Gude, hock dich hie.“</div>`;
  const pv=spielbankHandValue(J.player),hide=J.phase==='player';
  return `Du: <b>${spielbankHandText(J.player)}</b> = ${pv}<br>Bank: <b>${spielbankHandText(J.dealer,hide)}</b>${hide?'':` = ${spielbankHandValue(J.dealer)}`}
    <div style="opacity:.8;font-style:italic">Croupier Erwin: „${J.line}“</div>`;}
function spielbankMenuEl(){let el=document.getElementById('spielbankmenu');if(el)return el;el=document.createElement('div');el.id='spielbankmenu';el.hidden=true;
  el.style.cssText='position:fixed;right:2%;bottom:9%;z-index:60;width:min(420px,92vw);background:rgba(20,12,10,0.93);color:#fbf4df;border:2px solid #d4af37;border-radius:10px;padding:12px 16px;font:16px "Barlow Condensed",Arial Narrow,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,0.55)';
  el.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('button');if(b)spielbankChoose(+b.dataset.i);});document.body.appendChild(el);return el;}
function spielbankMenuRender(){const s=SPIELBANK.seat;if(!s){spielbankMenuClose();return;}const el=spielbankMenuEl();const opts=spielbankMenuOpts();SPIELBANK.menu={t:s.t,opts};
  el.innerHTML=`<div style="font:800 21px Bungee,'Barlow Condensed',sans-serif;color:#d4af37;margin-bottom:4px">${SPIELBANK.TABLES[s.t].name}</div>`+
    `<div style="margin-bottom:6px">${spielbankMenuText()}</div>`+
    opts.map((o,i)=>`<button data-i="${i}" style="display:block;width:100%;text-align:left;margin:4px 0;padding:6px 10px;background:#3a2016;color:#fff;border:1px solid #6b4a2a;border-radius:6px;font:inherit;cursor:pointer"><kbd style="background:#d4af37;color:#111;border-radius:3px;padding:0 6px;margin-right:8px">${i+1}</kbd>${o.label}</button>`).join('')+
    `<div style="opacity:.6;font-size:13px;margin-top:4px">Spielgeld · Einsatz €${SPIELBANK.MIN}–${SPIELBANK.MAX} · <b>E</b>/Esc: uffstehe</div>`;el.hidden=false;}
function spielbankMenuClose(){SPIELBANK.menu=null;const el=document.getElementById('spielbankmenu');if(el)el.hidden=true;}
function spielbankChoose(i){const M=SPIELBANK.menu;if(!M||!M.opts[i])return false;M.opts[i].fn();return true;}
addEventListener('keydown',e=>{if(mode!=='play'||TALK)return;
  if(SPIELBANK.menu){const k=/^Digit([1-9])$/.exec(e.code);
    if(k){spielbankChoose(+k[1]-1);e.stopImmediatePropagation();e.preventDefault();return;}
    if(e.code==='Escape'){spielbankStand();e.stopImmediatePropagation();e.preventDefault();return;}}
  if(e.code!=='KeyE'||e.repeat||SHOP_UI.open)return;
  if(SPIELBANK.seat){spielbankStand();return;}const t=spielbankTableNear(P1);if(t)spielbankSit(t);},true);
// a croupier next to the seat must not start a chat when E means "sit down"
const spielbankTalkCandidate=talkCandidate;
talkCandidate=function(P){if(P===P1&&(SPIELBANK.seat||spielbankTableNear(P)))return null;return spielbankTalkCandidate(P);};
// over-the-table camera while seated
const spielbankCamPos=new THREE.Vector3(),spielbankCamTgt=new THREE.Vector3();
const spielbankTalkCamera=talkCamera;
talkCamera=function(P,dt){if(P===P1&&SPIELBANK.seat){const r=spielbankRoom();if(r){const T=SPIELBANK.TABLES[SPIELBANK.seat.t];
    spielbankCamPos.set(r.ox+T.seat[0]+0.4,r.oy+2.3,r.oz+T.seat[1]+1.5);spielbankCamTgt.set(r.ox+T.x+(SPIELBANK.seat.t==='roul'?-0.4:0),r.oy+0.9,r.oz+T.z);
    const cam=P.camera;cam.position.lerp(spielbankCamPos,1-Math.exp(-dt*5));cam.lookAt(spielbankCamTgt);return true;}}
  return spielbankTalkCamera(P,dt);};

// ---------- dress code at the hall entrance ----------
function spielbankShirtHex(h){let hex=null;h.hips.traverse(m=>{if(hex!==null||!m.geometry)return;if(m.geometry===BODY.torsoM||m.geometry===BODY.torsoF||m.geometry===HGEO.torso){const c=m.material&&m.material.color;const v=c&&c.getHex?c.getHex():null;if(typeof v==='number')hex=v;}});return hex;}
function spielbankDressCheck(P){const h=P.h;const kind=spielbankDressKind({shoes:!!P.shoesOn,jga:!!h.jgaShirt,drunk:P.drunk||0,hex:spielbankShirtHex(h)});
  const line=SPIELBANK_DRESS[kind];Object.assign(SPIELBANK.dress,{checked:true,kind,line});
  if(SPIELBANK.doorman&&!SPIELBANK.doorman.removed)say(SPIELBANK.doorman,line,5);hint('Portier Pfeiffer leiht dir e <b>Fliege</b>. Jetzt bisde salonfähig.',3.5,P);chime([784,988]);
  spielbankBowtie(h,true);}
function spielbankBowtie(h,on){const R=spielbankRes();if(on&&!SPIELBANK.bowtie){const g=new THREE.Group();g.position.set(0,0.635,0.11);
    for(const s of [-1,1]){const w=new THREE.Mesh(R.tieWing,R.tieMat);w.position.x=s*0.03;w.rotation.z=s>0?Math.PI:0;g.add(w);}g.add(new THREE.Mesh(R.tieKnot,R.tieMat));h.hips.add(g);SPIELBANK.bowtie={g,h};}
  else if(!on&&SPIELBANK.bowtie){const b=SPIELBANK.bowtie;b.h.hips.remove(b.g);SPIELBANK.bowtie=null;}}

// ---------- croupier gestures (arms stay low and forward, see p3c_haltung.js) ----------
function spielbankCroupierPose(t,h){if(!h||h.removed)return;let rx=-0.45,rz=-0.06,lx=-0.45,lz=0.06;
  if(t==='roul'&&SPIELBANK.roul.phase==='spin'&&SPIELBANK.roul.spinT>SPIELBANK.SPIN_T-0.9){rx=-0.85+0.1*Math.sin(simTime*9);rz=0.35;}
  if(t==='bj'&&(SPIELBANK.bj.phase==='dealer'||SPIELBANK.bj.phase==='player')){rx=-0.6+0.12*Math.sin(simTime*7);rz=0.3;}
  h.armR.rotation.x=rx;h.armR.rotation.z=rz;h.armL.rotation.x=lx;h.armL.rotation.z=lz;SPIELBANK.pose[t]={rx,rz,lx,lz};}

// ---------- lifecycle ----------
function spielbankLeave(){const R=SPIELBANK.roul,J=SPIELBANK.bj;if(R.phase==='spin')spielbankRoulResolve();
  if(J.phase==='player')spielbankBjStand();while(J.phase==='dealer')spielbankBjDealerStep();if(J.phase==='done')J.phase='idle';
  SPIELBANK.seat=null;spielbankMenuClose();if(SPIELBANK.bowtie)spielbankBowtie(null,false);
  SPIELBANK.visit=false;SPIELBANK.dress.checked=false;SPIELBANK.rounds=0;SPIELBANK.breakSaid=false;}
function setupSpielbank(){}
function updateSpielbank(dt){const r=spielbankRoom();if(!r){if(SPIELBANK.visit)spielbankLeave();return;}
  const P=P1,h=P.h;SPIELBANK.visit=true;const lx=h.x-r.ox,lz=h.z-r.oz;const D=SPIELBANK.DOOR;
  if(!SPIELBANK.dress.checked&&lx>D.x0&&lx<D.x1&&lz>D.z0&&lz<D.z1)spielbankDressCheck(P);
  if(SPIELBANK.seat){const T=SPIELBANK.TABLES[SPIELBANK.seat.t];h.x=r.ox+T.seat[0];h.z=r.oz+T.seat[1];h.y=r.oy;h.vx=h.vz=0;P.vy=0;h.facing=Math.PI;
    h.hips.position.y=0.55;h.legL.rotation.x=-1.5;h.legR.rotation.x=-1.5;h.armL.rotation.x=-0.5;h.armR.rotation.x=-0.5;h.sync();}
  else{SPIELBANK.hintT-=dt;const t=spielbankTableNear(P);if(t&&SPIELBANK.hintT<=0){SPIELBANK.hintT=0.8;hint(`<b>E</b>: an den ${SPIELBANK.TABLES[t].name}-Tisch hocke`,1,P);}}
  spielbankRoulUpdate(dt);spielbankBjUpdate(dt);
  spielbankCroupierPose('roul',SPIELBANK.croupiers.roul);spielbankCroupierPose('bj',SPIELBANK.croupiers.bj);}
Object.assign(SPIELBANK,{roulBet:spielbankRoulBet,roulPayout:spielbankRoulPayout,bjDeal:spielbankBjDeal,bjHit:spielbankBjHit,bjStand:spielbankBjStand,
  bjDouble:spielbankBjDouble,handValue:spielbankHandValue,dressKind:spielbankDressKind,sit:spielbankSit,stand:spielbankStand,choose:spielbankChoose,tableNear:()=>spielbankTableNear(P1)});
