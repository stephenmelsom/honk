import { describe, it, expect } from 'vitest';
import { parseCsv } from './csv.ts';

const sampleChirpCsv = `Location,Name,Frequency,Duplex,Offset,Tone,rToneFreq,cToneFreq,DtcsCode,DtcsPolarity,Mode
0,W7TEST,146.840,-,0.600000,Tone,100.0,88.5,023,NN,FM
1,FRS-1,462.5625,,0.000000,,88.5,88.5,023,NN,NFM
2,W7UHF,442.100,+,5.000000,TSQL,123.0,123.0,023,NN,FM`;

describe('CSV importer', () => {
  it('imports CHIRP-style CSV', () => {
    const r = parseCsv(sampleChirpCsv);
    expect(r.channels.length).toBe(3);
    expect(r.channels[0].rxHz).toBe(146_840_000);
    expect(r.channels[0].txHz).toBe(146_240_000);
    expect(r.channels[0].txTone).toEqual({ kind: 'ctcss', hz: 100.0 });
    expect(r.channels[1].bandwidth).toBe('narrow');
    expect(r.channels[2].rxHz).toBe(442_100_000);
    expect(r.channels[2].txHz).toBe(447_100_000);
    expect(r.channels[2].txTone).toEqual({ kind: 'ctcss', hz: 123.0 });
    expect(r.channels[2].rxTone).toEqual({ kind: 'ctcss', hz: 123.0 });
  });

  it('skips rows with bad frequencies', () => {
    const r = parseCsv(`Name,Frequency\nFOO,notafreq\nBAR,146.52`);
    expect(r.channels.length).toBe(1);
    expect(r.skipped.length).toBe(1);
  });
});
