/**
 * Snake — lógica do jogo em JavaScript puro, renderizado em <canvas>.
 * Sem dependências externas. O recorde (high score) é persistido
 * no localStorage do navegador.
 */

(() => {
  "use strict";

  // ---------- configurações ----------

  const GRID_SIZE = 18; // células por lado
  const HIGH_SCORE_KEY = "snake:highscore:v1";

  const SPEEDS = {
    slow: 180,
    normal: 120,
    fast: 80,
  };

  const DIRECTIONS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  const OPPOSITE = {
    up: "down",
    down: "up",
    left: "right",
    right: "left",
  };

  // ---------- elementos do DOM ----------

  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const highScoreEl = document.getElementById("high-score");
  const faceIconEl = document.getElementById("face-icon");
  const pauseBtn = document.getElementById("pause-btn");
  const statusLineEl = document.getElementById("status-line");
  const speedBtns = document.querySelectorAll(".speed__btn");
  const overlayEl = document.getElementById("overlay");
  const overlayMessageEl = document.getElementById("overlay-message");
  const overlayDetailEl = document.getElementById("overlay-detail");
  const overlayBtn = document.getElementById("overlay-btn");

  const manualBtn = document.getElementById("manual-btn");
  const manualModal = document.getElementById("manual-modal");
  const manualClose = document.getElementById("manual-close");

  const dpadUp = document.getElementById("dpad-up");
  const dpadDown = document.getElementById("dpad-down");
  const dpadLeft = document.getElementById("dpad-left");
  const dpadRight = document.getElementById("dpad-right");

  // ---------- estado do jogo ----------

  let cellSize = canvas.width / GRID_SIZE;
  let speedKey = "slow";
  let snake = [];
  let direction = "right";
  let pendingDirection = "right";
  let food = null;
  let score = 0;
  let highScore = loadHighScore();
  let gameStarted = false;
  let gameOver = false;
  let paused = false;
  let loopHandle = null;

  highScoreEl.textContent = String(highScore).padStart(3, "0");

  // ---------- recorde (localStorage) ----------

  function loadHighScore() {
    try {
      const raw = localStorage.getItem(HIGH_SCORE_KEY);
      const value = raw ? parseInt(raw, 10) : 0;
      return Number.isFinite(value) ? value : 0;
    } catch (err) {
      console.warn("não foi possível ler o recorde salvo:", err);
      return 0;
    }
  }

  function saveHighScore(value) {
    try {
      localStorage.setItem(HIGH_SCORE_KEY, String(value));
    } catch (err) {
      console.warn("não foi possível salvar o recorde:", err);
    }
  }

  // ---------- inicialização ----------

  function resetGame() {
    const mid = Math.floor(GRID_SIZE / 2);
    snake = [
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
      { x: mid - 3, y: mid },
    ];
    direction = "right";
    pendingDirection = "right";
    score = 0;
    gameStarted = false;
    gameOver = false;
    paused = false;

    scoreEl.textContent = "000";
    faceIconEl.textContent = "▶";
    statusLineEl.textContent = "pressione uma direção para começar";
    overlayEl.classList.remove("is-visible");

    placeFood();
    stopLoop();
    draw();
  }

  function placeFood() {
    let position;
    do {
      position = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
    } while (snake.some((seg) => seg.x === position.x && seg.y === position.y));
    food = position;
  }

  // ---------- loop do jogo ----------

  function startLoop() {
    stopLoop();
    loopHandle = setInterval(tick, SPEEDS[speedKey]);
  }

  function stopLoop() {
    if (loopHandle) {
      clearInterval(loopHandle);
      loopHandle = null;
    }
  }

  function tick() {
    if (!gameStarted || gameOver || paused) return;

    direction = pendingDirection;
    const delta = DIRECTIONS[direction];
    const head = snake[0];
    const newHead = { x: head.x + delta.x, y: head.y + delta.y };

    // colisão com a parede
    if (
      newHead.x < 0 ||
      newHead.x >= GRID_SIZE ||
      newHead.y < 0 ||
      newHead.y >= GRID_SIZE
    ) {
      return endGame();
    }

    // colisão com o próprio corpo
    if (snake.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
      return endGame();
    }

    snake.unshift(newHead);

    if (food && newHead.x === food.x && newHead.y === food.y) {
      score += 10;
      scoreEl.textContent = String(Math.min(score, 99999)).padStart(3, "0");
      placeFood();
    } else {
      snake.pop();
    }

    draw();
  }

  function endGame() {
    gameOver = true;
    gameStarted = false;
    stopLoop();
    faceIconEl.textContent = "✸";
    statusLineEl.textContent = "colisão detectada";

    const isNewRecord = score > highScore;
    if (isNewRecord) {
      highScore = score;
      saveHighScore(highScore);
      highScoreEl.textContent = String(highScore).padStart(3, "0");
    }

    overlayEl.classList.add("is-visible");
    overlayMessageEl.textContent = "FIM DE JOGO";
    overlayMessageEl.className = "overlay__message is-lose";
    overlayDetailEl.textContent = isNewRecord
      ? `pontuação: ${score} — novo recorde!`
      : `pontuação: ${score} · recorde: ${highScore}`;

    draw();
  }

  // ---------- renderização ----------

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // grade sutil de fundo
    ctx.strokeStyle = "rgba(95, 255, 143, 0.05)";
    ctx.lineWidth = 1;
    for (let i = 1; i < GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }

    // comida
    if (food) {
      drawCell(food.x, food.y, "#ffb238", true);
    }

    // cobra
    snake.forEach((seg, index) => {
      const isHead = index === 0;
      drawCell(seg.x, seg.y, isHead ? "#aaffc4" : "#5fff8f", false, isHead);
    });
  }

  function drawCell(x, y, color, isDiamond, isHead) {
    const pad = 2;
    const px = x * cellSize;
    const py = y * cellSize;

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = isHead ? 10 : 6;
    ctx.fillStyle = color;

    if (isDiamond) {
      const cx = px + cellSize / 2;
      const cy = py + cellSize / 2;
      const r = cellSize / 2 - pad;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r);
      ctx.lineTo(cx - r, cy);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(px + pad, py + pad, cellSize - pad * 2, cellSize - pad * 2);
    }

    ctx.restore();
  }

  // ---------- controles ----------

  function setDirection(newDirection) {
    if (gameOver) return;

    // impede inverter a direção instantaneamente
    if (OPPOSITE[newDirection] === direction && snake.length > 1) return;

    pendingDirection = newDirection;

    if (!gameStarted) {
      direction = newDirection;
      gameStarted = true;
      paused = false;
      faceIconEl.textContent = "❚❚";
      statusLineEl.textContent = "use as setas ou WASD para mover · espaço para pausar";
      startLoop();
    }
  }

  function togglePause() {
    if (gameOver) return;

    if (!gameStarted) {
      setDirection(direction);
      return;
    }

    paused = !paused;
    faceIconEl.textContent = paused ? "▶" : "❚❚";
    statusLineEl.textContent = paused
      ? "pausado · pressione espaço para continuar"
      : "use as setas ou WASD para mover · espaço para pausar";
  }

  const KEY_MAP = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    s: "down",
    a: "left",
    d: "right",
    W: "up",
    S: "down",
    A: "left",
    D: "right",
  };

  document.addEventListener("keydown", (e) => {
    if (e.key === " ") {
      e.preventDefault();
      togglePause();
      return;
    }
    const mapped = KEY_MAP[e.key];
    if (mapped) {
      e.preventDefault();
      setDirection(mapped);
    }
  });

  pauseBtn.addEventListener("click", togglePause);
  overlayBtn.addEventListener("click", resetGame);

  dpadUp.addEventListener("click", () => setDirection("up"));
  dpadDown.addEventListener("click", () => setDirection("down"));
  dpadLeft.addEventListener("click", () => setDirection("left"));
  dpadRight.addEventListener("click", () => setDirection("right"));

  speedBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      speedBtns.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      speedKey = btn.dataset.speed;
      if (gameStarted && !paused && !gameOver) {
        startLoop();
      }
    });
  });

  // gestos de deslize sobre o tabuleiro (telas de toque)
  let touchStartX = 0;
  let touchStartY = 0;

  canvas.addEventListener(
    "touchstart",
    (e) => {
      const touch = e.changedTouches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
    },
    { passive: true }
  );

  canvas.addEventListener(
    "touchend",
    (e) => {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;

      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;

      if (Math.abs(dx) > Math.abs(dy)) {
        setDirection(dx > 0 ? "right" : "left");
      } else {
        setDirection(dy > 0 ? "down" : "up");
      }
    },
    { passive: true }
  );

  // ---------- manual ----------

  function openModal(modalEl) {
    modalEl.classList.add("is-visible");
    modalEl.setAttribute("aria-hidden", "false");
  }

  function closeModal(modalEl) {
    modalEl.classList.remove("is-visible");
    modalEl.setAttribute("aria-hidden", "true");
  }

  manualBtn.addEventListener("click", () => openModal(manualModal));
  manualClose.addEventListener("click", () => closeModal(manualModal));
  manualModal.addEventListener("click", (e) => {
    if (e.target === manualModal) closeModal(manualModal);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal(manualModal);
  });

  // ---------- start ----------

  resetGame();
})();
