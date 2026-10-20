(() => {
  const ICONS = ['🐶', '🐱', '🦊', '🐼', '🦁', '🐸', '🐵', '🦄'];

  Arcade.register({
    id: 'memoria', name: 'Memorama', emoji: '🧠', cat: 'puzzle', best: 'low', unit: ' mov', color: '#10b981',
    desc: 'Encuentra todas las parejas de cartas en la menor cantidad de movimientos posible.',
    controls: 'Clic o toca dos cartas para voltearlas y buscar su pareja',
    start(root, api) {
      const cards = shuffle([...ICONS, ...ICONS]).map((icon, id) => ({ id, icon, matched: false }));
      let flipped = [], lock = false, moves = 0, matches = 0;

      root.innerHTML = `<div class="memo">
        <div class="memo-grid">${cards.map((c, i) => `
          <div class="memo-card" data-idx="${i}">
            <div class="memo-face back">❓</div>
            <div class="memo-face front">${c.icon}</div>
          </div>
        `).join('')}</div>
      </div>`;

      const cardEls = [...root.querySelectorAll('.memo-card')];

      function flip(idx) {
        if (lock) return;
        const card = cards[idx];
        const el = cardEls[idx];

        if (card.matched || flipped.includes(idx)) return;

        el.classList.add('flipped');
        flipped.push(idx);
        api.beep(480 + flipped.length * 80, 0.04, 'triangle');

        if (flipped.length === 2) {
          moves++;
          api.setScore(moves);
          const [i1, i2] = flipped;
          const c1 = cards[i1], c2 = cards[i2];

          if (c1.icon === c2.icon) {
            c1.matched = c2.matched = true;
            cardEls[i1].classList.add('matched');
            cardEls[i2].classList.add('matched');
            matches++;
            flipped = [];
            api.beep(780, 0.1, 'square');

            if (matches === ICONS.length) {
              api.timeout(() => {
                api.win(`¡Completaste el memorama en <b>${moves}</b> movimientos!`);
              }, 400);
            }
          } else {
            lock = true;
            api.timeout(() => {
              cardEls[i1].classList.remove('flipped');
              cardEls[i2].classList.remove('flipped');
              flipped = [];
              lock = false;
            }, 800);
          }
        }
      }

      cardEls.forEach((el, idx) => {
        el.addEventListener('click', () => flip(idx));
      });
    },
  });
})();
