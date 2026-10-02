// ===================== 22 MEENZER AUTORADIO =====================
// Nur für P1 in einem Motorfahrzeug (kein Fahrrad). Taste N: nächster Sender … „Aus“ … wieder von vorn.
// Vier fiktive Sender: Schunkelmusik (prozedural per WebAudio), Talkradio, Nachrichten (reagieren auf Taten des
// Spielers über einen crime()-Wrapper und Raser-Erkennung), Verkehrsfunk mit echten Straßennamen aus dem Straßengraph.
// Ohne laufenden AudioContext (headless) läuft der Zustand trotzdem weiter – nur der Ton fehlt.
const RADIO={on:false,sel:0,station:null,line:'',log:[],said:[],street:'',vol:0,lineT:0,
  song:null,songT:0,songN:0,aIdx:0,aStart:null,bus:null,fastT:0,raserCD:0,newsI:0,talkTopic:null,talkI:0,hostI:0,hud:null,hudKey:'',
  RASER_V:33,RASER_T:1.5,RASER_CD:60,NEWS_MAX_AGE:180,BASE_VOL:0.5,DUCK:0.5,
  stations:[
    {id:'helau',name:'Radio Helau',freq:'88,8',kind:'music',host:'Kalle Kreppel',intro:'Radio Helau – Schunkele, bis die Kapp fliecht!'},
    {id:'talk',name:'Meenz Talk',freq:'94,1',kind:'talk',host:'Schorsch & Inge',intro:'Meenz Talk – mer babbele, ihr fahrt.'},
    {id:'news',name:'Meenzer Depesch',freq:'101,5',kind:'news',host:'Waltraud Pfeffer',intro:'Meenzer Depesch – Nachrichte, frisch wie e Weck.'},
    {id:'verkehr',name:'Stau-Funk Rheinhesse',freq:'106,7',kind:'traffic',host:'Sigi vom Stau-Funk',intro:'Stau-Funk Rheinhesse – mer wisse, wo’s klemmt.'}]};

// --- Texte (alles fiktiv: Sender, Leute, Lieder) ---
const RADIO_SONGS=[['Mer schunkele bis de Rhoi steht','Kapelle Kreppelkaffee'],['Kreppel im Herz','Die Fidele Schoppestecher'],
  ['Uff de Zitadell spielt die Musik','Blechbläser vom Hiwwel'],['Woi, Weck un Worscht','Musikzug Bleichebrass'],['De Schoppe-Galopp','Kapelle Kreppelkaffee'],
  ['Elf-Elf-Elfer-Walzer','Die Rheinuferbuwe'],['Mei Herz is e Zugplakettche','Gretel un die Gänsjer'],['Am Fischtor geht die Sonn uff','Die Fidele Schoppestecher'],
  ['Spundekäs-Polka','Blechbläser vom Hiwwel'],['Drei Mol Helau un aamol Woi','Musikzug Bleichebrass'],['Die Fleischworscht-Ballade','Die Rheinuferbuwe'],
  ['Schunkel-Express nach Bretzenheim','Gretel un die Gänsjer']];
const RADIO_HOST=['Helau, ihr Leut! Hier is de Kalle – mer schunkele aach im Stau.','Arm unnerhake! Awwer bitte nur an de Ampel, gell.',
  'Wer jetzt net mitsingt, kriegt kaan Kreppel.','Bei uns is immer elf Minute nach elf.','Ruft an mit eurem Musikwunsch – mer spiele dann trotzdem was anneres.',
  'Des war schee! Do krieg isch Gänsehaut bis in die Pappnas.','Kapelle, uff geht’s – un eins, un zwei, un drei!','Des nächste Stück geht raus an all die, wo grad en Parkplatz suche.',
  'Fenster runner, Musik nuff – die Nachbarn freue sich bestimmt.'];
