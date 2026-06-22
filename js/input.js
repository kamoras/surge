/* ============================================================
   INPUT — keyboard + touch.

   Exposes raw input state (`keys`, `touch`) read by the simulation,
   and wires DOM listeners in initInput() with caller-supplied
   handlers so this module stays decoupled from game logic.
   ============================================================ */
import { cv } from './canvas.js';
import { game } from './state.js';

/** Held keys, keyed by lowercased KeyboardEvent.key. */
export const keys = {};

/** Virtual joystick state. dx/dy are normalized to [-1, 1]. */
export const touch = { active: false, ox: 0, oy: 0, x: 0, y: 0, dx: 0, dy: 0 };

const PREVENT = ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '];
let lastTouchTap = 0;

/**
 * @param {{onSurge:Function, onDash:Function, onPause:Function, onMute:Function}} handlers
 */
export function initInput({ onSurge, onDash, onPause, onMute }) {
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (PREVENT.includes(k)) e.preventDefault();
    keys[k] = true;
    if (k === 'p') onPause();
    if (k === 'm') onMute();
    if (k === ' ' && !e.repeat) onSurge();
    if (k === 'shift' && !e.repeat) onDash();
  });
  window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

  cv.addEventListener('touchstart', e => {
    if (game.state !== 'playing') return;
    const now = performance.now();
    if (now - lastTouchTap < 280) onDash();   // double-tap to dash (surge is the button)
    lastTouchTap = now;
    const t = e.changedTouches[0];
    touch.active = true;
    touch.ox = t.clientX; touch.oy = t.clientY;
    touch.x = t.clientX; touch.y = t.clientY;
  }, { passive: false });

  cv.addEventListener('touchmove', e => {
    if (!touch.active) return;
    e.preventDefault();
    const t = e.changedTouches[0];
    let dx = t.clientX - touch.ox, dy = t.clientY - touch.oy;
    const mag = Math.hypot(dx, dy), max = 60;
    if (mag > max) { dx = dx / mag * max; dy = dy / mag * max; }
    touch.x = touch.ox + dx; touch.y = touch.oy + dy;
    touch.dx = mag > 6 ? dx / max : 0;
    touch.dy = mag > 6 ? dy / max : 0;
  }, { passive: false });

  const end = () => { touch.active = false; touch.dx = 0; touch.dy = 0; };
  cv.addEventListener('touchend', end);
  cv.addEventListener('touchcancel', end);
}
