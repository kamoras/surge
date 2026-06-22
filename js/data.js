/* ============================================================
   Static game data.

   Design philosophy: combo IS your power. Everything scales with
   it. One hit resets it to zero. Fewer, tougher enemies -- each
   kill matters. The game's difficulty scales with your combo, so
   it's self-balancing: get good = harder enemies = more tension.
   ============================================================ */

export const ETYPES = {
  grunt:    { r: 14, hp: 22,  speed: 58,  dmg: 9,  color: '#ff5d52', xp: 1, score: 10 },
  rusher:   { r: 10, hp: 14,  speed: 105, dmg: 7,  color: '#ff9d3d', xp: 1, score: 14 },
  tank:     { r: 24, hp: 90,  speed: 34,  dmg: 18, color: '#c33b4f', xp: 3, score: 30 },
  splitter: { r: 16, hp: 35,  speed: 65,  dmg: 8,  color: '#c77bff', xp: 2, score: 20 },
  shielder: { r: 17, hp: 50,  speed: 48,  dmg: 10, color: '#4fc3f7', xp: 2, score: 24 },
  warper:   { r: 11, hp: 24,  speed: 44,  dmg: 12, color: '#ab47bc', xp: 2, score: 28 },
};

export const UPGRADES = [
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

  { id: 'multi', ic: '⋔', nm: 'Split Barrel',    ds: '+1 projectile per shot',          tier: 'rare',   acc: '#5fe6c4',
    apply: p => { p.projCount = Math.min(p.projCount + 1, 5); p.spread = Math.min(p.spread + 0.06, 0.55); } },
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
  { id: 'scharge',ic: '⚡', nm: 'Surge Capacitor', ds: '+40% surge charge speed',        tier: 'rare',   acc: '#9a7bff',
    apply: p => p.surgeChargeRate *= 1.4 },
  { id: 'sradius',ic: '◎', nm: 'Surge Amplifier', ds: '+35% surge blast radius',        tier: 'rare',   acc: '#9a7bff',
    apply: p => p.surgeRadius *= 1.35 },

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

/** Max enemies alive at once. Keeps the screen readable. */
export const ENEMY_CAP = 28;

/**
 * Combo power scaling. Combo multiplies damage, speed, and pickup
 * range. These return the multiplier for a given combo count.
 */
export function comboDmgScale(combo) { return 1 + Math.min(combo, 100) * 0.018; }
export function comboSpeedScale(combo) { return 1 + Math.min(combo, 80) * 0.004; }
export function comboRangeScale(combo) { return 1 + Math.min(combo, 60) * 0.012; }
