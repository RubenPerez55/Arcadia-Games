(() => {
  Arcade.register({
    id: 'crossy', name: 'Crossy Road', emoji: '🐔', cat: 'arcade', best: 'high', color: '#84cc16',
    desc: 'Cruza calles y ríos sin que te atropellen ni caer al agua.',
    controls: 'Flechas / WASD · toca para avanzar o desliza en móvil',
    start(root, api) {
      const COLS = 9, S = 48, ROWS = 13, W = COLS * S, H = ROWS * S;
      const { canvas, ctx } = api.canvas(W, H);
      const CAR_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#a855f7', '#ec4899', '#14b8a6', '#f97316'];

      /* ---------- Generación de carriles ---------- */
      const lanes = new Map();
      const WALL = { type: 'grass', trees: new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]) };
      let gen = -1, seg = { type: 'grass', left: 4 };

      function nextSeg(prev) {
        const opts = prev === 'grass' ? ['road', 'road', 'river'] : prev === 'road' ? ['grass', 'grass', 'river'] : ['grass', 'grass', 'road'];
        const t = pick(opts);
        return { type: t, left: t === 'grass' ? 1 + rnd(2) : t === 'road' ? 1 + rnd(4) : 1 + rnd(3) };
      }
      function genLane(r) {
        if (seg.left <= 0) seg = nextSeg(seg.type);
        seg.left--;
        const L = { type: seg.type };
        const diff = Math.min(1, r / 120);
        if (L.type === 'grass') {
          L.trees = new Set();
          if (r >= 4) { const n = rnd(4); for (let i = 0; i < n; i++) L.trees.add(rnd(COLS)); }
        } else {
          const river = L.type === 'river';
          L.dir = Math.random() < 0.5 ? 1 : -1;
          L.span = COLS + 6;
          L.speed = river ? 0.9 + Math.random() * 1.1 + diff * 0.6 : 1.3 + Math.random() * 1.7 + diff * 2.5;
          L.items = [];
          const n = river ? 3 + rnd(2) : 2 + rnd(2) + (diff > 0.4 ? 1 : 0);
          const sp = L.span / n;
          for (let i = 0; i < n; i++) {
            const w = river ? 2 + rnd(2) : (Math.random() < 0.25 ? 2.1 : 1.25);
            L.items.push({ x: -3 + i * sp + Math.random() * Math.max(0, sp - w - (river ? 0.8 : 1.4)), w, color: pick(CAR_COLORS), truck: w > 2 });
          }
        }
        return L;
      }
      function lane(r) {
        if (r < 0) return WALL;
        while (gen < r) { gen++; lanes.set(gen, genLane(gen)); }
        return lanes.get(r);
      }

      /* ---------- Estado ---------- */
      const P = { x: 4, row: 0, from: { x: 4, row: 0 }, hop: 0, dead: false, death: '', face: 0 };
      let camY = 0, score = 0, started = false, time = 0;

      const onLog = (L, x) => L.items.find(it => x + 0.5 > it.x && x + 0.5 < it.x + it.w);

      function move(dx, dy) {
        if (P.dead) return;
        if (!started) { started = true; api.hideOverlay(); }
        const nr = P.row + dy;
        if (nr < 0) return;
        const target = lane(nr);
        let nx = P.x + dx;
        if (dy !== 0 && target.type !== 'river') nx = clamp(Math.round(nx), 0, COLS - 1);
        if (dx !== 0) {
          if (lane(P.row).type !== 'river') nx = Math.round(nx);
          if (nx < -0.4 || nx > COLS - 0.6) return;
        }
        if (target.type === 'grass' && target.trees.has(Math.round(nx))) return;
        P.from = { x: P.x, row: P.row };
        P.x = nx; P.row = nr; P.hop = 1;
        if (dx) P.face = dx;
        api.beep(dy > 0 ? 280 : 360, 0.03, 'triangle', 0.03);
        if (P.row > score) { score = P.row; api.setScore(score); }
        check();
      }

      function die(type, msg) {
        if (P.dead) return;
        P.dead = true; P.death = type;
        api.beep(120, 0.3, 'sawtooth');
        api.timeout(() => api.gameOver(`${msg}<br>Avanzaste <b>${score}</b> fila${score === 1 ? '' : 's'}.`), 500);
      }

      function check() {
        const L = lane(P.row);
        if (L.type === 'road') {
          const c = P.x + 0.5;
          if (L.items.some(it => c + 0.3 > it.x && c - 0.3 < it.x + it.w)) return die('car', '¡Te atropellaron! 🚗');
        } else if (L.type === 'river') {
          if (!onLog(L, P.x)) return die('water', '¡Caíste al agua! 💦');
        }
        if (P.x < -0.4 || P.x > COLS - 0.6) return die('water', '¡Te arrastró la corriente!');
        if (P.row < camY - 1.5) return die('eagle', '¡Te quedaste atrás! 🦅');
      }

      const KEYS = { arrowup: [0, 1], w: [0, 1], arrowdown: [0, -1], s: [0, -1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] };
      api.on(window, 'keydown', e => { if (e.repeat) return; const k = KEYS[e.key.toLowerCase()]; if (k) move(k[0], k[1]); });
      api.swipe(canvas, d => { const m = { tap: [0, 1], up: [0, 1], down: [0, -1], left: [-1, 0], right: [1, 0] }[d]; if (m) move(m[0], m[1]); });

      /* ---------- Loop ---------- */
      api.loop(dt => {
        time += dt;
        if (!P.dead) {
          for (const L of lanes.values()) if (L.items) for (const it of L.items) {
            it.x += L.dir * L.speed * dt;
            if (L.dir > 0 && it.x > COLS + 3) it.x -= L.span;
            else if (L.dir < 0 && it.x < -3) it.x += L.span;
          }
          if (started) {
            const L = lane(P.row);
            if (L.type === 'river') { const log = onLog(L, P.x); if (log) P.x += L.dir * L.speed * dt; }
            camY += dt * (0.22 + Math.min(score, 200) * 0.003);
            const tgt = P.row - 3;
            if (tgt > camY) camY += (tgt - camY) * Math.min(1, dt * 5);
            check();
          }
          for (const r of lanes.keys()) if (r < camY - 6) lanes.delete(r);
        }
        P.hop = Math.max(0, P.hop - dt / 0.12);
        draw();
      });

      /* ---------- Dibujo ---------- */
      const rr = (x, y, w, h, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); };
      const rowY = r => H - (r - camY + 2) * S;

      function drawTree(x, y) {
        ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x + 8, y + S - 10, S - 16, 6);
        rr(x + S * 0.38, y + S * 0.55, S * 0.24, S * 0.38, 3, '#7c4a1e');
        rr(x + 6, y + 2, S - 12, S * 0.62, 8, '#15803d');
        rr(x + 10, y + 4, S - 20, S * 0.28, 6, '#22c55e');
      }
      function drawCar(it, y, dir) {
        const x = it.x * S, w = it.w * S;
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + 4, y + S - 12, w - 8, 6);
        ctx.fillStyle = '#111';
        [x + 8, x + w - 18].forEach(wx => { ctx.fillRect(wx, y + 6, 10, 5); ctx.fillRect(wx, y + S - 11, 10, 5); });
        rr(x + 2, y + 9, w - 4, S - 18, 8, it.color);
        if (it.truck) rr(dir > 0 ? x + 6 : x + S * 0.75, y + 12, w - S * 0.75 - 6, S - 24, 4, 'rgba(255,255,255,.22)');
        const cw = it.truck ? S * 0.45 : w * 0.45;
        const cx = dir > 0 ? x + w - cw - 8 : x + 8;
        rr(cx, y + 14, cw, S - 28, 5, 'rgba(220,240,255,.85)');
        ctx.fillStyle = '#fde047';
        const lx = dir > 0 ? x + w - 6 : x + 2;
        ctx.fillRect(lx, y + 12, 4, 6); ctx.fillRect(lx, y + S - 18, 4, 6);
      }
      function drawLog(it, y) {
        const x = it.x * S, w = it.w * S;
        rr(x, y + 10, w, S - 20, 10, '#92400e');
        rr(x + 6, y + 14, w - 12, 5, 3, '#b45309');
        rr(x + 4, y + 12, 10, S - 24, 5, '#d6a36a');
      }
      function drawChicken() {
        const k = P.hop;
        const vx = P.x + (P.from.x - P.x) * k, vr = P.row + (P.from.row - P.row) * k;
        const lift = Math.sin(k * Math.PI) * 12;
        const x = vx * S, y = rowY(vr);
        if (P.dead && P.death === 'water') {
          ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3;
          for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x + S / 2, y + S / 2, 6 + i * 7, 3 + i * 4, 0, 0, 7); ctx.stroke(); }
          return;
        }
        if (P.dead && P.death === 'car') { rr(x + 4, y + S * 0.42, S - 8, S * 0.22, 6, '#fff'); rr(x + 20, y + S * 0.38, 8, 5, 2, '#ef4444'); return; }
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        ctx.beginPath(); ctx.ellipse(x + S / 2, y + S * 0.82, 13 - lift * 0.3, 5, 0, 0, 7); ctx.fill();
        const by = y + 6 - lift;
        rr(x + 17, by + 33, 3, 6, 1, '#f97316'); rr(x + 28, by + 33, 3, 6, 1, '#f97316');
        rr(x + 12, by + 8, 24, 27, 7, '#ffffff');
        rr(x + 12, by + 27, 24, 8, 4, '#e2e8f0');
        rr(x + 20, by + 2, 8, 8, 2, '#ef4444');
        const fx = P.face * 4;
        ctx.fillStyle = '#111'; ctx.fillRect(x + 17 + fx, by + 15, 3, 4); ctx.fillRect(x + 28 + fx, by + 15, 3, 4);
        rr(x + 21 + fx, by + 20, 6, 5, 1, '#f59e0b');
        rr(x + 22 + fx, by + 25, 4, 4, 1, '#ef4444');
      }

      function draw() {
        const r0 = Math.floor(camY) - 2, r1 = r0 + ROWS + 2;
        for (let r = r1; r >= r0; r--) {
          const L = lane(r), y = rowY(r);
          if (L.type === 'grass') {
            ctx.fillStyle = r < 0 ? '#5aa83f' : (r % 2 ? '#7ccf5a' : '#86d964'); ctx.fillRect(0, y, W, S);
          } else if (L.type === 'road') {
            ctx.fillStyle = '#3b3f4a'; ctx.fillRect(0, y, W, S);
            if (lane(r + 1).type === 'road') { ctx.fillStyle = 'rgba(255,255,255,.55)'; for (let x = 8; x < W; x += 44) ctx.fillRect(x, y - 2, 22, 4); }
          } else {
            ctx.fillStyle = '#4fa3e0'; ctx.fillRect(0, y, W, S);
            ctx.fillStyle = 'rgba(255,255,255,.18)';
            for (let i = 0; i < 4; i++) { const wx = ((time * 30 * L.dir + i * 120 + r * 37) % W + W) % W; ctx.fillRect(wx, y + 12 + (i % 2) * 18, 26, 3); }
          }
        }
        for (let r = r1; r >= r0; r--) {
          const L = lane(r), y = rowY(r);
          if (L.type === 'river') L.items.forEach(it => drawLog(it, y));
          if (Math.round(P.row) === r || (P.hop && Math.round(P.from.row) === r)) { if (Math.round(P.row) === r) drawChicken(); }
          if (L.type === 'grass') L.trees.forEach(c => drawTree(c * S, y));
          if (L.type === 'road') L.items.forEach(it => drawCar(it, y, L.dir));
        }
        ctx.font = "bold 34px 'Outfit', sans-serif"; ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 6;
        ctx.fillText(score, 16, 44); ctx.shadowBlur = 0;
      }

      api.overlay('🐔 Crossy Road', 'Avanza con ↑ esquivando autos y saltando troncos.<br>¡No te quedes atrás!', 'Jugar', () => { started = true; });
    },
  });
})();