const RADIO_HOST_WANTED=['Do hinne blinkt’s blau – is des schon de Fastnachtsumzug?','Hörst du die Sirene? Die spiele bestimmt mit, nur e bissi schief.'];
const RADIO_TALK=[
  [['S','Ei gude wie, Inge! Was liegt heut an?'],['I','Gude, Schorsch! Mer babbele iwwer’s Parke in de Innenstadt.'],['S','Parke? In Meenz? Des is doch e Märche.'],['I','Mei Schwager sucht seit Rosenmontag en Parkplatz.']],
  [['I','Schorsch, was is besser: Weck, Worscht oder Woi?'],['S','Des is wie bei de Kinner – mer hot alle drei gleich lieb.'],['I','Un de Spundekäs?'],['S','De is des Lieblingsenkelche.']],
  [['S','Mer hawwe en Anrufer: de Herbert aus Mombach!'],['I','Herbert, du bist uff Sendung!'],['S','… Herbert? Sei Fraa sagt, er schunkelt grad.'],['I','Dann ruf später nochemol an, Herbert. Helau!']],
  [['I','Die Wissbadener saache, ihr Kurpark wär scheener wie unser Rheinufer.'],['S','Die saache aach, ihr Woi wär trocke. Mer losse se babbele.'],['I','Gell, mer sinn jo tolerant.'],['S','Bis zur Mitte vun de Brück.']],
  [['S','Inge, hast du dei Kostüm für Fassenacht schon?'],['I','Isch geh als Dom.'],['S','Als Dom? Der hot doch sechs Türm!'],['I','Drum fang isch jetzt schon an mit Nähe.']],
  [['I','Wusstest du, dass de Gutenberg en Meenzer war?'],['S','Klar! Ohne den hätt mer kaa Zeitung, kaa Plakat un kaan Bierdeckel.'],['I','Un kaa Rezept für Kreppel.'],['S','Des hot er bestimmt als Erschtes gedruckt.']],
  [['I','En Hörer fragt: Wie mach isch Spundekäs?'],['S','Frischkäs, Quark, Paprika, Zwiwwel – un viel Liebe.'],['I','Un Brezel dezu!'],['S','Ohne Brezel is es bloß e Uffstrich.']],
  [['S','Heut hot’s am Rhoi mehr Gäns wie Touriste.'],['I','Die Gäns babbele wenigstens Meenzerisch.'],['S','Inge! Mer sinn e weltoffenes Studio!']],
  [['I','Schorsch, wie werd’s Wetter?'],['S','Isch guck mal raus … nass vun obbe, Woi vun inne.'],['I','Also wie immer.']],
  [['S','Was is eigentlich en echte Meenzer?'],['I','Aaner, der uff em Wochemarkt mit jedem babbelt – aach mit de Taube.'],['S','Un der beim Schoppe nie „Prost“ sagt, sondern „Zum Wohl, die Pfalz“.'],['I','Schorsch, des sinn doch die annern!']],
  [['I','Neulich hot mer aaner gesagt, Meenz wär e Dorf.'],['S','E Dorf mit Dom, Rhoi un drei Million Kreppel im Jahr?'],['I','Dann halt e sehr großes Dorf.']]];
const RADIO_TALK_WANTED=[['I','Hörst du die Sirene, Schorsch?'],['S','Do jagt die Polizei widder aaner quer dorch die Stadt.'],['I','Hoffentlich hot der wenigstens e gut Radio an.']];
const RADIO_TALK_NAMES={S:'Schorsch',I:'Inge'};
const RADIO_NEWS_FILLER=['De Stadtrat hot beschlosse: Uff de Rheinwiese gibt’s bald mehr Bänk zum Schunkele.','Weinmarkt: Die Winzer melde en prächtige Jahrgang. Mer sinn net iwwerrascht.',
  'Die Fleischworscht bleibt teuer – de Kringel kost bald so viel wie en Schoppe.','Uff de Zitadell is e Fledermauskolonie eingezoge. Die Tierche solle sich wohlfühle.',
  'Fundbüro meldet: dreihundert Pappnase, zwaa Kappe un en einzelne Schuh abgegewe.','Meenz un Wissbade streite widder, wem die Brück gehört. Die Brück selbst äußert sich net.',
  'Am Dom läute die Glocke heut e bissi lauter – de Küster hot Geburtstag.','Rhoipegel: De Fluss is noch do. Mer bleiwe dran.',
  'Die Baustell am Rheinufer werd bis Fassenacht fertig. Welche Fassenacht, wurd net gesagt.'];
