// Sound + voice cues. iOS needs the AudioContext to be created/resumed inside a user gesture (see unlock()).
let ctx: AudioContext | null = null;

export function unlockAudio() {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume();
    // play a silent buffer to fully unlock on iOS
    const buf = ctx.createBuffer(1, 1, 22050);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start(0);
  } catch { /* ignore */ }
  try { speechSynthesis.getVoices(); } catch { /* ignore */ }
}

function tone(freq: number, ms: number, when = 0, gain = 0.35, type: OscillatorType = 'sine') {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ctx.currentTime + when;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + ms / 1000);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + ms / 1000 + 0.05);
}

export const sounds = {
  tick() { tone(880, 120); },
  go() { tone(1320, 160); tone(1760, 260, 0.14); },
  rest() { tone(660, 200); tone(440, 260, 0.18); },
  done() { tone(880, 150); tone(1100, 150, 0.16); tone(1320, 150, 0.32); tone(1760, 400, 0.48); },
  halfway() { tone(990, 90); },
};

let voiceEnabled = true;
export function setVoiceEnabled(v: boolean) { voiceEnabled = v; }

export function speak(text: string, { interrupt = true, rate = 1.05 }: { interrupt?: boolean; rate?: number } = {}) {
  if (!voiceEnabled) return;
  try {
    if (!('speechSynthesis' in window)) return;
    if (interrupt) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.lang = 'en-US';
    speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

export function stopSpeaking() {
  try { speechSynthesis.cancel(); } catch { /* ignore */ }
}
