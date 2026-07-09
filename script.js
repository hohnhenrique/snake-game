/**
 * Snake v2
 * — Nome do jogador obrigatório antes de jogar
 * — Ranking top 10 por velocidade via JSONBin.io
 * — Botão de recarregar ranking
 */

(() => {
  "use strict";

  // ---------- configurações ----------

  const GRID_SIZE  = 18;
  const PLAYER_KEY = "snake:player";
  const MAX_RANKING = 10;

  const SPEEDS = { slow: 180, normal: 120, fast: 80 };
  const SPEED_LABELS = { slow: "lenta", normal: "normal", fast: "rápida" };

  const DIRECTIONS = {
    up:    { x: 0,  y: -1 },
    down:  { x: 0,  y:  1 },
    left:  { x: -1, y:  0 },
    right: { x: 1,  y:  0 },
  };

  const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };

  // ─── JSONBin ─────────────────────────────────────────────
  const JSONBIN = {
    BIN_ID:     "6a5029c7da38895dfe486f71",
    ACCESS_KEY: "$2a$10$viPWEf1wLwsaoPeWhMfbjeoKLInlYT5IA/fijzPKkxBPAUL6GAIjy",
    get URL()  { return `https://api.jsonbin.io/v3/b/${this.BIN_ID}`; },
  };
  // ─────────────────────────────────────────────────────────

  // ---------- DOM ----------

  const canvas          = document.getElementById("board");
  const ctx             = canvas.getContext("2d");
  const scoreEl         = document.getElementById("score");
  const highScoreEl     = document.getElementById("high-score");
  const faceIconEl      = document.getElementById("face-icon");
  const pauseBtn        = document.getElementById("pause-btn");
  const statusLineEl    = document.getElementById("status-line");
  const speedBtns       = document.querySelectorAll(".speed__btn");
  const overlayEl       = document.getElementById("overlay");
  const overlayMsgEl    = document.getElementById("overlay-message");
  const overlayDetailEl = document.getElementById("overlay-detail");
  const overlayBtn      = document.getElementById("overlay-btn");
  const winRecordEl     = document.getElementById("win-record");
  const manualBtn       = document.getElementById("manual-btn");
  const manualModal     = document.getElementById("manual-modal");
  const manualClose     = document.getElementById("manual-close");
  const dpadUp          = document.getElementById("dpad-up");
  const dpadDown        = document.getElementById("dpad-down");
  const dpadLeft        = document.getElementById("dpad-left");
  const dpadRight       = document.getElementById("dpad-right");

  const playerNameEl     = document.getElementById("player-name");
  const changePlayerBtn  = document.getElementById("change-player-btn");
  const playerOverlayEl  = document.getElementById("player-overlay");
  const playerInputEl    = document.getElementById("player-input");
  const playerErrorEl    = document.getElementById("player-input-error");
  const playerConfirmBtn = document.getElementById("player-confirm-btn");

  const statsToggleBtn  = document.getElementById("stats-toggle-btn");
  const statsPanel      = document.getElementById("stats-panel");
  const statsTabs       = document.querySelectorAll(".stats-tab");
  const statsContent    = document.getElementById("stats-content");
  const statsRefreshBtn = document.getElementById("stats-refresh-btn");

  // ---------- estado ----------

  let cellSize         = canvas.width / GRID_SIZE;
  let speedKey         = "slow";
  let snake            = [];
  let direction        = "right";
  let pendingDirection = "right";
  let food             = null;
  let score            = 0;
  let highScore        = 0;
  let gameStarted      = false;
  let gameOver         = false;
  let paused           = false;
  let loopHandle       = null;
  let currentPlayer    = "";
  let statsTab         = "slow";

  // ---------- jogador (localStorage só para o nome) ----------

  function loadPlayer() { return localStorage.getItem(PLAYER_KEY) || ""; }
  function savePlayer(name) { localStorage.setItem(PLAYER_KEY, name); }

  function showPlayerModal() {
    playerInputEl.value       = currentPlayer || "";
    playerErrorEl.textContent = "";
    playerOverlayEl.classList.add("is-visible");
    setTimeout(() => playerInputEl.focus(), 150);
  }

  function hidePlayerModal() {
    playerOverlayEl.classList.remove("is-visible");
  }

  function confirmPlayer() {
    const name = playerInputEl.value.trim();
    if (!name) {
      playerErrorEl.textContent = "nome obrigatório";
      playerInputEl.focus();
      return;
    }
    if (name.length < 2) {
      playerErrorEl.textContent = "mínimo 2 caracteres";
      playerInputEl.focus();
      return;
    }
    currentPlayer = name;
    savePlayer(name);
    playerNameEl.textContent = name;
    hidePlayerModal();
    resetGame();
  }

  // ---------- ranking — JSONBin exclusivo ----------

  const EMPTY_RANKING = () => ({ slow: [], normal: [], fast: [] });

  async function loadRanking() {
    const res = await fetch(JSONBIN.URL, {
      headers: { "X-Access-Key": JSONBIN.ACCESS_KEY },
    });
    if (!res.ok) throw new Error(`JSONBin GET falhou: HTTP ${res.status}`);
    const data = await res.json();
    return data.record || EMPTY_RANKING();
  }

  async function saveRanking(ranking) {
    const res = await fetch(JSONBIN.URL, {
      method:  "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Access-Key": JSONBIN.ACCESS_KEY,
      },
      body: JSON.stringify(ranking),
    });
    if (!res.ok) throw new Error(`JSONBin PUT falhou: HTTP ${res.status}`);
  }

  async function addToRanking(spd, entry) {
    const ranking  = await loadRanking();
    const list     = ranking[spd] || [];
    const prevBest = list.length > 0 ? list[0].score : -Infinity;

    list.push(entry);
    list.sort((a, b) => b.score - a.score);

    const trimmed  = list.slice(0, MAX_RANKING);
    const position = trimmed.findIndex(
      e => e.player === entry.player &&
           e.score  === entry.score  &&
           e.date   === entry.date
    ) + 1;

    const isRecord = entry.score > prevBest;
    ranking[spd]   = trimmed;
    await saveRanking(ranking);

    return { position, isRecord };
  }

  // ---------- ranking UI ----------

  function toggleStats() {
    const hidden = statsPanel.hidden;
    statsPanel.hidden = !hidden;
    statsToggleBtn.textContent = hidden ? "▾ ranking" : "▸ ranking";
    if (!statsPanel.hidden) { renderStats(); }
  }

  async function renderStats() {
    statsContent.innerHTML = `<p class="stats-empty">carregando...</p>`;
    let ranking;
    try {
      ranking = await loadRanking();
    } catch (err) {
      console.error("[ranking] Erro ao carregar:", err);
      statsContent.innerHTML = `<p class="stats-empty">erro ao carregar — tente novamente</p>`;
      return;
    }

    const list = ranking[statsTab] || [];
    if (list.length === 0) {
      statsContent.innerHTML = `<p class="stats-empty">nenhuma partida registrada</p>`;
      return;
    }

    const medals = ["🥇", "🥈", "🥉"];
    const rows = list.map((e, i) => {
      const isCurrent = e.player === currentPlayer;
      const pos = medals[i] || `${i + 1}`;
      return `
        <tr class="${isCurrent ? "is-current" : ""}">
          <td>${pos}</td>
          <td>${escapeHtml(e.player)}</td>
          <td>${e.score}</td>
          <td>${e.date}</td>
        </tr>`;
    }).join("");

    statsContent.innerHTML = `
      <table class="ranking-table">
        <thead>
          <tr>
            <th>#</th>
            <th>jogador</th>
            <th>pontos</th>
            <th>data</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  async function refreshStats() {
    statsRefreshBtn.classList.remove("is-spinning");
    void statsRefreshBtn.offsetWidth;
    statsRefreshBtn.classList.add("is-spinning");
    statsRefreshBtn.disabled = true;
    await renderStats();
    statsRefreshBtn.disabled = false;
    setTimeout(() => statsRefreshBtn.classList.remove("is-spinning"), 600);
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // ---------- jogo ----------

  function resetGame() {
    const mid = Math.floor(GRID_SIZE / 2);
    snake = [
      { x: mid - 1, y: mid },
      { x: mid - 2, y: mid },
      { x: mid - 3, y: mid },
    ];
    direction        = "right";
    pendingDirection = "right";
    score            = 0;
    gameStarted      = false;
    gameOver         = false;
    paused           = false;

    scoreEl.textContent    = "000";
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
    } while (snake.some(seg => seg.x === position.x && seg.y === position.y));
    food = position;
  }

  function startLoop() {
    stopLoop();
    loopHandle = setInterval(tick, SPEEDS[speedKey]);
  }

  function stopLoop() {
    if (loopHandle) { clearInterval(loopHandle); loopHandle = null; }
  }

  function tick() {
    if (!gameStarted || gameOver || paused) return;

    direction = pendingDirection;
    const delta   = DIRECTIONS[direction];
    const head    = snake[0];
    const newHead = { x: head.x + delta.x, y: head.y + delta.y };

    if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
      return endGame();
    }
    if (snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
      return endGame();
    }

    snake.unshift(newHead);

    if (food && newHead.x === food.x && newHead.y === food.y) {
      score += 10;
      scoreEl.textContent = String(Math.min(score, 99999)).padStart(3, "0");
      if (score > highScore) {
        highScore = score;
        highScoreEl.textContent = String(highScore).padStart(3, "0");
      }
      placeFood();
    } else {
      snake.pop();
    }

    draw();
  }

  async function endGame() {
    gameOver    = true;
    gameStarted = false;
    stopLoop();
    faceIconEl.textContent   = "✸";
    statusLineEl.textContent = "colisão detectada";

    overlayMsgEl.textContent      = "FIM DE JOGO";
    overlayMsgEl.className        = "overlay__message is-lose";
    overlayDetailEl.textContent   = `${currentPlayer} · ${SPEED_LABELS[speedKey]}`;
    winRecordEl.innerHTML = `
      <p><span>pontuação</span>  <span>${score} pts</span></p>
      <p><span>velocidade</span> <span>${SPEED_LABELS[speedKey]}</span></p>
      <p><span>posição</span>    <span style="color:var(--phosphor-dim,#2a9956)">salvando...</span></p>
    `;
    overlayEl.classList.add("is-visible");
    draw();

    const entry = {
      player: currentPlayer,
      score,
      date: new Date().toLocaleDateString("pt-BR"),
    };

    try {
      const { position, isRecord } = await addToRanking(speedKey, entry);
      winRecordEl.innerHTML = `
        <p><span>pontuação</span>  <span class="${isRecord ? "is-record" : ""}">${score} pts${isRecord ? " ✦" : ""}</span></p>
        <p><span>velocidade</span> <span>${SPEED_LABELS[speedKey]}</span></p>
        <p><span>posição</span>    <span class="${position <= 3 ? "is-record" : ""}">${position}º no ranking</span></p>
        ${isRecord ? `<p><span></span><span class="is-record">novo recorde!</span></p>` : ""}
      `;
      if (!statsPanel.hidden) { renderStats(); }
    } catch (err) {
      console.error("[ranking] Erro ao salvar:", err);
      winRecordEl.innerHTML = `
        <p><span>pontuação</span>  <span>${score} pts</span></p>
        <p><span>velocidade</span> <span>${SPEED_LABELS[speedKey]}</span></p>
        <p><span>posição</span>    <span style="color:#ff4d4d">erro ao salvar</span></p>
      `;
    }
  }

  // ---------- renderização ----------

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(95, 255, 143, 0.05)";
    ctx.lineWidth   = 1;
    for (let i = 1; i < GRID_SIZE; i++) {
      ctx.beginPath(); ctx.moveTo(i * cellSize, 0); ctx.lineTo(i * cellSize, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cellSize); ctx.lineTo(canvas.width, i * cellSize); ctx.stroke();
    }

    if (food) { drawCell(food.x, food.y, "#ffb238", true); }

    snake.forEach((seg, index) => {
      const isHead = index === 0;
      drawCell(seg.x, seg.y, isHead ? "#aaffc4" : "#5fff8f", false, isHead);
    });
  }

  function drawCell(x, y, color, isDiamond, isHead) {
    const pad = 2;
    const px  = x * cellSize;
    const py  = y * cellSize;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur  = isHead ? 10 : 6;
    ctx.fillStyle   = color;

    if (isDiamond) {
      const cx = px + cellSize / 2;
      const cy = py + cellSize / 2;
      const r  = cellSize / 2 - pad;
      ctx.beginPath();
      ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy);
      ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy);
      ctx.closePath(); ctx.fill();
    } else {
      ctx.fillRect(px + pad, py + pad, cellSize - pad * 2, cellSize - pad * 2);
    }
    ctx.restore();
  }

  // ---------- controles ----------

  function setDirection(newDir) {
    if (gameOver) return;
    if (OPPOSITE[newDir] === direction && snake.length > 1) return;
    pendingDirection = newDir;

    if (!gameStarted) {
      direction   = newDir;
      gameStarted = true;
      paused      = false;
      faceIconEl.textContent   = "❚❚";
      statusLineEl.textContent = "use as setas ou WASD para mover · espaço para pausar";
      startLoop();
    }
  }

  function togglePause() {
    if (gameOver) return;
    if (!gameStarted) { setDirection(direction); return; }
    paused = !paused;
    faceIconEl.textContent   = paused ? "▶" : "❚❚";
    statusLineEl.textContent = paused
      ? "pausado · pressione espaço para continuar"
      : "use as setas ou WASD para mover · espaço para pausar";
  }

  const KEY_MAP = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    w: "up", s: "down", a: "left", d: "right",
    W: "up", S: "down", A: "left", D: "right",
  };

  document.addEventListener("keydown", e => {
    if (e.key === " ") { e.preventDefault(); togglePause(); return; }
    const mapped = KEY_MAP[e.key];
    if (mapped) { e.preventDefault(); setDirection(mapped); }
  });

  pauseBtn.addEventListener("click", togglePause);
  overlayBtn.addEventListener("click", resetGame);

  dpadUp.addEventListener("click",    () => setDirection("up"));
  dpadDown.addEventListener("click",  () => setDirection("down"));
  dpadLeft.addEventListener("click",  () => setDirection("left"));
  dpadRight.addEventListener("click", () => setDirection("right"));

  speedBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      speedBtns.forEach(b => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      speedKey = btn.dataset.speed;
      if (gameStarted && !paused && !gameOver) { startLoop(); }
    });
  });

  // swipe no canvas
  let touchStartX = 0, touchStartY = 0;
  canvas.addEventListener("touchstart", e => {
    const t = e.changedTouches[0];
    touchStartX = t.clientX; touchStartY = t.clientY;
  }, { passive: true });
  canvas.addEventListener("touchend", e => {
    const t  = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    setDirection(Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? "right" : "left")
      : (dy > 0 ? "down"  : "up")
    );
  }, { passive: true });

  // ---------- manual ----------

  function openModal(m)  { m.classList.add("is-visible");    m.setAttribute("aria-hidden", "false"); }
  function closeModal(m) { m.classList.remove("is-visible"); m.setAttribute("aria-hidden", "true");  }

  manualBtn.addEventListener("click",  () => openModal(manualModal));
  manualClose.addEventListener("click", () => closeModal(manualModal));
  manualModal.addEventListener("click", e => { if (e.target === manualModal) closeModal(manualModal); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(manualModal); });

  // ---------- player modal ----------
  playerConfirmBtn.addEventListener("click", confirmPlayer);
  playerInputEl.addEventListener("keydown", e => { if (e.key === "Enter") confirmPlayer(); });
  changePlayerBtn.addEventListener("click", showPlayerModal);

  // ---------- ranking eventos ----------
  statsToggleBtn.addEventListener("click", toggleStats);
  statsRefreshBtn.addEventListener("click", refreshStats);
  statsTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      statsTabs.forEach(t => t.classList.remove("is-active"));
      tab.classList.add("is-active");
      statsTab = tab.dataset.speed;
      renderStats();
    });
  });

  // ---------- boot ----------

  const savedPlayer = loadPlayer();
  if (savedPlayer) {
    currentPlayer = savedPlayer;
    playerNameEl.textContent = savedPlayer;
    highScoreEl.textContent = "000";
    resetGame();
  } else {
    resetGame();
    showPlayerModal();
  }

})();
