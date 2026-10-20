'use strict';

/* ---------- Utilidades globales ---------- */
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
const shuffle = a => {
  for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ---------- Núcleo del arcade ---------- */
const Arcade = (() => {
  const games = [];
  const KEY = 'arcade.';
  let muted = localStorage.getItem(KEY + 'muted') === '1';
  let actx = null;

  function beep(freq = 440, dur = 0.08, type = 'square', vol = 0.04) {
    if (muted) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(actx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* sin audio */ }
  }

  const store = {
    get(key) { const v = localStorage.getItem(KEY + 'best.' + key); return v === null ? null : Number(v); },
    set(key, v) { localStorage.setItem(KEY + 'best.' + key, v); },
  };

  const fmt = (game, v) => (v === null || v === undefined) ? '—' : v + (game.unit || '');

  /**
   * Crea la API que recibe cada juego. Todo lo registrado aquí (eventos, loops,
   * timers) se limpia automáticamente al salir o reiniciar el juego.
   */
  function createApi(game, ui, restart) {
    const cleanups = [];
    const add = fn => (cleanups.push(fn), fn);

    const api = {
      root: ui.stage,
      restart,
      beep,
      on(target, evt, fn, opts) {
        target.addEventListener(evt, fn, opts);
        add(() => target.removeEventListener(evt, fn, opts));
      },
      loop(fn) {
        const s = { id: 0, on: true };
        let last = performance.now();
        const tick = t => {
          if (!s.on) return;
          const dt = Math.min(0.05, (t - last) / 1000); last = t;
          fn(dt, t);
          if (s.on) s.id = requestAnimationFrame(tick);
        };
        s.id = requestAnimationFrame(tick);
        return add(() => { s.on = false; cancelAnimationFrame(s.id); });
      },
      interval(fn, ms) { const id = setInterval(fn, ms); return add(() => clearInterval(id)); },
      timeout(fn, ms) { const id = setTimeout(fn, ms); add(() => clearTimeout(id)); return id; },
      canvas(w, h) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h; c.className = 'game-canvas';
        ui.stage.appendChild(c);
        return { canvas: c, ctx: c.getContext('2d') };
      },
      pointer(canvas, e) {
        const r = canvas.getBoundingClientRect();
        return { x: (e.clientX - r.left) * canvas.width / r.width, y: (e.clientY - r.top) * canvas.height / r.height };
      },
      swipe(el, fn) {
        let sx = null, sy = null;
        api.on(el, 'touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
        api.on(el, 'touchend', e => {
          if (sx === null) return;
          const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
          sx = null;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return fn('tap');
          fn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
        }, { passive: true });
      },
      setScore(v) {
        ui.score.textContent = v;
        if (game.best === 'high' && typeof v === 'number') api.record(v);
      },
      /** Guarda el récord si es mejor. Devuelve true si es nuevo récord. */
      record(v, variant = '') {
        if (!game.best) return false;
        const key = game.id + (variant ? '.' + variant : '');
        const b = store.get(key);
        const better = b === null || (game.best === 'high' ? v > b : v < b);
        if (better) store.set(key, v);
        api.showBest(variant);
        return better;
      },
      showBest(variant = '') {
        ui.best.textContent = game.best ? fmt(game, store.get(game.id + (variant ? '.' + variant : ''))) : '—';
      },
      overlay(title, msg, btnText, onClick) {
        ui.overlay.innerHTML = `<div class="overlay-box"><h2>${title}</h2><p>${msg || ''}</p>${btnText ? `<button class="btn">${btnText}</button>` : ''}</div>`;
        ui.overlay.hidden = false;
        const b = ui.overlay.querySelector('button');
        if (b) b.onclick = () => { api.hideOverlay(); onClick && onClick(); };
      },
      hideOverlay() { ui.overlay.hidden = true; },
      gameOver(msg) { beep(160, 0.3, 'sawtooth'); api.overlay('Fin del juego', msg, 'Jugar de nuevo', restart); },
      win(msg) {
        [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.12, 'triangle', 0.05), i * 110));
        api.overlay('¡Ganaste! 🎉', msg, 'Jugar de nuevo', restart);
      },
      dispose() { cleanups.splice(0).forEach(f => { try { f(); } catch (e) { /* ignore */ } }); },
    };
    return api;
  }

  return {
    games, store, fmt, beep, createApi,
    register: g => games.push(g),
    get muted() { return muted; },
    toggleMute() { muted = !muted; localStorage.setItem(KEY + 'muted', muted ? '1' : '0'); return muted; },
  };
})();
