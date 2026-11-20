import type { RegionId } from './world-data';

export type MusicZone = 'tutorial' | RegionId;

type MusicProfile = {
  tempo: number;
  root: number;
  scale: number[];
  lead: Array<number | null>;
  bass: Array<number | null>;
  wave: OscillatorType;
  cutoff: number;
  attack: number;
  release: number;
  gain: number;
  echo: number;
};

const profiles: Record<MusicZone, MusicProfile> = {
  tutorial: {
    tempo: 72, root: 62, scale: [0, 2, 4, 7, 9],
    lead: [0, 2, 4, 3, 2, 0, null, 4], bass: [0, null, null, 3],
    wave: 'sine', cutoff: 1800, attack: 0.08, release: 1.2, gain: 0.045, echo: 0.26,
  },
  hq: {
    tempo: 84, root: 57, scale: [0, 2, 3, 5, 7, 8, 10],
    lead: [0, 3, 4, 2, 5, 4, 3, null], bass: [0, null, 3, null],
    wave: 'triangle', cutoff: 1400, attack: 0.04, release: 0.85, gain: 0.05, echo: 0.18,
  },
  oldTown: {
    tempo: 76, root: 60, scale: [0, 3, 5, 7, 10],
    lead: [0, 2, 4, 3, 2, null, 4, null], bass: [0, null, null, 4],
    wave: 'sine', cutoff: 1250, attack: 0.12, release: 1.4, gain: 0.048, echo: 0.31,
  },
  campus: {
    tempo: 96, root: 64, scale: [0, 2, 4, 5, 7, 9, 11],
    lead: [0, 2, 4, 6, 4, 2, 1, null], bass: [0, 4, null, 2],
    wave: 'square', cutoff: 2100, attack: 0.015, release: 0.46, gain: 0.031, echo: 0.13,
  },
  harbor: {
    tempo: 68, root: 55, scale: [0, 2, 3, 5, 7, 9, 10],
    lead: [0, 3, 5, 4, 3, 2, null, null], bass: [0, null, 2, null],
    wave: 'sawtooth', cutoff: 920, attack: 0.18, release: 1.8, gain: 0.028, echo: 0.36,
  },
  hill: {
    tempo: 64, root: 59, scale: [0, 2, 4, 6, 7, 9, 11],
    lead: [0, 4, 2, 6, 4, null, 2, null], bass: [0, null, null, 4],
    wave: 'sine', cutoff: 2600, attack: 0.06, release: 2.0, gain: 0.04, echo: 0.42,
  },
};

