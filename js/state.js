/* ============================================================
   Shared game state + persistence.

   `game` is a single mutable object imported by every system. It is
   reset (not replaced) on each run via Object.assign in hud.startGame,
   so the reference stays stable across modules.
   ============================================================ */

/** Seconds a combo survives without a kill before it decays. */
export const COMBO_WINDOW = 3.0;

/* ---------- best-score persistence (localStorage) ---------- */
const BEST_KEY = 'surge_best_v1';
const BEST_COMBO_KEY = 'surge_best_combo_v1';
const BEST_TIME_KEY = 'surge_best_time_v1';
const GAMES_KEY = 'surge_games_v1';
export function loadBest() {
  try { return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0; }
  catch (e) { return 0; }
}
export function saveBest(v) {
  try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) {}
}
export function loadBestCombo() {
  try { return parseInt(localStorage.getItem(BEST_COMBO_KEY) || '0', 10) || 0; }
  catch (e) { return 0; }
}
export function saveBestCombo(v) {
  try { localStorage.setItem(BEST_COMBO_KEY, String(v)); } catch (e) {}
}
export function loadBestTime() {
  try { return parseFloat(localStorage.getItem(BEST_TIME_KEY) || '0') || 0; }
  catch (e) { return 0; }
}
export function saveBestTime(v) {
  try { localStorage.setItem(BEST_TIME_KEY, String(v)); } catch (e) {}
}
export function loadGamesPlayed() {
  try { return parseInt(localStorage.getItem(GAMES_KEY) || '0', 10) || 0; }
  catch (e) { return 0; }
}
export function saveGamesPlayed(v) {
  try { localStorage.setItem(GAMES_KEY, String(v)); } catch (e) {}
}

export const game = {
  state: 'menu',           // menu | playing | levelup | paused | over | dying
  time: 0, kills: 0, score: 0,
  shake: 0, slow: 0, flash: 0, best: 0,
  combo: 0, comboTimer: 0, maxCombo: 0,
  bestCombo: 0, bestTime: 0, gamesPlayed: 0,
  eliteTimer: 0, waveTimer: 0, waveNum: 0,
  waveLull: 0,
  lastMoveX: 1, lastMoveY: 0,
  player: null, enemies: [], bullets: [], gems: [], parts: [], floats: [],
  spawnTimer: 0, fireTimer: 0, level: 1, xp: 0, xpNeed: 6, pendingLevels: 0,
  lastT: 0,
  nextMilestone: 0,
  deathTimer: 0,
  graceTimer: 0,
  landmarks: [],
};
game.best = loadBest();
game.bestCombo = loadBestCombo();
game.bestTime = loadBestTime();
game.gamesPlayed = loadGamesPlayed();

/** Current score multiplier from the active combo (up to ~5.8x). */
export function comboMult() { return 1 + Math.min(game.combo, 120) * 0.04; }

/**
 * Score rank thresholds. Derived from expected score distribution --
 * gives players a concrete goal to aim for on their next run.
 */
export function scoreRank(score) {
  if (score >= 4000) return 'S';
  if (score >= 2200) return 'A';
  if (score >= 1000) return 'B';
  if (score >= 400)  return 'C';
  return 'D';
}
