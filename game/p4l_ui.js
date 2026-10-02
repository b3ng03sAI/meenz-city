// ===================== TASTENBELEGUNG IM SPIEL (K / F1 / Pause-Menü) =====================
const KEYS_HELP=[
  ['Zu Fuß',[['W A S D','Laufen'],['Maus','Umsehen'],['Shift','Rennen'],['Leertaste','Springen'],['Leertaste halten (in der Luft)','Jetpack'],['U','Superschuhe an/aus']]],
  ['Fahrzeuge',[['F','Einsteigen / Aussteigen / Auto knacken'],['W / S','Gas / Bremse, Rückwärts'],['A / D','Lenken'],['Leertaste','Handbremse'],['H','Hupe']]],
  ['Kampf',[['Linke Maus','Schlagen, Schießen, Werfen'],['Rechte Maus','Zielen'],['Q','Waffe wechseln'],['1 – 8','Waffe direkt wählen'],['R','Nachladen']]],
  ['Leute & Orte',[['E','Passanten ansprechen'],['1 – 3','Antwort im Gespräch'],['F (an Ladentür)','Geschäft betreten'],['F (an der Theke)','Einkaufen'],['G','Mittrinken / Schoppen kaufen'],['E (Heunensäule)','Brezel-Schalter: Marktfrühstück']]],
  ['Welt & System',[['M','Karte (Mausrad zoomen, ziehen)'],['P / Esc','Pause, Speichern, Laden'],['F5','Schnellspeichern'],['T','Uhrzeit +1 Stunde'],['Z','Wetter wechseln'],['K / F1','Diese Übersicht']]],
  ['Spieler 2',[['Pfeiltasten','Laufen, Fahren'],['Enter','Ein-/Aussteigen'],['Strg rechts','Schießen'],['Shift rechts','Springen / Handbremse'],['- ','Waffe'],[', .','Umsehen']]]];
function buildKeysOverlay(){const g=document.querySelector('#keysov .kgrid');if(!g||g.childElementCount)return;
  g.innerHTML=KEYS_HELP.map(([t,rows])=>`<h4>${t}</h4>`+rows.map(([k,d])=>`<div>${k.split(' / ').map(x=>`<kbd>${x}</kbd>`).join(' / ')} ${d}</div>`).join('')).join('');}
function toggleKeys(force){buildKeysOverlay();const o=$('keysov');o.hidden=force===undefined?!o.hidden:!force;}
addEventListener('keydown',e=>{if(e.code==='F1'||(e.code==='KeyK'&&(mode==='play'||mode==='pause')&&!TALK)){e.preventDefault();toggleKeys();}});
{const b=$('btn-keys');if(b)b.addEventListener('click',()=>toggleKeys(true));}
function updateUI(){document.body.classList.toggle('playing',mode==='play');}