const RADIO_CRIME_NEWS={
  kill:'Schlimme Sach in {d}: Zeuge berichte vun ere tödliche Schlägerei. Die Polizei ermittelt.',
  killCop:'Angriff uff en Polizist in {d}! Großfahndung im ganze Stadtgebiet.',
  carjack:'Autodiebstahl am helllichte Tag: Uff de {s} hot aaner en Fahrer aus seim Auto gezerrt.',
  carjackCop:'Unglaublich: In {d} is e Streifewage geklaut worn – mitsamt Polizisten-Kaffee.',
  stealCop:'Unglaublich: In {d} is e Streifewage geklaut worn – mitsamt Blaulicht.',
  shoot:'Schüss in {d}, uff de {s}! Anwohner: „Des warn kaa Fastnachtskracher.“',
  hitCop:'In {d} hot aaner en Schutzmann vermöbelt. Die Kollege sinn gar net amüsiert.',
  copcar:'Uff de {s} is e Streifewage ramponiert worn. Die Reparatur zahlt – wie immer – de Steuerzahler.',
  arson:'Feuer in {d}! Die Feuerwehr is unnerwegs – bitte Rettungsgass bilde.',
  explosion:'Großer Knall in {d}: E Fahrzeug is in die Luft gange. Die Polizei sucht Zeuge.',
  robbery:'Iwwerfall in {d}! E Geschäft wurd ausgeraubt, de Täter is flüchtig.',
  raser:'Raser uff de {s}! Zeuge melde e Auto mit iwwer {k} Sache – des is selbst für Meenzer zu schnell.'};
const RADIO_TRAFFIC=['Uff de {s} stockt’s – e Traktor mit Rebstöck is unnerwegs.','Achtung: Uff de {s} läuft en Fastnachter mit Pappnas uff de Fahrbahn. Bitte langsam fahre!',
  '{s} zwische {s2} un {s3}: zähflüssiger Verkehr wesche ere Baustell. Die is do schon seit Jahrzehnte.','Uff de {s} hot e Lieferwage Fleischworscht verlorn. Die Polizei bitt: net uffläse!',
  'Freie Fahrt uff de {s}! Do fährt grad werklich kaaner – mer wisse aach net warum.','Blitzer uff de {s} in {d}, gell – also Fuß vom Gas.',
  'Uff de {s} steht e Schoppe-Lieferung quer. Umleitung iwwer die {s2} empfohle.','In {d}: Ampelausfall an de {s}. Bitte uffpasse un freundlich winke.',
  'Uff de {s} sinn Gäns unnerwegs, Richtung Rhoi. Die hawwe Vorfahrt.','Kurz un knapp: {s}, {s2} un {s3} – alles frei. Fast unheimlich.'];
const RADIO_TRAFFIC_WANTED='Polizeieinsatz uff de {s} in {d} – do werd e Fahrzeug verfolgt. Ach, des sinn Sie? Na dann: gut Fahrt!';
const RADIO_WEATHER={klar:'Sonnig – Sonnebrill uff, Schoppe kalt stelle.',wolkig:'Bewölkt, awwer trocke. Ideal zum Schunkele.',regen:'Es schifft. Scheibewischer an, Laune bleibt.',
  gewitter:'Gewitter! Bleibt im Auto, do is es eh am scheenste.',nebel:'Nebel wie in de Waschküch – Licht an, Tempo runner.',schnee:'Schnee in Meenz! Die Kinner freue sich, die Autofahrer weniger.'};

