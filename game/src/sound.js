// Sound: every effect is a WebAudio oscillator, no audio files anywhere.
// Created lazily on the first user gesture (browsers block audio before it).

let ctx = null;
let muted = false;

export function setMuted(value) { muted = value; }
export function isMuted() { return muted; }

function audio() {
  if (muted) return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, dur, type, vol, when = 0, slideTo = null) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  deal() { tone(520, 0.08, 'triangle', 0.12, 0, 780); },
  play() { tone(392, 0.1, 'square', 0.08, 0, 523); },
  hit() { tone(180, 0.22, 'sawtooth', 0.16, 0, 70); tone(90, 0.18, 'sine', 0.2, 0, 45); },
  combo() { tone(523, 0.09, 'triangle', 0.14); tone(659, 0.09, 'triangle', 0.14, 0.08); tone(784, 0.14, 'triangle', 0.14, 0.16); },
  counter() { tone(880, 0.1, 'sine', 0.14, 0, 1174); },
  heal() { tone(440, 0.16, 'sine', 0.12, 0, 660); tone(660, 0.2, 'sine', 0.1, 0.1, 880); },
  draw() { tone(660, 0.06, 'triangle', 0.08, 0, 880); },
  turn() { tone(330, 0.12, 'triangle', 0.1, 0, 440); },
  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.22, 'triangle', 0.14, i * 0.11));
  },
  lose() {
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.28, 'sine', 0.14, i * 0.16));
  },
  click() { tone(700, 0.05, 'square', 0.06); },
};
