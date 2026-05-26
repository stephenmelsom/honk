import { defineUv5rFamilyModel, UV5R_MODEL_UV82 } from './uv5rFamily.ts';

export const UV82L = defineUv5rFamilyModel({
  id: 'uv82l',
  label: 'Baofeng UV-82L',
  magics: [UV5R_MODEL_UV82],
  vhf: [136_000_000, 174_000_000],
  uhf: [400_000_000, 520_000_000],
});
