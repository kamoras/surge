/* ============================================================
   AUDIO -- a tiny Web Audio synth. Every sound effect is generated
   at runtime (no asset files). Safe to call before init(); calls
   no-op until the AudioContext exists and while muted.

   The kill sound pitch escalates with the combo counter to create
   an audio reward gradient (variable ratio reinforcement).
   ============================================================ */
export const Sound = (() => {
  let actx = null, master = null, muted = false;

  function init() {
    if (actx) return;
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      master = actx.createGain();
      master.gain.value = 0.45;
      master.connect(actx.destination);
    } catch (e) { actx = null; }
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!actx || muted) return;
    const t = actx.currentTime;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol || 0.3, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }

  function noise(dur, vol, freq) {
    if (!actx || muted) return;
    const t = actx.currentTime;
    const n = Math.floor(actx.sampleRate * dur);
    const buf = actx.createBuffer(1, n, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const src = actx.createBufferSource(); src.buffer = buf;
    const f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 900; f.Q.value = 1.2;
    const g = actx.createGain(); g.gain.value = vol || 0.3;
    src.connect(f); f.connect(g); g.connect(master); src.start();
  }

  return {
    init,
    setMuted(m) { muted = m; },
    isMuted() { return muted; },
    shoot()  { blip(660, 0.05, 'square', 0.10, 420); },
    hit()    { noise(0.05, 0.12, 1400); },
    crit()   { blip(1200, 0.08, 'square', 0.14, 1900); noise(0.05, 0.10, 2200); },
    // kill pitch rises with combo: base 180Hz, +4Hz per combo hit, capped at 440Hz
    kill(combo) {
      const freq = Math.min(180 + (combo || 0) * 4, 440);
      noise(0.12, 0.22, 600);
      blip(freq, 0.12, 'sawtooth', 0.12, freq * 0.5);
    },
    // combo milestone fanfare at 10, 20, 30... kills
    comboFanfare(tier) {
      const base = 523 + tier * 60;
      [base, base * 1.25, base * 1.5].forEach((f, i) =>
        setTimeout(() => blip(f, 0.15, 'triangle', 0.16), i * 40));
    },
    pickup() { blip(880, 0.06, 'triangle', 0.10, 1320); },
    hurt()   { blip(140, 0.22, 'sawtooth', 0.3, 60); noise(0.1, 0.18, 300); },
    dash()   { noise(0.14, 0.10, 1800); blip(300, 0.14, 'sine', 0.09, 1000); },
    heal()   { [660, 880, 1175].forEach((f, i) => setTimeout(() => blip(f, 0.14, 'sine', 0.12), i * 45)); },
    bomb()   { noise(0.45, 0.4, 180); blip(120, 0.5, 'sawtooth', 0.22, 38); },
    elite()  { [233, 233].forEach((f, i) => setTimeout(() => blip(f, 0.3, 'sawtooth', 0.2, 180), i * 180)); },
    level()  { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'triangle', 0.22), i * 55)); },
    over()   { [440, 392, 330, 247].forEach((f, i) => setTimeout(() => blip(f, 0.4, 'sawtooth', 0.22), i * 130)); },
    // near-miss sting on game over when close to a record
    nearMiss() { blip(330, 0.3, 'triangle', 0.18, 294); setTimeout(() => blip(294, 0.5, 'triangle', 0.14, 220), 200); },
  };
})();
