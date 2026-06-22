/* ============================================================
   HUD readouts + screen flow (start / game over / pause) and the
   functions that drive run lifecycle: startGame, endGame, pause,
   mute, and share.
   ============================================================ */
import { game, comboMult, saveBest } from './state.js';
import { resize } from './canvas.js';
import { Sound } from './audio.js';
import { burst } from './effects.js';
import { makePlayer } from './entities.js';
import { $, show, hide, fmtTime } from './dom.js';

/* ---------- cached DOM refs (avoids getElementById every frame) ---------- */
let dom = null;
function cacheDom() {
  dom = {
    hpFill: $('hpFill'), hpLabel: $('hpLabel'),
    xpFill: $('xpFill'), xpLabel: $('xpLabel'),
    timer: $('timer'), kills: $('kills'), score: $('score'),
    comboLine: $('comboLine'), muteBtn: $('muteBtn'), hud: $('hud'),
    startBest: $('startBest'),
    oTime: $('oTime'), oScore: $('oScore'), oKills: $('oKills'),
    oLevel: $('oLevel'), oCombo: $('oCombo'),
    bestTag: $('bestTag'), shareBtn: $('shareBtn'),
  };
}

/* ---------- per-frame HUD ---------- */
export function updateHUD() {
  const p = game.player; if (!p || !dom) return;
  dom.hpFill.style.width = Math.max(0, Math.min(p.hp / p.maxHp * 100, 100)) + '%';
  dom.hpLabel.textContent = Math.ceil(p.hp) + ' / ' + p.maxHp;
  dom.xpFill.style.width = Math.max(0, Math.min(game.xp / game.xpNeed * 100, 100)) + '%';
  dom.xpLabel.textContent = 'LV ' + game.level;
  dom.timer.textContent = fmtTime(game.time);
  dom.kills.textContent = game.kills;
  dom.score.textContent = game.score;

  if (game.combo >= 3) {
    dom.comboLine.style.opacity = '1';
    dom.comboLine.textContent = 'x' + comboMult().toFixed(1) + '  ·  ' + game.combo + ' COMBO';
  } else {
    dom.comboLine.style.opacity = '0';
  }
}

function refreshStartBest() {
  dom.startBest.textContent = game.best > 0 ? ('BEST SCORE  ' + game.best) : '';
}

/* ---------- run lifecycle ---------- */
export function startGame() {
  if (!dom) cacheDom();
  Sound.init();
  resize();
  Object.assign(game, {
    state: 'playing', time: 0, kills: 0, score: 0, shake: 0, slow: 0, flash: 0,
    combo: 0, comboTimer: 0, maxCombo: 0,
    eliteTimer: 42, waveTimer: 0, waveNum: 0,
    lastMoveX: 1, lastMoveY: 0,
    enemies: [], bullets: [], gems: [], parts: [], floats: [],
    spawnTimer: 0.5, fireTimer: 0, level: 1, xp: 0, xpNeed: 6, pendingLevels: 0,
    nextMilestone: 0,
  });
  game.player = makePlayer();
  hide('start'); hide('over'); hide('pause'); hide('levelup');
  dom.hud.classList.add('on');
  dom.comboLine.style.opacity = '0';
  game.lastT = performance.now();
}

export function endGame() {
  game.state = 'over';
  Sound.over();
  burst(game.player.x, game.player.y, '#ff5d52', 40, 360);
  game.shake = 20;
  dom.hud.classList.remove('on');
  dom.oTime.textContent = fmtTime(game.time);
  dom.oScore.textContent = game.score;
  dom.oKills.textContent = game.kills;
  dom.oLevel.textContent = game.level;
  dom.oCombo.textContent = game.maxCombo;

  if (game.score > game.best) {
    game.best = game.score; saveBest(game.best);
    dom.bestTag.textContent = 'NEW BEST SCORE';
  } else {
    dom.bestTag.textContent = 'Best  ' + game.best;
  }
  refreshStartBest();
  setTimeout(() => show('over'), 700);
}

export function togglePause() {
  if (game.state === 'playing') { game.state = 'paused'; show('pause'); }
  else if (game.state === 'paused') { hide('pause'); game.state = 'playing'; game.lastT = performance.now(); }
}

export function toggleMute() {
  Sound.setMuted(!Sound.isMuted());
  dom.muteBtn.textContent = Sound.isMuted() ? '✕' : '♪';
  dom.muteBtn.style.color = Sound.isMuted() ? '#ff5d52' : '';
}

export function shareRun() {
  const txt = 'I survived ' + fmtTime(game.time) + ' in SURGE with a score of '
    + game.score + ' and a ' + game.maxCombo + '-kill combo. Can you beat it?';
  const url = 'https://surge.paramain.com';
  if (navigator.share) {
    navigator.share({ title: 'SURGE', text: txt, url }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(txt + ' ' + url).then(() => {
      const old = dom.shareBtn.textContent;
      dom.shareBtn.textContent = 'Copied!';
      setTimeout(() => { dom.shareBtn.textContent = old; }, 1400);
    }).catch(() => {});
  }
}

export function initStartScreen() {
  cacheDom();
  refreshStartBest();
}

// auto-pause when the tab loses focus so players don't die in the background
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') togglePause();
});
