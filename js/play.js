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
  },
  {
    id: 'rps',
    title: 'Rock Paper Scissors',
    desc: 'Classic hand game. Choose your move and beat the computer.',
    icon: '✊'
  },
  {
    id: 'guess',
    title: 'Number Guessing',
    desc: 'Guess the secret number between 1 and 100.',
    icon: '🔢'
  },
  {
    id: 'dice',
    title: 'Dice Roller',
    desc: 'Roll the dice and try to beat the computer\'s score.',
    icon: '🎲'
  },
  {
    id: 'simon',
    title: 'Simon Says',
    desc: 'Remember the color sequence and repeat it. How long can you go?',
    icon: '🔴'
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
    case 'rps': initRPS(area); break;
    case 'guess': initGuess(area); break;
    case 'dice': initDice(area); break;
    case 'simon': initSimon(area); break;
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

// ==================== ROCK PAPER SCISSORS ====================
function initRPS(container) {
  const scoreEl = document.getElementById('gameScore');
  const choices = ['rock', 'paper', 'scissors'];
  const emojis = { rock: '✊', paper: '✋', scissors: '✌️' };
  let playerScore = 0, compScore = 0;
  window._gameActive = true;

  const result = document.createElement('div');
  result.style.cssText = 'text-align:center;min-height:120px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.5rem;';

  const picks = document.createElement('div');
  picks.style.cssText = 'display:flex;gap:2rem;align-items:center;font-size:1.2rem;';

  const msg = document.createElement('div');
  msg.style.cssText = 'font-size:0.9rem;color:var(--text-secondary);';

  const btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:0.75rem;margin-top:1rem;';

  choices.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'btn-play';
    btn.style.cssText = 'font-size:1.5rem;padding:0.5rem 1rem;min-width:70px;';
    btn.textContent = emojis[c];
    btn.addEventListener('click', () => {
      const comp = choices[Math.floor(Math.random() * 3)];
      const win = (c === 'rock' && comp === 'scissors') || (c === 'paper' && comp === 'rock') || (c === 'scissors' && comp === 'paper');
      const draw = c === comp;
      picks.innerHTML = `You ${emojis[c]} &nbsp;&nbsp;vs&nbsp;&nbsp; ${emojis[comp]} Computer`;
      if (draw) { msg.textContent = 'Draw! 🤝'; msg.style.color = 'var(--accent)'; }
      else if (win) { msg.textContent = 'You win! 🎉'; msg.style.color = '#2ecc71'; playerScore++; }
      else { msg.textContent = 'Computer wins! 😔'; msg.style.color = '#e74c3c'; compScore++; }
      scoreEl.textContent = `You ${playerScore} - ${compScore} Computer`;
    });
    btns.appendChild(btn);
  });

  result.appendChild(picks);
  result.appendChild(msg);
  container.appendChild(result);
  container.appendChild(btns);

  picks.innerHTML = 'Choose your move';
  msg.textContent = 'Best of luck!';
}

// ==================== NUMBER GUESSING ====================
function initGuess(container) {
  const scoreEl = document.getElementById('gameScore');
  let secret = Math.floor(Math.random() * 100) + 1;
  let attempts = 0;
  window._gameActive = true;

  const area = document.createElement('div');
  area.style.cssText = 'text-align:center;width:100%;max-width:350px;';

  const hint = document.createElement('p');
  hint.style.cssText = 'color:var(--text-secondary);font-size:0.85rem;margin-bottom:1rem;';
  hint.textContent = 'Guess a number between 1 and 100';

  const input = document.createElement('input');
  input.type = 'number';
  input.min = 1;
  input.max = 100;
  input.placeholder = 'Enter your guess';
  input.style.cssText = 'width:100%;padding:0.75rem;border-radius:12px;border:1px solid var(--border);background:var(--bg-tertiary);color:var(--text-primary);font-size:1rem;text-align:center;margin-bottom:0.75rem;outline:none;';

  const btn = document.createElement('button');
  btn.className = 'btn-play';
  btn.textContent = 'Guess';

  const feedback = document.createElement('p');
  feedback.style.cssText = 'font-size:0.9rem;min-height:1.5rem;margin-top:0.75rem;';

  const restart = document.createElement('button');
  restart.className = 'btn-secondary';
  restart.textContent = 'New Game';
  restart.style.marginTop = '0.75rem';

  btn.addEventListener('click', () => {
    const val = parseInt(input.value);
    if (!val || val < 1 || val > 100) { feedback.textContent = 'Enter a number between 1-100'; feedback.style.color = 'var(--accent)'; return; }
    attempts++;
    if (val === secret) {
      feedback.textContent = `Correct! 🎉 You got it in ${attempts} ${attempts === 1 ? 'try' : 'tries'}!`;
      feedback.style.color = '#2ecc71';
      scoreEl.textContent = 'You won!';
      btn.disabled = true;
    } else if (val < secret) {
      feedback.textContent = 'Too low! 📉';
      feedback.style.color = 'var(--accent)';
    } else {
      feedback.textContent = 'Too high! 📈';
      feedback.style.color = 'var(--accent)';
    }
    scoreEl.textContent = 'Attempts: ' + attempts;
  });

  restart.addEventListener('click', () => {
    secret = Math.floor(Math.random() * 100) + 1;
    attempts = 0;
    input.value = '';
    feedback.textContent = '';
    scoreEl.textContent = '';
    btn.disabled = false;
  });

  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') btn.click(); });

  area.appendChild(hint);
  area.appendChild(input);
  area.appendChild(btn);
  area.appendChild(feedback);
  area.appendChild(restart);
  container.appendChild(area);
}

