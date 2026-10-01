const FONT = {
  F: ['######', '#     ', '#     ', '##### ', '#     ', '#     ', '#     '],
  E: ['######', '#     ', '#     ', '##### ', '#     ', '#     ', '######'],
  D: ['##### ', '#    #', '#    #', '#    #', '#    #', '#    #', '##### '],
  R: ['##### ', '#    #', '#    #', '##### ', '#  #  ', '#   # ', '#    #'],
  I: ['  ##  ', '  ##  ', '  ##  ', '  ##  ', '  ##  ', '  ##  ', '  ##  '],
  C: [' #### ', '#    #', '#     ', '#     ', '#     ', '#    #', ' #### '],
  O: [' #### ', '#    #', '#    #', '#    #', '#    #', '#    #', ' #### '],
  S: [' #####', '#     ', '#     ', ' #### ', '     #', '     #', '##### '],
  A: ['  ##  ', ' #  # ', '#    #', '######', '#    #', '#    #', '#    #'],
  T: ['######', '  ##  ', '  ##  ', '  ##  ', '  ##  ', '  ##  ', '  ##  '],
  N: ['#    #', '##   #', '# #  #', '#  # #', '#   ##', '#    #', '#    #'],
  K: ['#    #', '#   # ', '#  #  ', '###   ', '#  #  ', '#   # ', '#    #']
};

const LETTER_W = 6;
const LETTER_H = 7;
const LETTER_GAP = 1.5;
const WORD_GAP_ROWS = 2.5;

const CENTER_ZONE = 0.22;
// Slightly bigger jumps than the original 22 - same grid tabs.js's own
// panel slide snaps to (--tabs-grid-step, style.css), kept in step with it
// there too.
const GRID_STEP = 26;
const TRANSITION_MS = 350;
// Quantizes the resetting/triggered transitions' own elapsed time into
// chunks this long (matching tabs.js's own --tabs-step-interval) instead of
// recomputing a smooth, continuous position every single frame - the same
// "rasterized" stepped-time technique tabs.js's panel slide already uses,
// now shared by the glyph transition too.
const TRANSITION_STEP_MS = 45;
const TOP_MARGIN = 0;

function buildWordCells(word, rowOffset, gap) {
  const cells = [];
  let colOffset = 0;
  let letterIndex = 0;
  for (const ch of word) {
    const glyph = FONT[ch];
    // Tags every one of this letter's own cells with which letter (and
    // where that letter's own tightly-packed reserved slot starts, in cell
    // units) they belong to - col/row themselves are completely untouched,
    // this is purely additive bookkeeping so refreshWideSpacing/tick (below)
    // can later shift a whole letter's cells together, as one rigid unit,
    // instead of stretching each cell's own position independently (which
    // would pull a single glyph's own internal pixels apart from each
    // other).
    const letterStartCol = colOffset;
    for (let r = 0; r < LETTER_H; r++) {
      for (let c = 0; c < LETTER_W; c++) {
        if (glyph[r][c] === '#') {
          cells.push({ col: colOffset + c, row: rowOffset + r, letterIndex, letterCount: word.length, letterStartCol });
        }
      }
    }
    colOffset += LETTER_W + gap;
    letterIndex++;
  }
  return { cells, width: colOffset - gap };
}

const word1 = buildWordCells('FEDERICO', 0, LETTER_GAP);
const word2Letters = 'OSATNIK'.length;
const word2Gap = (word1.width - word2Letters * LETTER_W) / (word2Letters - 1);
const word2 = buildWordCells('OSATNIK', LETTER_H + WORD_GAP_ROWS, word2Gap);

const totalWidth = Math.max(word1.width, word2.width);
const totalHeight = LETTER_H * 2 + WORD_GAP_ROWS;

const allCells = [...word1.cells, ...word2.cells];

const canvas = document.getElementById('nameCanvas');
const ctx = canvas.getContext('2d');
const tagline = document.getElementById('tagline');

const TAGLINE_TEXT = 'multidisciplinary designer & photographer';
const taglineChars = TAGLINE_TEXT.replace(/ /g, '_').split('').map(ch => {
  const span = document.createElement('span');
  span.className = 'tagline-char grid-char';
  span.textContent = ch;
  if (tagline) tagline.appendChild(span);
  return span;
});

// Hides the tagline instantly (no movement, no fade transition).
function scatterTagline() {
  taglineChars.forEach(span => {
    span.style.opacity = '0';
  });
}

// Reverses scatterTagline(): the tagline reappears instantly.
function settleTagline() {
  taglineChars.forEach(span => {
    span.style.transform = 'translate(0, 0)';
    span.style.opacity = '1';
  });
}

