# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A browser Tetris game in vanilla JavaScript on an HTML5 Canvas. It has no dependencies, no `package.json`, no build step, no linter and no test suite. The UI text and README are in Spanish, so keep new user-facing strings in Spanish.

## Running

```bash
open index.html                 # open the file directly
python3 -m http.server 8000     # or serve it statically → http://localhost:8000
```

To check a change, reload the page in a browser. There are no automated tests.

## Architecture

- `index.html` provides the DOM: `#board` canvas (300×600), the `#next-canvas` preview (120×120), HUD spans (`#score`, `#lines`, `#level`), and a single `#overlay` that serves as both the pause screen and the game-over screen (`#overlay-title`, `#overlay-score`, `#restart-btn`).
- `game.js` is one script (strict mode, no modules). Its game state lives in module-level `let` variables (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, `animId`, …). `init()` resets all of them and also runs when Restart is clicked.
- `style.css` holds the dark/retro styling. Hiding the overlay depends on the `.hidden` class.

Key mechanics in `game.js`:
- **Board model:** a `ROWS × COLS` matrix. Each cell is `0` (empty) or a piece type index 1–7, which also indexes `COLORS` and `PIECES`. Both arrays have `null` at index 0, so piece types and color indices stay aligned. Change them together.
- **Pieces** are square matrices whose cells hold the piece's own type number. `rotateCW` does a transpose plus row reverse. `tryRotate` tries the column kicks `[0, -1, 1, -2, 2]`. These are simple kicks, not SRS.
- **`collide(shape, x, y)`** is the single validity check used for movement, rotation, gravity, the ghost piece and spawn. Cells above the board (`y < 0`) are allowed.
- **Flow:** `loop` (requestAnimationFrame) builds up `dropAccum` until it reaches `dropInterval`, then moves the piece down or calls `lockPiece()`. `lockPiece()` runs `merge()`, then `clearLines()`, then `spawn()`. If `spawn()` collides immediately, it calls `endGame()`.
- **Scoring/levels:** `LINE_SCORES[cleared] * level`. A soft drop scores +1 per row and a hard drop +2 per cell. The level is `floor(lines/10)+1`, and `dropInterval = max(100, 1000 − (level−1)·90)`.
- **Pause** works by cancelling and restarting the RAF loop (`togglePause`). It does not use a flag check inside `loop`.

## Gotchas

- If you change `COLS`, `ROWS` or `BLOCK`, also update the `width`/`height` of `<canvas id="board">` in `index.html` so they equal `COLS×BLOCK` by `ROWS×BLOCK`.
- `drawNext` assumes a 4×4 grid of 30px cells, which matches the 120×120 preview canvas.
