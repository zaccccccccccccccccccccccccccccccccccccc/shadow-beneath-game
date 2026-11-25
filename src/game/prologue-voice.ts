export type PrologueSpeaker = 'rong-jie' | 'player';

// Casting preferences, not claims about an engine's age, gender or neural quality.
// Web Speech has no standard gender metadata. Match known voice names when present,
// otherwise use distinct voice identities. Never simulate a second actor with pitch.
const characterProfiles = {
  'rong-jie': { preferred: /huihui|yaoyao|xiaoxiao|xiaoyi|hsiaochen|hanhan|tracy|tingting|sinji|meijia|曉曉|晓晓|慧慧|婷婷/i, rate: 0.96 },
  player: { preferred: /kangkang|yunxi|yunjian|yunyang|danny|zhiwei|康康|云希|雲希|志偉|志伟/i, rate: 1.03 },
} as const;

/** Select only voices actually exposed by this browser. One voice stays one voice. */
export function selectPrologueVoices(voices: readonly SpeechSynthesisVoice[]): Partial<Record<PrologueSpeaker, SpeechSynthesisVoice>> {
  const identity = (voice: SpeechSynthesisVoice) => voice.voiceURI || `${voice.name}:${voice.lang}`;
  const unique = voices.filter((voice, index) => /^zh(?:[-_]|$)|^yue(?:[-_]|$)/i.test(voice.lang)
    && voices.findIndex(other => identity(other) === identity(voice)) === index);
  // Keep both characters in Mandarin when possible; Cantonese is a separate dialect.
  const mandarin = unique.filter(voice => !/^(?:yue|zh[-_](?:HK|MO))/i.test(voice.lang));
  const pool = mandarin.length >= 2 ? mandarin : unique;
  const rank = (speaker: PrologueSpeaker, voice: SpeechSynthesisVoice) =>
    (voice.localService === false ? 0 : 1000)
    + (characterProfiles[speaker].preferred.test(voice.name) ? 100 : 0)
    - (characterProfiles[speaker === 'player' ? 'rong-jie' : 'player'].preferred.test(voice.name) ? 50 : 0)
    + (/^zh[-_]TW$/i.test(voice.lang) ? 10 : 0);
  const ordered = (speaker: PrologueSpeaker) => [...pool].sort((a, b) =>
    rank(speaker, b) - rank(speaker, a) || identity(a).localeCompare(identity(b)));
  const mentor = ordered('rong-jie')[0];
  if (!mentor) return {};
  const player = ordered('player').find(voice => identity(voice) !== identity(mentor)) ?? mentor;
  return { 'rong-jie': mentor, player };
}

export interface PrologueSpeech {
  speak(text: string, end: () => void, error: () => void, speaker?: PrologueSpeaker, started?: () => void): void;
  cancel(): void;
}

/** Resolve voices lazily: browsers often populate getVoices only after a gesture. */
export function createBrowserPrologueSpeech(): PrologueSpeech | undefined {
  if (typeof window === 'undefined' || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
  const synth = window.speechSynthesis;
  let active: SpeechSynthesisUtterance | undefined;
  return {
    speak(text, end, error, speaker = 'rong-jie', started): void {
      const voice = selectPrologueVoices(synth.getVoices())[speaker];
      // Do not let an English default voice read Chinese, or invent a missing voice.
      if (!voice) { error(); return; }
      const utterance = new window.SpeechSynthesisUtterance(text);
      active = utterance; // Retain it until cancellation/completion (including on mobile).
      utterance.lang = voice.lang;
      utterance.voice = voice;
      utterance.rate = characterProfiles[speaker].rate;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.onend = end;
      utterance.onstart = () => started?.();
      utterance.onerror = error;
      synth.resume();
      synth.speak(utterance);
    },
    cancel(): void {
      if (!active) return;
      active.onend = null;
      active.onstart = null;
      active.onerror = null;
      active = undefined;
      synth.cancel();
    },
  };
}

/** Reading time grows with the copy; long cards must never use the old 4.2s cap. */
export function prologueReadingMs(text: string): number {
  return Math.max(6000, Array.from(text.replace(/\s/g, '')).length * 320 + 1800);
}

/** No browser or Phaser dependencies: each card owns one cancellable completion. */
export function createProloguePlayback(options: { advance: () => void; speech?: PrologueSpeech }) {
  let generation = 0;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let speaking = false;

  function stop(): void {
    generation++;
    clearTimeout(timer);
    timer = undefined;
    if (speaking) {
      speaking = false;
      // Invalidate first: some browsers dispatch interrupted/end synchronously.
      try { options.speech?.cancel(); } catch { /* Text remains usable. */ }
    }
  }

  function play(text: string, voice: boolean, speaker?: PrologueSpeaker): void {
    if (disposed) return;
    stop();
    const current = generation;
    const readingMs = prologueReadingMs(text);
    const finish = () => {
      if (disposed || current !== generation) return;
      stop();
      options.advance();
    };
    const fallback = () => {
      if (disposed || current !== generation) return;
      clearTimeout(timer);
      timer = setTimeout(finish, readingMs);
    };
    if (!voice || !options.speech) { fallback(); return; }
    // Covers blocked startup and engines that never emit end/error. Allow slow speech.
    timer = setTimeout(finish, Math.max(15000, readingMs * 2));
    speaking = true;
    let speechSettled = false;
    const end = () => {
      if (speechSettled) return;
      speechSettled = true;
      finish();
    };
    const error = () => {
      if (speechSettled) return;
      speechSettled = true;
      fallback();
    };
    try { options.speech.speak(text, end, error, speaker); } catch { error(); }
  }

  return {
    play,
    stop,
    dispose(): void { if (!disposed) { disposed = true; stop(); } },
  };
}
