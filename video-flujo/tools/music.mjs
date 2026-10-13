// Música original del video, sintetizada aquí mismo (sin muestras ni derechos de terceros).
// House ligero a 120 BPM en La menor: cada compás dura 2 s, así los cambios de escena caen en compás.
// Uso: node tools/music.mjs assets/music.wav
import { writeFileSync } from 'node:fs';

const SR = 44100;
const BPM = 120;
const BEAT = 60 / BPM;
const BARS = 14;
const DUR = BARS * 4 * BEAT; // 28 s
const N = Math.round(DUR * SR);
const L = new Float32Array(N);
const R = new Float32Array(N);

// Generador con semilla: el archivo sale idéntico cada vez.
let seed = 20261012;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

function add(buf, start, len, fn) {
  const s0 = Math.max(0, Math.round(start * SR));
  const n = Math.min(N - s0, Math.round(len * SR));
  for (let i = 0; i < n; i++) buf[s0 + i] += fn(i / SR, i);
}
const both = (start, len, fn, pan = 0) => {
  const l = Math.cos(((pan + 1) * Math.PI) / 4), r = Math.sin(((pan + 1) * Math.PI) / 4);
  add(L, start, len, (t, i) => fn(t, i) * l);
  add(R, start, len, (t, i) => fn(t, i) * r);
};

// Envolvente de "bombeo": todo lo que no es bombo se agacha en cada golpe.
const kicks = [];
const duck = (t) => {
  let g = 1;
  for (const k of kicks) { const d = t - k; if (d >= 0 && d < 0.32) g = Math.min(g, 0.28 + 0.72 * (d / 0.32) ** 1.6); }
  return g;
};

