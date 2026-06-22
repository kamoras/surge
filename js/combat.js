/* ============================================================
   Combat resolution + pickups.

   Core design: combo IS your power. Every kill extends it. Every
   hit resets it to ZERO. Damage, surge, and score all scale with
   combo. This creates the central tension: stay aggressive to stay
   powerful, but one mistake costs everything.
   ============================================================ */
import { game, comboMult } from './state.js';
import { rand, clamp, TAU } from './utils.js';
import { Sound } from './audio.js';
import { burst, floatText } from './effects.js';
import { addEnemy } from './entities.js';
import { offerUpgrades } from './upgrades.js';
import { triggerDeath } from './hud.js';
import { comboDmgScale } from './data.js';
import { camX, camY, W, H } from './canvas.js';

export function fireWeapon(p) {
  const n = Math.min(p.projCount, 6);
  const base = p.aim;
  const fury = p.furyScale > 0
    ? 1 + clamp(game.combo * p.furyScale, 0, 0.72)
    : 1;
  const comboDmg = comboDmgScale(game.combo);
  const dmg = p.dmg * fury * comboDmg;
  // for even counts, use n+1 slots so a projectile always fires dead-center
  const slots = (n > 1 && n % 2 === 0) ? n + 1 : n;
  for (let i = 0; i < slots; i++) {
    const off = slots === 1 ? 0 : (i - (slots - 1) / 2) * p.spread;
    const a = base + off;
    game.bullets.push({
      x: p.x + Math.cos(a) * p.r, y: p.y + Math.sin(a) * p.r,
      vx: Math.cos(a) * p.projSpeed, vy: Math.sin(a) * p.projSpeed,
      r: p.projSize, dmg, life: 1.6, pierce: p.pierce, hits: null,
    });
  }
  p.muzzle = 0.06;
}

export function damageEnemy(e, dmg, x, y, canCrit) {
  const p = game.player;
  if (e.type === 'shielder') {
    const hitAngle = Math.atan2(y - e.y, x - e.x);
    let diff = hitAngle - e.shieldAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) < Math.PI / 3) {
      burst(x, y, '#4fc3f7', 3, 100);
      return;
    }
  }
  // armored bosses take 50% less damage
  if (e.bossDef === 'armored') dmg *= 0.5;
  let isCrit = false;
  if (canCrit && p.crit > 0 && Math.random() < p.crit) { dmg *= p.critMult; isCrit = true; }
  e.hp -= dmg; e.flash = 0.09;
  if (isCrit) Sound.crit(); else Sound.hit();
  burst(x, y, e.color, isCrit ? 7 : 4, isCrit ? 260 : 160);
  floatText(e.x, e.y - e.r - 2, Math.round(dmg), isCrit ? '#ffce4f' : '#fff', isCrit);
  if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
  if (e.dead) return;
  e.dead = true;
  const p = game.player;
  game.kills++;
  game.combo++;
  if (game.combo > game.maxCombo) game.maxCombo = game.combo;
  game.score += Math.round(e.score * comboMult());
  if (p.lifesteal > 0) p.hp = Math.min(p.maxHp, p.hp + p.lifesteal);
  if (p.surgeNova && p.surgeActive > 0) p.surge = p.surgeMax;

  // chain lightning
  if (p.chainLightning) {
    let nearest = null, nd = Infinity;
    for (const other of game.enemies) {
      if (other === e || other.dead) continue;
      const d = (other.x - e.x) ** 2 + (other.y - e.y) ** 2;
      if (d < nd && d < 180 * 180) { nd = d; nearest = other; }
    }
    if (nearest) {
      damageEnemy(nearest, p.dmg * 0.4, nearest.x, nearest.y, false);
      const dx = nearest.x - e.x, dy = nearest.y - e.y;
      for (let i = 0; i < 5; i++) {
        const t = i / 5;
        game.parts.push({
          x: e.x + dx * t + (Math.random() - 0.5) * 8,
          y: e.y + dy * t + (Math.random() - 0.5) * 8,
          vx: 0, vy: 0, life: 0.2, max: 0.2, color: '#7bd0ff', size: 2.5,
        });
      }
    }
  }

  // escalating kill sound
  Sound.kill(game.combo);

  // combo milestone fanfare every 10
  if (game.combo > 0 && game.combo % 10 === 0) {
    Sound.comboFanfare(Math.floor(game.combo / 10));
    floatText(p.x, p.y - 40, game.combo + ' COMBO', '#ffce4f', true);
    burst(p.x, p.y, '#ffce4f', 18, 260);
    game.shake = Math.min(game.shake + 4, 10);
    // XP vacuum at milestones
    for (const g of game.gems) { g.x = p.x + rand(-15, 15); g.y = p.y + rand(-15, 15); }
    for (let i = 0; i < 3; i++) {
      game.gems.push({ kind: 'xp', x: p.x + rand(-20, 20), y: p.y + rand(-20, 20), val: 2, life: 10, bob: rand(0, TAU) });
    }
  }

  game.shake = Math.min(game.shake + (e.type === 'tank' ? 5 : 2), 10);
  burst(e.x, e.y, e.color, e.isElite ? 40 : (e.type === 'tank' ? 22 : 12), e.isElite ? 360 : 240);

  if (e.isElite) {
    for (let i = 0; i < 6; i++) game.gems.push({ kind: 'xp', x: e.x + rand(-22, 22), y: e.y + rand(-22, 22), val: 3, life: 12, bob: rand(0, TAU) });
    game.gems.push({ kind: 'heart', x: e.x - 12, y: e.y, val: 0, life: 14, bob: 0 });
    if (Math.random() < 0.6) game.gems.push({ kind: 'bomb', x: e.x + 12, y: e.y, val: 0, life: 14, bob: 0 });
    game.shake = Math.min(game.shake + 6, 12);
    floatText(e.x, e.y - e.r - 8, e.bossName ? e.bossName.toUpperCase() + ' DOWN' : 'ELITE DOWN', '#ff7ad0', true);
    // splitter bosses spawn grunts on death
    if (e.bossSpec === 'splitter') {
      for (let i = 0; i < 4; i++) addEnemy('grunt', { x: e.x + rand(-30, 30), y: e.y + rand(-30, 30) });
    }
  } else {
    const drops = e.type === 'tank' ? 3 : 1;
    for (let i = 0; i < drops; i++) {
      game.gems.push({ kind: 'xp', x: e.x + rand(-8, 8), y: e.y + rand(-8, 8), val: Math.ceil(e.xp / drops), life: 9, bob: rand(0, TAU) });
    }
    if (Math.random() < 0.05) {
      game.gems.push({ kind: 'heart', x: e.x, y: e.y, val: 0, life: 10, bob: 0 });
    } else if (Math.random() < 0.03) {
      game.gems.push({ kind: 'magnet', x: e.x, y: e.y, val: 0, life: 12, bob: 0 });
    }
    if (e.type === 'splitter') {
      for (let i = 0; i < 2; i++) addEnemy('grunt', { x: e.x + rand(-12, 12), y: e.y + rand(-12, 12) });
    }
  }
}

