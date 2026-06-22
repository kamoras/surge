/* ============================================================
   The per-frame simulation step.

   Design notes (research-backed):
   - Spawn lulls between waves create tension-release cycles (flow)
   - Grace period on game start prevents frustration deaths (onboarding)
   - Dynamic difficulty: spawn rate scales down when HP is low (flow channel)
   - XP near level-up boosts pickup attraction (goal gradient effect)
   - Death state runs slow-mo for 1.2s before game over (peak-end rule)
   ============================================================ */
import { game } from './state.js';
import { W, H } from './canvas.js';
import { keys, touch } from './input.js';
import { rand, randi, clamp, lerp, dist2, TAU, compactInPlace } from './utils.js';
import { spawnEnemy, spawnElite } from './entities.js';
import { fireWeapon, damageEnemy, hurtPlayer, collectGem } from './combat.js';
import { burst, floatText } from './effects.js';
import { Sound } from './audio.js';
import { WAVES, MILESTONES } from './data.js';
import { endGame } from './hud.js';

export function update(dt) {
  game.time += dt;
  const p = game.player;

  // death slow-mo: sim runs at 20% speed, then triggers game over
  if (game.state === 'dying') {
    game.deathTimer -= dt;
    if (game.deathTimer <= 0) { endGame(); return; }
    dt *= 0.2;
    updateEphemera(dt);
    updateEnemies(p, dt);
    if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 30);
    return;
  }

  if (game.graceTimer > 0) game.graceTimer -= dt;
  if (game.comboLostFlash > 0) game.comboLostFlash -= dt;

  updateCombo(dt);
  updateFlash(dt);
  updateSpawning(dt);
  updateWaves();
  updateMilestones();
  updatePlayerMovement(p, dt);
  updatePlayerTimers(p, dt);
  updateAimAndFire(p, dt);
  updateBullets(dt);
  updateEnemies(p, dt);
  updateOrbs(p, dt);
  updatePickups(p, dt);
  updateEphemera(dt);

  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 60);
}

function updateCombo(dt) {
  if (game.comboTimer > 0) {
    game.comboTimer -= dt;
    if (game.comboTimer <= 0) game.combo = 0;
  }
}

function updateFlash(dt) {
  if (game.flash > 0) game.flash = Math.max(0, game.flash - dt * 1.8);
}

function updateSpawning(dt) {
  // wave lull: brief spawn pause during wave transitions (tension-release)
  if (game.waveLull > 0) { game.waveLull -= dt; return; }

  const t = game.time;
  const p = game.player;

  // dynamic difficulty: spawn slower when HP is critically low (flow channel)
  const hpRatio = p.hp / p.maxHp;
  const ddaFactor = hpRatio < 0.3 ? 1.6 : hpRatio < 0.5 ? 1.2 : 1.0;

  // faster spawns in the first 8 seconds so the game feels immediate
  const baseInterval = t < 8 ? 0.7 : 1.1 - t * 0.012;
  const spawnInterval = Math.max(0.16, baseInterval * ddaFactor);
  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0) {
    game.spawnTimer = spawnInterval;
    let count = 1 + Math.floor(t / 45);
    if (t > 20 && Math.random() < 0.12) count += randi(2, 4);
    for (let i = 0; i < count; i++) spawnEnemy();
  }
  game.eliteTimer -= dt;
  if (game.eliteTimer <= 0) { game.eliteTimer = rand(34, 44); spawnElite(); }
}

function updateWaves() {
  if (game.waveNum >= WAVES.length) return;
  const [startTime, label] = WAVES[game.waveNum];
  if (game.time >= startTime) {
    floatText(W / 2, H / 2 - 60, label, '#9a7bff', true);
    game.shake = Math.min(game.shake + 6, 14);
    Sound.level();
    game.waveNum++;
    // brief lull between waves: 1.5s of no spawns (tension-release cycle)
    game.waveLull = 1.5;
  }
}

function updateMilestones() {
  if (game.nextMilestone >= MILESTONES.length) return;
  const target = MILESTONES[game.nextMilestone];
  if (game.kills >= target) {
    floatText(W / 2, H / 2, target + ' KILLS', '#ffce4f', true);
    game.score += target;
    game.shake = Math.min(game.shake + 8, 14);
    burst(game.player.x, game.player.y, '#ffce4f', 16, 240);
    Sound.pickup();
    game.nextMilestone++;
  }
}

function updatePlayerMovement(p, dt) {
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
    for (const e of game.enemies) {
      if (e.dead || e.orbCd > 0) continue;
      const rr = e.r + p.r + 6;
      if (dist2(p.x, p.y, e.x, e.y) < rr * rr) {
        damageEnemy(e, p.dmg * 1.5, p.x, p.y, true);
        e.orbCd = 0.25;
      }
    }
    p.dashVX *= 0.84; p.dashVY *= 0.84;
  } else {
    p.x = clamp(p.x + mx * p.speed * dt, p.r, W - p.r);
    p.y = clamp(p.y + my * p.speed * dt, p.r, H - p.r);
    // subtle movement trail when actively moving
    if (mag > 0 && Math.random() < 0.35) {
      game.parts.push({ x: p.x - mx * 8, y: p.y - my * 8, vx: 0, vy: 0, life: 0.15, max: 0.15, color: 'rgba(243,234,215,0.2)', size: 2.5 });
    }
  }
}

function updatePlayerTimers(p, dt) {
  if (p.iframe > 0) p.iframe -= dt;
  if (p.muzzle > 0) p.muzzle -= dt;
  if (p.regen > 0) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
}

