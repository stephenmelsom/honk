import type { PresetPack } from './types.ts';

const PRESET_IDS = ['noaa', 'frs', 'gmrs', 'murs', 'ham-2m', 'ham-70cm'] as const;

export async function loadAllPresets(baseUrl = ''): Promise<PresetPack[]> {
  const packs: PresetPack[] = [];
  for (const id of PRESET_IDS) {
    const res = await fetch(`${baseUrl}/presets/${id}.json`);
    if (!res.ok) continue;
    packs.push((await res.json()) as PresetPack);
  }
  return packs;
}
