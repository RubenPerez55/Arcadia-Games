(() => {
  const SUITS = ['♠', '♥', '♦', '♣'];
  const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const red = s => s === 1 || s === 2;

  Arcade.register({
    id: 'solitario', name: 'Solitario', emoji: '🃏', cat: 'mesa', best: 'high', color: '#16a34a',
    desc: 'Klondike clásico: ordena las cartas por palo del As al Rey.',
    controls: 'Clic en una carta para moverla automáticamente · arrástrala para elegir destino · clic en el mazo para robar',
    start(root, api) {
      const deck = [];
      for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push({ s, r, up: false });
      shuffle(deck);
      const tab = [...Array(7)].map(() => []), found = [[], [], [], []];
      for (let i = 0; i < 7; i++) for (let j = i; j < 7; j++) { const c = deck.pop(); c.up = i === j; tab[j].push(c); }
      let stock = deck, waste = [], score = 0, moves = 0, auto = null, won = false;

      root.innerHTML = `<div class="sol">
        <div class="sol-top">
          <div class="pile stock"></div><div class="pile waste" data-drop="waste"></div>
          <div class="sol-gap"><span class="sol-moves"></span></div>
          ${[0, 1, 2, 3].map(i => `<div class="pile found" data-drop="found-${i}" data-ph="A"></div>`).join('')}
        </div>
        <div class="sol-tab">${[0, 1, 2, 3, 4, 5, 6].map(i => `<div class="pile tabp" data-drop="tab-${i}"></div>`).join('')}</div>
      </div>`;
      const board = root.querySelector('.sol');
      const els = {
        stock: root.querySelector('.stock'), waste: root.querySelector('.waste'), moves: root.querySelector('.sol-moves'),
        found: [...root.querySelectorAll('.found')], tab: [...root.querySelectorAll('.tabp')],
      };

      function cardEl(c, src) {
        const el = document.createElement('div');
        el.className = 'card ' + (c.up ? (red(c.s) ? 'red' : 'black') : 'back');
        if (c.up) el.innerHTML = `<span class="tl">${RANKS[c.r]}<br>${SUITS[c.s]}</span><span class="mid">${SUITS[c.s]}</span><span class="br">${RANKS[c.r]}<br>${SUITS[c.s]}</span>`;
        if (src) el.dataset.src = src;
        return el;
      }
      function render() {
        els.stock.innerHTML = stock.length ? `<span class="sol-badge">${stock.length}</span>` : '<div class="stock-empty">↻</div>';
        if (stock.length) els.stock.prepend(cardEl({ up: false }));
        els.waste.innerHTML = '';
        if (waste.length > 1) els.waste.appendChild(cardEl(waste[waste.length - 2]));
        if (waste.length) els.waste.appendChild(cardEl(waste[waste.length - 1], 'waste'));
        found.forEach((f, i) => {
          els.found[i].innerHTML = '';
          if (f.length > 1) els.found[i].appendChild(cardEl(f[f.length - 2]));
          if (f.length) els.found[i].appendChild(cardEl(f[f.length - 1], `found-${i}`));
        });
        tab.forEach((p, i) => {
          const pEl = els.tab[i]; pEl.innerHTML = '';
          const offUp = p.length > 13 ? 0.2 : 0.27;
          let y = 0, yLast = 0;
          p.forEach((c, j) => {
            const el = cardEl(c, c.up ? `tab-${i}-${j}` : null);
            el.style.top = `calc(var(--ch) * ${y})`;
            pEl.appendChild(el);
            yLast = y; y += c.up ? offUp : 0.11;
          });
          pEl.style.height = `calc(var(--ch) * ${1 + yLast})`;
        });
        els.moves.textContent = `${moves} mov.`;
      }

      function getStack(src) {
        const [t, a, b] = src.split('-');
        if (t === 'waste') return waste.length ? [waste[waste.length - 1]] : [];
        if (t === 'found') { const f = found[+a]; return f.length ? [f[f.length - 1]] : []; }
        if (t === 'tab') return tab[+a].slice(+b);
        return [];
      }
      function canDrop(stack, dst) {
        const c = stack[0], [t, a] = dst.split('-');
        if (t === 'found') {
          if (stack.length !== 1) return false;
          const f = found[+a];
          return f.length ? (f[f.length - 1].s === c.s && c.r === f[f.length - 1].r + 1) : c.r === 1;
        }
        if (t === 'tab') {
          const p = tab[+a];
          if (!p.length) return c.r === 13;
          const top = p[p.length - 1];
          return top.up && red(top.s) !== red(c.s) && c.r === top.r - 1;
        }
        return false;
      }
      function doMove(src, dst) {
        const stack = getStack(src);
        if (!stack.length || !canDrop(stack, dst)) return false;
        const [t, a, b] = src.split('-'), [dt, da] = dst.split('-');
        if (t === 'waste') waste.pop(); else if (t === 'found') found[+a].pop(); else tab[+a].splice(+b);
        (dt === 'found' ? found : tab)[+da].push(...stack);
        if (dt === 'found' && t !== 'found') score += 10;
        else if (t === 'waste') score += 5;
        else if (t === 'found') score = Math.max(0, score - 15);
        if (t === 'tab') { const p = tab[+a]; if (p.length && !p[p.length - 1].up) { p[p.length - 1].up = true; score += 5; } }
        moves++; api.setScore(score);
        api.beep(dt === 'found' ? 720 : 480, 0.04, 'triangle');
        render(); checkWin();
        return true;
      }
      function smart(src) {
        const st = getStack(src); if (!st.length) return;
        const [t, a, b] = src.split('-');
        if (st.length === 1 && t !== 'found') for (let i = 0; i < 4; i++) if (doMove(src, 'found-' + i)) return;
        const order = [0, 1, 2, 3, 4, 5, 6].filter(i => !(t === 'tab' && +a === i));
        for (const i of order) if (tab[i].length && doMove(src, 'tab-' + i)) return;
        if (!(t === 'tab' && +b === 0)) for (const i of order) if (!tab[i].length && doMove(src, 'tab-' + i)) return;
        const el = root.querySelector(`[data-src="${src}"]`);
        if (el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); }
        api.beep(150, 0.05, 'sawtooth', 0.02);
      }
      function drawStock() {
        if (stock.length) { const c = stock.pop(); c.up = true; waste.push(c); }
        else if (waste.length) { stock = waste.reverse().map(c => (c.up = false, c)); waste = []; }
        else return;
        moves++; api.beep(400, 0.03, 'triangle', 0.03);
        render(); checkWin();
      }
      function checkWin() {
        if (won) return;
        if (found.reduce((n, f) => n + f.length, 0) === 52) {
          won = true;
          api.timeout(() => api.win(`Puntuación: ${score}<br>${moves} movimientos`), 300);
          return;
        }
        if (!auto && !stock.length && !waste.length && tab.every(p => p.every(c => c.up))) {
          auto = api.interval(() => {
            for (let i = 0; i < 7; i++) {
              const p = tab[i];
              if (p.length) for (let f = 0; f < 4; f++) if (doMove(`tab-${i}-${p.length - 1}`, 'found-' + f)) return;
            }
          }, 120);
        }
      }

      /* ---------- Clic y arrastre ---------- */
      let drag = null;
      api.on(board, 'pointerdown', e => {
        if (e.target.closest('.stock')) { drawStock(); return; }
        const el = e.target.closest('.card');
        if (!el || !el.dataset.src) return;
        e.preventDefault();
        const src = el.dataset.src;
        const els2 = src.startsWith('tab')
          ? [...el.parentNode.querySelectorAll('.card')].filter(x => x.dataset.src && +x.dataset.src.split('-')[2] >= +src.split('-')[2])
          : [el];
        drag = { src, els: els2, x: e.clientX, y: e.clientY, moved: false };
      });
      api.on(window, 'pointermove', e => {
        if (!drag) return;
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < 6) return;
        drag.moved = true;
        drag.els.forEach(x => { x.classList.add('dragging'); x.style.transform = `translate(${dx}px, ${dy}px)`; });
      });
      api.on(window, 'pointerup', e => {
        if (!drag) return;
        const d = drag; drag = null;
        if (!d.moved) { smart(d.src); return; }
        const under = document.elementFromPoint(e.clientX, e.clientY);
        const pile = under && under.closest('[data-drop]');
        if (!pile || !doMove(d.src, pile.dataset.drop)) render();
      });

      render();
    },
  });
})();
