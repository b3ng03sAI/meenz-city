// ===================== HALTUNGS-SPERRE (Inhaltsregel) =====================
// Keine Figur darf den rechten Arm allein gestreckt über Schulterhöhe nach vorn/oben heben – das sähe aus wie ein
// verbotener Gruß. Und keine Jubelpose mit beiden Armen senkrecht. Läuft am Ende jedes update() über alle Menschen,
// egal welches Feature die Pose gesetzt hat. Ausnahme: Körper liegt/schwimmt (waagerecht), dann zeigt „oben“ nach vorn.
const HALTUNG={RMAX:-1.0,clamped:0};// −1,0 rad ≈ 33° unter der Waagerechten
function haltungFix(h){if(!h||!h.armR||!h.armL||!h.g)return;if(Math.abs(h.g.rotation.x)>0.6||Math.abs(h.g.rotation.z)>0.6)return;
  const r=h.armR.rotation,l=h.armL.rotation;
  const bothUp=l.x<HALTUNG.RMAX&&r.x<HALTUNG.RMAX;
  if(bothUp){// beide oben: nie senkrecht nebeneinander, sondern als seitliches V
    if(r.x<-2.3&&r.z>-0.6){r.z=-0.7;HALTUNG.clamped++;}if(l.x<-2.3&&l.z<0.6){l.z=0.7;}}
  else if(r.x<HALTUNG.RMAX){r.x=HALTUNG.RMAX;if(r.z<0.3||r.z>0.5)r.z=0.4;HALTUNG.clamped++;}}// rechter Arm allein: unter Schulterhöhe, zur Körpermitte abgewinkelt
HALTUNG.fix=haltungFix;
const _haltUpdate=update;
update=function(dt){_haltUpdate(dt);for(const h of HUMANS)haltungFix(h);};
