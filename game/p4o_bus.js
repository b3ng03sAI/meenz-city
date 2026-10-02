// ===================== LINIENBUS: FAHRGÄSTE SPRINGEN RAUS / STEIGEN EIN =====================
const BUS_INSIDE=['FAHRER! FAHRER!','Der fährt wie mei Oma nach drei Schoppe!','Wieso fahren wir durch de Park?!','Ich muss an de nächste raus!!','Is des hier de Schienenersatzverkehr?','Mama, der Busfahrer hat keine Uniform!','Ich ruf die Mainzer Mobilität an!','Dürfe mir überhaupt so schnell?','Des is schöner als Achterbahn!','Ich hab mei Kaffee verschüttet. Auf den Hund.'];
const BUS_JUMP=['ICH WILL HIER RAUS!','Des is net die Linie 64!','Ich hab nur ’ne Kurzstrecke!','Ich spring! Sag meiner Katze, ich lieb sie!','Fahrkartenkontrolle? NIEMALS!','Fahre Sie über de Rhein? Dann spring ich JETZT!','Ich bin Stuntman! … Seit heute!','Mei Haltestell war vor drei Kilometer!','Halt an! ICH MUSS MAL!','Beste Busfahrt meines Lebens! *springt trotzdem*','Ich zahl net für sowas!','Tschüss, ihr Verlierer! *Hechtsprung*','Ich hab Höhenangst – aber Busangst is schlimmer!'];
const BUS_LAND=['Aua. Mei Rücke.','Ich geb nur ein Stern auf Google!','Nochmal! NOCHMAL!','Ich hab mei Fahrkart verlore.','Wo bin ich? Wiesbaden?! NEIN!','Des war mei Haltestell. Ungefähr.','Ich hab mich nur leicht … gerollt.','Ich verklag de Bus. Und de Rhein. Alle.','… Ich lebe! ICH LEBE!'];
const BUS_LEAVE=['Danke fürs Fahren, du Psychopath.','Nie wieder Linie 9.','Ich lauf ab jetzt. Für immer.','Fünf Sterne. Würd ich wieder mache.','Mei Puls is bei 190. Danke.'];
const BUS_BOARD=['Fährt der zum Hauptbahnhof?','Einmal Kurzstrecke, bitte!','Endlich! Ich wart seit ’ner Stunde!','Is der Bus geklaut? … Egal, hauptsach er fährt.','Hab kein Ticket, aber gute Laune!'];
function isBus(c){return c&&c.T&&c.T.bus;}
function busBub(c){if(!c.bub)c.bub={x:c.x,y:c.y,z:c.z,alive:true,removed:false,g:c.g};c.bub.x=c.x;c.bub.y=c.y+1.4;c.bub.z=c.z;return c.bub;}
function busEject(c,P,calm=false){if(!(c.pax>0))return;c.pax--;const side=Math.random()<0.75?1:-1;const [x,z]=doorPos(c,side);if(blocked(x,z,0.5))return;const h=new Human('ped');h.x=x;h.z=z;h.y=groundY(x,z);h.facing=c.h+side*Math.PI/2;h.walkSpeed=1.4;h.side=1;
  if(calm||Math.abs(c.speed)<1.5){h.state='walk';pedFlee(h,c.x,c.z,4);say(h,mpick(BUS_LEAVE),3);h.setExpr(mpick(['angry','cringe','smug']));}
  else{const lx=Math.cos(c.h)*side,lz=-Math.sin(c.h)*side;knockHuman(h,c.vx*0.55+lx*3.5,c.vz*0.55+lz*3.5,3.2,mr(2,6),false);say(h,mpick(BUS_JUMP),2.6,'loud');h.setExpr('surprised');
    setTimeout(()=>{if(h.alive&&!h.removed){say(h,mpick(BUS_LAND),3);h.setExpr(mpick(['sad','angry','laugh','cringe']));}},2400);}
  h.sync();updateBusHud(P);}
