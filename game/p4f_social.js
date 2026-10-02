// ===================== GESPRÄCHE MIT PASSANTEN =====================
// Jede Unterhaltung: Eröffnung des Passanten, bis zu drei Antworten, Reaktion (+ Mimik, Wirkung).
const NPC_NAMES=['Heinz','Gisela','Kevin','Jacqueline','Uschi','Rüdiger','Mandy','Horst','Babsi','Dieter','Chantal','Klaus-Peter','Elfriede','Jonas','Lea','Mehmet','Svetlana','Gerd','Paulchen','Inge','Detlef','Hildegard','Marco','Doris'];
const CONVS=[
  {o:'Ei gude! Kennste mich net? Ich bin doch der Cousin vom Schwager vom Bäcker am Markt!',m:'smile',c:[
    ['Klar! Wie geht’s dem Schwager?','Der hat sich ’nen Kühlschrank tätowiern lasse. Frag net.','laugh'],
    ['Nie gesehen.','Des sagt mein Schwager auch immer …','sad'],
    ['Ich BIN der Schwager.','… Dann schuldest du mir noch zehn Euro. Her damit!','angry',{money:-10}]]},
  {o:'Entschuldigung, wissen Sie, wo hier der Rhein ist?',m:'neutral',c:[
    ['Immer Richtung Wasser.','Genial. Sie sollten Stadtführer werden.','smile'],
    ['Der hat heute zu.','Ach so! Dann komm ich morgen nochmal.','surprised'],
    ['Welcher Rhein?','… Jetzt bin ich verwirrt. Danke für nix.','cringe']]},
  {o:'Ich hab grad mit meinem Toaster Schluss gemacht. Er war immer so … heiß und kalt.',m:'sad',c:[
    ['Das tut mir leid.','Danke. Du bist wärmer als er.','smile'],
    ['Oha. Wortwitz-Alarm.','Ich hab noch hundert davon! Willst du den mit dem Wasserkocher hören?','laugh'],
    ['Ich geh dann mal.','Typisch. Genau wie der Toaster.','angry',{leave:'angry'}]]},
  {o:'Psst. Willst du ’ne Fleischworscht kaufen? Ganz frisch. Aus meinem Rucksack.',m:'smug',c:[
    ['Klar, her damit! (3 €)','Gute Wahl. Frag net, woher.','smile',{money:-3,heal:25}],
    ['Aus dem RUCKSACK?','Der Rucksack is auch frisch! Von heute morgen!','angry'],
    ['Ich bin Vegetarier.','In Meenz? Mutig. Sehr mutig.','surprised']]},
  {o:'Ich hab heut ’nen Wal im Rhein gesehen. Er hat mir zugezwinkert.',m:'surprised',c:[
    ['Ich glaub dir.','Endlich einer! Er heißt übrigens Kevin.','laugh'],
    ['Das war ’ne Plastiktüte.','Kevin ist KEINE Plastiktüte!','sad'],
    ['Hat er was gesagt?','Nur „Helau“. Typisch Meenzer Wal.','laugh']]},
  {o:'Weißt du, wie lang es noch bis Fastnacht dauert? Ich zähl die Sekunden.',m:'smile',c:[
    ['Viel zu lang!','Genau! Helau! HELAU!','laugh'],
    ['Ich mag keine Fastnacht.','*Psssst!* Sag des net so laut hier! Ich kenn dich net!','surprised',{leave:'flee'}],
    ['Was ist Fastnacht?','Raus aus Meenz. Sofort.','angry',{leave:'angry'}]]},
  {o:'Hey, kannst du mich kurz filmen? Ich mach ’nen Tanz vorm Dom. Für die Follower. Ich hab schon neun.',m:'smile',c:[
    ['Na klar!','Du bist jetzt Follower Nummer zehn! Wir sind praktisch Familie.','laugh'],
    ['Neun? Respekt.','Meine Mutter zählt doppelt. Sie hat zwei Handys.','smug'],
    ['Nein.','Okay … dann film ich mich wieder selbst. Wie immer.','sad']]},
  {o:'Die Tauben hier verfolgen mich. Ich glaub, die wissen was.',m:'surprised',c:[
    ['Was wissen sie denn?','… dass ich gestern ihr Brötchen gegessen hab.','cringe'],
    ['Klingt nach Paranoia.','Das sagen SIE. Die Tauben!','angry'],
    ['Ich bin auch eine Taube.','… Gurr?','cringe',{leave:'flee'}]]},
  {o:'Ich bin Influencer für Kopfsteinpflaster. Altstadt-Pflaster, das ist mein Ding.',m:'smug',c:[
    ['Und davon kann man leben?','Nein. Aber die Steine sind treu.','sad'],
    ['Welcher ist dein Lieblingsstein?','Der vorm Dom. Der hat Charakter. Und ’nen Kaugummi.','laugh'],
    ['Das ist das Traurigste, was ich je gehört hab.','Hat mein Stein auch gesagt.','sad']]},
  {o:()=>WEATHER.cur.rain>0.4?'Schönes Wetter heute, ne? … Also, für Enten.':WEATHER.cur.snow>0.4?'Schnee in Meenz! Ich hab schon drei Schneemänner gebaut. Einer heißt Gerd.':WEATHER.kind==='nebel'?'Bist du echt, oder bist du nur Nebel?':'Herrliches Wetter, ne? Perfekt für ’nen Schoppe.',m:'smile',c:[
    ['Ja, einfach herrlich.','Siehste. Mir zwei verstehn uns.','smile'],
    ['Geht so.','Immer diese Pessimisten. Du bist doch net aus Frankfurt?','disgust'],
    ['Lass uns über was anderes reden.','Okay. … Magst du Kartoffeln?','cringe']]},
  {o:'Ich hab ’nen Fünfer gefunden! Gehört der dir?',m:'surprised',c:[
    ['Ja, meiner!','Echt? Na gut. Ich vertrau dir. Hier.','smile',{money:5}],
    ['Nein, behalt ihn.','Ehrlicher Mensch! Selten in dere Stadt.','laugh'],
    ['Gib her, aber zack!','Ne, so net. Tschüss!','angry',{leave:'flee'}]]},
  {o:'Bist du ein Parkticket? Weil … auf deiner Stirn steht „fine“. Englisch. Verstehste?',m:'smug',c:[
    ['Haha … nein.','Ich hab den aus ’nem Video. Der Typ im Video war cooler.','cringe'],
    ['Das war furchtbar.','Ich weiß. Ich übe noch.','sad'],
    ['Und du bist ein Strafzettel: Du kostest mich Nerven.','Touché! Ich mag dich.','laugh']]},
  {o:'Der Dom ist eigentlich ’ne Rakete. Schau dir doch mal die Türme an!',m:'surprised',c:[
    ['Wann startet sie?','Rosenmontag, 11:11 Uhr. Weitersagen! Oder lieber net.','laugh'],
    ['Das ist eine Kirche.','Das wollen SIE dich glauben lassen.','angry'],
    ['Kann ich mitfliegen?','Nur mit Narrenkappe. Vorschrift.','smug']]},
  {o:'Sag mal „Fleischworscht“ wie ein echter Meenzer.',m:'smug',c:[
    ['Fleischwurst.','Raus. Einfach raus.','disgust',{leave:'angry'}],
    ['Fleischworscht!','Mir sinn Freunde! Hier, für dich.','laugh',{money:2}],
    ['Fläääschwooorscht.','Zu viel. Aber Respekt.','surprised']]},
  {o:'Hast du meinen Schlüssel gesehen? Er sieht aus wie ein Schlüssel.',m:'sad',c:[
    ['Wie groß ungefähr?','Schlüsselgroß. Denk ich.','neutral'],
    ['Ja, unten am Rhein.','Danke!! Du bist ein Held!','laugh',{leave:'flee'}],
    ['Hast du in der Hosentasche geguckt?','… Oh. Da isser. Das ist mir jetzt peinlich.','cringe']]},
  {o:'Ich bin eigentlich ein Superheld. Meine Kraft? Ich weiß immer, wann die Straßenbahn zu spät kommt.',m:'smug',c:[
    ['Und wann?','Immer. Die Kraft ist nicht sehr spezifisch.','laugh'],
    ['Nützliche Kraft.','Endlich erkennt’s mal einer an!','smile'],
    ['Beweis es!','Die 51 kommt zu spät. Siehst du? Bewiesen.','smug']]},
  {o:'Excuse me, where is the … äh … Gutenberg?',m:'neutral',c:[
    ['He is dead since 1468.','Oh no! Somebody should tell him!','surprised'],
    ['Im Museum.','Danke! Äh, thank you!','smile'],
    ['I am Gutenberg.','Can you print me a selfie?','laugh']]},
  {o:'Nullfünfer oder was?',m:'smile',c:[
    ['Immer! Nullfünf!','NULLFÜNF! NULLFÜNF! *klatscht*','laugh'],
    ['Ich mag kein Fußball.','Dann red ich nimmer mit dir.','sad',{leave:'angry'}],
    ['Ich bin Frankfurt-Fan.','*schnappt nach Luft* … Polizei! Hier steht ein Frankfurter!','disgust',{leave:'flee'}]]},
  {o:'Weißt du, was ich heut gemacht hab? Beintag. Siehst du’s?',m:'smug',c:[
    ['Krass! Wie Baumstämme!','Endlich sieht’s einer! Ich komm jetzt nur leider die Treppe nimmer hoch.','laugh'],
    ['Ehrlich gesagt nein.','Das liegt an deiner Brille.','sad'],
    [()=>G.superShoes?'Ich hab Superschuhe.':'Ich lauf lieber.',()=>G.superShoes?'Schummler! Das zählt net!':'Faulpelz. Aber ehrlich.','disgust']]},
  {o:'Wenn ein Weck im Wald umfällt und keiner hört’s – isses dann noch ein Weck?',m:'neutral',c:[
    ['Ja, ein Waldweck.','Wow. Das schreib ich mir auf.','surprised'],
    ['Das ist zu tief für mich.','Mir auch. Ich hab’s auf ’ner Bierdeckel gelesen.','smile'],
    ['Hä?','Genau das hat der Weck auch gesagt.','smug']]},
  {o:'Haste mal ’nen Euro? Ich spar auf ’ne Jacht.',m:'smile',c:[
    ['Klar, hier.','Danke! Fehlen nur noch 4.999.999 Euro!','laugh',{money:-1}],
    ['Wofür ’ne Jacht?','Für den Rhein. Der Wal Kevin braucht Gesellschaft.','smug'],
    ['Nein.','Kein Problem. Ich frag den Wal.','neutral']]},
  {o:()=>`Ich war noch nie in ${['Gonsenheim','Mombach','Weisenau','Kastel','Bretzenheim','Hechtsheim'][Math.floor(Math.random()*6)]}. Soll ja gefährlich sein. Da gibt’s Kreisel.`,m:'surprised',c:[
    ['Ich war da. Ich hab überlebt.','Du bist mein Held. Erzähl mir alles.','surprised'],
    ['Kreisel sind harmlos.','Das sagen alle. Bis sie drin sind. Für immer.','sad'],
    ['Ich wohn im Kreisel.','… Krass. Wie ist die Miete?','cringe']]},
  {o:'Ich übe für Fastnacht. Darf ich dir meinen Witz erzählen?',m:'smile',c:[
    ['Klar, leg los!','Was ist grün und klopft an der Tür? Ein Klopfsalat! … Hallo? HELAU?','laugh'],
    ['Nur wenn er gut ist.','Dann lieber net. Er ist nicht gut.','sad'],
    ['Ich hab selbst einen.','Oh nein. Konkurrenz. Ich geh.','angry',{leave:'angry'}]]},
  {o:'Mein Hund ist heute Bürgermeister geworden. Also bei uns im Wohnzimmer.',m:'smug',c:[
    ['Herzlichen Glückwunsch!','Ich richte es aus. Er hat leider keine Zeit für Fotos.','laugh'],
    ['Wer hat ihn gewählt?','Die Katze. Unter Druck. Wir reden nicht darüber.','cringe'],
    ['Korrupt, oder?','Er hat ein Leckerli angenommen, ja. Woher weißt du das?!','surprised']]},
  {o:'Ich hab gestern meinen Schatten verloren. Hast du ihn gesehen? Er ist ungefähr so groß wie ich, nur dunkler.',m:'sad',c:[
    ['Er steht hinter dir.','*dreht sich um* … DU! Wo warst du die ganze Nacht?!','angry'],
    ['Schatten kommen zurück, wenn es Mittag ist.','Mittag. Natürlich. Ich hab ihm Mittagessen versprochen.','surprised'],
    ['Ich hab deinen Schatten gegessen.','… Wie hat er geschmeckt?','cringe']]},
  {o:'Ich bin seit 1998 in diese Straßenlaterne verliebt. Sag ihr bitte nix, sie weiß es noch net.',m:'smile',c:[
    ['Euer Geheimnis ist sicher.','Danke. Sie leuchtet heut besonders schön, oder?','laugh'],
    ['Die Laterne ist vergeben. An die andere Laterne.','NEIN. NEIN! Ich wusste es! Die mit dem Wackelkontakt!','sad',{leave:'flee'}],
    ['Hast du ihr schon mal Strom geschenkt?','Jeden Valentinstag ’ne AA-Batterie. Sie hat sie nie benutzt.','sad']]},
  {o:'Psst. Ich bin eigentlich drei Waschbären in einem Trenchcoat. Bitte verrat mich net.',m:'smug',c:[
    ['Welcher Waschbär redet gerade?','Der mittlere. Der obere ist für die Augen zuständig.','smug'],
    ['Das erklärt einiges.','Danke. Die meisten schreien.','smile'],
    ['Ich bin vier Waschbären.','*flüstert nach unten* … Jungs, wir sind unterlegen. RÜCKZUG!','surprised',{leave:'flee'}]]},
  {o:'Ich zähl heut alle Pflastersteine in Mainz. Ich bin bei 4.017. Stör mich net. … 4.018.',m:'neutral',c:[
    ['4.019!','NEIN! Jetzt muss ich von vorne anfangen! Wegen DIR!','angry',{leave:'angry'}],
    ['Warum machst du das?','Einer muss es ja machen. Die Stadt hat mich nie gefragt.','smug'],
    ['Viel Glück.','Danke. … Wo war ich? 3?','sad']]},
  {o:'Ich hab heut morgen mit ’nem Hund Smalltalk gemacht. Er hat gesagt, die Wirtschaft geht den Bach runter.',m:'surprised',c:[
    ['Hat er Aktien-Tipps?','Er sagt: Knochen. Immer Knochen.','smug'],
    ['Hunde können nicht reden.','Das hat er auch gesagt. Verdächtig, oder?','cringe'],
    ['War das der Hund vom Bürgermeister?','… Woher weißt du das? Arbeitest du für IHN?','surprised',{leave:'flee'}]]},
  {o:'Kannst du mir kurz die Hand halten? Ich hab Angst vor Rolltreppen. Und Treppen. Und Rollen.',m:'sad',c:[
    ['Klar. Hier ist keine Rolltreppe.','Das sagen sie alle. Bis sie da ist.','sad'],
    ['Was ist mit Brötchen?','Brötchen sind okay. Nur keine Rollen.','neutral'],
    ['Ich BIN eine Rolltreppe.','AAAAAH!','surprised',{leave:'flee'}]]},
  {o:'Ich hab mich heute morgen selbst im Spiegel getroffen. Wir haben uns nix zu sagen gehabt.',m:'sad',c:[
    ['Vielleicht morgen.','Ich hoffe. Er sah auch müde aus.','sad'],
    ['Wer hat zuerst weggeschaut?','Er. Glaub ich. Oder ich? Oh nein.','cringe'],
    ['Hast du ihm Kaffee angeboten?','Er hat dasselbe gemacht. Gleichzeitig. Sehr unangenehm.','cringe']]},
  {o:'Riech mal an meiner Jacke. Riecht die nach Sonntag?',m:'smug',c:[
    ['… Ja, eindeutig Sonntag.','Wusst ich’s doch! Heute ist aber Dienstag. Das ist mein Trick.','laugh'],
    ['Nein, danke.','Dein Pech. Es ist ein sehr guter Sonntag.','disgust'],
    ['Eher nach Mittwochnachmittag.','WAS?! Die Reinigung hat mich betrogen!','angry',{leave:'angry'}]]},
  {o:'Ich bin der Geist vom Mainzer Weinmarkt 1987. Ich spuk hier nur, wenn’s Spundekäs gibt.',m:'smug',c:[
    ['Heute gibt’s keinen.','Dann … verschwinde ich jetzt. Langsam. Dramatisch. … Gleich.','sad'],
    ['Buuuh!','Ey! Das ist mein Text!','angry'],
    ['Hast du ’ne Jahreskarte?','Ich bin tot, nicht blöd. Natürlich.','smug']]},
  {o:'Weißt du, was der Unterschied zwischen ’nem Weck und mir ist? … Ich weiß es auch nicht. Deshalb frag ich.',m:'cringe',c:[
    ['Der Weck hat Mohn.','Ich hab auch Mohn! Im Bart. Seit Montag.','laugh'],
    ['Der Weck ist knuspriger.','Autsch. Aber fair.','sad'],
    ['Es gibt keinen.','*starrt dich lange an* … Du hast mir gerade die Augen geöffnet.','surprised']]},
  {o:'Ich trainiere für die Olympiade im Rückwärts-Treppensteigen. Ich bin bisher nur einmal gefallen. Gestern. Dreimal.',m:'smile',c:[
    ['Gibt’s das als Disziplin?','Noch nicht. Ich bin der Einzige. Deshalb bin ich auch Weltmeister.','smug'],
    ['Pass auf dich auf!','Zu spät. Aber danke.','sad'],
    ['Zeig mal!','*geht rückwärts weg und stolpert über den Bordstein* ALLES GEWOLLT!','laugh',{leave:'flee'}]]},
  {o:'Entschuldigung, sind Sie der Mann, der mir 2009 ’nen halben Fleischwurstring geliehen hat?',m:'surprised',c:[
    ['Ja. Und ich will ihn zurück.','*zieht eine halbe Fleischwurst aus der Tasche* … Ich hab sie gut gepflegt.','cringe',{heal:15}],
    ['Nein, das war mein Zwilling.','Grüß ihn von mir. Und sag ihm: Es tut mir leid.','sad'],
    ['Ganz bestimmt nicht.','Dann hat mich jemand reingelegt. Seit 16 Jahren!','angry',{leave:'angry'}]]},
  {o:'Ich habe beschlossen, ab heute nur noch in Großbuchstaben zu reden. ABER NUR INNERLICH.',m:'smug',c:[
    ['Wie fühlt sich das an?','LAUT. SEHR LAUT. ABER FRIEDLICH.','laugh'],
    ['Das merkt doch keiner.','GENAU DAS IST DER PUNKT.','smug'],
    ['DAS IST EINE GUTE IDEE.','WARUM SCHREIST DU SO?!','surprised',{leave:'flee'}]]},
  {o:'Mein Goldfisch hat mich verlassen. Er ist jetzt mit einem Koi aus Wiesbaden zusammen.',m:'sad',c:[
    ['Wiesbaden? Autsch.','Ich weiß. Die haben ein Kurhaus. Wie soll ich da mithalten?','sad'],
    ['Er kommt bestimmt zurück.','Er hat ein Gedächtnis von drei Sekunden. Er hat mich längst vergessen.','sad'],
    ['Willst du darüber reden?','Nein. Ja. *schnieft* Er hieß Klaus.','sad']]},
  {o:'Weißt du, wie spät es ist?',m:'neutral',c:[
    [()=>'Es ist '+String(Math.floor(gameMin/60)).padStart(2,'0')+':'+String(Math.floor(gameMin%60)).padStart(2,'0')+'.','Oh nein. Dann bin ich ja schon seit drei Tagen zu spät.','surprised',{leave:'flee'}],
    ['Zeit für einen Schoppe.','Endlich sagt’s mal einer laut!','laugh'],
    ['Zeit ist eine Illusion.','*nickt langsam* … Ich muss los. Zu meiner Illusion.','cringe',{leave:'flee'}]]},
];
const CONV_DANGER=[ // wenn der Spieler eine Waffe in der Hand hat oder gesucht wird
  {o:'Hilfe! Der hat ’ne Waffe! Ich hab nix gesehen! NIX!',m:'surprised',flee:true},
  {o:'Moment … bist du net der aus den Nachrichten?!',m:'surprised',flee:true,police:true},
];
let TALK=null;let recentConvs=[];
function fromWhere(d){d=d.replace(/^Mainz-/,'');if(/stadt$/.test(d))return 'aus der '+d;if(d==='Zitadelle')return 'von der Zitadelle';if(d==='Hauptbahnhof')return 'vom Hauptbahnhof';if(d==='Rhein')return 'vom Rheinufer';return 'aus '+d;}
function npcName(h){if(!h.npcName)h.npcName=mpick(NPC_NAMES)+' '+fromWhere(districtAt(h.x,h.z));return h.npcName;}
function talkCandidate(P){const h=P.h;if(!h||P.car||(h.room&&!h.room.venue)||P.gameOver)return null;const fx=Math.sin(h.facing),fz=Math.cos(h.facing);let best=null,bd=2.6;
  for(const o of HUMANS){if(o===h||!o.alive||o.inCar||o.kind!=='ped'||o.mission||o.keeper)continue;if(o.state!=='walk'&&o.state!=='wait'&&o.state!=='markt'&&o.state!=='roof'&&o.state!=='venue')continue;const dx=o.x-h.x,dz=o.z-h.z;const d=Math.hypot(dx,dz);if(d<bd&&(dx*fx+dz*fz)/Math.max(d,0.01)>0.2){bd=d;best=o;}}return best;}