// --- Hilfen ---
function radioPick(a){return a[Math.floor(Math.random()*a.length)];}
function radioCanPlay(P){const c=P&&P.car;return !!c&&!c.T.pedal&&!P.gameOver&&mode==='play';}
function radioStationNow(){return RADIO.sel<RADIO.stations.length?RADIO.stations[RADIO.sel]:null;}
function radioAudioOK(){const ctx=AUD.ctx;return !!(ctx&&AUD.master&&ctx.state==='running');}

// Straßennamen in der Nähe, nach Entfernung sortiert (über das 50-m-Raster der Straßenknoten)
function radioStreetsNear(x,z,R=450){const best=new Map();if(!NODE_HASH)return [];const cx=Math.floor(x/50),cz=Math.floor(z/50),r=Math.ceil(R/50);
  for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++){const l=NODE_HASH.get((cx+a)+','+(cz+b));if(!l)continue;
    for(const n of l){const N=NODES[n];const d=Math.hypot(N.x-x,N.z-z);if(d>R)continue;
      for(const e of N.e){const E=EDGES[e];const nm=E.road&&E.road.name;if(!nm||!E.car)continue;if(!best.has(nm)||best.get(nm)>d)best.set(nm,d);}}}
  return [...best.entries()].sort((p,q)=>p[1]-q[1]).map(p=>p[0]);}
function radioStreetAt(x,z){const s=radioStreetsNear(x,z,150);if(s.length)return s[0];const w=radioStreetsNear(x,z,900);return w[0]||'Rheinallee';}
function radioFill(tpl,o){return tpl.replace(/\{(\w+)\}/g,(m,k)=>o[k]!==undefined?o[k]:m);}

// --- Ereignis-Log für die Nachrichten ---
function radioLog(type,x,z,extra={}){if(x===undefined||z===undefined)[x,z]=ppos(P1);
  const last=RADIO.log[RADIO.log.length-1];
  if(last&&last.type===type&&simTime-last.t<20&&Math.hypot(last.x-x,last.z-z)<150){last.n++;last.t=simTime;return last;}
  const ev={type,x,z,t:simTime,n:1,told:false,d:districtAt(x,z),s:radioStreetAt(x,z),...extra};
  RADIO.log.push(ev);if(RADIO.log.length>20)RADIO.log.shift();return ev;}
const _radioCrime=crime;
crime=function(type,x,z){const h0=heat;const r=_radioCrime(type,x,z);if(heat>h0)radioLog(type,x,z);return r;};

// --- Zeilen je Sender ---
function radioFresh(){return RADIO.log.filter(e=>!e.told&&simTime-e.t<RADIO.NEWS_MAX_AGE);}
function radioNewsLine(){const fresh=radioFresh();
  if(fresh.length){const ev=fresh[fresh.length-1];for(const e of fresh)e.told=true;
    const tpl=RADIO_CRIME_NEWS[ev.type]||'Polizeimeldung aus {d}: Unruh uff de {s}.';
    return '+++ Eilmeldung +++ '+radioFill(tpl,ev)+(ev.n>1||fresh.length>1?' Un des net zum erschte Mol heut.':'');}
  const k=RADIO.newsI++%4;const [px,pz]=ppos(P1);
  if(wanted>0&&k%2===0){const c=P1.car;return radioFill('Fahndung in {d}: Die Polizei sucht {v}, Fahndungsstufe {w}. Hinweise an jede Wache.',
    {d:districtAt(px,pz),v:c?'en '+c.T.name:'en Unbekannte',w:wanted});}
  if(k===1){const S=G.stats;if(S.kills+S.cars===0)return `Ruhiger Tag in Meenz: kaa Schlägereie, kaa Autowracks. Die Polizei spielt Skat. ${S.missions?S.missions+' erledigte Uffträg meldet die Unterwelt.':''}`.trim();
    return `Tagesbilanz vun de Polizei: ${S.kills} Tote, ${S.cars} Autowracks, ${S.missions} erledigte Uffträg – un ${S.schoppen} goldene Schoppe gefunne.`;}
  if(k===2){const hh=String(Math.floor(gameMin/60)).padStart(2,'0'),mm=String(Math.floor(gameMin%60)).padStart(2,'0');
    return `Es is ${hh}:${mm} Uhr. Des Wetter: ${RADIO_WEATHER[WEATHER.kind]||'wie’s halt is.'}`;}
  return radioPick(RADIO_NEWS_FILLER);}
