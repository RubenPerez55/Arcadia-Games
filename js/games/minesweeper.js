(() => {
  Arcade.register({
    id: 'buscaminas', name: 'Buscaminas', emoji: '💣', cat: 'puzzle', best: 'low', unit: 's', color: '#64748b',
    desc: 'Despeja el campo minado usando las pistas numéricas sin pisar ninguna mina.',
    controls: 'Clic izquierdo: revelar · Clic derecho / pulsación larga: bandera',
    start(root, api) {
      const ROWS = 9, COLS = 9, MINES = 10;
      let grid = [], firstClick = true, over = false, flags = 0, timer = 0, timerId = null, revealedCount = 0;

      root.innerHTML = `<div class="ms">
        <div class="ms-header">
          <div class="ms-counter ms-mines">${String(MINES).padStart(3, '0')}</div>
          <button class="ms-face">😊</button>
          <div class="ms-counter ms-time">000</div>
        </div>
        <div class="ms-board" style="grid-template-columns: repeat(${COLS}, 34px);">${Array.from({ length: ROWS * COLS }, (_, i) => `<button class="ms-cell" data-idx="${i}"></button>`).join('')}</div>
      </div>`;

      const faceBtn = root.querySelector('.ms-face');
      const minesCounter = root.querySelector('.ms-mines');
      const timeCounter = root.querySelector('.ms-time');
      const cells = [...root.querySelectorAll('.ms-cell')];

      function initGrid() {
        grid = [];
        for (let r = 0; r < ROWS; r++) {
          const row = [];
          for (let c = 0; c < COLS; c++) {
            row.push({ mine: false, count: 0, rev: false, flag: false });
          }
          row.forEach(cell => {});
          grid.push(row);
        }
      }

      function placeMines(safeR, safeC) {
        let placed = 0;
        while (placed < MINES) {
          const r = rnd(ROWS), c = rnd(COLS);
          if ((Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) || grid[r][c].mine) continue;
          grid[r][c].mine = true;
          placed++;
        }
        for (let r = 0; r < ROWS; r++) {
          for (let c = 0; c < COLS; c++) {
            if (grid[r][c].mine) continue;
            let count = 0;
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr, nc = c + dc;
                if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[nr][nc].mine) count++;
              }
            }
            grid[r][c].count = count;
          }
        }
      }

      function startTimer() {
        if (timerId) return;
        timerId = api.interval(() => {
          timer++;
          timeCounter.textContent = String(Math.min(999, timer)).padStart(3, '0');
          api.setScore(timer);
        }, 1000);
      }

      function reveal(r, c) {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
        const cell = grid[r][c];
        if (cell.rev || cell.flag) return;

        cell.rev = true;
        revealedCount++;
        const el = cells[r * COLS + c];
        el.classList.add('rev');

        if (cell.mine) {
          el.classList.add('bomb-hit');
          el.textContent = '💥';
          endGame(false);
          return;
        }

        if (cell.count > 0) {
          el.textContent = cell.count;
          el.classList.add('c' + cell.count);
        } else {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              reveal(r + dr, c + dc);
            }
          }
        }
      }

      function toggleFlag(r, c) {
        const cell = grid[r][c];
        if (cell.rev || over) return;
        cell.flag = !cell.flag;
        flags += cell.flag ? 1 : -1;
        minesCounter.textContent = String(Math.max(-99, MINES - flags)).padStart(3, '0');
        const el = cells[r * COLS + c];
        el.textContent = cell.flag ? '🚩' : '';
        api.beep(cell.flag ? 480 : 360, 0.04, 'triangle');
      }

      function checkWin() {
        if (revealedCount === (ROWS * COLS) - MINES && !over) {
          endGame(true);
        }
      }

      function endGame(won) {
        over = true;
        faceBtn.textContent = won ? '😎' : '💀';
        // Reveal all mines
        grid.forEach((row, r) => row.forEach((cell, c) => {
          const el = cells[r * COLS + c];
          if (cell.mine && !cell.flag) {
            if (!won && !el.classList.contains('bomb-hit')) el.textContent = '💣';
          } else if (!cell.mine && cell.flag) {
            el.textContent = '❌';
          }
        }));

        if (won) {
          api.win(`¡Despejaste todas las minas en <b>${timer}s</b>!`);
        } else {
          api.gameOver(`Pisaste una mina tras ${timer} segundos.`);
        }
      }

      // Interaction
      cells.forEach((el, idx) => {
        const r = Math.floor(idx / COLS), c = idx % COLS;

        // Click / Reveal
        el.addEventListener('click', e => {
          if (over || grid[r][c].flag) return;
          if (firstClick) {
            firstClick = false;
            placeMines(r, c);
            startTimer();
          }
          api.beep(580, 0.03);
          reveal(r, c);
          checkWin();
        });

        // Right click / Flag
        el.addEventListener('contextmenu', e => {
          e.preventDefault();
          toggleFlag(r, c);
        });

        // Touch hold for mobile flagging
        let pressTimer = null;
        el.addEventListener('touchstart', e => {
          if (over || grid[r][c].rev) return;
          pressTimer = setTimeout(() => {
            toggleFlag(r, c);
            pressTimer = null;
          }, 450);
        }, { passive: true });
        el.addEventListener('touchend', () => {
          if (pressTimer) clearTimeout(pressTimer);
        }, { passive: true });
      });

      faceBtn.onclick = () => api.restart();
      initGrid();
    },
  });
})();
