/* ============================================================
   The per-frame simulation step.

   Advances spawning, movement, dash, aiming/firing, bullets,
   enemies, orbiting shards, pickups, and ephemera. Pure state
   mutation — rendering happens separately in render.js.
   ============================================================ */
import { game } from './state.js';
import { W, H } from './canvas.js';
import { keys, touch } from './input.js';
import { rand, randi, clamp, lerp, dist2, TAU } from './utils.js';
import { spawnEnemy, spawnElite } from './entities.js';
import { fireWeapon, damageEnemy, hurtPlayer, collectGem } from './combat.js';
import { Sound } from './audio.js';

export function update(dt) {
  game.time += dt;
  const p = game.player;

  // ---- combo decay + flash fade ----
  if (game.comboTimer > 0) { game.comboTimer -= dt; if (game.comboTimer <= 0) game.combo = 0; }
  if (game.flash > 0) game.flash = Math.max(0, game.flash - dt * 1.8);

  // ---- difficulty / spawning ----
  const t = game.time;
  const spawnInterval = Math.max(0.16, 1.1 - t * 0.012);
  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0) {
    game.spawnTimer = spawnInterval;
    let count = 1 + Math.floor(t / 45);
    if (t > 20 && Math.random() < 0.12) count += randi(2, 4); // mini-burst
    for (let i = 0; i < count; i++) spawnEnemy();
  }
  // ---- elite cadence ----
  game.eliteTimer -= dt;
  if (game.eliteTimer <= 0) { game.eliteTimer = rand(34, 44); spawnElite(); }

  // ---- player movement / dash ----
  let mx = 0, my = 0;
  if (keys['w'] || keys['arrowup']) my -= 1;
  if (keys['s'] || keys['arrowdown']) my += 1;
  if (keys['a'] || keys['arrowleft']) mx -= 1;
  if (keys['d'] || keys['arrowright']) mx += 1;
  if (touch.active) { mx += touch.dx; my += touch.dy; }
  const mag = Math.hypot(mx, my);
  if (mag > 0) { mx /= mag; my /= mag; game.lastMoveX = mx; game.lastMoveY = my; }

  if (p.dashTimer > 0) p.dashTimer -= dt;
  if (p.dashing > 0) {
    p.dashing -= dt;
    game.parts.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.2, max: 0.2, color: 'rgba(154,123,255,0.55)', size: 7 });
    p.x = clamp(p.x + p.dashVX * dt, p.r, W - p.r);
    p.y = clamp(p.y + p.dashVY * dt, p.r, H - p.r);
    p.dashVX *= 0.84; p.dashVY *= 0.84;
  } else {
    p.x = clamp(p.x + mx * p.speed * dt, p.r, W - p.r);
    p.y = clamp(p.y + my * p.speed * dt, p.r, H - p.r);
  }

  if (p.iframe > 0) p.iframe -= dt;
  if (p.muzzle > 0) p.muzzle -= dt;
  if (p.regen > 0) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);

  // ---- aim at nearest enemy ----
  let nearest = null, nd = Infinity;
  for (const e of game.enemies) {
    const d = dist2(p.x, p.y, e.x, e.y);
    if (d < nd) { nd = d; nearest = e; }
  }
  if (nearest) p.aim = Math.atan2(nearest.y - p.y, nearest.x - p.x);

  // ---- firing ----
  game.fireTimer -= dt;
  if (game.fireTimer <= 0 && nearest) {
    game.fireTimer = p.fireRate;
    fireWeapon(p);
    Sound.shoot();
  }

  // ---- bullets ----
  for (let i = game.bullets.length - 1; i >= 0; i--) {
    const b = game.bullets[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0 || b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30) { game.bullets.splice(i, 1); continue; }
    for (const e of game.enemies) {
      if (e.dead) continue;
      if (b.hits && b.hits.has(e)) continue;
      const rr = (b.r + e.r);
      if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
        damageEnemy(e, b.dmg, b.x, b.y, true);
        if (!b.hits) b.hits = new Set();
        b.hits.add(e);
        if (b.pierce > 0) { b.pierce--; }
        else { game.bullets.splice(i, 1); break; }
      }
    }
  }

  // ---- enemies ----
  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const e = game.enemies[i];
    if (e.dead) { game.enemies.splice(i, 1); continue; }
    if (e.flash > 0) e.flash -= dt;
    if (e.orbCd > 0) e.orbCd -= dt;
    const ang = Math.atan2(p.y - e.y, p.x - e.x);
    e.wob += dt * 3;
    const wob = e.type === 'rusher' ? Math.sin(e.wob) * 0.4 : 0;
    e.x += Math.cos(ang + wob) * e.speed * dt;
    e.y += Math.sin(ang + wob) * e.speed * dt;
    const rr = e.r + p.r;
    if (p.iframe <= 0 && dist2(e.x, e.y, p.x, p.y) < rr * rr) {
      hurtPlayer(e.dmg);
      e.x -= Math.cos(ang) * 14; e.y -= Math.sin(ang) * 14; // small knockback
    }
  }

  // ---- orbiting shards ----
  if (p.orbCount > 0) {
    p.orbAngle += dt * 2.7;
    const R = 48, od = p.dmg * 0.7;
    for (let k = 0; k < p.orbCount; k++) {
      const a = p.orbAngle + k / p.orbCount * TAU;
      const ox = p.x + Math.cos(a) * R, oy = p.y + Math.sin(a) * R;
      for (const e of game.enemies) {
        if (e.dead || e.orbCd > 0) continue;
        const rr = e.r + 7;
        if (dist2(ox, oy, e.x, e.y) < rr * rr) {
          damageEnemy(e, od, ox, oy, true);
          e.orbCd = 0.3;
        }
      }
    }
  }

  // ---- gems / pickups ----
  for (let i = game.gems.length - 1; i >= 0; i--) {
    const g = game.gems[i];
    g.life -= dt; g.bob += dt * 5;
    const d2 = dist2(g.x, g.y, p.x, p.y);
    if (d2 < p.range * p.range) {
      const d = Math.sqrt(d2) || 1;
      const pull = lerp(60, 560, 1 - clamp(d / p.range, 0, 1));
      g.x += (p.x - g.x) / d * pull * dt;
      g.y += (p.y - g.y) / d * pull * dt;
    }
    if (d2 < (p.r + 10) * (p.r + 10)) { collectGem(g); game.gems.splice(i, 1); continue; }
    if (g.life <= 0) game.gems.splice(i, 1);
  }

  // ---- particles ----
  for (let i = game.parts.length - 1; i >= 0; i--) {
    const pa = game.parts[i];
    pa.x += pa.vx * dt; pa.y += pa.vy * dt;
    pa.vx *= 0.92; pa.vy *= 0.92; pa.life -= dt;
    if (pa.life <= 0) game.parts.splice(i, 1);
  }
  // ---- floaters ----
  for (let i = game.floats.length - 1; i >= 0; i--) {
    const f = game.floats[i];
    f.y += f.vy * dt; f.vy *= 0.94; f.life -= dt;
    if (f.life <= 0) game.floats.splice(i, 1);
  }

  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 60);
}
