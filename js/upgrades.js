/* ============================================================
   Level-up upgrade selection screen.

   offerUpgrades() builds three cards from the UPGRADES table and
   pauses the sim into the 'levelup' state. Picking a card applies it
   and resumes (or re-offers if multiple levels were banked at once).
   ============================================================ */
import { game } from './state.js';
import { UPGRADES } from './data.js';
import { randi } from './utils.js';
import { $, show, hide } from './dom.js';

export function offerUpgrades() {
  const pool = [...UPGRADES];
  const chosen = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    // bias slightly away from rares so commons stay accessible
    let idx, tries = 0;
    do { idx = randi(0, pool.length - 1); tries++; }
    while (pool[idx].tier === 'rare' && Math.random() < 0.4 && tries < 4);
    chosen.push(pool.splice(idx, 1)[0]);
  }

  const wrap = $('cards');
  wrap.innerHTML = '';
  chosen.forEach(u => {
    const el = document.createElement('div');
    el.className = 'card';
    el.style.setProperty('--accent', u.acc);
    el.innerHTML = `<div class="tier">${u.tier}</div>
      <div class="ic">${u.ic}</div>
      <div class="nm">${u.nm}</div>
      <div class="ds">${u.ds}</div>`;
    el.onclick = () => { u.apply(game.player); closeLevelUp(); };
    wrap.appendChild(el);
  });

  $('lsub').textContent = 'Choose one — Level ' + game.level;
  show('levelup');
  game.state = 'levelup';
}

export function closeLevelUp() {
  hide('levelup');
  game.pendingLevels = Math.max(0, (game.pendingLevels || 1) - 1);
  if (game.pendingLevels > 0) {
    offerUpgrades();           // more levels banked — pick again
  } else {
    game.state = 'playing';
    game.lastT = performance.now();
  }
}
