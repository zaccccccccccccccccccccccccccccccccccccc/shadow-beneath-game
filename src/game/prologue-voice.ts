export interface PrologueSpeech {
  speak(text: string, end: () => void, error: () => void): void;
  cancel(): void;
}

/** Resolve voices lazily: browsers often populate getVoices only after a gesture. */
export function createBrowserPrologueSpeech(): PrologueSpeech | undefined {
  if (typeof window === 'undefined' || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
  const synth = window.speechSynthesis;
  let active: SpeechSynthesisUtterance | undefined;
  return {
    speak(text, end, error): void {
      const utterance = new window.SpeechSynthesisUtterance(text);
      active = utterance; // Retain it until cancellation/completion (including on mobile).
      const voices = synth.getVoices();
      const voice = voices.find(candidate => /^zh[-_]TW$/i.test(candidate.lang))
        ?? voices.find(candidate => /^zh(?:[-_]|$)/i.test(candidate.lang));
      utterance.lang = voice?.lang ?? 'zh-TW';
      if (voice) utterance.voice = voice;
      utterance.rate = 1;
      utterance.onend = end;
      utterance.onerror = error;
      synth.speak(utterance);
    },
    cancel(): void {
      if (!active) return;
      active.onend = null;
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

  function play(text: string, voice: boolean): void {
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
    try { options.speech.speak(text, end, error); } catch { error(); }
  }

  return {
    play,
    stop,
    dispose(): void { if (!disposed) { disposed = true; stop(); } },
  };
}
