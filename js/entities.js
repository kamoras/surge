/* ============================================================
   Entity creation + spawning, plus the player dash.

   Covers the player factory, enemy/elite spawning, and tryDash().
   Combat resolution (damage, death, pickups) lives in combat.js.
   ============================================================ */
import { game } from './state.js';
import { W, H, WORLD_W, WORLD_H, camX, camY } from './canvas.js';
import { ETYPES } from './data.js';
import { rand, randi, TAU } from './utils.js';
import { floatText } from './effects.js';
import { Sound } from './audio.js';
import { keys, touch } from './input.js';

export function makePlayer() {
  return {
    x: WORLD_W / 2, y: WORLD_H / 2, r: 13, hp: 100, maxHp: 100,
    speed: 225, dmg: 9, fireRate: 0.48, projSpeed: 520, projCount: 1,
    pierce: 0, range: 95, regen: 0, aim: 0,
    iframe: 0, muzzle: 0, projSize: 4.2, spread: 0.18,
    crit: 0, critMult: 2.1, lifesteal: 0,
    orbCount: 0, orbAngle: 0,
    dashCd: 1.8, dashTimer: 0, dashing: 0, dashVX: 0, dashVY: 0,
    furyScale: 0, dashExplode: false, chainLightning: false,
    // surge system
    surge: 0, surgeMax: 100, surgeChargeRate: 8,
    surgeRadius: 180, surgeDmgMult: 1.0,
    surgeActive: 0, surgeRing: 0, surgeNova: false,
  };
}

/** A random point just outside the current viewport edges (in world coords). */
export function edgePoint() {
  const m = 50;
  const vx = camX, vy = camY;
  const side = randi(0, 3);
  if (side === 0) return { x: rand(vx - m, vx + W + m), y: vy - m };
  if (side === 1) return { x: vx + W + m, y: rand(vy - m, vy + H + m) };
  if (side === 2) return { x: rand(vx - m, vx + W + m), y: vy + H + m };
  return { x: vx - m, y: rand(vy - m, vy + H + m) };
}

/** Pick a weighted enemy type (mix shifts over time) and spawn it. */
export function spawnEnemy() {
  const t = game.time;
  const weights = [['grunt', 10]];
  if (t > 12) weights.push(['rusher', 4 + t * 0.08]);
  if (t > 30) weights.push(['tank', 2 + t * 0.04]);
  if (t > 40) weights.push(['shielder', 1.5 + t * 0.03]);
  if (t > 50) weights.push(['splitter', 2 + t * 0.05]);
  if (t > 65) weights.push(['warper', 1 + t * 0.025]);
  let total = weights.reduce((s, w) => s + w[1], 0), roll = Math.random() * total, type = 'grunt';
  for (const [name, wt] of weights) { if ((roll -= wt) <= 0) { type = name; break; } }
  addEnemy(type, edgePoint());
}

export function addEnemy(type, pos) {
  const base = ETYPES[type], t = game.time;
  // gentle early ramp, steeper after 90s so the game eventually overwhelms
  const hpScale = t < 90 ? 1 + t / 50 : 1 + 90 / 50 + (t - 90) / 35;
  const spdScale = t < 90 ? 1 + t / 220 : 1 + 90 / 220 + (t - 90) / 160;
  game.enemies.push({
    type, x: pos.x, y: pos.y, r: base.r,
    hp: base.hp * hpScale, maxHp: base.hp * hpScale,
    speed: base.speed * spdScale, dmg: base.dmg,
    color: base.color, xp: base.xp, score: base.score,
    flash: 0, wob: rand(0, TAU), orbCd: 0,
    // warper blink state: visible for 0.6s, then teleport, repeat
    warpTimer: type === 'warper' ? rand(0.3, 0.6) : 0,
    warpVisible: true,
    // shielder: shield faces toward player, blocks frontal bullets
    shieldAngle: 0,
  });
}

/** Periodic pink mini-boss. Scales with time and drops rewards on death. */
export function spawnElite() {
  const t = game.time, pos = edgePoint();
  const hp = 220 + t * 4;
  game.enemies.push({
    type: 'elite', x: pos.x, y: pos.y, r: 32,
    hp, maxHp: hp, speed: 44 + t * 0.06, dmg: 22,
    color: '#ff7ad0', xp: 16, score: 220,
    flash: 0, wob: rand(0, TAU), orbCd: 0, isElite: true,
  });
  floatText(camX + W / 2, camY + 70, 'ELITE INCOMING', '#ff7ad0', true);
  game.shake = Math.min(game.shake + 4, 10);
  Sound.elite();
}

/** Release the surge shockwave. Damage and radius scale with charge level. */
export function trySurge() {
  if (game.state !== 'playing') return;
  const p = game.player;
  if (!p || p.surge < 20) return;  // need at least 20% charge
  const pct = p.surge / p.surgeMax;
  p.surgeActive = pct;
  p.surgeRing = 0;
  p.surge = 0;
  Sound.bomb();
  if (pct > 0.7) game.shake = Math.min(game.shake + 6, 10);
}

/** Dash in the current input direction (or last move dir), with i-frames. */
export function tryDash() {
  if (game.state !== 'playing') return;
  const p = game.player;
  if (!p || p.dashTimer > 0 || p.dashing > 0) return;

  let ix = 0, iy = 0;
  if (keys['w'] || keys['arrowup']) iy -= 1;
  if (keys['s'] || keys['arrowdown']) iy += 1;
  if (keys['a'] || keys['arrowleft']) ix -= 1;
  if (keys['d'] || keys['arrowright']) ix += 1;
  if (touch.active) { ix += touch.dx; iy += touch.dy; }

  let dx, dy;
  const im = Math.hypot(ix, iy);
  if (im > 0.1) { dx = ix / im; dy = iy / im; }
  else { dx = game.lastMoveX; dy = game.lastMoveY; }
  const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;

  const sp = p.speed * 3.6;
  p.dashVX = dx * sp; p.dashVY = dy * sp;
  p.dashing = 0.14;
  p.dashTimer = p.dashCd;
  p.iframe = Math.max(p.iframe, 0.24);
  Sound.dash();
}
