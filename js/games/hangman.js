(() => {
  const BANK = {
    animales: ['ELEFANTE', 'JIRAFA', 'COCODRILO', 'MARIPOSA', 'PINGUINO', 'TORTUGA', 'CANGURO', 'DELFIN', 'HIPOPOTAMO', 'MURCIELAGO', 'ARDILLA', 'CAMALEON', 'FLAMENCO', 'JAGUAR', 'IGUANA'],
    frutas: ['MANZANA', 'PLATANO', 'FRESA', 'SANDIA', 'MANGO', 'PIÑA', 'MARACUYA', 'GUAYABA', 'MANDARINA', 'CEREZA', 'PAPAYA', 'GUANABANA', 'MAMEY', 'PITAHAYA'],
    'países': ['MEXICO', 'ARGENTINA', 'JAPON', 'CANADA', 'ALEMANIA', 'PORTUGAL', 'AUSTRALIA', 'COLOMBIA', 'EGIPTO', 'NORUEGA', 'MARRUECOS', 'TAILANDIA', 'ESPAÑA'],
    'tecnología': ['COMPUTADORA', 'TECLADO', 'INTERNET', 'ALGORITMO', 'PROGRAMA', 'PANTALLA', 'SERVIDOR', 'VARIABLE', 'FUNCION', 'BASE DE DATOS', 'NAVEGADOR', 'ROBOT'],
    'comida yucateca': ['COCHINITA PIBIL', 'PANUCHOS', 'SALBUTES', 'PAPADZULES', 'MARQUESITAS', 'RELLENO NEGRO', 'POC CHUC', 'SOPA DE LIMA', 'TAMALES', 'HORCHATA'],
    deportes: ['FUTBOL', 'BALONCESTO', 'BEISBOL', 'NATACION', 'CICLISMO', 'VOLEIBOL', 'AJEDREZ', 'ATLETISMO', 'BOXEO', 'TENIS'],
  };
  const LETTERS = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');
  const MAX = 6;
  let streak = 0;

  Arcade.register({
    id: 'ahorcado', name: 'Ahorcado', emoji: '🪢', cat: 'palabras', best: 'high', color: '#8b5cf6',
    desc: 'Adivina la palabra letra por letra antes de completar al muñeco.',
    controls: 'Escribe con tu teclado o toca las letras · los puntos son tu racha de palabras',
    start(root, api) {
      const cat = pick(Object.keys(BANK)), word = pick(BANK[cat]);
      const guessed = new Set();
      let errors = 0, done = false;
      api.setScore(streak);

      root.innerHTML = `<div class="hang">
        <svg viewBox="0 0 200 220" class="hang-svg">
          <g class="gallows"><line x1="20" y1="210" x2="140" y2="210"/><line x1="50" y1="210" x2="50" y2="15"/><line x1="50" y1="15" x2="140" y2="15"/><line x1="140" y1="15" x2="140" y2="40"/><line x1="50" y1="50" x2="85" y2="15"/></g>
          <circle class="part" cx="140" cy="60" r="20"/>
          <line class="part" x1="140" y1="80" x2="140" y2="140"/>
          <line class="part" x1="140" y1="95" x2="115" y2="122"/>
          <line class="part" x1="140" y1="95" x2="165" y2="122"/>
          <line class="part" x1="140" y1="140" x2="118" y2="182"/>
          <line class="part" x1="140" y1="140" x2="162" y2="182"/>
        </svg>
        <div class="hang-side">
          <div class="hang-cat">Categoría: <b>${cat}</b></div>
          <div class="hang-word"></div>
          <div class="hang-lives"></div>
          <div class="kbd">${LETTERS.map(l => `<button class="key" data-l="${l}">${l}</button>`).join('')}</div>
        </div></div>`;
      const parts = [...root.querySelectorAll('.part')], wordEl = root.querySelector('.hang-word'), livesEl = root.querySelector('.hang-lives');

      function render(reveal = false) {
        wordEl.innerHTML = [...word].map(ch => ch === ' ' ? '<span class="gap"></span>'
          : `<span class="${!guessed.has(ch) && reveal ? 'miss' : ''}">${guessed.has(ch) || reveal ? ch : ''}</span>`).join('');
        livesEl.textContent = '❤️'.repeat(MAX - errors) + '🖤'.repeat(errors);
        parts.forEach((p, i) => p.classList.toggle('show', i < errors));
      }
      function guess(l) {
        if (done || guessed.has(l)) return;
        guessed.add(l);
        const key = root.querySelector(`[data-l="${l}"]`);
        key.disabled = true;
        if (word.includes(l)) { key.classList.add('hit'); api.beep(660, 0.06, 'triangle'); }
        else { key.classList.add('miss'); errors++; api.beep(200, 0.1, 'sawtooth', 0.03); }
        render();
        if ([...word].every(ch => ch === ' ' || guessed.has(ch))) {
          done = true; streak++; api.setScore(streak);
          api.beep(880, 0.15, 'triangle');
          api.timeout(() => api.overlay('¡Correcto! 🎉', `La palabra era <b>${word}</b>.<br>Racha actual: ${streak}`, 'Siguiente palabra', api.restart), 500);
        } else if (errors >= MAX) {
          done = true; render(true);
          const s = streak; streak = 0;
          api.timeout(() => api.gameOver(`La palabra era <b>${word}</b>.<br>Tu racha fue de ${s} palabra${s === 1 ? '' : 's'}.`), 700);
        }
      }
      root.querySelector('.kbd').addEventListener('click', e => { const k = e.target.closest('.key'); if (k) guess(k.dataset.l); });
      api.on(window, 'keydown', e => { const l = e.key.toUpperCase(); if (LETTERS.includes(l)) guess(l); });
      render();
    },
  });
})();
