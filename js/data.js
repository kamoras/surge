/* ============================================================
   Static game data: enemy archetypes, upgrades, waves, milestones,
   and the meta-progression unlock table.
   ============================================================ */

export const ETYPES = {
  grunt:    { r: 13, hp: 14, speed: 62,  dmg: 8,  color: '#ff5d52', xp: 1, score: 10 },
  rusher:   { r: 9,  hp: 8,  speed: 135, dmg: 6,  color: '#ff9d3d', xp: 1, score: 14 },
  tank:     { r: 22, hp: 60, speed: 38,  dmg: 16, color: '#c33b4f', xp: 3, score: 30 },
  splitter: { r: 15, hp: 22, speed: 70,  dmg: 9,  color: '#c77bff', xp: 2, score: 20 },
  shielder: { r: 16, hp: 32, speed: 52,  dmg: 10, color: '#4fc3f7', xp: 2, score: 24 },
  warper:   { r: 10, hp: 16, speed: 48,  dmg: 12, color: '#ab47bc', xp: 2, score: 28 },
};

export const UPGRADES = [
  { id: 'dmg',   ic: '⚔', nm: 'Power Core',      ds: '+25% projectile damage',          tier: 'common', acc: '#ff9d3d',
    apply: p => p.dmg *= 1.25 },
  { id: 'rate',  ic: '⟫', nm: 'Overclock',       ds: '+18% fire rate',                  tier: 'common', acc: '#ffce4f',
    apply: p => p.fireRate *= 0.82 },
  { id: 'multi', ic: '⋔', nm: 'Split Barrel',    ds: '+1 projectile per shot',          tier: 'rare',   acc: '#5fe6c4',
    apply: p => { p.projCount++; p.spread = Math.min(p.spread + 0.05, 0.55); } },
  { id: 'speed', ic: '➤', nm: 'Thrusters',       ds: '+15% move speed',                 tier: 'common', acc: '#7bd0ff',
    apply: p => p.speed *= 1.15 },
  { id: 'hp',    ic: '❤', nm: 'Reinforce',       ds: '+25 max HP & heal 25',            tier: 'common', acc: '#ff5d52',
    apply: p => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); } },
  { id: 'range', ic: '◎', nm: 'Magnet Field',    ds: '+45% pickup range',               tier: 'common', acc: '#9a7bff',
    apply: p => p.range *= 1.45 },
  { id: 'pierce',ic: '⇶', nm: 'Railshot',        ds: 'projectiles pierce +1 enemy',     tier: 'rare',   acc: '#7bd0ff',
    apply: p => p.pierce++ },
  { id: 'regen', ic: '✚', nm: 'Nanoweave',       ds: 'regen +1.2 HP/sec',               tier: 'rare',   acc: '#5fe6c4',
    apply: p => p.regen += 1.2 },
  { id: 'big',   ic: '●', nm: 'Heavy Rounds',    ds: '+40% projectile size & +10% dmg', tier: 'rare',   acc: '#ff9d3d',
    apply: p => { p.projSize *= 1.4; p.dmg *= 1.1; } },
  { id: 'velo',  ic: '»', nm: 'Hypervelocity',   ds: '+30% projectile speed',           tier: 'common', acc: '#ffce4f',
    apply: p => p.projSpeed *= 1.3 },
  { id: 'crit',  ic: '✦', nm: 'Targeting Matrix',ds: '+12% critical chance (x2.1 dmg)', tier: 'rare',   acc: '#ffce4f',
    apply: p => p.crit = Math.min(p.crit + 0.12, 0.85) },
  { id: 'orb',   ic: '◌', nm: 'Aegis Shards',    ds: '+1 orbiting shard that shreds on contact', tier: 'rare', acc: '#7bd0ff',
    apply: p => p.orbCount++ },
  { id: 'leech', ic: '♥', nm: 'Leech Field',     ds: 'heal +0.6 HP per kill',           tier: 'rare',   acc: '#5fe6c4',
    apply: p => p.lifesteal += 0.6 },
  { id: 'dash',  ic: '↯', nm: 'Phase Drive',     ds: '-30% dash cooldown',              tier: 'common', acc: '#9a7bff',
    apply: p => p.dashCd *= 0.7 },
  { id: 'fury',  ic: '⚡', nm: 'Fury Engine',     ds: '+6% damage per active combo hit (caps at +72%)', tier: 'rare', acc: '#ff7ad0',
    apply: p => p.furyScale += 0.06 },
];

export const MILESTONES = [25, 50, 100, 200, 350, 500, 750, 1000];

export const WAVES = [
  [0,   'FIRST BLOOD'],
  [30,  'THE SWARM BUILDS'],
  [60,  'NO MERCY'],
  [100, 'RELENTLESS'],
  [150, 'CRITICAL MASS'],
  [210, 'DESPERATION'],
  [280, 'HELL WAVE'],
  [360, 'ENDURANCE'],
];

