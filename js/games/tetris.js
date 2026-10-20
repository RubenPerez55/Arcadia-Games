(() => {
  Arcade.register({
    id: 'tetris', name: 'Tetris', emoji: '🟦', cat: 'puzzle', best: 'high', color: '#a855f7',
    desc: 'Acomoda las piezas que caen y completa líneas.',
    controls: '← → mover · ↑ / X rotar · ↓ bajar · Espacio: caída instantánea',
    start(root, api) {
      const COLS = 10, ROWS = 20, S = 28, PW = 150, BW = COLS * S, W = BW + PW, H = ROWS * S;
      const { canvas, ctx } = api.canvas(W, H);
      const SH = {
        I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
        J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
        O: [[1, 1], [1, 1]], S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
        T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
      };
      const COL = { I: '#22d3ee', J: '#3b82f6', L: '#f97316', O: '#facc15', S: '#22c55e', T: '#a855f7', Z: '#ef4444' };
      const grid = [...Array(ROWS)].map(() => Array(COLS).fill(null));
      let bag = [], cur = null, next, score = 0, lines = 0, level = 1, acc = 0, over = false, started = false;

      const draw7 = () => { if (!bag.length) bag = shuffle(Object.keys(SH)); return bag.pop(); };
      next = draw7();
      const rot = m => m[0].map((_, i) => m.map(r => r[i]).reverse());

      function hit(m, x, y) {
        for (let r = 0; r < m.length; r++) for (let c = 0; c < m[r].length; c++) {
          if (!m[r][c]) continue;
          const gx = x + c, gy = y + r;
          if (gx < 0 || gx >= COLS || gy >= ROWS) return true;
          if (gy >= 0 && grid[gy][gx]) return true;
        }
        return false;
      }
      function end() { over = true; api.gameOver(`Puntuación: ${score}<br>Líneas: ${lines} · Nivel ${level}`); }
      function spawn() {
        const t = next; next = draw7();
        const m = SH[t].map(r => r.slice());
        cur = { t, m, x: Math.floor((COLS - m[0].length) / 2), y: t === 'I' ? -1 : 0 };
        if (hit(cur.m, cur.x, cur.y)) end();
      }
      function rotate() {
        const m = rot(cur.m);
        for (const k of [0, -1, 1, -2, 2]) if (!hit(m, cur.x + k, cur.y)) { cur.m = m; cur.x += k; api.beep(520, 0.02, 'triangle'); return; }
      }
      const moveX = d => { if (!hit(cur.m, cur.x + d, cur.y)) cur.x += d; };
      function lock() {
        let top = false;
        cur.m.forEach((row, r) => row.forEach((v, c) => { if (v) { const gy = cur.y + r; if (gy < 0) top = true; else grid[gy][cur.x + c] = cur.t; } }));
        if (top) return end();
        let cleared = 0;
        for (let r = ROWS - 1; r >= 0; r--) if (grid[r].every(Boolean)) { grid.splice(r, 1); grid.unshift(Array(COLS).fill(null)); cleared++; r++; }
        if (cleared) {
          lines += cleared; score += [0, 100, 300, 500, 800][cleared] * level;
          level = 1 + Math.floor(lines / 10);
          api.beep(880, 0.12, 'square');
        } else api.beep(180, 0.03);
        api.setScore(score);
        spawn();
      }
      function drop() { if (!hit(cur.m, cur.x, cur.y + 1)) { cur.y++; return true; } lock(); return false; }
      function hard() { let n = 0; while (!hit(cur.m, cur.x, cur.y + 1)) { cur.y++; n++; } score += n * 2; lock(); }
      const begin = () => { if (!started) { started = true; api.hideOverlay(); } };

      spawn();
      api.on(window, 'keydown', e => {
        if (over) return;
        begin();
        switch (e.key) {
          case 'ArrowLeft': moveX(-1); break;
          case 'ArrowRight': moveX(1); break;
          case 'ArrowUp': case 'x': case 'X': rotate(); break;
          case 'ArrowDown': if (drop()) { score++; api.setScore(score); } acc = 0; break;
          case ' ': hard(); acc = 0; break;
        }
      });
      api.swipe(canvas, d => {
        if (over) return; begin();
        if (d === 'left') moveX(-1); else if (d === 'right') moveX(1);
        else if (d === 'up' || d === 'tap') rotate(); else if (d === 'down') hard();
      });

      api.loop(dt => {
        if (started && !over) {
          acc += dt;
          const speed = Math.max(0.07, 0.8 - (level - 1) * 0.07);
          if (acc >= speed) { acc = 0; drop(); }
        }
        draw();
      });

      function cell(x, y, color, alpha = 1, size = S) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color; ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
        ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.fillRect(x + 1, y + 1, size - 2, 4);
        ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + 1, y + size - 5, size - 2, 4);
        ctx.globalAlpha = 1;
      }
      function draw() {
        ctx.fillStyle = '#0d1222'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(255,255,255,.04)';
        for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * S, 0); ctx.lineTo(x * S, H); ctx.stroke(); }
        for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * S); ctx.lineTo(BW, y * S); ctx.stroke(); }
        grid.forEach((row, r) => row.forEach((t, c) => { if (t) cell(c * S, r * S, COL[t]); }));
        if (cur && !over) {
          let gy = cur.y; while (!hit(cur.m, cur.x, gy + 1)) gy++;
          cur.m.forEach((row, r) => row.forEach((v, c) => { if (v && gy + r >= 0) cell((cur.x + c) * S, (gy + r) * S, COL[cur.t], 0.18); }));
          cur.m.forEach((row, r) => row.forEach((v, c) => { if (v && cur.y + r >= 0) cell((cur.x + c) * S, (cur.y + r) * S, COL[cur.t]); }));
        }
        // Panel lateral
        ctx.fillStyle = '#141a2b'; ctx.fillRect(BW, 0, PW, H);
        ctx.fillStyle = '#8b95b5'; ctx.font = "600 13px 'Outfit', sans-serif";
        ctx.fillText('SIGUIENTE', BW + 20, 34);
        const m = SH[next], ps = 22, ox = BW + (PW - m[0].length * ps) / 2;
        m.forEach((row, r) => row.forEach((v, c) => { if (v) cell(ox + c * ps, 54 + r * ps, COL[next], 1, ps); }));
        const stat = (label, val, y) => {
          ctx.fillStyle = '#8b95b5'; ctx.font = "600 13px 'Outfit', sans-serif"; ctx.fillText(label, BW + 20, y);
          ctx.fillStyle = '#fff'; ctx.font = "800 28px 'Outfit', sans-serif"; ctx.fillText(val, BW + 20, y + 32);
        };
        stat('PUNTOS', score, 190); stat('LÍNEAS', lines, 270); stat('NIVEL', level, 350);
      }

      api.overlay('🟦 Tetris', 'Completa líneas para sumar puntos.<br>El juego acelera cada 10 líneas.', 'Jugar', begin);
    },
  });
})();
