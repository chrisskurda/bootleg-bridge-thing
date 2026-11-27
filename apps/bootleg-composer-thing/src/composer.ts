// what bootleg Composer sends (its companion module) and what the device sends back; docs/COMPANION.md in
// bootleg-composer is the protocol
export const PROTOCOL = 1;

export type Riff = { name: string; i: number; n: number; len: number; notes: number };

export type LooperState = {
  state: 'empty' | 'recording' | 'overdubbing' | 'playing' | 'stopped';
  layers: number;
  beats: number;
  div: number;
  fb: number;
  mix: number;
};

export type ComposerState = {
  type: 'state';
  v: number;
  song: string;
  bpm: number;
  playing: boolean;
  looping: boolean;
  armed: boolean;
  octave: number;
  start: number;
  songSteps: number;
  riff: Riff | null;
  sound: string;
  drums: boolean;
  bends: boolean;
  pads: (string | null)[];
  looper: LooperState;
};

export type Cmd =
  | { cmd: 'hello' | 'loop' | 'play' | 'stop' | 'undo' }
  | { cmd: 'on'; id: number; pad: number; vel: number }
  | { cmd: 'on'; id: number; key: number; vel: number }
  | { cmd: 'off'; id: number }
  | { cmd: 'bend'; id: number; semis: number }
  | { cmd: 'arm'; on: boolean }
  | { cmd: 'octave' | 'riff' | 'scrub'; by: number }
  | { cmd: 'wave'; points: number[]; name?: string }
  | { cmd: 'looprec' | 'loopundo' | 'loopclear' | 'loopkeep' }
  | { cmd: 'loopplay'; on: boolean }
  | { cmd: 'loopfx'; div?: number; fb?: number; mix?: number };

export type Send = (c: Cmd) => void;

// every touch gets its own note id, so two fingers on one key are two notes
let nextId = 1;
export const noteId = () => nextId++;

// notes held right now and how far each is bent: a finger slide and the knob add up
export class Holds {
  private notes = new Map<number, number>();
  private wheel = 0;
  constructor(private send: Send) {}

  get any() {
    return this.notes.size > 0;
  }

  down(id: number) {
    this.notes.set(id, 0);
    if (this.wheel) this.send({ cmd: 'bend', id, semis: this.wheel });
  }

  slide(id: number, semis: number) {
    if (!this.notes.has(id)) return;
    this.notes.set(id, semis);
    this.send({ cmd: 'bend', id, semis: semis + this.wheel });
  }

  up(id: number) {
    if (!this.notes.delete(id)) return;
    this.send({ cmd: 'off', id });
    if (!this.notes.size) this.wheel = 0;
  }

  knob(semis: number) {
    this.wheel = Math.max(-12, Math.min(12, this.wheel + semis));
    for (const [id, slide] of this.notes) this.send({ cmd: 'bend', id, semis: slide + this.wheel });
  }

  releaseAll() {
    for (const id of [...this.notes.keys()]) this.up(id);
  }
}
