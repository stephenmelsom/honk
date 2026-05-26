import { create } from 'zustand';
import { parseImage } from '../image/parse.ts';
import { serializeImage } from '../image/serialize.ts';
import { emptyImageBuffer } from '../image/synthetic.ts';
import type { Channel, RadioImage } from '../image/schema.ts';

export type ConnectionState =
  | { kind: 'idle' }
  | { kind: 'reading'; progress: number }
  | { kind: 'writing'; progress: number }
  | { kind: 'error'; message: string };

interface HonkState {
  image: RadioImage;
  selectedChannel: number;
  dirty: boolean;
  connection: ConnectionState;
  imageSource: 'blank' | 'file' | 'radio';

  loadImage: (bytes: Uint8Array, source: 'file' | 'radio') => void;
  newBlankImage: () => void;
  selectChannel: (index: number) => void;
  updateChannel: (index: number, channel: Channel | null) => void;
  exportImage: () => Uint8Array;
  setConnection: (state: ConnectionState) => void;
}

export const useHonk = create<HonkState>((set, get) => ({
  image: parseImage(emptyImageBuffer()),
  selectedChannel: 0,
  dirty: false,
  connection: { kind: 'idle' },
  imageSource: 'blank',

  loadImage: (bytes, source) => {
    const image = parseImage(bytes);
    set({ image, dirty: false, imageSource: source, selectedChannel: 0 });
  },

  newBlankImage: () => {
    set({
      image: parseImage(emptyImageBuffer()),
      dirty: false,
      imageSource: 'blank',
      selectedChannel: 0,
    });
  },

  selectChannel: (index) => set({ selectedChannel: index }),

  updateChannel: (index, channel) => {
    const img = get().image;
    const channels = img.channels.slice();
    channels[index] = channel;
    set({ image: { ...img, channels }, dirty: true });
  },

  exportImage: () => serializeImage(get().image),

  setConnection: (state) => set({ connection: state }),
}));
