// ===================== TOUCH-STEUERUNG FÜR ALLE FEATURES (Paket 51) =====================
// Erkennung live: der letzte echte Eingabetyp entscheidet (Finger → Touch-Knöpfe, Tastatur → ausblenden), damit auch
// Touch-Laptops und Tablets mit Tastatur passen. Zusätzliche Knöpfe lösen echte Tastatur-Ereignisse aus – so funktionieren
// sie für jedes Feature, das auf keydown/keys/keysP hört, ohne dass das Feature Touch kennen muss.
const TOUCHUI={mode:IS_TOUCH?'touch':'keys',btns:{},held:{}};
function touchKey(code,down){window.dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{code,key:code,bubbles:true}));}
function touchSetMode(m){if(TOUCHUI.mode===m&&(m==='keys'||setupTouch.done))return;TOUCHUI.mode=m;document.documentElement.classList.toggle('touchmode',m==='touch');
  if(m==='touch'){setupTouch(true);touchBuild();$('touch').hidden=mode==='menu'?true:false;}else{const t=$('touch');if(t)t.hidden=true;for(const c in TOUCHUI.held)touchKey(c,false);TOUCHUI.held={};}}
// Kontext-Knöpfe: [id, Beschriftung, Taste, halten?, sichtbar wenn …]
const TOUCH_CTX=[
  ['tc-act','AKTION','KeyE',false,P=>!P.car],
  ['tc-prost','PROST','KeyG',false,P=>!P.car&&typeof MARKT!=='undefined'&&MARKT.on&&Math.hypot(P.h.x-POI.markt[0],P.h.z-POI.markt[1])<160],
  ['tc-schuhe','SCHUHE','KeyU',false,P=>!P.car&&!!G.superShoes],
  ['tc-radio','RADIO','KeyN',false,P=>!!P.car&&!P.car.T.pedal&&!P.car.T.boat],
  ['tc-job','JOB','KeyJ',false,P=>!!P.car&&(P.car.T.taxi||P.car.id==='rettungswagen'||P.car.id==='loeschfahrzeug')],
  ['tc-down','RUNTER','ShiftLeft',true,P=>!!P.car&&(P.car.T.plane||P.car.T.hubi)],
  ['tc-horn','HUPE','KeyH',false,P=>!!P.car&&!P.car.T.pedal&&!P.car.T.plane&&!P.car.T.hubi]];
function touchBuild(){if(TOUCHUI.built||!$('touch'))return;TOUCHUI.built=true;const box=document.createElement('div');box.className='tctx';$('touch').appendChild(box);
  for(const [id,label,code,hold] of TOUCH_CTX){const b=document.createElement('button');b.id=id;b.textContent=label;b.hidden=true;box.appendChild(b);TOUCHUI.btns[id]=b;
    b.addEventListener('pointerdown',e=>{e.preventDefault();touchKey(code,true);if(hold)TOUCHUI.held[code]=1;else setTimeout(()=>touchKey(code,false),60);});
    if(hold){const up=()=>{touchKey(code,false);delete TOUCHUI.held[code];};b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up);}}}
function touchRefresh(){if(TOUCHUI.mode!=='touch'||!TOUCHUI.built)return;const t=$('touch');if(t)t.hidden=!(mode==='play');const P=P1;if(!P||!P.h)return;
  for(const [id,,,,vis] of TOUCH_CTX){let v=false;try{v=!!vis(P);}catch(e){}const b=TOUCHUI.btns[id];if(b.hidden===v)b.hidden=!v;}
  const j=$('tb-jump');if(j){const fly=!!P.car&&(P.car.T.plane||P.car.T.hubi);const l=fly?'HOCH':P.car?'HANDBR.':'SPRUNG';if(j.textContent!==l)j.textContent=l;}}
function setupTouchUI(){addEventListener('touchstart',e=>{if(e.isTrusted)touchSetMode('touch');},{passive:true,capture:true});
  addEventListener('keydown',e=>{if(e.isTrusted&&!e.repeat)touchSetMode('keys');},{capture:true});
  addEventListener('mousemove',e=>{if(e.isTrusted&&TOUCHUI.mode==='touch'&&(Math.abs(e.movementX)+Math.abs(e.movementY))>6&&!e.sourceCapabilities?.firesTouchEvents)touchSetMode('keys');},{passive:true});
  document.documentElement.classList.toggle('touchmode',TOUCHUI.mode==='touch');if(TOUCHUI.mode==='touch')touchBuild();setInterval(touchRefresh,250);}
TOUCHUI.setMode=touchSetMode;TOUCHUI.refresh=touchRefresh;TOUCHUI.ctx=TOUCH_CTX;
