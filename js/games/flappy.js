(() => {
  Arcade.register({
    id: 'flappy', name: 'Flappy Bird', emoji: '🐤', cat: 'arcade', best: 'high', color: '#38bdf8',
    desc: 'Aletea entre los tubos sin chocar. Más difícil de lo que parece.',
    controls: 'Espacio / ↑ / clic / toque para aletear',
    start(root, api) {
      const W = 400, H = 600, G = 1500, FLAP = -440, GAP = 160, SPEED = 170, GROUND = 80, PW = 64;
      const { canvas, ctx } = api.canvas(W, H);
      const bird = { x: 110, y: H / 2 - 40, vy: 0, r: 15 };
      let pipes = [], score = 0, state = 'ready', spawnT = 0, groundX = 0, t = 0, shown = false;
      const clouds = [...Array(5)].map(() => ({ x: Math.random() * W, y: 40 + Math.random() * 220, s: 0.6 + Math.random() * 0.8 }));

      function flap() {
        if (state === 'dead') return;
        if (state === 'ready') state = 'play';
        bird.vy = FLAP;
        api.beep(720, 0.04, 'triangle', 0.03);
      }
      api.on(window, 'keydown', e => { if (!e.repeat && [' ', 'ArrowUp', 'w', 'W'].includes(e.key)) flap(); });
      api.on(canvas, 'pointerdown', e => { e.preventDefault(); flap(); });

      function die() {
        if (state === 'dead') return;
        state = 'dead';
        api.beep(150, 0.25, 'sawtooth');
        if (bird.vy < 0) bird.vy = 0;
      }

      function update(dt) {
        if (state !== 'dead') {
          groundX = (groundX - SPEED * dt) % 24;
          clouds.forEach(c => { c.x -= SPEED * 0.2 * c.s * dt; if (c.x < -90) c.x = W + 40; });
        }
        if (state === 'ready') { bird.y = H / 2 - 40 + Math.sin(t * 5) * 8; return; }
        bird.vy += G * dt; bird.y += bird.vy * dt;
        if (state === 'play') {
          spawnT -= dt;
          if (spawnT <= 0) { spawnT = 1.45; pipes.push({ x: W + 30, top: 70 + Math.random() * (H - GROUND - GAP - 140), passed: false }); }
          for (const p of pipes) {
            p.x -= SPEED * dt;
            if (!p.passed && p.x + PW < bird.x) { p.passed = true; score++; api.setScore(score); api.beep(880, 0.06, 'square', 0.03); }
            if (bird.x + bird.r - 3 > p.x && bird.x - bird.r + 3 < p.x + PW && (bird.y - bird.r + 3 < p.top || bird.y + bird.r - 3 > p.top + GAP)) die();
          }
          pipes = pipes.filter(p => p.x > -PW - 10);
          if (bird.y - bird.r < 0) { bird.y = bird.r; bird.vy = 0; }
        }
        if (bird.y + bird.r >= H - GROUND) {
          bird.y = H - GROUND - bird.r;
          die();
          if (!shown) { shown = true; api.timeout(() => api.gameOver(`Pasaste <b>${score}</b> tubo${score === 1 ? '' : 's'}.`), 450); }
        }
      }

      function draw() {
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, '#4ec0ca'); sky.addColorStop(1, '#b7ecff');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        clouds.forEach(c => {
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, 34 * c.s, 14 * c.s, 0, 0, 7);
          ctx.ellipse(c.x + 22 * c.s, c.y - 8 * c.s, 22 * c.s, 14 * c.s, 0, 0, 7);
          ctx.fill();
        });
        pipes.forEach(p => {
          const body = (x, y, h) => {
            const g = ctx.createLinearGradient(x, 0, x + PW, 0);
            g.addColorStop(0, '#5fbf3a'); g.addColorStop(0.5, '#8fe25c'); g.addColorStop(1, '#3f8f23');
            ctx.fillStyle = g; ctx.fillRect(x, y, PW, h);
          };
          body(p.x, 0, p.top); body(p.x, p.top + GAP, H - GROUND - p.top - GAP);
          ctx.fillStyle = '#3f8f23';
          ctx.fillRect(p.x - 5, p.top - 24, PW + 10, 24); ctx.fillRect(p.x - 5, p.top + GAP, PW + 10, 24);
          ctx.fillStyle = 'rgba(255,255,255,.25)';
          ctx.fillRect(p.x, p.top - 22, 8, 20); ctx.fillRect(p.x, p.top + GAP + 2, 8, 20);
        });
        // Suelo
        ctx.fillStyle = '#ded895'; ctx.fillRect(0, H - GROUND, W, GROUND);
        ctx.fillStyle = '#73bf2e'; ctx.fillRect(0, H - GROUND, W, 14);
        ctx.fillStyle = '#5ea524';
        for (let x = groundX; x < W; x += 24) { ctx.beginPath(); ctx.moveTo(x, H - GROUND + 14); ctx.lineTo(x + 12, H - GROUND); ctx.lineTo(x + 24, H - GROUND); ctx.lineTo(x + 12, H - GROUND + 14); ctx.fill(); }
        // Pájaro
        ctx.save();
        ctx.translate(bird.x, bird.y);
        ctx.rotate(state === 'ready' ? 0 : clamp(bird.vy / 600, -0.5, 1.3));
        ctx.fillStyle = '#facc15'; ctx.beginPath(); ctx.arc(0, 0, bird.r, 0, 7); ctx.fill();
        ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.ellipse(-4, 4 + Math.sin(t * 22) * 3, 9, 5, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(6, -5, 6, 0, 7); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(8, -5, 2.6, 0, 7); ctx.fill();
        ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(10, 1); ctx.lineTo(22, 4); ctx.lineTo(10, 8); ctx.fill();
        ctx.restore();
        // Texto
        ctx.textAlign = 'center'; ctx.lineWidth = 6; ctx.strokeStyle = '#1f2937'; ctx.fillStyle = '#fff';
        if (state === 'ready') {
          ctx.font = "800 28px 'Outfit', sans-serif";
          ctx.strokeText('¡Prepárate!', W / 2, 170); ctx.fillText('¡Prepárate!', W / 2, 170);
          ctx.font = "600 18px 'Outfit', sans-serif";
          ctx.strokeText('Toca o pulsa Espacio', W / 2, 205); ctx.fillText('Toca o pulsa Espacio', W / 2, 205);
        } else {
          ctx.font = "800 54px 'Outfit', sans-serif";
          ctx.strokeText(score, W / 2, 80); ctx.fillText(score, W / 2, 80);
        }
        ctx.textAlign = 'left';
      }

      api.loop(dt => { t += dt; update(dt); draw(); });
    },
  });
})();
