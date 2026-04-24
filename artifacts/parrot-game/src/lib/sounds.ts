let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function resume() {
  const c = getCtx();
  if (c.state === "suspended") c.resume();
  return c;
}

function playTone(
  frequency: number,
  type: OscillatorType,
  duration: number,
  gainPeak: number,
  startDelay = 0,
  pitchEnd?: number
) {
  const c = resume();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, c.currentTime + startDelay);
  if (pitchEnd !== undefined) {
    osc.frequency.linearRampToValueAtTime(pitchEnd, c.currentTime + startDelay + duration);
  }

  gain.gain.setValueAtTime(0, c.currentTime + startDelay);
  gain.gain.linearRampToValueAtTime(gainPeak, c.currentTime + startDelay + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startDelay + duration);

  osc.start(c.currentTime + startDelay);
  osc.stop(c.currentTime + startDelay + duration + 0.01);
}

export function playCorrect() {
  playTone(523, "sine", 0.1, 0.3);
  playTone(659, "sine", 0.15, 0.3, 0.08);
  playTone(784, "sine", 0.2, 0.35, 0.18);
}

export function playWrong() {
  playTone(200, "sawtooth", 0.08, 0.25);
  playTone(150, "sawtooth", 0.15, 0.25, 0.07);
}

export function playCountdownBeep(isGo = false) {
  if (isGo) {
    playTone(880, "sine", 0.25, 0.4);
    playTone(1100, "sine", 0.3, 0.4, 0.15);
  } else {
    playTone(440, "sine", 0.15, 0.3);
  }
}

export function playHit() {
  const c = resume();

  const bufferSize = c.sampleRate * 0.35;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize) ** 2;
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;

  const gain = c.createGain();
  gain.gain.setValueAtTime(0.6, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.35);

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 400;

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(c.destination);
  noise.start();

  playTone(80, "sawtooth", 0.3, 0.5, 0, 40);
}

export function playCollect() {
  playTone(880, "sine", 0.05, 0.2);
  playTone(1320, "sine", 0.1, 0.18, 0.04);
}

export function playGameStart() {
  playTone(330, "square", 0.08, 0.2);
  playTone(440, "square", 0.08, 0.2, 0.1);
  playTone(550, "square", 0.08, 0.2, 0.2);
  playTone(660, "square", 0.12, 0.25, 0.3);
}

export function initAudio() {
  getCtx();
}