const txt=v=>typeof v==='function'?v():v;
function startTalk(P,npc){const W=WEAPONS[P.weapon];const armed=!W.melee&&P.weapon!=='fist'&&(P.inp.aim||P.aimT>0);
  npc.prevState=npc.state;npc.state='talk';npc.vx=npc.vz=0;
  let conv;if(armed||wanted>=2&&Math.random()<0.6){conv=armed?CONV_DANGER[0]:CONV_DANGER[1];}
  else if(npc.forceConv){conv=npc.forceConv;npc.forceConv=null;}
  else{const SRC=npc.mk&&npc.state==='talk'&&npc.prevState==='markt'?MARKT_CONVS:CONVS;const pool=SRC.filter(c=>!recentConvs.includes(c));conv=mpick(pool.length?pool:SRC);recentConvs.push(conv);if(recentConvs.length>8)recentConvs.shift();}
  TALK={P,npc,conv,stage:'open',t:0,typed:0,line:txt(conv.o),who:npcName(npc),chosen:-1,choices:(conv.c||[]).map(c=>[txt(c[0]),txt(c[1]),c[2],c[3]])};
  npc.setExpr(conv.m||'neutral');P.h.setExpr('neutral');P.talk=TALK;
  const box=$('talk');box.hidden=false;renderTalk();chime([520]);}
