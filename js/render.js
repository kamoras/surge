/* ============================================================
   All canvas drawing. Reads game state; never mutates it.

   Performance notes:
   - shadowBlur is GPU-heavy; we only use it sparingly (player, pickups)
     and skip it on enemies/bullets (draw a second, larger, semi-transparent
     circle as a cheap glow instead).
   - Particles and floaters are drawn with no shadow at all.
   ============================================================ */
import { game, comboMult } from './state.js';
import { ctx, W, H, WORLD_W, WORLD_H, camX, camY } from './canvas.js';
import { rand, clamp, TAU } from './utils.js';
import { touch } from './input.js';

const mmCv = document.getElementById('minimap');
const mmCtx = mmCv ? mmCv.getContext('2d') : null;
const MM_W = 140, MM_H = 105;

let gridOff = 0;
let stars = null;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initStars() {
  stars = [];
  for (let i = 0; i < 60; i++) {
    stars.push({
      x: Math.random() * 2000,
      y: Math.random() * 2000,
      size: 0.5 + Math.random() * 1.5,
      speed: 0.08 + Math.random() * 0.15,
      alpha: 0.15 + Math.random() * 0.25,
    });
  }
}

export function render() {
  ctx.clearRect(0, 0, W, H);

  // screen shake (capped, skipped for vestibular sensitivity)
  let sx = 0, sy = 0;
  if (game.shake > 0 && !reduceMotion) {
    const s = Math.min(game.shake, 10);
    sx = rand(-s, s); sy = rand(-s, s);
  }
  ctx.save();
  ctx.translate(sx - camX, sy - camY);

  drawStars();
  drawGrid();
  drawWorldBorder();

  const p = game.player;

  drawPickups();
  drawBullets();
  drawEnemies();
  drawParticles();
  if (p) { drawPlayer(p); drawOrbs(p); }
  drawFloaters();
  ctx.restore();

  // screen-space overlays (not affected by camera)
  if (p) drawDangerIndicators(p);
  drawTouchJoystick();

  // full-screen bomb flash (drawn unshaken)
  if (game.flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + clamp(game.flash, 0, 0.6) + ')';
    ctx.fillRect(0, 0, W, H);
  }

  // hurt vignette
  if (p && p.iframe > 0) {
    const a = clamp(p.iframe / 0.6, 0, 1) * 0.4;
    const grd = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
    grd.addColorStop(0, 'rgba(255,93,82,0)');
    grd.addColorStop(1, 'rgba(255,93,82,' + a + ')');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  }

  // combo intensity border when combo is high
  if (game.combo >= 8) {
    const intensity = clamp((game.combo - 8) / 40, 0, 0.5);
    const grd = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.65);
    grd.addColorStop(0, 'rgba(255,206,79,0)');
    grd.addColorStop(1, 'rgba(255,206,79,' + intensity + ')');
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  }

  // death desaturation overlay (peak-end rule: make death feel dramatic)
  if (game.state === 'dying') {
    const t = clamp(1 - game.deathTimer / 1.2, 0, 1);
    ctx.fillStyle = 'rgba(12,13,26,' + (t * 0.6) + ')';
    ctx.fillRect(0, 0, W, H);
  }

  // grace period shield indicator (onboarding: show the player they are safe)
  if (p && game.graceTimer > 0) {
    const a = clamp(game.graceTimer / 1.5, 0, 1) * 0.3;
    ctx.strokeStyle = 'rgba(95,230,196,' + a + ')';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(p.x - camX, p.y - camY, p.r + 18, 0, TAU); ctx.stroke();
  }

  // minimap
  drawMinimap(p);
}

function drawGrid() {
  gridOff = (gridOff + 0.15) % 48;
  ctx.strokeStyle = 'rgba(154,123,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = -48 + gridOff; x < W + 48; x += 48) { ctx.moveTo(x, -48); ctx.lineTo(x, H + 48); }
  for (let y = -48 + gridOff; y < H + 48; y += 48) { ctx.moveTo(-48, y); ctx.lineTo(W + 48, y); }
  ctx.stroke();
}