function updateAimAndFire(p, dt) {
  let nearest = null, nd = Infinity;
  for (const e of game.enemies) {
    const d = dist2(p.x, p.y, e.x, e.y);
    if (d < nd) { nd = d; nearest = e; }
  }
  if (nearest) p.aim = Math.atan2(nearest.y - p.y, nearest.x - p.x);

  game.fireTimer -= dt;
  if (game.fireTimer <= 0 && nearest) {
    game.fireTimer = p.fireRate;
    fireWeapon(p);
    Sound.shoot();
  }
}

function updateBullets(dt) {
  compactInPlace(game.bullets, b => {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0 || b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30) return false;
    for (const e of game.enemies) {
      if (e.dead) continue;
      if (b.hits && b.hits.has(e)) continue;
      const rr = b.r + e.r;
      if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
        damageEnemy(e, b.dmg, b.x, b.y, true);
        if (!b.hits) b.hits = new Set();
        b.hits.add(e);
        if (b.pierce > 0) { b.pierce--; }
        else return false;
      }
    }
    return true;
  });
}

function updateEnemies(p, dt) {
  compactInPlace(game.enemies, e => {
    if (e.dead) return false;
    if (e.flash > 0) e.flash -= dt;
    if (e.orbCd > 0) e.orbCd -= dt;
    const ang = Math.atan2(p.y - e.y, p.x - e.x);
    e.wob += dt * 3;

    if (e.type === 'rusher') {
      const wob = Math.sin(e.wob) * 0.4;
      e.x += Math.cos(ang + wob) * e.speed * dt;
      e.y += Math.sin(ang + wob) * e.speed * dt;
    } else if (e.type === 'tank') {
      const lunge = (Math.sin(e.wob * 0.7) > 0.92) ? 2.4 : 1;
      e.x += Math.cos(ang) * e.speed * lunge * dt;
      e.y += Math.sin(ang) * e.speed * lunge * dt;
    } else if (e.type === 'splitter') {
      const orbit = Math.sin(e.wob * 0.5) * 0.5;
      e.x += Math.cos(ang + orbit) * e.speed * dt;
      e.y += Math.sin(ang + orbit) * e.speed * dt;
    } else if (e.type === 'shielder') {
      // shield faces the player; moves directly but slightly slower
      e.shieldAngle = ang + Math.PI;
      e.x += Math.cos(ang) * e.speed * dt;
      e.y += Math.sin(ang) * e.speed * dt;
    } else if (e.type === 'warper') {
      // blinks: visible briefly, then teleports closer
      e.warpTimer -= dt;
      if (e.warpTimer <= 0) {
        if (e.warpVisible) {
          // teleport toward player
          const warpDist = rand(60, 120);
          e.x += Math.cos(ang) * warpDist;
          e.y += Math.sin(ang) * warpDist;
          e.warpVisible = false;
          e.warpTimer = 0.2;
          burst(e.x, e.y, e.color, 6, 180);
        } else {
          e.warpVisible = true;
          e.warpTimer = rand(0.5, 0.8);
        }
      }
      // drift slowly even while visible
      if (e.warpVisible) {
        e.x += Math.cos(ang) * e.speed * 0.4 * dt;
        e.y += Math.sin(ang) * e.speed * 0.4 * dt;
      }
    } else if (e.type === 'elite') {
      const strafe = Math.sin(e.wob * 0.4) * 0.6;
      e.x += Math.cos(ang + strafe) * e.speed * dt;
      e.y += Math.sin(ang + strafe) * e.speed * dt;
    } else {
      e.x += Math.cos(ang) * e.speed * dt;
      e.y += Math.sin(ang) * e.speed * dt;
    }

    // skip contact damage during death slow-mo and grace period
    if (game.state === 'dying') return true;
    const rr = e.r + p.r;
    if (p.iframe <= 0 && dist2(e.x, e.y, p.x, p.y) < rr * rr) {
      hurtPlayer(e.dmg);
      e.x -= Math.cos(ang) * 14; e.y -= Math.sin(ang) * 14;
    }
    return true;
  });
}

function updateOrbs(p, dt) {
  if (p.orbCount <= 0) return;
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

function updatePickups(p, dt) {
  // goal gradient: when XP > 75% of level, boost pickup attraction
  const xpRatio = game.xpNeed > 0 ? game.xp / game.xpNeed : 0;
  const rangeBoost = xpRatio > 0.75 ? 1.4 : 1.0;

  compactInPlace(game.gems, g => {
    g.life -= dt; g.bob += dt * 5;
    const d2 = dist2(g.x, g.y, p.x, p.y);
    const effectiveRange = p.range * rangeBoost;
    if (d2 < effectiveRange * effectiveRange) {
      const d = Math.sqrt(d2) || 1;
      const pull = lerp(60, 560, 1 - clamp(d / effectiveRange, 0, 1));
      g.x += (p.x - g.x) / d * pull * dt;
      g.y += (p.y - g.y) / d * pull * dt;
    }
    if (d2 < (p.r + 10) * (p.r + 10)) { collectGem(g); return false; }
    if (g.life <= 0) return false;
    return true;
  });
}

function updateEphemera(dt) {
  compactInPlace(game.parts, pa => {
    pa.x += pa.vx * dt; pa.y += pa.vy * dt;
    pa.vx *= 0.92; pa.vy *= 0.92; pa.life -= dt;
    return pa.life > 0;
  });
  compactInPlace(game.floats, f => {
    f.y += f.vy * dt; f.vy *= 0.94; f.life -= dt;
    return f.life > 0;
  });
}