// ==================== DICE ROLLER ====================
function initDice(container) {
  const scoreEl = document.getElementById('gameScore');
  let playerTotal = 0, compTotal = 0, rolls = 0;
  window._gameActive = true;

  const display = document.createElement('div');
  display.style.cssText = 'text-align:center;';

  const diceArea = document.createElement('div');
  diceArea.style.cssText = 'display:flex;gap:2rem;justify-content:center;align-items:center;font-size:4rem;margin:1rem 0;';

  const youDice = document.createElement('div');
  youDice.textContent = '🎲';
  const compDice = document.createElement('div');
  compDice.textContent = '🎲';

  const vs = document.createElement('div');
  vs.style.cssText = 'font-size:1rem;color:var(--text-muted);';
  vs.textContent = 'vs';

  diceArea.appendChild(youDice);
  diceArea.appendChild(vs);
  diceArea.appendChild(compDice);

  const btn = document.createElement('button');
  btn.className = 'btn-play';
  btn.textContent = 'Roll Dice 🎲';
  btn.style.marginTop = '0.5rem';

  const result = document.createElement('p');
  result.style.cssText = 'font-size:0.9rem;color:var(--text-secondary);margin-top:0.75rem;min-height:1.5rem;';

  const restart = document.createElement('button');
  restart.className = 'btn-secondary';
  restart.textContent = 'Reset Game';
  restart.style.marginTop = '0.5rem';

  btn.addEventListener('click', () => {
    const p = Math.floor(Math.random() * 6) + 1;
    const c = Math.floor(Math.random() * 6) + 1;
    const diceEmojis = ['⚀','⚁','⚂','⚃','⚄','⚅'];
    youDice.textContent = diceEmojis[p - 1];
    compDice.textContent = diceEmojis[c - 1];
    playerTotal += p;
    compTotal += c;
    rolls++;
    if (p > c) result.textContent = `You win this round! (${p} vs ${c})`;
    else if (p < c) result.textContent = `Computer wins this round! (${p} vs ${c})`;
    else result.textContent = `Draw! (${p} vs ${c})`;
    result.style.color = p > c ? '#2ecc71' : p < c ? '#e74c3c' : 'var(--accent)';
    scoreEl.textContent = `You: ${playerTotal} | Computer: ${compTotal} (${rolls} ${rolls === 1 ? 'roll' : 'rolls'})`;
  });

  restart.addEventListener('click', () => {
    playerTotal = 0; compTotal = 0; rolls = 0;
    youDice.textContent = '🎲'; compDice.textContent = '🎲';
    result.textContent = '';
    scoreEl.textContent = '';
  });

  display.appendChild(diceArea);
  display.appendChild(btn);
  display.appendChild(result);
  display.appendChild(restart);
  container.appendChild(display);
}

// ==================== SIMON SAYS ====================
function initSimon(container) {
  const scoreEl = document.getElementById('gameScore');
  const colors = ['#e74c3c', '#2ecc71', '#3498db', '#f1c40f'];
  const labels = ['🔴', '🟢', '🔵', '🟡'];
  let sequence = [];
  let playerIndex = 0;
  let playing = false;
  let gameOver = false;
  window._gameActive = true;

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;width:280px;height:280px;';

  const btns = [];
  colors.forEach((color, i) => {
    const btn = document.createElement('div');
    btn.style.cssText = `border-radius:16px;cursor:pointer;transition:all 0.15s;display:flex;align-items:center;justify-content:center;font-size:2rem;background:${color};opacity:0.5;`;
    btn.addEventListener('click', () => {
      if (playing || gameOver) return;
      lightUp(i);
      if (i !== sequence[playerIndex]) {
        gameOver = true;
        scoreEl.textContent = 'Game Over! Score: ' + (sequence.length - 1);
        return;
      }
      playerIndex++;
      if (playerIndex >= sequence.length) {
        scoreEl.textContent = 'Score: ' + sequence.length;
        setTimeout(() => playRound(), 600);
      }
    });
    grid.appendChild(btn);
    btns.push(btn);
  });

  function lightUp(i) {
    btns[i].style.opacity = '1';
    btns[i].style.boxShadow = `0 0 20px ${colors[i]}`;
    setTimeout(() => {
      btns[i].style.opacity = '0.5';
      btns[i].style.boxShadow = 'none';
    }, 300);
  }

  function playRound() {
    playerIndex = 0;
    playing = true;
    sequence.push(Math.floor(Math.random() * 4));
    let i = 0;
    const interval = setInterval(() => {
      if (i >= sequence.length) { clearInterval(interval); playing = false; return; }
      lightUp(sequence[i]);
      i++;
    }, 500);
  }

  const startBtn = document.createElement('button');
  startBtn.className = 'btn-play';
  startBtn.textContent = 'Start Game';
  startBtn.style.marginTop = '1rem';
  startBtn.addEventListener('click', () => {
    sequence = []; playerIndex = 0; playing = false; gameOver = false;
    scoreEl.textContent = '';
    playRound();
  });

  container.appendChild(grid);
  container.appendChild(startBtn);
}

document.addEventListener('DOMContentLoaded', () => {
  renderGameCards();
});
