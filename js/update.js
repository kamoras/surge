/* ============================================================
   The per-frame simulation step.

   Core design: combo powers everything. More combo = faster player,
   more damage, harder enemies. One hit resets combo to zero.
   Enemy count is capped for visual clarity. Each kill matters.
   ============================================================ */
import { game } from './state.js';
import { W, H, WORLD_W, WORLD_H, camX, camY, updateCamera } from './canvas.js';
import { keys, touch } from './input.js';
import { rand, randi, clamp, lerp, dist2, TAU, compactInPlace } from './utils.js';
import { spawnEnemy, spawnElite } from './entities.js';
import { fireWeapon, damageEnemy, hurtPlayer, collectGem } from './combat.js';
import { burst, floatText } from './effects.js';
import { Sound } from './audio.js';
import { WAVES, MILESTONES, ENEMY_CAP, comboSpeedScale, comboRangeScale, comboDmgScale } from './data.js';
import { endGame } from './hud.js';

export function update(dt) {
  game.time += dt;
  const p = game.player;

  // death slow-mo
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
  updateCamera(p.x, p.y, dt);
  updatePlayerTimers(p, dt);
  updateAimAndFire(p, dt);
  updateBullets(dt);
  updateEnemies(p, dt);
  updateOrbs(p, dt);
  updateSurge(p, dt);
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
  // don't spawn if at cap
  if (game.enemies.length >= ENEMY_CAP) return;

  const t = game.time;

  // dynamic difficulty: higher combo = faster spawns
  const comboPress = 1 - clamp(game.combo / 80, 0, 0.4);
  const baseInterval = t < 8 ? 0.8 : 1.3 - t * 0.006;
  const spawnInterval = Math.max(0.3, baseInterval * comboPress);

  // DDA: slow spawns when HP is critically low
  const hpRatio = game.player.hp / game.player.maxHp;
  const ddaPause = hpRatio < 0.25 ? 1.5 : 1.0;

  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0) {
    game.spawnTimer = spawnInterval * ddaPause;
    const slotsLeft = ENEMY_CAP - game.enemies.length;
    let count = Math.min(1 + Math.floor(t / 60), slotsLeft);
    if (t > 25 && Math.random() < 0.10) count = Math.min(count + randi(1, 3), slotsLeft);
    for (let i = 0; i < count; i++) spawnEnemy();
  }

  game.eliteTimer -= dt;
  if (game.eliteTimer <= 0) { game.eliteTimer = rand(38, 50); spawnElite(); }
}

function updateWaves() {
  if (game.waveNum >= WAVES.length) return;
  const [startTime, label] = WAVES[game.waveNum];
  if (game.time >= startTime) {
    floatText(camX + W / 2, camY + H / 2 - 60, label, '#9a7bff', true);
    game.shake = Math.min(game.shake + 3, 8);
    Sound.level();
    game.waveNum++;
    game.waveLull = 1.5;
  }
}