let particles = [];
let cellSize = 20;
let boxOriginX = 0;
let boxWidth = 0;
// The collapsed OSATNIK column's own top edge and total height - the
// vertical-layout counterparts to boxOriginX/boxWidth above (see
// buildBoxTargets).
let boxOriginY = 0;
let boxHeight = 0;
// The collapsed OSATNIK column's own grid dimensions, in whole cells - the
// same grid buildBoxTargets lays every letter's pixels out on, exposed here
// so tick()'s own cursor-escape logic (below) can pick another real cell of
// this exact grid instead of inventing a separate one.
let boxCols = 0;
let boxRows = 0;
let originX = 0;
let originY = 0;

// Self-contained (doesn't depend on tabs.js, which may not have loaded yet
// the first time layout()/buildBoxTargets run) read of a plain CSS custom
// property already defined in style.css, in px.
function readCssPx(varName, fallback) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  const v = parseFloat(raw);
  return isNaN(v) ? fallback : v;
}

// The collapsed target every particle - both FEDERICO's own and OSATNIK's -
// animates to once triggered. A vertical column, one whole letter per row-
// band (never rotated), pinned to the screen's own left margin - the same
// strip tabs.js's own computeTargets() keeps free of any real tab panel
// (--reset-tab-width + --tabs-left-shift, read live, never hardcoded) -
// instead of a single horizontal row across the top.
//
// Unlike the landing's own FEDERICO/OSATNIK block (drawn from the negative-
// space idea: glyphs everywhere except the letters), this column is built
// the opposite way - the glyphs THEMSELVES trace each letter, positively -
// since a negative-space letterform needs much more surrounding width than
// this narrow side margin has to spend. Each letter gets its own small,
// purpose-built pixel grid (OSATNIK_LETTERS below), flattened/short (few
// rows) so seven of them stack inside one viewport height, but drawn at
// however many COLUMNS actually fit the real available width - never at a
// shrunk cell size (buildBoxTargets always reads the exact same `cellSize`
// layout() already computed for the landing block itself).

function makeLetterGrid(cols, rows) {
  return Array.from({ length: rows }, () => new Array(cols).fill(false));
}
function fillLetterRect(g, r0, r1, c0, c1) {
  const rows = g.length, cols = g[0].length;
  for (let r = Math.max(0, r0); r <= Math.min(rows - 1, r1); r++) {
    for (let c = Math.max(0, c0); c <= Math.min(cols - 1, c1); c++) g[r][c] = true;
  }
}

