(() => {
  const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const sum = d => d.reduce((a, b) => a + b, 0);
  const kind = n => (d, c) => { for (let v = 6; v > 0; v--) if (c[v] >= n) return v * n; return 0; };
  const CATS = [
    ...['Unos', 'Doses', 'Treses', 'Cuatros', 'Cincos', 'Seises'].map((n, i) => ({ k: 'u' + (i + 1), n, up: true, f: (d, c) => c[i + 1] * (i + 1) })),
    { k: 'pair', n: 'Un par', f: kind(2) },
    { k: 'pairs', n: 'Dos pares', f: (d, c) => { const p = []; for (let v = 6; v > 0; v--) if (c[v] >= 2) p.push(v); return p.length >= 2 ? (p[0] + p[1]) * 2 : 0; } },
    { k: 'three', n: 'Tercia', f: kind(3) },
    { k: 'four', n: 'Póker', hint: 'Cuatro iguales', f: kind(4) },
    { k: 'small', n: 'Escalera menor', hint: '1-2-3-4-5 = 15', f: (d, c) => [1, 2, 3, 4, 5].every(v => c[v] === 1) ? 15 : 0 },
    { k: 'large', n: 'Escalera mayor', hint: '2-3-4-5-6 = 20', f: (d, c) => [2, 3, 4, 5, 6].every(v => c[v] === 1) ? 20 : 0 },
    { k: 'full', n: 'Full', hint: 'Tercia + par', f: (d, c) => c.indexOf(3) > 0 && c.indexOf(2) > 0 ? sum(d) : 0 },
    { k: 'chance', n: 'Libre', hint: 'Suma de todo', f: d => sum(d) },
    { k: 'yatzy', n: 'YATZY', hint: '5 iguales = 50', f: (d, c) => c.includes(5) ? 50 : 0 },
  ];

  Arcade.register({
    id: 'yatzy', name: 'Yatzy', emoji: '🎲', cat: 'mesa', best: 'high', color: '#ec4899',
    desc: 'Lanza 5 dados hasta 3 veces por turno y completa tu tarjeta de puntos.',
    controls: 'Espacio: lanzar · clic o teclas 1-5 para apartar dados · clic en una categoría para anotar',
    start(root, api) {
      const scores = {};
      let dice = [1, 2, 3, 4, 5], held = Array(5).fill(false), rolls = 0, rolling = false, done = false;

      root.innerHTML = `<div class="yz">
        <div class="yz-play">
          <div class="yz-dice">${dice.map((_, i) => `<button class="die" data-i="${i}"></button>`).join('')}</div>
          <p class="yz-hint"></p>
          <button class="btn yz-roll">🎲 Lanzar dados</button>
          <div class="yz-rolls"></div>
        </div>
        <table class="yz-card"><tbody></tbody></table>
      </div>`;
      const diceEls = [...root.querySelectorAll('.die')], tbody = root.querySelector('tbody');
      const rollBtn = root.querySelector('.yz-roll'), hint = root.querySelector('.yz-hint'), rollsEl = root.querySelector('.yz-rolls');

      const counts = () => { const c = Array(7).fill(0); dice.forEach(v => c[v]++); return c; };
      const upperSum = () => CATS.filter(c => c.up && c.k in scores).reduce((a, c) => a + scores[c.k], 0);
      const total = () => Object.values(scores).reduce((a, b) => a + b, 0) + (upperSum() >= 63 ? 50 : 0);

      function renderDice() {
        diceEls.forEach((el, i) => {
          el.className = 'die' + (held[i] ? ' held' : '') + (rolls === 0 && !rolling ? ' idle' : '') + (rolling && !held[i] ? ' rolling' : '');
          el.innerHTML = `<div class="pips">${[...Array(9)].map((_, k) => `<span class="${PIPS[dice[i]].includes(k) ? 'on' : ''}"></span>`).join('')}</div>`;
        });
      }
      function render() {
        renderDice();
        rollBtn.disabled = rolls >= 3 || done || rolling;
        rollsEl.innerHTML = [0, 1, 2].map(i => `<span class="${i < rolls ? 'used' : ''}"></span>`).join('') + `<small>${3 - rolls} tiro${3 - rolls === 1 ? '' : 's'} restante${3 - rolls === 1 ? '' : 's'}</small>`;
        hint.textContent = done ? '¡Partida terminada!' : rolls === 0 ? 'Lanza los dados para empezar tu turno'
          : rolls < 3 ? 'Aparta dados con clic o elige una categoría' : 'Elige una categoría para anotar';
        const c = counts(), up = upperSum();
        tbody.innerHTML = CATS.map((cat, idx) => {
          const used = cat.k in scores;
          const pot = rolls > 0 && !used && !rolling ? cat.f(dice, c) : null;
          const val = used ? scores[cat.k] : pot !== null ? `<span class="pot${pot ? '' : ' zero'}">${pot}</span>` : '';
          const summary = idx === 6 ? `<tr class="sum"><td>Subtotal superior</td><td>${up} / 63</td></tr><tr class="sum"><td>Bono (≥ 63)</td><td>${up >= 63 ? '+50' : '—'}</td></tr>` : '';
          return summary + `<tr class="${used ? 'used' : pot !== null ? 'avail' : ''}" data-k="${cat.k}"><td>${cat.n}${cat.hint ? `<small>${cat.hint}</small>` : ''}</td><td>${val}</td></tr>`;
        }).join('') + `<tr class="total"><td>TOTAL</td><td>${total()}</td></tr>`;
      }
      function roll() {
        if (rolls >= 3 || rolling || done) return;
        rolling = true; rolls++;
        let n = 0;
        const stop = api.interval(() => {
          dice = dice.map((v, i) => held[i] ? v : 1 + rnd(6));
          renderDice();
          api.beep(300 + rnd(300), 0.02, 'square', 0.02);
          if (++n >= 7) { stop(); rolling = false; render(); }
        }, 60);
        render();
      }
      function toggle(i) {
        if (rolls === 0 || rolls >= 3 || rolling || done) return;
        held[i] = !held[i]; api.beep(held[i] ? 600 : 450, 0.03, 'triangle'); renderDice();
      }
      function choose(k) {
        if (rolls === 0 || rolling || done || k in scores) return;
        const cat = CATS.find(c => c.k === k);
        scores[k] = cat.f(dice, counts());
        api.beep(scores[k] ? 780 : 260, 0.08, 'triangle');
        rolls = 0; held = Array(5).fill(false);
        api.setScore(total());
        if (CATS.every(c => c.k in scores)) {
          done = true; render();
          const t = total();
          api.timeout(() => api.overlay('Partida terminada 🎲', `Puntuación final: <b>${t}</b>${scores.yatzy ? '<br>¡Lograste un YATZY!' : ''}`, 'Jugar de nuevo', api.restart), 500);
          return;
        }
        render();
      }

      rollBtn.onclick = roll;
      diceEls.forEach((el, i) => el.onclick = () => toggle(i));
      tbody.addEventListener('click', e => { const tr = e.target.closest('tr.avail'); if (tr) choose(tr.dataset.k); });
      api.on(window, 'keydown', e => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); roll(); }
        const n = '12345'.indexOf(e.key); if (n >= 0) toggle(n);
      });
      render();
    },
  });
})();