function radioTrafficLine(){const [px,pz]=ppos(P1);const near=radioStreetsNear(px,pz,500);const L=near.length?near:radioStreetsNear(px,pz,1500);
  const top=L.slice(0,6);const s=top.length?radioPick(top):radioStreetAt(px,pz);const rest=L.filter(n=>n!==s);
  const o={s,s2:rest[0]||s,s3:rest[1]||rest[0]||s,d:districtAt(px,pz)};RADIO.street=s;
  return radioFill(wanted>0&&Math.random()<0.5?RADIO_TRAFFIC_WANTED:radioPick(L.length>=3?RADIO_TRAFFIC:RADIO_TRAFFIC.filter(t=>!t.includes('{s2}'))),o);}
function radioTalkLine(){if(!RADIO.talkTopic||RADIO.talkI>=RADIO.talkTopic.length){RADIO.talkTopic=wanted>0&&Math.random()<0.4?RADIO_TALK_WANTED:radioPick(RADIO_TALK);RADIO.talkI=0;}
  const [who,txt]=RADIO.talkTopic[RADIO.talkI++];return RADIO_TALK_NAMES[who]+': '+txt;}
function radioHostLine(){if(wanted>0&&Math.random()<0.4)return 'Kalle: '+radioPick(RADIO_HOST_WANTED);return 'Kalle: '+RADIO_HOST[RADIO.hostI++%RADIO_HOST.length];}
function radioNextLine(st){if(st.kind==='news')return radioNewsLine();if(st.kind==='traffic')return radioTrafficLine();if(st.kind==='talk')return radioTalkLine();return radioHostLine();}
function radioSay(text){RADIO.line=text;RADIO.lineT=clamp(3+text.length*0.055,5,11);RADIO.said.push({t:simTime,station:RADIO.station,text});if(RADIO.said.length>30)RADIO.said.shift();}

// --- Musik: Schunkelwalzer (3/4) oder Marsch (2/4), eigene Melodien aus Zufall + Akkordfolge ---
const RADIO_SCALE=[0,2,4,5,7,9,11];
const RADIO_PROGS=[[0,0,4,4,4,4,0,0],[0,3,0,4,0,3,4,0],[0,0,3,3,4,4,0,0],[0,4,0,4,3,0,4,0],[0,5,3,4,0,5,4,0]];
function radioMidi(key,deg){return key+RADIO_SCALE[((deg%7)+7)%7]+12*Math.floor(deg/7);}
function radioHz(m){return 440*Math.pow(2,(m-69)/12);}
function radioPhrase(R,meter,prog){const pats=meter===3?[[1,1,1],[2,1],[1,0.5,0.5,1],[1,2],[1.5,0.5,1]]:[[1,1],[0.5,0.5,1],[1.5,0.5],[0.5,0.5,0.5,0.5],[1,0.5,0.5]];
  const out=[];let cur=2;
  prog.forEach((r,bar)=>{const last=bar===prog.length-1,half=bar===3;const rh=last?[meter]:half?(meter===3?[2,1]:[2]):pats[Math.floor(R()*pats.length)];
    const tones=[r,r+2,r+4].flatMap(t=>[t-7,t,t+7]).filter(t=>t>=-2&&t<=9);let b=0;
    rh.forEach((len,i)=>{let deg;
      if(last)deg=Math.abs(cur-7)<Math.abs(cur)?7:0;
      else if(i===0)deg=tones.reduce((p,q)=>Math.abs(q-cur)<Math.abs(p-cur)?q:p,tones[0]);
      else{deg=cur+(R()<0.5?1:-1)*(R()<0.75?1:2);deg=clamp(deg,-2,9);}
      out.push({b:bar*meter+b,deg,len});cur=deg;b+=len;});});
  return out;}
