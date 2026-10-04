// Text-to-speech for language learning: picks the best installed voice for a language tag
// (iOS ships e.g. "Milena" for ru-RU), strips stress marks, and never throws.
let voices: SpeechSynthesisVoice[] = [];
function loadVoices() {
  try { voices = speechSynthesis.getVoices(); } catch { voices = []; }
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  loadVoices();
  speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

function pickVoice(tag: string): SpeechSynthesisVoice | undefined {
  if (!voices.length) loadVoices();
  const lang = tag.toLowerCase();
  const prefix = lang.split('-')[0];
  const matches = voices.filter((v) => v.lang.toLowerCase().replace('_', '-') === lang);
  const loose = matches.length ? matches : voices.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  const score = (v: SpeechSynthesisVoice) => (/premium|enhanced|natural|neural/i.test(v.name) ? 2 : 0) + (v.localService ? 1 : 0);
  return [...loose].sort((a, b) => score(b) - score(a))[0];
}

export function hasVoice(tag: string): boolean {
  if (!('speechSynthesis' in window)) return false;
  if (!voices.length) loadVoices();
  return !voices.length || !!pickVoice(tag); // unknown list (still loading) → optimistic
}

export function say(text: string, tag: string, rate = 1, onEnd?: () => void): void {
  try {
    if (!('speechSynthesis' in window) || !text) { onEnd?.(); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/́/g, ''));
    u.lang = tag || 'en-US';
    const v = pickVoice(u.lang);
    if (v) u.voice = v;
    u.rate = rate;
    if (onEnd) { u.onend = () => onEnd(); u.onerror = () => onEnd(); }
    speechSynthesis.speak(u);
  } catch { onEnd?.(); }
}

export function hush(): void {
  try { speechSynthesis.cancel(); } catch { /* ignore */ }
}