function drawPickups() {
  for (const g of game.gems) {
    if (g.kind === 'heart') { drawHeart(g); continue; }
    if (g.kind === 'bomb') { drawBomb(g); continue; }
    const pulse = 0.7 + Math.sin(g.bob) * 0.3;
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.bob * 0.4);
    ctx.shadowColor = '#5fe6c4'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#5fe6c4';
    ctx.globalAlpha = g.life < 2 ? g.life / 2 : 1;
    const s = 3.4 * pulse;
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.lineTo(s, 0); ctx.lineTo(0, s); ctx.lineTo(-s, 0); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function drawBullets() {
  // cheap glow: draw a larger semi-transparent circle, then the bright core
  for (const b of game.bullets) {
    ctx.fillStyle = 'rgba(255,206,79,0.25)';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 4, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
  }
}

function drawEnemies() {
  for (const e of game.enemies) drawEnemy(e);
}

function drawParticles() {
  for (const pa of game.parts) {
    ctx.globalAlpha = clamp(pa.life / pa.max, 0, 1);
    ctx.fillStyle = pa.color;
    ctx.beginPath(); ctx.arc(pa.x, pa.y, pa.size, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloaters() {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const f of game.floats) {
    ctx.globalAlpha = clamp(f.life / 0.8, 0, 1);
    ctx.font = '700 ' + f.size + 'px Chakra Petch, sans-serif';
    ctx.fillStyle = f.color;
    ctx.fillText(f.txt, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawHeart(g) {
  ctx.save();
  ctx.translate(g.x, g.y);
  const s = 7 + Math.sin(g.bob * 1.5) * 1.2;
  ctx.shadowColor = '#ff5d52'; ctx.shadowBlur = 14;
  ctx.fillStyle = '#ff7a5c';
  ctx.globalAlpha = g.life < 2 ? g.life / 2 : 1;
  ctx.beginPath();
  ctx.arc(-s * 0.4, -s * 0.2, s * 0.5, 0, TAU);
  ctx.arc(s * 0.4, -s * 0.2, s * 0.5, 0, TAU);
  ctx.moveTo(-s * 0.9, 0); ctx.lineTo(0, s * 0.95); ctx.lineTo(s * 0.9, 0); ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawBomb(g) {
  ctx.save();
  ctx.translate(g.x, g.y);
  const pulse = 1 + Math.sin(g.bob * 2) * 0.12;
  ctx.shadowColor = '#ff9d3d'; ctx.shadowBlur = 14;
  ctx.globalAlpha = g.life < 2 ? g.life / 2 : 1;
  ctx.fillStyle = '#ff9d3d';
  ctx.beginPath(); ctx.arc(0, 0, 7 * pulse, 0, TAU); ctx.fill();
  ctx.fillStyle = '#0c0d1a';
  ctx.beginPath(); ctx.arc(0, 0, 3, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawOrbs(p) {
  if (p.orbCount <= 0) return;
  const R = 48;
  for (let k = 0; k < p.orbCount; k++) {
    const a = p.orbAngle + k / p.orbCount * TAU;
    const ox = p.x + Math.cos(a) * R, oy = p.y + Math.sin(a) * R;
    ctx.fillStyle = 'rgba(123,208,255,0.3)';
    ctx.beginPath(); ctx.arc(ox, oy, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = '#bfe6ff';
    ctx.beginPath(); ctx.arc(ox, oy, 5, 0, TAU); ctx.fill();
  }
}

function drawPlayer(p) {
  ctx.save();
  ctx.translate(p.x, p.y);

  // faint pickup-range ring
  ctx.strokeStyle = 'rgba(154,123,255,0.10)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, p.range, 0, TAU); ctx.stroke();

  // dash recharge ring
  const dr = p.dashTimer > 0 ? clamp(1 - p.dashTimer / p.dashCd, 0, 1) : 1;
  ctx.strokeStyle = dr >= 1 ? 'rgba(154,123,255,0.75)' : 'rgba(154,123,255,0.28)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, p.r + 7, -Math.PI / 2, -Math.PI / 2 + dr * TAU); ctx.stroke();

  ctx.rotate(p.aim);

  // muzzle flash
  if (p.muzzle > 0) {
    ctx.fillStyle = 'rgba(255,233,168,' + (p.muzzle / 0.06) + ')';
    ctx.beginPath();
    ctx.moveTo(p.r, 0); ctx.lineTo(p.r + 18, -5); ctx.lineTo(p.r + 24, 0); ctx.lineTo(p.r + 18, 5); ctx.closePath();
    ctx.fill();
  }

  // body glow (one shadowBlur for the player is fine -- it's a single draw)
  const blink = p.iframe > 0 && Math.floor(p.iframe * 20) % 2 === 0;
  ctx.shadowColor = '#f3ead7'; ctx.shadowBlur = 14;
  ctx.fillStyle = blink ? 'rgba(243,234,215,0.4)' : '#f3ead7';
  ctx.beginPath();
  ctx.moveTo(p.r + 4, 0);
  ctx.lineTo(-p.r * 0.8, -p.r * 0.85);
  ctx.lineTo(-p.r * 0.3, 0);
  ctx.lineTo(-p.r * 0.8, p.r * 0.85);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;

  // core
  ctx.fillStyle = '#0c0d1a';
  ctx.beginPath(); ctx.arc(-p.r * 0.15, 0, 2.4, 0, TAU); ctx.fill();
  ctx.restore();
}

function drawEnemy(e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  const col = e.flash > 0 ? '#ffffff' : e.color;

  // cheap glow: slightly larger, semi-transparent background shape
  ctx.globalAlpha = e.flash > 0 ? 0.5 : 0.25;
  ctx.fillStyle = e.color;
  const gr = e.r + 6;
  ctx.beginPath(); ctx.arc(0, 0, gr, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = col; ctx.strokeStyle = col;

  if (e.type === 'grunt') {
    ctx.rotate(e.wob * 0.5);
    ctx.beginPath();
    ctx.moveTo(0, -e.r); ctx.lineTo(e.r, 0); ctx.lineTo(0, e.r); ctx.lineTo(-e.r, 0); ctx.closePath();
    ctx.fill();
  } else if (e.type === 'rusher') {
    const ang = Math.atan2(game.player.y - e.y, game.player.x - e.x);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(e.r + 3, 0); ctx.lineTo(-e.r, -e.r * 0.8); ctx.lineTo(-e.r, e.r * 0.8); ctx.closePath();
    ctx.fill();
  } else if (e.type === 'tank') {
    ctx.rotate(e.wob * 0.2);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const x = Math.cos(a) * e.r, y = Math.sin(a) * e.r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(12,13,26,0.5)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, e.r * 0.5, 0, TAU); ctx.stroke();
  } else if (e.type === 'shielder') {
    // circle body with a front-facing shield arc
    ctx.beginPath(); ctx.arc(0, 0, e.r * 0.75, 0, TAU); ctx.fill();
    // shield arc: 120 degrees facing the player
    const sa = e.shieldAngle - Math.atan2(e.y, e.x); // relative angle
    ctx.strokeStyle = e.flash > 0 ? '#fff' : '#80d8ff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, e.r, e.shieldAngle - Math.PI / 3, e.shieldAngle + Math.PI / 3);
    ctx.stroke();
  } else if (e.type === 'warper') {
    // flickering diamond that fades when about to teleport
    if (!e.warpVisible) { ctx.globalAlpha *= 0.2; }
    ctx.rotate(e.wob);
    const wr = e.r;
    ctx.beginPath();
    ctx.moveTo(0, -wr); ctx.lineTo(wr * 0.7, 0); ctx.lineTo(0, wr); ctx.lineTo(-wr * 0.7, 0); ctx.closePath();
    ctx.fill();
    // inner cross
    ctx.strokeStyle = 'rgba(12,13,26,0.4)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -wr * 0.5); ctx.lineTo(0, wr * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-wr * 0.35, 0); ctx.lineTo(wr * 0.35, 0); ctx.stroke();
  } else if (e.type === 'elite') {
    ctx.rotate(e.wob * 0.3);
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, e.r, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, e.r * 0.6, 0, TAU); ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * e.r * 0.92, Math.sin(a) * e.r * 0.92);
      ctx.lineTo(Math.cos(a) * (e.r + 9), Math.sin(a) * (e.r + 9));
      ctx.stroke();
    }
  } else {
    ctx.rotate(e.wob * 0.6);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU - Math.PI / 2; const x = Math.cos(a) * e.r, y = Math.sin(a) * e.r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // hp bar for big enemies
  if (e.maxHp > 20 && e.hp < e.maxHp) {
    const w = e.r * 2, h = 3;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(e.x - w / 2, e.y - e.r - 9, w, h);
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x - w / 2, e.y - e.r - 9, w * clamp(e.hp / e.maxHp, 0, 1), h);
  }
}

function drawStars() {
  if (!stars) initStars();
  ctx.fillStyle = '#f3ead7';
  for (const s of stars) {
    s.y = (s.y + s.speed) % (H + 20);
    ctx.globalAlpha = s.alpha;
    ctx.beginPath();
    ctx.arc(s.x % (W + 10), s.y, s.size, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Small arrows at screen edges pointing toward off-screen enemies. */
function drawDangerIndicators(p) {
  const margin = 18;
  for (const e of game.enemies) {
    if (e.dead) continue;
    // convert to screen space
    const sx = e.x - camX, sy = e.y - camY;
    // only show for enemies off-screen
    if (sx > margin && sx < W - margin && sy > margin && sy < H - margin) continue;
    const ang = Math.atan2(e.y - p.y, e.x - p.x);
    const ix = clamp(sx, margin, W - margin);
    const iy = clamp(sy, margin, H - margin);
    const size = e.isElite ? 7 : 4;
    ctx.save();
    ctx.translate(ix, iy);
    ctx.rotate(ang);
    ctx.globalAlpha = e.isElite ? 0.9 : 0.5;
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size, -size * 0.7);
    ctx.lineTo(-size, size * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawTouchJoystick() {
  if (!touch.active) return;
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = '#f3ead7'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(touch.ox, touch.oy, 40, 0, TAU); ctx.stroke();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#f3ead7';
  ctx.beginPath(); ctx.arc(touch.x, touch.y, 12, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawWorldBorder() {
  ctx.strokeStyle = 'rgba(154,123,255,0.2)';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, WORLD_W, WORLD_H);
}

function drawMinimap(p) {
  if (!mmCtx) return;
  const sx = MM_W / WORLD_W, sy = MM_H / WORLD_H;
  mmCtx.clearRect(0, 0, MM_W, MM_H);

  // viewport rect
  mmCtx.strokeStyle = 'rgba(243,234,215,0.3)';
  mmCtx.lineWidth = 1;
  mmCtx.strokeRect(camX * sx, camY * sy, W * sx, H * sy);

  // enemies as dots
  for (const e of game.enemies) {
    if (e.dead) continue;
    mmCtx.fillStyle = e.isElite ? '#ff7ad0' : 'rgba(255,93,82,0.6)';
    mmCtx.fillRect(e.x * sx - 1, e.y * sy - 1, 2, 2);
  }

  // player
  if (p) {
    mmCtx.fillStyle = '#f3ead7';
    mmCtx.beginPath();
    mmCtx.arc(p.x * sx, p.y * sy, 3, 0, TAU);
    mmCtx.fill();
  }
}
