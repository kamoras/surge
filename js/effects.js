/* ============================================================
   Visual ephemera: particle bursts and floating text.
   Both push into arrays on `game`; render.js draws them and
   update() ages them out.
   ============================================================ */
import { game } from './state.js';
import { rand, TAU } from './utils.js';

/** Radial spray of `n` particles from (x,y). */
export function burst(x, y, color, n, spd) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, TAU), s = rand(spd * 0.3, spd);
    game.parts.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: rand(0.3, 0.7), max: 0.7, color, size: rand(1.5, 3.5),
    });
  }
}

/** Rising damage/status text. `big` bumps the font size. */
export function floatText(x, y, txt, color, big) {
  game.floats.push({ x, y, txt, color, life: 0.8, vy: -34, size: big ? 18 : 12 });
}
