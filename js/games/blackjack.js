(() => {
  const SUITS = ['♠', '♥', '♦', '♣'];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const isRed = s => s === '♥' || s === '♦';

  function createShoe(decks = 4) {
    const shoe = [];
    for (let d = 0; d < decks; d++) {
      for (const s of SUITS) for (const r of RANKS) shoe.push({ s, r });
    }
    return shuffle(shoe);
  }

  function handValue(hand) {
    let total = 0, aces = 0;
    for (const c of hand) {
      if (c.r === 'A') { aces++; total += 11; }
      else if (['K', 'Q', 'J'].includes(c.r)) total += 10;
      else total += +c.r;
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
  }

  const isBlackjack = hand => hand.length === 2 && handValue(hand) === 21;

  function renderCard(c, hidden = false) {
    if (hidden) return `<div class="cas-card back"></div>`;
    return `<div class="cas-card ${isRed(c.s) ? 'red' : 'black'}">
      <span class="tl">${c.r}<br>${c.s}</span>
      <span class="mid">${c.s}</span>
      <span class="br">${c.r}<br>${c.s}</span>
    </div>`;
  }

  Arcade.register({
    id: 'blackjack',
    name: 'Blackjack 21',
    emoji: '♠️',
    cat: 'casino',
    best: 'high',
    unit: ' $',
    color: '#10b981',
    desc: 'Acércate a 21 sin pasarte y vence al crupier. Blackjack natural paga 3:2.',
    controls: 'Elige fichas para apostar · Pedir (H), Plantarse (S) o Doblar (D)',
    start(root, api) {
      let shoe = createShoe();
      let bank = 1000, bet = 50;
      let player = [], dealer = [];
      let state = 'bet'; // 'bet' | 'play' | 'dealer' | 'done'
      let msg = 'Haz tu apuesta y reparte las cartas.';
      let outcome = '';

      api.setScore(bank);

      root.innerHTML = `<div class="cas-table bj">
        <div class="cas-top">
          <div class="cas-chip-stat"><span>Banca</span><b class="bj-bank">$1000</b></div>
          <div class="cas-status bj-msg"></div>
          <div class="cas-chip-stat"><span>Apuesta</span><b class="bj-bet">$50</b></div>
        </div>

        <div class="bj-zone">
          <div class="bj-label">Crupier <span class="bj-dval"></span></div>
          <div class="cas-cards bj-dcards"></div>
        </div>

        <div class="bj-zone">
          <div class="bj-label">Tu mano <span class="bj-pval"></span></div>
          <div class="cas-cards bj-pcards"></div>
        </div>

        <div class="cas-controls bj-bet-controls">
          <div class="cas-chips">
            ${[10, 25, 50, 100, 250].map(v => `<button class="chip-btn" data-chip="${v}">+$${v}</button>`).join('')}
            <button class="chip-btn ghost" data-act="clear">Limpiar</button>
            <button class="chip-btn gold" data-act="max">All-In</button>
          </div>
          <button class="btn cas-main-btn bj-deal">🃏 Repartir</button>
        </div>

        <div class="cas-controls bj-play-controls" hidden>
          <button class="btn" data-play="hit">👆 Pedir (H)</button>
          <button class="btn ghost" data-play="stand">✋ Plantarse (S)</button>
          <button class="btn gold-btn" data-play="double">💰 Doblar (D)</button>
        </div>
      </div>`;

      const bankEl = root.querySelector('.bj-bank');
      const betEl = root.querySelector('.bj-bet');
      const msgEl = root.querySelector('.bj-msg');
      const dValEl = root.querySelector('.bj-dval');
      const pValEl = root.querySelector('.bj-pval');
      const dCardsEl = root.querySelector('.bj-dcards');
      const pCardsEl = root.querySelector('.bj-pcards');
      const betCtrls = root.querySelector('.bj-bet-controls');
      const playCtrls = root.querySelector('.bj-play-controls');
      const doubleBtn = root.querySelector('[data-play="double"]');

      const draw = () => {
        if (shoe.length < 15) shoe = createShoe();
        return shoe.pop();
      };

      function render() {
        bankEl.textContent = '$' + bank;
        betEl.textContent = '$' + bet;
        msgEl.textContent = msg;
        msgEl.className = 'cas-status bj-msg ' + outcome;

        const hideHole = state === 'play';
        dCardsEl.innerHTML = dealer.length
          ? dealer.map((c, i) => renderCard(c, hideHole && i === 1)).join('')
          : '<div class="cas-placeholder">Mesa de Blackjack · Pago 3:2</div>';
        pCardsEl.innerHTML = player.length
          ? player.map(c => renderCard(c)).join('')
          : '<div class="cas-placeholder">Tus cartas aparecerán aquí</div>';

        dValEl.textContent = dealer.length ? (hideHole ? `(${handValue([dealer[0]])}+?)` : `(${handValue(dealer)})`) : '';
        pValEl.textContent = player.length ? `(${handValue(player)})` : '';

        betCtrls.hidden = state === 'play' || state === 'dealer';
        playCtrls.hidden = state !== 'play';
        doubleBtn.disabled = player.length !== 2 || bank < bet;
        root.querySelector('.bj-deal').disabled = bet <= 0 || bet > bank;
      }

      function deal() {
        if (state === 'play' || state === 'dealer') return;
        if (bank <= 0) { bank = 1000; bet = 50; }
        bet = clamp(bet, 10, bank);
        bank -= bet;
        player = [draw(), draw()];
        dealer = [draw(), draw()];
        state = 'play';
        outcome = '';
        msg = '¿Pedir carta o plantarse?';
        api.beep(520, 0.05, 'triangle');

        if (isBlackjack(player)) {
          if (isBlackjack(dealer)) {
            finish('push', '¡Ambos tienen Blackjack! Empate.');
          } else {
            finish('bj', '¡BLACKJACK NATURAL! Pago 3:2 🎉');
          }
          return;
        }
        render();
      }

      function hit() {
        if (state !== 'play') return;
        player.push(draw());
        api.beep(600, 0.04, 'triangle');
        const v = handValue(player);
        if (v > 21) {
          finish('lose', `Te pasaste con ${v}. La banca gana.`);
        } else if (v === 21) {
          stand();
        } else {
          render();
        }
      }

      function doubleDown() {
        if (state !== 'play' || player.length !== 2 || bank < bet) return;
        bank -= bet;
        bet *= 2;
        player.push(draw());
        api.beep(680, 0.06, 'triangle');
        const v = handValue(player);
        if (v > 21) {
          finish('lose', `Doblaste y te pasaste con ${v}.`);
        } else {
          stand();
        }
      }

      function stand() {
        if (state !== 'play') return;
        state = 'dealer';
        render();

        const step = () => {
          const dv = handValue(dealer);
          if (dv < 17) {
            dealer.push(draw());
            api.beep(440, 0.04, 'triangle');
            render();
            api.timeout(step, 420);
          } else {
            const pv = handValue(player);
            if (isBlackjack(dealer)) finish('lose', 'El crupier tiene Blackjack.');
            else if (dv > 21) finish('win', `¡El crupier se pasa con ${dv}! Ganas $${bet * 2}.`);
            else if (pv > dv) finish('win', `¡Ganas ${pv} contra ${dv}! +$${bet * 2}`);
            else if (pv < dv) finish('lose', `El crupier gana ${dv} contra ${pv}.`);
            else finish('push', `Empate a ${pv}. Recuperas tu apuesta.`);
          }
        };
        api.timeout(step, 380);
      }

      function finish(res, text) {
        state = 'done';
        msg = text;
        if (res === 'bj') {
          const payout = bet + Math.floor(bet * 1.5);
          bank += payout;
          outcome = 'win';
          [523, 659, 784, 1046].forEach((f, i) => api.timeout(() => api.beep(f, 0.1, 'triangle', 0.05), i * 90));
        } else if (res === 'win') {
          bank += bet * 2;
          outcome = 'win';
          api.beep(784, 0.14, 'triangle');
        } else if (res === 'push') {
          bank += bet;
          outcome = 'push';
          api.beep(440, 0.08);
        } else {
          outcome = 'lose';
          api.beep(180, 0.22, 'sawtooth');
        }

        api.setScore(bank);
        if (bank <= 0) {
          api.timeout(() => {
            api.overlay('💸 Sin fichas', 'Te quedaste sin banca. Te damos $1,000 nuevos para seguir jugando.', 'Reponer $1,000', () => {
              bank = 1000; bet = 50; state = 'bet'; player = []; dealer = [];
              msg = 'Banca recargada. ¡Haz tu apuesta!';
              api.setScore(bank);
              render();
            });
          }, 600);
        }
        bet = Math.min(bet, Math.max(10, bank));
        render();
      }

      root.querySelectorAll('[data-chip]').forEach(b => {
        b.onclick = () => {
          if (state === 'play' || state === 'dealer') return;
          bet = clamp(bet + (+b.dataset.chip), 10, bank);
          api.beep(700, 0.02);
          render();
        };
      });
      root.querySelector('[data-act="clear"]').onclick = () => { bet = Math.min(10, bank); render(); };
      root.querySelector('[data-act="max"]').onclick = () => { bet = bank; api.beep(820, 0.04); render(); };
      root.querySelector('.bj-deal').onclick = deal;
      root.querySelector('[data-play="hit"]').onclick = hit;
      root.querySelector('[data-play="stand"]').onclick = stand;
      doubleBtn.onclick = doubleDown;

      api.on(window, 'keydown', e => {
        const k = e.key.toLowerCase();
        if (state === 'play') {
          if (k === 'h') hit();
          else if (k === 's') stand();
          else if (k === 'd') doubleDown();
        } else if ((state === 'bet' || state === 'done') && (k === ' ' || k === 'enter')) {
          deal();
        }
      });

      render();
    },
  });
})();
