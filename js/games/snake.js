(() => {
  Arcade.register({
    id: 'snake', name: 'Snake', emoji: '🐍', cat: 'arcade', best: 'high', color: '#22c55e',
    desc: 'Come manzanas, crece y no choques contra ti mismo ni las paredes.',
    controls: 'Flechas / WASD · desliza en móvil',
    start(root, api) {
      const N = 20, S = 24;
      const { canvas, ctx } = api.canvas(N * S, N * S);
      let snake = [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 6, y: 10 }];
      let dir = { x: 1, y: 0 }, queue = [], food = null;
      let score = 0, running = false, dead = false, acc = 0, speed = 0.12;

      const place = () => { do { food = { x: rnd(N), y: rnd(N) }; } while (snake.some(s => s.x === food.x && s.y === food.y)); };
      place();

      const begin = () => { if (running || dead) return; running = true; api.hideOverlay(); };
      const turn = (x, y) => {
        const last = queue.length ? queue[queue.length - 1] : dir;
        if (!((last.x === -x && last.y === -y) || (last.x === x && last.y === y)) && queue.length < 3) queue.push({ x, y });
        begin();
      };
      const KEYS = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] };
      api.on(window, 'keydown', e => { const k = KEYS[e.key.toLowerCase()]; if (k) turn(k[0], k[1]); });
      api.swipe(canvas, d => { const m = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d]; if (m) turn(m[0], m[1]); });

      function step() {
        if (queue.length) dir = queue.shift();
        const h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
        const eat = h.x === food.x && h.y === food.y;
        const body = eat ? snake : snake.slice(0, -1);
        if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || body.some(s => s.x === h.x && s.y === h.y)) {
          dead = true; running = false;
          api.gameOver(`Comiste ${score} manzana${score === 1 ? '' : 's'}.`);
          return;
        }
        snake.unshift(h);
        if (eat) {
          score++; api.setScore(score); api.beep(660, 0.06);
          speed = Math.max(0.055, speed * 0.97);
          place();
        } else snake.pop();
      }

      function draw() {
        for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
          ctx.fillStyle = (x + y) % 2 ? '#1b2a1f' : '#1f3124';
          ctx.fillRect(x * S, y * S, S, S);
        }
        ctx.fillStyle = '#ff4d6d';
        ctx.beginPath(); ctx.arc(food.x * S + S / 2, food.y * S + S / 2 + 1, S * 0.38, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4ade80'; ctx.fillRect(food.x * S + S / 2 - 1, food.y * S + 2, 3, 6);

        snake.forEach((s, i) => {
          const t = i / snake.length;
          ctx.fillStyle = `hsl(${140 - t * 40} 75% ${55 - t * 20}%)`;
          ctx.beginPath(); ctx.roundRect(s.x * S + 1, s.y * S + 1, S - 2, S - 2, 6); ctx.fill();
        });
        const h = snake[0];
        ctx.fillStyle = '#0b0f1a';
        const off = dir.x !== 0 ? [[0, -5], [0, 5]] : [[-5, 0], [5, 0]];
        off.forEach(([ox, oy]) => {
          ctx.beginPath(); ctx.arc(h.x * S + S / 2 + dir.x * 4 + ox, h.y * S + S / 2 + dir.y * 4 + oy, 2.6, 0, 7); ctx.fill();
        });
      }

      api.loop(dt => {
        if (running) { acc += dt; while (acc >= speed && running) { acc -= speed; step(); } }
        draw();
      });
      api.overlay('🐍 Snake', 'Presiona una flecha para empezar.', 'Jugar', begin);
    },
  });
})();
