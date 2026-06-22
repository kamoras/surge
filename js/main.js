/* ============================================================
   SURGE -- entry point.

   Wires the UI buttons + input handlers and runs the rAF loop.
   The loop steps the sim while playing or dying; rendering runs
   every frame so menus still show the animated background.
   ============================================================ */
import { resize } from './canvas.js';
import { game } from './state.js';
import { initInput } from './input.js';
import { tryDash } from './entities.js';
import { update } from './update.js';
import { render } from './render.js';
import {
  updateHUD, startGame, togglePause, toggleMute, shareRun, initStartScreen,
} from './hud.js';
import { updateTutorial } from './tutorial.js';
import { $ } from './dom.js';

$('startBtn').onclick = startGame;
$('againBtn').onclick = startGame;
$('resumeBtn').onclick = togglePause;
$('muteBtn').onclick = toggleMute;
$('shareBtn').onclick = shareRun;
const dashBtnEl = $('dashBtn');
dashBtnEl.addEventListener('touchstart', e => { e.preventDefault(); tryDash(); }, { passive: false });
initStartScreen();

initInput({ onDash: tryDash, onPause: togglePause, onMute: toggleMute });

function loop(now) {
  let dt = (now - game.lastT) / 1000; game.lastT = now;
  dt = Math.min(dt, 0.05);

  if (game.state === 'playing' || game.state === 'dying') {
    let scaled = dt;
    if (game.slow > 0 && game.state === 'playing') { game.slow -= dt; scaled = dt * 0.35; }
    update(scaled);
    if (game.state !== 'over') { updateHUD(); updateTutorial(scaled); }
  }
  render();
  requestAnimationFrame(loop);
}

resize();
render();
game.lastT = performance.now();
requestAnimationFrame(loop);