function renderTalk(){const T=TALK;if(!T)return;const box=$('talk');const shown=T.line.slice(0,Math.floor(T.typed));
  let html=`<div class="who">${T.speaker==='me'?'Du':T.who}</div><div class="line">${shown}<span class="caret">${T.typed<T.line.length?'▍':''}</span></div>`;
  if(T.stage==='choose')html+='<div class="opts">'+T.choices.map((c,i)=>`<button class="opt" data-i="${i}"><kbd>${i+1}</kbd>${c[0]}</button>`).join('')+'</div>';
  else if(T.stage==='end'||T.stage==='open'&&!T.choices.length)html+='<div class="hint2">E: weiter</div>';
  box.innerHTML=html;box.querySelectorAll('.opt').forEach(b=>b.addEventListener('click',()=>chooseTalk(+b.dataset.i)));}
function chooseTalk(i){const T=TALK;if(!T||T.stage!=='choose')return;const c=T.choices[i];if(!c)return;T.chosen=i;T.stage='me';T.speaker='me';T.line=c[0];T.typed=0;T.t=0;
  T.P.h.setExpr(c[2]==='laugh'?'smile':c[2]==='angry'||c[2]==='disgust'?'smug':'neutral');T.npc.setExpr('neutral');renderTalk();}
function endTalk(){const T=TALK;if(!T)return;const npc=T.npc;TALK=null;T.P.talk=null;$('talk').hidden=true;if(npc.fx)npc.fx.talk=0;if(T.P.h.fx)T.P.h.fx.talk=0;T.P.h.setExpr('neutral');
  const eff=T.effect||{};const lv=eff.leave||(T.conv.flee?'flee':null);
  if(npc.alive){if(npc.prevState==='venue'){npc.state='venue';npc.setExpr(lv==='angry'?'angry':'smile');}else if(npc.prevState==='roof'){npc.state='roof';npc.setExpr(lv==='flee'?'surprised':lv==='angry'?'angry':'smile');}else if(lv==='flee'){npc.state='walk';pedFlee(npc,T.P.h.x,T.P.h.z,9);}else if(lv==='angry'){npc.state='walk';npc.walkSpeed=2.2;npc.setExpr('angry');setTimeout(()=>npc.setExpr&&npc.setExpr('neutral'),6000);}
    else{npc.state=npc.prevState==='wait'?'wait':npc.prevState==='markt'&&npc.mk?'markt':npc.prevState==='roof'?'roof':npc.prevState==='venue'?'venue':'walk';setTimeout(()=>{if(npc.alive&&npc.setExpr)npc.setExpr('neutral');},2500);}}
  if(T.conv.police)crime('carjack',npc.x,npc.z);}
