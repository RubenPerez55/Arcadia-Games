(() => {
  const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  const MAX_PIECES = 3;
  const STATS_KEY = 'arcade.httt.stats';

  function initialState() {
    return {
      board: Array(9).fill(null),
      pieces: [],
      currentTurn: 'X',
      turnCount: 1,
      winner: null,
      winningLine: null,
      lastVanishedIndex: null,
      lastPlacedIndex: null,
      isGameOver: false,
    };
  }

  function checkWinner(board) {
    for (const combo of WINNING_COMBINATIONS) {
      const [a, b, c] = combo;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a], line: combo };
      }
    }
    return { winner: null, line: null };
  }

  function applyMove(state, cellIndex) {
    if (state.isGameOver || state.board[cellIndex] !== null) return null;

    const player = state.currentTurn;
    const newBoard = [...state.board];
    let newPieces = state.pieces.map(p => ({ ...p }));
    let vanishedCell = null;

    const playerExisting = newPieces
      .filter(p => p.player === player)
      .sort((a, b) => a.turnPlaced - b.turnPlaced);

    if (playerExisting.length >= MAX_PIECES) {
      const oldest = playerExisting[0];
      vanishedCell = oldest.cellIndex;
      newBoard[oldest.cellIndex] = null;
      newPieces = newPieces.filter(p => p.id !== oldest.id);
    }

    newBoard[cellIndex] = player;
    newPieces.push({
      id: `${player}-${state.turnCount}-${cellIndex}`,
      player,
      cellIndex,
      order: 3,
      turnPlaced: state.turnCount,
    });

    ['X', 'O'].forEach(p => {
      const pPieces = newPieces
        .filter(piece => piece.player === p)
        .sort((a, b) => a.turnPlaced - b.turnPlaced);
      pPieces.forEach((piece, idx) => {
        piece.order = (MAX_PIECES - pPieces.length + 1) + idx;
      });
    });

    const { winner, line } = checkWinner(newBoard);

    return {
      vanishedCell,
      nextState: {
        board: newBoard,
        pieces: newPieces,
        currentTurn: winner ? player : player === 'X' ? 'O' : 'X',
        turnCount: state.turnCount + 1,
        winner,
        winningLine: line,
        lastVanishedIndex: vanishedCell,
        lastPlacedIndex: cellIndex,
        isGameOver: winner !== null,
      },
    };
  }

  function getAvailableMoves(board) {
    const moves = [];
    board.forEach((v, i) => { if (v === null) moves.push(i); });
    return moves;
  }

  function evaluateBoard(state, botPlayer, depth) {
    if (state.winner === botPlayer) return 1000 - depth;
    if (state.winner && state.winner !== botPlayer) return -1000 + depth;

    const human = botPlayer === 'X' ? 'O' : 'X';
    let score = 0;

    for (const [a, b, c] of WINNING_COMBINATIONS) {
      const cells = [state.board[a], state.board[b], state.board[c]];
      const botCount = cells.filter(x => x === botPlayer).length;
      const humanCount = cells.filter(x => x === human).length;
      const emptyCount = cells.filter(x => x === null).length;

      if (botCount === 2 && emptyCount === 1) score += 35;
      if (humanCount === 2 && emptyCount === 1) score -= 40;
      if (botCount === 1 && emptyCount === 2) score += 5;
      if (humanCount === 1 && emptyCount === 2) score -= 5;
    }

    if (state.board[4] === botPlayer) score += 12;
    else if (state.board[4] === human) score -= 12;

    for (const c of [0, 2, 6, 8]) {
      if (state.board[c] === botPlayer) score += 4;
      else if (state.board[c] === human) score -= 4;
    }
    return score;
  }

  function minimax(state, depth, maxDepth, isMax, botPlayer, alpha, beta) {
    const moves = getAvailableMoves(state.board);
    if (state.winner !== null || !moves.length || depth >= maxDepth) {
      return { score: evaluateBoard(state, botPlayer, depth) };
    }

    if (isMax) {
      let maxEval = -Infinity, bestMove = moves[0];
      for (const m of moves) {
        const res = applyMove(state, m);
        if (!res) continue;
        const ev = minimax(res.nextState, depth + 1, maxDepth, false, botPlayer, alpha, beta).score;
        if (ev > maxEval) { maxEval = ev; bestMove = m; }
        alpha = Math.max(alpha, ev);
        if (beta <= alpha) break;
      }
      return { score: maxEval, move: bestMove };
    } else {
      let minEval = Infinity, bestMove = moves[0];
      for (const m of moves) {
        const res = applyMove(state, m);
        if (!res) continue;
        const ev = minimax(res.nextState, depth + 1, maxDepth, true, botPlayer, alpha, beta).score;
        if (ev < minEval) { minEval = ev; bestMove = m; }
        beta = Math.min(beta, ev);
        if (beta <= alpha) break;
      }
      return { score: minEval, move: bestMove };
    }
  }

  function findImmediateWin(state, player) {
    const moves = getAvailableMoves(state.board);
    const copy = { ...state, currentTurn: player };
    for (const m of moves) {
      const res = applyMove(copy, m);
      if (res && res.nextState.winner === player) return m;
    }
    return null;
  }

  function getBotMove(state, difficulty, botPlayer = 'O') {
    const human = botPlayer === 'X' ? 'O' : 'X';
    const moves = getAvailableMoves(state.board);
    if (!moves.length) return 0;
    if (moves.length === 1) return moves[0];

    if (difficulty === 'easy') {
      if (Math.random() < 0.65) return pick(moves);
      const w = findImmediateWin(state, botPlayer);
      return w !== null ? w : pick(moves);
    }

    if (difficulty === 'medium') {
      const w = findImmediateWin(state, botPlayer);
      if (w !== null) return w;
      const b = findImmediateWin(state, human);
      if (b !== null) return b;
      if (state.board[4] === null && Math.random() < 0.7) return 4;
      const res = minimax(state, 0, 2, true, botPlayer, -Infinity, Infinity);
      return res.move ?? pick(moves);
    }

    // Hardcore
    const instantWin = findImmediateWin(state, botPlayer);
    if (instantWin !== null) return instantWin;

    const instantBlock = findImmediateWin(state, human);
    if (instantBlock !== null) {
      const test = applyMove(state, instantBlock);
      if (test && !test.nextState.winner) {
        if (findImmediateWin(test.nextState, human) === null) return instantBlock;
      }
    }

    if (state.turnCount <= 3) {
      if (state.board[4] === null) return 4;
      const corners = [0, 2, 6, 8].filter(c => state.board[c] === null);
      if (corners.length) return pick(corners);
    }

    const res = minimax(state, 0, 4, true, botPlayer, -Infinity, Infinity);
    if (res.move !== undefined && moves.includes(res.move)) return res.move;
    if (state.board[4] === null) return 4;
    const corners = [0, 2, 6, 8].filter(c => state.board[c] === null);
    return corners.length ? pick(corners) : pick(moves);
  }

  Arcade.register({
    id: 'hardcore-ttt',
    name: 'Hardcore Tic-Tac-Toe',
    emoji: '⚡',
    cat: 'estrategia',
    best: 'high',
    color: '#06b6d4',
    desc: 'Gato infinito sin empates: máximo 3 fichas por jugador; al poner la 4ª, tu ficha más antigua desaparece.',
    controls: 'Clic en casilla · observa el aviso ⚠️ VANISHING antes de que tu ficha se evapore',
    start(root, api) {
      let mode = 'bot';
      let difficulty = 'hardcore';
      let state = initialState();
      let botThinking = false;
      let rulesOpen = false;

      let stats = {
        pvp: { xWins: 0, oWins: 0, streak: { winner: null, count: 0 } },
        bot: { playerWins: 0, botWins: 0, streak: { winner: null, count: 0 } },
      };
      try {
        const saved = localStorage.getItem(STATS_KEY);
        if (saved) stats = JSON.parse(saved);
      } catch (e) { /* ignore */ }

      const saveStats = () => {
        try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) { /* ignore */ }
      };

      // Efectos de sonido fieles al sintetizador original
      function playPlace(player) {
        if (Arcade.muted) return;
        api.beep(player === 'X' ? 620 : 460, 0.09, player === 'X' ? 'triangle' : 'sine', 0.06);
      }
      function playVanish() {
        if (Arcade.muted) return;
        api.beep(520, 0.08, 'sawtooth', 0.04);
        api.timeout(() => api.beep(210, 0.14, 'sawtooth', 0.04), 60);
      }

      root.innerHTML = `
        <div class="httt">
          <div class="httt-bar">
            <div class="seg httt-modes">
              <button data-m="bot" class="on">🤖 vs Bot</button>
              <button data-m="pvp">👥 1v1 Local</button>
            </div>
            <div class="seg httt-diffs">
              <button data-d="easy">Fácil</button>
              <button data-d="medium">Medio</button>
              <button data-d="hardcore" class="on">🔥 Hardcore</button>
            </div>
            <button class="httt-rules-btn" title="Cómo jugar">❓ Reglas</button>
          </div>

          <div class="httt-turn"></div>

          <div class="httt-board-wrap">
            <div class="httt-glow"></div>
            <div class="httt-board">
              ${Array.from({ length: 9 }, (_, i) => `<button class="httt-cell" data-i="${i}"></button>`).join('')}
            </div>
          </div>

          <div class="httt-score"></div>

          <div class="httt-modal" hidden>
            <div class="httt-modal-box">
              <div class="httt-modal-head">
                <div>
                  <h3>⚡ HARDCORE TIC-TAC-TOE</h3>
                  <small>Mecánica de Batalla Infinita</small>
                </div>
                <button class="httt-close">✕</button>
              </div>
              <div class="httt-rule-list">
                <div class="httt-rule">
                  <span class="httt-num c">1</span>
                  <div>
                    <b>Regla de 3 Fichas Máximo</b>
                    <p>Cada jugador puede mantener un máximo de <strong>3 marcas</strong> activas en el tablero al mismo tiempo.</p>
                  </div>
                </div>
                <div class="httt-rule">
                  <span class="httt-num p">2</span>
                  <div>
                    <b>Ciclo de Desaparición ⚠️</b>
                    <p>Al colocar tu <strong>4ª marca</strong>, tu ficha más antigua (colocada hace 3 turnos) <strong>se evapora al instante</strong>. Fíjate en la alerta ámbar pulsante.</p>
                  </div>
                </div>
                <div class="httt-rule">
                  <span class="httt-num a">3</span>
                  <div>
                    <b>Cero Empates</b>
                    <p>Como las fichas se reciclan continuamente, el tablero nunca se bloquea. ¡La partida sigue hasta que alguien logre 3 en línea!</p>
                  </div>
                </div>
              </div>
              <button class="btn httt-ready">¡Listo para jugar!</button>
            </div>
          </div>
        </div>
      `;

      const turnEl = root.querySelector('.httt-turn');
      const glowEl = root.querySelector('.httt-glow');
      const cells = [...root.querySelectorAll('.httt-cell')];
      const scoreEl = root.querySelector('.httt-score');
      const diffsEl = root.querySelector('.httt-diffs');
      const modalEl = root.querySelector('.httt-modal');

      api.setScore(stats.bot.playerWins);

      function recordWin(winner) {
        if (mode === 'pvp') {
          const isX = winner === 'X';
          const prev = stats.pvp.streak;
          stats.pvp.xWins += isX ? 1 : 0;
          stats.pvp.oWins += !isX ? 1 : 0;
          stats.pvp.streak = { winner, count: prev.winner === winner ? prev.count + 1 : 1 };
        } else {
          const isPlayer = winner === 'X';
          const wKey = isPlayer ? 'player' : 'bot';
          const prev = stats.bot.streak;
          stats.bot.playerWins += isPlayer ? 1 : 0;
          stats.bot.botWins += !isPlayer ? 1 : 0;
          stats.bot.streak = { winner: wKey, count: prev.winner === wKey ? prev.count + 1 : 1 };
          api.setScore(stats.bot.playerWins);
        }
        saveStats();
      }

      function render() {
        diffsEl.style.display = mode === 'bot' ? 'inline-flex' : 'none';
        modalEl.hidden = !rulesOpen;

        const { board, pieces, currentTurn, winningLine, isGameOver, winner, lastVanishedIndex } = state;
        const activePieces = pieces.filter(p => p.player === currentTurn);
        const holdingMax = activePieces.length >= MAX_PIECES;
        const isX = currentTurn === 'X';

        glowEl.className = 'httt-glow ' + (isGameOver ? 'win' : isX ? 'x' : 'o');

        // Turn indicator
        if (isGameOver) {
          const msg = mode === 'bot'
            ? (winner === 'X' ? '🎉 ¡GANASTE LA BATALLA!' : '🤖 ¡EL BOT HARDCORE GANA!')
            : `🎉 ¡JUGADOR ${winner} GANA!`;
          turnEl.innerHTML = `
            <div class="httt-banner win ${winner === 'X' ? 'x' : 'o'}">
              <span>✨ ${msg} ✨</span>
              <button class="btn httt-rematch">Jugar otra vez</button>
            </div>`;
          turnEl.querySelector('.httt-rematch').onclick = resetGame;
        } else {
          const label = mode === 'bot'
            ? (currentTurn === 'O' ? `BOT (${difficulty.toUpperCase()})` : 'TU TURNO (X)')
            : `TURNO DE JUGADOR ${currentTurn}`;
          const sub = botThinking
            ? 'Calculando jugada…'
            : (isX ? 'Coloca tu marca cian' : 'Coloca tu marca neón');

          turnEl.innerHTML = `
            <div class="httt-banner ${isX ? 'x' : 'o'}">
              <div class="httt-banner-top">
                <div class="httt-badge ${isX ? 'x' : 'o'}">${currentTurn}</div>
                <div class="httt-turn-text">
                  <small>${label}</small>
                  <b>${sub}</b>
                </div>
                <div class="httt-active-box">
                  <small>Activas: <span>${activePieces.length}/${MAX_PIECES}</span></small>
                  <div class="httt-dots">
                    ${[0, 1, 2].map(i => `<span class="${i < activePieces.length ? (isX ? 'on-x' : 'on-o') : ''}"></span>`).join('')}
                  </div>
                </div>
              </div>
              ${holdingMax && !botThinking ? `
                <div class="httt-warn">
                  ⚠️ ¡Tu siguiente marca hará <u>desaparecer</u> tu ficha más antigua!
                </div>` : ''}
            </div>`;
        }

        // Board cells
        cells.forEach((cell, idx) => {
          const val = board[idx];
          const piece = pieces.find(p => p.cellIndex === idx);
          const isWin = winningLine ? winningLine.includes(idx) : false;
          const isNextVanish = piece && piece.player === currentTurn && piece.order === 1 && holdingMax && !isGameOver;
          const vanishedNow = lastVanishedIndex === idx;

          cell.disabled = botThinking || val !== null || isGameOver;
          cell.className = [
            'httt-cell',
            val ? 'filled ' + val.toLowerCase() : 'is-empty',
            isNextVanish ? 'vanishing' : '',
            isWin ? 'win-cell' : '',
          ].filter(Boolean).join(' ');

          const orderLabel = piece ? (piece.order === 3 ? 'NEW' : piece.order === 2 ? 'MID' : 'OLD') : '';
          cell.innerHTML = `
            <span class="httt-idx">#${idx + 1}</span>
            ${val && piece ? `
              <div class="httt-mark ${val === 'X' ? 'x' : 'o'}">${val === 'X' ? '✕' : '◯'}</div>
              <div class="httt-cell-foot">
                <div class="httt-order-dots">
                  ${[1, 2, 3].map(d => `<span class="${d <= piece.order ? (val === 'X' ? 'x' : 'o') : ''}"></span>`).join('')}
                </div>
                ${isNextVanish
                  ? '<span class="httt-vbadge">⚠️ VANISHING</span>'
                  : `<span class="httt-age">${orderLabel}</span>`}
              </div>
            ` : `<span class="httt-ghost ${isX ? 'x' : 'o'}">${isX ? '✕' : '◯'}</span>`}
            ${vanishedNow ? '<div class="httt-laser"></div>' : ''}
          `;
        });

        // Scoreboard
        const leftLabel = mode === 'pvp' ? 'Jugador X' : 'Tú (X)';
        const rightLabel = mode === 'pvp' ? 'Jugador O' : `Bot (${difficulty})`;
        const leftWins = mode === 'pvp' ? stats.pvp.xWins : stats.bot.playerWins;
        const rightWins = mode === 'pvp' ? stats.pvp.oWins : stats.bot.botWins;
        const streak = mode === 'pvp' ? stats.pvp.streak : stats.bot.streak;
        const leftStreak = (mode === 'pvp' ? streak.winner === 'X' : streak.winner === 'player') && streak.count > 1 ? `🔥 ${streak.count}x` : '';
        const rightStreak = (mode === 'pvp' ? streak.winner === 'O' : streak.winner === 'bot') && streak.count > 1 ? `🔥 ${streak.count}x` : '';

        scoreEl.innerHTML = `
          <div class="httt-score-card x">
            <small>${leftLabel} ${leftStreak ? `<em class="httt-streak">${leftStreak}</em>` : ''}</small>
            <b>${leftWins}</b>
            <span>Victorias</span>
          </div>
          <div class="httt-score-card o">
            <small>${rightLabel} ${rightStreak ? `<em class="httt-streak">${rightStreak}</em>` : ''}</small>
            <b>${rightWins}</b>
            <span>Victorias</span>
          </div>
        `;
      }

      function triggerBot() {
        if (mode !== 'bot' || state.currentTurn !== 'O' || state.isGameOver) return;
        botThinking = true;
        render();
        const delay = difficulty === 'hardcore' ? 320 : 220;
        api.timeout(() => {
          const moveIdx = getBotMove(state, difficulty, 'O');
          const res = applyMove(state, moveIdx);
          botThinking = false;
          if (res) {
            playPlace('O');
            if (res.vanishedCell !== null) api.timeout(playVanish, 70);
            state = res.nextState;
            if (state.winner) {
              recordWin(state.winner);
              api.beep(220, 0.25, 'sawtooth', 0.05);
            }
          }
          render();
        }, delay);
      }

      function handleCell(idx) {
        if (state.isGameOver || botThinking) return;
        if (mode === 'bot' && state.currentTurn === 'O') return;

        const res = applyMove(state, idx);
        if (!res) return;

        playPlace(state.currentTurn);
        if (res.vanishedCell !== null) api.timeout(playVanish, 70);
        state = res.nextState;

        if (state.winner) {
          recordWin(state.winner);
          [523, 659, 784, 1046].forEach((f, i) => api.timeout(() => api.beep(f, 0.12, 'sine', 0.05), i * 95));
          render();
          return;
        }
        render();
        triggerBot();
      }

      function resetGame() {
        botThinking = false;
        state = initialState();
        render();
      }

      cells.forEach((c, i) => c.addEventListener('click', () => handleCell(i)));

      root.querySelectorAll('[data-m]').forEach(btn => {
        btn.onclick = () => {
          mode = btn.dataset.m;
          root.querySelectorAll('[data-m]').forEach(b => b.classList.toggle('on', b === btn));
          resetGame();
        };
      });

      root.querySelectorAll('[data-d]').forEach(btn => {
        btn.onclick = () => {
          difficulty = btn.dataset.d;
          root.querySelectorAll('[data-d]').forEach(b => b.classList.toggle('on', b === btn));
          resetGame();
        };
      });

      root.querySelector('.httt-rules-btn').onclick = () => { rulesOpen = true; render(); };
      root.querySelector('.httt-close').onclick = () => { rulesOpen = false; render(); };
      root.querySelector('.httt-ready').onclick = () => { rulesOpen = false; render(); };

      render();
    },
  });
})();
