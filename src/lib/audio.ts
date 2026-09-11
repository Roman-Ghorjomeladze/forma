// Sound + voice cues. iOS needs the AudioContext to be created/resumed inside a user gesture (see unlock()).
import { getLang } from './i18n.js';

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

// ---- Motivational background music -----------------------------------------
// A short, fully synthesized loop (four-on-the-floor kick, hats, a pulsing bass
// line and a plucked arpeggio over an Am-F-C-G progression) rendered once via
// OfflineAudioContext into an AudioBuffer, then looped on the live AudioContext.
// No audio files/licensing involved - it's generated the same way the cue tones are.

function renderMusicLoop(sampleRate: number): Promise<AudioBuffer> | null {
  const OfflineCtx = (window as unknown as { OfflineAudioContext?: typeof OfflineAudioContext; webkitOfflineAudioContext?: typeof OfflineAudioContext }).OfflineAudioContext
    ?? (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (!OfflineCtx) return null;

  const bpm = 120;
  const beat = 60 / bpm; // seconds per beat
  const step = beat / 4; // 16th note
  const stepsPerBar = 16;
  const bars = 4;
  const totalSteps = bars * stepsPerBar;
  const duration = totalSteps * step; // 8s, loops seamlessly (whole bars, decayed notes)

  const off = new OfflineCtx(2, Math.ceil(duration * sampleRate), sampleRate);

  const kick = (t: number) => {
    const osc = off.createOscillator();
    const g = off.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.15);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    osc.connect(g).connect(off.destination);
    osc.start(t); osc.stop(t + 0.25);
  };
  const hat = (t: number, accent: boolean) => {
    const n = Math.floor(off.sampleRate * 0.05);
    const buf = off.createBuffer(1, n, off.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = off.createBufferSource();
    src.buffer = buf;
    const hp = off.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 7000;
    const g = off.createGain();
    g.gain.setValueAtTime(accent ? 0.32 : 0.16, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    src.connect(hp).connect(g).connect(off.destination);
    src.start(t);
  };
  const bassNote = (t: number, freq: number, dur: number) => {
    const osc = off.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    const filt = off.createBiquadFilter();
    filt.type = 'lowpass'; filt.frequency.value = 900;
    const g = off.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.45, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(filt).connect(g).connect(off.destination);
    osc.start(t); osc.stop(t + dur + 0.05);
  };
  const pluck = (t: number, freq: number) => {
    const osc = off.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const g = off.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.18, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(g).connect(off.destination);
    osc.start(t); osc.stop(t + 0.18);
  };

  // Am - F - C - G, one chord per bar - a common, upbeat/"epic" progression.
  const chords = [
    { root: 220.00 },   // A3 (Am)
    { root: 174.61, maj: true }, // F3
    { root: 130.81, maj: true }, // C3
    { root: 196.00, maj: true }, // G3
  ];

  for (let bar = 0; bar < bars; bar++) {
    const c = chords[bar % chords.length];
    const third = c.root * (c.maj ? 1.25 : 1.2);
    const fifth = c.root * 1.5;
    for (let s = 0; s < stepsPerBar; s++) {
      const t = (bar * stepsPerBar + s) * step;
      if (s % 4 === 0) { kick(t); bassNote(t, c.root, beat * 0.9); }
      if (s % 2 === 0) hat(t, s % 4 === 0);
      if (s % 2 === 1) pluck(t, [c.root, third, fifth][(s >> 1) % 3] * 2);
    }
  }

  return off.startRendering();
}

let musicSource: AudioBufferSourceNode | null = null;
let musicGainNode: GainNode | null = null;
let musicBufferPromise: Promise<AudioBuffer | null> | null = null;

function getMusicBuffer(): Promise<AudioBuffer | null> {
  if (!musicBufferPromise) {
    try {
      const sr = ctx?.sampleRate ?? 44100;
      const p = renderMusicLoop(sr);
      musicBufferPromise = p ? p.catch(() => null) : Promise.resolve(null);
    } catch { musicBufferPromise = Promise.resolve(null); }
  }
  return musicBufferPromise;
}

// ---- Custom playlist (user-uploaded mp3s) -----------------------------------
// Plays through a plain <audio> element instead of the AudioContext graph - far
// lighter than decoding whole songs into an AudioBuffer, and just as capable of
// looping a single track or advancing through several via the `ended` event.
let customAudio: HTMLAudioElement | null = null;
let customUrls: string[] = [];
let customIndex = 0;

function playCustomAt(i: number) {
  if (!customAudio || customUrls.length === 0) return;
  customIndex = ((i % customUrls.length) + customUrls.length) % customUrls.length;
  customAudio.src = customUrls[customIndex];
  customAudio.play().catch(() => { /* autoplay may be blocked; startMusic() is always called from a user gesture though */ });
}

/** Starts the background music. Pass a playlist of object URLs (uploaded tracks) to play those
 *  instead of the built-in synthesized loop - looping a single track, or advancing through several. */
export async function startMusic(playlist?: string[]) {
  stopMusic();
  if (playlist && playlist.length > 0) {
    customUrls = playlist;
    customAudio = new Audio();
    customAudio.volume = 0.55;
    customAudio.loop = playlist.length === 1;
    customAudio.addEventListener('ended', () => playCustomAt(customIndex + 1));
    playCustomAt(0);
    return;
  }
  if (!ctx) return;
  const buffer = await getMusicBuffer();
  if (!buffer || !ctx || musicSource) return; // guard against races (stopMusic/quit during await)
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const g = ctx.createGain();
  g.gain.value = 0.3;
  src.connect(g).connect(ctx.destination);
  src.start(0);
  musicSource = src;
  musicGainNode = g;
}

export function stopMusic() {
  try { musicSource?.stop(); } catch { /* ignore */ }
  try { musicSource?.disconnect(); } catch { /* ignore */ }
  try { musicGainNode?.disconnect(); } catch { /* ignore */ }
  musicSource = null;
  musicGainNode = null;
  if (customAudio) { try { customAudio.pause(); } catch { /* ignore */ } customAudio.src = ''; }
  customAudio = null;
  customUrls = [];
}

export function isMusicPlaying(): boolean { return !!musicSource || (!!customAudio && !customAudio.paused); }

let voiceEnabled = true;
export function setVoiceEnabled(v: boolean) { voiceEnabled = v; }

export function speak(text: string, { interrupt = true, rate = 1.05 }: { interrupt?: boolean; rate?: number } = {}) {
  if (!voiceEnabled) return;
  try {
    if (!('speechSynthesis' in window)) return;
    if (interrupt) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    // iOS/Safari falls back to a default system voice if no Georgian voice is installed —
    // the cue still plays (just pronounced with an English voice), it never throws.
    u.lang = getLang() === 'ka' ? 'ka-GE' : 'en-US';
    speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

export function stopSpeaking() {
  try { speechSynthesis.cancel(); } catch { /* ignore */ }
}
