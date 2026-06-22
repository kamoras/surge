/* ============================================================
   Procedural boss generation.

   Bosses are assembled from random trait combinations so every
   encounter feels unique. They scale with game time so they stay
   challenging no matter how long the run goes. Each boss has a
   generated name based on its traits.

   Traits:
     movement:  direct | zigzag | teleport | charge
     defense:   none | shielded | armored | regenerating
     special:   none | spawner | splitter | enrage
   ============================================================ */
import { game } from './state.js';
import { WORLD_W, WORLD_H, W, H, camX, camY } from './canvas.js';
import { rand, randi, TAU } from './utils.js';
import { floatText } from './effects.js';
import { Sound } from './audio.js';

const MOVEMENTS = ['direct', 'zigzag', 'teleport', 'charge'];
const DEFENSES = ['none', 'none', 'shielded', 'armored', 'regenerating'];
const SPECIALS = ['none', 'none', 'spawner', 'splitter', 'enrage'];

const MOVE_NAMES = { direct: 'Stalker', zigzag: 'Serpent', teleport: 'Phantom', charge: 'Charger' };
const DEF_NAMES = { none: '', shielded: 'Shielded', armored: 'Armored', regenerating: 'Immortal' };
const SPEC_NAMES = { none: '', spawner: 'Hive', splitter: 'Hydra', enrage: 'Berserker' };

function generateName(move, defense, special) {
  const parts = [DEF_NAMES[defense], SPEC_NAMES[special], MOVE_NAMES[move]].filter(Boolean);
  return parts.join(' ') || 'Boss';
}

export function spawnBoss() {
  const t = game.time;
  const move = MOVEMENTS[randi(0, MOVEMENTS.length - 1)];
  const defense = DEFENSES[randi(0, DEFENSES.length - 1)];
  const special = SPECIALS[randi(0, SPECIALS.length - 1)];
  const name = generateName(move, defense, special);

  // scale with time: bosses get dramatically tougher
  const tier = Math.floor(t / 60) + 1;
  const hp = (300 + t * 5) * (1 + tier * 0.3);
  const baseSpeed = 42 + tier * 3;
  const dmg = 15 + tier * 3;
  const r = 36 + tier * 2;

  // spawn from a viewport edge
  const side = randi(0, 3);
  let x, y;
  if (side === 0) { x = rand(camX, camX + W); y = camY - 60; }
  else if (side === 1) { x = camX + W + 60; y = rand(camY, camY + H); }
  else if (side === 2) { x = rand(camX, camX + W); y = camY + H + 60; }
  else { x = camX - 60; y = rand(camY, camY + H); }

  game.enemies.push({
    type: 'boss', x, y, r,
    hp, maxHp: hp, speed: baseSpeed, dmg,
    color: '#ff7ad0', xp: 12 + tier * 4, score: 200 + tier * 50,
    flash: 0, wob: rand(0, TAU), orbCd: 0,
    isElite: true,
    // boss traits
    bossName: name,
    bossMove: move,
    bossDef: defense,
    bossSpec: special,
    bossTier: tier,
    bossEnraged: false,
    bossChargeTimer: rand(1.5, 3),
    bossSpawnTimer: rand(3, 5),
    warpTimer: rand(0.8, 1.5),
    warpVisible: true,
    shieldAngle: 0,
  });

  floatText(camX + W / 2, camY + 60, name.toUpperCase(), '#ff7ad0', true);
  floatText(camX + W / 2, camY + 88, 'TIER ' + tier + ' BOSS', '#c77bff', false);
  game.shake = Math.min(game.shake + 5, 10);
  Sound.elite();
}

/** Boss-specific movement/behavior, called from updateEnemies. */
export function updateBoss(e, p, ang, spd, dt) {
  e.wob += dt * 2;

  // defense traits
  if (e.bossDef === 'shielded') {
    e.shieldAngle = ang + Math.PI;
  }
  if (e.bossDef === 'regenerating') {
    e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.01 * dt);
  }

  // enrage: speed doubles below 30% HP
  if (e.bossSpec === 'enrage' && !e.bossEnraged && e.hp < e.maxHp * 0.3) {
    e.bossEnraged = true;
    e.speed *= 1.8;
    e.color = '#ff3333';
    floatText(e.x, e.y - e.r - 10, 'ENRAGED', '#ff3333', true);
  }

  // movement
  const effectiveSpd = spd * (e.bossEnraged ? 1.0 : 1.0);
  if (e.bossMove === 'direct') {
    e.x += Math.cos(ang) * effectiveSpd * dt;
    e.y += Math.sin(ang) * effectiveSpd * dt;
  } else if (e.bossMove === 'zigzag') {
    const wob = Math.sin(e.wob * 2) * 0.7;
    e.x += Math.cos(ang + wob) * effectiveSpd * dt;
    e.y += Math.sin(ang + wob) * effectiveSpd * dt;
  } else if (e.bossMove === 'teleport') {
    e.warpTimer -= dt;
    if (e.warpTimer <= 0) {
      if (e.warpVisible) {
        const warpDist = rand(80, 160);
        e.x += Math.cos(ang) * warpDist;
        e.y += Math.sin(ang) * warpDist;
        e.warpVisible = false;
        e.warpTimer = 0.25;
      } else {
        e.warpVisible = true;
        e.warpTimer = rand(1.0, 1.8);
      }
    }
    if (e.warpVisible) {
      e.x += Math.cos(ang) * effectiveSpd * 0.3 * dt;
      e.y += Math.sin(ang) * effectiveSpd * 0.3 * dt;
    }
  } else if (e.bossMove === 'charge') {
    e.bossChargeTimer -= dt;
    if (e.bossChargeTimer <= 0) {
      // burst toward player
      e.x += Math.cos(ang) * effectiveSpd * 5 * dt;
      e.y += Math.sin(ang) * effectiveSpd * 5 * dt;
      if (e.bossChargeTimer < -0.3) e.bossChargeTimer = rand(2, 4);
    } else {
      // slow stalk
      e.x += Math.cos(ang) * effectiveSpd * 0.4 * dt;
      e.y += Math.sin(ang) * effectiveSpd * 0.4 * dt;
    }
  }

  // special: spawner periodically creates grunts
  if (e.bossSpec === 'spawner') {
    e.bossSpawnTimer -= dt;
    if (e.bossSpawnTimer <= 0) {
      e.bossSpawnTimer = rand(3, 5);
      for (let i = 0; i < 2; i++) game.enemies.push(makeMinion(e));
    }
  }
}

function makeMinion(boss) {
  return {
    type: 'grunt', x: boss.x + rand(-20, 20), y: boss.y + rand(-20, 20), r: 10,
    hp: 10, maxHp: 10, speed: 65, dmg: 5,
    color: '#ff7ad0', xp: 1, score: 5,
    flash: 0, wob: rand(0, TAU), orbCd: 0,
    warpTimer: 0, warpVisible: true, shieldAngle: 0,
  };
}

