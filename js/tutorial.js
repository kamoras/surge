/* ============================================================
   Contextual tutorial -- teaches mechanics one at a time via
   brief overlay hints triggered by game events.

   Best practice from game design: never explain everything up
   front. Introduce each mechanic the first time it becomes
   relevant. Each hint shows once per session (not persisted --
   a returning player gets a quick refresher, a new player gets
   gradual onboarding).
   ============================================================ */
import { game } from './state.js';
import { $, fmtTime } from './dom.js';

const HINTS = [
  { id: 'move',    trigger: g => g.time > 0.5 && g.time < 3,
    text: 'WASD or arrows to move -- drag on mobile' },
  { id: 'surge',   trigger: g => g.player && g.player.surge > 50,
    text: 'SURGE is charged -- press SPACE to blast nearby enemies' },
  { id: 'combo',   trigger: g => g.combo >= 3,
    text: 'Chain kills to build your COMBO multiplier' },
  { id: 'dash',    trigger: g => g.time > 8 && g.player && g.player.hp < g.player.maxHp * 0.85,
    text: 'Press SHIFT to dash (invulnerable briefly)' },
  { id: 'surgetip',trigger: g => g.time > 15 && g.player && g.player.surge < 30,
    text: 'Surge charges faster near enemies -- risk = power' },
  { id: 'levelup', trigger: g => g.level === 2 && g.state === 'playing',
    text: 'Pick an upgrade -- each one shapes your build' },
  { id: 'elite',   trigger: g => g.enemies.some(e => e.isElite && e.type === 'elite'),
    text: 'ELITE spotted -- dodge it and grab the drops when it falls' },
  { id: 'boss',    trigger: g => g.enemies.some(e => e.type === 'boss'),
    text: 'BOSS -- each one has unique traits. Watch its movement pattern' },
  { id: 'shielder',trigger: g => g.enemies.some(e => e.type === 'shielder'),
    text: 'Shielder -- its front blocks shots. Circle around it' },
  { id: 'warper',  trigger: g => g.enemies.some(e => e.type === 'warper'),
    text: 'Warper -- it blinks around. Keep your distance' },
];

const shown = new Set();
let activeHint = null;
let hintTimer = 0;

let hintEl = null;
function ensureEl() {
  if (hintEl) return;
  hintEl = document.createElement('div');
  hintEl.id = 'tutHint';
  hintEl.className = 'tut-hint hide';
  $('hud').appendChild(hintEl);
}

export function updateTutorial(dt) {
  if (activeHint) {
    hintTimer -= dt;
    if (hintTimer <= 0) {
      hintEl.classList.add('hide');
      activeHint = null;
    }
    return;
  }
  for (const h of HINTS) {
    if (shown.has(h.id)) continue;
    if (h.trigger(game)) {
      showHint(h);
      break;
    }
  }
}

function showHint(h) {
  ensureEl();
  shown.add(h.id);
  activeHint = h;
  hintTimer = 3.5;
  hintEl.textContent = h.text;
  hintEl.classList.remove('hide');
}

export function resetTutorial() {
  shown.clear();
  activeHint = null;
  if (hintEl) hintEl.classList.add('hide');
}
