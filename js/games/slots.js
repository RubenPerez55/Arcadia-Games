(() => {
  const SYMBOLS = [
    { icon: '7️⃣', name: 'Triple 7', mult: 50, weight: 1 },
    { icon: '💎', name: 'Diamantes', mult: 25, weight: 2 },
    { icon: '🔔', name: 'Campanas', mult: 12, weight: 3 },
    { icon: '🍀', name: 'Tréboles', mult: 8, weight: 4 },
    { icon: '🍒', name: 'Cerezas', mult: 5, weight: 6 },
    { icon: '🍋', name: 'Limones', mult: 3, weight: 7 },
  ];

  const POOL = [];
  SYMBOLS.forEach(s => { for (let i = 0; i < s.weight; i++) POOL.push(s); });

  const LINES = [
    [[0, 0], [1, 0], [2, 0]], // Fila superior
    [[0, 1], [1, 1], [2, 1]], // Fila central
    [[0, 2], [1, 2], [2, 2]], // Fila inferior
    [[0, 0], [1, 1], [2, 2]], // Diagonal ↘
    [[0, 2], [1, 1], [2, 0]], // Diagonal ↗
  ];

  Arcade.register({
    id: 'slots',
    name: 'Slots 777',
    emoji: '🎰',
    cat: 'casino',
    best: 'high',
    unit: ' $',
    color: '#f59e0b',
    desc: 'Tragamonedas de 3×3 con 5 líneas de pago activas (horizontales y diagonales) y gran bote 777.',
    controls: 'Elige tu apuesta por giro · pulsa Girar o Espacio',
    start(root, api) {
      let bank = 1000, bet = 25, spinning = false;
      let grid = [
        [pick(POOL), pick(POOL), pick(POOL)],
        [pick(POOL), pick(POOL), pick(POOL)],
        [pick(POOL), pick(POOL), pick(POOL)],
      ];
      let winCoords = new Set();
      let status = '5 líneas activas (3 filas + 2 diagonales). ¡Tira de la palanca!';
      let outcome = '';

      api.setScore(bank);

      root.innerHTML = `<div class="cas-table sl">
        <div class="cas-top">
          <div class="cas-chip-stat"><span>Banca</span><b class="sl-bank">$1000</b></div>
          <div class="cas-status sl-msg"></div>
          <div class="cas-chip-stat"><span>Apuesta</span><b class="sl-bet">$25</b></div>
        </div>

        <div class="sl-machine">
          <div class="sl-reels">
            ${[0, 1, 2].map(c => `<div class="sl-col" data-c="${c}">
              ${[0, 1, 2].map(r => `<div class="sl-cell" data-pos="${c}-${r}"></div>`).join('')}
            </div>`).join('')}
          </div>
          <div class="sl-pay">
            ${SYMBOLS.map(s => `<div class="sl-pay-item"><span>${s.icon}${s.icon}${s.icon}</span><b>×${s.mult}</b></div>`).join('')}
            <div class="sl-pay-item"><span>🍒🍒 Cualq.</span><b>×1</b></div>
          </div>
        </div>

        <div class="cas-controls">
          <div class="cas-chips">
            ${[10, 25, 50, 100, 250].map(v => `<button class="chip-btn" data-b="${v}">$${v}</button>`).join('')}
          </div>
          <button class="btn cas-main-btn sl-spin">🎰 GIRAR</button>
        </div>
      </div>`;

      const bankEl = root.querySelector('.sl-bank');
      const betEl = root.querySelector('.sl-bet');
      const msgEl = root.querySelector('.sl-msg');
      const spinBtn = root.querySelector('.sl-spin');
      const cols = [...root.querySelectorAll('.sl-col')];

      function render() {
        bankEl.textContent = '$' + bank;
        betEl.textContent = '$' + bet;
        msgEl.textContent = status;
        msgEl.className = 'cas-status sl-msg ' + outcome;

        for (let c = 0; c < 3; c++) {
          for (let r = 0; r < 3; r++) {
            const el = root.querySelector(`[data-pos="${c}-${r}"]`);
            el.textContent = grid[c][r].icon;
            el.classList.toggle('win', winCoords.has(`${c}-${r}`));
          }
        }
        spinBtn.disabled = spinning;
      }

      function spin() {
        if (spinning) return;
        if (bank <= 0) bank = 1000;
        bet = clamp(bet, 10, bank);
        bank -= bet;
        spinning = true;
        winCoords.clear();
        outcome = '';
        status = 'Girando rodillos…';
        cols.forEach(c => c.classList.add('spinning'));
        render();

        let ticks = 0;
        const stopInt = api.interval(() => {
          ticks++;
          for (let c = 0; c < 3; c++) {
            if (ticks < (c + 1) * 6) {
              grid[c] = [pick(POOL), pick(POOL), pick(POOL)];
            } else {
              cols[c].classList.remove('spinning');
            }
          }
          api.beep(320 + (ticks % 5) * 60, 0.025, 'square', 0.025);
          render();

          if (ticks >= 18) {
            stopInt();
            cols.forEach(c => c.classList.remove('spinning'));
            spinning = false;
            evaluate();
          }
        }, 65);
      }

      function evaluate() {
        let totalMult = 0;
        const hits = [];

        for (const line of LINES) {
          const [a, b, c] = line.map(([col, row]) => grid[col][row]);
          if (a.icon === b.icon && b.icon === c.icon) {
            totalMult += a.mult;
            hits.push(a.name);
            line.forEach(([col, row]) => winCoords.add(`${col}-${row}`));
          } else if (a.icon === '🍒' && b.icon === '🍒') {
            totalMult += 1;
            hits.push('Par de Cerezas');
            winCoords.add(`${line[0][0]}-${line[0][1]}`);
            winCoords.add(`${line[1][0]}-${line[1][1]}`);
          }
        }

        if (totalMult > 0) {
          const prize = bet * totalMult;
          bank += prize;
          outcome = 'win';
          status = `🎉 ¡${hits.join(' + ')}! Ganas $${prize} (×${totalMult})`;
          [523, 659, 784, 1046].forEach((f, i) => api.timeout(() => api.beep(f, 0.11, 'triangle', 0.05), i * 85));
        } else {
          outcome = '';
          status = 'Sin línea ganadora. ¡Prueba otro giro!';
        }

        api.setScore(bank);
        if (bank <= 0) {
          api.timeout(() => {
            api.overlay('💸 Sin fichas', 'Te quedaste sin banca. Recargamos $1,000 gratis.', 'Recargar $1,000', () => {
              bank = 1000; bet = 25; status = 'Banca recargada. ¡Buena suerte!';
              api.setScore(bank);
              render();
            });
          }, 500);
        }
        render();
      }

      spinBtn.onclick = spin;
      root.querySelectorAll('[data-b]').forEach(b => {
        b.onclick = () => {
          if (spinning) return;
          bet = Math.min(+b.dataset.b, bank);
          api.beep(650, 0.02);
          render();
        };
      });
      api.on(window, 'keydown', e => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); spin(); }
      });

      render();
    },
  });
})();
