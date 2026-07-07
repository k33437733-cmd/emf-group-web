let _audioCtx: AudioContext | null = null;
let _lastPlayedAt = 0;
const DEBOUNCE_MS = 1200;

function getAudioContext(): AudioContext | null {
  if (_audioCtx) return _audioCtx;
  try {
    _audioCtx = new AudioContext();
    return _audioCtx;
  } catch {
    return null;
  }
}

export function playNotificationSound(): void {
  const now = Date.now();
  if (now - _lastPlayedAt < DEBOUNCE_MS) return;
  _lastPlayedAt = now;

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 660;
    osc.type = 'sine';
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.start(t);
    osc.stop(t + 0.18);
    if (ctx.state === 'suspended') ctx.resume();
  } catch {
    /* silent */
  }
}
