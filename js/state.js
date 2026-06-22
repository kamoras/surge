/* ============================================================
   Shared game state + persistence.

   `game` is a single mutable object imported by every system. It is
   reset (not replaced) on each run via Object.assign in hud.startGame,
   so the reference stays stable across modules.
   ============================================================ */

/** Seconds a combo survives without a kill before it resets. */
export const COMBO_WINDOW = 1.8;

/* ---------- best-score persistence (localStorage) ---------- */
const BEST_KEY = 'surge_best_v1';
export function loadBest() {
  try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; }
  catch (e) { return 0; }
}
export function saveBest(v) {
  try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) {}
}

export const game = {
  state: 'menu',           // menu | playing | levelup | paused | over
  time: 0, kills: 0, score: 0,
  shake: 0, slow: 0, flash: 0, best: 0,
  combo: 0, comboTimer: 0, maxCombo: 0,
  eliteTimer: 0, waveTimer: 0, waveNum: 0,
  lastMoveX: 1, lastMoveY: 0,
  player: null, enemies: [], bullets: [], gems: [], parts: [], floats: [],
  spawnTimer: 0, fireTimer: 0, level: 1, xp: 0, xpNeed: 6, pendingLevels: 0,
  lastT: 0,
  nextMilestone: 0,
};
game.best = loadBest();

/** Current score multiplier from the active combo (up to ~5.8x). */
export function comboMult() { return 1 + Math.min(game.combo, 120) * 0.04; }
