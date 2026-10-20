(() => {
  // Orden oficial de cilindro europeo
  const WHEEL = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10,
    5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
  ];
  const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const numColor = n => n === 0 ? 'green' : REDS.has(n) ? 'red' : 'black';

  function pays(betKey, n) {
    if (betKey.startsWith('n:')) return +betKey.slice(2) === n ? 36 : 0; // 35:1 + apuesta
    if (n === 0) return 0;
    switch (betKey) {
      case 'red': return REDS.has(n) ? 2 : 0;
      case 'black': return !REDS.has(n) ? 2 : 0;
      case 'even': return n % 2 === 0 ? 2 : 0;
      case 'odd': return n % 2 === 1 ? 2 : 0;
      case 'low': return n <= 18 ? 2 : 0;
      case 'high': return n >= 19 ? 2 : 0;
      case 'd1': return n <= 12 ? 3 : 0;
      case 'd2': return n >= 13 && n <= 24 ? 3 : 0;
      case 'd3': return n >= 25 ? 3 : 0;
      default: return 0;
    }
  }

  Arcade.register({
    id: 'ruleta',
    name: 'Ruleta Europea',
    emoji: '🎡',
    cat: 'casino',
    best: 'high',
    unit: ' $',
    color: '#e11d48',
    desc: 'Coloca tus fichas en plenos (35:1), docenas (2:1) o rojo/negro (1:1) y gira la rueda.',
    controls: 'Selecciona valor de ficha · haz clic en el tapete para apostar · pulsa Girar Ruleta',
    start(root, api) {
      let bank = 1000, chip = 25;
      let bets = {};
      let spinning = false;
      let wheelAngle = 0, ballAngle = 0;
      let history = [];
      let status = 'Selecciona una ficha y haz clic en el tapete para apostar.';
      let outcome = '';

      api.setScore(bank);

      root.innerHTML = `<div class="cas-table rl">
        <div class="cas-top">
          <div class="cas-chip-stat"><span>Banca</span><b class="rl-bank">$1000</b></div>
          <div class="cas-status rl-msg"></div>
          <div class="cas-chip-stat"><span>Apuesta Total</span><b class="rl-total">$0</b></div>
        </div>

        <div class="rl-main">
          <div class="rl-wheel-box">
            <canvas class="rl-canvas" width="220" height="220"></canvas>
            <div class="rl-history"></div>
          </div>

          <div class="rl-felt">
            <div class="rl-numbers">
              <button class="rl-spot zero" data-bet="n:0"><span>0</span></button>
              <div class="rl-grid">
                ${Array.from({ length: 36 }, (_, i) => {
                  const n = i + 1;
                  return `<button class="rl-spot ${numColor(n)}" data-bet="n:${n}"><span>${n}</span></button>`;
                }).join('')}
              </div>
            </div>
            <div class="rl-dozens">
              <button class="rl-spot out" data-bet="d1"><span>1ª Docena (1-12) · 2:1</span></button>
              <button class="rl-spot out" data-bet="d2"><span>2ª Docena (13-24) · 2:1</span></button>
              <button class="rl-spot out" data-bet="d3"><span>3ª Docena (25-36) · 2:1</span></button>
            </div>
            <div class="rl-outside">
              <button class="rl-spot out" data-bet="low"><span>1 - 18</span></button>
              <button class="rl-spot out" data-bet="even"><span>PAR</span></button>
              <button class="rl-spot out red" data-bet="red"><span>♦ ROJO</span></button>
              <button class="rl-spot out black" data-bet="black"><span>♠ NEGRO</span></button>
              <button class="rl-spot out" data-bet="odd"><span>IMPAR</span></button>
              <button class="rl-spot out" data-bet="high"><span>19 - 36</span></button>
            </div>
          </div>
        </div>

        <div class="cas-controls">
          <div class="cas-chips">
            ${[10, 25, 100, 250].map(v => `<button class="chip-btn${v === chip ? ' on' : ''}" data-c="${v}">$${v}</button>`).join('')}
            <button class="chip-btn ghost" id="rl-clear">Limpiar mesa</button>
          </div>
          <button class="btn cas-main-btn" id="rl-spin">🎡 Girar Ruleta</button>
        </div>
      </div>`;

      const canvas = root.querySelector('.rl-canvas');
      const ctx = canvas.getContext('2d');
      const bankEl = root.querySelector('.rl-bank');
      const totalEl = root.querySelector('.rl-total');
      const msgEl = root.querySelector('.rl-msg');
      const histEl = root.querySelector('.rl-history');
      const spinBtn = root.querySelector('#rl-spin');
      const spots = [...root.querySelectorAll('.rl-spot')];

      const totalBet = () => Object.values(bets).reduce((a, b) => a + b, 0);

      function drawWheel(highlightNum = null) {
        const W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2, R = 98;
        ctx.clearRect(0, 0, W, H);
        const slice = (Math.PI * 2) / WHEEL.length;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(wheelAngle);

        WHEEL.forEach((n, i) => {
          const a0 = i * slice - Math.PI / 2 - slice / 2;
          const a1 = a0 + slice;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, R, a0, a1);
          ctx.closePath();
          const col = numColor(n);
          ctx.fillStyle = col === 'green' ? '#16a34a' : col === 'red' ? '#dc2626' : '#1e293b';
          ctx.fill();
          ctx.strokeStyle = highlightNum === n ? '#facc15' : 'rgba(255,255,255,0.22)';
          ctx.lineWidth = highlightNum === n ? 2.5 : 1;
          ctx.stroke();

          ctx.save();
          ctx.rotate(a0 + slice / 2);
          ctx.fillStyle = '#fff';
          ctx.font = "bold 9px 'Outfit', sans-serif";
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(n, R - 13, 0);
          ctx.restore();
        });

        ctx.beginPath();
        ctx.arc(0, 0, 52, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();

        // Bola
        const bx = cx + Math.cos(ballAngle - Math.PI / 2) * 72;
        const by = cy + Math.sin(ballAngle - Math.PI / 2) * 72;
        ctx.beginPath();
        ctx.arc(bx, by, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (highlightNum !== null) {
          ctx.fillStyle = '#fff';
          ctx.font = "800 26px 'Outfit', sans-serif";
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(highlightNum, cx, cy);
        }
      }

      function render(winNum = null) {
        bankEl.textContent = '$' + bank;
        totalEl.textContent = '$' + totalBet();
        msgEl.textContent = status;
        msgEl.className = 'cas-status rl-msg ' + outcome;

        spots.forEach(s => {
          const k = s.dataset.bet;
          const amt = bets[k] || 0;
          const badge = s.querySelector('.rl-chip');
          if (amt > 0) {
            if (badge) badge.textContent = '$' + amt;
            else s.insertAdjacentHTML('beforeend', `<b class="rl-chip">$${amt}</b>`);
          } else if (badge) badge.remove();
          s.classList.toggle('winner', winNum !== null && pays(k, winNum) > 0);
        });

        histEl.innerHTML = history.slice(0, 8).map(n => `<span class="rl-pill ${numColor(n)}">${n}</span>`).join('');
        spinBtn.disabled = spinning || totalBet() === 0;
        drawWheel(winNum);
      }

      spots.forEach(s => {
        s.onclick = () => {
          if (spinning) return;
          if (bank < chip) {
            status = 'No tienes suficientes fichas para esa apuesta.';
            outcome = 'lose';
            render();
            return;
          }
          const k = s.dataset.bet;
          bets[k] = (bets[k] || 0) + chip;
          bank -= chip;
          outcome = '';
          status = `Apostaste $${bets[k]} en ${s.textContent.trim().split(' ')[0]}.`;
          api.beep(660, 0.03, 'triangle');
          render();
        };
      });

      root.querySelectorAll('[data-c]').forEach(b => {
        b.onclick = () => {
          chip = +b.dataset.c;
          root.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('on', x === b));
          api.beep(520, 0.02);
        };
      });

      root.querySelector('#rl-clear').onclick = () => {
        if (spinning) return;
        bank += totalBet();
        bets = {};
        outcome = '';
        status = 'Apuestas retiradas.';
        render();
      };

      spinBtn.onclick = () => {
        if (spinning || totalBet() === 0) return;
        spinning = true;
        outcome = '';
        status = '¡No va más! Girando la ruleta…';
        render();

        const winIdx = rnd(WHEEL.length);
        const winNum = WHEEL[winIdx];
        const slice = (Math.PI * 2) / WHEEL.length;
        const startWheel = wheelAngle;
        const targetWheel = startWheel + Math.PI * 6 + Math.random() * Math.PI * 2;
        const finalBall = targetWheel + winIdx * slice;
        const startBall = ballAngle + Math.PI * 14;
        const dur = 2.6;
        let elapsed = 0, lastTick = 0;

        const stopLoop = api.loop(dt => {
          elapsed += dt;
          const t = Math.min(1, elapsed / dur);
          const ease = 1 - Math.pow(1 - t, 3);
          wheelAngle = startWheel + (targetWheel - startWheel) * ease;
          ballAngle = startBall + (finalBall - startBall) * ease;
          if (elapsed - lastTick > 0.09 + t * 0.18) {
            lastTick = elapsed;
            api.beep(480 - t * 180, 0.015, 'triangle', 0.025);
          }
          drawWheel(t >= 1 ? winNum : null);

          if (t >= 1) {
            stopLoop();
            spinning = false;
            history.unshift(winNum);
            let payout = 0;
            for (const [k, amt] of Object.entries(bets)) payout += amt * pays(k, winNum);
            bank += payout;
            const colLabel = numColor(winNum) === 'green' ? 'Verde' : numColor(winNum) === 'red' ? 'Rojo' : 'Negro';
            if (payout > 0) {
              outcome = 'win';
              status = `🎉 Salió el ${winNum} (${colLabel}) · ¡Cobras $${payout}!`;
              [523, 659, 784, 1046].forEach((f, i) => api.timeout(() => api.beep(f, 0.1, 'triangle', 0.05), i * 85));
            } else {
              outcome = 'lose';
              status = `Salió el ${winNum} (${colLabel}). Sin premio esta ronda.`;
              api.beep(190, 0.2, 'sawtooth');
            }
            bets = {};
            api.setScore(bank);
            if (bank <= 0) {
              api.timeout(() => {
                api.overlay('💸 Sin fichas', 'Te quedaste sin banca. Te damos $1,000 nuevos para continuar.', 'Recargar $1,000', () => {
                  bank = 1000; outcome = ''; status = 'Banca recargada. ¡Hagan juego!';
                  api.setScore(bank);
                  render();
                });
              }, 600);
            }
            render(winNum);
          }
        });
      };

      render();
    },
  });
})();