// One purpose-built pixel design per letter of OSATNIK - not a reuse of the
// landing's own FEDERICO/OSATNIK typography, and not derived from it. Each
// is a function of (cols, rows) rather than a fixed bitmap, so it always
// uses the real column count buildBoxTargets works out for the actual
// available width (never a shrunk cell size - just more or fewer columns of
// the same-size cells), while a FIXED, deliberately short row count keeps
// every letter flat enough for all seven to stack within one viewport
// height. Every letter reserves a themed but readable silhouette - "O" is a
// hollow ring (not a solid block), "S" its three bars, "A" its apex/
// crossbar/legs, "T" its top bar and stem, "N" its diagonal, "I" its top/
// bottom serifs (not a bare column), "K" its two diagonals - proportioned
// off cols/rows so the same design still holds together at whatever width
// actually fits.
const OSATNIK_LETTERS = {
  O(cols, rows) {
    const g = makeLetterGrid(cols, rows);
    const bw = Math.max(1, Math.round(cols * 0.22));
    const bh = Math.max(1, Math.round(rows * 0.22));
    fillLetterRect(g, 0, rows - 1, 0, bw - 1);
    fillLetterRect(g, 0, rows - 1, cols - bw, cols - 1);
    fillLetterRect(g, 0, bh - 1, 0, cols - 1);
    fillLetterRect(g, rows - bh, rows - 1, 0, cols - 1);
    return g;
  },
  S(cols, rows) {
    const g = makeLetterGrid(cols, rows);
    const bh = Math.max(1, Math.round(rows * 0.24));
    const midTop = Math.floor((rows - bh) / 2);
    const legW = Math.max(1, Math.round(cols * 0.34));
    fillLetterRect(g, 0, bh - 1, 0, cols - 1);
    fillLetterRect(g, midTop, midTop + bh - 1, 0, cols - 1);
    fillLetterRect(g, rows - bh, rows - 1, 0, cols - 1);
    fillLetterRect(g, bh, midTop - 1, 0, legW - 1);
    fillLetterRect(g, midTop + bh, rows - bh - 1, cols - legW, cols - 1);
    return g;
  },
  A(cols, rows) {
    const g = makeLetterGrid(cols, rows);
    const legW = Math.max(1, Math.round(cols * 0.22));
    const barRow = Math.round(rows * 0.6);
    for (let r = 0; r < rows; r++) {
      const t = rows === 1 ? 0 : r / (rows - 1);
      const left = Math.round((cols / 2 - legW) * (1 - t));
      const right = cols - 1 - left;
      fillLetterRect(g, r, r, left, left + legW - 1);
      fillLetterRect(g, r, r, right - legW + 1, right);
    }
    fillLetterRect(g, barRow, barRow + Math.max(1, Math.round(rows * 0.18)) - 1, 0, cols - 1);
    return g;
  },
  T(cols, rows) {
    const g = makeLetterGrid(cols, rows);
    const bh = Math.max(1, Math.round(rows * 0.24));
    const stemW = Math.max(1, Math.round(cols * 0.3));
    const stemLeft = Math.floor((cols - stemW) / 2);
    fillLetterRect(g, 0, bh - 1, 0, cols - 1);
    fillLetterRect(g, bh, rows - 1, stemLeft, stemLeft + stemW - 1);
    return g;
  },
  N(cols, rows) {
    const g = makeLetterGrid(cols, rows);
    const bw = Math.max(1, Math.round(cols * 0.22));
    const strokeW = Math.max(1, Math.round(cols * 0.24));
    fillLetterRect(g, 0, rows - 1, 0, bw - 1);
    fillLetterRect(g, 0, rows - 1, cols - bw, cols - 1);
    for (let r = 0; r < rows; r++) {
      const t = rows === 1 ? 0 : r / (rows - 1);
      const c = Math.round(t * (cols - strokeW));
      fillLetterRect(g, r, r, c, c + strokeW - 1);
    }
    return g;
  },
  I(cols, rows) {
    const g = makeLetterGrid(cols, rows);
    const bh = Math.max(1, Math.round(rows * 0.22));
    const stemW = Math.max(1, Math.round(cols * 0.3));
    const stemLeft = Math.floor((cols - stemW) / 2);
    fillLetterRect(g, 0, bh - 1, 0, cols - 1);
    fillLetterRect(g, rows - bh, rows - 1, 0, cols - 1);
    fillLetterRect(g, bh, rows - bh - 1, stemLeft, stemLeft + stemW - 1);
    return g;
  },
  K(cols, rows) {
    const g = makeLetterGrid(cols, rows);
    const bw = Math.max(1, Math.round(cols * 0.24));
    const strokeW = Math.max(1, Math.round(cols * 0.26));
    fillLetterRect(g, 0, rows - 1, 0, bw - 1);
    const mid = (rows - 1) / 2;
    for (let r = 0; r < rows; r++) {
      const t = mid === 0 ? 0 : Math.abs(r - mid) / mid;
      const c = Math.round(bw + t * (cols - bw - strokeW));
      fillLetterRect(g, r, r, c, c + strokeW - 1);
    }
    return g;
  }
};

function buildBoxTargets(totalParticles, viewportH) {
  const word = 'OSATNIK';
  const numLetters = word.length;
  const marginWidth = readCssPx('--reset-tab-width', 28) + readCssPx('--tabs-left-shift', 0);

  // Same cell size the landing's own FEDERICO/OSATNIK block already uses
  // this frame - never shrunk to force the word to fit (per the request);
  // only the column count (how much of the real available width each
  // letter's own grid spans) and the row count (how flat each letter's own
  // grid is) adapt.
  // Guards against a transient 0 (or otherwise non-positive) cellSize -
  // possible for one single frame if layout() is ever asked to run against
  // a not-yet-sized viewport - dividing by it would make cols come out
  // Infinity and crash the whole animation loop for good (a single bad
  // frame is far worse than one frame with a degenerate, briefly-wrong
  // column count that self-corrects the next time layout() runs for real).
  const cellPx = cellSize > 0 ? cellSize : 1;
  const cols = Math.max(5, Math.round(marginWidth / cellPx));
  // Deliberately short and flat - just enough rows for every one of the
  // seven letters above to stay clearly recognizable (each shape was
  // designed and tested at this row count) - not derived by trial division
  // of the available height; that number instead decides the gap between
  // letters, below, so the whole seven-letter column still uses the real
  // available height without ever changing this row count or the cell
  // size.
  const letterRows = 5;

  // One row of blank space between consecutive letters - "muy poco espacio
  // pero constante" - dropped to zero only if seven letters at this cell
  // size still wouldn't fit in the viewport's own height even with no gap
  // at all (an extreme/short-viewport fallback; the cell size itself is
  // still never reduced).
  const neededNoGap = numLetters * letterRows * cellPx;
  const gapRows = (neededNoGap + (numLetters - 1) * cellPx <= viewportH) ? 1 : 0;

  const totalRows = numLetters * letterRows + (numLetters - 1) * gapRows;

  boxOriginX = (marginWidth - cols * cellPx) / 2;
  boxWidth = cols * cellPx;
  boxHeight = totalRows * cellPx;
  boxOriginY = (viewportH - boxHeight) / 2;
  boxCols = cols;
  boxRows = totalRows;

  // Every "on" cell across all seven letters, in reading order - the actual
  // glyph positions. There are usually far fewer of these than
  // totalParticles (every pixel from both FEDERICO and OSATNIK in the
  // landing block combined), so they're handed out cyclically - every
  // position gets at least one particle before any position gets a second,
  // and so on - rather than leaving the surplus stranded or piling it all
  // onto just the first few cells.
  const onCells = [];
  for (let li = 0; li < numLetters; li++) {
    const letterGrid = OSATNIK_LETTERS[word[li]](cols, letterRows);
    const rowStart = li * (letterRows + gapRows);
    for (let r = 0; r < letterRows; r++) {
      for (let c = 0; c < cols; c++) {
        if (letterGrid[r][c]) onCells.push({ row: rowStart + r, col: c });
      }
    }
  }

  const targets = new Array(totalParticles);
  for (let i = 0; i < totalParticles; i++) {
    const cell = onCells[i % onCells.length];
    targets[i] = {
      x: boxOriginX + cell.col * cellPx,
      y: boxOriginY + cell.row * cellPx,
      // This particle's own real letter-grid cell - the cursor-escape logic
      // in tick() hops particles between cells of this exact same grid, so
      // it needs the row/col each one actually started from, not just its
      // pixel position.
      row: cell.row,
      col: cell.col
    };
  }
  return targets;
}

