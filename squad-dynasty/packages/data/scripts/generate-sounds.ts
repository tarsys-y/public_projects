// Gera os efeitos sonoros do jogo como WAVs sintetizados (sem asset externo —
// o proxy deste ambiente bloqueia bibliotecas de som; os arquivos são
// commitados e podem ser substituídos por sons "de verdade" via patch).
// Saída: apps/mobile/assets/sounds/*.wav (mono, 22.05kHz, 16-bit PCM).
import * as fs from 'node:fs';
import * as path from 'node:path';

const SAMPLE_RATE = 22050;
const OUT_DIR = path.resolve(__dirname, '..', '..', '..', 'apps', 'mobile', 'assets', 'sounds');

function writeWav(name: string, samples: Float32Array): void {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i]! * 32767))), 44 + i * 2);
  }
  fs.writeFileSync(path.join(OUT_DIR, name), buffer);
  console.log(`  ${name} (${(buffer.length / 1024).toFixed(1)} KB)`);
}

const seconds = (s: number) => Math.floor(s * SAMPLE_RATE);

/** Envelope ADSR simplificado. */
function env(i: number, total: number, attack = 0.01, release = 0.3): number {
  const t = i / SAMPLE_RATE;
  const totalT = total / SAMPLE_RATE;
  if (t < attack) return t / attack;
  const releaseStart = totalT - release;
  if (t > releaseStart) return Math.max(0, 1 - (t - releaseStart) / release);
  return 1;
}

function tone(freqs: number[], duration: number, options: { vibrato?: number; gain?: number } = {}): Float32Array {
  const n = seconds(duration);
  const out = new Float32Array(n);
  const gain = (options.gain ?? 0.8) / freqs.length;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let v = 0;
    for (const f of freqs) {
      const vib = options.vibrato ? Math.sin(2 * Math.PI * 6 * t) * options.vibrato : 0;
      v += Math.sin(2 * Math.PI * (f + vib) * t) * gain;
    }
    out[i] = v * env(i, n);
  }
  return out;
}

function concat(...parts: Float32Array[]): Float32Array {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/** Ruído filtrado (torcida/chiado). */
function noise(duration: number, gain = 0.4, lowpass = 0.15): Float32Array {
  const n = seconds(duration);
  const out = new Float32Array(n);
  let last = 0;
  let x = 1234567;
  const rand = () => {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    return x / 0x7fffffff - 0.5;
  };
  for (let i = 0; i < n; i++) {
    last = last + lowpass * (rand() * 2 - last);
    out[i] = last * gain * env(i, n, 0.05, duration * 0.5);
  }
  return out;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
console.log('Gerando sons em', OUT_DIR);

// apito de início/fim (duas notas agudas curtas)
writeWav('whistle.wav', concat(tone([2200, 2210], 0.18, { vibrato: 30 }), new Float32Array(seconds(0.06)), tone([2200, 2215], 0.3, { vibrato: 30 })));

// gol: acorde ascendente + "torcida" de ruído
{
  const chord = concat(tone([523.25], 0.12), tone([659.25], 0.12), tone([783.99], 0.14), tone([1046.5, 523.25], 0.5, { gain: 0.9 }));
  const crowd = noise(0.9, 0.5, 0.08);
  const n = Math.max(chord.length, crowd.length);
  const mix = new Float32Array(n);
  for (let i = 0; i < n; i++) mix[i] = (chord[i] ?? 0) * 0.7 + (crowd[i] ?? 0) * 0.6;
  writeWav('goal.wav', mix);
}

// virada de carta (tick curto)
writeWav('card-flip.wav', tone([880, 1320], 0.07, { gain: 0.5 }));

// sting de carta rara (arpejo brilhante)
writeWav('rare-reveal.wav', concat(tone([659.25], 0.1), tone([830.61], 0.1), tone([987.77], 0.1), tone([1318.5, 659.25], 0.55, { gain: 0.9 })));

// vinheta de vitória (cadência)
writeWav('victory.wav', concat(tone([523.25, 659.25], 0.18), tone([587.33, 739.99], 0.18), tone([659.25, 783.99], 0.2), tone([783.99, 987.77, 1046.5], 0.7, { gain: 0.9 })));

console.log('✓ sons gerados');