function midiToHz(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

class DistrictMusic {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private echo: GainNode | null = null;
  private feedback: GainNode | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextNote = 0;
  private step = 0;
  private zone: MusicZone = 'tutorial';
  private enabled = true;

  constructor() {
    try {
      this.enabled = localStorage.getItem('under-shadow-music') !== 'off';
    } catch {
      this.enabled = true;
    }
  }

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.context) {
      const Ctor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      this.context = new Ctor();
      this.master = this.context.createGain();
      this.master.gain.value = this.enabled ? 0.55 : 0;
      const delay = this.context.createDelay(1.2);
      delay.delayTime.value = 0.38;
      this.echo = this.context.createGain();
      this.echo.gain.value = 0.22;
      const feedback = this.context.createGain();
      feedback.gain.value = profiles[this.zone].echo;
      this.feedback = feedback;
      delay.connect(this.echo);
      this.echo.connect(feedback);
      feedback.connect(delay);
      this.master.connect(this.context.destination);
      this.echo.connect(this.master);
      this.nextNote = this.context.currentTime + 0.08;
      this.timer = setInterval(() => this.schedule(), 120);
    }
    if (this.context.state === 'suspended') void this.context.resume();
    return this.context;
  }

  unlock(): void {
    this.ensure();
  }

  setZone(zone: MusicZone): void {
    if (this.zone === zone) {
      this.ensure();
      return;
    }
    this.zone = zone;
    const context = this.ensure();
    if (!context || !this.master) return;
    const now = context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0.0001, now + 0.22);
    window.setTimeout(() => {
      if (!this.context || !this.master) return;
      this.master.gain.setValueAtTime(0.0001, this.context.currentTime);
      this.master.gain.linearRampToValueAtTime(this.enabled ? 0.55 : 0.0001, this.context.currentTime + 0.5);
      this.feedback?.gain.setTargetAtTime(profiles[this.zone].echo, this.context.currentTime, 0.18);
      this.step = 0;
    }, 240);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    try { localStorage.setItem('under-shadow-music', enabled ? 'on' : 'off'); } catch { /* Music preference stays session-local. */ }
    const context = this.ensure();
    if (!context || !this.master) return;
    const now = context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.linearRampToValueAtTime(enabled ? 0.55 : 0.0001, now + 0.35);
  }

  isEnabled(): boolean { return this.enabled; }
  currentZone(): MusicZone { return this.zone; }

  private schedule(): void {
    const context = this.context;
    if (!context || !this.master || !this.enabled || context.state !== 'running') return;
    const profile = profiles[this.zone];
    const stepLength = 60 / profile.tempo / 2;
    while (this.nextNote < context.currentTime + 0.34) {
      const at = this.nextNote;
      const beat = this.step % 16;
      if (beat % 2 === 0) {
        const leadIndex = profile.lead[(this.step / 2) % profile.lead.length];
        if (leadIndex !== null) {
          const degree = profile.scale[leadIndex % profile.scale.length];
          this.tone(midiToHz(profile.root + 12 + degree), at, profile.release, profile.gain, profile.wave, profile.cutoff, profile.attack);
        }
      }
      if (beat % 4 === 0) {
        const bassIndex = profile.bass[(this.step / 4) % profile.bass.length];
        if (bassIndex !== null) {
          const degree = profile.scale[bassIndex % profile.scale.length];
          this.tone(midiToHz(profile.root - 12 + degree), at, stepLength * 4.2, profile.gain * 1.22, 'sine', profile.cutoff * 0.55, 0.05);
        }
      }
      if (beat === 0 || beat === 8) {
        const chordRoot = profile.scale[(this.step / 8 | 0) % profile.scale.length];
        [0, 2, 4].forEach((offset, voice) => {
          const degree = profile.scale[(profile.scale.indexOf(chordRoot) + offset) % profile.scale.length];
          this.tone(midiToHz(profile.root + degree), at + voice * 0.012, stepLength * 4.5, profile.gain * 0.42, 'triangle', profile.cutoff * 0.7, 0.25);
        });
      }
      if (this.zone === 'campus' && beat % 2 === 1) this.noise(at, stepLength * 0.7, 0.009);
      if ((this.zone === 'harbor' || this.zone === 'hill') && beat === 15) this.noise(at, stepLength * 3.4, 0.006);
      this.step += 1;
      this.nextNote += stepLength;
    }
  }

  private tone(freq: number, at: number, duration: number, gain: number, wave: OscillatorType, cutoff: number, attack: number): void {
    const context = this.context;
    if (!context || !this.master || !this.echo) return;
    const osc = context.createOscillator();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(freq, at);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, at);
    filter.Q.value = 0.7;
    envelope.gain.setValueAtTime(0.0001, at);
    envelope.gain.linearRampToValueAtTime(gain, at + Math.max(0.015, attack));
    envelope.gain.exponentialRampToValueAtTime(0.0001, at + Math.max(0.2, duration));
    osc.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.master);
    envelope.connect(this.echo);
    osc.start(at);
    osc.stop(at + duration + 0.1);
  }

  private noise(at: number, duration: number, gain: number): void {
    const context = this.context;
    if (!context || !this.master) return;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const envelope = context.createGain();
    source.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.value = 3200;
    envelope.gain.value = gain;
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(this.master);
    source.start(at);
  }
}

let music: DistrictMusic | null = null;
let autoplayInstalled = false;

function manager(): DistrictMusic {
  if (!music) music = new DistrictMusic();
  return music;
}

export function installMusicAutoplay(): void {
  if (autoplayInstalled || typeof window === 'undefined') return;
  autoplayInstalled = true;
  const unlock = () => manager().unlock();
  window.addEventListener('pointerdown', unlock, { once: true, capture: true });
  window.addEventListener('keydown', unlock, { once: true, capture: true });
}

export function setMusicZone(zone: MusicZone): void { manager().setZone(zone); }
export function setMusicEnabled(enabled: boolean): void { manager().setEnabled(enabled); }
export function isMusicEnabled(): boolean { return manager().isEnabled(); }
export function currentMusicZone(): MusicZone { return manager().currentZone(); }
export function toggleMusic(): boolean { const next = !manager().isEnabled(); manager().setEnabled(next); return next; }

export const musicProfiles = profiles;
