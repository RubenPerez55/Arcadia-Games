# 🕹️ Arcadia - Sala de Juegos Web

Colección completa de 21 juegos clásicos programados en **HTML5, CSS3 y JavaScript moderno nativo** (sin dependencias ni frameworks externos).

## 🎮 Catálogo de Juegos

| Juego | Categoría | Tipo | Descripción |
|---|---|---|---|
| ⚡ **Hardcore Tic-Tac-Toe** | Estrategia | DOM | Gato infinito sin empates: máximo 3 fichas por jugador; al poner la 4ª, tu ficha más antigua se evapora. Con Bot Minimax (Fácil/Medio/Hardcore). |
| ♠️ **Blackjack 21** | Casino | DOM | Apuesta con fichas, pide carta, plántate o dobla (Double Down) contra el crupier. Blackjack natural paga 3:2. |
| 🃏 **Video Póker** | Casino | DOM | Póker de 5 cartas (Jacks or Better) con retención de cartas (HOLD), cambio y tabla de premios hasta ×250. |
| 🎡 **Ruleta Europea** | Casino | Canvas / DOM | Cilindro europeo animado de 37 números y tapete completo (plenos 35:1, docenas 2:1, rojo/negro, par/impar). |
| 🎰 **Slots 777** | Casino | DOM | Máquina tragamonedas 3×3 con 5 líneas de pago activas (horizontales y diagonales) y bote 777. |
| 💎 **Minas VIP** | Casino | DOM | Juego de casino estilo Crash/Mines: destapa diamantes multiplicando tu apuesta y retira tus ganancias (Cashout) cuando quieras. |
| 🐍 **Snake** | Arcade | Canvas 2D | El clásico de la serpiente: come manzanas, crece y esquiva bordes. |
| 🐔 **Crossy Road** | Arcade | Canvas 2D | Cruza calles con autos y ríos con troncos en un mundo infinito generado proceduralmente. |
| 🟦 **Tetris** | Puzzle | Canvas 2D | Con bolsa aleatoria de 7 piezas, pieza fantasma y aumento de velocidad por nivel. |
| 🐤 **Flappy Bird** | Arcade | Canvas 2D | Vuela entre tuberías con físicas de gravedad y parallax. |
| 🧱 **Breakout** | Arcade | Canvas 2D | Rompe bloques con pelota y paleta, efectos de rebote según ángulo y partículas. |
| 🏓 **Pong** | Arcade | Canvas 2D | Tenis de mesa clásico con IA adaptable contra la computadora. |
| ❌ **Gato (Tic Tac Toe)** | Estrategia | DOM | 1 vs 1 local o contra CPU con algoritmo Minimax. |
| 🔴 **Conecta 4** | Estrategia | DOM | 4 en línea con IA inteligente (Negamax y poda Alpha-Beta). |
| 🪢 **Ahorcado** | Palabras | SVG / DOM | Banco de palabras temáticas (incluyendo gastronomía yucateca), soporte para teclado y racha. |
| 🃏 **Solitario (Klondike)** | Mesa | DOM | Modo tradicional con clic inteligente (auto-movimiento), arrastrar y soltar, y auto-completado. |
| 🎲 **Yatzy** | Mesa | DOM | Reglas completas con 15 categorías, bono superior, retención de dados y puntuaciones tentativas. |
| 🔢 **2048** | Puzzle | DOM | Desliza y combina fichas numéricas con animaciones y detección de victoria. |
| 💣 **Buscaminas** | Puzzle | DOM | Campo de 9x9 con primer clic seguro, banderas, cronómetro y apertura en cascada. |
| 🧠 **Memorama** | Puzzle | DOM | Encuentra todas las parejas de cartas en 3D con contador de movimientos. |
| 🔴 **Simón Dice** | Puzzle | DOM | Secuencias de luces y tonos musicales con velocidad incremental. |

## 🚀 Cómo jugar

Solo abre el archivo [`arcade/index.html`](index.html) en cualquier navegador moderno:

- **Doble clic** en `index.html` directamente en tu explorador de archivos / Finder.
- O iniciando un servidor local si lo prefieres:
  ```bash
  cd arcade
  npx serve .
  # o con Python:
  python3 -m http.server 8080
  ```

## ✨ Características
- **Audio Sintetizado con Web Audio API**: Beeps retro generados dinámicamente sin necesidad de archivos mp3 externos.
- **Récords Locales (High Scores)**: Tus mejores puntuaciones se guardan automáticamente en `localStorage`.
- **Diseño Adaptativo (Mobile & Desktop)**: Soporte completo para teclado físico, clics de mouse y gestos táctiles (swipe / touch) en pantallas móviles.
- **Buscador y Filtro por Categorías**: Navegación instantánea en la sala de juegos.