function layout() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * devicePixelRatio;
  canvas.height = h * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

  const maxCompW = w * 0.75;
  const maxCompH = h * 0.525;
  cellSize = Math.min(maxCompW / totalWidth, maxCompH / totalHeight);

  const compW = totalWidth * cellSize;
  const compH = totalHeight * cellSize;
  originX = (w - compW) / 2;
  originY = (h - compH) / 2;

  const prevParticles = particles;
  const boxTargets = buildBoxTargets(allCells.length, h);

  const root = document.documentElement.style;
  // The topmost point the glyphs actually reach while assembled into the
  // landing's own "FEDERICO OSATNIK" display (originY - the top of the
  // "FEDERICO" row, dispersion===0 in tick()) - NOT TOP_MARGIN (the
  // separate, generic top the collapsed single-word OSATNIK title box
  // itself targets, --osatnik-block-bottom below). Tab titles line up with
  // this one specifically (see .tab-header in style.css) instead of a
  // hardcoded value, so they stay correctly aligned with the real glyph
  // geometry at any viewport size.
  root.setProperty('--osatnik-landing-top', originY + 'px');
  // The collapsed OSATNIK column's own box (js/tabs.js has nothing to do
  // with this - it's read straight off buildBoxTargets' own layout) -
  // .osatnik-hotspot's click/touch area (style.css) is sized/positioned
  // from these directly, so it always exactly covers the column, vertical
  // or not, at any viewport size.
  root.setProperty('--osatnik-block-top', boxOriginY + 'px');
  root.setProperty('--osatnik-block-height', boxHeight + 'px');
  root.setProperty('--osatnik-block-left', boxOriginX + 'px');
  root.setProperty('--osatnik-block-width', boxWidth + 'px');
  root.setProperty('--landing-tagline-top', (originY + compH + 10) + 'px');
  root.setProperty('--glyph-cell-size', cellSize + 'px');

  particles = allCells.map((cell, i) => {
    const homeX = originX + cell.col * cellSize;
    const homeY = originY + cell.row * cellSize;
    const angle = Math.random() * Math.PI * 2;
    const magnitude = w * (0.35 + Math.random() * 0.55);
    const prev = prevParticles[i];
    return {
      homeX, homeY,
      scatterX: Math.cos(angle) * magnitude,
      scatterY: Math.sin(angle) * magnitude,
      curX: prev ? prev.curX : homeX,
      curY: prev ? prev.curY : homeY,
      boxX: boxTargets[i].x,
      boxY: boxTargets[i].y,
      // Carried straight through from the cell that built this particle
      // (see buildWordCells) - which whole letter it belongs to, and that
      // letter's own tightly-packed left edge - so refreshWideSpacing/tick
      // (below) can shift every particle of a given letter by the exact
      // same amount, moving each glyph as one rigid, undistorted unit.
      letterIndex: cell.letterIndex,
      letterCount: cell.letterCount,
      letterHomeLeft: originX + cell.letterStartCol * cellSize,
      // The cursor-escape effect's own grid-cell state (see REPEL_RADIUS/
      // tick() below). baseRow/baseCol is this particle's real letter-grid
      // cell, straight from boxTargets above; cellRow/cellCol is whichever
      // cell it's CURRENTLY occupying (itself, until an escape hop claims a
      // different one). Always reset to the fresh base cell on layout()
      // itself, never carried over from the previous particle array the way
      // curX/curY are - a resize can change the whole grid's own column/row
      // count, so an old cell index could point somewhere else entirely.
      baseRow: boxTargets[i].row,
      baseCol: boxTargets[i].col,
      cellRow: boxTargets[i].row,
      cellCol: boxTargets[i].col,
      hopFromX: null,
      hopFromY: null,
      hopStart: null
    };
  });

  // Invalidates the wider center-zone spacing (see refreshWideSpacing/tick
  // below) rather than recomputing it here directly - tabs.js's own resize
  // handler (which actually moves the About tab this reads the position of)
  // listens for the same 'resize' event this layout() does, and either one
  // could run first depending on registration order. Recomputing lazily on
  // the very next tick() frame instead - by which point both handlers have
  // already finished for this event - always sees About's real post-resize
  // position, never a stale pre-resize one.
  wideSpacingReady = false;
}

