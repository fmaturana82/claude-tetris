'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

// ---- Skins (temas visuales del tablero) ----
// Cada skin define: colors (null en 0 + 7 colores alineados con PIECES: I,O,T,S,Z,J,L),
// boardBg (fondo del canvas; null = usar la variable CSS --board-bg),
// grid (color de la cuadrícula; null = usar la variable CSS --grid) y
// drawBlock(context, px, py, size, color, alpha) que pinta una celda en píxeles.

// Ruta de un rectángulo redondeado con arcTo (no depende de ctx.roundRect).
function roundRectPath(context, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  context.beginPath();
  context.moveTo(x + rr, y);
  context.arcTo(x + w, y, x + w, y + h, rr);
  context.arcTo(x + w, y + h, x, y + h, rr);
  context.arcTo(x, y + h, x, y, rr);
  context.arcTo(x, y, x + w, y, rr);
  context.closePath();
}

// Patrón de tramado (dither) 2×2 para la skin Pixel art, cacheado por contexto y tamaño.
const ditherCache = new WeakMap();
function ditherPattern(context, unit) {
  let bySize = ditherCache.get(context);
  if (!bySize) { bySize = new Map(); ditherCache.set(context, bySize); }
  let pattern = bySize.get(unit);
  if (!pattern) {
    const tile = document.createElement('canvas');
    tile.width = tile.height = unit * 2;
    const t = tile.getContext('2d');
    t.fillStyle = 'rgba(0,0,0,0.14)';
    t.fillRect(0, 0, unit, unit);
    t.fillRect(unit, unit, unit, unit);
    pattern = context.createPattern(tile, 'repeat');
    bySize.set(unit, pattern);
  }
  return pattern;
}

const SKINS = {
  retro: {
    name: 'Retro',
    colors: [
      null,
      '#4dd0e1', // I - cyan
      '#ffd54f', // O - yellow
      '#ba68c8', // T - purple
      '#81c784', // S - green
      '#e57373', // Z - red
      '#90caf9', // J - azul pálido
      '#ffb74d', // L - orange
    ],
    boardBg: null,
    grid: null,
    drawBlock(context, px, py, size, color, alpha) {
      context.globalAlpha = alpha;
      context.fillStyle = color;
      context.fillRect(px + 1, py + 1, size - 2, size - 2);
      // highlight
      context.fillStyle = 'rgba(255,255,255,0.12)';
      context.fillRect(px + 1, py + 1, size - 2, 4);
      context.globalAlpha = 1;
    },
  },

  neon: {
    name: 'Neón',
    colors: [
      null,
      '#00f0ff', // I
      '#fff200', // O
      '#d500ff', // T
      '#39ff14', // S
      '#ff1744', // Z
      '#2979ff', // J
      '#ff9100', // L
    ],
    boardBg: '#000000',
    grid: 'rgba(0, 240, 255, 0.07)',
    drawBlock(context, px, py, size, color, alpha) {
      const inset = Math.max(2, Math.round(size * 0.12));
      // relleno tenue
      context.globalAlpha = alpha * 0.28;
      context.fillStyle = color;
      context.fillRect(px + inset, py + inset, size - inset * 2, size - inset * 2);
      // contorno brillante con resplandor
      context.globalAlpha = alpha;
      context.shadowColor = color;
      context.shadowBlur = size * 0.5;
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.strokeRect(px + inset, py + inset, size - inset * 2, size - inset * 2);
      // núcleo
      context.shadowBlur = size * 0.25;
      context.fillStyle = '#ffffff';
      context.globalAlpha = alpha * 0.6;
      const core = Math.max(2, Math.round(size * 0.14));
      context.fillRect(px + size / 2 - core / 2, py + size / 2 - core / 2, core, core);
      // restablecer estado
      context.shadowBlur = 0;
      context.shadowColor = 'transparent';
      context.globalAlpha = 1;
    },
  },

  pastel: {
    name: 'Pastel',
    colors: [
      null,
      '#a0e7e5', // I
      '#fdf3a0', // O
      '#d7bde2', // T
      '#b5ead7', // S
      '#ffb3ae', // Z
      '#aecbfa', // J
      '#ffd6a5', // L
    ],
    boardBg: '#fbf6f1',
    grid: '#efe5dc',
    drawBlock(context, px, py, size, color, alpha) {
      const pad = 1.5;
      const w = size - pad * 2;
      const r = size * 0.28;
      context.globalAlpha = alpha;
      roundRectPath(context, px + pad, py + pad, w, w, r);
      context.fillStyle = color;
      context.fill();
      context.strokeStyle = 'rgba(90, 70, 90, 0.18)';
      context.lineWidth = 1;
      context.stroke();
      // brillo suave superior
      roundRectPath(context, px + pad + w * 0.18, py + pad + w * 0.12, w * 0.64, w * 0.26, r * 0.6);
      context.fillStyle = 'rgba(255,255,255,0.45)';
      context.fill();
      context.globalAlpha = 1;
    },
  },

  pixel: {
    name: 'Pixel art',
    colors: [
      null,
      '#3cbcfc', // I
      '#f8d878', // O
      '#b86cf0', // T
      '#58d854', // S
      '#f83800', // Z
      '#0078f8', // J
      '#fca044', // L
    ],
    boardBg: '#14142b',
    grid: '#20203d',
    drawBlock(context, px, py, size, color, alpha) {
      const u = Math.max(1, Math.floor(size / 10)); // tamaño de un "píxel"
      const x = Math.round(px), y = Math.round(py), s = Math.round(size);
      context.globalAlpha = alpha;
      // base plana
      context.fillStyle = color;
      context.fillRect(x, y, s, s);
      // textura de tramado bicolor
      context.fillStyle = ditherPattern(context, u);
      context.fillRect(x + u, y + u, s - u * 2, s - u * 2);
      // bordes de luz (arriba/izquierda) y sombra (abajo/derecha)
      context.fillStyle = 'rgba(255,255,255,0.5)';
      context.fillRect(x, y, s - u, u);
      context.fillRect(x, y, u, s - u);
      context.fillStyle = 'rgba(0,0,0,0.45)';
      context.fillRect(x + u, y + s - u, s - u, u);
      context.fillRect(x + s - u, y + u, u, s - u);
      // brillo de un píxel
      context.fillStyle = 'rgba(255,255,255,0.8)';
      context.fillRect(x + u * 2, y + u * 2, u, u);
      context.globalAlpha = 1;
    },
  },
};

