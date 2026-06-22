/* ============================================================
   Level-up upgrade selection screen.

   One-time upgrades (boolean flags like Void Dash, Chain Lightning,
   Surge Nova) are filtered out once taken. Stackable upgrades
   (damage, speed, etc.) can appear multiple times.
   ============================================================ */
import { game } from './state.js';
import { UPGRADES } from './data.js';
import { randi } from './utils.js';
import { $, show, hide } from './dom.js';

const ONE_TIME_IDS = new Set(['void', 'chain', 'nova']);

function isAvailable(u) {
  if (!ONE_TIME_IDS.has(u.id)) return true;
  const p = game.player;
  if (u.id === 'void' && p.dashExplode) return false;
  if (u.id === 'chain' && p.chainLightning) return false;
  if (u.id === 'nova' && p.surgeNova) return false;
  return true;
}

export function offerUpgrades() {
  const level = game.level;
  const legendaryEligible = level >= 5;

  const commons = UPGRADES.filter(u => u.tier === 'common' && isAvailable(u));
  const rares   = UPGRADES.filter(u => u.tier === 'rare' && isAvailable(u));
  const legends = UPGRADES.filter(u => u.tier === 'legendary' && isAvailable(u));

  const chosen = [];
  const used = new Set();

  function pickFrom(pool) {
    const available = pool.filter(u => !used.has(u.id));
    if (!available.length) return null;
    const u = available[randi(0, available.length - 1)];
    used.add(u.id);
    return u;
  }

  if (legendaryEligible && legends.length > 0 && Math.random() < 0.55) {
    const leg = pickFrom(legends);
    if (leg) chosen.push(leg);
  }

  while (chosen.length < 3) {
    const pool = Math.random() < 0.6 ? commons : rares;
    const pick = pickFrom(pool) || pickFrom(commons) || pickFrom(rares);
    if (pick) chosen.push(pick);
    else break;
  }

  const wrap = $('cards');
  wrap.innerHTML = '';
  chosen.forEach(u => {
    const el = document.createElement('div');
    el.className = 'card' + (u.tier === 'legendary' ? ' legendary' : '');
    el.style.setProperty('--accent', u.acc);
    el.innerHTML = `<div class="tier">${u.tier}</div>
      <div class="ic">${u.ic}</div>
      <div class="nm">${u.nm}</div>
      <div class="ds">${u.ds}</div>`;
    el.onclick = () => { u.apply(game.player); closeLevelUp(); };
    wrap.appendChild(el);
  });

  $('lsub').textContent = 'Choose one — Level ' + level;
  show('levelup');
  game.state = 'levelup';
}

export function closeLevelUp() {
  hide('levelup');
  game.pendingLevels = Math.max(0, (game.pendingLevels || 1) - 1);
  if (game.pendingLevels > 0) {
    offerUpgrades();
  } else {
    game.state = 'playing';
    game.lastT = performance.now();
  }
}
