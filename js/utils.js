/* ============================================================
   Math + small helpers. No dependencies — safe to import anywhere.
   ============================================================ */
export const TAU = Math.PI * 2;

export const rand  = (a, b) => a + Math.random() * (b - a);
export const randi = (a, b) => Math.floor(rand(a, b + 1));
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp  = (a, b, t) => a + (b - a) * t;

/** Squared distance between two points (cheaper than hypot for comparisons). */
export const dist2 = (ax, ay, bx, by) => {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
};

export function pick(arr) { return arr[randi(0, arr.length - 1)]; }