const SKIN_KEY = 'tetris-skin';
let currentSkin = SKINS.retro;
let COLORS = currentSkin.colors; // apunta siempre a los colores de la skin activa

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * 7) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  // delega en la skin activa
  currentSkin.drawBlock(context, x * size, y * size, size, COLORS[colorIndex], alpha ?? 1);
}

function drawGrid() {
  ctx.strokeStyle = currentSkin.grid
    || getComputedStyle(document.documentElement).getPropertyValue('--grid').trim();
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  if (gameOver || paused) return;
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  if (gameOver) return; // no reprogramar el bucle tras el game over
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

const themeToggle = document.getElementById('theme-toggle');
const THEME_KEY = 'tetris-theme';

function applyTheme(theme) {
  const light = theme === 'light';
  document.documentElement.dataset.theme = light ? 'light' : 'dark';
  themeToggle.setAttribute('aria-pressed', String(light));
  themeToggle.textContent = light ? '🌙 Modo oscuro' : '☀️ Modo claro';
}

themeToggle.addEventListener('click', () => {
  const light = document.documentElement.dataset.theme !== 'light';
  applyTheme(light ? 'light' : 'dark');
  try { localStorage.setItem(THEME_KEY, light ? 'light' : 'dark'); } catch (e) { /* ignorar */ }
  themeToggle.blur(); // evita que Space reactive el botón
  // repintar aunque el juego esté en pausa o terminado
  draw();
  drawNext();
});

let savedTheme = 'dark';
try { savedTheme = localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'; } catch (e) { /* ignorar */ }
applyTheme(savedTheme);

// ---- Selector de skin ----
const skinSelect = document.getElementById('skin-select');

function applySkin(name) {
  const key = Object.prototype.hasOwnProperty.call(SKINS, name) ? name : 'retro';
  currentSkin = SKINS[key];
  COLORS = currentSkin.colors;
  // null → '' para conservar el fondo definido por el tema (variable CSS)
  const bg = currentSkin.boardBg || '';
  canvas.style.background = bg;
  nextCanvas.style.background = bg;
  skinSelect.value = key;
  return key;
}

skinSelect.addEventListener('change', () => {
  const key = applySkin(skinSelect.value);
  try { localStorage.setItem(SKIN_KEY, key); } catch (e) { /* ignorar */ }
  skinSelect.blur(); // evita que las flechas sigan cambiando la skin
  // repintar aunque el juego esté en pausa o terminado
  draw();
  drawNext();
});

// Mientras el selector tenga el foco, las teclas no deben mover la pieza.
document.addEventListener('keydown', e => {
  if (e.target === skinSelect) e.stopImmediatePropagation();
}, true);

let savedSkin = 'retro';
try { savedSkin = localStorage.getItem(SKIN_KEY) || 'retro'; } catch (e) { /* ignorar */ }
applySkin(savedSkin);

init();