function updateMilestones() {
  if (game.nextMilestone >= MILESTONES.length) return;
  const target = MILESTONES[game.nextMilestone];
  if (game.kills >= target) {
    floatText(camX + W / 2, camY + H / 2, target + ' KILLS', '#ffce4f', true);
    game.score += target;
    game.shake = Math.min(game.shake + 4, 8);
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

  // combo boosts movement speed
  const spdMult = comboSpeedScale(game.combo);
  const effectiveSpeed = p.speed * spdMult;

  if (p.dashTimer > 0) p.dashTimer -= dt;
  if (p.dashing > 0) {
    p.dashing -= dt;
    game.parts.push({ x: p.x, y: p.y, vx: 0, vy: 0, life: 0.2, max: 0.2, color: 'rgba(154,123,255,0.55)', size: 7 });
    p.x = clamp(p.x + p.dashVX * dt, p.r, WORLD_W - p.r);
    p.y = clamp(p.y + p.dashVY * dt, p.r, WORLD_H - p.r);
    for (const e of game.enemies) {
      if (e.dead || e.orbCd > 0) continue;
      const rr = e.r + p.r + 6;
      if (dist2(p.x, p.y, e.x, e.y) < rr * rr) {
        damageEnemy(e, p.dmg * 1.5 * comboDmgScale(game.combo), p.x, p.y, true);
        e.orbCd = 0.25;
      }
    }
    // void dash explosion at end
    if (p.dashExplode && p.dashing <= 0) {
      const dmg = p.dmg * 3;
      const r2 = 110 * 110;
      burst(p.x, p.y, '#9a7bff', 30, 320);
      game.shake = Math.min(game.shake + 5, 10);
      for (const e of game.enemies) {
        if (e.dead) continue;
        if (dist2(p.x, p.y, e.x, e.y) < r2) damageEnemy(e, dmg, p.x, p.y, true);
      }
    }
    p.dashVX *= 0.84; p.dashVY *= 0.84;
  } else {
    p.x = clamp(p.x + mx * effectiveSpeed * dt, p.r, WORLD_W - p.r);
    p.y = clamp(p.y + my * effectiveSpeed * dt, p.r, WORLD_H - p.r);
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
    if (b.life <= 0 || b.x < -30 || b.x > WORLD_W + 30 || b.y < -30 || b.y > WORLD_H + 30) return false;
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
  // enemies get faster/tougher based on combo (dynamic difficulty)
  const comboSpdBoost = 1 + clamp(game.combo / 100, 0, 0.5);

  compactInPlace(game.enemies, e => {
    if (e.dead) return false;
    if (e.flash > 0) e.flash -= dt;
    if (e.orbCd > 0) e.orbCd -= dt;
    const ang = Math.atan2(p.y - e.y, p.x - e.x);
    e.wob += dt * 3;
    const spd = e.speed * comboSpdBoost;

    if (e.type === 'rusher') {
      const wob = Math.sin(e.wob) * 0.4;
      e.x += Math.cos(ang + wob) * spd * dt;
      e.y += Math.sin(ang + wob) * spd * dt;
    } else if (e.type === 'tank') {
      const lunge = (Math.sin(e.wob * 0.7) > 0.92) ? 2.4 : 1;
      e.x += Math.cos(ang) * spd * lunge * dt;
      e.y += Math.sin(ang) * spd * lunge * dt;
    } else if (e.type === 'splitter') {
      const orbit = Math.sin(e.wob * 0.5) * 0.5;
      e.x += Math.cos(ang + orbit) * spd * dt;
      e.y += Math.sin(ang + orbit) * spd * dt;
    } else if (e.type === 'shielder') {
      e.shieldAngle = ang + Math.PI;
      e.x += Math.cos(ang) * spd * dt;
      e.y += Math.sin(ang) * spd * dt;
    } else if (e.type === 'warper') {
      e.warpTimer -= dt;
      if (e.warpTimer <= 0) {
        if (e.warpVisible) {
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
      if (e.warpVisible) {
        e.x += Math.cos(ang) * spd * 0.4 * dt;
        e.y += Math.sin(ang) * spd * 0.4 * dt;
      }
    } else if (e.type === 'elite') {
      const strafe = Math.sin(e.wob * 0.4) * 0.6;
      e.x += Math.cos(ang + strafe) * spd * dt;
      e.y += Math.sin(ang + strafe) * spd * dt;
    } else {
      e.x += Math.cos(ang) * spd * dt;
      e.y += Math.sin(ang) * spd * dt;
    }

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
  const R = 48, od = p.dmg * 0.7 * comboDmgScale(game.combo);
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

function updateSurge(p, dt) {
  const chargeRadius = 160;
  let nearbyCount = 0;
  for (const e of game.enemies) {
    if (e.dead) continue;
    if (dist2(p.x, p.y, e.x, e.y) < chargeRadius * chargeRadius) nearbyCount++;
  }
  const chargeRate = p.surgeChargeRate + nearbyCount * 4;
  p.surge = Math.min(p.surgeMax, p.surge + chargeRate * dt);

  if (p.surgeActive > 0) {
    const maxR = p.surgeRadius * (0.5 + p.surgeActive * 0.8);
    // surge damage also scales with combo
    const surgeDmg = p.dmg * 2.5 * p.surgeActive * p.surgeDmgMult * comboDmgScale(game.combo);
    p.surgeRing += maxR * 3.5 * dt;
    if (p.surgeRing < maxR) {
      const r2inner = Math.max(0, p.surgeRing - 30);
      for (const e of game.enemies) {
        if (e.dead || e.orbCd > 0) continue;
        const d = Math.sqrt(dist2(p.x, p.y, e.x, e.y));
        if (d >= r2inner && d <= p.surgeRing + 10) {
          damageEnemy(e, surgeDmg, e.x, e.y, true);
          e.orbCd = 0.4;
          const ang = Math.atan2(e.y - p.y, e.x - p.x);
          const kb = 60 * p.surgeActive;
          e.x += Math.cos(ang) * kb;
          e.y += Math.sin(ang) * kb;
        }
      }
    } else {
      p.surgeActive = 0;
    }
  }
}

function updatePickups(p, dt) {
  const rangeMult = comboRangeScale(game.combo);
  const xpRatio = game.xpNeed > 0 ? game.xp / game.xpNeed : 0;
  const rangeBoost = xpRatio > 0.75 ? 1.4 : 1.0;

  compactInPlace(game.gems, g => {
    g.life -= dt; g.bob += dt * 5;
    const d2 = dist2(g.x, g.y, p.x, p.y);
    const effectiveRange = p.range * rangeMult * rangeBoost;
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