function applyEffect(T,eff){if(!eff)return;const P=T.P;if(eff.money){if(eff.money<0&&G.money<-eff.money){T.line='… Du hast ja gar kein Geld. Peinlich.';T.npc.setExpr('disgust');return;}G.money+=eff.money;hint(eff.money>0?`+ €${eff.money}`:`– €${-eff.money}`,2,P);}
  if(eff.heal)P.h.health=Math.min(100,P.h.health+eff.heal);
  if(eff.trip)startTrip(P);
  if(eff.drink){T.npc.mk&&(T.npc.mk.act='prost',T.npc.mk.actT=1.6);drinkAdd(P);}}
function updateTalk(dt){const T=TALK;if(!T)return;const P=T.P,npc=T.npc,h=P.h;
  if(!npc.alive||npc.removed||P.car||P.gameOver||Math.hypot(npc.x-h.x,npc.z-h.z)>6){endTalk();return;}
  // einander zuwenden
  const a=Math.atan2(h.x-npc.x,h.z-npc.z);npc.facing+=angDiff(npc.facing,a)*Math.min(1,dt*6);h.facing+=angDiff(h.facing,a+Math.PI)*Math.min(1,dt*6);
  npc.animate(dt,0);h.animate(dt,0);npc.sync();h.sync();
  T.t+=dt;const speed=T.speaker==='me'?55:42;const before=Math.floor(T.typed);if(T.typed<T.line.length){T.typed=Math.min(T.line.length,T.typed+dt*speed);
    const sp=T.speaker==='me'?h:npc;if(sp.fx)sp.fx.talk=1;if(Math.floor(T.typed)!==before&&Math.floor(T.typed)%3===0&&/\S/.test(T.line[Math.floor(T.typed)-1]||''))talkBlip(T.speaker==='me'?330:npc.voice||(npc.voice=mr(380,720)));renderTalk();}
  else{if(npc.fx)npc.fx.talk=0;if(h.fx)h.fx.talk=0;
    if(T.stage==='open'){if(T.choices.length){T.stage='choose';renderTalk();}else if(T.t>T.line.length/42+1.6){T.stage='end';renderTalk();}}
    else if(T.stage==='me'&&T.t>T.line.length/55+0.5){const c=T.choices[T.chosen];T.stage='reply';T.speaker='npc';T.line=c[1];T.typed=0;T.t=0;npc.setExpr(c[2]);T.effect=c[3]||null;applyEffect(T,c[3]);
      h.setExpr(c[2]==='laugh'?'laugh':c[2]==='angry'||c[2]==='disgust'?'surprised':c[2]==='sad'?'cringe':c[2]==='cringe'?'cringe':'smile');renderTalk();}
    else if(T.stage==='reply'&&T.t>T.line.length/42+1.2){T.stage='end';renderTalk();}
    else if(T.stage==='end'&&T.t>T.line.length/42+6)endTalk();}}