// Widens the letter spacing shown when the mouse sits near the screen's
// center (dispersion === 0 in tick(), below - the landing's "assembled, not
// yet scattered" look) - keeping the whole glyph block's own right edge
// exactly where it already is (wideBlockRight, from the existing
// originX/totalWidth/cellSize layout), so the block's new left edge ends up
// exactly as far from the screen's own left edge as the block's (unmoved)
// right edge is from the About Me tab's own left edge - read live off its
// real DOM position (never hardcoded), so this keeps holding at any
// viewport width.
//
// Each glyph moves as one rigid, undistorted unit: every particle's own
// pixel stays exactly where it was relative to its own letter (its
// letterHomeLeft, from layout() above) - only each LETTER's own reserved
// slot shifts, packed left-to-right with one constant gap between slots
// (wideLetterLeft, below), never a per-particle scale (which would stretch
// a single glyph's own internal pixels apart from each other - the earlier
// version's mistake).
//
// wideSpacingReady is invalidated by layout() itself (on resize, and once
// tabs.js's own panels don't exist yet on first load) - see the lazy check
// in tick() for why this recomputes there instead of inside layout()
// directly.
let wideBlockRight = 0;
let wideRowLeft = 0;
let wideRowWidth = 0;
let wideSpacingReady = false;

function refreshWideSpacing() {
  wideBlockRight = originX + totalWidth * cellSize;
  wideRowWidth = totalWidth * cellSize;
  wideRowLeft = wideBlockRight - wideRowWidth;
  const aboutEl = document.querySelector('.tab-panel[data-panel="about"]');
  // tabs.js hasn't built its panels yet (only possible on the very first
  // layout(), before its own script tag has even run) - leave the row width
  // at its plain, unwidened value and try again next frame, rather than
  // widen against a nonexistent tab's position.
  if (!aboutEl) return;
  const aboutLeft = aboutEl.getBoundingClientRect().left;
  const marginB = Math.max(0, aboutLeft - wideBlockRight);
  const oldWidth = totalWidth * cellSize;
  wideRowWidth = Math.max(oldWidth, wideBlockRight - marginB);
  wideRowLeft = wideBlockRight - wideRowWidth;
  wideSpacingReady = true;
}

// This letter's own new reserved-slot left edge, in pixels - every letter
// in a row (letterCount of them, all LETTER_W cells wide, same font for
// both FEDERICO and OSATNIK) packed left-to-right from wideRowLeft with one
// constant gap between consecutive slots, sized so the whole row spans
// exactly wideRowWidth (solving "gap = (available - sum of letter widths) /
// (letterCount - 1)", same math for either row regardless of its own
// letter count, since both must still span that same shared width to stay
// lined up with each other).
function wideLetterLeft(letterIndex, letterCount) {
  const letterWidthPx = LETTER_W * cellSize;
  if (letterCount <= 1) return wideRowLeft;
  const gap = (wideRowWidth - letterCount * letterWidthPx) / (letterCount - 1);
  return wideRowLeft + letterIndex * (letterWidthPx + gap);
}

