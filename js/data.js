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

/**
 * Diminishing returns: each time you pick the same upgrade, the
 * effect is weaker. First pick = full value. Second = 60%. Third = 35%.
 * Fourth+ = 20%. This creates a natural power ceiling.
 */
function dr(p, id, values) {
  const n = p.upgradeCounts[id] = (p.upgradeCounts[id] || 0) + 1;
  const scale = n === 1 ? 1.0 : n === 2 ? 0.6 : n === 3 ? 0.35 : 0.2;
  return values.map(v => typeof v === 'number' ? v * scale : v);
}

export const UPGRADES = [
  { id: 'dmg',   ic: '⚔', nm: 'Power Core',      ds: 'boost projectile damage',         tier: 'common', acc: '#ff9d3d',
    apply: p => { const [v] = dr(p, 'dmg', [0.30]); p.dmg *= 1 + v; } },
  { id: 'rate',  ic: '⟫', nm: 'Overclock',       ds: 'boost fire rate',                 tier: 'common', acc: '#ffce4f',
    apply: p => { const [v] = dr(p, 'rate', [0.20]); p.fireRate *= 1 - v; } },
  { id: 'speed', ic: '➤', nm: 'Thrusters',       ds: 'boost move speed',                tier: 'common', acc: '#7bd0ff',
    apply: p => { const [v] = dr(p, 'speed', [0.18]); p.speed *= 1 + v; } },
  { id: 'hp',    ic: '❤', nm: 'Reinforce',       ds: 'boost max HP & heal',             tier: 'common', acc: '#ff5d52',
    apply: p => { const [v] = dr(p, 'hp', [25]); p.maxHp += v; p.hp = Math.min(p.maxHp, p.hp + v); } },
  { id: 'range', ic: '◎', nm: 'Magnet Field',    ds: 'boost pickup range',              tier: 'common', acc: '#9a7bff',
    apply: p => { const [v] = dr(p, 'range', [0.50]); p.range *= 1 + v; } },
  { id: 'velo',  ic: '»', nm: 'Hypervelocity',   ds: 'boost projectile speed',          tier: 'common', acc: '#ffce4f',
    apply: p => { const [v] = dr(p, 'velo', [0.35]); p.projSpeed *= 1 + v; } },
  { id: 'dash',  ic: '↯', nm: 'Phase Drive',     ds: 'reduce dash cooldown',            tier: 'common', acc: '#9a7bff',
    apply: p => { const [v] = dr(p, 'dash', [0.35]); p.dashCd *= 1 - v; } },

  { id: 'multi', ic: '⋔', nm: 'Split Barrel',    ds: '+2 projectiles per shot',         tier: 'rare',   acc: '#5fe6c4',
    apply: p => { p.projCount = Math.min(p.projCount + 2, 7); p.spread = Math.min(p.spread + 0.08, 0.55); } },
  { id: 'pierce',ic: '⇶', nm: 'Railshot',        ds: 'projectiles pierce +1 enemy',     tier: 'rare',   acc: '#7bd0ff',
    apply: p => p.pierce = Math.min(p.pierce + 1, 4) },
  { id: 'regen', ic: '✚', nm: 'Nanoweave',       ds: 'boost HP regen',                  tier: 'rare',   acc: '#5fe6c4',
    apply: p => { const [v] = dr(p, 'regen', [1.5]); p.regen += v; } },
  { id: 'big',   ic: '●', nm: 'Heavy Rounds',    ds: 'bigger projectiles & more damage',tier: 'rare',   acc: '#ff9d3d',
    apply: p => { const [s, d] = dr(p, 'big', [0.50, 0.15]); p.projSize *= 1 + s; p.dmg *= 1 + d; } },
  { id: 'crit',  ic: '✦', nm: 'Targeting Matrix',ds: 'boost critical chance (x2.5 dmg)',tier: 'rare',   acc: '#ffce4f',
    apply: p => { const [v] = dr(p, 'crit', [0.14]); p.crit = Math.min(p.crit + v, 0.65); p.critMult = 2.5; } },
  { id: 'orb',   ic: '◌', nm: 'Aegis Shards',    ds: '+1 orbiting shard',               tier: 'rare',   acc: '#7bd0ff',
    apply: p => p.orbCount = Math.min(p.orbCount + 1, 4) },
  { id: 'leech', ic: '♥', nm: 'Leech Field',     ds: 'heal on kill',                    tier: 'rare',   acc: '#5fe6c4',
    apply: p => { const [v] = dr(p, 'leech', [1.0]); p.lifesteal += v; } },
  { id: 'scharge',ic: '⚡', nm: 'Surge Capacitor', ds: 'faster surge charge',            tier: 'rare',   acc: '#9a7bff',
    apply: p => { const [v] = dr(p, 'scharge', [0.40]); p.surgeChargeRate *= 1 + v; } },
  { id: 'sradius',ic: '◎', nm: 'Surge Amplifier', ds: 'bigger surge blast',             tier: 'rare',   acc: '#9a7bff',
    apply: p => { const [v] = dr(p, 'sradius', [0.35]); p.surgeRadius *= 1 + v; } },

  { id: 'titan',  ic: '◆', nm: 'Titan Shell',     ds: '+60 max HP, +2 HP/sec regen',     tier: 'legendary', acc: '#ff5d52',
    apply: p => { p.maxHp += 60; p.hp = Math.min(p.maxHp, p.hp + 60); p.regen += 2; } },
  { id: 'void',   ic: '◉', nm: 'Void Dash',       ds: 'dash explodes for 3x damage',     tier: 'legendary', acc: '#9a7bff',
    apply: p => p.dashExplode = true },
  { id: 'chain',  ic: '⚡', nm: 'Chain Lightning', ds: 'kills zap a nearby enemy',        tier: 'legendary', acc: '#7bd0ff',
    apply: p => p.chainLightning = true },
  { id: 'nova',   ic: '✺', nm: 'Surge Nova',      ds: 'surge recharges on kill during blast', tier: 'legendary', acc: '#ffce4f',
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