function talkBlip(f){const ctx=AUD.ctx;if(!ctx)return;const t=ctx.currentTime;const o=ctx.createOscillator();o.type='triangle';o.frequency.value=f*(0.9+Math.random()*0.25);const g=ctx.createGain();g.gain.setValueAtTime(0.05,t);g.gain.exponentialRampToValueAtTime(0.0001,t+0.06);o.connect(g);g.connect(AUD.master);o.start(t);o.stop(t+0.07);}
// Kamera über die Schulter auf beide Gesichter
function talkCamera(P,dt){const T=P.talk;if(!T)return false;const h=P.h,n=T.npc;const mx=(h.x+n.x)/2,mz=(h.z+n.z)/2,my=(h.y+n.y)/2+1.62;const dx=n.x-h.x,dz=n.z-h.z,L=Math.hypot(dx,dz)||1;
  const side=-1;const px=-dz/L*side,pz=dx/L*side;const ex=mx+px*2.1-dx/L*0.9,ez=mz+pz*2.1-dz/L*0.9,ey=my+0.15;
  _cp.set(ex,ey,ez);P.camera.position.lerp(_cp,1-Math.exp(-dt*5));_ct.set(mx,my-0.05,mz);P.camera.lookAt(_ct);P.camera.fov+=(45-P.camera.fov)*Math.min(1,dt*3);P.camera.updateProjectionMatrix();return true;}