// Cursor-escape on the settled OSATNIK column, once a tab is actually open
// (see tick()'s own "triggered" branch, t>=1) - reuses the exact same
// letter-grid buildBoxTargets/layout already built for the column itself
// (boxOriginX/boxOriginY/cellSize/boxCols/boxRows), instead of any separate
// coordinate system: a glyph that needs to dodge the cursor always jumps
// from its current CELL to another real, in-bounds cell of that same grid
// (cellRow/cellCol on each particle - see layout() above), never to a free
// pixel offset. p.curX/curY (used everywhere else in this file, including
// as the starting point of the next landing/box transition) always end up
// snapped to wherever that hop currently, visually is, so nothing else in
// the file needs to know this exists. Skipped entirely on touch/coarse
// pointers (checked once, not per frame) and, thanks to living only in this
// one branch, automatically skipped for the whole landing too.
const REPEL_SUPPORTED = typeof window.matchMedia === 'function' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;
// How close the cursor has to get to a glyph's own current cell before it
// starts hopping away - large enough that actually pinning one down by
// chasing it is genuinely difficult.
const REPEL_RADIUS = 110;
// How long one single cell-to-cell hop's own draw-time interpolation takes,
// quantized via the exact same stepped-elapsed/TRANSITION_STEP_MS technique
// every other transition in this file already uses (see tick()'s
// resetting/box branches) and the same snap()/GRID_STEP rounding on the
// result - so a hop reads as one more rasterized jump in the site's
// existing motion language, never a smooth glide.
const CELL_HOP_MS = 140;
// A short settle pause after a hop finishes before the next escape/return
// decision is allowed to start another one - keeps every jump a distinct,
// complete step instead of a blurred chain of overlapping ones.
const CELL_HOP_COOLDOWN_MS = 50;

// This cell's own exact pixel position - the same formula buildBoxTargets
// itself already builds every particle's boxX/boxY from, just callable per
// cell so a hop's destination is always a real grid coordinate.
function cellPixelX(col) { return boxOriginX + col * cellSize; }
function cellPixelY(row) { return boxOriginY + row * cellSize; }

const CELL_NEIGHBOR_OFFSETS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1]
];

// Which cells are, right now, some particle's TEMPORARY (non-base) cell -
// rebuilt fresh every frame (see tick()) and kept up to date hop-by-hop
// within that same frame (startHopTo, below), so two glyphs escaping at once
// never choose the same destination cell. A cell a particle occupies simply
// by sitting at its own unmoved base letter cell is deliberately left out of
// this - several particles already legitimately share one base cell by
// design (see buildBoxTargets' own cyclic onCells reuse) - so this only ever
// prevents collisions between glyphs that are actively mid-escape.
const escapedCells = new Set();

// The neighboring in-bounds, unclaimed cell that increases this particle's
// own distance from the cursor the most - or null if every neighbor is
// either out of the grid, already claimed by another escaping glyph this
// same frame, or wouldn't actually put more distance between the glyph and
// the cursor than just staying put.
function pickEscapeCell(p, mx, my) {
  let best = null;
  let bestDist = -Infinity;
  for (const [dr, dc] of CELL_NEIGHBOR_OFFSETS) {
    const row = p.cellRow + dr;
    const col = p.cellCol + dc;
    if (row < 0 || row >= boxRows || col < 0 || col >= boxCols) continue;
    if (escapedCells.has(row + ',' + col)) continue;
    const d = Math.hypot(cellPixelX(col) - mx, cellPixelY(row) - my);
    if (d > bestDist) {
      bestDist = d;
      best = { row, col };
    }
  }
  const curDist = Math.hypot(cellPixelX(p.cellCol) - mx, cellPixelY(p.cellRow) - my);
  return best && bestDist > curDist ? best : null;
}

// One step back toward this particle's own real base cell - straight
// (diagonal) if that neighbor is free, falling back to a single axis if not,
// so a multi-cell trip home plays out as "celda temporal -> celda
// intermedia -> celda original" across a few consecutive hops instead of one
// long jump. Landing exactly on the base cell is always allowed even if
// other particles already rest there - base overlaps are the normal,
// existing composition, not a collision.
function pickReturnCell(p) {
  const dr = Math.sign(p.baseRow - p.cellRow);
  const dc = Math.sign(p.baseCol - p.cellCol);
  const steps = [];
  if (dr !== 0 && dc !== 0) steps.push([dr, dc]);
  if (dr !== 0) steps.push([dr, 0]);
  if (dc !== 0) steps.push([0, dc]);
  for (const [sr, sc] of steps) {
    const row = p.cellRow + sr;
    const col = p.cellCol + sc;
    if (row === p.baseRow && col === p.baseCol) return { row, col };
    if (!escapedCells.has(row + ',' + col)) return { row, col };
  }
  return null;
}

// Claims (row,col) as this particle's new current cell and starts its
// visual hop toward it from wherever it currently, exactly is - keeping
// escapedCells accurate mid-frame (see its own comment above) so later
// particles in this same tick() pass never pick a cell this one just took.
function startHopTo(p, row, col, now) {
  escapedCells.delete(p.cellRow + ',' + p.cellCol);
  p.hopFromX = cellPixelX(p.cellCol);
  p.hopFromY = cellPixelY(p.cellRow);
  p.cellRow = row;
  p.cellCol = col;
  p.hopStart = now;
  if (row !== p.baseRow || col !== p.baseCol) {
    escapedCells.add(row + ',' + col);
  }
}

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let triggered = false;
let resetting = false;
let introCompleteDispatched = false;
let transitionStart = null;
let transitionFrom = null;

