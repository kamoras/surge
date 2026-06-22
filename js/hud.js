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

/* ---------- per-frame HUD ---------- */
export function updateHUD() {
  const p = game.player; if (!p) return;
  $('hpFill').style.width = Math.max(0, Math.min(p.hp / p.maxHp * 100, 100)) + '%';
  $('hpLabel').textContent = Math.ceil(p.hp) + ' / ' + p.maxHp;
  $('xpFill').style.width = Math.max(0, Math.min(game.xp / game.xpNeed * 100, 100)) + '%';
  $('xpLabel').textContent = 'LV ' + game.level;
  $('timer').textContent = fmtTime(game.time);
  $('kills').textContent = game.kills;
  $('score').textContent = game.score;

  const cl = $('comboLine');
  if (game.combo >= 3) {
    cl.style.opacity = '1';
    cl.textContent = '×' + comboMult().toFixed(1) + '  ·  ' + game.combo + ' COMBO';
  } else {
    cl.style.opacity = '0';
  }
}

function refreshStartBest() {
  $('startBest').textContent = game.best > 0 ? ('BEST SCORE  ' + game.best) : '';
}

/* ---------- run lifecycle ---------- */
export function startGame() {
  Sound.init();
  resize();
  Object.assign(game, {
    state: 'playing', time: 0, kills: 0, score: 0, shake: 0, slow: 0, flash: 0,
    combo: 0, comboTimer: 0, eliteTimer: 42, lastMoveX: 1, lastMoveY: 0,
    enemies: [], bullets: [], gems: [], parts: [], floats: [],
    spawnTimer: 0.5, fireTimer: 0, level: 1, xp: 0, xpNeed: 6, pendingLevels: 0,
  });
  game.player = makePlayer();
  hide('start'); hide('over'); hide('pause'); hide('levelup');
  $('hud').classList.add('on');
  $('comboLine').style.opacity = '0';
  game.lastT = performance.now();
}

export function endGame() {
  game.state = 'over';
  Sound.over();
  burst(game.player.x, game.player.y, '#ff5d52', 40, 360);
  game.shake = 20;
  $('hud').classList.remove('on');
  $('oTime').textContent = fmtTime(game.time);
  $('oScore').textContent = game.score;
  $('oKills').textContent = game.kills;
  $('oLevel').textContent = game.level;

  const bt = $('bestTag');
  if (game.score > game.best) {
    game.best = game.score; saveBest(game.best);
    bt.textContent = '★ NEW BEST SCORE ★';
  } else {
    bt.textContent = 'Best  ' + game.best;
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
  const btn = $('muteBtn');
  btn.textContent = Sound.isMuted() ? '✕' : '♪';
  btn.style.color = Sound.isMuted() ? '#ff5d52' : '';
}

export function shareRun() {
  const txt = 'I survived ' + fmtTime(game.time) + ' in SURGE with a score of ' + game.score + '. Can you beat it?';
  const url = location.href.split('#')[0];
  if (navigator.share) {
    navigator.share({ title: 'SURGE', text: txt, url }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(txt + ' ' + url).then(() => {
      const b = $('shareBtn'); const old = b.textContent;
      b.textContent = 'Copied!';
      setTimeout(() => { b.textContent = old; }, 1400);
    }).catch(() => {});
  }
}

/** Show the all-time best on the start screen at boot. */
export function initStartScreen() { refreshStartBest(); }
