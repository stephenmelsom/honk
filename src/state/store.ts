import { create } from 'zustand';
import { parseImage } from '../image/parse.ts';
import { serializeImage } from '../image/serialize.ts';
import { emptyImageBuffer } from '../image/synthetic.ts';
import type { Channel, RadioImage, RadioSettings } from '../image/schema.ts';
import type { RadioModel } from '../radios/types.ts';
import { DEFAULT_RADIO_ID, RADIOS, detectRadioFromImage, getRadio } from '../radios/index.ts';
import type { SettingsProfile } from '../settingsProfiles/types.ts';

export type ConnectionState =
  | { kind: 'idle' }
  | { kind: 'reading'; progress: number }
  | { kind: 'writing'; progress: number }
  | { kind: 'error'; message: string };

interface HonkState {
  radio: RadioModel;
  image: RadioImage;
  selectedChannel: number;
  dirty: boolean;
  connection: ConnectionState;
  imageSource: 'blank' | 'file' | 'radio';

  setRadio: (id: string) => void;
  loadImage: (bytes: Uint8Array, source: 'file' | 'radio') => void;
  newBlankImage: () => void;
  selectChannel: (index: number) => void;
  updateChannel: (index: number, channel: Channel | null) => void;
  replaceChannels: (channels: (Channel | null)[], selectedChannel?: number) => void;
  updateSettings: (settings: Partial<RadioSettings>) => void;
  applySettingsProfile: (profile: SettingsProfile) => void;
  exportImage: () => Uint8Array;
  setConnection: (state: ConnectionState) => void;
}

const initialRadio = RADIOS[DEFAULT_RADIO_ID];

export const useHonk = create<HonkState>((set, get) => ({
  radio: initialRadio,
  image: parseImage(emptyImageBuffer(initialRadio), initialRadio),
  selectedChannel: 0,
  dirty: false,
  connection: { kind: 'idle' },
  imageSource: 'blank',

  setRadio: (id) => {
    const radio = getRadio(id);
    if (radio === get().radio) return;
    set({
      radio,
      image: parseImage(emptyImageBuffer(radio), radio),
      dirty: false,
      imageSource: 'blank',
      selectedChannel: 0,
    });
  },

  loadImage: (bytes, source) => {
    const currentRadio = get().radio;
    const radio = detectRadioFromImage(bytes, currentRadio) ?? currentRadio;
    const image = parseImage(bytes, radio);
    set({ radio, image, dirty: false, imageSource: source, selectedChannel: 0 });
  },

  newBlankImage: () => {
    const radio = get().radio;
    set({
      image: parseImage(emptyImageBuffer(radio), radio),
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

  replaceChannels: (channels, selectedChannel) => {
    const img = get().image;
    if (channels.length !== img.channels.length) {
      throw new Error(`expected ${img.channels.length} channels`);
    }
    set({
      image: { ...img, channels: channels.slice() },
      selectedChannel: selectedChannel ?? get().selectedChannel,
      dirty: true,
    });
  },

  updateSettings: (settings) => {
    const img = get().image;
    set({ image: { ...img, settings: { ...img.settings, ...settings } }, dirty: true });
  },

  applySettingsProfile: (profile) => {
    const img = get().image;
    set({ image: { ...img, settings: { ...profile.settings } }, dirty: true });
  },

  exportImage: () => {
    const img = get().image;
    return serializeImage(img, getRadio(img.radioId));
  },

  setConnection: (state) => set({ connection: state }),
}));
