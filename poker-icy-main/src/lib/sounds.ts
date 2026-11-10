type SoundName = 'deal' | 'chip' | 'fold' | 'check' | 'call' | 'raise' | 'win' | 'lose' | 'turn' | 'tick';

let ctx: AudioContext | null = null;
let enabled = true;
let lastPlay: Record<string, number> = {};

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

export function isSoundEnabled(): boolean {
  return enabled;
}

function tone(freq: number, duration: number, type: OscillatorType, gain: number, delay = 0): void {
  const ac = getCtx();
  if (!ac || !enabled) return;
  const now = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const vol = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  vol.gain.setValueAtTime(0, now);
  vol.gain.linearRampToValueAtTime(gain, now + 0.005);
  vol.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(vol);
  vol.connect(ac.destination);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}

function noise(duration: number, gain: number, filterFreq: number, delay = 0): void {
  const ac = getCtx();
  if (!ac || !enabled) return;
  const now = ac.currentTime + delay;
  const bufferSize = Math.floor(ac.sampleRate * duration);
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFreq, now);
  const vol = ac.createGain();
  vol.gain.setValueAtTime(gain, now);
  vol.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  src.connect(filter);
  filter.connect(vol);
  vol.connect(ac.destination);
  src.start(now);
}

function throttle(name: string, ms: number): boolean {
  const now = Date.now();
  if (lastPlay[name] && now - lastPlay[name] < ms) return false;
  lastPlay[name] = now;
  return true;
}

export function playSound(sound: SoundName): void {
  switch (sound) {
    case 'deal':
      if (!throttle('deal', 80)) return;
      noise(0.08, 0.06, 3000);
      tone(900, 0.04, 'sine', 0.03);
      break;
    case 'chip':
      if (!throttle('chip', 60)) return;
      noise(0.05, 0.08, 5000);
      tone(1200, 0.03, 'square', 0.02);
      break;
    case 'fold':
      tone(300, 0.12, 'sawtooth', 0.04);
      tone(200, 0.15, 'sawtooth', 0.03, 0.04);
      break;
    case 'check':
      tone(500, 0.06, 'sine', 0.04);
      tone(700, 0.06, 'sine', 0.03, 0.04);
      break;
    case 'call':
      tone(600, 0.08, 'triangle', 0.05);
      noise(0.04, 0.04, 4000, 0.02);
      break;
    case 'raise':
      tone(400, 0.05, 'square', 0.04);
      tone(600, 0.05, 'square', 0.04, 0.03);
      tone(800, 0.08, 'square', 0.05, 0.06);
      noise(0.06, 0.05, 5000, 0.04);
      break;
    case 'win':
      tone(523, 0.12, 'sine', 0.06);
      tone(659, 0.12, 'sine', 0.06, 0.1);
      tone(784, 0.12, 'sine', 0.06, 0.2);
      tone(1047, 0.25, 'sine', 0.08, 0.3);
      break;
    case 'lose':
      tone(400, 0.15, 'sawtooth', 0.04);
      tone(300, 0.15, 'sawtooth', 0.04, 0.1);
      tone(200, 0.3, 'sawtooth', 0.03, 0.2);
      break;
    case 'turn':
      if (!throttle('turn', 500)) return;
      tone(800, 0.08, 'sine', 0.04);
      tone(1000, 0.06, 'sine', 0.03, 0.05);
      break;
    case 'tick':
      tone(1200, 0.02, 'square', 0.02);
      break;
  }
}

export function primeAudio(): void {
  const ac = getCtx();
  if (ac && ac.state === 'suspended') void ac.resume();
}
