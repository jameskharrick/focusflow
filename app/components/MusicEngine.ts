import * as Tone from "tone";
import type { MusicStyle } from "@/lib/types";

interface MusicProfile {
  bpm: number;
  reverb: number;
  delay: number;
  notes: string[];
  chordIntervalMs: number;
  padAttack: number;
  padRelease: number;
}

const PROFILES: Record<MusicStyle, MusicProfile> = {
  "Lo-fi": {
    bpm: 75, reverb: 0.5, delay: 0.2,
    notes: ["C3", "Eb3", "G3", "Bb3", "F3", "Ab3", "C4", "Eb4"],
    chordIntervalMs: 2400, padAttack: 0.4, padRelease: 1.8,
  },
  "Ambient": {
    bpm: 60, reverb: 0.85, delay: 0.4,
    notes: ["C3", "E3", "G3", "B3", "D4", "F#4", "A4"],
    chordIntervalMs: 4000, padAttack: 1.5, padRelease: 4.0,
  },
  "Classical": {
    bpm: 80, reverb: 0.6, delay: 0.1,
    notes: ["C4", "E4", "G4", "A4", "F4", "D4", "B3", "G3"],
    chordIntervalMs: 1800, padAttack: 0.1, padRelease: 1.2,
  },
  "Jazz": {
    bpm: 100, reverb: 0.35, delay: 0.15,
    notes: ["D3", "F3", "A3", "C4", "E3", "G3", "B3", "D4"],
    chordIntervalMs: 1600, padAttack: 0.15, padRelease: 0.9,
  },
  "Nature Sounds": {
    bpm: 55, reverb: 0.9, delay: 0.5,
    notes: ["G3", "A3", "C4", "D4", "E4", "G4"],
    chordIntervalMs: 5000, padAttack: 2.0, padRelease: 5.0,
  },
  "Electronic Focus": {
    bpm: 110, reverb: 0.25, delay: 0.3,
    notes: ["A2", "E3", "A3", "C#4", "D3", "F#3", "B3"],
    chordIntervalMs: 1200, padAttack: 0.05, padRelease: 0.8,
  },
  "Epic/Cinematic": {
    bpm: 90, reverb: 0.7, delay: 0.25,
    notes: ["C3", "G3", "C4", "E4", "F3", "C4", "F4", "A4"],
    chordIntervalMs: 3000, padAttack: 0.8, padRelease: 3.5,
  },
  "Nightcore": {
    bpm: 160, reverb: 0.3, delay: 0.15,
    notes: ["C4", "E4", "G4", "B4", "D5", "F#4", "A4", "C5"],
    chordIntervalMs: 800, padAttack: 0.05, padRelease: 0.5,
  },
};

export class MusicEngine {
  private synth: Tone.PolySynth | null = null;
  private reverb: Tone.Reverb | null = null;
  private delay: Tone.FeedbackDelay | null = null;
  private loop: ReturnType<typeof setInterval> | null = null;
  private noteIndex = 0;
  private profile: MusicProfile;
  private started = false;

  constructor(style: MusicStyle) {
    this.profile = PROFILES[style];
  }

  async start() {
    if (this.started) return;
    await Tone.start();
    Tone.getTransport().bpm.value = this.profile.bpm;

    const p = this.profile;

    this.reverb = new Tone.Reverb({ decay: p.reverb * 8 + 1, wet: p.reverb }).toDestination();
    await this.reverb.ready;

    this.delay = new Tone.FeedbackDelay({
      delayTime: `${Math.round(60000 / p.bpm / 2)}n`,
      feedback: 0.3,
      wet: p.delay,
    }).connect(this.reverb);

    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: p.padAttack, decay: 0.2, sustain: 0.8, release: p.padRelease },
      volume: -14,
    }).connect(this.delay);

    this.started = true;
    this.scheduleNext();
  }

  private scheduleNext() {
    const p = this.profile;

    const playChord = () => {
      if (!this.synth) return;
      const root = p.notes[this.noteIndex % p.notes.length];
      const third = p.notes[(this.noteIndex + 2) % p.notes.length];
      const fifth = p.notes[(this.noteIndex + 4) % p.notes.length];

      const duration = (p.chordIntervalMs / 1000 * 0.85).toString();
      this.synth.triggerAttackRelease([root, third, fifth], duration);
      this.noteIndex = (this.noteIndex + 1) % p.notes.length;
    };

    playChord();
    this.loop = setInterval(playChord, p.chordIntervalMs);
  }

  stop() {
    if (this.loop) clearInterval(this.loop);
    this.synth?.releaseAll();
    setTimeout(() => {
      this.synth?.dispose();
      this.delay?.dispose();
      this.reverb?.dispose();
      this.synth = null;
      this.delay = null;
      this.reverb = null;
    }, 2000);
    this.started = false;
  }
}