function updateBusHud(P){if(P.busHudT>0)return;P.busHudT=0.5;}
function updateBuses(dt){if(mode!=='play')return;
  for(const c of CARS)if(isBus(c)&&c.pax===undefined)c.pax=Math.floor(mr(6,17));
  for(const P of PLAYERS){const c=P.car;if(!isBus(c)){P.busC=null;continue;}
    if(P.busC!==c){P.busC=c;P.busJumpT=mr(2,5);P.busShoutT=mr(1,3);P.busStillT=0;hint(`Linienbus geklaut! <b>${c.pax}</b> Fahrgäste an Bord. Halt an Haltestellen: +€2 pro Fahrgast.`,4,P);
      if(c.pax>0)setTimeout(()=>{if(P.car===c)say(busBub(c),mpick(['Äh … Sie sind net unser Busfahrer!','HILFE! Ein Busdieb!','Ist das ein Überfall? Ich hab nur 3 Euro!']),3,'loud');},800);}
    const sp=Math.abs(c.speed);
    if(sp>3&&c.pax>0){P.busShoutT-=dt;if(P.busShoutT<=0){P.busShoutT=mr(4,8);say(busBub(c),mpick(BUS_INSIDE),2.6,'loud');}
      P.busJumpT-=dt*(sp>12?1.6:1);if(P.busJumpT<=0){P.busJumpT=mr(4,10);busEject(c,P);if(c.pax===0)hint('Alle Fahrgäste sind rausgesprungen. Der Bus ist leer.',3,P);}}
    else if(c.bub&&c.bub.bubble){c.bub.x=c.x;c.bub.z=c.z;}
    if(c.bub){c.bub.x=c.x;c.bub.y=c.y+1.4;c.bub.z=c.z;}
    // Halten: Leute steigen aus / ein
    if(sp<0.5){P.busStillT+=dt;if(P.busStillT>1.5&&!P.busStopped){P.busStopped=true;
        const st=BUS_STOPS.find(s=>Math.hypot(s.x-c.x,s.z-c.z)<16);
        const nOut=Math.min(c.pax,Math.floor(mr(0,3)));for(let i=0;i<nOut;i++)setTimeout(()=>{if(P.car===c)busEject(c,P,true);},i*600);
        if(st){const nIn=Math.floor(mr(1,5));hint(`Haltestelle <b>${st.name||'Haltestelle'}</b> – ${nIn} Fahrgäste steigen ein.`,2.5,P);
          for(let i=0;i<nIn;i++){const a=Math.random()*6.28;const x=st.x+Math.cos(a)*mr(1,4),z=st.z+Math.sin(a)*mr(1,4);if(blocked(x,z,0.5))continue;const h=new Human('ped');h.x=x;h.z=z;h.y=groundY(x,z);h.state='board';h.board=c;h.boardT=12;h.walkSpeed=1.6;h.sync();if(i===0)say(h,mpick(BUS_BOARD),2.5);}}}}
    else{P.busStillT=0;P.busStopped=false;}}
  // Einsteigende Fahrgäste
  for(let i=HUMANS.length-1;i>=0;i--){const h=HUMANS[i];if(h.state!=='board')continue;const c=h.board;h.boardT-=dt;if(!c||c.removed||h.boardT<=0||Math.abs(c.speed)>1){h.state='walk';continue;}
    const [dx,dz]=doorPos(c,1);const vx=dx-h.x,vz=dz-h.z,L=Math.hypot(vx,vz);if(L<0.8||(h.stuckB||0)>1.2){h.remove();c.pax=(c.pax||0)+1;G.money+=2;chime([880]);const P=PLAYERS.find(Q=>Q.car===c);if(P)hint(`+ €2 Fahrgeld · ${c.pax} Fahrgäste`,1.5,P);continue;}
    const ox=h.x,oz=h.z;const mv=moveHuman(h,vx,vz,2.2,dt);if(Math.hypot(h.x-ox,h.z-oz)<dt*0.5)h.stuckB=(h.stuckB||0)+dt;else h.stuckB=0;faceTo(h,vx,vz,dt,8);h.animate(dt,2.2);h.y=groundY(h.x,h.z);h.sync();}}