addEventListener('keydown',e=>{if(mode!=='play')return;
  if(TALK){if(e.code.startsWith('Digit')){const n=+e.code.slice(5);if(n>=1)chooseTalk(n-1);e.stopImmediatePropagation();e.preventDefault();return;}
    if(e.code==='KeyE'||e.code==='Escape'){const T=TALK;if(T.typed<T.line.length){T.typed=T.line.length;renderTalk();}else if(T.stage==='end'||T.stage==='reply'||!T.choices.length)endTalk();else if(T.stage==='choose'){T.choices=[];T.stage='end';T.speaker='me';T.line='Äh … tschüss.';T.typed=0;T.t=0;T.npc.setExpr('cringe');renderTalk();}e.stopImmediatePropagation();return;}}
  else if(e.code==='KeyE'&&!SHOP_UI.open&&typeof brezelNear==='function'&&brezelNear(P1)){pressBrezel(P1);}
  else if(e.code==='KeyE'&&!SHOP_UI.open){const c=talkCandidate(P1);if(c)startTalk(P1,c);}
  if(e.code==='KeyU'){toggleShoes(P1);}},true);

// ===================== SUPERSCHUHE =====================
const SHOE_MAT=new THREE.MeshStandardMaterial({color:0x10e0c0,emissive:0x00ffd0,emissiveIntensity:1.6,roughness:0.3,metalness:0.4});
function shoeMeshes(h){const out=[];for(const l of [h.legL,h.legR])l.traverse(o=>{if(o.isMesh&&o.geometry===HGEO.shoe)out.push(o);});return out;}
function setShoeLook(P){const on=!!P.shoesOn;for(const m of shoeMeshes(P.h)){if(!m.userData.orig)m.userData.orig=m.material;m.material=on?SHOE_MAT:m.userData.orig;}}
function toggleShoes(P){if(!G.superShoes){hint('Du hast keine <b>Superschuhe</b>. Gibt’s im Sportgeschäft – oder irgendwo versteckt in der Stadt.',3,P);return;}P.shoesOn=!P.shoesOn;setShoeLook(P);hint(P.shoesOn?'<b>Superschuhe an</b> – Shift zum Sprinten':'Superschuhe aus',2,P);chime(P.shoesOn?[660,990,1320]:[660,440]);}
function giveShoes(P){const first=!G.superShoes;G.superShoes=true;if(first){P.shoesOn=true;setShoeLook(P);showBig('SUPERSCHUHE','win',3,'Shift: Turbo-Sprint · U: an/aus');}}
function shoeEffects(P,dt){const h=P.h;if(!P.shoesOn||P.car||!h)return;const sp=Math.hypot(h.vx||0,h.vz||0);
  if(sp>9){if(Math.random()<dt*40)spawnPart(h.x-h.vx*0.03+mr(-0.2,0.2),h.y+0.1,h.z-h.vz*0.03+mr(-0.2,0.2),{color:mpick([0x7fffe8,0xffffff,0x40e0ff]),size:mr(0.15,0.35),vy:0.3,life:0.35,grow:0.4,add:true});
    for(const o of HUMANS){if(o===h||!o.alive||o.inCar||playerOfHuman(o)||o.keeper)continue;const dx=o.x-h.x,dz=o.z-h.z;if(dx*dx+dz*dz<0.7){knockHuman(o,h.vx*0.5,h.vz*0.5,3,8,true);}}}}

// ===================== PASSANTEN, DIE VON SICH AUS AKTIV WERDEN =====================
// Sprechblasen über Köpfen
const BUBBLES=[];
function say(h,text,dur=3.2,cls=''){if(!h||!h.g)return;if(!h.bubble&&BUBBLES.length>=16&&!playerOfHuman(h))return;let el=h.bubble;if(!el){el=document.createElement('div');el.className='bubble';$('bubbles').appendChild(el);h.bubble=el;}el.className='bubble '+cls;el.textContent=text;h.bubbleT=dur;if(!BUBBLES.includes(h))BUBBLES.push(h);
  if(h.fx)h.fx.talk=1;setTimeout(()=>{if(h.fx)h.fx.talk=0;},Math.min(dur*1000,text.length*55));}
