'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - azul pálido
  '#ffb74d', // L - orange
];

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
let combo = 0, maxComboThisGame = 0;

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
  updateCombo(cleared);
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
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--grid').trim();
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
  handleGameOverRecords();
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
  resetRecordsState();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (shouldIgnoreGameKey(e)) return;
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

// ---- Tabla de récords (localStorage) ----
const RECORDS_KEY = 'tetris-records';
const LAST_NAME_KEY = 'tetris-last-name';
const MAX_RECORDS = 5;
const NAME_MAX_LENGTH = 12;

const startScreen = document.getElementById('start-screen');
const startRecordsEl = document.getElementById('start-records');
const playBtn = document.getElementById('play-btn');
const overlayRecordsEl = document.getElementById('overlay-records');
const nameEntry = document.getElementById('name-entry');
const playerNameInput = document.getElementById('player-name');
const saveRecordBtn = document.getElementById('save-record-btn');

let records = loadRecords();
let pendingRecord = false;   // la partida terminada aún puede guardarse en el top
let recordSaved = false;     // la partida terminada ya se guardó en el top
let finishedGame = null;     // { score, lines, level } de la última partida terminada
let highlightIndex = -1;     // fila a resaltar en el overlay de game over

function truncateName(s) {
  // cortar por puntos de código para no partir emojis
  return Array.from(s).slice(0, NAME_MAX_LENGTH).join('');
}

function defaultRecords() {
  return { top: [], bestCombo: 0, maxLines: 0 };
}

function toCount(v) {
  return Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
}

function sanitizeRecords(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.top)) return defaultRecords();
  const top = data.top
    .filter(r => r && typeof r === 'object' && typeof r.name === 'string' && Number.isFinite(r.score) && r.score >= 0)
    .map(r => ({
      name: truncateName(r.name),
      score: Math.floor(r.score),
      lines: toCount(r.lines),
      level: Math.max(1, toCount(r.level)),
      date: typeof r.date === 'string' ? r.date : '',
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RECORDS);
  return { top, bestCombo: toCount(data.bestCombo), maxLines: toCount(data.maxLines) };
}

function loadRecords() {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    return raw ? sanitizeRecords(JSON.parse(raw)) : defaultRecords();
  } catch (e) {
    return defaultRecords();
  }
}

function saveRecords() {
  try { localStorage.setItem(RECORDS_KEY, JSON.stringify(records)); } catch (e) { /* ignorar */ }
}

function loadLastName() {
  try { return truncateName(localStorage.getItem(LAST_NAME_KEY) || ''); } catch (e) { return ''; }
}

function qualifiesForTop(value) {
  if (value <= 0) return false;
  return records.top.length < MAX_RECORDS || value > records.top[records.top.length - 1].score;
}

function updateCombo(cleared) {
  if (cleared) {
    combo++;
    if (combo > maxComboThisGame) maxComboThisGame = combo;
  } else {
    combo = 0;
  }
}

function resetRecordsState() {
  // Si se reinicia con el formulario de nombre abierto, guardar igualmente el récord.
  if (pendingRecord) saveCurrentRecord();
  combo = 0;
  maxComboThisGame = 0;
  pendingRecord = false;
  recordSaved = false;
  finishedGame = null;
  highlightIndex = -1;
  nameEntry.classList.add('hidden');
  overlayRecordsEl.classList.add('hidden');
}

function formatDate(iso) {
  const d = new Date(iso);
  return isNaN(d) ? '—' : d.toLocaleDateString('es');
}

