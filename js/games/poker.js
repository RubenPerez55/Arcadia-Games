(() => {
  const SUITS = ['♠', '♥', '♦', '♣'];
  const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const isRed = s => s === '♥' || s === '♦';

  const PAYTABLE = [
    { id: 'royal', name: 'Escalera Real', mult: 250 },
    { id: 'sflush', name: 'Escalera de Color', mult: 50 },
    { id: 'four', name: 'Póker (4 iguales)', mult: 25 },
    { id: 'full', name: 'Full House', mult: 9 },
    { id: 'flush', name: 'Color (Flush)', mult: 6 },
    { id: 'straight', name: 'Escalera', mult: 4 },
    { id: 'three', name: 'Tercia', mult: 3 },
    { id: 'twopair', name: 'Doble Par', mult: 2 },
    { id: 'jacks', name: 'Par de J, Q, K o A', mult: 1 },
  ];

  function makeDeck() {
    const d = [];
    for (const s of SUITS) RANKS.forEach((r, v) => d.push({ s, r, v: v + 2 }));
    return shuffle(d);
  }

  function evaluateHand(hand) {
    const vals = hand.map(c => c.v).sort((a, b) => a - b);
    const suits = hand.map(c => c.s);
    const flush = suits.every(s => s === suits[0]);

    const wheel = vals.join(',') === '2,3,4,5,14';
    const seq = vals.every((v, i) => i === 0 || v === vals[i - 1] + 1);
    const straight = wheel || seq;

    const counts = {};
    vals.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
    const freq = Object.entries(counts)
      .map(([v, c]) => ({ v: +v, c }))
      .sort((a, b) => b.c - a.c || b.v - a.v);

    if (flush && straight && vals[0] === 10) return PAYTABLE[0];
    if (flush && straight) return PAYTABLE[1];
    if (freq[0].c === 4) return PAYTABLE[2];
    if (freq[0].c === 3 && freq[1].c === 2) return PAYTABLE[3];
    if (flush) return PAYTABLE[4];
    if (straight) return PAYTABLE[5];
    if (freq[0].c === 3) return PAYTABLE[6];
    if (freq[0].c === 2 && freq[1].c === 2) return PAYTABLE[7];
    if (freq[0].c === 2 && freq[0].v >= 11) return PAYTABLE[8];
    return null;
  }

  Arcade.register({
    id: 'poker',
    name: 'Video Póker',
    emoji: '🃏',
    cat: 'casino',
    best: 'high',
    unit: ' $',
    color: '#ef4444',
    desc: 'Póker de 5 cartas (Jacks or Better): retén tus mejores cartas, cambia el resto y multiplica tu apuesta hasta ×250.',
    controls: 'Clic en las cartas o teclas 1-5 para RETENER (HOLD) · Espacio para Repartir / Cambiar',
    start(root, api) {
      let bank = 1000, bet = 25;
      let deck = [], hand = [], held = [false, false, false, false, false];
      let phase = 'deal'; // 'deal' | 'draw'
      let activeWin = null;
      let status = 'Ajusta tu apuesta y pulsa Repartir.';

      api.setScore(bank);

      root.innerHTML = `<div class="cas-table pk">
        <div class="cas-top">
          <div class="cas-chip-stat"><span>Banca</span><b class="pk-bank">$1000</b></div>
          <div class="cas-status pk-msg"></div>
          <div class="cas-chip-stat"><span>Apuesta</span><b class="pk-bet">$25</b></div>
        </div>

        <div class="pk-paytable">
          ${PAYTABLE.map(p => `<div class="pk-row" data-id="${p.id}">
            <span>${p.name}</span>
            <b>×${p.mult} <small>($${p.mult * bet})</small></b>
          </div>`).join('')}
        </div>

        <div class="pk-hand">
          ${[0, 1, 2, 3, 4].map(i => `<button class="pk-slot" data-i="${i}"></button>`).join('')}
        </div>

        <div class="cas-controls">
          <div class="cas-chips pk-chips">
            ${[10, 25, 50, 100].map(v => `<button class="chip-btn" data-bet="${v}">$${v}</button>`).join('')}
            <button class="chip-btn gold" data-bet="max">Apuesta Máx ($250)</button>
          </div>
          <button class="btn cas-main-btn pk-action">🃏 Repartir</button>
        </div>
      </div>`;

      const bankEl = root.querySelector('.pk-bank');
      const betEl = root.querySelector('.pk-bet');
      const msgEl = root.querySelector('.pk-msg');
      const slots = [...root.querySelectorAll('.pk-slot')];
      const actionBtn = root.querySelector('.pk-action');
      const rows = [...root.querySelectorAll('.pk-row')];

      function render() {
        bankEl.textContent = '$' + bank;
        betEl.textContent = '$' + bet;
        msgEl.textContent = status;
        msgEl.className = 'cas-status pk-msg ' + (activeWin ? 'win' : '');

        rows.forEach(r => {
          const p = PAYTABLE.find(x => x.id === r.dataset.id);
          r.classList.toggle('hit', activeWin && activeWin.id === p.id);
          r.querySelector('b').innerHTML = `×${p.mult} <small>($${p.mult * bet})</small>`;
        });

        slots.forEach((el, i) => {
          const c = hand[i];
          if (!c) {
            el.className = 'pk-slot is-empty';
            el.innerHTML = `<div class="cas-card back"></div>`;
            return;
          }
          el.className = 'pk-slot' + (held[i] ? ' held' : '');
          el.innerHTML = `
            <span class="pk-hold-tag">${held[i] ? 'RETENIDA' : 'CLIC PARA RETENER'}</span>
            <div class="cas-card ${isRed(c.s) ? 'red' : 'black'}">
              <span class="tl">${c.r}<br>${c.s}</span>
              <span class="mid">${c.s}</span>
              <span class="br">${c.r}<br>${c.s}</span>
            </div>
          `;
        });

        actionBtn.textContent = phase === 'deal' ? '🃏 Repartir' : '🔄 Cambiar cartas';
        root.querySelectorAll('[data-bet]').forEach(b => { b.disabled = phase === 'draw'; });
      }

      function toggleHold(i) {
        if (phase !== 'draw') return;
        held[i] = !held[i];
        api.beep(held[i] ? 640 : 420, 0.03, 'triangle');
        render();
      }

      function step() {
        if (phase === 'deal') {
          if (bank <= 0) bank = 1000;
          bet = clamp(bet, 10, bank);
          bank -= bet;
          deck = makeDeck();
          hand = [deck.pop(), deck.pop(), deck.pop(), deck.pop(), deck.pop()];
          held = [false, false, false, false, false];
          phase = 'draw';
          activeWin = evaluateHand(hand);
          status = activeWin
            ? `Tienes ${activeWin.name} — selecciona las cartas a retener y pulsa Cambiar.`
            : 'Selecciona las cartas que quieras conservar (HOLD) y pulsa Cambiar.';
          api.beep(520, 0.05, 'triangle');
          render();
        } else {
          hand = hand.map((c, i) => held[i] ? c : deck.pop());
          phase = 'deal';
          activeWin = evaluateHand(hand);
          if (activeWin) {
            const winAmt = bet * activeWin.mult;
            bank += winAmt;
            status = `🎉 ¡${activeWin.name}! Ganas $${winAmt} (×${activeWin.mult})`;
            [523, 659, 784, 1046].forEach((f, i) => api.timeout(() => api.beep(f, 0.1, 'triangle', 0.05), i * 85));
          } else {
            status = 'Sin combinación ganadora. ¡Intenta otra mano!';
            api.beep(200, 0.15, 'sawtooth');
          }
          api.setScore(bank);
          if (bank <= 0) {
            api.timeout(() => {
              api.overlay('💸 Sin fichas', 'Te quedaste sin banca. Recargamos $1,000 para que sigas jugando.', 'Recargar $1,000', () => {
                bank = 1000; bet = 25; hand = []; activeWin = null;
                status = 'Banca recargada. ¡Elige tu apuesta!';
                api.setScore(bank);
                render();
              });
            }, 500);
          }
          render();
        }
      }

      slots.forEach((el, i) => el.addEventListener('click', () => toggleHold(i)));
      actionBtn.onclick = step;
      root.querySelectorAll('[data-bet]').forEach(b => {
        b.onclick = () => {
          if (phase !== 'deal') return;
          const v = b.dataset.bet;
          bet = v === 'max' ? Math.min(250, bank) : Math.min(+v, bank);
          api.beep(700, 0.02);
          render();
        };
      });

      api.on(window, 'keydown', e => {
        if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); step(); }
        const idx = '12345'.indexOf(e.key);
        if (idx >= 0) toggleHold(idx);
      });

      render();
    },
  });
})();
