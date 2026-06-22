/* ============================================================
   Canvas + viewport sizing + camera.

   The world is larger than the viewport. The camera follows the
   player, clamped to world edges. All game coordinates are in
   world space; the renderer translates by -camera before drawing.
   ============================================================ */
export const cv = document.getElementById('game');
export const ctx = cv.getContext('2d');

export const WORLD_W = 2400;
export const WORLD_H = 1800;

export let W = 0, H = 0, DPR = 1;
export let camX = 0, camY = 0;

export function resize() {
  const r = cv.getBoundingClientRect();
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = r.width; H = r.height;
  cv.width = Math.round(W * DPR);
  cv.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

/**
 * Camera follows the player with lag so the ship visibly moves
 * on screen before the camera catches up. The deadzone is the
 * area around screen center where the player can move freely
 * without the camera shifting at all.
 */
export function updateCamera(px, py, dt) {
  const targetX = Math.max(0, Math.min(px - W / 2, WORLD_W - W));
  const targetY = Math.max(0, Math.min(py - H / 2, WORLD_H - H));
  const speed = 4.0;
  camX += (targetX - camX) * Math.min(speed * dt, 1);
  camY += (targetY - camY) * Math.min(speed * dt, 1);
}

window.addEventListener('resize', resize);