function trigger() {
  if (triggered) return;
  triggered = true;
  resetting = false;
  introCompleteDispatched = false;
  transitionStart = performance.now();
  transitionFrom = particles.map(p => ({ x: p.curX, y: p.curY }));
  window.removeEventListener('click', trigger);
  window.removeEventListener('wheel', trigger);
  window.removeEventListener('touchstart', trigger);
  scatterTagline();
  // From this same moment the glyphs start rising to form the OSATNIK
  // title, they read as above the tabs (see the 'body:not(.is-landing)
  // #nameCanvas' rule in style.css) instead of below them, the way they sit
  // for the whole rest of the landing (see tabs.js's own pointer-events:auto
  // tabs-container, now visible from load) - one class flip, exactly in
  // step with the one transition that's already starting here, so the
  // z-order changes with it rather than as a separate, later event.
  document.body.classList.remove('is-landing');
  // Opens the requested tab (tabs.js's own pendingLandingOpenIndex - About
  // by default, or whichever tab was clicked directly) from this exact same
  // moment, not once this glyph animation finishes - so the panel's own
  // slide and the glyphs collapsing into OSATNIK run at the same time,
  // neither waiting on the other. tabs.js has always finished loading by
  // the time any click can actually happen, so selectPanel is always
  // defined here - this check only guards a build where tabs.js failed to
  // load at all.
  if (typeof selectPanel === 'function' && typeof pendingLandingOpenIndex === 'number') {
    selectPanel(pendingLandingOpenIndex);
  }
  window.dispatchEvent(new Event('portfolio:firstInteraction'));
}

// Undoes trigger(): animates the glyphs from the OSATNIK block back to their
// scattered starting layout, then re-arms the click/wheel/touch listeners.
function resetToStart() {
  if (!triggered) return;
  triggered = false;
  resetting = true;
  transitionStart = performance.now();
  transitionFrom = particles.map(p => ({ x: p.curX, y: p.curY }));
  window.addEventListener('click', trigger);
  window.addEventListener('wheel', trigger, { passive: true });
  window.addEventListener('touchstart', trigger, { passive: true });
  settleTagline();
  // Back to the landing's own layer order - see trigger() above.
  document.body.classList.add('is-landing');
}

