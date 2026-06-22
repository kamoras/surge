/* ============================================================
   HUD readouts + screen flow.

   Design notes (research-backed):
   - triggerDeath() enters a slow-mo "dying" state for 1.2s before
     showing the game-over screen (peak-end rule: endings are half
     the memory of an experience)
   - Near-miss callouts on game over exploit the Zeigarnik effect:
     "12 points from your best!" is the strongest replay motivator
   - Score rank (S/A/B/C/D) gives scores context and a concrete
     goal for the next run (self-determination: competence)
   - Grace period on start prevents frustration deaths (onboarding)
   ============================================================ */
import { game, comboMult, saveBest, saveBestCombo, saveBestTime,
         loadGamesPlayed, saveGamesPlayed, scoreRank } from './state.js';
import { resize, updateCamera, WORLD_W, WORLD_H, W, H } from './canvas.js';
import { Sound } from './audio.js';
import { burst } from './effects.js';
import { makePlayer } from './entities.js';
import { rand } from './utils.js';
import { $, show, hide, fmtTime } from './dom.js';
import { MILESTONES } from './data.js';
import { resetTutorial } from './tutorial.js';

let dom = null;
function cacheDom() {
  dom = {
    hpFill: $('hpFill'), hpLabel: $('hpLabel'),
    xpFill: $('xpFill'), xpLabel: $('xpLabel'),
    surgeFill: $('surgeFill'), surgeLabel: $('surgeLabel'),
    timer: $('timer'), kills: $('kills'), score: $('score'),
    comboLine: $('comboLine'), muteBtn: $('muteBtn'), hud: $('hud'), dashBtn: $('dashBtn'),
    startBest: $('startBest'),
    oTime: $('oTime'), oScore: $('oScore'), oKills: $('oKills'),
    oLevel: $('oLevel'), oCombo: $('oCombo'), oWave: $('oWave'), oRank: $('oRank'),
    bestTag: $('bestTag'), shareBtn: $('shareBtn'),
    nearMiss: $('nearMiss'),
  };
}

export function updateHUD() {
  const p = game.player; if (!p || !dom) return;
  dom.hpFill.style.width = Math.max(0, Math.min(p.hp / p.maxHp * 100, 100)) + '%';
  dom.hpLabel.textContent = Math.ceil(p.hp) + ' / ' + p.maxHp;

  const xpPct = Math.max(0, Math.min(game.xp / game.xpNeed * 100, 100));
  dom.xpFill.style.width = xpPct + '%';
  dom.xpLabel.textContent = 'LV ' + game.level;
  dom.xpFill.style.opacity = xpPct > 75 ? (0.85 + Math.sin(game.time * 8) * 0.15) : '';

  // surge meter
  const surgePct = Math.max(0, Math.min(p.surge / p.surgeMax * 100, 100));
  dom.surgeFill.style.width = surgePct + '%';
  dom.surgeLabel.textContent = surgePct >= 100 ? 'SURGE READY' : 'SURGE';
  dom.surgeFill.style.opacity = surgePct >= 80 ? (0.8 + Math.sin(game.time * 10) * 0.2) : '';

  dom.timer.textContent = fmtTime(game.time);
  dom.kills.textContent = game.kills;
  dom.score.textContent = game.score;

  // dash button cooldown visual (mobile)
  if (p.dashTimer > 0) dom.dashBtn.classList.add('cd');
  else dom.dashBtn.classList.remove('cd');

  // combo is the core mechanic -- always visible
  if (game.comboLostFlash > 0) {
    dom.comboLine.style.opacity = '1';
    dom.comboLine.textContent = 'COMBO LOST';
    dom.comboLine.style.color = '#ff5d52';
  } else if (game.combo >= 1) {
    dom.comboLine.style.opacity = '1';
    dom.comboLine.textContent = game.combo + ' COMBO  x' + comboMult().toFixed(1);
    dom.comboLine.style.color = game.combo >= 20 ? '#ffce4f' : '';
  } else {
    dom.comboLine.style.opacity = '0.4';
    dom.comboLine.textContent = '0 COMBO';
    dom.comboLine.style.color = '';
  }
}