export function detonateBomb(x, y) {
  Sound.bomb();
  game.shake = Math.min(game.shake + 8, 12); game.flash = 0.55;
  burst(x, y, '#ff9d3d', 64, 440);
  const dmg = 120 + game.time * 1.4;
  for (const e of game.enemies) { if (!e.dead) damageEnemy(e, dmg, e.x, e.y, false); }
  floatText(x, y - 22, 'BOOM', '#ff9d3d', true);
}

export function collectGem(g) {
  const p = game.player;
  if (g.kind === 'heart') {
    Sound.heal();
    p.hp = Math.min(p.maxHp, p.hp + 30);
    burst(g.x, g.y, '#ff5d52', 12, 180);
    floatText(p.x, p.y - 26, '+30 HP', '#ff7a5c', true);
    return;
  }
  if (g.kind === 'bomb') {
    detonateBomb(g.x, g.y);
    return;
  }
  if (g.kind === 'magnet') {
    Sound.pickup();
    burst(g.x, g.y, '#9a7bff', 14, 200);
    floatText(p.x, p.y - 26, 'MAGNET', '#9a7bff', true);
    for (const other of game.gems) {
      if (other === g || other.kind === 'magnet') continue;
      other.x = p.x + rand(-15, 15);
      other.y = p.y + rand(-15, 15);
    }
    return;
  }
  Sound.pickup();
  // combo boosts XP gain so high combo = faster leveling
  const xpMult = 1 + Math.min(game.combo, 60) * 0.02;
  game.xp += Math.ceil(g.val * xpMult);
  game.score += Math.round(2 * comboMult());
  burst(g.x, g.y, '#5fe6c4', 5, 120);
  let leveled = false;
  while (game.xp >= game.xpNeed) {
    game.xp -= game.xpNeed;
    game.level++;
    game.xpNeed = Math.round(4 + game.level * 3.5 + game.level * game.level * 0.42);
    game.pendingLevels = (game.pendingLevels || 0) + 1;
    leveled = true;
  }
  if (leveled) onLevelUp();
}

function onLevelUp() {
  Sound.level();
  game.slow = 0.55;
  burst(game.player.x, game.player.y, '#ffce4f', 26, 300);
  floatText(game.player.x, game.player.y - 26, 'LEVEL ' + game.level, '#ffce4f', true);
  game.shake = Math.min(game.shake + 5, 8);
  setTimeout(() => { if (game.state === 'playing') offerUpgrades(); }, 260);
}

export function hurtPlayer(dmg) {
  const p = game.player;
  if (game.graceTimer > 0) return;
  p.hp -= dmg; p.iframe = 0.6;
  // ONE HIT = COMBO RESET TO ZERO. This is the core tension.
  const lostCombo = game.combo;
  if (lostCombo > 0) {
    game.combo = 0;
    game.comboLostFlash = 0.8;
    if (lostCombo >= 10) {
      floatText(p.x, p.y - 40, lostCombo + ' COMBO LOST', '#ff5d52', true);
    }
  }
  p.surge = Math.max(0, p.surge - p.surgeMax * 0.25);
  Sound.hurt();
  if (navigator.vibrate) navigator.vibrate(p.hp <= 0 ? [100, 50, 200] : 40);
  game.shake = Math.min(game.shake + 5, 10);
  burst(p.x, p.y, '#ff5d52', 10, 200);
  floatText(p.x, p.y - p.r - 4, '-' + dmg, '#ff5d52', false);
  if (p.hp <= 0) { p.hp = 0; triggerDeath(); }
}