// Pinta la tabla + estadísticas en el contenedor. Solo usa textContent con datos del usuario.
function renderRecords(container, highlight) {
  container.replaceChildren();

  if (records.top.length) {
    const table = document.createElement('table');
    table.className = 'records-table';
    const headRow = table.createTHead().insertRow();
    ['#', 'NOMBRE', 'PUNTOS', 'LÍNEAS', 'NIVEL', 'FECHA'].forEach((h, i) => {
      const th = document.createElement('th');
      th.textContent = h;
      if (i === 1) th.className = 'col-name';
      headRow.appendChild(th);
    });
    const body = table.createTBody();
    records.top.forEach((r, i) => {
      const row = body.insertRow();
      if (i === highlight) row.className = 'record-highlight';
      [String(i + 1), r.name, r.score.toLocaleString(), String(r.lines), String(r.level), formatDate(r.date)]
        .forEach((text, j) => {
          const td = row.insertCell();
          td.textContent = text;
          if (j === 1) td.className = 'col-name';
        });
    });
    container.appendChild(table);
  } else {
    const empty = document.createElement('p');
    empty.className = 'records-empty';
    empty.textContent = 'Aún no hay récords. ¡Sé el primero!';
    container.appendChild(empty);
  }

  const stats = document.createElement('div');
  stats.className = 'records-stats';
  [['Mejor combo: ', records.bestCombo], ['Máx. líneas: ', records.maxLines]].forEach(([label, value]) => {
    const span = document.createElement('span');
    span.textContent = label;
    const strong = document.createElement('strong');
    strong.textContent = String(value);
    span.appendChild(strong);
    stats.appendChild(span);
  });
  container.appendChild(stats);

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'clear-records-btn';
  clearBtn.textContent = 'Borrar récords';
  clearBtn.addEventListener('click', clearRecords);
  container.appendChild(clearBtn);
}

function renderAllRecords() {
  renderRecords(startRecordsEl, -1);
  if (!overlayRecordsEl.classList.contains('hidden')) renderRecords(overlayRecordsEl, highlightIndex);
}

function clearRecords(e) {
  if (e && e.currentTarget) e.currentTarget.blur();
  if (!confirm('¿Seguro que quieres borrar todos los récords? Esta acción no se puede deshacer.')) return;
  records = defaultRecords();
  highlightIndex = -1;
  try { localStorage.removeItem(RECORDS_KEY); } catch (err) { /* ignorar */ }
  // En el Game Over, la partida recién terminada puede pasar a calificar.
  if (finishedGame && !recordSaved && !pendingRecord) offerNameEntry();
  renderAllRecords();
}

function offerNameEntry() {
  pendingRecord = qualifiesForTop(finishedGame.score);
  if (pendingRecord) {
    playerNameInput.value = loadLastName();
    nameEntry.classList.remove('hidden');
    playerNameInput.focus();
    playerNameInput.select();
  } else {
    nameEntry.classList.add('hidden');
  }
}

function handleGameOverRecords() {
  finishedGame = { score, lines, level };
  recordSaved = false;
  highlightIndex = -1;
  // Releer por si otra pestaña guardó récords mientras se jugaba.
  records = loadRecords();
  // Las estadísticas globales se actualizan siempre, entre o no en el top.
  records.bestCombo = Math.max(records.bestCombo, maxComboThisGame);
  records.maxLines = Math.max(records.maxLines, lines);
  saveRecords();

  overlayRecordsEl.classList.remove('hidden');
  renderRecords(overlayRecordsEl, -1);
  offerNameEntry();
}

function saveCurrentRecord() {
  if (!pendingRecord || !finishedGame) return;
  pendingRecord = false;
  recordSaved = true;
  const name = truncateName(playerNameInput.value.trim()) || 'Anónimo';
  try { localStorage.setItem(LAST_NAME_KEY, name); } catch (e) { /* ignorar */ }

  records = loadRecords();
  const entry = { name, ...finishedGame, date: new Date().toISOString() };
  records.top.push(entry);
  records.top.sort((a, b) => b.score - a.score); // estable: empates previos quedan por encima
  records.top = records.top.slice(0, MAX_RECORDS);
  highlightIndex = records.top.indexOf(entry);
  saveRecords();

  nameEntry.classList.add('hidden');
  playerNameInput.blur();
  renderAllRecords();
}

function shouldIgnoreGameKey(e) {
  const tag = e.target && e.target.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return true;
  if (startScreen.classList.contains('hidden')) return false;
  // En la pantalla de inicio solo Enter (o Space sin foco en un botón) empieza la partida.
  if (e.code === 'Enter' || e.code === 'NumpadEnter' || (e.code === 'Space' && tag !== 'BUTTON')) {
    e.preventDefault();
    startGame();
  }
  return true;
}

function showStartScreen() {
  cancelAnimationFrame(animId);
  records = loadRecords();
  renderRecords(startRecordsEl, -1);
  startScreen.classList.remove('hidden');
}

function startGame() {
  startScreen.classList.add('hidden');
  playBtn.blur();
  init();
}

saveRecordBtn.addEventListener('click', () => {
  saveCurrentRecord();
  saveRecordBtn.blur();
});

playerNameInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    saveCurrentRecord();
  }
});

playBtn.addEventListener('click', startGame);

init();
showStartScreen();
draw();
