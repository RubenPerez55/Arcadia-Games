(() => {
  Arcade.register({
    id: 'casino-mines',
    name: 'Minas VIP',
    emoji: '💎',
    cat: 'casino',
    best: 'high',
    unit: ' $',
    color: '#06b6d4',
    desc: 'Destapa diamantes para multiplicar tu apuesta y retírate (Cashout) antes de tocar una bomba.',
    controls: 'Elige apuesta y número de minas · destapa casillas · pulsa Retirar Ganancias cuando quieras',
    start(root, api) {
      const N = 25;
      let bank = 1000, bet = 50, minesCount = 3;
      let active = false, mines = new Set(), revealed = new Set(), hitMine = -1;
      let status = 'Configura tu apuesta y el número de minas para empezar.';
      let outcome = '';

      api.setScore(bank);

      function calcMultiplier(picks, m) {
        if (picks === 0) return 1;
        let prob = 1;
        for (let i = 0; i < picks; i++) {
          prob *= (N - m - i) / (N - i);
        }
        return Math.max(1.05, Math.round((0.97 / prob) * 100) / 100);
      }

      root.innerHTML = `<div class="cas-table cm">
        <div class="cas-top">
          <div class="cas-chip-stat"><span>Banca</span><b class="cm-bank">$1000</b></div>
          <div class="cas-status cm-msg"></div>
          <div class="cas-chip-stat"><span>Multiplicador</span><b class="cm-mult">×1.00</b></div>
        </div>

        <div class="cm-board">
          ${Array.from({ length: N }, (_, i) => `<button class="cm-cell" data-i="${i}"></button>`).join('')}
        </div>

        <div class="cas-controls">
          <div class="cas-chips">
            <span class="cas-lbl">Apuesta:</span>
            ${[25, 50, 100, 250].map(v => `<button class="chip-btn" data-b="${v}">$${v}</button>`).join('')}
            <span class="cas-lbl">Minas:</span>
            ${[1, 3, 5, 10].map(m => `<button class="chip-btn${m === minesCount ? ' on' : ''}" data-m="${m}">${m} 💣</button>`).join('')}
          </div>
          <button class="btn cas-main-btn cm-action">💎 Apostar ($50)</button>
        </div>
      </div>`;

      const bankEl = root.querySelector('.cm-bank');
      const multEl = root.querySelector('.cm-mult');
      const msgEl = root.querySelector('.cm-msg');
      const actionBtn = root.querySelector('.cm-action');
      const cells = [...root.querySelectorAll('.cm-cell')];

      function render(showAll = false) {
        const mult = calcMultiplier(revealed.size, minesCount);
        const cashoutVal = Math.round(bet * mult);
        bankEl.textContent = '$' + bank;
        multEl.textContent = '×' + mult.toFixed(2);
        msgEl.textContent = status;
        msgEl.className = 'cas-status cm-msg ' + outcome;

        cells.forEach((c, i) => {
          const isRev = revealed.has(i);
          const isMine = mines.has(i);
          c.disabled = !active || isRev;
          c.className = 'cm-cell' + (isRev ? ' gem' : '') + (showAll && isMine ? ' mine' : '') + (hitMine === i ? ' boom' : '');
          c.textContent = isRev ? '💎' : (showAll && isMine ? (hitMine === i ? '💥' : '💣') : '');
        });

        root.querySelectorAll('[data-b],[data-m]').forEach(b => { b.disabled = active; });
        if (!active) {
          actionBtn.textContent = `💎 Apostar ($${bet})`;
          actionBtn.disabled = false;
        } else {
          actionBtn.textContent = revealed.size > 0
            ? `💰 Retirar $${cashoutVal} (×${mult.toFixed(2)})`
            : 'Elige una casilla…';
          actionBtn.disabled = revealed.size === 0;
        }
      }

      function startRound() {
        if (bank <= 0) bank = 1000;
        bet = clamp(bet, 10, bank);
        bank -= bet;
        mines.clear();
        revealed.clear();
        hitMine = -1;
        while (mines.size < minesCount) mines.add(rnd(N));
        active = true;
        outcome = '';
        const nextM = calcMultiplier(1, minesCount);
        status = `Partida activa · Próximo diamante paga ×${nextM.toFixed(2)}`;
        api.beep(520, 0.04, 'triangle');
        render();
      }

      function cashout() {
        if (!active || revealed.size === 0) return;
        const mult = calcMultiplier(revealed.size, minesCount);
        const payout = Math.round(bet * mult);
        bank += payout;
        active = false;
        outcome = 'win';
        status = `🎉 ¡Retiraste $${payout} con multiplicador ×${mult.toFixed(2)}!`;
        [523, 659, 784, 1046].forEach((f, i) => api.timeout(() => api.beep(f, 0.1, 'triangle', 0.05), i * 85));
        api.setScore(bank);
        render(true);
      }

      function pickCell(i) {
        if (!active || revealed.has(i)) return;
        if (mines.has(i)) {
          hitMine = i;
          active = false;
          outcome = 'lose';
          status = '💥 ¡Explotó una mina! Perdiste la apuesta.';
          api.beep(140, 0.3, 'sawtooth');
          api.setScore(bank);
          render(true);
          if (bank <= 0) {
            api.timeout(() => {
              api.overlay('💸 Sin fichas', 'Te quedaste sin banca. Recargamos $1,000 gratis.', 'Recargar $1,000', () => {
                bank = 1000; bet = 50; outcome = ''; status = 'Banca recargada.';
                api.setScore(bank);
                render();
              });
            }, 600);
          }
          return;
        }

        revealed.add(i);
        api.beep(580 + revealed.size * 45, 0.05, 'triangle');
        if (revealed.size === N - minesCount) {
          cashout();
          return;
        }
        const nextM = calcMultiplier(revealed.size + 1, minesCount);
        status = `💎 ¡Diamante! Puedes retirar ahora o buscar ×${nextM.toFixed(2)}`;
        render();
      }

      cells.forEach((c, i) => c.addEventListener('click', () => pickCell(i)));
      actionBtn.onclick = () => { if (active) cashout(); else startRound(); };

      root.querySelectorAll('[data-b]').forEach(b => {
        b.onclick = () => {
          if (active) return;
          bet = Math.min(+b.dataset.b, Math.max(10, bank));
          api.beep(650, 0.02);
          render();
        };
      });
      root.querySelectorAll('[data-m]').forEach(b => {
        b.onclick = () => {
          if (active) return;
          minesCount = +b.dataset.m;
          root.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b));
          api.beep(600, 0.02);
          render();
        };
      });

      render();
    },
  });
})();
