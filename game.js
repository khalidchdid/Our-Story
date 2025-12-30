(() => {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const streakEl = document.getElementById("streak");
  const overlay = document.getElementById("overlay");
  const startBtn = document.getElementById("startBtn");
  const lastScoreEl = document.getElementById("lastScore");
  const bestScoreEl = document.getElementById("bestScore");

  // --------- State / Scores ----------
  let mode = "menu"; // "menu" | "playing" | "gameover"
  let streak = 0;
  let lastScore = 0;
  let best = Number(localStorage.getItem("pongBest") || 0);

  function setBest(v) {
    best = v;
    localStorage.setItem("pongBest", String(best));
    bestScoreEl.textContent = String(best);
  }
  function setStreak(v) {
    streak = v;
    streakEl.textContent = String(streak);
    if (streak > best) setBest(streak);
  }
  function showOverlay(show) {
    overlay.classList.toggle("hidden", !show);
    lastScoreEl.textContent = String(lastScore);
    bestScoreEl.textContent = String(best);
  }

  // --------- Canvas sizing ----------
  function resizeCanvasToDisplaySize() {
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect();
    const displayW = Math.floor(rect.width * dpr);
    const displayH = Math.floor(rect.height * dpr);
    if (canvas.width !== displayW || canvas.height !== displayH) {
      canvas.width = displayW;
      canvas.height = displayH;
    }
  }

  // --------- Helpers ----------
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function makeGame() {
    const W = canvas.width;
    const H = canvas.height;

    const paddleW = Math.max(10, Math.floor(W * 0.012));
    const paddleH = Math.max(70, Math.floor(H * 0.16));
    const ballR = Math.max(6, Math.floor(Math.min(W, H) * 0.012));

    const player = {
      x: Math.floor(W * 0.06),
      y: Math.floor(H * 0.5 - paddleH * 0.5),
      w: paddleW,
      h: paddleH,
      speed: H * 1.1,
      targetY: null
    };

    const ai = {
      x: Math.floor(W * 0.94 - paddleW),
      y: Math.floor(H * 0.5 - paddleH * 0.5),
      w: paddleW,
      h: paddleH,
      speed: H * 0.85,
      reaction: 0.12,
      reactTimer: 0,
      aimY: H * 0.5
    };

    const ball = { x: W * 0.5, y: H * 0.5, vx: 0, vy: 0, r: ballR };

    return { W, H, paddleW, paddleH, ballR, player, ai, ball };
  }

  let state = null;

  function resetBall(towardsPlayer = false) {
    const { W, H, ball } = state;
    ball.x = W * 0.5;
    ball.y = H * 0.5;

    const dir = towardsPlayer ? -1 : (Math.random() < 0.5 ? -1 : 1);
    const base = Math.max(W, H) * 0.45;
    const angle = (Math.random() * 0.8 - 0.4);
    ball.vx = dir * base * (0.9 + Math.random() * 0.2);
    ball.vy = base * angle;
  }

  function newRound() {
    state = makeGame();
    setStreak(0);
    resetBall(false);
  }

  // --------- Controls (touch drag) ----------
  function canvasToLocalY(clientY) {
    const rect = canvas.getBoundingClientRect();
    const y01 = (clientY - rect.top) / rect.height;
    return y01 * canvas.height;
  }

  let dragging = false;
  canvas.addEventListener("pointerdown", (e) => {
    if (mode !== "playing") return;
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    state.player.targetY = canvasToLocalY(e.clientY);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging || mode !== "playing") return;
    state.player.targetY = canvasToLocalY(e.clientY);
  });
  canvas.addEventListener("pointerup", () => {
    dragging = false;
    if (state) state.player.targetY = null;
  });

  // --------- Collisions ----------
  function paddleCollision(p, ball) {
    const left = p.x - ball.r;
    const right = p.x + p.w + ball.r;
    const top = p.y - ball.r;
    const bottom = p.y + p.h + ball.r;
    return (ball.x >= left && ball.x <= right && ball.y >= top && ball.y <= bottom);
  }

  function bounceOffPaddle(p, isPlayer) {
    const { ball, H } = state;

    if (isPlayer) ball.x = p.x + p.w + ball.r + 1;
    else ball.x = p.x - ball.r - 1;

    const center = p.y + p.h / 2;
    const rel = clamp((ball.y - center) / (p.h / 2), -1, 1
