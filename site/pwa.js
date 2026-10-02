// Nur GitHub-Pages-Version: Service Worker, Update-Hinweis, iOS-Hinweis „Zum Home-Bildschirm“.
(function () {
  const STANDALONE = matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone === true;
  function toast(html, ms, onTap) {
    const d = document.createElement('div');
    d.className = 'pwa-toast';
    d.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:calc(18px + env(safe-area-inset-bottom,0px));' +
      'z-index:200;width:min(92vw,460px);box-sizing:border-box;padding:10px 38px 10px 14px;border-radius:10px;' +
      'background:rgba(11,13,16,.94);color:#fff;border-left:4px solid #c8102e;font:600 15px/1.35 "Barlow Condensed",Arial,sans-serif;' +
      'box-shadow:0 6px 20px rgba(0,0,0,.45);cursor:pointer';
    d.innerHTML = html + '<span style="position:absolute;right:12px;top:8px;font-size:20px;opacity:.7">×</span>';
    const close = () => d.remove();
    d.addEventListener('click', () => { close(); if (onTap) onTap(); });
    const show = () => { document.body.appendChild(d); if (ms) setTimeout(close, ms); };
    document.body ? show() : addEventListener('DOMContentLoaded', show);
  }
  window.__PWA = { standalone: STANDALONE, toast };

  if ('serviceWorker' in navigator) {
    addEventListener('load', () => {
      const hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.register('sw.js').catch(() => {});
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hadController) toast('Neue Version geladen – <b>tippen zum Neustarten</b> (Spielstand bleibt erhalten)', 0, () => location.reload());
      });
    });
  }

  // iPhone/iPad im Browser: einmalig zeigen, wie man Vollbild bekommt
  const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let seen = null; try { seen = localStorage.getItem('meenz-a2hs'); } catch (e) {}
  if (IOS && !STANDALONE && !seen) {
    addEventListener('load', () => setTimeout(() => {
      toast('Tipp für Vollbild: unten auf <b>Teilen</b> ⬆︎ und dann <b>„Zum Home-Bildschirm“</b>. Danach startet Meenz City wie eine App – auch ohne Netz.', 15000);
      try { localStorage.setItem('meenz-a2hs', '1'); } catch (e) {}
    }, 2500));
  }
})();
