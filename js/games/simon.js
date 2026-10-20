(() => {
  const COLORS = [
    { id: 'g', name: 'Verde', freq: 392 },
    { id: 'r', name: 'Rojo', freq: 329.63 },
    { id: 'y', name: 'Amarillo', freq: 261.63 },
    { id: 'b', name: 'Azul', freq: 440 },
  ];

  Arcade.register({
    id: 'simon', name: 'Simón Dice', emoji: '🔴', cat: 'puzzle', best: 'high', color: '#3b82f6',
    desc: 'Pon a prueba tu memoria siguiendo la secuencia de luces y sonidos.',
    controls: 'Observa la secuencia y repítela tocando los colores correspondientes',
    start(root, api) {
      let sequence = [], userStep = 0, playing = false, strict = false, round = 0;

      root.innerHTML = `<div class="simon">
        <div class="simon-board">
          ${COLORS.map(c => `<button class="simon-pad ${c.id}" data-id="${c.id}"></button>`).join('')}
          <div class="simon-center">
            <span>RONDA</span>
            <b class="simon-round">--</b>
          </div>
        </div>
      </div>`;

      const pads = {};
      COLORS.forEach(c => { pads[c.id] = root.querySelector(`.simon-pad.${c.id}`); });
      const roundEl = root.querySelector('.simon-round');

      function light(id, duration = 300) {
        const c = COLORS.find(x => x.id === id);
        const pad = pads[id];
        if (!pad) return;
        pad.classList.add('lit');
        api.beep(c.freq, duration / 1000, 'sine', 0.08);
        api.timeout(() => {
          pad.classList.remove('lit');
        }, duration);
      }

      function nextRound() {
        round++;
        roundEl.textContent = String(round).padStart(2, '0');
        api.setScore(round - 1);
        sequence.push(pick(COLORS).id);
        userStep = 0;
        playing = false;

        api.timeout(playSequence, 800);
      }

      function playSequence() {
        let i = 0;
        const speed = Math.max(220, 500 - round * 18);
        const interval = api.interval(() => {
          if (i < sequence.length) {
            light(sequence[i], speed * 0.75);
            i++;
          } else {
            interval();
            playing = true;
          }
        }, speed);
      }

      function handleInput(id) {
        if (!playing) return;

        light(id, 250);

        if (id === sequence[userStep]) {
          userStep++;
          if (userStep === sequence.length) {
            playing = false;
            api.timeout(nextRound, 700);
          }
        } else {
          // Error
          playing = false;
          api.beep(120, 0.4, 'sawtooth', 0.08);
          roundEl.textContent = '!!';
          const finalScore = round - 1;
          api.timeout(() => {
            api.gameOver(`Te equivocaste en la ronda ${round}.<br>Puntos totales: <b>${finalScore}</b>`);
          }, 600);
        }
      }

      COLORS.forEach(c => {
        pads[c.id].addEventListener('click', () => handleInput(c.id));
      });

      api.overlay('🔴 Simón Dice', 'Memoriza el patrón de colores y sonidos y repítelo en orden.', 'Comenzar', () => {
        nextRound();
      });
    },
  });
})();