function refreshStartBest() {
  if (game.best > 0) {
    dom.startBest.textContent = 'BEST ' + game.best + '  (' + scoreRank(game.best) + ')';
  } else {
    dom.startBest.textContent = '';
  }
}

export function startGame() {
  if (!dom) cacheDom();
  Sound.init();
  resize();
  Object.assign(game, {
    state: 'playing', time: 0, kills: 0, score: 0, shake: 0, slow: 0, flash: 0,
    combo: 0, comboTimer: 0, maxCombo: 0, comboLostFlash: 0,
    eliteTimer: 42, waveTimer: 0, waveNum: 0, waveLull: 0,
    lastMoveX: 1, lastMoveY: 0,
    enemies: [], bullets: [], gems: [], parts: [], floats: [],
    spawnTimer: 0.3, fireTimer: 0, level: 1, xp: 0, xpNeed: 4, pendingLevels: 0,
    nextMilestone: 0, deathTimer: 0,
    graceTimer: 1.5,
  });
  game.player = makePlayer();
  game.player.iframe = 1.5;
  updateCamera(game.player.x, game.player.y, 99);
  resetTutorial();
  hide('start'); hide('over'); hide('pause'); hide('levelup');
  dom.hud.classList.add('on');
  dom.comboLine.style.opacity = '0';
  dom.comboLine.style.color = '';
  game.lastT = performance.now();
}

/** Enter death slow-mo (peak-end rule: dramatic endings are remembered). */
export function triggerDeath() {
  if (game.state === 'dying') return;
  game.state = 'dying';
  game.deathTimer = 1.2;
  Sound.over();
  burst(game.player.x, game.player.y, '#ff5d52', 50, 400);
  burst(game.player.x, game.player.y, '#ffce4f', 20, 300);
  game.shake = 10;
}

/** Called after death slow-mo completes. Shows the game-over screen. */
export function endGame() {
  game.state = 'over';
  dom.hud.classList.remove('on');

  // persist records
  let newBest = false;
  if (game.score > game.best) { game.best = game.score; saveBest(game.best); newBest = true; }
  if (game.maxCombo > game.bestCombo) { game.bestCombo = game.maxCombo; saveBestCombo(game.bestCombo); }
  if (game.time > game.bestTime) { game.bestTime = game.time; saveBestTime(game.bestTime); }
  game.gamesPlayed++; saveGamesPlayed(game.gamesPlayed);

  // populate stats
  dom.oTime.textContent = fmtTime(game.time);
  dom.oScore.textContent = game.score;
  dom.oKills.textContent = game.kills;
  dom.oLevel.textContent = game.level;
  dom.oCombo.textContent = game.maxCombo;
  dom.oWave.textContent = game.waveNum;
  const rank = scoreRank(game.score);
  dom.oRank.textContent = rank;
  dom.oRank.setAttribute('data-rank', rank);

  // best tag
  dom.bestTag.textContent = newBest ? 'NEW BEST SCORE' : 'Best  ' + game.best;

  // near-miss callouts (Zeigarnik effect: "so close" is the strongest replay hook)
  const nearMisses = [];
  if (!newBest && game.best - game.score < game.best * 0.15 && game.best - game.score > 0) {
    nearMisses.push('Only ' + (game.best - game.score) + ' pts from your best!');
  }
  for (const m of MILESTONES) {
    if (game.kills < m && m - game.kills <= 8) {
      nearMisses.push('Just ' + (m - game.kills) + ' kills from ' + m + '!');
      break;
    }
  }
  if (nearMisses.length > 0) Sound.nearMiss();
  dom.nearMiss.textContent = nearMisses.join('  ');

  refreshStartBest();
  setTimeout(() => show('over'), 200);
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
  const rank = scoreRank(game.score);
  const txt = 'SURGE [' + rank + '] ' + game.score + ' pts | '
    + fmtTime(game.time) + ' survived | '
    + game.maxCombo + '-kill combo. Can you beat it?';
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

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') togglePause();
});
