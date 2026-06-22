/* ============================================================
   Canvas + viewport sizing.

   W, H and DPR are exported as live bindings: importers always see
   the current values after resize() reassigns them.
   ============================================================ */
export const cv = document.getElementById('game');
export const ctx = cv.getContext('2d');

export let W = 0, H = 0, DPR = 1;

export function resize() {
  const r = cv.getBoundingClientRect();
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = r.width; H = r.height;
  cv.width = Math.round(W * DPR);
  cv.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

window.addEventListener('resize', resize);
