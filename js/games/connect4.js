(() => {
  Arcade.register({
    id: 'conecta4', name: 'Conecta 4', emoji: '🔴', cat: 'estrategia', best: 'high', color: '#eab308',
    desc: 'Alinea cuatro fichas en horizontal, vertical o diagonal antes que tu rival.',
    controls: 'Clic en una columna para soltar ficha · los puntos son tus victorias contra la CPU',
    start(root, api) {
      const R = 6, C = 7, ORDER = [3, 2, 4, 1, 5, 0, 6], DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];
      let mode = 'cpu', b, turn, over, last, wins = 0, busy = false, starter = 1;
      const tally = { 1: 0, 2: 0, d: 0 };

      root.innerHTML = `<div class="c4">
        <div class="seg"><button data-m="cpu" class="on">🤖 vs CPU</button><button data-m="pvp">👥 2 jugadores</button></div>
        <div class="c4-status"></div>
        <div class="c4-board">${Array.from({ length: R * C }, (_, i) => `<div class="c4-cell" data-c="${i % C}"></div>`).join('')}</div>
        <div class="c4-tally"></div>
        <button class="btn c4-again">Nueva ronda</button></div>`;
      const boardEl = root.querySelector('.c4-board'), cells = [...boardEl.children];
      const status = root.querySelector('.c4-status'), tallyEl = root.querySelector('.c4-tally'), again = root.querySelector('.c4-again');

      const lowest = (b, c) => { for (let r = R - 1; r >= 0; r--) if (!b[r][c]) return r; return -1; };
      function winLine(b, r, c) {
        const p = b[r][c];
        for (const [dr, dc] of DIRS) {
          const line = [[r, c]];
          for (const s of [1, -1]) {
            let rr = r + dr * s, cc = c + dc * s;
            while (rr >= 0 && rr < R && cc >= 0 && cc < C && b[rr][cc] === p) { line.push([rr, cc]); rr += dr * s; cc += dc * s; }
          }
          if (line.length >= 4) return line;
        }
        return null;
      }
      function evalBoard(b, p) {
        const o = 3 - p; let s = 0;
        for (let r = 0; r < R; r++) s += b[r][3] === p ? 3 : b[r][3] === o ? -3 : 0;
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) for (const [dr, dc] of DIRS) {
          const er = r + 3 * dr, ec = c + 3 * dc;
          if (er < 0 || er >= R || ec < 0 || ec >= C) continue;
          let mp = 0, mo = 0;
          for (let k = 0; k < 4; k++) { const v = b[r + k * dr][c + k * dc]; if (v === p) mp++; else if (v === o) mo++; }
          if (mp && mo) continue;
          if (mp === 3) s += 5; else if (mp === 2) s += 2;
          else if (mo === 3) s -= 4; else if (mo === 2) s -= 1;
        }
        return s;
      }
      function negamax(b, depth, alpha, beta, p) {
        const moves = ORDER.filter(c => !b[0][c]);
        if (!moves.length) return 0;
        if (depth === 0) return evalBoard(b, p);
        let best = -Infinity;
        for (const c of moves) {
          const r = lowest(b, c); b[r][c] = p;
          const s = winLine(b, r, c) ? 100000 + depth : -negamax(b, depth - 1, -beta, -alpha, 3 - p);
          b[r][c] = 0;
          if (s > best) best = s;
          if (s > alpha) alpha = s;
          if (alpha >= beta) break;
        }
        return best;
      }
      function cpuMove() {
        let bestC = 3, best = -Infinity;
        for (const c of ORDER) {
          if (b[0][c]) continue;
          const r = lowest(b, c); b[r][c] = 2;
          const s = (winLine(b, r, c) ? 1e6 : -negamax(b, 4, -Infinity, Infinity, 1)) + Math.random() * 0.5;
          b[r][c] = 0;
          if (s > best) { best = s; bestC = c; }
        }
        return bestC;
      }

      const name = p => mode === 'cpu' ? (p === 1 ? 'Tú' : 'CPU') : (p === 1 ? 'Rojo' : 'Amarillo');
      function render(line) {
        const winSet = new Set((line || []).map(([r, c]) => r * C + c));
        cells.forEach((el, i) => {
          const r = Math.floor(i / C), c = i % C, v = b[r][c];
          el.innerHTML = v ? `<div class="disc p${v}${last && last.r === r && last.c === c ? ' drop' : ''}${winSet.has(i) ? ' win' : ''}" style="--fall:${r + 1}"></div>` : '';
        });
        if (line) status.innerHTML = mode === 'cpu' ? (b[last.r][last.c] === 1 ? '¡Ganaste! 🎉' : 'La CPU gana 🤖') : `¡Gana ${name(b[last.r][last.c])}! 🎉`;
        else if (over) status.textContent = '¡Empate! 🤝';
        else status.innerHTML = `<span class="dot p${turn}"></span> ${mode === 'cpu' ? (turn === 1 ? 'Tu turno' : 'La CPU está pensando…') : 'Turno de ' + name(turn)}`;
        tallyEl.innerHTML = `<span class="r">${name(1)}: ${tally[1]}</span><span>Empates: ${tally.d}</span><span class="y">${name(2)}: ${tally[2]}</span>`;
        again.style.visibility = over ? 'visible' : 'hidden';
      }
      function play(c) {
        if (over || busy) return;
        const r = lowest(b, c); if (r < 0) return;
        b[r][c] = turn; last = { r, c };
        api.beep(turn === 1 ? 330 : 260, 0.06, 'triangle');
        const line = winLine(b, r, c);
        if (line) {
          over = true; tally[turn]++;
          if (mode === 'cpu' && turn === 1) { wins++; api.setScore(wins); }
          starter = 3 - starter; render(line); return;
        }
        if (b[0].every(Boolean)) { over = true; tally.d++; starter = 3 - starter; render(); return; }
        turn = 3 - turn; render();
        if (mode === 'cpu' && turn === 2) { busy = true; api.timeout(() => { busy = false; play(cpuMove()); }, 450); }
      }
      function reset() {
        b = [...Array(R)].map(() => Array(C).fill(0)); over = false; last = null; turn = starter; busy = false;
        render();
        if (mode === 'cpu' && turn === 2) { busy = true; api.timeout(() => { busy = false; play(cpuMove()); }, 450); }
      }

      boardEl.addEventListener('click', e => {
        const cell = e.target.closest('.c4-cell'); if (!cell) return;
        if (mode === 'cpu' && turn === 2) return;
        play(+cell.dataset.c);
      });
      boardEl.addEventListener('mouseover', e => {
        const cell = e.target.closest('.c4-cell'); if (!cell) return;
        cells.forEach(el => el.classList.toggle('hover', el.dataset.c === cell.dataset.c));
      });
      boardEl.addEventListener('mouseleave', () => cells.forEach(el => el.classList.remove('hover')));
      again.onclick = reset;
      root.querySelectorAll('[data-m]').forEach(btn => btn.onclick = () => {
        mode = btn.dataset.m;
        root.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === btn));
        tally[1] = tally[2] = tally.d = 0; starter = 1;
        reset();
      });
      reset();
    },
  });
})();