function radioSong(n){const R=mulberry32(n*7919+11);const meter=R()<0.6?3:2;const bpm=meter===3?150+Math.floor(R()*24):108+Math.floor(R()*16);
  const key=[46,48,51,53][Math.floor(R()*4)];const A=RADIO_PROGS[Math.floor(R()*RADIO_PROGS.length)];let B=RADIO_PROGS[Math.floor(R()*RADIO_PROGS.length)];if(B===A)B=RADIO_PROGS[(RADIO_PROGS.indexOf(A)+1)%RADIO_PROGS.length];
  const mA=radioPhrase(R,meter,A),mB=radioPhrase(R,meter,B);const form=[[A,mA],[A,mA],[B,mB],[A,mA]];const ev=[];
  form.forEach(([prog,mel],p)=>{const off=p*8*meter;
    prog.forEach((r,bar)=>{const t0=off+bar*meter;const root=radioHz(radioMidi(key,r)),fifth=radioHz(radioMidi(key,r+4)-12);
      const chord=[r,r+2,r+4].map(d=>radioHz(radioMidi(key+12,d)));
      ev.push({b:t0,k:'tuba',f:root,d:0.9,v:0.22},{b:t0,k:'kick',v:0.3});
      if(meter===3){for(const q of [1,2])ev.push({b:t0+q,k:'pah',f:chord,d:0.4,v:0.05},{b:t0+q,k:'cym',v:0.04});}
      else{ev.push({b:t0+1,k:'tuba',f:fifth,d:0.9,v:0.2},{b:t0+1,k:'kick',v:0.22});for(const q of [0.5,1.5])ev.push({b:t0+q,k:'pah',f:chord,d:0.35,v:0.05},{b:t0+q,k:'cym',v:0.04});}});
    for(const m of mel)ev.push({b:off+m.b,k:'lead',f:radioHz(radioMidi(key+24,m.deg)),d:m.len*0.92,v:0.12});});
  ev.sort((p,q)=>p.b-q.b);const [title,band]=RADIO_SONGS[n%RADIO_SONGS.length];
  return {n,title,band,meter,bpm,ev,dur:form.length*8*meter*60/bpm,style:meter===3?'Schunkelwalzer':'Marsch'};}
function radioStartSong(){RADIO.song=radioSong(RADIO.songN++);RADIO.songT=0;RADIO.aIdx=0;RADIO.aStart=null;
  radioSay(`♪ „${RADIO.song.title}“ – ${RADIO.song.band} (${RADIO.song.style})`);}

// --- WebAudio (nur wenn der AudioContext läuft) ---
function radioBus(){if(RADIO.bus)return RADIO.bus;const ctx=AUD.ctx;const g=ctx.createGain();g.gain.value=0;
  const hp=ctx.createBiquadFilter();hp.type='highpass';hp.frequency.value=160;const lp=ctx.createBiquadFilter();lp.type='lowpass';lp.frequency.value=4200;
  g.connect(hp);hp.connect(lp);lp.connect(AUD.master);RADIO.bus=g;return g;}