// Progresión: Am · Am · F · G (dos vueltas por cada cuatro compases).
const CHORDS = [[57, 60, 64], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
const ROOTS = [33, 33, 29, 31];
// Intensidad por compás: entrada (logo), dos compases de subida, cuerpo completo y cierre.
const LEVEL = [0, 1, 1, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 1];

for (let bar = 0; bar < BARS; bar++) {
  const t0 = bar * 4 * BEAT;
  const lvl = LEVEL[bar];
  const chord = CHORDS[bar % 4];
  const root = ROOTS[bar % 4];

  // Bombo: cuatro por compás desde el segundo compás.
  if (lvl >= 1 && bar < BARS - 1) for (let b = 0; b < 4; b++) kicks.push(t0 + b * BEAT);

  // Colchón de acordes: sierras desafinadas con filtro suave.
  for (const note of chord) for (const det of [-0.07, 0.07]) {
    const f = hz(note + det);
    let lp = 0;
    both(t0, 4 * BEAT + 0.3, (t) => {
      const env = Math.min(1, t / 0.25) * Math.min(1, (4 * BEAT + 0.3 - t) / 0.3);
      const saw = 2 * ((t * f) % 1) - 1;
      lp += 0.035 * (1 + lvl * 0.5) * (saw - lp);
      return lp * env * 0.11 * (lvl === 0 ? 1.5 : 1);
    }, det * 8);
  }

  if (lvl >= 1) {
    // Bajo a contratiempo.
    for (let e = 0; e < 8; e++) {
      if (e % 2 === 0 && lvl < 3) continue;
      const note = e === 7 ? root + 12 : root;
      const f = hz(note);
      let lp = 0;
      both(t0 + e * BEAT / 2, BEAT / 2, (t) => {
        const env = Math.exp(-t * 9) * Math.min(1, t / 0.004);
        const saw = 2 * ((t * f) % 1) - 1 + 0.5 * Math.sin(2 * Math.PI * f * t);
        lp += (0.05 + 0.18 * Math.exp(-t * 14)) * (saw - lp);
        return lp * env * 0.5;
      });
    }
    // Platillo cerrado en semicorcheas, acento a contratiempo.
    for (let s = 0; s < 16; s++) {
      if (lvl < 2 && s % 4 !== 2) continue;
      const accent = s % 4 === 2 ? 1 : 0.38;
      let prev = 0;
      both(t0 + s * BEAT / 4, 0.09, (t) => { const n = rnd(); const hp = n - prev; prev = n; return hp * Math.exp(-t * (s % 4 === 2 ? 38 : 80)) * 0.16 * accent; }, s % 2 ? 0.25 : -0.25);
    }
  }
  if (lvl >= 2) {
    // Palmada en 2 y 4.
    for (const b of [1, 3]) {
      let bp = 0, prev = 0;
      both(t0 + b * BEAT, 0.22, (t) => {
        const n = rnd(); bp += 0.35 * (n - bp); const band = bp - prev; prev = bp * 0.6;
        const flam = t < 0.03 ? (Math.floor(t / 0.01) % 2 ? 0.4 : 1) : 1;
        return band * Math.exp(-t * 22) * 0.55 * flam;
      });
    }
  }
  if (lvl >= 3) {
    // Arpegio en semicorcheas: la parte que "corre".
    const up = [0, 1, 2, 1, 2, 1, 0, 2, 0, 1, 2, 1, 2, 0, 1, 2];
    for (let s = 0; s < 16; s++) {
      const f = hz(chord[up[s]] + 12 + (s % 8 === 7 ? 12 : 0));
      const pan = Math.sin(s * 1.3) * 0.6;
      for (const [delay, gain] of [[0, 1], [BEAT * 0.75, 0.32]]) {
        both(t0 + s * BEAT / 4 + delay, 0.28, (t) => {
          const tri = 2 * Math.abs(2 * ((t * f) % 1) - 1) - 1;
          const sq = Math.sin(2 * Math.PI * f * t) > 0 ? 0.3 : -0.3;
          return (tri + sq) * Math.exp(-t * 16) * Math.min(1, t / 0.003) * 0.085 * gain;
        }, delay ? -pan : pan);
      }
    }
  }
}

// Bombo, sin agachar.
for (const k of kicks) {
  both(k, 0.34, (t) => {
    const f = 46 + 110 * Math.exp(-t * 32);
    return (Math.sin(2 * Math.PI * (46 * t + (110 / 32) * (1 - Math.exp(-t * 32)))) * Math.exp(-t * 9) + (t < 0.004 ? rnd() * 0.5 : 0)) * 0.95 + 0 * f;
  });
}

// Subida de ruido hacia cada cambio de bloque y golpe de plato al entrar el cuerpo.
for (const bar of [1, 5]) {
  const len = 2 * BEAT;
  let prev = 0;
  both(bar * 4 * BEAT - len, len, (t) => { const n = rnd(); const hp = n - prev; prev = n * 0.8; return hp * (t / len) ** 2.2 * 0.16; });
}
for (const bar of [1, 5, 9]) {
  let prev = 0;
  both(bar * 4 * BEAT, 1.6, (t) => { const n = rnd(); const hp = n - prev; prev = n * 0.7; return hp * Math.exp(-t * 2.6) * 0.2; });
}

// Mezcla: bombeo sobre todo menos el bombo no es posible a posteriori, así que se aplica una versión suave global,
// saturación ligera y fundidos de entrada y salida para que el bucle no haga clic.
let peak = 0;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const g = 0.55 + 0.45 * duck(t);
  const fade = Math.min(1, t / 0.02) * Math.min(1, (DUR - t) / 0.9);
  L[i] = Math.tanh(L[i] * g * 1.5) * fade;
  R[i] = Math.tanh(R[i] * g * 1.5) * fade;
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const norm = 0.89 / peak;

const out = Buffer.alloc(44 + N * 4);
out.write('RIFF', 0); out.writeUInt32LE(36 + N * 4, 4); out.write('WAVEfmt ', 8);
out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22);
out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34);
out.write('data', 36); out.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  out.writeInt16LE(Math.round(L[i] * norm * 32767), 44 + i * 4);
  out.writeInt16LE(Math.round(R[i] * norm * 32767), 46 + i * 4);
}
writeFileSync(process.argv[2], out);
console.log(`música: ${DUR}s, pico ${peak.toFixed(2)}`);
