(() => {
  const $ = s => document.querySelector(s);
  const hub = $('#hub'), player = $('#player'), grid = $('#grid'), search = $('#search'), chips = $('#chips'), muteBtn = $('#mute');
  const ui = { stage: $('#stage'), score: $('#score'), best: $('#best'), overlay: $('#overlay') };
  const CATS = { all: 'Todos', arcade: 'Arcade', puzzle: 'Puzzle', estrategia: 'Estrategia', mesa: 'Cartas y dados', palabras: 'Palabras' };
  let filter = 'all', current = null, api = null;

  /* ---------- Hub ---------- */
  chips.innerHTML = Object.entries(CATS).map(([k, v]) => `<button class="chip${k === 'all' ? ' on' : ''}" data-cat="${k}">${v}</button>`).join('');
  chips.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    filter = b.dataset.cat;
    chips.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === b));
    renderHub();
  });
  search.addEventListener('input', renderHub);

  function renderHub() {
    const q = search.value.trim().toLowerCase();
    const list = Arcade.games.filter(g => (filter === 'all' || g.cat === filter) && (!q || (g.name + ' ' + g.desc).toLowerCase().includes(q)));
    grid.innerHTML = list.map((g, i) => {
      const b = g.best ? Arcade.store.get(g.id) : null;
      return `<a class="card-game" href="#/${g.id}" style="--c:${g.color};animation-delay:${i * 35}ms">
        <div class="card-art"><span>${g.emoji}</span></div>
        <div class="card-body">
          <h3>${g.name}</h3><p>${g.desc}</p>
          <div class="card-meta"><span class="tag">${CATS[g.cat]}</span>${b !== null ? `<span class="best-tag">🏆 ${Arcade.fmt(g, b)}</span>` : ''}</div>
        </div></a>`;
    }).join('') || '<p class="empty">No hay juegos con ese nombre 😢</p>';
  }

  /* ---------- Reproductor ---------- */
  function start() {
    if (api) api.dispose();
    ui.stage.innerHTML = ''; ui.overlay.innerHTML = ''; ui.overlay.hidden = true;
    ui.score.textContent = '0';
    api = Arcade.createApi(current, ui, start);
    api.showBest();
    current.start(ui.stage, api);
  }
  function open(g) {
    current = g;
    hub.hidden = true; player.hidden = false;
    $('#game-title').innerHTML = `<span>${g.emoji}</span> ${g.name}`;
    $('#controls').textContent = '🎮 ' + g.controls;
    document.title = g.name + ' · Arcadia';
    window.scrollTo(0, 0);
    start();
  }
  function close() {
    if (api) api.dispose();
    api = null; current = null;
    ui.stage.innerHTML = ''; ui.overlay.hidden = true;
    player.hidden = true; hub.hidden = false;
    document.title = 'Arcadia · Sala de juegos';
    renderHub();
  }
  function route() {
    const id = location.hash.replace(/^#\/?/, '');
    const g = Arcade.games.find(x => x.id === id);
    g ? open(g) : close();
  }

  $('#back').onclick = () => { location.hash = ''; };
  $('#restart').onclick = e => { e.currentTarget.blur(); if (current) start(); };
  muteBtn.textContent = Arcade.muted ? '🔇' : '🔊';
  muteBtn.onclick = () => { muteBtn.textContent = Arcade.toggleMute() ? '🔇' : '🔊'; muteBtn.blur(); };

  window.addEventListener('keydown', e => {
    if (player.hidden) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key) && !e.target.matches('input,textarea')) e.preventDefault();
    if (e.key === 'Escape') location.hash = '';
  });
  window.addEventListener('hashchange', route);
  route();
})();