const _bv=new THREE.Vector3();
function updateBubbles(dt){const cam=P1.camera;const W=innerWidth/(G.split?2:1),H=innerHeight;
  for(let i=BUBBLES.length-1;i>=0;i--){const h=BUBBLES[i];h.bubbleT-=dt;const el=h.bubble;if(h.bubbleT<=0||h.removed||!h.alive||(INDOOR&&h.room!==INDOOR&&!playerOfHuman(h))){el.remove();h.bubble=null;BUBBLES.splice(i,1);continue;}
    _bv.set(h.x,h.y+2.25,h.z);const d=cam.position.distanceTo(_bv);_bv.project(cam);
    if(_bv.z>1||d>45){el.style.display='none';continue;}el.style.display='';el.style.transform=`translate(${(_bv.x*0.5+0.5)*W}px,${(-_bv.y*0.5+0.5)*H}px) translate(-50%,-100%) scale(${clamp(14/d,0.65,1.15)})`;el.style.opacity=Math.min(1,h.bubbleT*2);}}
const SHOUTS=['HEY DU! JA, DU!','HALLOOOO! DU DA!','DU HAST WAS VERLOREN!','HEY! IS DES DEIN AUTO?!','WARTE MAL! WARTE!!','DU SIEHST AUS WIE MEIN COUSIN!','HELAAAU!','EY! DEINE SCHNÜRSENKEL!'];
const SHOUT_END=['Warum schreist du so?','Warum schreist du denn so?! Ich steh doch direkt neben dir!','Psst. Nicht so laut. Die Tauben hören mit.','Ach, du bist’s gar net. Tschuldigung.','… Ich hab vergessen, was ich wollte.'];
const APPROACH=['Entschuldigung! Sie da! Darf ich Sie was fragen?','Ey, du! Komm mal her! Nur kurz!','Sie sehen aus wie jemand, der zuhört. Haben Sie eine Minute?','Na, du? Schöner Tag zum Reden, oder?'];
const AGGRO=['Was guckst du?!','Du hast meinen Parkplatz geklaut!','DU warst das mit der Fleischworscht!','Komm her, wenn du dich traust!','Mein Schwager hat gesagt, du bist schuld!','Ich hab heut schlechte Laune. Und DU bist da!'];
const MUMBLE=['… und dann hab ich zur Taube gesagt: Nein, DU!','Wo hab ich nur mein Auto geparkt? … Hab ich ein Auto?','Helau. Helau. Helau. Ich übe.','Noch drei Tage bis Freitag. Oder sieben?','Ich hätte den Woi net trinken sollen. Oder den zweiten.','Der Rhein riecht heute nach Mittwoch.','Wenn ich groß bin, werd ich Straßenbahn.','Mein Horoskop sagt: Vorsicht vor Leuten in roten Pullis.','Ob die Domtürme nachts tanzen?','Brezel, Brezel, Brezel …'];
let ambT=12,mumbleT=4;
function nearbyPed(P,rmin,rmax){const h=P.h;const out=[];for(const o of HUMANS){if(o.kind!=='ped'||!o.alive||o.inCar||o.mission||o.keeper||o.state!=='walk')continue;const d=Math.hypot(o.x-h.x,o.z-h.z);if(d>rmin&&d<rmax)out.push(o);}return out.length?mpick(out):null;}
function updateAmbient(dt){const P=P1;const h=P.h;updateBubbles(dt);if(!h||P.car||h.room||TALK||P.gameOver||mode!=='play')return;
  mumbleT-=dt;if(mumbleT<=0){mumbleT=mr(5,11);const o=nearbyPed(P,3,22);if(o&&!o.bubble)say(o,mpick(MUMBLE),3.5,'quiet');}
  ambT-=dt;if(ambT>0)return;ambT=mr(25,45);const r=Math.random();
  if(r<0.4){const o=nearbyPed(P,10,30);if(o){o.state='shout';o.shoutT=0;o.shoutN=0;say(o,mpick(SHOUTS),2.5,'loud');}}
  else if(r<0.75){const o=nearbyPed(P,6,25);if(o){o.state='approach';o.apT=0;say(o,mpick(APPROACH),3);}}
  else{const o=nearbyPed(P,8,25);if(o&&wanted<3){o.state='brawl';o.brT=0;o.hitT=0.8;o.walkSpeed=4.6;o.setExpr('angry');say(o,mpick(AGGRO),2.5,'loud');}}}
// Steuerung der aktiven Passanten (im Hauptloop für state shout/approach/brawl)
function updateActivePed(o,dt){const P=nearestPlayer(o.x,o.z);const h=P.h;if(!h||P.car||h.room){o.state='walk';pedFlee(o,o.x,o.z,1);o.setExpr('neutral');return;}
  const dx=h.x-o.x,dz=h.z-o.z,d=Math.hypot(dx,dz);let mv=0;
  if(o.state==='shout'){o.shoutT+=dt;if(d>2.2){mv=moveHuman(o,dx,dz,3.6,dt);faceTo(o,dx,dz,dt,8);if(o.shoutT>2.6&&o.shoutN<3){o.shoutN++;o.shoutT=0;say(o,mpick(SHOUTS),2.3,'loud');o.setExpr('surprised');}}
    else{faceTo(o,dx,dz,dt,8);say(o,mpick(SHOUT_END),3.6);o.setExpr(mpick(['cringe','surprised','smug']));o.state='walk';setTimeout(()=>{if(o.alive&&o.state==='walk')pedFlee(o,h.x,h.z,2);},3000);}
    if(o.shoutT>14||d>60){o.state='walk';}}
  else if(o.state==='approach'){o.apT+=dt;if(d>1.7){mv=moveHuman(o,dx,dz,2.6,dt);faceTo(o,dx,dz,dt,8);}else if(!TALK){o.state='wait';startTalk(P,o);return;}if(o.apT>15||d>50){o.state='walk';}}
  else if(o.state==='brawl'){o.brT+=dt;o.hitT-=dt;faceTo(o,dx,dz,dt,10);if(d>1.05)mv=moveHuman(o,dx,dz,4.6,dt);
    else if(o.hitT<=0){o.hitT=mr(0.8,1.3);o.armR.rotation.x=-1.45;o.armR.rotation.z=0.4;noiseHit(0.4,0.08,600);damagePlayer(P,mr(5,9));P.cam.shake=Math.max(P.cam.shake,0.15);if(Math.random()<0.3)say(o,mpick(['Nimm das!','Für meine Oma!','Und noch eine!','HELAU!']),1.5,'loud');}
    if(o.brT>25||d>45||o.health<20){o.state='walk';o.setExpr('sad');say(o,mpick(['Schon gut, schon gut!','Ich hab Rücken.','Das war nur Spaß!']),2.5);pedFlee(o,h.x,h.z,8);return;}}
  o.animate(dt,mv);o.y=groundY(o.x,o.z,o.y);o.sync();}

