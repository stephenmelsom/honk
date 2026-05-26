import { describe, expect, it } from 'vitest';
import { emptyImageBuffer } from './synthetic.ts';
import { parseImage } from './parse.ts';
import { serializeImage } from './serialize.ts';
import { UV82L } from '../radios/uv82l.ts';

const SETTINGS = UV82L.memory.offsets.settings ?? 0;

describe('radio settings', () => {
  it('parses common UV-5R-family settings fields', () => {
    const bytes = emptyImageBuffer(UV82L);
    bytes[SETTINGS + 0] = 7;
    bytes[SETTINGS + 1] = 5;
    bytes[SETTINGS + 3] = 2;
    bytes[SETTINGS + 4] = 9;
    bytes[SETTINGS + 6] = 12;
    bytes[SETTINGS + 7] = 0;
    bytes[SETTINGS + 8] = 0;
    bytes[SETTINGS + 9] = 0x28;
    bytes[SETTINGS + 14] = 2;
    bytes[SETTINGS + 18] = 0xaa;
    bytes[SETTINGS + 21] = 0;
    bytes[SETTINGS + 22] = 2;
    bytes[SETTINGS + 23] = 1;
    bytes[SETTINGS + 24] = 1;
    bytes[SETTINGS + 29] = 1;
    bytes[SETTINGS + 30] = 2;
    bytes[SETTINGS + 31] = 3;
    bytes[SETTINGS + 32] = 2;
    bytes[SETTINGS + 42] = 0xef;

    const img = parseImage(bytes, UV82L);

    expect(img.settings).toEqual({
      squelch: 7,
      stepKhz: 20,
      batterySaver: '1:2',
      vox: 9,
      backlightSeconds: 12,
      dualWatch: false,
      beep: false,
      timeoutSeconds: null,
      voice: 'chinese',
      scanResume: 'se',
      displayModeA: 'channel',
      displayModeB: 'frequency',
      busyChannelLockout: true,
      automaticKeyLock: true,
      broadcastFmRadio: false,
      standbyLed: 'blue',
      rxLed: 'orange',
      txLed: 'purple',
      alarmMode: 'code',
    });
  });

  it('writes settings while preserving unrelated settings bits and bytes', () => {
    const bytes = emptyImageBuffer(UV82L);
    bytes[SETTINGS + 2] = 0x77;
    bytes[SETTINGS + 18] = 0xa8;
    bytes[SETTINGS + 42] = 0xef;
    const img = parseImage(bytes, UV82L);
    img.settings = {
      squelch: 3,
      stepKhz: 50,
      batterySaver: 'off',
      vox: 10,
      backlightSeconds: 24,
      dualWatch: true,
      beep: false,
      timeoutSeconds: 600,
      voice: 'off',
      scanResume: 'co',
      displayModeA: 'frequency',
      displayModeB: 'name',
      busyChannelLockout: true,
      automaticKeyLock: true,
      broadcastFmRadio: true,
      standbyLed: 'off',
      rxLed: 'blue',
      txLed: 'orange',
      alarmMode: 'tone',
    };

    const out = serializeImage(img, UV82L);

    expect(out[SETTINGS + 0]).toBe(3);
    expect(out[SETTINGS + 1]).toBe(7);
    expect(out[SETTINGS + 2]).toBe(0x77);
    expect(out[SETTINGS + 3]).toBe(0);
    expect(out[SETTINGS + 4]).toBe(10);
    expect(out[SETTINGS + 6]).toBe(24);
    expect(out[SETTINGS + 7]).toBe(1);
    expect(out[SETTINGS + 8]).toBe(0);
    expect(out[SETTINGS + 9]).toBe(39);
    expect(out[SETTINGS + 14]).toBe(0);
    expect(out[SETTINGS + 18]).toBe(0xa9);
    expect(out[SETTINGS + 21]).toBe(2);
    expect(out[SETTINGS + 22]).toBe(1);
    expect(out[SETTINGS + 23]).toBe(1);
    expect(out[SETTINGS + 24]).toBe(1);
    expect(out[SETTINGS + 29]).toBe(0);
    expect(out[SETTINGS + 30]).toBe(1);
    expect(out[SETTINGS + 31]).toBe(2);
    expect(out[SETTINGS + 32]).toBe(1);
    expect(out[SETTINGS + 42]).toBe(0xff);
  });
});