function radioEnv(g,t,v,a,d){g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(v,t+a);g.gain.setTargetAtTime(0.0001,t+Math.max(a,d*0.75),0.05);}
function radioTone(t,e,dur){const ctx=AUD.ctx,bus=radioBus();const g=ctx.createGain();g.connect(bus);const end=t+dur+0.35;
  if(e.k==='kick'){const o=ctx.createOscillator();o.frequency.setValueAtTime(110,t);o.frequency.exponentialRampToValueAtTime(45,t+0.12);radioEnv(g,t,e.v,0.005,0.12);o.connect(g);o.start(t);o.stop(t+0.4);return;}
  if(e.k==='cym'){const s=ctx.createBufferSource();s.buffer=AUD.noise;const f=ctx.createBiquadFilter();f.type='highpass';f.frequency.value=6000;radioEnv(g,t,e.v,0.003,0.06);s.connect(f);f.connect(g);s.start(t,Math.random());s.stop(t+0.3);return;}
  const f=ctx.createBiquadFilter();f.type='lowpass';f.connect(g);
  if(e.k==='tuba'){f.frequency.value=420;const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=e.f;o.connect(f);radioEnv(g,t,e.v,0.03,dur);o.start(t);o.stop(end);return;}
  if(e.k==='pah'){f.frequency.value=1500;for(const fr of e.f){const o=ctx.createOscillator();o.type='square';o.frequency.value=fr;o.connect(f);o.start(t);o.stop(end);}radioEnv(g,t,e.v,0.01,dur);return;}
  // Blech-Melodie: zwei leicht verstimmte Sägezähne, Filter öffnet beim Anblasen
  f.frequency.setValueAtTime(700,t);f.frequency.linearRampToValueAtTime(2600,t+0.05);f.frequency.setTargetAtTime(1500,t+0.06,0.1);
  for(const det of [-6,6]){const o=ctx.createOscillator();o.type='sawtooth';o.frequency.value=e.f;o.detune.value=det;o.connect(f);o.start(t);o.stop(end);}
  radioEnv(g,t,e.v,0.035,dur);}
function radioSchedule(){const S=RADIO.song;if(!S||!radioAudioOK())return;const now=AUD.ctx.currentTime,spb=60/S.bpm;if(RADIO.aStart===null)RADIO.aStart=now+0.08;
  while(RADIO.aIdx<S.ev.length){const e=S.ev[RADIO.aIdx];let t=RADIO.aStart+e.b*spb;if(t>now+0.35)break;
    if(t<now){RADIO.aStart+=now+0.03-t;t=now+0.03;}radioTone(t,e,(e.d||0.2)*spb);RADIO.aIdx++;}}
function radioJingle(i){if(!radioAudioOK())return;const t0=AUD.ctx.currentTime+0.02;const base=[523,587,659,698][i%4];
  [1,1.25,1.5].forEach((m,k)=>radioTone(t0+k*0.11,{k:'lead',f:base*m,v:0.09},0.12));}

// --- Umschalten / Ein / Aus ---
function radioTune(){const st=radioStationNow();RADIO.station=st?st.id:null;RADIO.talkTopic=null;
  if(!st){RADIO.line='';return;}radioJingle(RADIO.sel);
  if(st.kind==='music')radioStartSong();else{radioSay(st.intro);RADIO.lineT=Math.min(RADIO.lineT,3);}}
function radioNext(){RADIO.sel=(RADIO.sel+1)%(RADIO.stations.length+1);RADIO.song=null;RADIO.on=!!radioStationNow();radioTune();
  if(!RADIO.on){radioSilence();hint('Radio <b>aus</b>',1.2);}}
function radioSilence(){RADIO.vol=0;if(RADIO.bus&&AUD.ctx)RADIO.bus.gain.setTargetAtTime(0,AUD.ctx.currentTime,0.04);}

// --- HUD ---
function radioHud(){const el=RADIO.hud;if(!el)return;const st=radioStationNow();const key=RADIO.on&&st?st.id+'|'+RADIO.line:'';if(key===RADIO.hudKey)return;RADIO.hudKey=key;
  if(!key){el.hidden=true;return;}el.hidden=false;el.querySelector('.rn').innerHTML=`📻 <b>${st.name}</b> <span>${st.freq} · N: Sender</span>`;el.querySelector('.rl').textContent=RADIO.line;}
