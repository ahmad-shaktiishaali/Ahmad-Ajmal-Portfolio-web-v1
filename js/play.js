document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('currentYear').textContent = new Date().getFullYear();
  hidePreloader();
});

const GAMES = [
  {
    id: 'snake',
    title: 'Snake',
    desc: 'Classic snake game. Eat food, grow longer, avoid walls.',
    icon: '🐍'
  },
  {
    id: 'tictactoe',
    title: 'Tic Tac Toe',
    desc: 'Play against a simple AI. Get three in a row to win.',
    icon: '✕'
  },
  {
    id: 'memory',
    title: 'Memory Match',
    desc: 'Flip cards and match pairs. Test your memory.',
    icon: '🧠'
  },
  {
    id: 'reaction',
    title: 'Reaction Time',
    desc: 'Click when the screen turns green. How fast are you?',
    icon: '⚡'
  }
];

function renderGameCards() {
  const grid = document.getElementById('gamesGrid');
  let html = '';
  GAMES.forEach((game, index) => {
    const delay = `reveal-delay-${(index % 3) + 1}`;
    html += `
      <div class="game-card reveal ${delay}" data-game="${game.id}">
        <div class="game-card-icon">${game.icon}</div>
        <h3 class="game-card-title">${game.title}</h3>
        <p class="game-card-desc">${game.desc}</p>
        <button class="btn-play" data-game="${game.id}">Play <span>→</span></button>
      </div>
    `;
  });
  grid.innerHTML = html;

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-play');
    if (btn) launchGame(btn.dataset.game);
  });

  if (typeof initScrollReveal === 'function') setTimeout(initScrollReveal, 100);
}

function launchGame(gameId) {
  document.getElementById('gamesGrid').style.display = 'none';
  document.querySelector('.play-hero').style.display = 'none';
  const container = document.getElementById('gameContainer');
  container.style.display = 'block';

  const title = GAMES.find(g => g.id === gameId).title;
  document.getElementById('gameTitle').textContent = title;
  document.getElementById('gameScore').textContent = '';

  const area = document.getElementById('gameArea');
  area.innerHTML = '';

  document.getElementById('gameBackBtn').onclick = () => {
    stopGame();
    container.style.display = 'none';
    document.getElementById('gamesGrid').style.display = '';
    document.querySelector('.play-hero').style.display = '';
    document.getElementById('gameArea').innerHTML = '';
    if (typeof initScrollReveal === 'function') setTimeout(initScrollReveal, 100);
  };

  switch (gameId) {
    case 'snake': initSnake(area); break;
    case 'tictactoe': initTicTacToe(area); break;
    case 'memory': initMemory(area); break;
    case 'reaction': initReaction(area); break;
  }
}

function stopGame() {
  if (window._gameLoop) { clearTimeout(window._gameLoop); window._gameLoop = null; }
  if (window._gameInterval) { clearInterval(window._gameInterval); window._gameInterval = null; }
  if (window._gameRaf) { cancelAnimationFrame(window._gameRaf); window._gameRaf = null; }
  window._gameActive = false;
}