window.addEventListener('mousemove', e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

window.addEventListener('touchmove', e => {
  if (e.touches.length) {
    mouseX = e.touches[0].clientX;
    mouseY = e.touches[0].clientY;
  }
}, { passive: true });

window.addEventListener('click', trigger);
window.addEventListener('wheel', trigger, { passive: true });
window.addEventListener('touchstart', trigger, { passive: true });

// Debug helper: logs the exact click position, visible in the browser console.
window.addEventListener('click', e => {
  console.log('[click]', 'x:', e.clientX, 'y:', e.clientY, 'target:', e.target);
});

window.addEventListener('resize', layout);

function snap(v) {
  return Math.round(v / GRID_STEP) * GRID_STEP;
}

function drawGlyph(x, y) {
  ctx.fillText('#', x, y);
}

function tick(now) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  ctx.clearRect(0, 0, w, h);
  // Same gray as the inside of an open tab (--tab-open-bg, #e5e5e5 - see
  // style.css), with a fully opaque fill of its own (no alpha) - #nameCanvas
  // itself still has its own mix-blend-mode:multiply (style.css), blending
  // that solid color against whatever's behind the canvas.
  ctx.fillStyle = 'rgb(229, 229, 229)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.max(cellSize * 0.9, 7)}px 'Courier New', monospace`;

  if (resetting) {
    const elapsed = now - transitionStart;
    const steppedElapsed = Math.floor(elapsed / TRANSITION_STEP_MS) * TRANSITION_STEP_MS;
    const t = Math.min(1, steppedElapsed / TRANSITION_MS);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const from = transitionFrom[i];
      p.curX = snap(from.x + (p.homeX - from.x) * t);
      p.curY = snap(from.y + (p.homeY - from.y) * t);
      drawGlyph(p.curX + cellSize / 2, p.curY + cellSize / 2);
    }
    if (t >= 1) resetting = false;
  } else if (!triggered) {
    // Lazy, not called from layout() directly - see refreshWideSpacing's
    // own comment for why (tabs.js's About tab may not exist yet, or its
    // resize handler may not have finished moving it yet, at the moment
    // layout() itself runs).
    if (!wideSpacingReady) refreshWideSpacing();

    const cx = w / 2;
    const cy = h / 2;
    const dist = Math.hypot(mouseX - cx, mouseY - cy);
    const maxDist = Math.hypot(cx, cy);
    const zoneDist = maxDist * CENTER_ZONE;

    let dispersion;
    if (dist <= zoneDist) {
      dispersion = 0;
    } else {
      dispersion = (dist - zoneDist) / (maxDist - zoneDist);
      dispersion = Math.min(1, Math.pow(dispersion, 1.4));
    }

    for (const p of particles) {
      // Shifts this particle's whole letter, rigidly, from its tightly-
      // packed slot (p.letterHomeLeft) to its new, more widely spaced one
      // (wideLetterLeft) - every particle belonging to that same letter
      // gets the exact same shift, so the glyph's own internal pixels never
      // move relative to each other, only the letter as a whole does. The
      // wider spacing shown once dispersion settles to 0 is carried through
      // unchanged as the mouse moves away and dispersion ramps up, exactly
      // like homeX already was.
      const shift = wideLetterLeft(p.letterIndex, p.letterCount) - p.letterHomeLeft;
      p.curX = snap(p.homeX + shift + p.scatterX * dispersion);
      p.curY = snap(p.homeY + p.scatterY * dispersion);
      drawGlyph(p.curX + cellSize / 2, p.curY + cellSize / 2);
    }
  } else {
    const elapsed = now - transitionStart;
    const steppedElapsed = Math.floor(elapsed / TRANSITION_STEP_MS) * TRANSITION_STEP_MS;
    const t = Math.min(1, steppedElapsed / TRANSITION_MS);
    if (t < 1) {
      // Still mid-flight from the landing to OSATNIK's own settled
      // composition - exactly the existing behavior, untouched; the
      // repulsion effect below only ever starts once a particle has
      // actually arrived at its own resting p.boxX/boxY.
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const from = transitionFrom[i];
        p.curX = snap(from.x + (p.boxX - from.x) * t);
        p.curY = snap(from.y + (p.boxY - from.y) * t);
        drawGlyph(p.curX + cellSize / 2, p.curY + cellSize / 2);
      }
    } else {
      // Rebuilt fresh every frame from each particle's own current cell -
      // see escapedCells' own comment above.
      escapedCells.clear();
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        if (p.cellRow !== p.baseRow || p.cellCol !== p.baseCol) {
          escapedCells.add(p.cellRow + ',' + p.cellCol);
        }
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (REPEL_SUPPORTED) {
          const hopElapsed = p.hopStart === null ? Infinity : now - p.hopStart;
          // A hop is left alone - no new escape/return decision - until its
          // own draw-time interpolation plus a short settle pause has fully
          // played out, so every jump reads as one distinct, complete step
          // rather than a chain of overlapping ones.
          if (hopElapsed >= CELL_HOP_MS + CELL_HOP_COOLDOWN_MS) {
            const px = cellPixelX(p.cellCol);
            const py = cellPixelY(p.cellRow);
            const dist = Math.hypot(px - mouseX, py - mouseY);
            const atBase = p.cellRow === p.baseRow && p.cellCol === p.baseCol;
            if (dist < REPEL_RADIUS) {
              const dest = pickEscapeCell(p, mouseX, mouseY);
              if (dest) startHopTo(p, dest.row, dest.col, now);
            } else if (!atBase) {
              const dest = pickReturnCell(p);
              if (dest) startHopTo(p, dest.row, dest.col, now);
            }
          }
        }

        // Renders the hop with the exact same technique every other
        // transition in this file already uses - elapsed time chunked into
        // TRANSITION_STEP_MS steps, then the lerped result snapped to
        // GRID_STEP - so a jump between two real letter-grid cells reads as
        // one more rasterized motion, never a smooth/free glide. Once a hop
        // finishes (t>=1) the glyph simply sits at its new cell's own exact
        // pixel position until the next decision starts another one.
        const targetX = cellPixelX(p.cellCol);
        const targetY = cellPixelY(p.cellRow);
        let drawX = targetX;
        let drawY = targetY;
        if (p.hopStart !== null) {
          const elapsed = now - p.hopStart;
          const steppedElapsed = Math.floor(elapsed / TRANSITION_STEP_MS) * TRANSITION_STEP_MS;
          const t = Math.min(1, steppedElapsed / CELL_HOP_MS);
          if (t < 1) {
            drawX = p.hopFromX + (targetX - p.hopFromX) * t;
            drawY = p.hopFromY + (targetY - p.hopFromY) * t;
          }
        }
        p.curX = snap(drawX);
        p.curY = snap(drawY);
        drawGlyph(p.curX + cellSize / 2, p.curY + cellSize / 2);
      }
    }
    if (t >= 1 && !introCompleteDispatched) {
      introCompleteDispatched = true;
      window.dispatchEvent(new Event('portfolio:introComplete'));
    }
  }

  requestAnimationFrame(tick);
}

layout();
requestAnimationFrame(tick);
