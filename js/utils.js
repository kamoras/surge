/* ============================================================
   Math + small helpers. No dependencies -- safe to import anywhere.
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

/**
 * Remove items from an array by swapping each removed item with the last
 * element and popping. O(1) per removal vs O(n) for splice. Order is not
 * preserved, which is fine for particles, bullets, and floaters.
 *
 * `predicate(item, index)` should return true to KEEP the item.
 */
export function compactInPlace(arr, predicate) {
  let i = 0;
  while (i < arr.length) {
    if (predicate(arr[i], i)) {
      i++;
    } else {
      arr[i] = arr[arr.length - 1];
      arr.pop();
    }
  }
}
