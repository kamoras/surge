/* ============================================================
   Static game data: enemy archetypes, upgrades, waves, milestones.

   Balance philosophy: runs should last 2-3 minutes for a decent
   player. By minute 2, the player should feel noticeably powerful.
   Enemy damage is moderate so mistakes are punishing but not
   instant death. HP recovery exists through multiple channels
   (regen, leech, hearts, elite drops) so aggressive play is viable.
   ============================================================ */

export const ETYPES = {
  grunt:    { r: 13, hp: 14, speed: 62,  dmg: 6,  color: '#ff5d52', xp: 1, score: 10 },
  rusher:   { r: 9,  hp: 8,  speed: 135, dmg: 5,  color: '#ff9d3d', xp: 1, score: 14 },
  tank:     { r: 22, hp: 60, speed: 38,  dmg: 14, color: '#c33b4f', xp: 3, score: 30 },
  splitter: { r: 15, hp: 22, speed: 70,  dmg: 7,  color: '#c77bff', xp: 2, score: 20 },
  shielder: { r: 16, hp: 32, speed: 52,  dmg: 8,  color: '#4fc3f7', xp: 2, score: 24 },
  warper:   { r: 10, hp: 16, speed: 48,  dmg: 10, color: '#ab47bc', xp: 2, score: 28 },
};

export const UPGRADES = [
  // -- common (appear early and often) --
  { id: 'dmg',   ic: '⚔', nm: 'Power Core',      ds: '+30% projectile damage',          tier: 'common', acc: '#ff9d3d',
    apply: p => p.dmg *= 1.30 },
  { id: 'rate',  ic: '⟫', nm: 'Overclock',       ds: '+20% fire rate',                  tier: 'common', acc: '#ffce4f',
    apply: p => p.fireRate *= 0.80 },
  { id: 'speed', ic: '➤', nm: 'Thrusters',       ds: '+18% move speed',                 tier: 'common', acc: '#7bd0ff',
    apply: p => p.speed *= 1.18 },
  { id: 'hp',    ic: '❤', nm: 'Reinforce',       ds: '+25 max HP & heal 30',            tier: 'common', acc: '#ff5d52',
    apply: p => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 30); } },
  { id: 'range', ic: '◎', nm: 'Magnet Field',    ds: '+50% pickup range',               tier: 'common', acc: '#9a7bff',
    apply: p => p.range *= 1.50 },
  { id: 'velo',  ic: '»', nm: 'Hypervelocity',   ds: '+35% projectile speed',           tier: 'common', acc: '#ffce4f',
    apply: p => p.projSpeed *= 1.35 },
  { id: 'dash',  ic: '↯', nm: 'Phase Drive',     ds: '-35% dash cooldown',              tier: 'common', acc: '#9a7bff',
    apply: p => p.dashCd *= 0.65 },

  // -- rare (appear less often, more impactful) --
  { id: 'multi', ic: '⋔', nm: 'Split Barrel',    ds: '+1 projectile per shot',          tier: 'rare',   acc: '#5fe6c4',
    apply: p => { p.projCount++; p.spread = Math.min(p.spread + 0.05, 0.55); } },
  { id: 'pierce',ic: '⇶', nm: 'Railshot',        ds: 'projectiles pierce +1 enemy',     tier: 'rare',   acc: '#7bd0ff',
    apply: p => p.pierce++ },
  { id: 'regen', ic: '✚', nm: 'Nanoweave',       ds: 'regen +1.5 HP/sec',               tier: 'rare',   acc: '#5fe6c4',
    apply: p => p.regen += 1.5 },
  { id: 'big',   ic: '●', nm: 'Heavy Rounds',    ds: '+50% projectile size & +15% dmg', tier: 'rare',   acc: '#ff9d3d',
    apply: p => { p.projSize *= 1.5; p.dmg *= 1.15; } },
  { id: 'crit',  ic: '✦', nm: 'Targeting Matrix',ds: '+14% critical chance (x2.5 dmg)', tier: 'rare',   acc: '#ffce4f',
    apply: p => { p.crit = Math.min(p.crit + 0.14, 0.85); p.critMult = 2.5; } },
  { id: 'orb',   ic: '◌', nm: 'Aegis Shards',    ds: '+1 orbiting shard that shreds on contact', tier: 'rare', acc: '#7bd0ff',
    apply: p => p.orbCount++ },
  { id: 'leech', ic: '♥', nm: 'Leech Field',     ds: 'heal 1 HP per kill',              tier: 'rare',   acc: '#5fe6c4',
    apply: p => p.lifesteal += 1.0 },
  { id: 'fury',  ic: '⚡', nm: 'Fury Engine',     ds: '+6% damage per combo hit (caps at +72%)', tier: 'rare', acc: '#ff7ad0',
    apply: p => p.furyScale += 0.06 },

  // -- surge upgrades (rare) --
  { id: 'scharge',ic: '⚡', nm: 'Surge Capacitor', ds: '+40% surge charge speed',         tier: 'rare',   acc: '#9a7bff',
    apply: p => p.surgeChargeRate *= 1.4 },
  { id: 'sradius',ic: '◎', nm: 'Surge Amplifier', ds: '+35% surge blast radius',         tier: 'rare',   acc: '#9a7bff',
    apply: p => p.surgeRadius *= 1.35 },
  { id: 'sdmg',   ic: '⚔', nm: 'Surge Overload',  ds: '+40% surge damage',               tier: 'rare',   acc: '#ff9d3d',
    apply: p => p.surgeDmgMult *= 1.4 },

  // -- legendary (only offered at LV 5+, game-changing) --
  { id: 'titan',  ic: '◆', nm: 'Titan Shell',     ds: '+60 max HP, +2 HP/sec regen',     tier: 'legendary', acc: '#ff5d52',
    apply: p => { p.maxHp += 60; p.hp = Math.min(p.maxHp, p.hp + 60); p.regen += 2; } },
  { id: 'void',   ic: '◉', nm: 'Void Dash',       ds: 'dash explodes for 3x damage in a huge radius', tier: 'legendary', acc: '#9a7bff',
    apply: p => p.dashExplode = true },
  { id: 'chain',  ic: '⚡', nm: 'Chain Lightning', ds: 'kills zap a nearby enemy for 40% damage', tier: 'legendary', acc: '#7bd0ff',
    apply: p => p.chainLightning = true },
  { id: 'nova',   ic: '✺', nm: 'Surge Nova',      ds: 'surge fully recharges on kill during blast', tier: 'legendary', acc: '#ffce4f',
    apply: p => p.surgeNova = true },
];

export const MILESTONES = [25, 50, 100, 200, 350, 500, 750, 1000];

export const WAVES = [
  [0,   'FIRST BLOOD'],
  [30,  'THE SWARM BUILDS'],
  [75,  'NO MERCY'],
  [120, 'RELENTLESS'],
  [180, 'CRITICAL MASS'],
  [250, 'DESPERATION'],
  [330, 'HELL WAVE'],
  [420, 'ENDURANCE'],
];
