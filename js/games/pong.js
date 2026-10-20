(() => {
  Arcade.register({
    id: 'pong', name: 'Pong', emoji: '🏓', cat: 'arcade', best: false, color: '#06b6d4',
    desc: 'El clásico tenis de mesa contra la CPU. El primero en llegar a 7 gana.',
    controls: 'Mouse / dedo o W-S / ↑ ↓',
    start(root, api) {
      const W = 720, H = 440, PH = 84, R = 8, WIN = 7;
      const { canvas, ctx } = api.canvas(W, H);
      let py = H / 2 - PH / 2, cy = H / 2 - PH / 2, ball, ps = 0, cs = 0, serve = 0, running = false, done = false;
      const keys = {};
      api.setScore('0 - 0');

      function reset(dir) { ball = { x: W / 2, y: H / 2, vx: 0, vy: 0, dir }; serve = 0.9; }
      reset(Math.random() < 0.5 ? 1 : -1);

      api.on(window, 'keydown', e => { keys[e.key.toLowerCase()] = true; });
      api.on(window, 'keyup', e => { keys[e.key.toLowerCase()] = false; });
      api.on(canvas, 'pointermove', e => { py = clamp(api.pointer(canvas, e).y - PH / 2, 0, H - PH); });

      function hitPaddle(top, dir, x) {
        const rel = (ball.y - (top + PH / 2)) / (PH / 2), a = clamp(rel, -1, 1) * 0.95;
        const sp = Math.min(900, Math.hypot(ball.vx, ball.vy) * 1.06);
        ball.vx = Math.cos(a) * sp * dir; ball.vy = Math.sin(a) * sp; ball.x = x;
        api.beep(dir > 0 ? 520 : 440, 0.03);
      }
      function point(dir) {
        api.setScore(`${ps} - ${cs}`);
        api.beep(dir < 0 ? 780 : 200, 0.15, 'triangle');
        if (ps >= WIN || cs >= WIN) {
          done = true;
          if (ps > cs) api.win(`Le ganaste a la CPU ${ps} a ${cs}.`); else api.gameOver(`La CPU ganó ${cs} a ${ps}.`);
          return;
        }
        reset(dir);
      }
      function update(dt) {
        if (keys.w || keys.arrowup) py -= 480 * dt;
        if (keys.s || keys.arrowdown) py += 480 * dt;
        py = clamp(py, 0, H - PH);
        const target = ball.vx > 0 ? ball.y - PH / 2 + Math.sin(performance.now() / 300) * 20 : H / 2 - PH / 2;
        const cpuSpeed = (270 + ps * 14) * dt;
        cy = clamp(cy + clamp(target - cy, -cpuSpeed, cpuSpeed), 0, H - PH);

        if (serve > 0) {
          serve -= dt;
          if (serve <= 0) { const a = Math.random() * 0.6 - 0.3; ball.vx = Math.cos(a) * 380 * ball.dir; ball.vy = Math.sin(a) * 380; }
          return;
        }
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        if (ball.y < R) { ball.y = R; ball.vy = Math.abs(ball.vy); api.beep(300, 0.02); }
        if (ball.y > H - R) { ball.y = H - R; ball.vy = -Math.abs(ball.vy); api.beep(300, 0.02); }
        if (ball.vx < 0 && ball.x - R < 34 && ball.x - R > 10 && ball.y > py - R && ball.y < py + PH + R) hitPaddle(py, 1, 34 + R);
        if (ball.vx > 0 && ball.x + R > W - 34 && ball.x + R < W - 10 && ball.y > cy - R && ball.y < cy + PH + R) hitPaddle(cy, -1, W - 34 - R);
        if (ball.x < -30) { cs++; point(1); } else if (ball.x > W + 30) { ps++; point(-1); }
      }
      function draw() {
        ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(255,255,255,.15)';
        for (let y = 10; y < H; y += 28) ctx.fillRect(W / 2 - 2, y, 4, 16);
        ctx.font = "800 72px 'Outfit', sans-serif"; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.12)';
        ctx.fillText(ps, W / 4, 90); ctx.fillText(cs, W * 3 / 4, 90);
        ctx.font = "600 14px 'Outfit', sans-serif"; ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.fillText('TÚ', W / 4, 115); ctx.fillText('CPU', W * 3 / 4, 115); ctx.textAlign = 'left';
        ctx.fillStyle = '#22d3ee'; ctx.beginPath(); ctx.roundRect(22, py, 12, PH, 6); ctx.fill();
        ctx.fillStyle = '#f472b6'; ctx.beginPath(); ctx.roundRect(W - 34, cy, 12, PH, 6); ctx.fill();
        ctx.shadowColor = '#fff'; ctx.shadowBlur = 14; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ball.x, ball.y, R, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      }
      api.loop(dt => { if (running && !done) update(dt); draw(); });
      api.overlay('🏓 Pong', 'Mueve tu paleta (izquierda) con el mouse o W/S.<br>Primero en llegar a 7 gana.', 'Jugar', () => { running = true; });
    },
  });
})();