// ===================== JETPACK (jeder Spieler hat von Anfang an einen) =====================
// Springen und Sprungtaste in der Luft gedrückt halten = Schub. Treibstoff lädt am Boden nach.
const JET_MAT=new THREE.MeshStandardMaterial({color:0x8a9096,metalness:0.8,roughness:0.3});
const JET_RED=new THREE.MeshStandardMaterial({color:0xb3202a,metalness:0.4,roughness:0.4});
const JET_FLAME=new THREE.MeshBasicMaterial({color:0xffb040,transparent:true,opacity:0.85,blending:THREE.AdditiveBlending,depthWrite:false});
function attachJetpack(P){const h=P.h;if(!h||h.jetG)return;const g=new THREE.Group();g.position.set(0,0.38,-0.2);h.hips.add(g);
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.13,0.2,4,12).scale(1.25,1,0.6),JET_RED);body.castShadow=true;g.add(body);
  for(const s of [-1,1]){const st=new THREE.Mesh(new THREE.BoxGeometry(0.035,0.46,0.02),cmat(0x1a1a1a,0.7));st.position.set(s*0.1,0.0,0.33);g.add(st);const st2=new THREE.Mesh(new THREE.BoxGeometry(0.035,0.02,0.34),cmat(0x1a1a1a,0.7));st2.position.set(s*0.1,0.22,0.16);g.add(st2);}
  const gauge=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.035,0.02,12).rotateX(Math.PI/2),cmat(0xf2f2f2,0.3));gauge.position.set(0,0.1,-0.085);g.add(gauge);
  const flames=[];for(const s of [-1,1]){const t=new THREE.Mesh(new THREE.CapsuleGeometry(0.068,0.34,4,12),JET_MAT);t.position.set(s*0.12,-0.02,-0.11);t.castShadow=true;g.add(t);
    const n=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.075,0.1,12),JET_MAT);n.position.set(s*0.12,-0.29,-0.1);g.add(n);
    const f=new THREE.Mesh(new THREE.ConeGeometry(0.07,0.6,10).rotateX(Math.PI),JET_FLAME);f.position.set(s*0.12,-0.62,-0.1);f.visible=false;g.add(f);flames.push(f);}
  h.jetG=g;h.jetFlames=flames;P.jet={fuel:1,on:false,snd:0};}
function jetUpdate(P,I,dt){const J=P.jet;if(!J)return false;const h=P.h;const want=I.jump&&!P.ground&&P.airT>0.18&&J.fuel>0.01;J.on=want;
  if(want){P.vy=Math.min(P.vy+30*dt,8.5);J.fuel=Math.max(0,J.fuel-dt*0.09);
    if(Math.random()<dt*60){const fx=Math.sin(h.facing),fz=Math.cos(h.facing);for(const s of [-1,1]){const rx=Math.cos(h.facing)*s*0.12;spawnPart(h.x-fx*0.32+rx,h.y+0.3,h.z-fz*0.32-Math.sin(h.facing)*s*0.12,{color:mpick([0xffa030,0xffd060,0xff6a10]),size:mr(0.25,0.45),vy:-4,life:0.25,grow:0.8,add:true});}}
    if(Math.random()<dt*12)spawnPart(h.x,h.y-0.2,h.z,{color:0x9a9a9a,size:mr(0.6,1.1),vy:-1,life:1.2,grow:1.8,alpha:0.35});}
  if(h.jetFlames)for(const f of h.jetFlames){f.visible=want;if(want)f.scale.set(1,0.7+Math.random()*0.6,1);}
  jetSound(P,want);if(J.fuel<0.02&&I.jump&&!P.ground&&!J.warned){J.warned=true;hint('Jetpack leer – landen zum Nachtanken!',2,P);}
  return want;}
function jetLand(P,dt=0.016){const J=P.jet;if(!J)return;J.on=false;J.warned=false;J.fuel=Math.min(1,J.fuel+dt*0.25);const h=P.h;if(h.jetFlames)for(const f of h.jetFlames)f.visible=false;jetSound(P,false);
  }
function jetSound(P,on){const ctx=AUD.ctx;if(!ctx)return;if(!AUD.jetGain){const s=ctx.createBufferSource();s.buffer=AUD.noise;s.loop=true;const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=700;const g=AUD.jetGain=ctx.createGain();g.gain.value=0;s.connect(f);f.connect(g);g.connect(AUD.master);s.start();}
  const any=PLAYERS.some(Q=>Q.jet&&Q.jet.on);AUD.jetGain.gain.setTargetAtTime(any?0.22:0,ctx.currentTime,0.08);}