// ==================== SNAKE ====================
function initSnake(container) {
  const scoreEl = document.getElementById('gameScore');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  container.appendChild(canvas);

  const size = Math.min(400, window.innerWidth - 40);
  const grid = 20;
  const cells = Math.floor(size / grid);
  canvas.width = cells * grid;
  canvas.height = cells * grid;
  canvas.style.width = canvas.width + 'px';
  canvas.style.height = canvas.height + 'px';
  canvas.style.borderRadius = '12px';
  canvas.style.background = 'var(--bg-tertiary)';

  let snake = [{ x: 5, y: 5 }];
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };
  let food = { x: 10, y: 10 };
  let score = 0;
  let gameOver = false;
  window._gameActive = true;

  function placeFood() {
    while (true) {
      const fx = Math.floor(Math.random() * cells);
      const fy = Math.floor(Math.random() * cells);
      if (!snake.some(s => s.x === fx && s.y === fy)) {
        food = { x: fx, y: fy };
        break;
      }
    }
  }
  placeFood();

  function update() {
    if (!window._gameActive || gameOver) return;
    dir = { ...nextDir };
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (head.x < 0 || head.x >= cells || head.y < 0 || head.y >= cells || snake.some(s => s.x === head.x && s.y === head.y)) {
      gameOver = true;
      return;
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score++;
      scoreEl.textContent = 'Score: ' + score;
      placeFood();
    } else {
      snake.pop();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < snake.length; i++) {
      const s = snake[i];
      ctx.fillStyle = i === 0 ? 'var(--accent)' : 'rgba(200,169,81,0.6)';
      ctx.shadowColor = 'var(--accent)';
      ctx.shadowBlur = i === 0 ? 10 : 4;
      const pad = 1.5;
      ctx.beginPath();
      ctx.arc(s.x * grid + grid / 2, s.y * grid + grid / 2, grid / 2 - pad, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = '#e74c3c';
    ctx.shadowColor = '#e74c3c';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(food.x * grid + grid / 2, food.y * grid + grid / 2, grid / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'var(--accent)';
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 10);
      ctx.font = '14px Inter, sans-serif';
      ctx.fillStyle = 'var(--text-secondary)';
      ctx.fillText('Tap / Click to restart', canvas.width / 2, canvas.height / 2 + 20);
    }
  }

  function loop() {
    if (!gameOver) update();
    draw();
    window._gameLoop = setTimeout(loop, 140);
  }

  canvas.addEventListener('click', () => { if (gameOver) { snake = [{ x: 5, y: 5 }]; dir = { x: 1, y: 0 }; nextDir = { x: 1, y: 0 }; score = 0; gameOver = false; scoreEl.textContent = ''; placeFood(); } });
  window.addEventListener('keydown', (e) => {
    if (!window._gameActive) return;
    const k = e.key;
    if ((k === 'ArrowUp' || k === 'w') && dir.y !== 1) nextDir = { x: 0, y: -1 };
    if ((k === 'ArrowDown' || k === 's') && dir.y !== -1) nextDir = { x: 0, y: 1 };
    if ((k === 'ArrowLeft' || k === 'a') && dir.x !== 1) nextDir = { x: -1, y: 0 };
    if ((k === 'ArrowRight' || k === 'd') && dir.x !== -1) nextDir = { x: 1, y: 0 };
  });

  // Touch swipe
  let touchStart = null;
  canvas.addEventListener('touchstart', (e) => {
    if (gameOver) { snake = [{ x: 5, y: 5 }]; dir = { x: 1, y: 0 }; nextDir = { x: 1, y: 0 }; score = 0; gameOver = false; scoreEl.textContent = ''; placeFood(); return; }
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  canvas.addEventListener('touchend', (e) => {
    if (!touchStart || !window._gameActive) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0 && dir.x !== -1) nextDir = { x: 1, y: 0 };
      else if (dx < 0 && dir.x !== 1) nextDir = { x: -1, y: 0 };
    } else {
      if (dy > 0 && dir.y !== -1) nextDir = { x: 0, y: 1 };
      else if (dy < 0 && dir.y !== 1) nextDir = { x: 0, y: -1 };
    }
    touchStart = null;
  }, { passive: true });

  loop();
}

