export type Stem = { name: string; role: string; mute: boolean; solo: boolean };

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
  track: { id: string; title: string; artist: string; album: string; kind: string; bpm: number | null; key: string } | null;
  stems: Stem[];
  stemsState: string;
  pack: string;
};

export type Frame = { type: 'frame'; spec: number[]; level: number; beat: number; stems: number[] };

export type Cmd =
  | { cmd: 'toggle' | 'next' | 'prev' | 'shuffle' | 'repeat' | 'stems' }
  | { cmd: 'seek' | 'volume'; to: number }
  | { cmd: 'seekBy'; by: number }
  | { cmd: 'stemMute' | 'stemSolo'; name: string }
  | { cmd: 'pack'; by: number }
  | { cmd: 'frames'; on: boolean };
