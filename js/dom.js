/* ============================================================
   Thin DOM helpers shared by the UI modules.
   ============================================================ */
export const $ = id => document.getElementById(id);

export function show(id) { $(id).classList.remove('hide'); }
export function hide(id) { $(id).classList.add('hide'); }

/** Seconds -> "m:ss". */
export function fmtTime(s) {
  const m = Math.floor(s / 60), ss = Math.floor(s % 60);
  return m + ':' + String(ss).padStart(2, '0');
}