// ==================== TIC TAC TOE ====================
function initTicTacToe(container) {
  const scoreEl = document.getElementById('gameScore');
  const boardSize = Math.min(300, window.innerWidth - 60);
  const cellSize = boardSize / 3;

  const board = document.createElement('div');
  board.style.cssText = `display:grid;grid-template-columns:repeat(3,1fr);width:${boardSize}px;height:${boardSize}px;gap:4px;background:var(--bg-tertiary);border-radius:12px;padding:4px;`;
  container.appendChild(board);

  let state = ['', '', '', '', '', '', '', '', ''];
  let turn = 'X';
  let gameOver = false;
  let scores = { X: 0, O: 0 };
  scoreEl.textContent = 'You (X): ' + scores.X + '  AI (O): ' + scores.O;
  window._gameActive = true;

  function checkWinner(s) {
    const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a,b,c] of wins) {
      if (s[a] && s[a] === s[b] && s[a] === s[c]) return s[a];
    }
    if (s.every(c => c)) return 'draw';
    return null;
  }

  function aiMove() {
    const empty = state.map((c, i) => c === '' ? i : null).filter(i => i !== null);
    if (empty.length === 0) return;
    for (const i of empty) {
      const test = [...state]; test[i] = 'O';
      if (checkWinner(test) === 'O') { state[i] = 'O'; return; }
    }
    for (const i of empty) {
      const test = [...state]; test[i] = 'X';
      if (checkWinner(test) === 'X') { state[i] = 'O'; return; }
    }
    state[empty[Math.floor(Math.random() * empty.length)]] = 'O';
  }

  function render() {
    board.innerHTML = '';
    state.forEach((cell, i) => {
      const c = document.createElement('div');
      c.style.cssText = `display:flex;align-items:center;justify-content:center;font-size:2.5rem;font-weight:700;background:var(--bg-secondary);border-radius:8px;cursor:pointer;color:${cell === 'X' ? 'var(--accent)' : '#e74c3c'};transition:all 0.2s;`;
      c.textContent = cell;
      if (!cell && !gameOver && turn === 'X') {
        c.style.cursor = 'pointer';
        c.addEventListener('click', () => {
          if (state[i] || gameOver || turn !== 'X') return;
          state[i] = 'X';
          const w = checkWinner(state);
          if (w) {
            gameOver = true;
            if (w === 'X') scores.X++;
            if (w === 'O') scores.O++;
            if (w === 'draw') { scoreEl.textContent = 'Draw!  You (X): ' + scores.X + '  AI (O): ' + scores.O; render(); return; }
            scoreEl.textContent = 'You (X): ' + scores.X + '  AI (O): ' + scores.O;
            render();
            return;
          }
          turn = 'O';
          render();
          setTimeout(() => {
            if (window._gameActive && !gameOver) {
              aiMove();
              const w2 = checkWinner(state);
              if (w2) {
                gameOver = true;
                if (w2 === 'O') scores.O++;
                scoreEl.textContent = 'You (X): ' + scores.X + '  AI (O): ' + scores.O;
              }
              turn = 'X';
              render();
            }
          }, 300);
        });
      }
      board.appendChild(c);
    });
  }

  render();

  // Restart button
  const restart = document.createElement('button');
  restart.className = 'btn-secondary';
  restart.textContent = 'Restart';
  restart.style.marginTop = '1rem';
  restart.addEventListener('click', () => {
    state = ['', '', '', '', '', '', '', '', ''];
    turn = 'X';
    gameOver = false;
    render();
  });
  container.appendChild(restart);
}

