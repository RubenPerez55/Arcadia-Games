(() => {
  Arcade.register({
    id: '2048', name: '2048', emoji: '🔢', cat: 'puzzle', best: 'high', color: '#eab308',
    desc: 'Desliza las fichas y combínalas para alcanzar el codiciado bloque 2048.',
    controls: 'Flechas / WASD · desliza en pantalla móvil',
    start(root, api) {
      const N = 4;
      let grid = [...Array(N)].map(() => Array(N).fill(0));
      let score = 0, won = false, over = false;

      root.innerHTML = `<div class="g2048">
        <div class="g2048-grid">${Array.from({ length: N * N }, (_, i) => `<div class="g2048-cell" data-idx="${i}"></div>`).join('')}</div>
      </div>`;
      const cells = [...root.querySelectorAll('.g2048-cell')];

      function spawn() {
        const empty = [];
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            if (grid[r][c] === 0) empty.push({ r, c });
          }
        }
        if (!empty.length) return false;
        const cell = pick(empty);
        grid[cell.r][cell.c] = Math.random() < 0.9 ? 2 : 4;
        return cell;
      }

      function render(popCoord = null) {
        cells.forEach((el, idx) => {
          const r = Math.floor(idx / N), c = idx % N;
          const v = grid[r][c];
          el.textContent = v ? v : '';
          el.className = 'g2048-cell' + (v ? ` tile-${v <= 2048 ? v : 'super'}` : '');
          if (popCoord && popCoord.r === r && popCoord.c === c) {
            el.classList.add('pop');
          }
        });
      }

      function slide(row) {
        let arr = row.filter(v => v !== 0);
        let gained = 0;
        for (let i = 0; i < arr.length - 1; i++) {
          if (arr[i] === arr[i + 1]) {
            arr[i] *= 2;
            gained += arr[i];
            arr.splice(i + 1, 1);
          }
        }
        while (arr.length < N) arr.push(0);
        return { arr, gained };
      }

      function canMove() {
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            if (grid[r][c] === 0) return true;
            if (r < N - 1 && grid[r][c] === grid[r + 1][c]) return true;
            if (c < N - 1 && grid[r][c] === grid[r][c + 1]) return true;
          }
        }
        return false;
      }

      function move(dir) {
        if (over) return;
        let changed = false;
        let roundScore = 0;

        if (dir === 'left' || dir === 'right') {
          for (let r = 0; r < N; r++) {
            let row = grid[r].slice();
            if (dir === 'right') row.reverse();
            const { arr, gained } = slide(row);
            if (dir === 'right') arr.reverse();
            for (let c = 0; c < N; c++) {
              if (grid[r][c] !== arr[c]) changed = true;
              grid[r][c] = arr[c];
            }
            roundScore += gained;
          }
        } else if (dir === 'up' || dir === 'down') {
          for (let c = 0; c < N; c++) {
            let col = [grid[0][c], grid[1][c], grid[2][c], grid[3][c]];
            if (dir === 'down') col.reverse();
            const { arr, gained } = slide(col);
            if (dir === 'down') arr.reverse();
            for (let r = 0; r < N; r++) {
              if (grid[r][c] !== arr[r]) changed = true;
              grid[r][c] = arr[r];
            }
            roundScore += gained;
          }
        }

        if (changed) {
          score += roundScore;
          api.setScore(score);
          if (roundScore > 0) api.beep(520 + Math.min(roundScore, 1000), 0.05, 'triangle');
          else api.beep(320, 0.02);

          const added = spawn();
          render(added);

          // Check for 2048 win
          if (!won) {
            for (let r = 0; r < N; r++) {
              for (let c = 0; c < N; c++) {
                if (grid[r][c] === 2048) {
                  won = true;
                  api.win(`¡Lograste el bloque 2048!<br>Puntuación: <b>${score}</b>`);
                }
              }
            }
          }

          if (!canMove()) {
            over = true;
            api.timeout(() => api.gameOver(`No quedan más movimientos.<br>Puntos: <b>${score}</b>`), 300);
          }
        }
      }

      const KEYS = {
        arrowup: 'up', w: 'up',
        arrowdown: 'down', s: 'down',
        arrowleft: 'left', a: 'left',
        arrowright: 'right', d: 'right'
      };

      api.on(window, 'keydown', e => {
        const k = KEYS[e.key.toLowerCase()];
        if (k) {
          e.preventDefault();
          move(k);
        }
      });

      api.swipe(root.querySelector('.g2048-grid'), d => {
        if (['up', 'down', 'left', 'right'].includes(d)) move(d);
      });

      // Init board
      spawn();
      spawn();
      render();
    },
  });
})();
