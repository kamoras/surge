/* ============================================================
   SURGE — entry point.

   Wires the UI buttons + input handlers and runs the requestAnimation-
   Frame loop. The loop only steps the sim while playing; rendering
   runs every frame so menus still show the animated background.

   Module map:
     utils      math helpers / constants
     audio      Web Audio synth (Sound)
     canvas     <canvas>, ctx, viewport size, resize
     state      shared `game` object + persistence
     data       enemy + upgrade tables
     input      keyboard / touch
     effects    particle + floating-text spawners
     entities   player factory, spawning, dash
     combat     firing, damage, death, pickups, level-up
     upgrades   level-up card screen
     update     per-frame simulation step
     render     all canvas drawing
     hud        HUD + screen flow (start/over/pause/share)
     main       this file — wiring + loop
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
import { $ } from './dom.js';

// ---- UI buttons ----
$('startBtn').onclick = startGame;
$('againBtn').onclick = startGame;
$('resumeBtn').onclick = togglePause;
$('muteBtn').onclick = toggleMute;
$('shareBtn').onclick = shareRun;
initStartScreen();

// ---- input ----
initInput({ onDash: tryDash, onPause: togglePause, onMute: toggleMute });

// ---- main loop ----
function loop(now) {
  let dt = (now - game.lastT) / 1000; game.lastT = now;
  dt = Math.min(dt, 0.05);                 // clamp to avoid huge steps after a stall

  if (game.state === 'playing') {
    let scaled = dt;
    if (game.slow > 0) { game.slow -= dt; scaled = dt * 0.35; }  // level-up slow-mo
    update(scaled);
    updateHUD();
  }
  render();
  requestAnimationFrame(loop);
}

resize();
render();
game.lastT = performance.now();
requestAnimationFrame(loop);