// ==================== MEMORY MATCH ====================
function initMemory(container) {
  const scoreEl = document.getElementById('gameScore');
  const emojis = ['🍎','🍊','🍋','🍇','🍓','🫐','🍑','🍒'];
  const cards = [...emojis, ...emojis].sort(() => Math.random() - 0.5);
  let flipped = [];
  let matched = 0;
  let locked = false;
  let moves = 0;
  window._gameActive = true;
  scoreEl.textContent = 'Moves: 0';

  const grid = document.createElement('div');
  const cols = 4;
  const gap = 8;
  const cardSize = Math.min(70, (window.innerWidth - 80) / cols - gap);
  grid.style.cssText = `display:grid;grid-template-columns:repeat(${cols},${cardSize}px);gap:${gap}px;`;
  container.appendChild(grid);

  function render() {
    grid.innerHTML = '';
    cards.forEach((emoji, i) => {
      const card = document.createElement('div');
      const isFlipped = flipped.includes(i) || cards[i] === '';
      card.style.cssText = `width:${cardSize}px;height:${cardSize}px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.8rem;cursor:pointer;transition:all 0.3s;background:${isFlipped ? 'var(--bg-secondary)' : 'var(--accent)'};transform:${isFlipped ? 'rotateY(0deg)' : 'rotateY(0deg)'};border:1px solid var(--border);`;
      if (cards[i] === '') {
        card.style.visibility = 'hidden';
      } else if (isFlipped) {
        card.textContent = emoji;
      }
      card.addEventListener('click', () => {
        if (locked || flipped.includes(i) || cards[i] === '' || flipped.length >= 2) return;
        flipped.push(i);
        moves++;
        scoreEl.textContent = 'Moves: ' + moves;
        render();
        if (flipped.length === 2) {
          locked = true;
          const [a, b] = flipped;
          if (cards[a] === cards[b]) {
            cards[a] = '';
            cards[b] = '';
            matched += 2;
            flipped = [];
            locked = false;
            render();
            if (matched === cards.length) {
              scoreEl.textContent = 'You won in ' + moves + ' moves! 🎉';
            }
          } else {
            setTimeout(() => {
              flipped = [];
              locked = false;
              render();
            }, 800);
          }
        }
      });
      grid.appendChild(card);
    });
  }
  render();

  const restart = document.createElement('button');
  restart.className = 'btn-secondary';
  restart.textContent = 'Restart';
  restart.style.marginTop = '1rem';
  restart.addEventListener('click', () => {
    cards.length = 0;
    cards.push(...[...emojis, ...emojis].sort(() => Math.random() - 0.5));
    flipped = [];
    matched = 0;
    locked = false;
    moves = 0;
    scoreEl.textContent = 'Moves: 0';
    render();
  });
  container.appendChild(restart);
}

// ==================== REACTION TIME ====================
function initReaction(container) {
  const scoreEl = document.getElementById('gameScore');
  const area = document.createElement('div');
  area.style.cssText = `width:100%;max-width:400px;height:300px;border-radius:16px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background 0.15s;background:var(--bg-tertiary);border:1px solid var(--border);font-family:Inter,sans-serif;font-size:1.1rem;color:var(--text-secondary);text-align:center;padding:2rem;user-select:none;`;
  area.textContent = 'Click / Tap when the screen turns green';
  container.appendChild(area);

  let state = 'waiting'; // waiting | ready | go | result
  let startTime = 0;
  let best = Infinity;
  let timeout = null;
  window._gameActive = true;
  scoreEl.textContent = best === Infinity ? 'Best: —' : 'Best: ' + best + 'ms';

  function reset() {
    if (timeout) clearTimeout(timeout);
    state = 'waiting';
    area.style.background = 'var(--bg-tertiary)';
    area.textContent = 'Click / Tap to start';
    area.style.color = 'var(--text-secondary)';
  }

  function startRound() {
    state = 'ready';
    area.style.background = '#e74c3c';
    area.textContent = 'Wait for green...';
    area.style.color = '#fff';
    const delay = 1000 + Math.random() * 3000;
    timeout = setTimeout(() => {
      if (state !== 'ready') return;
      state = 'go';
      startTime = performance.now();
      area.style.background = '#2ecc71';
      area.textContent = 'Click / Tap NOW!';
      area.style.color = '#fff';
    }, delay);
  }

  area.addEventListener('click', () => {
    if (!window._gameActive) return;
    if (state === 'waiting') {
      startRound();
    } else if (state === 'ready') {
      if (timeout) clearTimeout(timeout);
      area.textContent = 'Too early! Click to retry';
      area.style.background = 'var(--bg-tertiary)';
      area.style.color = 'var(--text-secondary)';
      state = 'waiting';
    } else if (state === 'go') {
      const t = Math.round(performance.now() - startTime);
      if (t < best) best = t;
      scoreEl.textContent = 'Best: ' + best + 'ms';
      area.textContent = t + ' ms  —  Click to try again';
      area.style.background = 'var(--bg-tertiary)';
      area.style.color = 'var(--text-secondary)';
      state = 'waiting';
    }
  });

  reset();
}

document.addEventListener('DOMContentLoaded', () => {
  renderGameCards();
});
