/* ============================================================
   Level-up upgrade selection screen.

   offerUpgrades() builds three cards from the UPGRADES table and
   pauses the sim into the 'levelup' state. Picking a card applies
   it and resumes (or re-offers if multiple levels were banked).

   Tier filtering:
   - Common: always available
   - Rare: slight bias against early, but can appear any time
   - Legendary: only offered at LV 5+, guaranteed one slot if eligible
   ============================================================ */
import { game } from './state.js';
import { UPGRADES } from './data.js';
import { randi } from './utils.js';
import { $, show, hide } from './dom.js';

export function offerUpgrades() {
  const level = game.level;
  const legendaryEligible = level >= 5;

  // separate pools
  const commons = UPGRADES.filter(u => u.tier === 'common');
  const rares   = UPGRADES.filter(u => u.tier === 'rare');
  const legends = UPGRADES.filter(u => u.tier === 'legendary');

  const chosen = [];
  const used = new Set();

  function pickFrom(pool) {
    const available = pool.filter(u => !used.has(u.id));
    if (!available.length) return null;
    const u = available[randi(0, available.length - 1)];
    used.add(u.id);
    return u;
  }

  // at LV 5+, guarantee one legendary slot
  if (legendaryEligible && legends.length > 0 && Math.random() < 0.55) {
    const leg = pickFrom(legends);
    if (leg) chosen.push(leg);
  }

  // fill remaining slots
  while (chosen.length < 3) {
    // bias: 60% common, 40% rare
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
