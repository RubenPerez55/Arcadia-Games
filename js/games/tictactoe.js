(() => {
  Arcade.register({
    id: 'tictactoe', name: 'Gato', emoji: '❌', cat: 'estrategia', best: 'high', color: '#f43f5e',
    desc: 'Tres en raya (Tic Tac Toe) contra la CPU o contra un amigo.',
    controls: 'Clic en una casilla · los puntos son tus victorias contra la CPU',
    start(root, api) {
      const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
      let mode = 'cpu', board, turn, over, wins = 0, starter = 'X';
      const tally = { X: 0, O: 0, E: 0 };

      root.innerHTML = `<div class="ttt">
        <div class="seg"><button data-m="cpu" class="on">🤖 vs CPU</button><button data-m="pvp">👥 2 jugadores</button></div>
        <div class="ttt-status"></div>
        <div class="ttt-board">${'<button class="ttt-cell"></button>'.repeat(9)}</div>
        <div class="ttt-tally"></div>
        <button class="btn ttt-again">Nueva ronda</button></div>`;
      const cells = [...root.querySelectorAll('.ttt-cell')];
      const status = root.querySelector('.ttt-status'), tallyEl = root.querySelector('.ttt-tally'), again = root.querySelector('.ttt-again');

      const winner = b => {
        for (const l of LINES) { const [a, c, d] = l; if (b[a] && b[a] === b[c] && b[a] === b[d]) return { p: b[a], l }; }
        return b.every(Boolean) ? { p: 'E' } : null;
      };
      function minimax(b, player, depth) {
        const w = winner(b);
        if (w) return { s: w.p === 'O' ? 10 - depth : w.p === 'X' ? depth - 10 : 0 };
        let best = { s: player === 'O' ? -Infinity : Infinity, i: -1 };
        for (let i = 0; i < 9; i++) if (!b[i]) {
          b[i] = player;
          const r = minimax(b, player === 'O' ? 'X' : 'O', depth + 1);
          b[i] = null;
          if (player === 'O' ? r.s > best.s : r.s < best.s) best = { s: r.s, i };
        }
        return best;
      }
      function cpu() {
        const empty = board.map((v, i) => v ? -1 : i).filter(i => i >= 0);
        const i = Math.random() < 0.2 ? pick(empty) : minimax(board.slice(), 'O', 0).i;
        play(i);
      }
      function reset() {
        board = Array(9).fill(null); over = false; turn = starter;
        render();
        if (mode === 'cpu' && turn === 'O') api.timeout(cpu, 450);
      }
      function render() {
        const w = winner(board);
        cells.forEach((c, i) => {
          c.textContent = board[i] || '';
          c.className = 'ttt-cell' + (board[i] ? ' ' + board[i].toLowerCase() : '');
          c.disabled = over || !!board[i];
        });
        if (w) {
          if (w.l) w.l.forEach(i => cells[i].classList.add('win'));
          status.textContent = w.p === 'E' ? '¡Empate! 🤝' : mode === 'cpu' ? (w.p === 'X' ? '¡Ganaste! 🎉' : 'La CPU gana 🤖') : `¡Gana ${w.p}! 🎉`;
        } else status.textContent = mode === 'cpu' ? (turn === 'X' ? 'Tu turno (X)' : 'La CPU está pensando…') : `Turno de ${turn}`;
        tallyEl.innerHTML = `<span class="x">X: ${tally.X}</span><span>Empates: ${tally.E}</span><span class="o">O: ${tally.O}</span>`;
        again.style.visibility = over ? 'visible' : 'hidden';
      }
      function play(i) {
        if (over || board[i]) return;
        board[i] = turn;
        api.beep(turn === 'X' ? 520 : 390, 0.05, 'triangle');
        const w = winner(board);
        if (w) {
          over = true; tally[w.p]++;
          if (mode === 'cpu' && w.p === 'X') { wins++; api.setScore(wins); }
          starter = starter === 'X' ? 'O' : 'X';
        } else turn = turn === 'X' ? 'O' : 'X';
        render();
        if (!over && mode === 'cpu' && turn === 'O') api.timeout(cpu, 380);
      }

      cells.forEach((c, i) => c.addEventListener('click', () => { if (!(mode === 'cpu' && turn === 'O')) play(i); }));
      again.onclick = reset;
      root.querySelectorAll('[data-m]').forEach(b => b.onclick = () => {
        mode = b.dataset.m;
        root.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b));
        tally.X = tally.O = tally.E = 0; starter = 'X';
        reset();
      });
      reset();
    },
  });
})();