function setupRadio(){
  const css=document.createElement('style');
  css.textContent=`#radio{position:absolute;left:50%;top:calc(14px + env(safe-area-inset-top,0px));transform:translateX(-50%);width:min(460px,calc(100vw - 420px));min-width:240px;
background:rgba(8,10,12,.78);border-left:4px solid var(--gold,#f5c518);padding:6px 12px 8px;color:#eee;pointer-events:auto;cursor:pointer;font-size:16px;line-height:1.25}
#radio .rn{font-size:15px;letter-spacing:.04em;color:#cfd3d6}#radio .rn b{color:var(--gold,#f5c518);font-weight:800}#radio .rn span{float:right;color:#8a9096;font-size:13px}
#radio .rl{margin-top:3px;font-weight:600;min-height:20px}
body.split #radio{left:25%;width:min(380px,44vw);min-width:0}
@media (max-width:640px){#radio{width:calc(100vw - 200px);min-width:0;font-size:14px;left:16px;transform:none}#radio .rn span{display:none}}`;
  document.head.appendChild(css);
  const el=document.createElement('div');el.id='radio';el.hidden=true;el.setAttribute('role','status');el.setAttribute('aria-live','polite');el.title='Antippen oder N: nächster Sender';
  el.innerHTML='<div class="rn"></div><div class="rl"></div>';el.addEventListener('click',()=>{if(radioCanPlay(P1))radioNext();});
  const hud=$('hud');if(hud)hud.prepend(el);else document.body.appendChild(el);RADIO.hud=el;
  const sec=KEYS_HELP.find(s=>s[0]==='Fahrzeuge');if(sec&&!sec[1].some(r=>r[0]==='N'))sec[1].push(['N','Autoradio: nächster Sender / aus']);}

// --- Raser-Erkennung (für die Nachrichten) ---
function radioWatchSpeed(c,dt){RADIO.raserCD=Math.max(0,RADIO.raserCD-dt);
  if(!c||c.T.pedal||c.T.plane||c.T.boat||Math.abs(c.speed)<RADIO.RASER_V){RADIO.fastT=0;return;}
  RADIO.fastT+=dt;if(RADIO.fastT>RADIO.RASER_T&&RADIO.raserCD<=0){RADIO.raserCD=RADIO.RASER_CD;RADIO.fastT=0;radioLog('raser',c.x,c.z,{k:Math.round(Math.abs(c.speed)*3.6)});}}

function updateRadio(dt){const P=P1,c=P.car;const can=radioCanPlay(P);
  if(keysP.KeyN){keysP.KeyN=false;if(can)radioNext();}
  radioWatchSpeed(can?c:null,dt);
  const st=radioStationNow();RADIO.station=st?st.id:null;const on=can&&!!st;
  if(on&&!RADIO.on){RADIO.on=true;radioTune();}
  else if(!on&&RADIO.on){RADIO.on=false;RADIO.line='';RADIO.song=null;radioSilence();}
  if(on){
    if(st.kind==='news'&&radioFresh().length)RADIO.lineT=0;
    if(st.kind==='music'){RADIO.songT+=dt;if(!RADIO.song||RADIO.songT>RADIO.song.dur+1.5)radioStartSong();}
    RADIO.lineT-=dt;if(RADIO.lineT<=0)radioSay(st.kind==='music'&&Math.random()<0.5?`♪ „${RADIO.song.title}“ – ${RADIO.song.band}`:radioNextLine(st));
    const load=clamp(0.6*Math.abs(c.speed)/(c.T.max||40)+0.4*(c.inp.throttle||0),0,1);RADIO.vol=RADIO.BASE_VOL*(1-RADIO.DUCK*load);
    if(radioAudioOK()){radioBus().gain.setTargetAtTime(RADIO.vol,AUD.ctx.currentTime,0.15);if(st.kind==='music')radioSchedule();}}
  radioHud();}
