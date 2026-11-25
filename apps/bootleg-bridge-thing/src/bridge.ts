export type Stem = { name: string; role: string; mute: boolean; solo: boolean };

export type Section = { name: string; start: number; end: number };

export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  kind: string;
  bpm: number | null;
  key: string;
  year: string;
  sections: Section[];
};

export type BootlegState = {
  type: 'state';
  playing: boolean;
  pos: number;
  dur: number;
  volume: number;
  shuffle: boolean;
  repeat: 'off' | 'all' | 'one';
  index: number;
  count: number;
  track: Track | null;
  stems: Stem[];
  stemsState: string;
  pack: string;
  packId: string;
};

// one analysed audio frame, compacted by bootleg's bridge: base64 bytes for the bands, bytes for the scalars
export type WireStem = { n: string; r: string; l: number; b: number; s: string; g: number; m: 0 | 1; a: 0 | 1; lb: string; k: string };
export type WireFrame = { type: 'frame'; t: number; s: string; w: string; f: number[]; stems: WireStem[] };

export type Cmd =
  | { cmd: 'toggle' | 'next' | 'prev' | 'shuffle' | 'repeat' | 'stems' }
  | { cmd: 'seek' | 'volume'; to: number }
  | { cmd: 'seekBy'; by: number }
  | { cmd: 'stemMute' | 'stemSolo'; name: string }
  | { cmd: 'frames'; on: boolean };
