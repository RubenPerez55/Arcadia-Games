(() => {
  Arcade.register({
    id: 'breakout', name: 'Breakout', emoji: '🧱', cat: 'arcade', best: 'high', color: '#f97316',
    desc: 'Rompe todos los ladrillos con la pelota sin dejarla caer.',
    controls: 'Mouse / dedo o ← → · clic o Espacio para lanzar',
    start(root, api) {
      const W = 480, H = 600;
      const { canvas, ctx } = api.canvas(W, H);
      const BR = 6, BC = 8, PAD = 16, GAP = 6, BW = (W - PAD * 2 - GAP * (BC - 1)) / BC, BH = 20, TOP = 70;
      const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#8b5cf6'];
      const paddle = { x: W / 2 - 45, w: 90, y: H - 40, h: 12 };
      let ball, bricks, lives = 3, score = 0, level = 1, stuck = true, done = false, parts = [];
      const keys = {};

      function build() {
        bricks = [];
        for (let r = 0; r < BR; r++) for (let c = 0; c < BC; c++)
          bricks.push({ x: PAD + c * (BW + GAP), y: TOP + r * (BH + GAP), c: COLORS[r], pts: (BR - r) * 10, alive: true });
      }
      function resetBall() { stuck = true; ball = { x: 0, y: 0, vx: 0, vy: 0, r: 7, sp: 320 + level * 30 }; }
      function launch() {
        if (done || !stuck) return;
        stuck = false;
        const a = Math.random() * 0.5 - 0.25;
        ball.vx = Math.sin(a) * ball.sp; ball.vy = -Math.cos(a) * ball.sp;
      }
      build(); resetBall();

      api.on(window, 'keydown', e => { keys[e.key.toLowerCase()] = true; if (e.key === ' ') launch(); });
      api.on(window, 'keyup', e => { keys[e.key.toLowerCase()] = false; });
      api.on(canvas, 'pointermove', e => { paddle.x = clamp(api.pointer(canvas, e).x - paddle.w / 2, 0, W - paddle.w); });
      api.on(canvas, 'pointerdown', e => { paddle.x = clamp(api.pointer(canvas, e).x - paddle.w / 2, 0, W - paddle.w); launch(); });

      function burst(b) {
        for (let i = 0; i < 10; i++) parts.push({ x: b.x + BW / 2, y: b.y + BH / 2, vx: (Math.random() - 0.5) * 260, vy: (Math.random() - 0.5) * 260, life: 0.6, c: b.c });
      }
      function collide() {
        if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); }
        if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); }
        if (ball.y < ball.r) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); }
        if (ball.y > H + 20) {
          lives--; api.beep(150, 0.3, 'sawtooth');
          if (lives <= 0) { done = true; api.gameOver(`Puntuación: ${score} · Nivel ${level}`); } else resetBall();
          return;
        }
        if (ball.vy > 0 && ball.y + ball.r >= paddle.y && ball.y + ball.r <= paddle.y + paddle.h + 8 && ball.x > paddle.x - ball.r && ball.x < paddle.x + paddle.w + ball.r) {
          const rel = clamp(((ball.x - paddle.x) / paddle.w) * 2 - 1, -1, 1), a = rel * 1.05, sp = Math.hypot(ball.vx, ball.vy);
          ball.vx = Math.sin(a) * sp; ball.vy = -Math.cos(a) * sp; ball.y = paddle.y - ball.r;
          api.beep(440, 0.03);
        }
        for (const b of bricks) {
          if (!b.alive) continue;
          const cx = clamp(ball.x, b.x, b.x + BW), cy = clamp(ball.y, b.y, b.y + BH);
          const dx = ball.x - cx, dy = ball.y - cy;
          if (dx * dx + dy * dy > ball.r * ball.r) continue;
          b.alive = false; score += b.pts; api.setScore(score); burst(b);
          api.beep(500 + b.pts * 8, 0.04, 'square', 0.03);
          const ox = Math.min(ball.x + ball.r - b.x, b.x + BW - (ball.x - ball.r));
          const oy = Math.min(ball.y + ball.r - b.y, b.y + BH - (ball.y - ball.r));
          if (ox < oy) ball.vx *= -1; else ball.vy *= -1;
          const sp = Math.hypot(ball.vx, ball.vy), ns = Math.min(sp * 1.01, 720);
          ball.vx *= ns / sp; ball.vy *= ns / sp;
          if (bricks.every(x => !x.alive)) { level++; build(); resetBall(); api.beep(880, 0.2, 'triangle'); }
          break;
        }
      }
      function update(dt) {
        if (keys.arrowleft || keys.a) paddle.x -= 520 * dt;
        if (keys.arrowright || keys.d) paddle.x += 520 * dt;
        paddle.x = clamp(paddle.x, 0, W - paddle.w);
        parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt; p.life -= dt; });
        parts = parts.filter(p => p.life > 0);
        if (stuck) { ball.x = paddle.x + paddle.w / 2; ball.y = paddle.y - ball.r - 1; return; }
        for (let i = 0; i < 4; i++) {
          ball.x += ball.vx * dt / 4; ball.y += ball.vy * dt / 4;
          collide();
          if (stuck || done) return;
        }
      }
      function draw() {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#111827'); g.addColorStop(1, '#1e1b4b');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        bricks.forEach(b => {
          if (!b.alive) return;
          ctx.fillStyle = b.c; ctx.beginPath(); ctx.roundRect(b.x, b.y, BW, BH, 5); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(b.x + 4, b.y + 3, BW - 8, 4);
        });
        parts.forEach(p => { ctx.globalAlpha = Math.max(0, p.life / 0.6); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 4, 4); });
        ctx.globalAlpha = 1;
        const pg = ctx.createLinearGradient(paddle.x, 0, paddle.x + paddle.w, 0);
        pg.addColorStop(0, '#a78bfa'); pg.addColorStop(1, '#22d3ee');
        ctx.fillStyle = pg; ctx.beginPath(); ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 6); ctx.fill();
        ctx.shadowColor = '#fff'; ctx.shadowBlur = 12; ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
        ctx.font = "600 18px 'Outfit', sans-serif"; ctx.fillStyle = '#fff';
        ctx.fillText('❤️'.repeat(lives), 14, 36);
        ctx.textAlign = 'right'; ctx.fillText('Nivel ' + level, W - 14, 36); ctx.textAlign = 'left';
        if (stuck && !done) {
          ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,255,255,.8)';
          ctx.fillText('Clic o Espacio para lanzar', W / 2, H / 2 + 60); ctx.textAlign = 'left';
        }
      }
      api.loop(dt => { if (!done) update(dt); draw(); });
    },
  });
})();
