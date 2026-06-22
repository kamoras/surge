/* ============================================================
   All canvas drawing. Reads game state; never mutates it (except
   the purely cosmetic scrolling-grid offset).
   ============================================================ */
import { game } from './state.js';
import { ctx, W, H } from './canvas.js';
import { rand, clamp, TAU } from './utils.js';

let gridOff = 0;

export function render() {
  ctx.clearRect(0, 0, W, H);

  // screen shake
  let sx = 0, sy = 0;
  if (game.shake > 0) { sx = rand(-game.shake, game.shake); sy = rand(-game.shake, game.shake); }
  ctx.save();
  ctx.translate(sx, sy);

  // scrolling grid
  gridOff = (gridOff + 0.15) % 48;
  ctx.strokeStyle = 'rgba(154,123,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = -48 + gridOff; x < W + 48; x += 48) { ctx.moveTo(x, -48); ctx.lineTo(x, H + 48); }
  for (let y = -48 + gridOff; y < H + 48; y += 48) { ctx.moveTo(-48, y); ctx.lineTo(W + 48, y); }
  ctx.stroke();

  const p = game.player;

  // gems / pickups
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

  // bullets
  ctx.shadowBlur = 8;
  for (const b of game.bullets) {
    ctx.shadowColor = '#ffce4f';
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
  }
  ctx.shadowBlur = 0;

  // enemies
  for (const e of game.enemies) drawEnemy(e);

  // particles
  for (const pa of game.parts) {
    ctx.globalAlpha = clamp(pa.life / pa.max, 0, 1);
    ctx.fillStyle = pa.color;
    ctx.beginPath(); ctx.arc(pa.x, pa.y, pa.size, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // player + orbiting shards
  if (p) { drawPlayer(p); drawOrbs(p); }

  // floating text
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const f of game.floats) {
    ctx.globalAlpha = clamp(f.life / 0.8, 0, 1);
    ctx.font = '700 ' + f.size + 'px Chakra Petch, sans-serif';
    ctx.fillStyle = f.color;
    ctx.fillText(f.txt, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  ctx.restore();

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
    ctx.save();
    ctx.shadowColor = '#7bd0ff'; ctx.shadowBlur = 10;
    ctx.fillStyle = '#bfe6ff';
    ctx.beginPath(); ctx.arc(ox, oy, 5, 0, TAU); ctx.fill();
    ctx.restore();
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

  // body (arrowhead); blinks during i-frames
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
  ctx.shadowColor = e.color; ctx.shadowBlur = e.flash > 0 ? 16 : 8;
  ctx.fillStyle = col; ctx.strokeStyle = col;

  if (e.type === 'grunt') {                 // diamond
    ctx.rotate(e.wob * 0.5);
    ctx.beginPath();
    ctx.moveTo(0, -e.r); ctx.lineTo(e.r, 0); ctx.lineTo(0, e.r); ctx.lineTo(-e.r, 0); ctx.closePath();
    ctx.fill();
  } else if (e.type === 'rusher') {         // triangle aimed at player
    const ang = Math.atan2(game.player.y - e.y, game.player.x - e.x);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(e.r + 3, 0); ctx.lineTo(-e.r, -e.r * 0.8); ctx.lineTo(-e.r, e.r * 0.8); ctx.closePath();
    ctx.fill();
  } else if (e.type === 'tank') {           // hexagon w/ inner ring
    ctx.rotate(e.wob * 0.2);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const x = Math.cos(a) * e.r, y = Math.sin(a) * e.r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(12,13,26,0.5)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, e.r * 0.5, 0, TAU); ctx.stroke();
  } else if (e.type === 'elite') {          // pulsing ringed core w/ spikes
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
  } else {                                   // splitter — pentagon
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
